import { describe, expect, it } from "vitest";
import { validateSceneCodeSafety } from "./scene-validation";

describe("validateSceneCodeSafety", () => {
  it("flags duplicate declarations in the same scope", () => {
    const issues = validateSceneCodeSafety(`
export const MyAnimation = () => {
  const ripple1Scale = 1;
  const ripple1Scale = 2;
  return null;
};
    `);

    expect(issues.some((issue) => issue.kind === "duplicate-scope-declaration" && issue.name === "ripple1Scale")).toBe(true);
  });

  it("flags same-scope forward references in const initializers", () => {
    const issues = validateSceneCodeSafety(`
export const MyAnimation = () => {
  const rippleScale = dashboardNavTargetCoords.x * width;
  const dashboardNavTargetCoords = { x: 0.5, y: 0.2 };
  return null;
};
    `);

    expect(issues.some((issue) =>
      issue.kind === "tdz-forward-reference" &&
      issue.name === "rippleScale" &&
      issue.referencedName === "dashboardNavTargetCoords",
    )).toBe(true);
  });

  it("allows dependency-safe declaration order", () => {
    const issues = validateSceneCodeSafety(`
export const MyAnimation = () => {
  const dashboardNavTargetCoords = { x: 0.5, y: 0.2 };
  const rippleScale = dashboardNavTargetCoords.x * width;
  return null;
};
    `);

    expect(issues).toEqual([]);
  });

  it("does not reject callback-based or ASI-style declarations when confidence is low", () => {
    const issues = validateSceneCodeSafety(`
export const MyAnimation = () => {
  const items = sourceItems.map((item) => ({ label: item.label }))
  const opacity = 1
  return null
};
    `);

    expect(issues).toEqual([]);
  });
});
