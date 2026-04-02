import { GoogleGenAI, Type } from "@google/genai";

// Phase 4 — Ralph Loop: Art Director Code Critique
// Upgraded to check visual quality rubric, not just prompt-match correctness.
const CRITIQUE_PROMPT = `You are a senior motion graphics art director doing a fast pre-render code review.

Given a Remotion animation component and its intended scene prompt, identify the SINGLE most impactful visual quality issue. Focus on issues that would be immediately visible to a viewer.

## REVIEW CHECKLIST (priority order — stop at the first critical issue):

1. **Missing background** — No backgroundColor on AbsoluteFill = black flash. CRITICAL.
2. **Wrong text sizes** — Hero headline < 80px, body text < 20px, caption < 14px. CRITICAL.
3. **Off-brand colors** — Hardcoded color values instead of BRAND.* tokens (e.g. "#000" instead of BRAND.bg). CRITICAL.
4. **Static arrays inside component** — PARTICLES, ORBS, CONFETTI arrays defined INSIDE the component body (not at module scope) cause every-frame flicker. CRITICAL.
5. **Missing easing on visible motion** — bare interpolate() with linear easing for camera moves or slide-ins looks robotic.
6. **Cramped layout** — elements within 20px of screen edges.

## RESPONSE

If you find a priority 1–4 issue:
- hasIssues: true
- fixPrompt: ONE specific instruction (≤ 60 words) the LLM can apply immediately

If no critical issues found:
- hasIssues: false
- fixPrompt: ""

Be strict about priorities 1–4. Be lenient about 5–6.
Do NOT flag non-existent issues. Only flag something clearly visible in the code.`;

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." }, { status: 400 });
  }

  let body: {
    code: string;
    prompt: string;
    issues?: string[];
    intent?: string;
    skills?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, prompt, issues } = body;

  if (!code?.trim() || !prompt?.trim()) {
    return Response.json({ error: "code and prompt are required" }, { status: 400 });
  }

  // Fast-path: if the client already identified concrete issues (fastQualityCheck),
  // return a targeted fix prompt without spending an LLM call.
  if (Array.isArray(issues) && issues.length > 0) {
    const FIX_MAP: Record<string, string> = {
      "missing-headline-animation":
        "Wrap ALL scene headlines in <MaskedReveal startFrame={20}> with spring-driven motion — never use plain opacity fade on headlines",
      "flat-ui-no-depth":
        "Wrap the primary UI element in <TiltWrapper tiltX={-1.5} tiltY={2}> or <DepthStack ...> — flat cards without perspective are a quality fail",
      "static-background":
        `Add background layer as FIRST child of AbsoluteFill: for light themes use <LightArcBg brand={BRAND} />, for dark themes use <MeshGradientBg /> or a branded gradient layer`,
      "small-font":
        "Hook scene headline must be ≥ 96px fontSize — increase the hero text size",
      "missing-cursor-steps":
        "Feature scenes require cursor interaction — define CURSOR_STEPS array with at least 3 waypoints targeting actual UI elements",
    };

    const fixLines = issues.map((issue: string) => {
      // Exact match first, then prefix fallback
      const knownKey = FIX_MAP[issue] !== undefined
        ? issue
        : Object.keys(FIX_MAP).find((k) => issue.toLowerCase().startsWith(k.split("-")[0]));
      return knownKey ? FIX_MAP[knownKey] : `Fix: ${issue}`;
    });

    const fixPrompt = `## MANDATORY FIXES — apply ALL of these:\n\n${fixLines.map((f, i) => `${i + 1}. ${f}`).join("\n\n")}`;
    return Response.json({ hasIssues: true, fixPrompt }, { status: 200 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const FAST_MODEL = "gemini-2.5-flash";

  try {
    const result = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `## SCENE INTENT:\n${prompt.slice(0, 400)}\n\n## CODE TO REVIEW:\n\`\`\`tsx\n${code.slice(0, 4000)}\n\`\`\`\n\nIdentify the single most critical visual issue, if any.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: CRITIQUE_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasIssues: { type: Type.BOOLEAN },
            fixPrompt: { type: Type.STRING },
          },
          required: ["hasIssues", "fixPrompt"],
        },
      },
    });

    if (!result.text) console.warn("[critique] LLM returned empty text");
    let parsed: { hasIssues: boolean; fixPrompt: string };
    try { parsed = JSON.parse(result.text ?? "{}"); } catch (e) { console.error("[critique] JSON.parse failed. Raw:", result.text?.slice(0, 500)); throw e; }

    console.log(`Critique: hasIssues=${parsed.hasIssues}${parsed.hasIssues ? `, fix="${(parsed.fixPrompt ?? "").slice(0, 80)}..."` : ""}`);
    return Response.json(
      {
        hasIssues: Boolean(parsed.hasIssues),
        fixPrompt: parsed.fixPrompt ?? "",
      },
      { status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("UNAVAILABLE");
    // Always return 200 so the generation hook doesn't treat this as a fatal error.
    // On rate-limit: silently pass (don't waste a retry slot on a quota issue).
    console.warn(`Critique ${isRateLimit ? "rate-limited (skipping)" : "error"} (non-fatal):`, msg.slice(0, 120));
    return Response.json({ hasIssues: false, fixPrompt: "" }, { status: 200 });
  }
}
