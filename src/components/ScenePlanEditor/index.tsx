"use client";

import { Button } from "@/components/ui/button";
import type { BrandTokens, CursorWaypoint, ScenePlan, ScreenFlow } from "@/types/generation";
import { Film, Mic2, MousePointerClick, Plus, Trash2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CursorWaypointEditor } from "./CursorWaypointEditor";

const AVAILABLE_SKILLS = [
  // Intro / brand
  "premium-saas-hook",
  "premium-kinetic-text",
  "premium-char-split",
  "premium-gradient-hero",
  "premium-ink-logo-reveal",
  "premium-icon-arc-reveal",
  "premium-dot-matrix-bg",
  "premium-multi-corner-gradient",
  "premium-ambient-environment",
  // Problem / contrast
  "premium-team-orbit",
  "premium-split-screen",
  "premium-neon-dark",
  "premium-match-cut",
  "premium-floating-path-nodes",
  "premium-icon-concept-scene",
  "premium-before-after",
  // Showcase / cursor
  "premium-saas-showcase",
  "premium-cursor-engine",
  "premium-hand-cursor",
  "premium-chameleon-ui",
  "premium-interactive-ui",
  "premium-camera-zoom",
  "premium-device-mockup",
  "premium-scroll-demo",
  "premium-multi-device",
  "premium-callout-bubble",
  "premium-responsive-viewport",
  "premium-3d-isometric-explode",
  "premium-app-walkthrough",
  "premium-animated-topbar",
  // Features / data
  "premium-feature-list",
  "premium-feature-grid",
  "premium-feature-bundle-cards",
  "premium-data-reveal",
  "premium-stat-counter",
  "premium-metric-flyout",
  "premium-network-intro",
  "premium-customer-journey",
  "premium-icon-bubble-row",
  "premium-integration-wall",
  "premium-logo-wall",
  "premium-data-flow-abstract",
  "premium-confetti-celebration",
  "premium-real-photo-device",
  "premium-feedback-storm",
  // Trust / social proof
  "premium-social-proof",
  "premium-testimonial-card",
  // Notifications / mobile
  "premium-phone-notification",
  "premium-notification-toast",
  "premium-section-title",
  // Depth / atmosphere
  "premium-glassmorphism",
  "premium-shape-morph-transition",
  // Light theme backgrounds
  "premium-light-arc-bg",
  "premium-light-textured-bg",
  // Reconstructed UI
  "premium-reconstructed-ui",
  // CTA / finale
  "premium-cta-scene",
  // Sound
  "premium-audio",
] as const;

// Skills that display images — show the image picker for these
const IMAGE_SKILLS = new Set([
  "premium-cursor-engine",
  "premium-hand-cursor",
  "premium-chameleon-ui",
  "premium-device-mockup",
  "premium-scroll-demo",
  "premium-saas-showcase",
  "premium-camera-zoom",
  "premium-multi-device",
  "premium-real-photo-device",
  "premium-feedback-storm",
  "premium-3d-isometric-explode",
  "premium-confetti-celebration",
  "premium-before-after",
  "premium-testimonial-card",
  "premium-reconstructed-ui",
  "premium-app-walkthrough",
]);

// Skills that get cursor waypoint editor
const CURSOR_SKILLS = new Set([
  "premium-cursor-engine",
  "premium-hand-cursor",
  "premium-chameleon-ui",
]);

// Skills that get model-routed to gemini-2.5-pro — shown as PRO badge in plan editor
const PRO_SKILLS = new Set([
  "premium-cursor-engine",
  "premium-chameleon-ui",
  "premium-reconstructed-ui",
  "premium-data-flow-abstract",
  "premium-3d-isometric-explode",
  "premium-floating-path-nodes",
  "premium-customer-journey",
  "premium-app-walkthrough",
  "premium-interactive-ui",
  "premium-before-after",
]);

interface ScenePlanEditorProps {
  scenes: ScenePlan[];
  brand: BrandTokens;
  /** Optional: uploaded images shown as thumbnails for per-scene assignment */
  images?: string[];
  /** Optional: AI-generated (or user-provided) one-line description for each uploaded image */
  imageDescriptions?: string[];
  onConfirm: (editedScenes: ScenePlan[], screenFlow?: ScreenFlow, imageDescriptions?: string[]) => void;
  /** Called when the user removes an image from the list; parent should update attachedImages state */
  onImageRemove?: (index: number) => void;
}


export function ScenePlanEditor({
  scenes: initialScenes,
  brand,
  images,
  imageDescriptions,
  onConfirm,
  onImageRemove,
}: ScenePlanEditorProps) {
  const [localScenes, setLocalScenes] = useState<ScenePlan[]>(initialScenes);
  /** Index of the scene whose cursor path editor is open, or null */
  const [cursorEditorScene, setCursorEditorScene] = useState<number | null>(null);
  /** Image-level waypoints: imageIndex → CursorWaypoint[] */
  const [waypointsByImage, setWaypointsByImage] = useState<Record<number, CursorWaypoint[]>>({});
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

  // When an image is removed: clear imageIndex on scenes using it, decrement scenes using a higher index
  const handleImageRemove = (removedIdx: number) => {
    setLocalScenes((prev) =>
      prev.map((s) => {
        if (s.imageIndex === undefined) return s;
        if (s.imageIndex === removedIdx) return { ...s, imageIndex: undefined };
        if (s.imageIndex > removedIdx) return { ...s, imageIndex: s.imageIndex - 1 };
        return s;
      }),
    );
    onImageRemove?.(removedIdx);
  };

  // ── Vision pre-fetch ──────────────────────────────────────────────────────
  // Fetch waypoints for every unique image that (a) is used by a cursor-engine
  // scene, OR (b) is an uploaded screenshot not yet covered.
  // Deduplication key is imageIndex so we never double-fetch the same image.
  useEffect(() => {
    if (!images || images.length === 0) return;

    // Collect unique image indices that need waypoints:
    // 1. All cursor-engine scenes' assigned images
    // 2. All uploaded images not already in waypointsByImage (so thumbnails in
    //    ScreenshotFlowEditor always show waypoint counts, not just image 0)
    const neededIndices = new Set<number>();
    localScenes.forEach((scene) => {
      if (scene.skills?.includes("premium-cursor-engine")) {
        neededIndices.add(scene.imageIndex ?? 0);
      }
    });
    // Also prefetch for every uploaded image so flow editor shows counts
    images.forEach((_, idx) => neededIndices.add(idx));

    neededIndices.forEach((imgIdx) => {
      const fetchKey = `img:${imgIdx}`;
      if (fetchedRef.current.has(fetchKey)) return;
      if (waypointsByImage[imgIdx]?.length > 0) return; // already have user waypoints

      const imageData = images[imgIdx];
      if (!imageData) return;

      fetchedRef.current.add(fetchKey);

      fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!data?.elements?.length) return;
          // Cap at 5 waypoints per image — more than that clutters the cursor path
          const waypoints: CursorWaypoint[] = data.elements
            .slice(0, 5)
            .map((el: { label: string; x: number; y: number; w?: number; h?: number; elementType?: string }) => {
              const videoW = el.w ?? 0.1;
              const videoH = el.h ? el.h * 0.94 : 0.05;
              return {
                label: el.label,
                x: parseFloat(el.x.toFixed(3)),
                y: parseFloat((0.06 + el.y * 0.94).toFixed(3)),
                box: {
                  x: parseFloat((el.x - videoW / 2).toFixed(3)),
                  y: parseFloat((0.06 + (el.y - (el.h ?? 0.05) / 2) * 0.94).toFixed(3)),
                  w: parseFloat(videoW.toFixed(3)),
                  h: parseFloat(videoH.toFixed(3)),
                },
                elementType: el.elementType as CursorWaypoint["elementType"],
              };
            });

          // Push waypoints to waypointsByImage (shared source of truth)
          setWaypointsByImage((prev) => {
            if (prev[imgIdx]?.length > 0) return prev; // guard: don't overwrite user edits
            return { ...prev, [imgIdx]: waypoints };
          });
          // Also backfill any cursor-engine scenes that use this image and have none yet
          setLocalScenes((prev) =>
            prev.map((s) =>
              s.skills?.some(sk => CURSOR_SKILLS.has(sk)) &&
                (s.imageIndex ?? 0) === imgIdx &&
                (!s.cursorWaypoints || s.cursorWaypoints.length === 0)
                ? { ...s, cursorWaypoints: waypoints }
                : s,
            ),
          );
        })
        .catch(() => {/* non-fatal */ });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, localScenes.map((s) => `${s.skills?.[0]}:${s.imageIndex}`).join(","), JSON.stringify(Object.keys(waypointsByImage))]);

  const handleAddScene = () => {
    const newScene: ScenePlan = {
      id: localScenes.length + 1,
      title: `Scene ${localScenes.length + 1}`,
      prompt: "Describe this scene...",
      skills: ["premium-saas-showcase"],
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

      {/* Global image strip — remove images from the list */}
      {images && images.length > 1 && onImageRemove && (
        <div className="px-4 py-2 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground shrink-0">Screenshots:</span>
            {images.map((img, imgIdx) => (
              <div key={imgIdx} className="group/strip relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`Screenshot ${imgIdx + 1}`} className="w-8 h-8 rounded border border-border/40 object-cover" />
                <button
                  type="button"
                  onClick={() => handleImageRemove(imgIdx)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[9px] leading-none flex items-center justify-center opacity-0 group-hover/strip:opacity-100 transition-opacity"
                  title={`Remove screenshot ${imgIdx + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scene list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {localScenes.map((scene, i) => {
          const imgIdxForBtn = scene.imageIndex ?? 0;
          const ownCount = scene.cursorWaypoints?.length ?? 0;
          const inheritedCount = waypointsByImage[imgIdxForBtn]?.length ?? 0;
          const effectiveCount = ownCount > 0 ? ownCount : inheritedCount;
          const isInherited = ownCount === 0 && inheritedCount > 0;
          return (
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
                  value={scene.skills?.[0] ?? ""}
                  onChange={(e) => handleSceneChange(i, "skills", [e.target.value, ...(scene.skills?.slice(1) ?? [])])}
                  className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                >
                  {AVAILABLE_SKILLS.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill.replace("premium-", "")}
                    </option>
                  ))}
                </select>
                {/* Stack badge — shows when scene has >1 skill */}
                {(scene.skills?.length ?? 0) > 1 && (
                  <span
                    title={`Skill stack: ${scene.skills?.join(" + ")}`}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20 shrink-0 select-none"
                  >
                    +{(scene.skills?.length ?? 1) - 1}
                  </span>
                )}
                {/* PRO badge — shown for skills that get model-routed to gemini-2.5-pro */}
                {PRO_SKILLS.has(scene.skills?.[0] ?? "") && (
                  <span
                    title="This scene uses gemini-2.5-pro for higher quality output"
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20 shrink-0 select-none"
                  >
                    PRO
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteScene(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Delete scene"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* UISchema badge — shown when Vision AI successfully decomposed the screenshot */}
              {scene.uiSchema && (scene.uiSchema as any).mainContent?.sections?.length > 0 && (
                <div className="pl-7">
                  <span
                    className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/15"
                    title="UI structure was auto-extracted from the screenshot — the generator will use this for pixel-accurate reconstruction"
                  >
                    <span>🧠</span>
                    <span>
                      UI extracted: {(scene.uiSchema as any).layout?.type ?? "unknown layout"}
                      {(scene.uiSchema as any).mainContent.sections.length > 0 && (
                        <> · {(scene.uiSchema as any).mainContent.sections.map((s: any) => s.type).join(", ")}</>
                      )}
                    </span>
                  </span>
                </div>
              )}

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

              {/* Row 3b: voiceover narration script */}
              <div className="pl-7">
                {(() => {
                  const maxWords = Math.ceil(scene.durationInFrames / 30 * 2.5);
                  const currentWords = (scene.voiceoverText ?? "").trim().split(/\s+/).filter(Boolean).length;
                  const isOver = currentWords > maxWords && currentWords > 0;
                  return (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mic2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Voiceover narration</span>
                        <span className={`text-[9px] font-mono ml-auto ${isOver ? "text-red-400" : "text-muted-foreground/50"}`}>
                          {currentWords > 0 ? `${currentWords}/${maxWords}w` : `max ${maxWords}w`}
                        </span>
                        {scene.voiceoverAudioUrl && (
                          <span className="flex items-center gap-0.5 text-[9px] font-medium text-teal-400">
                            <Volume2 className="w-2.5 h-2.5" />
                            ready
                          </span>
                        )}
                      </div>
                      <textarea
                        value={scene.voiceoverText ?? ""}
                        onChange={(e) =>
                          handleSceneChange(i, "voiceoverText", e.target.value || undefined)
                        }
                        rows={1}
                        className={`w-full bg-background border rounded px-2 py-1 text-[11px] text-foreground focus:outline-none resize-none placeholder:text-muted-foreground/40 ${isOver ? "border-red-500/40 focus:border-red-500/60" : "border-border focus:border-teal-500/40"}`}
                        placeholder="Spoken narration for this scene (leave empty to skip voiceover)…"
                      />
                      {isOver && (
                        <p className="text-[9px] text-red-400 mt-0.5">Too long — TTS will truncate. Trim to {maxWords} words.</p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Row 3c: emotional intent selector + aha moment toggle */}
              <div className="pl-7 flex items-center gap-2 flex-wrap">
                <select
                  value={scene.emotionalIntent ?? ""}
                  onChange={(e) => handleSceneChange(i, "emotionalIntent", e.target.value || undefined)}
                  className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:border-foreground/40"
                >
                  <option value="">— emotion —</option>
                  <option value="FRUSTRATION">FRUSTRATION</option>
                  <option value="RELIEF">RELIEF</option>
                  <option value="CONFIDENCE">CONFIDENCE</option>
                  <option value="TRUST">TRUST</option>
                  <option value="URGENCY">URGENCY</option>
                  <option value="EXCITEMENT">EXCITEMENT</option>
                </select>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scene.isAhaMoment ?? false}
                    onChange={(e) => handleSceneChange(i, "isAhaMoment", e.target.checked || undefined)}
                    className="w-3 h-3 accent-amber-400"
                  />
                  <span className="text-[10px] text-amber-300/70">✦ Aha moment</span>
                </label>
              </div>

              {/* Row 4: image picker + cursor path editor button */}
              {images && images.length > 0 && scene.skills?.some(sk => IMAGE_SKILLS.has(sk)) && (
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

                  {/* Cursor Path Editor button — for cursor-engine and chameleon-ui scenes */}
                  {scene.skills?.some(sk => CURSOR_SKILLS.has(sk)) && (
                    <button
                      type="button"
                      onClick={() => setCursorEditorScene(i)}
                      title="Edit cursor waypoints on screenshot"
                      className={`ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border transition-all font-medium ${effectiveCount > 0
                        ? "border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                        }`}
                    >
                      <MousePointerClick className="w-2.5 h-2.5" />
                      {effectiveCount > 0
                        ? `${effectiveCount} waypoints ✎${isInherited ? " (image)" : ""}`
                        : "Edit Cursor Path"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
          onClick={() => {
            const mergedScenes = localScenes.map((s) => ({
              ...s,
              cursorWaypoints:
                (s.cursorWaypoints?.length ?? 0) > 0
                  ? s.cursorWaypoints
                  : waypointsByImage[s.imageIndex ?? 0],
            }));
            onConfirm(mergedScenes);
          }}
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
