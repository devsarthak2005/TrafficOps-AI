import { create } from "zustand";

interface LayersState {
  showHeatmap: boolean;
  showZones: boolean;
  showJunctions: boolean;
  showIncidents: boolean;
  showCorridors: boolean;
  toggleLayer: (layer: "showHeatmap" | "showZones" | "showJunctions" | "showIncidents" | "showCorridors") => void;
}

export const useLayersStore = create<LayersState>((set) => ({
  showHeatmap: true,
  showZones: true,
  showJunctions: true,
  showIncidents: true,
  showCorridors: true,
  toggleLayer: (layer) => set((state) => ({ [layer]: !state[layer] })),
}));
