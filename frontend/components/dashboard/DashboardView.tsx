"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useMapStore } from "@/store/useMapStore";
import { useAlertStore } from "@/store/useAlertStore";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useMLStore } from "@/store/useMLStore";
import { useCorridorStore } from "@/store/useCorridorStore";
import { 
  ShieldAlert, 
  Activity, 
  MapPin, 
  Cpu, 
  Play, 
  RefreshCw, 
  TrendingDown, 
  UserCheck, 
  Heart,
  ChevronRight
} from "lucide-react";

// Dynamic Map Preview for Leaflet (SSR resilient)
const MapPreview = dynamic(
  () => import("./DashboardMapPreview").then((mod) => mod.DashboardMapPreview),
  { ssr: false, loading: () => <div className="h-full bg-[#0d0d0d] flex items-center justify-center text-slate-500 text-xs font-mono">Loading dashboard viewport...</div> }
);

export function DashboardView() {
  const { junctions, healthMap, setActiveTab } = useMapStore();
  const { alerts, fetchAlerts, dismissAlert } = useAlertStore();
  const { isSimulating, activeSimulations, startSimulation, stopSimulation } = useSimulationStore();
  const { prediction, predictImpact, resetPrediction } = useMLStore();
  const { clearPlan } = useCorridorStore();

  const [simRunning, setSimRunning] = useState(false);

  // Poll alerts
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(), 5000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Compute stats
  const activeIncidentsCount = useMemo(() => {
    return alerts.filter(a => a.alert_type === "incident_spread").length + 2; // benchmark scaling
  }, [alerts]);

  const avgJunctionHealth = useMemo(() => {
    const values = Object.values(healthMap).map((h) => h.health_score);
    if (values.length === 0) return 82.5; // baseline default
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [healthMap]);

  // Quick Action Triggers
  const triggerVIPCorridor = async () => {
    setSimRunning(true);
    try {
      // Simulate VIP movement at silk-board
      const payload = {
        event_cause: "vip_movement",
        event_type: "planned" as const,
        priority: "High" as const,
        requires_road_closure: true,
        latitude: 12.9176,
        longitude: 77.6246,
        start_datetime: new Date().toISOString()
      };
      await startSimulation({
        event_type: "festival", // simulator maps to general simulation
        target_type: "junction",
        target_id: "silk-board",
        intensity: "high"
      });
      await predictImpact(payload);
      // Change views to emergency corridors to show it visually
      setActiveTab("corridors");
    } catch (err) {
      console.error(err);
    } finally {
      setSimRunning(false);
    }
  };

  const triggerPeakGridlock = async () => {
    setSimRunning(true);
    try {
      const payload = {
        event_cause: "congestion",
        event_type: "unplanned" as const,
        priority: "High" as const,
        requires_road_closure: false,
        latitude: 12.9226,
        longitude: 77.6174,
        start_datetime: new Date().toISOString()
      };
      await startSimulation({
        event_type: "breakdown",
        target_type: "zone",
        target_id: "Central",
        intensity: "high"
      });
      await predictImpact(payload);
      setActiveTab("simulator");
    } catch (err) {
      console.error(err);
    } finally {
      setSimRunning(false);
    }
  };

  const resetAllOperations = async () => {
    setSimRunning(true);
    try {
      if (activeSimulations.length > 0) {
        for (const sim of activeSimulations) {
          await stopSimulation(sim.simulation_id);
        }
      }
      resetPrediction();
      clearPlan();
    } catch (err) {
      console.error(err);
    } finally {
      setSimRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-[#080808]">
      
      {/* Welcome Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Command Center Overview <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Real-time predictive traffic operations & network diagnostics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAllOperations}
            disabled={simRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Command Board</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network Health</span>
            <h3 className={`text-2xl font-black mt-1 ${avgJunctionHealth < 75 ? "text-amber-400" : "text-emerald-400"}`}>
              {avgJunctionHealth}%
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
              <Activity className="h-3 w-3 text-emerald-500" /> Optimal bounds
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
            <Heart className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Alerts</span>
            <h3 className="text-2xl font-black mt-1 text-red-400">
              {alerts.length}
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
              <ShieldAlert className="h-3 w-3 text-red-400 animate-pulse" /> Requires attention
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/10">
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Simulators</span>
            <h3 className={`text-2xl font-black mt-1 ${isSimulating ? "text-blue-400" : "text-slate-400"}`}>
              {isSimulating ? "1 Active" : "Offline"}
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
              <Cpu className="h-3 w-3 text-blue-400" /> State simulation engine
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
            <Cpu className="h-5 w-5 text-blue-400" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ML Predicted Impact</span>
            <h3 className={`text-2xl font-black mt-1 ${
              prediction ? {
                Low: "text-emerald-400",
                Medium: "text-amber-400",
                High: "text-orange-400",
                Critical: "text-red-400 animate-pulse"
              }[prediction.predicted_impact] : "text-slate-500"
            }`}>
              {prediction ? prediction.predicted_impact : "No Run"}
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3 text-slate-400" /> XGBoost classifier
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center border border-white/5">
            <Activity className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left is quick actions, recent lists. Right is the map preview. */}
      <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
        
        {/* Left column (5 cols) */}
        <div className="col-span-5 flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Quick Actions */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Demorun triggers</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={triggerVIPCorridor}
                disabled={simRunning}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-400 transition hover:bg-blue-500/10 font-bold text-center"
              >
                <Play className="h-3.5 w-3.5 fill-blue-400" />
                <span>Simulate VIP Corridor</span>
              </button>

              <button
                type="button"
                onClick={triggerPeakGridlock}
                disabled={simRunning}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 text-xs text-orange-400 transition hover:bg-orange-500/10 font-bold text-center"
              >
                <Play className="h-3.5 w-3.5 fill-orange-400" />
                <span>Simulate Peak Gridlock</span>
              </button>
            </div>
          </div>

          {/* Recent Alerts List */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg flex-1 min-h-[200px]">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Operator Alerts</h3>
              <button onClick={() => setActiveTab("alerts")} className="text-xs text-blue-400 hover:underline flex items-center gap-0.5">
                Manage <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 flex-1 text-slate-500 text-xs">
                All corridors clear. No warnings triggered.
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[240px]">
                {alerts.map((alert) => (
                  <div key={alert.alert_id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{alert.alert_type}</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px]">Conf {alert.confidence}%</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column (7 cols) - Map Preview */}
        <div className="col-span-7 flex flex-col gap-2 rounded-xl border border-white/5 bg-panel overflow-hidden shadow-lg relative min-h-[350px]">
          <div className="absolute top-4 left-4 z-10 bg-black/75 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-500" /> Live Viewport Map
            </span>
          </div>
          <MapPreview />
        </div>
      </div>
    </div>
  );
}
