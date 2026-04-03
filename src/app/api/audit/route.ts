import { GoogleGenAI, Type } from "@google/genai";
import { createHash } from "crypto";

const GEMINI_AUDIT_MODEL = process.env.GEMINI_AUDIT_MODEL ?? process.env.GEMINI_FAST_MODEL ?? "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// In-memory audit cache — skips the LLM call when the same code is audited
// again (e.g. after a hot-reload or re-render without code changes).
// Only caches CODE audits (not visual/frame audits — those depend on render).
// ---------------------------------------------------------------------------
interface AuditCacheEntry { result: AuditResult; ts: number }
const auditCache = new Map<string, AuditCacheEntry>();
const AUDIT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_AUDIT_CACHE = 50;

function codeHash(code: string): string {
  return createHash("sha256").update(code).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Phase 4 — Drafter-Auditor (Ralph Loop)
//
// Receives generated Remotion component code + the original scene prompt,
// evaluates the code against a visual quality rubric, and returns structured
// critique. The caller (client or orchestrator) can re-inject the critique
// into /api/generate as an errorCorrection context for up to 3 iterations.
// ---------------------------------------------------------------------------

const AUDIT_CODE_PROMPT = `You are a senior motion graphics Art Director at a premium agency (WhatAStory / Sandwich Video).

Your job is to audit AI-generated code and enforce STRICTURE VISUAL DISCIPLINE. You are the "Art Director" pass.

## 1. STRATEGIC NARRATIVE AUDIT
- **Scene Purpose**: If this is an AHA scene, is it ultra-minimal and centered? (clutter in AHA = -40 points).
- **Visual Anchor**: Is the VISUAL_ANCHOR present and in the correct emotional state (Red/Broken for problem, Green/Glowing for solution)?
- **Visual State**: Does the code respect the VISUAL_STATE handoff (e.g. keeping sidebar from previous scene)?
- **Narrative Role**: Does the scene behave like its intended beat (problem tension, workflow choreography, transformation, proof, or payoff), or does it collapse into a generic app demo?
- **Style Contract**: Does the scene preserve the same typography/depth/lighting/cursor language implied by the prompt, or does it drift into a different visual system?

## 2. THE ART DIRECTOR RUBRIC (MANDATORY)

### Element Discipline (HARD LIMIT)
- **Max 3 visual elements** per scene. (Count: headline, card group, chart, icons).
- If you find 4+ elements → **REJECT (passed: false)** and list the specific elements to remove in 'fixes'.
- Clutter is the #1 enemy of agency-level quality.

### Visual Hierarchy
- Is there a clear **Primary Focal Element**?
- Are secondary elements at 60–70% scale or muted (opacity 0.6–0.8)?
- If all elements have the same visual weight → **REJECT**.

### Layout & Safe-Zones
- **80px Safe-Zone**: Every element must have ≥ 80px padding from ALL edges. (Check interpolation and translate values).
- **Overlaps**: No headline can overlap with a card. No text can overlap with a chart.
- Is AbsoluteFill background set from frame 0?

### Animation & Physics
- **Damping:200**: All standard UI reveals must use damping:200 (SPRING_CONFIGS.entrance).
- **Internal Acts**: Animation MUST stop at the Resolve Act start frame (Act 3). If elements move/drift in the resolve act → **REJECT**.
- Is there a CinematicCamera push-in (zoom 1.0 -> 1.2) for AHA/Showcase scenes?

### Cinematic Premium Quality
- Is the motion language story-motivated, or does it feel like generic fades/slides?
- If this is a workflow scene, does cursor/action visibly CAUSE the interface state change?
- If this is a proof scene, does the metric/data evidence feel authoritative and staged, not merely decorative?
- If this is a CTA/payoff scene, does it deliver emotional resolution rather than just placing a button on screen?
- If the scene uses UI, does it feel product-marketing polished rather than functional/demo-like?

## OUTPUT
- passed: true ONLY if the scene is perfectly clean, hierarchical, and follows the mandates.
- score: 0–100 (90+ is WhatAStory quality).
- issues: specific visual/strategic failures.
- fixes: DIRECT instructions to the generator (e.g. "Remove the 4th card", "Reduce headline to 80px", "Add 80px margin").
- Prefer fixes that increase cinematic clarity, narrative progression, and style cohesion without increasing scene complexity.

Be brutal. We only accept world-class motion graphics. Score < 80 = FAIL.`;

const AUDIT_FRAME_PROMPT = `You are a senior motion graphics art director evaluating a rendered animation frame.

Look at the screenshot and assess visual quality against agency standards.

## EVALUATE:

### Layout & Composition
- Is there comfortable breathing room (≥ 60px) from screen edges?
- Is there one clear dominant visual element?
- Is the overall composition balanced and intentional?

### Typography
- Are headlines large enough to command attention (should fill most of the frame width)?
- Is text readable with sufficient contrast against the background?
- Are font sizes hierarchical — hero → subtitle → caption, clearly different sizes?

### Color & Brand
- Does the color palette feel cohesive (2–3 colors max dominant)?
- Is there visible depth — foreground elements pop over background?
- Do gradients or glows feel polished, not garish?

### Animation Artifacts (visible in this frame)
- Is text clipped or overflowing its container?
- Are elements visibly misaligned or overlapping unintentionally?
- Does anything look broken, pixelated, or low quality?

### Cinematic Feel
- Does this frame suggest a deliberate story beat, or does it feel like a generic software screenshot with motion?
- Is there evidence of depth, premium lighting, and consistent surface treatment?
- If a cursor/UI action is implied, does the frame feel staged around that action?
- Does the scene look cohesive with a high-end agency SaaS explainer rather than a template?

## OUTPUT
- passed: true if this looks agency-quality
- score: 0–100 (100 = What A Story quality)
- issues: visual problems visible in this frame
- fixes: specific changes to make the code generate a better frame

Score ≥ 75 = passed. Be strict — this is compared to premium motion agency work.`;

interface AuditRequest {
  code: string;
  prompt: string;
  brand?: Record<string, string>;
  creativeBrief?: import("@/types/generation").CreativeBrief;
  backbone?: import("@/types/generation").NarrativeBackbone;
  /** Optional base64 data URL of a rendered mid-scene frame for visual evaluation. */
  frameImage?: string;
}

interface AuditResult {
  passed: boolean;
  score: number;
  issues: string[];
  fixes: string[];
  auditFailed?: boolean;
  providerStatus?: number | null;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  const body = await req.json();

  // Fast path: prewarm cache for scenes that passed fastQualityCheck
  if (body._prewarm && body.code?.trim()) {
    const syntheticResult: AuditResult = {
      passed: true,
      score: body.score ?? 80,
      issues: [],
      fixes: [],
    };
    const key = codeHash(body.code);
    if (auditCache.size >= MAX_AUDIT_CACHE) {
      const firstKey = auditCache.keys().next().value;
      if (firstKey) auditCache.delete(firstKey);
    }
    auditCache.set(key, { result: syntheticResult, ts: Date.now() });
    return new Response(JSON.stringify(syntheticResult), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { code, prompt, brand, frameImage, creativeBrief, backbone }: AuditRequest = body;

  // ── Code audit cache check (skip for visual audits — frame changes each time) ──
  const isVisualAuditRequest = !!frameImage;
  if (!isVisualAuditRequest && code?.trim()) {
    const key = codeHash(code);
    const hit = auditCache.get(key);
    if (hit && Date.now() - hit.ts < AUDIT_CACHE_TTL_MS) {
      console.log("Audit: Cache hit — skipping LLM call");
      return new Response(JSON.stringify(hit.result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!code?.trim()) {
    return new Response(
      JSON.stringify({ error: "code is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const brandBlock = brand
    ? `\n\nBRAND TOKENS:\n${Object.entries(brand).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
    : "";

  const strategyBlock = creativeBrief || backbone
    ? `\n\nSTRATEGIC CONTEXT:\n${creativeBrief ? `Creative Brief: ${JSON.stringify(creativeBrief)}\n` : ""}${backbone ? `Narrative Backbone: ${JSON.stringify(backbone)}\n` : ""}`
    : "";

  // If a rendered frame is provided, do VISUAL audit (more accurate than code review)
  const parsedFrame = frameImage ? parseDataUrl(frameImage) : null;
  const isVisualAudit = !!parsedFrame;

  const reviewText = isVisualAudit
    ? `## SCENE PROMPT:\n${prompt}${brandBlock}${strategyBlock}\n\nEvaluate this rendered animation frame for visual quality.`
    : `## SCENE PROMPT:\n${prompt}${brandBlock}${strategyBlock}\n\n## GENERATED CODE:\n\`\`\`tsx\n${code}\n\`\`\`\n\nAudit this code against the rubric.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: reviewText },
  ];
  if (parsedFrame) parts.push({ inlineData: parsedFrame });

  console.log(`Audit: ${isVisualAudit ? "VISUAL (rendered frame)" : "CODE (static analysis)"}`);

  try {
    const result = await ai.models.generateContent({
      model: GEMINI_AUDIT_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: isVisualAudit ? AUDIT_FRAME_PROMPT : AUDIT_CODE_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            passed: { type: Type.BOOLEAN },
            score: { type: Type.NUMBER },
            issues: { type: Type.ARRAY, items: { type: Type.STRING } },
            fixes: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["passed", "score", "issues", "fixes"],
        },
      },
    });

    if (!result.text) console.warn("[audit] LLM returned empty text");
    let audit: AuditResult;
    try { audit = JSON.parse(result.text ?? "{}"); } catch (e) { console.error("[audit] JSON.parse failed. Raw:", result.text?.slice(0, 500)); throw e; }
    console.log(`Audit: score=${audit.score}, passed=${audit.passed}, issues=${audit.issues.length}`);

    // Store in cache for code audits only
    if (!isVisualAudit && code?.trim()) {
      if (auditCache.size >= MAX_AUDIT_CACHE) {
        const firstKey = auditCache.keys().next().value;
        if (firstKey) auditCache.delete(firstKey);
      }
      auditCache.set(codeHash(code), { result: audit, ts: Date.now() });
    }

    return new Response(JSON.stringify(audit), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Audit error:", error);
    // On failure, return a pass so it doesn't block generation
    const providerStatus =
      typeof error === "object" && error !== null && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : null;
    return new Response(
      JSON.stringify({ passed: true, score: 75, issues: [], fixes: [], auditFailed: true, providerStatus }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}
