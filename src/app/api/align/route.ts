/**
 * /api/align — Automated Audio-Visual Alignment
 *
 * Phase 3: Takes word timings (from ElevenLabs TTS) and a scene plan,
 * returns adjusted durationInFrames values so visual reveals hit exactly
 * on spoken words — replacing guesswork with mathematically grounded timing.
 *
 * POST { scenes: ScenePlan[] }
 * → { scenes: ScenePlan[], adjustments: { title, oldDuration, newDuration }[] }
 */

import type { ScenePlan } from "@/types/generation";
import { alignSceneDurations } from "@/lib/alignScenes";

const FPS = 30;

export async function POST(req: Request) {
  try {
    const { scenes } = await req.json() as { scenes: ScenePlan[] };

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return Response.json({ error: "scenes array is required" }, { status: 400 });
    }

    const { scenes: aligned, adjustments } = alignSceneDurations(scenes);

    const totalOld = scenes.reduce((s, sc) => s + sc.durationInFrames, 0);
    const totalNew = aligned.reduce((s, sc) => s + sc.durationInFrames, 0);

    console.log(
      `Alignment: ${adjustments.length} scenes adjusted. Total: ${totalOld}f → ${totalNew}f (${(totalNew / FPS).toFixed(1)}s)`,
    );

    return Response.json({
      scenes: aligned,
      adjustments,
      totalFrames: { before: totalOld, after: totalNew },
    });
  } catch (err) {
    console.error("Align route error:", err);
    return Response.json({ error: "Alignment failed" }, { status: 500 });
  }
}
