/**
 * /api/music — ElevenLabs Music Generation proxy
 *
 * Generates a background music track for a given style using the
 * ElevenLabs Music Generation API. Results are cached server-side so
 * the same style is only generated once per server process.
 *
 * POST { style: "corporate" | "energetic" | "cinematic" | "calm" | "playful" }
 * → { audioUrl: string }  — base64 data URL, or { audioUrl: null } if unavailable
 */

type MusicStyle = "corporate" | "energetic" | "cinematic" | "calm" | "playful";

const MUSIC_PROMPTS: Record<MusicStyle, string> = {
  corporate:  "Professional corporate background music, clean piano and subtle strings, modern business feel, steady tempo, no lyrics",
  energetic:  "Upbeat energetic electronic music, driving beat, synth leads, fast tempo, motivational and exciting, no lyrics",
  cinematic:  "Cinematic orchestral background music, sweeping strings, epic and emotional, building tension, no lyrics",
  calm:       "Calm ambient background music, soft pads, gentle piano, relaxing and peaceful, slow tempo, no lyrics",
  playful:    "Fun playful background music, light and bouncy, bright tones, cheerful and friendly, no lyrics",
};

// Server-side cache — lives for the lifetime of the Next.js server process
const musicCache = new Map<MusicStyle, string>();

export async function POST(req: Request) {
  const { style } = await req.json() as { style?: MusicStyle };
  const musicStyle: MusicStyle = (style && style in MUSIC_PROMPTS) ? style : "cinematic";

  if (musicCache.has(musicStyle)) {
    return Response.json({ audioUrl: musicCache.get(musicStyle) });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY not set — skipping music generation");
    return Response.json({ audioUrl: null });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: MUSIC_PROMPTS[musicStyle],
        duration_seconds: 30,
        prompt_influence: 0.5,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      console.warn(`ElevenLabs music "${musicStyle}" failed (${res.status}):`, err);
      return Response.json({ audioUrl: null });
    }

    const buf = await res.arrayBuffer();
    const audioUrl = `data:audio/mpeg;base64,${Buffer.from(buf).toString("base64")}`;
    musicCache.set(musicStyle, audioUrl);
    console.log(`Music: generated "${musicStyle}" track (${Math.round(buf.byteLength / 1024)}KB)`);
    return Response.json({ audioUrl });
  } catch (err) {
    console.warn(`ElevenLabs music "${musicStyle}" error:`, err);
    return Response.json({ audioUrl: null });
  }
}
