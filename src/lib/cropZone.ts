/**
 * Crop a base64-encoded image to a bounding box.
 * Uses sharp for efficient server-side image cropping.
 * bbox: [x, y, width, height] in pixels
 * Returns a new base64 data URL of the cropped region.
 */

export async function cropImageToZone(
  imageDataUrl: string,
  bbox: [number, number, number, number], // [x, y, w, h]
): Promise<string> {
  const match = imageDataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) throw new Error("Invalid image data URL");
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  // Use sharp for cropping
  const sharp = (await import("sharp")).default;
  const [x, y, w, h] = bbox.map(Math.round);

  const cropped = await sharp(buffer)
    .extract({ left: Math.max(0, x), top: Math.max(0, y), width: Math.max(1, w), height: Math.max(1, h) })
    .toBuffer();

  return `data:${mimeType};base64,${cropped.toString("base64")}`;
}
