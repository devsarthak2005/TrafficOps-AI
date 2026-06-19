"use client";

import { useEffect } from "react";
import { Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useReplayStore } from "@/store/useReplayStore";

export default function ReplayMapLayer() {
  const map = useMap();
  const { activeReplay, currentTimeIndex } = useReplayStore();

  const activeSnapshot = activeReplay?.timeline[currentTimeIndex];

  // Auto-pan map to event coordinates on loading
  useEffect(() => {
    if (activeReplay && map) {
      map.setView(activeReplay.location, 14.5, { animate: true });
    }
  }, [activeReplay, map]);

  if (!activeReplay || !activeSnapshot) return null;

  const stage = activeSnapshot.stage;
  const location = activeSnapshot.location;

  // Resolve marker color and styles by stage
  const getStageStyles = (st: string) => {
    switch (st) {
      case "EVENT_CREATED":
        return {
          bg: "bg-blue-600",
          border: "border-blue-300",
          symbol: "★",
          color: "#3b82f6",
        };
      case "PREDICTION_GENERATED":
        return {
          bg: "bg-yellow-500",
          border: "border-yellow-200",
          symbol: "P",
          color: "#eab308",
        };
      case "ALERT_RAISED":
        return {
          bg: "bg-orange-600",
          border: "border-orange-300",
          symbol: "!",
          color: "#ea580c",
        };
      case "DEPLOYMENT_PLANNED":
      case "RESOURCES_DEPLOYED":
        return {
          bg: "bg-purple-600",
          border: "border-purple-300",
          symbol: "R",
          color: "#9333ea",
        };
      case "DIVERSION_ACTIVATED":
      case "CORRIDOR_ACTIVATED":
        return {
          bg: "bg-red-600 animate-pulse",
          border: "border-red-200",
          symbol: "D",
          color: "#dc2626",
        };
      case "CONGESTION_REDUCED":
        return {
          bg: "bg-emerald-500",
          border: "border-emerald-200",
          symbol: "✔",
          color: "#10b981",
        };
      case "EVENT_RESOLVED":
        return {
          bg: "bg-slate-500",
          border: "border-slate-300",
          symbol: "•",
          color: "#64748b",
        };
      default:
        return {
          bg: "bg-blue-600",
          border: "border-blue-300",
          symbol: "★",
          color: "#3b82f6",
        };
    }
  };

  const styleConfig = getStageStyles(stage);

  // Custom DivIcon representing the active replay stage marker
  const icon = L.divIcon({
    html: `
      <div class="flex h-7 w-7 items-center justify-center rounded-full ${styleConfig.bg} border-2 ${styleConfig.border} text-white font-extrabold text-[11px] shadow-lg shadow-black/60 select-none transition-all duration-300">
        ${styleConfig.symbol}
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

  // Calculate simulated detour route coordinates wrapping around the event junction
  const lat = location[0];
  const lng = location[1];
  const detourCoords: [number, number][] = [
    [lat - 0.008, lng - 0.008],
    [lat + 0.003, lng + 0.011],
    [lat + 0.012, lng + 0.004],
    [lat + 0.008, lng - 0.008],
  ];

  const showDetour =
    stage === "DIVERSION_ACTIVATED" ||
    stage === "CORRIDOR_ACTIVATED" ||
    stage === "CONGESTION_REDUCED";

  return (
    <>
      {/* 1. Pulsing Congestion radius circle based on score */}
      <Circle
        center={location}
        radius={Math.max(50, activeSnapshot.congestion_score * 5)}
        pathOptions={{
          color: styleConfig.color,
          fillColor: styleConfig.color,
          fillOpacity: 0.15,
          weight: 1.5,
          className: "animate-pulse",
        }}
      />

      {/* 2. Detour Bypass Route Overlay */}
      {showDetour && (
        <Polyline
          positions={detourCoords}
          pathOptions={{
            color: "#f97316", // Detour Orange
            weight: 5,
            opacity: 0.85,
            dashArray: "10, 10",
          }}
        />
      )}

      {/* 3. Replay Stage Marker */}
      <Marker position={location} icon={icon}>
        <Popup>
          <div className="p-1 min-w-[150px]">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {stage.replace("_", " ")}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">
              {activeSnapshot.description}
            </p>
            <div className="mt-2 space-y-0.5 text-[10px] text-slate-700 font-mono">
              <div>Congestion: <span className="font-bold">{activeSnapshot.congestion_score}/100</span></div>
              {activeSnapshot.confidence > 0 && (
                <div>Confidence: <span className="font-bold">{Math.round(activeSnapshot.confidence)}%</span></div>
              )}
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
