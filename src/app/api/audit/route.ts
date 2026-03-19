import { GoogleGenAI, Type } from "@google/genai";
import { createHash } from "crypto";

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

const AUDIT_CODE_PROMPT = `You are a senior motion graphics art director auditing AI-generated Remotion animation code.

Your job is to review the code BEFORE it renders and catch visual quality issues that would make the output look amateur or broken.

## VISUAL RUBRIC — check each item:

### Layout & Composition
- Does AbsoluteFill have a background color set from frame 0? (missing = flickering black flash)
- Are text elements at correct sizes? Hero headline ≥ 128px, scene headline ≥ 80px, body ≥ 22px
- Do elements have 60–120px breathing room from screen edges? (tight = cramped, unprofessional)
- Is there a clear visual hierarchy — one dominant element per scene?

### Brand Fidelity
- Does every text element use BRAND.font? (missing = wrong typeface)
- Does the background use BRAND.bg exactly? (deviation = off-brand)
- Is BRAND.primary used on only 2–3 elements? (overuse kills impact)

### Animation Quality
- Are spring() calls using SPRING_CONFIGS.entrance (damping:200) not bare default { damping:100 }?
- Do animated elements have willChange: "transform" where they animate every frame?
- Is random('seed') used instead of Math.random()?

### Common Bugs
- Are PARTICLES/ORBS/CONFETTI arrays defined OUTSIDE the component function? (inside = flicker)
- Is ATTACHED_IMAGES[0] guarded with a null check?
- Does any headline/title text LACK maxWidth? (missing maxWidth = text overflow = -15 points)
- Is whiteSpace: "nowrap" used on any headline text? (causes overflow on long names = -15 points)
- Is any fontSize > 100px used without a width constraint? (overflow risk = -10 points)

## OUTPUT
- passed: true if quality is acceptable (score ≥ 70)
- score: 0–100
- issues: specific issues found
- fixes: specific code changes to make

Be strict. Score below 70 = not passed.`;

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
  /** Optional base64 data URL of a rendered mid-scene frame for visual evaluation. */
  frameImage?: string;
}

interface AuditResult {
  passed: boolean;
  score: number;
  issues: string[];
  fixes: string[];
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  const { code, prompt, brand, frameImage }: AuditRequest = await req.json();

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

  // If a rendered frame is provided, do VISUAL audit (more accurate than code review)
  const parsedFrame = frameImage ? parseDataUrl(frameImage) : null;
  const isVisualAudit = !!parsedFrame;

  const reviewText = isVisualAudit
    ? `## SCENE PROMPT:\n${prompt}${brandBlock}\n\nEvaluate this rendered animation frame for visual quality.`
    : `## SCENE PROMPT:\n${prompt}${brandBlock}\n\n## GENERATED CODE:\n\`\`\`tsx\n${code}\n\`\`\`\n\nAudit this code against the visual quality rubric.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: reviewText },
  ];
  if (parsedFrame) parts.push({ inlineData: parsedFrame });

  console.log(`Audit: ${isVisualAudit ? "VISUAL (rendered frame)" : "CODE (static analysis)"}`);

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    const audit = JSON.parse(result.text ?? "{}") as AuditResult;
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
    return new Response(
      JSON.stringify({ passed: true, score: 75, issues: [], fixes: [], auditFailed: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
}
