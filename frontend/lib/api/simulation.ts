import { apiFetch } from "@/lib/api";
import type { Simulation, SimulationRequest } from "@/types/simulation";

export async function startSimulation(req: SimulationRequest): Promise<Simulation> {
  return apiFetch<Simulation>("/simulation/start", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getActiveSimulations(): Promise<Simulation[]> {
  return apiFetch<Simulation[]>("/simulation/active");
}

export async function stopSimulation(id: string): Promise<void> {
  await apiFetch(`/simulation/${id}`, { method: "DELETE" });
}
