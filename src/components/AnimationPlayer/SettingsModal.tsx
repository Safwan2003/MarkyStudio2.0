"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

interface SettingsModalProps {
  durationInFrames: number;
  onDurationChange: (duration: number) => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  qualityMode?: boolean;
  onQualityModeChange?: (enabled: boolean) => void;
}

export function SettingsModal({
  durationInFrames,
  onDurationChange,
  fps,
  onFpsChange,
  qualityMode = false,
  onQualityModeChange,
}: SettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [localDuration, setLocalDuration] = useState(String(durationInFrames));
  const [localFps, setLocalFps] = useState(String(fps));

  // Sync local state when props change
  useEffect(() => {
    setLocalDuration(String(durationInFrames));
    setLocalFps(String(fps));
  }, [durationInFrames, fps]);

  const handleDurationBlur = () => {
    const parsed = parseInt(localDuration);
    if (isNaN(parsed) || parsed < 1) {
      setLocalDuration(String(durationInFrames));
    } else {
      const clamped = Math.min(1000, Math.max(1, parsed));
      setLocalDuration(String(clamped));
      onDurationChange(clamped);
    }
  };

  const handleFpsBlur = () => {
    const parsed = parseInt(localFps);
    if (isNaN(parsed) || parsed < 1) {
      setLocalFps(String(fps));
    } else {
      const clamped = Math.min(60, Math.max(1, parsed));
      setLocalFps(String(clamped));
      onFpsChange(clamped);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background-elevated border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure your animation settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <h3 className="text-sm font-medium text-foreground">Animation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label
                  htmlFor="duration"
                  className="text-muted-foreground text-sm"
                >
                  Duration (frames)
                </label>
                <input
                  id="duration"
                  type="number"
                  min={1}
                  max={1000}
                  value={localDuration}
                  onChange={(e) => setLocalDuration(e.target.value)}
                  onBlur={handleDurationBlur}
                  className="w-full px-3 py-2 rounded border border-border bg-input text-foreground text-sm font-sans focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="fps" className="text-muted-foreground text-sm">
                  FPS
                </label>
                <input
                  id="fps"
                  type="number"
                  min={1}
                  max={60}
                  value={localFps}
                  onChange={(e) => setLocalFps(e.target.value)}
                  onBlur={handleFpsBlur}
                  className="w-full px-3 py-2 rounded border border-border bg-input text-foreground text-sm font-sans focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground-dim">
              Video length: {(durationInFrames / fps).toFixed(2)}s (
              {durationInFrames} frames / {fps} FPS)
            </p>
          </div>

          {onQualityModeChange && (
            <div className="grid gap-3">
              <h3 className="text-sm font-medium text-foreground">Quality</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Auto quality check</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    After generation, AI reviews the result and auto-fixes visual issues (~10s)
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={qualityMode}
                  onClick={() => onQualityModeChange(!qualityMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    qualityMode ? "bg-teal-600" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                      qualityMode ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
