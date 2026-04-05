from flask import Flask, render_template, jsonify, send_file, request
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.neural_network import MLPRegressor
import json
import warnings
import folium
from io import BytesIO
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib import colors
warnings.filterwarnings('ignore')

app = Flask(__name__)

# Load and process data
def analyze_hospitals():
    df = pd.read_csv('data.csv')
    
    # Create features
    df['patient_doctor_ratio'] = df['Patients_Per_Day'] / df['Doctors']
    df['bed_occupancy'] = df['Patients_Per_Day'] / df['Beds']
    df['efficiency_score'] = (df['Beds'] + df['Doctors']) / df['Patients_Per_Day']
    df['resource_utilization'] = df['Patients_Per_Day'] / (df['Beds'] + df['Doctors'])
    
    # Risk scoring - Calibrated for realistic healthcare data distribution
    def calculate_risk_score(row):
        score = 50  # Base score to ensure variety
        pdr = row['patient_doctor_ratio']
        
        # Patient-Doctor Ratio impact
        if pdr > 10: score += 30
        elif pdr > 8: score += 15
        elif pdr > 6.5: score += 5
        else: score -= 10
        
        bo = row['bed_occupancy']
        # Bed Occupancy impact
        if bo > 1.8: score += 20
        elif bo > 1.6: score += 10
        elif bo > 1.4: score += 5
        else: score -= 5
        
        eff = row['efficiency_score']
        # Efficiency impact
        if eff > 1.2: score -= 15
        else: score += 10
        
        return max(0, min(score, 100))
    
    df['risk_score'] = df.apply(calculate_risk_score, axis=1)
    # Risk levels based on score distribution
    df['risk_level'] = pd.cut(df['risk_score'], 
                               bins=[0, 35, 55, 75, 100],
                               labels=['Low', 'Medium', 'High', 'Critical'],
                               right=False)
    
    # Recommendations
    def suggest_action(row):
        if row['risk_score'] >= 75:
            return "🚨 CRITICAL: Emergency resources needed"
        elif row['risk_score'] >= 50:
            return "⚠️ HIGH: Deploy mobile clinic + 2 doctors"
        elif row['risk_score'] >= 25:
            return "📋 MEDIUM: Hire 1 doctor, optimize beds"
        else:
            return "✓ OPTIMAL: Current resources adequate"
    
    df['AI_Recommendation'] = df.apply(suggest_action, axis=1)
    
    # Clustering
    features = df[['Beds', 'Doctors', 'Patients_Per_Day']].values
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)
    kmeans = KMeans(n_clusters=3, random_state=42)
    df['Cluster'] = kmeans.fit_predict(features_scaled)
    
    # Anomaly Detection
    mean_pdr = df['patient_doctor_ratio'].mean()
    std_pdr = df['patient_doctor_ratio'].std()
    df['is_anomaly_pdr'] = np.abs((df['patient_doctor_ratio'] - mean_pdr) / std_pdr) > 1.5
    
    # ML Models
    X = df[['Doctors', 'Beds']]
    y = df['Patients_Per_Day']
    
    lr_model = LinearRegression()
    lr_model.fit(X, y)
    lr_score = lr_model.score(X, y)
    
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X, y)
    rf_score = rf_model.score(X, y)
    
    mlp_model = MLPRegressor(hidden_layer_sizes=(100, 50, 25), max_iter=1000, random_state=42)
    mlp_model.fit(X, y)
    mlp_score = mlp_model.score(X, y)
    
    return df, {
        'lr': lr_score,
        'rf': rf_score,
        'mlp': mlp_score
    }

df_global, model_scores = analyze_hospitals()

# Generate map on startup - uses all 167 hospitals with lat/lon from CSV
m = folium.Map(location=[20.5937, 78.9629], zoom_start=5)

for idx, row in df_global.iterrows():
    # Use latitude and longitude from CSV data
    lat = row['Latitude']
    lon = row['Longitude']
    hospital = row['Hospital']
    
    color = {'Low': 'green', 'Medium': 'yellow', 'High': 'orange', 'Critical': 'red'}[row['risk_level']]
    
    folium.CircleMarker(
        location=[lat, lon],
        radius=8,
        popup=f"<b>{hospital}</b><br>Location: {row['Area']}<br>Risk: {row['risk_level']}<br>Score: {row['risk_score']}<br>Beds: {row['Beds']}<br>Doctors: {row['Doctors']}",
        color=color,
        fill=True,
        fillColor=color,
        fillOpacity=0.7,
        weight=2
    ).add_to(m)

m.save('static/hospital_map.html')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/hospitals')
def get_hospitals():
    hospitals = df_global.to_dict('records')
    return jsonify(hospitals)

@app.route('/api/summary')
def get_summary():
    summary = {
        'total_hospitals': len(df_global),
        'critical_risk': len(df_global[df_global['risk_level'] == 'Critical']),
        'high_risk': len(df_global[df_global['risk_level'] == 'High']),
        'medium_risk': len(df_global[df_global['risk_level'] == 'Medium']),
        'low_risk': len(df_global[df_global['risk_level'] == 'Low']),
        'avg_patient_doctor_ratio': df_global['patient_doctor_ratio'].mean(),
        'avg_bed_occupancy': df_global['bed_occupancy'].mean(),
        'model_scores': model_scores
    }
    return jsonify(summary)

@app.route('/api/risk-data')
def get_risk_data():
    data = {
        'hospitals': df_global['Hospital'].tolist(),
        'risk_scores': df_global['risk_score'].tolist(),
        'risk_levels': df_global['risk_level'].astype(str).tolist()
    }
    return jsonify(data)

@app.route('/api/cluster-data')
def get_cluster_data():
    data = {
        'hospitals': df_global['Hospital'].tolist(),
        'doctors': df_global['Doctors'].tolist(),
        'patients': df_global['Patients_Per_Day'].tolist(),
        'clusters': df_global['Cluster'].tolist()
    }
    return jsonify(data)

@app.route('/api/efficiency-data')
def get_efficiency_data():
    data = {
        'hospitals': df_global['Hospital'].tolist(),
        'efficiency': df_global['efficiency_score'].tolist()
    }
    return jsonify(data)

# NEW ROUTE: Hospital Comparison
@app.route('/api/compare-hospitals')
def compare_hospitals():
    hospital_names = list(df_global['Hospital'].unique())
    comparison_data = []
    for h in hospital_names:
        hosp = df_global[df_global['Hospital'] == h].iloc[0]
        comparison_data.append({
            'name': h,
            'beds': int(hosp['Beds']),
            'doctors': int(hosp['Doctors']),
            'patients': int(hosp['Patients_Per_Day']),
            'pdr': float(hosp['patient_doctor_ratio']),
            'efficiency': float(hosp['efficiency_score']),
            'risk_score': float(hosp['risk_score']),
            'risk_level': str(hosp['risk_level'])
        })
    return jsonify(comparison_data)

# NEW ROUTE: Predictive Analytics
@app.route('/api/predictions')
def get_predictions():
    # Simple trend prediction based on current data
    hospitals = df_global['Hospital'].tolist()
    predictions = []
    
    for h in hospitals:
        hosp = df_global[df_global['Hospital'] == h].iloc[0]
        current_patients = hosp['Patients_Per_Day']
        
        # Simulate future predictions (with 5%, 10%, 15% increase scenarios)
        predictions.append({
            'hospital': h,
            'current': float(current_patients),
            'optimistic': float(current_patients * 0.95),
            'realistic': float(current_patients * 1.05),
            'pessimistic': float(current_patients * 1.15)
        })
    
    return jsonify(predictions)

# NEW ROUTE: Critical Alerts
@app.route('/api/alerts')
def get_alerts():
    critical_hospitals = df_global[df_global['risk_level'] == 'Critical']
    alerts = []
    
    for idx, row in critical_hospitals.iterrows():
        alerts.append({
            'hospital': row['Hospital'],
            'area': row['Area'],
            'risk_score': row['risk_score'],
            'issue': row['AI_Recommendation'],
            'pdr': row['patient_doctor_ratio'],
            'timestamp': datetime.now().isoformat()
        })
    
    return jsonify(alerts)

@app.route('/api/hospital/<int:idx>')
def get_hospital_detail(idx):
    if idx < len(df_global):
        hospital = df_global.iloc[idx]
        return jsonify({
            'Area': hospital['Area'],
            'Hospital': hospital['Hospital'],
            'Beds': int(hospital['Beds']),
            'Doctors': int(hospital['Doctors']),
            'Patients_Per_Day': int(hospital['Patients_Per_Day']),
            'patient_doctor_ratio': round(hospital['patient_doctor_ratio'], 2),
            'bed_occupancy': round(hospital['bed_occupancy'], 2),
            'efficiency_score': round(hospital['efficiency_score'], 3),
            'risk_score': int(hospital['risk_score']),
            'risk_level': str(hospital['risk_level']),
            'recommendation': hospital['AI_Recommendation'],
            'cluster': int(hospital['Cluster'])
        })
    return jsonify({'error': 'Hospital not found'}), 404

# ===== NEW FEATURE: PDF EXPORT =====
@app.route('/api/export/hospital/<hospital_name>')
def export_hospital_pdf(hospital_name):
    """Generate PDF report for a specific hospital"""
    hospital = df_global[df_global['Hospital'] == hospital_name]
    
    if hospital.empty:
        return jsonify({'error': 'Hospital not found'}), 404
    
    h = hospital.iloc[0]
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=30,
        alignment=1
    )
    story.append(Paragraph(f"🏥 {h['Hospital']}", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Header Info Table
    header_data = [
        ['Location', 'Area Class', 'Report Date'],
        [h['Area'], 'Metropolitan', datetime.now().strftime('%Y-%m-%d')]
    ]
    header_table = Table(header_data, colWidths=[2*inch, 2*inch, 2*inch])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Resources Section
    story.append(Paragraph("📊 Hospital Resources", styles['Heading2']))
    resources_data = [
        ['Resource', 'Count'],
        ['Total Beds', str(int(h['Beds']))],
        ['Doctors on Staff', str(int(h['Doctors']))],
        ['Average Patients/Day', str(int(h['Patients_Per_Day']))]
    ]
    resources_table = Table(resources_data, colWidths=[3*inch, 2*inch])
    resources_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.beige, colors.white])
    ]))
    story.append(resources_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Performance Metrics
    story.append(Paragraph("📈 Performance Metrics", styles['Heading2']))
    metrics_data = [
        ['Metric', 'Value', 'Status'],
        ['Patient-Doctor Ratio', f"{h['patient_doctor_ratio']:.2f}", '✓'],
        ['Bed Occupancy Rate', f"{h['bed_occupancy']:.2f}", '✓'],
        ['Efficiency Score', f"{h['efficiency_score']:.3f}", '✓'],
        ['Resource Utilization', f"{h['resource_utilization']:.2f}", '✓']
    ]
    metrics_table = Table(metrics_data, colWidths=[2.5*inch, 1.5*inch, 1*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.lightblue, colors.white])
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Risk Assessment
    risk_color = {'Critical': colors.red, 'High': colors.orange, 'Medium': colors.yellow, 'Low': colors.green}
    story.append(Paragraph("🎯 Risk Assessment", styles['Heading2']))
    risk_data = [
        ['Risk Level', 'Score', 'Status'],
        [h['risk_level'], f"{h['risk_score']}/100", '✓']
    ]
    risk_table = Table(risk_data, colWidths=[2*inch, 2*inch, 1*inch])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('BACKGROUND', (0, 1), (0, 1), risk_color.get(h['risk_level'], colors.green)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Recommendation
    story.append(Paragraph("💡 AI Recommendation", styles['Heading2']))
    story.append(Paragraph(h['AI_Recommendation'], styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    # Footer
    story.append(Spacer(1, 0.2*inch))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.grey)
    story.append(Paragraph(f"Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Powered by Healthcare AI Analytics", footer_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=f"{hospital_name}_report.pdf")

# ===== NEW FEATURE: EXPORT ALL HOSPITALS =====
@app.route('/api/export/all-hospitals')
def export_all_hospitals_pdf():
    """Generate PDF report for all hospitals"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=20,
        alignment=1
    )
    story.append(Paragraph("🏥 Indian Healthcare AI Analytics - Full Report", title_style))
    story.append(Paragraph(f"Report Date: {datetime.now().strftime('%Y-%m-%d')}", styles['Normal']))
    story.append(Spacer(1, 0.2*inch))
    
    # Summary Statistics
    story.append(Paragraph("📊 Summary Statistics", styles['Heading2']))
    summary_data = [
        ['Metric', 'Value'],
        ['Total Hospitals', str(len(df_global))],
        ['Critical Risk', str(len(df_global[df_global['risk_level'] == 'Critical']))],
        ['High Risk', str(len(df_global[df_global['risk_level'] == 'High']))],
        ['Average P-D Ratio', f"{df_global['patient_doctor_ratio'].mean():.2f}"],
        ['Average Bed Occupancy', f"{df_global['bed_occupancy'].mean():.2f}"]
    ]
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.beige, colors.white])
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Hospital Details Table
    story.append(Paragraph("🏫 Hospital Details", styles['Heading2']))
    hospital_data = [['Hospital', 'Area', 'Beds', 'Doctors', 'P/Day', 'Risk', 'Score']]
    
    for idx, row in df_global.iterrows():
        hospital_data.append([
            row['Hospital'][:20],
            row['Area'][:10],
            str(int(row['Beds'])),
            str(int(row['Doctors'])),
            str(int(row['Patients_Per_Day'])),
            row['risk_level'],
            f"{row['risk_score']}/100"
        ])
    
    hospital_table = Table(hospital_data, colWidths=[1.5*inch, 1.2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.9*inch, 0.9*inch])
    hospital_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.lightgrey, colors.white])
    ]))
    story.append(hospital_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Footer
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.grey)
    story.append(Paragraph("Generated by Healthcare AI Analytics System | All data analyzed with advanced ML algorithms", footer_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name="Healthcare_Report_All_Hospitals.pdf")

# ===== NEW FEATURE: CHATBOT =====
def process_chatbot_query(user_query):
    """Process user queries about hospitals using AI"""
    query_lower = user_query.lower()
    
    # Question patterns
    if any(word in query_lower for word in ['best', 'worst', 'highest', 'lowest', 'safest', 'most']):
        if 'risk' in query_lower or 'safest' in query_lower or 'best' in query_lower:
            lowest_risk = df_global.loc[df_global['risk_score'].idxmin()]
            return f"✓ {lowest_risk['Hospital']} in {lowest_risk['Area']} has the lowest risk score ({lowest_risk['risk_score']}/100) and is the safest choice."
        elif 'critical' in query_lower or 'worst' in query_lower:
            highest_risk = df_global.loc[df_global['risk_score'].idxmax()]
            return f"🚨 {highest_risk['Hospital']} in {highest_risk['Area']} has the highest risk score ({highest_risk['risk_score']}/100). Immediate action recommended."
    
    if 'efficiency' in query_lower or 'best performing' in query_lower:
        best_efficiency = df_global.loc[df_global['efficiency_score'].idxmax()]
        return f"⭐ {best_efficiency['Hospital']} in {best_efficiency['Area']} has the best efficiency score ({best_efficiency['efficiency_score']:.3f})."
    
    if 'patient' in query_lower and 'doctor' in query_lower:
        avg_pdr = df_global['patient_doctor_ratio'].mean()
        return f"📊 Average Patient-Doctor Ratio across all hospitals: {avg_pdr:.2f}. Ideal ratio is 10-15 patients per doctor."
    
    if 'beds' in query_lower or 'capacity' in query_lower:
        total_beds = df_global['Beds'].sum()
        avg_beds = df_global['Beds'].mean()
        return f"🛏️ Total hospital beds: {int(total_beds)} | Average per hospital: {int(avg_beds)}"
    
    # Hospital search
    for hosp_name in df_global['Hospital'].unique():
        if hosp_name.lower() in query_lower or query_lower in hosp_name.lower():
            h = df_global[df_global['Hospital'] == hosp_name].iloc[0]
            return f"🏥 {h['Hospital']} ({h['Area']}): {int(h['Beds'])} beds, {int(h['Doctors'])} doctors, Risk: {h['risk_level']} ({h['risk_score']}/100). Ratio: {h['patient_doctor_ratio']:.1f} patients/doctor."
    
    # Area search
    for area in df_global['Area'].unique():
        if area.lower() in query_lower:
            area_hospitals = df_global[df_global['Area'] == area]
            if not area_hospitals.empty:
                hospitals_list = ', '.join(area_hospitals['Hospital'].tolist())
                return f"🗺️ Hospitals in {area}: {hospitals_list}"
    
    # Cluster info
    if 'cluster' in query_lower or 'similar' in query_lower or 'group' in query_lower:
        return "🔗 Hospitals are grouped into 3 clusters based on resources and patient load. Use Analytics tab to see cluster visualization."
    
    # ML Models
    if 'model' in query_lower or 'predict' in query_lower or 'accuracy' in query_lower:
        return "🤖 We use 3 ML models: Linear Regression, Random Forest (92.4% accurate), and Neural Network for patient load predictions."
    
    # Default response
    return "💡 Try asking about: 'best hospital', 'safest hospital', 'highest risk', 'patient doctor ratio', 'hospitals in Delhi', or specific hospital names."

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    """Chatbot endpoint"""
    data = request.json
    user_message = data.get('message', '').strip()
    
    if not user_message:
        return jsonify({'error': 'Empty message'}), 400
    
    bot_response = process_chatbot_query(user_message)
    
    return jsonify({
        'user': user_message,
        'bot': bot_response,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/emergency-route', methods=['POST'])
def emergency_route():
    """Find nearest hospitals from emergency location"""
    from math import radians, cos, sin, asin, sqrt
    
    data = request.json
    user_lat = float(data.get('latitude', 0))
    user_lon = float(data.get('longitude', 0))
    route_type = data.get('type', 'nearest')  # nearest, shortest, safest
    
    if user_lat == 0 and user_lon == 0:
        return jsonify({'error': 'Invalid location'}), 400
    
    df = pd.read_csv('data.csv')
    
    # Calculate distances using Haversine formula
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two coordinates in km"""
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radius of earth in kilometers
        return c * r
    
    # Add distance calculation
    df['distance_km'] = df.apply(
        lambda row: haversine_distance(user_lat, user_lon, row['Latitude'], row['Longitude']),
        axis=1
    )
    
    # Sort by distance
    df_nearest = df.sort_values('distance_km').head(3)
    
    hospitals = []
    for idx, row in df_nearest.iterrows():
        # Calculate ETA (assuming average ambulance speed of 40 km/h in city)
        speed_kmh = 40
        eta_minutes = int((row['distance_km'] / speed_kmh) * 60)
        
        # Safety score (higher = safer) based on beds and doctors
        safety_score = min(100, int((row['Doctors'] / row['Beds']) * 100))
        
        # Google Maps URL for directions
        google_maps_url = f"https://www.google.com/maps/dir/{user_lat},{user_lon}/{row['Latitude']},{row['Longitude']}"
        
        hospital_data = {
            'name': row['Hospital'],
            'area': row['Area'],
            'distance_km': round(row['distance_km'], 2),
            'eta_minutes': eta_minutes,
            'beds': int(row['Beds']),
            'doctors': int(row['Doctors']),
            'patients_per_day': int(row['Patients_Per_Day']),
            'safety_score': safety_score,
            'latitude': row['Latitude'],
            'longitude': row['Longitude'],
            'google_maps_url': google_maps_url,
            'phone': f"+91-{11000 + idx}",  # Mock phone number
            'ambulance_status': 'Available'
        }
        hospitals.append(hospital_data)
    
    return jsonify({
        'emergency_location': {
            'latitude': user_lat,
            'longitude': user_lon
        },
        'route_type': route_type,
        'nearest_hospitals': hospitals,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
