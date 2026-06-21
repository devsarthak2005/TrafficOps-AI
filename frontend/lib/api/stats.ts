import { apiFetch } from "@/lib/api";
import type { DashboardStats, CityIntelligence } from "@/types/stats";

export function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>("/api/stats/overview");
}

export function getCityIntelligence(): Promise<CityIntelligence> {
  return apiFetch<CityIntelligence>("/api/stats/city-intelligence");
}
