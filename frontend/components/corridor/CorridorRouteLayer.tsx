"use client";

import { useMemo, useEffect } from "react";
import { Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useCorridorStore } from "@/store/useCorridorStore";

export default function CorridorRouteLayer() {
  const activePlan = useCorridorStore((state) => state.activePlan);
  const activeVariant = useCorridorStore((state) => state.activeVariant);
  const map = useMap();

  const route = activePlan?.routes[activeVariant];

  // Convert GeoJSON [lng, lat] coordinates to Leaflet [lat, lng] format
  const leafletCoords = useMemo(() => {
    if (!route?.geometry?.coordinates) return [];
    return route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [route]);

  // Automatically fit map bounds to the route coordinates when a new plan is loaded
  useEffect(() => {
    if (leafletCoords.length > 0 && map) {
      const bounds = L.latLngBounds(leafletCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [leafletCoords, map]);

  if (!activePlan || leafletCoords.length === 0) return null;

  // Custom styling per route variant
  let polylineOptions: L.PolylineOptions = {};
  if (activeVariant === "protected") {
    polylineOptions = {
      color: "#22c55e", // Bright Green
      weight: 5,
    };
  } else if (activeVariant === "fastest") {
    polylineOptions = {
      color: "#3b82f6", // Blue
      weight: 3,
      dashArray: "6, 6",
    };
  } else if (activeVariant === "safest") {
    polylineOptions = {
      color: "#f59e0b", // Amber
      weight: 3,
      dashArray: "6, 6",
    };
  }

  // Hospital Start Icon (Red Circular Badge)
  const hospitalIcon = L.divIcon({
    html: `
      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 border-[1.5px] border-white text-white font-extrabold text-[10px] shadow-lg shadow-black/50 select-none">
        H
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  // Incident End Icon (Emerald Circular Badge)
  const incidentIcon = L.divIcon({
    html: `
      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-[1.5px] border-white text-white font-extrabold text-[10px] shadow-lg shadow-black/50 select-none animate-pulse">
        !
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  const startCoord = leafletCoords[0];
  const endCoord = leafletCoords[leafletCoords.length - 1];

  return (
    <>
      {/* Render route polyline */}
      <Polyline positions={leafletCoords} {...polylineOptions} />

      {/* Render Start Marker (Hospital) */}
      <Marker position={startCoord} icon={hospitalIcon}>
        <Popup>
          <div className="p-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Origin</span>
            <span className="text-xs font-semibold text-slate-900">{activePlan.hospital_name}</span>
          </div>
        </Popup>
      </Marker>

      {/* Render End Marker (Incident Junction) */}
      <Marker position={endCoord} icon={incidentIcon}>
        <Popup>
          <div className="p-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Destination</span>
            <span className="text-xs font-semibold text-slate-900">{activePlan.incident_junction_name}</span>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
