import { apiFetch } from "@/lib/api";
import type { ZoneStatus } from "@/types/zone";

export async function getZoneStatus(includeSimulated: boolean = false): Promise<ZoneStatus[]> {
  const params = new URLSearchParams();
  if (includeSimulated) params.append("include_simulated", "true");
  return apiFetch<ZoneStatus[]>(`/zones/status?${params.toString()}`);
}
