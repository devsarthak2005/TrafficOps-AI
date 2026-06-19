"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMapStore } from "@/store/useMapStore";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useLayersStore } from "@/store/useLayersStore";
import { TopStatusBar } from "@/components/layout/TopStatusBar";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { EventSimulatorView } from "@/components/simulator/EventSimulatorView";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { AIInsightsView } from "@/components/ml/AIInsightsView";
import { AlertsCenterView } from "@/components/alerts/AlertsCenterView";
import CorridorPlannerPanel from "@/components/corridor/CorridorPlannerPanel";
import { DeploymentPlanCard } from "@/components/dashboard/DeploymentPlanCard";
import { DiversionPlannerCard } from "@/components/simulator/DiversionPlannerCard";
import ResourceRecommendationPanel from "@/components/resources/ResourceRecommendationPanel";
import SimilarIncidentsPanel from "@/components/incidents/SimilarIncidentsPanel";
import { Layers, Eye, EyeOff, Navigation, ShieldCheck } from "lucide-react";
import ReplayHistoryPanel from "@/components/replay/ReplayHistoryPanel";
import ReplayView from "@/components/replay/ReplayView";

// Dynamically import MapView to disable SSR for Leaflet
const MapView = dynamic(
  () => import("@/components/map/MapView").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#0a0a0a] p-6 text-slate-400 font-mono text-xs">
        Loading spatial environment...
      </div>
    ),
  }
);

export function CommandCenterShell() {
  const activeTab = useMapStore((state) => state.activeTab);
  const [corridorSubTab, setCorridorSubTab] = useState<"corridor" | "deployment" | "diversion">("corridor");
  const mapInstance = useMapStore((state) => state.mapInstance);
  const fetchActiveSimulations = useSimulationStore((state) => state.fetchActiveSimulations);

  // Layers Toggles
  const { showHeatmap, showJunctions, showCorridors, toggleLayer } = useLayersStore();

  // Poll for active simulations
  useEffect(() => {
    fetchActiveSimulations();
    const interval = window.setInterval(() => {
      fetchActiveSimulations();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [fetchActiveSimulations]);

  // Leaflet InvalidateSize Hack to prevent grey zones on viewport switch
  useEffect(() => {
    if (mapInstance && (activeTab === "map" || activeTab === "corridors" || activeTab === "replay")) {
      const timer = setTimeout(() => {
        mapInstance.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, mapInstance]);

  // Quick Map Fly-to helper for judges
  const flyToJunction = (lat: number, lng: number, zoom = 14) => {
    if (mapInstance) {
      mapInstance.flyTo([lat, lng], zoom, { animate: true, duration: 1.5 });
    }
  };

  const isMapTabActive = activeTab === "map" || activeTab === "corridors" || activeTab === "replay";

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#080808] text-white">
      {/* Top Status & Navigation Header */}
      <TopStatusBar />

      {/* Primary Workspace container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden relative">
        
        {/* Fullscreen Map (mounted globally at all times) */}
        <div className={`h-full w-full transition-all duration-300 ${isMapTabActive ? "opacity-100 visible z-0" : "opacity-0 invisible -z-50 pointer-events-none absolute"}`}>
          <MapView />
        </div>

        {/* Live Map Overlay Controls */}
        {activeTab === "map" && (
          <div className="absolute top-6 right-6 z-10 flex flex-col gap-4 max-w-xs animate-fadeIn">
            {/* Layers Toggle Card */}
            <div className="rounded-xl border border-white/10 bg-panel/90 p-4 backdrop-blur-md shadow-2xl flex flex-col gap-3 w-56">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-400" /> Layer Controllers
              </h3>
              
              <div className="flex flex-col gap-2">
                {[
                  { id: "showHeatmap" as const, label: "Congestion Heatmap", state: showHeatmap },
                  { id: "showJunctions" as const, label: "Junction Indicators", state: showJunctions },
                  { id: "showCorridors" as const, label: "Hospital Corridors", state: showCorridors },
                ].map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className="flex items-center justify-between text-xs text-slate-300 hover:text-white py-1 transition"
                  >
                    <span>{layer.label}</span>
                    {layer.state ? (
                      <Eye className="h-4 w-4 text-blue-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Fly-To Viewports */}
            <div className="rounded-xl border border-white/10 bg-panel/90 p-4 backdrop-blur-md shadow-2xl flex flex-col gap-2 w-56">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-blue-400" /> Fly-to Viewports
              </h3>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => flyToJunction(12.9176, 77.6246, 14.5)}
                  className="px-2.5 py-1.5 rounded bg-white/5 border border-white/5 text-[11px] text-slate-300 hover:bg-white/10 text-left font-semibold"
                >
                  Silk Board Junction
                </button>
                <button
                  onClick={() => flyToJunction(12.9226, 77.6174, 14.5)}
                  className="px-2.5 py-1.5 rounded bg-white/5 border border-white/5 text-[11px] text-slate-300 hover:bg-white/10 text-left font-semibold"
                >
                  Central Zone Hub
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Corridors Overlay Panel */}
        {activeTab === "corridors" && (
          <div className="absolute top-6 left-6 z-10 bg-panel/95 border border-white/10 p-5 rounded-xl backdrop-blur-md shadow-2xl w-[360px] max-h-[calc(100vh-120px)] overflow-y-auto animate-fadeIn flex flex-col gap-4">
            {/* Sticky Sub-Tab Navigation Header */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-900 w-full shrink-0 sticky top-0 z-10">
              {[
                { id: "corridor" as const, label: "Corridor" },
                { id: "deployment" as const, label: "Deployment" },
                { id: "diversion" as const, label: "Diversion" },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setCorridorSubTab(sub.id)}
                  className={`flex-1 rounded-md py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
                    corridorSubTab === sub.id
                      ? "bg-slate-800 text-white shadow-md border border-slate-700/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Sub-Tab Content Area */}
            <div className="flex-1 min-h-0">
              {corridorSubTab === "corridor" && <CorridorPlannerPanel />}
              {corridorSubTab === "deployment" && <DeploymentPlanCard />}
              {corridorSubTab === "diversion" && <DiversionPlannerCard />}
            </div>
          </div>
        )}

        {/* Historical Replay Overlay Panels */}
        {activeTab === "replay" && (
          <>
            {/* Left Panel: History list */}
            <div className="absolute top-6 left-6 z-10 w-[340px] h-[calc(100vh-120px)] animate-fadeIn">
              <ReplayHistoryPanel />
            </div>

            {/* Right Panel: Audit Report & Playback controls */}
            <div className="absolute top-6 right-6 z-10 w-[440px] h-[calc(100vh-120px)] animate-fadeIn">
              <ReplayView />
            </div>
          </>
        )}

        {/* Static Content Pages overlays */}
        {!isMapTabActive && (
          <div className="absolute inset-0 h-full w-full bg-[#080808] z-10">
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "simulator" && <EventSimulatorView />}
            {activeTab === "analytics" && <AnalyticsView />}
            {activeTab === "ml" && <AIInsightsView />}
            {activeTab === "alerts" && <AlertsCenterView />}
          </div>
        )}

      </div>

      {/* Global Slide-over panel overlays */}
      <ResourceRecommendationPanel />
      <SimilarIncidentsPanel />
    </main>
  );
}
