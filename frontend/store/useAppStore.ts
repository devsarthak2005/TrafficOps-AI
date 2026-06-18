import { create } from "zustand";

interface AppState {
  resourceJunctionId: string | null;
  resourcePanelOpen: boolean;
  openResourcePanel: (junctionId: string) => void;
  closeResourcePanel: () => void;
  similarIncidentId: string | null;
  similarPanelOpen: boolean;
  openSimilarPanel: (incidentId: string) => void;
  closeSimilarPanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  resourceJunctionId: null,
  resourcePanelOpen: false,
  openResourcePanel: (junctionId) =>
    set({ resourceJunctionId: junctionId, resourcePanelOpen: true }),
  closeResourcePanel: () =>
    set({ resourceJunctionId: null, resourcePanelOpen: false }),
  similarIncidentId: null,
  similarPanelOpen: false,
  openSimilarPanel: (incidentId) =>
    set({ similarIncidentId: incidentId, similarPanelOpen: true }),
  closeSimilarPanel: () =>
    set({ similarIncidentId: null, similarPanelOpen: false }),
}));

