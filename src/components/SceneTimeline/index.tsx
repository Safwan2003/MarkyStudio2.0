"use client";

import { MousePointer2, RefreshCw } from "lucide-react";

const SEGMENT_COLORS = [
  "bg-blue-600/60 hover:bg-blue-600/80",
  "bg-violet-600/60 hover:bg-violet-600/80",
  "bg-teal-600/60 hover:bg-teal-600/80",
  "bg-amber-600/60 hover:bg-amber-600/80",
  "bg-rose-600/60 hover:bg-rose-600/80",
  "bg-indigo-600/60 hover:bg-indigo-600/80",
];

interface SceneTimelineProps {
  scenes: { title: string; durationInFrames: number }[];
  currentFrame: number;
  totalDuration: number;
  fps: number;
  onSeek: (frame: number) => void;
  onRegenerateScene: (index: number) => void;
  regeneratingIndex: number | null;
  hasCursorSteps?: boolean[];
  onEditCursor?: (index: number) => void;
}

export function SceneTimeline({
  scenes,
  currentFrame,
  totalDuration,
  fps,
  onSeek,
  onRegenerateScene,
  regeneratingIndex,
  hasCursorSteps,
  onEditCursor,
}: SceneTimelineProps) {
  if (!scenes.length || !totalDuration) return null;

  const progressPct = (currentFrame / totalDuration) * 100;

  let cumulativeFrames = 0;

  return (
    <div className="px-1 py-2 shrink-0">
      <div className="relative flex h-7 rounded overflow-hidden gap-px group">
        {scenes.map((scene, i) => {
          const startFrame = cumulativeFrames;
          cumulativeFrames += scene.durationInFrames;
          const widthPct = (scene.durationInFrames / totalDuration) * 100;
          const colorClass =
            SEGMENT_COLORS[i % SEGMENT_COLORS.length];

          return (
            <div
              key={i}
              className={`relative flex items-center justify-center cursor-pointer transition-colors ${colorClass}`}
              style={{ width: `${widthPct}%` }}
              onClick={() => onSeek(startFrame)}
              title={`${scene.title} — click to seek`}
            >
              {/* Scene title */}
              <span className="text-[10px] font-medium text-white/80 px-1 truncate select-none">
                {scene.title}
              </span>

              {/* Cursor edit button (shown on hover, when scene has CURSOR_STEPS) */}
              {hasCursorSteps?.[i] && onEditCursor && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCursor(i);
                  }}
                  title="Edit cursor steps"
                  className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white/80 hover:text-white"
                >
                  <MousePointer2 className="w-3 h-3" />
                </button>
              )}

              {/* Regen button (shown on hover) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerateScene(i);
                }}
                disabled={regeneratingIndex !== null}
                title="Regenerate this scene"
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 text-white/80 hover:text-white"
              >
                <RefreshCw
                  className={`w-3 h-3 ${regeneratingIndex === i ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_4px_rgba(255,255,255,0.8)] pointer-events-none"
          style={{ left: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">
          {(currentFrame / fps).toFixed(1)}s
        </span>
        <span className="text-[10px] text-muted-foreground">
          {(totalDuration / fps).toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
