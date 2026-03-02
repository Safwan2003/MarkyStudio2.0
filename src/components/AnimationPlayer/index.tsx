"use client";

import { Player, type ErrorFallback, type PlayerRef } from "@remotion/player";
import { Crosshair } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { CompilationError } from "../../remotion/compiler";
import { ErrorDisplay, type ErrorType } from "../ErrorDisplay";
import { RenderControls } from "./RenderControls";
import { SettingsModal } from "./SettingsModal";

const errorTitles: Record<ErrorType, string> = {
  validation: "Invalid Prompt",
  api: "API Error",
  compilation: "Compilation Error",
};

const renderErrorFallback: ErrorFallback = ({ error }) => {
  return (
    <ErrorDisplay
      error={error.message || "An error occurred while rendering"}
      title="Runtime Error"
      variant="fullscreen"
      size="lg"
    />
  );
};

interface CursorPin {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

interface AnimationPlayerProps {
  Component: React.ComponentType | null;
  durationInFrames: number;
  fps: number;
  onDurationChange: (duration: number) => void;
  onFpsChange: (fps: number) => void;
  isCompiling: boolean;
  isStreaming: boolean;
  error: string | null;
  errorType?: ErrorType;
  compilationError?: CompilationError;
  code: string;
  /** Override code sent to Lambda for multi-scene export */
  masterCode?: string;
  /** Images to inject into Lambda render scope as ATTACHED_IMAGES */
  renderImages?: string[];
  /** Brand tokens to inject into Lambda render scope as BRAND */
  renderBrand?: Record<string, string>;
  onRuntimeError?: (error: string) => void;
  onFrameChange?: (frame: number) => void;
  /** When this value changes (and is non-null), the player seeks to this frame */
  seekFrame?: number | null;
  isCursorMode?: boolean;
  onToggleCursorMode?: () => void;
  onCoordinateCapture?: (x: number, y: number) => void;
  isQualityChecking?: boolean;
  qualityMode?: boolean;
  onQualityModeChange?: (enabled: boolean) => void;
}

export const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  Component,
  durationInFrames,
  fps,
  onDurationChange,
  onFpsChange,
  isCompiling,
  isStreaming,
  error,
  errorType = "compilation",
  compilationError,
  code,
  masterCode,
  renderImages = [],
  renderBrand = {},
  onRuntimeError,
  onFrameChange,
  seekFrame,
  isCursorMode = false,
  onToggleCursorMode,
  onCoordinateCapture,
  isQualityChecking = false,
  qualityMode = false,
  onQualityModeChange,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<CursorPin[]>([]);

  // Clear pins when cursor mode is toggled off
  useEffect(() => {
    if (!isCursorMode) {
      setPins([]);
    }
  }, [isCursorMode]);

  // Seek to a specific frame when requested
  useEffect(() => {
    if (seekFrame != null) {
      playerRef.current?.seekTo(seekFrame);
    }
  }, [seekFrame]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100;
    setPins((prev) => [...prev, { x, y }]);
    onCoordinateCapture?.(x, y);
  };

  // Listen for runtime errors from the Player's error boundary
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !onRuntimeError) return;

    const handleError = (e: { detail: { error: Error } }) => {
      onRuntimeError(e.detail.error.message);
    };

    player.addEventListener("error", handleError);
    return () => {
      player.removeEventListener("error", handleError);
    };
  }, [onRuntimeError, Component]);

  // Listen for frame changes and report to parent
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !onFrameChange) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      onFrameChange(e.detail.frame);
    };

    player.addEventListener("frameupdate", handleFrameUpdate);
    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
    };
  }, [onFrameChange, Component]);

  // Use masterCode for Lambda render when available
  const renderCode = masterCode ?? code;

  const renderContent = () => {
    if (isStreaming) {
      return (
        <div className="w-full aspect-video max-h-[calc(100%-80px)] flex flex-col justify-center items-center gap-4 bg-background-elevated rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">
            Waiting for code generation to finish...
          </p>
        </div>
      );
    }

    if (isCompiling) {
      return (
        <div className="w-full aspect-video max-h-[calc(100%-80px)] flex justify-center items-center bg-background-elevated rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      );
    }

    if (error) {
      const lineInfo =
        compilationError?.line != null
          ? `\nLine ${compilationError.line}${compilationError.column != null ? `:${compilationError.column}` : ""}${compilationError.snippet ? `  →  ${compilationError.snippet}` : ""}`
          : "";
      return (
        <ErrorDisplay
          error={lineInfo ? `${error}\n${lineInfo}` : error}
          title={errorTitles[errorType]}
          variant="fullscreen"
          size="lg"
        />
      );
    }

    if (!Component) {
      return (
        <div className="w-full aspect-video max-h-[calc(100%-80px)] flex justify-center items-center bg-background-elevated rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] text-muted-foreground-dim text-lg font-sans">
          Select an example to get started
        </div>
      );
    }

    return (
      <>
        <div className="w-full aspect-video max-h-[calc(100%-80px)] rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] relative">
          <Player
            ref={playerRef}
            key={Component.toString()}
            component={Component}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionHeight={1080}
            compositionWidth={1920}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "transparent",
            }}
            controls
            autoPlay
            loop
            errorFallback={renderErrorFallback}
            spaceKeyToPlayOrPause={false}
            clickToPlay={false}
          />
          {isCursorMode && (
            <div
              ref={overlayRef}
              className="absolute inset-0 cursor-crosshair"
              style={{ zIndex: 10 }}
              onClick={handleOverlayClick}
            >
              {pins.map((pin, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${pin.x * 100}%`,
                    top: `${pin.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                  }}
                >
                  <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-md" />
                  <span className="absolute left-4 top-0 text-xs font-mono bg-black/70 text-white px-1 rounded whitespace-nowrap">
                    {i + 1}: {pin.x}, {pin.y}
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Quality checking badge */}
          {isQualityChecking && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 text-xs text-teal-400 font-medium backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Quality checking...
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-6 mt-4">
          <RenderControls
            code={renderCode}
            durationInFrames={durationInFrames}
            fps={fps}
            images={renderImages}
            brand={renderBrand}
          />
          <div className="flex items-center gap-2">
            {onToggleCursorMode && (
              <button
                type="button"
                onClick={onToggleCursorMode}
                title={isCursorMode ? "Exit cursor mode" : "Capture cursor coordinates"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isCursorMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-background-elevated text-muted-foreground hover:text-foreground hover:bg-background-elevated/80"
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                {isCursorMode ? "Exit" : "Cursor"}
              </button>
            )}
            <SettingsModal
              durationInFrames={durationInFrames}
              onDurationChange={onDurationChange}
              fps={fps}
              onFpsChange={onFpsChange}
              qualityMode={qualityMode}
              onQualityModeChange={onQualityModeChange}
            />
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col bg-background min-w-0 h-full">
      <div className="w-full h-full flex flex-col">{renderContent()}</div>
    </div>
  );
};
