import type { Junction, JunctionHealth } from "@/types/junction";
import { getHealthSummary } from "@/lib/api/junctions";
import { create } from "zustand";
import type { Map } from "leaflet";

interface MapStoreState {
  mapInstance: Map | null;
  selectedJunctionId: string | null;
  sidebarOpen: boolean;
  junctions: Junction[];
  healthMap: Record<string, JunctionHealth>;
  setMapInstance: (map: Map | null) => void;
  setSelectedJunctionId: (junctionId: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  setJunctions: (junctions: Junction[]) => void;
  setHealthMap: (healthMap: Record<string, JunctionHealth>) => void;
  fetchHealthSummary: () => Promise<void>;
}

export const useMapStore = create<MapStoreState>((set) => ({
  mapInstance: null,
  selectedJunctionId: null,
  sidebarOpen: true,
  junctions: [],
  healthMap: {},
  setMapInstance: (mapInstance) => set({ mapInstance }),
  setSelectedJunctionId: (selectedJunctionId) => set({ selectedJunctionId }),
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setJunctions: (junctions) => set({ junctions }),
  setHealthMap: (healthMap) => set({ healthMap }),
  fetchHealthSummary: async () => {
    try {
      const data = await getHealthSummary(true);
      const map: Record<string, JunctionHealth> = {};
      for (const item of data) {
        map[item.junction_id] = item;
      }
      set({ healthMap: map });
    } catch (err) {
      console.error("Failed to fetch health summary:", err);
    }
  },
}));
