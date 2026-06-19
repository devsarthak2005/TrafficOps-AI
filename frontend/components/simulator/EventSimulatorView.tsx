"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useMapStore } from "@/store/useMapStore";
import { useMLStore } from "@/store/useMLStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { MLPredictionPanel } from "./MLPredictionPanel";
import { DeploymentPlanCard } from "../dashboard/DeploymentPlanCard";
import { Play, Sparkles, AlertTriangle, ArrowRight, ShieldCheck, CheckSquare, Calendar } from "lucide-react";

const EVENT_OPTIONS = [
  { value: "festival", label: "Festival" },
  { value: "political_rally", label: "Political Rally" },
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
  const prediction = useMLStore((state) => state.prediction);
  const optimizeAllocation = useOperationsStore((state) => state.optimizeAllocation);

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
        accident: "accident",
        breakdown: "vehicle_breakdown",
        construction: "construction",
        water_logging: "water_logging",
      };

      const mlPayload = {
        event_cause: causeMap[eventType] || "others",
        event_type: ["festival", "political_rally"].includes(eventType) ? ("planned" as const) : ("unplanned" as const),
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
      await optimizeAllocation({
        impact_level: predRes.predicted_impact,
        confidence: predRes.confidence,
        event_type: mlPayload.event_type,
        event_duration: Number(eventDuration),
        event_attendance: Number(eventAttendance),
        nearby_hospitals: Number(nearbyHospitals),
        junction_criticality: Number(junctionCriticality),
        zone: resolvedZone,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-[#080808]">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Event Simulation Hub <Sparkles className="h-5 w-5 text-blue-400" />
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">
          Proactively simulate high-congestion events and model AI mitigation strategies.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
        {/* Left Form Panel */}
        <div className="col-span-5 flex flex-col gap-6">
          <div className="rounded-xl border border-white/5 bg-panel p-5 flex flex-col gap-4 shadow-lg">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-500 fill-blue-500" /> Configure Simulation Scenario
            </h3>

            {/* Event Cause */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Event Scenario Cause</label>
              <select
                value={eventType}
                onChange={(e) => {
                  const val = e.target.value;
                  setEventType(val);
                  // Auto check road closure for protests and rain
                  if (val === "political_rally" || val === "water_logging") {
                    setRequiresRoadClosure(true);
                  } else {
                    setRequiresRoadClosure(false);
                  }
                }}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
              >
                {EVENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-panel text-slate-200">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Area selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Target Geolocation</label>
              <div className="flex gap-2">
                <select
                  value={targetType}
                  onChange={(e) => handleTargetTypeChange(e.target.value as any)}
                  className="w-1/3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
                >
                  <option value="zone" className="bg-panel">Zone</option>
                  <option value="junction" className="bg-panel">Junction</option>
                </select>

                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-2/3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Simulation Intensity</label>
              <div className="flex gap-4 bg-white/5 border border-white/10 rounded-md px-3 py-2 justify-around">
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
                    <span className="capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Road Closure */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="road-closure"
                checked={requiresRoadClosure}
                onChange={(e) => setRequiresRoadClosure(e.target.checked)}
                className="rounded accent-blue-500 h-4 w-4 bg-white/5 border-white/10 cursor-pointer"
              />
              <label htmlFor="road-closure" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                Requires absolute road closure
              </label>
            </div>

            {/* Optimization Parameters Override Panel */}
            <div className="border-t border-white/10 pt-3 mt-1">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Operational Optimizer Inputs
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Attendance */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Crowd Size (Attendance)</label>
                  <input
                    type="number"
                    min="0"
                    value={eventAttendance}
                    onChange={(e) => setEventAttendance(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
                {/* Duration */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={eventDuration}
                    onChange={(e) => setEventDuration(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
                {/* Nearby Hospitals */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Nearby Hospitals</label>
                  <input
                    type="number"
                    min="0"
                    value={nearbyHospitals}
                    onChange={(e) => setNearbyHospitals(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
                {/* Junction Criticality */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Criticality (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={junctionCriticality}
                    onChange={(e) => setJunctionCriticality(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 text-xs outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Start DateTime */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Simulation Start Time</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-slate-200 outline-none transition focus:border-blue-500/50 text-xs"
                />
              </div>
            </div>

            {/* Run Button */}
            <button
              type="button"
              disabled={isSubmitting || isSimulating || !targetId}
              onClick={handleRun}
              className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2.5 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
            >
              {isSubmitting ? "Processing..." : "Inject Simulated Event"}
            </button>
          </div>

          {/* Timeline Replay Sequence */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demo Execution Replay Sequence</h3>
            
            <div className="relative border-l border-white/10 ml-3.5 pl-6 flex flex-col gap-4 py-1 text-xs">
              {/* Step 1 */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                  isSimulating ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-slate-500"
                }`}>
                  <CheckSquare className="h-2 w-2" />
                </div>
                <div>
                  <h4 className={`font-semibold ${isSimulating ? "text-blue-400" : "text-slate-400"}`}>1. Event Simulator Trigger</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    User configures and injects event metadata (cause, coordinates, road closures) into the pipeline.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                  prediction ? "bg-purple-600 border-purple-500 text-white" : "bg-white/5 border-white/10 text-slate-500"
                }`}>
                  <Sparkles className="h-2.5 w-2.5" />
                </div>
                <div>
                  <h4 className={`font-semibold ${prediction ? "text-purple-400" : "text-slate-400"}`}>2. Real-time AI Impact Forecasting</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    XGBoost model evaluates temporal/spatial indicators to predict congestion impact level and confidence score.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                  prediction ? "bg-amber-600 border-amber-500 text-white" : "bg-white/5 border-white/10 text-slate-500"
                }`}>
                  <ShieldCheck className="h-2.5 w-2.5" />
                </div>
                <div>
                  <h4 className={`font-semibold ${prediction ? "text-amber-400" : "text-slate-400"}`}>3. Operational Recommendation Engine</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Rule-based engine processes predicted class to calculate required patrol cars, officer deployment, and barricading.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                  isSimulating ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-white/5 border-white/10 text-slate-500"
                }`}>
                  <AlertTriangle className="h-2 w-2" />
                </div>
                <div>
                  <h4 className={`font-semibold ${isSimulating ? "text-red-400" : "text-slate-400"}`}>4. Proactive Alerting & Dispatch</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    Warning signals propagate to the dashboard alerts system, prompting corridor planning route clearance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Prediction Panel */}
        <div className="col-span-7 flex flex-col gap-6 overflow-y-auto pr-1">
          <MLPredictionPanel />
          <DeploymentPlanCard />
        </div>
      </div>
    </div>
  );
}
