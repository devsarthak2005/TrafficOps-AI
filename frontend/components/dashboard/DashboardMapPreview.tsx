"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { JunctionMarker } from "@/components/map/JunctionMarker";
import { bengaluruViewState, OSM_DARK_TILES, OSM_ATTRIBUTION } from "@/components/map/mapConfig";
import { useMapStore } from "@/store/useMapStore";
import { getJunctions } from "@/lib/api/junctions";

export function DashboardMapPreview() {
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
        console.error("Failed to load map preview:", err);
      }
    }
    load();
  }, [junctions, setJunctions, fetchHealthSummary]);

  return (
    <div className="h-full w-full z-0 relative">
      <MapContainer
        center={bengaluruViewState.center}
        zoom={11.0} // slightly zoomed out for thumbnail preview
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full bg-[#0a0a0a]"
      >
        <TileLayer
          url={OSM_DARK_TILES}
          attribution={OSM_ATTRIBUTION}
        />
        
        {junctions.map((junction) => (
          <JunctionMarker key={`dash-${junction.id}`} junction={junction} />
        ))}
      </MapContainer>
    </div>
  );
}
