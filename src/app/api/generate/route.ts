// generate/route.ts

import {
  getCombinedSkillContent,
  SKILL_NAMES,
  type SkillName,
} from "../../../skills";

function toKnownSkillNames(ids: string[]): SkillName[] {
  return ids.filter((id): id is SkillName =>
    (SKILL_NAMES as readonly string[]).includes(id),
  );
}
import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

// Using a function to build the prompt to avoid complex template literal escaping issues
const buildSystemPrompt = () => {
  const b = "`"; // backtick constant for safe injection
  return `
## YOUR ROLE

You are an expert React/Remotion animation engineer at a premium motion graphics studio (WhatAStory / Sandwich Video tier). You are generating a **single self-contained scene component** that must feel like it was crafted by a senior motion designer.

## CHAIN OF COMMAND (CRITICAL)

This scene already comes with a planner-authored brief. You are the animation implementer, not the scene planner.

Priority order:
1. The scene prompt from the planner / creative director
2. narrativeRole / visualGrammarRole / motionLanguage / interactionStoryMode / style contract
3. journeyContext / cursorJourney / skillComposition / motion budget
4. The injected skill notes
5. The generic studio defaults below

If a generic default below conflicts with the scene brief, the scene brief wins.

## THE AGENCY DISCIPLINE MANDATES (CRITICAL)

You are no longer just "generating components." You are executing a strict **Cinematic Design System**. You MUST enforce these rules in every scene:

### 1. ELEMENT DISCIPLINE (HARD LIMIT)
- **Maximum 3 major visual groups** per scene. (Preferred: 1–2).
- **Definition of an element:** A headline block, a card group, a chart, or an icon cluster.
- If the planner explicitly asks for a richer product UI, preserve the UI shell but simplify supporting decoration first.

### 2. VISUAL HIERARCHY (MANDATORY)
Every scene MUST have an undeniable focus:
- **Primary element:** Dominant, largest scale, brightest contrast.
- **Secondary element:** Supporting, 60–70% scale, or muted opacity.
- *If hierarchy is flat or unclear, the scene is invalid.*

### 3. SCENE PURPOSE → VISUAL RULE
- **HOOK:** Abstract/emotional unless the scene brief explicitly says to open on product UI.
- **PROBLEM:** Chaotic, fragmented, visually unstable.
- **RECOGNITION / REVIEW:** Structured, calming down.
- **AHA MOMENT / RESULT:** Centered payoff, breathing room, clear transformation.
- **SHOWCASE / FEATURE:** Product-focused, clean UI, task-driven.
- **CTA:** Bold, simple, high contrast. Usually static or near-static unless the planner says otherwise.

### 4. CAMERA CHOREOGRAPHY
- Use camera movement only when it supports the scene's narrative task.
- If the planner supplies a motion language or interaction story mode, follow that over generic camera habits.
- If motionBudget is low, minimize camera movement.
- If the prompt references walkthrough / cursor / macro / zoom / cameraPan, obey that exactly.
- CTA scenes should usually be static or minimally animated.

### 5. SCENE INTERNAL ACTS (NON-NEGOTIABLE)
Follow this 3-act structure based on frame allocations:
- **Act 1: Setup (0–20%)**: Establish the world. ONE anchor element enters. Background reveals.
- **Act 2: Tension (20–75%)**: Elements enter sequentially (staggered 8–15f).
- **Act 3: Resolve (75–100%)**: ALL animation must stop. Let the springs settle. The hold IS the design.

## HIGH-DEPTH AGENCY GLASS FORMULA (MANDATORY)

Use the pre-built ${b}getGlassCard(BRAND)${b} helper — it handles all ternaries safely:

${b}${b}${b}tsx
const glassStyle = getGlassCard(BRAND); // preferred — no inline ternaries needed
// Optionally extend: { ...getGlassCard(BRAND), borderRadius: 32, boxShadow: SHADOWS.hero }
${b}${b}${b}

**NEVER write inline ternaries for glass** — the LLM frequently drops ${b}?${b} or ${b}:${b} branches on multi-line object properties, which breaks the JSX parser. Always use ${b}getGlassCard(BRAND)${b}.

## CURSOR & UI_SCHEMA BINDING (CRITICAL)
If UI_SCHEMA is present, you MUST derive cursor snap targets from UI_SCHEMA.interactions[*].box coordinates. Do not guess positions if the schema provides them.

## PRIORITY ORDER (NON-NEGOTIABLE)
1. Valid JavaScript/JSX that compiles (no TypeScript)
2. Use only names actually in scope (No imports)
3. Obey the planner's narrative task, journey role, and skill composition
4. Match Internal Act structure
5. Apply High-Depth Glass and SHADOWS standards

## SCOPE VARIABLES (ALL available — no imports needed, never re-declare these)

**Remotion:** \`useCurrentFrame\`, \`useVideoConfig\` (→ fps, width, height, durationInFrames), \`AbsoluteFill\`, \`Sequence\`, \`Audio\`, \`Img\`, \`OffthreadVideo\`, \`interpolate\`, \`interpolateColors\`, \`spring\`, \`random\`

**Spring presets:** \`SPRING_CONFIGS.entrance\` (damping:200, stiffness:120) · \`SPRING_CONFIGS.snap\` (damping:160, stiffness:220) · \`SPRING_CONFIGS.pop\` (damping:8, stiffness:150) · \`SPRING_CONFIGS.float\` (damping:22, stiffness:70) · \`SPRING_CONFIGS.cinematic\` (damping:200, stiffness:80)

**Shadows:** \`SHADOWS.low\` · \`SHADOWS.medium\` · \`SHADOWS.high\` · \`SHADOWS.darkGlass\` · \`SHADOWS.hero\`

**Glass:** \`getGlassCard(BRAND)\` — returns a complete glass card style object. NEVER write inline glass ternaries.

**Brand:** \`BRAND\` (bg, primary, secondary, surface, text, textMuted, border, font, style, musicStyle, logo)

**Hooks:** \`useBeat(bpm?)\` · \`useBeatClock()\` · \`useStagger(i, base, step)\` · \`useVitality(mode)\` · \`useHumanizedCursor(steps, travel)\` · \`usePreFocusCamera(x, y, arrivalFrame)\` · \`useInteractionCycle(steps)\` · \`useEntropyWithAttractor(strength, triggerFrame)\` · \`useMorphEntrance(morphFrom, toRect, startFrame)\`

**Layout components:** \`LightArcBg\` · \`CinematicCamera\` · \`GlowBloom\` · \`MaskedReveal\` · \`DepthStack\` · \`AmbientEnvironment\` · \`FilmGrain\` · \`AnimatedHighlighter\`

**UI components:** \`AppShell\` · \`AnimatedSidebar\` · \`AnimatedMetricCards\` · \`AnimatedTable\` · \`AnimatedChart\` · \`AnimatedForm\` · \`ReconstructedAppShell\` · \`TaskDetailPanel\` · \`ModalOverlay\` · \`SidebarNav\` · \`NotificationToast\` · \`StatusBadge\`

**Cursor/Interaction:** \`HAND_CURSOR\` (SVG string) · \`ChameleonInput\` · \`ChameleonHighlight\` · \`DropdownMenu\` · \`SfxSequencer\` · \`FeatureContextBar\` · \`MacroCamera\` · \`SelectiveFocus\`

**Injected per-scene constants (do NOT declare):** \`GLOBAL_BG\` · \`GLOBAL_FRAME_OFFSET\` · \`MUSIC_BPM\` · \`MUSIC_URL\` · \`BRAND_LOGO\` · \`COMPANY_LOGO\` (same URL as \`BRAND_LOGO\`) · \`INITIAL_CAMERA_ZOOM\` · \`INITIAL_CAMERA_PAN\` · \`ATTACHED_IMAGES\` (array) · \`VOICEOVER_AUDIO_URL\` · \`WORD_TIMINGS\` · \`UI_SCHEMA\` · \`VISUAL_STATE\` · \`VISUAL_ANCHOR\` · \`MORPH_FROM\` · \`STOCK_VIDEO_URL\` · \`FEATURE_HEADER\` · \`HIGHLIGHT_WORDS\` · \`PIPELINE_CURSOR_STEPS\` · \`SKILL_COMPOSITION\`

**OUTPUT CONTRACT:**
- Pure JavaScript JSX only. No TypeScript. No markdown. No explanations.
- Use only variables already in scope (listed above). No imports.
- Every \`const\`/\`let\`/\`var\` must be declared BEFORE its first use in the same scope.
- Dependency order is mandatory: declare base geometry / coordinates / target rects / frame constants first, then derived animation values that read them.
- If \`fooCoords\`, \`targetRect\`, \`focusPoint\`, \`ACT1_END\`, or similar values are used by another initializer, they MUST appear earlier in the file/component.
- Never declare the same local name twice in the same scope. Reuse the existing variable or rename it.
- Every bracket ${b}[${b}, ${b}{${b}, ${b}(${b} opened must be closed before the next ${b}const${b}/${b}let${b}/${b}var${b}.
- Ternary condition and ${b}?${b} must be on adjacent lines — NEVER put a comment between them.
- Last line of output: ${b}// EOF${b} — required for completion detection.
- Exactly ONE main component export: ${b}export const MyAnimation = () => { ... }${b}.
- Helper components allowed only BEFORE the main export.

---

## TYPOGRAPHY SCALE (MANDATORY)

| Role | fontSize | fontWeight | letterSpacing |
|---|---|---|---|
| Hero headline | **128–160px** | 900 | -0.05em |
| Scene headline | **80–108px** | 800–900 | -0.04em |
| Section title | **40–56px** | 700 | -0.02em |
| Body text | **22–32px** | 400–500 | -0.01em |

**CRITICAL:** NEVER use less than 72px for a scene headline. Headlines MUST fill the frame.

## CONTINUITY MANDATE

1. **VISUAL_STATE IS BINDING**: Read provided ${b}VISUAL_STATE${b} scope variable.
2. **Derive, Don't Guess**: Derive layout, camera, and UI from VISUAL_STATE.
3. **MANDATORY Boilerplate** — copy exactly, no changes:
   ${b}${b}${b}js
   const frame = useCurrentFrame();
   const { width, height, fps, durationInFrames } = useVideoConfig();
   const prev = VISUAL_STATE;
   const ui = prev?.ui ?? {};
   const camera = prev?.camera ?? { zoom: INITIAL_CAMERA_ZOOM || 1.0, pan: INITIAL_CAMERA_PAN || {x:0, y:0} };
   ${b}${b}${b}

## SCOPE VARIABLE RULES (CRASH PREVENTION)

- **NEVER re-declare** ${b}useCurrentFrame${b}, ${b}spring${b}, ${b}interpolate${b}, ${b}BRAND${b}, ${b}SHADOWS${b}, or any other injected scope name with ${b}const${b}/${b}let${b}/${b}var${b}. They are already parameters — redeclaring causes a TDZ crash.
- **${b}frame${b} is NOT in scope** — the FIRST LINE of every component MUST be ${b}const frame = useCurrentFrame();${b}. No exceptions. Never use ${b}frame${b} before this line.
- **${b}defaultUI${b} does NOT exist** — never reference it. Use ${b}UI_SCHEMA ?? {}${b} or ${b}prev?.ui ?? {}${b} instead.
- **Glass — use ${b}getGlassCard(BRAND)${b}** — never write inline glass ternaries. They cause parse errors.
- **Declaration order is binding** — coordinates, target positions, geometry boxes, timing constants, and any derived spring/interpolate values must be declared in dependency order. Never write ${b}const rippleScale = targetCoords.x * ...${b} before ${b}targetCoords${b} exists.
- **No duplicate locals** — if you already declared ${b}const ripple1Scale${b}, do not declare it again later in the same scope.

## FINAL SELF-AUDIT CHECKLIST (VERIFY BEFORE OUTPUT)

1. **Element Count:** Do I have > 3 elements? If yes, REMOVE the least important.
2. **Safe Zone:** Is every element at least 80px away from the edges?
3. **Hierarchy:** Is primary focus undeniable?
4. **Internal Acts:** Does all animation stop exactly at the Resolve Act start?
5. **High-Depth Glass:** Are cards using ${b}SHADOWS.high${b} or ${b}SHADOWS.darkGlass${b}?
6. **Syntactic Integrity:** First line of component is ${b}const frame = useCurrentFrame();${b}? All brackets matched?
7. **${b}// EOF${b}** is the ABSOLUTE LAST LINE — after ALL closing braces ${b}}${b} and ${b}};${b}.

// EOF
`;
};

const SYSTEM_PROMPT = buildSystemPrompt();

const FOLLOW_UP_SYSTEM_PROMPT = `
You are an expert at making targeted edits to React/Remotion animation components.

Given the current code and a user request, decide whether to:
1. Use targeted edits (for small, specific changes)
2. Provide full replacement code (for major restructuring)

## EDIT FORMAT
For targeted edits, each edit needs:
- old_string: The EXACT string to find
- new_string: The replacement string

CRITICAL:
- old_string must match the code EXACTLY character-for-character
- Include enough surrounding context to make old_string unique
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EditOperation = {
  description: string;
  old_string: string;
  new_string: string;
  lineNumber?: number;
};

type SkillCompositionInput = {
  primary?: string;
  secondary?: string[];
  modifiers?: string[];
} | null | undefined;

const BACKGROUND_SKILLS = new Set([
  "premium-light-arc-bg",
  "premium-light-textured-bg",
  "premium-dot-matrix-bg",
  "premium-multi-corner-gradient",
  "premium-ambient-environment",
]);

const SAFE_SECONDARY_SKILL_MAP: Record<string, string[]> = {
  "premium-reconstructed-ui": [
    "premium-cursor-engine",
    "premium-chameleon-ui",
    "premium-macro-closeup",
    "premium-narrative-overlay",
    "premium-animated-topbar",
  ],
  "premium-cursor-engine": [
    "premium-macro-closeup",
    "premium-narrative-overlay",
    "premium-notification-toast",
    "premium-tactile-feedback",
  ],
  "premium-chameleon-ui": [
    "premium-macro-closeup",
    "premium-notification-toast",
    "premium-narrative-overlay",
    "premium-tactile-feedback",
  ],
  "premium-multi-view-walkthrough": [
    "premium-cursor-engine",
    "premium-chameleon-ui",
    "premium-narrative-overlay",
    "premium-animated-topbar",
  ],
  "premium-app-walkthrough": [
    "premium-cursor-engine",
    "premium-chameleon-ui",
    "premium-narrative-overlay",
  ],
  "premium-device-mockup": [
    "premium-camera-zoom",
    "premium-macro-closeup",
    "premium-narrative-overlay",
  ],
  "premium-cta-scene": [
    "premium-narrative-overlay",
    "premium-ink-logo-reveal",
    "premium-gradient-hero",
  ],
};

function arbitrateSkills(
  forcedSkills: string[] | undefined,
  previouslyUsedSkills: string[] | undefined,
  skillComposition: SkillCompositionInput,
): { selectedSkills: string[]; backgroundSkills: string[]; notes: string[] } {
  const requested = (forcedSkills && forcedSkills.length > 0 ? forcedSkills : (previouslyUsedSkills ?? []))
    .filter((skill): skill is string => typeof skill === "string" && skill.trim().length > 0);
  const uniqueRequested = Array.from(new Set(requested));
  const primary = typeof skillComposition?.primary === "string" ? skillComposition.primary : uniqueRequested[0];
  const preferredSecondary = Array.isArray(skillComposition?.secondary) ? skillComposition!.secondary : [];
  const requestedBackground = uniqueRequested.filter((skill) => BACKGROUND_SKILLS.has(skill));
  const compatibleSecondaries = primary ? (SAFE_SECONDARY_SKILL_MAP[primary] ?? []) : [];
  const notes: string[] = [];

  const selectedSkills: string[] = [];
  if (primary) selectedSkills.push(primary);

  for (const secondary of preferredSecondary) {
    if (selectedSkills.includes(secondary) || BACKGROUND_SKILLS.has(secondary)) continue;
    if (compatibleSecondaries.length > 0 && !compatibleSecondaries.includes(secondary)) {
      notes.push(`Dropped incompatible secondary skill "${secondary}" for primary "${primary}"`);
      continue;
    }
    selectedSkills.push(secondary);
    if (selectedSkills.length >= 3) break;
  }

  for (const skill of uniqueRequested) {
    if (selectedSkills.includes(skill) || BACKGROUND_SKILLS.has(skill)) continue;
    if (primary && compatibleSecondaries.length > 0 && !compatibleSecondaries.includes(skill)) {
      notes.push(`Dropped non-compatible skill "${skill}" for primary "${primary}"`);
      continue;
    }
    selectedSkills.push(skill);
    if (selectedSkills.length >= 3) break;
  }

  const backgroundSkills = requestedBackground.slice(0, 1);
  if (requestedBackground.length > 1) {
    notes.push(`Reduced background skills from ${requestedBackground.length} to 1`);
  }

  return {
    selectedSkills: Array.from(new Set(selectedSkills)).slice(0, 3),
    backgroundSkills,
    notes,
  };
}

function getLineNumber(code: string, searchString: string): number {
  const index = code.indexOf(searchString);
  if (index === -1) return -1;
  return code.substring(0, index).split("\n").length;
}

function applyEdits(
  code: string,
  edits: EditOperation[],
): {
  success: boolean;
  result: string;
  error?: string;
  enrichedEdits?: EditOperation[];
  failedEdit?: EditOperation;
} {
  let result = code;
  const enrichedEdits: EditOperation[] = [];

  for (const edit of edits) {
    const { old_string, new_string } = edit;
    const index = result.indexOf(old_string);

    if (index === -1) {
      return { success: false, result: code, error: `Could not find exact string: ${old_string.slice(0, 50)}...`, failedEdit: edit };
    }

    // Check for multiple occurrences
    const lastIndex = result.lastIndexOf(old_string);
    if (index !== lastIndex) {
      return { success: false, result: code, error: `Found multiple occurrences of string: ${old_string.slice(0, 50)}...`, failedEdit: edit };
    }

    const lineNumber = getLineNumber(result, old_string);
    enrichedEdits.push({ ...edit, lineNumber });
    result = result.substring(0, index) + new_string + result.substring(index + old_string.length);
  }

  return { success: true, result, enrichedEdits };
}

function isTransientProviderError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? (error as { status?: unknown }).status : undefined;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return (
    status === 429 ||
    status === 503 ||
    /UNAVAILABLE|RESOURCE_EXHAUSTED|rate limit|high demand|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|Connect Timeout Error|fetch failed|ECONNRESET|socket hang up/i.test(message)
  );
}

function providerStatusFromError(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = "status" in error ? (error as { status?: unknown }).status : undefined;
  return typeof status === "number" ? status : null;
}

async function withProviderBackoff<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [1200, 3000];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientProviderError(error) || attempt === delays.length) {
        throw error;
      }
      const delay = delays[attempt];
      console.warn(`[generate] ${label} transient provider error, retrying in ${delay}ms (attempt ${attempt + 1}/${delays.length + 1})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const {
      prompt,
      model,
      isFollowUp,
      currentCode,
      frameImages,
      forcedSkills,
      previouslyUsedSkills,
      skillComposition,
      visualState,
      visualAnchor,
      initialCameraZoom,
      initialCameraPan,
    } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API Key");

    const ai = new GoogleGenAI({ apiKey });

    // ── Mode 1: Targeted Edits (JSON) ──────────────────────────────────────
    if (isFollowUp && currentCode) {
      const editPrompt = `
CURRENT CODE:
\\\`\\\`\\\`js
${currentCode}
\\\`\\\`\\\`

USER REQUEST: ${prompt}

Decide if you can use surgical edits or need a full replacement.
Return JSON:
{
  "type": "edit",
  "summary": "Short description of changes",
  "edits": [ { "description": "...", "old_string": "...", "new_string": "..." } ]
}
OR
{
  "type": "full",
  "summary": "Short description",
  "code": "..."
}
`;

      const result = await withProviderBackoff(
        () => ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: editPrompt }] }],
          config: {
            systemInstruction: FOLLOW_UP_SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
        }),
        "follow-up generation",
      );

      const decision = JSON.parse(result.text ?? "{}");
      if (decision.type === "edit") {
        const editResult = applyEdits(currentCode, decision.edits);
        if (editResult.success) {
          return Response.json({ code: editResult.result, summary: decision.summary, edits: editResult.enrichedEdits });
        }
        // Fallback to full replacement if edit fails
        return Response.json({ code: decision.code || currentCode, summary: "Edit failed, returning full code", error: editResult.error });
      }
      return Response.json({ code: decision.code, summary: decision.summary });
    }

    // ── Mode 2: Initial Generation (SSE) ────────────────────────────────────
    const arbitration = arbitrateSkills(forcedSkills, previouslyUsedSkills, skillComposition);
    const skillsToInject = arbitration.selectedSkills;

    const skillsContent = getCombinedSkillContent(
      toKnownSkillNames([...skillsToInject, ...arbitration.backgroundSkills]),
    );

    const fullSystemPrompt = `${SYSTEM_PROMPT}

## AVAILABLE PREMIUM SKILLS (CONTEXT):
${skillsContent}

## INJECTED CONTEXT:
SKILL_COMPOSITION = ${JSON.stringify(skillComposition)}
ACTIVE_SKILLS = ${JSON.stringify(arbitration.selectedSkills)}
BACKGROUND_SKILLS = ${JSON.stringify(arbitration.backgroundSkills)}
SKILL_ARBITRATION_NOTES = ${JSON.stringify(arbitration.notes)}
VISUAL_STATE = ${JSON.stringify(visualState)}
VISUAL_ANCHOR = ${JSON.stringify(visualAnchor)}
INITIAL_CAMERA_ZOOM = ${initialCameraZoom || 1.0}
INITIAL_CAMERA_PAN = ${JSON.stringify(initialCameraPan || { x: 0, y: 0 })}

## SKILL EXECUTION RULES
- Treat ACTIVE_SKILLS as the only scene-defining skills.
- If BACKGROUND_SKILLS is non-empty, use it only as atmosphere/background, never as the primary layout.
- Follow SKILL_COMPOSITION.primary as the layout owner.
- Secondary skills may enhance the scene, but must never override the planner's narrative task.
- If two skills suggest conflicting layouts or camera behavior, follow the primary skill and ignore the conflicting instruction.
`;

    const modelId = model.split(":")[0] || "gemini-2.5-flash";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const genStream = await withProviderBackoff(
            () => ai.models.generateContentStream({
              model: modelId,
              contents: [{
                role: "user",
                parts: [
                  { text: prompt },
                  ...(frameImages ?? []).map((img: string) => ({
                    inlineData: { mimeType: "image/jpeg", data: img.split(",")[1] },
                  })),
                ],
              }],
              config: {
                systemInstruction: fullSystemPrompt,
              }
            }),
            "scene generation stream",
          );

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "metadata", skills: skillsToInject, backgroundSkills: arbitration.backgroundSkills, skillNotes: arbitration.notes })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-start" })}\n\n`));

          for await (const chunk of genStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-delta", delta: text })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("SSE Generation Error:", err);
          const status = providerStatusFromError(err) ?? 503;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", status, message: err instanceof Error ? err.message : "Scene generation failed" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (err: unknown) {
    console.error("Generate Route Error:", err);
    const status = typeof err === "object" && err !== null && "status" in err && typeof (err as { status?: unknown }).status === "number"
      ? (err as { status: number }).status
      : 500;
    const message = err instanceof Error ? err.message : "Scene generation failed";
    return Response.json({ error: message, status }, { status });
  }
}
