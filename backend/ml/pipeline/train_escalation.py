import os
import sys
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.metrics import roc_auc_score, recall_score, precision_score, classification_report, confusion_matrix
from sklearn.cluster import KMeans
from sklearn.base import BaseEstimator, TransformerMixin
# Add backend directory to sys.path if running as script
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.pipeline.features import EscalationFeatureExtractor

def main():
    print("Loading events data...")
    dataset_path = os.path.abspath(os.path.join(current_dir, "..", "dataset", "events.csv"))
    df = pd.read_csv(dataset_path)
    
    # Clean datetime fields
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce', utc=True)
    df = df.dropna(subset=['start_datetime']).sort_values('start_datetime').reset_index(drop=True)
    
    # 1. Clean and normalize fields
    df["event_cause"] = df["event_cause"].fillna("others").str.lower().str.strip()
    df["event_cause"] = df["event_cause"].replace({
        "water_logging": "waterlogging",
        "pot_holes": "pothole"
    })
    df["priority"] = df["priority"].fillna("Low").str.capitalize().str.strip()
    df["requires_road_closure"] = df["requires_road_closure"].astype(str).str.upper() == "TRUE"
    df["junction"] = df["junction"].fillna("Unknown").str.strip()
    df["zone"] = df["zone"].fillna("Unknown").str.strip()
    
    # Extract temporal features needed for target computation
    df['hour'] = df['start_datetime'].dt.hour
    
    print("Computing target variable 'escalation'...")
    # Target: escalation = 1 if events at the same junction in the rolling hour of this event's start time > 1
    # We do a self-join or rolling window count.
    # To be extremely efficient, we can iterate or use searchsorted.
    escalation_labels = []
    
    # Sort by junction and start_datetime to do fast windowing
    df_sorted = df.sort_values(['junction', 'start_datetime']).copy()
    df_sorted['escalation'] = 0
    
    # We can group by junction and find rolling counts
    for j_id, group in df_sorted.groupby('junction'):
        times = group['start_datetime'].values
        n = len(times)
        for i in range(n):
            t_start = times[i]
            # 1 hour window
            t_end = t_start + np.timedelta64(1, 'h')
            # Count elements in [t_start, t_end]
            count = np.sum((times >= t_start) & (times <= t_end))
            if count > 1:
                df_sorted.loc[group.index[i], 'escalation'] = 1
                
    # Merge target back into df
    df = df.merge(df_sorted[['id', 'escalation']], on='id', how='left')
    df['escalation'] = df['escalation'].fillna(0).astype(int)
    
    # 2. Chronological Split (80% Train, 20% Test)
    split_idx = int(len(df) * 0.8)
    df_train = df.iloc[:split_idx].copy()
    df_test = df.iloc[split_idx:].copy()
    
    # 3. Compute 'events_in_hour' feature (historical frequency per junction+hour combo) on train
    freq_map = df_train.groupby(['junction', 'hour']).size().to_dict()
    
    def get_freq(row):
        return freq_map.get((row['junction'], row['hour']), 0)
        
    df_train['events_in_hour'] = df_train.apply(get_freq, axis=1)
    df_test['events_in_hour'] = df_test.apply(get_freq, axis=1)
    
    # Define features and target
    feature_cols = ['event_cause', 'priority', 'requires_road_closure', 'junction', 'zone', 'start_datetime', 'events_in_hour']
    
    X_train = df_train[feature_cols]
    y_train = df_train['escalation']
    X_test = df_test[feature_cols]
    y_test = df_test['escalation']
    
    print(f"Train size: {len(X_train)} (Positive class: {sum(y_train)}), Test size: {len(X_test)} (Positive class: {sum(y_test)})")
    
    # Preprocessor
    categorical_cols = ['event_cause', 'priority', 'zone', 'junction']
    numerical_cols = ['hour', 'day_of_week', 'requires_road_closure', 'events_in_hour']
    
    col_transformer = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_cols),
            ('num', StandardScaler(), numerical_cols)
        ],
        remainder='drop'
    )
    
    preprocessor = Pipeline(steps=[
        ('feature_extractor', EscalationFeatureExtractor()),
        ('col_transformer', col_transformer)
    ])
    
    X_train_trans = preprocessor.fit_transform(X_train)
    X_test_trans = preprocessor.transform(X_test)
    
    # Train XGBoost with balanced positive weights
    pos_count = sum(y_train)
    neg_count = len(y_train) - pos_count
    scale_pos = neg_count / pos_count if pos_count > 0 else 1.0
    
    print(f"Calculated scale_pos_weight: {scale_pos:.4f}")
    
    model = XGBClassifier(
        objective='binary:logistic',
        eval_metric='logloss',
        scale_pos_weight=scale_pos,
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        n_jobs=1
    )
    
    model.fit(X_train_trans, y_train)
    
    # Predict and evaluate
    y_pred = model.predict(X_test_trans)
    y_probs = model.predict_proba(X_test_trans)[:, 1]
    
    roc_auc = roc_auc_score(y_test, y_probs)
    recall_pos = recall_score(y_test, y_pred)
    precision_pos = precision_score(y_test, y_pred, zero_division=0)
    
    print("\n--- Model Evaluation ---")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print(f"Recall (escalation=1): {recall_pos:.4f}")
    print(f"Precision (escalation=1): {precision_pos:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save artifacts
    models_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "models"))
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(model, os.path.join(models_dir, "escalation_model.joblib"))
    joblib.dump(preprocessor, os.path.join(models_dir, "escalation_preprocessor.joblib"))
    
    # Save frequency mapping for predictor service usage
    # Convert tuple keys to string keys for JSON serialization
    str_freq_map = {f"{k[0]}||{k[1]}": v for k, v in freq_map.items()}
    with open(os.path.join(models_dir, "escalation_freq_map.json"), "w") as f:
        import json
        json.dump(str_freq_map, f)
        
    print("Saved escalation_model.joblib and escalation_preprocessor.joblib successfully.")

if __name__ == "__main__":
    main()
