import { create } from "zustand";

export interface MLPrediction {
  predicted_impact: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  reasons: string[];
  explanation: string;
  recommendations: string[];
  timestamp?: string;
  cause?: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

interface MLState {
  prediction: MLPrediction | null;
  importances: FeatureImportance[];
  predictionHistory: MLPrediction[];
  isPredicting: boolean;
  predictImpact: (payload: {
    event_cause: string;
    event_type: "planned" | "unplanned";
    priority: "Low" | "Medium" | "High";
    requires_road_closure: boolean;
    latitude: number;
    longitude: number;
    start_datetime: string;
  }) => Promise<MLPrediction>;
  fetchImportances: () => Promise<void>;
  resetPrediction: () => void;
}

export const useMLStore = create<MLState>((set, get) => ({
  prediction: null,
  importances: [],
  predictionHistory: [],
  isPredicting: false,

  predictImpact: async (payload) => {
    set({ isPredicting: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/ml/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("ML prediction failed");
      }
      
      const data: MLPrediction = await response.json();
      
      // Inject trigger details
      const enrichedPred: MLPrediction = {
        ...data,
        timestamp: new Date().toLocaleTimeString(),
        cause: payload.event_cause.replace("_", " ").toUpperCase(),
      };
      
      set((state) => ({
        prediction: enrichedPred,
        predictionHistory: [enrichedPred, ...state.predictionHistory].slice(0, 10), // keep last 10 predictions
        isPredicting: false,
      }));
      
      return enrichedPred;
    } catch (err) {
      console.error("Predict impact request error:", err);
      set({ isPredicting: false });
      throw err;
    }
  },

  fetchImportances: async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/ml/feature-importance`);
      if (!response.ok) {
        throw new Error("Failed to fetch feature importances");
      }
      const data = await response.json();
      set({ importances: data.importances });
    } catch (err) {
      console.error("Failed to fetch importances:", err);
    }
  },

  resetPrediction: () => set({ prediction: null }),
}));
