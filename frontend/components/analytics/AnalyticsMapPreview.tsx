"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { JunctionMarker } from "@/components/map/JunctionMarker";
import { HeatmapLayer } from "@/components/map/HeatmapLayer";
import { bengaluruViewState, OSM_DARK_TILES, OSM_ATTRIBUTION } from "@/components/map/mapConfig";
import { useMapStore } from "@/store/useMapStore";
import { getJunctions } from "@/lib/api/junctions";

export function AnalyticsMapPreview() {
  const junctions = useMapStore((state) => state.junctions);
  const setJunctions = useMapStore((state) => state.setJunctions);
  const fetchHealthSummary = useMapStore((state) => state.fetchHealthSummary);

  useEffect(() => {
    async function load() {
      try {
        if (junctions.length === 0) {
          const data = await getJunctions();
          setJunctions(data);
        }
        await fetchHealthSummary();
      } catch (err) {
        console.error("Failed to load analytics map preview:", err);
      }
    }
    load();
  }, [junctions, setJunctions, fetchHealthSummary]);

  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer
        center={bengaluruViewState.center}
        zoom={11.0}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full bg-[#0a0a0a]"
      >
        <TileLayer
          url={OSM_DARK_TILES}
          attribution={OSM_ATTRIBUTION}
        />
        
        {/* Heatmap overlay for spatial analytical visual */}
        <HeatmapLayer />
        
        {junctions.map((junction) => (
          <JunctionMarker key={`analytics-${junction.id}`} junction={junction} />
        ))}
      </MapContainer>
    </div>
  );
}
export default AnalyticsMapPreview;
