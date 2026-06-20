"use client";

import React from "react";
import { useMLStore } from "@/store/useMLStore";
import { Shield, ShieldAlert, CheckCircle, Info, HelpCircle } from "lucide-react";

export function MLPredictionPanel() {
  const { prediction, isPredicting, secondaryHotspots } = useMLStore();

  if (isPredicting) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center animate-pulse h-full flex flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
        <p className="text-slate-400 text-sm">AI evaluating event parameters & historical factors...</p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center h-full flex flex-col items-center justify-center">
        <HelpCircle className="h-8 w-8 text-slate-500 mb-2" />
        <h4 className="font-semibold text-slate-300 text-sm mb-1">Predictive Analytics Inactive</h4>
        <p className="text-xs text-slate-500 max-w-[240px] mx-auto">
          Start a simulation or configure an event in the scenario form to trigger real-time ML impact forecasting.
        </p>
      </div>
    );
  }

  const { predicted_impact, confidence, reasons, explanation, recommendations } = prediction;

  const colorConfig = {
    Low: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", ring: "stroke-emerald-500" },
    Medium: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", ring: "stroke-amber-500" },
    High: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", ring: "stroke-orange-500" },
    Critical: { text: "text-red-400 bg-red-500/10 border-red-500/20", bg: "bg-red-500/10", border: "border-red-500/20 animate-pulse", ring: "stroke-red-500" },
  }[predicted_impact];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-panel p-5 text-sm backdrop-blur-md h-full justify-between shadow-lg">
      
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-white/10 pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Real-time ML Forecast</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border}`}>
              {predicted_impact} Impact Level
            </span>
          </div>
        </div>

        {/* Circular Confidence Ring */}
        <div className="relative h-14 w-14 flex items-center justify-center">
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle cx="28" cy="28" r="24" className="stroke-white/10" strokeWidth="4.5" fill="none" />
            <circle
              cx="28"
              cy="28"
              r="24"
              className={colorConfig.ring}
              strokeWidth="4.5"
              fill="none"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - confidence / 100)}
            />
          </svg>
          <span className="text-xs font-bold text-slate-200">{Math.round(confidence)}%</span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-blue-400" /> Actionable Deployments & Safeguards
        </h4>
        <ul className="flex flex-col gap-2">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
              <CheckCircle className="h-4 w-4 text-blue-500/80 mt-0.5 shrink-0" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Secondary Hotspots Spillover */}
      {secondaryHotspots && secondaryHotspots.length > 0 && (
        <div className="border-t border-white/10 pt-3.5 flex flex-col gap-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-orange-400 animate-pulse" /> Crowd Spillover Hotspots (Heuristic)
          </h4>
          <div className="grid grid-cols-3 gap-2.5 mt-1">
            {secondaryHotspots.map((hotspot) => (
              <div key={hotspot.junction_id} className="rounded-lg border border-orange-500/15 bg-orange-500/[0.02] p-2.5 flex flex-col gap-0.5 shadow-sm">
                <span className="text-[10px] font-bold text-white truncate">{hotspot.junction_name}</span>
                <span className="text-[11px] font-black text-orange-400">+{hotspot.traffic_increase_pct}% traffic</span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">{hotspot.distance_km.toFixed(1)} km away</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
export default MLPredictionPanel;
