"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useMapStore } from "@/store/useMapStore";
import { useMLStore } from "@/store/useMLStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { useDiversionStore } from "@/store/useDiversionStore";
import { MLPredictionPanel } from "./MLPredictionPanel";
import { NoInterventionTimeline } from "./NoInterventionTimeline";
import { Play, Sparkles, AlertTriangle, ArrowRight, ShieldCheck, CheckSquare, Calendar } from "lucide-react";

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
  const activeSimulations = useSimulationStore((state) => state.activeSimulations);
  const junctions = useMapStore((state) => state.junctions);
  const isSimulating = useSimulationStore((state) => state.isSimulating);
  const predictImpact = useMLStore((state) => state.predictImpact);
  const simulateNoIntervention = useMLStore((state) => state.simulateNoIntervention);
  const fetchSecondaryHotspots = useMLStore((state) => state.fetchSecondaryHotspots);
  const clearSecondaryHotspots = useMLStore((state) => state.clearSecondaryHotspots);
  const prediction = useMLStore((state) => state.prediction);
  const optimizeAllocation = useOperationsStore((state) => state.optimizeAllocation);
  const generateDiversions = useDiversionStore((state) => state.generateDiversions);
  const clearDiversions = useDiversionStore((state) => state.clearDiversions);

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

      // 4. Trigger Resource Allocation Optimization automatically!
      const optPlan = await optimizeAllocation({
        impact_level: predRes.predicted_impact,
        confidence: predRes.confidence,
        event_type: mlPayload.event_type,
        event_duration: Number(eventDuration),
        event_attendance: Number(eventAttendance),
        nearby_hospitals: Number(nearbyHospitals),
        junction_criticality: Number(junctionCriticality),
        zone: resolvedZone,
      });

      // 5. Trigger Diversion Route Planner automatically!
      const zoneToJuncMap: Record<string, string> = {
        North: "hebbal-flyover",
        East: "kr-puram",
        Central: "mg-road",
        South: "silk-board"
      };
      
      const diversionLocation = targetType === "junction"
        ? targetId
        : (zoneToJuncMap[targetId] || "silk-board");

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

  return (
    <div className="flex flex-col gap-4 p-5 h-full overflow-hidden bg-[#080808]">
      {/* Title */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          Event Simulation Hub <Sparkles className="h-4 w-4 text-blue-400" />
        </h1>
        <p className="text-slate-400 text-[11px] mt-0.5">
          Proactively simulate scenarios and view AI predictions and recommendations inside a single viewport.
        </p>
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
        </div>
      </div>
    </div>
  );
}

