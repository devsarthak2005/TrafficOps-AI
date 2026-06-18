import { create } from "zustand";
import type { CorridorResponse } from "@/types/corridor";

interface CorridorStoreState {
  activePlan: CorridorResponse | null;
  activeVariant: "fastest" | "safest" | "protected";
  setActivePlan: (plan: CorridorResponse | null) => void;
  setActiveVariant: (variant: "fastest" | "safest" | "protected") => void;
  clearPlan: () => void;
}

export const useCorridorStore = create<CorridorStoreState>((set) => ({
  activePlan: null,
  activeVariant: "protected", // default selected route is Protected Corridor
  setActivePlan: (activePlan) => set({ activePlan, activeVariant: "protected" }),
  setActiveVariant: (activeVariant) => set({ activeVariant }),
  clearPlan: () => set({ activePlan: null, activeVariant: "protected" }),
}));
