import {
  getCombinedSkillContent,
  SKILL_DETECTION_PROMPT,
  SKILL_NAMES,
  type SkillName,
} from "@/skills";
import { GoogleGenAI, Type } from "@google/genai";

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const VALIDATION_PROMPT = `You are a prompt classifier for a motion graphics generation tool.

Determine if the user's prompt is asking for motion graphics/animation content that can be created as a React/Remotion component.

VALID prompts include requests for:
- Animated text, titles, or typography
- Data visualizations (charts, graphs, progress bars)
- UI animations (buttons, cards, transitions)
- Logo animations or brand intros
- Social media content (stories, reels, posts)
- Explainer animations
- Kinetic typography
- Abstract motion graphics
- Animated illustrations
- Product showcases
- Countdown timers
- Loading animations
- Any visual/animated content

INVALID prompts include:
- Questions (e.g., "What is 2+2?", "How do I...")
- Requests for text/written content (poems, essays, stories, code explanations)
- Conversations or chat
- Non-visual tasks (calculations, translations, summaries)
- Requests completely unrelated to visual content

Return true if the prompt is valid for motion graphics generation, false otherwise.`;

const SYSTEM_PROMPT = `
You are an expert at generating agency-quality React components for Remotion animations.
Your output must look like it was made by a premium motion graphics studio.

## COMPONENT STRUCTURE

1. Start with ES6 imports
2. Export as: export const MyAnimation = () => { ... };
3. Component body order:
   - Hooks (useCurrentFrame, useVideoConfig)
   - Constants (COLORS, TEXT, TIMING, LAYOUT) — UPPER_SNAKE_CASE, defined INSIDE the component
   - Calculations and derived values
   - Return JSX

## BRAND DESIGN SYSTEM (CRITICAL — read first)

If the prompt contains a "## BRAND DESIGN SYSTEM" block, you MUST use those exact values everywhere:
- bg → AbsoluteFill backgroundColor and all scene backgrounds (never deviate)
- primary → CTA buttons, key accents, active UI, glow colors, progress fills
- secondary → secondary panels, complementary accents, hover states
- surface → glass card background (copy exactly — it already has the right opacity)
- text → ALL headline and label text color
- textMuted → subtitles, captions, metadata labels
- border → glass card borders, divider lines
- font → fontFamily on every text element

Deviating from these values produces an off-brand, amateur result. Do not invent new colors.

## SPRING CONFIG PRESETS (use these — NOT Remotion defaults)

Remotion's default spring (damping:100) looks clinical. Use:
- Entrance (cards, text blocks): spring({ frame, fps, config: { damping: 14, stiffness: 100 } })
- Floating device loop: spring({ frame, fps, config: { damping: 22, stiffness: 70 } })
- Quick pop (badges, icons): spring({ frame, fps, config: { damping: 10, stiffness: 150 } })
- Cinematic camera: spring({ frame, fps, config: { damping: 28, stiffness: 60 } })

## EASING PATTERNS (always add easing to visible interpolations)

Never use bare interpolate(frame, [0,90], [0,1]) for visible motion.
Always add easing or use spring():
\`\`\`tsx
// Ease-out cubic — counters, reveals, progress fills
easing: (t) => 1 - Math.pow(1 - t, 3)

// Ease-in-out cubic — camera moves, dividers, transitions
easing: (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2

// Ease-in quad — exits, fade-outs
easing: (t) => t * t
\`\`\`

## GLASS CARD PATTERN (use for all UI cards on dark backgrounds)

\`\`\`tsx
// Standard glass card — copy exactly:
{
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20,
  boxShadow: "0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
}
// Replace rgba values with brand.surface / brand.border when a brand block is present
\`\`\`

## ATTACHED IMAGES (CRITICAL — mandatory when present)

ATTACHED_IMAGES is an array of the user's real product screenshots.
Do NOT declare or import ATTACHED_IMAGES — it is already in scope.

When ATTACHED_IMAGES.length > 0, you MUST:
1. Display ATTACHED_IMAGES[0] inside a polished device shell (laptop, browser window, or phone)
2. NEVER show a blank or simulated UI when the real screenshot is available
3. Use: style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top" }}

Correct guard pattern:
\`\`\`tsx
{ATTACHED_IMAGES[0] ? (
  <img src={ATTACHED_IMAGES[0]} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top" }} />
) : (
  <div style={{ width:"100%", height:"100%", background:"#0f172a" }} />  // fallback only
)}
\`\`\`

## PERFORMANCE RULES

- Add willChange: "transform" on elements that animate every frame (device floats, orbs)
- Do NOT animate filter: blur() per frame — use a fixed blur on static depth layers
- Use transform for all movement — never animate top/left/width/height
- For text counters: fontVariantNumeric: "tabular-nums" prevents layout shift

## LAYOUT RULES

- Use full width/height — never constrain content to a small centered box
- Use Math.max(minPx, Math.round(width * fraction)) for responsive sizing
- AbsoluteFill backgroundColor must be set from frame 0 — never fade in backgrounds

## AVAILABLE IMPORTS

\`\`\`tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring, Sequence } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Circle, Rect, Triangle, Star, Ellipse, Pie } from "@remotion/shapes";
import { ThreeCanvas } from "@remotion/three";
import { useState, useEffect } from "react";
\`\`\`

## PRE-BUILT SCOPE CONSTANTS (already in scope — do NOT re-declare)

These are injected into every generated component automatically. Using them avoids
boilerplate and guarantees consistency:

- **GLASS_CARD** — ready-made glass card style object
  \`\`\`tsx
  style={{ ...GLASS_CARD, padding: 32 }}
  // Replace rgba values with brand.surface / brand.border when brand block is present
  \`\`\`
- **SPRING_CONFIGS** — { entrance, float, pop, cinematic } — named presets for spring()
  \`\`\`tsx
  spring({ frame, fps, config: SPRING_CONFIGS.entrance })
  spring({ frame, fps, config: SPRING_CONFIGS.pop })
  \`\`\`
- **EASINGS** — { easeOutCubic, easeInOutCubic, easeInQuad } — easing functions
  \`\`\`tsx
  interpolate(frame, [0, 60], [0, 1], { easing: EASINGS.easeOutCubic, extrapolateRight: "clamp" })
  \`\`\`
- **Audio** — Remotion Audio component for background music and SFX (do NOT import it)
  \`\`\`tsx
  <Audio src="https://..." volume={0.4} loop />
  \`\`\`
- **KanbanBoard** — pre-built task board; pass columns + brand
  \`\`\`tsx
  <KanbanBoard columns={[{ label: "Backlog", cards: ["Task A"] }]} brand={BRAND} />
  \`\`\`
- **AnalyticsDashboard** — pre-built KPI cards + bar chart; pass kpis, bars, brand
  \`\`\`tsx
  <AnalyticsDashboard kpis={[{ label: "MRR", value: "$48K", delta: "+12%", up: true }]} bars={[{ label: "Mon", value: 0.6 }]} brand={BRAND} />
  \`\`\`
- **CodeEditorPanel** — pre-built code editor + terminal; pass lines, terminalLines, brand
  \`\`\`tsx
  <CodeEditorPanel lines={[{ text: 'const x = 1;' }]} terminalLines={[{ text: '→ Done', color: "#22c55e" }]} brand={BRAND} />
  \`\`\`
- **DataTable** — pre-built data grid; pass columns, rows, statusColors, brand
  \`\`\`tsx
  <DataTable columns={["Name", "Status"]} rows={[{ cells: ["Acme", "Active"], statusIndex: 1 }]} statusColors={{ Active: "#22c55e" }} brand={BRAND} />
  \`\`\`

## RESERVED NAMES (CRITICAL — never shadow these)

spring, interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence,
ATTACHED_IMAGES, GLASS_CARD, SPRING_CONFIGS, EASINGS, Audio, BRAND,
KanbanBoard, AnalyticsDashboard, CodeEditorPanel, DataTable

## OUTPUT FORMAT (CRITICAL)

- Output ONLY code — no explanations, no markdown fences, no questions
- Response must start with "import" and end with "};"
- Make ambitious, high-quality creative choices — do not produce minimal/generic output

`;

const FOLLOW_UP_SYSTEM_PROMPT = `
You are an expert at making targeted edits to React/Remotion animation components.

Given the current code and a user request, decide whether to:
1. Use targeted edits (for small, specific changes)
2. Provide full replacement code (for major restructuring)

## WHEN TO USE TARGETED EDITS (type: "edit")
- Changing colors, text, numbers, timing values
- Adding or removing a single element
- Modifying styles or properties
- Small additions (new variable, new element)
- Changes affecting <30% of the code

## WHEN TO USE FULL REPLACEMENT (type: "full")
- Completely different animation style
- Major structural reorganization
- User asks to "start fresh" or "rewrite"
- Changes affect >50% of the code

## EDIT FORMAT
For targeted edits, each edit needs:
- old_string: The EXACT string to find (including whitespace/indentation)
- new_string: The replacement string

CRITICAL:
- old_string must match the code EXACTLY character-for-character
- Include enough surrounding context to make old_string unique
- If multiple similar lines exist, include more surrounding code
- Preserve indentation exactly as it appears in the original

## PRESERVING USER EDITS
If the user has made manual edits, preserve them unless explicitly asked to change.
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

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const { old_string, new_string, description } = edit;

    if (!result.includes(old_string)) {
      return {
        success: false,
        result: code,
        error: `Edit ${i + 1} failed: Could not find the specified text`,
        failedEdit: edit,
      };
    }

    const matches = result.split(old_string).length - 1;
    if (matches > 1) {
      return {
        success: false,
        result: code,
        error: `Edit ${i + 1} failed: Found ${matches} matches. The edit target is ambiguous.`,
        failedEdit: edit,
      };
    }

    const lineNumber = getLineNumber(result, old_string);
    result = result.replace(old_string, new_string);
    enrichedEdits.push({ description, old_string, new_string, lineNumber });
  }

  return { success: true, result, enrichedEdits };
}

/** Parse a base64 data URL into mimeType + raw base64 data */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/** Build a Google content parts array from text + optional base64 images */
function buildParts(
  text: string,
  images?: string[],
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text }];
  if (images?.length) {
    for (const img of images) {
      const parsed = parseDataUrl(img);
      if (parsed) parts.push({ inlineData: parsed });
    }
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface ConversationContextMessage {
  role: "user" | "assistant";
  content: string;
  attachedImages?: string[];
}

interface ErrorCorrectionContext {
  error: string;
  attemptNumber: number;
  maxAttempts: number;
  failedEdit?: {
    description: string;
    old_string: string;
    new_string: string;
  };
}

interface GenerateRequest {
  prompt: string;
  model?: string;
  currentCode?: string;
  conversationHistory?: ConversationContextMessage[];
  isFollowUp?: boolean;
  hasManualEdits?: boolean;
  errorCorrection?: ErrorCorrectionContext;
  previouslyUsedSkills?: string[];
  frameImages?: string[];
  forcedSkills?: string[];
}

interface GenerateResponse {
  code: string;
  summary: string;
  metadata: {
    skills: string[];
    editType: "tool_edit" | "full_replacement";
    edits?: EditOperation[];
    model: string;
  };
}

// Map thinking effort label to token budget
const THINKING_BUDGETS: Record<string, number> = {
  low: 1024,
  medium: 8192,
  high: 24576,
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const {
    prompt,
    model = "gemini-3-flash-preview",
    currentCode,
    conversationHistory = [],
    isFollowUp = false,
    hasManualEdits = false,
    errorCorrection,
    previouslyUsedSkills = [],
    frameImages,
    forcedSkills,
  }: GenerateRequest = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          'The environment variable "GOOGLE_GENERATIVE_AI_API_KEY" is not set. Add it to your .env file and try again.',
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const [modelName, thinkingEffort] = model.split(":");
  const thinkingBudget = thinkingEffort ? THINKING_BUDGETS[thinkingEffort] : undefined;

  const ai = new GoogleGenAI({ apiKey });

  // Fast model for quick classification (validation + skill detection)
  // gemini-2.5-flash has a confirmed free tier (1500 req/day)
  const FAST_MODEL = "gemini-2.5-flash";

  // -------------------------------------------------------------------------
  // 1. Validate the prompt (initial generation only, skip when skill is forced)
  // -------------------------------------------------------------------------
  if (!isFollowUp && !forcedSkills?.length) {
    try {
      const valResult = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: [{ role: "user", parts: [{ text: `User prompt: "${prompt}"` }] }],
        config: {
          systemInstruction: VALIDATION_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { valid: { type: Type.BOOLEAN } },
            required: ["valid"],
          },
        },
      });
      const { valid } = JSON.parse(valResult.text ?? "{}");
      if (!valid) {
        return new Response(
          JSON.stringify({
            error:
              "No valid motion graphics prompt. Please describe an animation or visual content you'd like to create.",
            type: "validation",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    } catch (validationError) {
      console.error("Validation error:", validationError);
      // Allow through on error rather than blocking
    }
  }

  // -------------------------------------------------------------------------
  // 2. Detect applicable skills (skip if forcedSkills provided)
  // -------------------------------------------------------------------------
  let detectedSkills: SkillName[] = [];
  if (forcedSkills && forcedSkills.length > 0) {
    // Use forced skills directly (from narrative planner) — skip AI re-detection
    detectedSkills = forcedSkills.filter((s) =>
      (SKILL_NAMES as readonly string[]).includes(s),
    ) as SkillName[];
    console.log("Using forced skills:", detectedSkills);
  } else {
    try {
      const skillResult = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: [{ role: "user", parts: [{ text: `User prompt: "${prompt}"` }] }],
        config: {
          systemInstruction: SKILL_DETECTION_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["skills"],
          },
        },
      });
      const parsed = JSON.parse(skillResult.text ?? "{}");
      detectedSkills = ((parsed.skills as string[]) ?? []).filter((s) =>
        (SKILL_NAMES as readonly string[]).includes(s),
      ) as SkillName[];
      console.log("Detected skills:", detectedSkills);
    } catch (skillError) {
      console.error("Skill detection error:", skillError);
    }
  }

  // Filter out previously used skills to avoid redundant context
  const newSkills = detectedSkills.filter(
    (skill) => !previouslyUsedSkills.includes(skill),
  );

  const skillContent = getCombinedSkillContent(newSkills);
  const enhancedSystemPrompt = skillContent
    ? `${SYSTEM_PROMPT}\n\n## SKILL-SPECIFIC GUIDANCE\n${skillContent}`
    : SYSTEM_PROMPT;

  // -------------------------------------------------------------------------
  // 3. Follow-up edit mode (non-streaming, structured JSON response)
  // -------------------------------------------------------------------------
  if (isFollowUp && currentCode) {
    try {
      // Build conversation context string
      const contextMessages = conversationHistory.slice(-6);
      let conversationContext = "";
      if (contextMessages.length > 0) {
        conversationContext =
          "\n\n## RECENT CONVERSATION:\n" +
          contextMessages
            .map((m) => {
              const imageNote =
                m.attachedImages && m.attachedImages.length > 0
                  ? ` [with ${m.attachedImages.length} attached image${m.attachedImages.length > 1 ? "s" : ""}]`
                  : "";
              return `${m.role.toUpperCase()}: ${m.content}${imageNote}`;
            })
            .join("\n");
      }

      const manualEditNotice = hasManualEdits
        ? "\n\nNOTE: The user has made manual edits to the code. Preserve these changes."
        : "";

      let errorCorrectionNotice = "";
      if (errorCorrection) {
        const failedEditInfo = errorCorrection.failedEdit
          ? `\n\nThe previous edit attempt failed. Here's what was tried:\n- Description: ${errorCorrection.failedEdit.description}\n- Tried to find: \`${errorCorrection.failedEdit.old_string}\`\n- Wanted to replace with: \`${errorCorrection.failedEdit.new_string}\`\n\nThe old_string was either not found or matched multiple locations. You MUST include more surrounding context to make the match unique.`
          : "";

        const isEditFailure =
          errorCorrection.error.includes("Edit") &&
          errorCorrection.error.includes("failed");

        errorCorrectionNotice = isEditFailure
          ? `\n\n## EDIT FAILED (ATTEMPT ${errorCorrection.attemptNumber}/${errorCorrection.maxAttempts})\n${errorCorrection.error}${failedEditInfo}\n\nCRITICAL: Include MORE surrounding code context in old_string to make it unique.`
          : `\n\n## COMPILATION ERROR (ATTEMPT ${errorCorrection.attemptNumber}/${errorCorrection.maxAttempts})\nThe previous code failed to compile:\n\`\`\`\n${errorCorrection.error}\n\`\`\`\n\nFix this error only. Do not make other changes.`;
      }

      const editPromptText = `## CURRENT CODE:\n\`\`\`tsx\n${currentCode}\n\`\`\`${conversationContext}${manualEditNotice}${errorCorrectionNotice}\n\n## USER REQUEST:\n${prompt}${frameImages && frameImages.length > 0 ? `\n\n(See the attached ${frameImages.length === 1 ? "image" : "images"} for visual reference)` : ""}

Analyze the request and decide: use targeted edits (type: "edit") for small changes, or full replacement (type: "full") for major restructuring.`;

      console.log("Follow-up edit — model:", modelName, "skills:", detectedSkills.join(", ") || "general");

      const editResult = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: buildParts(editPromptText, frameImages) }],
        config: {
          systemInstruction: FOLLOW_UP_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: 'Use "edit" for small targeted changes, "full" for major restructuring',
              },
              summary: {
                type: Type.STRING,
                description: "Brief 1-sentence summary of changes made",
              },
              edits: {
                type: Type.ARRAY,
                description: "Required when type is edit",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    old_string: { type: Type.STRING, description: "Exact string to find" },
                    new_string: { type: Type.STRING, description: "Replacement string" },
                  },
                  required: ["description", "old_string", "new_string"],
                },
              },
              code: {
                type: Type.STRING,
                description: "Required when type is full: complete replacement code",
              },
            },
            required: ["type", "summary"],
          },
          ...(thinkingBudget !== undefined && {
            thinkingConfig: { thinkingBudget },
          }),
        },
      });

      const response = JSON.parse(editResult.text ?? "{}") as {
        type: "edit" | "full";
        summary: string;
        edits?: EditOperation[];
        code?: string;
      };

      let finalCode: string;
      let editType: "tool_edit" | "full_replacement";
      let appliedEdits: EditOperation[] | undefined;

      if (response.type === "edit" && response.edits) {
        const result = applyEdits(currentCode, response.edits);
        if (!result.success) {
          return new Response(
            JSON.stringify({ error: result.error, type: "edit_failed", failedEdit: result.failedEdit }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        finalCode = result.result;
        editType = "tool_edit";
        appliedEdits = result.enrichedEdits;
        console.log(`Applied ${response.edits.length} edit(s) successfully`);
      } else if (response.type === "full" && response.code) {
        finalCode = response.code;
        editType = "full_replacement";
        console.log("Using full code replacement");
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid AI response: missing required fields", type: "edit_failed" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const responseData: GenerateResponse = {
        code: finalCode,
        summary: response.summary,
        metadata: { skills: detectedSkills, editType, edits: appliedEdits, model: modelName },
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in follow-up edit:", error);
      return new Response(
        JSON.stringify({ error: "Something went wrong while processing the edit request." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Initial generation — streaming
  // -------------------------------------------------------------------------
  try {
    const hasImages = frameImages && frameImages.length > 0;
    const initialPromptText = hasImages
      ? `${prompt}\n\n(See the attached ${frameImages.length === 1 ? "image" : "images"} for visual reference)`
      : prompt;

    console.log(
      "Generating — model:", modelName,
      "skills:", detectedSkills.join(", ") || "general",
      thinkingBudget !== undefined ? `thinking: ${thinkingBudget}` : "",
      hasImages ? `images: ${frameImages.length}` : "",
    );

    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ role: "user", parts: buildParts(initialPromptText, frameImages) }],
      config: {
        systemInstruction: enhancedSystemPrompt,
        ...(thinkingBudget !== undefined && {
          thinkingConfig: { thinkingBudget },
        }),
      },
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        // Prepend skill metadata so the client can show which skills were used
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "metadata", skills: detectedSkills })}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text-start" })}\n\n`),
        );

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text-delta", delta: text })}\n\n`,
              ),
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating code:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const isQuota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
    return new Response(
      JSON.stringify({ error: isQuota
        ? "Google AI quota exceeded. Add billing at aistudio.google.com or wait for your daily quota to reset."
        : "Something went wrong while trying to reach Google AI APIs." }),
      { status: isQuota ? 429 : 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
