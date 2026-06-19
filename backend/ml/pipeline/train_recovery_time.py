import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.cluster import KMeans
from sklearn.base import BaseEstimator, TransformerMixin

# Add backend directory to sys.path if running as script
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from features import LeakageFreeFeatureExtractor

def mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    # Avoid division by zero
    mask = y_true != 0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

def main():
    print("Loading data...")
    df = pd.read_csv("c:/Users/samik/OneDrive/Desktop/TrafficOps-AI/backend/ml/dataset/events.csv")
    
    # Clean datetime fields
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce', utc=True)
    df['closed_datetime'] = pd.to_datetime(df['closed_datetime'], errors='coerce', utc=True)
    
    # Filter missing datetimes
    df = df.dropna(subset=['start_datetime', 'closed_datetime']).copy()
    
    # Create target variable
    df['duration_minutes'] = (df['closed_datetime'] - df['start_datetime']).dt.total_seconds() / 60.0
    
    # Filter non-positive durations
    df = df[df['duration_minutes'] > 0].copy()
    
    # Remove outliers using 99th percentile clipping
    p99 = df['duration_minutes'].quantile(0.99)
    df = df[df['duration_minutes'] <= p99].copy()
    
    # Sort chronologically
    df = df.sort_values('start_datetime').reset_index(drop=True)
    
    # Clean categories
    df["event_cause"] = df["event_cause"].fillna("others").str.lower().str.strip()
    df["event_cause"] = df["event_cause"].replace({
        "water_logging": "waterlogging",
        "pot_holes": "pothole"
    })
    df["event_type"] = df["event_type"].fillna("unplanned").str.lower().str.strip()
    df["requires_road_closure"] = df["requires_road_closure"].astype(str).str.upper() == "TRUE"
    df["priority"] = df["priority"].fillna("Low").str.capitalize().str.strip()
    
    X = df[['event_cause', 'event_type', 'priority', 'requires_road_closure', 'latitude', 'longitude', 'start_datetime']]
    y = df['duration_minutes']
    
    # Chronological Split (80% Train, 20% Test)
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
    
    # Setup feature engineering and transformation pipeline
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
    
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    
    # Get feature names out
    feature_names = col_transformer.get_feature_names_out().tolist()
    
    # Models to train
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=1),
        "XGBRegressor": XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=1)
    }
    
    results = {}
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_trans, y_train)
        y_pred = model.predict(X_test_trans)
        
        # Calculate regression metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mape = mean_absolute_percentage_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        results[name] = {
            "MAE": mae,
            "RMSE": rmse,
            "MAPE": mape,
            "R2": r2,
            "model": model
        }
        
    # Print comparison
    print("\n--- Regression Model Evaluation Table ---")
    print(f"{'Model':25} | {'MAE':10} | {'RMSE':10} | {'MAPE':8} | {'R2':8}")
    print("-" * 70)
    for name, metrics in results.items():
        print(f"{name:25} | {metrics['MAE']:.4f}     | {metrics['RMSE']:.4f}     | {metrics['MAPE']:.2f}%  | {metrics['R2']:.4f}")
        
    best_name = min(results, key=lambda k: results[k]['MAE'])
    best_model = results[best_name]['model']
    print(f"\nBest Model Selected (Lowest MAE): {best_name}")
    
    # Save artifacts
    models_dir_path = "c:/Users/samik/OneDrive/Desktop/TrafficOps-AI/backend/models"
    os.makedirs(models_dir_path, exist_ok=True)
    
    joblib.dump(best_model, os.path.join(models_dir_path, "recovery_time_model.joblib"))
    joblib.dump(preprocessor, os.path.join(models_dir_path, "recovery_time_preprocessor.joblib"))
    
    with open(os.path.join(models_dir_path, "feature_names.json"), "w") as f:
        json.dump(feature_names, f)
        
    metadata = {
        "model_name": "RecoveryTimePredictor",
        "version": "1.0",
        "algorithm": best_name,
        "features": feature_names,
        "metrics": {
            "MAE": results[best_name]['MAE'],
            "RMSE": results[best_name]['RMSE'],
            "MAPE": results[best_name]['MAPE'],
            "R2": results[best_name]['R2']
        }
    }
    with open(os.path.join(models_dir_path, "recovery_time_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    print("Saved all recovery predictor model artifacts successfully.")

if __name__ == "__main__":
    main()
