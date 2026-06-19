from __future__ import annotations

import os
import sys
import logging
from typing import Dict, Any, List
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class PredictorService:
    def __init__(self):
        self.preprocessor = None
        self.model = None
        self.feature_names = None
        self.is_loaded = False
        self.load_error = None
        
        self.recovery_preprocessor = None
        self.recovery_model = None
        self.is_loaded_recovery = False
        self.load_error_recovery = None
        
        self.escalation_preprocessor = None
        self.escalation_model = None
        self.escalation_freq_map = {}
        self.is_loaded_escalation = False
        self.load_error_escalation = None
        
        self._load_models()

    def _load_models(self):
        """Lazily load the preprocessors and models from backend/models/."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Ensure ml/pipeline is in sys.path to unpickle LeakageFreeFeatureExtractor
        pipeline_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "ml", "pipeline"))
        if pipeline_dir not in sys.path:
            sys.path.append(pipeline_dir)

        models_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "models"))
        
        # 1. Load Severity Classifier
        preprocessor_path = os.path.join(models_dir, "severity_preprocessor.joblib")
        model_path = os.path.join(models_dir, "severity_model.joblib")

        logger.info(f"Loading severity preprocessor from {preprocessor_path}")
        logger.info(f"Loading severity model from {model_path}")

        try:
            import joblib
            if os.path.exists(preprocessor_path) and os.path.exists(model_path):
                self.preprocessor = joblib.load(preprocessor_path)
                self.model = joblib.load(model_path)
                self.feature_names = self.preprocessor.named_steps['col_transformer'].get_feature_names_out()
                self.is_loaded = True
                logger.info("Successfully loaded ML severity classifier model and preprocessor.")
            else:
                logger.error(f"Severity model or preprocessor files not found at {models_dir}")
        except Exception as e:
            self.load_error = e
            logger.exception("Failed to load ML severity model.")

        # 2. Load Recovery Time Regressor
        recovery_preprocessor_path = os.path.join(models_dir, "recovery_time_preprocessor.joblib")
        recovery_model_path = os.path.join(models_dir, "recovery_time_model.joblib")

        logger.info(f"Loading recovery preprocessor from {recovery_preprocessor_path}")
        logger.info(f"Loading recovery model from {recovery_model_path}")

        try:
            import joblib
            if os.path.exists(recovery_preprocessor_path) and os.path.exists(recovery_model_path):
                self.recovery_preprocessor = joblib.load(recovery_preprocessor_path)
                self.recovery_model = joblib.load(recovery_model_path)
                self.is_loaded_recovery = True
                logger.info("Successfully loaded ML recovery regressor model and preprocessor.")
            else:
                logger.error(f"Recovery model or preprocessor files not found at {models_dir}")
        except Exception as e:
            self.load_error_recovery = e
            logger.exception("Failed to load ML recovery model.")

        # 3. Load Escalation Classifier
        escalation_preprocessor_path = os.path.join(models_dir, "escalation_preprocessor.joblib")
        escalation_model_path = os.path.join(models_dir, "escalation_model.joblib")
        escalation_freq_map_path = os.path.join(models_dir, "escalation_freq_map.json")

        logger.info(f"Loading escalation preprocessor from {escalation_preprocessor_path}")
        logger.info(f"Loading escalation model from {escalation_model_path}")

        try:
            import joblib
            import json
            if os.path.exists(escalation_preprocessor_path) and os.path.exists(escalation_model_path):
                self.escalation_preprocessor = joblib.load(escalation_preprocessor_path)
                self.escalation_model = joblib.load(escalation_model_path)
                if os.path.exists(escalation_freq_map_path):
                    with open(escalation_freq_map_path, "r") as f:
                        self.escalation_freq_map = json.load(f)
                self.is_loaded_escalation = True
                logger.info("Successfully loaded ML escalation model and preprocessor.")
            else:
                logger.error(f"Escalation model or preprocessor files not found at {models_dir}")
        except Exception as e:
            self.load_error_escalation = e
            logger.exception("Failed to load ML escalation model.")

    def predict(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs severity prediction for the given event input.
        Returns predicted impact level, confidence percentage, local feature reasons, and formatted explanation text.
        """
        if not self.is_loaded:
            logger.error("Prediction failed: ML severity predictor is not loaded.")
            raise HTTPException(status_code=503, detail="Prediction model unavailable")

        import pandas as pd
        import numpy as np
        import xgboost as xgb

        # 1. Prepare raw inputs into a DataFrame
        input_df = pd.DataFrame([{
            'event_cause': request_data.get('event_cause', 'Unknown'),
            'event_type': request_data.get('event_type', 'unplanned'),
            'priority': request_data.get('priority', 'Unknown'),
            'requires_road_closure': bool(request_data.get('requires_road_closure', False)),
            'latitude': float(request_data.get('latitude', 12.9716)),
            'longitude': float(request_data.get('longitude', 77.5946)),
            'start_datetime': pd.to_datetime(request_data.get('start_datetime', pd.Timestamp.now()))
        }])

        try:
            # 2. Transform using preprocessor
            X_trans = self.preprocessor.transform(input_df)

            # 3. Predict class and probabilities
            # Classes: Low (0), Medium (1), High (2), Critical (3)
            target_names = ['Low', 'Medium', 'High', 'Critical']
            probs = self.model.predict_proba(X_trans)[0]
            pred_idx = int(self.model.predict(X_trans)[0])
            
            predicted_impact = target_names[pred_idx]
            confidence = float(probs[pred_idx])

            # 4. Extract local contributions using pred_contribs
            booster = self.model.get_booster()
            dmat = xgb.DMatrix(X_trans)
            contribs = booster.predict(dmat, pred_contribs=True)[0]  # Shape: (n_classes, n_features + 1)
            
            class_contribs = contribs[pred_idx]
            feature_contribs = class_contribs[:-1]  # Exclude the bias element at the end

            # 5. Define human-readable labels
            feature_descriptions = {
                'num__latitude': 'High-risk corridor',
                'num__longitude': 'Historical congestion zone',
                'num__hour_sin': 'Peak hour',
                'num__hour_cos': 'Peak hour',
                'num__day_sin': 'Day of week',
                'num__day_cos': 'Day of week',
                'num__is_weekend': 'Weekend timing',
                'num__requires_road_closure': 'Requires road closure',
                'num__priority_encoded': 'High priority event',
                'num__location_cluster': 'Location hotspot cluster',
                'num__month': 'Seasonal factor',
                'cat__event_type_planned': 'Public event',
                'cat__event_type_unplanned': 'Unplanned event',
            }

            # Map event causes dynamically
            for col in self.feature_names:
                if col.startswith('cat__event_cause_'):
                    cause = col.replace('cat__event_cause_', '').replace('_', ' ').capitalize()
                    feature_descriptions[col] = f"{cause} event"

            # Aggregate contributions by human-readable names
            aggregated_contribs = {}
            for idx, val in enumerate(feature_contribs):
                f_name = self.feature_names[idx]
                desc = feature_descriptions.get(f_name, f_name)
                aggregated_contribs[desc] = aggregated_contribs.get(desc, 0.0) + float(val)

            # Filter for positive contributions
            pos_contribs = {k: v for k, v in aggregated_contribs.items() if v > 0}
            sum_pos = sum(pos_contribs.values())

            reasons_formatted = []
            if sum_pos > 0:
                # Scale positive contributions to sum exactly to the confidence percentage
                sorted_reasons = []
                for k, v in pos_contribs.items():
                    pct = (v / sum_pos) * (confidence * 100)
                    sorted_reasons.append((k, pct))
                
                # Sort by contribution descending
                sorted_reasons = sorted(sorted_reasons, key=lambda x: x[1], reverse=True)
                
                for name, pct in sorted_reasons[:5]:
                    if pct >= 1.0:
                        reasons_formatted.append(f"{name} contributed +{int(round(pct))}%")

            if not reasons_formatted:
                reasons_formatted = ["Baseline feature distribution"]

            # 6. Generate human-readable explanation matching the requested format
            explanation_lines = [
                f"Predicted Impact: {predicted_impact}",
                f"Confidence: {int(round(confidence * 100))}%",
                "",
                "Reasons:"
            ]
            for r in reasons_formatted:
                explanation_lines.append(f"* {r}")

            explanation_text = "\n".join(explanation_lines)

            return {
                "predicted_impact": predicted_impact,
                "confidence": float(round(confidence * 100, 1)),
                "reasons": reasons_formatted,
                "explanation": explanation_text
            }

        except Exception as e:
            logger.exception("Error during prediction processing.")
            raise HTTPException(status_code=503, detail="Prediction model unavailable")

    def predict_recovery_time(self, request_data: Dict[str, Any]) -> int:
        """
        Runs recovery time prediction for the given event input.
        Returns predicted duration in minutes.
        """
        if not self.is_loaded_recovery:
            logger.error("Prediction failed: ML recovery time predictor is not loaded.")
            raise HTTPException(status_code=503, detail="Prediction model unavailable")

        import pandas as pd

        # Prepare raw inputs into a DataFrame
        input_df = pd.DataFrame([{
            'event_cause': request_data.get('event_cause'),
            'event_type': request_data.get('event_type'),
            'priority': request_data.get('priority'),
            'requires_road_closure': bool(request_data.get('requires_road_closure')),
            'latitude': float(request_data.get('latitude')),
            'longitude': float(request_data.get('longitude')),
            'start_datetime': pd.to_datetime(request_data.get('start_datetime'))
        }])

        try:
            # Transform and predict
            X_trans = self.recovery_preprocessor.transform(input_df)
            pred = self.recovery_model.predict(X_trans)[0]
            return max(0, int(round(float(pred))))
        except Exception as e:
            logger.exception("Error during recovery time prediction.")
            raise HTTPException(status_code=503, detail="Prediction model unavailable")

    def predict_escalation(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs escalation risk prediction for the given event input.
        Returns: {will_escalate: bool, probability: float, confidence: float}
        """
        if not self.is_loaded_escalation:
            logger.error("Prediction failed: ML escalation predictor is not loaded.")
            raise HTTPException(status_code=503, detail="Prediction model unavailable")

        import pandas as pd

        try:
            junction = request_data.get('junction', 'Unknown')
            start_dt = pd.to_datetime(request_data.get('start_datetime', pd.Timestamp.now()))
            hour = start_dt.hour
            
            # Retrieve historical events_in_hour from map
            freq_key = f"{junction}||{hour}"
            events_in_hour = self.escalation_freq_map.get(freq_key, 0)
            
            input_df = pd.DataFrame([{
                'event_cause': request_data.get('event_cause', 'others'),
                'priority': request_data.get('priority', 'Low'),
                'requires_road_closure': bool(request_data.get('requires_road_closure', False)),
                'junction': junction,
                'zone': request_data.get('zone', 'Unknown'),
                'start_datetime': start_dt,
                'events_in_hour': events_in_hour
            }])
            
            X_trans = self.escalation_preprocessor.transform(input_df)
            probs = self.escalation_model.predict_proba(X_trans)[0]
            pred = int(self.escalation_model.predict(X_trans)[0])
            
            return {
                "will_escalate": bool(pred == 1),
                "probability": float(probs[1]),
                "confidence": float(probs[pred])
            }
        except Exception as e:
            logger.exception("Error during escalation prediction.")
            raise HTTPException(status_code=503, detail="Prediction model unavailable")

    def get_global_feature_importances(self) -> List[Dict[str, Any]]:
        """Returns the global feature importances mapped to human-readable names."""
        if not self.is_loaded:
            return []

        try:
            importances = self.model.feature_importances_
            
            feature_descriptions = {
                'num__latitude': 'High-risk corridor (Lat)',
                'num__longitude': 'Historical congestion zone (Lng)',
                'num__hour_sin': 'Peak hour (time cycle)',
                'num__hour_cos': 'Peak hour (time cycle)',
                'num__day_sin': 'Day of week (weekly cycle)',
                'num__day_cos': 'Day of week (weekly cycle)',
                'num__month': 'Seasonal factor',
                'num__is_weekend': 'Weekend timing',
                'num__location_cluster': 'Location hotspot cluster',
                'num__priority_encoded': 'Priority status',
                'num__requires_road_closure': 'Requires road closure',
                'cat__event_type_planned': 'Planned/Public event',
                'cat__event_type_unplanned': 'Unplanned event',
            }

            for col in self.feature_names:
                if col.startswith('cat__event_cause_'):
                    cause = col.replace('cat__event_cause_', '').replace('_', ' ').capitalize()
                    feature_descriptions[col] = f"{cause} event"

            # Aggregate importances
            aggregated_importances = {}
            for idx, val in enumerate(importances):
                f_name = self.feature_names[idx]
                desc = feature_descriptions.get(f_name, f_name)
                aggregated_importances[desc] = aggregated_importances.get(desc, 0.0) + float(val)

            sorted_items = sorted(aggregated_importances.items(), key=lambda x: x[1], reverse=True)
            total_importance = sum(val for _, val in sorted_items)

            if total_importance > 0:
                normalized_items = [
                    {"feature": name, "importance": round((val / total_importance) * 100, 1)}
                    for name, val in sorted_items
                ]
            else:
                normalized_items = [
                    {"feature": name, "importance": 0.0}
                    for name, val in sorted_items
                ]

            return normalized_items

        except Exception as e:
            logger.error(f"Error calculating global feature importances: {e}", exc_info=True)
            return []


# Initialize singleton instance
predictor_service = PredictorService()
