export const runtime = "nodejs";

import { createReadStream, existsSync, statSync, unlinkSync } from "fs";
import path from "path";
import { Readable } from "stream";

const RENDERS_DIR = path.join(process.cwd(), ".renders");

// Sanitize jobId to prevent path traversal — only allow UUIDs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!UUID_RE.test(jobId)) {
    return new Response("Invalid job ID", { status: 400 });
  }

  const filePath = path.join(RENDERS_DIR, `${jobId}.mp4`);

  if (!existsSync(filePath)) {
    return new Response("Render not found", { status: 404 });
  }

  const { size } = statSync(filePath);
  const nodeStream = createReadStream(filePath);

  // Delete the file after streaming to avoid accumulating renders on disk
  nodeStream.on("close", () => {
    try {
      unlinkSync(filePath);
    } catch {
      // ignore cleanup errors
    }
  });

  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": 'attachment; filename="video.mp4"',
      "Content-Length": size.toString(),
    },
  });
}
