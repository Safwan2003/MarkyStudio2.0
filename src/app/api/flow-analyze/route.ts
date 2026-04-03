import { GoogleGenAI, Type } from "@google/genai";
import { createHash } from "crypto";
import sharp from "sharp";

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

const EMPTY_FLOW = { screens: [], transitions: [] };
const VISION_MODEL = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Server-side in-memory cache — avoids re-running the full pipeline on the
// same batch of images (e.g. user submits the same recording twice).
// Key: SHA-256 of image fingerprints + descriptions.
// ---------------------------------------------------------------------------
// Use a loose type so both analyzeVideoRecording and analyzeScreenshots results
// can be stored — the two functions return different shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlowResult = Record<string, any>;
const flowCache = new Map<string, FlowResult>();
const MAX_CACHE_SIZE = 20;

function buildCacheKey(images: { mimeType: string; data: string }[], descs: string[]): string {
  const h = createHash("sha256");
  for (const img of images) {
    // Use length + first/last 64 chars — fast fingerprint without hashing megabytes
    h.update(String(img.data.length));
    h.update(img.data.slice(0, 64));
    h.update(img.data.slice(-64));
  }
  h.update(descs.join("|"));
  return h.digest("hex");
}

// ---------------------------------------------------------------------------
// Resize a base64 image to targetWidth on the server using sharp.
// Returns a new base64 string (JPEG). Falls back to the original on error.
// ---------------------------------------------------------------------------
async function resizeBase64(data: string, mimeType: string, targetWidth: number): Promise<string> {
  try {
    const buf = Buffer.from(data, "base64");
    const resized = await sharp(buf)
      .resize(targetWidth, undefined, { withoutEnlargement: true, fit: "inside" })
      .jpeg({ quality: 72 })
      .toBuffer();
    return resized.toString("base64");
  } catch {
    return data; // graceful fallback — use original
  }
}

/** Clamp a normalized 0–1 value. */
function clamp(v: number): number {
  return Math.max(0, Math.min(1, typeof v === "number" ? v : 0.5));
}

function normalizeBox(t: any) {
  // Check if ANY value in the box is > 1.1 (allowing for slight model rounding overshoot)
  // If so, assume 0-1000 scale and normalize.
  const b = t.box;
  const isLargeScale = b && (b.x > 1.1 || b.y > 1.1 || b.w > 1.1 || b.h > 1.1);

  const scale = (v: number, fallback: number) => {
    const n = typeof v === "number" ? v : fallback;
    return clamp(isLargeScale ? n / 1000 : n);
  };
  return {
    x: scale(t.box?.x, 500),
    y: scale(t.box?.y, 500),
    w: scale(t.box?.w, 150),
    h: scale(t.box?.h, 50),
  };
}

// ---------------------------------------------------------------------------
// Phase 4.1: Intelligent key frame detection via pixel-hash diffing
// ---------------------------------------------------------------------------

function detectSignificantFrames(frames: string[], maxKeyFrames: number = 8): number[] {
  const significant = [0];
  const HASH_LENGTH = 500;
  const diffs: { index: number; score: number }[] = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1].substring(0, HASH_LENGTH);
    const curr = frames[i].substring(0, HASH_LENGTH);
    let diffCount = 0;
    for (let j = 0; j < HASH_LENGTH; j++) {
      if (prev[j] !== curr[j]) diffCount++;
    }
    diffs.push({ index: i, score: diffCount / HASH_LENGTH });
  }
  diffs.sort((a, b) => b.score - a.score);
  const topChanges = diffs.slice(0, maxKeyFrames - 2).map(d => d.index).sort((a, b) => a - b);
  significant.push(...topChanges);
  significant.push(frames.length - 1);
  return Array.from(new Set(significant)).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Phase 4.3: Smart recording detection via frame similarity heuristic
// ---------------------------------------------------------------------------

function isLikelyRecording(frames: { mimeType: string; data: string }[]): boolean {
  if (frames.length < 4) return false;
  const HASH_LEN = 300;
  let similarPairs = 0;
  for (let i = 1; i < Math.min(frames.length, 10); i++) {
    const prev = frames[i - 1].data.substring(0, HASH_LEN);
    const curr = frames[i].data.substring(0, HASH_LEN);
    let same = 0;
    for (let j = 0; j < HASH_LEN; j++) {
      if (prev[j] === curr[j]) same++;
    }
    if (same / HASH_LEN > 0.85) similarPairs++;
  }
  return similarPairs / (Math.min(frames.length, 10) - 1) > 0.6;
}

// ---------------------------------------------------------------------------
// VIDEO RECORDING MODE — 2-pass pipeline for large frame sets (≥8 frames)
//
// Pass 1: Send ALL frames at 320px — cheap key-moment scan.
//         Identifies 4–7 frames where the screen changes meaningfully.
// Pass 2: Re-analyze ONLY the key moment frames at full 512px resolution.
//         This gives precise bounding boxes without flooding with near-duplicates.
// ---------------------------------------------------------------------------

async function analyzeVideoRecording(
  ai: GoogleGenAI,
  parsedImages: { mimeType: string; data: string }[],
  userDescriptions: string[],
) {
  const total = parsedImages.length;

  // Pass 1: Key moment extraction at 320px — use smart frame sampling ───────
  // Task 0.5: reduce maxFrames to 12 and use pixel-hash dedup to prefer unique frames
  const MAX_FOR_SCAN = 12;
  const rawDataUrls = parsedImages.map(p => p.data);
  const significantIndices = detectSignificantFrames(rawDataUrls, MAX_FOR_SCAN);
  const scanIndices: number[] = significantIndices.length >= 4 ? significantIndices : (() => {
    const step = Math.max(1, Math.floor(total / MAX_FOR_SCAN));
    const fallback: number[] = [];
    for (let i = 0; i < total; i += step) fallback.push(i);
    if (fallback.length === 0 || fallback[fallback.length - 1] !== total - 1) fallback.push(total - 1);
    return fallback;
  })();

  // Downscale to 320px for cheap LLM scan — ~2.5× fewer tokens vs 512px
  const scanImages = await Promise.all(
    scanIndices.map(async (i) => {
      const img = parsedImages[i];
      const smallData = await resizeBase64(img.data, img.mimeType, 320);
      return { mimeType: "image/jpeg", data: smallData };
    }),
  );

  const pass1Prompt = `You are analyzing a screen recording of a product demo.
You are given ${scanImages.length} frames sampled from ${total} total frames.
The frames are numbered as: ${scanIndices.map((i, pos) => `Frame${pos}=original[${i}]`).join(", ")}.

Your goal: identify 4–7 KEY MOMENT frames that best represent DISTINCT screens or feature areas.
A key moment is a frame where:
- A new page, tab, or modal is visible (not seen in previous frames)
- A significant UI state change happened (form filled, result appeared, action completed)
- The content area changed substantially

SKIP frames that look nearly identical to adjacent frames (same screen, minor cursor movement).

Also write a SHORT NARRATIVE SUMMARY describing what product feature/workflow is shown overall.
Identify the main "story arc": what problem is being solved, and what the demo shows.

Also assess the visual energy of the recording:
- energyLevel: "high" if the screen changes frequently with many rapid interactions; "calm" if few transitions and deliberate pacing; "medium" otherwise
- visualComplexity: a number 0–1 representing UI density (0=minimal/sparse layout, 1=very dense with many elements, columns, charts)
- uiPace: "fast" if interactions happen in rapid succession (many actions in short time), "slow" if each step is deliberate with pauses

Return JSON with:
- keyFramePositions: array of 0-based positions IN THE SCAN SET (not original indices) — these are the important frames
- narrativeSummary: 2-3 sentence description of what the full recording demonstrates
- productFeature: short name of the main feature shown (e.g. "Report Generation", "User Onboarding")
- energyLevel: "high" | "medium" | "calm"
- visualComplexity: number 0–1
- uiPace: "fast" | "slow"`;

  let keyOriginalIndices: number[] = [];
  let narrativeSummary = "";
  let productFeature = "";
  let energyLevel: "high" | "medium" | "calm" = "medium";
  let visualComplexity = 0.5;
  let uiPace: "fast" | "slow" = "slow";

  try {
    const pass1Result = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [{
        role: "user",
        parts: [
          { text: pass1Prompt },
          ...scanImages.map((p) => ({ inlineData: p })),
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keyFramePositions: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            narrativeSummary: { type: Type.STRING },
            productFeature: { type: Type.STRING },
            energyLevel: { type: Type.STRING },
            visualComplexity: { type: Type.NUMBER },
            uiPace: { type: Type.STRING },
          },
          required: ["keyFramePositions", "narrativeSummary", "productFeature", "energyLevel", "visualComplexity", "uiPace"],
        },
      },
    });

    const p1 = JSON.parse(pass1Result.text ?? "{}");
    narrativeSummary = p1.narrativeSummary ?? "";
    productFeature = p1.productFeature ?? "";
    energyLevel = (["high", "medium", "calm"].includes(p1.energyLevel) ? p1.energyLevel : "medium") as "high" | "medium" | "calm";
    visualComplexity = typeof p1.visualComplexity === "number" ? Math.max(0, Math.min(1, p1.visualComplexity)) : 0.5;
    uiPace = (["fast", "slow"].includes(p1.uiPace) ? p1.uiPace : "slow") as "fast" | "slow";

    const positions: number[] = Array.isArray(p1.keyFramePositions) ? p1.keyFramePositions : [];
    keyOriginalIndices = positions
      .filter((pos) => pos >= 0 && pos < scanIndices.length)
      .map((pos) => scanIndices[pos]);

    if (keyOriginalIndices.length < 3) {
      keyOriginalIndices = [0, Math.floor(total * 0.25), Math.floor(total * 0.5), Math.floor(total * 0.75), total - 1];
    }
    if (keyOriginalIndices.length > 7) {
      keyOriginalIndices = keyOriginalIndices.slice(0, 7);
    }
    keyOriginalIndices = Array.from(new Set(keyOriginalIndices)).sort((a, b) => a - b);

    console.log(`Flow-analyze video: ${total} frames → ${keyOriginalIndices.length} key moments [${keyOriginalIndices.join(",")}]`);
  } catch (err) {
    console.warn("Pass 1 key-moment extraction failed, using evenly-spaced fallback:", err);
    keyOriginalIndices = [0, Math.floor(total * 0.33), Math.floor(total * 0.66), total - 1];
  }

  // Pass 2: Deep transition analysis on key frames at full 512px ────────────
  const keyImages = keyOriginalIndices.map((i) => parsedImages[i]);
  const keyDescriptions = keyOriginalIndices.map((i) => userDescriptions[i] ?? "");

  const descHints = keyDescriptions.some((d) => d?.trim())
    ? `\nContext for each key frame:\n${keyOriginalIndices.map((origIdx, pos) => `  Frame ${pos}: ${keyDescriptions[pos]?.trim() || `(original frame ${origIdx})`}`).join("\n")}`
    : "";

  const pass2Prompt = `You are a precision UI analyst for a video generation system.
You are analyzing ${keyImages.length} KEY MOMENT frames extracted from a screen recording.
These frames represent the most important distinct screens in the demo.
${descHints}

For each key frame, write a concise one-sentence description of what feature/screen it shows.
For each consecutive pair (Frame N → Frame N+1), analyze the user action that caused the transition.

CRITICAL TASK — BOUNDING BOXES (0-1000 SCALE):
For each transition, detect the interactive element clicked/typed on the SOURCE frame.
  x = (left edge / image width) × 1000
  y = (top edge / image height) × 1000
  w = (element width / image width) × 1000
  h = (element height / image height) × 1000

REFERENCE RANGES on 0–1000 scale:
- Small button: w≈80–180, h≈40–70
- Wide input: w≈250–600, h≈40–70
- Nav tab: w≈100–200, h≈50–100
- Default: {x:500, y:500, w:150, h:50}`;

  const pass2Result = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [{
      role: "user",
      parts: [
        { text: pass2Prompt },
        ...keyImages.map((p) => ({ inlineData: p })),
      ],
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          screens: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.NUMBER },
                description: { type: Type.STRING },
              },
              required: ["index", "description"],
            },
          },
          transitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.NUMBER },
                to: { type: Type.NUMBER },
                action: { type: Type.STRING },
                type: { type: Type.STRING },
                targetLabel: { type: Type.STRING },
                elementType: { type: Type.STRING },
                box: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER },
                    w: { type: Type.NUMBER }, h: { type: Type.NUMBER },
                  },
                  required: ["x", "y", "w", "h"],
                },
                style: {
                  type: Type.OBJECT,
                  properties: {
                    bgColor: { type: Type.STRING },
                    borderRadius: { type: Type.NUMBER },
                  },
                  required: ["bgColor", "borderRadius"],
                },
              },
              required: ["from", "to", "action", "type", "targetLabel", "elementType", "box", "style"],
            },
          },
        },
        required: ["screens", "transitions"],
      },
    },
  });

  if (!pass2Result.text) console.warn("[flow-analyze] pass2 LLM returned empty text");
  let p2: Record<string, unknown>;
  try { p2 = JSON.parse(pass2Result.text ?? "{}"); } catch (e) { console.error("[flow-analyze] pass2 JSON.parse failed. Raw:", pass2Result.text?.slice(0, 500)); throw e; }
  const screens = Array.isArray(p2.screens) ? p2.screens : [];
  const transitions = Array.isArray(p2.transitions)
    ? p2.transitions.map((t: any) => ({
        from: t.from,
        to: t.to,
        action: t.action ?? "",
        type: t.type ?? "click",
        targetLabel: t.targetLabel ?? t.action ?? "",
        elementType: t.elementType ?? "button",
        box: normalizeBox(t),
        style: { bgColor: t.style?.bgColor ?? "#FFFFFF", borderRadius: t.style?.borderRadius ?? 8 },
      }))
    : [];

  return {
    screens,
    transitions,
    keyFrameIndices: keyOriginalIndices,
    narrativeSummary,
    productFeature,
    isVideoRecording: true,
    totalFrames: total,
    energyLevel,
    visualComplexity,
    uiPace,
  };
}

// ---------------------------------------------------------------------------
// SCREENSHOT MODE — standard single-pass analysis (< 8 frames)
// ---------------------------------------------------------------------------

async function analyzeScreenshots(
  ai: GoogleGenAI,
  parsedImages: { mimeType: string; data: string }[],
  userDescriptions: string[],
) {
  const descHints = Array.isArray(userDescriptions) && userDescriptions.some((d: string) => d?.trim())
    ? `\nUser-provided context:\n${parsedImages.map((_, i) => `  Screen ${i}: ${userDescriptions[i]?.trim() || "(no description)"}`).join("\n")}`
    : "";

  const prompt = `You are a precision UI analyst for a video generation system.
You are given ${parsedImages.length} product UI screenshots representing a user journey.
${descHints}

For each screenshot, write a concise one-sentence description of what screen/feature it shows.
For each consecutive pair (Screen N → Screen N+1), analyze what the user does to navigate from the first to the second.

CRITICAL TASK — BOUNDING BOXES (0-1000 SCALE):
For each transition, detect the exact interactive element the user clicks or types into on the SOURCE screen.
  x = (left edge / image width) × 1000
  y = (top edge / image height) × 1000
  w = (element width / image width) × 1000
  h = (element height / image height) × 1000

REFERENCE RANGES on 0–1000 scale:
- Small button: w≈80–180, h≈40–70
- Wide input field: w≈250–600, h≈40–70
- Nav tab: w≈100–200, h≈50–100
- Default: {x:500, y:500, w:150, h:50}

Also assess the visual energy of this screenshot sequence:
- energyLevel: "high" if many rapid-fire transitions or dense complex UI; "calm" if minimal UI and few steps; "medium" otherwise
- visualComplexity: 0–1 representing UI density across all screens (0=very sparse/minimal, 1=very dense with many elements)
- uiPace: "fast" if transitions are numerous and quick-action, "slow" if deliberate and few`;

  const result = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        ...parsedImages.map((p) => ({ inlineData: p })),
      ],
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          screens: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.NUMBER },
                description: { type: Type.STRING },
              },
              required: ["index", "description"],
            },
          },
          transitions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                from: { type: Type.NUMBER },
                to: { type: Type.NUMBER },
                action: { type: Type.STRING },
                type: { type: Type.STRING },
                targetLabel: { type: Type.STRING },
                elementType: { type: Type.STRING },
                box: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER }, y: { type: Type.NUMBER },
                    w: { type: Type.NUMBER }, h: { type: Type.NUMBER },
                  },
                  required: ["x", "y", "w", "h"],
                },
                style: {
                  type: Type.OBJECT,
                  properties: {
                    bgColor: { type: Type.STRING },
                    borderRadius: { type: Type.NUMBER },
                  },
                  required: ["bgColor", "borderRadius"],
                },
              },
              required: ["from", "to", "action", "type", "targetLabel", "elementType", "box", "style"],
            },
          },
          energyLevel: { type: Type.STRING },
          visualComplexity: { type: Type.NUMBER },
          uiPace: { type: Type.STRING },
          narrativeSummary: { type: Type.STRING, description: "2-3 sentence description of the user journey story arc shown in these screenshots" },
          productFeature: { type: Type.STRING, description: "Short name of the main feature being demonstrated" },
        },
        required: ["screens", "transitions", "energyLevel", "visualComplexity", "uiPace", "narrativeSummary", "productFeature"],
      },
    },
  });

  const parsed = JSON.parse(result.text ?? "{}");
  const screens = Array.isArray(parsed.screens) ? parsed.screens : [];
  const transitions = Array.isArray(parsed.transitions)
    ? parsed.transitions.map((t: any) => ({
        from: t.from,
        to: t.to,
        action: t.action ?? "",
        type: t.type ?? "click",
        targetLabel: t.targetLabel ?? t.action ?? "",
        elementType: t.elementType ?? "button",
        box: normalizeBox(t),
        style: { bgColor: t.style?.bgColor ?? "#FFFFFF", borderRadius: t.style?.borderRadius ?? 8 },
      }))
    : [];

  const ssEnergy = (["high", "medium", "calm"].includes(parsed.energyLevel) ? parsed.energyLevel : "medium") as "high" | "medium" | "calm";
  const ssComplexity = typeof parsed.visualComplexity === "number" ? Math.max(0, Math.min(1, parsed.visualComplexity)) : 0.5;
  const ssPace = (["fast", "slow"].includes(parsed.uiPace) ? parsed.uiPace : "slow") as "fast" | "slow";
  const narrativeSummary = parsed.narrativeSummary ?? "";
  const productFeature = parsed.productFeature ?? "";

  return { screens, transitions, energyLevel: ssEnergy, visualComplexity: ssComplexity, uiPace: ssPace, narrativeSummary, productFeature };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const { images, userDescriptions } = await req.json();

    if (!Array.isArray(images) || images.length < 2) {
      return Response.json(EMPTY_FLOW);
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return Response.json(EMPTY_FLOW);

    const parsedImages = images
      .map((img: string) => parseDataUrl(img))
      .filter((p): p is { mimeType: string; data: string } => p !== null);

    if (parsedImages.length < 2) return Response.json(EMPTY_FLOW);

    const descs: string[] = Array.isArray(userDescriptions) ? userDescriptions : [];

    // ── Cache check ─────────────────────────────────────────────────────────
    const cacheKey = buildCacheKey(parsedImages, descs);
    const cached = flowCache.get(cacheKey);
    if (cached) {
      console.log("Flow-analyze: Cache hit — skipping LLM calls");
      return Response.json(cached);
    }

    const ai = new GoogleGenAI({ apiKey });

    const isVideoRecording = isLikelyRecording(parsedImages);
    const result = isVideoRecording
      ? await analyzeVideoRecording(ai, parsedImages, descs)
      : await analyzeScreenshots(ai, parsedImages, descs);

    // ── Store in cache (evict oldest if full) ────────────────────────────────
    if (flowCache.size >= MAX_CACHE_SIZE) {
      const firstKey = flowCache.keys().next().value;
      if (firstKey) flowCache.delete(firstKey);
    }
    flowCache.set(cacheKey, result);

    return Response.json(result);
  } catch (err) {
    console.warn("flow-analyze failed (non-fatal):", err);
    return Response.json(EMPTY_FLOW);
  }
}
