import { z } from "zod";

export const COMP_NAME = "DynamicComp";

export const CompositionProps = z.object({
  code: z.string(),
  durationInFrames: z.number(),
  fps: z.number(),
  /** Attached screenshot images passed as base64 data URLs, injected into compiler scope as ATTACHED_IMAGES */
  images: z.array(z.string()).default([]),
  /** Brand tokens injected into compiler scope as BRAND */
  brand: z.record(z.string(), z.string()).default({}),
});
