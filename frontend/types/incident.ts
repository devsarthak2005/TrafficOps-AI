export interface Incident {
  id: string;
  junction_id: string;
  incident_type: string;
  severity: string;
  timestamp: string;
  closed_datetime?: string | null;
  resolved_datetime?: string | null;
  weather: string;
  temperature_c: number;
  description: string;
}
