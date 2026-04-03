export function normalizeRuntimeErrorMessage(message: string): string {
  return (message || "Unknown runtime error")
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\bscene\s+\d+\b/g, "scene")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSceneCodeSignature(code: string): string {
  const normalized = (code || "").trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
  }
  return `${normalized.length}:${(hash >>> 0).toString(36)}`;
}

export function makeRuntimeFailureKey(
  sceneIndex: number,
  sceneCode: string,
  message: string,
): string {
  return `${sceneIndex}:${buildSceneCodeSignature(sceneCode)}:${normalizeRuntimeErrorMessage(message)}`;
}
