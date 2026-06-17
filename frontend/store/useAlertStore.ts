import { create } from "zustand";
import type { Alert } from "@/types/alert";
import { getActiveAlerts, dismissAlert as apiDismissAlert } from "@/lib/api/alerts";

interface AlertStoreState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
}

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,

  fetchAlerts: async () => {
    try {
      // Set loading state only on the initial load to prevent flashing on polling
      if (get().alerts.length === 0 && !get().error) {
        set({ loading: true });
      }
      const data = await getActiveAlerts();
      set({ alerts: data, error: null, loading: false });
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      set({ error: "Failed to load active alerts", loading: false });
    }
  },

  dismissAlert: async (alertId) => {
    // Optimistic UI update: remove from local store immediately
    set((state) => ({
      alerts: state.alerts.filter((a) => a.alert_id !== alertId),
    }));

    try {
      await apiDismissAlert(alertId);
    } catch (err) {
      console.error(`Failed to dismiss alert ${alertId}:`, err);
      // Rollback or sync state on error
      get().fetchAlerts();
    }
  },
}));
