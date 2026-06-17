import { create } from "zustand";

export type AppState = Record<string, never>;

export const useAppStore = create<AppState>(() => ({}));
