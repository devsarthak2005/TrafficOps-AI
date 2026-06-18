"use client";

import { useEffect, useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import { useCorridorStore } from "@/store/useCorridorStore";
import { getHospitals, planCorridor } from "@/lib/api/corridors";
import type { Hospital } from "@/types/corridor";
import { 
  Hospital as HospitalIcon, 
  MapPin, 
  Route, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  Trash2
} from "lucide-react";

export default function CorridorPlannerPanel() {
  const junctions = useMapStore((state) => state.junctions);
  const activePlan = useCorridorStore((state) => state.activePlan);
  const activeVariant = useCorridorStore((state) => state.activeVariant);
  const setActivePlan = useCorridorStore((state) => state.setActivePlan);
  const setActiveVariant = useCorridorStore((state) => state.setActiveVariant);
  const clearPlan = useCorridorStore((state) => state.clearPlan);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedJunctionId, setSelectedJunctionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load hospitals on mount
  useEffect(() => {
    getHospitals()
      .then((data) => {
        setHospitals(data);
        if (data.length > 0) {
          setSelectedHospitalId(data[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load hospitals:", err);
        setError("Failed to load hospital locations.");
      });
  }, []);

  // Pre-fill junction if the map has a selected junction
  const mapSelectedJunctionId = useMapStore((state) => state.selectedJunctionId);
  useEffect(() => {
    if (mapSelectedJunctionId) {
      setSelectedJunctionId(mapSelectedJunctionId);
    }
  }, [mapSelectedJunctionId]);

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospitalId || !selectedJunctionId) return;

    setLoading(true);
    setError(null);

    try {
      const plan = await planCorridor({
        hospital_id: selectedHospitalId,
        incident_junction_id: selectedJunctionId
      });
      setActivePlan(plan);
    } catch (err) {
      console.error("Failed to plan corridor:", err);
      setError("Routing request failed. Fallback routes could not be mapped.");
    } finally {
      setLoading(false);
    }
  };

  const activeRoute = activePlan?.routes[activeVariant];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Route className="h-4 w-4 text-slate-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Emergency Corridors
        </h3>
      </div>

      {/* Plan Form */}
      <form onSubmit={handlePlan} className="flex flex-col gap-3">
        {/* Hospital Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <HospitalIcon className="h-3 w-3" />
            Hospital Origin
          </label>
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-200 focus:border-slate-700 focus:outline-none"
          >
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Junction Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Incident Destination
          </label>
          <select
            value={selectedJunctionId}
            onChange={(e) => setSelectedJunctionId(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-200 focus:border-slate-700 focus:outline-none"
          >
            <option value="" disabled>Select target junction</option>
            {junctions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedHospitalId || !selectedJunctionId}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 hover:shadow-lg hover:shadow-emerald-950/20 active:scale-[0.98] transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Computing routes...
            </>
          ) : (
            "Plan Corridor"
          )}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-950 bg-red-950/20 p-3 text-center">
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* Active Plan Results */}
      {activePlan && activeRoute && (
        <div className="flex flex-col gap-4 border-t border-slate-800/80 pt-4">
          {/* Approximate/Fallback Banner */}
          {activePlan.is_approximate && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2.5 text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-[10px] leading-normal font-medium text-yellow-200">
                OSRM Routing offline. Straight-line approximation is active.
              </p>
            </div>
          )}

          {/* Toggle Variants */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-900">
            {(["protected", "fastest", "safest"] as const).map((variantId) => (
              <button
                key={variantId}
                type="button"
                onClick={() => setActiveVariant(variantId)}
                className={`flex-1 rounded-md py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
                  activeVariant === variantId
                    ? "bg-slate-800 text-white shadow-md border border-slate-700/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {variantId}
              </button>
            ))}
          </div>

          {/* Active Variant Info */}
          <div className="rounded-xl bg-slate-900/40 p-4 border border-slate-800/80 flex flex-col gap-3 shadow-md">
            {/* Header: Label + Duration */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                {activeRoute.label}
              </span>
              <div className="flex items-center gap-1 text-slate-300 font-semibold text-xs">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{activeRoute.duration_minutes} min</span>
              </div>
            </div>

            {/* Note / Warnings */}
            {activeVariant === "safest" && activeRoute.note && (
              <div className="text-[11px] leading-normal text-amber-300 flex items-center gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{activeRoute.note}</span>
              </div>
            )}

            {activeVariant === "protected" && activeRoute.resource_note && (
              <div className="text-[11px] leading-normal text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>{activeRoute.resource_note}</span>
              </div>
            )}
          </div>

          {/* Clear Button */}
          <button
            type="button"
            onClick={clearPlan}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/20 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Corridor Plan
          </button>
        </div>
      )}
    </div>
  );
}
