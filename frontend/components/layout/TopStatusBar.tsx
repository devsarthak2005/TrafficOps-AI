"use client";

import { useEffect, useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Cpu, 
  LineChart, 
  BrainCircuit, 
  BellRing, 
  Route, 
  Clock,
  History
} from "lucide-react";

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "map", label: "Live Map", icon: MapIcon },
  { id: "simulator", label: "Event Simulator", icon: Cpu },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "ml", label: "AI Insights", icon: BrainCircuit },
  { id: "alerts", label: "Alerts Center", icon: BellRing },
  { id: "corridors", label: "Emergency Corridors", icon: Route },
  { id: "replay", label: "Historical Replay", icon: History },
] as const;

export function TopStatusBar() {
  const activeTab = useMapStore((state) => state.activeTab);
  const setActiveTab = useMapStore((state) => state.setActiveTab);
  const [timeLabel, setTimeLabel] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeLabel(formatClock(new Date()));

    const interval = window.setInterval(() => {
      setTimeLabel(formatClock(new Date()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-panel/95 px-6 backdrop-blur-md z-30">
      {/* Premium glowing logo */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
          <BrainCircuit className="h-5 w-5 text-white animate-pulse" />
        </div>
        <span className="text-base font-bold tracking-wider text-white">
          TrafficOps <span className="text-blue-500 font-extrabold">AI</span>
        </span>
      </div>

      {/* Top horizontal nav links */}
      <nav className="flex items-center gap-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 border ${
                isActive
                  ? "bg-blue-600/15 border-blue-500/30 text-blue-400 font-extrabold shadow-[0_0_15px_rgba(59,130,246,0.1)] shadow-inner"
                  : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Clock Display */}
      <div className="flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-3 py-1.5 text-slate-300">
        <Clock className="h-3.5 w-3.5 text-blue-400" />
        <span className="font-mono text-xs font-medium tracking-[0.15em]">
          {mounted ? timeLabel : "--:--:--"}
        </span>
      </div>
    </header>
  );
}
