import type { Junction, JunctionHealth } from "@/types/junction";
import { getHealthSummary } from "@/lib/api/junctions";
import { getDashboardStats as fetchStatsOverview } from "@/lib/api/stats";
import { create } from "zustand";
import type { Map } from "leaflet";
import type { DashboardStats } from "@/types/stats";

interface MapStoreState {
  mapInstance: Map | null;
  selectedJunctionId: string | null;
  sidebarOpen: boolean;
  activeTab: 'dashboard' | 'map' | 'simulator' | 'analytics' | 'ml' | 'alerts' | 'corridors' | 'replay';
  junctions: Junction[];
  healthMap: Record<string, JunctionHealth>;
  dashboardStats: DashboardStats | null;
  setMapInstance: (map: Map | null) => void;
  setSelectedJunctionId: (junctionId: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  setActiveTab: (tab: 'dashboard' | 'map' | 'simulator' | 'analytics' | 'ml' | 'alerts' | 'corridors' | 'replay') => void;
  setJunctions: (junctions: Junction[]) => void;
  setHealthMap: (healthMap: Record<string, JunctionHealth>) => void;
  fetchHealthSummary: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
}

export const useMapStore = create<MapStoreState>((set) => ({
  mapInstance: null,
  selectedJunctionId: null,
  sidebarOpen: true,
  activeTab: 'dashboard',
  junctions: [],
  healthMap: {},
  dashboardStats: null,
  setMapInstance: (mapInstance) => set({ mapInstance }),
  setSelectedJunctionId: (selectedJunctionId) => set({ selectedJunctionId }),
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),
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
  fetchDashboardStats: async () => {
    try {
      const data: DashboardStats = await fetchStatsOverview();
      set({ dashboardStats: data });
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    }
  },
}));
