import pandas as pd
import numpy as np

def load_and_preprocess_data(file_path: str) -> pd.DataFrame:
    """Load dataset, clean, derive target, and remove leakage features."""
    df = pd.read_csv(file_path)
    
    # Parse datetime
    df['start_datetime'] = pd.to_datetime(df['start_datetime'], errors='coerce', utc=True)
    df['closed_datetime'] = pd.to_datetime(df['closed_datetime'], errors='coerce', utc=True)
    
    # Drop rows without required datetimes
    df = df.dropna(subset=['start_datetime', 'closed_datetime']).copy()
    
    # Calculate duration
    df['duration_hours'] = (df['closed_datetime'] - df['start_datetime']).dt.total_seconds() / 3600
    
    # Ensure no negative durations (bad data)
    df = df[df['duration_hours'] >= 0].copy()
    
    # Derive alternative Target: impact_level based strictly on duration
    conditions = [
        df['duration_hours'] < 1,
        (df['duration_hours'] >= 1) & (df['duration_hours'] < 2),
        (df['duration_hours'] >= 2) & (df['duration_hours'] <= 4),
        df['duration_hours'] > 4
    ]
    choices = ['Low', 'Medium', 'High', 'Critical']
    df['impact_level'] = np.select(conditions, choices, default='Unknown')
    
    # Drop rows where target couldn't be derived (should be 0)
    df = df[df['impact_level'] != 'Unknown']
    
    # Keep only the features we actually want to use for prediction + the target
    # We drop leakage columns like closed_datetime, status, resolved_by_id, duration_hours
    # We also drop highly sparse/cardinality columns for the hackathon MVP
    features_to_keep = [
        'event_cause', 
        'event_type', 
        'priority', 
        'requires_road_closure',
        'latitude', 
        'longitude', 
        'start_datetime',
        'impact_level'
    ]
    
    # Drop columns not in features_to_keep
    df = df[[c for c in df.columns if c in features_to_keep]]
    
    # Handle missing values in remaining features
    df['event_cause'] = df['event_cause'].fillna('Unknown')
    df['event_type'] = df['event_type'].fillna('Unknown')
    df['priority'] = df['priority'].fillna('Unknown')
    df['requires_road_closure'] = df['requires_road_closure'].fillna(False)
    df['latitude'] = df['latitude'].fillna(df['latitude'].mean())
    df['longitude'] = df['longitude'].fillna(df['longitude'].mean())
    
    return df

if __name__ == "__main__":
    # Test execution
    df = load_and_preprocess_data("../dataset/events.csv")
    print(f"Shape after preprocessing: {df.shape}")
    print(f"Target distribution:\n{df['impact_level'].value_counts()}")
