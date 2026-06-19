"use client";

import { useReplayStore } from "@/store/useReplayStore";
import ReplayTimeline from "./ReplayTimeline";
import ReplayControls from "./ReplayControls";
import ReplayConfidenceChart from "./ReplayConfidenceChart";
import { 
  FileSpreadsheet, 
  Lightbulb, 
  TrendingUp, 
  ShieldAlert, 
  ChevronRight, 
  Compass, 
  Users 
} from "lucide-react";

export function ReplayView() {
  const { activeReplay, error } = useReplayStore();

  const getSeverityBadgeColor = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/25";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/25";
      case "medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/25";
      default:
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    }
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-xs font-mono text-red-400">
        Error: {error}
      </div>
    );
  }

  if (!activeReplay) {
    return (
      <div className="rounded-xl border border-white/5 bg-panel p-6 flex flex-col items-center justify-center text-center shadow-lg h-full select-none">
        <FileSpreadsheet className="h-10 w-10 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          Audit Report Panel
        </h3>
        <p className="text-[10px] text-slate-500 max-w-[240px] mt-1.5 leading-relaxed">
          Please select an incident from the replay logs history to load the post-event command audit interface.
        </p>
      </div>
    );
  }

  const audit = activeReplay.prediction_audit;
  const metrics = activeReplay.resource_effectiveness;

  return (
    <div className="rounded-xl border border-white/10 bg-panel/95 p-5 backdrop-blur-md shadow-2xl h-full flex flex-col gap-4 overflow-y-auto select-none max-h-[calc(100vh-120px)] scrollbar-thin">
      {/* Title & Metadata */}
      <div className="border-b border-white/10 pb-3">
        <span className="text-[8px] font-extrabold text-blue-500 uppercase tracking-widest flex items-center gap-1 font-mono">
          <FileSpreadsheet className="h-3 w-3" /> COMMAND CENTER AUDIT REPORT
        </span>
        <h2 className="text-sm font-bold text-white leading-tight mt-1">
          {activeReplay.title}
        </h2>
        <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono text-slate-500">
          <span>ID: {activeReplay.event_id}</span>
          <span>•</span>
          <span>Type: <span className="text-slate-300 uppercase">{activeReplay.event_type}</span></span>
        </div>
      </div>

      {/* 1. Prediction vs Actual Audit Matrix */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-1">
          <ShieldAlert className="h-3.5 w-3.5 text-blue-400" /> Forecast Accuracy Validation
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {/* Predicted */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-2.5 flex flex-col gap-1">
            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">
              Predicted Impact
            </span>
            <span className={`self-start px-1.5 py-0.5 rounded text-[9px] font-bold border ${getSeverityBadgeColor(audit.predicted_impact)}`}>
              {audit.predicted_impact.toUpperCase()}
            </span>
          </div>

          {/* Actual */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-2.5 flex flex-col gap-1">
            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">
              Actual Outcome
            </span>
            <span className={`self-start px-1.5 py-0.5 rounded text-[9px] font-bold border ${getSeverityBadgeColor(audit.actual_outcome)}`}>
              {audit.actual_outcome.toUpperCase()}
            </span>
          </div>

          {/* Confidence */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-2.5 flex flex-col gap-1 col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">
                Prediction Confidence
              </span>
              <span className="text-[10px] font-mono font-extrabold text-blue-400">
                {Math.round(audit.confidence)}%
              </span>
            </div>
            {/* Simple confidence fill bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${audit.confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Success Indicator Badge */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] rounded px-3 py-2 flex items-center justify-between font-mono mt-0.5">
          <span>Success Indicator:</span>
          <span className="font-bold uppercase tracking-wider">{audit.success_indicator}</span>
        </div>
      </div>

      {/* 2. Resource Effectiveness Metrics */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 pb-1">
          <TrendingUp className="h-3.5 w-3.5 text-blue-400" /> Resource Effectiveness Indices
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {/* Officers */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-2 flex flex-col items-center justify-center text-center">
            <Users className="h-3.5 w-3.5 text-slate-400 mb-1" />
            <span className="text-[11px] font-extrabold text-slate-200">
              {metrics.officers_deployed}
            </span>
            <span className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">
              Officers
            </span>
          </div>

          {/* Delay Reduction */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-2 flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400 mb-1" />
            <span className="text-[11px] font-extrabold text-emerald-400">
              {metrics.estimated_delay_reduction}
            </span>
            <span className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">
              Delay Red.
            </span>
          </div>

          {/* Diversion Success */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-2 flex flex-col items-center justify-center text-center">
            <Compass className="h-3.5 w-3.5 text-orange-400 mb-1" />
            <span className="text-[10px] font-bold text-orange-400 leading-tight">
              {metrics.diversion_success.split(" ")[0] || "100%"}
            </span>
            <span className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5">
              Detour Ok
            </span>
          </div>
        </div>
      </div>

      {/* 3. Learning Insights */}
      <div className="bg-blue-950/20 border border-blue-500/15 rounded-lg p-3.5 flex gap-2.5 items-start">
        <Lightbulb className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] text-blue-400 uppercase tracking-widest font-extrabold font-mono">
            Localized Learning Insight
          </span>
          <p className="text-[10px] leading-relaxed text-slate-300 font-medium">
            "{activeReplay.learning_insight}"
          </p>
        </div>
      </div>

      {/* 4. Timeline Stepper */}
      <ReplayTimeline />

      {/* 5. Sparkline Charts */}
      <ReplayConfidenceChart />

      {/* 6. Playback Controls */}
      <ReplayControls />
    </div>
  );
}
export default ReplayView;
