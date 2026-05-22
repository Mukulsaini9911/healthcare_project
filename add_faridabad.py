import pandas as pd

# Read current data
df = pd.read_csv('data.csv')
print(f'Current rows: {len(df)}')

# Create Faridabad hospitals data
faridabad_hospitals = pd.DataFrame([
    {'Area': 'Faridabad', 'Hospital': 'Metro Hospital Faridabad', 'Beds': 450, 'Doctors': 95, 'Patients_Per_Day': 680, 'Latitude': 28.4089, 'Longitude': 77.3178},
    {'Area': 'Faridabad', 'Hospital': 'Fortis Hospital Faridabad', 'Beds': 650, 'Doctors': 138, 'Patients_Per_Day': 920, 'Latitude': 28.4176, 'Longitude': 77.3245},
    {'Area': 'Faridabad', 'Hospital': 'Apollo Hospital Faridabad', 'Beds': 700, 'Doctors': 150, 'Patients_Per_Day': 950, 'Latitude': 28.4134, 'Longitude': 77.3089},
    {'Area': 'Faridabad', 'Hospital': 'Artemis Hospital Faridabad', 'Beds': 800, 'Doctors': 165, 'Patients_Per_Day': 1100, 'Latitude': 28.4224, 'Longitude': 77.3312},
    {'Area': 'Faridabad', 'Hospital': 'Chaudhary Devi Lal Hospital', 'Beds': 600, 'Doctors': 125, 'Patients_Per_Day': 850, 'Latitude': 28.4011, 'Longitude': 77.3021}
])

# Append and save
df = pd.concat([df, faridabad_hospitals], ignore_index=True)
df.to_csv('data.csv', index=False)

print(f'New rows: {len(df)}')
print(f'Faridabad in data: {"Faridabad" in df["Area"].values}')
print(f'Faridabad hospitals: {len(df[df["Area"] == "Faridabad"])}')
print('✅ Faridabad hospitals added successfully!')
