"use client";

import { useEffect, useMemo } from "react";
import { Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useDiversionStore } from "@/store/useDiversionStore";

export default function DiversionRouteLayer() {
  const map = useMap();
  const { plan, selectedRouteId } = useDiversionStore();

  const routes = plan?.routes || [];

  // Automatically fit map bounds to the selected route (or the entire set of routes)
  useEffect(() => {
    if (routes.length === 0 || !map) return;

    // Find the active selected route coordinates, or fallback to all coordinates
    const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (activeRoute && activeRoute.path.length > 0) {
      const bounds = L.latLngBounds(activeRoute.path);
      // Extend bounds to cover other routes just in case
      routes.forEach((r) => {
        r.path.forEach((pt) => bounds.extend(pt));
      });
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [plan, selectedRouteId, routes, map]);

  if (routes.length === 0) return null;

  // Custom icons for start and end
  const startIcon = L.divIcon({
    html: `
      <div class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 border-2 border-white text-white font-extrabold text-[9px] shadow-lg shadow-black/50 select-none animate-pulse">
        S
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const endIcon = L.divIcon({
    html: `
      <div class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 border-2 border-white text-white font-extrabold text-[9px] shadow-lg shadow-black/50 select-none">
        E
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Get common start and end coordinates
  const firstRoute = routes[0];
  const startCoord = firstRoute.path[0];
  const endCoord = firstRoute.path[firstRoute.path.length - 1];

  return (
    <>
      {routes.map((route) => {
        const isSelected = selectedRouteId === route.id;
        const hasSelection = selectedRouteId !== null;

        // Color coding: Green = Primary, Orange = Secondary, Red = Emergency
        let color = "#22c55e"; // default green
        if (route.id === "secondary") {
          color = "#f97316"; // Orange
        } else if (route.id === "emergency") {
          color = "#ef4444"; // Red
        }

        // Thick full opacity line if selected; thin faded line if not selected
        const opacity = hasSelection ? (isSelected ? 0.95 : 0.25) : 0.8;
        const weight = hasSelection ? (isSelected ? 6 : 3) : 4;
        const dashArray = route.id === "emergency" ? "5, 5" : undefined;

        return (
          <Polyline
            key={route.id}
            positions={route.path}
            pathOptions={{
              color,
              weight,
              opacity,
              dashArray,
              interactive: true,
            }}
          >
            <Popup>
              <div className="p-1 min-w-[120px]">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {route.name}
                </h4>
                <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                  <div>Distance: <span className="font-semibold text-slate-900">{route.distance}</span></div>
                  <div>Travel Time: <span className="font-semibold text-slate-900">{route.travel_time}</span></div>
                  <div>Congestion Score: <span className="font-semibold text-slate-900">{route.congestion_score}/100</span></div>
                  <div>Route Score: <span className="font-semibold text-slate-900">{route.route_score}/100</span></div>
                  {route.recommended && (
                    <span className="mt-1 inline-block rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700">
                      ★ Recommended Route
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {startCoord && (
        <Marker position={startCoord} icon={startIcon}>
          <Popup>
            <div className="p-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Diversion Point</span>
              <span className="text-xs font-semibold text-slate-900">Traffic origin redirection start</span>
            </div>
          </Popup>
        </Marker>
      )}

      {endCoord && (
        <Marker position={endCoord} icon={endIcon}>
          <Popup>
            <div className="p-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Merge Point</span>
              <span className="text-xs font-semibold text-slate-900">Redirection convergence zone</span>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
