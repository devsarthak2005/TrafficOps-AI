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

export interface CopilotBriefing {
  summary: string;
  risks: string[];
  actions: string[];
  confidence: number;
  generated_by: "gemini" | "fallback";
  timestamp: string;
  commissioner_briefing?: string;
  citizen_advisory?: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface HotspotPrediction {
  junction_id: string;
  junction_name: string;
  traffic_increase_pct: number;
  distance_km: number;
}

export interface NoInterventionStep {
  time_minutes: number;
  time_label: string;
  risk_score: number;
  congestion_class: string;
  fuel_loss_liters: number;
  economic_loss_inr: number;
  hospital_accessibility_score: number;
  emergency_delay_minutes: number;
}

export interface NoInterventionData {
  junction_id: string;
  junction_name: string;
  vehicles_affected_estimate: number;
  timeline: NoInterventionStep[];
  total_fuel_loss_liters: number;
  total_economic_loss_inr: number;
  max_emergency_delay_minutes: number;
  assumptions: Record<string, number | string>;
}

interface MLState {
  prediction: MLPrediction | null;
  briefing: CopilotBriefing | null;
  importances: FeatureImportance[];
  predictionHistory: MLPrediction[];
  isPredicting: boolean;
  isGeneratingBriefing: boolean;
  noInterventionData: NoInterventionData | null;
  isSimulatingNoIntervention: boolean;
  secondaryHotspots: HotspotPrediction[];
  isFetchingHotspots: boolean;
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
  generateBriefing: (payload: {
    prediction: { impact_level: string; confidence: number };
    feature_contributions: { feature: string; contribution: number }[];
    resource_plan: {
      deployment_score: number;
      officers_required: number;
      patrol_vehicles: number;
      barricades: number;
      diversion_level: string;
      emergency_corridor_required: boolean;
      estimated_response_time: string;
      estimated_operational_cost: number;
    };
    diversion_plan?: {
      routes: any[];
      estimated_vehicles_diverted: number;
      estimated_delay_reduction: string;
    };
    event_metadata: {
      event_type: string;
      event_cause: string;
      zone: string;
      junction: string;
      attendance: number;
      duration: number;
      start_time: string;
    };
  }) => Promise<CopilotBriefing>;
  simulateNoIntervention: (junctionId: string, currentRiskScore: number) => Promise<NoInterventionData>;
  fetchSecondaryHotspots: (payload: {
    latitude: number;
    longitude: number;
    event_type: string;
    start_datetime: string;
  }) => Promise<void>;
  clearSecondaryHotspots: () => void;
  resetPrediction: () => void;
}

export const useMLStore = create<MLState>((set, get) => ({
  prediction: null,
  briefing: null,
  importances: [],
  predictionHistory: [],
  isPredicting: false,
  isGeneratingBriefing: false,
  noInterventionData: null,
  isSimulatingNoIntervention: false,
  secondaryHotspots: [],
  isFetchingHotspots: false,

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

  generateBriefing: async (payload) => {
    set({ isGeneratingBriefing: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/copilot/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to generate executive briefing");
      }

      const data: CopilotBriefing = await response.json();
      set({ briefing: data, isGeneratingBriefing: false });
      return data;
    } catch (err) {
      console.error("Failed to generate briefing:", err);
      set({ isGeneratingBriefing: false });
      throw err;
    }
  },

  simulateNoIntervention: async (junctionId, currentRiskScore) => {
    set({ isSimulatingNoIntervention: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/ml/simulate-no-intervention`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          junction_id: junctionId,
          current_risk_score: currentRiskScore,
          duration_hours: 4
        }),
      });

      if (!response.ok) {
        throw new Error("No-intervention simulation failed");
      }

      const data: NoInterventionData = await response.json();
      set({ noInterventionData: data, isSimulatingNoIntervention: false });
      return data;
    } catch (err) {
      console.error("No intervention simulation request error:", err);
      set({ isSimulatingNoIntervention: false });
      throw err;
    }
  },

  fetchSecondaryHotspots: async (payload) => {
    set({ isFetchingHotspots: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/ml/crowd-movement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Crowd movement simulation failed");
      }

      const data = await response.json();
      set({ secondaryHotspots: data.hotspots, isFetchingHotspots: false });
    } catch (err) {
      console.error("Crowd movement fetch error:", err);
      set({ isFetchingHotspots: false });
    }
  },

  clearSecondaryHotspots: () => set({ secondaryHotspots: [] }),

  resetPrediction: () => set({ prediction: null, briefing: null, noInterventionData: null, secondaryHotspots: [] }),
}));

