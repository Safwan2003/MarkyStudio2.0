import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  getInputProps,
} from "remotion";
import { compileCode } from "./compiler";

interface DynamicCompProps {
  code: string;
  images?: string[];
  brand?: Record<string, string>;
  uiSchema?: Record<string, unknown> | null;
  globalBg?: string;
  voiceovers?: Record<string, string>;
  [key: string]: unknown;
}

export const DynamicComp: React.FC = () => {
  const { code, images = [], brand = {}, uiSchema = null, globalBg = "arcs", voiceovers = {}, visualState = null, highlightWords = [], visualAnchor = null } = getInputProps() as DynamicCompProps;

  const [handle] = useState(() => delayRender("Compiling code..."));
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setComponent(null);
    setError(null);
    try {
      const result = compileCode(code, images, brand, null, [], uiSchema ?? null, globalBg, 0, null, {}, voiceovers, { zoom: 1, panX: 0, panY: 0 }, null, null, null, brand.logo ?? null, highlightWords as string[], visualState as string | null, visualAnchor as any, undefined, null, []);

      if (result.error) {
        setError(result.error);
      } else {
        setComponent(() => result.Component);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      continueRender(handle);
    }
  }, [brand, code, globalBg, handle, highlightWords, images, uiSchema, visualAnchor, visualState, voiceovers]);

  if (error) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#1a1a2e",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
        }}
      >
        <div
          style={{
            color: "#ff6b6b",
            fontSize: 42,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          Compilation Error
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 24,
            fontFamily: "monospace",
            marginTop: 24,
            textAlign: "center",
            maxWidth: "80%",
            wordBreak: "break-word",
          }}
        >
          {error}
        </div>
      </AbsoluteFill>
    );
  }

  if (!Component) {
    return null;
  }

  return <Component />;
};
