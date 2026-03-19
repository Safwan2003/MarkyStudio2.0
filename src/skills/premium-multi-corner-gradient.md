---
title: Premium Multi-Corner Gradient Background
impact: MEDIUM
impactDescription: creates a soft, airy pastel background with colored blobs bleeding in from multiple corners — near-white center with rich corner depth
tags: background, gradient, corner blobs, pastel, light, clean, multi-corner, soft, pretaa
---

## Multi-Corner Gradient Pattern

A near-white base with large, soft radial-gradient blobs positioned at screen corners. Each blob is a different hue (typically brand primary tones — blue/indigo, salmon, warm red). The center stays bright white, drawing focus to the content.

**Typical use case**: Any scene on a light-colored brand (Pretaa, Linear, Notion-style). Use as the background layer under network intros, customer journey scenes, CTA scenes, or logo reveals.

---

## Background Implementation

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();

// Animate blobs with very slow drift for a living background feel
const blobDrift = Math.sin(frame * 0.008) * 0.02; // tiny oscillation, max 2%

<AbsoluteFill style={{ backgroundColor: "#f0f2f6" }}>
  {/* Bottom-left blob — brand primary (indigo/blue) */}
  <div style={{
    position: "absolute",
    left: 0, bottom: 0,
    width: "65%",
    height: "70%",
    background: `radial-gradient(circle at 0% 100%, rgba(99,102,241,0.28) 0%, transparent 60%)`,
    transform: `translateY(${blobDrift * height}px)`,
  }} />

  {/* Top-right blob — salmon/coral */}
  <div style={{
    position: "absolute",
    right: 0, top: 0,
    width: "60%",
    height: "65%",
    background: `radial-gradient(circle at 100% 0%, rgba(248,113,113,0.22) 0%, transparent 58%)`,
    transform: `translateY(${-blobDrift * height}px)`,
  }} />

  {/* Bottom-right blob — warm red, subtle */}
  <div style={{
    position: "absolute",
    right: 0, bottom: 0,
    width: "45%",
    height: "50%",
    background: `radial-gradient(circle at 100% 100%, rgba(239,68,68,0.14) 0%, transparent 50%)`,
  }} />

  {/* Optional: top-left accent — very faint blue */}
  <div style={{
    position: "absolute",
    left: 0, top: 0,
    width: "35%",
    height: "40%",
    background: `radial-gradient(circle at 0% 0%, rgba(139,92,246,0.10) 0%, transparent 55%)`,
  }} />
</AbsoluteFill>
```

**Key**: No `filter: blur()` needed — the radial-gradient falloff IS the blur. This is lightweight (no GPU compositing layers).

---

## Adapting Colors to Brand

Swap the RGBA colors to match `BRAND.primary`. Use 0.20–0.30 opacity for the primary corner, 0.10–0.18 for secondary corners:

```tsx
// Helper: hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const primary = BRAND.primary || "#6366f1";
const secondary = BRAND.secondary || "#f87171";

// Bottom-left: primary at 0.28
background: `radial-gradient(circle at 0% 100%, ${hexToRgba(primary, 0.28)} 0%, transparent 60%)`

// Top-right: secondary at 0.20
background: `radial-gradient(circle at 100% 0%, ${hexToRgba(secondary, 0.20)} 0%, transparent 58%)`
```

---

## 2-Corner Minimal Variant

For cleaner, more restrained scenes — just two corners:

```tsx
<AbsoluteFill style={{ backgroundColor: "#f8f9fc" }}>
  {/* Bottom-left only */}
  <div style={{
    position: "absolute", left: 0, bottom: 0,
    width: "70%", height: "75%",
    background: `radial-gradient(circle at 0% 100%, rgba(99,102,241,0.22) 0%, transparent 55%)`,
  }} />
  {/* Top-right only */}
  <div style={{
    position: "absolute", right: 0, top: 0,
    width: "55%", height: "60%",
    background: `radial-gradient(circle at 100% 0%, rgba(248,113,113,0.16) 0%, transparent 52%)`,
  }} />
</AbsoluteFill>
```

---

## Usage Notes

- Pairs perfectly with `premium-network-intro`, `premium-customer-journey`, `premium-cta-scene` (light variant), and `premium-icon-concept-scene`
- Layer content (avatars, text, cards) at `zIndex: 10+` above the background divs
- The near-white center keeps headlines and data cards readable without any text shadow
- Do NOT use `filter: blur()` on corner blobs — it adds compositing cost with no visual benefit over the gradient falloff
