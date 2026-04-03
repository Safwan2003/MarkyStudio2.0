export interface ScreenshotContractInput {
  intent: "hook" | "problem" | "solution" | "feature" | "proof" | "cta";
  directedSkills: string[];
  parsedImagesCount: number;
  imageIdx?: number;
  sceneImageIndices?: number[];
  maxImageIdx: number;
  hasUiSchema: boolean;
}

export interface ScreenshotContractOutput {
  imageIdx?: number;
  directedSkills: string[];
}

export function enforceScreenshotDrivenSceneContract(
  input: ScreenshotContractInput,
): ScreenshotContractOutput {
  const {
    intent,
    parsedImagesCount,
    maxImageIdx,
    hasUiSchema,
    sceneImageIndices = [],
  } = input;
  let { imageIdx, directedSkills } = input;

  const hasRealScreenshots = parsedImagesCount > 0;
  const hasAssignedScreens = imageIdx !== undefined || sceneImageIndices.length > 0;
  const isImageDrivenIntent = intent === "solution" || intent === "feature" || intent === "proof";
  const isInteractiveSkill = directedSkills.some((skill) =>
    skill === "premium-cursor-engine" ||
    skill === "premium-chameleon-ui" ||
    skill === "premium-app-walkthrough" ||
    skill === "premium-multi-view-walkthrough" ||
    skill === "premium-scroll-demo",
  );
  const isReconstructedSkill = directedSkills.includes("premium-reconstructed-ui");

  if (hasRealScreenshots && isImageDrivenIntent && !hasAssignedScreens) {
    imageIdx = intent === "proof" ? Math.max(0, maxImageIdx) : 0;
  }

  if (hasRealScreenshots && isImageDrivenIntent) {
    if (intent === "solution" || intent === "feature") {
      if (!isInteractiveSkill && !isReconstructedSkill) {
        directedSkills = hasUiSchema
          ? ["premium-reconstructed-ui", ...directedSkills.filter((skill) => !skill.includes("live-action") && !skill.includes("kinetic"))]
          : ["premium-cursor-engine", ...directedSkills.filter((skill) => !skill.includes("live-action") && !skill.includes("kinetic"))];
      }
    }
    if (intent === "proof" && !isReconstructedSkill) {
      directedSkills = ["premium-reconstructed-ui", ...directedSkills.filter((skill) => skill !== "premium-live-action-composite")];
    }
  }

  return { imageIdx, directedSkills };
}
