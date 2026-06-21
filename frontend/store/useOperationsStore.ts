import { create } from "zustand";

export interface DeploymentPlan {
  deployment_score: number;
  officers_required: number;
  patrol_vehicles: number;
  barricades: number;
  diversion_level: "None" | "Minor" | "Major" | "Lockdown";
  emergency_corridor_required: boolean;
  estimated_response_time: string;
  estimated_operational_cost: number;
}

export interface OptimizationInputs {
  event_attendance: number;
  event_duration: number;
  nearby_hospitals: number;
  junction_criticality: number;
  zone: string;
}

interface OperationsState {
  plan: DeploymentPlan | null;
  inputs: OptimizationInputs;
  isOptimizing: boolean;
  error: string | null;
  setInputs: (inputs: Partial<OptimizationInputs>) => void;
  optimizeAllocation: (payload: {
    impact_level: string;
    confidence: number;
    event_type: string;
    event_duration: number;
    event_attendance: number;
    nearby_hospitals: number;
    junction_criticality: number;
    zone: string;
    junction_id?: string;
    escalation_risk_prob?: number;
    recovery_time_mins?: number;
  }) => Promise<DeploymentPlan>;
  resetPlan: () => void;
}

export const useOperationsStore = create<OperationsState>((set, get) => ({
  plan: null,
  inputs: {
    event_attendance: 500,
    event_duration: 2.0,
    nearby_hospitals: 1,
    junction_criticality: 50.0,
    zone: "Central"
  },
  isOptimizing: false,
  error: null,

  setInputs: (newInputs) => {
    set((state) => ({
      inputs: { ...state.inputs, ...newInputs }
    }));
  },

  optimizeAllocation: async (payload) => {
    set({ isOptimizing: true, error: null });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/operations/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to optimize resource allocation plan");
      }

      const data: DeploymentPlan = await response.json();
      set({ plan: data, isOptimizing: false });
      return data;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message || "Optimization failed", isOptimizing: false });
      throw err;
    }
  },

  resetPlan: () => set({ plan: null }),
}));
