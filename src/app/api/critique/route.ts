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

  let body: { code: string; prompt: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, prompt } = body;

  if (!code?.trim() || !prompt?.trim()) {
    return Response.json({ error: "code and prompt are required" }, { status: 400 });
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

    const parsed = JSON.parse(result.text ?? "{}") as {
      hasIssues: boolean;
      fixPrompt: string;
    };

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
    const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
    // Always return 200 so the generation hook doesn't treat this as a fatal error.
    // On rate-limit: silently pass (don't waste a retry slot on a quota issue).
    console.warn(`Critique ${isRateLimit ? "rate-limited (skipping)" : "error"} (non-fatal):`, msg.slice(0, 120));
    return Response.json({ hasIssues: false, fixPrompt: "" }, { status: 200 });
  }
}
