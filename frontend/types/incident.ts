export interface Incident {
  id: string;
  junction_id: string;
  incident_type: string;
  severity: string;
  timestamp: string;
  weather: string;
  temperature_c: number;
  description: string;
}
