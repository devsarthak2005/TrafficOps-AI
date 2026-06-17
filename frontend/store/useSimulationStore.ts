import { create } from "zustand";
import type { Simulation, SimulationRequest } from "@/types/simulation";
import { getActiveSimulations, startSimulation, stopSimulation } from "@/lib/api/simulation";

interface SimulationState {
  activeSimulations: Simulation[];
  isSimulating: boolean;
  fetchActiveSimulations: () => Promise<void>;
  startSimulation: (req: SimulationRequest) => Promise<void>;
  stopSimulation: (id: string) => Promise<void>;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  activeSimulations: [],
  isSimulating: false,

  fetchActiveSimulations: async () => {
    try {
      const sims = await getActiveSimulations();
      set({ activeSimulations: sims, isSimulating: sims.length > 0 });
    } catch (error) {
      console.error("Failed to fetch active simulations:", error);
    }
  },

  startSimulation: async (req: SimulationRequest) => {
    try {
      const newSim = await startSimulation(req);
      set((state) => ({
        activeSimulations: [newSim], // Enforces 1 active simulation
        isSimulating: true,
      }));
    } catch (error) {
      console.error("Failed to start simulation:", error);
      throw error;
    }
  },

  stopSimulation: async (id: string) => {
    try {
      await stopSimulation(id);
      set((state) => ({
        activeSimulations: state.activeSimulations.filter((s) => s.simulation_id !== id),
        isSimulating: state.activeSimulations.length > 1, // Will be false if 1 was stopped
      }));
    } catch (error) {
      console.error("Failed to stop simulation:", error);
    }
  },
}));
