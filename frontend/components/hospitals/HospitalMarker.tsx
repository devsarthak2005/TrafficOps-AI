"use client";

import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { renderToString } from "react-dom/server";
import { Cross } from "lucide-react";
import { getStatusHex } from "@/lib/statusColors";
import type { HospitalStatus } from "@/types/hospital";

interface HospitalMarkerProps {
  hospital: HospitalStatus;
}

export function HospitalMarker({ hospital }: HospitalMarkerProps) {
  const fillColor = getStatusHex(hospital.accessibility_band);

  const markerIcon = useMemo(() => {
    const htmlString = renderToString(
      <div 
        className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-white shadow-lg transition-transform hover:scale-110"
        style={{ backgroundColor: fillColor, zIndex: 1000 }}
      >
        <Cross className="h-4 w-4 text-white" strokeWidth={3} />
      </div>
    );

    return L.divIcon({
      className: "bg-transparent border-none",
      html: htmlString,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
  }, [fillColor]);

  return (
    <Marker
      position={[hospital.lat, hospital.lng]}
      icon={markerIcon}
      zIndexOffset={100}
    >
      <Popup className="hospital-popup">
        <div className="p-2 min-w-[200px]">
          <h3 className="font-bold text-sm text-gray-900">{hospital.hospital_name}</h3>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">Accessibility Score</span>
            <span className="font-medium text-sm text-gray-900">{hospital.accessibility_score}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">Band</span>
            <span className="capitalize font-medium text-sm" style={{ color: fillColor }}>
              {hospital.accessibility_band.replace('_', ' ')}
            </span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
