"use client";

import { Button } from "@/components/ui/button";
import type { BrandTokens, ScenePlan } from "@/types/generation";
import { Film, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const AVAILABLE_SKILLS = [
  "premium-saas-hook",
  "premium-saas-showcase",
  "premium-cursor-engine",
  "premium-team-orbit",
  "premium-camera-zoom",
  "premium-social-proof",
  "premium-cta-scene",
  "premium-kinetic-text",
  "premium-neon-dark",
  "premium-network-intro",
  "premium-feature-list",
] as const;

interface ScenePlanEditorProps {
  scenes: ScenePlan[];
  brand: BrandTokens;
  onConfirm: (editedScenes: ScenePlan[]) => void;
}

export function ScenePlanEditor({
  scenes: initialScenes,
  brand,
  onConfirm,
}: ScenePlanEditorProps) {
  const [localScenes, setLocalScenes] = useState<ScenePlan[]>(initialScenes);

  const handleSceneChange = <K extends keyof ScenePlan>(
    index: number,
    field: K,
    value: ScenePlan[K],
  ) => {
    setLocalScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const handleAddScene = () => {
    const newScene: ScenePlan = {
      id: localScenes.length + 1,
      title: `Scene ${localScenes.length + 1}`,
      prompt: "Describe this scene...",
      skill: "premium-saas-showcase",
      durationInFrames: 180,
    };
    setLocalScenes((prev) => [...prev, newScene]);
  };

  const handleDeleteScene = (index: number) => {
    setLocalScenes((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDuration = localScenes.reduce(
    (sum, s) => sum + s.durationInFrames,
    0,
  );
  const totalSeconds = (totalDuration / 30).toFixed(1);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with brand colors */}
      <div className="px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">Video Plan</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {localScenes.length} scenes · {totalSeconds}s total
            </p>
          </div>
          {/* Brand color swatches */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Brand</span>
            <div className="flex gap-1">
              <div
                className="w-5 h-5 rounded-sm border border-border/30 shadow-sm"
                style={{ backgroundColor: brand.primary }}
                title={`Primary: ${brand.primary}`}
              />
              <div
                className="w-5 h-5 rounded-sm border border-border/30 shadow-sm"
                style={{ backgroundColor: brand.secondary }}
                title={`Secondary: ${brand.secondary}`}
              />
              <div
                className="w-5 h-5 rounded-sm border border-white/10 shadow-sm"
                style={{ backgroundColor: brand.bg }}
                title={`Background: ${brand.bg}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scene list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {localScenes.map((scene, i) => (
          <div
            key={i}
            className="bg-muted/30 border border-border/40 rounded-lg p-3 space-y-2"
          >
            {/* Row 1: index, title, skill, delete */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 text-center">
                {i + 1}
              </span>
              <input
                type="text"
                value={scene.title}
                onChange={(e) => handleSceneChange(i, "title", e.target.value)}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-foreground/40"
                placeholder="Scene title"
              />
              <select
                value={scene.skill}
                onChange={(e) => handleSceneChange(i, "skill", e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
              >
                {AVAILABLE_SKILLS.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill.replace("premium-", "")}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleDeleteScene(i)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Delete scene"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Row 2: duration slider */}
            <div className="flex items-center gap-3 pl-7">
              <label className="text-xs text-muted-foreground shrink-0">
                Duration
              </label>
              <input
                type="range"
                min={100}
                max={400}
                step={10}
                value={scene.durationInFrames}
                onChange={(e) =>
                  handleSceneChange(
                    i,
                    "durationInFrames",
                    parseInt(e.target.value),
                  )
                }
                className="flex-1 accent-foreground"
              />
              <span className="text-xs font-mono text-muted-foreground w-16 text-right shrink-0">
                {scene.durationInFrames}f /{" "}
                {(scene.durationInFrames / 30).toFixed(1)}s
              </span>
            </div>

            {/* Row 3: prompt textarea */}
            <div className="pl-7">
              <textarea
                value={scene.prompt}
                onChange={(e) =>
                  handleSceneChange(i, "prompt", e.target.value)
                }
                rows={2}
                className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-foreground/40 resize-none"
                placeholder="Scene prompt..."
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddScene}
          className="text-muted-foreground hover:text-foreground text-xs h-7 px-2 gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Scene
        </Button>
        <Button
          size="sm"
          onClick={() => onConfirm(localScenes)}
          disabled={localScenes.length === 0}
          className="text-xs h-7 px-4 gap-1.5 bg-teal-600 hover:bg-teal-500 text-white"
        >
          <Film className="w-3.5 h-3.5" />
          Generate Video
        </Button>
      </div>
    </div>
  );
}
