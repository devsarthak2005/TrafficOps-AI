import os
import sys

from app.schemas.learning import FeedbackItem
from app.services.learning_service import (
    save_feedback_item,
    calculate_learning_analytics,
    trigger_model_retraining,
    FEEDBACK_CSV_PATH
)

def test_feedback_system():
    print("Initializing Continuous Learning Verification...")
    
    # 1. Clear any existing feedback CSV to make test deterministic
    if FEEDBACK_CSV_PATH.exists():
        os.remove(FEEDBACK_CSV_PATH)
        print("Cleared existing feedback CSV.")

    # 2. Test Feedback Capture
    print("\n--- Testing Feedback Capture (Appending to CSV) ---")
    item1 = FeedbackItem(
        event_id="evt_test_01",
        predicted_impact="High",
        actual_impact="High",
        confidence=85.0,
        prediction_correct=True,
        resource_efficiency=0.90,
        diversion_success=0.35,
        resolution_time=2.5,
        zone="Central",
        event_cause="political_rally"
    )
    save_feedback_item(item1)
    
    # Append a wrong prediction too
    item2 = FeedbackItem(
        event_id="evt_test_02",
        predicted_impact="Critical",
        actual_impact="Medium",
        confidence=90.0,
        prediction_correct=False,
        resource_efficiency=0.70,
        diversion_success=0.15,
        resolution_time=1.8,
        zone="South",
        event_cause="accident"
    )
    save_feedback_item(item2)
    
    assert FEEDBACK_CSV_PATH.exists(), "Feedback CSV was not created"
    print("✅ Feedback successfully logged to CSV.")

    # 3. Test Analytics Calculation
    print("\n--- Testing Learning Analytics ---")
    analytics = calculate_learning_analytics()
    print(f"Total Events Logged: {analytics.total_events}")
    print(f"Prediction Accuracy: {analytics.prediction_accuracy}%")
    print(f"Resource Efficiency: {analytics.average_resource_efficiency}%")
    print(f"Diversion Effectiveness: {analytics.average_diversion_effectiveness}%")
    print(f"Model Drift Indicator: {analytics.model_drift_indicator}%")
    print(f"Zone Insights: {[z.dict() for z in analytics.zone_insights]}")
    print(f"AI Insights: {analytics.ai_insights}")
    
    # Check assertions (the mock data initialization + our 2 custom items = 12 total items)
    assert analytics.total_events == 12
    assert analytics.prediction_accuracy > 0
    assert len(analytics.ai_insights) > 0
    print("✅ Learning analytics calculation working.")

    # 4. Test Model Retraining Trigger
    print("\n--- Testing XGBoost Model Retraining ---")
    retrain_res = trigger_model_retraining()
    print(f"Retrain Status: {retrain_res.status}")
    print(f"Old Accuracy: {retrain_res.old_accuracy}%")
    print(f"New Accuracy: {retrain_res.new_accuracy}%")
    print(f"Retrained Timestamp: {retrain_res.timestamp}")
    
    assert retrain_res.status == "retrained"
    assert retrain_res.new_accuracy > 0
    print("✅ Model retraining successfully fit and saved new weights.")
    
    print("\n🎉 ALL CONTINUOUS LEARNING TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_feedback_system()
