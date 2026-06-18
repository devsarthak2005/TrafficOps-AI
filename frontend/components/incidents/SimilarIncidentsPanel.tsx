"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getSimilarIncidents } from "@/lib/api/similar_incidents";
import { getIncident } from "@/lib/api/incidents";
import type { SimilarIncidentResult } from "@/types/similar_incident";
import type { Incident } from "@/types/incident";
import { SimilarIncidentCard } from "./SimilarIncidentCard";
import { X, Loader2, Sparkles, AlertCircle, Calendar, MapPin, Cloud } from "lucide-react";

export default function SimilarIncidentsPanel() {
  const similarIncidentId = useAppStore((state) => state.similarIncidentId);
  const similarPanelOpen = useAppStore((state) => state.similarPanelOpen);
  const closeSimilarPanel = useAppStore((state) => state.closeSimilarPanel);

  const [queryIncident, setQueryIncident] = useState<Incident | null>(null);
  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncidentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!similarIncidentId || !similarPanelOpen) {
      setQueryIncident(null);
      setSimilarIncidents([]);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getIncident(similarIncidentId),
      getSimilarIncidents(similarIncidentId, 5)
    ])
      .then(([incidentData, similarityData]) => {
        setQueryIncident(incidentData);
        setSimilarIncidents(similarityData.results);
      })
      .catch((err) => {
        console.error("Failed to load similar incidents:", err);
        setError("Failed to load similar incidents. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [similarIncidentId, similarPanelOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && similarPanelOpen) {
        closeSimilarPanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [similarPanelOpen, closeSimilarPanel]);

  return (
    <>
      {/* Backdrop Dim overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          similarPanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSimilarPanel}
      />

      {/* Slide-over Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[380px] flex-col border-l border-slate-800 bg-elevated shadow-2xl transition-transform duration-300 ease-in-out ${
          similarPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Pattern Matcher
            </span>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Similar Incidents
            </h2>
          </div>
          <button
            onClick={closeSimilarPanel}
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
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-slate-400">Comparing network history...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : queryIncident ? (
            <div className="flex flex-col gap-5">
              {/* Query Incident Context Block */}
              <div className="flex flex-col gap-2.5 rounded-xl bg-slate-900/50 p-4 border border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Target Incident Context
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold capitalize text-white">
                    {queryIncident.incident_type}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/10 text-white">
                    {queryIncident.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  "{queryIncident.description || "No description provided."}"
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    <span>{queryIncident.junction_id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    <span>{new Date(queryIncident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Cloud className="h-3 w-3 text-slate-500" />
                    <span className="capitalize">{queryIncident.weather}</span>
                  </div>
                </div>
              </div>

              {/* Similar Incidents Section */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Historical Matches (Top 5)
                </h3>
                {similarIncidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/10 py-8 px-4 text-center">
                    <AlertCircle className="h-5 w-5 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      No matches found
                    </span>
                    <p className="text-[10px] text-slate-500 max-w-[200px]">
                      No other incidents found in the historical log.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {similarIncidents.map((result) => (
                      <SimilarIncidentCard key={result.incident_id} result={result} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-slate-500">No incident selected</div>
          )}
        </div>
      </div>
    </>
  );
}
