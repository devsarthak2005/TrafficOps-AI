import { create } from "zustand";

export interface RouteMetric {
  id: "primary" | "secondary" | "emergency";
  name: string;
  path: [number, number][];
  distance: string;
  travel_time: string;
  congestion_score: number;
  route_score: number;
  recommended: boolean;
}

export interface DiversionPlan {
  routes: RouteMetric[];
  estimated_vehicles_diverted: number;
  estimated_delay_reduction: string;
  diversion_required: boolean;
}

interface DiversionState {
  plan: DiversionPlan | null;
  selectedRouteId: "primary" | "secondary" | "emergency" | null;
  isGenerating: boolean;
  error: string | null;
  generateDiversions: (payload: {
    event_location: string;
    predicted_impact_level: string;
    deployment_score: number;
    event_severity: string;
    event_attendance: number;
  }) => Promise<DiversionPlan>;
  setSelectedRouteId: (id: "primary" | "secondary" | "emergency" | null) => void;
  clearDiversions: () => void;
}

export const useDiversionStore = create<DiversionState>((set, get) => ({
  plan: null,
  selectedRouteId: null,
  isGenerating: false,
  error: null,

  generateDiversions: async (payload) => {
    set({ isGenerating: true, error: null });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/diversions/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to generate diversion plan");
      }

      const data: DiversionPlan = await response.json();
      
      // Auto-select the recommended route if available
      const recommendedRoute = data.routes.find((r) => r.recommended);
      const autoSelectId = recommendedRoute ? recommendedRoute.id : (data.routes[0]?.id || null);

      set({ 
        plan: data, 
        selectedRouteId: autoSelectId, 
        isGenerating: false 
      });
      return data;
    } catch (err: any) {
      console.error("Error generating diversions:", err);
      set({ error: err.message || "Failed to generate diversion plan", isGenerating: false });
      throw err;
    }
  },

  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
  clearDiversions: () => set({ plan: null, selectedRouteId: null, error: null }),
}));
