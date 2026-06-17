"use client";

import { useSimulationStore } from "@/store/useSimulationStore";
import { AlertTriangle, Square } from "lucide-react";

export function ActiveSimulationBadge() {
  const activeSimulations = useSimulationStore((state) => state.activeSimulations);
  const stopSimulation = useSimulationStore((state) => state.stopSimulation);

  if (activeSimulations.length === 0) return null;

  const sim = activeSimulations[0];
  const title = `${sim.event_type.replace("_", " ")} @ ${sim.target_id}`;

  return (
    <div className="mx-4 mt-4 flex items-center justify-between rounded-md bg-amber-500/20 border border-amber-500/50 px-3 py-2 text-amber-500">
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Simulation Active</span>
          <span className="text-sm font-medium text-amber-100 capitalize">{title}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => stopSimulation(sim.simulation_id)}
        className="flex h-7 items-center justify-center gap-1.5 rounded bg-amber-500/20 px-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30 hover:text-amber-100"
      >
        <Square className="h-3 w-3 fill-current" /> Stop
      </button>
    </div>
  );
}
