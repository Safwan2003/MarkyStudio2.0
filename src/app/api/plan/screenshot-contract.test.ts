import { describe, expect, it } from "vitest";

import { enforceScreenshotDrivenSceneContract } from "./screenshot-contract";

describe("enforceScreenshotDrivenSceneContract", () => {
  it("forces a screenshot-backed solution scene onto image 0 when none is assigned", () => {
    const result = enforceScreenshotDrivenSceneContract({
      intent: "solution",
      directedSkills: ["premium-live-action-composite", "premium-neon-dark"],
      parsedImagesCount: 2,
      maxImageIdx: 1,
      hasUiSchema: false,
    });

    expect(result.imageIdx).toBe(0);
    expect(result.directedSkills[0]).toBe("premium-cursor-engine");
  });

  it("forces proof scenes toward reconstructed UI and the last screenshot", () => {
    const result = enforceScreenshotDrivenSceneContract({
      intent: "proof",
      directedSkills: ["premium-social-proof", "premium-live-action-composite"],
      parsedImagesCount: 3,
      maxImageIdx: 2,
      hasUiSchema: true,
    });

    expect(result.imageIdx).toBe(2);
    expect(result.directedSkills[0]).toBe("premium-reconstructed-ui");
    expect(result.directedSkills).not.toContain("premium-live-action-composite");
  });

  it("keeps already interactive feature scenes intact", () => {
    const result = enforceScreenshotDrivenSceneContract({
      intent: "feature",
      directedSkills: ["premium-cursor-engine", "premium-ambient-environment"],
      parsedImagesCount: 2,
      imageIdx: 1,
      maxImageIdx: 1,
      hasUiSchema: false,
    });

    expect(result.imageIdx).toBe(1);
    expect(result.directedSkills).toEqual(["premium-cursor-engine", "premium-ambient-environment"]);
  });
});
