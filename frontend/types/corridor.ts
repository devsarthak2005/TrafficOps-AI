export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RouteVariant {
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // Array of [lng, lat]
  };
  duration_minutes: number;
  label: string;
  note?: string;
  resource_note?: string;
}

export interface CorridorRoutes {
  fastest: RouteVariant;
  safest: RouteVariant;
  protected: RouteVariant;
}

export interface CorridorResponse {
  hospital_id: string;
  hospital_name: string;
  incident_junction_id: string;
  incident_junction_name: string;
  is_approximate: boolean;
  routes: CorridorRoutes;
}

export interface CorridorPlanRequest {
  hospital_id: string;
  incident_junction_id: string;
}
