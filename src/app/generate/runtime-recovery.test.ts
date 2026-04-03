import { describe, expect, it } from "vitest";
import {
  buildSceneCodeSignature,
  makeRuntimeFailureKey,
  normalizeRuntimeErrorMessage,
} from "./runtime-recovery";

describe("runtime recovery helpers", () => {
  it("normalizes equivalent runtime errors to the same signature", () => {
    const a = normalizeRuntimeErrorMessage(`Cannot access "dashboardNavTargetCoords" before initialization`);
    const b = normalizeRuntimeErrorMessage("cannot access 'dashboardNavTargetCoords' before initialization");
    expect(a).toBe(b);
  });

  it("includes the scene code signature in the failure key", () => {
    const keyA = makeRuntimeFailureKey(1, "const a = 1;", "Identifier 'foo' has already been declared");
    const keyB = makeRuntimeFailureKey(1, "const a = 2;", "Identifier 'foo' has already been declared");
    expect(keyA).not.toBe(keyB);
  });

  it("produces stable code signatures for identical code", () => {
    expect(buildSceneCodeSignature("const a = 1;")).toBe(buildSceneCodeSignature("const a = 1;"));
  });
});
