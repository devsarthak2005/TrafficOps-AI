export interface ResourceUtilization {
  label: string;
  pct: number;
  desc: string;
}

export interface ZoneRisk {
  zone: string;
  risk: number;
}

export interface IncidentTypeStat {
  name: string;
  count: number;
  pct: number;
}

export interface CityHotspot {
  zone_name: string;
  simulation_count: number;
}

export interface CityIntelligence {
  highest_risk_zone: string;
  highest_risk_zone_pct: number;
  worst_junction: string;
  worst_junction_category: string;
  total_incidents: number;
  active_simulation_hotspots: CityHotspot[];
  active_simulation_count: number;
}

export interface DashboardStats {
  incident_type_distribution: IncidentTypeStat[];
  hourly_incident_distribution: number[];
  avg_clearance_minutes: number;
  avg_response_time_minutes?: number;
  ml_accuracy_pct: number;
  resource_utilization: ResourceUtilization[];
  zone_risk_levels: ZoneRisk[];
  city_intelligence: CityIntelligence;
}
