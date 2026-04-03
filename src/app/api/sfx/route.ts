/**
 * /api/sfx — ElevenLabs Sound Generation proxy
 *
 * Generates all UI sound effects in one request using the ElevenLabs
 * Sound Generation API. Results are cached server-side (module-level) so
 * the same sounds are never regenerated within the same server process.
 *
 * POST {} (no body needed — always generates the full canonical SFX set)
 * → { urls: Record<SfxType, string> }  — base64 data URLs, or {} if no API key
 */

export type SfxType = "click" | "whoosh" | "pop" | "type" | "success" | "swoosh";

/** ElevenLabs prompt + duration for each SFX type */
const SFX_SPECS: Record<SfxType, { prompt: string; duration: number }> = {
  click:   { prompt: "Soft UI button click tap, clean and short",          duration: 0.5 },
  whoosh:  { prompt: "Quick whoosh swipe transition, airy",                duration: 0.5 },
  pop:     { prompt: "Notification pop bubble appear, light and crisp",    duration: 0.5 },
  type:    { prompt: "Single keyboard key press, sharp tap",               duration: 0.5 },
  success: { prompt: "Short success completion chime, pleasant ding",      duration: 0.8 },
  swoosh:  { prompt: "Cinematic camera pan swoosh, smooth and fast",       duration: 0.6 },
};

// Server-side cache — survives for the lifetime of the Next.js server process
const sfxCache = new Map<SfxType, string>();

async function generateSfx(
  sound: SfxType,
  apiKey: string,
): Promise<string | null> {
  if (sfxCache.has(sound)) return sfxCache.get(sound)!;

  const spec = SFX_SPECS[sound];
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: spec.prompt,
        duration_seconds: spec.duration,
        prompt_influence: 0.3,
      }),
    });

    if (!res.ok) {
      console.warn(`ElevenLabs SFX "${sound}" failed (${res.status}):`, await res.text().catch(() => res.statusText));
      return null;
    }

    const buf = await res.arrayBuffer();
    const dataUrl = `data:audio/mpeg;base64,${Buffer.from(buf).toString("base64")}`;
    sfxCache.set(sound, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn(`ElevenLabs SFX "${sound}" error:`, err);
    return null;
  }
}

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY not set — skipping SFX generation");
    return Response.json({ urls: {} });
  }

  const sounds = Object.keys(SFX_SPECS) as SfxType[];
  const urls: Partial<Record<SfxType, string>> = {};

  // Keep concurrency intentionally low to stay within ElevenLabs free-tier limits.
  for (let i = 0; i < sounds.length; i += 2) {
    const batch = sounds.slice(i, i + 2);
    const results = await Promise.all(
      batch.map(async (sound) => {
        const url = await generateSfx(sound, apiKey);
        return [sound, url] as const;
      }),
    );
    for (const [sound, url] of results) {
      if (url) urls[sound] = url;
    }
  }

  console.log(`SFX: generated ${Object.keys(urls).length}/${sounds.length} sounds`);
  return Response.json({ urls });
}
