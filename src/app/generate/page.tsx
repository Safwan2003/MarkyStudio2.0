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
import { examples } from "../../examples/code";
import { useAnimationState } from "../../hooks/useAnimationState";
import { useAutoCorrection } from "../../hooks/useAutoCorrection";
import { useConversationState } from "../../hooks/useConversationState";
import { useCursorSteps } from "../../hooks/useCursorSteps";
import { useFullVideoGeneration } from "../../hooks/useFullVideoGeneration";
import type {
  AssistantMetadata,
  EditOperation,
  ErrorCorrectionContext,
} from "../../types/conversation";
import type {
  GenerationErrorType,
  ModelId,
  ScenePlan,
  StreamPhase,
} from "../../types/generation";

const MAX_CORRECTION_ATTEMPTS = 3;

function GeneratePageContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const initialModel = (searchParams.get("model") as ModelId) || undefined;

  const willAutoStart = Boolean(initialPrompt);

  const [durationInFrames, setDurationInFrames] = useState(
    examples[0]?.durationInFrames || 150,
  );
  const [fps, setFps] = useState(examples[0]?.fps || 30);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isStreaming, setIsStreaming] = useState(willAutoStart);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>(
    willAutoStart ? "reasoning" : "idle",
  );
  const [prompt, setPrompt] = useState(initialPrompt);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [generationError, setGenerationError] = useState<{
    message: string;
    type: GenerationErrorType;
    failedEdit?: EditOperation;
  } | null>(null);

  // Self-correction state
  const [errorCorrection, setErrorCorrection] =
    useState<ErrorCorrectionContext | null>(null);

  // Quality mode
  const [qualityMode, setQualityMode] = useState(false);
  const [isQualityChecking, setIsQualityChecking] = useState(false);
  const qualityCheckRunningRef = useRef(false);

  // Seek target for SceneTimeline → AnimationPlayer
  const [seekFrame, setSeekFrame] = useState<number | null>(null);

  // Conversation state for follow-up edits
  const {
    messages,
    hasManualEdits,
    pendingMessage,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    markManualEdit,
    getFullContext,
    getPreviouslyUsedSkills,
    getLastUserAttachedImages,
    setPendingMessage,
    clearPendingMessage,
    isFirstGeneration,
  } = useConversationState();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Cursor coordinate mode
  const [isCursorMode, setIsCursorMode] = useState(false);
  const cursorStepRef = useRef(0);

  const handleCoordinateCapture = useCallback(
    (x: number, y: number) => {
      cursorStepRef.current += 1;
      setPrompt(
        `Fix cursor step ${cursorStepRef.current}: click at x: ${x}, y: ${y}`,
      );
    },
    [],
  );

  const handleToggleCursorMode = useCallback(() => {
    setIsCursorMode((prev) => {
      if (prev) {
        cursorStepRef.current = 0;
      }
      return !prev;
    });
  }, []);

  const {
    code,
    Component: compiledComponent,
    error: compilationError,
    compilationError: compilationErrorDetails,
    isCompiling,
    setCode,
    compileCode,
  } = useAnimationState(examples[0]?.code || "");

  // Full video generation hook
  const {
    generateFullVideo,
    confirmPlan,
    regenerateScene,
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
  } = useFullVideoGeneration();

  // Active component: masterComponent takes precedence over compiled single-scene
  const Component = masterComponent ?? compiledComponent;

  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const codeError = compilationError || runtimeError;

  // Cursor steps: parse and update CURSOR_STEPS in code
  const { steps: cursorSteps, hasCursorSteps, updateSteps } = useCursorSteps(
    code,
    useCallback(
      (newCode: string) => {
        setCode(newCode);
        compileCode(newCode);
      },
      [setCode, compileCode],
    ),
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStreamingRef = useRef(isStreaming);
  const codeRef = useRef(code);
  const chatSidebarRef = useRef<ChatSidebarRef>(null);

  const { markAsAiGenerated, markAsUserEdited } = useAutoCorrection({
    maxAttempts: MAX_CORRECTION_ATTEMPTS,
    compilationError: codeError,
    generationError,
    isStreaming,
    isCompiling,
    hasGeneratedOnce,
    code,
    errorCorrection,
    onTriggerCorrection: useCallback(
      (correctionPrompt: string, context: ErrorCorrectionContext) => {
        setErrorCorrection(context);
        setPrompt(correctionPrompt);
        const lastImages = getLastUserAttachedImages();
        setTimeout(() => {
          chatSidebarRef.current?.triggerGeneration({
            silent: true,
            attachedImages: lastImages,
          });
        }, 100);
      },
      [getLastUserAttachedImages],
    ),
    onAddErrorMessage: addErrorMessage,
    onClearGenerationError: useCallback(() => setGenerationError(null), []),
    onClearErrorCorrection: useCallback(() => setErrorCorrection(null), []),
  });

  // Sync refs
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    const wasStreaming = isStreamingRef.current;
    isStreamingRef.current = isStreaming;

    if (wasStreaming && !isStreaming) {
      markAsAiGenerated();
      compileCode(codeRef.current);
    }
  }, [isStreaming, compileCode, markAsAiGenerated]);

  // Quality check: fires after single-scene generation completes successfully
  useEffect(() => {
    const shouldCheck =
      qualityMode &&
      !qualityCheckRunningRef.current &&
      !isStreaming &&
      !isCompiling &&
      !codeError &&
      hasGeneratedOnce &&
      code.trim() &&
      !masterComponent; // only for single-scene, not full video

    if (!shouldCheck) return;

    qualityCheckRunningRef.current = true;
    setIsQualityChecking(true);

    (async () => {
      try {
        const response = await fetch("/api/critique", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, prompt }),
        });

        if (response.ok) {
          const { hasIssues, fixPrompt } = await response.json() as {
            hasIssues: boolean;
            fixPrompt: string;
          };

          if (hasIssues && fixPrompt) {
            setPrompt(fixPrompt);
            setTimeout(() => {
              chatSidebarRef.current?.triggerGeneration({ silent: true });
            }, 100);
          }
        }
      } catch {
        // Quality check is best-effort — silently ignore errors
      } finally {
        setIsQualityChecking(false);
        qualityCheckRunningRef.current = false;
      }
    })();
  }, [isStreaming, isCompiling]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      setHasGeneratedOnce(true);

      if (!isStreamingRef.current) {
        markManualEdit(newCode);
        markAsUserEdited();
        // Reset quality check gate when user edits
        qualityCheckRunningRef.current = false;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (isStreamingRef.current) {
        return;
      }

      debounceRef.current = setTimeout(() => {
        compileCode(newCode);
      }, 500);
    },
    [setCode, compileCode, markManualEdit, markAsUserEdited],
  );

  const handleMessageSent = useCallback(
    (promptText: string, attachedImages?: string[]) => {
      addUserMessage(promptText, attachedImages);
    },
    [addUserMessage],
  );

  const handleGenerationComplete = useCallback(
    (generatedCode: string, summary?: string, metadata?: AssistantMetadata) => {
      const content = summary || "Generated your animation, any follow up edits?";
      addAssistantMessage(content, generatedCode, metadata);
      markAsAiGenerated();
      // Reset quality check gate so it fires for the new generation
      qualityCheckRunningRef.current = false;
    },
    [addAssistantMessage, markAsAiGenerated],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Update durationInFrames when full video completes
  useEffect(() => {
    if (totalDuration > 0) {
      setDurationInFrames(totalDuration);
    }
  }, [totalDuration]);

  // Handle full video generation triggered from ChatInput Film button
  const handleFullVideoGenerate = useCallback(
    (model: ModelId) => {
      if (!prompt.trim()) return;
      resetFullVideo();
      setGenerationError(null);
      setRuntimeError(null);
      generateFullVideo(prompt, model);
    },
    [prompt, generateFullVideo, resetFullVideo],
  );

  const handleStreamingChange = useCallback(
    (streaming: boolean) => {
      setIsStreaming(streaming);
      if (streaming) {
        setGenerationError(null);
        setRuntimeError(null);
        setErrorCorrection(null);
        resetFullVideo();
      }
    },
    [resetFullVideo],
  );

  const handleError = useCallback(
    (message: string, type: GenerationErrorType, failedEdit?: EditOperation) => {
      setGenerationError({ message, type, failedEdit });
    },
    [],
  );

  const handleRuntimeError = useCallback((errorMessage: string) => {
    setRuntimeError(errorMessage);
  }, []);

  const handleSeek = useCallback((frame: number) => {
    setSeekFrame(frame);
  }, []);

  const handleConfirmPlan = useCallback(
    (editedScenes: ScenePlan[]) => {
      confirmPlan(editedScenes);
    },
    [confirmPlan],
  );

  // Auto-trigger generation if prompt came from URL
  useEffect(() => {
    if (initialPrompt && !hasAutoStarted && chatSidebarRef.current) {
      setHasAutoStarted(true);
      const storedImagesJson = sessionStorage.getItem("initialAttachedImages");
      let storedImages: string[] | undefined;
      if (storedImagesJson) {
        try {
          storedImages = JSON.parse(storedImagesJson);
        } catch {
          // ignore
        }
        sessionStorage.removeItem("initialAttachedImages");
      }
      setTimeout(() => {
        chatSidebarRef.current?.triggerGeneration({
          attachedImages: storedImages,
        });
      }, 100);
    }
  }, [initialPrompt, hasAutoStarted]);

  const isFullVideoBusy = isPlanning || isFullVideoGenerating;

  return (
    <PageLayout showLogoAsLink>
      <div className="flex-1 flex flex-col min-[1000px]:flex-row min-w-0 overflow-hidden">
        {/* Chat History Sidebar */}
        <ChatSidebar
          ref={chatSidebarRef}
          messages={messages}
          pendingMessage={pendingMessage}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          hasManualEdits={hasManualEdits}
          initialModel={initialModel}
          onCodeGenerated={handleCodeChange}
          onStreamingChange={handleStreamingChange}
          onStreamPhaseChange={setStreamPhase}
          onError={handleError}
          prompt={prompt}
          onPromptChange={setPrompt}
          currentCode={code}
          conversationHistory={getFullContext()}
          previouslyUsedSkills={getPreviouslyUsedSkills()}
          isFollowUp={!isFirstGeneration}
          onMessageSent={handleMessageSent}
          onGenerationComplete={handleGenerationComplete}
          onErrorMessage={addErrorMessage}
          errorCorrection={errorCorrection ?? undefined}
          onPendingMessage={setPendingMessage}
          onClearPendingMessage={clearPendingMessage}
          onFullVideoGenerate={handleFullVideoGenerate}
          Component={Component}
          fps={fps}
          durationInFrames={durationInFrames}
          currentFrame={currentFrame}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 pr-12 pb-8 overflow-hidden">
          <TabPanel
            codeContent={
              <CodeEditor
                code={hasGeneratedOnce && !generationError ? code : ""}
                onChange={handleCodeChange}
                isStreaming={isStreaming}
                streamPhase={streamPhase}
              />
            }
            previewContent={
              <div className="relative h-full flex flex-col">
                <AnimationPlayer
                  Component={generationError ? null : Component}
                  durationInFrames={durationInFrames}
                  fps={fps}
                  onDurationChange={setDurationInFrames}
                  onFpsChange={setFps}
                  isCompiling={isCompiling}
                  isStreaming={isStreaming}
                  error={generationError?.message || fullVideoError || codeError}
                  errorType={generationError?.type || "compilation"}
                  compilationError={compilationErrorDetails}
                  code={code}
                  masterCode={masterCode ?? undefined}
                  onRuntimeError={handleRuntimeError}
                  onFrameChange={setCurrentFrame}
                  seekFrame={seekFrame}
                  isCursorMode={isCursorMode}
                  onToggleCursorMode={handleToggleCursorMode}
                  onCoordinateCapture={handleCoordinateCapture}
                  isQualityChecking={isQualityChecking}
                  qualityMode={qualityMode}
                  onQualityModeChange={setQualityMode}
                />

                {/* Scene timeline — shown below player when full video is ready */}
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
                  />
                )}

                {/* Full video generation progress overlay */}
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
                              Generating scene {fullVideoProgress?.current ?? 1} of{" "}
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
            cursorContent={
              hasCursorSteps ? (
                <CursorEditor
                  steps={cursorSteps}
                  onStepsChange={updateSteps}
                  durationInFrames={durationInFrames}
                  fps={fps}
                />
              ) : undefined
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

const GeneratePage: NextPage = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GeneratePageContent />
    </Suspense>
  );
};

export default GeneratePage;
