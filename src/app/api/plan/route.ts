import { GoogleGenAI, Type } from "@google/genai";
import { enforceScreenshotDrivenSceneContract } from "./screenshot-contract";
import {
  choosePlannerTransition,
  deriveQualityMetadata,
  deriveStyleContract,
  type InteractionStoryMode,
  type MotionLanguage,
  type NarrativeRole,
  type StyleContract,
} from "./quality-grammar";

const GEMINI_FAST_MODEL = process.env.GEMINI_FAST_MODEL ?? "gemini-2.5-flash";
const GEMINI_PRO_MODEL = process.env.GEMINI_PRO_MODEL ?? "gemini-2.5-pro";

// ---------------------------------------------------------------------------
// Retry-with-backoff for transient Gemini/API/network failures
// ---------------------------------------------------------------------------

function extractRetryDelay(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error);
  // API returns retryDelay like "17s" or "17.375652384s"
  const match = msg.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
  return match ? Math.ceil(parseFloat(match[1])) + 2 : null; // +2s buffer
}

function isRetryableGeminiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return [
    "429",
    "RESOURCE_EXHAUSTED",
    "503",
    "UNAVAILABLE",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "Connect Timeout Error",
    "fetch failed",
    "ECONNRESET",
    "socket hang up",
    "read ETIMEDOUT",
  ].some((token) => msg.includes(token));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryableGeminiError(err) || attempt === maxRetries) throw err;
      const delaySec = extractRetryDelay(err) ?? Math.min(20, Math.pow(2, attempt + 1) * 3);
      console.log(`Gemini transient failure — retrying in ${delaySec}s (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
      lastError = err;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Brand extraction from screenshots (vision)
// ---------------------------------------------------------------------------

// @ts-ignore -- kept for reference, not used in combined prompt path
const _BRAND_EXTRACTION_PROMPT = `You are a precision brand color extractor for a video generation system.

Analyze this product screenshot and extract the EXACT brand design system. Study carefully:
- Primary CTA buttons, submit buttons, nav active states → primary color
- Secondary interactive elements, badges, tags → secondary color
- Overall page / app background → bg
- Card, panel, sidebar backgrounds (if distinct from bg) → surface
- Main body / heading text → text color
- Subdued labels, captions, metadata text → textMuted
- Card border lines, divider rules → border
- Dominant visual mood of the UI → style

Rules:
- Return 6-digit hex (#rrggbb) for solid colors
- For surfaces/borders with clear transparency, return rgba() notation
- "style" must be "dark" if the background is dark/black, "light" if white/near-white, "neon" if highly saturated neon colors dominate
- If you cannot identify a value precisely, infer a professional default that matches the visible mood
- Never return "N/A" — always provide a value`;

// ---------------------------------------------------------------------------
// Phase 0: Creative Brief (runs BEFORE narrative planning)
// ---------------------------------------------------------------------------

const CREATIVE_BRIEF_PROMPT = `
You are a senior creative director at a world-class SaaS explainer video agency.
Your job is NOT to plan scenes. Your job is to define the emotional and visual
strategy BEFORE any scenes are planned.

Given a product description, you produce a CreativeBrief — a short strategic document
that answers 5 questions a creative director answers before touching a timeline.

## Your 5 questions:

### 1. EMOTIONAL ARC
Map the viewer's emotional journey beat by beat. Each beat corresponds to one scene.
- What should the viewer FEEL at this moment? (not what they should SEE)
- Is this beat a punch (fast, aggressive) or a breath (slow, expansive)?
- Is the color temperature cold (tension, problem) or warm (relief, solution)?
- Pacing words: "punch" = short + snappy | "breathe" = long + slow | "accelerate" = building |
  "silence" = moment before the reveal | "release" = cathartic expansion

### 2. VISUAL GRAMMAR
Pick ONE consistent visual language for the entire video. This is the "illustration style."
Do NOT default to generic. Ask: what shape language fits this product's personality?
- Fintech/analytics: geometric, data-dense, cold palette
- Productivity/collaboration: organic, balanced, warm
- Developer tools: editorial, sparse, monochrome with single accent
- Consumer SaaS: playful, colorful, high density
- Enterprise: cinematic, minimal, authoritative

### 3. SPATIAL WORLD
WhatAStory's signature technique: every scene exists inside ONE continuous world.
The camera explores this world rather than cutting between disconnected scenes.
Define what this world looks like and where each scene "lives" in it.
- Is it a control room? A cityscape at night? An abstract data space? A clean white studio?
- Where is the hook scene? (usually wide establishing shot)
- Where is the solution reveal? (usually a dramatic zoom-in to the center)

### 4. SOUND INTENTION
Don't list SFX names. Describe what audio DOES emotionally:
- Problem section: sparse, almost silent — the silence creates unease
- Solution reveal: bass drop + swell — physical feeling of relief
- CTA: rhythmic, urgent — matches heartbeat pace

### 5. TYPOGRAPHY AS HERO
WhatAStory uses text as the primary visual in 40-50% of scenes.
Decide upfront: is this a typography-dominant video or a UI-demo-dominant video?
- Typography-dominant: hook, problem, and CTA are pure kinetic text scenes
- UI-dominant: most scenes show the product interface
- Hybrid: alternates between text-dominant and UI scenes

### 6. CORE TRANSFORMATION + VISUAL METAPHOR (mandatory)
State the single transformation this video delivers in one sentence:
Format: "From [pain state] → to [gained state]"
Example: "From scattered manual reporting → to automated insight in seconds"
This sentence governs every scene. If a scene cannot be justified against it, it should not exist.

Also define the visual metaphor for 3 phases — what does the CONCEPT look like visually before any product UI appears?
- hook: what image/motion represents the viewer's current broken world?
  e.g. "scattered glowing fragments pulling in opposite directions"
- problem: what visual represents the pain at its worst?
  e.g. "a tangled web of disconnected nodes, red-tinted, dense and chaotic"
- solution: what visual represents the transformation resolved?
  e.g. "all fragments snapping magnetically into a clean unified shape, brand-colored"
These metaphors drive skill selection — hook/problem scenes use chaos/abstract skills, not raw UI.

## Rules:
- Be specific. "The viewer feels trapped" is better than "the viewer understands the problem."
- estimatedSceneCount: 4 for <60s, 5-6 for 60-90s, 7-8 for 90-120s. Never more than 8.
- Your brief CONSTRAINS the planner. The planner cannot deviate from the emotional arc,
  visual grammar, or spatial world you define.
- Do not describe individual scenes. Describe the overall strategy.

Respond ONLY with valid JSON matching the CreativeBrief schema. No preamble.
`.trim();

const CREATIVE_BRIEF_SCHEMA = {
  type: "object",
  properties: {
    logline: { type: "string" },
    emotionalArc: {
      type: "array",
      items: {
        type: "object",
        properties: {
          beatIndex:        { type: "integer" },
          intent:           { type: "string", enum: ["hook","problem","solution","feature","proof","cta"] },
          feeling:          { type: "string" },
          pacingWord:       { type: "string", enum: ["punch","breathe","accelerate","silence","release"] },
          durationBias:     { type: "string", enum: ["short","normal","long"] },
          colorTemperature: { type: "string", enum: ["cold","neutral","warm"] },
        },
        required: ["beatIndex","intent","feeling","pacingWord","durationBias","colorTemperature"],
      },
    },
    visualGrammar: {
      type: "object",
      properties: {
        shapeLanguage:     { type: "string", enum: ["geometric","organic","data-dense","editorial","minimal"] },
        textureStyle:      { type: "string", enum: ["clean","grainy","glossy","matte","neon"] },
        iconStyle:         { type: "string", enum: ["outline","filled","duotone","abstract","none"] },
        layoutDensity:     { type: "string", enum: ["sparse","balanced","dense"] },
        motionPersonality: { type: "string", enum: ["snappy","fluid","heavy","playful","cinematic"] },
      },
      required: ["shapeLanguage","textureStyle","iconStyle","layoutDensity","motionPersonality"],
    },
    spatialWorld: {
      type: "object",
      properties: {
        worldDescription:    { type: "string" },
        cameraStartPosition: { type: "string", enum: ["wide","close","overhead","eye-level"] },
        depthStrategy:       { type: "string", enum: ["flat","layered","immersive"] },
        scenePositions:      { type: "array", items: { type: "string" } },
      },
      required: ["worldDescription","cameraStartPosition","depthStrategy","scenePositions"],
    },
    soundIntention:      { type: "string" },
    typographyHero:      { type: "boolean" },
    estimatedSceneCount: { type: "integer" },
    coreTransformation:  { type: "string", description: "Single 'From X → to Y' sentence governing the whole video" },
    visualMetaphor: {
      type: "object",
      properties: {
        hook:     { type: "string", description: "Visual concept for hook scene — chaos/pain before product appears" },
        problem:  { type: "string", description: "Visual concept for problem scene — pain at its worst" },
        solution: { type: "string", description: "Visual concept for solution scene — transformation resolved" },
      },
      required: ["hook", "problem", "solution"],
    },
  },
  required: ["logline","emotionalArc","visualGrammar","spatialWorld","soundIntention","typographyHero","estimatedSceneCount","coreTransformation","visualMetaphor"],
};

// ---------------------------------------------------------------------------
// Phase 1: Narrative Backbone (runs AFTER creative brief)
// ---------------------------------------------------------------------------

const NARRATIVE_BACKBONE_PROMPT = `
You are a senior creative director at a world-class SaaS video agency.
Your job is to take a strategic CreativeBrief and define the NARRATIVE BACKBONE
for the video — a high-level scene breakdown that ensures the video follows
a clear "Problem → Solution" arc.

## Your goal:
1. Translate the Emotional Arc beats from the brief into a concrete sequence of 5-8 scenes.
2. For each scene, define the visual metaphor (e.g. "scattered data floating in red light").
3. Assign an approximate duration (frames) and imageIndex (if any) to each scene.
4. Define the visualState: what stays on screen from the previous scene? (e.g. "App sidebar stays mounted", "Camera zoom remains at 1.06 on dashboard").
5. Explain the "reasoning" — why does this scene exist? How does it serve the transformation?

## Rules:
- Hook (Scene 1): MUST show the broken world visually (visualMetaphor) before UI.
- AHA Moment (isAhaMoment): Identify the single most important scene where the transformation happens.
- Continuous Flow: Ensure the sequence feels like one take. The Global Visual Thread evolves.
- Reasoning must be deep: "The contrast between the chaotic red nodes here and the clean brand grid in Scene 3 makes the relief visceral."

Respond ONLY with valid JSON matching the NarrativeBackbone schema.
`.trim();

const NARRATIVE_BACKBONE_SCHEMA = {
  type: "object",
  properties: {
    logline: { type: "string" },
    coreTransformation: { type: "string" },
    globalVisualThread: { type: "string" },
    beats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          beatIndex: { type: "integer" },
          intent: { type: "string", enum: ["hook","problem","solution","feature","proof","cta"] },
          visualMetaphor: { type: "string" },
          durationFrames: { type: "integer" },
          imageIndex: { type: "integer" },
          reasoning: { type: "string" },
          visualState: { type: "string", description: "Persistence of UI/camera from previous scene" },
        },
        required: ["beatIndex", "intent", "visualMetaphor", "durationFrames", "reasoning", "visualState"],
      },
    },
  },
  required: ["logline", "coreTransformation", "globalVisualThread", "beats"],
};

const NARRATIVE_BACKBONE_CRITIQUE_PROMPT = `
You are a senior creative director auditing a NARRATIVE BACKBONE for a SaaS video.
Your job is to find weak spots in the story arc, boring visual metaphors, or broken continuity.

## Audit Rubric:
1. **Narrative Tension**: Is the "broken world" (hook/problem) painful enough?
2. **Core Transformation**: Does the sequence actually deliver the transformation?
3. **Visual Continuity**: Does the "visualState" handoff make sense between every beat?
4. **Metaphor Quality**: Are metaphors specific and high-end (avoiding generic "flying nodes")?

## Output:
- needsRefinement: boolean
- critique: string (what to fix)
- suggestions: specific scene-by-scene fixes

Respond ONLY with valid JSON.
`.trim();

async function critiqueNarrativeBackbone(
  backbone: import("@/types/generation").NarrativeBackbone,
  brief: import("@/types/generation").CreativeBrief,
  ai: GoogleGenAI,
): Promise<{ needsRefinement: boolean; critique: string; suggestions: string } | null> {
  try {
    const userMessage = `Creative Brief: ${JSON.stringify(brief)}\n\nProposed Backbone: ${JSON.stringify(backbone)}`;
    const result = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_FAST_MODEL,
        config: {
          systemInstruction: NARRATIVE_BACKBONE_CRITIQUE_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.5,
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
      })
    );
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn("[backbone-critique] failed:", err);
    return null;
  }
}

const NARRATIVE_PLANNING_CRITIQUE_PROMPT = `
You are a senior creative director auditing a DETAILED SCENE PLAN for a SaaS video.
Your job is to ensure the plan honors the Narrative Backbone and Creative Brief.

## Audit Rubric:
1. **Backbone Alignment**: Does every scene serve its assigned narrative beat?
2. **Visual Metaphor Enforcement**: Are the metaphors from the brief actually translated into scene prompts?
3. **Skill Composition**: Is the skillComposition object present and correctly mapped to emotional intent?
4. **Continuity Flow**: Are transitions (especially cameraPan) and visualState handoffs logical?
5. **Aha Moment**: Is the AHA MOMENT scene (isAhaMoment: true) designed for maximum emotional impact?

## Output:
- needsRefinement: boolean
- critique: string (what to fix)
- suggestions: specific scene-by-scene fixes

Respond ONLY with valid JSON.
`.trim();

async function critiqueScenePlan(
  plan: FullVideoPlanRaw,
  backbone: import("@/types/generation").NarrativeBackbone,
  brief: import("@/types/generation").CreativeBrief,
  ai: GoogleGenAI,
): Promise<{ needsRefinement: boolean; critique: string; suggestions: string } | null> {
  try {
    const userMessage = `
Creative Brief: ${JSON.stringify(brief)}
Narrative Backbone: ${JSON.stringify(backbone)}
Proposed Scene Plan: ${JSON.stringify(plan)}
    `.trim();

    const result = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_FAST_MODEL,
        config: {
          systemInstruction: NARRATIVE_PLANNING_CRITIQUE_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.5,
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
      })
    );
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn("[plan-critique] failed:", err);
    return null;
  }
}

async function generateNarrativeBackbone(
  brief: import("@/types/generation").CreativeBrief,
  imageDescriptions: string[],
  ai: GoogleGenAI,
): Promise<import("@/types/generation").NarrativeBackbone | null> {
  try {
    const userMessage = [
      `Creative Brief: ${JSON.stringify(brief)}`,
      imageDescriptions.length > 0 ? `Image context: ${imageDescriptions.join(" | ")}` : "",
    ].filter(Boolean).join("\n");

    const result = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_PRO_MODEL,
        config: {
          systemInstruction: NARRATIVE_BACKBONE_PROMPT,
          responseMimeType: "application/json",
          responseSchema: NARRATIVE_BACKBONE_SCHEMA,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 1500 },
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
      })
    );

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const backbone = JSON.parse(clean) as import("@/types/generation").NarrativeBackbone;

    // ── DIRECTOR FEEDBACK LOOP ───────────────────────────────────────────
    const critique = await critiqueNarrativeBackbone(backbone, brief, ai);
    if (critique?.needsRefinement) {
      console.log("[backbone-critique] refining backbone:", critique.critique);
      const refinementMessage = `
Proposed Backbone: ${JSON.stringify(backbone)}
Director Critique: ${critique.critique}
Fix Suggestions: ${critique.suggestions}

Please provide a REFINED NarrativeBackbone that addresses these issues.
      `.trim();

      const refinementResult = await withRetry(() =>
        ai.models.generateContent({
          model: GEMINI_PRO_MODEL,
          config: {
            systemInstruction: NARRATIVE_BACKBONE_PROMPT + "\n\n## REFINEMENT MODE: Fix the provided backbone based on the director's critique.",
            responseMimeType: "application/json",
            responseSchema: NARRATIVE_BACKBONE_SCHEMA,
            temperature: 0.4,
            thinkingConfig: { thinkingBudget: 1000 },
          },
          contents: [{ role: "user", parts: [{ text: refinementMessage }] }],
        })
      );
      const refText = refinementResult.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return JSON.parse(refText.replace(/```json|```/g, "").trim());
    }

    return backbone;
  } catch (err) {
    console.warn("[backbone] failed, continuing without backbone:", err);
    return null;
  }
}

async function generateCreativeBrief(
  productPrompt: string,
  imageDescriptions: string[],
  targetDurationSeconds: number,
  ai: GoogleGenAI,
): Promise<import("@/types/generation").CreativeBrief | null> {
  try {
    const userMessage = [
      `Product description: ${productPrompt}`,
      imageDescriptions.length > 0
        ? `Screenshots provided: ${imageDescriptions.join(" | ")}`
        : "",
      `Target video duration: ~${targetDurationSeconds}s`,
    ].filter(Boolean).join("\n");

    const result = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_PRO_MODEL,
        config: {
          systemInstruction: CREATIVE_BRIEF_PROMPT,
          responseMimeType: "application/json",
          responseSchema: CREATIVE_BRIEF_SCHEMA,
          temperature: 0.8,
          thinkingConfig: { thinkingBudget: 800 },
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
      })
    );

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as import("@/types/generation").CreativeBrief;
  } catch (err) {
    console.warn("[creative-brief] failed, continuing without brief:", err);
    return null;
  }
}

function buildDirectorPlannerSystemPrompt(
  brief: import("@/types/generation").CreativeBrief,
  backbone: import("@/types/generation").NarrativeBackbone | null,
): string {
  const arcLines = brief.emotionalArc
    .map(b =>
      `  Beat ${b.beatIndex} (${b.intent}): ${b.feeling} -- pacing: ${b.pacingWord}, duration: ${b.durationBias}, color: ${b.colorTemperature}`
    )
    .join("\n");

  const backboneLines = backbone
    ? backbone.beats.map(b =>
        `- Scene ${b.beatIndex + 1} (${b.intent}): ${b.visualMetaphor}\n  Duration: ${b.durationFrames}f\n  Visual State: ${b.visualState}\n  Reasoning: ${b.reasoning}`
      ).join("\n")
    : "No backbone generated.";

  const briefSection = [
    "## CREATIVE BRIEF (MANDATORY -- you must follow this exactly)",
    "",
    `**Logline:** ${brief.logline}`,
    "",
    `### Emotional Arc (${brief.emotionalArc.length} beats -> target ${brief.estimatedSceneCount} scenes):`,
    arcLines,
    "",
    "### Visual Grammar (apply to EVERY scene without exception):",
    `- Shape language: ${brief.visualGrammar.shapeLanguage}`,
    `- Texture style: ${brief.visualGrammar.textureStyle}`,
    `- Icon style: ${brief.visualGrammar.iconStyle}`,
    `- Layout density: ${brief.visualGrammar.layoutDensity}`,
    `- Motion personality: ${brief.visualGrammar.motionPersonality}`,
    "",
    "### Spatial World:",
    `- World: ${brief.spatialWorld.worldDescription}`,
    `- Camera starts: ${brief.spatialWorld.cameraStartPosition}`,
    `- Depth strategy: ${brief.spatialWorld.depthStrategy}`,
    "- Scene positions:",
    ...brief.spatialWorld.scenePositions.map((p, i) => `  Scene ${i}: ${p}`),
    "",
    "### Sound Intention:",
    brief.soundIntention,
    "",
    "### Typography strategy:",
    brief.typographyHero
      ? "TYPOGRAPHY-DOMINANT: Hook, problem, and CTA scenes must be pure kinetic text -- no UI in those scenes. Typography IS the animation."
      : "UI-DOMINANT: Show product interface in most scenes. Typography supports but does not dominate.",
    "",
    "## NARRATIVE BACKBONE (The Director's Vision):",
    backboneLines,
    "",
    ...(brief.coreTransformation ? [
      "",
      "## CORE TRANSFORMATION (IRON LAW — every scene must serve this):",
      `"${brief.coreTransformation}"`,
      "",
      "If you cannot justify a scene against this transformation sentence, remove it.",
      "Every voiceoverText must move the viewer closer to this transformation.",
      "Every headline must reflect either the \"from\" (pain) state or the \"to\" (gained) state.",
    ] : []),
    ...(brief.visualMetaphor ? [
      "",
      "## VISUAL METAPHOR PER PHASE (mandatory — hook/problem scenes open with concept, NOT product UI):",
      `- Hook: "${brief.visualMetaphor.hook}"`,
      `- Problem: "${brief.visualMetaphor.problem}"`,
      `- Solution: "${brief.visualMetaphor.solution}"`,
      "Hook and problem scenes that have no attached screenshot MUST use a chaos/abstract skill to represent this metaphor visually.",
      "The product UI should appear AFTER the problem is established, not before.",
    ] : []),
    "",
    "### Brief enforcement rules:",
    `- Scene count must be ${brief.estimatedSceneCount} (+-1 maximum)`,
    "- Each scene's intent must match its emotional arc beat exactly",
    "- durationBias \"short\" = 60-90f, \"normal\" = 120-150f, \"long\" = 180-210f",
    "- colorTemperature \"cold\" = motionBudget \"low\", stiffness 80-120",
    "- colorTemperature \"warm\" = motionBudget \"high\", stiffness 160-260",
    "- pacingWord \"punch\" = first element at frame 0-3, slam variants",
    "- pacingWord \"breathe\" = first element at frame 15-20, float-up variants",
    "- pacingWord \"silence\" = no music volume boost, minimal SFX, long hold before reveal",
    "- Visual grammar shapeLanguage and motionPersonality override skill defaults",
    "- continuityRole: scenes at the SAME spatial position = \"continue-world\", new world = \"new-world\"",
    "",
    "## SKILL COMPOSITION RULES (MANDATORY):",
    "- Every scene MUST have a skillComposition object.",
    "- primary: The main layout (e.g. premium-reconstructed-ui).",
    "- secondary: [backgroundSkill, polishSkill].",
    "- modifiers: MUST map from the emotional intent (e.g. 'emotional-tension' for problem, 'emotional-relief' for solution).",
    "- Every scene MUST also define: narrativeRole, visualGrammarRole, motionLanguage, and interactionStoryMode.",
    "- Do not repeat the same visualGrammarRole in adjacent scenes unless the second scene is clearly a continuation of the same product world.",
  ].join("\n");

  return briefSection + "\n\n---\n\n" + NARRATIVE_PLANNING_PROMPT;
}

// ---------------------------------------------------------------------------
// Narrative planning
// ---------------------------------------------------------------------------

const NARRATIVE_PLANNING_PROMPT = `You are a Creative Director at a premium SaaS video agency (WhatAStory / Sandwich Video tier).
Your job is not just to plan scenes — it is to craft a STORY that makes viewers feel something, then act.

## CRITICAL RULES (violations cause immediate output rejection — read before everything else)
1. Scene 1: ZERO product branding, specific human + specific pain + one concrete data point (time/money/%)
2. Act timing in EVERY scene prompt: "Act 1 (0-Xf): ... Act 2 (Xf-Yf): ... Act 3 (Yf-Zf): hold final state."
3. No two consecutive scenes share the same layoutTopology (split-left/split-right/center-focus/isometric-float/full-bleed-overlay)
4. EVERY scene prompt contains "VISUAL THREAD:" line describing the global motif's state in this scene
5. Transition grammar must be story-motivated: do NOT repeat one transition mechanically across all middle scenes.
6. EVERY voiceoverText describes what the VIEWER GAINS (not product features)
7. EVERY scene has highlightWords[] with 1-2 accent words
8. EVERY scene prompt ends with "Stage Direction:" sentence

Given a product description, write a complete video narrative plan.

## SCENE GRAMMAR SYSTEM (MANDATORY)
Every scene must explicitly choose a narrativeRole and a visualGrammarRole from this cinematic grammar:
- problem-tension
- workflow-choreography
- before-after-transformation
- compare-split-screen
- ecosystem-network
- proof-confidence
- product-payoff

Rules:
- Adjacent scenes should not share the same visualGrammarRole unless they are an intentional persistent-shell continuation.
- A strong SaaS explainer should usually progress from tension → workflow/transformation → proof → payoff.
- No more than one purely functional walkthrough scene may appear before a transformation or proof beat.
- Final scene must land as product-payoff, not just a generic CTA card.

Also assign:
- motionLanguage: constrained-focus | guided-choreography | transformational-portal | measured-proof | premium-payoff
- interactionStoryMode: guided-reveal | transformation-chain | proof-of-control | coordinated-automation | none

## THE AGENCY DISCIPLINE MANDATES (NON-NEGOTIABLE)

WhatAStory quality comes from **extreme opinionation**. You are no longer "suggesting" — you are "dictating".

### 1. STRICT SCENE COMPOSITION RULES (NON-NEGOTIABLE)
- **Maximum 3 visual elements** per scene.
- **Only ONE focal element** per scene.
- **Minimum padding:** 80px from all edges.
- **Headline must occupy a single clear region** (no overlaps).
- **Supporting elements must be visually subordinate** (opacity/scale).
- If a scene contains more than 3 elements → **REMOVE the least important one.**

### 2. SKILL DISCIPLINE (CRITICAL)
Each scene MUST use **exactly ONE primary skill**. 
DO NOT combine multiple concepts.
- BAD: "feature-grid + data-reveal + cursor-demo"
- GOOD: "feature-grid ONLY"

### 3. VISUAL DENSITY CURVE
You must manage the "visual breathing" of the video:
- **HOOK/PROBLEM:** High density (more elements, tighter spacing).
- **RECOGNITION:** Medium density.
- **AHA:** Low density (maximum whitespace). *The AHA scene MUST be the least visually complex scene in the entire video. Remove all non-essential elements. Focus only on the transformation.*
- **CTA:** Ultra minimal (1-2 elements only).

### 4. LAYOUT SYSTEM LOCK
Each scene MUST use one of these layouts:
- **center-focus**
- **split-left**
- **split-right**
- **isometric**
No custom layouts allowed. **No two consecutive scenes can use the same layout.**

### 5. CAMERA RULES
- **Every 2 scenes MUST include camera movement.**
- **Showcase scenes MUST include macro zoom** (1.0 → 1.3).
- **Problem scenes may include slight shake or instability.**
- **CTA must be static** (no camera movement).

### Step 1 — Identify the BROKEN REALITY (write this first, before choosing scenes)
What is the viewer's life like RIGHT NOW without this product?
Be specific and visceral. NOT: "Teams struggle with collaboration."
YES: "Every Monday, Sarah manually copies numbers from 4 spreadsheets into a report nobody reads until Thursday."
The hook scene must show THIS broken reality — before the product is ever named.

### Step 2 — Identify the AHA MOMENT
What is the ONE thing that makes a prospect say "I need this immediately"?
This is not a feature — it is a transformation. "From 4 hours of manual work to one click."
One scene must be designed entirely around delivering this aha moment. Mark it as isAhaMoment: true.

### Step 3 — Write OUTCOME-DRIVEN voiceover (never feature-driven)
❌ WRONG: "Our platform has automated reporting with custom templates."
✅ RIGHT: "Your report is ready before you finish your coffee — formatted, branded, and already in your inbox."
Every voiceover sentence must describe what the VIEWER gains, not what the product does.

### Step 4 — Assign an EMOTIONAL INTENT to every scene
Each scene must make the viewer feel ONE specific emotion:
- Hook: FRUSTRATION or RECOGNITION ("that's exactly my problem")
- Problem: PAIN or COST (quantify the loss — time, money, stress)
- Solution reveal: RELIEF ("oh thank god")
- Feature demos: CONFIDENCE ("I can see exactly how this works")
- Social proof: TRUST ("others have already solved this")
- CTA: URGENCY + EXCITEMENT ("I want this now")

## EMOTIONAL VISUAL GRAMMAR (mandatory — every emotion has a visual style)

Emotion is not just in the words. It lives in animation speed, color temperature, and motion character.
The LLM coder reads these rules from the scene prompt — write them explicitly.

| emotionalIntent | Spring style | Animation character | Color temperature | Pacing |
|---|---|---|---|---|
| FRUSTRATION | damping:150, stiffness:200 | Jittery, staggered, uneven entrances | Desaturated, cold, low contrast | Fast, overlapping, chaotic |
| PAIN | damping:300, stiffness:60 | Slow, heavy settle — elements drag in | Dark, low saturation, muted grays | Slow, weighted, oppressive |
| RECOGNITION | damping:200, stiffness:120 | Clean reveal, one element at a time | Normal brand colors | Medium, deliberate |
| RELIEF | damping:400, stiffness:80 | Smooth, almost floating settle | Warm, bright, high contrast | Slow, spacious, breathing room |
| CONFIDENCE | damping:200, stiffness:140 | Synchronized, crisp, all elements arrive together | Vivid, full brand saturation | Medium-fast, precise |
| TRUST | damping:300, stiffness:100 | Gentle, warm, no rush | Soft, warm tones | Slow, unhurried |
| URGENCY | damping:120, stiffness:180 | Fast entrance, pulsing CTA, strong overshoots | High contrast, bright accent | Fast, pressing |
| EXCITEMENT | damping:8, stiffness:200 | Elastic pop, bounce, overshoots | Vivid, energetic | Fast, playful |

**In every scene prompt, explicitly state the animation style from this table.**
Example: "RELIEF scene — use smooth floating settle (damping:400), warm palette, generous breathing room. Elements drift in gently from below."
Example: "FRUSTRATION scene — use jittery staggered entrances (damping:150), desaturated colors, uneven timing. Elements don't all arrive at once."

## SCENE ACT STRUCTURE (every scene has 3 internal acts)

A scene is not a flat block of frames. It has setup → tension → resolve internally.
For every scene, allocate frames across 3 acts and state this in the scene prompt:

| Scene duration | Setup | Tension | Resolve |
|---|---|---|---|
| 150 frames (5s) | 0–30f: establish | 30–105f: main content | 105–150f: hold + breathe |
| 180 frames (6s) | 0–40f: establish | 40–130f: main content | 130–180f: hold + breathe |
| 210 frames (7s) | 0–50f: establish | 50–155f: main content | 155–210f: hold + breathe |
| 240 frames (8s) | 0–60f: establish | 60–180f: main content | 180–240f: hold + breathe |
| 270 frames (9s) | 0–70f: establish | 70–200f: main content | 200–270f: hold + breathe |

**Act definitions:**
- **Setup (0–20%)**: Background reveals, single anchor element enters, viewer orients. One thing. No information yet.
- **Tension (20–75%)**: The main content unfolds. Multiple elements enter sequentially. The narrative builds. Cursor moves, data animates, story progresses.
- **Resolve (75–100%)**: Animation stops. Final state holds. Viewer absorbs. No new elements. Spring physics settle. Hold 20–30 frames minimum before transition.

**State the act timing in every scene prompt:**
"Act 1 (0–50f): Background + headline enters. Act 2 (50–155f): [specific visual content]. Act 3 (155–210f): Final state holds. No new elements."

**Problem scenes:** Tension act shows the chaos, resolve act shows the cost (the number, the damage).
**Solution/AHA scenes:** Tension act shows the transformation happening, resolve act holds on the transformed state — this is the emotional payoff. Hold extra long (30–40f minimum).
**CTA scenes:** Tension act is the kinetic build-up, resolve act is the static final frame with CTA button pulsing.

## STAGE DIRECTIONS (mandatory in every scene prompt)

Each scene prompt must end with a "Stage Direction" sentence that describes the physical camera and emotional arc:
- "Camera holds wide on the chaos; elements drift in with jitter. The emotional arc shifts from anxiety to recognition."
- "Camera slowly pushes into the dashboard. Each metric card enters crisply, one by one — confidence building."
- "Elements snap into a clean grid alignment. The scene breathes. Viewer absorbs the outcome."
Include this as the LAST line of each scene's prompt string. This is the emotional stage direction for the animator.

## VISUAL ANCHORS (use when the story has a clear before/after transformation)

Identify 1–2 "Visual Anchors" — elements that appear in broken form in problem scenes and transform to resolved form in the solution/AHA scene:
- Example: a "⚠️" icon (red) in the chaos scene becomes "✅" (green) in the AHA moment scene
- Example: a clock icon (red glow) in the problem scene becomes a calendar check (green) in the solution reveal
When you identify a visual anchor:
1. In the problem scene prompt, describe the element in its broken/chaotic state
2. In the AHA/solution scene prompt, explicitly reference that same element in its resolved state: "The same [icon] from the chaos scene now appears in [color], transformed"
This creates visual continuity that makes the narrative arc emotionally resonant.

## GLOBAL VISUAL THREAD (mandatory — this is what gives WhatAStory the "one-take" feel)

Beyond visual anchors (which are narrative callbacks), a **Global Visual Thread** is a persistent *design motif* that appears in EVERY scene and makes the whole video feel like one continuous piece rather than a sequence of separate scenes.

**Before writing any scene, identify the Global Visual Thread:**
Pick ONE of:
- A **geometric shape** (e.g. a circle/ring that starts as chaos rings in scene 1, becomes a brand badge in scene 3, becomes a success checkmark ring in the AHA scene, and becomes the CTA button border in the final scene)
- A **color wash** (e.g. the BRAND.primary color starts as a dim glow in the problem scene, intensifies progressively until it fills the screen at the AHA moment, then settles as the dominant color in the CTA)
- A **motion motif** (e.g. a horizontal sweep/wipe that transitions every scene — the same direction, the same speed, but different content each time)
- A **floating element** (e.g. a single brand icon that exists in every scene — chaotic/red in problem scenes, calm/brand-colored in solution scenes)

**In each scene prompt, include:**
"VISUAL THREAD: [describe how the global motif appears in this scene — what state it is in, where it sits, how it has transformed from the previous scene]"

**Rules:**
1. The thread must EVOLVE — in problem scenes it is distorted/broken/cold; in solution scenes it is resolved/warm/complete
2. The thread must be mentioned in every single scene prompt
3. The thread must be the same element — not just a thematic reference but a literal visual element that re-appears
4. Size/color/state transforms; position stays approximately the same OR follows a clear directional journey

Example: "This video's global thread is a RING. Scene 1: fragmented arcs (chaotic, gray). Scene 2: full red circle (warning). Scene 3: transforms to BRAND.primary ring (the product is the fix). Scene 4: ring pulses as success indicator. Scene 5 CTA: ring becomes the CTA button border."

## VOICEOVER WORD COUNT FORMULA
Each scene's voiceover must fit within its duration.
Formula: words = (durationInFrames / 30) × 2.5
- 90 frames (3s) → ~7 words max (section title cards — no voiceover needed, use "")
- 150 frames (5s) → ~12 words
- 240 frames (8s) → ~20 words
- 300 frames (10s) → ~25 words
- 420 frames (14s) → ~35 words
NEVER write voiceover longer than (durationInFrames / 30) × 2.8 words.
If a scene has no voiceover (section titles, purely visual transitions), set voiceoverText: "".

## SCENE ARC
Design scenes based on the product — vary the arc, do not always use the same 6 scenes.
Total video: 75–120 seconds. Each scene 3–15 seconds.

Proven patterns:
- **Hook → Problem → Solution reveal → Feature demo ×2–3 → Proof → CTA**  (standard B2B SaaS — most versatile)
- **Hook → Broken reality ×2 → Aha moment → Feature walkthrough → Stats → CTA**  (data/analytics tools)
- **Hook → Before chaos → After clarity → Product demo → Social proof → CTA**  (collaboration/workflow tools)
- **Hook → Cost of problem → How it works → Feature showcase → Testimonial → CTA**  (enterprise/security tools)

## THE CHAOS SCENE (Scene 1 — non-negotiable formula)

The first scene is THE CHAOS SCENE. It must show the viewer's broken reality BEFORE the product exists.

**MANDATORY rules for Scene 1:**
1. ZERO product branding — no logo, no product name, no "Introducing X"
2. Must show a SPECIFIC human in a SPECIFIC painful situation (not a generic abstract)
3. Must include at least ONE concrete data point showing the cost: "3.5 hours every week", "73% of leads lost", "$12k in missed invoices"
4. emotionalIntent MUST be "FRUSTRATION" or "RECOGNITION"
5. The viewer must think "that's exactly my problem" — not "that sounds like a problem"
6. Duration: 120–180 frames (4–6 seconds) — short enough to feel urgent, long enough to land

**Chaos Scene visual formula:**
- Use floating/scattered elements (scattered avatars, tool icons, disconnected nodes) to show fragmentation
- Use desaturated/cold color temperature — the brand colors appear AFTER the solution
- Text on screen must be THE PAIN POINT, not a feature name
- Best skills: premium-team-orbit (scattered chaos), premium-floating-path-nodes (disconnected systems), premium-kinetic-text (bold pain statement), premium-gradient-hero (single brutal truth)

**VIOLATION**: A Scene 1 that shows a clean product UI, a logo, or says "Introducing [Product]" is an automatic fail. The product name comes in scene 2 or 3 at the earliest.

**VIOLATION (problem scenes 1–2)**: A problem scene where the ONLY content is text — bullet points, a headline, or a paragraph — is a quality fail. Problem scenes MUST use a visual metaphor that SHOWS the chaos, not just names it:
- Disconnected/scattered elements (use premium-team-orbit or premium-floating-path-nodes)
- A storm of notifications/feedback (use premium-feedback-storm)
- Fragmented data/icons floating disconnected (use premium-floating-path-nodes)
- A bold single painful stat that fills the frame (use premium-stat-counter or premium-gradient-hero)
The viewer's pain must be FELT visually before it is named in text.

## LIGHT-THEME DEFAULTS (B2B SaaS)

For products with light/white UI screenshots or B2B CRM/HR/marketing/analytics products with clean aesthetics, default to:
- bg: "#f8f9fc"
- surface: "white"
- text: "#0f172a"
- textMuted: "rgba(15,23,42,0.5)"
- border: "rgba(0,0,0,0.08)"
- style: "light"

Detection signals: UI screenshots with white/near-white backgrounds, products described as "clean", "minimal", "B2B", "enterprise", "HR", "CRM", "analytics dashboard".
Use premium-light-arc-bg (when created) as the background layer for all scenes when style is "light".
Use premium-multi-corner-gradient as fallback light background until premium-light-arc-bg is available.

## ALL AVAILABLE SKILLS (use EXACTLY these names)

Brand / intro:
- premium-saas-hook        — brand reveal, floating icons orbiting a hero laptop, dark cinematic intro
- premium-light-arc-bg     — near-white base background with 6–8 animated concentric arc lines + soft corner gradient blobs; use as background layer for light-themed B2B videos
- premium-kinetic-text     — high-energy word-by-word text reveal, brand pill with flash sweep; has light-bg variant + underline accent + rotating bold word in tagline
- premium-char-split       — character-level headline animation, push-up letter reveal
- premium-ink-logo-reveal  — brand icon forms from an ink/paint blob via border-radius morph; wordmark springs in beside it; used for cinematic brand moments or problem→solution logo transitions
- premium-dot-matrix-bg    — light gray repeating dot-grid texture + floating brand-color accent dots + small dark dash marks; foundation background for any light-themed SaaS video
- premium-multi-corner-gradient — pastel near-white background with large soft radial-gradient blobs bleeding from corners (blue/indigo bottom-left, salmon top-right, red bottom-right); pairs with network-intro, customer-journey, cta-scene, icon-concept-scene
- premium-icon-arc-reveal  — dark cinematic hook: single brand icon (neon outline) centered on glow pool; SVG circle arc draws around it via strokeDashoffset; concentric rings expand; optional shape-mask expand to fill screen; strongest dark-theme intro/hook scene
- premium-floating-path-nodes — dark bg with aurora/nebula wave on right; empty outline circles + pill nodes float and pop in sequentially; dotted curved SVG path draws in from edge with animated traveling dot; perfect for "chaos / scattered data" problem scenes

Problem / contrast (pick ONE that best fits the story — do NOT default to split-screen):
- premium-split-screen     — animated before/after divider; ONLY use when you want a literal left-vs-right comparison (e.g. "old tool vs new tool")
- premium-team-orbit       — floating team avatars with chaos/stress visual; best when the problem is team coordination, scattered tools, or communication overload
- premium-neon-dark        — dark tech scene with sonar rings and glitch effects; best when the problem is technical complexity, slowness, or system failures
- premium-match-cut        — whip-cut motion blur reveal; best when dramatizing a sharp contrast or "moment of realization"
- premium-kinetic-text     — punching word-by-word text; effective for problem+solution as a bold statement scene ("Chaos. Delays. Missed deadlines.")
- premium-char-split       — character-level headline reveal; strong for a single impactful problem statement
- premium-glassmorphism    — glass cards listing pain points; works well for a visually rich "what's broken" scene
- premium-data-reveal      — stats showing the cost of the problem (e.g. "73% of teams miss deadlines"); ideal for data-backed problems

Product showcase:
- premium-saas-showcase    — browser chrome, dashboard layout, stat cards, slide-up entrance
- premium-cursor-engine    — cursor spring movement, click ripple, UI walkthrough demo
- premium-chameleon-ui     — chameleon overlays (typing, dropdowns, panels) over screenshot + CinematicCamera zoom
- premium-interactive-ui   — full app shell reconstruction (AppShell + SidebarNav + InputField + TaskDetailPanel) — use when no screenshot available or full layout control needed; Bordio-quality task creation/form filling scenes
- premium-reconstructed-ui — fully animated vector reconstruction of the product UI (sidebar, metric cards, charts, tables, forms); each element animates independently; crisp at any zoom; use instead of screenshot overlay for standard SaaS dashboards
- premium-macro-closeup    — extreme close-up deep dive into product UI focusing on a specific element; use to magnify a sidebar, table row, or data card with a heavy depth-of-field blur on the background
- premium-camera-zoom      — cinematic hero zoom into laptop/device screen
- premium-device-mockup    — MacBook / browser / phone shell with ATTACHED_IMAGES screenshot (CSS 2D — fast render)
- premium-3d-device-mockup — TRUE 3D MacBook or phone rendered via @remotion/three; cinematic camera orbit; physically accurate depth, specular highlights, real parallax; use for premium launch/hero scenes where device must feel tactile and cinematic
- premium-scroll-demo      — scroll simulation inside browser shell, "living product" demo
- premium-multi-device     — laptop + phone + tablet composite, cross-platform showcase
- premium-callout-bubble   — floating comment/annotation card that pops up near cursor (avatar + typed message + CTA); shows collaboration or feedback features; includes slide-in side comments panel variant
- premium-responsive-viewport — browser frame with device-switcher toolbar; cursor clicks device icons to transition content width between desktop/tablet/mobile; shows product responsiveness

Features / data:
- premium-feature-list     — staggered 3–4 feature reveal, benefit list with icons
- premium-feature-bundle-cards — 3 floating white cards side-by-side connected by + symbols; each card has icon, bold title, accent-colored label; brand logo above, tagline below; use for integration/platform product overview scenes
- premium-data-reveal      — animated counters, stat cards, ring progress, bar fills
- premium-network-intro    — avatar network graph, polka-dot SVG paths, B2B ecosystem; supports real ATTACHED_IMAGES photos in avatar nodes
- premium-customer-journey — horizontal curved SVG path + traveling dot + milestone pop-up cards; ideal for CRM, customer success, onboarding lifecycle scenes
- premium-icon-concept-scene — oversized white icon circle on soft radial color glow + dark badge + dotted SVG path with triangle arrowhead; use for abstract problem/concept scenes
- premium-confetti-celebration — confetti particles raining over full-screen product screenshot; optional dark header bar with animated text; use for "deal closed / launch day" showcase scenes
- premium-real-photo-device — real environment photo (ATTACHED_IMAGES[0]) fills background; centered portrait tablet/phone mockup (white frame, realistic shadow) with product UI inside (ATTACHED_IMAGES[1]); ultra-realistic product-in-context social proof scene
- premium-live-action-composite — real environment photo background (VideoPlateMockup) with floating UI metric cards, notification toasts, or annotation panels TiltWrapper-composited over the plate; the Viable/WhatAStory live-action look; use when ATTACHED_IMAGES[0] is an environment/office/context photo and UI elements should float IN that world rather than on a device mockup
- premium-icon-bubble-row  — large colored filled circles with white SVG icons + label text; sequential spring pop-in; optional partial arc accent around one bubble; pastel gradient bg; use for feature categories, tech stack, or use-case showcase scenes
- premium-integration-wall — solid brand-color background filled with white rounded-square app logo cards (scattered or explosion pattern); shows "we connect to all your data sources"; distinct from network-intro (no paths, no avatars)
- premium-feedback-storm   — person photo centered (ATTACHED_IMAGES[0]); floating white feedback cards with urgency pills orbiting at two z-depths (front/back of person); shows raw customer voice for feedback/CX products

Depth / atmosphere:
- premium-glassmorphism    — glass cards with backdrop blur, blend-mode orbs, parallax depth layers

Trust / social proof:
- premium-social-proof     — glass notification cards, integration logos, testimonials, stacked avatars

Finale:
- premium-cta-scene        — kinetic CTA headline, pulsing gradient button, mesh background

Conceptual / abstract (use when explaining HOW something works, not just showing the UI):
- premium-data-flow-abstract  — glowing hub nodes + flowing SVG bezier path edges (WhatAStory style) + traveling data packets; ideal for integration/API/AI pipeline explanations
- premium-3d-isometric-explode — screenshot sliced into 3 floating CSS-3D panels in isometric space; assembles flat for cursor demo; dramatic architecture reveal
- premium-ambient-environment  — breathing background: orbiting glow orbs + floating particle dust; use as the base layer under any other scene for premium depth

Transitions (cinematic scene-to-scene):
- premium-shape-morph-transition — clicked element's color explosively fills the screen then reveals next scene via clipPath; pairs with premium-cursor-engine CTA click

Punchy statements / social proof:
- premium-gradient-hero    — full-screen bold headline with brand gradient text; zero chrome; single message; use for chapter title cards, bold problem statements, CTA openers
- premium-logo-wall        — "trusted by" logo grid (3×2 or 4×2) or infinite marquee; company logos in glass cards; use for social-proof intro scenes or between problem and showcase
- premium-stat-counter     — single dramatic metric (94%, $2.4M, 3×) that counts up at massive scale; radial glow behind number; use for data-proof scenes or after problem statement
- premium-metric-flyout    — hero metric (280px) + 3–4 satellite stat pills flying in from screen edges + SVG arc ring + radial glow; for data-proof scenes with supporting evidence
- premium-feature-grid     — 2×2 or 3×2 animated card grid with icon+title+description per cell; denser than feature-list; use for "here's what you get" or capabilities overview scene
- premium-before-after     — horizontal wipe split; left panel dark/desaturated "before" state, right panel vibrant product "after"; animated glowing divider sweeps left→right; problem-to-solution bridge scene
- premium-testimonial-card — full-screen editorial pullquote; word-by-word animated text reveal + avatar circle + stars; strongest single-testimonial social proof scene
- premium-phone-notification — iOS-style frosted-glass push notification slides from top; p## SKILL SELECTION RULES
- Intro scene for light B2B brands: use premium-saas-hook with FloatingShapes + ContentCard wrapping the logo — this is the WhatAStory hook pattern (logo in white card, geometric shapes floating around it on grid bg). For dark brands: prefer premium-icon-arc-reveal (the Desklog template) for the most polished, professional hook.
- Problem scene — choose based on WHAT the problem actually is:
  - Scattered team / communication chaos → premium-team-orbit
  - Technical failures / system slowness → premium-neon-dark
  - Chaos / disconnected systems / data silos → premium-floating-path-nodes (the Desklog template, highly polished)
  - Left-vs-right literal old-vs-new comparison → premium-split-screen (use sparingly)
  - Bold single pain-point statement → premium-kinetic-text or premium-char-split
  - Data-backed cost-of-problem → premium-data-reveal
  - Rich visual pain-point list → premium-glassmorphism
  - Dramatic reveal / snap-cut → premium-match-cut
  ⚠️ DO NOT always pick premium-split-screen for problem scenes. Evaluate the product and choose the most relevant option.
- Depth/atmosphere: premium-glassmorphism works for any scene needing rich visual depth
- If user uploaded screenshots:
  - MANDATORY: At least ONE scene MUST use premium-cursor-engine (standard) or premium-chameleon-ui (when the UI has visible input fields or dropdowns) for an interactive cursor walkthrough over the actual UI — set imageIndex to the most UI-rich screenshot AND provide cursorJourney (see CURSOR JOURNEY below)
  - CURSOR JOURNEY MANDATE: For EVERY cursor scene (premium-cursor-engine, premium-chameleon-ui, premium-interactive-ui), you MUST set "cursorJourney" — an ordered array of 3–5 narrative action strings describing what the user is ACCOMPLISHING at each step. These are NOT element names. They are narrative actions:
    BAD:  ["Login Button", "Dashboard Tab", "Filter Dropdown"]
    GOOD: ["User clicks Login to enter their workspace", "Navigates to the Analytics dashboard", "Opens the date filter to scope last 30 days", "Views the spike in conversions — the aha moment"]
    The cursorJourney tells the story of what this user is trying to achieve — curiosity → exploration → discovery → confirmation.
    Length must match the expected number of cursor clicks (3–5 steps).
  - ALSO MANDATORY: At least ONE scene (different from the cursor scene) MUST use premium-device-mockup, premium-scroll-demo, or premium-saas-showcase to display the screenshot inside a device frame
  - If the cursor scene's UI clearly has input fields, search bars, or dropdown menus: use premium-chameleon-ui instead of premium-cursor-engine for that scene — it will add typing animations and dropdown overlays for a much more realistic demo
  - For each showcase/cursor/device scene, set imageIndex (0-based integer) to indicate which uploaded screenshot is most relevant to that scene's content
  - MACRO CLOSE-UP MANDATE: For ANY showcase scene with UI (screenshots or reconstructed), at least ONE scene MUST use macroZoom (assign zoomLevel 3.0–4.0, focusPoint targeting the most visually interesting UI element — a data table row, a metric card, a sidebar item). This creates Bordio-style extreme close-up that makes the product feel real and detailed. Pair with premium-macro-closeup or premium-cursor-engine.
  - MULTI-VIEW MANDATE: When the user provides 3+ screenshots, at least ONE scene MUST use skill premium-multi-view-walkthrough to show a tabbed/multi-view product tour with a persistent shell. Assign imageIndices[] with 2–3 of the uploaded images. This is NON-NEGOTIABLE when 3+ images exist.
- Integration/API/platform products: strongly prefer premium-data-flow-abstract over premium-network-intro for the "how it works" scene
- When NO screenshot uploaded and product concept > UI: use premium-data-flow-abstract or premium-3d-isometric-explode for showcase scenes
- High-stakes showcase needing cinematic 3D depth (enterprise SaaS launch, investor demo, fintech, design tool, analytics platform): consider premium-3d-device-mockup for the hero showcase scene — it renders a physically accurate 3D device with orbital camera, superior to CSS mockup
- Add premium-ambient-environment as base to any scene using premium-glassmorphism, premium-cta-scene, or premium-kinetic-text for extra depth
- premium-shape-morph-transition: use as the final scene transition in a cursor-engine or CTA scene (last 45 frames)
- Data products (analytics, metrics): include premium-data-reveal
- Platform / network products: include premium-network-intro
- Collaboration / feedback / annotation features: add premium-callout-bubble to the cursor scene or as a standalone scene; especially if the product has comments, reviews, or multi-user features
- Responsive web products (website builders, CMS, e-commerce, web design tools): add premium-responsive-viewport as one of the showcase scenes to demonstrate cross-device compatibility
- Light B2B products: in EVERY scene prompt, instruct "Use <LightArcBg brand={BRAND} /> as the first child of AbsoluteFill" — LightArcBg is already in compiler scope
- Light-themed brands (white/gray palette, minimal aesthetic): use premium-dot-matrix-bg as the background layer instead of dark gradient; combine with premium-kinetic-text (light variant) for text scenes
- Logo reveal scenes (any brand): prefer premium-ink-logo-reveal over a simple fade-in when the brand moment needs to be dramatic; pair with premium-dot-matrix-bg
- When product has real-time monitoring, live dashboards, agent queues, or call-center features: use premium-chameleon-ui or premium-cursor-engine with a custom-built dashboard layout for the showcase scene
- Cross-platform products: include premium-multi-device
- CTA / finale: always premium-cta-scene; for light-themed brands without taglines use the "Simple Logo + Wide Button + URL" variant described in the skill
- Never repeat the same skill in two scenes
- Light-themed B2B / CRM / customer-success products: use premium-multi-corner-gradient as the background for intro, network-intro, and CTA scenes instead of dot-matrix
- Customer lifecycle / pipeline / journey scenes: prefer premium-customer-journey for showcase scenes in CRM/CS products; shows the product's value through stage progression
- Abstract concept scenes (cost of problem, how AI works, data sync): use premium-icon-concept-scene for problem or solution scenes when showing a concept visually is more powerful than showing the UI
- Dark-themed products (tech, analytics, vertical SaaS): STRICTLY use premium-icon-arc-reveal for the hook/intro scene (Scene 1), premium-floating-path-nodes for the problem scene (Scene 3 or 4), and premium-confetti-celebration for the solution or CTA scene to match the polished Desklog templates!
- Showcase scenes with a "win" moment (deal closed, launch, goal hit): add premium-confetti-celebration — works over any product screenshot
- When user provides both an environment photo AND a product screenshot: use premium-real-photo-device for the social proof scene — strongest trust-builder available
- Feedback/VoC/NPS/survey products: use premium-feedback-storm for social proof — floating feedback cards with urgency pills around a person photo; if no person photo available use the no-person card-only variant
- Products with many integrations (Zapier, Salesforce, Zendesk, etc.): use premium-integration-wall for problem or showcase scene — scattered app logo cards on brand-colored bg
- Feature showcase / use-case scene (not UI demo): use premium-icon-bubble-row — 3 colored circle icons with labels; cleaner than feature-list for visual-forward brands
- premium-cta-scene simple variant now has URL typewriter animation — use for any CTA with a memorable URL to make it stick
- premium-social-proof now has an avatar-widget-orbit variant: central photo + orbiting mini data cards (donut, star-rating, quote, bar chart); prefer this for CRM/analytics products that show per-customer insights
- premium-audio can optionally appear in any single scene for background music (e.g. intro, CTA) — do not use it in more than one scene
- premium-gradient-hero for any scene that is purely a bold statement — replaces generic kinetic-text when the message is 1 sentence and no UI is shown
- premium-chaos-to-ui-resolve: use for the AHA moment scene when the product solves a team/data/workflow chaos problem — floating chaotic elements (avatars, nodes, pills) spring-snap into product UI positions at triggerFrame; strongest problem→solution emotional transition available; requires useEntropyWithAttractor (already in compiler scope)
- premium-logo-wall: always include in social proof scene when product has recognizable enterprise customers; place before or after testimonial content
- premium-stat-counter: use for any scene anchored on a single data point (problem size, time saved, ROI); do not use premium-data-reveal when only 1 stat is needed
- premium-feature-grid: use instead of premium-feature-list when 4+ features need to be shown — the grid format reads faster and fills the frame better
- premium-interactive-ui: use for showcase/solution scene when NO screenshot is available and the scene needs a task creation, form filling, or CRUD interaction — builds the full SaaS app shell from scratch; pair with premium-cursor-engine for the cursor walkthrough
- Before/after contrast scenes (old painful workflow vs. new product state): use premium-before-after — dramatic wipe reveal with glowing divider; ideal for problem-to-solution bridge scenes; stronger than premium-split-screen for narrative contrast
- Data-proof / ROI scenes with multiple supporting statistics: use premium-metric-flyout — hero metric at 280px scale + 3–4 satellite stat pills flying in from edges; use when you have 1 hero number AND 3-4 supporting stats; use premium-stat-counter instead for single-stat scenes
- Testimonial / customer quote social proof: use premium-testimonial-card for scenes anchored on a single strong customer quote — word-by-word reveal + attribution + stars; stronger than premium-social-proof when 1 powerful quote is more compelling than many cards
- Mobile-first / notification-heavy products (HR, CRM, mobile SaaS, consumer apps, helpdesk): add premium-phone-notification as an overlay on a showcase scene OR as a dedicated 3s beat scene; especially effective for products with real-time events (new lead, approval, mention, deal closed); do NOT add to more than 1 scene
- Light B2B products: use premium-light-arc-bg as the background layer for all scenes (instead of dark gradient); it provides subtle arc texture that matches agency-quality light-theme videos
- Integration/multi-feature platform overview: use premium-feature-bundle-cards for a 3-card scene showing key product capabilities
- Standard SaaS dashboards (sidebar + metric cards + charts): MANDATORY — when uiSchema is extracted for a scene (UI_SCHEMA is present), that scene MUST use premium-reconstructed-ui as its primary skill; reconstructed UI animates every element independently, stays crisp at any zoom, and eliminates blurry screenshot compositing
- MACRO ZOOM (Bordio-style extreme close-up): For products with complex dashboards (3+ panels, data tables, sidebar navigation), assign macroZoom to 1-2 showcase scenes. Set zoomLevel 3.0-3.5 for sidebar/table focus, 4.0+ for single-element isolation. focusPoint targets the key interactive element (sidebar item, data row, metric card). Use with premium-macro-closeup skill OR add it to any premium-cursor-engine / premium-chameleon-ui / premium-reconstructed-ui scene. Max 2 macroZoom scenes per video. Always pair with premium-cursor-engine for cursor interaction during the hold phase.
- Showcase scenes 210+ frames: ALWAYS add click-zoom effect (1.0→1.06 punch-in) on at least one key metric/area — in cursor-engine prompts add "Use click-zoom punch-in effect on each click"; for reconstructed-ui scenes use CinematicCamera or premium-camera-zoom to slowly push in toward the primary metric card
- Communication/messaging/chat products (Bordio, Slack, Intercom, Crisp, etc.): use premium-floating-icon-chaos for intro scene (WhatsApp/Slack/Gmail icons orbiting a device) + premium-in-app-chat for one showcase scene (slide-in chat panel over UI)
- CRM/workflow/notification-heavy products: use premium-notification-scatter for at least one scene — floating white cards on dark bg showing real notification types
- When 3+ screenshots are uploaded AND product has distinct views (table/kanban/calendar/detail): use premium-multi-view-walkthrough with imageIndices array assigning 2-3 images to one scene
- Enterprise products with multiple distinct features/integrations: set featureHeader on showcase scenes (label: feature name, badge: integration name) — renders persistent Qanapi-style header bar above the UI
- ConcentricRings: use in abstract concept scenes or icon reveals for expanding ring emanation (Screenjar/Viable style)
- DrawOnIcon: use ICON_PATHS keys (shield, lock, clock, dollar, chart-up, person, team, message, bell, mail, cloud, code, gear, lightning, check, warning, target, star, heart, database, globe, phone) for consistent line-art SVG icons with strokeDashoffset draw-on animation
- usePathTraveler + PaperPlane: use for traveling element along dotted path (Screenjar paper plane, Pretaa journey dot); pairs with premium-customer-journey or premium-floating-path-nodes
- AppShell chromeColor: set chromeColor prop on AppShell for Viable-style branded browser chrome (e.g. chromeColor={BRAND.primary})

## RESTRAINT & TASTE LAYER (the difference between premium and busy)

Premium videos are CONTROLLED. More features ≠ better output. Apply these hard limits when planning:

| Constraint | Limit per Video | Reason |
|---|---|---|
| MacroCamera zoom scenes | Max 2 | More = nauseating |
| Major transitions (zoomThrough, cameraPan) | Max 3 | Each should feel like an event |
| NarrationReveal | Max 1 | Overuse dilutes the "smart" feel |
| Morph portals | Max 1 | More = gimmicky |
| Notification scatter scenes | Max 1 | One is impactful, two is repetitive |
| Stock footage scenes | Max 2 (intro + 1 bookend) | More = stock-footage-dependency, not brand |
| Abstract concept scenes (icon + rings) | Max 2 | Balance with real product UI |

**Breathing Scenes**: At least 1 in every 4 scenes should be a "breathing" scene — minimal animation, strong typography, generous whitespace. These RESET the viewer's attention. Examples: section title, logo reveal, simple stat counter. A video that's wall-to-wall motion exhausts the viewer.

**Camera Intentionality**: Every macroZoom MUST have a reason field. Valid reasons:
- "focus-detail": viewer needs to read a specific metric/element
- "guide-attention": draw eye to next interaction
- "reveal-depth": show UI spatial layers
If you can't articulate the reason → don't add macroZoom to that scene.

**The Restraint Test**: After planning all scenes, review: if removing ANY scene's most complex effect would make the video WORSE, keep it. If the video would feel the same without it → remove it. Fewer well-chosen effects > many stacked effects.

## SCENE ARCHETYPES (maximum visual impact — match each scene to its archetype):
A. CINEMATIC PHOTO COMPOSITE (intro/problem): Stock footage bg + floating app icons → premium-live-action-composite + premium-floating-icon-chaos. When: B2B SaaS with communication pain.
B. MACRO UI DEEP-DIVE (showcase): Full UI → MacroCamera 3x zoom + SelectiveFocus blur → premium-macro-closeup + premium-cursor-engine. When: Complex dashboards.
C. MULTI-VIEW PRODUCT TOUR (showcase): Multiple screenshots = tab-switching views → premium-multi-view-walkthrough with imageIndices. When: 3+ screenshots or distinct views.
D. FEATURE CONTEXT WALKTHROUGH (showcase): FeatureContextBar at top + cursor UI below → premium-cursor-engine + featureHeader. When: Enterprise multi-feature products.
E. ABSTRACT CONCEPT (problem/solution): DrawOnIcon centered + ConcentricRings + dotted path → premium-icon-concept-scene. When: Abstract concepts.
F. NOTIFICATION SCATTER (showcase/trust): Dark bg + 4-6 floating white cards → premium-notification-scatter. When: CRM/workflow products.
G. NARRATION-SYNCED SUMMARY (conclusion): Word-by-word color reveal synced to voiceover → premium-narration-reveal. When: Key takeaway/CTA.
H. TEAM CHAT OVERLAY (showcase): UI + slide-in chat panel → premium-in-app-chat. When: Collaboration/messaging products.

## SKILL STACKING RULES (MANDATORY — every scene outputs skills: [] array)

Each scene's skills field is an ordered array of 1–3 skill names:
- skills[0] = PRIMARY: the main visual pattern (REQUIRED)
- skills[1] = BACKGROUND: atmosphere/texture behind the primary content (optional but strongly recommended for scenes that lack a built-in background)
- skills[2] = POLISH: micro-pattern on top (optional, use sparingly)

## SKILL COMPOSITION MANDATE (HARD CONSTRAINT)
Every scene MUST define a skillComposition object:
- primary: The main layout skill (from AVAILABLE SKILLS).
- secondary: Supporting skills (SFX, environment, or specific UI components).
- modifiers: Emotional/technical tags. MUST include:
  - Emotional state: "emotional-tension" (pain) | "emotional-relief" (reveal) | "emotional-energy" (CTA)
  - Layout depth: "high-depth" | "split-focus" | "macro-focus"
  - Pacing: "fast-pacing" | "slow-drift"

## DIRECTOR LAYER (MANDATORY — intent-first planning)

Every scene MUST declare:
- intent: "hook" | "problem" | "solution" | "feature" | "proof" | "cta"
- skillBudget: number (HARD LIMIT — default 2)
- motionBudget: "low" | "medium" | "high"
- continuityRole: "new-world" | "continue-world"

Rules:
- Default skillBudget=2. Only allow 3 when the scene is explicitly a showcase with background+polish needed.
- Feature intent scenes MUST use motionBudget="low" and emphasize stillness/clarity.
- Only "continue-world" when the scene is a direct navigation continuation of the same product shell (walkthrough sequences).

Recommended stacks by scene type:
- Dark hook/intro: ["premium-icon-arc-reveal"] — self-contained, no bg needed
- Dark problem/chaos: ["premium-floating-path-nodes"] — self-contained
- Dark kinetic text: ["premium-kinetic-text", "premium-neon-dark"]
- Dark metrics/data: ["premium-metric-flyout", "premium-ambient-environment"]
- Dark CTA: ["premium-cta-scene"] — self-contained
- Light hook: ["premium-saas-hook"] — self-contained
- Light features/use-cases: ["premium-icon-bubble-row", "premium-light-textured-bg"]
- Light cursor demo: ["premium-chameleon-ui", "premium-dot-matrix-bg"]
- Light reconstructed UI: ["premium-reconstructed-ui"] — self-contained
- Light social proof: ["premium-social-proof", "premium-multi-corner-gradient"]
- Light stat/metric: ["premium-stat-counter", "premium-light-textured-bg"]
- Light kinetic text: ["premium-kinetic-text", "premium-dot-matrix-bg"]
- Logo wall: ["premium-logo-wall", "premium-light-textured-bg"]
- Testimonial: ["premium-testimonial-card", "premium-multi-corner-gradient"]
- Customer journey: ["premium-customer-journey", "premium-multi-corner-gradient"]
- Network intro: ["premium-network-intro", "premium-multi-corner-gradient"]
- Feature grid: ["premium-feature-grid", "premium-light-textured-bg"]
- Integration wall: ["premium-integration-wall"] — self-contained
- Before/after: ["premium-before-after"] — self-contained
- Section title: ["premium-section-title"] — self-contained
- Macro close-up: ["premium-macro-closeup", "premium-cursor-engine"] — extreme zoom into UI + cursor interaction during hold phase; OR add premium-macro-closeup as skills[2] polish on any showcase scene
- Tier 3 Abstract Motion (use as skills[1]): ["premium-kinetic-text", "premium-light-leak"] or ["premium-cta-scene", "premium-grid-pulse"] or ["premium-section-title", "premium-gradient-flow"] or ["premium-logo-reveal", "premium-particle-field"]
- Narration reveal: ["premium-narration-reveal", "premium-light-textured-bg"] — word-by-word voiceover-synced text for conclusion/CTA scene; max 1 per video

Stacking constraints:
- NEVER combine two background skills (dot-matrix-bg + light-textured-bg is invalid)
- NEVER combine two cursor/interaction skills
- Self-contained skills (icon-arc-reveal, floating-path-nodes, cta-scene, before-after, integration-wall) already have rich backgrounds — do NOT add a background skill to these
- premium-ambient-environment as skills[1] adds orbiting glow orbs + particles — best for metrics/proof/data scenes that need visual depth
- premium-narrative-overlay as skills[2] (POLISH slot) can be added to ANY scene that needs explicit on-screen narrative text guidance — especially problem, solution/aha, and social proof scenes. Add it when the scene's narrative text layer is critical: ["premium-floating-path-nodes", "premium-narrative-overlay"] or ["premium-stat-counter", "premium-light-textured-bg", "premium-narrative-overlay"]

## TRANSITION ASSIGNMENT (required for every scene)

For each scene, assign a transition value that describes how the viewer moves INTO that scene from the previous one:
- "fade" — smooth cross-dissolve; safe default for any scene pair
- "slide" — scene slides in from the right; use for forward-momentum sequences (features → CTA, intro → problem)
- "scale" — incoming scene scales up from center; cinematic for reveal moments (problem → solution)
- "flash" — white flash burst between scenes; use for high-energy transitions after cursor clicks or CTA moments
- "cameraPan" — scene enters from off-screen right, previous scene exits off-screen left; creates the WhatAStory "infinite canvas" feeling — the camera pans laterally across a larger world. Use for the most important narrative transitions. Includes cinematic horizontal motion blur.
- "zoomThrough" — the most cinematic transition: the camera appears to travel THROUGH a UI element. The previous scene's camera zooms INTO a specific coordinate (set exitAnchor: {x, y} on that scene), and THIS scene receives the camera emerging from it at scale 10, then zooms out to reveal context. Creates true spatial continuity — the viewer feels like they traveled into the product. Set BOTH: transition "zoomThrough" on the receiving scene AND exitAnchor on the sending scene (e.g. exitAnchor: { "x": 0.6, "y": 0.5 }).
- "none" — hard cut; use for deliberate shock/contrast (before/after, old/new)

Rules:
- First scene: always "fade" (fade in from black)
- Last scene (CTA/finale): always "fade" (clean exit to black)
- Middle scenes: choose the transition that fits the beat. Workflow continuation can use "cameraPan", transformation pivots should prefer "zoomThrough", proof reveals can use "scale", compare/before-after scenes can use "none", and forward-momentum narrative beats can use "slide".
- AHA moment / problem→solution pivot (isAhaMoment: true): prefer "zoomThrough" for maximum cinematic impact. MAX 1 zoomThrough per video. Set exitAnchor on the PRECEDING scene targeting the most visually dominant element the camera should zoom into.
- Any scene immediately following a cursor CTA click finale may use "flash" (white burst energy release) if it feels like payoff, not as a blanket default.
- "scale": reserve ONLY for the single most dramatic non-AHA reveal in the video. Max 1 per video.
- "slide": use for forward momentum and progression. Do not use it repeatedly across unrelated beats.
- "none": hard cut — use only for deliberate before/after contrast scenes. Extremely rare.
- zoomThrough rules: MUST set exitAnchor on the sending scene (e.g., exitAnchor: { x: 0.6, y: 0.5 }) pointing to the element camera zooms into. Max 1 zoomThrough per video.
- MANDATE CHECK: Before finalizing your plan, scan the middle scenes. If three adjacent scenes share the same transition or visual grammar, the plan is too repetitive — fix it.

## MORPH PORTAL (cross-scene shape morphing)

Use morphExport + morphImport to animate a UI element from its exact position in one scene into a different element in the next scene. The element visually morphs: its border-radius transitions from circular (50%) to card corner radius, and its position/size spring to the new rect.

Fields:
- morphExport (on Scene N): { id: string, rect: { x, y, w, h } } — normalized 0-1 bounding box of the EXITING element
- morphImport (on Scene N+1): { id: string, rect: { x, y, w, h } } — normalized 0-1 bounding box of where that element ARRIVES in this scene

The receiving scene gets MORPH_FROM injected automatically. The LLM uses:
  const { style, progress } = useMorphEntrance(MORPH_FROM, { x, y, w, h });

Rules:
- Use SPARINGLY — max 1 morph portal per video. Best reserved for the most emotionally dramatic shape transition.
- Best moments: floating badge → full AppShell container; icon circle → hero feature card; pill button → modal overlay
- The morphing element should be the FIRST to appear in the receiving scene (startFrame: 0). Other content reveals once progress > 0.5.
- Pair with a brief "hold" on the exporting element at scene end so the viewer registers its position before the morph.
- Do NOT combine with zoomThrough in the same transition — they conflict.

## ANCHOR ELEMENTS (visual continuity across scenes)

Some visual elements must persist across multiple scenes to create a flowing story rather than isolated cuts.
Identify 1–2 ANCHOR ELEMENTS per video and reference them explicitly in each scene prompt where they appear.

**Common anchor patterns:**
- **App identity**: If Scene 3 shows a sidebar with "Projects / Tasks / Reports" nav items — Scenes 4, 5 must reference those SAME nav items + app name so the shell feels continuous
- **Key metric**: If Scene 3 introduces a stat (e.g. "12 hours saved") — Scene 4 or CTA can echo it ("That's 12 hours back, every week")
- **Brand element**: The product logo/wordmark appears in Scene 1 (problem context), reappears in Scene 3 (solution reveal), and anchors the CTA

**How to use in scene prompts:**
Add a line like: "ANCHOR: This scene shares the same app shell as Scene 3 — sidebar items [X, Y, Z] and app name '[AppName]' must match exactly."
Or: "ANCHOR: Echo the '12 hours saved' metric from the previous scene — reinforce it visually."

## VISUAL ANCHOR TRANSFORMATION (emotional throughline)

For every video, identify ONE visual anchor object that physically transforms between the problem and solution scenes. This creates the WhatAStory "same world, different state" effect — the viewer recognizes the element and feels the transformation.

**What is a visual anchor?**
A single icon, symbol, or shape that represents the core pain in the problem scene (broken state) and the same element in a resolved state in the solution/AHA scene. The transformation IS the story.

**How to assign:**
1. Choose a concrete metaphor for the product's core value (examples below)
2. Assign visualAnchor to the PROBLEM scene(s) with colorFrom (red/orange = broken)
3. Assign the SAME visualAnchor to the AHA/SOLUTION scene with colorTo (green/brand = resolved)
4. Reference the anchor explicitly in each scene prompt: "VISUAL ANCHOR: show [icon] in [colorFrom] state — cracked, pulsing alarm, or visually broken"

**Common anchor patterns by product type:**
- **Reporting/analytics**: icon "📊" colorFrom "#ef4444" (chaos, cluttered bars) → colorTo "#22c55e" (clean rising bars)
- **Communication/CRM**: icon "💬" colorFrom "#f97316" (garbled speech bubbles, question marks) → colorTo BRAND.primary (clear, organized)
- **Task/project management**: icon "⚠️" colorFrom "#ef4444" (red alert, deadline missed) → colorTo "#22c55e" (green checkmark, done)
- **Automation/workflow**: icon "⚙️" colorFrom "#ef4444" (spinning chaos, manual steps) → colorTo BRAND.primary (smooth single click)
- **Data sync/integration**: icon "🔗" colorFrom "#f97316" (broken chain links) → colorTo "#22c55e" (solid connected chain)
- **Finance/billing**: icon "💳" colorFrom "#ef4444" (red negative number) → colorTo "#22c55e" (green positive metric)

Output visualAnchor on the PROBLEM scene AND on the AHA/SOLUTION scene. On other scenes it is optional (add it if the anchor naturally appears). The anchor must be the SAME icon across all scenes it appears in.

## SCENE PROMPT REQUIREMENTS
Each scene prompt must include ALL of the following (write them as explicit instructions to the code generator):

1. **EMOTIONAL INTENT** — one word + the visual grammar: "RELIEF scene — smooth floating settle (damping:400), warm palette, elements drift in gently, generous spacing."
2. **Scene act timing** — explicit frame allocations: "Act 1 (0–50f): headline enters. Act 2 (50–155f): [content]. Act 3 (155–210f): hold final state."
3. **On-screen narrative text** — the EXACT headline text that appears visually (not just voiceover). This is separate from voiceover. Write it as: "Headline: '[text]' — 80–120px, weight 800, brand.text color, enters at f:20 from translateY(30px)." Include a sub-line if needed: "Subline: '[text]' — 22px, weight 400, textMuted color, appears at f:35."
4. **Visual composition** — assign a layoutTopology to each scene and state it explicitly. Choose from:
   - split-left: text 40% left / visual 60% right — classic showcase split
   - split-right: visual 60% left / text 40% right — reversed for variety
   - center-focus: UI centered full-screen, bold headline overlaid top or bottom with glass backing
   - isometric-float: UI tilted at isometric angle floating in space, text anchored to a corner (use IsometricWrapper or DepthStack primitives)
   - full-bleed-overlay: full-screen UI/image fills frame, text is a glass overlay panel
   ⚠️ RULE: No two consecutive scenes may share the same layoutTopology. The planner MUST alternate. The 40/60 split (split-left/split-right) is one option among equals — not a default.
5. **Animation choreography** — what enters first, in what order, at what frames
6. **Background note** — confirm which background skill is active, any ambient/atmospheric elements
7. If device/showcase scene: "display ATTACHED_IMAGES inside ContentCard (clean white frame, no browser chrome)"
8. For light-themed brands: "Use LightArcBg variant='grid' as background."
9. For showcase/cursor scenes: "Add PersistentSectionLabel top-left with featureName='[Feature Name]'."
10. If AHA MOMENT: "THIS IS THE AHA MOMENT — slow the animation, hold on the key transformation (Act 3 = 40 frames minimum), make the viewer feel the relief."

## ON-SCREEN NARRATIVE TEXT (WhatAStory standard — required on every scene)

Every scene must have on-screen text that tells the story visually, independent of voiceover.
Viewers often watch without sound — the text IS the story for them.

**Text hierarchy per scene type:**

PROBLEM / HOOK scenes:
- Headline (96–120px, weight 900): Short, visceral problem statement. Max 6 words. e.g. "Hours lost. Every week." or "Your team is drowning."
- Sub-line (24px, weight 400, textMuted): The specific cost. e.g. "12 hours of manual reporting — per person, per week"
- Accent word: One word in BRAND.primary color within the headline

SOLUTION / AHA scenes:
- Headline (80–108px, weight 800): The transformation, OUTCOME language. e.g. "Done in 30 seconds." or "One click. Every time."
- Sub-line (22px): How. e.g. "[Product] handles the rest — automatically"
- The headline is the payoff. Make it the dominant element. Hold it for 30+ frames.

FEATURE / SHOWCASE scenes:
- Section label (13px, uppercase, letterSpacing: 0.18em, brand.primary): Feature category above the headline. e.g. "REPORTING" or "AUTOMATION"
- Headline (56–72px, weight 800): What this feature DOES for the viewer. e.g. "See every project. Always."
- Feature tag (14px pill badge): Specific feature name. e.g. "Live Dashboard"

SOCIAL PROOF / TRUST scenes:
- Stat headline (96px+, weight 900): The number. e.g. "94%"
- Context line (22px): What the number means. e.g. "of teams report 3× faster delivery"
- Logo or attribution (small, muted)

CTA scenes:
- Hero headline (120–160px, weight 900, gradient text): 3–5 words max. e.g. "Start in minutes."
- CTA button text: Direct, outcome-driven. e.g. "Start Your Project →"
- URL/support line (16px, muted): The URL typed character by character

**CRITICAL**: Write the exact on-screen text strings in the scene prompt so the code generator uses them verbatim. Never let the LLM invent text — you define it here.

Each scene MUST include a voiceoverText using OUTCOME language:
- Problem scenes: make the pain visceral and specific ("Every week, your team loses 6 hours to...")
- Solution scenes: describe the transformation ("Now, [outcome] — in seconds, not hours")
- Feature scenes: "You can now [specific benefit] without [old pain]"
- CTA scenes: direct and urgent ("Start your free trial — your first [outcome] is ready in minutes")
Word count MUST match duration: (durationInFrames / 30) × 2.5 words max. Count your words before submitting.

VOICEOVER QUALITY TEST — before finalizing, ask yourself:
✅ Does it describe what the VIEWER gains? (not what the product does)
✅ Is it specific? (mentions actual time, money, or pain saved)
✅ Does it feel like something a human would say out loud?
✅ Would someone recognize their own problem in it?
If any answer is NO, rewrite it.

## CURSOR SCENE PROMPT REQUIREMENTS
When writing prompts for premium-cursor-engine OR premium-chameleon-ui scenes, ALWAYS include:
- 3–5 concrete UI actions using actual product feature names
- Format: "Cursor navigates to [Feature A] and clicks → types '[value]' → clicks [Button]"
- Base actions on the product's key workflows
- The vision system auto-detects coordinates — describe WHAT, not WHERE

For **premium-cursor-engine** prompts also mention:
- "Use click-zoom effect: punch in to each clicked element"
- "Use double ripple on each click"
- "Show step annotation badges (Step N of M) above cursor"
- Include keyboard key pill when cursor types in an input field

For **premium-chameleon-ui** prompts also mention:
- "Use progressive camera zoom that follows each cursor step"
- If the interaction ends with a form submit: "Show form success state (loading spinner → green checkmark) and slide-in toast notification"
- Describe the typing content: e.g., "types 'Q3 Sales Report' in the search field"

Example good cursor-engine prompt: "Interactive cursor demo: cursor springs to the 'New Report' button and clicks (double ripple + punch-in zoom, Step 1 of 3) → moves to the Analytics tab (Step 2 of 3) → clicks Export (Step 3 of 3, keyboard pill 'Enter ↵'). Use ATTACHED_IMAGES[0] as the live UI backdrop."

Example good chameleon-ui prompt: "Interactive form demo with chameleon overlays: cursor moves to Search input, ChameleonInput types 'Q3 Sales Report', cursor clicks Submit button (ChameleonHighlight glow). Progressive camera follows cursor. After submit: loading spinner → green checkmark success state → toast 'Report generated'. ATTACHED_IMAGES[0] as backdrop."

## SECTION HEADER REQUIREMENTS

For cursor-engine and chameleon-ui scenes with 3+ interaction steps, include a sectionHeader on each interaction event naming the feature being demonstrated.
In the scene prompt, instruct: "Label each cursor step with a contextual section header above the UI — large bold text (64px, weight 800) in brand.text color that slides in from above and identifies the feature. Format: 'Feature Name' above the device frame."

## TIMING
- Intro / CTA: 150–180 frames
- Problem / Social Proof: 180–240 frames
- Showcase / Features / Data: 210–270 frames
- Total: 1050–1500 frames (35–50s at 30fps)

## BRAND TOKENS
Extract from product description and any provided images:
- primary: main CTA/accent color
- secondary: supporting accent (darker/lighter shade of primary, or complementary)
- bg: "#0a0a14" to "#1a1a2e" for dark SaaS; "#f8fafc" or "#ffffff" for explicitly light/clean products
- surface: "rgba(255,255,255,0.06)" for dark; "white" for light
- text: "#ffffff" for dark; "#0f172a" for light
- textMuted: "rgba(255,255,255,0.5)" for dark; "rgba(15,23,42,0.5)" for light
- border: "rgba(255,255,255,0.12)" for dark; "rgba(0,0,0,0.08)" for light
- style: "dark" | "light" | "neon"
- accentName: single word like "indigo", "teal", "emerald", "rose", "amber"
- musicStyle: "corporate" | "energetic" | "cinematic" | "calm" | "playful" — pick based on brand tone

## BGSKILL OUTPUT
When brand.style is "light", output bgSkill: "premium-light-arc-bg" at the top level of the response JSON.
For dark themes, omit bgSkill (it defaults to no global background layer).

## UI RECONSTRUCTION vs SCREENSHOT OVERLAY

For showcase/demo scenes, select the skill based on what best serves the content:

RECONSTRUCTION (premium-reconstructed-ui skill) — PREFERRED when:
- Standard SaaS layout (sidebar + dashboard, settings, forms, tables)
- UI elements need to animate independently (cards stagger, charts draw)
- Form/modal interaction (typing, dropdown selection)
- Camera zoom is planned (vectors stay crisp at any scale)

OVERLAY (premium-chameleon-ui skill) — use ONLY when:
- Highly custom UI (maps, 3D views, photo-heavy, complex visualizations)
- Brand fidelity is critical above animation quality
- Screenshot contains irreplaceable real data

DEFAULT: Always prefer RECONSTRUCTION for standard SaaS dashboards/forms/settings.

## SECTION TITLE SCENES

Insert a "section-title" scene (3-second duration, centered title text on light background) between major feature demos when the video has 4+ showcase scenes. This creates breathing room and helps viewers track the narrative arc.

The section-title scene:
- skill: "premium-section-title"
- durationInFrames: 90 (3 seconds at 30fps)
- prompt: "SectionTitle scene for [Feature Name]. Use LightArcBg as background. Title: '[Feature Name]', subtitle: '[brief context]', icon: '[relevant emoji]'."

## PER-SCENE-TYPE DURATION DEFAULTS

- intro: 150 frames (5s)
- section-title: 90 frames (3s)
- showcase: 210 frames (7s) — product demo screens
- features: 180 frames (6s)
- social-proof: 150 frames (5s)
- cta: 150 frames (5s)

## GLOBAL BACKGROUND STYLE

Choose ONE background style for the entire video and output it as globalBg:
- "arcs" — light lavender-white with concentric SVG arcs (best for light/modern brands)
- "grid" — light gray with subtle cross-hatch grid (best for enterprise/B2B)
- "dots" — light with dot matrix pattern (best for clean/minimal brands)

For dark-themed brands, use "arcs" as default (still works but is less visible).
ALL scenes in the video should use this same background style.

## SCENE COUNT RULES
- No screenshots: 4-5 scenes
- 1-2 screenshots: 5-6 scenes
- 3-5 screenshots: 6-7 scenes
- 6+ screenshots/video: 7-8 scenes
NEVER exceed 8 scenes. Combine related features into one showcase scene rather than splitting.

## LIVE-ACTION COMPOSITE — CINEMATIC FUSION (WhatAStory signature technique)
Real video footage as background + animated UI/motion graphics floating INSIDE that world. Looks like a premium TV commercial, not a screen recording.

### WHEN TO USE (strong preference — default for these):
- Hook scene: B2B SaaS with human pain story (team overload, manual work, communication chaos)
- Problem scene: any product where showing a PERSON experiencing the pain is more powerful than abstract icons
- Social proof scene: office environment + floating metric cards = instant trust signal
- Any scene where the creative brief's spatialWorld describes a real physical environment

### WHEN TO AVOID:
- Cursor demo scenes (footage distracts from cursor interaction)
- CTA scene (focus on the call to action)
- When no Pexels API key AND no local stock footage

### videoSearchQuery MANDATE:
When using premium-live-action-composite, ALWAYS set videoSearchQuery:
- Hook (team chaos): "overwhelmed office worker multiple screens deadline"
- Hook (manual work): "person spreadsheet laptop frustrated desk"
- Problem (data): "analyst dashboard computer dark office concentrating"
- Social proof: "professional team meeting modern office success"
- Enterprise: "executive meeting boardroom confident"
Query must be 4-6 words. Keep it emotion + environment specific.

### THREE-LAYER COMPOSITION:
Layer 1: OffthreadVideo (STOCK_VIDEO_URL) at opacity 0.75 — the real world
Layer 2: Dark/blur overlay for UI contrast
Layer 3: Floating UI elements via useTrackedParallax — the product world

Use TiltWrapper on ALL floating cards to match physical environment perspective.
Always include a glass-backed text panel in the lower third for the headline.

## APP WALKTHROUGH DETECTION
When user uploads 3+ screenshots sharing the SAME sidebar/navigation (same app):
1. Mark scenes as isWalkthroughScene: true on each related scene
2. First scene MUST use premium-reconstructed-ui with full AppShell (<ReconstructedAppShell>)
3. Subsequent walkthrough scenes: HARD RULE — REUSE the exact same AppShell layout. ONLY replace the main content area. Never re-mount or re-render the sidebar/topbar from scratch. Add to each prompt: "Maintain IDENTICAL sidebar and topbar from previous scene. Only update inner content panel."
4. Prefer "cameraPan" for walkthrough continuations, but allow "zoomThrough" for the single transformation pivot or "slide" for clear forward navigation beats.
5. Add to each walkthrough scene prompt: "Render feature name '[FEATURE]' as FeatureSectionHeader persistent label at top of content area"
6. FLOW EDGES: For each pair of adjacent walkthrough scenes, output a FlowEdge with transition:"cameraPan" and carryOver:{ui:true,camera:true} — this signals the generator to carry the AppShell and camera state across the cut without resetting.

## PER-SCENE MUSIC VOLUME
Include musicVolume on each scene (number, 0.5–1.5):
- problem/pain/frustration scenes: 0.5 (quiet — let the pain breathe)
- normal showcase/feature: 1.0
- aha/relief/confidence scenes: 1.3
- CTA scene: 1.5 (full energy for the ask)

## UI SCHEMA EXTRACTION
For each uploaded screenshot that will be used in a scene, extract its UI layout structure as a uiSchemas entry (one entry per image index).
Identify: layout type (sidebar-main, topnav-main, full-width, split), sidebar items with emoji icons and active state, main content sections (metric-cards, table, chart, form, card-grid, list, detail-panel, hero-header), and theme colors (bgColor, cardBgColor, textColor, accentColor, borderRadius, isDark).
Simplify data: max 6 table rows, 8 chart datapoints, 7 sidebar items. Use emoji for icons. Only extract for images that are visually complex enough to warrant UI reconstruction.

## VIDEO TYPE ADAPTATION (read from "Video type:" in the prompt)

The user may specify a video type. Use it to select the right scene arc:

| Video type | Scene arc | Key rules |
|---|---|---|
| Explainer (Problem → Solution) | Chaos → Pain → Aha Moment → 2x Feature Demo → Proof → CTA | Standard PAS arc; hook MUST show broken reality |
| Product Demo (Feature Walkthrough) | Hook → Product Overview → 2–3 Feature Demos (with cursor) → Benefits Summary → CTA | Product shown from scene 2; each demo scene gets a cursor walkthrough |
| App Walkthrough (Screen-by-Screen) | Hook → Navigation Demo → Feature 1 → Feature 2 → Feature 3 → CTA | Use persistent AppShell; isWalkthroughScene: true on each demo scene |
| Brand Story (Emotional Narrative) | Emotional hook → Pain lived experience → Brand reveal → Mission → Proof → CTA | Scene 1 IS the broken reality human story; minimal product UI |
| Abstract Concept (Motion Graphics) | Bold statement → Concept explanation → How it works → Visual proof → CTA | No screenshots needed; use data-flow-abstract, kinetic-text, icon-concept-scene |

If no video type is specified, default to "Explainer (Problem → Solution)".

## TAGLINE & LOGO MANDATES

If the prompt contains 'Brand tagline: "..."':
- The exact tagline MUST appear as text in the CTA scene
- Reference the tagline in the CTA scene's voiceoverText
- In CTA scene prompt: include "Render brand tagline as large animated text below the logo"

If the prompt contains "Company logo URL: [url]":
- In the CTA scene prompt write: "Render company logo via: <img src={COMPANY_LOGO} style={{maxHeight:80,objectFit:'contain'}} />"
- For Product Demo or App Walkthrough video types, the logo may also appear in the hook scene

## BRAND THEME ENFORCEMENT

The prompt may contain "Brand theme: dark" or "Brand theme: light". This OVERRIDES screenshot inference:
- **dark theme**: bg ≈ "#0f0f1a", prefer premium-icon-arc-reveal for intro, premium-floating-path-nodes for problem, premium-cta-scene for CTA; do NOT use light-arc-bg or dot-matrix-bg
- **light theme**: bg ≈ "#f8f9fc", prefer premium-dot-matrix-bg or premium-light-arc-bg as background layer on ALL scenes, premium-multi-corner-gradient for CTA; do NOT use dark neon/glow effects

## HARD REQUIREMENTS CHECKLIST (verify before outputting JSON)

Before finalizing your scene plan, confirm ALL of the following. If any fail, fix before outputting:

1. CHAOS SCENE: Scene 1 contains ZERO product branding, shows a specific human in a specific situation, includes one concrete data point (time/money/percentage), and uses emotionalIntent "FRUSTRATION" or "RECOGNITION".

2. ACT TIMING: Every scene prompt contains explicit frame numbers — "Act 1 (0-Xf): ... Act 2 (Xf-Yf): ... Act 3 (Yf-Zf): hold final state, no new elements."

3. LAYOUT TOPOLOGY: No two consecutive scenes share the same layoutTopology. Write the layoutTopology at the start of each scene prompt.

4. VISUAL THREAD: Every scene prompt contains a "VISUAL THREAD:" line describing how the global motif appears in that scene and how it has evolved from the previous scene.

5. TRANSITIONS: Middle scenes must feel intentionally varied. Do not use the same transition more than twice in a row, and never fall back to generic fade when a story-motivated transition exists.

6. VOICEOVER: Every voiceoverText describes what the VIEWER GAINS (not what the product does). Count words — must be no more than (durationInFrames / 30) x 2.8 words.

7. HIGHLIGHT WORDS: Every scene has highlightWords with 1-2 accent words from its headline.

8. STAGE DIRECTION: Every scene prompt ends with a "Stage Direction:" sentence describing camera move and emotional arc shift.

These 8 rules are non-negotiable. The plan is incomplete without all 8.`;

// ---------------------------------------------------------------------------
// REFINEMENT_PLANNING_PROMPT — used when user requests changes to existing plan
// ---------------------------------------------------------------------------

const REFINEMENT_PLANNING_PROMPT = `You are a Creative Director at a premium SaaS video agency refining an existing video plan.

The user has reviewed the plan and has specific feedback. Your job is to SURGICALLY revise it.

## REFINEMENT RULES

1. **Keep what works** — Preserve scenes the user did not mention.
2. **Apply the feedback precisely** — If the user says "change scene 2", change only scene 2. If they say "add a social proof scene before the CTA", insert one. If they say "make the hook more emotional", rewrite only scene 1.
3. **Maintain narrative coherence** — After any change, ensure the emotional arc (FRUSTRATION → RELIEF → URGENCY) still flows correctly.
4. **Keep scene IDs sequential** — Renumber scenes 1, 2, 3... after any insertion/deletion.
5. **Preserve brand tokens** — Return the same brand tokens unless the feedback asks for a change.
6. **Return the COMPLETE plan** — All scenes, not just the changed ones.
7. **Respect voiceover word counts** — words ≤ (durationInFrames / 30) × 2.8 max.

## QUALITY STANDARDS (apply to any revised/new scenes only)

- Emotional visual grammar: include damping/stiffness in scene prompt matching emotionalIntent
- Voiceover: outcome-driven ("what viewer gains") not feature-driven ("what product does")
- Scene prompts: include Act 1/2/3 frame timing
- Transitions: vary by narrative beat; reserve fade for opening/ending or intentional calm resets
- Skill stacking: skills[0]=primary, skills[1]=background (optional), skills[2]=polish (optional)
- Skill composition: define structured skillComposition with primary, secondary, and modifiers

## AVAILABLE SKILLS (use EXACTLY these names)
Brand/intro: premium-saas-hook, premium-icon-arc-reveal, premium-kinetic-text, premium-char-split, premium-ink-logo-reveal, premium-dot-matrix-bg, premium-multi-corner-gradient, premium-ambient-environment, premium-light-arc-bg
Problem: premium-team-orbit, premium-floating-path-nodes, premium-neon-dark, premium-match-cut, premium-split-screen, premium-glassmorphism, premium-data-reveal, premium-before-after, premium-feedback-storm
Showcase: premium-saas-showcase, premium-cursor-engine, premium-chameleon-ui, premium-reconstructed-ui, premium-camera-zoom, premium-device-mockup, premium-scroll-demo, premium-multi-device, premium-app-walkthrough, premium-callout-bubble, premium-responsive-viewport, premium-macro-closeup, premium-3d-device-mockup
Features/data: premium-feature-list, premium-feature-grid, premium-feature-bundle-cards, premium-data-reveal, premium-stat-counter, premium-metric-flyout, premium-network-intro, premium-customer-journey, premium-icon-concept-scene, premium-integration-wall, premium-logo-wall, premium-icon-bubble-row, premium-data-flow-abstract, premium-3d-isometric-explode
Trust/proof: premium-social-proof, premium-testimonial-card, premium-phone-notification, premium-notification-scatter, premium-confetti-celebration
Section/text: premium-section-title, premium-gradient-hero, premium-narration-reveal
CTA: premium-cta-scene`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScenePlanRaw {
  id: number;
  title: string;
  prompt: string;
  skills: string[];
  skill?: string; // deprecated — kept for backward compat with old LLM responses
  /** Director intent category — required in new planner contract */
  intent?: "hook" | "problem" | "solution" | "feature" | "proof" | "cta";
  narrativeRole?: NarrativeRole;
  visualGrammarRole?: NarrativeRole;
  motionLanguage?: MotionLanguage;
  interactionStoryMode?: InteractionStoryMode;
  styleContract?: StyleContract;
  /** Hard cap on number of skills allowed */
  skillBudget?: number;
  /** Motion intensity cap (feature scenes default low) */
  motionBudget?: "low" | "medium" | "high";
  /** Continuity signal for persistent-shell sequences */
  continuityRole?: "new-world" | "continue-world";
  durationInFrames: number;
  imageIndex?: number;
  voiceoverText?: string;
  transition?: string;
  emotionalIntent?: string;
  isAhaMoment?: boolean;
  stageDirection?: string;
  musicVolume?: number;
  isWalkthroughScene?: boolean;
  sectionLabel?: string;
  exitAnchor?: { x: number; y: number };
  macroZoom?: { zoomLevel: number; focusPoint: { x: number; y: number }; zoomInFrame?: number; holdFrames?: number };
  stockFootage?: string;
  imageIndices?: number[];
  featureHeader?: { label: string; badge?: string; icon?: string };
  cursorJourney?: string[];
  interactionScript?: import("@/types/generation").InteractionEvent[];
  visualAnchor?: {
    icon: string;
    colorFrom: string;
    colorTo: string;
    label: string;
  };
  morphExport?: { id: string; rect: { x: number; y: number; w: number; h: number } };
  morphImport?: { id: string; rect: { x: number; y: number; w: number; h: number } };
}

interface FullVideoPlanRaw {
  scenes: ScenePlanRaw[];
  bgSkill?: string;
  globalBg?: string;
  globalVisualThread?: string;
  styleContract?: StyleContract;
  edges?: import("@/types/generation").FlowEdge[];
}

interface BrandTokensRaw {
  primary: string;
  secondary: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  font: string;
  accentName: string;
  style: string;
  name?: string;
  url?: string;
  cta?: string;
  musicStyle?: string;
  logo?: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// ---------------------------------------------------------------------------
// Section-title injector
// ---------------------------------------------------------------------------

type EnrichedScene = ScenePlanRaw & {
  durationInFrames: number;
  imageIndex?: number;
  interactionScript?: import("@/types/generation").InteractionEvent[];
  journeyContext?: import("@/types/generation").JourneyContext;
  uiSchema?: Record<string, unknown>;
};

/** Inserts a premium-section-title scene before every group of showcase scenes.
 *  Groups are defined by consecutive showcase-skill scenes sharing the same imageIndex.
 *  Only inserts a divider when the imageIndex changes (new feature area).
 */
function injectSectionTitles(scenes: EnrichedScene[]): EnrichedScene[] {
  const SHOWCASE_SKILLS = new Set([
    "premium-saas-showcase", "premium-cursor-engine", "premium-chameleon-ui",
    "premium-app-walkthrough", "premium-reconstructed-ui",
  ]);

  const result: EnrichedScene[] = [];
  let lastShowcaseImageIndex: number | undefined = undefined;

  for (const scene of scenes) {
    const isShowcase = scene.skills?.some(sk => SHOWCASE_SKILLS.has(sk)) ?? false;

    if (isShowcase) {
      const imgIdx = scene.imageIndex;
      // Insert a section-title divider when moving to a new image/feature area
      if (imgIdx !== undefined && imgIdx !== lastShowcaseImageIndex) {
        // Derive a short title from the scene title (strip leading "Showcase:" etc.)
        const rawTitle = scene.title.replace(/^(showcase|feature|step|scene)\s*[:\-–]?\s*/i, "").trim();
        const sectionTitle = rawTitle.length > 3 ? rawTitle : `Feature ${(imgIdx + 1)}`;

        result.push({
          id: -1,
          title: `${sectionTitle} — Overview`,
          skills: ["premium-section-title"],
          durationInFrames: 90,
          prompt: `SectionTitle chapter card. Title: "${sectionTitle}". Subtitle: "See how it works". Use LightArcBg variant="grid" as background. Center the SectionTitle component. Keep it clean and minimal.`,
          imageIndex: undefined,
          interactionScript: undefined,
          uiSchema: undefined,
        } as EnrichedScene);
        lastShowcaseImageIndex = imgIdx;
      }
    }

    result.push(scene);
  }

  return result;
}

function clampSkillBudget(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? Math.round(v) : fallback;
  return Math.max(1, Math.min(3, n));
}

function enforceSkillBudget(skills: string[], budget: number): string[] {
  if (!Array.isArray(skills)) return [];
  const uniq: string[] = [];
  for (const s of skills) if (typeof s === "string" && !uniq.includes(s)) uniq.push(s);
  return uniq.slice(0, Math.max(1, budget));
}

function inferIntentFromTitleAndSkills(s: any): ScenePlanRaw["intent"] {
  const title = String(s?.title ?? "").toLowerCase();
  const skills = (s?.skills ?? []).join(" ").toLowerCase();
  if (title.includes("cta") || skills.includes("cta")) return "cta";
  if (title.includes("hook") || skills.includes("saas-hook")) return "hook";
  if (title.includes("problem") || title.includes("pain") || title.includes("chaos")) return "problem";
  if (title.includes("solution") || title.includes("aha") || s?.isAhaMoment) return "solution";
  if (title.includes("proof") || title.includes("trust") || skills.includes("social-proof") || skills.includes("testimonial") || skills.includes("logo-wall")) return "proof";
  return "feature";
}

function defaultMotionBudget(intent: ScenePlanRaw["intent"]): ScenePlanRaw["motionBudget"] {
  if (intent === "feature") return "low";
  if (intent === "hook" || intent === "problem") return "high";
  if (intent === "cta") return "high";
  return "medium";
}

function intentAllowedPrimarySkills(intent: ScenePlanRaw["intent"]): string[] {
  // Director-led, intent-first primary skill shortlist (most→least preferred).
  switch (intent) {
    case "hook":
      return ["premium-live-action-composite", "premium-saas-hook", "premium-kinetic-text", "premium-icon-arc-reveal"];
    case "problem":
      return ["premium-live-action-composite", "premium-floating-path-nodes", "premium-team-orbit", "premium-glassmorphism", "premium-feedback-storm", "premium-neon-dark", "premium-before-after"];
    case "solution":
      return ["premium-reconstructed-ui", "premium-saas-showcase", "premium-camera-zoom", "premium-device-mockup"];
    case "feature":
      return ["premium-cursor-engine", "premium-chameleon-ui", "premium-app-walkthrough", "premium-multi-view-walkthrough", "premium-reconstructed-ui", "premium-scroll-demo"];
    case "proof":
      return ["premium-social-proof", "premium-testimonial-card", "premium-logo-wall", "premium-stat-counter", "premium-metric-flyout", "premium-data-reveal"];
    case "cta":
      return ["premium-cta-scene", "premium-gradient-hero", "premium-narration-reveal"];
    default:
      return ["premium-saas-showcase"];
  }
}

function enforceIntentPrimarySkill(intent: ScenePlanRaw["intent"], skills: string[]): string[] {
  if (!skills?.length) return skills;
  const allowed = new Set(intentAllowedPrimarySkills(intent));
  const primary = skills[0];
  if (primary && allowed.has(primary)) return skills;
  // Replace primary with the top allowed candidate, preserving the rest of the stack.
  const replacement = intentAllowedPrimarySkills(intent)[0];
  const rest = skills.slice(1).filter((s) => s !== replacement);
  return [replacement, ...rest];
}

function enforceMotionBudget(intent: ScenePlanRaw["intent"], motionBudget: ScenePlanRaw["motionBudget"], skillBudget: number, skills: string[]) {
  // Motion budget overrides: keep scenes from becoming "busy".
  let effectiveBudget = skillBudget;
  if (motionBudget === "low") {
    // Default low motion to 1 skill; allow 2 only when cursor/chameleon needs a background.
    const primary = skills?.[0] ?? "";
    const allowTwo = primary === "premium-cursor-engine" || primary === "premium-chameleon-ui" || primary === "premium-app-walkthrough" || primary === "premium-multi-view-walkthrough";
    effectiveBudget = allowTwo ? Math.min(2, effectiveBudget) : 1;
  } else if (motionBudget === "high") {
    effectiveBudget = Math.min(3, effectiveBudget);
  }
  // Feature scenes should never exceed 2 skills.
  if (intent === "feature") effectiveBudget = Math.min(2, effectiveBudget);
  const budgeted = enforceSkillBudget(skills, effectiveBudget);
  return { effectiveBudget, budgetedSkills: budgeted };
}

// ---------------------------------------------------------------------------
// Gap 2: MorphPortal coordination pass
// Ensures morphExport/morphImport pairs are always properly linked after
// the scarcity pass strips duplicates but leaves pairs uncoordinated.
// ---------------------------------------------------------------------------

function coordinateMorphPortals(scenes: import("@/types/generation").ScenePlan[]): import("@/types/generation").ScenePlan[] {
  const result = scenes.map((s) => ({ ...s })); // shallow clone each scene

  for (let i = 0; i < result.length; i++) {
    const sc = result[i];

    // Forward pass: if scene N has morphExport, ensure scene N+1 has a matching morphImport
    if (sc.morphExport && i < result.length - 1) {
      const next = result[i + 1];
      if (!next.morphImport || next.morphImport.id !== sc.morphExport.id) {
        result[i + 1] = {
          ...next,
          morphImport: {
            id: sc.morphExport.id,
            // Preserve existing rect if present; otherwise default to center arrival
            rect: next.morphImport?.rect ?? { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
          },
        };
        console.log(`[morph-portal] Linked morphExport "${sc.morphExport.id}" → scene ${i + 1} morphImport`);
      }
    }

    // Orphan check: if scene N has morphImport but prev scene has no matching morphExport — strip it
    // NOTE: this check runs after the forward pass so we never accidentally strip a just-linked import
    if (sc.morphImport && i > 0) {
      const prev = result[i - 1];
      if (!prev.morphExport || prev.morphExport.id !== sc.morphImport.id) {
        const { morphImport: _removed, ...rest } = result[i];
        result[i] = rest as import("@/types/generation").ScenePlan;
        console.warn(`[morph-portal] Orphaned morphImport "${sc.morphImport.id}" on scene ${i} — removed`);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Gap 1: Post-plan narrative contract validator
// Verifies the LLM honored the creative brief's emotional arc after planning.
// Auto-fixes violations rather than re-planning (cheaper, deterministic).
// ---------------------------------------------------------------------------

function enforceNarrativeContract(
  scenes: import("@/types/generation").ScenePlan[],
  brief: import("@/types/generation").CreativeBrief | null,
): import("@/types/generation").ScenePlan[] {
  const result = [...scenes];

  // Rule 1: Scene 0 must create tension or recognition — no positive emotions on the hook.
  const HOOK_EMOTIONS = new Set(["FRUSTRATION", "PAIN", "RECOGNITION", "ANXIETY"]);
  if (
    result.length > 0 &&
    !HOOK_EMOTIONS.has((result[0].emotionalIntent ?? "").toUpperCase())
  ) {
    result[0] = { ...result[0], emotionalIntent: "FRUSTRATION" };
    console.warn("[contract] Scene 0 missing hook emotion — set to FRUSTRATION");
  }

  // Rule 2: Exactly one AHA moment must exist. Auto-mark the first solution/feature scene.
  const hasAha = result.some((s) => s.isAhaMoment);
  if (!hasAha) {
    const ahaIdx = result.findIndex(
      (s) => s.intent === "solution" || s.intent === "feature",
    );
    if (ahaIdx !== -1) {
      result[ahaIdx] = { ...result[ahaIdx], isAhaMoment: true };
      console.warn("[contract] No AHA moment marked — auto-marked scene", ahaIdx);
    }
  }

  // Rule 3: Last scene must carry urgency energy.
  const last = result[result.length - 1];
  if (
    last &&
    last.intent !== "cta" &&
    !["URGENCY", "EXCITEMENT"].includes((last.emotionalIntent ?? "").toUpperCase())
  ) {
    result[result.length - 1] = { ...last, emotionalIntent: "URGENCY" };
    console.warn("[contract] Last scene missing CTA energy — set emotionalIntent to URGENCY");
  }

  // Rule 5: Scene count sanity check against brief's estimate.
  // Warning only — scene trim is the human's call in the plan editor.
  if (brief?.estimatedSceneCount && result.length > brief.estimatedSceneCount + 1) {
    console.warn(
      `[contract] Scene count ${result.length} exceeds brief estimate ${brief.estimatedSceneCount}. ` +
      `WhatAStory principle: one transformation = fewer, denser scenes.`,
    );
  }

  // Rule 4 (FIXED): Backfill missing emotionalIntent from creative brief arc.
  // Operates on the already-mutated result array — preserves Rule 1/3 overrides.
  // Only backfills scenes where emotionalIntent is still missing after Rules 1–3.
  const BEAT_TO_EMOTION: Record<string, string> = {
    hook:     "RECOGNITION",
    problem:  "PAIN",
    solution: "RELIEF",
    feature:  "CONFIDENCE",
    proof:    "TRUST",
    cta:      "URGENCY",
  };

  return result.map((s, i) => {
    if (s.emotionalIntent) return s; // already set — includes Rule 1/3 overrides and LLM values
    if (!brief) return s;
    const beat = brief.emotionalArc?.find((b) => b.beatIndex === i);
    if (!beat) return s;
    return { ...s, emotionalIntent: BEAT_TO_EMOTION[beat.intent] ?? "CONFIDENCE" };
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { prompt, images, imageUserDescriptions, screenFlow, cachedBrand, targetDurationSeconds, existingPlan, refinementFeedback } = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!prompt?.trim()) {
    return new Response(
      JSON.stringify({ error: "Prompt is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const FAST_MODEL = GEMINI_FAST_MODEL;

  // Parse attached images once
  const parsedImages = Array.isArray(images)
    ? images
      .map((img: string) => parseDataUrl(img))
      .filter((p): p is { mimeType: string; data: string } => p !== null)
    : [];

  // -------------------------------------------------------------------------
  // Step 1 (optional, parallel): Vision brand extraction + image descriptions
  // -------------------------------------------------------------------------
  let visionBrand: Partial<BrandTokensRaw> = {};
  let imageDescriptions: string[] = [];
  // uiSchema per image index (up to first 3 images)
  const uiSchemasByIndex: Record<number, Record<string, unknown>> = {};

  if (parsedImages.length > 0) {
    // Task 0.1+0.4: Single combined call for brand extraction + image descriptions
    // If cachedBrand is provided by the client, skip brand extraction entirely.
    const hasCachedBrand = cachedBrand && typeof cachedBrand === "object" && cachedBrand.primary;
    const combinedBrandDescPromise = hasCachedBrand
      // Only fetch descriptions when brand is cached
      ? (parsedImages.length > 1
          ? withRetry(() => ai.models.generateContent({
              model: FAST_MODEL,
              contents: [{
                role: "user",
                parts: [
                  { text: `Describe each of these ${parsedImages.length} product screenshots in one short sentence (what screen/feature it shows). Return JSON with a "descriptions" array.` },
                  ...parsedImages.map((p) => ({ inlineData: p })),
                ],
              }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: { descriptions: { type: Type.ARRAY, items: { type: Type.STRING } } },
                  required: ["descriptions"],
                },
              },
            }))
          : Promise.resolve(null))
      // No cached brand — do combined brand + descriptions in ONE call
      : withRetry(() => ai.models.generateContent({
          model: FAST_MODEL,
          contents: [{
            role: "user",
            parts: [
              ...parsedImages.map((p) => ({ inlineData: p })),
              { text: `Product: ${prompt}\n\nExtract brand tokens from image 1 and describe all ${parsedImages.length} images.` },
            ],
          }],
          config: {
            systemInstruction: `You are a visual brand analyst. Given product screenshots:
1. Extract the brand's color palette from the FIRST image: primary, secondary, bg, surface, text, textMuted, border colors as hex. Determine style: "dark"|"light"|"neon".
2. Write a 1-sentence description of EACH image (what the UI shows, what feature it demonstrates).
Return JSON only.`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                brand: {
                  type: Type.OBJECT,
                  properties: {
                    primary: { type: Type.STRING }, secondary: { type: Type.STRING },
                    bg: { type: Type.STRING }, surface: { type: Type.STRING },
                    text: { type: Type.STRING }, textMuted: { type: Type.STRING },
                    border: { type: Type.STRING },
                    style: { type: Type.STRING },
                  },
                  required: ["primary", "secondary", "bg", "surface", "text", "textMuted", "border", "style"],
                },
                descriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["brand", "descriptions"],
            },
          },
        }));

    // Task 0.2: UI schema extraction is now merged into the narrative planning call.
    // We no longer run separate uiDecompose calls here — the planner returns uiSchemas inline.
    const [combinedResult] = await Promise.allSettled([combinedBrandDescPromise]);

    // Task 0.4: Use cached brand if provided, otherwise extract from combined result
    if (hasCachedBrand) {
      // Apply cached brand directly
      const cb = cachedBrand as Record<string, string>;
      const isColor = (v: unknown) =>
        typeof v === "string" && (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl"));
      if (isColor(cb.primary)) visionBrand.primary = cb.primary;
      if (isColor(cb.secondary)) visionBrand.secondary = cb.secondary;
      if (isColor(cb.bg)) visionBrand.bg = cb.bg;
      if (isColor(cb.surface)) visionBrand.surface = cb.surface;
      if (isColor(cb.text)) visionBrand.text = cb.text;
      if (isColor(cb.textMuted)) visionBrand.textMuted = cb.textMuted;
      if (isColor(cb.border)) visionBrand.border = cb.border;
      if (["dark", "light", "neon"].includes(cb.style)) visionBrand.style = cb.style as "dark" | "light" | "neon";
      console.log("Vision brand: using cached brand tokens");
      // Still parse descriptions from combinedResult (which is desc-only in cached mode)
      if (combinedResult.status === "fulfilled" && combinedResult.value) {
        try {
          const parsed = JSON.parse(combinedResult.value.text ?? "{}");
          imageDescriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];
          console.log("Image descriptions (cached-brand mode):", imageDescriptions);
        } catch (e) {
          console.warn("Image description parse failed (non-fatal):", e);
        }
      }
    } else if (combinedResult.status === "fulfilled" && combinedResult.value) {
      // Combined call: parse both brand and descriptions
      try {
        const parsed = JSON.parse(combinedResult.value.text ?? "{}");
        const extracted = parsed.brand ?? parsed; // fallback if LLM returned flat brand object
        const isColor = (v: unknown) =>
          typeof v === "string" && (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl"));
        if (isColor(extracted.primary)) visionBrand.primary = extracted.primary;
        if (isColor(extracted.secondary)) visionBrand.secondary = extracted.secondary;
        if (isColor(extracted.bg)) visionBrand.bg = extracted.bg;
        if (isColor(extracted.surface)) visionBrand.surface = extracted.surface;
        if (isColor(extracted.text)) visionBrand.text = extracted.text;
        if (isColor(extracted.textMuted)) visionBrand.textMuted = extracted.textMuted;
        if (isColor(extracted.border)) visionBrand.border = extracted.border;
        if (["dark", "light", "neon"].includes(extracted.style)) visionBrand.style = extracted.style;

        // Auto-detect light theme from bg luminance — overrides LLM style classification
        if (visionBrand.bg) {
          const hex = visionBrand.bg.replace("#", "");
          if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (luminance > 0.5) {
              visionBrand.style = "light";
              console.log(`Auto-detected light theme from bg luminance: ${luminance.toFixed(2)}`);
            }
          }
        }

        imageDescriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];
        console.log("Vision brand + descriptions (combined call):", visionBrand);
      } catch (e) {
        console.warn("Combined brand+desc parse failed (non-fatal):", e);
      }
    } else if (combinedResult.status === "rejected") {
      console.warn("Combined brand+desc extraction failed (non-fatal):", combinedResult.reason);
    }

    // uiSchemasByIndex will be populated from the planner response (Task 0.2).

    // -----------------------------------------------------------------------
    // Phase 1 — Tiered Summarization
    //
    // For 3+ images (screenshots): single narrative pass
    // For 10+ images (video frames): full 3-tier pipeline
    //   Tier 1: Per-segment event extraction (groups of ~10 frames)
    //   Tier 2: Segment summaries
    //   Tier 3: Final cohesive narrative
    // -----------------------------------------------------------------------
    if (parsedImages.length > 2) {
      const isVideoFrames = parsedImages.length >= 10;

      try {
        if (isVideoFrames) {
          // Tier 1: Chunked event extraction — sample every ~10 frames
          const CHUNK_SIZE = 10;
          const chunks: Array<typeof parsedImages> = [];
          for (let i = 0; i < parsedImages.length; i += CHUNK_SIZE) {
            chunks.push(parsedImages.slice(i, i + CHUNK_SIZE));
          }

          const chunkSummaries: string[] = [];
          for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            try {
              const chunkResult = await withRetry(() => ai.models.generateContent({
                model: FAST_MODEL,
                contents: [{
                  role: "user",
                  parts: [
                    { text: `Analyze frames ${chunkIdx * CHUNK_SIZE}–${chunkIdx * CHUNK_SIZE + chunk.length - 1} of a product walkthrough video. Extract: what feature/screen is shown, what user actions occur, and what the key UI state changes are. Return a 2-sentence event summary.` },
                    ...chunk.map((p: { mimeType: string; data: string }) => ({ inlineData: p })),
                  ],
                }],
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: { summary: { type: Type.STRING } },
                    required: ["summary"],
                  },
                },
              }));
              const d = JSON.parse(chunkResult.text ?? "{}");
              if (d.summary) chunkSummaries.push(`[Frames ${chunkIdx * CHUNK_SIZE}+] ${d.summary}`);
            } catch { /* non-fatal */ }
          }

          // Tier 2+3: Synthesize chunk summaries into cohesive narrative
          if (chunkSummaries.length > 0) {
            try {
              const narrativeResult = await withRetry(() => ai.models.generateContent({
                model: FAST_MODEL,
                contents: [{
                  role: "user",
                  parts: [{ text: `Given these sequential segment summaries from a product walkthrough video, synthesize a cohesive 3-sentence narrative describing the complete user journey. Focus on the product's core value demonstrated.\n\nSegments:\n${chunkSummaries.join("\n")}` }],
                }],
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      narrative: { type: Type.STRING },
                      keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["narrative"],
                  },
                },
              }));
              const nd = JSON.parse(narrativeResult.text ?? "{}");
              if (nd.narrative) {
                console.log("Video tiered narrative:", nd.narrative);
                // Inject narrative into the first image description for the planner
                if (!imageDescriptions[0] || imageDescriptions[0].length < nd.narrative.length) {
                  imageDescriptions[0] = `[VIDEO WALKTHROUGH] ${nd.narrative}`;
                }
              }
            } catch { /* non-fatal */ }
          }
        } else {
          // Screenshot sequence: single narrative pass
          const FLOW_ANALYSIS_PROMPT = `You are analyzing a sequence of product screenshots to extract a user journey narrative.

For each screenshot in order, identify:
1. What screen/state it represents (1 sentence)
2. The KEY interactive element the user would click next
3. The transition action: what does the user DO to reach the next screen?

Then synthesize a 2-3 sentence cohesive narrative of what the user is accomplishing.

Return JSON with: screenSummaries (array of {screen, keyElement, action}), narrative (string)`;

          const flowResult = await withRetry(() => ai.models.generateContent({
            model: FAST_MODEL,
            contents: [{
              role: "user",
              parts: [
                { text: `Analyze this ${parsedImages.length}-screen product journey and extract the user flow narrative.` },
                ...parsedImages.map((p) => ({ inlineData: p })),
              ],
            }],
            config: {
              systemInstruction: FLOW_ANALYSIS_PROMPT,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  screenSummaries: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        screen: { type: Type.STRING },
                        keyElement: { type: Type.STRING },
                        action: { type: Type.STRING },
                      },
                      required: ["screen", "keyElement", "action"],
                    },
                  },
                  narrative: { type: Type.STRING },
                },
                required: ["screenSummaries", "narrative"],
              },
            },
          }));

          const flowData = JSON.parse(flowResult.text ?? "{}");
          if (Array.isArray(flowData.screenSummaries)) {
            flowData.screenSummaries.forEach((s: { screen: string; keyElement: string; action: string }, i: number) => {
              if (s.screen && (!imageDescriptions[i] || s.screen.length > imageDescriptions[i].length)) {
                imageDescriptions[i] = `${s.screen}. Key action: ${s.action}`;
              }
            });
            console.log("Screenshot flow narrative:", flowData.narrative);
          }
        }
      } catch (e) {
        console.warn("Tiered summarization failed (non-fatal):", e);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: Narrative planning (scenes + text-inferred brand)
  // -------------------------------------------------------------------------
  const hasImages = parsedImages.length > 0;

  // Merge user-provided descriptions with AI descriptions (user takes priority)
  const userDescs: string[] = Array.isArray(imageUserDescriptions) ? imageUserDescriptions : [];
  const finalDescriptions = parsedImages.map((_, i) =>
    userDescs[i]?.trim() || imageDescriptions[i] || `screenshot ${i + 1}`
  );

  // Extract visual energy fields from flow-analyze result (if present)
  const flowEnergy = (["high", "medium", "calm"].includes(screenFlow?.energyLevel) ? screenFlow.energyLevel : undefined) as "high" | "medium" | "calm" | undefined;
  const flowUiPace = (["fast", "slow"].includes(screenFlow?.uiPace) ? screenFlow.uiPace : undefined) as "fast" | "slow" | undefined;

  const inferJourneyKindFromTransition = (
    transition?: { type?: string; elementType?: string; targetLabel?: string } | null,
    fallbackIntent?: string,
  ): import("@/types/generation").JourneyStepKind => {
    if (fallbackIntent === "proof") return "proof";
    if (fallbackIntent === "cta") return "cta";
    if (!transition) {
      if (fallbackIntent === "solution") return "result";
      if (fallbackIntent === "feature") return "review";
      return "discover";
    }
    if (transition.type === "search") return "filter";
    if (transition.type === "submit") return "confirm";
    if (transition.type === "scroll") return "explore";
    if (transition.type === "navigate") return "navigate";
    if (transition.elementType === "input" || transition.elementType === "dropdown") return "input";
    return "review";
  };

  const describeJourneyTask = (
    screenDescription: string,
    transition?: { action?: string; type?: string; targetLabel?: string } | null,
    fallbackIntent?: string,
  ) => {
    if (fallbackIntent === "proof") {
      return "Reinforce the product's credibility with a clear proof point.";
    }
    if (fallbackIntent === "cta") {
      return "Land the final call to action and make the next step feel obvious.";
    }
    if (!transition) {
      return `Orient the viewer inside "${screenDescription}" and make the screen's purpose instantly clear.`;
    }
    const action = transition.action?.trim() || transition.type || "continue";
    const target = transition.targetLabel?.trim();
    return target
      ? `Use "${screenDescription}" as the setup state, then guide the viewer toward ${action} on "${target}".`
      : `Use "${screenDescription}" as the setup state, then guide the viewer toward ${action}.`;
  };

  // Build screenFlow narrative block when the user has confirmed a flow
  let screenFlowBlock = "";
  if (screenFlow && Array.isArray(screenFlow.transitions) && screenFlow.transitions.length > 0) {
    const lines: string[] = ["USER JOURNEY NARRATIVE (Extracted from screens):"];
    
    if (screenFlow.narrativeSummary) {
      lines.push(`STORY ARC: ${screenFlow.narrativeSummary}`);
      lines.push("");
    }

    const screens: { index: number; description: string }[] = screenFlow.screens ?? [];
    const transitions: { from: number; to: number; action: string; type: string; elementType?: string }[] = screenFlow.transitions;

    // Build the narrative chain
    for (let i = 0; i < parsedImages.length; i++) {
      const screen = screens.find((s) => s.index === i);
      const desc = screen?.description || finalDescriptions[i] || `screenshot ${i + 1}`;
      lines.push(`Screen ${i}: "${desc}"`);
      const t = transitions.find((tr) => tr.from === i);
      if (t) lines.push(`→ [${t.action || t.type}] (${t.type}) →`);
    }

    lines.push("");
    lines.push("JOURNEY ROLES BY SCREEN:");
    for (let i = 0; i < parsedImages.length; i++) {
      const t = transitions.find((tr) => tr.from === i);
      const kind = inferJourneyKindFromTransition(t);
      const nextScreenDesc = t ? (screens.find((s) => s.index === t.to)?.description || finalDescriptions[t.to] || `screen ${t.to}`) : null;
      const task = describeJourneyTask(finalDescriptions[i] || `screen ${i}`, t);
      lines.push(`- Screen ${i}: journey kind = ${kind}`);
      lines.push(`  task: ${task}`);
      if (nextScreenDesc) lines.push(`  next screen: "${nextScreenDesc}"`);
    }

    lines.push("");
    lines.push("SCENE ASSIGNMENT RULES:");
    lines.push("- Every image-driven scene MUST output a journeyContext object describing the story role of that scene.");
    lines.push('- journeyContext.kind must be one of: discover | explore | input | filter | navigate | review | result | confirm | proof | cta');
    lines.push("- journeyContext.narrativeTask must describe what the user is trying to achieve, not just what element they click.");
    lines.push("- For cursor / chameleon / walkthrough scenes, prefer journeyContext kinds: input, filter, navigate, explore, confirm.");
    lines.push("- For reveal / dashboard / reconstructed UI scenes, prefer journeyContext kinds: review or result.");
    lines.push("- When a scene uses imageIndices for multi-view, it should represent one continuous journey segment across those views, not random screenshots.");
    for (let i = 0; i < parsedImages.length; i++) {
      const t = transitions.find((tr) => tr.from === i);
      const prefix = `- Scenes using Screen ${i} → set imageIndex: ${i}`;
      if (t?.type === "scroll") {
        lines.push(`${prefix}, prefer premium-scroll-demo for this screen`);
      } else if (t?.type === "search" || t?.type === "submit" || t?.elementType === "input") {
        lines.push(`${prefix}, the [${t.type}] transition has form/input interaction → prefer premium-chameleon-ui (typing overlay + form success state + toast)`);
      } else if (t) {
        lines.push(`${prefix}, the [${t.type}] transition → prefer premium-cursor-engine (click-zoom + double ripple + step badges) on this screen`);
      } else {
        lines.push(prefix);
      }
    }

    screenFlowBlock = "\n" + lines.join("\n") + "\n";
  }

  // Build image context block for the planner
  let imageContextBlock = "";
  if (hasImages) {
    const countStr = parsedImages.length === 1
      ? "1 product screenshot (index 0)"
      : `${parsedImages.length} product screenshots (indices 0–${parsedImages.length - 1})`;
    const descLines = finalDescriptions.map((d, i) => `  - Image ${i}: ${d}`).join("\n");
    const energyNote = flowEnergy === "high"
      ? `\nVISUAL ENERGY: HIGH (detected from recording). UI pace: ${flowUiPace ?? "fast"}. Add +40 to all spring stiffness values compared to table defaults. Prefer musicStyle: "energetic".`
      : flowEnergy === "calm"
        ? `\nVISUAL ENERGY: CALM (detected from recording). UI pace: ${flowUiPace ?? "slow"}. Use stiffness values as-is (do not boost). Prefer musicStyle: "calm".`
        : "";
    imageContextBlock = `\nATTACHED IMAGES: The user has uploaded ${countStr}.\n${descLines}\n${screenFlowBlock}${energyNote}\nFor showcase/cursor/device scenes, set imageIndex to the most relevant image index.\n`;
  }

  const targetNote = targetDurationSeconds
    ? `\nTARGET DURATION: ~${targetDurationSeconds} seconds total. Calibrate scene count and durationInFrames so scenes sum to approximately ${targetDurationSeconds * 30} frames.`
    : "";

  // ── Refinement mode: user asked to revise an existing plan ──────────────
  const isRefinement = refinementFeedback?.trim() && Array.isArray(existingPlan) && existingPlan.length > 0;

  const existingPlanSummary = isRefinement
    ? existingPlan.map((s: { id: number; title: string; skills?: string[]; durationInFrames: number; emotionalIntent?: string }, i: number) =>
        `Scene ${i + 1} (id:${s.id}): "${s.title}" — skill: ${s.skills?.[0] ?? "?"} — ${s.durationInFrames}f — emotion: ${s.emotionalIntent ?? "?"}`
      ).join("\n")
    : "";

  const textPart = isRefinement
    ? {
        text: `## REFINEMENT REQUEST

Original product prompt: "${prompt}"

## CURRENT PLAN (${existingPlan.length} scenes):
${existingPlanSummary}

## USER FEEDBACK:
"${refinementFeedback}"

Revise the plan according to the user's feedback. Keep scenes that are working well. Only change, add, or remove scenes that the feedback specifically calls out. Return the COMPLETE revised plan (all scenes, not just the changed ones). Keep the same brand tokens unless the feedback requires a change.`,
      }
    : {
        text: `Product/video prompt: "${prompt}"
${imageContextBlock}${targetNote}
Plan a complete 5–6 scene narrative video for this product, and extract brand tokens.`,
      };

  // Cap inline images to 4 for the narrative planner — the imageContextBlock text already
  // describes all screens; additional images beyond 4 add token cost with minimal planning value.
  const imageParts = parsedImages.slice(0, 4).map((p) => ({ inlineData: p }));

  // ── PHASE 0: Creative Brief ────────────────────────────────────────────────
  // Run a short Gemini call to produce emotional + visual strategy BEFORE the
  // main planning call. Non-fatal: falls back to static prompt if it fails.
  const creativeBrief = isRefinement ? null : await generateCreativeBrief(
    prompt,
    finalDescriptions,
    targetDurationSeconds ?? 60,
    ai,
  );

  // ── PHASE 1: Narrative Backbone ──────────────────────────────────────────
  // The Director's vision: high-level scene breakdown + reasoning.
  const narrativeBackbone = creativeBrief ? await generateNarrativeBackbone(
    creativeBrief,
    finalDescriptions,
    ai,
  ) : null;

  if (creativeBrief) {
    console.log("[creative-brief] logline:", creativeBrief.logline);
    console.log("[creative-brief] arc:", creativeBrief.emotionalArc.map(b => `${b.intent}(${b.pacingWord})`).join(" -> "));
  }
  if (narrativeBackbone) {
    console.log("[backbone] core transformation:", narrativeBackbone.coreTransformation);
    console.log("[backbone] beats:", narrativeBackbone.beats.map(b => `${b.intent}`).join(" -> "));
  }

  try {
    const result = await withRetry(() => ai.models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [textPart, ...imageParts] }],
      config: {
        systemInstruction: isRefinement
          ? REFINEMENT_PLANNING_PROMPT
          : creativeBrief
            ? buildDirectorPlannerSystemPrompt(creativeBrief, narrativeBackbone)
            : NARRATIVE_PLANNING_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
                bg: { type: Type.STRING },
                surface: { type: Type.STRING },
                text: { type: Type.STRING },
                textMuted: { type: Type.STRING },
                border: { type: Type.STRING },
                font: { type: Type.STRING },
                accentName: { type: Type.STRING },
                style: { type: Type.STRING },
                name: { type: Type.STRING },
                url: { type: Type.STRING },
                cta: { type: Type.STRING },
                musicStyle: { type: Type.STRING },
                logo: { type: Type.STRING },
              },
              required: ["primary", "secondary", "bg", "surface", "text", "textMuted", "border", "font", "accentName", "style"],
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ordered skill stack: [primarySkill, backgroundSkill?, polishSkill?]. See SKILL STACKING RULES." },
                  skillComposition: {
                    type: Type.OBJECT,
                    description: "Structured skill composition for advanced engine mapping.",
                    properties: {
                      primary: { type: Type.STRING, description: "Main layout skill" },
                      secondary: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Supporting animation skills" },
                      modifiers: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Emotional/technical modifiers (e.g. 'emotional-tension', 'high-depth', 'fast-pacing')" },
                    },
                    required: ["primary", "secondary", "modifiers"],
                  },
                  intent: { type: Type.STRING, description: "Director intent: hook | problem | solution | feature | proof | cta" },
                  skillBudget: { type: Type.NUMBER, description: "Hard cap on number of skills allowed for this scene (default 2)" },
                  motionBudget: { type: Type.STRING, description: "low | medium | high. Feature scenes must default low." },
                  continuityRole: { type: Type.STRING, description: "new-world | continue-world. continue-world only for persistent shell walkthrough sequences." },
                  durationInFrames: { type: Type.NUMBER },
                  imageIndex: { type: Type.NUMBER },
                  imageIndices: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Multiple 0-based image indices for multi-view walkthrough scenes. When set, all referenced images become ATTACHED_IMAGES[0], [1], [2], etc." },
                  journeyContext: {
                    type: Type.OBJECT,
                    description: "Narrative task mapping for this scene. Use this to describe what the user is accomplishing in the journey, not just which screenshot is shown.",
                    properties: {
                      kind: { type: Type.STRING, description: "discover | explore | input | filter | navigate | review | result | confirm | proof | cta" },
                      narrativeTask: { type: Type.STRING, description: "Short sentence describing the user goal or story job of this scene." },
                      sourceScreenIndex: { type: Type.NUMBER, description: "0-based source screen index this scene is anchored to." },
                      targetScreenIndex: { type: Type.NUMBER, description: "0-based next/result screen index this scene points toward." },
                      sourceScreenDescription: { type: Type.STRING, description: "Human-readable description of the current screen." },
                      targetScreenDescription: { type: Type.STRING, description: "Human-readable description of the next/result screen." },
                      nextAction: { type: Type.STRING, description: "The concrete action the user takes after this scene." },
                      transitionType: { type: Type.STRING, description: "search | click | scroll | navigate | submit | hover" },
                      targetLabel: { type: Type.STRING, description: "Name of the UI target if relevant." },
                      elementType: { type: Type.STRING, description: "input | button | dropdown | card | nav" },
                      featureName: { type: Type.STRING, description: "Feature or product area this scene belongs to." },
                    },
                    required: ["kind", "narrativeTask"],
                  },
                  cursorJourney: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Ordered 3-5 step narrative journey for cursor scenes. Describe what the user is accomplishing at each step, not raw element names.",
                  },
                  featureHeader: {
                    type: Type.OBJECT,
                    description: "Persistent feature context bar (Qanapi-style). Shows feature name + integration badge above UI during multi-feature walkthroughs.",
                    properties: {
                      label: { type: Type.STRING, description: "Feature name, e.g. 'KMS for CSE'" },
                      badge: { type: Type.STRING, description: "Integration badge, e.g. 'Google Workspace'" },
                      icon: { type: Type.STRING, description: "Optional emoji icon" },
                    },
                    required: ["label"],
                  },
                  voiceoverText: { type: Type.STRING },
                  transition: { type: Type.STRING },
                  emotionalIntent: { type: Type.STRING, description: "FRUSTRATION | RELIEF | CONFIDENCE | TRUST | URGENCY | EXCITEMENT" },
                  narrativeRole: { type: Type.STRING, description: "problem-tension | workflow-choreography | before-after-transformation | compare-split-screen | ecosystem-network | proof-confidence | product-payoff" },
                  visualGrammarRole: { type: Type.STRING, description: "Planner-selected visual scene grammar role. Must vary across adjacent scenes unless intentionally continuing the same world." },
                  motionLanguage: { type: Type.STRING, description: "constrained-focus | guided-choreography | transformational-portal | measured-proof | premium-payoff" },
                  interactionStoryMode: { type: Type.STRING, description: "guided-reveal | transformation-chain | proof-of-control | coordinated-automation | none" },
                  isAhaMoment: { type: Type.BOOLEAN, description: "true for the single scene delivering the core product transformation" },
                  stageDirection: { type: Type.STRING, description: "Cinematic stage direction for the animator: camera move, emotional arc shift, pacing" },
                  musicVolume: { type: Type.NUMBER, description: "Volume multiplier: 0.5 for pain/problem scenes, 1.0 normal, 1.3 for aha/relief, 1.5 for CTA" },
                  isWalkthroughScene: { type: Type.BOOLEAN, description: "true when this scene is part of a persistent-shell app walkthrough sequence" },
                  sectionLabel: { type: Type.STRING, description: "Short label shown as persistent section header above browser chrome" },
                  videoSearchQuery: { type: Type.STRING, description: "Pexels search query for a dynamic stock video background. Build from: industry + emotional tone + environment. Examples: 'focused developer laptop dark office', 'startup team collaboration modern office', 'fintech professional meeting glass office', 'abstract technology blue particles'. Set for intro/hook, problem, and social-proof scenes. Leave empty for showcase/UI-heavy/CTA scenes (those use abstract motion backgrounds)." },
                  videoGenerationPrompt: { type: Type.STRING, description: "Veo 2 cinematic prompt — set ONLY on scenes using premium-live-action-composite. Format: '[camera move], [subject + action], [lighting], [atmosphere], [mood]'. Max 20 words. Describe the physical world the product lives in — NOT the product UI. Examples: 'slow push-in on analyst at dual monitors, volumetric blue office light, shallow depth of field' | 'overhead pull-back from team whiteboard, warm natural light, confident startup energy' | 'macro hands typing laptop, bokeh background, amber premium feel'. MANDATORY when premium-live-action-composite is selected and PEXELS_API_KEY may be unavailable." },
                  stockFootage: { type: Type.STRING, description: "DO NOT SET THIS — the system auto-populates it via Pexels API using videoSearchQuery. Leave null/undefined." },
                  macroZoom: {
                    type: Type.OBJECT,
                    description: "Bordio-style extreme close-up. Assign to 1-2 showcase scenes with complex UIs. zoomLevel 2-5, focusPoint normalized 0-1 targeting the key UI element.",
                    properties: {
                      zoomLevel: { type: Type.NUMBER, description: "Scale factor 2.0-5.0. 3.0 for sidebar, 3.5 for table row, 4.5 for single element" },
                      focusPoint: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER, description: "Normalized 0-1 horizontal center of zoom target" },
                          y: { type: Type.NUMBER, description: "Normalized 0-1 vertical center of zoom target" },
                        },
                        required: ["x", "y"],
                      },
                      zoomInFrame: { type: Type.NUMBER, description: "Frame when zoom starts (default 30 — let UI settle first)" },
                      holdFrames: { type: Type.NUMBER, description: "Frames at max zoom (default 80 — viewer reads focused area)" },
                    },
                    required: ["zoomLevel", "focusPoint"],
                  },
                  visualAnchor: {
                    type: Type.OBJECT,
                    properties: {
                      icon: { type: Type.STRING, description: "Emoji representing the anchor element (e.g. '⚠️', '📊', '💬')" },
                      colorFrom: { type: Type.STRING, description: "Hex color in broken/problem state (e.g. '#ef4444' red)" },
                      colorTo: { type: Type.STRING, description: "Hex color in resolved/success state (e.g. '#22c55e' green or BRAND.primary)" },
                      label: { type: Type.STRING, description: "Semantic label for prompt system (e.g. 'missed_deadline', 'cluttered_reports')" },
                    },
                    required: ["icon", "colorFrom", "colorTo", "label"],
                  },
                  exitAnchor: {
                    type: Type.OBJECT,
                    description: "Normalized 0-1 coordinate the camera zooms INTO as this scene exits. Set on Scene N when using zoomThrough transition into Scene N+1. Target the last-clicked UI element or most visually dominant element.",
                    properties: {
                      x: { type: Type.NUMBER, description: "Normalized 0-1 horizontal center" },
                      y: { type: Type.NUMBER, description: "Normalized 0-1 vertical center" },
                    },
                    required: ["x", "y"],
                  },
                  morphExport: {
                    type: Type.OBJECT,
                    description: "Cross-scene element morph: bounding box of element exiting THIS scene. Max 1 morph per video. The element animates from this rect to morphImport rect in the next scene.",
                    properties: {
                      id: { type: Type.STRING, description: "Unique morph element id (e.g. 'hero-icon')" },
                      rect: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER }, y: { type: Type.NUMBER },
                          w: { type: Type.NUMBER }, h: { type: Type.NUMBER },
                        },
                        required: ["x", "y", "w", "h"],
                      },
                    },
                    required: ["id", "rect"],
                  },
                  morphImport: {
                    type: Type.OBJECT,
                    description: "Cross-scene element morph: bounding box where the morphExport element ARRIVES in THIS scene. Must match morphExport.id from previous scene.",
                    properties: {
                      id: { type: Type.STRING, description: "Must match morphExport.id from previous scene" },
                      rect: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER }, y: { type: Type.NUMBER },
                          w: { type: Type.NUMBER }, h: { type: Type.NUMBER },
                        },
                        required: ["x", "y", "w", "h"],
                      },
                    },
                    required: ["id", "rect"],
                  },
                  highlightWords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "1–2 words from the scene headline to render in BRAND.primary accent color. Choose the highest emotional-weight words. Example: 'Stop losing customers' → ['losing']. These must be explicitly called out in the scene prompt so the generator wraps them in a colored span.",
                  },
                  visualState: {
                    type: Type.STRING,
                    description: "Instructions for continuing UI/camera from previous scene. E.g. 'Sidebar remains mounted, zoom level 1.05 persists'.",
                  },
                  designSystem: {
                    type: Type.OBJECT,
                    description: "Agency Design System overrides for this scene.",
                    properties: {
                      spacing: { type: Type.NUMBER, description: "Spacing grid (e.g. 16)" },
                      safeZone: { type: Type.NUMBER, description: "Content safe-zone margin in px (default 80)" },
                      motionCharacter: { type: Type.STRING, description: "snappy | floaty | elastic" },
                      depthStyle: { type: Type.STRING, description: "glass-heavy | glass-light | flat | soft-shadow" },
                    },
                  },
                  hierarchy: {
                    type: Type.OBJECT,
                    description: "Explicit visual hierarchy mapping.",
                    properties: {
                      primary: { type: Type.STRING, description: "The one focal element that must dominate" },
                      secondary: { type: Type.STRING, description: "Supporting element (60-70% scale)" },
                      tertiary: { type: Type.STRING, description: "Subtle contextual elements" },
                    },
                    required: ["primary"],
                  },
                  styleContract: {
                    type: Type.OBJECT,
                    description: "Global art-direction contract to preserve premium consistency across scenes.",
                    properties: {
                      typographyEnergy: { type: Type.STRING },
                      depthModel: { type: Type.STRING },
                      lightingModel: { type: Type.STRING },
                      spacingDensity: { type: Type.STRING },
                      cursorPersonality: { type: Type.STRING },
                      iconMotion: { type: Type.STRING },
                      surfaceStyle: { type: Type.STRING },
                    },
                  },
                },
                required: ["id", "title", "prompt", "skills", "durationInFrames", "intent", "skillBudget", "motionBudget", "continuityRole"],
              },
            },
            bgSkill: { type: Type.STRING },
            globalBg: { type: Type.STRING, description: "arcs | grid | dots" },
            globalVisualThread: { type: Type.STRING, description: "One sentence describing the single geometric/color/motion motif that persists across ALL scenes and evolves from broken→resolved. E.g. 'A glowing ring: fragmented arcs in problem scenes, full brand-color ring in solution scenes, exploding into the logo on CTA.'" },
            styleContract: {
              type: Type.OBJECT,
              description: "Global art-direction contract for typography, depth, lighting, cursor motion, and surface treatment. Must remain consistent across the whole video.",
              properties: {
                typographyEnergy: { type: Type.STRING },
                depthModel: { type: Type.STRING },
                lightingModel: { type: Type.STRING },
                spacingDensity: { type: Type.STRING },
                cursorPersonality: { type: Type.STRING },
                iconMotion: { type: Type.STRING },
                surfaceStyle: { type: Type.STRING },
              },
            },
            edges: {
              type: Type.ARRAY,
              description: "Flow graph edges describing transitions and state carry-over between adjacent scenes. Required for all walkthrough scene pairs.",
              items: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.NUMBER, description: "Source scene id" },
                  to: { type: Type.NUMBER, description: "Destination scene id" },
                  transition: { type: Type.STRING, description: "Transition type: fade | slide | scale | flash | none | cameraPan | zoomThrough" },
                  carryOver: {
                    type: Type.OBJECT,
                    properties: {
                      cursor: { type: Type.BOOLEAN, description: "Cursor position continues across the cut" },
                      camera: { type: Type.BOOLEAN, description: "Camera zoom/pan state maintained — no reset to 1.0" },
                      ui: { type: Type.BOOLEAN, description: "App shell (sidebar, topbar) stays mounted unchanged" },
                    },
                  },
                },
                required: ["from", "to", "transition"],
              },
            },
            uiSchemas: {
              type: Type.ARRAY,
              description: "For each uploaded screenshot (by index), extract the UI layout structure. Return one entry per image.",
              items: {
                type: Type.OBJECT,
                properties: {
                  imageIndex: { type: Type.NUMBER, description: "0-based index of the screenshot this schema describes" },
                  layout: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, description: "sidebar-main | topnav-main | full-width | split" },
                      sidebar: {
                        type: Type.OBJECT,
                        properties: {
                          appName: { type: Type.STRING },
                          items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, icon: { type: Type.STRING }, isActive: { type: Type.BOOLEAN } }, required: ["label", "icon", "isActive"] } },
                        },
                        required: ["appName", "items"],
                      },
                    },
                    required: ["type"],
                  },
                  mainContent: {
                    type: Type.OBJECT,
                    properties: {
                      sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, data: { type: Type.OBJECT } }, required: ["type", "data"] } },
                    },
                    required: ["sections"],
                  },
                  theme: {
                    type: Type.OBJECT,
                    properties: {
                      bgColor: { type: Type.STRING }, cardBgColor: { type: Type.STRING },
                      textColor: { type: Type.STRING }, accentColor: { type: Type.STRING },
                      borderRadius: { type: Type.NUMBER }, isDark: { type: Type.BOOLEAN },
                    },
                    required: ["bgColor", "textColor", "accentColor", "isDark"],
                  },
                },
                required: ["imageIndex", "layout", "mainContent", "theme"],
              },
            },
          },
          required: ["brand", "scenes"],
        },
      },
    }));

    if (!result.text) console.warn("[plan] LLM returned empty text — plan will be empty");
    let parsed: FullVideoPlanRaw & { brand: BrandTokensRaw; uiSchemas?: Array<{ imageIndex: number } & Record<string, unknown>> };
    try { parsed = JSON.parse(result.text ?? "{}"); } catch (e) { console.error("[plan] JSON.parse failed. Raw:", result.text?.slice(0, 500)); throw e; }

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("No scenes returned from planner");
    }

    // ── DIRECTOR FEEDBACK LOOP (Phase 2) ─────────────────────────────────
    // Audit the generated scene plan against the Backbone and Brief.
    if (narrativeBackbone && creativeBrief && !isRefinement) {
      const planCritique = await critiqueScenePlan(parsed, narrativeBackbone, creativeBrief, ai);
      if (planCritique?.needsRefinement) {
        console.log("[plan-critique] refining plan:", planCritique.critique);
        const refinementResult = await withRetry(() => ai.models.generateContent({
          model: FAST_MODEL,
          contents: [
            { role: "user", parts: [textPart, ...imageParts] },
            { role: "model", parts: [{ text: result.text ?? "{}" }] },
            { role: "user", parts: [{ text: `## DIRECTOR CRITIQUE\n${planCritique.critique}\n\n## SUGGESTIONS\n${planCritique.suggestions}\n\nApply these fixes and return the COMPLETE updated scene plan JSON. Ensure all required fields for the brand and scenes are present.` }] },
          ],
          config: {
            systemInstruction: buildDirectorPlannerSystemPrompt(creativeBrief, narrativeBackbone),
            responseMimeType: "application/json",
          },
        }));
        try {
          const refinedParsed = JSON.parse(refinementResult.text ?? "{}");
          if (refinedParsed.scenes && Array.isArray(refinedParsed.scenes) && refinedParsed.scenes.length > 0) {
            parsed = refinedParsed;
            console.log("[plan-critique] plan refined successfully");
          }
        } catch (e) {
          console.warn("[plan-critique] refinement parse failed:", e);
        }
      }
    }

    // Task 0.2: Populate uiSchemasByIndex from the planner's inline uiSchemas
    if (Array.isArray(parsed.uiSchemas)) {
      parsed.uiSchemas.forEach((schema) => {
        if (typeof schema.imageIndex === "number") {
          uiSchemasByIndex[schema.imageIndex] = schema;
          console.log(`UI schema[${schema.imageIndex}] (from planner):`, (schema as any)?.layout?.type, "sections:", ((schema as any)?.mainContent?.sections ?? []).length);
        }
      });
    }

    // Merge: vision-extracted colors take priority over text-inferred
    const textBrand = parsed.brand ?? {};
    const brand = {
      primary: visionBrand.primary ?? textBrand.primary ?? "#6366f1",
      secondary: visionBrand.secondary ?? textBrand.secondary ?? "#a78bfa",
      bg: visionBrand.bg ?? textBrand.bg ?? "#0f0f1a",
      surface: visionBrand.surface ?? textBrand.surface ?? "rgba(255,255,255,0.06)",
      text: visionBrand.text ?? textBrand.text ?? "#ffffff",
      textMuted: visionBrand.textMuted ?? textBrand.textMuted ?? "rgba(255,255,255,0.5)",
      border: visionBrand.border ?? textBrand.border ?? "rgba(255,255,255,0.12)",
      font: textBrand.font ?? "Inter",
      accentName: textBrand.accentName ?? "indigo",
      style: (visionBrand.style ?? textBrand.style ?? "dark") as "dark" | "light" | "neon",
      name: textBrand.name,
      url: textBrand.url,
      cta: textBrand.cta,
      // Flow-analyze energy overrides text-inferred musicStyle (stronger signal)
      musicStyle: flowEnergy === "high"
        ? "energetic"
        : flowEnergy === "calm"
          ? "calm"
          : textBrand.musicStyle,
    };

    // Scene prompts are returned clean (no brand prefix) — the generation layer
    // injects brand as a structured block at call time.
    // Clamp imageIndex to valid range so bad LLM output doesn't cause errors downstream.
    const maxImageIdx = parsedImages.length - 1;
    const globalStyleContract =
      parsed.styleContract ??
      deriveStyleContract(creativeBrief ?? null, brand.style);
    const qualityMetadata = deriveQualityMetadata(
      parsed.scenes.map((scene, index) => ({
        intent: (scene as any).intent,
        title: scene.title,
        skills: scene.skills,
        motionBudget: (scene as any).motionBudget,
        continuityRole: (scene as any).continuityRole,
        isAhaMoment: (scene as any).isAhaMoment,
        journeyKind: (scene as any).journeyContext?.kind,
        narrativeRole: (scene as any).narrativeRole,
        visualGrammarRole: (scene as any).visualGrammarRole,
        motionLanguage: (scene as any).motionLanguage,
        interactionStoryMode: (scene as any).interactionStoryMode,
      })),
    );
    const scenes = parsed.scenes.map((s, i) => {
      const resolvedSkills = (s.skills ?? []).map((sk) => sk.replace(/^marky-/, "premium-"));
      const durFromPrompt = (s as any).durationInFrames ?? 210;
      // Apply creative brief durationBias (50/50 blend with planner's value) if available
      let biasedDuration = durFromPrompt;
      if (creativeBrief) {
        const beat = creativeBrief.emotionalArc.find(b => b.beatIndex === i);
        if (beat) {
          const fps = 30;
          const biasDuration = { short: Math.round(fps * 2.5), normal: Math.round(fps * 4.5), long: Math.round(fps * 6.5) }[beat.durationBias];
          biasedDuration = Math.round((durFromPrompt + biasDuration) / 2);
        }
      }
      const safeDuration = Math.max(120, Math.min(600, biasedDuration));

      const rawIdx = (s as any).imageIndex;
      let imageIdx = typeof rawIdx === "number" ? Math.max(0, Math.min(maxImageIdx, rawIdx)) : undefined;
      const imageIndices = (s as any).imageIndices ?? [];
      const rawJourneyContext = (s as any).journeyContext;

      const featureHeader = (s as any).featureHeader ?? null;
      const cursorJourney = Array.isArray((s as any).cursorJourney)
        ? (s as any).cursorJourney
            .filter((step: unknown): step is string => typeof step === "string" && step.trim().length > 0)
            .map((step: string) => step.trim())
        : [];
      const interactionScript = (s as any).interactionScript ?? null;
      // Prefer inline uiSchema from planner; fall back to uiSchemasByIndex for scenes with a matching imageIndex
      const uiSchema = (s as any).uiSchema ?? (imageIdx !== undefined ? uiSchemasByIndex[imageIdx] ?? null : null);
      const sceneImageIndices = Array.isArray(imageIndices)
        ? imageIndices.filter((idx: unknown): idx is number => typeof idx === "number" && idx >= 0 && idx <= maxImageIdx)
        : [];
      const buildJourneyContext = (activeImageIdx: number | undefined) => {
        const sceneTransitions = sceneImageIndices.length > 1
          ? sceneImageIndices
              .map((idx) => (screenFlow?.transitions ?? []).find((tr: import("@/types/generation").ScreenTransition) => tr.from === idx))
              .filter((tr): tr is NonNullable<typeof tr> => Boolean(tr))
          : activeImageIdx !== undefined
            ? (screenFlow?.transitions ?? []).filter((tr: import("@/types/generation").ScreenTransition) => tr.from === activeImageIdx)
            : [];
        const screenTransition = sceneTransitions[0];
        const sourceScreenDescription = activeImageIdx !== undefined
          ? (screenFlow?.screens ?? []).find((screen: import("@/types/generation").ScreenFlow["screens"][number]) => screen.index === activeImageIdx)?.description || finalDescriptions[activeImageIdx] || `screen ${activeImageIdx + 1}`
          : undefined;
        const targetScreenDescription = typeof screenTransition?.to === "number"
          ? (screenFlow?.screens ?? []).find((screen: import("@/types/generation").ScreenFlow["screens"][number]) => screen.index === screenTransition.to)?.description || finalDescriptions[screenTransition.to] || `screen ${screenTransition.to + 1}`
          : undefined;
        const multiViewJourneyContext = sceneImageIndices.length > 1
          ? {
              kind: typeof (s as any).intent === "string" && (s as any).intent === "feature"
                ? "review"
                : inferJourneyKindFromTransition(sceneTransitions[0], (s as any).intent),
              narrativeTask: sceneTransitions.length > 0
                ? `Walk the viewer through a continuous product tour: ${sceneTransitions.map((tr: import("@/types/generation").ScreenTransition) => tr.action || tr.type).join(" → ")}.`
                : `Show a continuous multi-view product journey across the assigned screens.`,
              sourceScreenIndex: sceneImageIndices[0],
              targetScreenIndex: sceneTransitions[sceneTransitions.length - 1]?.to ?? sceneImageIndices[sceneImageIndices.length - 1],
              sourceScreenDescription: (screenFlow?.screens ?? []).find((screen: import("@/types/generation").ScreenFlow["screens"][number]) => screen.index === sceneImageIndices[0])?.description || finalDescriptions[sceneImageIndices[0]],
              targetScreenDescription: (() => {
                const targetIdx = sceneTransitions[sceneTransitions.length - 1]?.to ?? sceneImageIndices[sceneImageIndices.length - 1];
                return (screenFlow?.screens ?? []).find((screen: import("@/types/generation").ScreenFlow["screens"][number]) => screen.index === targetIdx)?.description || finalDescriptions[targetIdx];
              })(),
              nextAction: sceneTransitions.map((tr: import("@/types/generation").ScreenTransition) => tr.action || tr.type).filter(Boolean).join(" → "),
              transitionType: sceneTransitions[0]?.type,
              targetLabel: sceneTransitions[0]?.targetLabel,
              elementType: sceneTransitions[0]?.elementType,
              featureName: screenFlow?.productFeature,
            }
          : null;

        const normalizedJourneyContext = rawJourneyContext && typeof rawJourneyContext === "object"
          ? {
              kind: typeof rawJourneyContext.kind === "string"
                ? rawJourneyContext.kind
                : inferJourneyKindFromTransition(screenTransition, (s as any).intent),
              narrativeTask: typeof rawJourneyContext.narrativeTask === "string" && rawJourneyContext.narrativeTask.trim().length > 0
                ? rawJourneyContext.narrativeTask.trim()
                : describeJourneyTask(sourceScreenDescription ?? ((s as any).title ?? "this product scene"), screenTransition, (s as any).intent),
              sourceScreenIndex: typeof rawJourneyContext.sourceScreenIndex === "number" ? rawJourneyContext.sourceScreenIndex : activeImageIdx,
              targetScreenIndex: typeof rawJourneyContext.targetScreenIndex === "number" ? rawJourneyContext.targetScreenIndex : screenTransition?.to,
              sourceScreenDescription: typeof rawJourneyContext.sourceScreenDescription === "string" ? rawJourneyContext.sourceScreenDescription : sourceScreenDescription,
              targetScreenDescription: typeof rawJourneyContext.targetScreenDescription === "string" ? rawJourneyContext.targetScreenDescription : targetScreenDescription,
              nextAction: typeof rawJourneyContext.nextAction === "string" ? rawJourneyContext.nextAction : screenTransition?.action,
              transitionType: typeof rawJourneyContext.transitionType === "string" ? rawJourneyContext.transitionType : screenTransition?.type,
              targetLabel: typeof rawJourneyContext.targetLabel === "string" ? rawJourneyContext.targetLabel : screenTransition?.targetLabel,
              elementType: typeof rawJourneyContext.elementType === "string" ? rawJourneyContext.elementType : screenTransition?.elementType,
              featureName: typeof rawJourneyContext.featureName === "string"
                ? rawJourneyContext.featureName
                : screenFlow?.productFeature,
            }
          : multiViewJourneyContext
            ? multiViewJourneyContext
          : activeImageIdx !== undefined
            ? {
                kind: inferJourneyKindFromTransition(screenTransition, (s as any).intent),
                narrativeTask: sceneTransitions.length > 1
                  ? `Use "${sourceScreenDescription ?? `screen ${activeImageIdx + 1}`}" as a decision point and guide the viewer toward the most relevant next action for this scene.`
                  : describeJourneyTask(sourceScreenDescription ?? `screen ${activeImageIdx + 1}`, screenTransition, (s as any).intent),
                sourceScreenIndex: activeImageIdx,
                targetScreenIndex: screenTransition?.to,
                sourceScreenDescription,
                targetScreenDescription,
                nextAction: screenTransition?.action,
                transitionType: screenTransition?.type,
                targetLabel: screenTransition?.targetLabel,
                elementType: screenTransition?.elementType,
                featureName: screenFlow?.productFeature,
              }
            : undefined;

        return {
          normalizedJourneyContext,
          sceneTransitions,
          screenTransition,
          sourceScreenDescription,
          targetScreenDescription,
        };
      };

      // ── Gap 3: Per-scene musicMood derived from emotionalIntent ───────────
      // Injected as MUSIC_MOOD in compiler scope — drives AbstractMotionBg mode,
      // beat density, and SFX flavor. Independent from global brand.musicStyle.
      const EMOTION_TO_MOOD: Record<string, import("@/types/generation").ScenePlan["musicMood"]> = {
        FRUSTRATION:  "tense",
        ANXIETY:      "tense",
        PAIN:         "sparse-somber",
        RECOGNITION:  "warm-ambient",
        RELIEF:       "uplifting-swell",
        CONFIDENCE:   "energetic-precise",
        TRUST:        "warm-ambient",
        URGENCY:      "driving-pulse",
        EXCITEMENT:   "euphoric",
      };
      const rawEmotion = ((s as any).emotionalIntent ?? "").toUpperCase();
      const musicMood: import("@/types/generation").ScenePlan["musicMood"] = EMOTION_TO_MOOD[rawEmotion] ?? undefined;

      const exitAnchor = (s as any).exitAnchor ?? null;
      const macroZoom = (s as any).macroZoom ?? null;

      // ── Director layer normalization ─────────────────────────────────────
      const intent = (s as any).intent ?? inferIntentFromTitleAndSkills(s);
      const skillBudget = clampSkillBudget((s as any).skillBudget, 2);

      // Creative brief colorTemperature overrides motionBudget when planner didn't set one
      let rawMotionBudget = (s as any).motionBudget;
      if (!rawMotionBudget && creativeBrief) {
        const beat = creativeBrief.emotionalArc.find(b => b.beatIndex === i);
        if (beat) {
          rawMotionBudget = ({ cold: "low", neutral: "medium", warm: "high" } as const)[beat.colorTemperature];
        }
      }
      const motionBudget = (rawMotionBudget ?? defaultMotionBudget(intent)) as "low" | "medium" | "high";

      // Creative brief spatialWorld positions determine continuityRole
      let continuityRoleRaw = (s as any).continuityRole as string | undefined;
      if (!continuityRoleRaw && creativeBrief && creativeBrief.spatialWorld.scenePositions.length > i) {
        const thisPosition = creativeBrief.spatialWorld.scenePositions[i];
        const prevPosition = i > 0 ? creativeBrief.spatialWorld.scenePositions[i - 1] : null;
        continuityRoleRaw = prevPosition && thisPosition === prevPosition ? "continue-world" : "new-world";
      }
      const continuityRole = (continuityRoleRaw ??
        ((s as any).isWalkthroughScene ? "continue-world" : "new-world")) as "new-world" | "continue-world";
      const sceneQuality = qualityMetadata[i];
      const narrativeRole = ((s as any).narrativeRole ?? sceneQuality?.narrativeRole ?? "workflow-choreography") as NarrativeRole;
      const visualGrammarRole = ((s as any).visualGrammarRole ?? sceneQuality?.visualGrammarRole ?? narrativeRole) as NarrativeRole;
      const motionLanguage = ((s as any).motionLanguage ?? sceneQuality?.motionLanguage ?? "guided-choreography") as MotionLanguage;
      const interactionStoryMode = ((s as any).interactionStoryMode ?? sceneQuality?.interactionStoryMode ?? "none") as InteractionStoryMode;
      const styleContract = ((s as any).styleContract ?? globalStyleContract) as StyleContract;

      // Intent-first: restrict & enforce primary skill choice
      let directedSkills = enforceIntentPrimarySkill(intent, resolvedSkills);
      ({ imageIdx, directedSkills } = enforceScreenshotDrivenSceneContract({
        intent,
        directedSkills,
        parsedImagesCount: parsedImages.length,
        imageIdx,
        sceneImageIndices,
        maxImageIdx,
        hasUiSchema: Boolean(uiSchema),
      }));
      const {
        normalizedJourneyContext,
      } = buildJourneyContext(imageIdx);
      // Demote live-action-composite if no stock footage source available.
      if (directedSkills[0] === "premium-live-action-composite") {
        const hasFootageSource = Boolean((s as any).stockFootage)
          || Boolean((s as any).videoSearchQuery)
          || Boolean(process.env.PEXELS_API_KEY);
        if (!hasFootageSource) {
          const fallbackSkills = intentAllowedPrimarySkills(intent).filter((sk) => sk !== "premium-live-action-composite");
          directedSkills = enforceIntentPrimarySkill(
            intent,
            fallbackSkills.length > 0 ? fallbackSkills : resolvedSkills,
          );
        }
      }

      // ── Gap 2: Visual metaphor skill forcing ──────────────────────────────
      // Hook/problem scenes without attached screenshots must NOT open with UI.
      // WhatAStory's biggest differentiator: chaos/pain visuals BEFORE product UI.
      if (
        creativeBrief?.visualMetaphor &&
        (intent === "hook" || intent === "problem") &&
        !imageIdx && // no screenshot attached — pure concept scene
        !(s as any).imageIndices?.length
      ) {
        const metaphorSkillPool: Record<string, string[]> = {
          hook: [
            "premium-chaos-to-ui-resolve",
            "premium-floating-icon-chaos",
            "premium-icon-arc-reveal",
            "premium-saas-hook",
          ],
          problem: [
            "premium-floating-path-nodes",
            "premium-feedback-storm",
            "premium-floating-icon-chaos",
            "premium-chaos-to-ui-resolve",
          ],
        };

        const metaphorPool = metaphorSkillPool[intent] ?? [];
        const currentPrimary = directedSkills[0] ?? "";

        // Only replace if current primary is a UI-heavy skill
        const UI_HEAVY_SKILLS = new Set([
          "premium-reconstructed-ui",
          "premium-chameleon-ui",
          "premium-app-walkthrough",
          "premium-saas-showcase",
          "premium-interactive-ui",
          "premium-scroll-demo",
          "premium-multi-view-walkthrough",
        ]);

        if (UI_HEAVY_SKILLS.has(currentPrimary) || !currentPrimary) {
          const metaphorPrimary = metaphorPool[0];
          if (metaphorPrimary) {
            directedSkills = [metaphorPrimary, ...directedSkills.slice(1)];
            console.log(
              `[visual-metaphor] Forced "${metaphorPrimary}" on ${intent} scene (was: "${currentPrimary || "none"}")`,
            );
          }
        }
      }

      // HARD enforce motion + skill budgets (reduces clutter)
      const { effectiveBudget, budgetedSkills } = enforceMotionBudget(intent, motionBudget, skillBudget, directedSkills);

      // ── Scene-specific music volume ─────────────────────────────────────
      // Low-tempo music in setup/narrative scenes; high-tempo (1.0) in showcase
      const isShowcase = budgetedSkills.some(sk => sk.includes("showcase") || sk.includes("walkthrough"));
      const effectiveMusicVolume = isShowcase ? 1.0 : 0.65;

      // Encode motion budget into the prompt so the generator obeys "do nothing" logic.
      const INTENT_ENERGY_CONTRACTS: Record<string, string> = {
        hook: [
          "HOOK ENERGY CONTRACT (non-negotiable):",
          "- First visible element must enter within frame 0–3 (no warm-up delay)",
          "- Headlines MUST use KineticText variant=\"slam\" OR MaskedReveal with SPRING_CONFIGS.snap — NEVER plain opacity fade",
          "- Spring config: stiffness ≥ 300, damping ≤ 15 on at least one hero element (snappy, aggressive)",
          "- Background must have entropy dust OR light arc OR bold color — never static",
          "- Font size: hero headline ≥ 96px, subhead ≥ 48px",
          "- Camera: CameraRig with beat=\"hook\" OR SteppedCamera with first keyframe zoom ≥ 1.04",
        ].join("\n"),
        problem: [
          "PROBLEM ENERGY CONTRACT:",
          "- Use ChunkCard (NOT ReconstructedAppShell) — UI is context, not demo",
          "- Motion: useStagger with 8–12 frame gaps (not simultaneous)",
          "- Spring: stiffness 80–120 (heavier, reluctant movement signals tension)",
          "- Background: entropy dust ONLY — no glows, no color pops",
          "- SkeletonTextBlock for any body text — no readable paragraph text",
        ].join("\n"),
        solution: [
          "SOLUTION ENERGY CONTRACT:",
          "- This is the emotional peak entry — treat like a reveal",
          "- Use MaskedReveal on ALL text elements (wipe from left to right)",
          "- At least one element must use InWorldText at depth ≥ 0.7 (foreground)",
          "- Spring: stiffness 160–220, damping 18 (confident, precise)",
          "- Background: glow bloom + swell — brand primary radial gradient visible",
          "- If UI shown: use ReconstructedAppShell with SteppedCamera, first whip at frame 0",
        ].join("\n"),
        feature: [
          "FEATURE ENERGY CONTRACT:",
          "- MUST have cursor interaction — if no CURSOR_STEPS, this scene fails its intent",
          "- Use SteppedCamera — NEVER CinematicCamera on cursor demo scenes (camera fights cursor)",
          "- useCascadeTree for all card/badge hierarchies (not flat useStagger)",
          "- Spring: stiffness 100–150 for camera, 200–280 for cursor snap targets",
          "- Hold after each cursor click ≥ 30 frames so viewer reads the UI",
        ].join("\n"),
        proof: [
          "PROOF ENERGY CONTRACT:",
          "- Data/metric is the hero — use StatCounter or MetricFlyout, NOT raw text",
          "- ChunkCard for context metrics (not literal dashboard unless cursor is present)",
          "- Spring: medium stiffness 100–140 (authoritative, not bouncy)",
          "- InWorldText for ambient supporting numbers at depth 0.3–0.5",
          "- No camera movement unless tied to stat reveal (CameraRig breathe only)",
        ].join("\n"),
        cta: [
          "CTA ENERGY CONTRACT (non-negotiable):",
          "- Text must use KineticText slam or MaskedReveal — NEVER plain fade-in",
          "- Primary CTA element must pulse using useBeat() at final hold",
          "- Spring: stiffness 250–350 (urgent, snappy)",
          "- Background: bold color or gradient hero — most visually dense scene",
          "- Font size: CTA button text ≥ 40px, headline ≥ 80px",
        ].join("\n"),
      };

      const SEQUENCING_ANTI_PATTERNS = [
        "GLOBAL ANTI-PATTERNS (NEVER do these — instant quality fail):",
        "- Headline opacity fade → ALWAYS use MaskedReveal or KineticText slam",
        "- Same enter frame for all siblings → useStagger min 8-frame gap",
        "- Font size under 80px for hero headline",
        "- Static dark background → add entropy dust (18 particles minimum)",
        "- Standard arrow cursor → use HAND_CURSOR SVG",
        "- More than 3 elements entering simultaneously",
        "- CinematicCamera on cursor demo scenes → use SteppedCamera",
        "- Avatars/cards frozen after entering → apply useVitality",
        "- Literal dashboard in non-cursor scene → use ChunkCard + SkeletonTextBlock",
      ].join("\n");

      const CONTINUITY_INSTRUCTIONS: Record<string, string> = {
        "new-world": [
          "CONTINUITY (new-world): This scene establishes a new visual context.",
          "- Full background render allowed (arcs / grid / bold color)",
          "- Distinct entrance signals 'we are somewhere new'",
        ].join("\n"),
        "continue-world": [
          "CONTINUITY (continue-world) — HARD CONSTRAINTS:",
          "- Background MUST use the same globalBg type as the previous scene",
          "- Render background at opacity 0.0–0.3 only — let the global layer show through",
          "- Persistent elements from previous scene enter from where they exited, not from off-screen",
          "- CameraRig: use drift entry (stiffness 40–60) — NOT a slam or hard snap",
          "- This is a continuation, not a restart — avoid heavy entrances for ambient elements",
        ].join("\n"),
      };

      const intentContract = INTENT_ENERGY_CONTRACTS[intent] ?? "";
      const continuityContract = CONTINUITY_INSTRUCTIONS[continuityRole] ?? "";
      const PACING_STIFFNESS: Record<string, string> = {
        punch: "stiffness: 280-350, damping: 18-22 -- FAST snap entries",
        accelerate: "stiffness: 160-220, damping: 20-26 -- building momentum",
        breathe: "stiffness: 80-120, damping: 28-34 -- relaxed float",
        release: "stiffness: 120-180, damping: 22-28 -- smooth resolution",
        silence: "stiffness: 60-90, damping: 34-40 -- minimal movement",
      };
      const beatForScene = creativeBrief?.emotionalArc.find((b) => b.beatIndex === i);
      const pacingWord = beatForScene?.pacingWord ?? "breathe";
      const stiffnessGuidance = PACING_STIFFNESS[pacingWord] ?? PACING_STIFFNESS.breathe;

      const MOTION_DIRECTIVE = [
        "## DIRECTOR NOTES (MANDATORY)",
        `Intent: ${intent}`,
        `Narrative role: ${narrativeRole}`,
        `Visual grammar role: ${visualGrammarRole}`,
        `Motion language: ${motionLanguage}`,
        `Interaction story mode: ${interactionStoryMode}`,
        `Skill budget: ${effectiveBudget} (HARD LIMIT)`,
        `Motion budget: ${motionBudget}`,
        `Continuity role: ${continuityRole}`,
        `SPRING PHYSICS (from pacing "${pacingWord}"): ${stiffnessGuidance}`,
        motionBudget === "low"
          ? "- Reduce motion by ~60%. Prefer stillness and clarity. Only animate 1–2 entrances in Act 2. Act 3 must be fully static."
          : motionBudget === "high"
            ? "- High energy allowed, but still enforce Act 3 stillness. Keep one clear focal point at all times."
            : "- Medium motion. Clean entrances, no constant drift. Act 3 must be fully static.",
        intentContract,
        continuityContract,
        SEQUENCING_ANTI_PATTERNS,
      ].filter(Boolean).join("\n");

      const highlightWords: string[] = Array.isArray((s as any).highlightWords) ? (s as any).highlightWords : [];
      const highlightNote = highlightWords.length > 0
        ? `\nACCENT WORDS: Render these words in BRAND.primary color (wrap in a <span style={{color: BRAND.primary}}> or use gradient text): ${highlightWords.map(w => `"${w}"`).join(", ")}`
        : "";
      (s as any).prompt = `${MOTION_DIRECTIVE}${highlightNote}\n\n${(s as any).prompt ?? ""}`.trim();

      // Phase 4: Auto-inject premium-reconstructed-ui when uiSchema is present but skill is missing.
      // If the planner didn't pick reconstructed-ui (picked chameleon-ui / saas-showcase / device-mockup instead),
      // we override to reconstructed-ui — it's the only skill that renders UI_SCHEMA correctly.
      const RECONSTRUCTED_SKILL = "premium-reconstructed-ui";
      const CURSOR_SKILLS = new Set(["premium-cursor-engine", "premium-chameleon-ui", "premium-interactive-ui"]);
      const NON_UI_SKILLS = new Set(["premium-section-title", "premium-cta-scene", "premium-saas-hook",
        "premium-kinetic-text", "premium-stat-counter", "premium-social-proof", "premium-testimonial-card",
        "premium-logo-wall", "premium-network-intro", "premium-before-after", "premium-metric-flyout"]);
      if (uiSchema && !budgetedSkills.includes(RECONSTRUCTED_SKILL) && !budgetedSkills.some(sk => CURSOR_SKILLS.has(sk)) && !budgetedSkills.every(sk => NON_UI_SKILLS.has(sk))) {
        // Replace saas-showcase / device-mockup with reconstructed-ui; keep other skills
        const filteredSkills = budgetedSkills.filter(sk => sk !== "premium-saas-showcase" && sk !== "premium-device-mockup" && sk !== "premium-camera-zoom");
        budgetedSkills.splice(0, budgetedSkills.length, RECONSTRUCTED_SKILL, ...filteredSkills);
        console.log(`[plan] Scene "${(s as any).id ?? i}" auto-upgraded to premium-reconstructed-ui (uiSchema present)`);
      }

      // Post-normalization sanity check: warn on high-risk skill/intent mismatches
      const isHighRiskScene = (
        (intent === "hook" && !budgetedSkills.some(s =>
          s.includes("kinetic") || s.includes("icon-arc") || s.includes("saas-hook") || s.includes("live-action"))) ||
        (intent === "feature" && !budgetedSkills.some(s =>
          s.includes("cursor") || s.includes("chameleon") || s.includes("walkthrough"))) ||
        (intent === "cta" && !budgetedSkills.some(s =>
          s.includes("cta") || s.includes("gradient-hero")))
      );
      if (isHighRiskScene) {
        console.warn(`[plan-sanity] Scene "${(s as any).title ?? i}" intent=${intent} has potentially wrong skill stack:`, budgetedSkills);
      }

      // Phase 1: Story-motivated transition enforcement
      const isFirst = i === 0;
      const isLast = i === parsed.scenes.length - 1;
      const isSpecial = s.isAhaMoment || s.skills?.includes("premium-section-title") || s.skills?.includes("premium-cta-scene");
      let transition = s.transition;
      if (!transition || (!isFirst && !isLast && !isSpecial && transition === "fade")) {
        transition = choosePlannerTransition({
          index: i,
          total: parsed.scenes.length,
          scene: {
            intent,
            continuityRole,
            isAhaMoment: s.isAhaMoment,
            narrativeRole,
            visualGrammarRole,
            motionLanguage,
          },
          previousScene: i > 0
            ? {
                intent: (parsed.scenes[i - 1] as any)?.intent,
                narrativeRole: qualityMetadata[i - 1]?.narrativeRole,
                visualGrammarRole: qualityMetadata[i - 1]?.visualGrammarRole,
                motionLanguage: qualityMetadata[i - 1]?.motionLanguage,
              }
            : null,
        });
      }

      // ── HOUSE STYLE (per-video — injected into every scene prompt) ─────────
      // Brief-aware: if a creative brief exists, augments the typography/motion rules
      // with specific grammar instructions for this video's visual personality.
      const briefGrammarLines: string[] = [];
      if (creativeBrief) {
        const g = creativeBrief.visualGrammar;
        const shapeDesc: Record<string, string> = {
          geometric: "use sharp angles, rectangles, precise grids",
          organic: "use rounded corners, soft curves, flowing shapes",
          "data-dense": "pack information, use tables/charts/metrics as decoration",
          editorial: "large typography, asymmetric layouts, magazine-style whitespace",
          minimal: "maximum whitespace, single focal point per scene, nothing decorative",
        };
        const textureDesc: Record<string, string> = {
          clean: "no grain, no noise, pure flat colors and gradients",
          grainy: "add FilmGrain component at opacity 0.08-0.12",
          glossy: "use SheenOverlay, specular highlights on cards",
          matte: "no sheen, no glow, flat surfaces only",
          neon: "use GlowBloom aggressively, neon color accents",
        };
        const densityDesc: Record<string, string> = {
          sparse: "max 3 elements visible at once, generous negative space",
          balanced: "standard composition, 4-6 elements max",
          dense: "information-rich, multiple data points, justified layouts",
        };
        const motionDesc: Record<string, string> = {
          snappy: "stiffness 250-350, sharp cuts, minimal ease-in",
          fluid: "stiffness 80-120, long easing, elements flow into place",
          heavy: "stiffness 60-100, mass 1.5, elements feel physical weight",
          playful: "stiffness 300-400, overshoot damping 8-10, bouncy entrances",
          cinematic: "stiffness 50-80, damping 20-25, slow deliberate camera moves",
        };
        briefGrammarLines.push(
          "## VISUAL GRAMMAR (from creative brief -- mandatory for every element):",
          `- Shape: ${g.shapeLanguage} -- ${shapeDesc[g.shapeLanguage] ?? g.shapeLanguage}`,
          `- Texture: ${g.textureStyle} -- ${textureDesc[g.textureStyle] ?? g.textureStyle}`,
          `- Icons: ${g.iconStyle} -- use this style for ALL icons without exception`,
          `- Density: ${g.layoutDensity} -- ${densityDesc[g.layoutDensity] ?? g.layoutDensity}`,
          `- Motion: ${g.motionPersonality} -- ${motionDesc[g.motionPersonality] ?? g.motionPersonality}`,
        );
      }

      const HOUSE_STYLE = [
        "## HOUSE STYLE (MANDATORY -- keep identical across all scenes)",
        "- Typography: WaS 3-layer stack: Label 13px uppercase (letterSpacing 0.18em, BRAND.primary) -> Headline 96-128px weight 900 (letterSpacing -0.04em, MUST use MaskedReveal) -> Subline 22-28px (BRAND.textMuted, maxWidth 520).",
        "- Safe zones: contentPadding 80-120px; never place critical text within 80px of edges.",
        "- Depth (HARD CONTRACT — no exceptions): EVERY scene must have 3 depth layers (z:0 background, z:10 content, z:100 foreground). UI showcase scenes MUST use one of: (a) <IsometricWrapper lift={12} shadowOpacity={0.35}> — preferred for dashboards/AppShell, (b) <TiltWrapper tiltX={-1.5} tiltY={2} glossy> — for card/panel showcases, (c) <DepthStack cameraRotateY={-12} cameraRotateX={2}> — for multi-panel layouts. Cursor layers MUST stay OUTSIDE these wrappers. Flat UI (no perspective wrapper) = automatic quality fail.",
        "- Background (MANDATORY): NEVER use a plain solid color as the only background layer. When STOCK_VIDEO_URL is set: use OffthreadVideo + overlay. When null: use LightArcBg (light) OR AbstractMotionBg (dark, mode matching scene emotion: hook/CTA=gradient-flow, problem=grid-pulse, showcase=particle-field). Plain black/dark fill with no texture = automatic quality fail.",
        "- Cursor: all cursor scenes must render CursorRenderer outside any camera/wrapper layers (cursor never tilts/scales).",
        "- Beat sync (MANDATORY): Use snapToDownbeat(approxFrame, MUSIC_BPM, fps) for ALL major element entrances — headlines, cards, metrics, notification toasts. MUSIC_BPM is already in scope. useBeat() for CTA button pulse. useBeatClock() for isDownbeat checks on bar transitions.",
        "- Continuity: keep the visual thread consistent; walkthrough sequences reuse the same AppShell/sidebar/topbar while motion and transitions stay story-motivated.",
        ...(briefGrammarLines.length > 0 ? ["", ...briefGrammarLines] : []),
      ].join("\n");

      const styleContractBlock = [
        "## STYLE CONTRACT (GLOBAL — do not drift scene to scene)",
        `- Typography energy: ${styleContract.typographyEnergy}`,
        `- Depth model: ${styleContract.depthModel}`,
        `- Lighting model: ${styleContract.lightingModel}`,
        `- Spacing density: ${styleContract.spacingDensity}`,
        `- Cursor personality: ${styleContract.cursorPersonality}`,
        `- Icon motion: ${styleContract.iconMotion}`,
        `- Surface treatment: ${styleContract.surfaceStyle}`,
      ].join("\n");

      const sceneGrammarBlock = [
        "## SCENE GRAMMAR (MANDATORY)",
        `- Narrative role: ${narrativeRole}`,
        `- Visual grammar role: ${visualGrammarRole}`,
        `- Motion language: ${motionLanguage}`,
        `- Interaction story mode: ${interactionStoryMode}`,
        "- The scene should feel like a deliberate story beat, not a generic app demo.",
      ].join("\n");

      // ── Emotional Direction (prepended from creative brief) ────────────────
      // The EMOTIONAL DIRECTION block comes first so the LLM coder knows the
      // feeling goal before reading any technical constraints.
      let emotionalDirectionBlock = "";
      if (creativeBrief) {
        const beat = creativeBrief.emotionalArc.find(b => b.beatIndex === i);
        if (beat) {
          const pacingDesc: Record<string, string> = {
            punch: "hit hard immediately, no warm-up, maximum urgency",
            breathe: "slow entrance, let the viewer absorb, expansive feeling",
            accelerate: "start slow then build speed, energy rises through the scene",
            silence: "minimal movement, near-silence before the reveal, tension through stillness",
            release: "cathartic expansion, warm colors flooding in, relief after tension",
          };
          emotionalDirectionBlock = [
            "## EMOTIONAL DIRECTION (from creative brief):",
            `The viewer should feel: "${beat.feeling}"`,
            `Pacing: ${beat.pacingWord} -- ${pacingDesc[beat.pacingWord] ?? beat.pacingWord}`,
            `Spatial position: ${creativeBrief.spatialWorld.scenePositions[i] ?? ""}`,
            "",
          ].join("\n");
        }
      }

      const scenePromptBody = typeof (s as any).prompt === "string" && (s as any).prompt.trim().length > 0
        ? (s as any).prompt.trim()
        : "";
      const isCursorScene = budgetedSkills.some((skill) =>
        skill === "premium-cursor-engine" || skill === "premium-chameleon-ui" || skill === "premium-interactive-ui",
      );
      const cursorJourneyBlock = isCursorScene && cursorJourney.length > 0
        ? [
            "## CURSOR JOURNEY (MANDATORY STORY BEATS)",
            "Use these exact narrative labels in order for the cursor steps. These override generic UI element names.",
            ...cursorJourney.map((step: string, index: number) => `Step ${index + 1}: ${step}`),
            "Each step badge / annotation / section header should reflect this narrative wording.",
          ].join("\n")
        : "";
      const journeyContextBlock = normalizedJourneyContext
        ? [
            "## JOURNEY CONTEXT (MANDATORY STORY ROLE)",
            `kind: ${normalizedJourneyContext.kind}`,
            `task: ${normalizedJourneyContext.narrativeTask}`,
            normalizedJourneyContext.sourceScreenDescription
              ? `current screen: ${normalizedJourneyContext.sourceScreenDescription}`
              : "",
            normalizedJourneyContext.nextAction
              ? `next action: ${normalizedJourneyContext.nextAction}${normalizedJourneyContext.transitionType ? ` (${normalizedJourneyContext.transitionType})` : ""}`
              : "",
            normalizedJourneyContext.targetScreenDescription
              ? `result/next screen: ${normalizedJourneyContext.targetScreenDescription}`
              : "",
            normalizedJourneyContext.featureName
              ? `feature area: ${normalizedJourneyContext.featureName}`
              : "",
            "Use this journey role to decide the animation purpose of the scene. The screenshot is only evidence; the narrative task is primary.",
          ].filter(Boolean).join("\n")
        : "";

      // Gap 2: Visual metaphor line for hook/problem scenes (prepended before house style)
      const metaphorLine =
        creativeBrief?.visualMetaphor && (intent === "hook" || intent === "problem")
          ? `## VISUAL METAPHOR (show this concept BEFORE any product UI appears):\n"${
              intent === "hook"
                ? creativeBrief.visualMetaphor.hook
                : creativeBrief.visualMetaphor.problem
            }"\nOpen with this visual concept. The product UI must not appear until the metaphor is established.\n`
          : "";

      const promptWithHouseStyle = [
        metaphorLine,
        emotionalDirectionBlock,
        styleContractBlock,
        sceneGrammarBlock,
        HOUSE_STYLE,
        journeyContextBlock,
        cursorJourneyBlock,
        scenePromptBody,
      ].filter(Boolean).join("\n\n").trim();

      return {
        ...s,
        prompt: promptWithHouseStyle,
        transition,
        skills: budgetedSkills,
        skillComposition: (s as any).skillComposition,
        intent,
        narrativeRole,
        visualGrammarRole,
        motionLanguage,
        interactionStoryMode,
        skillBudget,
        motionBudget,
        continuityRole,
        styleContract,
        durationInFrames: safeDuration,
        imageIndex: imageIdx,
        imageIndices,
        featureHeader,
        journeyContext: normalizedJourneyContext,
        cursorJourney: cursorJourney.length > 0 ? cursorJourney : undefined,
        interactionScript,
        uiSchema,
        emotionalIntent: s.emotionalIntent,
        isAhaMoment: s.isAhaMoment ?? false,
        stageDirection: s.stageDirection,
        visualAnchor: s.visualAnchor,
        musicVolume: effectiveMusicVolume,
        isWalkthroughScene: s.isWalkthroughScene,
        sectionLabel: s.sectionLabel,
        exitAnchor,
        macroZoom,
        stockFootage: s.stockFootage,
        videoGenerationPrompt: (s as any).videoGenerationPrompt,
        morphExport: s.morphExport,
        morphImport: s.morphImport,
        highlightWords,
        visualState: (s as any).visualState,
        musicMood,
      };
    });

    // ── Gap 1: Narrative contract enforcement ──────────────────────────────
    // Validates and auto-fixes hook emotion, AHA moment, and CTA urgency.
    // Backfills missing emotionalIntent from creative brief arc.
    const contractScenes = enforceNarrativeContract(scenes as unknown as import("@/types/generation").ScenePlan[], creativeBrief);
    console.log(
      "[contract] Final arc:",
      contractScenes.map((s) => `${(s as any).intent ?? "?"}/${(s as any).emotionalIntent ?? "?"}`).join(" → "),
    );

    // ── Auto-insert section-title dividers ─────────────────────────────────
    // When a video has 4+ showcase/cursor/walkthrough scenes AND the LLM didn't
    // already include any section-title scenes, inject them programmatically
    // between groups of showcase scenes so the video has chapter breathing room.
    const SHOWCASE_SKILLS = new Set([
      "premium-saas-showcase", "premium-cursor-engine", "premium-chameleon-ui",
      "premium-app-walkthrough", "premium-reconstructed-ui",
    ]);
    const showcaseCount = contractScenes.filter(s => s.skills?.some(sk => SHOWCASE_SKILLS.has(sk))).length;
    const alreadyHasSectionTitles = contractScenes.some(s => s.skills?.includes("premium-section-title"));

    const finalScenes = (showcaseCount >= 4 && !alreadyHasSectionTitles)
      ? injectSectionTitles(contractScenes as EnrichedScene[])
      : contractScenes;

    // ── Pexels dynamic stock video backgrounds ─────────────────────────────
    // For scenes with videoSearchQuery, fetch a contextually relevant HD video URL
    // from Pexels API in parallel (Tier 2 of the 3-tier background system).
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    if (pexelsApiKey) {
      const pexelsFetches = finalScenes.map(async (scene) => {
        const query = (scene as any).videoSearchQuery as string | undefined;
        if (!query?.trim()) return;
        try {
          const res = await fetch(
            `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=3`,
            { headers: { Authorization: pexelsApiKey } },
          );
          if (!res.ok) return;
          const data = await res.json() as { videos?: Array<{ video_files?: Array<{ link: string; quality: string }> }> };
          const videos = data.videos ?? [];
          if (!videos.length) return;
          // Prefer HD quality, fall back to first available
          const files = videos[0].video_files ?? [];
          const hd = files.find(f => f.quality === "hd") ?? files[0];
          if (hd?.link) (scene as any).stockFootage = hd.link;
        } catch {
          // Non-fatal: scene falls back to abstract motion background
        }
      });
      await Promise.all(pexelsFetches);
    }

    // ── Veo AI video generation fallback for live-action scenes ─────────────
    const veoFetches = finalScenes.map(async (scene) => {
      const veoPrompt = (scene as any).videoGenerationPrompt as string | undefined;
      const usesLiveAction = ((scene as any).skills ?? []).includes("premium-live-action-composite");
      if (!veoPrompt?.trim() || (scene as any).stockFootage || !usesLiveAction) return;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/veo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: veoPrompt,
            durationSeconds: Math.min(8, Math.round(((scene as any).durationInFrames ?? 150) / 30)),
          }),
        });
        if (!res.ok) return;
        const data = await res.json() as { url?: string; provider?: string };
        if (data.url) {
          (scene as any).stockFootage = data.url;
          console.log(`[veo] scene "${(scene as any).title}" got footage from ${data.provider ?? "veo"}`);
        }
      } catch {
        // Non-fatal — scene falls back to abstract motion background
      }
    });
    await Promise.all(veoFetches);

    console.log(
      "Narrative plan:",
      finalScenes.map((s) => `${s.title} (${(s.skills ?? []).join("+")}${s.imageIndex !== undefined ? `, img${s.imageIndex}` : ""}${s.journeyContext?.kind ? `, ${s.journeyContext.kind}` : ""}${(s as any).stockFootage ? " +video" : ""})`).join(" → "),
    );
    console.log("Final brand:", brand);

    const bgSkill = brand.style === "light" ? "premium-light-arc-bg" : undefined;
    // Light-theme B2B demos use "grid" by default (WhatAStory style — clean static grid lines).
    // "arcs" is reserved for brands that explicitly request a more dynamic feel.
    const globalBg = parsed.globalBg ?? (brand.style === "light" ? "grid" : "arcs");

    // ── Enforce morph portal scarcity (max 1 per video) ─────────────────────
    // Keep the first morphExport/morphImport usage; strip the rest.
    let morphCount = 0;
    const scenesWithSingleMorph = finalScenes.map((sc: any) => {
      if (sc?.morphExport || sc?.morphImport) {
        if (morphCount >= 1) {
          const { morphExport, morphImport, ...rest } = sc;
          return rest;
        }
        morphCount += 1;
      }
      return sc;
    });

    // ── Gap 2: MorphPortal coordination ────────────────────────────────────
    // Links orphaned morphExport→morphImport pairs and strips unmatched imports.
    const coordinatedScenes = coordinateMorphPortals(scenesWithSingleMorph as unknown as import("@/types/generation").ScenePlan[]);

    // ── Transition intelligence (intent boundaries) ─────────────────────────
    // Conservative rules: only set special transitions when high-confidence.
    const scenesWithIntentTransitions = coordinatedScenes.map((sc: any, idx: number) => {
      const prev = idx > 0 ? coordinatedScenes[idx - 1] : null;
      const prevIntent = prev?.intent as ScenePlanRaw["intent"] | undefined;
      const intent = sc?.intent as ScenePlanRaw["intent"] | undefined;
      // Problem → Solution pivot should feel like an event.
      if (prev && prevIntent === "problem" && intent === "solution") {
        // Use zoomThrough on the receiving scene; set exitAnchor on previous if missing.
        const next = { ...sc, transition: sc.transition === "cameraPan" || !sc.transition ? "zoomThrough" : sc.transition };
        if (!prev.exitAnchor) {
          prev.exitAnchor = { x: 0.62, y: 0.48 }; // safe default center-ish
        }
        return next;
      }
      // Proof → CTA: zoom into the CTA for maximum narrative impact.
      if (prev && prevIntent === "proof" && intent === "cta") {
        const next = { ...sc, transition: sc.transition === "cameraPan" || !sc.transition ? "zoomThrough" : sc.transition };
        if (!prev.exitAnchor) {
          prev.exitAnchor = { x: 0.5, y: 0.5 }; // center zoom into CTA
        }
        return next;
      }
      // Feature → Proof should feel like entering evidence mode, not just another lateral move.
      if (prev && prevIntent === "feature" && intent === "proof") {
        return { ...sc, transition: sc.transition && sc.transition !== "fade" ? sc.transition : "scale" };
      }
      return sc;
    });

    // ── Ensure FlowEdges exist for walkthrough continuations ────────────────
    // If planner didn't emit edges, create them for adjacent walkthrough scenes.
    const existingEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
    const edges = existingEdges.length
      ? existingEdges
      : coordinatedScenes
          .map((sc: any, idx: number) => {
            if (idx === 0) return null;
            const prev = coordinatedScenes[idx - 1];
            const isWalk = Boolean(sc?.isWalkthroughScene) || (sc?.skills ?? []).includes("premium-app-walkthrough") || (sc?.skills ?? []).includes("premium-multi-view-walkthrough");
            const prevIsWalk = Boolean(prev?.isWalkthroughScene) || (prev?.skills ?? []).includes("premium-app-walkthrough") || (prev?.skills ?? []).includes("premium-multi-view-walkthrough");
            if (!isWalk || !prevIsWalk) return null;
            return { from: idx - 1, to: idx, transition: "cameraPan", carryOver: { ui: true, camera: true } };
          })
          .filter(Boolean);

    const globalVisualThread = parsed.globalVisualThread ?? undefined;
    return new Response(JSON.stringify({ scenes: scenesWithIntentTransitions, brand, bgSkill, globalBg, globalVisualThread, styleContract: globalStyleContract, imageDescriptions: finalDescriptions, edges, creativeBrief: creativeBrief ?? null, backbone: narrativeBackbone ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Planning error:", error);

    // Surface quota / rate-limit errors with actionable messaging
    const msg = error instanceof Error ? error.message : String(error);
    const isQuota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
    const retryMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    const retrySec = retryMatch ? parseInt(retryMatch[1], 10) : null;

    const userMessage = isQuota
      ? `Google AI quota exceeded.${retrySec ? ` Retry in ${retrySec}s.` : ""} Add billing at aistudio.google.com or wait for your daily quota to reset.`
      : "Failed to generate video plan. Please try again.";

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: isQuota ? 429 : 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
