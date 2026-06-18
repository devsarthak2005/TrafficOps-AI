"use client";

import { useMapStore } from "@/store/useMapStore";
import { SimulatorPanel } from "@/components/simulator/SimulatorPanel";
import { ActiveSimulationBadge } from "@/components/simulator/ActiveSimulationBadge";
import AlertsPanel from "@/components/alerts/AlertsPanel";
import CorridorPlannerPanel from "@/components/corridor/CorridorPlannerPanel";
import { HospitalStatusList } from "@/components/hospitals/HospitalStatusList";

export function Sidebar() {
  const sidebarOpen = useMapStore((state) => state.sidebarOpen);

  return (
    <aside
      className={`h-full min-h-0 overflow-hidden border-r border-white/10 bg-panel transition-[width,opacity] duration-300 ease-in-out ${sidebarOpen ? "w-[320px] opacity-100" : "w-0 opacity-0"}`}
      aria-hidden={!sidebarOpen}
    >
      <div className="flex h-full min-w-[320px] flex-col overflow-y-auto pb-4">
        <ActiveSimulationBadge />
        <div className="flex flex-col gap-4 p-4">
          
          {/* Predictive Alerts */}
          <section className="flex flex-col border-b border-white/10 pb-4">
            <AlertsPanel />
          </section>

          {/* Emergency Corridors */}
          <section className="flex flex-col border-b border-white/10 pb-4">
            <CorridorPlannerPanel />
          </section>

          {/* Hospital Reachability Monitor */}
          <section className="flex flex-col border-b border-white/10 pb-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Hospitals Reachability
            </h2>
            <HospitalStatusList />
          </section>

          {/* Zone Status Section */}
          <section className="flex flex-col border-b border-white/10 pb-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Zone Status
            </h2>
            <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              No data yet
            </div>
          </section>
          
          <section className="flex flex-col">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
              Active Simulations
            </h2>
            <SimulatorPanel />
          </section>
        </div>
      </div>
    </aside>
  );
}
