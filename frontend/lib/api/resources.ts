import { apiFetch } from "@/lib/api";
import type { ResourceRecommendation } from "@/types/resource";

/**
 * Fetch resource recommendations for a given junction.
 * This reflects active simulations immediately.
 */
export async function getJunctionResources(junctionId: string): Promise<ResourceRecommendation> {
  return apiFetch<ResourceRecommendation>(`/junctions/${junctionId}/resources`);
}
