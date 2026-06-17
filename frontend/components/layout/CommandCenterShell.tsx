"use client";

import { useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { TrafficPulseBar } from "@/components/layout/TrafficPulseBar";
import { useMapStore } from "@/store/useMapStore";
import { useSimulationStore } from "@/store/useSimulationStore";
import ResourceRecommendationPanel from "@/components/resources/ResourceRecommendationPanel";

// Dynamically import MapView to disable SSR for Leaflet
const MapView = dynamic(() => import("@/components/map/MapView").then(mod => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 items-center justify-center bg-base p-6 text-slate-400">
      Loading map...
    </div>
  ),
});

export function CommandCenterShell() {
  const sidebarOpen = useMapStore((state) => state.sidebarOpen);
  const shellColumns = useMemo(
    () =>
      sidebarOpen
        ? "grid-cols-[320px_minmax(0,1fr)]"
        : "grid-cols-[0px_minmax(0,1fr)]",
    [sidebarOpen]
  );

  const fetchActiveSimulations = useSimulationStore((state) => state.fetchActiveSimulations);

  // Poll for active simulations
  useEffect(() => {
    fetchActiveSimulations(); // initial fetch
    const interval = window.setInterval(() => {
      fetchActiveSimulations();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [fetchActiveSimulations]);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-base text-white">
      <TopStatusBar />
      <TrafficPulseBar />
      <div
        className={`grid flex-1 min-h-0 overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out ${shellColumns}`}
      >
        <Sidebar />
        <section className="min-h-0 overflow-hidden bg-base">
          <MapView />
        </section>
      </div>
      <ResourceRecommendationPanel />
    </main>
  );
}
