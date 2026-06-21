"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useMapStore } from "@/store/useMapStore";
import { useAlertStore } from "@/store/useAlertStore";
import { BarChart3, TrendingUp, AlertOctagon, Layers, ArrowUpRight } from "lucide-react";

// Dynamic map preview for Leaflet (SSR resilient)
const AnalyticsMap = dynamic(
  () => import("./AnalyticsMapPreview").then((mod) => mod.AnalyticsMapPreview),
  { ssr: false, loading: () => <div className="h-full bg-[#0d0d0d] flex items-center justify-center text-slate-500 text-xs font-mono">Loading analytics viewport...</div> }
);

export function AnalyticsView() {
  const { junctions, healthMap, dashboardStats, fetchDashboardStats } = useMapStore();
  const { alerts } = useAlertStore();

  // Fetch stats on mount
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // 1. Sort junctions by health (worst first) to show a congestion leaderboard
  const congestionLeaderboard = useMemo(() => {
    const items = Object.values(healthMap).map((h) => {
      const junc = junctions.find((j) => j.id === h.junction_id);
      return {
        name: junc ? junc.name : h.junction_id,
        health: h.health_score,
      };
    });
    return items.sort((a, b) => a.health - b.health).slice(0, 5);
  }, [junctions, healthMap]);

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto bg-[#080808]">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Diagnostic Analytics & Spatial Modeling <Layers className="h-5 w-5 text-blue-400" />
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">
          Macro-level analytics dashboards coupled with real-time geographic overlay mappings.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-0 flex-1">
        {/* Left Column - SVG Charts (6 Cols) */}
        <div className="col-span-6 flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* Congestion Spikes Trend (Area Chart) */}
          <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-blue-400" /> Hourly Network Congestion Index
              </h3>
              <span className="text-[10px] text-slate-400">Past 24 Hours</span>
            </div>
            
            <div className="h-28 w-full relative mt-2">
              {(() => {
                const hourly = dashboardStats?.hourly_incident_distribution ?? [];
                const maxVal = Math.max(...hourly, 1);
                // Build SVG path from 24 hourly data points
                const points = hourly.map((v, i) => {
                  const x = (i / 23) * 500;
                  const y = 100 - (v / maxVal) * 90;
                  return `${x},${y}`;
                });
                const pathD = points.length > 0 ? `M ${points.join(" L ")}` : "M 0,100 L 500,100";
                const areaD = points.length > 0 ? `M ${points.join(" L ")} L 500,100 L 0,100 Z` : "M 0,100 L 500,100 Z";
                return (
                  <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#gradient-area)" />
                    <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                    <line x1="0" y1="20" x2="500" y2="20" stroke="white" strokeOpacity="0.05" strokeDasharray="3" />
                    <line x1="0" y1="50" x2="500" y2="50" stroke="white" strokeOpacity="0.05" strokeDasharray="3" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="white" strokeOpacity="0.05" strokeDasharray="3" />
                  </svg>
                );
              })()}
              <span className="absolute left-0 top-0 text-[9px] font-mono text-slate-600">Incident density by hour</span>
              <span className="absolute right-0 bottom-0 text-[9px] font-mono text-slate-600">0h — 23h</span>
            </div>
          </div>

          {/* Grid Layout for Zone Risk & Proportions */}
          <div className="grid grid-cols-2 gap-4">
            {/* Zone Risk profile */}
            <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-blue-400" /> Zone Risk Levels
              </h3>
              
              <div className="flex flex-col gap-2 mt-1">
                {(dashboardStats?.zone_risk_levels ?? []).map((item, idx) => {
                  const color = item.risk >= 70 ? "bg-red-500/50" : item.risk >= 40 ? "bg-orange-500/50" : item.risk >= 20 ? "bg-amber-500/50" : "bg-emerald-500/50";
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 w-16">{item.zone}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden mx-3">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${item.risk}%` }} />
                      </div>
                      <span className="font-semibold text-slate-200">{item.risk}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Event Proportions (causes) */}
            <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4 text-blue-400" /> Event Causes Log
              </h3>
              
              <div className="flex flex-col gap-2 mt-1">
                {(dashboardStats?.incident_type_distribution ?? []).map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">{item.name}</span>
                      <span className="text-[10px] text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-blue-500/40 rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Diagnostics Grid (Bottlenecks + Resource Utilization) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Congestion Leaderboard Card */}
            <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-2.5 shadow-lg">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top 5 Bottlenecks (Lowest Health)</h3>
              <div className="flex flex-col gap-2">
                {congestionLeaderboard.map((junc, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-slate-300 font-bold truncate max-w-[120px]">{junc.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      junc.health < 40 ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"
                    }`}>
                      Health: {junc.health}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Utilization Card */}
            <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3 shadow-lg">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-blue-400" /> Resource Deployed Index
              </h3>
              
              <div className="flex flex-col gap-2.5 mt-1">
                {(dashboardStats?.resource_utilization ?? [
                  { label: "Officers Deployed", pct: 0, desc: "Loading..." },
                  { label: "Patrol Cars Active", pct: 0, desc: "Loading..." },
                  { label: "Barricades Dispatched", pct: 0, desc: "Loading..." },
                ]).map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-[10px] text-slate-500">{item.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                      <span className="font-semibold text-slate-200 min-w-[28px] text-right">{item.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Map Visualization (6 Cols) */}
        <div className="col-span-6 flex flex-col gap-2 rounded-xl border border-white/5 bg-panel overflow-hidden shadow-lg relative min-h-[350px]">
          <div className="absolute top-4 left-4 z-10 bg-black/75 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-500" /> Spatial Diagnostic Viewport
            </span>
          </div>
          <AnalyticsMap />
        </div>
      </div>
    </div>
  );
}
export default AnalyticsView;
