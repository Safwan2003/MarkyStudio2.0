"use client";

import { Loader2 } from "lucide-react";
import type { NextPage } from "next";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimationPlayer } from "../../components/AnimationPlayer";
import { ChatSidebar, type ChatSidebarRef } from "../../components/ChatSidebar";
import { CodeEditor } from "../../components/CodeEditor";
import { CursorEditor } from "../../components/CursorEditor";
import { PageLayout } from "../../components/PageLayout";
import { ScenePlanEditor } from "../../components/ScenePlanEditor";
import { SceneTimeline } from "../../components/SceneTimeline";
import { TabPanel } from "../../components/TabPanel";
import { useCursorSteps } from "../../hooks/useCursorSteps";
import { useFullVideoGeneration } from "../../hooks/useFullVideoGeneration";
import type { ConversationMessage } from "../../types/conversation";
import type { ModelId, ScenePlan } from "../../types/generation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(role: string) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  // Attached images (passed to every scene as ATTACHED_IMAGES)
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

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

  const {
    generateFullVideo,
    confirmPlan,
    regenerateScene,
    editSceneCode,
    isPlanning,
    isGenerating: isFullVideoGenerating,
    progress: fullVideoProgress,
    scenes: fullVideoScenes,
    masterComponent,
    masterCode,
    totalDuration,
    error: fullVideoError,
    pendingPlan,
    regeneratingSceneIndex,
    reset: resetFullVideo,
    pendingBrandRef,
  } = useFullVideoGeneration();

  const isFullVideoBusy = isPlanning || isFullVideoGenerating;

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

  // New masterCode = generation succeeded
  useEffect(() => {
    if (masterCode && masterCode !== prevMasterCode.current) {
      prevMasterCode.current = masterCode;
      setPendingMessage(undefined);
      const sceneNames = fullVideoScenes.map((s) => s.title).join(" → ");
      addAssistantMessage(
        `Video ready — ${fullVideoScenes.length} scenes: ${sceneNames}`,
      );
    }
  }, [masterCode, fullVideoScenes, addAssistantMessage]);

  // fullVideoError = generation failed
  useEffect(() => {
    if (fullVideoError) {
      setPendingMessage(undefined);
      addErrorMessage(fullVideoError);
    }
  }, [fullVideoError, addErrorMessage]);

  // Update player duration when full video is ready
  useEffect(() => {
    if (totalDuration > 0) setDurationInFrames(totalDuration);
  }, [totalDuration]);

  // Clear cursorSceneIndex if scenes are reset
  useEffect(() => {
    if (fullVideoScenes.length === 0) setCursorSceneIndex(null);
  }, [fullVideoScenes.length]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleGenerate = useCallback(
    (promptText: string, model: ModelId, images?: string[]) => {
      if (!promptText.trim() || isFullVideoBusy) return;
      prevMasterCode.current = null; // reset so completion fires
      setAttachedImages(images ?? []);
      addUserMessage(promptText);
      setPendingMessage({ startedAt: Date.now() });
      resetFullVideo();
      generateFullVideo(promptText, model, images);
    },
    [isFullVideoBusy, addUserMessage, resetFullVideo, generateFullVideo],
  );

  const handleConfirmPlan = useCallback(
    (editedScenes: ScenePlan[]) => {
      confirmPlan(editedScenes);
    },
    [confirmPlan],
  );

  const handleSeek = useCallback((frame: number) => {
    setSeekFrame(frame);
  }, []);

  // Auto-trigger from URL param
  useEffect(() => {
    if (initialPrompt && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const model = initialModel ?? ("gemini-2.5-flash:none" as ModelId);
      setTimeout(() => handleGenerate(initialPrompt, model), 200);
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
      preloadedImage={attachedImages[0]}
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
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 pr-12 pb-8 overflow-hidden">
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
                  onFrameChange={setCurrentFrame}
                  seekFrame={seekFrame}
                  isCursorMode={false}
                  onToggleCursorMode={() => {}}
                  onCoordinateCapture={() => {}}
                  isQualityChecking={false}
                  qualityMode={false}
                  onQualityModeChange={() => {}}
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
              pendingPlan ? (
                <ScenePlanEditor
                  scenes={pendingPlan.scenes}
                  brand={pendingPlan.brand}
                  onConfirm={handleConfirmPlan}
                />
              ) : undefined
            }
            cursorContent={cursorEditorContent}
          />
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
