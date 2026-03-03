import { GoogleGenAI, Type } from "@google/genai";

// ---------------------------------------------------------------------------
// Retry-with-backoff for 429 rate-limit responses
// ---------------------------------------------------------------------------

function extractRetryDelay(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error);
  // API returns retryDelay like "17s" or "17.375652384s"
  const match = msg.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
  return match ? Math.ceil(parseFloat(match[1])) + 2 : null; // +2s buffer
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delaySec = extractRetryDelay(err) ?? Math.pow(2, attempt + 1) * 5;
      console.log(`Rate limited — retrying in ${delaySec}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
      lastError = err;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Brand extraction from screenshots (vision)
// ---------------------------------------------------------------------------

const BRAND_EXTRACTION_PROMPT = `You are a precision brand color extractor for a video generation system.

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
// Narrative planning
// ---------------------------------------------------------------------------

const NARRATIVE_PLANNING_PROMPT = `You are a video narrative planner for SaaS product explainer videos.

Given a product description, plan a complete 5–6 scene video narrative tailored to the product.

## SCENE ARC
Design scenes based on the product — vary the arc, do not always use the same 6 scenes.
Common patterns:
- Intro → Problem → Showcase → Features → Social Proof → CTA  (standard SaaS)
- Intro → Before/After → Product Demo → Data/Stats → CTA       (data-driven product)
- Intro → Problem → Solution Network → Device Demo → CTA       (platform/network product)
- Hook → Scroll Demo → Feature List → Social Proof → CTA       (website/landing page product)

## ALL AVAILABLE SKILLS (use EXACTLY these names)

Brand / intro:
- premium-saas-hook        — brand reveal, floating icons orbiting a hero laptop, dark cinematic intro
- premium-kinetic-text     — high-energy word-by-word text reveal, brand pill with flash sweep
- premium-char-split       — character-level headline animation, push-up letter reveal

Problem / contrast:
- premium-team-orbit       — floating team avatars with role badges, chaos scene, problem visualization
- premium-split-screen     — animated before/after divider, old way vs new way side-by-side
- premium-neon-dark        — dark/neon tech theme, sonar radar rings, shape-masked image reveal
- premium-match-cut        — zoom-into-button match cut transition, whip cut, motion blur reveal

Product showcase:
- premium-saas-showcase    — browser chrome, dashboard layout, stat cards, slide-up entrance
- premium-cursor-engine    — cursor spring movement, click ripple, UI walkthrough demo
- premium-camera-zoom      — cinematic hero zoom into laptop/device screen
- premium-device-mockup    — MacBook / browser / phone shell with ATTACHED_IMAGES screenshot
- premium-scroll-demo      — scroll simulation inside browser shell, "living product" demo
- premium-multi-device     — laptop + phone + tablet composite, cross-platform showcase

Features / data:
- premium-feature-list     — staggered 3–4 feature reveal, benefit list with icons
- premium-data-reveal      — animated counters, stat cards, ring progress, bar fills
- premium-network-intro    — avatar network graph, polka-dot SVG paths, B2B ecosystem
- premium-ui-skeleton      — pre-built KanbanBoard / AnalyticsDashboard / CodeEditorPanel / DataTable components (pass data props only; NO structural JSX needed)

Depth / atmosphere:
- premium-glassmorphism    — glass cards with backdrop blur, blend-mode orbs, parallax depth layers

Trust / social proof:
- premium-social-proof     — glass notification cards, integration logos, testimonials, stacked avatars

Finale:
- premium-cta-scene        — kinetic CTA headline, pulsing gradient button, mesh background

Sound (add to any scene that benefits from audio atmosphere):
- premium-audio            — background music loop, per-frame SFX, volume fade automation

## SKILL SELECTION RULES
- Intro scene: prefer premium-kinetic-text or premium-saas-hook
- Problem scene: prefer premium-split-screen, premium-team-orbit, or premium-match-cut
- Depth/atmosphere: premium-glassmorphism can be used for any scene needing rich visual depth (avoid dark products where glassmorphism won't contrast)
- If user uploaded screenshots:
  - MANDATORY: At least ONE scene MUST use premium-cursor-engine for an interactive cursor walkthrough over the actual UI — the vision system will auto-detect buttons and interactive elements and inject them as cursor waypoints, you just need to assign the skill and set imageIndex to the most UI-rich screenshot
  - ALSO MANDATORY: At least ONE scene (different from the cursor scene) MUST use premium-device-mockup, premium-scroll-demo, or premium-saas-showcase to display the screenshot inside a device frame
  - For each showcase/cursor/device scene, set imageIndex (0-based integer) to indicate which uploaded screenshot is most relevant to that scene's content
- Data products (analytics, metrics): include premium-data-reveal
- Platform / network products: include premium-network-intro
- Cross-platform products: include premium-multi-device
- CTA / finale: always premium-cta-scene
- Never repeat the same skill in two scenes
- premium-audio can optionally appear in any single scene for background music (e.g. intro, CTA) — do not use it in more than one scene

## SCENE PROMPT REQUIREMENTS
Each scene prompt must include (2–4 sentences):
1. Visual goal — what the viewer should see and feel
2. Exact content — headline text, subheadline, CTA text (use actual product name and features)
3. Animation note — what enters first, what moves, in what order
4. If it is a device/showcase scene: explicitly mention "display ATTACHED_IMAGES inside the device shell"

## CURSOR SCENE PROMPT REQUIREMENTS (premium-cursor-engine ONLY)
When writing the prompt for a cursor-engine scene, you MUST include a specific interaction sequence:
- Name 3–5 concrete UI actions the cursor will perform, using actual product feature names
- Format: "Cursor navigates to [Feature A] and clicks → moves to [Feature B] → hovers over [Feature C] and clicks"
- Base actions on the product's key workflows (e.g., for a project manager: "opens New Project → adds a task → clicks the Kanban view → opens analytics dashboard")
- The vision system will auto-detect element coordinates — you just need to describe WHAT to click, not WHERE
- Example good prompt: "Interactive cursor walkthrough showing [Product] in action. Cursor clicks 'New Report' → navigates to the Analytics tab → selects a date range filter → clicks Export. Animate ATTACHED_IMAGES[0] as the live UI backdrop."

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
- accentName: single word like "indigo", "teal", "emerald", "rose", "amber"`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScenePlanRaw {
  id: number;
  title: string;
  prompt: string;
  skill: string;
  durationInFrames: number;
  imageIndex?: number;
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
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { prompt, images } = await req.json();

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
  const FAST_MODEL = "gemini-2.5-flash";

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

  if (parsedImages.length > 0) {
    // Run brand extraction and (if >1 image) description extraction in parallel
    const brandPromise = withRetry(() => ai.models.generateContent({
      model: FAST_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract the brand design system from this product screenshot." },
            { inlineData: parsedImages[0] },
          ],
        },
      ],
      config: {
        systemInstruction: BRAND_EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primary:    { type: Type.STRING },
            secondary:  { type: Type.STRING },
            bg:         { type: Type.STRING },
            surface:    { type: Type.STRING },
            text:       { type: Type.STRING },
            textMuted:  { type: Type.STRING },
            border:     { type: Type.STRING },
            style:      { type: Type.STRING },
          },
          required: ["primary", "secondary", "bg", "surface", "text", "textMuted", "border", "style"],
        },
      },
    }));

    // For multiple images, ask the LLM to label each one so the planner can assign them
    const descPromise = parsedImages.length > 1
      ? withRetry(() => ai.models.generateContent({
          model: FAST_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Describe each of these ${parsedImages.length} product screenshots in one short sentence (what screen/feature it shows). Return JSON.`,
                },
                ...parsedImages.map((p) => ({ inlineData: p })),
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                descriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["descriptions"],
            },
          },
        }))
      : Promise.resolve(null);

    const [brandResult, descResult] = await Promise.allSettled([brandPromise, descPromise]);

    if (brandResult.status === "fulfilled") {
      try {
        const extracted = JSON.parse(brandResult.value.text ?? "{}");
        const isColor = (v: unknown) =>
          typeof v === "string" && (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl"));
        if (isColor(extracted.primary))   visionBrand.primary   = extracted.primary;
        if (isColor(extracted.secondary)) visionBrand.secondary = extracted.secondary;
        if (isColor(extracted.bg))        visionBrand.bg        = extracted.bg;
        if (isColor(extracted.surface))   visionBrand.surface   = extracted.surface;
        if (isColor(extracted.text))      visionBrand.text      = extracted.text;
        if (isColor(extracted.textMuted)) visionBrand.textMuted = extracted.textMuted;
        if (isColor(extracted.border))    visionBrand.border    = extracted.border;
        if (["dark","light","neon"].includes(extracted.style)) visionBrand.style = extracted.style;
        console.log("Vision brand extraction:", visionBrand);
      } catch (e) {
        console.warn("Vision brand parse failed (non-fatal):", e);
      }
    } else {
      console.warn("Vision brand extraction failed (non-fatal):", brandResult.reason);
    }

    if (descResult.status === "fulfilled" && descResult.value) {
      try {
        const parsed = JSON.parse(descResult.value.text ?? "{}");
        imageDescriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];
        console.log("Image descriptions:", imageDescriptions);
      } catch (e) {
        console.warn("Image description parse failed (non-fatal):", e);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: Narrative planning (scenes + text-inferred brand)
  // -------------------------------------------------------------------------
  const hasImages = parsedImages.length > 0;

  // Build image context block for the planner
  let imageContextBlock = "";
  if (hasImages) {
    const countStr = parsedImages.length === 1
      ? "1 product screenshot (index 0)"
      : `${parsedImages.length} product screenshots (indices 0–${parsedImages.length - 1})`;
    const descLines = imageDescriptions.length > 0
      ? imageDescriptions.map((d, i) => `  - Image ${i}: ${d}`).join("\n")
      : parsedImages.map((_, i) => `  - Image ${i}: screenshot ${i + 1}`).join("\n");
    imageContextBlock = `\nATTACHED IMAGES: The user has uploaded ${countStr}.\n${descLines}\n\nFor showcase/cursor/device scenes, set imageIndex to the most relevant image index.\n`;
  }

  const textPart = {
    text: `Product/video prompt: "${prompt}"
${imageContextBlock}
Plan a complete 5–6 scene narrative video for this product, and extract brand tokens.`,
  };
  const imageParts = parsedImages.map((p) => ({ inlineData: p }));

  try {
    const result = await withRetry(() => ai.models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [textPart, ...imageParts] }],
      config: {
        systemInstruction: NARRATIVE_PLANNING_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: {
              type: Type.OBJECT,
              properties: {
                primary:    { type: Type.STRING },
                secondary:  { type: Type.STRING },
                bg:         { type: Type.STRING },
                surface:    { type: Type.STRING },
                text:       { type: Type.STRING },
                textMuted:  { type: Type.STRING },
                border:     { type: Type.STRING },
                font:       { type: Type.STRING },
                accentName: { type: Type.STRING },
                style:      { type: Type.STRING },
              },
              required: ["primary", "secondary", "bg", "surface", "text", "textMuted", "border", "font", "accentName", "style"],
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id:               { type: Type.NUMBER },
                  title:            { type: Type.STRING },
                  prompt:           { type: Type.STRING },
                  skill:            { type: Type.STRING },
                  durationInFrames: { type: Type.NUMBER },
                  imageIndex:       { type: Type.NUMBER },
                },
                required: ["id", "title", "prompt", "skill", "durationInFrames"],
              },
            },
          },
          required: ["brand", "scenes"],
        },
      },
    }));

    const parsed = JSON.parse(result.text ?? "{}") as {
      scenes: ScenePlanRaw[];
      brand: BrandTokensRaw;
    };

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("No scenes returned from planner");
    }

    // Merge: vision-extracted colors take priority over text-inferred
    const textBrand = parsed.brand ?? {};
    const brand = {
      primary:    visionBrand.primary    ?? textBrand.primary    ?? "#6366f1",
      secondary:  visionBrand.secondary  ?? textBrand.secondary  ?? "#a78bfa",
      bg:         visionBrand.bg         ?? textBrand.bg         ?? "#0f0f1a",
      surface:    visionBrand.surface    ?? textBrand.surface    ?? "rgba(255,255,255,0.06)",
      text:       visionBrand.text       ?? textBrand.text       ?? "#ffffff",
      textMuted:  visionBrand.textMuted  ?? textBrand.textMuted  ?? "rgba(255,255,255,0.5)",
      border:     visionBrand.border     ?? textBrand.border     ?? "rgba(255,255,255,0.12)",
      font:       textBrand.font         ?? "Inter",
      accentName: textBrand.accentName   ?? "indigo",
      style:      (visionBrand.style ?? textBrand.style ?? "dark") as "dark" | "light" | "neon",
    };

    // Scene prompts are returned clean (no brand prefix) — the generation layer
    // injects brand as a structured block at call time.
    // Clamp imageIndex to valid range so bad LLM output doesn't cause errors downstream.
    const maxImageIdx = parsedImages.length - 1;
    const scenes = parsed.scenes.map((s) => ({
      ...s,
      imageIndex: (typeof s.imageIndex === "number" && s.imageIndex >= 0 && s.imageIndex <= maxImageIdx)
        ? s.imageIndex
        : undefined,
    }));

    console.log(
      "Narrative plan:",
      scenes.map((s) => `${s.title} (${s.skill}${s.imageIndex !== undefined ? `, img${s.imageIndex}` : ""})`).join(" → "),
    );
    console.log("Final brand:", brand);

    return new Response(JSON.stringify({ scenes, brand, imageDescriptions }), {
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
