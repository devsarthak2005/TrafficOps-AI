"use client";

import type { Alert } from "@/types/alert";
import AlertTypeIcon from "./AlertTypeIcon";
import { X, Loader2 } from "lucide-react";
import { useState } from "react";
import { getIncidents } from "@/lib/api/incidents";
import { useAppStore } from "@/store/useAppStore";

interface AlertCardProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

export default function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const { alert_id, alert_type, confidence, message } = alert;
  const [loading, setLoading] = useState(false);
  const openSimilarPanel = useAppStore((state) => state.openSimilarPanel);

  // Determine left border color and text color based on confidence level (severity)
  let borderColor = "border-l-yellow-500";
  let badgeBg = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  let iconColor = "text-yellow-400";

  if (confidence >= 85) {
    borderColor = "border-l-red-500";
    badgeBg = "bg-red-500/10 text-red-400 border-red-500/20";
    iconColor = "text-red-400";
  } else if (confidence >= 70) {
    borderColor = "border-l-orange-500";
    badgeBg = "bg-orange-500/10 text-orange-400 border-orange-500/20";
    iconColor = "text-orange-400";
  }

  const handleClick = async () => {
    if (!alert.junction_id) return;
    setLoading(true);
    try {
      const incidents = await getIncidents({ junction_id: alert.junction_id });
      if (incidents.length > 0) {
        // Retrieve the most recent incident
        openSimilarPanel(incidents[0].id);
      } else {
        console.warn("No incidents found at junction for alert:", alert.junction_id);
      }
    } catch (err) {
      console.error("Failed to fetch incidents for alert:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex gap-3 rounded-lg border border-slate-800/80 bg-slate-900/40 p-4 border-l-[3.5px] ${borderColor} hover:bg-slate-900/60 hover:border-slate-700 transition-all duration-300 group shadow-md shadow-black/10 cursor-pointer active:scale-[0.99]`}
    >
      {/* Alert Icon */}
      <div className={`mt-0.5 shrink-0 rounded-lg bg-slate-950 p-2 border border-slate-800 ${iconColor}`}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        ) : (
          <AlertTypeIcon type={alert_type} className="h-4.5 w-4.5" />
        )}
      </div>

      {/* Alert content */}
      <div className="flex-1 flex flex-col gap-2 pr-4">
        {/* Type label + Confidence badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            {alert_type.replace("_", " ")}
          </span>
          <span className={`rounded-full border px-1.5 py-0.25 text-[9px] font-bold ${badgeBg}`}>
            {confidence}% Conf.
          </span>
        </div>

        {/* Message */}
        <p className="text-xs leading-normal text-slate-300">
          {message}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(alert_id);
        }}
        className="absolute top-3 right-3 rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Dismiss alert"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
