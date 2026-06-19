"use client";

import { useEffect } from "react";
import { useReplayStore } from "@/store/useReplayStore";
import { Clock, AlertTriangle, Calendar, PlayCircle } from "lucide-react";

export default function ReplayHistoryPanel() {
  const { historyList, activeReplay, isFetching, fetchHistory, fetchReplay } = useReplayStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "medium":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-panel p-4 flex flex-col gap-3.5 shadow-lg h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 pb-2">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-blue-400" /> Replay Command History
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5">Select a logged scenario for post-event audit analysis.</p>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
        {isFetching && historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse text-slate-500 text-xs font-mono">
            <div className="h-4 w-4 rounded-full border border-blue-500 border-t-transparent animate-spin mb-2" />
            Loading logged playbacks...
          </div>
        ) : historyList.length === 0 ? (
          <div className="text-center p-6 text-slate-500 text-xs font-mono">
            No incident replays logged.
          </div>
        ) : (
          historyList.map((item) => {
            const isActive = activeReplay?.event_id === item.event_id;
            const isDemo = item.event_id.startsWith("demo-");
            
            return (
              <button
                key={item.event_id}
                type="button"
                onClick={() => fetchReplay(item.event_id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex flex-col gap-2 relative ${
                  isActive
                    ? "bg-blue-600/10 border-blue-500/50 shadow-md shadow-blue-500/5"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
                }`}
              >
                {/* Title & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs font-bold leading-snug ${isActive ? "text-blue-400" : "text-slate-200"}`}>
                    {item.title}
                  </span>
                  {isDemo && (
                    <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono tracking-wider">
                      Demo
                    </span>
                  )}
                </div>

                {/* Meta details */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1 border-t border-white/5 pt-2">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getSeverityColor(item.severity)}`}>
                    {item.severity.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(item.created_at)}
                  </span>
                </div>

                {/* Overlay Action Icon when active */}
                {isActive && (
                  <PlayCircle className="absolute right-2 top-2 h-4 w-4 text-blue-400 fill-blue-500/10 opacity-70" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
