import type { CreativeBrief } from "@/types/generation";

export type NarrativeRole =
  | "problem-tension"
  | "workflow-choreography"
  | "before-after-transformation"
  | "compare-split-screen"
  | "ecosystem-network"
  | "proof-confidence"
  | "product-payoff";

export type MotionLanguage =
  | "constrained-focus"
  | "guided-choreography"
  | "transformational-portal"
  | "measured-proof"
  | "premium-payoff";

export type InteractionStoryMode =
  | "guided-reveal"
  | "transformation-chain"
  | "proof-of-control"
  | "coordinated-automation"
  | "none";

export interface StyleContract {
  typographyEnergy: "editorial-bold" | "clean-product" | "authoritative-minimal";
  depthModel: "immersive" | "layered" | "soft-studio";
  lightingModel: "cool-specular" | "warm-glow" | "neutral-premium";
  spacingDensity: "airy" | "balanced" | "dense";
  cursorPersonality: "confident-precise" | "guided-calm" | "assertive-snappy";
  iconMotion: "subtle-orbit" | "snapped-magnetic" | "quiet-supporting";
  surfaceStyle: "glass-premium" | "soft-shadow" | "matte-clean";
}

export interface QualitySceneSeed {
  intent?: "hook" | "problem" | "solution" | "feature" | "proof" | "cta";
  title?: string;
  skills?: string[];
  motionBudget?: "low" | "medium" | "high";
  continuityRole?: "new-world" | "continue-world";
  isAhaMoment?: boolean;
  journeyKind?: string;
  narrativeRole?: NarrativeRole;
  visualGrammarRole?: NarrativeRole;
  motionLanguage?: MotionLanguage;
  interactionStoryMode?: InteractionStoryMode;
}

export interface DerivedQualityMetadata {
  narrativeRole: NarrativeRole;
  visualGrammarRole: NarrativeRole;
  motionLanguage: MotionLanguage;
  interactionStoryMode: InteractionStoryMode;
}

const VISUAL_ROLE_ROTATION: NarrativeRole[] = [
  "problem-tension",
  "workflow-choreography",
  "before-after-transformation",
  "compare-split-screen",
  "ecosystem-network",
  "proof-confidence",
  "product-payoff",
];

function inferNarrativeRole(scene: QualitySceneSeed, index: number, total: number): NarrativeRole {
  if (scene.narrativeRole) return scene.narrativeRole;

  const title = scene.title?.toLowerCase() ?? "";
  const skills = scene.skills ?? [];
  const intent = scene.intent;
  const isLast = index === total - 1;

  if (isLast || intent === "cta") return "product-payoff";
  if (scene.isAhaMoment || intent === "solution") return "before-after-transformation";
  if (intent === "proof") return "proof-confidence";
  if (
    skills.some((skill) =>
      skill.includes("network") ||
      skill.includes("integration-wall") ||
      skill.includes("logo-wall") ||
      skill.includes("data-flow"),
    )
  ) {
    return "ecosystem-network";
  }
  if (
    skills.some((skill) => skill.includes("split-screen") || skill.includes("before-after")) ||
    /\bbefore\b|\bafter\b|\bcompare\b|\bvs\b/.test(title)
  ) {
    return "compare-split-screen";
  }
  if (intent === "feature") return "workflow-choreography";
  return "problem-tension";
}

function inferVisualGrammarRole(scene: QualitySceneSeed, narrativeRole: NarrativeRole): NarrativeRole {
  if (scene.visualGrammarRole) return scene.visualGrammarRole;
  return narrativeRole;
}

function rotateVisualRole(previousRole: NarrativeRole | null, currentRole: NarrativeRole): NarrativeRole {
  if (!previousRole || previousRole !== currentRole) return currentRole;
  const index = VISUAL_ROLE_ROTATION.indexOf(currentRole);
  return VISUAL_ROLE_ROTATION[(index + 1) % VISUAL_ROLE_ROTATION.length] ?? currentRole;
}

function inferMotionLanguage(scene: QualitySceneSeed, narrativeRole: NarrativeRole): MotionLanguage {
  if (scene.motionLanguage) return scene.motionLanguage;

  if (scene.isAhaMoment || narrativeRole === "before-after-transformation") {
    return "transformational-portal";
  }
  if (narrativeRole === "product-payoff") return "premium-payoff";
  if (narrativeRole === "proof-confidence") return "measured-proof";
  if (scene.continuityRole === "continue-world" || narrativeRole === "workflow-choreography") {
    return "guided-choreography";
  }
  return "constrained-focus";
}

function inferInteractionStoryMode(
  scene: QualitySceneSeed,
  narrativeRole: NarrativeRole,
): InteractionStoryMode {
  if (scene.interactionStoryMode) return scene.interactionStoryMode;

  if (narrativeRole === "workflow-choreography") {
    return scene.journeyKind === "confirm" || scene.journeyKind === "result"
      ? "transformation-chain"
      : "guided-reveal";
  }
  if (narrativeRole === "before-after-transformation") return "transformation-chain";
  if (narrativeRole === "proof-confidence") return "proof-of-control";
  if (narrativeRole === "ecosystem-network") return "coordinated-automation";
  return "none";
}

export function deriveStyleContract(
  brief: CreativeBrief | null | undefined,
  brandStyle?: string | null,
): StyleContract {
  const grammar = brief?.visualGrammar;
  const motion = grammar?.motionPersonality ?? "cinematic";
  const density = grammar?.layoutDensity ?? "balanced";
  const texture = grammar?.textureStyle ?? "clean";
  const shape = grammar?.shapeLanguage ?? "minimal";

  return {
    typographyEnergy:
      grammar?.shapeLanguage === "editorial" || motion === "playful"
        ? "editorial-bold"
        : density === "dense"
          ? "clean-product"
          : "authoritative-minimal",
    depthModel:
      brief?.spatialWorld.depthStrategy === "immersive"
        ? "immersive"
        : brief?.spatialWorld.depthStrategy === "layered"
          ? "layered"
          : "soft-studio",
    lightingModel:
      brandStyle === "dark"
        ? "cool-specular"
        : texture === "glossy"
          ? "warm-glow"
          : "neutral-premium",
    spacingDensity: density === "sparse" ? "airy" : density === "dense" ? "dense" : "balanced",
    cursorPersonality:
      motion === "snappy" || motion === "playful"
        ? "assertive-snappy"
        : shape === "minimal"
          ? "guided-calm"
          : "confident-precise",
    iconMotion:
      motion === "cinematic"
        ? "quiet-supporting"
        : shape === "organic"
          ? "subtle-orbit"
          : "snapped-magnetic",
    surfaceStyle:
      texture === "matte"
        ? "matte-clean"
        : brandStyle === "light"
          ? "soft-shadow"
          : "glass-premium",
  };
}

export function deriveQualityMetadata(
  scenes: QualitySceneSeed[],
): DerivedQualityMetadata[] {
  let previousVisualRole: NarrativeRole | null = null;

  return scenes.map((scene, index) => {
    const narrativeRole = inferNarrativeRole(scene, index, scenes.length);
    const initialVisualRole = inferVisualGrammarRole(scene, narrativeRole);
    const visualGrammarRole = rotateVisualRole(previousVisualRole, initialVisualRole);
    previousVisualRole = visualGrammarRole;

    return {
      narrativeRole,
      visualGrammarRole,
      motionLanguage: inferMotionLanguage(scene, narrativeRole),
      interactionStoryMode: inferInteractionStoryMode(scene, narrativeRole),
    };
  });
}

export function choosePlannerTransition(input: {
  index: number;
  total: number;
  scene: QualitySceneSeed;
  previousScene?: QualitySceneSeed | null;
}): "fade" | "slide" | "scale" | "flash" | "none" | "cameraPan" | "zoomThrough" {
  const { index, total, scene, previousScene } = input;
  if (index === 0 || index === total - 1) return "fade";
  if (scene.isAhaMoment || scene.motionLanguage === "transformational-portal") return "zoomThrough";
  if (scene.visualGrammarRole === "compare-split-screen") return "none";
  if (scene.narrativeRole === "workflow-choreography" && scene.continuityRole === "continue-world") {
    return "cameraPan";
  }
  if (scene.narrativeRole === "proof-confidence") return "scale";
  if (previousScene?.narrativeRole === "problem-tension" && scene.narrativeRole === "before-after-transformation") {
    return "zoomThrough";
  }
  if (scene.motionLanguage === "premium-payoff") return "flash";
  return "slide";
}
