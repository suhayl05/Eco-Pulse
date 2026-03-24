import pandas as pd

# Load the user's sensor data
csv_path = r"C:\Users\1\Downloads\ecopulse\data\sensor_data_sim_20260221_125857.csv"
df = pd.read_csv(csv_path)

def calculate_score(row):
    temp = row['temperature']
    hum = row['humidity']
    soil = row['soil_moisture']
    light = row['light_ok']
    
    s_score = 0; t_score = 0; h_score = 0; l_score = 0
    
    # Soil (40-80%)
    if 40 <= soil <= 80: s_score = 25
    elif 20 <= soil < 40: s_score = 16
    elif 80 < soil <= 95: s_score = 16
    else: s_score = 5
    
    # Temp (20-45)
    if 20 <= temp <= 45: t_score = 25
    elif 10 <= temp < 20 or 45 < temp <= 55: t_score = 16
    else: t_score = 5
    
    # Humidity (40-80)
    if 40 <= hum <= 80: h_score = 25
    elif 30 <= hum < 40 or 80 < hum <= 90: h_score = 10
    else: h_score = 5
    
    # Light
    if light == 1: l_score = 25
    else: l_score = 10
    
    return s_score + t_score + h_score + l_score

# Apply labeling
print("Labeling data points...")
df['health_score'] = df.apply(calculate_score, axis=1)

# Rename columns to match model expectations if needed
# The model expects [temp, hum, soil, light]
df_refined = df[['temperature', 'humidity', 'soil_moisture', 'light_ok', 'health_score']]
df_refined.columns = ['temperature', 'humidity', 'soil_percent', 'light_status', 'health_score']

# Save refined data
output_path = "refined_plant_data.csv"
df_refined.to_csv(output_path, index=False)
print(f"Refined data saved to {output_path} ({len(df_refined)} rows)")
