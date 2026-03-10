"use client";

import {
  extractComponentCode,
  stripMarkdownFences,
} from "@/helpers/sanitize-response";
import { compileCode, extractComponentBody } from "@/remotion/compiler";
import { alignSceneDurations } from "@/lib/alignScenes";
import type { BrandTokens, CursorWaypoint, ModelId, ScenePlan, ScreenFlow } from "@/types/generation";
import React, { useCallback, useRef, useState } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame } from "remotion";

export interface CompiledScene {
  Component: React.ComponentType;
  durationInFrames: number;
  code: string;
  title: string;
  prompt: string;
  skill: string;
  imageIndex?: number;
  cursorWaypoints?: CursorWaypoint[];
  transition?: "fade" | "slide" | "scale" | "flash" | "none";
}

// Module-level cache — persists for the browser session
const sceneCache = new Map<string, CompiledScene>();

function cacheKey(scene: ScenePlan, brand: BrandTokens): string {
  return `${scene.skill}::${brand.primary}::${scene.imageIndex ?? -1}::${scene.durationInFrames}::${scene.prompt.slice(0, 80)}`;
}

const TRANSITION_FRAMES = 20;

// Map musicStyle → path in public/audio/ (user populates these files)
const MUSIC_TRACKS: Record<string, string> = {
  corporate:  "https://cdn.pixabay.com/audio/2023/11/13/audio_3c2e86c693.mp3",
  energetic:  "https://cdn.pixabay.com/audio/2024/08/20/audio_6c53572dfa.mp3",
  cinematic:  "https://cdn.pixabay.com/audio/2024/02/15/audio_b99e82e13f.mp3",
  calm:       "https://cdn.pixabay.com/audio/2024/04/09/audio_9c659e933b.mp3",
  playful:    "https://cdn.pixabay.com/audio/2023/09/07/audio_168f2040eb.mp3",
};

type TransitionType = "fade" | "slide" | "scale" | "flash" | "none";

function withTransition(
  SceneComp: React.ComponentType,
  duration: number,
  isFirst: boolean,
  isLast: boolean,
  transitionType: TransitionType = "fade",
): React.ComponentType {
  const fadeIn  = isFirst ? 8 : TRANSITION_FRAMES;
  const fadeOut = isLast  ? 8 : TRANSITION_FRAMES;

  return function TransitionScene() {
    const frame = useCurrentFrame();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const opacity = interpolate(
      frame,
      [0, fadeIn, duration - fadeOut, duration],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    let transform = "none";
    if (transitionType === "slide" && !isFirst) {
      const slideX = interpolate(frame, [0, fadeIn], [80, 0], {
        extrapolateRight: "clamp", easing: easeOut,
      });
      transform = `translateX(${slideX}px)`;
    } else if (transitionType === "scale" && !isFirst) {
      const scale = interpolate(frame, [0, fadeIn], [1.06, 1], {
        extrapolateRight: "clamp", easing: easeOut,
      });
      transform = `scale(${scale})`;
    } else if (transitionType === "flash") {
      // Flash is handled by the white overlay — scene itself just fades normally
    }

    // Flash overlay — white burst at transition point (frame 0-6 of incoming scene)
    const flashOpacity = transitionType === "flash"
      ? interpolate(frame, [0, 6], [0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;

    // Wrap SceneComp render — if it throws, show a dark placeholder
    let sceneElement: React.ReactNode;
    try {
      sceneElement = React.createElement(SceneComp);
    } catch {
      sceneElement = React.createElement("div", {
        style: {
          position: "absolute", inset: 0,
          background: "#111",
          display: "flex", alignItems: "center", justifyContent: "center",
        },
      }, React.createElement("span", {
        style: { color: "#555", fontSize: 14, fontFamily: "Inter" },
      }, "Scene render error"));
    }

    return React.createElement(
      AbsoluteFill,
      { style: { opacity, transform, willChange: "transform, opacity" } },
      sceneElement,
      // White flash burst overlaid on top of scene
      flashOpacity > 0
        ? React.createElement("div", {
            style: {
              position: "absolute", inset: 0,
              background: "white",
              opacity: flashOpacity,
              pointerEvents: "none",
              zIndex: 1000,
            },
          })
        : null,
    );
  };
}

function createMasterComponent(
  scenes: CompiledScene[],
  bgColor?: string,
  musicUrl?: string,
  brand?: Partial<BrandTokens> | null,
): React.ComponentType {
  // Build overlapping sequence offsets for cross-dissolve transitions
  const entries: Array<{ from: number; Component: React.ComponentType; duration: number }> = [];
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const transition = s.transition as TransitionType | undefined;
    const Wrapped = withTransition(s.Component, s.durationInFrames, i === 0, i === scenes.length - 1, transition ?? "fade");
    entries.push({ from: offset, Component: Wrapped, duration: s.durationInFrames });
    // Overlap next scene by TRANSITION_FRAMES for cross-dissolve (except after last)
    if (i < scenes.length - 1) {
      offset += s.durationInFrames - TRANSITION_FRAMES;
    }
  }

  // Import FilmGrain from compiler scope via a wrapper
  // We reference it by name — it's injected as a global in compiled code,
  // but here in the hook we need the actual component from compiler.ts exports
  const FilmGrainLayer = function FilmGrainLayer() {
    const frame = useCurrentFrame();
    const shift = (frame * 37) % 100;
    return React.createElement("div", {
      style: {
        position: "absolute", inset: 0, zIndex: 9999, pointerEvents: "none",
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
        backgroundPosition: `${shift}px ${(shift * 0.7).toFixed(0)}px`,
        mixBlendMode: "multiply" as const,
      },
    });
  };

  // Global background layer — renders subtle corner gradient blobs for light-themed videos
  const globalBg = brand?.style === "light"
    ? React.createElement("div", {
        style: {
          position: "absolute", inset: 0, zIndex: 0,
          background: brand.bg || "#f8f9fc",
        },
      },
      React.createElement("div", {
        style: {
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse at 0% 100%, ${brand.primary || "#6366f1"}11 0%, transparent 50%),
            radial-gradient(ellipse at 100% 0%, ${brand.secondary || "#ec4899"}0d 0%, transparent 45%),
            radial-gradient(ellipse at 100% 100%, ${brand.primary || "#ef4444"}0a 0%, transparent 40%)
          `,
        },
      }),
    )
    : null;

  return function MasterVideo() {
    return React.createElement(
      AbsoluteFill,
      bgColor ? { style: { backgroundColor: bgColor } } : null,
      globalBg,
      // Background music (loop at low volume)
      musicUrl
        ? React.createElement(Audio, { src: musicUrl, volume: 0.18, loop: true } as any)
        : null,
      ...entries.map(({ from, Component: SceneComp, duration }, i) =>
        React.createElement(Sequence, {
          key: i,
          from,
          durationInFrames: duration,
          children: React.createElement(SceneComp),
        }),
      ),
      // FilmGrain overlay — topmost layer across entire video
      React.createElement(FilmGrainLayer),
    );
  };
}

/** Build a Lambda-ready code string from compiled scenes.
 * ATTACHED_IMAGES are passed separately via inputProps.images — not embedded in the code —
 * to avoid a variable-shadowing conflict with the compiler's scope parameter of the same name.
 */
export function buildMasterCode(scenes: CompiledScene[]): string {
  const sceneComponents = scenes
    .map((scene, i) => {
      const body = extractComponentBody(scene.code);
      return `const Scene${i} = () => {\n${body}\n};`;
    })
    .join("\n\n");

  let offset = 0;
  const sequences = scenes
    .map((scene, i) => {
      const from = offset;
      offset += scene.durationInFrames;
      return `    <Sequence from={${from}} durationInFrames={${scene.durationInFrames}}><Scene${i} /></Sequence>`;
    })
    .join("\n");

  return `${sceneComponents}

export const DynamicAnimation = () => {
  return (
    <AbsoluteFill>
${sequences}
    </AbsoluteFill>
  );
};`;
}

function createPlaceholderScene(title: string): React.ComponentType {
  return function PlaceholderScene() {
    return React.createElement(
      AbsoluteFill,
      {
        style: {
          backgroundColor: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column" as const,
          gap: 12,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 22,
            fontWeight: 600,
            color: "#555",
            fontFamily: "Inter, sans-serif",
          },
        },
        title,
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: 13,
            color: "#444",
            fontFamily: "Inter, sans-serif",
          },
        },
        "Failed to generate",
      ),
    );
  };
}

/** Build a structured brand block that gets injected into every scene prompt. */
function buildBrandBlock(brand: BrandTokens): string {
  return `## BRAND DESIGN SYSTEM (MANDATORY — use these exact values, no exceptions)

BRAND is already injected into scope — DO NOT declare it. Use BRAND.bg, BRAND.primary, etc. directly.

// Reference only — these are the values:
// BRAND.bg        = "${brand.bg}"         — AbsoluteFill background, ALL scene backgrounds
// BRAND.primary   = "${brand.primary}"    — CTA buttons, key accents, active states, glows
// BRAND.secondary = "${brand.secondary}"  — secondary panels, complementary accents
// BRAND.surface   = "${brand.surface}"    — glass card backgrounds (already has correct opacity)
// BRAND.text      = "${brand.text}"       — ALL headline and label text
// BRAND.textMuted = "${brand.textMuted}"  — subtitles, captions, metadata
// BRAND.border    = "${brand.border}"     — glass card borders, divider lines
// BRAND.font      = "${brand.font}"       — fontFamily on every text element
// BRAND.style     = "${brand.style}"      — "dark" | "light" | "neon"`;
}

/** Pre-fetch ElevenLabs voiceover for every scene that has voiceoverText. Runs in parallel. */
async function prefetchVoiceovers(scenes: ScenePlan[]): Promise<ScenePlan[]> {
  return Promise.all(
    scenes.map(async (scene) => {
      if (!scene.voiceoverText?.trim()) return scene;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: scene.voiceoverText }),
        });
        if (!res.ok) return scene;
        const { audioUrl, wordTimings } = await res.json();
        if (!audioUrl) return scene;
        const timings = Array.isArray(wordTimings) && wordTimings.length > 0 ? wordTimings : scene.wordTimings;
        return { ...scene, voiceoverAudioUrl: audioUrl, wordTimings: timings };
      } catch {
        return scene; // non-fatal — generation proceeds without audio
      }
    }),
  );
}

/**
 * Build a mandatory CURSOR_STEPS code block from confirmed cursor waypoints.
 * Outputs the actual const declaration so the LLM must copy it verbatim —
 * not just comments that the LLM can silently ignore.
 *
 * Also returns chameleon overlay JSX hints for input/button/dropdown elements
 * so the LLM knows exactly which overlay components to render.
 */
function buildInteractionScript(waypoints: CursorWaypoint[]): string {
  // TRAVEL = frames for cursor spring to settle at destination (must match cursor skill)
  const TRAVEL = 25;
  // Start with cursor off-screen (initial anchor step at time=0)
  let frame = 20; // first spring starts at frame 20 (gives 20 frames of fade-in before cursor moves)

  const stepEntries: string[] = [];
  const chameleonHints: string[] = [];
  const commentLines: string[] = [];

  // BUG FIX: Add initial anchor step so the first waypoint has a "from" position.
  // Without this, prevStep === currentStep === CURSOR_STEPS[0] for all frames before
  // the first time boundary, so the cursor is already at the destination from frame 0.
  stepEntries.push(`  { x: 0.5, y: 0.85, label: "", time: 0, action: "none" }`);

  waypoints.forEach((wp, i) => {
    // `arrive` = frame when this step's spring starts (cursor begins traveling)
    // `actionFrame` = frame when cursor physically arrives (spring settled = arrive + TRAVEL)
    const arrive = frame;
    const actionFrame = arrive + TRAVEL; // when click fires / chameleon overlays activate
    const dwell = wp.dwellFrames ?? 22;  // frames cursor stays at destination before next move
    frame = actionFrame + dwell;         // next step's spring starts after dwell ends

    const action = wp.action ?? 'click';
    const boxStr = wp.box
      ? `, box: { x: ${wp.box.x.toFixed(3)}, y: ${wp.box.y.toFixed(3)}, w: ${wp.box.w.toFixed(3)}, h: ${wp.box.h.toFixed(3)} }`
      : '';
    const typeStr = wp.elementType ? `, elementType: "${wp.elementType}"` : '';

    // BUG FIX: `time` = `arrive` (when spring/movement starts), NOT actionFrame.
    // In the cursor skill: `framesAfterArrival = frame - step.time - TRAVEL`
    // So click fires at step.time + TRAVEL = arrive + TRAVEL = actionFrame ✓
    stepEntries.push(
      `  { x: ${wp.x.toFixed(3)}, y: ${wp.y.toFixed(3)}, label: "${wp.label}", time: ${arrive}, action: "${action}"${boxStr}${typeStr} }`,
    );
    commentLines.push(
      `// Step ${i}: spring starts f:${arrive}, cursor arrives+clicks at f:${actionFrame}${wp.box ? `, box:{x:${wp.box.x.toFixed(3)},y:${wp.box.y.toFixed(3)},w:${wp.box.w.toFixed(3)},h:${wp.box.h.toFixed(3)}}` : ''}${wp.elementType ? `, elementType:"${wp.elementType}"` : ''} — "${wp.label}"`,
    );

    // Chameleon overlay hints use actionFrame (when cursor arrives and click fires)
    if (wp.box) {
      const { x, y, w, h } = wp.box;
      const dropY = parseFloat((y + h + 0.005).toFixed(3)); // pre-computed dropdown y
      if (wp.elementType === 'input') {
        chameleonHints.push(
          `// Step ${i} — input typing overlay (fires at f:${actionFrame}):\n// <ChameleonInput x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} text="[realistic text for this field]" startFrame={${actionFrame}} brand={BRAND} />\n// <ChameleonHighlight x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} triggerFrame={${actionFrame}} brand={BRAND} />`,
        );
      } else if (wp.elementType === 'dropdown') {
        chameleonHints.push(
          `// Step ${i} — dropdown (fires at f:${actionFrame}):\n// <ChameleonHighlight x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} triggerFrame={${actionFrame}} brand={BRAND} />\n// <DropdownMenu x={${x.toFixed(3)}} y={${dropY}} w={${w.toFixed(3)}} items={["Option 1", "Option 2", "Option 3"]} openFrame={${actionFrame}} brand={BRAND} />`,
        );
      } else if (wp.elementType === 'button' || wp.elementType === 'nav' || wp.elementType === 'card') {
        chameleonHints.push(
          `// Step ${i} — ${wp.elementType} click highlight (fires at f:${actionFrame}):\n// <ChameleonHighlight x={${x.toFixed(3)}} y={${y.toFixed(3)}} w={${w.toFixed(3)}} h={${h.toFixed(3)}} triggerFrame={${actionFrame}} brand={BRAND} />`,
        );
      }
    }
  });

  // Trailing "none" step holds cursor at final position
  const lastWp = waypoints[waypoints.length - 1];
  stepEntries.push(
    `  { x: ${(lastWp?.x ?? 0.5).toFixed(3)}, y: ${(lastWp?.y ?? 0.5).toFixed(3)}, label: "", time: ${frame}, action: "none" }`,
  );

  const cursorStepsCode = `const CURSOR_STEPS = [\n${stepEntries.join(',\n')},\n];`;

  const chameleonSection = chameleonHints.length > 0
    ? `\n\n## CHAMELEON OVERLAYS — render these at the CLICK frame (uncomment and fill in text):\n${chameleonHints.join('\n')}`
    : '';

  return `## CURSOR WAYPOINTS (USER-CONFIRMED — MANDATORY CODE INJECTION)
CRITICAL: You MUST paste the following constant VERBATIM in your component.
Do NOT alter any x/y/box/time values — they are pixel-accurate from the uploaded screenshot.

TIMING MODEL: step.time = when spring/movement starts; click fires at step.time + 25 (TRAVEL frames later).
Use this for chameleon overlay startFrame/triggerFrame: framesAfterArrival = frame - step.time - 25.

${cursorStepsCode}

${commentLines.join('\n')}${chameleonSection}`;
}

/** Consume an SSE stream from /api/generate and return the final code string. */
async function consumeSceneGeneration(
  scene: ScenePlan,
  model: string,
  brand: BrandTokens,
  errorContext?: string,
  images?: string[],
): Promise<string> {
  // Build the full prompt: brand block + scene creative brief
  const brandBlock = buildBrandBlock(brand);

  // Vision bridge: pre-detect UI elements from the screenshot and inject them into the prompt.
  // - cursor-engine: precise x/y coordinates used as CURSOR_STEPS waypoints
  //   If the user already confirmed waypoints in the plan editor, use those directly
  //   and skip the /api/vision call entirely (faster + more accurate).
  // - scroll-demo / saas-showcase: element labels used to populate realistic content
  const VISION_SKILLS = new Set([
    "premium-cursor-engine",
    "premium-scroll-demo",
    "premium-saas-showcase",
    "premium-chameleon-ui",
  ]);
  let detectedElementsBlock = "";
  if (
    VISION_SKILLS.has(scene.skill) &&
    images &&
    images.length > 0 &&
    !errorContext // skip on retry — don't double-call vision
  ) {
    // ── User-confirmed cursor waypoints (skip vision call) ─────────────────
    // Applies to both cursor-engine and chameleon-ui when user set waypoints
    if (
      (scene.skill === "premium-cursor-engine" || scene.skill === "premium-chameleon-ui") &&
      scene.cursorWaypoints &&
      scene.cursorWaypoints.length > 0
    ) {
      console.log(
        `Cursor path: using ${scene.cursorWaypoints.length} user-confirmed waypoints for "${scene.title}" (skipping /api/vision)`,
      );
      // buildInteractionScript now emits the full CURSOR_STEPS const + chameleon hints
      detectedElementsBlock = `\n\n${buildInteractionScript(scene.cursorWaypoints)}`;
    } else {
      // ── Fallback: auto-detect via /api/vision ──────────────────────────
      try {
        const visionResponse = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: images[0] }),
        });
        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const elements: Array<{ label: string; x: number; y: number; w?: number; h?: number; elementType?: string }> =
            visionData.elements ?? [];
          if (elements.length > 0) {
            if (scene.skill === "premium-chameleon-ui") {
              // Merge vision elements with the interactionScript to produce
              // INTERACTION_SCRIPT comments including bounding boxes + frame timings.
              const script = scene.interactionScript ?? [];
              // Stop-words to ignore when scoring label similarity
              const STOP = new Set(["the", "a", "an", "on", "in", "at", "to", "for", "of", "with", "and", "or", "button", "field", "bar", "input", "area"]);
              const steps = script.map((ev, i) => {
                // Match event target to a vision element using multi-word scoring
                const targetWords = ev.target.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
                const scored = elements.map((e) => {
                  const labelWords = e.label.toLowerCase().split(/\s+/).filter(w => w.length > 1);
                  const matches = targetWords.filter(tw =>
                    labelWords.some(lw => lw.includes(tw) || tw.includes(lw))
                  );
                  return { e, score: matches.length };
                });
                const best = scored.sort((a, b) => b.score - a.score)[0];
                const el = (best && best.score > 0) ? best.e : elements[i % elements.length];
                const videoW = el.w ?? 0.12;
                const videoH = el.h ? el.h * 0.94 : 0.05;
                const boxStr = el
                  ? `, box:{x:${parseFloat((el.x - videoW / 2).toFixed(3))},y:${parseFloat((0.06 + (el.y - (el.h ?? 0.05) / 2) * 0.94).toFixed(3))},w:${parseFloat(videoW.toFixed(3))},h:${parseFloat(videoH.toFixed(3))}}`
                  : "";
                const typeStr = el?.elementType ? `, elementType:"${el.elementType}"` : "";
                const arrive = Math.max(0, ev.frame - 25);
                const clickAction = ev.action === "type" ? "click" : ev.action;
                return `// Step ${i}: cursor arrives f:${arrive}, ${clickAction} at f:${ev.frame}${boxStr}${typeStr} — "${ev.target}"`;
              });

              if (steps.length > 0) {
                detectedElementsBlock = `

## INTERACTION_SCRIPT (from video analysis + vision detection — copy these exactly)
Use these frame numbers and bounding boxes to position ChameleonInput/ChameleonHighlight/DropdownMenu.

${steps.join("\n")}`;
              } else {
                // No interactionScript — fall back to DETECTED_ELEMENTS for the LLM to interpret
                const labels = elements.map((el) => el.label);
                detectedElementsBlock = `

## DETECTED UI SECTIONS FROM UPLOADED SCREENSHOT
${JSON.stringify(labels, null, 2)}`;
              }
            } else if (scene.skill === "premium-cursor-engine") {
              const transformed = elements.map((el) => {
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
                  elementType: el.elementType,
                };
              });
              detectedElementsBlock = `

## DETECTED UI ELEMENTS FROM UPLOADED SCREENSHOT
The screenshot is displayed below a 6% chrome bar at the top of the video frame.
These coordinates are already in video space.
Select 3–5 of the most interesting elements for the walkthrough demo.

CRITICAL: You MUST include the following constant declaration in your generated code (do not assume it is in scope):

const DETECTED_ELEMENTS = ${JSON.stringify(transformed, null, 2)};`;
            } else {
              const labels = elements.map((el) => el.label);
              detectedElementsBlock = `

## DETECTED UI SECTIONS FROM UPLOADED SCREENSHOT
These are the real UI sections/components visible in the screenshot.
Use these labels to populate your component with accurate text, stat names, and layout sections that match the actual product — do NOT invent generic labels.

CRITICAL: You MUST include the following constant declaration in your generated code (do not assume it is in scope):

const DETECTED_SECTIONS = ${JSON.stringify(labels, null, 2)};`;
            }
            console.log(
              `Vision bridge (${scene.skill}): ${elements.length} elements detected for "${scene.title}"`,
            );
          }
        }
      } catch (e) {
        console.warn("Vision detection failed (non-fatal):", e);
      }
    }
  }

  // Voiceover block: if the scene has a pre-generated ElevenLabs audio URL,
  // tell the LLM how to use VOICEOVER_AUDIO_URL (already in compiler scope).
  let voiceoverBlock = "";
  if (scene.voiceoverAudioUrl) {
    voiceoverBlock = `

## VOICEOVER AUDIO (PRE-GENERATED — MUST include in output)
A professional ElevenLabs narration clip exists for this scene.
VOICEOVER_AUDIO_URL is injected into compiler scope as a constant string.
You MUST include the following in your component output:

  {VOICEOVER_AUDIO_URL && (
    <Audio
      src={VOICEOVER_AUDIO_URL}
      volume={(f) => interpolate(f, [0, 15, durationInFrames - 15, durationInFrames], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  )}

Also add background music at reduced volume (≤ 0.2) using one of the FREE_MUSIC_TRACKS CDN URLs from the premium-audio skill.
Do NOT declare VOICEOVER_AUDIO_URL — it is already in scope.`;
  }

  // UI Schema block: if the scene has a pre-extracted UISchema, inject it as UI_SCHEMA constant
  const hasValidUiSchema = scene.uiSchema &&
    Array.isArray((scene.uiSchema as any).mainContent?.sections) &&
    ((scene.uiSchema as any).mainContent.sections.length > 0 ||
     (scene.uiSchema as any).layout?.sidebar?.items?.length > 0);

  let uiSchemaBlock = "";
  if (hasValidUiSchema) {
    uiSchemaBlock = `

## UI_SCHEMA (PRE-EXTRACTED — ALREADY IN SCOPE as UI_SCHEMA)
A structural decomposition of the product UI has been pre-extracted from the screenshot.
UI_SCHEMA is injected into compiler scope — DO NOT declare it.
Use ReconstructedAppShell or individual Animated* components with this data.

// Reference only — schema shape:
// UI_SCHEMA.layout.type = "${scene.uiSchema!.layout.type}"
// UI_SCHEMA.layout.sidebar?.appName = "${scene.uiSchema!.layout.sidebar?.appName ?? "—"}"
// UI_SCHEMA.mainContent.sections = [${(scene.uiSchema!.mainContent?.sections ?? []).map((s: any) => s.type).join(", ")}]
// UI_SCHEMA.theme.isDark = ${scene.uiSchema!.theme?.isDark ?? false}

Use: <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
Or build manually with AnimatedSidebar, AnimatedMetricCards, AnimatedTable, AnimatedChart, AnimatedForm`;
  }

  const scenePrompt = errorContext
    ? `${brandBlock}\n\n${scene.prompt}${detectedElementsBlock}${uiSchemaBlock}${voiceoverBlock} \n\nPrevious attempt failed with this error: \n${errorContext} \nPlease fix the issues and regenerate.`
    : `${brandBlock} \n\n${scene.prompt}${detectedElementsBlock}${uiSchemaBlock}${voiceoverBlock} `;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: scenePrompt,
      model,
      isFollowUp: Boolean(errorContext),
      forcedSkills: scene.skill ? [scene.skill] : undefined,
      frameImages: images?.length ? images : undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
      `API error ${response.status} for scene "${scene.title}"`,
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return data.code ?? "";
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let accumulatedText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event.type === "text-delta") {
          accumulatedText += event.delta;
        }
      } catch {
        // ignore malformed lines
      }
    }
  }

  let finalCode = stripMarkdownFences(accumulatedText);
  finalCode = extractComponentCode(finalCode);
  return finalCode;
}

/**
 * When a scene has imageIndex set, put that image first in the array so LLM and compiler
 * receive it as ATTACHED_IMAGES[0]. All other images follow.
 */
function reorderImagesForScene(images: string[] | undefined, scene: ScenePlan): string[] {
  if (!images || images.length === 0) return [];
  if (scene.imageIndex === undefined || scene.imageIndex < 0 || scene.imageIndex >= images.length) {
    return images;
  }
  return [images[scene.imageIndex], ...images.filter((_, i) => i !== scene.imageIndex)];
}

/** Generate, compile, and error-recover a single scene. Never throws. */
async function processScene(
  scene: ScenePlan,
  model: string,
  brand: BrandTokens,
  bypassCache: boolean,
  onProgress: (title: string) => void,
  images?: string[],
): Promise<CompiledScene> {
  const key = cacheKey(scene, brand);

  if (!bypassCache && sceneCache.has(key)) {
    onProgress(scene.title);
    return sceneCache.get(key)!;
  }

  onProgress(scene.title);

  // Guard: empty prompt → skip generation and return placeholder immediately
  if (!scene.prompt?.trim()) {
    console.warn(`Scene "${scene.title}" has an empty prompt — skipping generation`);
    return {
      Component: createPlaceholderScene(scene.title),
      durationInFrames: scene.durationInFrames,
      code: "",
      title: scene.title,
      prompt: scene.prompt,
      skill: scene.skill,
    };
  }

  // Use scene-specific image ordering (imageIndex becomes ATTACHED_IMAGES[0])
  const sceneImages = reorderImagesForScene(images, scene);

  // First attempt
  try {
    const code = await consumeSceneGeneration(scene, model, brand, undefined, sceneImages);
    if (code.trim()) {
      const result = compileCode(code, sceneImages, brand as Record<string, string>, scene.voiceoverAudioUrl ?? null, scene.wordTimings ?? [], (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null);
      if (!result.error && result.Component) {
        const compiled: CompiledScene = {
          Component: result.Component,
          durationInFrames: scene.durationInFrames,
          code: code,
          title: scene.title,
          prompt: scene.prompt,
          skill: scene.skill,
          imageIndex: scene.imageIndex,
          cursorWaypoints: scene.cursorWaypoints,
          transition: scene.transition,
        };
        sceneCache.set(key, compiled);
        return compiled;
      }

      // Retry with error context (use same sceneImages ordering)
      try {
        const retryCode = await consumeSceneGeneration(
          scene,
          model,
          brand,
          result.error ?? "Compilation failed — JSX or syntax error",
          sceneImages,
        );
        if (retryCode.trim()) {
          const retryResult = compileCode(retryCode, sceneImages, brand as Record<string, string>, scene.voiceoverAudioUrl ?? null, scene.wordTimings ?? [], (scene.uiSchema as unknown as Record<string, unknown> | null) ?? null);
          if (!retryResult.error && retryResult.Component) {
            const compiled: CompiledScene = {
              Component: retryResult.Component,
              durationInFrames: scene.durationInFrames,
              code: retryCode,
              title: scene.title,
              prompt: scene.prompt,
              skill: scene.skill,
              imageIndex: scene.imageIndex,
              cursorWaypoints: scene.cursorWaypoints,
            };
            sceneCache.set(key, compiled);
            return compiled;
          }
        }
      } catch {
        // fall through to placeholder
      }
    }
  } catch {
    // fall through to placeholder
  }

  console.warn(
    `Scene "${scene.title}" failed to compile after retry, using placeholder`,
  );
  return {
    Component: createPlaceholderScene(scene.title),
    durationInFrames: scene.durationInFrames,
    code: "",
    title: scene.title,
    prompt: scene.prompt,
    skill: scene.skill,
  };
}

export interface FullVideoProgress {
  current: number;
  total: number;
  sceneTitle: string;
}

const CONCURRENCY = 1;

const DEFAULT_BRAND: BrandTokens = {
  primary: "#6366f1",
  secondary: "#a78bfa",
  bg: "#0f0f1a",
  surface: "rgba(255,255,255,0.06)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.5)",
  border: "rgba(255,255,255,0.12)",
  font: "Inter",
  accentName: "indigo",
  style: "dark",
};

export function useFullVideoGeneration() {
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<FullVideoProgress | null>(null);
  const [scenes, setScenes] = useState<CompiledScene[]>([]);
  const [masterComponent, setMasterComponent] =
    useState<React.ComponentType | null>(null);
  const [masterCode, setMasterCode] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{
    scenes: ScenePlan[];
    brand: BrandTokens;
    imageDescriptions?: string[];
    screenFlow?: ScreenFlow;
    bgSkill?: string;
  } | null>(null);
  const [pendingFlow, setPendingFlow] = useState<{
    images: string[];
    detectedFlow?: ScreenFlow;
  } | null>(null);
  const [isFlowDetecting, setIsFlowDetecting] = useState(false);
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<
    number | null
  >(null);

  const pendingModelRef = useRef<string>("gemini-2.5-flash:none");
  const pendingImagesRef = useRef<string[]>([]);
  const pendingBrandRef = useRef<BrandTokens>(DEFAULT_BRAND);
  const pendingScreenFlowRef = useRef<ScreenFlow | undefined>(undefined);
  const pendingPromptRef = useRef<string>("");
  const pendingDescriptionsRef = useRef<string[]>([]);

  /** Core generation loop — runs scenes sequentially with brand threading. */
  const runGeneration = useCallback(
    async (
      planScenes: ScenePlan[],
      model: string,
      brand: BrandTokens,
      images: string[] = [],
      screenFlow?: ScreenFlow,
    ) => {
      setIsGenerating(true);
      setError(null);
      setScenes([]);
      setMasterComponent(null);
      setMasterCode(null);

      try {
        // Enrich each scene's prompt with its confirmed transition context.
        // Only applied when screenFlow is available and the scene has an imageIndex.
        const enrichedScenes = planScenes.map((scene) => {
          if (!screenFlow || scene.imageIndex === undefined) return scene;
          const transition = screenFlow.transitions.find(
            (t) => t.from === scene.imageIndex,
          );
          if (!transition) return scene;
          const actionDesc = transition.action
            ? `"${transition.action}" (${transition.type})`
            : transition.type;
          const contextBlock = `\n\n## STORY FLOW CONTEXT\nThis scene shows screen ${scene.imageIndex + 1} of the user journey. After this screen the user performs: ${actionDesc}. Animate the UI to naturally lead the viewer toward that interaction.`;
          return { ...scene, prompt: scene.prompt + contextBlock };
        });

        const compiledScenesArr: CompiledScene[] = new Array(enrichedScenes.length);

        for (let i = 0; i < enrichedScenes.length; i += CONCURRENCY) {
          const batch = enrichedScenes.slice(i, i + CONCURRENCY);

          setProgress({
            current: i + 1,
            total: planScenes.length,
            sceneTitle: batch[0].title,
          });

          const batchResults = await Promise.allSettled(
            batch.map((scene, j) =>
              processScene(scene, model, brand, false, (title) => {
                setProgress({
                  current: i + j + 1,
                  total: planScenes.length,
                  sceneTitle: title,
                });
              }, images),
            ),
          );

          for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            if (result.status === "fulfilled") {
              compiledScenesArr[i + j] = result.value;
            } else {
              compiledScenesArr[i + j] = {
                Component: createPlaceholderScene(batch[j].title),
                durationInFrames: batch[j].durationInFrames,
                code: "",
                title: batch[j].title,
                prompt: batch[j].prompt,
                skill: batch[j].skill,
              };
            }
          }
        }

        const validScenes = compiledScenesArr.filter(Boolean);
        const musicStyle = brand.musicStyle ?? brand.accentName ?? "cinematic";
        const musicUrl = MUSIC_TRACKS[musicStyle] ?? MUSIC_TRACKS["cinematic"];
        const master = createMasterComponent(validScenes, brand.bg, musicUrl, brand);
        const masterCodeStr = buildMasterCode(validScenes);
        // Total duration accounts for TRANSITION_FRAMES overlap between scenes
        const total = validScenes.reduce((sum, s) => sum + s.durationInFrames, 0)
          - Math.max(0, validScenes.length - 1) * TRANSITION_FRAMES;

        setScenes(validScenes);
        setMasterComponent(() => master);
        setMasterCode(masterCodeStr);
        setTotalDuration(total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
      } finally {
        setIsGenerating(false);
        setProgress(null);
      }
    },
    [],
  );

  /** Step 1: Fetch scene plan, then pause for user review. */
  /** Shared plan-fetch logic — called by both approveFlow (with screenFlow) and generateFullVideo (no images). */
  const runPlan = useCallback(
    async (
      prompt: string,
      model: string,
      images: string[],
      imageUserDescriptions: string[] | undefined,
      screenFlow?: ScreenFlow,
      waypointsByImage?: Record<number, CursorWaypoint[]>,
    ) => {
      setIsPlanning(true);
      setError(null);
      setMasterComponent(null);
      setMasterCode(null);
      setScenes([]);
      setTotalDuration(0);
      setPendingPlan(null);

      try {
        const planResponse = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model,
            images: images.length ? images : undefined,
            imageUserDescriptions: imageUserDescriptions?.length ? imageUserDescriptions : undefined,
            screenFlow,
          }),
        });

        if (!planResponse.ok) {
          const errorData = await planResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate video plan");
        }

        const data = await planResponse.json();
        const planScenes: ScenePlan[] = data.scenes ?? [];
        const brand: BrandTokens = { ...DEFAULT_BRAND, ...(data.brand ?? {}) };
        const imageDescriptions: string[] = data.imageDescriptions ?? [];
        const bgSkill: string | undefined = data.bgSkill;

        if (!planScenes.length) {
          throw new Error("No scenes returned from planner");
        }

        pendingModelRef.current = model;
        pendingBrandRef.current = brand;

        // Apply waypoints from flow step to matching scenes
        const scenesWithWaypoints =
          waypointsByImage && Object.keys(waypointsByImage).length > 0
            ? planScenes.map((scene) => ({
                ...scene,
                cursorWaypoints:
                  scene.imageIndex !== undefined &&
                  (waypointsByImage[scene.imageIndex]?.length ?? 0) > 0
                    ? waypointsByImage[scene.imageIndex]
                    : scene.cursorWaypoints,
              }))
            : planScenes;

        setPendingPlan({ scenes: scenesWithWaypoints, brand, imageDescriptions, screenFlow, bgSkill });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Planning failed");
      } finally {
        setIsPlanning(false);
      }
    },
    [],
  );

  /**
   * Step 1: Entry point.
   * - If ≥2 images: detect story flow first, show flow approval step.
   * - Otherwise: go straight to planning.
   */
  const generateFullVideo = useCallback(
    async (prompt: string, model: ModelId, images: string[] = [], imageUserDescriptions?: string[]) => {
      // Stash all args so approveFlow can forward them to runPlan
      pendingImagesRef.current = images;
      pendingPromptRef.current = prompt;
      pendingDescriptionsRef.current = imageUserDescriptions ?? [];
      pendingModelRef.current = model;

      setError(null);
      setMasterComponent(null);
      setMasterCode(null);
      setScenes([]);
      setTotalDuration(0);
      setPendingPlan(null);
      setPendingFlow(null);

      if (images.length >= 2) {
        // Show flow editor immediately (empty), then fill in once detection completes
        setIsFlowDetecting(true);
        setPendingFlow({ images });

        try {
          const res = await fetch("/api/flow-analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images, userDescriptions: imageUserDescriptions }),
          });
          const data = res.ok ? await res.json() : null;
          const detectedFlow: ScreenFlow | undefined =
            Array.isArray(data?.transitions) && data.transitions.length > 0 ? data : undefined;
          setPendingFlow({ images, detectedFlow });
        } catch {
          // non-fatal — show empty flow for user to fill in
          setPendingFlow({ images });
        } finally {
          setIsFlowDetecting(false);
        }
      } else {
        // No multi-image flow needed — go straight to planning
        await runPlan(prompt, model, images, imageUserDescriptions, undefined, undefined);
      }
    },
    [runPlan],
  );

  /** Step 1b: User approves the flow → run /api/plan WITH the flow. */
  const approveFlow = useCallback(
    async (
      screenFlow: ScreenFlow,
      waypointsByImage: Record<number, CursorWaypoint[]>,
      descriptions?: string[],
    ) => {
      setPendingFlow(null);
      pendingScreenFlowRef.current = screenFlow;
      await runPlan(
        pendingPromptRef.current,
        pendingModelRef.current,
        pendingImagesRef.current,
        descriptions ?? pendingDescriptionsRef.current,
        screenFlow,
        waypointsByImage,
      );
    },
    [runPlan],
  );

  /** Step 2: User confirms (possibly edited) plan — pre-fetches voiceovers then starts generation. */
  const confirmPlan = useCallback(
    async (
      editedScenes: ScenePlan[],
      screenFlow?: ScreenFlow,
      _imageDescriptions?: string[],
    ) => {
      // ScenePlanEditor calls onConfirm without screenFlow — fall back to the ref
      // that was stored by approveFlow so multi-image story context is preserved.
      const effectiveFlow = screenFlow ?? pendingScreenFlowRef.current;
      pendingScreenFlowRef.current = effectiveFlow;
      setPendingPlan(null);
      // Pre-fetch ElevenLabs TTS for all scenes (parallel, non-blocking on failure)
      const scenesWithAudio = await prefetchVoiceovers(editedScenes);
      // Phase 3: Auto-align scene durations to match audio timing
      const { scenes: alignedScenes, adjustments } = alignSceneDurations(scenesWithAudio);
      if (adjustments.length > 0) {
        console.log(`Alignment: ${adjustments.length} scene(s) adjusted:`, adjustments.map(a => `"${a.title}" ${a.oldDuration}→${a.newDuration}f`).join(", "));
      }
      runGeneration(
        alignedScenes,
        pendingModelRef.current,
        pendingBrandRef.current,
        pendingImagesRef.current,
        effectiveFlow,
      );
    },
    [runGeneration],
  );

  /** Re-generate a single scene by index (bypasses cache). */
  const regenerateScene = useCallback(
    async (index: number) => {
      const scene = scenes[index];
      if (!scene) return;

      const model = pendingModelRef.current;
      const brand = pendingBrandRef.current;
      const images = pendingImagesRef.current;
      setRegeneratingSceneIndex(index);

      try {
        const scenePlan: ScenePlan = {
          id: index,
          title: scene.title,
          prompt: scene.prompt,
          skill: scene.skill,
          durationInFrames: scene.durationInFrames,
          imageIndex: scene.imageIndex,
          cursorWaypoints: scene.cursorWaypoints,
        };

        const updated = await processScene(scenePlan, model, brand, true, () => { }, images);

        setScenes((prev) => {
          const next = [...prev];
          next[index] = updated;
          const brand = pendingBrandRef.current;
          const musicStyle = brand.musicStyle ?? brand.accentName ?? "cinematic";
          const musicUrl = MUSIC_TRACKS[musicStyle] ?? MUSIC_TRACKS["cinematic"];
          const master = createMasterComponent(next, brand.bg, musicUrl, brand);
          const masterCodeStr = buildMasterCode(next);
          setMasterComponent(() => master);
          setMasterCode(masterCodeStr);
          return next;
        });
      } catch (err) {
        console.error("Scene regeneration failed:", err);
      } finally {
        setRegeneratingSceneIndex(null);
      }
    },
    [scenes],
  );

  /** Update a scene's code in-place (e.g. after cursor step edits), recompile with images. */
  const editSceneCode = useCallback(
    (index: number | null, newCode: string, images: string[] = []) => {
      if (index === null) return;
      setScenes((prev) => {
        if (!prev[index]) return prev;
        const result = compileCode(newCode, images, pendingBrandRef.current as Record<string, string>);
        if (result.error || !result.Component) return prev;
        const next = [...prev];
        next[index] = {
          ...next[index],
          code: newCode,
          Component: result.Component,
        };
        const brand = pendingBrandRef.current;
        const musicStyle = brand.musicStyle ?? brand.accentName ?? "cinematic";
        const musicUrl = MUSIC_TRACKS[musicStyle] ?? MUSIC_TRACKS["cinematic"];
        const master = createMasterComponent(next, brand.bg, musicUrl, brand);
        const masterCodeStr = buildMasterCode(next);
        setMasterComponent(() => master);
        setMasterCode(masterCodeStr);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setMasterComponent(null);
    setMasterCode(null);
    setScenes([]);
    setTotalDuration(0);
    setError(null);
    setProgress(null);
    setPendingPlan(null);
    setPendingFlow(null);
    setIsFlowDetecting(false);
  }, []);

  return {
    generateFullVideo,
    approveFlow,
    confirmPlan,
    regenerateScene,
    editSceneCode,
    isPlanning,
    isFlowDetecting,
    isGenerating,
    progress,
    scenes,
    masterComponent,
    masterCode,
    totalDuration,
    error,
    pendingPlan,
    pendingFlow,
    regeneratingSceneIndex,
    reset,
    /** Stable ref holding current brand tokens — read .current for Lambda export */
    pendingBrandRef,
    /** Stable ref holding the confirmed screen flow — available for re-plan scenarios */
    pendingScreenFlowRef,
  };
}
