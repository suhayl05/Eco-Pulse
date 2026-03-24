import pandas as pd
import numpy as np
import random

def generate_plant_data(samples=1000):
    data = []
    for _ in range(samples):
        temp = round(random.uniform(5, 55), 1)
        hum = round(random.uniform(10, 95), 1)
        soil = round(random.uniform(5, 95), 1)
        light = random.choice(["Bright", "Dark"])
        
        # Scoring logic based on the app's heuristics
        s_score = 0; t_score = 0; h_score = 0; l_score = 0
        
        # Soil (40-80%)
        if 40 <= soil <= 80: s_score = 25
        elif 20 <= soil < 40 or 80 < soil <= 95: s_score = 16
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
        l_score = 25 if light == "Bright" else 10
        
        score = s_score + t_score + h_score + l_score
        
        # Map to "true" target labels (Perfect, Healthy, etc.)
        if score >= 90: status = "Perfect"
        elif score >= 76: status = "Healthy"
        elif score >= 56: status = "Doing well"
        elif score >= 40: status = "I'm okay"
        else: status = "Struggling"
        
        data.append({
            "temperature": temp,
            "humidity": hum,
            "soil_moisture": soil,
            "light_level": 1 if light == "Bright" else 0,
            "health_score": score,
            "status": status
        })
    return pd.DataFrame(data)

# Save to CSV
df = generate_plant_data(1200)
df.to_csv("plant_training_data.csv", index=False)
print("Generated plant_training_data.csv with 1200 samples.")
