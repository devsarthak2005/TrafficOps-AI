import { create } from "zustand";

export interface ZoneInsight {
  zone: string;
  accuracy: number;
  average_resolution_time: number;
}

export interface LearningAnalytics {
  total_events: number;
  prediction_accuracy: number;
  average_resource_efficiency: number;
  average_diversion_effectiveness: number;
  model_drift_indicator: number;
  zone_insights: ZoneInsight[];
  ai_insights: string[];
}

export interface RetrainResult {
  status: string;
  old_accuracy: number;
  new_accuracy: number;
  timestamp: string;
}

export interface FeedbackPayload {
  event_id: string;
  predicted_impact: string;
  actual_impact: string;
  confidence: number;
  prediction_correct: boolean;
  resource_efficiency: number;
  diversion_success: number;
  resolution_time: number;
  zone: string;
  event_cause: string;
}

interface LearningState {
  analytics: LearningAnalytics | null;
  retrainResult: RetrainResult | null;
  loading: boolean;
  isRetraining: boolean;
  error: string | null;
  fetchAnalytics: () => Promise<void>;
  triggerRetraining: () => Promise<RetrainResult>;
  submitFeedback: (payload: FeedbackPayload) => Promise<void>;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  analytics: null,
  retrainResult: null,
  loading: false,
  isRetraining: false,
  error: null,

  fetchAnalytics: async () => {
    set({ loading: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/ml/feedback/analytics`);
      if (!response.ok) {
        throw new Error("Failed to fetch learning analytics");
      }
      const data: LearningAnalytics = await response.json();
      set({ analytics: data, error: null, loading: false });
    } catch (err: any) {
      console.error("Fetch analytics error:", err);
      set({ error: err.message || "Failed to load analytics", loading: false });
    }
  },

  triggerRetraining: async () => {
    set({ isRetraining: true, error: null });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/ml/retrain`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to trigger ML retraining");
      }
      const data: RetrainResult = await response.json();
      set({ retrainResult: data, isRetraining: false });
      
      // Refresh analytics after retrain completes
      get().fetchAnalytics();
      
      return data;
    } catch (err: any) {
      console.error("Retraining error:", err);
      set({ error: err.message || "Retraining failed", isRetraining: false });
      throw err;
    }
  },

  submitFeedback: async (payload) => {
    set({ loading: true, error: null });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/ml/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }
      set({ loading: false });
      
      // Refresh analytics
      get().fetchAnalytics();
    } catch (err: any) {
      console.error("Submit feedback error:", err);
      set({ error: err.message || "Feedback log failed", loading: false });
      throw err;
    }
  },
}));
export default useLearningStore;
