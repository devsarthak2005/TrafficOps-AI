import { create } from "zustand";

interface AppState {
  resourceJunctionId: string | null;
  resourcePanelOpen: boolean;
  openResourcePanel: (junctionId: string) => void;
  closeResourcePanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  resourceJunctionId: null,
  resourcePanelOpen: false,
  openResourcePanel: (junctionId) =>
    set({ resourceJunctionId: junctionId, resourcePanelOpen: true }),
  closeResourcePanel: () =>
    set({ resourceJunctionId: null, resourcePanelOpen: false }),
}));
