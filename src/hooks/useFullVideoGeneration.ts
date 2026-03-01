"use client";

import {
  extractComponentCode,
  stripMarkdownFences,
} from "@/helpers/sanitize-response";
import { compileCode, extractComponentBody } from "@/remotion/compiler";
import type { BrandTokens, ModelId, ScenePlan } from "@/types/generation";
import React, { useCallback, useRef, useState } from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";

export interface CompiledScene {
  Component: React.ComponentType;
  durationInFrames: number;
  code: string;
  title: string;
  prompt: string;
  skill: string;
}

// Module-level cache — persists for the browser session
const sceneCache = new Map<string, CompiledScene>();

function cacheKey(scene: ScenePlan): string {
  return `${scene.skill}::${scene.prompt.slice(0, 80)}`;
}

const FADE_FRAMES = 8;

function withFade(
  SceneComp: React.ComponentType,
  duration: number,
): React.ComponentType {
  return function FadedScene() {
    const frame = useCurrentFrame();
    const opacity = interpolate(
      frame,
      [0, FADE_FRAMES, duration - FADE_FRAMES, duration],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return React.createElement(
      AbsoluteFill,
      { style: { opacity } },
      React.createElement(SceneComp),
    );
  };
}

function createMasterComponent(scenes: CompiledScene[]): React.ComponentType {
  const fadedScenes = scenes.map((s) => ({
    Component: withFade(s.Component, s.durationInFrames),
    durationInFrames: s.durationInFrames,
  }));

  return function MasterVideo() {
    let offset = 0;
    return React.createElement(
      AbsoluteFill,
      null,
      ...fadedScenes.map(({ Component: SceneComp, durationInFrames }, i) => {
        const from = offset;
        offset += durationInFrames;
        return React.createElement(Sequence, {
          key: i,
          from,
          durationInFrames,
          children: React.createElement(SceneComp),
        });
      }),
    );
  };
}

/** Build a Lambda-ready code string from compiled scenes. */
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

/** Consume an SSE stream from /api/generate and return the final code string. */
async function consumeSceneGeneration(
  scene: ScenePlan,
  model: string,
  errorContext?: string,
): Promise<string> {
  const prompt = errorContext
    ? `${scene.prompt}\n\nPrevious attempt failed with this error:\n${errorContext}\nPlease fix the issues and regenerate.`
    : scene.prompt;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model,
      isFollowUp: Boolean(errorContext),
      forcedSkills: scene.skill ? [scene.skill] : undefined,
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

/** Generate, compile, and error-recover a single scene. Never throws. */
async function processScene(
  scene: ScenePlan,
  model: string,
  bypassCache: boolean,
  onProgress: (title: string) => void,
): Promise<CompiledScene> {
  const key = cacheKey(scene);

  if (!bypassCache && sceneCache.has(key)) {
    onProgress(scene.title);
    return sceneCache.get(key)!;
  }

  onProgress(scene.title);

  // First attempt
  try {
    const code = await consumeSceneGeneration(scene, model);
    if (code.trim()) {
      const result = compileCode(code);
      if (!result.error && result.Component) {
        const compiled: CompiledScene = {
          Component: result.Component,
          durationInFrames: scene.durationInFrames,
          code,
          title: scene.title,
          prompt: scene.prompt,
          skill: scene.skill,
        };
        sceneCache.set(key, compiled);
        return compiled;
      }

      // Retry with error context
      try {
        const retryCode = await consumeSceneGeneration(
          scene,
          model,
          result.error ?? "Compilation failed — JSX or syntax error",
        );
        if (retryCode.trim()) {
          const retryResult = compileCode(retryCode);
          if (!retryResult.error && retryResult.Component) {
            const compiled: CompiledScene = {
              Component: retryResult.Component,
              durationInFrames: scene.durationInFrames,
              code: retryCode,
              title: scene.title,
              prompt: scene.prompt,
              skill: scene.skill,
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

  // Both attempts failed — return a visible placeholder
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

const CONCURRENCY = 2;

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
  } | null>(null);
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<
    number | null
  >(null);

  const pendingModelRef = useRef<string>("gemini-2.5-flash:none");

  /** Core generation loop — runs scenes in parallel batches. */
  const runGeneration = useCallback(
    async (planScenes: ScenePlan[], model: string) => {
      setIsGenerating(true);
      setError(null);
      setScenes([]);
      setMasterComponent(null);
      setMasterCode(null);

      try {
        const compiledScenesArr: CompiledScene[] = new Array(planScenes.length);

        for (let i = 0; i < planScenes.length; i += CONCURRENCY) {
          const batch = planScenes.slice(i, i + CONCURRENCY);

          setProgress({
            current: i + 1,
            total: planScenes.length,
            sceneTitle: batch[0].title,
          });

          const batchResults = await Promise.allSettled(
            batch.map((scene, j) =>
              processScene(scene, model, false, (title) => {
                setProgress({
                  current: i + j + 1,
                  total: planScenes.length,
                  sceneTitle: title,
                });
              }),
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
        const master = createMasterComponent(validScenes);
        const masterCodeStr = buildMasterCode(validScenes);
        const total = validScenes.reduce(
          (sum, s) => sum + s.durationInFrames,
          0,
        );

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
  const generateFullVideo = useCallback(
    async (prompt: string, model: ModelId) => {
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
          body: JSON.stringify({ prompt, model }),
        });

        if (!planResponse.ok) {
          const errorData = await planResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate video plan");
        }

        const data = await planResponse.json();
        const planScenes: ScenePlan[] = data.scenes ?? [];
        const brand: BrandTokens = data.brand ?? {
          primary: "#6366f1",
          secondary: "#a78bfa",
          bg: "#0f0f1a",
          font: "Inter",
          accentName: "indigo",
        };

        if (!planScenes.length) {
          throw new Error("No scenes returned from planner");
        }

        pendingModelRef.current = model;
        setPendingPlan({ scenes: planScenes, brand });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Planning failed");
      } finally {
        setIsPlanning(false);
      }
    },
    [runGeneration],
  );

  /** Step 2: User confirms (possibly edited) plan — starts generation. */
  const confirmPlan = useCallback(
    (editedScenes: ScenePlan[]) => {
      setPendingPlan(null);
      runGeneration(editedScenes, pendingModelRef.current);
    },
    [runGeneration],
  );

  /** Re-generate a single scene by index (bypasses cache). */
  const regenerateScene = useCallback(
    async (index: number) => {
      const scene = scenes[index];
      if (!scene) return;

      const model = pendingModelRef.current;
      setRegeneratingSceneIndex(index);

      try {
        const scenePlan: ScenePlan = {
          id: index,
          title: scene.title,
          prompt: scene.prompt,
          skill: scene.skill,
          durationInFrames: scene.durationInFrames,
        };

        const updated = await processScene(scenePlan, model, true, () => {});

        setScenes((prev) => {
          const next = [...prev];
          next[index] = updated;
          const master = createMasterComponent(next);
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

  const reset = useCallback(() => {
    setMasterComponent(null);
    setMasterCode(null);
    setScenes([]);
    setTotalDuration(0);
    setError(null);
    setProgress(null);
    setPendingPlan(null);
  }, []);

  return {
    generateFullVideo,
    confirmPlan,
    regenerateScene,
    isPlanning,
    isGenerating,
    progress,
    scenes,
    masterComponent,
    masterCode,
    totalDuration,
    error,
    pendingPlan,
    regeneratingSceneIndex,
    reset,
  };
}
