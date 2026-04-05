import pandas as pd
import os

# Read the CSV
df = pd.read_csv('data.csv')

# Create features
df['patient_doctor_ratio'] = df['Patients_Per_Day'] / df['Doctors']
df['bed_occupancy'] = df['Patients_Per_Day'] / df['Beds']
df['efficiency_score'] = (df['Beds'] + df['Doctors']) / df['Patients_Per_Day']

# Risk scoring
def calculate_risk_score(row):
    score = 0
    pdr = row['patient_doctor_ratio']
    if pdr > 30: score += 40
    elif pdr > 20: score += 30
    elif pdr > 15: score += 20
    elif pdr > 10: score += 10
    
    bo = row['bed_occupancy']
    if bo > 3: score += 35
    elif bo > 2: score += 25
    elif bo > 1.5: score += 15
    elif bo > 1: score += 10
    
    eff = row['efficiency_score']
    if eff < 0.03: score += 25
    elif eff < 0.05: score += 15
    elif eff < 0.08: score += 5
    
    return min(score, 100)

df['risk_score'] = df.apply(calculate_risk_score, axis=1)
df['risk_level'] = pd.cut(df['risk_score'], 
                           bins=[0, 25, 50, 75, 100],
                           labels=['Low', 'Medium', 'High', 'Critical'])

# Save to Excel for Power BI
output_file = 'hospital_data_for_powerbi.xlsx'

# Create Excel writer
with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
    # Main data
    df.to_excel(writer, sheet_name='Hospital Data', index=False)
    
    # Summary statistics
    summary = pd.DataFrame({
        'Metric': [
            'Total Hospitals',
            'Average Patient-Doctor Ratio',
            'Average Bed Occupancy',
            'Average Efficiency Score',
            'Critical Risk Count',
            'High Risk Count',
            'Medium Risk Count',
            'Low Risk Count'
        ],
        'Value': [
            len(df),
            df['patient_doctor_ratio'].mean(),
            df['bed_occupancy'].mean(),
            df['efficiency_score'].mean(),
            len(df[df['risk_level'] == 'Critical']),
            len(df[df['risk_level'] == 'High']),
            len(df[df['risk_level'] == 'Medium']),
            len(df[df['risk_level'] == 'Low'])
        ]
    })
    summary.to_excel(writer, sheet_name='Summary', index=False)
    
    # Risk breakdown
    risk_breakdown = df.groupby('risk_level').size().reset_index(name='Count')
    risk_breakdown.to_excel(writer, sheet_name='Risk Breakdown', index=False)

print(f"✓ Excel file created: {output_file}")
print("✓ Use this file to create Power BI dashboard")
print("✓ Simply import this file into Power BI Desktop")
