"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useMapStore } from "@/store/useMapStore";
import { useAlertStore } from "@/store/useAlertStore";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useMLStore } from "@/store/useMLStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { useDiversionStore } from "@/store/useDiversionStore";
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
  Clock, 
  Zap, 
  Shuffle, 
  CheckCircle, 
  Flame, 
  Users,
  Compass,
  ArrowRight,
  Sparkles,
  Award,
  Layers
} from "lucide-react";

// Dynamic Map Preview for Leaflet (SSR resilient)
const MapPreview = dynamic(
  () => import("./DashboardMapPreview").then((mod) => mod.DashboardMapPreview),
  { ssr: false, loading: () => <div className="h-full bg-[#0d0d0d] flex items-center justify-center text-slate-500 text-xs font-mono">Loading dashboard viewport...</div> }
);

export function DashboardView() {
  const { healthMap, setActiveTab, dashboardStats, fetchDashboardStats } = useMapStore();
  const { alerts, fetchAlerts } = useAlertStore();
  const { isSimulating, activeSimulations, startSimulation, stopSimulation } = useSimulationStore();
  const { prediction, predictImpact, resetPrediction, briefing, generateBriefing, isGeneratingBriefing } = useMLStore();
  const { optimizeAllocation, plan: operationsPlan, resetPlan } = useOperationsStore();
  const { generateDiversions, plan: diversionPlan, clearDiversions } = useDiversionStore();
  const { clearPlan } = useCorridorStore();

  const [simRunning, setSimRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  // Poll alerts and stats on mount
  useEffect(() => {
    fetchAlerts();
    fetchDashboardStats();
    const interval = setInterval(() => {
      fetchAlerts();
      fetchDashboardStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchDashboardStats]);

  // Compute stats
  const activeIncidentsCount = useMemo(() => {
    return alerts.filter(a => a.status === "active").length;
  }, [alerts]);

  const criticalPredictionsCount = useMemo(() => {
    return (prediction?.predicted_impact === "Critical" ? 1 : 0) + (alerts.filter(a => a.severity === "Critical").length);
  }, [prediction, alerts]);

  const avgJunctionHealth = useMemo(() => {
    const values = Object.values(healthMap).map((h) => h.health_score);
    if (values.length === 0) return 84; // baseline default
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [healthMap]);

  // 1. One-click Demo Scenarios Trigger Mappings
  const triggerDemoScenario = async (scenario: "rally" | "vip" | "construction" | "accident" | "sports") => {
    setSimRunning(true);
    resetPrediction();
    clearPlan();
    clearDiversions();
    
    let eventCause = "others";
    let intensity: "low" | "medium" | "high" = "medium";
    let priority: "Low" | "Medium" | "High" = "Medium";
    let roadClosure = false;
    let targetId = "silk-board";
    let lat = 12.9176;
    let lng = 77.6246;

    if (scenario === "rally") {
      eventCause = "protest";
      intensity = "high";
      priority = "High";
      roadClosure = true;
      targetId = "silk-board";
      lat = 12.9176; lng = 77.6246;
    } else if (scenario === "vip") {
      eventCause = "vip_movement";
      intensity = "high";
      priority = "High";
      roadClosure = true;
      targetId = "hebbal-flyover";
      lat = 12.9716; lng = 77.5946;
    } else if (scenario === "construction") {
      eventCause = "construction";
      intensity = "medium";
      priority = "Medium";
      roadClosure = false;
      targetId = "kr-puram";
      lat = 12.9716; lng = 77.5946;
    } else if (scenario === "accident") {
      eventCause = "accident";
      intensity = "high";
      priority = "High";
      roadClosure = false;
      targetId = "tin-factory";
      lat = 12.9716; lng = 77.5946;
    } else if (scenario === "sports") {
      eventCause = "public_event";
      intensity = "medium";
      priority = "Medium";
      roadClosure = false;
      targetId = "mg-road";
      lat = 12.9716; lng = 77.5946;
    }

    try {
      // Step A. Trigger Simulation
      await startSimulation({
        event_type: scenario === "rally" || scenario === "sports" ? "festival" : "accident",
        target_type: "junction",
        target_id: targetId,
        intensity: intensity
      });

      // Step B. Trigger Prediction
      const predRes = await predictImpact({
        event_cause: eventCause,
        event_type: scenario === "rally" || scenario === "sports" ? "planned" : "unplanned",
        priority: priority,
        requires_road_closure: roadClosure,
        latitude: lat,
        longitude: lng,
        start_datetime: new Date().toISOString()
      });

      // Step C. Trigger Resource Allocation Optimization
      const optPlan = await optimizeAllocation({
        impact_level: predRes.predicted_impact,
        confidence: predRes.confidence,
        event_type: scenario === "rally" || scenario === "sports" ? "planned" : "unplanned",
        event_duration: 3.0,
        event_attendance: scenario === "rally" ? 12000 : scenario === "sports" ? 25000 : 500,
        nearby_hospitals: 2,
        junction_criticality: 80,
        zone: "South"
      });

      // Step D. Trigger Diversion Planning
      await generateDiversions({
        event_location: targetId,
        predicted_impact_level: predRes.predicted_impact,
        deployment_score: optPlan.deployment_score,
        event_severity: intensity.toUpperCase(),
        event_attendance: scenario === "rally" ? 12000 : scenario === "sports" ? 25000 : 500
      });

      // Step E. Trigger Briefing
      await generateBriefing({
        prediction: {
          impact_level: predRes.predicted_impact,
          confidence: predRes.confidence
        },
        feature_contributions: predRes.reasons.map((r) => {
          const match = r.match(/^(.*?) contributed \+(\d+)%$/);
          return {
            feature: match ? match[1].trim() : r,
            contribution: match ? parseFloat(match[2]) : 15.0
          };
        }),
        resource_plan: {
          deployment_score: optPlan.deployment_score,
          officers_required: optPlan.officers_required,
          patrol_vehicles: optPlan.patrol_vehicles,
          barricades: optPlan.barricades,
          diversion_level: optPlan.diversion_level,
          emergency_corridor_required: optPlan.emergency_corridor_required,
          estimated_response_time: optPlan.estimated_response_time,
          estimated_operational_cost: optPlan.estimated_operational_cost
        },
        event_metadata: {
          event_type: scenario === "rally" || scenario === "sports" ? "planned" : "unplanned",
          event_cause: eventCause,
          zone: "South",
          junction: targetId,
          attendance: scenario === "rally" ? 12000 : scenario === "sports" ? 25000 : 500,
          duration: 3.0,
          start_time: "17:00"
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSimRunning(false);
    }
  };

  // 2. Presentation Mode: "Run Complete Simulation" sequential workflow
  const runCompleteSimulation = async () => {
    setSimRunning(true);
    resetPrediction();
    clearPlan();
    clearDiversions();
    
    const steps = [
      "Event Created (Festival at Silk Board)",
      "ML Prediction (XGBoost Classifier)",
      "Resource Optimization (deployment calculations)",
      "Diversion Planning (routing bypasses)",
      "Alert Generation (sensor warnings)",
      "AI Executive Briefing (copilot synthesis)",
      "Simulation Finished"
    ];

    try {
      // Step 1: Event Created
      setCurrentStep(0);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await startSimulation({
        event_type: "festival",
        target_type: "junction",
        target_id: "silk-board",
        intensity: "high"
      });

      // Step 2: ML Prediction
      setCurrentStep(1);
      await new Promise((resolve) => setTimeout(resolve, 800));
      const predRes = await predictImpact({
        event_cause: "protest",
        event_type: "planned",
        priority: "High",
        requires_road_closure: true,
        latitude: 12.9176,
        longitude: 77.6246,
        start_datetime: new Date().toISOString()
      });

      // Step 3: Resource Optimization
      setCurrentStep(2);
      await new Promise((resolve) => setTimeout(resolve, 800));
      const optPlan = await optimizeAllocation({
        impact_level: predRes.predicted_impact,
        confidence: predRes.confidence,
        event_type: "planned",
        event_duration: 3.5,
        event_attendance: 15000,
        nearby_hospitals: 2,
        junction_criticality: 90,
        zone: "South"
      });

      // Step 4: Diversion Planning
      setCurrentStep(3);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await generateDiversions({
        event_location: "silk-board",
        predicted_impact_level: predRes.predicted_impact,
        deployment_score: optPlan.deployment_score,
        event_severity: "HIGH",
        event_attendance: 15000
      });

      // Step 5: Alert Generation
      setCurrentStep(4);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await fetchAlerts();

      // Step 6: AI Briefing
      setCurrentStep(5);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await generateBriefing({
        prediction: {
          impact_level: predRes.predicted_impact,
          confidence: predRes.confidence
        },
        feature_contributions: predRes.reasons.map((r) => {
          const match = r.match(/^(.*?) contributed \+(\d+)%$/);
          return {
            feature: match ? match[1].trim() : r,
            contribution: match ? parseFloat(match[2]) : 15.0
          };
        }),
        resource_plan: {
          deployment_score: optPlan.deployment_score,
          officers_required: optPlan.officers_required,
          patrol_vehicles: optPlan.patrol_vehicles,
          barricades: optPlan.barricades,
          diversion_level: optPlan.diversion_level,
          emergency_corridor_required: optPlan.emergency_corridor_required,
          estimated_response_time: optPlan.estimated_response_time,
          estimated_operational_cost: optPlan.estimated_operational_cost
        },
        event_metadata: {
          event_type: "planned",
          event_cause: "protest",
          zone: "South",
          junction: "silk-board",
          attendance: 15000,
          duration: 3.5,
          start_time: "18:00"
        }
      });

      // Step 7: Completed
      setCurrentStep(6);
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e) {
      console.error(e);
    } finally {
      setSimRunning(false);
    }
  };

  const resetAllOperations = async () => {
    setSimRunning(false);
    setCurrentStep(null);
    try {
      if (activeSimulations.length > 0) {
        for (const sim of activeSimulations) {
          await stopSimulation(sim.simulation_id);
        }
      }
      resetPrediction();
      resetPlan();
      clearDiversions();
      clearPlan();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-[#080808]">
      
      {/* Title & Presentation Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-950/40 border border-white/5 p-4 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Executive Command Center <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">City-scale traffic intelligence & ML response orchestration.</p>
        </div>
        
        {/* Presentation & Reset Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={runCompleteSimulation}
            disabled={simRunning}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse hover:animate-none"
          >
            <Zap className="h-3.5 w-3.5 fill-white" />
            <span>Run Complete Simulation</span>
          </button>

          <button
            onClick={resetAllOperations}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300 transition hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Board</span>
          </button>
        </div>
      </div>

      {/* Presentation Step Wizard */}
      {currentStep !== null && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-950/5 p-4 animate-fadeIn">
          <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 font-mono">Simulation Pipeline Status</span>
          <div className="flex items-center justify-between mt-3 gap-2">
            {[
              "Event Created",
              "ML Prediction",
              "Resource Optimized",
              "Diversions Planned",
              "Alerts Generated",
              "AI Briefing",
              "Outcome Summary"
            ].map((stepLabel, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center text-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center border text-[10px] font-bold font-mono transition duration-300 ${
                    isPast ? "bg-emerald-600/20 border-emerald-500 text-emerald-400" :
                    isCurrent ? "bg-blue-600 border-blue-400 text-white animate-ping scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]" :
                    "bg-slate-900 border-white/5 text-slate-500"
                  }`}>
                    {isPast ? "✓" : idx + 1}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wide truncate max-w-[80px] ${
                    isCurrent ? "text-blue-400" : isPast ? "text-slate-400" : "text-slate-600"
                  }`}>{stepLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* KPI 1: Active Incidents */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Active Incidents</span>
          <h3 className="text-2xl font-black mt-2 text-red-500 font-mono">{activeIncidentsCount}</h3>
          <span className="text-[9px] text-slate-500 mt-1">Requires dispatch</span>
        </div>

        {/* KPI 2: Critical Predictions */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Critical Warnings</span>
          <h3 className="text-2xl font-black mt-2 text-orange-400 font-mono">{criticalPredictionsCount}</h3>
          <span className="text-[9px] text-slate-500 mt-1">Severe drift alerts</span>
        </div>

        {/* KPI 3: Avg Response Time */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Avg Response Time</span>
          <h3 className="text-2xl font-black mt-2 text-slate-200 font-mono">
            {dashboardStats?.avg_response_time_minutes != null
              ? `${dashboardStats.avg_response_time_minutes} mins`
              : operationsPlan?.estimated_response_time ?? "-"}
          </h3>
          <span className="text-[9px] text-slate-500 mt-1">Emergency benchmark</span>
        </div>

        {/* KPI 4: Diversions */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Diversions Active</span>
          <h3 className="text-2xl font-black mt-2 text-purple-400 font-mono">
            {diversionPlan ? "Active" : "None"}
          </h3>
          <span className="text-[9px] text-slate-500 mt-1">Bypass routes active</span>
        </div>

        {/* KPI 5: Emergency Corridors */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Corridors Active</span>
          <h3 className="text-2xl font-black mt-2 text-blue-400 font-mono">
            {operationsPlan?.emergency_corridor_required ? "Active" : "None"}
          </h3>
          <span className="text-[9px] text-slate-500 mt-1">Hospital lanes active</span>
        </div>

        {/* KPI 6: Prediction Accuracy (from learning feedback) */}
        <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">ML Accuracy</span>
          <h3 className="text-2xl font-black mt-2 text-emerald-400 font-mono">{dashboardStats?.ml_accuracy_pct ?? "-"}%</h3>
          <span className="text-[9px] text-slate-500 mt-1">Feedback dataset</span>
        </div>
      </div>

      {/* Main Command Workspace */}
      <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
        
        {/* Left Side: Demo Triggers, SVG Charts, City Intelligence (6 cols) */}
        <div className="col-span-6 flex flex-col gap-6">
          
          {/* Demo Scenario Triggers */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
              <Compass className="h-4 w-4 text-blue-400" /> One-Click Scenario Triggers
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: "rally" as const, label: "Rally", color: "bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-500/20" },
                { id: "vip" as const, label: "VIP", color: "bg-purple-600/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20" },
                { id: "construction" as const, label: "Work", color: "bg-amber-600/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" },
                { id: "accident" as const, label: "Crash", color: "bg-orange-600/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20" },
                { id: "sports" as const, label: "Sports", color: "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20" }
              ].map((scen) => (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => triggerDemoScenario(scen.id)}
                  disabled={simRunning}
                  className={`py-2 px-1 rounded-lg border text-center text-[10px] font-bold uppercase transition flex flex-col items-center justify-center gap-1 ${scen.color}`}
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>{scen.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SVG Analytics Charts (Zone Risks, Allocations, Distributions) */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-4 shadow-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
              <Activity className="h-4 w-4 text-blue-400" /> Command Analytics & Trends
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Chart 1: Zone Risk Levels (from DB health scores) */}
              <div className="bg-slate-950/40 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Zone Risk Levels</span>
                <div className="flex flex-col gap-1.5 mt-1">
                  {(dashboardStats?.zone_risk_levels ?? []).map((z, i) => {
                    const color = z.risk >= 70 ? "bg-red-500/60" : z.risk >= 40 ? "bg-orange-500/50" : "bg-emerald-500/50";
                    return (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        <span className="text-slate-400 w-14 font-mono">{z.zone}</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${z.risk}%` }} />
                        </div>
                        <span className="font-bold text-slate-300 w-8 text-right font-mono">{z.risk}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Resource Utilisation (from resource engine) */}
              <div className="bg-slate-950/40 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Resource Utilisation</span>
                <div className="flex flex-col gap-2 mt-1.5">
                  {(dashboardStats?.resource_utilization ?? [
                    { label: "Officers", pct: 0, desc: "Loading..." },
                    { label: "Vehicles", pct: 0, desc: "Loading..." },
                    { label: "Barricades", pct: 0, desc: "Loading..." }
                  ]).map((item, idx) => {
                    const colors = ["bg-blue-500", "bg-purple-500", "bg-orange-500"];
                    return (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                          <span>{item.label}</span>
                          <span>{item.pct}%</span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${colors[idx % 3]}`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* City Intelligence & Hotspots (from DB) */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
              <Layers className="h-4 w-4 text-blue-400" /> City Intelligence Overview
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/30 border border-white/5 rounded-lg">
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">High-Risk Zone</span>
                <p className="text-red-400 font-bold mt-1">{dashboardStats?.city_intelligence?.highest_risk_zone ?? "-"} Zone ({dashboardStats?.city_intelligence?.highest_risk_zone_pct ?? 0}% risk)</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Worst junction: {dashboardStats?.city_intelligence?.worst_junction ?? "-"}</p>
                {!!dashboardStats?.city_intelligence?.active_simulation_hotspots?.length && (
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Active hotspots: {dashboardStats.city_intelligence.active_simulation_hotspots.map((item) => item.zone_name).join(", ")}
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-950/30 border border-white/5 rounded-lg">
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Network Status</span>
                <p className="text-amber-400 font-bold mt-1">{dashboardStats?.city_intelligence?.total_incidents ?? 0} Total Incidents</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Avg clearance: {dashboardStats?.avg_clearance_minutes ?? dashboardStats?.avg_response_time_minutes ?? 0} min</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Active sims: {dashboardStats?.city_intelligence?.active_simulation_count ?? 0}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Map HUD Preview, Executive Briefings (6 cols) */}
        <div className="col-span-6 flex flex-col gap-6">
          
          {/* Map Preview Viewport */}
          <div className="rounded-xl border border-white/5 bg-panel overflow-hidden shadow-lg relative h-72">
            <div className="absolute top-4 left-4 z-10 bg-black/75 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-500" /> Control Room Viewport
              </span>
            </div>
            <MapPreview />
          </div>

          {/* Executive Briefings (AI Traffic Commander integrated) */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Award className="h-4 w-4 text-purple-400 animate-pulse" /> AI Executive Command Briefings
              </h3>
              {briefing && (
                <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase tracking-wider ${
                  briefing.generated_by === "gemini" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {briefing.generated_by} Mode
                </span>
              )}
            </div>

            {briefing ? (
              <div className="flex flex-col gap-3.5 animate-fadeIn">
                {/* Daily Operational Summary */}
                <div className="bg-white/[0.01] border border-white/5 rounded-lg p-3">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Daily Operational Summary</span>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1 font-medium">{briefing.summary}</p>
                </div>

                {/* Commissioner Briefing Mode */}
                {briefing.commissioner_briefing && (
                  <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-3">
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Commissioner Briefing Mode
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{briefing.commissioner_briefing}</p>
                  </div>
                )}

                {/* Risk Forecast / Alert */}
                <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3">
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest font-mono flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Risk Forecast (Top 3)
                  </span>
                  <ul className="flex flex-col gap-1 mt-1.5">
                    {briefing.risks.slice(0, 3).map((risk, index) => (
                      <li key={index} className="text-xs text-slate-300 flex items-start gap-1">
                        <span className="text-red-500">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 bg-slate-950/20 rounded-lg flex flex-col items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-slate-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-400">Briefing Standby</span>
                <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed">
                  Start a demo scenario or click Run Complete Simulation to compile briefings.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
export default DashboardView;
