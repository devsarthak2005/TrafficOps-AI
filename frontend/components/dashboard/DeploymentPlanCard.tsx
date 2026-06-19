"use client";

import React from "react";
import { useOperationsStore } from "@/store/useOperationsStore";
import { Shield, Users, Truck, AlertOctagon, Landmark, Zap, ShieldCheck } from "lucide-react";

export function DeploymentPlanCard() {
  const { plan, isOptimizing, error } = useOperationsStore();

  if (isOptimizing) {
    return (
      <div className="rounded-xl border border-white/10 bg-panel p-6 flex flex-col items-center justify-center animate-pulse min-h-[220px]">
        <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-mono">Running optimization heuristics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-950 bg-red-950/20 p-6 text-center min-h-[220px] flex flex-col justify-center">
        <AlertOctagon className="h-8 w-8 text-red-400 mx-auto mb-2 animate-bounce" />
        <p className="text-xs text-red-400 font-mono font-semibold">Optimizer Error: {error}</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-panel/40 p-6 text-center min-h-[220px] flex flex-col items-center justify-center">
        <Zap className="h-8 w-8 text-slate-600 mb-2" />
        <h4 className="font-semibold text-slate-300 text-xs mb-1 uppercase tracking-wider">Operational Optimizer Standby</h4>
        <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto">
          Inject an event or run a simulator trigger to synthesize the optimized deployment strategy.
        </p>
      </div>
    );
  }

  const {
    deployment_score,
    officers_required,
    patrol_vehicles,
    barricades,
    diversion_level,
    emergency_corridor_required,
    estimated_response_time,
    estimated_operational_cost
  } = plan;

  // Color coding thresholds
  // 0-30 Green, 31-60 Yellow, 61-80 Orange, 81-100 Red
  const scoreConfig = (() => {
    if (deployment_score <= 30) {
      return {
        text: "text-emerald-400",
        border: "border-emerald-500/20",
        bg: "bg-emerald-500/10",
        ring: "stroke-emerald-500",
        glow: "shadow-emerald-500/20",
        label: "Secure Baseline"
      };
    }
    if (deployment_score <= 60) {
      return {
        text: "text-amber-400",
        border: "border-amber-500/20",
        bg: "bg-amber-500/10",
        ring: "stroke-amber-500",
        glow: "shadow-amber-500/10",
        label: "Moderate Alert"
      };
    }
    if (deployment_score <= 80) {
      return {
        text: "text-orange-400",
        border: "border-orange-500/20",
        bg: "bg-orange-500/10",
        ring: "stroke-orange-500",
        glow: "shadow-orange-500/10",
        label: "High Warning"
      };
    }
    return {
      text: "text-red-400",
      border: "border-red-500/20 animate-pulse",
      bg: "bg-red-500/10",
      ring: "stroke-red-500",
      glow: "shadow-red-500/30 animate-pulse",
      label: "Critical Threat"
    };
  })();

  // Format currency
  const formattedCost = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(estimated_operational_cost);

  return (
    <div className="rounded-xl border border-white/10 bg-panel/95 p-4 flex flex-col gap-4 shadow-2xl backdrop-blur-md relative min-h-fit transition-all duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 block">Operational Optimizer</span>
          <h3 className="text-xs font-bold text-slate-200 mt-0.5">Deployment Plan Strategy</h3>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${scoreConfig.border} ${scoreConfig.bg} ${scoreConfig.text}`}>
          {scoreConfig.label}
        </div>
      </div>

      {/* Main Stats Row (Readiness Score Ring + Core Details) */}
      <div className="grid grid-cols-12 gap-4 items-center">
        
        {/* Circular Gauge (5 cols) */}
        <div className="col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="34" className="stroke-white/5" strokeWidth="5.5" fill="none" />
              <circle
                cx="40"
                cy="40"
                r="34"
                className={`transition-all duration-1000 ${scoreConfig.ring}`}
                strokeWidth="5.5"
                fill="none"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - deployment_score / 100)}
              />
            </svg>
            <div className="flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-100">{deployment_score}</span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Score</span>
            </div>
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-2">Readiness Index</span>
        </div>

        {/* Core Stats (7 cols) */}
        <div className="col-span-7 grid grid-cols-2 gap-3">
          {/* Officers */}
          <div className="p-2.5 rounded-lg border border-white/5 bg-white/5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold">
              <Users className="h-3.5 w-3.5 text-blue-400" /> Officers
            </div>
            <h4 className="text-base font-extrabold text-slate-200 mt-1.5">{officers_required}</h4>
          </div>

          {/* Vehicles */}
          <div className="p-2.5 rounded-lg border border-white/5 bg-white/5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold">
              <Truck className="h-3.5 w-3.5 text-blue-400" /> Patrol Cars
            </div>
            <h4 className="text-base font-extrabold text-slate-200 mt-1.5">{patrol_vehicles}</h4>
          </div>

          {/* Barricades */}
          <div className="p-2.5 rounded-lg border border-white/5 bg-white/5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold">
              <Shield className="h-3.5 w-3.5 text-blue-400" /> Barricades
            </div>
            <h4 className="text-base font-extrabold text-slate-200 mt-1.5">{barricades}</h4>
          </div>

          {/* Response Time */}
          <div className="p-2.5 rounded-lg border border-white/5 bg-white/5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold">
              <Zap className="h-3.5 w-3.5 text-blue-400" /> Response
            </div>
            <h4 className="text-xs font-black text-slate-200 mt-2 truncate">{estimated_response_time}</h4>
          </div>
        </div>
      </div>

      {/* Diversion, Corridor, Cost Details */}
      <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-[10px] text-slate-400">
        
        {/* Diversion */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Diversion</span>
          <span className="font-bold text-slate-200 text-xs">{diversion_level}</span>
        </div>

        {/* Corridor */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Emergency Corridor</span>
          <span className={`font-bold text-xs ${emergency_corridor_required ? "text-emerald-400 flex items-center gap-0.5" : "text-slate-500"}`}>
            {emergency_corridor_required ? (
              <>
                <ShieldCheck className="h-3 w-3 shrink-0" /> Active
              </>
            ) : "Inactive"}
          </span>
        </div>

        {/* Cost */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Est. Budget Cost</span>
          <span className="font-black text-blue-400 text-xs">{formattedCost}</span>
        </div>

      </div>

    </div>
  );
}
export default DeploymentPlanCard;
