"use client";

import { useReplayStore } from "@/store/useReplayStore";

export default function ReplayConfidenceChart() {
  const { activeReplay, currentTimeIndex } = useReplayStore();

  if (!activeReplay || !activeReplay.timeline.length) return null;

  const timeline = activeReplay.timeline;
  const n = timeline.length;

  const width = 360;
  const height = 90;
  const paddingX = 15;
  const paddingY = 12;

  // Helpers to map value to coordinates
  const getX = (idx: number) => {
    if (n <= 1) return paddingX;
    return paddingX + (idx / (n - 1)) * (width - 2 * paddingX);
  };

  const getY = (val: number) => {
    // scale 0-100 to y coordinates (svg 0 is top, so we invert)
    const chartHeight = height - 2 * paddingY;
    return height - paddingY - (val / 100) * chartHeight;
  };

  // Build SVG Path strings
  let congestionPath = "";
  let confidencePath = "";

  timeline.forEach((snapshot, idx) => {
    const x = getX(idx);
    const yCong = getY(snapshot.congestion_score);
    const yConf = getY(snapshot.confidence);

    if (idx === 0) {
      congestionPath = `M ${x} ${yCong}`;
      confidencePath = `M ${x} ${yConf}`;
    } else {
      congestionPath += ` L ${x} ${yCong}`;
      confidencePath += ` L ${x} ${yConf}`;
    }
  });

  // Current values
  const activeSnapshot = timeline[currentTimeIndex];
  const curCong = activeSnapshot?.congestion_score ?? 0;
  const curConf = activeSnapshot?.confidence ?? 0;
  const trackerX = getX(currentTimeIndex);

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-950/40 border border-white/5 rounded-lg select-none">
      {/* Title & Legend */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Trend Tracking Analysis
        </h4>
        
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="text-slate-400">Congestion:</span>
            <span className="font-bold text-red-400">{curCong}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-slate-400">Confidence:</span>
            <span className="font-bold text-blue-400">{Math.round(curConf)}%</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative border border-white/[0.03] rounded bg-white/[0.01]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines (25%, 50%, 75%) */}
          {[25, 50, 75].map((level) => (
            <line
              key={level}
              x1={paddingX}
              y1={getY(level)}
              x2={width - paddingX}
              y2={getY(level)}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="4, 4"
            />
          ))}

          {/* Paths */}
          {n > 1 && (
            <>
              {/* Congestion Line */}
              <path
                d={congestionPath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
              
              {/* Confidence Line */}
              <path
                d={confidencePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            </>
          )}

          {/* Active step vertical line */}
          <line
            x1={trackerX}
            y1={paddingY - 4}
            x2={trackerX}
            y2={height - paddingY + 4}
            stroke="rgba(59,130,246,0.3)"
            strokeWidth="1"
            strokeDasharray="3, 3"
            className="transition-all duration-300"
          />

          {/* Data Points and Tracking Dots */}
          {timeline.map((_, idx) => {
            const x = getX(idx);
            const isCurrent = idx === currentTimeIndex;
            return (
              <g key={idx}>
                {/* Active trackers */}
                {isCurrent && (
                  <>
                    {/* Congestion Dot Glow */}
                    <circle
                      cx={x}
                      cy={getY(timeline[idx].congestion_score)}
                      r="6"
                      fill="rgba(239, 68, 68, 0.2)"
                      className="animate-ping"
                    />
                    {/* Congestion Dot */}
                    <circle
                      cx={x}
                      cy={getY(timeline[idx].congestion_score)}
                      r="3.5"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />

                    {/* Confidence Dot Glow */}
                    {timeline[idx].confidence > 0 && (
                      <>
                        <circle
                          cx={x}
                          cy={getY(timeline[idx].confidence)}
                          r="6"
                          fill="rgba(59, 130, 246, 0.2)"
                          className="animate-ping"
                        />
                        {/* Confidence Dot */}
                        <circle
                          cx={x}
                          cy={getY(timeline[idx].confidence)}
                          r="3.5"
                          fill="#3b82f6"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                      </>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
