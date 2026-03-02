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
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// Pre-built style constants — injected into every generated component's scope
// so the LLM can reference them directly without re-declaring.
// ---------------------------------------------------------------------------

const GLASS_CARD = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  boxShadow: "0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
} as const;

const SPRING_CONFIGS = {
  entrance:  { damping: 14, stiffness: 100 },
  float:     { damping: 22, stiffness: 70  },
  pop:       { damping: 10, stiffness: 150 },
  cinematic: { damping: 28, stiffness: 60  },
} as const;

const EASINGS = {
  easeOutCubic:    (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic:  (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,
  easeInQuad:      (t: number) => t * t,
} as const;

// ---------------------------------------------------------------------------
// Pre-built UI Skeleton components — injected into scope so the LLM can
// pass data props without recreating structural layout from scratch.
// ---------------------------------------------------------------------------

interface KanbanColumn { label: string; accent?: string; cards: string[] }
interface BrandLike { bg: string; primary: string; secondary: string; surface: string; text: string; textMuted: string; border: string; font?: string }

/** Drop-in Kanban board. Pass columns + brand; handles all layout + animation. */
const KanbanBoard = ({ columns, brand }: { columns: KanbanColumn[]; brand: BrandLike }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const font = brand.font ?? "Inter";

  const colW = Math.round(width * 0.27);
  const gutter = Math.round(width * 0.03);
  const boardX = Math.round((width - (colW * Math.min(columns.length, 3) + gutter * (Math.min(columns.length, 3) - 1))) / 2);
  const boardY = Math.round(height * 0.14);

  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  return React.createElement(AbsoluteFill, { style: { backgroundColor: brand.bg, fontFamily: font } },
    ...columns.slice(0, 3).map((col, ci) => {
      const colOpacity = interpolate(frame, [ci * 6, ci * 6 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const colY = interpolate(frame, [ci * 6, ci * 6 + 30], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
      const accent = col.accent ?? brand.primary;

      return React.createElement("div", {
        key: ci,
        style: {
          position: "absolute",
          top: boardY,
          left: boardX + ci * (colW + gutter),
          width: colW,
          opacity: colOpacity,
          transform: `translateY(${colY}px)`,
        },
      },
        // Column header
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
          React.createElement("div", { style: { width: 8, height: 8, borderRadius: 4, backgroundColor: accent } }),
          React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: brand.textMuted, textTransform: "uppercase" as const, letterSpacing: 1 } }, col.label),
          React.createElement("span", { style: { marginLeft: "auto", fontSize: 11, fontWeight: 600, color: brand.textMuted, background: brand.surface, padding: "2px 7px", borderRadius: 99 } }, String(col.cards.length)),
        ),
        // Cards
        ...col.cards.map((cardText, ki) => {
          const startFrame = ci * 6 + ki * 5 + 18;
          const cardOpacity = interpolate(frame, [startFrame, startFrame + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const cardY = interpolate(frame, [startFrame, startFrame + 22], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          return React.createElement("div", {
            key: ki,
            style: {
              background: "rgba(255,255,255,0.06)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
              border: `1px solid ${brand.border}`, borderRadius: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              padding: "12px 14px", marginBottom: 8,
              opacity: cardOpacity, transform: `translateY(${cardY}px)`,
            },
          },
            React.createElement("div", { style: { fontSize: 13, color: brand.text, lineHeight: 1.4 } }, cardText),
            React.createElement("div", { style: { marginTop: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: accent, opacity: 0.7 } }),
          );
        }),
      );
    }),
  );
};

interface KpiStat { label: string; value: string; delta: string; up: boolean }
interface BarPoint { label: string; value: number } // value 0–1

/** Drop-in Analytics Dashboard. Top KPI row + bar chart. */
const AnalyticsDashboard = ({ kpis, bars, title, brand }: {
  kpis: KpiStat[];
  bars: BarPoint[];
  title?: string;
  brand: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const font = brand.font ?? "Inter";
  const pad = Math.round(width * 0.04);
  const kpiCount = Math.min(kpis.length, 4);
  const kpiW = (width - pad * 2 - 12 * (kpiCount - 1)) / kpiCount;
  const kpiH = Math.round(height * 0.18);
  const chartTop = Math.round(height * 0.38);
  const chartH = Math.round(height * 0.5);
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  return React.createElement(AbsoluteFill, { style: { backgroundColor: brand.bg, fontFamily: font } },
    // Title
    title ? React.createElement("div", {
      style: { position: "absolute", top: Math.round(height * 0.06), left: pad, fontSize: Math.round(height * 0.036), fontWeight: 700, color: brand.text },
    }, title) : null,
    // KPI cards
    ...kpis.slice(0, 4).map((kpi, i) => {
      const op = interpolate(frame, [i * 5, i * 5 + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const y = interpolate(frame, [i * 5, i * 5 + 22], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
      return React.createElement("div", {
        key: i,
        style: {
          position: "absolute", top: Math.round(height * 0.15), left: pad + i * (kpiW + 12), width: kpiW, height: kpiH,
          background: "rgba(255,255,255,0.06)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          border: `1px solid ${brand.border}`, borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.30)",
          padding: "16px 18px", opacity: op, transform: `translateY(${y}px)`,
        },
      },
        React.createElement("div", { style: { fontSize: 11, color: brand.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8 } }, kpi.label),
        React.createElement("div", { style: { fontSize: Math.round(height * 0.035), fontWeight: 700, color: brand.text, fontVariantNumeric: "tabular-nums" } }, kpi.value),
        React.createElement("div", { style: { fontSize: 12, color: kpi.up ? "#22c55e" : "#ef4444", marginTop: 4, fontWeight: 600 } }, kpi.delta),
      );
    }),
    // Chart
    React.createElement("div", {
      style: {
        position: "absolute", top: chartTop, left: pad, right: pad, height: chartH,
        background: "rgba(255,255,255,0.06)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${brand.border}`, borderRadius: 16,
        boxShadow: "0 8px 40px rgba(0,0,0,0.30)",
        padding: "20px 24px", display: "flex", flexDirection: "column" as const,
      },
    },
      React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: brand.text, marginBottom: 16 } }, "Activity"),
      React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "flex-end", gap: 8 } },
        ...bars.map((bar, i) => {
          const fill = interpolate(frame, [20 + i * 4, 20 + i * 4 + 30], [0, Math.min(1, Math.max(0, bar.value))], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease,
          });
          return React.createElement("div", { key: i, style: { flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4, height: "100%" } },
            React.createElement("div", { style: { flex: 1, width: "100%", display: "flex", alignItems: "flex-end" } },
              React.createElement("div", {
                style: {
                  width: "100%", height: `${fill * 100}%`,
                  background: `linear-gradient(to top, ${brand.primary}, ${brand.secondary})`,
                  borderRadius: "4px 4px 0 0", willChange: "height",
                },
              }),
            ),
            React.createElement("div", { style: { fontSize: 10, color: brand.textMuted } }, bar.label),
          );
        }),
      ),
    ),
  );
};

interface CodeLine { text: string; color?: string }

/** Drop-in Code Editor with optional terminal pane. */
const CodeEditorPanel = ({ lines, terminalLines, filename, brand }: {
  lines: CodeLine[];
  terminalLines?: CodeLine[];
  filename?: string;
  brand: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pad = Math.round(width * 0.06);
  const hasTerminal = terminalLines && terminalLines.length > 0;
  const EDITOR_H = hasTerminal ? Math.round(height * 0.55) : Math.round(height * 0.82);
  const TERM_H = Math.round(height * 0.28);
  const textColor = "#e2e8f0";
  const dimColor = "rgba(255,255,255,0.3)";
  const bgColor = "#0d1117";

  return React.createElement(AbsoluteFill, { style: { backgroundColor: bgColor, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } },
    // Editor window
    React.createElement("div", {
      style: {
        position: "absolute", top: Math.round(height * 0.08), left: pad, right: pad, height: EDITOR_H,
        borderRadius: 12, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      },
    },
      // Title bar
      React.createElement("div", {
        style: { height: 36, backgroundColor: "#161b22", display: "flex", alignItems: "center", paddingLeft: 14, gap: 7, borderBottom: "1px solid rgba(255,255,255,0.08)" },
      },
        ...["#ef4444","#f59e0b","#22c55e"].map((c, i) =>
          React.createElement("div", { key: i, style: { width: 11, height: 11, borderRadius: "50%", backgroundColor: c } }),
        ),
        React.createElement("span", { style: { marginLeft: 10, fontSize: 11, color: dimColor } }, filename ?? "main.tsx"),
      ),
      // Code lines
      React.createElement("div", {
        style: { backgroundColor: bgColor, padding: "16px 24px", height: EDITOR_H - 36, overflow: "hidden", display: "flex", flexDirection: "column" as const, gap: 2 },
      },
        ...lines.map((line, i) => {
          const op = interpolate(frame, [i * 4, i * 4 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return React.createElement("div", { key: i, style: { display: "flex", gap: 20, opacity: op } },
            React.createElement("span", { style: { fontSize: 12, color: dimColor, minWidth: 20, textAlign: "right" as const } }, String(i + 1)),
            React.createElement("span", { style: { fontSize: 13, color: line.color ?? textColor, whiteSpace: "pre" } }, line.text),
          );
        }),
      ),
    ),
    // Terminal pane
    hasTerminal ? React.createElement("div", {
      style: {
        position: "absolute", top: Math.round(height * 0.08) + EDITOR_H + 12, left: pad, right: pad, height: TERM_H,
        borderRadius: 12, backgroundColor: "#0a0f14",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 20px", overflow: "hidden", display: "flex", flexDirection: "column" as const, gap: 4,
      },
    },
      ...(terminalLines ?? []).map((line, i) => {
        const start = lines.length * 4 + i * 6;
        const op = interpolate(frame, [start, start + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return React.createElement("div", { key: i, style: { fontSize: 12, color: line.color ?? textColor, opacity: op } }, line.text);
      }),
    ) : null,
  );
};

interface TableRow { cells: string[]; statusIndex?: number }

/** Drop-in data table (CRM / pipeline / list). */
const DataTable = ({ title, columns, rows, statusColors, brand }: {
  title?: string;
  columns: string[];
  rows: TableRow[];
  statusColors?: Record<string, string>;
  brand: BrandLike;
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const font = brand.font ?? "Inter";
  const pad = Math.round(width * 0.05);
  const tableTop = Math.round(height * 0.18);
  const rowH = Math.round(height * 0.1);
  const colWidths = columns.map(() => 1 / columns.length);
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const statusCol = rows[0]?.statusIndex ?? 1;

  return React.createElement(AbsoluteFill, { style: { backgroundColor: brand.bg, fontFamily: font } },
    title ? React.createElement("div", { style: { position: "absolute", top: Math.round(height * 0.07), left: pad, fontSize: Math.round(height * 0.034), fontWeight: 700, color: brand.text } }, title) : null,
    React.createElement("div", {
      style: {
        position: "absolute", top: tableTop, left: pad, right: pad,
        background: "rgba(255,255,255,0.06)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${brand.border}`, borderRadius: 16,
        boxShadow: "0 8px 40px rgba(0,0,0,0.30)",
        overflow: "hidden", padding: 0,
      },
    },
      // Header
      React.createElement("div", { style: { display: "flex", padding: "12px 20px", borderBottom: `1px solid ${brand.border}`, background: brand.surface } },
        ...columns.map((col, ci) =>
          React.createElement("div", { key: ci, style: { flex: colWidths[ci], fontSize: 11, fontWeight: 600, color: brand.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.8 } }, col),
        ),
      ),
      // Rows
      ...rows.map((row, ri) => {
        const op = interpolate(frame, [ri * 5 + 10, ri * 5 + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = interpolate(frame, [ri * 5 + 10, ri * 5 + 28], [-20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
        return React.createElement("div", {
          key: ri,
          style: {
            display: "flex", alignItems: "center", padding: "0 20px", height: rowH,
            borderBottom: ri < rows.length - 1 ? `1px solid ${brand.border}` : undefined,
            backgroundColor: ri % 2 === 0 ? "transparent" : brand.surface,
            opacity: op, transform: `translateX(${x}px)`,
          },
        },
          ...row.cells.map((cell, ci) => {
            const isStatus = ci === statusCol;
            const sc = statusColors?.[cell];
            return React.createElement("div", { key: ci, style: { flex: colWidths[ci] } },
              isStatus && sc
                ? React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: sc, background: `${sc}22`, padding: "3px 10px", borderRadius: 99, border: `1px solid ${sc}44` } }, cell)
                : React.createElement("span", { style: { fontSize: 13, color: ci === 0 ? brand.text : brand.textMuted, fontWeight: ci === 0 ? 600 : 400, fontVariantNumeric: "tabular-nums" } }, cell),
            );
          }),
        );
      }),
    ),
  );
};

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
/**
 * Strip `const BRAND = { ... };` from generated code.
 * BRAND is injected as a compiler scope variable so the LLM can reference it
 * directly without declaring it. If the LLM declared it anyway, this prevents
 * a "Identifier 'BRAND' has already been declared" conflict.
 */
function stripBrandDeclaration(code: string): string {
  const marker = "const BRAND = {";
  const idx = code.indexOf(marker);
  if (idx === -1) return code;
  let depth = 0;
  let i = idx + marker.length - 1; // opening {
  for (; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        while (end < code.length && (code[end] === ";" || code[end] === "\n" || code[end] === "\r")) end++;
        return code.slice(0, idx) + code.slice(end);
      }
    }
  }
  return code;
}

export function compileCode(
  code: string,
  attachedImages: string[] = [],
  brand: Record<string, string> = {},
): CompilationResult {
  if (!code?.trim()) {
    return { Component: null, error: "No code provided" };
  }

  try {
    const componentBody = extractComponentBody(stripBrandDeclaration(code));
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
      "Audio",
      "GLASS_CARD",
      "SPRING_CONFIGS",
      "EASINGS",
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
      // UI Skeleton components
      "KanbanBoard",
      "AnalyticsDashboard",
      "CodeEditorPanel",
      "DataTable",
      "ATTACHED_IMAGES",
      "BRAND",
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
      Audio,
      GLASS_CARD,
      SPRING_CONFIGS,
      EASINGS,
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
      // UI Skeleton components
      KanbanBoard,
      AnalyticsDashboard,
      CodeEditorPanel,
      DataTable,
      attachedImages,
      brand,
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
