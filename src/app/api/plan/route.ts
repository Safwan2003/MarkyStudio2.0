import { GoogleGenAI, Type } from "@google/genai";

const NARRATIVE_PLANNING_PROMPT = `You are a video narrative planner for SaaS product explainer videos.

Given a product description or prompt, plan a complete 5–6 scene video narrative following this arc:
1. Intro — Hook the viewer, introduce the brand/product (use premium-saas-hook or premium-kinetic-text)
2. Problem — Show the pain point the product solves (use premium-team-orbit or premium-neon-dark)
3. Solution — Reveal how the product solves it (use premium-network-intro or premium-saas-hook)
4. Showcase — Demo the product in action (use premium-saas-showcase or premium-cursor-engine)
5. Social Proof — Build trust (use premium-social-proof)
6. CTA — Drive action (use premium-cta-scene)

Available skills (use exactly these names):
- premium-saas-hook
- premium-saas-showcase
- premium-cursor-engine
- premium-team-orbit
- premium-camera-zoom
- premium-social-proof
- premium-cta-scene
- premium-kinetic-text
- premium-neon-dark
- premium-network-intro
- premium-feature-list

Rules:
- Each scene must have a tailored prompt specific to the product being described
- durationInFrames should be 150–300 (at 30fps that's 5–10 seconds)
- Intro and CTA scenes can be shorter (150–180 frames)
- Problem and Showcase scenes should be longer (210–270 frames)
- Total duration should be 1200–1500 frames (40–50 seconds)
- Each scene prompt should reference specific product details from the user's input
- The skill must match the scene type from the available list above
- Prefix every scene prompt with: "Brand: primary=<hex>, secondary=<hex>, bg=<hex>, font=Inter"

For brandTokens:
- Extract brand colors from the product description if hex codes are given
- Otherwise infer a coherent, professional SaaS palette that fits the product tone
- bg should be dark (e.g. #0f0f1a) for most SaaS videos unless explicitly described as light
- accentName is a single word like "blue", "teal", "emerald", "violet", "rose"`;

interface ScenePlanRaw {
  id: number;
  title: string;
  prompt: string;
  skill: string;
  durationInFrames: number;
}

interface BrandTokensRaw {
  primary: string;
  secondary: string;
  bg: string;
  font: string;
  accentName: string;
}

export async function POST(req: Request) {
  const { prompt } = await req.json();

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

  try {
    const result = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: `Product/video prompt: "${prompt}"\n\nPlan a complete 5–6 scene narrative video for this product, and extract brand tokens.` }],
        },
      ],
      config: {
        systemInstruction: NARRATIVE_PLANNING_PROMPT,
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
                font: { type: Type.STRING },
                accentName: { type: Type.STRING },
              },
              required: ["primary", "secondary", "bg", "font", "accentName"],
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  skill: { type: Type.STRING },
                  durationInFrames: { type: Type.NUMBER },
                },
                required: ["id", "title", "prompt", "skill", "durationInFrames"],
              },
            },
          },
          required: ["brand", "scenes"],
        },
      },
    });

    const parsed = JSON.parse(result.text ?? "{}") as {
      scenes: ScenePlanRaw[];
      brand: BrandTokensRaw;
    };

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("No scenes returned from planner");
    }

    // Prefix each scene prompt with brand context
    const brand = parsed.brand ?? {
      primary: "#6366f1",
      secondary: "#a78bfa",
      bg: "#0f0f1a",
      font: "Inter",
      accentName: "indigo",
    };

    const brandPrefix = `Brand: primary=${brand.primary}, secondary=${brand.secondary}, bg=${brand.bg}, font=${brand.font}\n`;
    const scenes = parsed.scenes.map((s) => ({
      ...s,
      prompt: s.prompt.startsWith("Brand:") ? s.prompt : `${brandPrefix}${s.prompt}`,
    }));

    console.log(
      "Narrative plan:",
      scenes.map((s) => `${s.title} (${s.skill}, ${s.durationInFrames}f)`).join(" → "),
    );
    console.log("Brand tokens:", brand);

    return new Response(JSON.stringify({ scenes, brand }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Planning error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate video plan. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
