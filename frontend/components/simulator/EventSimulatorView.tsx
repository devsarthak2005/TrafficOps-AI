"use client";

import { useState, useEffect } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useMapStore } from "@/store/useMapStore";
import { useMLStore } from "@/store/useMLStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { useDiversionStore } from "@/store/useDiversionStore";
import { useAlertStore } from "@/store/useAlertStore";
import { useCorridorStore } from "@/store/useCorridorStore";
import { MLPredictionPanel } from "./MLPredictionPanel";
import { NoInterventionTimeline } from "./NoInterventionTimeline";
import { Play, Sparkles, AlertTriangle, ArrowRight, ShieldCheck, CheckSquare, Calendar, Activity, Zap, RefreshCw } from "lucide-react";
import { createIncident } from "@/lib/api/incidents";

const EVENT_OPTIONS = [
  { value: "festival", label: "Festival" },
  { value: "political_rally", label: "Political Rally" },
  { value: "sports_event", label: "Sports Event" },
  { value: "accident", label: "Accident" },
  { value: "breakdown", label: "Breakdown" },
  { value: "construction", label: "Construction" },
  { value: "water_logging", label: "Water Logging" },
];

const ZONE_OPTIONS = ["North", "East", "Central", "South"];

export function EventSimulatorView() {
  const startSimulation = useSimulationStore((state) => state.startSimulation);
  const stopSimulation = useSimulationStore((state) => state.stopSimulation);
  const activeSimulations = useSimulationStore((state) => state.activeSimulations);
  const junctions = useMapStore((state) => state.junctions);
  const isSimulating = useSimulationStore((state) => state.isSimulating);
  const predictImpact = useMLStore((state) => state.predictImpact);
  const resetPrediction = useMLStore((state) => state.resetPrediction);
  const simulateNoIntervention = useMLStore((state) => state.simulateNoIntervention);
  const fetchSecondaryHotspots = useMLStore((state) => state.fetchSecondaryHotspots);
  const clearSecondaryHotspots = useMLStore((state) => state.clearSecondaryHotspots);
  const prediction = useMLStore((state) => state.prediction);
  const optimizeAllocation = useOperationsStore((state) => state.optimizeAllocation);
  const resetPlan = useOperationsStore((state) => state.resetPlan);
  const generateDiversions = useDiversionStore((state) => state.generateDiversions);
  const clearDiversions = useDiversionStore((state) => state.clearDiversions);
  const clearPlan = useCorridorStore((state) => state.clearPlan);

  const plan = useOperationsStore((state) => state.plan);
  const noInterventionData = useMLStore((state) => state.noInterventionData);
  const fetchHealthSummary = useMapStore((state) => state.fetchHealthSummary);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);

  const [eventType, setEventType] = useState<string>("festival");
  const [targetType, setTargetType] = useState<"zone" | "junction">("zone");
  const [targetId, setTargetId] = useState<string>(ZONE_OPTIONS[0]);
  const [intensity, setIntensity] = useState<"low" | "medium" | "high">("medium");
  const [requiresRoadClosure, setRequiresRoadClosure] = useState<boolean>(false);
  const [startDatetime, setStartDatetime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  
  // Optimizer input states
  const [eventAttendance, setEventAttendance] = useState<number>(1000);
  const [eventDuration, setEventDuration] = useState<number>(3.0);
  const [nearbyHospitals, setNearbyHospitals] = useState<number>(2);
  const [junctionCriticality, setJunctionCriticality] = useState<number>(70);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"predictive" | "inaction">("predictive");

  // Ticker auto-play state
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Ticker effect
  useEffect(() => {
    if (!isAutoPlaying) return;

    const descriptions: Record<string, string[]> = {
      accident: [
        "Multi-vehicle collision near intersection",
        "Minor fender bender blocking left lane",
        "Rear-end collision causing slowdown"
      ],
      breakdown: [
        "Stalled transit bus in center lane",
        "Broken down delivery truck blocking traffic",
        "Stalled SUV near flyover entrance"
      ],
      construction: [
        "Emergency utility repairs ongoing",
        "Road repaving blocking single lane",
        "Lane closure for flyover maintenance"
      ],
      water_logging: [
        "Waterlogging from heavy monsoon shower",
        "Subway flooding blocking all movement",
        "Severe water accumulation on service road"
      ],
      congestion: [
        "Heavy commuter rush hour volume",
        "Slow-moving traffic bottlenecks",
        "Peak traffic surge blocking intersection"
      ],
    };

    const runTicker = async () => {
      if (junctions.length === 0) return;
      
      const randomJunction = junctions[Math.floor(Math.random() * junctions.length)];
      const types = ["accident", "breakdown", "construction", "water_logging", "congestion"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const severities = ["low", "moderate", "high", "critical"];
      const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
      
      const descList = descriptions[randomType] || ["Simulated traffic incident"];
      const randomDesc = descList[Math.floor(Math.random() * descList.length)];
      
      try {
        await createIncident({
          junction_id: randomJunction.id,
          incident_type: randomType,
          severity: randomSeverity,
          description: randomDesc,
        });
        
        await Promise.all([
          fetchAlerts(),
          fetchHealthSummary()
        ]);
      } catch (err) {
        console.error("Failed to inject ticker incident:", err);
      }
    };

    runTicker();

    const tickerInterval = setInterval(() => {
      runTicker();
    }, 15000);

    return () => clearInterval(tickerInterval);
  }, [isAutoPlaying, junctions, fetchAlerts, fetchHealthSummary]);

  const handleTargetTypeChange = (newType: "junction" | "zone") => {
    setTargetType(newType);
    if (newType === "zone") {
      setTargetId(ZONE_OPTIONS[0]);
    } else {
      setTargetId(junctions[0]?.id || "");
    }
  };

  const handleRun = async () => {
    if (!targetId) return;
    setIsSubmitting(true);
    clearDiversions();
    try {
      // 1. Resolve coordinates
      let lat = 12.9716;
      let lng = 77.5946;
      if (targetType === "junction") {
        const junc = junctions.find((j) => j.id === targetId);
        if (junc) {
          lat = junc.lat;
          lng = junc.lng;
        }
      }

      // 2. Map event cause to ML categories
      const causeMap: Record<string, string> = {
        festival: "public_event",
        political_rally: "protest",
        sports_event: "public_event",
        accident: "accident",
        breakdown: "vehicle_breakdown",
        construction: "construction",
        water_logging: "water_logging",
      };

      const mlPayload = {
        event_cause: causeMap[eventType] || "others",
        event_type: ["festival", "political_rally", "sports_event"].includes(eventType) ? ("planned" as const) : ("unplanned" as const),
        priority: intensity === "high" ? ("High" as const) : intensity === "medium" ? ("Medium" as const) : ("Low" as const),
        requires_road_closure: requiresRoadClosure,
        latitude: lat,
        longitude: lng,
        start_datetime: new Date(startDatetime).toISOString(),
      };

      // 3. Trigger simulation and ML prediction
      const [_, predRes] = await Promise.all([
        startSimulation({
          event_type: eventType as any,
          target_type: targetType,
          target_id: targetId,
          intensity,
        }),
        predictImpact(mlPayload),
      ]);

      // Determine zone
      let resolvedZone = "Central";
      if (targetType === "zone") {
        resolvedZone = targetId;
      } else {
        const zoneMap: Record<string, string> = {
          "hebbal-flyover": "North",
          "kr-puram": "East",
          "tin-factory": "East",
          "old-madras-road": "East",
          "mg-road": "Central",
          "silk-board": "South",
          "bellandur": "South",
          "marathahalli-bridge": "South",
        };
        resolvedZone = zoneMap[targetId] || "Central";
      }

      // 4. Calculate diversion location for routing and allocation
      const zoneToJuncMap: Record<string, string> = {
        North: "hebbal-flyover",
        East: "kr-puram",
        Central: "mg-road",
        South: "silk-board"
      };
      
      const diversionLocation = targetType === "junction"
        ? targetId
        : (zoneToJuncMap[targetId] || "silk-board");

      // Trigger recovery time predictor and escalation risk predictor in parallel
      const [recoveryRes, escalationRes] = await Promise.all([
        useMLStore.getState().predictRecoveryTime({
          event_cause: mlPayload.event_cause as any,
          event_type: mlPayload.event_type,
          priority: mlPayload.priority,
          requires_road_closure: mlPayload.requires_road_closure,
          latitude: lat,
          longitude: lng,
          zone: resolvedZone,
          corridor: "main_corridor",
          junction: diversionLocation,
          start_datetime: mlPayload.start_datetime
        }),
        useMLStore.getState().predictEscalationRisk({
          event_cause: mlPayload.event_cause as any,
          event_type: mlPayload.event_type,
          priority: mlPayload.priority,
          requires_road_closure: mlPayload.requires_road_closure,
          latitude: lat,
          longitude: lng,
          zone: resolvedZone,
          junction: diversionLocation,
          start_datetime: mlPayload.start_datetime
        })
      ]);

      // Trigger Zone Risk Engine prediction dynamically using predictions
      await useMLStore.getState().predictZoneRisk({
        zone: resolvedZone,
        junction: diversionLocation,
        event_type: mlPayload.event_type,
        priority: mlPayload.priority,
        severity: predRes.predicted_impact,
        escalation_risk: escalationRes.probability,
        historical_frequency: 4, // simulation context default
        recovery_time: recoveryRes.duration_minutes
      });

      // 5. Trigger Resource Allocation Optimization automatically!
      const optPlan = await optimizeAllocation({
        impact_level: predRes.predicted_impact,
        confidence: predRes.confidence,
        event_type: mlPayload.event_type,
        event_duration: Number(eventDuration),
        event_attendance: Number(eventAttendance),
        nearby_hospitals: Number(nearbyHospitals),
        junction_criticality: Number(junctionCriticality),
        zone: resolvedZone,
        junction_id: diversionLocation,
        escalation_risk_prob: escalationRes.probability,
        recovery_time_mins: recoveryRes.duration_minutes
      });


      // 6. Trigger Diversion Route Planner automatically!
      await generateDiversions({
        event_location: diversionLocation,
        predicted_impact_level: predRes.predicted_impact,
        deployment_score: optPlan.deployment_score,
        event_severity: intensity.charAt(0).toUpperCase() + intensity.slice(1),
        event_attendance: Number(eventAttendance),
      });

      // 6. Trigger Do Nothing / No Intervention Simulator automatically!
      const riskScoreMap: Record<string, number> = {
        Low: 25.0,
        Medium: 50.0,
        High: 75.0,
        Critical: 90.0,
      };
      const currentRisk = riskScoreMap[predRes.predicted_impact] || 50.0;
      await simulateNoIntervention(diversionLocation, currentRisk);

      // 7. Trigger Crowd Movement Predictor (Feature 15) automatically for crowd events!
      if (["festival", "political_rally", "sports_event"].includes(eventType)) {
        await fetchSecondaryHotspots({
          latitude: lat,
          longitude: lng,
          event_type: eventType,
          start_datetime: new Date(startDatetime).toISOString(),
        });
      } else {
        clearSecondaryHotspots();
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAllOperations = async () => {
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
    <div className="flex flex-col gap-4 p-5 h-full overflow-hidden bg-[#080808]">
      {/* Title & Reset Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-950/40 border border-white/5 p-4 rounded-xl shadow-lg">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Event Simulation Hub <Sparkles className="h-4 w-4 text-blue-400" />
          </h1>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Proactively simulate scenarios and view AI predictions and recommendations inside a single viewport.
          </p>
        </div>
        
        {/* Reset Button */}
        <div>
          <button
            type="button"
            onClick={resetAllOperations}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-slate-300 transition hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Board</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 min-h-0 flex-1 overflow-hidden">
        {/* Left Form Panel */}
        <div className="col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3.5 shadow-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
              <Play className="h-3.5 w-3.5 text-blue-500 fill-blue-500" /> Configure Simulation Scenario
            </h3>

            {/* Event Cause */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400">Event Scenario Cause</label>
              <select
                value={eventType}
                onChange={(e) => {
                  const val = e.target.value;
                  setEventType(val);
                  if (val === "political_rally" || val === "water_logging") {
                    setRequiresRoadClosure(true);
                  } else {
                    setRequiresRoadClosure(false);
                  }
                }}
                className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
              >
                {EVENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-panel text-slate-200">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Area selection */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400">Target Geolocation</label>
              <div className="flex gap-2">
                <select
                  value={targetType}
                  onChange={(e) => handleTargetTypeChange(e.target.value as any)}
                  className="w-1/3 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
                >
                  <option value="zone" className="bg-panel">Zone</option>
                  <option value="junction" className="bg-panel">Junction</option>
                </select>

                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-2/3 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
                >
                  {targetType === "zone" ? (
                    ZONE_OPTIONS.map((z) => (
                      <option key={z} value={z} className="bg-panel text-slate-200">{z}</option>
                    ))
                  ) : (
                    junctions.map((j) => (
                      <option key={j.id} value={j.id} className="bg-panel text-slate-200">{j.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Intensity Level */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400">Simulation Intensity</label>
              <div className="flex gap-4 bg-white/5 border border-white/10 rounded-md px-3 py-1.5 justify-around">
                {["low", "medium", "high"].map((level) => (
                  <label key={level} className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="intensity"
                      value={level}
                      checked={intensity === level}
                      onChange={() => setIntensity(level as any)}
                      className="accent-blue-500"
                    />
                    <span className="capitalize text-xs">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Road Closure */}
            <div className="flex items-center gap-2 py-0.5">
              <input
                type="checkbox"
                id="road-closure"
                checked={requiresRoadClosure}
                onChange={(e) => setRequiresRoadClosure(e.target.checked)}
                className="rounded accent-blue-500 h-3.5 w-3.5 bg-white/5 border-white/10 cursor-pointer"
              />
              <label htmlFor="road-closure" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                Requires absolute road closure
              </label>
            </div>

            {/* Optimization Parameters Override Panel */}
            <div className="border-t border-white/10 pt-2.5 mt-0.5">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Operational Optimizer Inputs
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Attendance */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400">Crowd Size</label>
                  <input
                    type="number"
                    min="0"
                    value={eventAttendance}
                    onChange={(e) => setEventAttendance(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
                {/* Duration */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400">Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={eventDuration}
                    onChange={(e) => setEventDuration(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
                {/* Nearby Hospitals */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400">Nearby Hospitals</label>
                  <input
                    type="number"
                    min="0"
                    value={nearbyHospitals}
                    onChange={(e) => setNearbyHospitals(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
                {/* Junction Criticality */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400">Criticality (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={junctionCriticality}
                    onChange={(e) => setJunctionCriticality(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Start DateTime */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400">Simulation Start Time</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
                />
              </div>
            </div>

            {/* Run Button */}
            <button
              type="button"
              disabled={isSubmitting || isSimulating || !targetId}
              onClick={handleRun}
              className="mt-1 w-full rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
            >
              {isSubmitting ? "Processing..." : "Inject Simulated Event"}
            </button>
          </div>

          {/* Ticker Auto-Play Feed Panel */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg mt-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> Live Incident Simulator Feed
              </span>
              <span className={`h-2 w-2 rounded-full ${isAutoPlaying ? "bg-emerald-500 animate-ping" : "bg-slate-600"}`} />
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Enable the automated feed to simulate real-time traffic incidents arriving on a 15-second loop. This will inject live data, recalculate ML congestion models, and automatically generate commands and notifications.
            </p>
            <button
              type="button"
              onClick={() => setIsAutoPlaying(prev => !prev)}
              className={`w-full rounded-md py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isAutoPlaying 
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {isAutoPlaying ? "Pause Incident Feed" : "Activate Incident Feed"}
            </button>
          </div>
        </div>

        {/* Right Tabbed Panel */}
        <div className="col-span-7 flex flex-col gap-3 h-full overflow-hidden">
          {/* Tabs header */}
          <div className="flex gap-2 bg-white/5 border border-white/10 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setActiveRightTab("predictive")}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-all ${
                activeRightTab === "predictive"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Predictive Analytics
            </button>
            <button
              onClick={() => setActiveRightTab("inaction")}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-all ${
                activeRightTab === "inaction"
                  ? "bg-red-950/40 text-red-400 border border-red-500/20 shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Cost of Inaction
            </button>
          </div>

          {/* Tab content panel */}
          <div className="flex-1 min-h-0">
            {activeRightTab === "predictive" ? <MLPredictionPanel /> : <NoInterventionTimeline />}
          </div>

          {/* Measurable Impact Summary Card */}
          {plan && noInterventionData && (
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 flex flex-col gap-2 shadow-[0_0_15px_rgba(59,130,246,0.1)] shrink-0 border-l-4 border-l-blue-500 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 animate-pulse">
                  <Zap className="h-3.5 w-3.5 text-blue-400" /> Measurable Impact Summary
                </span>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-black">
                  ROI: +{Math.round(((noInterventionData.total_economic_loss_inr - plan.estimated_operational_cost) / plan.estimated_operational_cost) * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-1 border-t border-blue-500/10 pt-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 font-medium">Cost of Inaction</span>
                  <span className="font-black text-red-400 text-sm mt-0.5">
                    ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(noInterventionData.total_economic_loss_inr)}
                  </span>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-4">
                  <span className="text-[9px] text-slate-400 font-medium">Deployment Cost</span>
                  <span className="font-black text-amber-400 text-sm mt-0.5">
                    ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(plan.estimated_operational_cost)}
                  </span>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-4">
                  <span className="text-[9px] text-slate-400 font-medium">Net Savings (Saved Waste)</span>
                  <span className="font-black text-emerald-400 text-sm mt-0.5">
                    ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(noInterventionData.total_economic_loss_inr - plan.estimated_operational_cost)}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal mt-1 italic">
                By investing ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(plan.estimated_operational_cost)} in proactive resource deployment, the command center prevents a projected economic loss of ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(noInterventionData.total_economic_loss_inr)}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

