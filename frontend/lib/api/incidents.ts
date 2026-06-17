import { apiFetch } from "@/lib/api";
import type { Incident } from "@/types/incident";

export interface GetIncidentsParams {
  junction_id?: string;
  incident_type?: string;
  since?: string;
}

export async function getIncidents(
  params?: GetIncidentsParams
): Promise<Incident[]> {
  const searchParams = new URLSearchParams();
  if (params?.junction_id) searchParams.set("junction_id", params.junction_id);
  if (params?.incident_type)
    searchParams.set("incident_type", params.incident_type);
  if (params?.since) searchParams.set("since", params.since);

  const query = searchParams.toString();
  const path = query ? `/incidents?${query}` : "/incidents";
  return apiFetch<Incident[]>(path);
}
