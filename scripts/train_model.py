import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load refined data
df = pd.read_csv('refined_plant_data.csv')

# Prep data
X = df[['temperature', 'humidity', 'soil_percent', 'light_status']]
y = df['health_score']

# Train model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Save for deployment
joblib.dump(model, 'plant_model.joblib')
print("Model trained and saved as plant_model.joblib")
