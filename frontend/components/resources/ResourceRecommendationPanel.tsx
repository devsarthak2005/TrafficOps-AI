"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useMapStore } from "@/store/useMapStore";
import { getJunctionResources } from "@/lib/api/resources";
import { getIncidents } from "@/lib/api/incidents";
import type { ResourceRecommendation } from "@/types/resource";
import type { Incident } from "@/types/incident";
import { getStatusBadgeClass } from "@/lib/statusColors";
import { 
  X, 
  Shield, 
  TrafficCone, 
  Car, 
  Ambulance, 
  Route, 
  AlertTriangle,
  Loader2,
  Sparkles,
  Calendar,
  Cloud
} from "lucide-react";

function getSeverityBadgeClass(severity: string) {
  const s = severity.toLowerCase();
  if (s === "low") return "bg-green-500/10 text-green-400 border-green-500/20";
  if (s === "moderate") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  if (s === "high") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (s === "critical") return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export default function ResourceRecommendationPanel() {
  const resourceJunctionId = useAppStore((state) => state.resourceJunctionId);
  const resourcePanelOpen = useAppStore((state) => state.resourcePanelOpen);
  const closeResourcePanel = useAppStore((state) => state.closeResourcePanel);
  const openSimilarPanel = useAppStore((state) => state.openSimilarPanel);
  const junctions = useMapStore((state) => state.junctions);

  const [recommendation, setRecommendation] = useState<ResourceRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"resources" | "history">("resources");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);

  // Find the junction name from static junctions metadata
  const junctionName = junctions.find((j) => j.id === resourceJunctionId)?.name || "Unknown Junction";

  useEffect(() => {
    if (!resourceJunctionId || !resourcePanelOpen) {
      // Clear data when panel closed
      setRecommendation(null);
      setIncidents([]);
      setActiveTab("resources");
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

    // Fetch history
    setIncidentsLoading(true);
    getIncidents({ junction_id: resourceJunctionId })
      .then((data) => {
        setIncidents(data);
      })
      .catch((err) => {
        console.error("Failed to load junction incidents:", err);
      })
      .finally(() => {
        setIncidentsLoading(false);
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
            <div className="flex flex-col gap-5">
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

              {/* Tab Selector */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-900">
                <button
                  type="button"
                  onClick={() => setActiveTab("resources")}
                  className={`flex-1 rounded-md py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === "resources"
                      ? "bg-slate-800 text-white shadow-md border border-slate-700/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Resources
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 rounded-md py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === "history"
                      ? "bg-slate-800 text-white shadow-md border border-slate-700/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Junction History ({incidents.length})
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "resources" ? (
                <div className="flex flex-col gap-5 mt-1">
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
                <div className="flex flex-col gap-3 mt-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Recent Incidents
                  </h3>
                  {incidentsLoading ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      <span className="text-xs">Loading incident logs...</span>
                    </div>
                  ) : incidents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800/80 bg-slate-900/10 py-6 px-4 text-center">
                      <p className="text-xs text-slate-500">No historical incidents recorded at this junction.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {incidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/20 p-3.5 hover:bg-slate-900/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold capitalize text-white">
                              {inc.incident_type}
                            </span>
                            <span className={`rounded-full border px-1.5 py-0.25 text-[8px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(inc.severity)}`}>
                              {inc.severity}
                            </span>
                          </div>
                          
                          <p className="text-[11px] leading-relaxed text-slate-300">
                            {inc.description || "No description provided."}
                          </p>

                          <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-800/50">
                            <div className="flex gap-3 text-[9px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5 text-slate-600" />
                                {new Date(inc.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                              <span className="flex items-center gap-1 capitalize">
                                <Cloud className="h-2.5 w-2.5 text-slate-600" />
                                {inc.weather}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => openSimilarPanel(inc.id)}
                              className="flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95"
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              Find Similar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
