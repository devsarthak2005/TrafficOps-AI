import joblib
import json
import pandas as pd
import numpy as np

model_path = "c:/Users/samik/OneDrive/Desktop/TrafficOps-AI/backend/models/recovery_time_model.joblib"
metadata_path = "c:/Users/samik/OneDrive/Desktop/TrafficOps-AI/backend/models/recovery_time_metadata.json"

model = joblib.load(model_path)
with open(metadata_path, 'r') as f:
    meta = json.load(f)

features = meta["features"]
importances = model.feature_importances_

df_imp = pd.DataFrame({
    "Feature": features,
    "Importance": importances
}).sort_values("Importance", ascending=False)

print("\n--- Feature Importance (Recovery Time Predictor) ---")
print(df_imp.to_string(index=False))
