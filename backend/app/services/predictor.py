from __future__ import annotations

import os
import sys
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class PredictorService:
    def __init__(self):
        self.preprocessor = None
        self.model = None
        self.feature_names = None
        self.is_loaded = False
        self._load_models()

    def _load_models(self):
        """Lazily load the preprocessor and model from backend/models/."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Ensure ml/pipeline is in sys.path to unpickle TemporalFeatureExtractor
        pipeline_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "ml", "pipeline"))
        if pipeline_dir not in sys.path:
            sys.path.append(pipeline_dir)

        models_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "models"))
        preprocessor_path = os.path.join(models_dir, "feature_pipeline.joblib")
        model_path = os.path.join(models_dir, "xgboost_impact_model.joblib")

        logger.info(f"Loading preprocessor from {preprocessor_path}")
        logger.info(f"Loading model from {model_path}")

        try:
            import joblib
            if os.path.exists(preprocessor_path) and os.path.exists(model_path):
                self.preprocessor = joblib.load(preprocessor_path)
                self.model = joblib.load(model_path)
                self.feature_names = self.preprocessor.named_steps['preprocessor'].get_feature_names_out()
                self.is_loaded = True
                logger.info("Successfully loaded ML model and preprocessor.")
            else:
                logger.warning("ML model or preprocessor files not found. Predictor service running in fallback mode.")
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}", exc_info=True)

    def predict(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs prediction for the given event input.
        Returns predicted impact level, confidence percentage, local feature reasons, and formatted explanation text.
        """
        # Fallback if model could not be loaded
        if not self.is_loaded:
            logger.warning("ML predictor not loaded. Returning fallback prediction.")
            return {
                "predicted_impact": "Medium",
                "confidence": 50.0,
                "reasons": ["Fallback baseline: Model files not loaded."],
                "explanation": "Predicted Impact: Medium\nConfidence: 50%\n\nReasons:\n* Fallback baseline: Model files not loaded."
            }

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
                'bool__requires_road_closure': 'Requires road closure',
                'cat__priority_High': 'High priority event',
                'cat__priority_Low': 'Low priority event',
                'cat__priority_Medium': 'Medium priority event',
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
            logger.error(f"Error during prediction: {e}", exc_info=True)
            return {
                "predicted_impact": "Low",
                "confidence": 100.0,
                "reasons": [f"Error during explanation generation: {str(e)}"],
                "explanation": f"Predicted Impact: Low\nConfidence: 100%\n\nReasons:\n* Error during explanation generation: {str(e)}"
            }

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
                'num__is_weekend': 'Weekend timing',
                'bool__requires_road_closure': 'Requires road closure',
                'cat__priority_High': 'High priority event',
                'cat__priority_Low': 'Low priority event',
                'cat__priority_Medium': 'Medium priority event',
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
