import { apiFetch } from "@/lib/api";
import type { SimilarIncidentsResponse } from "@/types/similar_incident";

export async function getSimilarIncidents(
  incidentId: string,
  topN: number = 5
): Promise<SimilarIncidentsResponse> {
  return apiFetch<SimilarIncidentsResponse>(`/incidents/${incidentId}/similar?top_n=${topN}`);
}
