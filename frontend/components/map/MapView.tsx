"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { JunctionMarker } from "@/components/map/JunctionMarker";
import { bengaluruViewState, OSM_DARK_TILES, OSM_ATTRIBUTION } from "@/components/map/mapConfig";
import { useMapStore } from "@/store/useMapStore";
import { getJunctions } from "@/lib/api/junctions";

import { HeatmapLayer } from "@/components/map/HeatmapLayer";
import { useSimulationStore } from "@/store/useSimulationStore";

export function MapView() {
  const junctions = useMapStore((state) => state.junctions);
  const setJunctions = useMapStore((state) => state.setJunctions);
  const setMapInstance = useMapStore((state) => state.setMapInstance);

  const fetchHealthSummary = useMapStore((state) => state.fetchHealthSummary);
  const isSimulating = useSimulationStore((state) => state.isSimulating);

  useEffect(() => {
    async function load() {
      try {
        const data = await getJunctions();
        setJunctions(data);
        await fetchHealthSummary();
      } catch (err) {
        console.error("Failed to load map data:", err);
      }
    }
    load();
  }, [setJunctions, fetchHealthSummary]);

  // Re-fetch health summary when simulation state changes
  useEffect(() => {
    fetchHealthSummary();
  }, [isSimulating, fetchHealthSummary]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden z-0">
      <MapContainer
        center={bengaluruViewState.center}
        zoom={bengaluruViewState.zoom}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full bg-[#0a0a0a]"
        ref={setMapInstance}
      >
        <TileLayer
          url={OSM_DARK_TILES}
          attribution={OSM_ATTRIBUTION}
        />
        
        <HeatmapLayer />

        {junctions.map((junction) => (
          <JunctionMarker key={junction.id} junction={junction} />
        ))}
      </MapContainer>
    </div>
  );
}
