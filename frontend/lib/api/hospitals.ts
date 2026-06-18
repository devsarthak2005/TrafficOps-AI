import { apiFetch } from "@/lib/api";
import type { HospitalStatus, HospitalDetail } from "@/types/hospital";

export async function getHospitalsStatus(includeSimulated: boolean = false): Promise<HospitalStatus[]> {
  const params = new URLSearchParams();
  if (includeSimulated) params.append("include_simulated", "true");
  return apiFetch<HospitalStatus[]>(`/hospitals/status?${params.toString()}`);
}

export async function getHospitalStatus(id: string, includeSimulated: boolean = false): Promise<HospitalDetail> {
  const params = new URLSearchParams();
  if (includeSimulated) params.append("include_simulated", "true");
  return apiFetch<HospitalDetail>(`/hospitals/${id}/status?${params.toString()}`);
}
