"use client";

import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useMapStore } from "@/store/useMapStore";

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function TopStatusBar() {
  const toggleSidebar = useMapStore((state) => state.toggleSidebar);
  const [timeLabel, setTimeLabel] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLabel(formatClock(new Date()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-panel px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium tracking-wide text-white">
          TrafficOps AI
        </span>
      </div>
      <span className="font-mono text-sm tracking-[0.2em] text-slate-300">
        {timeLabel}
      </span>
    </header>
  );
}
