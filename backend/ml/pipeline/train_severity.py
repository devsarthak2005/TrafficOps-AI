import os
import sys
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.cluster import KMeans
from sklearn.base import BaseEstimator, TransformerMixin

# Add backend directory to sys.path if running as script
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from features import LeakageFreeFeatureExtractor

def main():
    print("Loading data...")
    df = pd.read_csv("c:/Users/samik/OneDrive/Desktop/TrafficOps-AI/backend/ml/dataset/events.csv")
    
    # 1. Clean categories
    df["event_cause"] = df["event_cause"].fillna("others").str.lower().str.strip()
    df["event_cause"] = df["event_cause"].replace({
        "water_logging": "waterlogging",
        "pot_holes": "pothole"
    })
    df["event_type"] = df["event_type"].fillna("unplanned").str.lower().str.strip()
    df["requires_road_closure"] = df["requires_road_closure"].astype(str).str.upper() == "TRUE"
    df["priority"] = df["priority"].fillna("Low").str.capitalize().str.strip()
    
    # Create target
    def get_severity(row):
        cause = row["event_cause"]
        priority = row["priority"]
        closure = row["requires_road_closure"]
        if priority == "High" and closure and cause in ["accident", "vip_movement", "protest", "fire", "gas_leakage"]:
            return "Critical"
        if closure:
            return "High"
        if priority == "High" and cause in ["accident", "waterlogging", "protest", "procession", "vip_movement", "road_damage"]:
            return "High"
        if priority == "High":
            return "Medium"
        if priority == "Low" and not closure and cause in ["construction", "waterlogging", "pothole", "tree_fall", "procession", "vehicle_breakdown"]:
            return "Medium"
        return "Low"

    df["severity_level"] = df.apply(get_severity, axis=1)
    
    # Sort chronologically by start_datetime
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce', utc=True)
    df = df.dropna(subset=['start_datetime']).sort_values('start_datetime').reset_index(drop=True)
    
    # Target encoding map
    target_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
    
    # Features and Target split
    X = df[['event_cause', 'event_type', 'priority', 'requires_road_closure', 'latitude', 'longitude', 'start_datetime']]
    y = df['severity_level'].map(target_map)
    
    # 80/20 train/test split chronologically
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
    
    # Preprocessor pipeline
    categorical_cols = ['event_cause', 'event_type']
    numerical_cols = ['latitude', 'longitude', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'month', 'is_weekend', 'location_cluster', 'priority_encoded', 'requires_road_closure']
    
    col_transformer = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols),
            ('num', StandardScaler(), numerical_cols)
        ],
        remainder='drop'
    )
    
    preprocessor = Pipeline(steps=[
        ('feature_extractor', LeakageFreeFeatureExtractor(n_clusters=8)),
        ('col_transformer', col_transformer)
    ])
    
    # Transform
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    
    # Compute class weights to handle imbalance
    sample_weights = compute_sample_weight(class_weight='balanced', y=y_train)
    
    # Initialize models
    # We use multi-class log loss and balance weights where supported
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=1),
        "XGBoost": XGBClassifier(objective='multi:softprob', num_class=4, eval_metric='mlogloss', n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=1)
    }
    
    results = {}
    for name, model in models.items():
        print(f"Training {name}...")
        if name == "XGBoost":
            model.fit(X_train_trans, y_train, sample_weight=sample_weights)
        else:
            model.fit(X_train_trans, y_train)
            
        y_pred = model.predict(X_test_trans)
        
        # Calculate metrics
        acc = accuracy_score(y_test, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)
        cm = confusion_matrix(y_test, y_pred)
        
        results[name] = {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "cm": cm.tolist(),
            "model": model
        }
        
    # Print comparison
    print("\n--- Model Evaluation Comparison Table ---")
    print(f"{'Model':20} | {'Accuracy':8} | {'Precision':9} | {'Recall':8} | {'F1-Score':8}")
    print("-" * 65)
    for name, metrics in results.items():
        print(f"{name:20} | {metrics['accuracy']:.4f}   | {metrics['precision']:.4f}    | {metrics['recall']:.4f} | {metrics['f1']:.4f}")
        
    # Select best model (based on F1-Score)
    best_name = max(results, key=lambda k: results[k]['f1'])
    best_model = results[best_name]['model']
    print(f"\nBest Model Selected: {best_name}")
    print("Confusion Matrix:")
    print(np.array(results[best_name]['cm']))
    
    # Save artifacts
    models_dir_path = "c:/Users/samik/OneDrive/Desktop/TrafficOps-AI/backend/models"
    os.makedirs(models_dir_path, exist_ok=True)
    
    joblib.dump(best_model, os.path.join(models_dir_path, "severity_model.joblib"))
    joblib.dump(preprocessor, os.path.join(models_dir_path, "severity_preprocessor.joblib"))
    print("Saved severity_model.joblib and severity_preprocessor.joblib successfully.")

if __name__ == "__main__":
    main()
