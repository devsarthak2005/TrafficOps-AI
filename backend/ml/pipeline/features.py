import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.base import BaseEstimator, TransformerMixin

class TemporalFeatureExtractor(BaseEstimator, TransformerMixin):
    """Extracts hour and day of week from start_datetime and creates cyclical features."""
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        X_out = X.copy()
        
        # Extract basic datetime features
        hour = X_out['start_datetime'].dt.hour
        dayofweek = X_out['start_datetime'].dt.dayofweek
        
        # Create cyclical features for hour (0-23)
        X_out['hour_sin'] = np.sin(hour * (2. * np.pi / 24))
        X_out['hour_cos'] = np.cos(hour * (2. * np.pi / 24))
        
        # Create cyclical features for day of week (0-6)
        X_out['day_sin'] = np.sin(dayofweek * (2. * np.pi / 7))
        X_out['day_cos'] = np.cos(dayofweek * (2. * np.pi / 7))
        
        # Is weekend
        X_out['is_weekend'] = (dayofweek >= 5).astype(int)
        
        # Drop original datetime
        X_out = X_out.drop('start_datetime', axis=1)
        return X_out

class LeakageFreeFeatureExtractor(BaseEstimator, TransformerMixin):
    def __init__(self, n_clusters=8):
        self.n_clusters = n_clusters
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init='auto')
        
    def fit(self, X, y=None):
        coords = X[['latitude', 'longitude']].fillna(0)
        self.kmeans.fit(coords)
        return self
        
    def transform(self, X):
        X_out = X.copy()
        dt = pd.to_datetime(X_out['start_datetime'], errors='coerce', utc=True)
        
        hour = dt.dt.hour.fillna(12)
        dayofweek = dt.dt.dayofweek.fillna(0)
        month = dt.dt.month.fillna(6)
        
        X_out['hour_sin'] = np.sin(hour * (2. * np.pi / 24))
        X_out['hour_cos'] = np.cos(hour * (2. * np.pi / 24))
        X_out['day_sin'] = np.sin(dayofweek * (2. * np.pi / 7))
        X_out['day_cos'] = np.cos(dayofweek * (2. * np.pi / 7))
        X_out['month'] = month
        X_out['is_weekend'] = (dayofweek >= 5).astype(int)
        
        coords = X_out[['latitude', 'longitude']].fillna(0)
        X_out['location_cluster'] = self.kmeans.predict(coords)
        
        priority_map = {'Low': 0, 'High': 1, 'Unknown': 0}
        X_out['priority_encoded'] = X_out['priority'].map(priority_map).fillna(0)
        X_out['requires_road_closure'] = X_out['requires_road_closure'].astype(int)
        
        X_out = X_out.drop(columns=['start_datetime', 'priority'])
        return X_out

class EscalationFeatureExtractor(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        X_out = X.copy()
        dt = pd.to_datetime(X_out['start_datetime'], errors='coerce', utc=True)
        
        X_out['hour'] = dt.dt.hour.fillna(12)
        X_out['day_of_week'] = dt.dt.dayofweek.fillna(0)
        
        # Binary road closure
        X_out['requires_road_closure'] = X_out['requires_road_closure'].astype(int)
        
        X_out = X_out.drop(columns=['start_datetime'])
        return X_out


def build_feature_pipeline() -> Pipeline:
    """Builds and returns the scikit-learn feature engineering pipeline."""
    
    # Categorical features to one-hot encode
    categorical_features = ['event_cause', 'event_type', 'priority']
    
    # Numerical/Boolean features to pass through or scale
    numerical_features = ['latitude', 'longitude', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'is_weekend']
    boolean_features = ['requires_road_closure']
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features),
            ('bool', 'passthrough', boolean_features)
        ],
        remainder='drop'
    )
    
    pipeline = Pipeline(steps=[
        ('temporal', TemporalFeatureExtractor()),
        ('preprocessor', preprocessor)
    ])
    
    return pipeline


