"use client";

import { useReplayStore, TimelineSnapshot } from "@/store/useReplayStore";
import { CheckCircle2, Circle, HelpCircle } from "lucide-react";

export default function ReplayTimeline() {
  const { activeReplay, currentTimeIndex } = useReplayStore();

  if (!activeReplay) return null;

  const timeline = activeReplay.timeline;

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "EVENT_CREATED":
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
      case "PREDICTION_GENERATED":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      case "ALERT_RAISED":
        return "text-orange-400 border-orange-500/50 bg-orange-500/10";
      case "DEPLOYMENT_PLANNED":
      case "RESOURCES_DEPLOYED":
        return "text-purple-400 border-purple-500/50 bg-purple-500/10";
      case "DIVERSION_ACTIVATED":
      case "CORRIDOR_ACTIVATED":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      case "CONGESTION_REDUCED":
        return "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
      case "EVENT_RESOLVED":
        return "text-slate-400 border-slate-500/50 bg-slate-500/10";
      default:
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-1">
        Incident Timeline Progression
      </h4>
      <div className="relative flex flex-col gap-4 pl-4 border-l border-white/10 ml-2 max-h-[300px] overflow-y-auto pr-1">
        {timeline.map((snapshot, idx) => {
          const isCompleted = idx < currentTimeIndex;
          const isActive = idx === currentTimeIndex;
          const isFuture = idx > currentTimeIndex;

          const stageLabel = snapshot.stage.replace(/_/g, " ");
          const badgeStyle = getStageColor(snapshot.stage);

          return (
            <div
              key={idx}
              className={`relative transition-all duration-300 flex flex-col gap-1 ${
                isActive
                  ? "opacity-100 scale-[1.01]"
                  : isCompleted
                  ? "opacity-75"
                  : "opacity-40"
              }`}
            >
              {/* Stepper Dot */}
              <div
                className={`absolute -left-[23px] top-1 h-[14px] w-[14px] rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isActive
                    ? "bg-blue-600 border-blue-400 ring-4 ring-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse"
                    : isCompleted
                    ? "bg-slate-800 border-emerald-500 text-emerald-400"
                    : "bg-[#121212] border-white/10"
                }`}
              >
                {isCompleted && (
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </div>

              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badgeStyle} ${
                    isActive ? "animate-pulse" : ""
                  }`}
                >
                  {stageLabel}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {formatTime(snapshot.timestamp)}
                </span>
              </div>

              {/* Description */}
              <p className="text-[10px] leading-relaxed text-slate-300">
                {snapshot.description}
              </p>

              {/* Metrics tag */}
              {isActive && (
                <div className="flex gap-3 text-[9px] font-mono text-slate-400 mt-0.5 bg-white/[0.02] border border-white/5 rounded px-2 py-1">
                  <div>
                    Congestion:{" "}
                    <span className="text-red-400 font-bold">
                      {snapshot.congestion_score}%
                    </span>
                  </div>
                  {snapshot.confidence > 0 && (
                    <div>
                      Confidence:{" "}
                      <span className="text-blue-400 font-bold">
                        {snapshot.confidence}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
