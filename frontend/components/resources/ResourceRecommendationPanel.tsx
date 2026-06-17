"use client";

import { useEffect, useState, useTransition } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useMapStore } from "@/store/useMapStore";
import { getJunctionResources } from "@/lib/api/resources";
import type { ResourceRecommendation } from "@/types/resource";
import { getStatusBadgeClass } from "@/lib/statusColors";
import { 
  X, 
  Shield, 
  TrafficCone, 
  Car, 
  Ambulance, 
  Route, 
  AlertTriangle,
  Loader2 
} from "lucide-react";

export default function ResourceRecommendationPanel() {
  const resourceJunctionId = useAppStore((state) => state.resourceJunctionId);
  const resourcePanelOpen = useAppStore((state) => state.resourcePanelOpen);
  const closeResourcePanel = useAppStore((state) => state.closeResourcePanel);
  const junctions = useMapStore((state) => state.junctions);

  const [recommendation, setRecommendation] = useState<ResourceRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find the junction name from static junctions metadata
  const junctionName = junctions.find((j) => j.id === resourceJunctionId)?.name || "Unknown Junction";

  useEffect(() => {
    if (!resourceJunctionId || !resourcePanelOpen) {
      // Clear data when panel closed
      setRecommendation(null);
      return;
    }

    setLoading(true);
    setError(null);

    getJunctionResources(resourceJunctionId)
      .then((data) => {
        setRecommendation(data);
      })
      .catch((err) => {
        console.error("Failed to fetch resource recommendation:", err);
        setError("Failed to load resource recommendations. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [resourceJunctionId, resourcePanelOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && resourcePanelOpen) {
        closeResourcePanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resourcePanelOpen, closeResourcePanel]);

  const isHealthy = recommendation?.risk_category === "healthy";
  const isSimulated = recommendation?.is_simulated;

  return (
    <>
      {/* Backdrop Dim overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          resourcePanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeResourcePanel}
      />

      {/* Slide-over Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[380px] flex-col border-l border-slate-800 bg-elevated shadow-2xl transition-transform duration-300 ease-in-out ${
          resourcePanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Operations Center
            </span>
            <h2 className="text-lg font-bold tracking-tight text-white">
              {junctionName}
            </h2>
          </div>
          <button
            onClick={closeResourcePanel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium text-slate-400">Loading recommendations...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : recommendation ? (
            <div className="flex flex-col gap-6">
              {/* Status Header Block */}
              <div className="flex items-center justify-between rounded-xl bg-slate-900/50 p-4 border border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400">Junction Risk Tier</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${getStatusBadgeClass(
                    recommendation.risk_category
                  )}`}
                >
                  {recommendation.risk_category}
                </span>
              </div>

              {/* Simulation Banner */}
              {isSimulated && (
                <div className="flex gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-300">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider">Simulation Active</span>
                    <p className="text-[11px] leading-normal text-amber-200/95">
                      Operational deployment is escalated to reflect the active event simulation.
                    </p>
                  </div>
                </div>
              )}

              {/* Resource List */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Required Resources
                </h3>

                {/* Officers */}
                <div className="flex items-center justify-between rounded-xl bg-slate-900/30 p-3.5 border border-slate-800/60 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-5 w-5 ${isHealthy ? "text-slate-500" : "text-blue-400"}`} />
                    <span className={`text-sm font-medium ${isHealthy ? "text-slate-400" : "text-slate-200"}`}>
                      Officers
                    </span>
                  </div>
                  <span className={`text-base font-extrabold ${isHealthy ? "text-slate-500" : "text-white"}`}>
                    {recommendation.recommendation.officers}
                  </span>
                </div>

                {/* Barricades */}
                <div className="flex items-center justify-between rounded-xl bg-slate-900/30 p-3.5 border border-slate-800/60 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <TrafficCone className={`h-5 w-5 ${isHealthy ? "text-slate-500" : "text-orange-500"}`} />
                    <span className={`text-sm font-medium ${isHealthy ? "text-slate-400" : "text-slate-200"}`}>
                      Barricades
                    </span>
                  </div>
                  <span className={`text-base font-extrabold ${isHealthy ? "text-slate-500" : "text-white"}`}>
                    {recommendation.recommendation.barricades}
                  </span>
                </div>

                {/* Patrol Vehicles */}
                <div className="flex items-center justify-between rounded-xl bg-slate-900/30 p-3.5 border border-slate-800/60 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Car className={`h-5 w-5 ${isHealthy ? "text-slate-500" : "text-sky-400"}`} />
                    <span className={`text-sm font-medium ${isHealthy ? "text-slate-400" : "text-slate-200"}`}>
                      Patrol Vehicles
                    </span>
                  </div>
                  <span className={`text-base font-extrabold ${isHealthy ? "text-slate-500" : "text-white"}`}>
                    {recommendation.recommendation.patrol_vehicles}
                  </span>
                </div>

                {/* Ambulances */}
                <div className="flex items-center justify-between rounded-xl bg-slate-900/30 p-3.5 border border-slate-800/60 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Ambulance className={`h-5 w-5 ${isHealthy ? "text-slate-500" : "text-red-500"}`} />
                    <span className={`text-sm font-medium ${isHealthy ? "text-slate-400" : "text-slate-200"}`}>
                      Ambulances on Standby
                    </span>
                  </div>
                  <span className={`text-base font-extrabold ${isHealthy ? "text-slate-500" : "text-white"}`}>
                    {recommendation.recommendation.ambulances}
                  </span>
                </div>
              </div>

              {/* Diversion Routes Section */}
              <div className="flex flex-col gap-3 border-t border-slate-800/80 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Diversion Routing
                </h3>
                {recommendation.recommendation.diversion_routes.length === 0 ? (
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 bg-slate-900/20 rounded-xl p-3 border border-slate-800/40">
                    <Route className="h-4 w-4 shrink-0 text-slate-600" />
                    <span>No diversion routes required. Standard flow is optimal.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recommendation.recommendation.diversion_routes.map((route, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 rounded-xl bg-slate-900/30 p-3 border border-slate-800/60 text-xs text-slate-300"
                      >
                        <Route className={`h-4 w-4 shrink-0 mt-0.5 ${isHealthy ? "text-slate-600" : "text-emerald-500"}`} />
                        <span className="leading-relaxed">{route}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Healthy state reassurance line */}
              {isHealthy && (
                <div className="mt-4 border-t border-slate-800/80 pt-5 text-center">
                  <p className="text-xs text-slate-500 italic">
                    Standard patrol sufficient. No abnormal traffic triggers detected.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-slate-500">No data available</div>
          )}
        </div>
      </div>
    </>
  );
}
