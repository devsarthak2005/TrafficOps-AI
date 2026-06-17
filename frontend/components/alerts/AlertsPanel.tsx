"use client";

import { useEffect } from "react";
import { useAlertStore } from "@/store/useAlertStore";
import AlertCard from "./AlertCard";
import { Loader2, BellOff, ShieldAlert } from "lucide-react";

export default function AlertsPanel() {
  const alerts = useAlertStore((state) => state.alerts);
  const loading = useAlertStore((state) => state.loading);
  const error = useAlertStore((state) => state.error);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);
  const dismissAlert = useAlertStore((state) => state.dismissAlert);

  useEffect(() => {
    fetchAlerts(); // initial fetch

    const interval = setInterval(() => {
      fetchAlerts();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Predictive Alerts
          </h3>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-extrabold text-red-400 border border-red-500/20">
            {alerts.length} Active
          </span>
        )}
      </div>

      {/* Alert List */}
      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
        {loading && alerts.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <span className="text-xs">Evaluating network triggers...</span>
          </div>
        ) : error && alerts.length === 0 ? (
          <div className="rounded-lg border border-red-950 bg-red-950/20 p-4 text-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-800/80 bg-slate-900/10 py-8 px-4 text-center">
            <BellOff className="h-6 w-6 text-slate-600" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                All Corridors Clear
              </span>
              <p className="text-[10px] text-slate-500">
                No proactive anomalies or risk escalations detected.
              </p>
            </div>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertCard
              key={alert.alert_id}
              alert={alert}
              onDismiss={dismissAlert}
            />
          ))
        )}
      </div>
    </div>
  );
}
