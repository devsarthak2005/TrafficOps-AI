export interface SimulationRequest {
  event_type: "festival" | "political_rally" | "accident" | "breakdown" | "construction" | "water_logging";
  target_type: "junction" | "zone";
  target_id: string;
  intensity: "low" | "medium" | "high";
}

export interface Simulation {
  simulation_id: string;
  event_type: string;
  target_type: string;
  target_id: string;
  intensity: string;
  started_at: string;
  duration_minutes: number;
  expires_at: string;
  affected_junction_ids: string[];
}
