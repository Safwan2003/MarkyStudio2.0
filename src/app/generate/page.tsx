"use client";

import { Loader2 } from "lucide-react";
import type { NextPage } from "next";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { AnimationPlayer } from "../../components/AnimationPlayer";
import { DEFAULT_VOICE_ID } from "../../components/AnimationPlayer/SettingsModal";
import { ChatSidebar, type ChatSidebarRef } from "../../components/ChatSidebar";
import { CodeEditor } from "../../components/CodeEditor";
import { CursorEditor } from "../../components/CursorEditor";
import { PageLayout } from "../../components/PageLayout";
import { ScenePlanEditor } from "../../components/ScenePlanEditor";
import { ScreenshotFlowEditor } from "../../components/ScenePlanEditor/ScreenshotFlowEditor";
import { SceneTimeline } from "../../components/SceneTimeline";
import { TabPanel } from "../../components/TabPanel";
import {
  buildSceneCodeSignature,
  makeRuntimeFailureKey,
  normalizeRuntimeErrorMessage,
} from "./runtime-recovery";
import { useCursorSteps } from "../../hooks/useCursorSteps";
import { useFullVideoGeneration } from "../../hooks/useFullVideoGeneration";
import type { ConversationMessage } from "../../types/conversation";
import type { ModelId } from "../../types/generation";

/** Parse an @mention from a chat prompt and return the matching scene index, or null.
 *
 * Handles these formats (case-insensitive):
 *   @1          → scene index 0
 *   @2          → scene index 1
 *   @Scene1     → scene index 0
 *   @scene-1    → scene index 0
 *   @scene 1    → scene index 0
 *   @intro      → fuzzy title match
 *   @showcase   → fuzzy title match
 *
 * The mention is captured up to the first whitespace that is NOT part of
 * a "scene N" pattern, so "@Scene 1 make it darker" correctly extracts "scene 1".
 */
function parseSceneMention(prompt: string, scenes: { title: string }[]): number | null {
  // Match @word or @"scene N" (with optional separator and digit)
  const match = prompt.match(/@(scene[-\s]?\d+|\d+|[\w-]+)/i);
  if (!match) return null;
  const mention = match[1].trim().toLowerCase();

  // Numeric: @1, @2, @scene-1, @scene 2
  const numMatch = mention.match(/^(?:scene[-\s]?)?(\d+)$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    return idx >= 0 && idx < scenes.length ? idx : null;
  }

  // Title fuzzy: @intro, @showcase, @cta
  const idx = scenes.findIndex((s) => {
    const t = s.title.toLowerCase();
    return t.includes(mention) || mention.includes(t);
  });
  return idx >= 0 ? idx : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(role: string) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildRuntimeRetryInstruction(message: string, repeatedSameFailure = false): string {
  const normalized = message.toLowerCase();

  if (repeatedSameFailure) {
    return "The same runtime failure happened again after regeneration. Rebuild this scene conservatively: remove duplicate helpers and duplicate locals, declare all base coordinates/targets before derived values, simplify nested animation chains, and prefer a single straightforward component tree over layered abstractions.";
  }

  const beforeInitMatch = message.match(/Cannot access ['"`]?([A-Za-z_$][\w$]*)['"`]?\s+before initialization/i);
  if (beforeInitMatch?.[1]) {
    return `Fix the runtime error by declaring \`${beforeInitMatch[1]}\` before any initializer that reads it. All coordinates, target rects, timing constants, and derived animation values must be declared in dependency order with no same-scope forward references.`;
  }

  const duplicateDeclMatch = message.match(/Identifier ['"`]?([A-Za-z_$][\w$]*)['"`]?\s+has already been declared/i);
  if (duplicateDeclMatch?.[1]) {
    return `Fix the runtime error by removing the duplicate declaration of \`${duplicateDeclMatch[1]}\`. Keep exactly one same-scope declaration for each local name and reuse or rename the variable instead of redeclaring it.`;
  }

  if (normalized.includes("springconfig")) {
    return "Fix the runtime error by removing `springConfig` and using only `SPRING_CONFIGS` or an inline Remotion spring config object. Do not reference undeclared aliases.";
  }
  if (normalized.includes("spring(...).to is not a function") || (normalized.includes(".to is not a function") && normalized.includes("spring"))) {
    return "Fix the runtime error by removing any `spring(...).to(...)` usage. Remotion `spring()` returns a number, so use it directly with `interpolate()` or numeric style props.";
  }
  if (normalized.includes("lifeDuration")) {
    return "Fix the runtime error by removing `lifeDuration` and replacing it with explicit frame constants or `durationInFrames`.";
  }
  if (normalized.includes("nan") || normalized.includes("invalid value for the") || normalized.includes("infinity")) {
    return "Fix the runtime error by ensuring all computed style values are finite numbers. Guard every position, size, opacity, and transform input with safe fallbacks like `?? 0`, clamps, and `Number.isFinite(...)` checks.";
  }
  if (normalized.includes("is not defined")) {
    return "Fix the runtime error by removing invented variables/components and using only declared locals plus injected scope variables already provided by the runtime.";
  }
  if (normalized.includes("cannot read") || normalized.includes("undefined") || normalized.includes("null")) {
    return "Fix the runtime error by adding null-safe guards and optional chaining for all nested data access, including `UI_SCHEMA`, `VISUAL_STATE`, arrays, and image references.";
  }

  return `Fix this runtime error without changing the scene's creative intent: ${message}`;
}

function findSceneIndexForFrame(
  scenes: Array<{ durationInFrames: number }>,
  frame: number,
): number {
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    const sceneEnd = offset + scenes[i].durationInFrames;
    if (frame < sceneEnd) return i;
    offset = sceneEnd;
  }
  return Math.max(0, scenes.length - 1);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function GeneratePageContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const initialModel = (searchParams.get("model") || undefined) as ModelId | undefined;

  const [prompt, setPrompt] = useState(initialPrompt);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [durationInFrames, setDurationInFrames] = useState(150);
  const [fps, setFps] = useState(30);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [seekFrame, setSeekFrame] = useState<number | null>(null);
  const [voiceId, setVoiceId] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_VOICE_ID;
    return localStorage.getItem("preferredVoiceId") ?? DEFAULT_VOICE_ID;
  });

  const handleVoiceIdChange = (id: string) => {
    setVoiceId(id);
    localStorage.setItem("preferredVoiceId", id);
  };

  // Attached images (passed to every scene as ATTACHED_IMAGES).
  // Lazy initializer restores images that were stored in sessionStorage by the landing page.
  const [attachedImages, setAttachedImages] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("initialAttachedImages");
      if (stored) {
        sessionStorage.removeItem("initialAttachedImages");
        const imgs = JSON.parse(stored);
        return Array.isArray(imgs) ? imgs : [];
      }
    } catch {}
    return [];
  });

  // User-typed per-screenshot descriptions (from landing page)
  const [imageUserDescriptions, setImageUserDescriptions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("initialImageUserDescriptions");
      if (stored) {
        sessionStorage.removeItem("initialImageUserDescriptions");
        const descs = JSON.parse(stored);
        return Array.isArray(descs) ? descs : [];
      }
    } catch {}
    return [];
  });
  const initialImageUserDescriptionsRef = useRef<string[]>(imageUserDescriptions);

  // Logo image uploaded on landing page (base64 data URL)
  const initialLogoImage = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("initialLogoImage");
      if (stored) {
        sessionStorage.removeItem("initialLogoImage");
        return stored;
      }
    } catch {}
    return null;
  })[0];

  // Stable ref so the auto-start effect (empty deps) can read the initial images
  const initialImagesRef = useRef<string[]>(attachedImages);

  // Index of the scene currently being edited in CursorEditor
  const [cursorSceneIndex, setCursorSceneIndex] = useState<number | null>(null);

  // Chat history — typed messages shown in ChatHistory
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<
    { skills?: string[]; startedAt: number } | undefined
  >(undefined);

  const chatSidebarRef = useRef<ChatSidebarRef>(null);
  const hasAutoStarted = useRef(false);
  const prevMasterCode = useRef<string | null>(null);
  const runtimeLoggedRef = useRef<Set<string>>(new Set());
  const runtimeFailureStateRef = useRef<Map<number, { codeSignature: string; failures: Set<string> }>>(new Map());

  const {
    generateFullVideo,
    approveFlow,
    confirmPlan,
    regenerateScene,
    regenerateSceneWithEdit,
    editSceneCode,
    isPlanning,
    isFlowDetecting,
    isPrefetchingAudio,
    isGenerating: isFullVideoGenerating,
    progress: fullVideoProgress,
    scenes: fullVideoScenes,
    masterComponent,
    masterCode,
    masterVoiceovers,
    totalDuration,
    error: fullVideoError,
    pendingPlan,
    pendingFlow,
    regeneratingSceneIndex,
    reset: resetFullVideo,
    pendingBrandRef,
    setLogoImage,
    revisePlan,
    isRevising,
  } = useFullVideoGeneration();

  // Wire uploaded logo into brand before first generation
  useEffect(() => {
    if (initialLogoImage) setLogoImage(initialLogoImage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFullVideoBusy = isPlanning || isPrefetchingAudio || isFullVideoGenerating;

  // Cursor steps for the currently-selected scene
  const selectedSceneCode = cursorSceneIndex !== null
    ? (fullVideoScenes[cursorSceneIndex]?.code ?? "")
    : "";

  const { steps: cursorSteps, updateSteps } = useCursorSteps(
    selectedSceneCode,
    (newCode) => editSceneCode(cursorSceneIndex, newCode, attachedImages),
  );

  // Which scenes have CURSOR_STEPS defined
  const sceneHasCursorSteps = fullVideoScenes.map((s) =>
    /const\s+CURSOR_STEPS\s*=/.test(s.code),
  );

  // Scenes where compilation failed — empty code = placeholder
  const failedScenes = fullVideoScenes.map((s) => s.code === "");
  const auditScores = fullVideoScenes.map((s) => s.auditScore ?? null);
  const ahaMomentScenes = fullVideoScenes.map((s) => s.isAhaMoment ?? false);

  const hasCursorContent =
    cursorSceneIndex !== null && sceneHasCursorSteps[cursorSceneIndex];

  // -------------------------------------------------------------------------
  // Chat message helpers
  // -------------------------------------------------------------------------

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: makeId("user"),
        role: "user",
        content,
        timestamp: Date.now(),
      } as ConversationMessage,
    ]);
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: makeId("assistant"),
        role: "assistant",
        content,
        timestamp: Date.now(),
      } as ConversationMessage,
    ]);
  }, []);

  const addErrorMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: makeId("error"),
        role: "error",
        content,
        errorType: "api",
        timestamp: Date.now(),
      } as ConversationMessage,
    ]);
  }, []);

  // -------------------------------------------------------------------------
  // Completion + error side-effects
  // -------------------------------------------------------------------------

  // Track which failed scenes have already been auto-retried this session
  const autoRetriedRef = useRef<Set<number>>(new Set());
  const clearRetryState = useCallback(() => {
    autoRetriedRef.current.clear();
    runtimeLoggedRef.current.clear();
    runtimeFailureStateRef.current.clear();
  }, []);

  // New masterCode = generation succeeded
  useEffect(() => {
    if (masterCode && masterCode !== prevMasterCode.current) {
      prevMasterCode.current = masterCode;
      setPendingMessage(undefined);
      const failed = fullVideoScenes.filter((s) => s.code === "");
      const sceneNames = fullVideoScenes.map((s) => s.title).join(" → ");
      addAssistantMessage(
        failed.length > 0
          ? `Video ready — ${fullVideoScenes.length} scenes: ${sceneNames}\n\n⚠ ${failed.length} scene${failed.length > 1 ? "s" : ""} failed to generate and will auto-retry.`
          : `Video ready — ${fullVideoScenes.length} scenes: ${sceneNames}`,
      );
    }
  }, [masterCode, fullVideoScenes, addAssistantMessage]);

  useEffect(() => {
    const nextState = new Map<number, { codeSignature: string; failures: Set<string> }>();
    fullVideoScenes.forEach((scene, index) => {
      const codeSignature = buildSceneCodeSignature(scene.code);
      const previous = runtimeFailureStateRef.current.get(index);
      if (previous && previous.codeSignature === codeSignature) {
        nextState.set(index, previous);
      } else {
        nextState.set(index, { codeSignature, failures: new Set() });
      }
    });
    runtimeFailureStateRef.current = nextState;
  }, [fullVideoScenes]);

  useEffect(() => {
    if (fullVideoScenes.length === 0) {
      clearRetryState();
    }
  }, [clearRetryState, fullVideoScenes.length]);

  // Auto-retry failed scenes after generation completes (staggered to avoid API hammering)
  useEffect(() => {
    if (isFullVideoBusy || regeneratingSceneIndex !== null) return;
    if (!masterCode) return;

    const failedIndices = fullVideoScenes
      .map((s, i) => (s.code === "" ? i : -1))
      .filter((i) => i !== -1 && !autoRetriedRef.current.has(i));

    if (failedIndices.length === 0) return;

    // Don't auto-retry if we know the API quota is exhausted — it will just fail again
    const lastError = fullVideoError ?? "";
    const normalizedError = lastError.toLowerCase();
    if (
      normalizedError.includes("quota") ||
      lastError.includes("429") ||
      lastError.includes("503") ||
      normalizedError.includes("unavailable") ||
      normalizedError.includes("high demand") ||
      normalizedError.includes("rate limit")
    ) {
      return;
    }

    // Mark all as retried immediately to prevent re-triggering
    failedIndices.forEach((i) => autoRetriedRef.current.add(i));

    // Stagger retries: first one immediately, subsequent ones 3s apart
    failedIndices.forEach((sceneIndex, offset) => {
      setTimeout(() => {
        regenerateScene(sceneIndex);
      }, offset * 3000);
    });
  }, [isFullVideoBusy, regeneratingSceneIndex, masterCode, fullVideoScenes, regenerateScene]);

  // fullVideoError = generation failed
  useEffect(() => {
    if (fullVideoError) {
      setPendingMessage(undefined);
      addErrorMessage(fullVideoError);
    }
  }, [fullVideoError, addErrorMessage]);

  useEffect(() => {
    const onSceneRuntimeError = (event: Event) => {
      const detail = (event as CustomEvent<{ sceneName?: string | null; message?: string }>).detail;
      const sceneName = detail?.sceneName?.trim();
      const message = detail?.message?.trim() || "Unknown runtime error";
      const normalizedMessage = normalizeRuntimeErrorMessage(message);
      const baseLogKey = `${sceneName ?? "unknown"}::${normalizedMessage}`;

      if (!sceneName || isFullVideoBusy || regeneratingSceneIndex !== null) return;
      const sceneIndex = fullVideoScenes.findIndex((scene) => scene.title === sceneName);
      if (sceneIndex === -1) return;
      const sceneCode = fullVideoScenes[sceneIndex]?.code ?? "";
      const codeSignature = buildSceneCodeSignature(sceneCode);
      const logKey = `${baseLogKey}::${codeSignature}`;
      if (!runtimeLoggedRef.current.has(logKey)) {
        runtimeLoggedRef.current.add(logKey);
        addErrorMessage(
          sceneName
            ? `Runtime error in "${sceneName}": ${message}`
            : `Runtime error in preview: ${message}`,
        );
      }
      const failureKey = makeRuntimeFailureKey(sceneIndex, sceneCode, message);
      const state = runtimeFailureStateRef.current.get(sceneIndex) ?? {
        codeSignature,
        failures: new Set<string>(),
      };
      const repeatedSameFailure = state.failures.has(failureKey);
      if (repeatedSameFailure) {
        const pausedKey = `${logKey}::paused`;
        if (!runtimeLoggedRef.current.has(pausedKey)) {
          runtimeLoggedRef.current.add(pausedKey);
          addErrorMessage(`Auto-repair paused for "${sceneName}" because the same runtime failure repeated after regeneration.`);
        }
        return;
      }

      state.failures.add(failureKey);
      runtimeFailureStateRef.current.set(sceneIndex, state);
      const retryInstruction = buildRuntimeRetryInstruction(message, repeatedSameFailure);
      setTimeout(() => {
        regenerateSceneWithEdit(sceneIndex, retryInstruction);
      }, 1200);
    };

    window.addEventListener("scene-runtime-error", onSceneRuntimeError as EventListener);
    return () => {
      window.removeEventListener("scene-runtime-error", onSceneRuntimeError as EventListener);
    };
  }, [addErrorMessage, fullVideoScenes, isFullVideoBusy, regeneratingSceneIndex, regenerateSceneWithEdit]);

  // Update player duration when full video is ready
  useEffect(() => {
    if (totalDuration > 0) setDurationInFrames(totalDuration);
  }, [totalDuration]);

  // Clear cursorSceneIndex if scenes are reset or shrink past the selected index
  useEffect(() => {
    if (fullVideoScenes.length === 0) setCursorSceneIndex(null);
    else if (cursorSceneIndex !== null && cursorSceneIndex >= fullVideoScenes.length) setCursorSceneIndex(null);
  }, [fullVideoScenes.length, cursorSceneIndex]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleGenerate = useCallback(
    async (promptText: string, model: ModelId, images?: string[], userDescriptions?: string[]) => {
      if (!promptText.trim() || isFullVideoBusy) return;

      // If a video already exists and no new images are being uploaded,
      // check for an @mention targeting a specific scene — route to per-scene edit.
      if (fullVideoScenes.length > 0 && !images?.length) {
        const targetIndex = parseSceneMention(promptText, fullVideoScenes);
        if (targetIndex !== null) {
          addUserMessage(promptText);
          setPendingMessage({ startedAt: Date.now() });
          const targetTitle = fullVideoScenes[targetIndex]?.title ?? `Scene ${targetIndex + 1}`;
          addAssistantMessage(`Editing "${targetTitle}" only…`);
          await regenerateSceneWithEdit(targetIndex, promptText, model);
          setPendingMessage(undefined);
          addAssistantMessage(`"${targetTitle}" updated.`);
          return;
        }
      }

      // Default: full video regeneration
      prevMasterCode.current = null;
      clearRetryState();
      setAttachedImages(images ?? []);
      addUserMessage(promptText);
      setPendingMessage({ startedAt: Date.now() });
      resetFullVideo();
      generateFullVideo(promptText, model, images, userDescriptions);
    },
    [isFullVideoBusy, fullVideoScenes, addUserMessage, addAssistantMessage, clearRetryState, resetFullVideo, generateFullVideo, regenerateSceneWithEdit],
  );


  const handleSeek = useCallback((frame: number) => {
    setSeekFrame(frame);
  }, []);

  const handlePlayerRuntimeError = useCallback((message: string) => {
    const trimmed = message.trim() || "Unknown runtime error";
    const normalizedMessage = normalizeRuntimeErrorMessage(trimmed);
    if (isFullVideoBusy || regeneratingSceneIndex !== null || fullVideoScenes.length === 0) return;

    const sceneIndex = findSceneIndexForFrame(fullVideoScenes, currentFrame);
    const sceneCode = fullVideoScenes[sceneIndex]?.code ?? "";
    const codeSignature = buildSceneCodeSignature(sceneCode);
    const previewLogKey = `preview::${normalizedMessage}::${codeSignature}`;
    if (!runtimeLoggedRef.current.has(previewLogKey)) {
      runtimeLoggedRef.current.add(previewLogKey);
      addErrorMessage(`Preview runtime error: ${trimmed}`);
    }
    const failureKey = makeRuntimeFailureKey(sceneIndex, sceneCode, trimmed);
    const state = runtimeFailureStateRef.current.get(sceneIndex) ?? {
      codeSignature,
      failures: new Set<string>(),
    };
    const repeatedSameFailure = state.failures.has(failureKey);
    if (repeatedSameFailure) {
      return;
    }

    state.failures.add(failureKey);
    runtimeFailureStateRef.current.set(sceneIndex, state);
    const retryInstruction = buildRuntimeRetryInstruction(trimmed, repeatedSameFailure);
    setTimeout(() => {
      regenerateSceneWithEdit(sceneIndex, retryInstruction);
    }, 1200);
  }, [
    addErrorMessage,
    currentFrame,
    fullVideoScenes,
    isFullVideoBusy,
    regeneratingSceneIndex,
    regenerateSceneWithEdit,
  ]);

  // Auto-trigger from URL param (reads images from ref so the empty-dep closure gets them)
  useEffect(() => {
    if (initialPrompt && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const model = initialModel ?? ("gemini-2.5-flash:none" as ModelId);
      setTimeout(
        () => handleGenerate(initialPrompt, model, initialImagesRef.current, initialImageUserDescriptionsRef.current),
        200,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const cursorEditorContent = hasCursorContent ? (
    <CursorEditor
      steps={cursorSteps}
      onStepsChange={updateSteps}
      durationInFrames={
        fullVideoScenes[cursorSceneIndex!]?.durationInFrames ?? durationInFrames
      }
      fps={fps}
      preloadedImage={(() => { const idx = fullVideoScenes[cursorSceneIndex!]?.imageIndex ?? 0; return idx < attachedImages.length ? attachedImages[idx] : attachedImages[0]; })()}
    />
  ) : undefined;

  return (
    <PageLayout showLogoAsLink>
      <div className="flex-1 flex flex-col min-[1000px]:flex-row min-w-0 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          ref={chatSidebarRef}
          messages={messages}
          pendingMessage={pendingMessage}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          isLoading={isFullVideoBusy}
          initialModel={initialModel}
          hasExistingScenes={fullVideoScenes.length > 0}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 pr-12 pb-8 overflow-hidden">
          <ErrorBoundary>
          <TabPanel
            codeContent={
              <CodeEditor
                code={masterCode ?? ""}
                onChange={() => {}}
                isStreaming={false}
                streamPhase="idle"
              />
            }
            previewContent={
              <div className="relative h-full flex flex-col">
                <AnimationPlayer
                  Component={masterComponent}
                  durationInFrames={durationInFrames}
                  fps={fps}
                  onDurationChange={setDurationInFrames}
                  onFpsChange={setFps}
                  isCompiling={false}
                  isStreaming={isFullVideoBusy}
                  error={fullVideoError}
                  errorType="compilation"
                  code={masterCode ?? ""}
                  masterCode={masterCode ?? undefined}
                  renderImages={attachedImages}
                  renderBrand={pendingBrandRef.current as Record<string, string>}
                  renderVoiceovers={masterVoiceovers}
                  onRuntimeError={handlePlayerRuntimeError}
                  onFrameChange={setCurrentFrame}
                  seekFrame={seekFrame}
                  isCursorMode={false}
                  onToggleCursorMode={() => {}}
                  onCoordinateCapture={() => {}}
                  isQualityChecking={false}
                  qualityMode={false}
                  onQualityModeChange={() => {}}
                  voiceId={voiceId}
                  onVoiceIdChange={handleVoiceIdChange}
                />

                {/* Scene timeline */}
                {masterComponent && fullVideoScenes.length > 0 && (
                  <SceneTimeline
                    scenes={fullVideoScenes.map((s) => ({
                      title: s.title,
                      durationInFrames: s.durationInFrames,
                    }))}
                    currentFrame={currentFrame}
                    totalDuration={totalDuration}
                    fps={fps}
                    onSeek={handleSeek}
                    onRegenerateScene={regenerateScene}
                    regeneratingIndex={regeneratingSceneIndex}
                    hasCursorSteps={sceneHasCursorSteps}
                    failedScenes={failedScenes}
                    auditScores={auditScores}
                    ahaMomentScenes={ahaMomentScenes}
                    onEditCursor={setCursorSceneIndex}
                  />
                )}

                {/* Generation progress overlay */}
                {isFullVideoBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-foreground mx-auto" />
                      <div>
                        {isPlanning ? (
                          <p className="text-sm font-medium text-foreground">
                            Planning scenes...
                          </p>
                        ) : isPrefetchingAudio ? (
                          <>
                            <p className="text-sm font-medium text-foreground">
                              Generating voiceovers...
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Synthesising narration for each scene
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-foreground">
                              Generating scene{" "}
                              {fullVideoProgress?.current ?? 1} of{" "}
                              {fullVideoProgress?.total ?? "?"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {fullVideoProgress?.sceneTitle}
                            </p>
                          </>
                        )}
                      </div>
                      {fullVideoProgress && (
                        <div className="flex gap-1 justify-center">
                          {Array.from({ length: fullVideoProgress.total }).map(
                            (_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 w-8 rounded-full transition-colors ${
                                  i < fullVideoProgress.current - 1
                                    ? "bg-teal-500"
                                    : i === fullVideoProgress.current - 1
                                      ? "bg-teal-400 animate-pulse"
                                      : "bg-muted"
                                }`}
                              />
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            }
            planContent={
              pendingFlow ? (
                // Step 1: flow approval (runs before planning)
                <ScreenshotFlowEditor
                  inline
                  images={pendingFlow.images}
                  initialFlow={pendingFlow.detectedFlow}
                  onSave={(flow, descriptions, waypointsByImage, keyFrameIndices) =>
                    approveFlow(flow, waypointsByImage, descriptions, keyFrameIndices)
                  }
                  isDetectingProp={isFlowDetecting}
                />
              ) : pendingPlan ? (
                // Step 2: plan editor
                <ScenePlanEditor
                  scenes={pendingPlan.scenes}
                  brand={pendingPlan.brand}
                  images={attachedImages.length > 0 ? attachedImages : undefined}
                  imageDescriptions={pendingPlan.imageDescriptions}
                  onConfirm={(scenes, flow, descs) => confirmPlan(scenes, flow, descs, voiceId)}
                  onImageRemove={(idx) => {
                    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));
                    setImageUserDescriptions((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  onRevise={revisePlan}
                  isRevising={isRevising}
                />
              ) : undefined
            }
            cursorContent={cursorEditorContent}
          />
          </ErrorBoundary>
        </div>
      </div>
    </PageLayout>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-foreground" />
    </div>
  );
}

const GeneratePage: NextPage = () => (
  <Suspense fallback={<LoadingFallback />}>
    <GeneratePageContent />
  </Suspense>
);

export default GeneratePage;
