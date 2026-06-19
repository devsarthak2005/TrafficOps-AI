"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAlertStore } from "@/store/useAlertStore";
import { 
  ShieldAlert, 
  BellOff, 
  Loader2, 
  ListFilter, 
  CheckCircle2, 
  Eye, 
  Clock, 
  Activity, 
  AlertCircle,
  MapPin
} from "lucide-react";

export function AlertsCenterView() {
  const { 
    predictiveAlerts, 
    loading, 
    error, 
    severityFilter, 
    statusFilter, 
    fetchPredictiveAlerts, 
    acknowledgeAlert, 
    resolveAlert,
    setSeverityFilter,
    setStatusFilter
  } = useAlertStore();

  const [activeTab, setActiveTab] = useState<"active" | "acknowledged" | "resolved">("active");

  // Fetch predictive alerts on mount and poll every 5 seconds
  useEffect(() => {
    fetchPredictiveAlerts();
    const interval = setInterval(() => fetchPredictiveAlerts(), 5000);
    return () => clearInterval(interval);
  }, [fetchPredictiveAlerts]);

  // Set status filter automatically when activeTab changes
  useEffect(() => {
    setStatusFilter(activeTab);
  }, [activeTab, setStatusFilter]);

  // Calculate live counters
  const counters = useMemo(() => {
    const active = predictiveAlerts.filter((a) => a.status === "active");
    const critical = active.filter((a) => a.severity === "Critical").length;
    const warning = active.filter((a) => a.severity === "Warning").length;
    const watch = active.filter((a) => a.severity === "Watch").length;
    return {
      activeCount: active.length,
      criticalCount: critical,
      warningCount: warning,
      watchCount: watch
    };
  }, [predictiveAlerts]);

  // Get color configurations
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical":
        return {
          bg: "bg-red-500/10 border-red-500/20",
          text: "text-red-400",
          border: "border-l-red-500",
          bullet: "bg-red-500",
          shadow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
          glow: "animate-pulse shadow-red-500/50"
        };
      case "Warning":
        return {
          bg: "bg-orange-500/10 border-orange-500/20",
          text: "text-orange-400",
          border: "border-l-orange-500",
          bullet: "bg-orange-500",
          shadow: "shadow-[0_0_15px_rgba(249,115,22,0.1)]",
          glow: ""
        };
      case "Watch":
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/20",
          text: "text-blue-400",
          border: "border-l-blue-500",
          bullet: "bg-blue-500",
          shadow: "shadow-[0_0_15px_rgba(59,130,246,0.05)]",
          glow: ""
        };
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-[#080808]">
      
      {/* Title & Live Counter Banners */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Predictive Alert Intelligence Center <Activity className="h-5 w-5 text-blue-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Real-time proactive triggers monitoring ML model forecasts, resource demands, and corridor safety.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          {/* Active Alerts Count */}
          <div className="bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Active</span>
            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
              {counters.activeCount}
            </span>
          </div>

          {/* Critical Alerts Count (Blinking if > 0) */}
          <div className={`bg-slate-900 border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 ${
            counters.criticalCount > 0 ? "border-red-500/20 bg-red-950/5" : ""
          }`}>
            <span className="relative flex h-2 w-2">
              {counters.criticalCount > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                counters.criticalCount > 0 ? "bg-red-500" : "bg-slate-600"
              }`}></span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Critical</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              counters.criticalCount > 0 ? "bg-red-500/20 text-red-400 animate-pulse font-extrabold" : "bg-slate-800 text-slate-400"
            }`}>
              {counters.criticalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs and Filters Panel */}
      <div className="flex flex-col gap-4 bg-[#0a0d14] border border-white/5 p-4 rounded-xl shadow-lg">
        
        {/* Status Tabs */}
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex gap-2">
            {(["active", "acknowledged", "resolved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === tab 
                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="text-[9px] font-mono text-slate-500">System polling active</span>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-3 text-xs">
          <ListFilter className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-400 mr-1">Severity filter:</span>
          
          <button
            onClick={() => setSeverityFilter(null)}
            className={`px-3 py-1 rounded transition border ${
              severityFilter === null 
                ? "bg-slate-800 text-white border-white/10" 
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            All
          </button>

          {["Watch", "Warning", "Critical"].map((sev) => {
            const isSelected = severityFilter === sev;
            let colorClass = "hover:text-blue-400";
            if (sev === "Critical") colorClass = isSelected ? "bg-red-500/10 text-red-400 border-red-500/20" : "text-slate-500 hover:text-red-400";
            else if (sev === "Warning") colorClass = isSelected ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "text-slate-500 hover:text-orange-400";
            else colorClass = isSelected ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "text-slate-500 hover:text-blue-400";

            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(isSelected ? null : sev)}
                className={`px-3 py-1 rounded transition border ${
                  isSelected ? "font-bold" : "border-transparent"
                } ${colorClass}`}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-12 gap-6 items-start flex-1 min-h-0">
        
        {/* Left Side: Alerts List */}
        <div className="col-span-8 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-2">
          {loading && predictiveAlerts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-slate-500 bg-[#0a0d14]/30 rounded-xl border border-white/5">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-xs font-mono">Scanning sensor grid...</span>
            </div>
          ) : error && predictiveAlerts.length === 0 ? (
            <div className="rounded-xl border border-red-950 bg-red-950/20 p-6 text-center">
              <p className="text-sm text-red-400 font-semibold">{error}</p>
            </div>
          ) : predictiveAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-panel/20 py-16 text-center">
              <BellOff className="h-10 w-10 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Alerts Found</h3>
              <p className="text-[10px] text-slate-500 max-w-[280px] leading-relaxed">
                No alerts matching the selected status and filters are currently registered in the database.
              </p>
            </div>
          ) : (
            predictiveAlerts.map((alert) => {
              const style = getSeverityStyle(alert.severity);
              const isCrit = alert.severity === "Critical" && alert.status === "active";
              return (
                <div
                  key={alert.alert_id}
                  className={`relative rounded-xl border p-4 border-l-[4px] ${style.border} ${style.bg} ${style.shadow} ${
                    isCrit ? "animate-pulse border-red-500" : ""
                  } flex flex-col gap-3 transition duration-300 hover:border-slate-700`}
                >
                  
                  {/* Alert Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${style.bullet} ${isCrit ? "animate-ping" : ""}`} />
                      <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase font-mono">{alert.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${style.bg} ${style.text}`}>
                        {alert.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>Conf: {Math.round(alert.confidence)}%</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed pr-24 font-sans font-medium">
                    {alert.description}
                  </p>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(alert.created_at).toLocaleTimeString()}
                    </span>

                    {/* Operational Action Buttons */}
                    {alert.status !== "resolved" && (
                      <div className="flex gap-2">
                        {alert.status === "active" && (
                          <button
                            onClick={() => acknowledgeAlert(alert.alert_id)}
                            className="px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 text-[10px] font-bold rounded transition flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => resolveAlert(alert.alert_id)}
                          className="px-2.5 py-1 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 text-[10px] font-bold rounded transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Resolve
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Timeline & Map Overview (4 cols) */}
        <div className="col-span-4 flex flex-col gap-6">
          
          {/* Map Overlay Bonus */}
          <div className="rounded-xl border border-white/5 bg-[#0a0d14] p-4 shadow-lg flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-white/5 pb-2">
              <MapPin className="h-4 w-4 text-blue-500" /> Alert Map Overlay
            </h3>
            <div className="relative h-28 rounded-lg bg-slate-950 border border-white/5 flex flex-col items-center justify-center text-center overflow-hidden">
              {/* Fake Radar Grid Animation */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06)_0%,transparent_70%)] animate-pulse" />
              <AlertCircle className="h-7 w-7 text-blue-500/40 mb-1.5 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spatial HUD active</span>
              <p className="text-[9px] text-slate-500 mt-1 max-w-[180px] leading-relaxed">
                Critical warnings are projected directly onto the control center map overlay.
              </p>
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="rounded-xl border border-white/5 bg-[#0a0d14] p-4 shadow-lg flex flex-col gap-4 flex-1 max-h-[300px]">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Clock className="h-4 w-4 text-blue-400" /> System Timeline
            </h3>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {predictiveAlerts.slice(0, 5).map((a, idx) => {
                const style = getSeverityStyle(a.severity);
                return (
                  <div key={a.alert_id} className="flex gap-2.5 text-[11px] relative">
                    {idx < 4 && (
                      <div className="absolute left-[5px] top-[14px] bottom-[-22px] w-[1px] bg-white/5" />
                    )}
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 border border-black/40 ${style.bullet}`} />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-slate-300 font-mono tracking-wide">{a.title}</span>
                        <span className="text-[9px] text-slate-500">{new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 italic lowercase tracking-wide">{a.status}</span>
                    </div>
                  </div>
                );
              })}
              {predictiveAlerts.length === 0 && (
                <div className="text-center py-6 text-[10px] text-slate-500 font-mono">Timeline Standby</div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
export default AlertsCenterView;
