"use client";

import type { JunctionSummary } from "@/types/junction";

import { getStatusBadgeClass } from "@/lib/statusColors";

function riskLabel(risk: string): string {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

// ---------------------------------------------------------------------------
// Skeleton placeholder (shown while data is loading)
// ---------------------------------------------------------------------------
function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-[4px]">
      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
    </div>
  );
}

export function JunctionHoverCardSkeleton() {
  return (
    <div className="w-[280px] rounded-xl border border-white/10 bg-elevated p-4 shadow-xl shadow-black/40">
      {/* Header skeleton */}
      <div className="mb-1 flex items-start justify-between">
        <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mb-3 mt-2 h-8 w-12 animate-pulse rounded bg-white/10" />

      {/* Divider */}
      <div className="mb-3 h-px bg-white/10" />

      {/* Row skeletons */}
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Populated hover card
// ---------------------------------------------------------------------------
interface JunctionHoverCardProps {
  summary: JunctionSummary;
}

interface StatRowProps {
  label: string;
  value: string | number;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-baseline justify-between py-[4px]">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-white">
        {value}
      </span>
    </div>
  );
}

export function JunctionHoverCard({ summary }: JunctionHoverCardProps) {
  return (
    <div className="w-[280px] rounded-xl border border-white/10 bg-elevated p-4 shadow-xl shadow-black/40">
      {/* Header: Name + Risk badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold leading-tight text-white">
          {summary.junction_name}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeClass(summary.risk_category)}`}
        >
          {riskLabel(summary.risk_category)}
        </span>
      </div>

      {/* Health score */}
      <div className="mt-2 mb-3">
        <span className="text-[28px] font-extrabold leading-none text-white">
          {summary.health_score}
        </span>
        <span className="ml-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Health Score
        </span>
      </div>

      {/* Divider */}
      <div className="mb-2 h-px bg-white/10" />

      {/* Stats rows */}
      <div className="flex flex-col gap-[4px]">
        <StatRow label="Incidents" value={summary.incident_count} />
        <StatRow label="Top Cause" value={summary.top_incident_cause} />
        <StatRow label="Peak Hours" value={summary.peak_risk_hours} />
        <StatRow
          label="Avg Clearance"
          value={`${summary.avg_clearance_time_minutes} min`}
        />
        <StatRow label="Hospital Impact" value={summary.hospital_impact} />
      </div>
    </div>
  );
}
