/**
 * Canvas-based video frame extractor — zero npm dependencies.
 *
 * Extracts up to `maxFrames` evenly-spaced CANDIDATE frames from a video File,
 * then filters them with a visual-delta pass so the final set sent to the LLM
 * contains only frames where something meaningful changed on screen.
 *
 * Resize: 512px wide for Pass-2 analysis (full resolution).
 *         The server further downscales to 320px for the cheap Pass-1 scan.
 */

export interface ExtractFramesResult {
  frames: string[];
  duration: number;
}

export type ProgressCallback = (current: number, total: number) => void;

// ---------------------------------------------------------------------------
// Pixel-level similarity — cheap sampled comparison on the canvas ImageData.
// Samples every SAMPLE_STEP pixels. Returns 0–1 (1 = identical).
// ---------------------------------------------------------------------------
const SAMPLE_STEP = 16; // check 1 in every 16 pixels (4 bytes each)
const PIXEL_DIFF_THRESHOLD = 15; // per-channel diff to count as "same"

function frameSimilarity(
  prev: ImageData,
  curr: ImageData,
): number {
  let same = 0;
  let total = 0;
  const len = Math.min(prev.data.length, curr.data.length);
  for (let i = 0; i < len; i += SAMPLE_STEP * 4) {
    const diff =
      Math.abs(curr.data[i]     - prev.data[i])     +
      Math.abs(curr.data[i + 1] - prev.data[i + 1]) +
      Math.abs(curr.data[i + 2] - prev.data[i + 2]);
    if (diff < PIXEL_DIFF_THRESHOLD) same++;
    total++;
  }
  return total > 0 ? same / total : 1;
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

export async function extractFramesFromVideo(
  file: File,
  targetFPS = 1,
  maxFrames = 20,
  onProgress?: ProgressCallback,
): Promise<ExtractFramesResult> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  // Wait for metadata (duration, dimensions)
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error(`Failed to load video: ${file.name}`));
  });

  const duration = video.duration;
  if (!duration || !isFinite(duration) || duration <= 0) {
    URL.revokeObjectURL(url);
    throw new Error("Video duration is unknown or zero");
  }

  // 512px wide — sufficient for LLM visual analysis at Pass-2 resolution.
  const targetWidth = 512;
  const aspect = video.videoHeight / (video.videoWidth || 1);
  const targetHeight = Math.round(targetWidth * aspect);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Could not get canvas 2D context");
  }

  // ---------------------------------------------------------------------------
  // Step 1: Build candidate timestamps.
  // Extract up to 2× maxFrames candidates so the delta filter has room to prune.
  // ---------------------------------------------------------------------------
  const candidateMax = maxFrames * 2;
  const interval = Math.max(duration / candidateMax, 1 / targetFPS);
  const timestamps: number[] = [];
  for (let t = 0; t < duration && timestamps.length < candidateMax; t += interval) {
    timestamps.push(t);
  }
  // Always include the very last frame
  if (timestamps[timestamps.length - 1] < duration - 0.1) {
    timestamps.push(duration - 0.05);
  }

  // ---------------------------------------------------------------------------
  // Step 2: Seek each candidate, compute pixel delta vs. last KEPT frame.
  //   - Similarity > KEEP_THRESHOLD → skip (nearly identical to previous)
  //   - Always keep first and last frame regardless of similarity.
  // ---------------------------------------------------------------------------
  const KEEP_THRESHOLD = 0.98; // skip if ≥98% pixels are the same

  const keptFrames: string[] = [];
  let prevImageData: ImageData | null = null;
  const total = timestamps.length;

  for (let i = 0; i < total; i++) {
    video.currentTime = timestamps[i];
    await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const currData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    const isFirst = i === 0;
    const isLast  = i === total - 1;
    const tooSimilar = prevImageData !== null && frameSimilarity(prevImageData, currData) >= KEEP_THRESHOLD;

    if (isFirst || isLast || !tooSimilar) {
      keptFrames.push(canvas.toDataURL("image/jpeg", 0.82));
      prevImageData = currData;
    }

    // Report progress over the full candidate set
    onProgress?.(i + 1, total);

    // Stop once we have enough diverse frames
    if (keptFrames.length >= maxFrames && !isLast) continue;
  }

  // ---------------------------------------------------------------------------
  // Step 3: If delta filtering was too aggressive (< 4 frames kept), fall back
  // to a simple evenly-spaced selection from the candidate pool.
  // ---------------------------------------------------------------------------
  let finalFrames = keptFrames;
  if (keptFrames.length < 4 && timestamps.length >= 4) {
    console.warn("extractFramesFromVideo: delta filter kept <4 frames — using evenly-spaced fallback");
    finalFrames = [];
    video.currentTime = 0;
    const fallbackStep = Math.max(1, Math.floor(timestamps.length / maxFrames));
    for (let i = 0; i < timestamps.length && finalFrames.length < maxFrames; i += fallbackStep) {
      video.currentTime = timestamps[i];
      await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      finalFrames.push(canvas.toDataURL("image/jpeg", 0.82));
    }
  }

  console.log(
    `extractFramesFromVideo: ${total} candidates → ${finalFrames.length} kept after delta filter (${timestamps.length} total timestamps)`,
  );

  URL.revokeObjectURL(url);
  return { frames: finalFrames, duration };
}
