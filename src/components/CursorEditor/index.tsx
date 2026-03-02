"use client";

import { Button } from "@/components/ui/button";
import type { CursorStep } from "@/hooks/useCursorSteps";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface UIElement {
  label: string;
  x: number;
  y: number;
}

interface CursorEditorProps {
  steps: CursorStep[];
  onStepsChange: (steps: CursorStep[]) => void;
  durationInFrames: number;
  fps: number;
  preloadedImage?: string;
}

const ACTION_OPTIONS: CursorStep["action"][] = ["click", "hover", "move", "none"];

export function CursorEditor({
  steps,
  onStepsChange,
  durationInFrames,
  fps,
  preloadedImage,
}: CursorEditorProps) {
  const [localSteps, setLocalSteps] = useState<CursorStep[]>(steps);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when external code changes cause steps to update
  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  const handleStepChange = (index: number, field: keyof CursorStep, value: unknown) => {
    const updated = localSteps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step,
    );
    setLocalSteps(updated);
  };

  const handleAddStep = () => {
    const newStep: CursorStep = {
      time: Math.round(durationInFrames / 2),
      x: 0.5,
      y: 0.5,
      action: "click",
      label: `Step ${localSteps.length + 1}`,
    };
    setLocalSteps([...localSteps, newStep]);
  };

  const handleDeleteStep = (index: number) => {
    setLocalSteps(localSteps.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    onStepsChange(localSteps);
  };

  const runVisionDetect = async (imageBase64: string) => {
    setIsDetecting(true);
    setDetectError(null);

    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Vision API failed");
      }

      const { elements }: { elements: UIElement[] } = await response.json();

      if (!elements || elements.length === 0) {
        setDetectError("No interactive elements detected in the screenshot.");
        return;
      }

      // Map elements to evenly-spaced cursor steps
      const spacing = Math.floor(durationInFrames / (elements.length + 1));
      const newSteps: CursorStep[] = elements.map((el, i) => ({
        time: spacing * (i + 1),
        x: Math.max(0, Math.min(1, el.x)),
        y: Math.max(0, Math.min(1, el.y)),
        action: "click" as const,
        label: el.label,
      }));

      setLocalSteps(newSteps);
    } catch (err) {
      setDetectError(
        err instanceof Error ? err.message : "Failed to detect elements",
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await runVisionDetect(base64);
    } catch (err) {
      setDetectError(
        err instanceof Error ? err.message : "Failed to read file",
      );
    } finally {
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDetectFromAttached = async () => {
    if (!preloadedImage) return;
    await runVisionDetect(preloadedImage);
  };

  const totalSeconds = (durationInFrames / fps).toFixed(1);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div>
          <h3 className="text-sm font-medium text-foreground">Cursor Steps</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {localSteps.length} step{localSteps.length !== 1 ? "s" : ""} · {totalSeconds}s total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {preloadedImage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDetectFromAttached}
              disabled={isDetecting}
              className="text-teal-500 hover:text-teal-400 text-xs h-7 px-2 gap-1.5"
              title="Auto-detect UI elements from the attached image"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {isDetecting ? "Detecting..." : "Detect from Attached Image"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDetecting}
            className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 gap-1.5"
            title="Upload a screenshot to auto-detect UI elements"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {isDetecting ? "..." : "Detect from Screenshot"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {detectError && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive text-xs shrink-0">
          {detectError}
        </div>
      )}

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {localSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p className="text-sm">No cursor steps defined.</p>
            <p className="text-xs mt-1">Add a step or upload a screenshot to auto-detect.</p>
          </div>
        ) : (
          localSteps.map((step, i) => (
            <div
              key={i}
              className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-2"
            >
              {/* Step header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteStep(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete step"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Label */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Label</label>
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => handleStepChange(i, "label", e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-foreground/40"
                />
              </div>

              {/* Time + Action row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Time (frame)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={durationInFrames}
                    value={step.time}
                    onChange={(e) =>
                      handleStepChange(i, "time", parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-foreground/40"
                  />
                  <input
                    type="range"
                    min={0}
                    max={durationInFrames}
                    value={step.time}
                    onChange={(e) =>
                      handleStepChange(i, "time", parseInt(e.target.value))
                    }
                    className="w-full mt-1 accent-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Action</label>
                  <select
                    value={step.action}
                    onChange={(e) =>
                      handleStepChange(i, "action", e.target.value as CursorStep["action"])
                    }
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                  >
                    {ACTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* X slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-muted-foreground">X position</label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {step.x.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={step.x}
                  onChange={(e) =>
                    handleStepChange(i, "x", parseFloat(e.target.value))
                  }
                  className="w-full accent-foreground"
                />
              </div>

              {/* Y slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Y position</label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {step.y.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={step.y}
                  onChange={(e) =>
                    handleStepChange(i, "y", parseFloat(e.target.value))
                  }
                  className="w-full accent-foreground"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddStep}
          className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Step
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          className="text-xs h-7 px-3"
        >
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
