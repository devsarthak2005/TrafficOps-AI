import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from xgboost import XGBClassifier
from sklearn.utils.class_weight import compute_sample_weight

# Add backend directory to sys.path if running as script
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from preprocess import load_and_preprocess_data
from features import build_feature_pipeline

def main():
    print("1. Loading and preprocessing data...")
    dataset_path = os.path.join(current_dir, "../dataset/events.csv")
    df = load_and_preprocess_data(dataset_path)
    
    # Target encoding map
    # Classes: Low, Medium, High, Critical
    target_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
    inverse_target_map = {v: k for k, v in target_map.items()}
    
    X = df.drop('impact_level', axis=1)
    y = df['impact_level'].map(target_map)
    
    print("2. Splitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("3. Building feature engineering pipeline...")
    feature_pipeline = build_feature_pipeline()
    
    print("4. Fitting feature pipeline...")
    X_train_transformed = feature_pipeline.fit_transform(X_train)
    X_test_transformed = feature_pipeline.transform(X_test)
    
    print("5. Computing sample weights to handle imbalance...")
    # XGBoost accepts sample_weight during fit to handle imbalance
    sample_weights = compute_sample_weight(class_weight='balanced', y=y_train)
    
    print("6. Training XGBoost Classifier...")
    model = XGBClassifier(
        objective='multi:softmax',
        num_class=4,
        eval_metric='mlogloss',
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(
        X_train_transformed, 
        y_train, 
        sample_weight=sample_weights
    )
    
    print("7. Evaluating model...")
    y_pred = model.predict(X_test_transformed)
    
    target_names = ['Low', 'Medium', 'High', 'Critical']
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=target_names))
    
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("\n8. Saving Model and Preprocessor...")
    models_dir = os.path.join(current_dir, "../../models")
    os.makedirs(models_dir, exist_ok=True)
    
    # Save feature pipeline
    preprocessor_path = os.path.join(models_dir, "feature_pipeline.joblib")
    joblib.dump(feature_pipeline, preprocessor_path)
    
    # Save trained model
    model_path = os.path.join(models_dir, "xgboost_impact_model.joblib")
    joblib.dump(model, model_path)
    
    print(f"Successfully saved artifacts to {models_dir}")

if __name__ == "__main__":
    main()
