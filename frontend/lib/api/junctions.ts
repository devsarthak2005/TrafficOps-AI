import { apiFetch } from "@/lib/api";
import type { Junction, JunctionSummary, JunctionHealth } from "@/types/junction";

export async function getJunctions(): Promise<Junction[]> {
  return apiFetch<Junction[]>("/junctions");
}

export async function getJunctionSummary(id: string, includeSimulated: boolean = false): Promise<JunctionSummary> {
  const params = new URLSearchParams();
  if (includeSimulated) params.append("include_simulated", "true");
  return apiFetch<JunctionSummary>(`/junctions/${id}/summary?${params.toString()}`);
}

export async function getHealthSummary(includeSimulated: boolean = false): Promise<JunctionHealth[]> {
  const params = new URLSearchParams();
  if (includeSimulated) params.append("include_simulated", "true");
  return apiFetch<JunctionHealth[]>(`/junctions/health-summary?${params.toString()}`);
}
