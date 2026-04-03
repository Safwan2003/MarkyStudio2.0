export const runtime = "nodejs";
export const maxDuration = 300; // 5 min timeout for renders

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync } from "fs";
import { stat } from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { COMP_NAME } from "../../../../types/constants";

// Cache the bundle across requests so we only Webpack-bundle once per server start
let bundleCache: string | null = null;

const RENDERS_DIR = path.join(process.cwd(), ".renders");

function ensureRendersDir() {
  if (!existsSync(RENDERS_DIR)) {
    mkdirSync(RENDERS_DIR, { recursive: true });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    code,
    durationInFrames,
    fps,
    images = [],
    brand = {},
    voiceovers = {},
  } = body as {
    code: string;
    durationInFrames: number;
    fps: number;
    images?: string[];
    brand?: Record<string, string>;
    voiceovers?: Record<string, string>;
  };

  if (!code) {
    return new Response(JSON.stringify({ error: "No code provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const jobId = randomUUID();
  const outputPath = path.join(RENDERS_DIR, `${jobId}.mp4`);
  ensureRendersDir();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Step 1: bundle (cached after first call)
        send({ type: "progress", progress: 0.02, message: "Bundling composition..." });

        if (!bundleCache || !existsSync(bundleCache)) {
          bundleCache = await bundle({
            entryPoint: path.resolve(process.cwd(), "src/remotion/index.ts"),
            webpackOverride: (config) => config,
          });
        }

        send({ type: "progress", progress: 0.10, message: "Selecting composition..." });

        const inputProps = { code, durationInFrames, fps, images, brand, voiceovers };

        const composition = await selectComposition({
          serveUrl: bundleCache,
          id: COMP_NAME,
          inputProps,
        });

        send({ type: "progress", progress: 0.15, message: "Rendering frames..." });

        await renderMedia({
          composition,
          serveUrl: bundleCache,
          codec: "h264",
          // Agency standard: use 'high' profile for better gradient/glow compression
          // and concurrency: 8 to maximize local hardware threads for heavy CSS blurs.
          enforceAudioTrack: true,
          concurrency: 8,
          browserExecutable: undefined, // default Chromium
          chromiumOptions: {
            disableWebSecurity: true,
            // Use supported properties for Chromium optimization
            headless: true,
          },
          outputLocation: outputPath,
          inputProps,
          onProgress: ({ progress }) => {
            // progress is 0–1; map to 0.15–0.98
            const scaled = 0.15 + (progress * 0.83);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "progress", progress: scaled })}\n\n`)
            );
          },
        });

        const { size } = await stat(outputPath);
        send({ type: "done", jobId, size });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Render failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
