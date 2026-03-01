"use client";

import { useCallback, useMemo } from "react";

export interface CursorStep {
  time: number;
  x: number;
  y: number;
  action: "click" | "hover" | "move" | "none";
  label: string;
}

const CURSOR_STEPS_REGEX = /const\s+CURSOR_STEPS\s*=\s*(\[[\s\S]*?\])\s*;/;

function parseCursorSteps(code: string): CursorStep[] | null {
  const match = code.match(CURSOR_STEPS_REGEX);
  if (!match) return null;

  try {
    // Safe evaluation of the array literal
    const steps = new Function("return " + match[1])() as CursorStep[];
    if (!Array.isArray(steps)) return null;
    return steps;
  } catch {
    return null;
  }
}

function serializeCursorSteps(steps: CursorStep[]): string {
  const lines = steps.map((step) => {
    return `  { time: ${step.time}, x: ${step.x.toFixed(2)}, y: ${step.y.toFixed(2)}, action: "${step.action}", label: "${step.label}" }`;
  });
  return `[\n${lines.join(",\n")}\n]`;
}

export function useCursorSteps(
  code: string,
  onCodeChange: (newCode: string) => void,
) {
  const steps = useMemo(() => {
    return parseCursorSteps(code) ?? [];
  }, [code]);

  const hasCursorSteps = useMemo(() => {
    return CURSOR_STEPS_REGEX.test(code);
  }, [code]);

  const updateSteps = useCallback(
    (newSteps: CursorStep[]) => {
      const serialized = serializeCursorSteps(newSteps);
      const newCode = code.replace(
        CURSOR_STEPS_REGEX,
        `const CURSOR_STEPS = ${serialized};`,
      );
      onCodeChange(newCode);
    },
    [code, onCodeChange],
  );

  return {
    steps,
    hasCursorSteps,
    updateSteps,
  };
}
