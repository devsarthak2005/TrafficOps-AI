"use client";

import { useEffect } from "react";
import { useReplayStore } from "@/store/useReplayStore";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

export default function ReplayControls() {
  const {
    activeReplay,
    isPlaying,
    currentTimeIndex,
    playbackSpeed,
    play,
    pause,
    reset,
    stepForward,
    stepBackward,
    setPlaybackSpeed,
    setCurrentTimeIndex,
  } = useReplayStore();

  const timeline = activeReplay?.timeline || [];
  const maxIdx = timeline.length - 1;

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || !activeReplay) return;

    const baseInterval = 2000; // 2 seconds per stage at 1x speed
    const intervalTime = baseInterval / playbackSpeed;

    const interval = setInterval(() => {
      if (currentTimeIndex >= maxIdx) {
        pause();
      } else {
        stepForward();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, currentTimeIndex, playbackSpeed, maxIdx, stepForward, pause, activeReplay]);

  if (!activeReplay) return null;

  const currentStage = timeline[currentTimeIndex]?.stage || "UNKNOWN";

  return (
    <div className="flex flex-col gap-3 p-3 bg-slate-950/40 border border-white/5 rounded-lg">
      {/* 1. Timeline Progress Slider */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-slate-500 w-8 select-none">
          {String(currentTimeIndex + 1).padStart(2, "0")} / {String(timeline.length).padStart(2, "0")}
        </span>
        
        <input
          type="range"
          min={0}
          max={maxIdx}
          value={currentTimeIndex}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) setCurrentTimeIndex(val);
          }}
          className="flex-1 h-1.5 rounded-lg bg-slate-800 accent-blue-500 cursor-pointer transition"
        />

        <button
          type="button"
          onClick={reset}
          title="Reset Playback"
          className="p-1 rounded hover:bg-white/5 border border-transparent hover:border-white/10 transition"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>

      {/* 2. Control Actions & Speed Multiplier */}
      <div className="flex items-center justify-between gap-4 mt-0.5">
        {/* Left: Active Stage Name */}
        <div className="text-[10px] text-slate-400 font-mono flex flex-col">
          <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Current Stage</span>
          <span className="font-semibold text-blue-400 tracking-wider">
            {currentStage.replace(/_/g, " ")}
          </span>
        </div>

        {/* Center: Playback Stepper Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stepBackward}
            disabled={currentTimeIndex === 0}
            className="p-1.5 rounded bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={isPlaying ? pause : play}
            className={`p-2.5 rounded-full flex items-center justify-center text-white shadow-lg transition duration-200 ${
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/10"
                : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
            }`}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-white" />
            ) : (
              <Play className="h-4 w-4 fill-white ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={stepForward}
            disabled={currentTimeIndex === maxIdx}
            className="p-1.5 rounded bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Playback Speed Selection */}
        <div className="flex rounded bg-slate-900 border border-slate-800 p-0.5">
          {([0.5, 1, 2, 4] as const).map((speed) => {
            const isActive = playbackSpeed === speed;
            return (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono tracking-wider transition ${
                  isActive
                    ? "bg-slate-800 text-blue-400 border border-slate-700/55 shadow"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
