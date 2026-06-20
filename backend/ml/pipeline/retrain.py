import os
import sys
import json
import joblib
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import f1_score, mean_absolute_error, roc_auc_score
from xgboost import XGBClassifier, XGBRegressor

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.pipeline.features import LeakageFreeFeatureExtractor, EscalationFeatureExtractor

DATABASE_FILE = os.path.join(backend_dir, "database.db")
MODELS_DIR = os.path.join(backend_dir, "models")
METRICS_LOG = os.path.join(MODELS_DIR, "mlflow_light_metrics.json")

def load_incidents_from_db():
    """Pulls all incidents from SQLite and formats as events.csv schema."""
    conn = sqlite3.connect(DATABASE_FILE)
    query = """
        SELECT i.id, i.event_cause, i.event_type, i.priority, i.requires_road_closure,
               i.latitude, i.longitude, i.start_datetime, i.closed_datetime, i.status,
               j.name as junction, j.zone, j.road_type as corridor
        FROM incidents i
        LEFT JOIN junctions j ON i.junction_id = j.id
    """
    df = pd.read_query = pd.read_sql_query(query, conn)
    conn.close()
    return df

def retrain_severity(df, current_models_exist):
    print("Evaluating Severity Classifier...")
    # Preprocess
    df_sev = df.copy()
    df_sev["event_cause"] = df_sev["event_cause"].fillna("others").str.lower().str.strip()
    df_sev["event_cause"] = df_sev["event_cause"].replace({"water_logging": "waterlogging", "pot_holes": "pothole"})
    df_sev["event_type"] = df_sev["event_type"].fillna("unplanned").str.lower().str.strip()
    df_sev["requires_road_closure"] = df_sev["requires_road_closure"].astype(str).str.upper() == "TRUE"
    df_sev["priority"] = df_sev["priority"].fillna("Low").str.capitalize().str.strip()
    
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

    df_sev["severity_level"] = df_sev.apply(get_severity, axis=1)
    df_sev['start_datetime'] = pd.to_datetime(df_sev['start_datetime'], errors='coerce', utc=True)
    df_sev = df_sev.dropna(subset=['start_datetime']).sort_values('start_datetime').reset_index(drop=True)
    
    target_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
    X = df_sev[['event_cause', 'event_type', 'priority', 'requires_road_closure', 'latitude', 'longitude', 'start_datetime']]
    y = df_sev['severity_level'].map(target_map)
    
    split_idx = int(len(df_sev) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Preprocessor
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
    
    new_model = XGBClassifier(objective='multi:softprob', num_class=4, eval_metric='mlogloss', n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=1)
    new_model.fit(X_train_trans, y_train)
    
    y_pred_new = new_model.predict(X_test_trans)
    new_f1 = f1_score(y_test, y_pred_new, average='weighted', zero_division=0)
    
    promote = True
    current_f1 = 0.0
    
    if current_models_exist:
        try:
            curr_model_path = os.path.join(MODELS_DIR, "severity_model.joblib")
            curr_prep_path = os.path.join(MODELS_DIR, "severity_preprocessor.joblib")
            if os.path.exists(curr_model_path) and os.path.exists(curr_prep_path):
                curr_prep = joblib.load(curr_prep_path)
                curr_model = joblib.load(curr_model_path)
                X_test_trans_curr = curr_prep.transform(X_test)
                y_pred_curr = curr_model.predict(X_test_trans_curr)
                current_f1 = f1_score(y_test, y_pred_curr, average='weighted', zero_division=0)
                if current_f1 >= new_f1:
                    promote = False
        except Exception as e:
            print(f"Error loading current production severity model: {e}. Promoting new model by default.")
            
    if promote:
        print(f"Promotion Approved: New F1 ({new_f1:.4f}) beats/replaces production model F1 ({current_f1:.4f}).")
        joblib.dump(new_model, os.path.join(MODELS_DIR, "severity_model.joblib"))
        joblib.dump(preprocessor, os.path.join(MODELS_DIR, "severity_preprocessor.joblib"))
    else:
        print(f"Promotion Rejected: New F1 ({new_f1:.4f}) does not beat production model F1 ({current_f1:.4f}).")
        
    return {"current_f1": current_f1, "new_f1": new_f1, "promoted": promote}

def retrain_recovery_time(df, current_models_exist):
    print("Evaluating Recovery Time Regressor...")
    df_rec = df.copy()
    df_rec['start_datetime'] = pd.to_datetime(df_rec['start_datetime'], errors='coerce', utc=True)
    df_rec['closed_datetime'] = pd.to_datetime(df_rec['closed_datetime'], errors='coerce', utc=True)
    
    df_rec = df_rec.dropna(subset=['start_datetime', 'closed_datetime']).copy()
    df_rec['duration_minutes'] = (df_rec['closed_datetime'] - df_rec['start_datetime']).dt.total_seconds() / 60.0
    df_rec = df_rec[df_rec['duration_minutes'] > 0].copy()
    
    p99 = df_rec['duration_minutes'].quantile(0.99)
    if pd.isna(p99):
        p99 = 120.0
    df_rec = df_rec[df_rec['duration_minutes'] <= p99].copy()
    df_rec = df_rec.sort_values('start_datetime').reset_index(drop=True)
    
    df_rec["event_cause"] = df_rec["event_cause"].fillna("others").str.lower().str.strip()
    df_rec["event_cause"] = df_rec["event_cause"].replace({"water_logging": "waterlogging", "pot_holes": "pothole"})
    df_rec["event_type"] = df_rec["event_type"].fillna("unplanned").str.lower().str.strip()
    df_rec["requires_road_closure"] = df_rec["requires_road_closure"].astype(str).str.upper() == "TRUE"
    df_rec["priority"] = df_rec["priority"].fillna("Low").str.capitalize().str.strip()
    
    X = df_rec[['event_cause', 'event_type', 'priority', 'requires_road_closure', 'latitude', 'longitude', 'start_datetime']]
    y = df_rec['duration_minutes']
    
    split_idx = int(len(df_rec) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Preprocessor
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
    
    new_model = XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=1)
    new_model.fit(X_train_trans, y_train)
    
    y_pred_new = new_model.predict(X_test_trans)
    new_mae = mean_absolute_error(y_test, y_pred_new)
    
    promote = True
    current_mae = 999999.0
    
    if current_models_exist:
        try:
            curr_model_path = os.path.join(MODELS_DIR, "recovery_time_model.joblib")
            curr_prep_path = os.path.join(MODELS_DIR, "recovery_time_preprocessor.joblib")
            if os.path.exists(curr_model_path) and os.path.exists(curr_prep_path):
                curr_prep = joblib.load(curr_prep_path)
                curr_model = joblib.load(curr_model_path)
                X_test_trans_curr = curr_prep.transform(X_test)
                y_pred_curr = curr_model.predict(X_test_trans_curr)
                current_mae = mean_absolute_error(y_test, y_pred_curr)
                if current_mae <= new_mae:
                    promote = False
        except Exception as e:
            print(f"Error loading current production recovery model: {e}. Promoting new model by default.")
            
    if promote:
        print(f"Promotion Approved: New MAE ({new_mae:.4f}) beats/replaces production model MAE ({current_mae:.4f}).")
        joblib.dump(new_model, os.path.join(MODELS_DIR, "recovery_time_model.joblib"))
        joblib.dump(preprocessor, os.path.join(MODELS_DIR, "recovery_time_preprocessor.joblib"))
    else:
        print(f"Promotion Rejected: New MAE ({new_mae:.4f}) does not beat production model MAE ({current_mae:.4f}).")
        
    return {"current_mae": current_mae, "new_mae": new_mae, "promoted": promote}

def retrain_escalation(df, current_models_exist):
    print("Evaluating Escalation Classifier...")
    df_esc = df.copy()
    df_esc['start_datetime'] = pd.to_datetime(df_esc['start_datetime'], errors='coerce', utc=True)
    df_esc = df_esc.dropna(subset=['start_datetime']).sort_values('start_datetime').reset_index(drop=True)
    
    df_esc["event_cause"] = df_esc["event_cause"].fillna("others").str.lower().str.strip()
    df_esc["event_cause"] = df_esc["event_cause"].replace({"water_logging": "waterlogging", "pot_holes": "pothole"})
    df_esc["priority"] = df_esc["priority"].fillna("Low").str.capitalize().str.strip()
    df_esc["requires_road_closure"] = df_esc["requires_road_closure"].astype(str).str.upper() == "TRUE"
    df_esc["junction"] = df_esc["junction"].fillna("Unknown").str.strip()
    df_esc["zone"] = df_esc["zone"].fillna("Unknown").str.strip()
    df_esc['hour'] = df_esc['start_datetime'].dt.hour

    # Compute target
    df_sorted = df_esc.sort_values(['junction', 'start_datetime']).copy()
    df_sorted['escalation'] = 0
    
    for j_id, group in df_sorted.groupby('junction'):
        times = group['start_datetime'].values
        n = len(times)
        for i in range(n):
            t_start = times[i]
            t_end = t_start + np.timedelta64(1, 'h')
            count = np.sum((times >= t_start) & (times <= t_end))
            if count > 1:
                df_sorted.loc[group.index[i], 'escalation'] = 1
                
    df_esc = df_esc.merge(df_sorted[['id', 'escalation']], on='id', how='left')
    df_esc['escalation'] = df_esc['escalation'].fillna(0).astype(int)
    
    split_idx = int(len(df_esc) * 0.8)
    df_train = df_esc.iloc[:split_idx].copy()
    df_test = df_esc.iloc[split_idx:].copy()
    
    freq_map = df_train.groupby(['junction', 'hour']).size().to_dict()
    df_train['events_in_hour'] = df_train.apply(lambda r: freq_map.get((r['junction'], r['hour']), 0), axis=1)
    df_test['events_in_hour'] = df_test.apply(lambda r: freq_map.get((r['junction'], r['hour']), 0), axis=1)
    
    feature_cols = ['event_cause', 'priority', 'requires_road_closure', 'junction', 'zone', 'start_datetime', 'events_in_hour']
    X_train = df_train[feature_cols]
    y_train = df_train['escalation']
    X_test = df_test[feature_cols]
    y_test = df_test['escalation']
    
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
    
    pos_count = sum(y_train)
    neg_count = len(y_train) - pos_count
    scale_pos = neg_count / pos_count if pos_count > 0 else 1.0
    
    new_model = XGBClassifier(objective='binary:logistic', eval_metric='logloss', scale_pos_weight=scale_pos, n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=1)
    new_model.fit(X_train_trans, y_train)
    
    y_probs_new = new_model.predict_proba(X_test_trans)[:, 1]
    new_auc = roc_auc_score(y_test, y_probs_new)
    
    promote = True
    current_auc = 0.0
    
    if current_models_exist:
        try:
            curr_model_path = os.path.join(MODELS_DIR, "escalation_model.joblib")
            curr_prep_path = os.path.join(MODELS_DIR, "escalation_preprocessor.joblib")
            if os.path.exists(curr_model_path) and os.path.exists(curr_prep_path):
                curr_prep = joblib.load(curr_prep_path)
                curr_model = joblib.load(curr_model_path)
                X_test_trans_curr = curr_prep.transform(X_test)
                y_probs_curr = curr_model.predict_proba(X_test_trans_curr)[:, 1]
                current_auc = roc_auc_score(y_test, y_probs_curr)
                if current_auc >= new_auc:
                    promote = False
        except Exception as e:
            print(f"Error loading current production escalation model: {e}. Promoting new model by default.")
            
    if promote:
        print(f"Promotion Approved: New ROC-AUC ({new_auc:.4f}) beats/replaces production model ROC-AUC ({current_auc:.4f}).")
        joblib.dump(new_model, os.path.join(MODELS_DIR, "escalation_model.joblib"))
        joblib.dump(preprocessor, os.path.join(MODELS_DIR, "escalation_preprocessor.joblib"))
        # Save freq map
        str_freq_map = {f"{k[0]}||{k[1]}": v for k, v in freq_map.items()}
        with open(os.path.join(MODELS_DIR, "escalation_freq_map.json"), "w") as f:
            json.dump(str_freq_map, f)
    else:
        print(f"Promotion Rejected: New ROC-AUC ({new_auc:.4f}) does not beat production model ROC-AUC ({current_auc:.4f}).")
        
    return {"current_auc": current_auc, "new_auc": new_auc, "promoted": promote}

def log_metrics(metrics_dict):
    history = []
    if os.path.exists(METRICS_LOG):
        try:
            with open(METRICS_LOG, "r") as f:
                history = json.load(f)
        except Exception:
            pass
            
    metrics_dict["timestamp"] = datetime.now().isoformat()
    history.append(metrics_dict)
    
    with open(METRICS_LOG, "w") as f:
        json.dump(history, f, indent=4)
    print(f"Logged retraining execution to {METRICS_LOG}.")

def main():
    print("--------------------------------------------------")
    print("STARTING CONTINUOUS RETRAINING PIPELINE")
    print("--------------------------------------------------")
    
    # We load from events.csv as the base dataset since SQLite holds the seeded content
    events_csv = os.path.join(backend_dir, "ml", "dataset", "events.csv")
    if os.path.exists(events_csv):
        print(f"Loading incidents dataset from: {events_csv}")
        df = pd.read_csv(events_csv)
    else:
        print(f"Loading incidents directly from SQLite database: {DATABASE_FILE}")
        df = load_incidents_from_db()
        
    if len(df) < 100:
        print("Insufficient data rows to execute retraining. Exiting.")
        return
        
    current_models_exist = os.path.exists(os.path.join(MODELS_DIR, "severity_model.joblib"))
    
    sev_res = retrain_severity(df, current_models_exist)
    rec_res = retrain_recovery_time(df, current_models_exist)
    esc_res = retrain_escalation(df, current_models_exist)
    
    metrics = {
        "severity": sev_res,
        "recovery_time": rec_res,
        "escalation": esc_res
    }
    
    log_metrics(metrics)
    print("--------------------------------------------------")
    print("RETRAINING PIPELINE COMPLETED")
    print("--------------------------------------------------")

if __name__ == "__main__":
    main()
