import { describe, expect, it } from "vitest";

import {
  choosePlannerTransition,
  deriveQualityMetadata,
  deriveStyleContract,
} from "./quality-grammar";

describe("quality-grammar", () => {
  it("derives a stable global style contract from the creative brief", () => {
    const result = deriveStyleContract({
      logline: "Test",
      emotionalArc: [],
      visualGrammar: {
        shapeLanguage: "editorial",
        textureStyle: "glossy",
        iconStyle: "outline",
        layoutDensity: "balanced",
        motionPersonality: "cinematic",
      },
      spatialWorld: {
        worldDescription: "Studio",
        cameraStartPosition: "wide",
        depthStrategy: "immersive",
        scenePositions: [],
      },
      soundIntention: "Swell",
      typographyHero: true,
      estimatedSceneCount: 5,
      coreTransformation: "From chaos to clarity",
      visualMetaphor: {
        hook: "Fragments",
        problem: "Chaos",
        solution: "Alignment",
      },
    }, "dark");

    expect(result.typographyEnergy).toBe("editorial-bold");
    expect(result.depthModel).toBe("immersive");
    expect(result.lightingModel).toBe("cool-specular");
    expect(result.surfaceStyle).toBe("glass-premium");
  });

  it("avoids repeating the same visual grammar role in adjacent scenes", () => {
    const result = deriveQualityMetadata([
      { intent: "feature", title: "Workflow 1" },
      { intent: "feature", title: "Workflow 2" },
      { intent: "feature", title: "Workflow 3" },
    ]);

    expect(result[0]?.visualGrammarRole).toBe("workflow-choreography");
    expect(result[1]?.visualGrammarRole).not.toBe(result[0]?.visualGrammarRole);
    expect(result[2]?.visualGrammarRole).not.toBe(result[1]?.visualGrammarRole);
  });

  it("chooses transitions from beat type instead of defaulting all middles to cameraPan", () => {
    expect(
      choosePlannerTransition({
        index: 2,
        total: 5,
        scene: {
          narrativeRole: "proof-confidence",
          visualGrammarRole: "proof-confidence",
          motionLanguage: "measured-proof",
          continuityRole: "new-world",
        },
      }),
    ).toBe("scale");

    expect(
      choosePlannerTransition({
        index: 2,
        total: 5,
        scene: {
          narrativeRole: "workflow-choreography",
          visualGrammarRole: "workflow-choreography",
          motionLanguage: "guided-choreography",
          continuityRole: "continue-world",
        },
      }),
    ).toBe("cameraPan");
  });
});
