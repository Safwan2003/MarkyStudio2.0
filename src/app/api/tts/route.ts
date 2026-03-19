/**
 * /api/tts — ElevenLabs text-to-speech proxy with Gemini TTS fallback
 *
 * Priority:
 *   1. ElevenLabs Flash v2.5 (with word-level timestamps)
 *   2. ElevenLabs basic endpoint (without timestamps)
 *   3. Gemini TTS (gemini-2.5-flash-preview-tts) — uses Google AI key
 *   4. Silence (null audioUrl)
 *
 * POST { text: string, voiceId?: string, fps?: number }
 * → { audioUrl: string | null, wordTimings?: { word, startFrame, endFrame }[] }
 */

import { GoogleGenAI } from "@google/genai";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs "Rachel"
const MAX_CHARS = 1000; // guard against excessive usage
const FPS = 30; // Remotion frame rate

/** Convert ElevenLabs character-level alignment to word-level frame timings. */
function alignmentToWordTimings(
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  },
  fps: number,
): { word: string; startFrame: number; endFrame: number }[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
  const wordTimings: { word: string; startFrame: number; endFrame: number }[] = [];

  let wordStart = 0;
  let currentWord = "";

  for (let i = 0; i <= characters.length; i++) {
    const ch = characters[i] ?? " "; // treat end as space
    if (ch === " " || i === characters.length) {
      if (currentWord.trim()) {
        const startSec = character_start_times_seconds[wordStart] ?? 0;
        const endSec = character_end_times_seconds[i - 1] ?? startSec + 0.3;
        wordTimings.push({
          word: currentWord.trim(),
          startFrame: Math.round(startSec * fps),
          endFrame: Math.round(endSec * fps),
        });
      }
      currentWord = "";
      wordStart = i + 1;
    } else {
      if (!currentWord) wordStart = i;
      currentWord += ch;
    }
  }

  return wordTimings;
}

/** Add a WAV header to raw PCM data from Gemini TTS. */
function pcmToWav(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  const dataLength = pcmData.length;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitDepth / 8), 32);
  buffer.writeUInt16LE(bitDepth, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  buffer.set(pcmData, 44);
  return buffer;
}

/** Gemini TTS fallback — uses existing GOOGLE_GENERATIVE_AI_API_KEY. */
async function geminiTTS(text: string, apiKey: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai.models.generateContent as any)({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const part = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part?.data) return null;

    const mimeType: string = part.mimeType ?? "audio/wav";
    const rawData = Buffer.from(part.data, "base64");

    // If Gemini returns raw PCM, wrap it in a WAV header
    if (mimeType.includes("pcm")) {
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
      const audioData = pcmToWav(new Uint8Array(rawData), sampleRate);
      const b64 = audioData.toString("base64");
      console.log(`Gemini TTS: ${text.slice(0, 40)}... → ${Math.round(audioData.length / 1024)}KB WAV`);
      return `data:audio/wav;base64,${b64}`;
    }

    const finalMime = mimeType.split(";")[0];
    console.log(`Gemini TTS: ${text.slice(0, 40)}... → ${Math.round(rawData.length / 1024)}KB ${finalMime}`);
    return `data:${finalMime};base64,${part.data}`;
  } catch (err) {
    console.warn("Gemini TTS failed:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { text, voiceId, fps = FPS } = await req.json();

    if (!text?.trim()) {
      return Response.json({ audioUrl: null, error: "No text provided" });
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const truncated = text.trim().slice(0, MAX_CHARS);
    const voice = voiceId ?? process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

    // ── Attempt 1: ElevenLabs Flash with timestamps ──────────────────────────
    if (elevenLabsKey) {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`,
        {
          method: "POST",
          headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: truncated,
            model_id: "eleven_flash_v2_5",
            voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.30, use_speaker_boost: true },
          }),
        },
      );

      if (res.ok) {
        const data = await res.json() as {
          audio_base64: string;
          alignment?: {
            characters: string[];
            character_start_times_seconds: number[];
            character_end_times_seconds: number[];
          };
        };
        const audioUrl = data.audio_base64 ? `data:audio/mpeg;base64,${data.audio_base64}` : null;
        const wordTimings = data.alignment ? alignmentToWordTimings(data.alignment, fps) : [];
        console.log(`TTS (ElevenLabs Flash): ${wordTimings.length} words timed`);
        return Response.json({ audioUrl, wordTimings });
      }

      const errText = await res.text().catch(() => res.statusText);
      console.warn(`ElevenLabs Flash TTS failed (${res.status}), trying fallback:`, errText);

      // ── Attempt 2: ElevenLabs basic (no timestamps) ──────────────────────
      const fallbackRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          method: "POST",
          headers: { "xi-api-key": elevenLabsKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({
            text: truncated,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
          }),
        },
      );

      if (fallbackRes.ok) {
        const buf = await fallbackRes.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        console.log(`TTS (ElevenLabs basic): ${Math.round(buf.byteLength / 1024)}KB`);
        return Response.json({ audioUrl: `data:audio/mpeg;base64,${b64}`, wordTimings: null });
      }

      const err2 = await fallbackRes.text().catch(() => fallbackRes.statusText);
      console.warn(`ElevenLabs fallback also failed (${fallbackRes.status}):`, err2);
    }

    // ── Attempt 3: Gemini TTS ────────────────────────────────────────────────
    if (googleKey) {
      console.log("TTS: falling back to Gemini TTS...");
      const audioUrl = await geminiTTS(truncated, googleKey);
      if (audioUrl) {
        return Response.json({ audioUrl, wordTimings: null });
      }
    }

    // ── All failed — return silence ──────────────────────────────────────────
    console.warn("TTS: all providers failed — returning silence");
    return Response.json({ audioUrl: null, wordTimings: [] });
  } catch (err) {
    console.warn("TTS route error (non-fatal):", err);
    return Response.json({ audioUrl: null, wordTimings: [] });
  }
}
