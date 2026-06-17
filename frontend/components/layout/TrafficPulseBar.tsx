"use client";

import { useEffect, useState } from "react";
import { getZoneStatus } from "@/lib/api/zones";
import type { ZoneStatus } from "@/types/zone";
import { getStatusHex } from "@/lib/statusColors";
import { useSimulationStore } from "@/store/useSimulationStore";
import { useMapStore } from "@/store/useMapStore";

// Static mapping of zone centers for the flyTo action
const ZONE_CENTERS: Record<string, { lat: number; lng: number }> = {
  North: { lat: 13.0358, lng: 77.5970 }, // Near Hebbal
  East: { lat: 13.0095, lng: 77.6958 },  // Near KR Puram
  Central: { lat: 12.9754, lng: 77.6095 }, // Near MG Road
  South: { lat: 12.9176, lng: 77.6229 },  // Near Silk Board
};

export function TrafficPulseBar() {
  const [zones, setZones] = useState<ZoneStatus[]>([]);
  const map = useMapStore((state) => state.mapInstance);
  const isSimulating = useSimulationStore((state) => state.isSimulating);

  useEffect(() => {
    let cancelled = false;
    getZoneStatus(true) // include_simulated = true
      .then((data) => {
        if (!cancelled) setZones(data);
      })
      .catch((err) => console.error("Failed to fetch zone status:", err));

    return () => {
      cancelled = true;
    };
  }, [isSimulating]);

  const handleZoneClick = (zoneName: string) => {
    const center = ZONE_CENTERS[zoneName];
    if (center && map) {
      map.flyTo([center.lat, center.lng], 13.5, {
        duration: 1.5,
      });
    }
  };

  return (
    <div className="flex h-10 w-full items-center justify-center gap-4 bg-panel border-b border-white/5 z-[400]">
      {zones.map((zone) => {
        const color = getStatusHex(zone.risk_category);
        return (
          <button
            key={zone.zone_name}
            type="button"
            onClick={() => handleZoneClick(zone.zone_name)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 transition-all hover:bg-white/10"
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[13px] font-medium tracking-wide text-white">
              {zone.zone_name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
