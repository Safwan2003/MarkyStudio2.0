/**
 * Phase 3 — Automated Audio-Visual Alignment (pure utility, shared by hook + API route).
 *
 * For each scene with word timings, adjusts durationInFrames so the visual
 * duration exactly matches the audio duration + tail padding.
 * No API calls — pure math derived from ElevenLabs word timestamps.
 */

import type { ScenePlan } from "@/types/generation";

/** Breathing room after last spoken word before scene ends (1.16s). */
const TAIL_FRAMES = 35;
/** Never shrink a scene below this, regardless of audio. */
const MIN_SCENE_FRAMES = 90; // 3s at 30fps

export interface AlignmentAdjustment {
  sceneId: number;
  title: string;
  oldDuration: number;
  newDuration: number;
  audioDurationFrames: number;
  reason: string;
}

export function alignSceneDurations(scenes: ScenePlan[]): {
  scenes: ScenePlan[];
  adjustments: AlignmentAdjustment[];
} {
  const adjustments: AlignmentAdjustment[] = [];

  const aligned = scenes.map((scene) => {
    if (!scene.wordTimings || scene.wordTimings.length === 0) return scene;

    const lastWord = scene.wordTimings[scene.wordTimings.length - 1];
    const audioDurationFrames = lastWord?.endFrame ?? 0;

    // Fallback if audioDurationFrames is somehow NaN or missing
    if (Number.isNaN(audioDurationFrames)) {
      return { ...scene, durationInFrames: scene.durationInFrames || MIN_SCENE_FRAMES };
    }

    const targetDuration = Math.max(MIN_SCENE_FRAMES, audioDurationFrames + TAIL_FRAMES);

    if (targetDuration === scene.durationInFrames) return scene;

    adjustments.push({
      sceneId: scene.id,
      title: scene.title,
      oldDuration: scene.durationInFrames,
      newDuration: targetDuration,
      audioDurationFrames,
      reason: targetDuration > scene.durationInFrames
        ? `Audio ends at frame ${audioDurationFrames} — extended by ${TAIL_FRAMES}f tail`
        : `Trimmed to match audio — prevents dead air`,
    });

    return { ...scene, durationInFrames: targetDuration };
  });

  return { scenes: aligned, adjustments };
}
