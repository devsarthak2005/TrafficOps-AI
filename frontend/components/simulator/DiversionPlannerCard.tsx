"use client";

import React from "react";
import { useDiversionStore } from "@/store/useDiversionStore";
import { Navigation, TrendingUp, AlertTriangle, Star, Check, Activity, Clock, Milestone } from "lucide-react";

export function DiversionPlannerCard() {
  const { plan, selectedRouteId, isGenerating, error, setSelectedRouteId } = useDiversionStore();

  if (isGenerating) {
    return (
      <div className="rounded-xl border border-white/10 bg-panel p-6 flex flex-col items-center justify-center animate-pulse min-h-[220px]">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-mono">Generating impact-aware routing options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-950 bg-red-950/20 p-6 text-center min-h-[220px] flex flex-col justify-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2 animate-bounce" />
        <p className="text-xs text-red-400 font-mono font-semibold">Router Engine Error: {error}</p>
      </div>
    );
  }

  if (!plan || !plan.diversion_required || plan.routes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-panel/40 p-6 text-center min-h-[220px] flex flex-col items-center justify-center">
        <Navigation className="h-8 w-8 text-slate-600 mb-2" />
        <h4 className="font-semibold text-slate-300 text-xs mb-1 uppercase tracking-wider">AI Diversion Engine Standby</h4>
        <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto">
          Configure an event of Medium, High, or Critical impact to calculate optimal traffic redirection.
        </p>
      </div>
    );
  }

  const { routes, estimated_vehicles_diverted, estimated_delay_reduction } = plan;
  const recommendedRoute = routes.find((r) => r.recommended);

  // Helper to resolve route status colors
  const getRouteConfig = (id: string) => {
    switch (id) {
      case "primary":
        return {
          color: "text-emerald-400",
          border: "border-emerald-500/20",
          bg: "bg-emerald-500/10",
          bullet: "bg-emerald-500",
        };
      case "secondary":
        return {
          color: "text-orange-400",
          border: "border-orange-500/20",
          bg: "bg-orange-500/10",
          bullet: "bg-orange-500",
        };
      case "emergency":
        return {
          color: "text-red-400",
          border: "border-red-500/20",
          bg: "bg-red-500/10",
          bullet: "bg-red-500",
        };
      default:
        return {
          color: "text-slate-400",
          border: "border-slate-500/20",
          bg: "bg-slate-500/10",
          bullet: "bg-slate-500",
        };
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-panel/95 p-4 flex flex-col gap-4 shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 block">Decision-Support</span>
          <h3 className="text-xs font-bold text-slate-200 mt-0.5">AI Diversion Rerouting</h3>
        </div>
        <div className="px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
          <Activity className="h-3 w-3 animate-pulse" /> Diversion Active
        </div>
      </div>

      {/* Operational Benefits Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-white/5 bg-white/5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <span className="text-[9px] font-medium text-slate-500 block">Vehicles Diverted</span>
            <h4 className="text-sm font-extrabold text-slate-200 mt-0.5">
              {estimated_vehicles_diverted.toLocaleString()} / hr
            </h4>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-white/5 bg-white/5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[9px] font-medium text-slate-500 block">Delay Reduction</span>
            <h4 className="text-sm font-extrabold text-emerald-400 mt-0.5">
              {estimated_delay_reduction}
            </h4>
          </div>
        </div>
      </div>

      {/* Recommended Route Announcement */}
      {recommendedRoute && (
        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1.5 relative overflow-hidden">
          <div className="absolute right-2 top-2">
            <Star className="h-8 w-8 text-emerald-500/10 fill-emerald-500/5" />
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <Star className="h-3.5 w-3.5 fill-emerald-400 animate-spin-slow" /> AI Recommendation
          </div>
          <p className="text-[11px] text-slate-300">
            Surface <span className="font-semibold text-white">{recommendedRoute.name}</span> to bypass the bottleneck. Expect standard flow speeds and high clearance.
          </p>
          <div className="flex gap-4 mt-1 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1"><Milestone className="h-3 w-3" /> Distance: {recommendedRoute.distance}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Duration: {recommendedRoute.travel_time}</span>
          </div>
        </div>
      )}

      {/* Route List / Comparison (Clickable) */}
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          Redirection Bypasses (Compare on Map)
        </span>
        <div className="flex flex-col gap-2.5">
          {routes.map((route) => {
            const isSelected = selectedRouteId === route.id;
            const config = getRouteConfig(route.id);

            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedRouteId(route.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex flex-col gap-2 relative ${
                  isSelected
                    ? "bg-white/5 border-blue-500/50 shadow-md shadow-blue-500/5"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                }`}
              >
                {/* Route Header */}
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${config.bullet}`} />
                    <span className="text-xs font-bold text-slate-200">{route.name}</span>
                    {route.recommended && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        Recommended
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="h-4.5 w-4.5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center p-0.5">
                      <Check className="h-3 w-3 text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Route Details */}
                <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-400">
                  <div>
                    <span className="text-[8px] text-slate-500 block">Distance</span>
                    <span className="font-semibold text-slate-200">{route.distance}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 block">Travel Time</span>
                    <span className="font-semibold text-slate-200">{route.travel_time}</span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-between text-[8px] text-slate-500 mb-0.5">
                      <span>Congestion</span>
                      <span className="font-mono text-slate-300">{route.congestion_score}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          route.congestion_score > 60
                            ? "bg-red-500"
                            : route.congestion_score > 30
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${route.congestion_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Route Score */}
                <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-0.5 text-[10px]">
                  <span className="text-slate-500 font-medium">Bypass Score:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-200">{route.route_score} / 100</span>
                    <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${route.route_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Traffic Split */}
                {route.traffic_split_pct !== undefined && route.traffic_split_pct !== null && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[9px]">
                    <span className="text-slate-500 font-medium">Load Balance split:</span>
                    <span className="font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">
                      {route.traffic_split_pct}% diverted flow
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export default DiversionPlannerCard;
