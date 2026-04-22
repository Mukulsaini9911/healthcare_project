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
import re
warnings.filterwarnings('ignore')

app = Flask(__name__)

# ===== MEDICAL KNOWLEDGE BASE FOR AI ASSISTANT =====
MEDICAL_KNOWLEDGE_BASE = {
    'diseases': {
        'fever': {
            'symptoms': 'High body temperature (>38°C), chills, body aches, fatigue, headache',
            'causes': 'Infections (viral/bacterial), inflammation, malignancy',
            'treatments': 'Rest, hydration, antipyretics (paracetamol), antibiotics if bacterial',
            'duration': '3-7 days typically',
            'when_serious': 'Fever >40°C, convulsions, difficulty breathing, chest pain',
            'medicines': 'Paracetamol, Ibuprofen, Aspirin'
        },
        'pneumonia': {
            'symptoms': 'Cough, chest pain, shortness of breath, productive sputum, fever',
            'causes': 'Bacterial (Streptococcus pneumoniae), viral, fungal infections',
            'treatments': 'Antibiotics, oxygen therapy, rest, fluids, antipyretics',
            'duration': '2-4 weeks recovery',
            'when_serious': 'Severe dyspnea, cyanosis, altered mental status',
            'medicines': 'Amoxicillin, Azithromycin, Ceftriaxone',
            'specialists': 'Pulmonologist, General Physician'
        },
        'dengue': {
            'symptoms': 'High fever (40°C), severe headache, joint pain, rash, hemorrhaging',
            'causes': 'Aedes mosquito virus transmission',
            'treatments': 'Supportive care, fluids, platelet transfusion if needed',
            'duration': '7-10 days acute phase',
            'when_serious': 'Dengue hemorrhagic fever, shock, thrombocytopenia <50k',
            'medicines': 'Paracetamol, IV fluids',
            'prevention': 'Mosquito nets, repellents, vaccination'
        },
        'malaria': {
            'symptoms': 'Recurring fever, chills, sweating, headache, muscle aches',
            'causes': 'Plasmodium parasite (4 types P.falciparum most severe)',
            'treatments': 'Antimalarial drugs, fever management',
            'duration': '7-30 days',
            'when_serious': 'Cerebral malaria, severe anemia, renal failure',
            'medicines': 'Artemether, Quinine, Chloroquine',
            'prevention': 'Mosquito prevention, prophylaxis in endemic areas'
        },
        'covid-19': {
            'symptoms': 'Cough, fever, loss of taste/smell, dyspnea, fatigue',
            'causes': 'SARS-CoV-2 virus transmission',
            'treatments': 'Antiviral therapy, supportive care, oxygen, corticosteroids if severe',
            'duration': '7-14 days mild, longer severe',
            'when_serious': 'Dyspnea, SpO2 <94%, severe pneumonia',
            'medicines': 'Remdesivir, Dexamethasone, oxygen',
            'prevention': 'Vaccination, masks, distancing'
        },
        'diabetes': {
            'symptoms': 'Polyuria, polydipsia, polyphagia, fatigue, weight loss',
            'types': 'Type 1 (insulin-dependent), Type 2 (insulin-resistant)',
            'treatments': 'Insulin, oral hypoglycemics, diet, exercise',
            'complications': 'Neuropathy, nephropathy, retinopathy, cardiovascular disease',
            'medicines': 'Metformin, Insulin, Glipizide, SGLT2 inhibitors',
            'management': 'Regular glucose monitoring, diet control, exercise'
        },
        'hypertension': {
            'symptoms': 'Often asymptomatic, headache, chest pain, shortness of breath',
            'causes': 'Primary (90% cases), secondary (kidney disease, endocrine)',
            'treatments': 'Antihypertensive medications, lifestyle changes',
            'medicines': 'ACE inhibitors, Beta-blockers, Calcium channel blockers, Diuretics',
            'target_bp': '<130/80 mmHg',
            'lifestyle': 'Low sodium diet, exercise, weight loss, stress management'
        },
        'asthma': {
            'symptoms': 'Wheezing, shortness of breath, chest tightness, dry cough at night',
            'causes': 'Allergies, exercise, cold air, respiratory infections',
            'treatments': 'Bronchodilators, corticosteroids, avoiding triggers',
            'medicines': 'Albuterol, Fluticasone, Montelukast',
            'emergency': 'Status asthmaticus - severe bronchospasm'
        },
        'migraine': {
            'symptoms': 'Unilateral pulsating headache, photophobia, phonophobia, nausea',
            'types': 'With/without aura',
            'treatments': 'Triptans, NSAIDs, prophylactic therapy',
            'medicines': 'Sumatriptan, Propranolol, Topiramate',
            'triggers': 'Stress, hormones, foods, sleep changes'
        },
        'cough': {
            'symptoms': 'Dry or productive cough, throat irritation',
            'causes': 'Common cold, flu, allergies, GERD, smoking',
            'treatments': 'Cough suppressants, expectorants, treating underlying cause',
            'medicines': 'Dextromethorphan, Guaifenesin, Codeine'
        }
    },
    'medicines': {
        'paracetamol': {
            'uses': 'Pain relief, fever reduction',
            'dosage': '500-1000mg every 4-6 hours (max 4000mg/day)',
            'side_effects': 'Liver toxicity at overdose, generally safe',
            'contraindications': 'Liver disease, excessive alcohol use'
        },
        'ibuprofen': {
            'uses': 'Anti-inflammatory, pain relief, fever',
            'dosage': '200-400mg every 4-6 hours (max 1200mg/day OTC)',
            'side_effects': 'GI upset, ulcers, kidney issues, bleeding',
            'contraindications': 'Peptic ulcer, severe renal/hepatic disease, third trimester pregnancy'
        },
        'amoxicillin': {
            'uses': 'Bacterial infections (UTI, ear, throat, bronchitis)',
            'class': 'Beta-lactam antibiotic',
            'dosage': '250-500mg three times daily',
            'side_effects': 'Rash, diarrhea, nausea, allergic reactions',
            'contraindications': 'Penicillin allergy'
        },
        'metformin': {
            'uses': 'Type 2 diabetes management',
            'dosage': '500-1000mg twice daily with meals',
            'side_effects': 'GI upset, lactic acidosis risk',
            'contraindications': 'Renal impairment, contrast dye procedures'
        },
        'azithromycin': {
            'uses': 'Bacterial and some atypical infections',
            'class': 'Macrolide antibiotic',
            'dosage': '500mg day 1, then 250mg daily',
            'side_effects': 'Nausea, diarrhea, QT prolongation',
            'contraindications': 'Macrolide allergy, severe liver disease'
        }
    },
    'doctor_specialties': {
        'cardiologist': 'Heart and cardiovascular diseases',
        'neurologist': 'Brain and nervous system disorders',
        'pulmonologist': 'Lung and respiratory diseases',
        'endocrinologist': 'Hormones and metabolism (diabetes, thyroid)',
        'rheumatologist': 'Joint and autoimmune diseases',
        'infectious_disease': 'Infections and epidemiology',
        'gastroenterologist': 'Digestive system',
        'nephrologist': 'Kidney disease',
        'oncologist': 'Cancer treatment',
        'psychiatrist': 'Mental health'
    },
    'hospitals_india': {
        'delhi': ['AIIMS Delhi', 'Apollo Delhi', 'Max Healthcare', 'Fortis'],
        'mumbai': ['KEM Hospital', 'Apollo Mumbai', 'Hinduja Hospital', 'Lilavati'],
        'bangalore': ['Apollo Bangalore', 'Manipal Hospital', 'Fortis Bangalore'],
        'chennai': ['Apollo Chennai', 'MIOT International', 'Vijaya Hospital'],
        'hyderabad': ['Apollo Hyderabad', 'Care Hospital', 'Yashoda Hospital']
    }
}

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

# ===== DISEASE COST DATABASE =====
DISEASE_COSTS = {
    'fever': {'base_cost': 2000, 'name': 'Fever Treatment'},
    'cold': {'base_cost': 1500, 'name': 'Cold/Cough Treatment'},
    'pneumonia': {'base_cost': 35000, 'name': 'Pneumonia Treatment'},
    'typhoid': {'base_cost': 15000, 'name': 'Typhoid Treatment'},
    'dengue': {'base_cost': 25000, 'name': 'Dengue Treatment'},
    'malaria': {'base_cost': 12000, 'name': 'Malaria Treatment'},
    'diabetes': {'base_cost': 40000, 'name': 'Diabetes Management'},
    'hypertension': {'base_cost': 18000, 'name': 'Hypertension Treatment'},
    'asthma': {'base_cost': 20000, 'name': 'Asthma Treatment'},
    'migraine': {'base_cost': 8000, 'name': 'Migraine Treatment'},
    'fracture': {'base_cost': 45000, 'name': 'Fracture Treatment'},
    'surgery': {'base_cost': 60000, 'name': 'Surgical Treatment'},
    'covid': {'base_cost': 30000, 'name': 'COVID-19 Treatment'},
    'heart': {'base_cost': 150000, 'name': 'Heart Disease Treatment'},
    'cancer': {'base_cost': 250000, 'name': 'Cancer Treatment'},
    'uti': {'base_cost': 10000, 'name': 'UTI Treatment'},
    'gastroenteritis': {'base_cost': 8000, 'name': 'Gastroenteritis Treatment'},
}

def get_disease_cost_for_hospital(disease, hospital_data):
    """Calculate cost of disease treatment for a specific hospital"""
    if disease not in DISEASE_COSTS:
        return None
    
    base_cost = DISEASE_COSTS[disease]['base_cost']
    
    # Adjust cost based on hospital efficiency and risk
    efficiency_multiplier = hospital_data['efficiency_score'] / df_global['efficiency_score'].mean()
    risk_multiplier = 1 + (hospital_data['risk_score'] / 100) * 0.1
    
    adjusted_cost = base_cost * risk_multiplier / efficiency_multiplier
    return round(adjusted_cost, 0)

# ===== NEW FEATURE: SMART COST ESTIMATOR CHATBOT =====
def analyze_medical_query(user_query):
    """Analyze query to determine what type of medical information is being asked"""
    query_lower = user_query.lower()
    
    # CHECK COST QUERIES FIRST (highest priority)
    if any(word in query_lower for word in ['cost', 'price', 'expense', 'charges', 'expensive', 'affordable', 'how much']):
        disease_keywords = list(DISEASE_COSTS.keys())
        for disease in disease_keywords:
            if disease in query_lower:
                return {'type': 'cost', 'entity': disease}
    
    # Disease queries
    diseases = list(MEDICAL_KNOWLEDGE_BASE['diseases'].keys())
    for disease in diseases:
        if disease in query_lower:
            return {'type': 'disease', 'entity': disease}
    
    # Medicine queries
    medicines = list(MEDICAL_KNOWLEDGE_BASE['medicines'].keys())
    for medicine in medicines:
        if medicine in query_lower:
            return {'type': 'medicine', 'entity': medicine}
    
    # Doctor specialty queries
    specialties = list(MEDICAL_KNOWLEDGE_BASE['doctor_specialties'].keys())
    for specialty in specialties:
        if specialty.replace('_', ' ') in query_lower or specialty in query_lower:
            return {'type': 'doctor', 'entity': specialty}
    
    # Hospital queries
    if any(word in query_lower for word in ['hospital', 'clinic', 'healthcare', 'medical center']):
        return {'type': 'hospital', 'entity': None}
    
    # Emergency queries
    if any(word in query_lower for word in ['emergency', 'urgent', '911', '108', 'ambulance', 'critical', 'severe']):
        return {'type': 'emergency', 'entity': None}
    
    # Symptom queries
    if any(word in query_lower for word in ['symptom', 'pain', 'ache', 'rash', 'vomit', 'bleed', 'cough', 'headache']):
        return {'type': 'symptom', 'entity': None}
    
    # Health tips
    if any(word in query_lower for word in ['prevention', 'healthy', 'exercise', 'diet', 'tip', 'advice']):
        return {'type': 'health_tip', 'entity': None}
    
    return {'type': 'general', 'entity': None}

def process_advanced_medical_query(user_query):
    """Process user queries with comprehensive medical AI knowledge"""
    query_lower = user_query.lower()
    query_type = analyze_medical_query(user_query)
    
    # ===== COST QUERY (HIGH PRIORITY) =====
    if query_type['type'] == 'cost':
        found_disease = query_type['entity']
        disease_name = DISEASE_COSTS[found_disease]['name']
        base_cost = DISEASE_COSTS[found_disease]['base_cost']
        
        hospital_costs = []
        for idx, hospital in df_global.iterrows():
            cost = get_disease_cost_for_hospital(found_disease, hospital)
            hospital_costs.append({
                'hospital': hospital['Hospital'],
                'area': hospital['Area'],
                'cost': cost,
                'beds': int(hospital['Beds']),
                'doctors': int(hospital['Doctors'])
            })
        
        hospital_costs.sort(key=lambda x: x['cost'])
        
        response = f"**💰 {disease_name.upper()} - COST IN HOSPITALS**\n\n"
        response += f"**Base Cost: ₹{base_cost:,.0f}**\n\n"
        response += f"**🏥 Top 5 Most Affordable Hospitals:**\n"
        
        for i, h in enumerate(hospital_costs[:5], 1):
            response += f"{i}. **{h['hospital']}** ({h['area']})\n"
            response += f"   💰 Cost: ₹{h['cost']:,.0f} | 🛏️ Beds: {h['beds']} | 👨‍⚕️ Doctors: {h['doctors']}\n"
        
        response += f"\n**🏥 Top 5 Most Expensive Hospitals:**\n"
        for i, h in enumerate(reversed(hospital_costs[-5:]), 1):
            response += f"{i}. **{h['hospital']}** ({h['area']})\n"
            response += f"   💰 Cost: ₹{h['cost']:,.0f} | 🛏️ Beds: {h['beds']} | 👨‍⚕️ Doctors: {h['doctors']}\n"
        
        avg_cost = sum([h['cost'] for h in hospital_costs]) / len(hospital_costs)
        response += f"\n**📊 Average Cost Across All Hospitals: ₹{avg_cost:,.0f}**\n"
        response += f"*Costs vary based on hospital efficiency, infrastructure, and resources.*"
        return response
    
    # ===== DISEASE QUERY =====
    if query_type['type'] == 'disease':
        disease = query_type['entity']
        disease_info = MEDICAL_KNOWLEDGE_BASE['diseases'][disease]
        
        response = f"**🏥 {disease.upper()} - Medical Information**\n\n"
        
        response += f"**📋 Symptoms:**\n{disease_info['symptoms']}\n\n"
        
        if 'causes' in disease_info:
            response += f"**🔍 Causes:**\n{disease_info['causes']}\n\n"
        
        response += f"**💊 Treatment Options:**\n{disease_info['treatments']}\n\n"
        
        if 'medicines' in disease_info:
            response += f"**💉 Recommended Medicines:**\n{disease_info['medicines']}\n\n"
        
        if 'specialists' in disease_info:
            response += f"**👨‍⚕️ Specialist to Consult:**\n{disease_info['specialists']}\n\n"
        
        if 'when_serious' in disease_info:
            response += f"**⚠️ When to Seek Emergency Care:**\n{disease_info['when_serious']}\n\n"
        
        response += f"**⏱️ Duration:** {disease_info.get('duration', 'Varies')}\n\n"
        
        # Add nearby hospitals
        response += f"**🏥 Nearby Hospitals:**\n"
        top_hospitals = df_global.nlargest(3, 'Beds')[['Hospital', 'Area']].values
        for h in top_hospitals:
            response += f"• {h[0]} ({h[1]})\n"
        
        response += f"\n*Consult a healthcare professional for personalized treatment.*"
        return response
    
    # ===== MEDICINE QUERY =====
    elif query_type['type'] == 'medicine':
        medicine = query_type['entity']
        medicine_info = MEDICAL_KNOWLEDGE_BASE['medicines'][medicine]
        
        response = f"**💊 {medicine.upper()}**\n\n"
        
        response += f"**Uses:**\n{medicine_info['uses']}\n\n"
        response += f"**Dosage:**\n{medicine_info['dosage']}\n\n"
        response += f"**⚠️ Side Effects:**\n{medicine_info['side_effects']}\n\n"
        response += f"**🚫 Contraindications:**\n{medicine_info['contraindications']}\n\n"
        
        response += f"*Always follow your doctor's prescription and consult pharmacist for drug interactions.*"
        return response
    
    # ===== DOCTOR SPECIALTY QUERY =====
    elif query_type['type'] == 'doctor':
        specialty = query_type['entity']
        specialty_info = MEDICAL_KNOWLEDGE_BASE['doctor_specialties'][specialty]
        
        response = f"**👨‍⚕️ {specialty.replace('_', ' ').upper()} - SPECIALIST**\n\n"
        response += f"**Focus Area:**\n{specialty_info}\n\n"
        
        response += f"**When to Visit:**\n"
        if 'cardio' in specialty:
            response += "• Chest pain, irregular heartbeat, high blood pressure, heart disease\n"
        elif 'neuro' in specialty:
            response += "• Headaches, migraines, seizures, memory issues, paralysis\n"
        elif 'pulmo' in specialty:
            response += "• Persistent cough, breathing problems, asthma, pneumonia\n"
        elif 'endocrin' in specialty:
            response += "• Diabetes, thyroid issues, hormonal problems\n"
        
        response += f"\n**Available at Top Hospitals:**\n"
        top_hospitals = df_global.nlargest(3, 'Doctors')[['Hospital', 'Area']].values
        for h in top_hospitals:
            response += f"• {h[0]} ({h[1]})\n"
        
        return response
    
    # ===== HOSPITAL QUERY =====
    elif query_type['type'] == 'hospital':
        response = f"**🏥 HOSPITALS IN YOUR AREA**\n\n"
        response += f"**Top Hospitals by Bed Capacity:**\n"
        
        top_hospitals = df_global.nlargest(5, 'Beds')
        for idx, h in enumerate(top_hospitals.iterrows(), 1):
            hospital = h[1]
            response += f"{idx}. **{hospital['Hospital']}** ({hospital['Area']})\n"
            response += f"   • Beds: {int(hospital['Beds'])} | Doctors: {int(hospital['Doctors'])}\n"
            response += f"   • Risk Level: {hospital['risk_level']} | Efficiency: {hospital['efficiency_score']:.2f}\n\n"
        
        response += f"**💡 Tip:** Use our Emergency Route feature for GPS navigation to nearest hospital."
        return response
    
    # ===== EMERGENCY QUERY =====
    elif query_type['type'] == 'emergency':
        response = f"**🚨 EMERGENCY ASSISTANCE**\n\n"
        response += f"**Immediate Actions:**\n"
        response += f"1. **CALL 108** - National Ambulance Service\n"
        response += f"2. **CALL 101** - Fire & Rescue\n"
        response += f"3. **CALL 102** - Poison Control\n"
        response += f"4. **CALL 100** - Police (if needed)\n\n"
        
        response += f"**Life-Threatening Symptoms - GO TO HOSPITAL NOW:**\n"
        response += f"• Chest pain, difficulty breathing\n"
        response += f"• Sudden severe headache, confusion\n"
        response += f"• Severe bleeding, poisoning\n"
        response += f"• Loss of consciousness\n"
        response += f"• Choking, inability to swallow\n\n"
        
        response += f"**Nearest Emergency Hospitals:**\n"
        top_hospitals = df_global.nsmallest(3, 'risk_score')[['Hospital', 'Area']].values
        for h in top_hospitals:
            response += f"• {h[0]} ({h[1]})\n"
        
        response += f"\n**USE EMERGENCY ROUTE FEATURE FOR GPS DIRECTIONS**"
        return response
    
    # ===== SYMPTOM QUERY =====
    elif query_type['type'] == 'symptom':
        response = f"**🩺 SYMPTOM ANALYSIS**\n\n"
        response += f"**Common Conditions with Your Symptoms:**\n\n"
        
        # Match symptoms to diseases
        if 'fever' in query_lower:
            response += f"**🌡️ Associated with Fever:**\n"
            response += f"• Common Cold, Flu, COVID-19\n"
            response += f"• Malaria, Dengue, Typhoid\n"
            response += f"• Pneumonia, Bronchitis\n"
            response += f"• UTI, Blood Infection\n\n"
        
        if 'cough' in query_lower:
            response += f"**🫁 Associated with Cough:**\n"
            response += f"• Common Cold, Flu\n"
            response += f"• Pneumonia, Bronchitis, Asthma\n"
            response += f"• Allergies, GERD\n"
            response += f"• Smoking-related issues\n\n"
        
        if 'headache' in query_lower or 'pain' in query_lower:
            response += f"**🤕 Associated with Headache/Pain:**\n"
            response += f"• Migraine, Tension Headache\n"
            response += f"• Fever, Infection\n"
            response += f"• Stress, Sleep Deprivation\n"
            response += f"• Cervical Spondylosis\n\n"
        
        response += f"**⚠️ IMPORTANT:**\n"
        response += f"These are general possibilities. **Seek professional medical diagnosis.**\n"
        response += f"Visit a nearby hospital or clinic for proper evaluation.\n\n"
        response += f"**When to Seek Emergency Care:**\n"
        response += f"• Severe symptoms with fever >39°C\n"
        response += f"• Difficulty breathing\n"
        response += f"• Chest pain\n"
        response += f"• Confusion or altered mental status"
        return response
    
    # ===== HEALTH TIPS =====
    elif query_type['type'] == 'health_tip':
        response = f"**💚 HEALTH & WELLNESS TIPS**\n\n"
        response += f"**🏃 Exercise & Fitness:**\n"
        response += f"• 30 minutes moderate activity daily (brisk walk, cycling)\n"
        response += f"• Include strength training 2-3x per week\n"
        response += f"• Stay hydrated - drink 8-10 glasses water daily\n\n"
        
        response += f"**🥗 Nutrition:**\n"
        response += f"• Eat colorful vegetables (5+ servings daily)\n"
        response += f"• Choose whole grains over refined\n"
        response += f"• Limit salt, sugar, and saturated fats\n"
        response += f"• Include protein at every meal\n\n"
        
        response += f"**😴 Sleep & Stress:**\n"
        response += f"• 7-8 hours quality sleep daily\n"
        response += f"• Manage stress through meditation/yoga\n"
        response += f"• Limit screen time before bed\n\n"
        
        response += f"**💉 Preventive Care:**\n"
        response += f"• Get vaccinated (COVID-19, Flu, etc.)\n"
        response += f"• Regular health checkups (Annual for adults)\n"
        response += f"• Monitor blood pressure & blood sugar\n"
        response += f"• Avoid smoking & excessive alcohol\n\n"
        
        response += f"*Prevention is better than cure!*"
        return response
    

    
    # ===== DEFAULT RESPONSE =====
    response = f"**👋 Welcome to Medical AI Assistant!**\n\n"
    response += f"**I can help you with:**\n"
    response += f"• 🏥 Information about **diseases** (fever, COVID-19, pneumonia, etc.)\n"
    response += f"• 💊 Details about **medicines** and their uses\n"
    response += f"• 👨‍⚕️ **Doctor specialties** and when to visit\n"
    response += f"• 🏨 Finding **hospitals** and health facilities\n"
    response += f"• 🚨 **Emergency guidance** and first aid\n"
    response += f"• 🩺 **Symptom analysis** and health concerns\n"
    response += f"• 💚 **Health tips** and preventive care\n"
    response += f"• 💰 Disease **cost estimation** in hospitals\n\n"
    response += f"**Try asking:**\n"
    response += f"• 'Tell me about fever'\n"
    response += f"• 'What is Paracetamol used for?'\n"
    response += f"• 'When should I see a cardiologist?'\n"
    response += f"• 'Show me hospitals nearby'\n"
    response += f"• 'What are emergency numbers?'\n"
    response += f"• 'I have a cough and fever'\n"
    response += f"• 'Health tips for diabetes'\n"
    response += f"• 'Cost of pneumonia treatment'\n\n"
    response += f"*Type your medical question below and press Send!*"
    
    return response

def process_chatbot_query(user_query):
    """Legacy function - wrapper for advanced medical query"""
    return process_advanced_medical_query(user_query)


# ===== ENHANCED MEDICAL AI ASSISTANT =====
CONDITION_ALIASES = {
    'covid': 'covid-19',
    'covid 19': 'covid-19',
    'corona': 'covid-19',
    'high bp': 'hypertension',
    'high blood pressure': 'hypertension',
    'blood pressure': 'hypertension',
    'sugar': 'diabetes',
    'common cold': 'cold',
    'cold and cough': 'cold',
    'urine infection': 'uti',
    'urinary tract infection': 'uti',
    'heart disease': 'heart',
    'heart problem': 'heart',
    'food poisoning': 'gastroenteritis',
    'allergies': 'allergy'
}

SPECIALTY_DETAILS = {
    'cardiologist': 'Heart disease, chest pain, blood pressure issues, and circulation problems.',
    'neurologist': 'Headache, migraine, seizures, dizziness, memory issues, and nerve disorders.',
    'pulmonologist': 'Breathing trouble, asthma, pneumonia, chronic cough, and lung infections.',
    'endocrinologist': 'Diabetes, thyroid conditions, hormone imbalance, and metabolic disorders.',
    'rheumatologist': 'Joint pain, autoimmune disease, swelling, and inflammatory disorders.',
    'infectious_disease': 'Fever, dengue, malaria, typhoid, COVID-19, and serious infections.',
    'gastroenterologist': 'Stomach pain, vomiting, loose motion, acidity, and digestion issues.',
    'nephrologist': 'Kidney disease, UTI complications, swelling, and urine-related disorders.',
    'oncologist': 'Cancer diagnosis, chemotherapy, radiation planning, and cancer follow-up.',
    'psychiatrist': 'Depression, anxiety, panic, sleep issues, and behavioral health care.',
    'orthopedic': 'Fracture, bone pain, joint injury, spine problems, and sports injuries.',
    'general_physician': 'Fever, cold, cough, weakness, infections, and first-line medical evaluation.'
}

CONDITION_SPECIALTY_MAP = {
    'fever': 'general_physician',
    'cold': 'general_physician',
    'cough': 'general_physician',
    'pneumonia': 'pulmonologist',
    'dengue': 'infectious_disease',
    'malaria': 'infectious_disease',
    'covid-19': 'infectious_disease',
    'diabetes': 'endocrinologist',
    'hypertension': 'cardiologist',
    'asthma': 'pulmonologist',
    'migraine': 'neurologist',
    'heart': 'cardiologist',
    'cancer': 'oncologist',
    'uti': 'nephrologist',
    'gastroenteritis': 'gastroenterologist',
    'fracture': 'orthopedic',
    'allergy': 'general_physician'
}

FALLBACK_CONDITION_INFO = {
    'cold': {
        'title': 'Cold and Cough',
        'symptoms': 'Runny nose, sore throat, cough, sneezing, mild fever, and tiredness.',
        'causes': 'Usually viral infection, weather changes, or allergy triggers.',
        'treatments': 'Rest, fluids, steam inhalation, fever control, and symptom relief medicines.',
        'medicines': 'Paracetamol, Cetirizine, cough syrup, saline nasal drops.',
        'when_serious': 'High fever, breathing difficulty, chest pain, or symptoms lasting more than a week.'
    },
    'typhoid': {
        'title': 'Typhoid',
        'symptoms': 'Prolonged fever, stomach pain, weakness, headache, constipation or diarrhea.',
        'causes': 'Salmonella typhi infection from contaminated food or water.',
        'treatments': 'Antibiotics, hydration, soft diet, and monitoring for complications.',
        'medicines': 'Azithromycin, Cefixime, IV fluids when required.',
        'when_serious': 'Persistent vomiting, confusion, severe dehydration, or intestinal bleeding.'
    },
    'heart': {
        'title': 'Heart Disease',
        'symptoms': 'Chest pain, shortness of breath, palpitations, swelling, tiredness.',
        'causes': 'Coronary artery disease, hypertension, diabetes, and lifestyle risk factors.',
        'treatments': 'Cardiology review, ECG, medicines, monitoring, and procedures when needed.',
        'medicines': 'Aspirin, statins, beta blockers, and blood pressure medicines as advised.',
        'when_serious': 'Sudden chest pain, sweating, fainting, or severe breathlessness.'
    },
    'cancer': {
        'title': 'Cancer',
        'symptoms': 'Depends on the organ involved; may include weight loss, pain, lump, or fatigue.',
        'causes': 'Abnormal cell growth influenced by genetics, tobacco, infection, or environment.',
        'treatments': 'Oncology consultation, surgery, chemotherapy, radiation, or targeted therapy.',
        'medicines': 'Cancer treatment varies by diagnosis and stage.',
        'when_serious': 'Any rapidly worsening pain, bleeding, breathing issues, or severe weakness.'
    },
    'uti': {
        'title': 'Urinary Tract Infection',
        'symptoms': 'Burning urination, frequent urination, lower abdominal pain, and fever.',
        'causes': 'Bacterial infection in the urinary tract.',
        'treatments': 'Antibiotics, fluids, urine testing, and kidney review if recurrent.',
        'medicines': 'Nitrofurantoin, Fosfomycin, fluids, and pain relief as prescribed.',
        'when_serious': 'Fever with chills, flank pain, vomiting, or reduced urine output.'
    },
    'gastroenteritis': {
        'title': 'Gastroenteritis',
        'symptoms': 'Loose motion, vomiting, stomach cramps, weakness, and dehydration.',
        'causes': 'Food poisoning, viral infection, bacterial infection, or contaminated water.',
        'treatments': 'ORS, fluids, bland diet, antiemetics, and doctor review if persistent.',
        'medicines': 'ORS, Ondansetron, probiotics, and antibiotics only if advised.',
        'when_serious': 'Blood in stool, severe dehydration, persistent vomiting, or confusion.'
    },
    'fracture': {
        'title': 'Fracture',
        'symptoms': 'Severe pain, swelling, deformity, and inability to move the affected part.',
        'causes': 'Trauma, accident, fall, or sports injury.',
        'treatments': 'X-ray, immobilization, pain relief, cast, or surgery when needed.',
        'medicines': 'Pain medicines and orthopedic treatment as advised.',
        'when_serious': 'Open fracture, loss of sensation, uncontrolled pain, or heavy bleeding.'
    },
    'allergy': {
        'title': 'Allergy',
        'symptoms': 'Sneezing, rash, itching, watery eyes, wheezing, or swelling.',
        'causes': 'Dust, pollen, food, medicine, or environmental trigger.',
        'treatments': 'Avoid triggers, antihistamines, inhalers, and urgent care for severe reactions.',
        'medicines': 'Cetirizine, Levocetirizine, antihistamines, and inhalers when advised.',
        'when_serious': 'Lip swelling, wheezing, breathing trouble, or fainting.'
    }
}

SYMPTOM_KEYWORDS = [
    'fever', 'cough', 'cold', 'headache', 'migraine', 'chest pain', 'breathing',
    'shortness of breath', 'vomit', 'vomiting', 'loose motion', 'diarrhea',
    'rash', 'pain', 'sore throat', 'pressure', 'burning urine', 'urine',
    'weakness', 'joint pain', 'stomach pain', 'allergy', 'swelling', 'dizziness'
]


def find_area_from_query(query_lower):
    areas = sorted(df_global['Area'].astype(str).unique(), key=len, reverse=True)
    for area in areas:
        if area.lower() in query_lower:
            return area
    return None


def resolve_condition(query_lower):
    for phrase, canonical in sorted(CONDITION_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        if phrase in query_lower:
            return canonical

    all_conditions = set(MEDICAL_KNOWLEDGE_BASE['diseases'].keys()) | set(DISEASE_COSTS.keys())
    for condition in sorted(all_conditions, key=len, reverse=True):
        if condition in query_lower:
            return condition
    return None


def get_condition_info(condition_key):
    if condition_key in MEDICAL_KNOWLEDGE_BASE['diseases']:
        info = dict(MEDICAL_KNOWLEDGE_BASE['diseases'][condition_key])
        info['title'] = condition_key.replace('-', ' ').title()
        return info
    if condition_key in FALLBACK_CONDITION_INFO:
        return FALLBACK_CONDITION_INFO[condition_key]
    return None


def resolve_specialty(query_lower, condition_key=None):
    specialty_aliases = {
        'cardiologist': 'cardiologist',
        'heart doctor': 'cardiologist',
        'neurologist': 'neurologist',
        'brain doctor': 'neurologist',
        'pulmonologist': 'pulmonologist',
        'chest doctor': 'pulmonologist',
        'lung doctor': 'pulmonologist',
        'endocrinologist': 'endocrinologist',
        'diabetes doctor': 'endocrinologist',
        'thyroid doctor': 'endocrinologist',
        'rheumatologist': 'rheumatologist',
        'infection doctor': 'infectious_disease',
        'infectious disease': 'infectious_disease',
        'gastroenterologist': 'gastroenterologist',
        'stomach doctor': 'gastroenterologist',
        'nephrologist': 'nephrologist',
        'kidney doctor': 'nephrologist',
        'oncologist': 'oncologist',
        'cancer doctor': 'oncologist',
        'psychiatrist': 'psychiatrist',
        'orthopedic': 'orthopedic',
        'ortho': 'orthopedic',
        'bone doctor': 'orthopedic',
        'general physician': 'general_physician',
        'physician': 'general_physician'
    }

    for phrase, specialty in sorted(specialty_aliases.items(), key=lambda item: len(item[0]), reverse=True):
        if phrase in query_lower:
            return specialty

    if condition_key and condition_key in CONDITION_SPECIALTY_MAP:
        return CONDITION_SPECIALTY_MAP[condition_key]

    if any(term in query_lower for term in ['chest pain', 'heartbeat', 'pressure']):
        return 'cardiologist'
    if any(term in query_lower for term in ['headache', 'migraine', 'dizziness', 'seizure']):
        return 'neurologist'
    if any(term in query_lower for term in ['cough', 'breathing', 'asthma', 'pneumonia']):
        return 'pulmonologist'
    if any(term in query_lower for term in ['vomit', 'stomach', 'loose motion', 'diarrhea']):
        return 'gastroenterologist'
    if any(term in query_lower for term in ['fracture', 'bone', 'joint', 'back pain']):
        return 'orthopedic'
    return 'general_physician'


def get_hospital_subset(area=None, limit=5):
    subset = df_global.copy()
    if area:
        subset = subset[subset['Area'].str.lower() == area.lower()]
    if subset.empty:
        subset = df_global.copy()

    subset = subset.sort_values(
        by=['risk_score', 'Doctors', 'Beds', 'efficiency_score'],
        ascending=[True, False, False, False]
    )
    return subset.head(limit)


def infer_conditions_from_symptoms(query_lower, limit=4):
    scored_conditions = []
    all_conditions = set(list(MEDICAL_KNOWLEDGE_BASE['diseases'].keys()) + list(FALLBACK_CONDITION_INFO.keys()))
    for condition in all_conditions:
        info = get_condition_info(condition)
        if not info:
            continue

        searchable = ' '.join([
            info.get('symptoms', ''),
            info.get('causes', ''),
            info.get('treatments', '')
        ]).lower()

        score = 0
        for keyword in SYMPTOM_KEYWORDS:
            if keyword in query_lower and keyword in searchable:
                score += 1
        if condition in query_lower:
            score += 3

        if score > 0:
            scored_conditions.append((condition, score))

    scored_conditions.sort(key=lambda item: item[1], reverse=True)
    return [condition for condition, _ in scored_conditions[:limit]]


def analyze_medical_query(user_query):
    query_lower = user_query.lower().strip()
    condition = resolve_condition(query_lower)
    area = find_area_from_query(query_lower)
    specialty = resolve_specialty(query_lower, condition)
    symptom_hits = sum(1 for keyword in SYMPTOM_KEYWORDS if keyword in query_lower)

    if any(word in query_lower for word in ['cost', 'price', 'expense', 'charges', 'expensive', 'affordable', 'how much', 'estimate', 'estimator']):
        if condition:
            return {'type': 'cost', 'entity': condition, 'area': area}
        return {'type': 'cost_overview', 'entity': None, 'area': area}

    for medicine in MEDICAL_KNOWLEDGE_BASE['medicines'].keys():
        if medicine in query_lower:
            return {'type': 'medicine', 'entity': medicine, 'area': area}

    if any(word in query_lower for word in ['medicine', 'tablet', 'drug', 'syrup', 'injection', 'medicines']) and condition:
        return {'type': 'medicine_for_condition', 'entity': condition, 'area': area}

    if any(word in query_lower for word in ['doctor', 'specialist', 'physician', 'consult']):
        return {'type': 'doctor', 'entity': specialty, 'area': area, 'condition': condition}

    if any(word in query_lower for word in ['hospital', 'clinic', 'healthcare', 'medical center', 'best hospital', 'nearby hospital']):
        return {'type': 'hospital', 'entity': condition, 'area': area}

    if any(word in query_lower for word in ['emergency', 'urgent', 'ambulance', 'critical', 'severe', '108', '911']):
        return {'type': 'emergency', 'entity': None, 'area': area}

    if symptom_hits >= 2 or any(word in query_lower for word in ['i have', 'having', 'suffering', 'feeling']):
        return {'type': 'symptom', 'entity': None, 'area': area}

    if condition:
        return {'type': 'disease', 'entity': condition, 'area': area}

    if any(word in query_lower for word in ['symptom', 'pain', 'ache', 'rash', 'vomit', 'bleed', 'cough', 'headache', 'i have', 'having', 'suffering']):
        return {'type': 'symptom', 'entity': None, 'area': area}

    if any(word in query_lower for word in ['prevention', 'healthy', 'exercise', 'diet', 'tip', 'advice', 'fitness', 'wellness']):
        return {'type': 'health_tip', 'entity': None, 'area': area}

    return {'type': 'general', 'entity': None, 'area': area}


def process_advanced_medical_query(user_query):
    query_lower = user_query.lower()
    query_type = analyze_medical_query(user_query)
    area = query_type.get('area')

    if query_type['type'] == 'cost':
        condition = query_type['entity']
        cost_key = condition if condition in DISEASE_COSTS else ('covid' if condition == 'covid-19' else None)
        if not cost_key:
            return "I can estimate costs for conditions like fever, pneumonia, dengue, diabetes, asthma, fracture, heart disease, cancer, UTI, and more. Try asking `Cost of dengue treatment in Delhi`."

        disease_name = DISEASE_COSTS[cost_key]['name']
        base_cost = DISEASE_COSTS[cost_key]['base_cost']
        subset = df_global.copy()
        if area:
            subset = subset[subset['Area'].str.lower() == area.lower()]
        if subset.empty:
            subset = df_global.copy()

        hospital_costs = []
        for _, hospital in subset.iterrows():
            hospital_costs.append({
                'hospital': hospital['Hospital'],
                'area': hospital['Area'],
                'cost': get_disease_cost_for_hospital(cost_key, hospital),
                'beds': int(hospital['Beds']),
                'doctors': int(hospital['Doctors']),
                'risk_level': str(hospital['risk_level'])
            })

        hospital_costs.sort(key=lambda item: item['cost'])
        avg_cost = sum(item['cost'] for item in hospital_costs) / len(hospital_costs)

        response = f"**Cost estimate for {disease_name}**\n\n"
        response += f"Base reference cost: Rs {base_cost:,.0f}\n"
        if area:
            response += f"Area filter: {area}\n"
        response += f"Average estimate: Rs {avg_cost:,.0f}\n\n"
        response += "**Most affordable hospitals**\n"
        for idx, hospital in enumerate(hospital_costs[:5], 1):
            response += f"{idx}. {hospital['hospital']} ({hospital['area']}) - Rs {hospital['cost']:,.0f} | Beds: {hospital['beds']} | Doctors: {hospital['doctors']} | Risk: {hospital['risk_level']}\n"
        response += "\nThese are model-based cost estimates, not final billing quotes."
        return response

    if query_type['type'] == 'cost_overview':
        return (
            "**Cost estimator is ready.**\n\n"
            "Try questions like:\n"
            "- Cost of fever treatment\n"
            "- Pneumonia cost in Delhi\n"
            "- Cheapest hospitals for dengue\n"
            "- Heart disease treatment cost"
        )

    if query_type['type'] == 'disease':
        condition = query_type['entity']
        info = get_condition_info(condition)
        if not info:
            return "I could not find a clean medical profile for that condition yet. Try asking about fever, dengue, diabetes, asthma, migraine, pneumonia, heart disease, fracture, cancer, UTI, or gastroenteritis."

        specialty = resolve_specialty(query_lower, condition)
        hospitals = get_hospital_subset(area=area, limit=3)
        title = info.get('title', condition.replace('-', ' ').title())
        response = f"**{title}**\n\n"
        response += f"Symptoms: {info.get('symptoms', 'Varies by patient.')}\n\n"
        if info.get('causes'):
            response += f"Causes: {info['causes']}\n\n"
        response += f"Treatment approach: {info.get('treatments', 'Medical review is recommended.')}\n\n"
        if info.get('medicines'):
            response += f"Common medicines: {info['medicines']}\n\n"
        response += f"Recommended doctor: {specialty.replace('_', ' ').title()}\n"
        if info.get('when_serious'):
            response += f"When to seek urgent care: {info['when_serious']}\n\n"
        response += "**Hospitals to consider**\n"
        for _, hospital in hospitals.iterrows():
            response += f"- {hospital['Hospital']} ({hospital['Area']}) | Beds: {int(hospital['Beds'])} | Doctors: {int(hospital['Doctors'])} | Risk: {hospital['risk_level']}\n"
        response += "\nThis is educational guidance and should not replace a doctor's diagnosis."
        return response

    if query_type['type'] == 'medicine':
        medicine = query_type['entity']
        medicine_info = MEDICAL_KNOWLEDGE_BASE['medicines'][medicine]
        response = f"**{medicine.title()}**\n\n"
        response += f"Uses: {medicine_info['uses']}\n\n"
        response += f"Typical dosage guidance: {medicine_info['dosage']}\n\n"
        response += f"Possible side effects: {medicine_info['side_effects']}\n\n"
        response += f"When to avoid or be careful: {medicine_info['contraindications']}\n\n"
        response += "Use medicines only with proper medical advice, especially for children, pregnancy, kidney disease, liver disease, or ongoing prescriptions."
        return response

    if query_type['type'] == 'medicine_for_condition':
        condition = query_type['entity']
        info = get_condition_info(condition)
        if info and info.get('medicines'):
            response = f"**Common medicines used for {info.get('title', condition.title())}**\n\n"
            response += f"{info['medicines']}\n\n"
            response += f"Treatment approach: {info.get('treatments', 'A doctor should guide the treatment plan.')}\n\n"
            response += "Please avoid self-medication for severe symptoms or long-lasting illness."
            return response
        return "I can help with medicine guidance for common conditions like fever, dengue, diabetes, asthma, migraine, UTI, or gastroenteritis. Try a more specific condition."

    if query_type['type'] == 'doctor':
        specialty = query_type['entity']
        hospitals = get_hospital_subset(area=area, limit=5)
        response = f"**Doctor guidance: {specialty.replace('_', ' ').title()}**\n\n"
        response += f"Best for: {SPECIALTY_DETAILS.get(specialty, 'General medical consultation and first-line care.')}\n\n"
        if query_type.get('condition'):
            response += f"Based on your question, this specialty matches: {query_type['condition'].replace('-', ' ').title()}\n\n"
        response += "**Hospitals to consider**\n"
        for _, hospital in hospitals.iterrows():
            response += f"- {hospital['Hospital']} ({hospital['Area']}) | Doctors: {int(hospital['Doctors'])} | Beds: {int(hospital['Beds'])} | Risk: {hospital['risk_level']}\n"
        response += "\nIf symptoms are sudden or severe, use emergency care instead of waiting for a normal appointment."
        return response

    if query_type['type'] == 'hospital':
        hospitals = get_hospital_subset(area=area, limit=5)
        response = "**Hospital recommendations**\n\n"
        if area:
            response += f"Area: {area}\n\n"
        response += "Top options based on lower risk, stronger staffing, and capacity:\n"
        for _, hospital in hospitals.iterrows():
            response += f"- {hospital['Hospital']} ({hospital['Area']}) | Beds: {int(hospital['Beds'])} | Doctors: {int(hospital['Doctors'])} | Risk: {hospital['risk_level']} | Efficiency: {hospital['efficiency_score']:.2f}\n"
        response += "\nYou can also ask for a specialty-linked request like `best hospitals for heart disease in Delhi`."
        return response

    if query_type['type'] == 'emergency':
        return (
            "**Emergency guidance**\n\n"
            "Immediate action numbers in India:\n"
            "1. 108 - Ambulance\n"
            "2. 102 - Medical transport support in many regions\n"
            "3. 100 - Police if safety help is needed\n\n"
            "Go to emergency immediately for chest pain, severe breathing trouble, heavy bleeding, unconsciousness, stroke signs, seizures, or poisoning.\n\n"
            "Use the Emergency Route tab on this website to find the nearest hospitals fast."
        )

    if query_type['type'] == 'symptom':
        matches = infer_conditions_from_symptoms(query_lower, limit=4)
        specialty = resolve_specialty(query_lower)
        hospitals = get_hospital_subset(area=area, limit=3)
        response = "**Symptom guidance**\n\n"
        if matches:
            response += "Possible conditions to discuss with a doctor:\n"
            for condition in matches:
                info = get_condition_info(condition)
                label = info.get('title', condition.replace('-', ' ').title()) if info else condition.title()
                response += f"- {label}\n"
            response += "\n"
        else:
            response += "I could not confidently match the symptoms, so a doctor review is the safest next step.\n\n"
        response += f"Suggested doctor: {specialty.replace('_', ' ').title()}\n\n"
        response += "**Hospitals to consider**\n"
        for _, hospital in hospitals.iterrows():
            response += f"- {hospital['Hospital']} ({hospital['Area']}) | Doctors: {int(hospital['Doctors'])} | Beds: {int(hospital['Beds'])}\n"
        response += "\nIf symptoms are fast-worsening or include chest pain, breathing trouble, confusion, fainting, or heavy bleeding, go for emergency care now."
        return response

    if query_type['type'] == 'health_tip':
        return (
            "**Health and wellness tips**\n\n"
            "Exercise: Aim for at least 30 minutes of moderate activity most days.\n\n"
            "Food: Choose vegetables, fruits, whole grains, protein, and less processed sugar and salt.\n\n"
            "Sleep: Try for 7 to 8 hours with a regular routine.\n\n"
            "Prevention: Get regular checkups, monitor blood pressure and sugar when needed, stay hydrated, and avoid smoking.\n\n"
            "If you want, ask me for disease-specific advice like `diet tips for diabetes` or `how to prevent dengue`."
        )

    return (
        "**Medical AI Assistant**\n\n"
        "You can ask me about:\n"
        "- Disease information and symptoms\n"
        "- Medicine guidance\n"
        "- Which doctor or specialist to visit\n"
        "- Hospital recommendations by city\n"
        "- Treatment cost estimation\n"
        "- Emergency guidance\n\n"
        "Examples:\n"
        "- Cost of dengue treatment in Delhi\n"
        "- Which doctor for migraine\n"
        "- Medicine for fever\n"
        "- Best hospitals in Mumbai\n"
        "- I have cough and fever"
    )


def process_chatbot_query(user_query):
    return process_advanced_medical_query(user_query)


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

# ===== REAL-TIME HOSPITAL DATA ENDPOINTS =====
@app.route('/api/realtime-hospitals')
def get_realtime_hospitals():
    """Returns hospital data with real-time simulated activity"""
    import random
    
    # Simulate real-time changes to hospital data based on time
    current_hour = datetime.now().hour
    current_minute = datetime.now().minute
    
    df = df_global.copy()
    
    # Simulate changing patient loads throughout the day
    # Peak hours: 10-14 and 18-22
    hour_factor = 1.0
    if 10 <= current_hour <= 14:
        hour_factor = 1.3  # +30% patients during peak hours
    elif 18 <= current_hour <= 22:
        hour_factor = 1.2  # +20% patients in evening
    elif 23 <= current_hour or current_hour <= 6:
        hour_factor = 0.6  # -40% patients at night
    
    # Add realistic variation (+/- 15%) for each hospital
    variation = np.random.normal(1.0, 0.05, len(df))
    df['Patients_Per_Day_Live'] = (df['Patients_Per_Day'] * hour_factor * variation).astype(int)
    
    # Update related metrics
    df['patient_doctor_ratio'] = df['Patients_Per_Day_Live'] / df['Doctors']
    df['bed_occupancy'] = df['Patients_Per_Day_Live'] / df['Beds']
    
    # Recalculate risk scores based on live data
    def calculate_live_risk_score(row):
        score = 50
        pdr = row['patient_doctor_ratio']
        
        if pdr > 10: score += 30
        elif pdr > 8: score += 15
        elif pdr > 6.5: score += 5
        else: score -= 10
        
        bo = row['bed_occupancy']
        if bo > 1.8: score += 20
        elif bo > 1.6: score += 10
        elif bo > 1.4: score += 5
        else: score -= 5
        
        return max(0, min(score, 100))
    
    df['risk_score'] = df.apply(calculate_live_risk_score, axis=1)
    df['risk_level'] = pd.cut(df['risk_score'], 
                               bins=[0, 35, 55, 75, 100],
                               labels=['Low', 'Medium', 'High', 'Critical'],
                               right=False)
    
    hospitals_realtime = df.to_dict('records')
    
    return jsonify({
        'hospitals': hospitals_realtime,
        'timestamp': datetime.now().isoformat(),
        'data_age_seconds': (current_minute * 60) + datetime.now().second,
        'hour': current_hour,
        'activity_level': 'High' if 10 <= current_hour <= 22 else 'Low'
    })

@app.route('/api/realtime-summary')
def get_realtime_summary():
    """Get real-time summary statistics"""
    import random
    
    # Fetch current real-time data
    realtime_response = get_realtime_hospitals()
    data = realtime_response.json if hasattr(realtime_response, 'json') else json.loads(realtime_response.data)
    
    df_realtime = pd.DataFrame(data['hospitals'])
    
    summary = {
        'total_hospitals': len(df_realtime),
        'critical_risk': int((df_realtime['risk_level'] == 'Critical').sum()),
        'high_risk': int((df_realtime['risk_level'] == 'High').sum()),
        'medium_risk': int((df_realtime['risk_level'] == 'Medium').sum()),
        'low_risk': int((df_realtime['risk_level'] == 'Low').sum()),
        'total_hospitals_stat': len(df_realtime),
        'avg_patient_doctor_ratio': float(df_realtime['patient_doctor_ratio'].mean()),
        'avg_bed_occupancy': float(df_realtime['bed_occupancy'].mean()),
        'model_scores': model_scores,
        'timestamp': data['timestamp'],
        'activity_level': data['activity_level']
    }
    
    return jsonify(summary)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
