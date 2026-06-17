"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { useSimulationStore } from "@/store/useSimulationStore";

const BASE_HEATMAP_URL = "http://localhost:8000/heatmap/incidents.geojson";

export function HeatmapLayer() {
  const map = useMap();
  const activeSimulations = useSimulationStore((state) => state.activeSimulations);
  const isSimulating = activeSimulations.length > 0;
  
  useEffect(() => {
    let heatLayer: L.HeatLayer | null = null;
    let cancelled = false;

    // Bust cache when simulation state changes
    const simHash = isSimulating ? activeSimulations[0].simulation_id : "none";
    const url = `${BASE_HEATMAP_URL}?include_simulated=true&t=${simHash}`;

    fetch(url)
      .then(res => res.json())
      .then((geojson) => {
        if (cancelled) return;

        // Convert GeoJSON Features to Leaflet Heatmap points: [lat, lng, intensity]
        const points = geojson.features.map((f: any) => [
          f.geometry.coordinates[1], // lat
          f.geometry.coordinates[0], // lng
          f.properties.weight * 0.2  // scale weight to intensity [0-1] roughly
        ]) as [number, number, number][];

        // L.heatLayer is added to global L by leaflet.heat
        heatLayer = (L as any).heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 15,
          gradient: {
            0.2: "rgba(33,102,172,0.6)",
            0.5: "rgba(253,219,199,0.7)",
            0.8: "rgba(239,138,98,0.8)",
            1.0: "rgba(178,24,43,0.9)"
          }
        }).addTo(map);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      if (heatLayer && map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, isSimulating, activeSimulations]);

  return null;
}
