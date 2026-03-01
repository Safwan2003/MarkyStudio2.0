import { GoogleGenAI, Type } from "@google/genai";

const VISION_SYSTEM_PROMPT = `You are a UI element detector for interactive product screenshots.

Analyze the provided screenshot and identify all visible interactive elements: buttons, input fields, navigation links, tabs, checkboxes, toggles, dropdowns, cards, and other clickable UI components.

For each element:
- Provide a short descriptive label (e.g., "Sign Up button", "Search input", "Dashboard tab")
- Provide the center position as normalized coordinates where (0,0) is top-left and (1,1) is bottom-right

Return up to 10 of the most prominent interactive elements. Focus on elements that a user would typically click during a product demo.`;

interface UIElement {
  label: string;
  x: number;
  y: number;
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
            { text: "Identify all interactive UI elements in this screenshot with their normalized center coordinates." },
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
                },
                required: ["label", "x", "y"],
              },
            },
          },
          required: ["elements"],
        },
      },
    });

    const data = JSON.parse(result.text ?? "{}") as { elements: UIElement[] };
    const elements = (data.elements ?? []).slice(0, 10);

    console.log(`Vision detected ${elements.length} UI elements`);

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
