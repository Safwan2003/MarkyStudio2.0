import { z } from "zod";
import { CompositionProps } from "../../types/constants";

type LocalRenderInput = z.infer<typeof CompositionProps>;

/**
 * Renders a video locally on the Next.js server via SSE progress stream.
 * Returns { jobId, size } when complete; throws on error.
 */
export const renderVideoLocally = async (
  inputProps: LocalRenderInput,
  onProgress: (progress: number) => void
): Promise<{ jobId: string; size: number }> => {
  const response = await fetch("/api/render-local", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(inputProps),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Render request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let data: { type: string; progress?: number; jobId?: string; size?: number; message?: string };
      try {
        data = JSON.parse(line.slice(6));
      } catch {
        continue;
      }

      if (data.type === "progress" && data.progress != null) {
        onProgress(data.progress);
      } else if (data.type === "done" && data.jobId != null && data.size != null) {
        return { jobId: data.jobId, size: data.size };
      } else if (data.type === "error") {
        throw new Error(data.message ?? "Unknown render error");
      }
    }
  }

  throw new Error("Render stream ended without a completion event");
};

/** Returns the download URL for a completed local render job */
export const getLocalDownloadUrl = (jobId: string) =>
  `/api/render-local/download/${jobId}`;
