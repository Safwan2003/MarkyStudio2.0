import * as Babel from "@babel/standalone";
import { Lottie } from "@remotion/lottie";
import * as RemotionShapes from "@remotion/shapes";
import { ThreeCanvas } from "@remotion/three";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";

export interface CompilationError {
  message: string;
  /** 1-based line number in the original LLM-generated code, or null if not parseable */
  line: number | null;
  /** 1-based column number, or null */
  column: number | null;
  /** The offending line of source code, or null */
  snippet: string | null;
}

export interface CompilationResult {
  Component: React.ComponentType | null;
  error: string | null;
  /** Structured error details when error is non-null */
  compilationError?: CompilationError;
}

/**
 * Parse a Babel/runtime error message into structured form.
 * Babel errors typically look like:
 *   "SyntaxError: /dynamic-animation.tsx: Unexpected token (12:5)"
 *   "ReferenceError: foo is not defined"
 */
export function parseCompilerError(
  errorMessage: string,
  sourceCode: string,
): CompilationError {
  let line: number | null = null;
  let column: number | null = null;

  // Match "... (line:col)" pattern from Babel
  const babelMatch = errorMessage.match(/\((\d+):(\d+)\)/);
  if (babelMatch) {
    line = parseInt(babelMatch[1], 10);
    column = parseInt(babelMatch[2], 10);
  }

  // Match "line N" pattern from some runtime errors
  if (!line) {
    const lineMatch = errorMessage.match(/\bline\s+(\d+)\b/i);
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    }
  }

  // Extract the source snippet if we have a line number
  let snippetStr: string | null = null;
  if (line !== null && sourceCode) {
    const lines = sourceCode.split("\n");
    // line is 1-based; the compiler wraps code in "const DynamicAnimation = () => {\n"
    // so subtract 1 to account for the wrapper prefix line
    const adjustedLine = line - 1;
    if (adjustedLine >= 1 && adjustedLine <= lines.length) {
      snippetStr = lines[adjustedLine - 1]?.trim() ?? null;
    }
  }

  // Clean up the message — strip the file path prefix Babel adds
  const cleanMessage = errorMessage
    .replace(/^[^:]+:\s*\/[^:]+:\s*/, "") // remove "SyntaxError: /file.tsx: "
    .trim();

  return {
    message: cleanMessage || errorMessage,
    line,
    column,
    snippet: snippetStr,
  };
}

// Strip imports and extract component body from LLM-generated code
// Safety layer in case LLM includes full ES6 syntax despite instructions
export function extractComponentBody(code: string): string {
  // Strip all import statements (handles multi-line imports with newlines in braces)
  let cleaned = code;

  // Remove type imports: import type { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+type\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove combined default + named imports: import X, { ... } from "...";
  cleaned = cleaned.replace(
    /import\s+\w+\s*,\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove multi-line named imports: import { ... } from "...";
  cleaned = cleaned.replace(
    /import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove namespace imports: import * as X from "...";
  cleaned = cleaned.replace(
    /import\s+\*\s+as\s+\w+\s+from\s*["'][^"']+["'];?/g,
    "",
  );
  // Remove default imports: import X from "...";
  cleaned = cleaned.replace(/import\s+\w+\s+from\s*["'][^"']+["'];?/g, "");
  // Remove side-effect imports: import "...";
  cleaned = cleaned.replace(/import\s*["'][^"']+["'];?/g, "");

  cleaned = cleaned.trim();

  // Extract body from "export const MyAnimation = () => { ... };"
  const match = cleaned.match(
    /^([\s\S]*?)export\s+const\s+\w+\s*=\s*\(\s*\)\s*=>\s*\{([\s\S]*)\};?\s*$/,
  );

  if (match) {
    const helpers = match[1].trim();
    const body = match[2].trim();
    return helpers ? `${helpers}\n\n${body}` : body;
  }

  return cleaned;
}

// Standalone compile function for use outside React components
export function compileCode(code: string): CompilationResult {
  if (!code?.trim()) {
    return { Component: null, error: "No code provided" };
  }

  try {
    const componentBody = extractComponentBody(code);
    const wrappedSource = `const DynamicAnimation = () => {\n${componentBody}\n};`;

    const transpiled = Babel.transform(wrappedSource, {
      presets: ["react", "typescript"],
      filename: "dynamic-animation.tsx",
    });

    if (!transpiled.code) {
      return { Component: null, error: "Transpilation failed" };
    }

    const Remotion = {
      AbsoluteFill,
      interpolate,
      useCurrentFrame,
      useVideoConfig,
      spring,
      Sequence,
      Img,
    };

    const wrappedCode = `${transpiled.code}\nreturn DynamicAnimation;`;

    const createComponent = new Function(
      "React",
      "Remotion",
      "RemotionShapes",
      "Lottie",
      "ThreeCanvas",
      "THREE",
      "AbsoluteFill",
      "interpolate",
      "useCurrentFrame",
      "useVideoConfig",
      "spring",
      "Sequence",
      "Img",
      "useState",
      "useEffect",
      "useMemo",
      "useRef",
      "Rect",
      "Circle",
      "Triangle",
      "Star",
      "Polygon",
      "Ellipse",
      "Heart",
      "Pie",
      "makeRect",
      "makeCircle",
      "makeTriangle",
      "makeStar",
      "makePolygon",
      "makeEllipse",
      "makeHeart",
      "makePie",
      // Transitions
      "TransitionSeries",
      "linearTiming",
      "springTiming",
      "fade",
      "slide",
      "wipe",
      "flip",
      "clockWipe",
      wrappedCode,
    );

    const Component = createComponent(
      React,
      Remotion,
      RemotionShapes,
      Lottie,
      ThreeCanvas,
      THREE,
      AbsoluteFill,
      interpolate,
      useCurrentFrame,
      useVideoConfig,
      spring,
      Sequence,
      Img,
      useState,
      useEffect,
      useMemo,
      useRef,
      RemotionShapes.Rect,
      RemotionShapes.Circle,
      RemotionShapes.Triangle,
      RemotionShapes.Star,
      RemotionShapes.Polygon,
      RemotionShapes.Ellipse,
      RemotionShapes.Heart,
      RemotionShapes.Pie,
      RemotionShapes.makeRect,
      RemotionShapes.makeCircle,
      RemotionShapes.makeTriangle,
      RemotionShapes.makeStar,
      RemotionShapes.makePolygon,
      RemotionShapes.makeEllipse,
      RemotionShapes.makeHeart,
      RemotionShapes.makePie,
      // Transitions
      TransitionSeries,
      linearTiming,
      springTiming,
      fade,
      slide,
      wipe,
      flip,
      clockWipe,
    );

    if (typeof Component !== "function") {
      return {
        Component: null,
        error: "Code must be a function that returns a React component",
      };
    }

    return { Component, error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown compilation error";
    return {
      Component: null,
      error: errorMessage,
      compilationError: parseCompilerError(errorMessage, code),
    };
  }
}
