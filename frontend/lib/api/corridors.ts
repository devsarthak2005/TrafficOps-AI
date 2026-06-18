import { apiFetch } from "@/lib/api";
import type { Hospital, CorridorResponse, CorridorPlanRequest } from "@/types/corridor";

/**
 * Fetch all available hospitals.
 */
export async function getHospitals(): Promise<Hospital[]> {
  return apiFetch<Hospital[]>("/hospitals");
}

/**
 * Plan emergency corridors between a hospital and an incident junction.
 */
export async function planCorridor(req: CorridorPlanRequest): Promise<CorridorResponse> {
  return apiFetch<CorridorResponse>("/corridors/plan", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
