"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useMapStore } from "@/store/useMapStore";
import { useSimulationStore } from "@/store/useSimulationStore";
import { getJunctionSummary } from "@/lib/api/junctions";
import { getStatusHex } from "@/lib/statusColors";
import {
  JunctionHoverCard,
  JunctionHoverCardSkeleton,
} from "@/components/map/JunctionHoverCard";
import type { Junction, JunctionSummary } from "@/types/junction";

interface JunctionMarkerProps {
  junction: Junction;
}

/** Debounce delay in ms before triggering the hover fetch. */
const HOVER_DEBOUNCE_MS = 150;

export function JunctionMarker({ junction }: JunctionMarkerProps) {
  const selectedJunctionId = useMapStore((state) => state.selectedJunctionId);
  const setSelectedJunctionId = useMapStore(
    (state) => state.setSelectedJunctionId
  );
  const healthMap = useMapStore((state) => state.healthMap);
  const isSelected = selectedJunctionId === junction.id;

  const health = healthMap[junction.id];
  const riskCategory = health?.risk_category || "moderate"; // Fallback to moderate if loading
  const fillColor = getStatusHex(riskCategory);
  const isCritical = riskCategory === "critical";

  // --- Simulation logic ---
  const activeSimulations = useSimulationStore((state) => state.activeSimulations);
  const isSimulated = activeSimulations.some((sim) => 
    sim.affected_junction_ids.includes(junction.id)
  );

  // --- Hover interaction logic ---
  const [isHovered, setIsHovered] = useState(false);
  const [summary, setSummary] = useState<JunctionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs to manage debounce timer and fetch cancellation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0);

  // The custom Leaflet icon
  const markerIcon = useMemo(() => {
    let classes = `flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.5px] border-white transition-transform hover:scale-125`;
    if (isSelected) classes += " ring-2 ring-white ring-offset-2 ring-offset-base";
    if (isCritical) classes += " animate-critical-pulse";
    if (isSimulated) classes += " outline-dashed outline-2 outline-white/70 outline-offset-2";
    
    // HTML string interpolation for Leaflet
    const htmlString = `
      <div 
        class="relative flex h-5 w-5 items-center justify-center rounded-full transition-transform duration-300 ${isHovered ? "scale-125" : "scale-100"}"
        style="background-color: ${fillColor}; box-shadow: ${isHovered ? `0 0 15px ${fillColor}` : "none"}"
      >
        <button
          type="button"
          class="${classes}"
          style="background-color: ${fillColor}"
          aria-label="${junction.name}"
        ></button>
      </div>
    `;

    return L.divIcon({
      className: "bg-transparent border-none",
      html: htmlString,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
    });
  }, [fillColor, isCritical, isSelected, isSimulated, junction.name, isHovered]);

  const handleMouseEnter = useCallback(() => {
    debounceRef.current = setTimeout(() => {
      setIsHovered(true);
      
      const currentFetchId = ++fetchIdRef.current;
      setIsLoading(true);
      setSummary(null);

      getJunctionSummary(junction.id, true) // pass include_simulated
        .then((data) => {
          if (fetchIdRef.current === currentFetchId) {
            setSummary(data);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (fetchIdRef.current === currentFetchId) {
            console.error("Failed to fetch junction summary:", err);
            setIsLoading(false);
          }
        });
    }, HOVER_DEBOUNCE_MS);
  }, [junction.id]);

  const handleMouseLeave = useCallback(() => {
    // Cancel pending debounce
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Immediately hide
    setIsHovered(false);
    setSummary(null);
    setIsLoading(false);
    // Invalidate any in-flight fetch
    fetchIdRef.current += 1;
  }, []);

  return (
    <Marker
      position={[junction.lat, junction.lng]}
      icon={markerIcon}
      eventHandlers={{
        mouseover: handleMouseEnter,
        mouseout: handleMouseLeave,
        click: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent);
          setSelectedJunctionId(junction.id);
        }
      }}
    >
      {isHovered && (
        <Popup className="junction-leaflet-popup" closeButton={false}>
          {isLoading || !summary ? (
            <JunctionHoverCardSkeleton />
          ) : (
            <JunctionHoverCard summary={summary} />
          )}
        </Popup>
      )}
    </Marker>
  );
}
