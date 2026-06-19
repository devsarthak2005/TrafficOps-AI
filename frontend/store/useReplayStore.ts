import { create } from "zustand";

export interface TimelineSnapshot {
  timestamp: string;
  stage: string;
  location: [number, number];
  severity: string;
  congestion_score: number;
  confidence: number;
  description: string;
}

export interface PredictionAudit {
  predicted_impact: string;
  actual_outcome: string;
  confidence: number;
  success_indicator: string;
}

export interface ResourceEffectiveness {
  officers_deployed: number;
  estimated_delay_reduction: string;
  diversion_success: string;
}

export interface ReplayDetail {
  event_id: string;
  event_type: string;
  location: [number, number];
  title: string;
  severity: string;
  created_at: string;
  timeline: TimelineSnapshot[];
  prediction_audit: PredictionAudit;
  resource_effectiveness: ResourceEffectiveness;
  learning_insight: string;
}

export interface ReplaySummary {
  event_id: string;
  title: string;
  severity: string;
  created_at: string;
}

interface ReplayState {
  activeReplay: ReplayDetail | null;
  historyList: ReplaySummary[];
  isPlaying: boolean;
  currentTimeIndex: number;
  playbackSpeed: number;
  isFetching: boolean;
  error: string | null;
  
  fetchHistory: () => Promise<void>;
  fetchReplay: (eventId: string) => Promise<ReplayDetail>;
  play: () => void;
  pause: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTimeIndex: (idx: number) => void;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  activeReplay: null,
  historyList: [],
  isPlaying: false,
  currentTimeIndex: 0,
  playbackSpeed: 1,
  isFetching: false,
  error: null,

  fetchHistory: async () => {
    set({ isFetching: true, error: null });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/replay`);
      if (!res.ok) throw new Error("Failed to fetch replay history list");
      const data: ReplaySummary[] = await res.json();
      set({ historyList: data, isFetching: false });
    } catch (err: any) {
      console.error(err);
      set({ error: err.message || "Failed to load history list", isFetching: false });
    }
  },

  fetchReplay: async (eventId) => {
    set({ isFetching: true, error: null, isPlaying: false, currentTimeIndex: 0 });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/replay/${eventId}`);
      if (!res.ok) throw new Error("Failed to fetch detailed event replay");
      const data: ReplayDetail = await res.json();
      set({ activeReplay: data, isFetching: false });
      return data;
    } catch (err: any) {
      console.error(err);
      set({ error: err.message || "Failed to load replay details", isFetching: false });
      throw err;
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  reset: () => set({ currentTimeIndex: 0, isPlaying: false }),
  
  stepForward: () => {
    const { activeReplay, currentTimeIndex } = get();
    if (!activeReplay) return;
    if (currentTimeIndex < activeReplay.timeline.length - 1) {
      set({ currentTimeIndex: currentTimeIndex + 1 });
    }
  },

  stepBackward: () => {
    const { currentTimeIndex } = get();
    if (currentTimeIndex > 0) {
      set({ currentTimeIndex: currentTimeIndex - 1 });
    }
  },

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setCurrentTimeIndex: (currentTimeIndex) => set({ currentTimeIndex }),
}));
