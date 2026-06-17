"use client";

import { useState } from "react";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useMapStore } from "@/store/useMapStore";
import type { SimulationRequest } from "@/types/simulation";

const EVENT_OPTIONS = [
  { value: "festival", label: "Festival" },
  { value: "political_rally", label: "Political Rally" },
  { value: "accident", label: "Accident" },
  { value: "breakdown", label: "Breakdown" },
  { value: "construction", label: "Construction" },
  { value: "water_logging", label: "Water Logging" },
];

const ZONE_OPTIONS = ["North", "East", "Central", "South"];

export function SimulatorPanel() {
  const startSimulation = useSimulationStore((state) => state.startSimulation);
  const junctions = useMapStore((state) => state.junctions);
  const isSimulating = useSimulationStore((state) => state.isSimulating);

  const [eventType, setEventType] = useState<SimulationRequest["event_type"]>("festival");
  const [targetType, setTargetType] = useState<SimulationRequest["target_type"]>("zone");
  const [targetId, setTargetId] = useState<string>(ZONE_OPTIONS[0]);
  const [intensity, setIntensity] = useState<SimulationRequest["intensity"]>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If targetType changes, reset targetId to a valid option
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
      await startSimulation({
        event_type: eventType,
        target_type: targetType,
        target_id: targetId,
        intensity,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* Event Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Event Type</label>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as any)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 outline-none transition focus:border-blue-500/50"
        >
          {EVENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-panel text-slate-200">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Target Type & Target */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Target</label>
        <div className="flex gap-2">
          <select
            value={targetType}
            onChange={(e) => handleTargetTypeChange(e.target.value as any)}
            className="w-1/3 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 outline-none transition focus:border-blue-500/50"
          >
            <option value="zone" className="bg-panel">Zone</option>
            <option value="junction" className="bg-panel">Junction</option>
          </select>

          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-2/3 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 outline-none transition focus:border-blue-500/50"
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

      {/* Intensity */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-400">Intensity</label>
        <div className="flex gap-4">
          {["low", "medium", "high"].map((level) => (
            <label key={level} className="flex cursor-pointer items-center gap-1.5 text-slate-300 hover:text-white">
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

      <button
        type="button"
        disabled={isSubmitting || isSimulating || !targetId}
        onClick={handleRun}
        className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Starting..." : "Run Simulation"}
      </button>
    </div>
  );
}
