"use client";

import { useCallback, useMemo } from "react";
import { parse } from "@babel/parser";
import { isExpression, isTSAsExpression } from "@babel/types";
import type { Expression, File, ObjectExpression } from "@babel/types";

export interface CursorStep {
  time: number;
  x: number;
  y: number;
  action: "click" | "hover" | "move" | "none";
  label: string;
  /**
   * Optional metadata (may be produced by vision/UI_SCHEMA mapping).
   * The editor preserves these fields if present.
   */
  elementType?: "button" | "input" | "tab" | "link" | "card" | "toggle" | "chip" | "menu" | "row" | "unknown";
  id?: string;
  box?: { x: number; y: number; w: number; h: number };
}

const CURSOR_STEPS_REGEX = /const\s+CURSOR_STEPS\s*=\s*(\[[\s\S]*?\])\s*;/;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function getObjectProp(obj: ObjectExpression, key: string): Expression | null {
  for (const prop of obj.properties) {
    if (prop.type !== "ObjectProperty") continue;
    if (prop.computed) continue;
    const k = prop.key;
    const name =
      k.type === "Identifier"
        ? k.name
        : k.type === "StringLiteral"
          ? k.value
          : null;
    if (name !== key) continue;
    const v = prop.value;
    if (isTSAsExpression(v)) {
      return isExpression(v.expression) ? v.expression : null;
    }
    return isExpression(v) ? v : null;
  }
  return null;
}

function exprToString(expr: Expression | null): string | null {
  if (!expr) return null;
  if (expr.type === "StringLiteral") return expr.value;
  if (expr.type === "TemplateLiteral" && expr.expressions.length === 0) {
    return expr.quasis.map((q) => q.value.cooked ?? "").join("");
  }
  return null;
}

function exprToNumber(expr: Expression | null): number | null {
  if (!expr) return null;
  if (expr.type === "NumericLiteral") return expr.value;
  return null;
}

function exprToBox(expr: Expression | null): { x: number; y: number; w: number; h: number } | null {
  if (!expr || expr.type !== "ObjectExpression") return null;
  const x = exprToNumber(getObjectProp(expr, "x"));
  const y = exprToNumber(getObjectProp(expr, "y"));
  const w = exprToNumber(getObjectProp(expr, "w"));
  const h = exprToNumber(getObjectProp(expr, "h"));
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(w) || !isFiniteNumber(h)) return null;
  return { x, y, w, h };
}

function safeParseCursorStepsArrayLiteral(arrayLiteral: string): CursorStep[] | null {
  // Parse only the array expression and only accept a limited AST shape.
  let ast: File;
  try {
    ast = parse(`(${arrayLiteral})`, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    });
  } catch {
    return null;
  }

  const stmt = ast.program.body[0];
  if (!stmt || stmt.type !== "ExpressionStatement") return null;
  const expr = stmt.expression;
  if (expr.type !== "ParenthesizedExpression") return null;
  const inner = expr.expression;
  if (inner.type !== "ArrayExpression") return null;

  const steps: CursorStep[] = [];
  for (const el of inner.elements) {
    if (!el || el.type !== "ObjectExpression") return null;

    const time = exprToNumber(getObjectProp(el, "time"));
    const x = exprToNumber(getObjectProp(el, "x"));
    const y = exprToNumber(getObjectProp(el, "y"));
    const action = exprToString(getObjectProp(el, "action"));
    const label = exprToString(getObjectProp(el, "label"));
    const elementType = exprToString(getObjectProp(el, "elementType"));
    const id = exprToString(getObjectProp(el, "id"));
    const box = exprToBox(getObjectProp(el, "box"));

    if (!isFiniteNumber(time) || !isFiniteNumber(x) || !isFiniteNumber(y)) return null;
    if (!label) return null;
    if (action !== "click" && action !== "hover" && action !== "move" && action !== "none") return null;

    steps.push({
      time,
      x,
      y,
      action,
      label,
      elementType: elementType ? (elementType as CursorStep["elementType"]) : undefined,
      id: id ?? undefined,
      box: box ?? undefined,
    });
  }

  return steps;
}

function parseCursorSteps(code: string): CursorStep[] | null {
  const match = code.match(CURSOR_STEPS_REGEX);
  if (!match) return null;

  try {
    return safeParseCursorStepsArrayLiteral(match[1]);
  } catch {
    return null;
  }
}

function serializeCursorSteps(steps: CursorStep[]): string {
  const lines = steps.map((step) => {
    const extras: string[] = [];
    if (step.elementType) extras.push(`elementType: "${step.elementType}"`);
    if (step.id) extras.push(`id: "${step.id}"`);
    if (step.box) {
      extras.push(
        `box: { x: ${step.box.x.toFixed(3)}, y: ${step.box.y.toFixed(3)}, w: ${step.box.w.toFixed(3)}, h: ${step.box.h.toFixed(3)} }`,
      );
    }
    const extraStr = extras.length ? `, ${extras.join(", ")}` : "";
    return `  { time: ${step.time}, x: ${step.x.toFixed(2)}, y: ${step.y.toFixed(2)}, action: "${step.action}", label: "${step.label}"${extraStr} }`;
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
