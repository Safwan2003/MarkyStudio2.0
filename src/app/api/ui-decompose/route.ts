import { GoogleGenAI, Type } from "@google/genai";
import { cropImageToZone } from "@/lib/cropZone";

// ---------------------------------------------------------------------------
// Pass 1 Prompt: Layout Spine (coarse structure only)
// ---------------------------------------------------------------------------

const PASS1_PROMPT = `You are a UI layout architect for motion-design video production. Analyze this product screenshot and identify the COARSE STRUCTURE only.

DO NOT extract detailed content like nav item labels, table data, or chart values.
ONLY identify:
1. Layout type: "sidebar-main", "topnav-main", "full-width", or "split"
2. Zone bounding boxes (approximate pixel coordinates [x, y, width, height])
3. Theme colors (dominant bg, accent, text color, dark/light)

For each zone, identify its TYPE from this list:
- sidebar: left/right navigation panel
- topbar: horizontal navigation/tab bar at top
- metric-cards: row of stat/KPI cards
- chart: any data visualization (line, bar, donut, area)
- table: tabular data with columns and rows
- form: input fields, dropdowns, buttons
- card-grid: grid of content cards
- list: vertical list of items
- hero-header: large title/description area
- detail-panel: content detail area

AGGRESSIVE SIMPLIFICATION RULES (this output will be used for video animation, not fidelity):
- Identify MAX 6 zones total. If there are more, pick the 6 most visually prominent.
- Do NOT return both a "list" and a "table" zone — pick the dominant one.
- Sidebar and topbar together count as 2 zones toward the limit.

Return ONLY the layout spine. Do NOT extract text content.`;

// ---------------------------------------------------------------------------
// Pass 2 Prompts: Zone-specific detail extraction
// ---------------------------------------------------------------------------

const ZONE_PROMPTS: Record<string, string> = {
  sidebar: `You are looking at ONLY the sidebar section, cropped from a larger screenshot.
List nav items visible. For each item extract:
- label: the EXACT text (do not paraphrase or abbreviate)
- icon: closest emoji match
- isActive: true if it has a highlight, colored background, or bold text
- badge: number if there's a notification badge

Also extract the app name/logo text at the top of the sidebar.

SIMPLIFICATION RULE: Return MAX 5 nav items. If there are more, pick the 5 most prominent or the first 5 in visual order. This is for video animation — we render an abstracted version, not a pixel-perfect copy.`,

  topbar: `You are looking at ONLY the top navigation bar, cropped from a larger screenshot.
Extract:
- tabs: list every tab/link in left-to-right order. For each: exact label text and whether it's the active tab (has underline, highlight, or different color)
- hasSearch: is there a search bar or search icon?
- hasAvatar: is there a user avatar or profile icon?
- breadcrumb: if there's breadcrumb text (like "Projects / Settings"), extract it exactly
Count carefully — do not skip tabs or reorder them.`,

  "metric-cards": `You are looking at ONLY a row of metric/stat cards, cropped from a larger screenshot.
For each card extract:
- label: exact text label (e.g., "Revenue", "Active Users")
- value: the exact displayed value including formatting (e.g., "$42.3K", "12,847", "94%")
- numericValue: the pure number for count-up animation (e.g., 42300, 12847, 94)
- trend: "up" | "down" | "neutral" (based on color or arrow)
- trendValue: the trend text if shown (e.g., "+12%", "-3.2%")

SIMPLIFICATION RULE: Return MAX 3 cards. If there are more, pick the 3 most visually prominent (usually largest values or most colorful). This output is for video animation — fewer, larger cards look better on screen.`,

  chart: `You are looking at ONLY a chart/graph section, cropped from a larger screenshot.
Extract:
- type: "line" | "bar" | "donut" | "area"
- title: chart title if visible
- dataPoints: approximate 5-8 data values, normalized to 0-100 scale
- labels: x-axis labels if visible
- color: primary chart color (hex)
- secondaryColor: secondary color if present (hex)
Be precise about the chart TYPE — do not guess. If it's an area chart (filled below the line), say "area" not "line".`,

  table: `You are looking at ONLY a data table, cropped from a larger screenshot.
Extract:
- columns: list each column header in left-to-right order with label and relative width ("narrow", "medium", "wide")
- rows: representative rows. For each cell, extract:
  - If plain text: just the text string (MAX 2 words — truncate longer values)
  - If colored status badge: { "type": "badge", "value": "Active", "color": "#10b981" }
  - If action button: { "type": "button", "value": "View", "color": "#3b82f6" }
  - If checkbox: { "type": "checkbox", "checked": true }

SIMPLIFICATION RULES (this is for video animation, not a data export):
- Return MAX 4 columns. If there are more, keep the 4 most visually important (usually leftmost identifier + status + key metric + action).
- Return MAX 3 rows.
- Truncate text cell values to 2 words max.
Preserve column order within the 4-column limit.`,

  form: `You are looking at ONLY a form section, cropped from a larger screenshot.
Extract:
- title: form title if visible
- fields: each field in order with:
  - label: field label text
  - type: "text" | "dropdown" | "checkbox" | "textarea" | "date"
  - placeholder: placeholder text if visible
  - value: current value if filled in
  - options: for dropdowns, list the visible options
- submitLabel: text on the submit/action button
Extract fields in visual order (top to bottom).`,

  "card-grid": `You are looking at ONLY a grid of cards, cropped from a larger screenshot.
For each card extract: title, brief description (1 line), and any icon/emoji.
Count every card. Extract in reading order (left-to-right, top-to-bottom).`,

  list: `You are looking at ONLY a list section, cropped from a larger screenshot.
For each item: label text, any status indicator, any secondary text.
Extract in visual order (top to bottom). Do NOT skip any items.`,
};

// ---------------------------------------------------------------------------
// Pass 3 Prompt: Verification
// ---------------------------------------------------------------------------

const PASS3_PROMPT = `Compare these two images. Image 1 is the original product screenshot. Image 2 is our simplified vector reconstruction.

List ONLY concrete differences:
- Missing elements (e.g., "sidebar is missing a Settings item")
- Wrong labels (e.g., "tab says 'Connect' but original says 'Integrations'")
- Wrong colors (e.g., "accent is blue but original uses green")
- Wrong element order (e.g., "Dashboard and Reports tabs are swapped")
- Wrong chart type (e.g., "shows line chart but original is bar chart")
- Missing sections (e.g., "original has a table below the chart, reconstruction doesn't")

IGNORE minor styling differences (exact font, exact spacing, slight color shade differences).
A simplified/cleaner version of the original is ACCEPTABLE — we only care about structural accuracy.

If the reconstruction is a reasonable structural match, respond with just: "PASS"
Otherwise, list each specific issue on its own line.`;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { image, verify, renderedImage } = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY not set" }, { status: 400 });
  }
  if (!image) {
    return Response.json({ error: "image is required (base64 data URL)" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const parsed = parseDataUrl(image);
  if (!parsed) {
    return Response.json({ error: "Invalid image format" }, { status: 400 });
  }

  // =========================================================================
  // If verify=true, run Pass 3 (verification) and return corrections
  // =========================================================================
  if (verify && renderedImage) {
    const renderedParsed = parseDataUrl(renderedImage);
    if (!renderedParsed) {
      return Response.json({ error: "Invalid renderedImage format" }, { status: 400 });
    }

    const verifyResult = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: "Image 1 (original):" },
          { inlineData: parsed },
          { text: "Image 2 (reconstruction):" },
          { inlineData: renderedParsed },
          { text: "Compare these two images and list structural differences." },
        ],
      }],
      config: { systemInstruction: PASS3_PROMPT },
    });

    const verifyText = verifyResult.text ?? "";
    const passed = verifyText.trim().toUpperCase().startsWith("PASS");

    return Response.json({
      passed,
      issues: passed ? [] : verifyText.split("\n").filter(l => l.trim().length > 0),
    });
  }

  // =========================================================================
  // Pass 1: Layout Spine Extraction
  // =========================================================================

  let layoutSpine: any;
  try {
    const pass1Result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: "Analyze this screenshot's layout structure." },
          { inlineData: parsed },
        ],
      }],
      config: {
        systemInstruction: PASS1_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layout: { type: Type.STRING, description: "sidebar-main | topnav-main | full-width | split" },
            zones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  bbox: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y, width, height] in pixels" },
                },
                required: ["type", "bbox"],
              },
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
              required: ["bgColor", "accentColor", "isDark"],
            },
          },
          required: ["layout", "zones", "theme"],
        },
      },
    });

    layoutSpine = JSON.parse(pass1Result.text ?? "{}");
  } catch (error) {
    console.error("Pass 1 (layout spine) failed:", error);
    return Response.json({ error: "Failed to extract layout spine" }, { status: 500 });
  }

  // =========================================================================
  // Pass 2: Per-Zone Detail Extraction (parallel)
  // =========================================================================

  const zoneDetails: Record<string, any> = {};
  const zoneErrors: string[] = [];

  const zonePromises = (layoutSpine.zones || []).map(async (zone: any) => {
    const zoneType = zone.type as string;
    const prompt = ZONE_PROMPTS[zoneType];

    if (!prompt) {
      zoneDetails[zoneType] = { _fallback: true };
      return;
    }

    try {
      const croppedImage = await cropImageToZone(image, zone.bbox as [number, number, number, number]);
      const croppedParsed = parseDataUrl(croppedImage);

      if (!croppedParsed) {
        zoneErrors.push(`Failed to crop zone: ${zoneType}`);
        zoneDetails[zoneType] = { _fallback: true };
        return;
      }

      const zoneResult = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [
            { text: `Extract detailed content from this ${zoneType} section.` },
            { inlineData: croppedParsed },
          ],
        }],
        config: {
          systemInstruction: prompt,
          responseMimeType: "application/json",
        },
      });

      zoneDetails[zoneType] = JSON.parse(zoneResult.text ?? "{}");
    } catch (error) {
      console.error(`Pass 2 zone "${zoneType}" failed:`, error);
      zoneErrors.push(`Zone ${zoneType} extraction failed`);
      zoneDetails[zoneType] = { _fallback: true };
    }
  });

  await Promise.all(zonePromises);

  // =========================================================================
  // Assemble UISchema from Pass 1 + Pass 2
  // =========================================================================

  const uiSchema = {
    layout: {
      type: layoutSpine.layout,
      sidebar: zoneDetails.sidebar?._fallback ? undefined : {
        appName: zoneDetails.sidebar?.appName || "App",
        position: "left" as const,
        width: "standard" as const,
        items: zoneDetails.sidebar?.items || [],
      },
      topbar: zoneDetails.topbar?._fallback ? undefined : {
        hasSearch: zoneDetails.topbar?.hasSearch || false,
        hasAvatar: zoneDetails.topbar?.hasAvatar || false,
        items: zoneDetails.topbar?.tabs || [],
        breadcrumb: zoneDetails.topbar?.breadcrumb,
      },
    },
    mainContent: {
      sections: (layoutSpine.zones || [])
        .filter((z: any) => !["sidebar", "topbar"].includes(z.type))
        .map((z: any) => ({
          type: z.type,
          data: zoneDetails[z.type]?._fallback ? null : zoneDetails[z.type],
          bbox: z.bbox,
          _fallback: zoneDetails[z.type]?._fallback || false,
        })),
    },
    theme: layoutSpine.theme,
    _zoneErrors: zoneErrors,
    _hasFallbackZones: Object.values(zoneDetails).some((z: any) => z?._fallback),
  };

  return Response.json({ uiSchema });
}
