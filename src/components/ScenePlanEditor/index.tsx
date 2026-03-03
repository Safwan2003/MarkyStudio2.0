"use client";

import { Button } from "@/components/ui/button";
import type { BrandTokens, CursorWaypoint, ScenePlan } from "@/types/generation";
import { Film, MousePointerClick, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CursorWaypointEditor } from "./CursorWaypointEditor";

const AVAILABLE_SKILLS = [
  "premium-saas-hook",
  "premium-kinetic-text",
  "premium-char-split",
  "premium-team-orbit",
  "premium-split-screen",
  "premium-neon-dark",
  "premium-match-cut",
  "premium-saas-showcase",
  "premium-cursor-engine",
  "premium-camera-zoom",
  "premium-device-mockup",
  "premium-scroll-demo",
  "premium-multi-device",
  "premium-feature-list",
  "premium-data-reveal",
  "premium-network-intro",
  "premium-ui-skeleton",
  "premium-glassmorphism",
  "premium-social-proof",
  "premium-cta-scene",
  "premium-audio",
] as const;

// Skills that display images — show the image picker for these
const IMAGE_SKILLS = new Set([
  "premium-cursor-engine",
  "premium-device-mockup",
  "premium-scroll-demo",
  "premium-saas-showcase",
  "premium-camera-zoom",
  "premium-multi-device",
]);

interface ScenePlanEditorProps {
  scenes: ScenePlan[];
  brand: BrandTokens;
  /** Optional: uploaded images shown as thumbnails for per-scene assignment */
  images?: string[];
  /** Optional: AI-generated one-line description for each uploaded image */
  imageDescriptions?: string[];
  onConfirm: (editedScenes: ScenePlan[]) => void;
}

export function ScenePlanEditor({
  scenes: initialScenes,
  brand,
  images,
  imageDescriptions,
  onConfirm,
}: ScenePlanEditorProps) {
  const [localScenes, setLocalScenes] = useState<ScenePlan[]>(initialScenes);
  /** Index of the scene whose cursor path editor is open, or null */
  const [cursorEditorScene, setCursorEditorScene] = useState<number | null>(null);
  /** Per-scene vision loading state */
  const [visionLoading, setVisionLoading] = useState<Record<number, boolean>>({});
  /** Track which (sceneId, imageIdx) combos we already fetched to avoid refetching */
  const fetchedRef = useRef<Set<string>>(new Set());

  const handleSceneChange = <K extends keyof ScenePlan>(
    index: number,
    field: K,
    value: ScenePlan[K],
  ) => {
    setLocalScenes((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  // ── Vision pre-fetch ──────────────────────────────────────────────────────
  // For every cursor-engine scene with an image assigned that doesn't yet have
  // user-confirmed waypoints, auto-call /api/vision in the background.
  useEffect(() => {
    if (!images || images.length === 0) return;

    localScenes.forEach((scene, i) => {
      if (scene.skill !== "premium-cursor-engine") return;
      if (scene.cursorWaypoints && scene.cursorWaypoints.length > 0) return; // user already set
      const imgIdx = scene.imageIndex ?? 0;
      const fetchKey = `${i}:${imgIdx}`;
      if (fetchedRef.current.has(fetchKey)) return;

      fetchedRef.current.add(fetchKey);
      const imageData = images[imgIdx];
      if (!imageData) return;

      setVisionLoading((prev) => ({ ...prev, [i]: true }));
      fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!data?.elements?.length) return;
          const waypoints: CursorWaypoint[] = data.elements
            .slice(0, 8)
            .map((el: { label: string; x: number; y: number }) => ({
              label: el.label,
              x: parseFloat(el.x.toFixed(3)),
              // Apply the same 6% chrome-bar offset used by the generation system
              y: parseFloat((0.06 + el.y * 0.94).toFixed(3)),
            }));
          setLocalScenes((prev) =>
            prev.map((s, idx) =>
              idx === i && (!s.cursorWaypoints || s.cursorWaypoints.length === 0)
                ? { ...s, cursorWaypoints: waypoints }
                : s,
            ),
          );
        })
        .catch(() => {/* non-fatal */ })
        .finally(() => setVisionLoading((prev) => ({ ...prev, [i]: false })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localScenes.map((s) => `${s.skill}:${s.imageIndex}`).join(","), images]);

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

  // Active scene for the cursor editor
  const activeEditorScene =
    cursorEditorScene !== null ? localScenes[cursorEditorScene] : null;
  const activeEditorImage =
    activeEditorScene && images
      ? images[activeEditorScene.imageIndex ?? 0]
      : undefined;

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

            {/* Row 4: image picker + cursor path editor button */}
            {images && images.length > 0 && IMAGE_SKILLS.has(scene.skill) && (
              <div className="pl-7 flex items-center gap-1.5 flex-wrap">
                {images.length > 1 && (
                  <>
                    <span className="text-[10px] text-muted-foreground shrink-0">Screenshot:</span>
                    {images.map((img, imgIdx) => {
                      const desc = imageDescriptions?.[imgIdx];
                      return (
                        <div key={imgIdx} className="flex flex-col items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSceneChange(i, "imageIndex", imgIdx)}
                            className={`relative w-9 h-9 rounded border-2 overflow-hidden transition-all ${scene.imageIndex === imgIdx
                                ? "border-teal-500 ring-1 ring-teal-500/40"
                                : "border-border/40 hover:border-border opacity-60 hover:opacity-100"
                              }`}
                            title={desc ?? `Screenshot ${imgIdx + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt={desc ?? `Screenshot ${imgIdx + 1}`} className="w-full h-full object-cover" />
                            {scene.imageIndex === imgIdx && (
                              <div className="absolute inset-0 bg-teal-500/20" />
                            )}
                          </button>
                          {desc && (
                            <span className="text-[9px] text-muted-foreground text-center leading-tight max-w-[38px] truncate" title={desc}>
                              {desc.split(" ").slice(0, 2).join(" ")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {scene.imageIndex !== undefined && (
                      <button
                        type="button"
                        onClick={() => handleSceneChange(i, "imageIndex", undefined)}
                        className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                      >
                        clear
                      </button>
                    )}
                  </>
                )}

                {/* Cursor Path Editor button — only for cursor-engine scenes */}
                {scene.skill === "premium-cursor-engine" && (
                  <button
                    type="button"
                    onClick={() => setCursorEditorScene(i)}
                    title="Edit cursor waypoints on screenshot"
                    className={`ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all font-medium ${scene.cursorWaypoints && scene.cursorWaypoints.length > 0
                        ? "border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                      }`}
                  >
                    {visionLoading[i] ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <MousePointerClick className="w-2.5 h-2.5" />
                        {scene.cursorWaypoints && scene.cursorWaypoints.length > 0
                          ? `${scene.cursorWaypoints.length} waypoints ✎`
                          : "Edit Cursor Path"}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
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

      {/* Cursor Waypoint Editor Modal */}
      {cursorEditorScene !== null && activeEditorScene && activeEditorImage && (
        <CursorWaypointEditor
          image={activeEditorImage}
          waypoints={activeEditorScene.cursorWaypoints ?? []}
          onChange={(waypoints) =>
            handleSceneChange(cursorEditorScene, "cursorWaypoints", waypoints)
          }
          onClose={() => setCursorEditorScene(null)}
        />
      )}
    </div>
  );
}
