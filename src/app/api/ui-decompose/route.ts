import { GoogleGenAI, Type } from "@google/genai";

const UI_DECOMPOSE_PROMPT = `You are a UI architect for a video animation system.

Analyze this product screenshot and decompose it into a STRUCTURAL SCHEMA.
Think like a React developer reverse-engineering a Figma design into animatable components.

WHAT TO EXTRACT:
- Layout pattern: sidebar-main, topnav-main, full-width, or split
- Sidebar (if present): app name, nav items (label + closest emoji icon + which is active), width
- Topbar (if present): tabs, search presence, avatar presence
- Main content sections (IN ORDER from top):
  - metric-cards: label, displayed value, numeric value for counting animation, trend direction + value
  - table: column headers (3-4), 4-6 representative data rows
  - chart: type (line/bar/donut/area), approximate data points (5-8 normalized 0-100), title, colors
  - form: title, fields with types and placeholder text, submit button label
  - card-grid: card titles and brief descriptions
  - list: items with labels and status indicators
- Theme: dominant bg color (hex), card bg color, text color, accent/primary color, border radius (px), dark or light

SIMPLIFICATION RULES (critical — animation needs clean simple data):
- Reduce tables to 4-6 rows max
- Simplify charts to 5-8 data points, normalize to 0-100 range
- Keep sidebar to 5-7 items max
- Round metric values to clean numbers (12847 not 12,847.3)
- Use emoji for all icons (closest match to icon's meaning)
- Skip purely decorative or non-functional elements
- Never return pixel coordinates — return structural data only

Return valid JSON matching the UISchema interface.`;

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  const { image } = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  if (!image) {
    return new Response(JSON.stringify({ error: "image is required (base64 data URL)" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = parseDataUrl(image);
  if (!parsed) {
    return new Response(JSON.stringify({ error: "Invalid image format — expected base64 data URL" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Decompose this product screenshot into a structural UI schema for animation." },
            { inlineData: parsed },
          ],
        },
      ],
      config: {
        systemInstruction: UI_DECOMPOSE_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layout: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                sidebar: {
                  type: Type.OBJECT,
                  properties: {
                    appName: { type: Type.STRING },
                    position: { type: Type.STRING },
                    width: { type: Type.STRING },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          icon: { type: Type.STRING },
                          isActive: { type: Type.BOOLEAN },
                          badge: { type: Type.NUMBER },
                        },
                        required: ["label", "icon", "isActive"],
                      },
                    },
                  },
                  required: ["appName", "items"],
                },
                topbar: {
                  type: Type.OBJECT,
                  properties: {
                    hasSearch: { type: Type.BOOLEAN },
                    hasAvatar: { type: Type.BOOLEAN },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          type: { type: Type.STRING },
                          isActive: { type: Type.BOOLEAN },
                        },
                        required: ["label", "type"],
                      },
                    },
                  },
                  required: ["hasSearch", "hasAvatar"],
                },
              },
              required: ["type"],
            },
            mainContent: {
              type: Type.OBJECT,
              properties: {
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      data: { type: Type.OBJECT },
                      gridColumns: { type: Type.NUMBER },
                    },
                    required: ["type", "data"],
                  },
                },
              },
              required: ["sections"],
            },
            theme: {
              type: Type.OBJECT,
              properties: {
                bgColor: { type: Type.STRING },
                cardBgColor: { type: Type.STRING },
                textColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                borderRadius: { type: Type.NUMBER },
                isDark: { type: Type.BOOLEAN },
              },
              required: ["bgColor", "textColor", "accentColor", "isDark"],
            },
          },
          required: ["layout", "mainContent", "theme"],
        },
      },
    });

    const uiSchema = JSON.parse(result.text ?? "{}");
    return new Response(JSON.stringify({ uiSchema }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("UI decompose error:", error);
    return new Response(JSON.stringify({ error: "Failed to decompose UI schema" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
