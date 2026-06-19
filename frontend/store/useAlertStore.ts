import { create } from "zustand";
import type { Alert, AlertPayload } from "@/types/alert";
import { 
  getActiveAlerts, 
  dismissAlert as apiDismissAlert,
  getPredictiveAlerts,
  acknowledgeAlert as apiAcknowledgeAlert,
  resolveAlert as apiResolveAlert
} from "@/lib/api/alerts";

interface AlertStoreState {
  alerts: Alert[];
  predictiveAlerts: AlertPayload[];
  loading: boolean;
  error: string | null;
  severityFilter: string | null;
  statusFilter: string | null;
  fetchAlerts: () => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  fetchPredictiveAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  setSeverityFilter: (severity: string | null) => void;
  setStatusFilter: (status: string | null) => void;
}

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  alerts: [],
  predictiveAlerts: [],
  loading: false,
  error: null,
  severityFilter: null,
  statusFilter: "active", // Default to active alerts

  fetchAlerts: async () => {
    try {
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
    set((state) => ({
      alerts: state.alerts.filter((a) => a.alert_id !== alertId),
    }));
    try {
      await apiDismissAlert(alertId);
    } catch (err) {
      console.error(`Failed to dismiss alert ${alertId}:`, err);
      get().fetchAlerts();
    }
  },

  fetchPredictiveAlerts: async () => {
    try {
      if (get().predictiveAlerts.length === 0 && !get().error) {
        set({ loading: true });
      }
      const severity = get().severityFilter || undefined;
      const status = get().statusFilter || undefined;
      const data = await getPredictiveAlerts(severity, status);
      set({ predictiveAlerts: data, error: null, loading: false });
    } catch (err) {
      console.error("Failed to fetch predictive alerts:", err);
      set({ error: "Failed to load predictive alerts", loading: false });
    }
  },

  acknowledgeAlert: async (alertId) => {
    // Optimistic UI update
    set((state) => ({
      predictiveAlerts: state.predictiveAlerts.map((a) =>
        a.alert_id === alertId ? { ...a, status: "acknowledged" } : a
      ),
    }));
    try {
      await apiAcknowledgeAlert(alertId);
    } catch (err) {
      console.error(`Failed to acknowledge alert ${alertId}:`, err);
      get().fetchPredictiveAlerts();
    }
  },

  resolveAlert: async (alertId) => {
    // Optimistic UI update
    set((state) => ({
      predictiveAlerts: state.predictiveAlerts.filter((a) => a.alert_id !== alertId),
    }));
    try {
      await apiResolveAlert(alertId);
    } catch (err) {
      console.error(`Failed to resolve alert ${alertId}:`, err);
      get().fetchPredictiveAlerts();
    }
  },

  setSeverityFilter: (severity) => {
    set({ severityFilter: severity });
    get().fetchPredictiveAlerts();
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status });
    get().fetchPredictiveAlerts();
  },
}));
export default useAlertStore;
