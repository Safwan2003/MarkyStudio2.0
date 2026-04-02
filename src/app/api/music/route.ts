/**
 * /api/music — ElevenLabs Music Generation proxy
 *
 * Generates a background music track for a given style using the
 * ElevenLabs Music Generation API. Results are cached server-side so
 * the same style is only generated once per server process.
 *
 * POST { style: "corporate" | "energetic" | "cinematic" | "calm" | "playful", musicMood?: string }
 * → { audioUrl: string }  — base64 data URL, or { audioUrl: null } if unavailable
 *
 * When musicMood is provided, it augments the base style prompt with emotional tone.
 */

type MusicStyle = "corporate" | "energetic" | "cinematic" | "calm" | "playful";

const MUSIC_PROMPTS: Record<MusicStyle, string> = {
  corporate:  "Professional corporate background music, clean piano and subtle strings, modern business feel, steady tempo, no lyrics",
  energetic:  "Upbeat energetic electronic music, driving beat, synth leads, fast tempo, motivational and exciting, no lyrics",
  cinematic:  "Cinematic orchestral background music, sweeping strings, epic and emotional, building tension, no lyrics",
  calm:       "Calm ambient background music, soft pads, gentle piano, relaxing and peaceful, slow tempo, no lyrics",
  playful:    "Fun playful background music, light and bouncy, bright tones, cheerful and friendly, no lyrics",
};

/** Emotional modifiers appended to the base style prompt when musicMood is present.
 *  These shift tone within the style rather than replacing it entirely. */
const MOOD_MODIFIERS: Record<string, string> = {
  "tense":             "with underlying tension, minor key undertones, sparse arrangement",
  "sparse-somber":     "sparse and restrained, minimal instrumentation, somber and introspective",
  "uplifting-swell":   "building to an uplifting swell, warm major key resolution, sense of relief",
  "energetic-precise": "precise and energetic, crisp transients, confident forward momentum",
  "warm-ambient":      "warm and ambient, soft texture, unhurried and trustworthy",
  "driving-pulse":     "driving pulse, rhythmic urgency, builds to a peak, pressing forward",
  "euphoric":          "euphoric and bright, high energy climax, celebratory feel",
};

// Server-side cache — keyed by style+mood combination
const musicCache = new Map<string, string>();

export async function POST(req: Request) {
  const { style, musicMood } = await req.json() as { style?: MusicStyle; musicMood?: string };
  const musicStyle: MusicStyle = (style && style in MUSIC_PROMPTS) ? style : "cinematic";

  const cacheKey = musicMood ? `${musicStyle}:${musicMood}` : musicStyle;
  if (musicCache.has(cacheKey)) {
    return Response.json({ audioUrl: musicCache.get(cacheKey) });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY not set — skipping music generation");
    return Response.json({ audioUrl: null });
  }

  // Compose the prompt: base style + optional mood modifier
  const basePrompt = MUSIC_PROMPTS[musicStyle];
  const moodModifier = musicMood ? MOOD_MODIFIERS[musicMood] : undefined;
  const finalPrompt = moodModifier ? `${basePrompt}, ${moodModifier}` : basePrompt;

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: finalPrompt,
        duration_seconds: 30,
        prompt_influence: 0.5,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      console.warn(`ElevenLabs music "${cacheKey}" failed (${res.status}):`, err);
      return Response.json({ audioUrl: null });
    }

    const buf = await res.arrayBuffer();
    const audioUrl = `data:audio/mpeg;base64,${Buffer.from(buf).toString("base64")}`;
    musicCache.set(cacheKey, audioUrl);
    console.log(`Music: generated "${cacheKey}" track (${Math.round(buf.byteLength / 1024)}KB)`);
    return Response.json({ audioUrl });
  } catch (err) {
    console.warn(`ElevenLabs music "${cacheKey}" error:`, err);
    return Response.json({ audioUrl: null });
  }
}
