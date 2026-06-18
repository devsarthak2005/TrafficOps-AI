"use client";

import type { SimilarIncidentResult } from "@/types/similar_incident";
import { Clock, MapPin, Cloud } from "lucide-react";

interface SimilarIncidentCardProps {
  result: SimilarIncidentResult;
}

function getSeverityBadgeClass(severity: string) {
  const s = severity.toLowerCase();
  if (s === "low") return "bg-green-500/10 text-green-400 border-green-500/20";
  if (s === "moderate") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  if (s === "high") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (s === "critical") return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

function formatFactorLabel(factor: string): string {
  const mapping: Record<string, string> = {
    same_incident_type: "Same Type",
    same_junction: "Same Junction",
    same_zone: "Same Zone",
    same_weather: "Same Weather",
    similar_time_of_day: "Similar Time",
    same_severity: "Same Severity",
    adjacent_severity: "Adjacent Severity",
  };
  return mapping[factor] || factor.replace(/_/g, " ");
}

function formatIncidentTime(tsStr: string) {
  const date = new Date(tsStr);
  const now = new Date();
  
  // Calculate difference in milliseconds
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 0) {
    return `Today, ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${timeStr}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago, ${timeStr}`;
  } else {
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }
}

export function SimilarIncidentCard({ result }: SimilarIncidentCardProps) {
  const {
    incident_type,
    severity,
    junction_name,
    timestamp,
    weather,
    similarity_score,
    matched_factors,
    weak_match,
  } = result;

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border bg-slate-900/40 p-4 shadow-md transition-all duration-300 ${
        weak_match
          ? "border-slate-800 opacity-60 hover:opacity-85 hover:border-slate-700"
          : "border-slate-800/80 hover:bg-slate-900/60 hover:border-slate-700"
      }`}
    >
      {/* Top row: Incident Type + Severity + Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold capitalize text-white">
            {incident_type}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(severity)}`}>
            {severity}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-base font-extrabold leading-none ${weak_match ? "text-slate-400" : "text-blue-400"}`}>
            {similarity_score}%
          </span>
          <span className="text-[8px] font-bold tracking-widest text-slate-500 mt-0.5">MATCH</span>
        </div>
      </div>

      {/* Info details */}
      <div className="flex flex-col gap-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
          <span className="truncate">{junction_name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-slate-500" />
          <span>{formatIncidentTime(timestamp)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cloud className="h-3 w-3 shrink-0 text-slate-500" />
          <span className="capitalize">{weather}</span>
        </div>
      </div>

      {/* Matched Factors Pills */}
      {matched_factors.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-slate-800/50 pt-2.5">
          {matched_factors.map((factor) => (
            <span
              key={factor}
              className={`rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide ${
                weak_match
                  ? "bg-slate-800/50 text-slate-400 border border-slate-700/30"
                  : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
              }`}
            >
              {formatFactorLabel(factor)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
