export interface HealthResponse {
  status: "ok";
  service: string;
}

export type { Junction, JunctionSummary, JunctionHealth } from "./junction";
export type { Incident } from "./incident";
