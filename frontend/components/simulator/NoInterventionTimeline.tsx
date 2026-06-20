"use client";

import React from "react";
import { useMLStore } from "@/store/useMLStore";
import { 
  DollarSign, 
  Fuel, 
  Activity, 
  AlertOctagon, 
  HelpCircle, 
  Loader2,
  Clock,
  HeartPulse
} from "lucide-react";

export function NoInterventionTimeline() {
  const { noInterventionData, isSimulatingNoIntervention } = useMLStore();

  if (isSimulatingNoIntervention) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center animate-pulse h-full flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 rounded-full text-red-500 animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Simulating cascading gridlock propagation & cost metrics...</p>
      </div>
    );
  }

  if (!noInterventionData) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center h-full flex flex-col items-center justify-center">
        <AlertOctagon className="h-8 w-8 text-slate-500 mb-2" />
        <h4 className="font-semibold text-slate-300 text-sm mb-1">Cost of Inaction Inactive</h4>
        <p className="text-xs text-slate-500 max-w-[240px] mx-auto">
          Start a simulation or configure an event in the scenario form to analyze cost, fuel loss, and reachability penalties.
        </p>
      </div>
    );
  }

  const { 
    junction_name, 
    vehicles_affected_estimate, 
    total_fuel_loss_liters, 
    total_economic_loss_inr, 
    max_emergency_delay_minutes, 
    assumptions, 
    timeline 
  } = noInterventionData;

  const formattedCost = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(total_economic_loss_inr);

  const formattedFuel = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1
  }).format(total_fuel_loss_liters);

  // Helper to color congestion categories
  const getCongestionBadgeClass = (level: string) => {
    switch (level) {
      case "Low":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "Moderate":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "High":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "Critical":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "Gridlock":
      default:
        return "text-rose-500 bg-rose-500/20 border-rose-500/30 animate-pulse font-black";
    }
  };

  // Helper to color hospital accessibility score
  const getHospitalScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400 font-extrabold";
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-panel p-5 text-sm backdrop-blur-md h-full justify-between shadow-lg max-h-[calc(100vh-140px)] overflow-hidden">
      
      {/* Title Header */}
      <div className="border-b border-white/10 pb-3 flex justify-between items-center shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Do-Nothing Risk Simulator</span>
          <h2 className="text-sm font-black text-white mt-0.5">{junction_name}</h2>
        </div>
        <span className="text-[9px] font-mono text-slate-500 bg-slate-900 border border-white/5 rounded px-2 py-0.5">
          {vehicles_affected_estimate} veh / 30m
        </span>
      </div>

      {/* Summary Scorecard Grid */}
      <div className="grid grid-cols-3 gap-2.5 shrink-0">
        {/* Economic Loss Card */}
        <div className="rounded-lg border border-red-500/10 bg-red-500/[0.02] p-2.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <DollarSign className="h-3.5 w-3.5 text-red-500" />
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Economic Cost</span>
          </div>
          <span className="text-xs font-black text-red-400 leading-none mt-1 truncate">
            {formattedCost}
          </span>
          <span className="text-[8px] text-slate-500 mt-0.5 font-medium">projected 4h waste</span>
        </div>

        {/* Wasted Fuel Card */}
        <div className="rounded-lg border border-orange-500/10 bg-orange-500/[0.02] p-2.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Fuel className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Wasted Fuel</span>
          </div>
          <span className="text-xs font-black text-orange-400 leading-none mt-1 truncate">
            {formattedFuel} L
          </span>
          <span className="text-[8px] text-slate-500 mt-0.5 font-medium">lost to idling/delay</span>
        </div>

        {/* Ambulance Delay Card */}
        <div className="rounded-lg border border-rose-500/10 bg-rose-500/[0.02] p-2.5 flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <HeartPulse className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
            <span className="text-[9px] font-extrabold uppercase tracking-wide">Ambulance Delay</span>
          </div>
          <span className="text-xs font-black text-rose-500 leading-none mt-1 truncate animate-pulse">
            +{max_emergency_delay_minutes}m
          </span>
          <span className="text-[8px] text-slate-500 mt-0.5 font-medium">hospital transit penalty</span>
        </div>
      </div>

      {/* Stepper Timeline Progression */}
      <div className="flex-1 min-h-0 overflow-y-auto my-1.5 pr-1 border border-white/5 bg-black/25 rounded-lg p-3">
        <div className="relative flex flex-col gap-4 pl-4 border-l border-white/10 ml-2">
          {timeline.map((step, idx) => {
            const isGridlock = step.congestion_class === "Gridlock";
            const badgeClass = getCongestionBadgeClass(step.congestion_class);

            return (
              <div key={idx} className="relative flex flex-col gap-1 animate-fadeIn">
                {/* Stepper Node Bullet */}
                <div className={`absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isGridlock 
                    ? "bg-rose-950 border-rose-500 text-rose-400 ring-4 ring-rose-500/10" 
                    : "bg-[#121212] border-white/10"
                }`}>
                  {isGridlock && (
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>

                {/* Step Header */}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-slate-500" /> {step.time_label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${badgeClass}`}>
                    {step.congestion_class}
                  </span>
                </div>

                {/* Step Sub-Metrics Row */}
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-500 mt-1 bg-white/[0.01] border border-white/5 rounded p-1.5">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-slate-600">Financial Loss</span>
                    <span className="text-red-400 font-semibold mt-0.5">
                      INR {new Intl.NumberFormat("en-IN").format(step.economic_loss_inr)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-slate-600">Fuel Loss</span>
                    <span className="text-orange-400 font-semibold mt-0.5">
                      {step.fuel_loss_liters} Liters
                    </span>
                  </div>
                  <div className="flex flex-col mt-1">
                    <span className="text-[8px] uppercase font-bold text-slate-600">Ambulance delay</span>
                    <span className="text-rose-400 font-semibold mt-0.5">
                      +{step.emergency_delay_minutes} mins
                    </span>
                  </div>
                  <div className="flex flex-col mt-1">
                    <span className="text-[8px] uppercase font-bold text-slate-600">Hosp. Access Score</span>
                    <span className={`font-semibold mt-0.5 ${getHospitalScoreColor(step.hospital_accessibility_score)}`}>
                      {step.hospital_accessibility_score} / 100
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assumptions Footer Explanation */}
      <div className="border-t border-white/10 pt-2 shrink-0 bg-black/45 p-2.5 rounded-lg flex flex-col gap-1 text-[9px] text-slate-500 leading-normal">
        <div className="flex items-center gap-1 font-bold text-slate-400">
          <HelpCircle className="h-3 w-3" /> Calibration Assumptions
        </div>
        <p className="font-medium text-slate-500 leading-relaxed mt-0.5">
          Based on: {assumptions.source}. Fuel idling waste modeled at {assumptions.fuel_consumption_rate_liters_per_min} L/min per vehicle. Economic value of time budgeted at INR {assumptions.avg_wage_per_minute_inr}/min.
        </p>
      </div>

    </div>
  );
}
export default NoInterventionTimeline;
