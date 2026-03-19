import { GoogleGenAI, Type } from "@google/genai";

const VISION_SYSTEM_PROMPT = `You are a precision UI element detector for interactive product screenshots.

Analyze the provided screenshot and identify all visible interactive elements: buttons, input fields, navigation links, tabs, checkboxes, toggles, dropdowns, cards, and other clickable UI components.

## COORDINATE PRECISION RULES — 0-1000 SCALE (CRITICAL)

Use a strict 0–1000 coordinate system where 1000 = full image width or height.
This 10× magnification forces precision that 0–1 decimals cannot express.

- x, y = the CENTER of the element in 0–1000 space
  e.g. element centered at 35% from left → x: 350
- w, h = the element dimensions in 0–1000 space
  e.g. button spanning 12% of width → w: 120

MEASURE carefully — a 20-unit error (2% of image) causes cursor to visibly miss the target.

Typical accurate ranges on 0–1000 scale:
- Primary CTA button: w: 100–180, h: 50–70
- Text input / search bar: w: 200–550, h: 40–60
- Nav link / tab: w: 40–100, h: 30–50
- Dashboard card: w: 220–400, h: 100–250
- Dropdown trigger: w: 80–200, h: 40–60
- Sidebar nav item: w: 100–180, h: 30–50

## WHAT TO RETURN

For each element provide:
- label: a short descriptive label using the ACTUAL text on the element (e.g., "New Report button", "Search bar", "Analytics tab")
- x, y: precise normalized CENTER coordinates
- w, h: precise normalized bounding box dimensions
- elementType: one of "input" | "button" | "dropdown" | "card" | "nav"

Return up to 10 of the most prominent interactive elements, prioritized by:
1. Primary CTA buttons (highest priority — these are cursor demo targets)
2. Main input fields / search bars
3. Navigation tabs and key links
4. Interactive cards and panels`;


interface UIElement {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  elementType: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  const { image } = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!image) {
    return new Response(
      JSON.stringify({ error: "Image is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const parsed = parseDataUrl(image);
  if (!parsed) {
    return new Response(
      JSON.stringify({ error: "Invalid image format. Expected base64 data URL." }),
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
          parts: [
            { inlineData: { mimeType: parsed.mimeType, data: parsed.data } },
            { text: "Identify all interactive UI elements in this screenshot. Use 0–1000 scale for all coordinates (1000 = full image width/height). Return center x,y and bounding box w,h in this scale." },
          ],
        },
      ],
      config: {
        systemInstruction: VISION_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  w: { type: Type.NUMBER },
                  h: { type: Type.NUMBER },
                  elementType: { type: Type.STRING },
                },
                required: ["label", "x", "y", "w", "h", "elementType"],
              },
            },
          },
          required: ["elements"],
        },
      },
    });

    const data = JSON.parse(result.text ?? "{}") as { elements: UIElement[] };
    // Normalize from 0–1000 scale back to 0–1
    // If model returned 0–1 values (all < 2), keep as-is
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const elements = (data.elements ?? []).slice(0, 10).map((el) => {
      const scale = el.x > 2 || el.y > 2 || el.w > 2 || el.h > 2 ? 1000 : 1;
      return {
        ...el,
        x: clamp01(el.x / scale),
        y: clamp01(el.y / scale),
        w: clamp01(el.w / scale),
        h: clamp01(el.h / scale),
      };
    });

    console.log(`Vision detected ${elements.length} UI elements (0-1000 scale normalized)`);

    return new Response(JSON.stringify({ elements }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Vision error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze screenshot. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
