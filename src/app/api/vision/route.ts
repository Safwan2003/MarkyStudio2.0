import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL ?? process.env.GEMINI_FAST_MODEL ?? "gemini-2.5-flash";

function isRetryableGeminiError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return [
    "429",
    "RESOURCE_EXHAUSTED",
    "503",
    "UNAVAILABLE",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "Connect Timeout Error",
    "fetch failed",
    "ECONNRESET",
    "socket hang up",
    "read ETIMEDOUT",
  ].some((token) => msg.includes(token));
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === maxRetries) {
        throw error;
      }
      const delayMs = Math.min(15000, Math.pow(2, attempt + 1) * 2000);
      console.warn(`[vision] transient Gemini failure, retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

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
  /** Optional stable ID mapping (when we can infer one) */
  id?: string;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, typeof v === "number" ? v : 0));
}

function normMaybe1000(v: number): number {
  // If the model returned 0–1, keep as-is; if it returned 0–1000, normalize.
  return v > 2 ? v / 1000 : v;
}

// Best-effort stable ID inference without UI_SCHEMA.
// This is intentionally conservative: only emit IDs when we're confident.
function inferStableId(el: UIElement): string | undefined {
  const label = (el.label ?? "").toLowerCase();
  if (!label) return undefined;

  // Canonical IDs supported by resolveElementPosition() in compiler scope.
  if (label.includes("search")) return "search-bar";
  if (label.includes("cta") || label.includes("get started") || label.includes("start") || label.includes("request") || label.includes("quote")) {
    return "cta-button";
  }
  if (label.includes("chart") || label.includes("analytics")) return "chart";
  if (label.includes("hero") || label.includes("title")) return "hero-title";

  // Sidebar/topnav heuristics are too unreliable without UI_SCHEMA; skip.
  return undefined;
}

// Map a detected element to a canonical UI_SCHEMA ID by snapping to known layout grids.
// This mirrors resolveElementPosition() in `src/remotion/compiler.ts` so ids and snapping agree.
function inferStableIdFromUiSchema(
  el: UIElement,
  uiSchema: { layout?: { type?: string } } | null | undefined,
): string | undefined {
  if (!uiSchema) return undefined;
  const layout = uiSchema?.layout?.type ?? "sidebar-main";

  // Mirror compiler assumptions
  const sidebarW = layout === "sidebar-main" ? 0.18 : 0;
  const contentX = sidebarW + (1 - sidebarW) * 0.5;

  const x = el.x;
  const y = el.y;
  const type = (el.elementType ?? "").toLowerCase();

  // Named elements (strong priors)
  if (type === "input" && y < 0.09) return "search-bar";
  if (type === "button" && y > 0.64) return "cta-button";

  // Top nav items (y band near topbar)
  if (layout === "topnav-main" || (y >= 0.0 && y <= 0.10 && x >= 0.12)) {
    const n = Math.round((x - 0.18) / 0.12);
    if (Number.isFinite(n) && n >= 0 && n <= 8) return `topnav-item-${n}`;
  }

  // Sidebar items (x in sidebar band)
  if (layout === "sidebar-main" && x <= sidebarW + 0.03) {
    const n = Math.round((y - 0.28) / 0.065);
    if (Number.isFinite(n) && n >= 0 && n <= 12) return `sidebar-item-${n}`;
  }

  // Metric cards band (y around 0.32)
  if (y >= 0.24 && y <= 0.42 && x >= sidebarW + 0.05) {
    const cols = 3;
    const relX = (x - sidebarW) / Math.max(0.0001, (1 - sidebarW));
    const col = Math.max(0, Math.min(cols - 1, Math.floor(relX * cols)));
    return `metric-card-${col}`;
  }

  // Table rows band
  if (y >= 0.34 && y <= 0.70 && Math.abs(x - contentX) < 0.28) {
    const n = Math.round((y - 0.38) / 0.065);
    if (Number.isFinite(n) && n >= 0 && n <= 10) return `table-row-${n}`;
  }

  // Form fields band
  if (type === "input" && y >= 0.26 && y <= 0.75) {
    const n = Math.round((y - 0.35) / 0.085);
    if (Number.isFinite(n) && n >= 0 && n <= 8) return `form-field-${n}`;
  }

  // Chart
  if (type === "card" && y >= 0.48 && y <= 0.62) return "chart";

  return undefined;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  const { image, uiSchema } = await req.json();

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

  try {
    const result = await withRetry(() => ai.models.generateContent({
      model: GEMINI_VISION_MODEL,
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
                  id: { type: Type.STRING },
                },
                required: ["label", "x", "y", "w", "h", "elementType"],
              },
            },
          },
          required: ["elements"],
        },
      },
    }));

    if (!result.text) console.warn("[vision] LLM returned empty text");
    let data: { elements: UIElement[] };
    try { data = JSON.parse(result.text ?? "{}"); } catch (e) { console.error("[vision] JSON.parse failed. Raw:", result.text?.slice(0, 500)); throw e; }
    const elements = (data.elements ?? []).slice(0, 10).map((el) => {
      const x = clamp01(normMaybe1000(el.x));
      const y = clamp01(normMaybe1000(el.y));
      const w = clamp01(normMaybe1000(el.w));
      const h = clamp01(normMaybe1000(el.h));
      const base: UIElement = { ...el, x, y, w, h };
      const id = el.id ?? inferStableIdFromUiSchema(base, uiSchema) ?? inferStableId(base);
      return id ? { ...base, id } : base;
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
