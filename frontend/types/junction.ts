export interface Junction {
  id: string;
  name: string;
  lat: number;
  lng: number;
  road_type: string;
}

export interface JunctionSummary {
  junction_id: string;
  junction_name: string;
  health_score: number;
  risk_category: string;
  incident_count: number;
  top_incident_cause: string;
  peak_risk_hours: string;
  avg_clearance_time_minutes: number;
  hospital_impact: string;
}

export interface JunctionHealth {
  junction_id: string;
  health_score: number;
  risk_category: string;
}
