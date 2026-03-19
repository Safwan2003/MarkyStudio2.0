---
title: Premium Shape Morph Transition — Color Flood Fill
impact: HIGH
impactDescription: a clicked element's color explosively expands to fill the entire screen then reveals the next scene — the signature fluid transition of $10K agency videos
tags: transition, morph, flood-fill, color-expand, clip-path, shape, wipe, cinematic, button-click, scene-change, fluid, reveal
---

## Core Concept

Instead of a crossfade, a UI element (button click, icon tap) **explodes outward** to fill the screen with its color, then that solid color sweeps away to reveal the next scene.

Uses `clipPath: circle(radius at x y)` — hardware-accelerated, zero dependencies.

---

## The Flood Fill Expand

```tsx
// Trigger: the cursor clicks an element at (triggerX, triggerY) at frame triggerFrame
// Phase 1: circle expands from trigger point to cover entire screen (25 frames)
// Phase 2: solid fill holds for 5 frames
// Phase 3: content fades in over the solid fill (20 frames)

const DIAGONAL = Math.sqrt(width * width + height * height); // max radius needed

const expandProgress = spring({
  frame: frame - triggerFrame,
  fps,
  config: { damping: 40, stiffness: 300 },
  durationInFrames: 25,
});

const fillRadius = interpolate(expandProgress, [0, 1], [0, DIAGONAL * 1.05]);

// The flood fill layer
<div style={{
  position: "absolute", inset: 0,
  background: fillColor,   // BRAND.primary or the button's color
  clipPath: `circle(${fillRadius}px at ${triggerX}px ${triggerY}px)`,
  zIndex: 50,
  pointerEvents: "none",
}} />
```

---

## Full Transition Pattern (end of one scene)

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationInFrames = useVideoConfig().durationInFrames;

  // The trigger: last big cursor click in the scene
  const TRIGGER_FRAME = durationInFrames - 45;
  const TRIGGER_X = width * 0.5;    // center of the CTA button
  const TRIGGER_Y = height * 0.65;
  const FILL_COLOR = BRAND.primary;

  const DIAGONAL = Math.sqrt(width * width + height * height);

  const expandProg = spring({
    frame: frame - TRIGGER_FRAME,
    fps,
    config: { damping: 40, stiffness: 280 },
    durationInFrames: 22,
  });
  const fillRadius = interpolate(expandProg, [0, 1], [0, DIAGONAL * 1.1]);
  const isExpanding = frame >= TRIGGER_FRAME;

  // Content that fades out as the fill expands
  const contentOpacity = isExpanding
    ? interpolate(frame, [TRIGGER_FRAME, TRIGGER_FRAME + 15], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* ── Scene content ── */}
      <div style={{ opacity: contentOpacity }}>
        {/* your scene elements here */}
        <div style={{
          position: "absolute", left: "50%", top: "60%",
          transform: "translate(-50%, -50%)",
        }}>
          {/* CTA button at TRIGGER_X, TRIGGER_Y */}
          <div style={{
            padding: "16px 40px", borderRadius: 12,
            background: BRAND.primary, color: "#fff",
            fontSize: 18, fontWeight: 700, fontFamily: BRAND.font ?? "Inter",
          }}>
            Get Started
          </div>
        </div>
      </div>

      {/* ── Flood fill overlay ── */}
      {isExpanding && (
        <div style={{
          position: "absolute", inset: 0,
          background: FILL_COLOR,
          clipPath: `circle(${fillRadius}px at ${TRIGGER_X}px ${TRIGGER_Y}px)`,
          zIndex: 50,
          pointerEvents: "none",
        }} />
      )}
    </AbsoluteFill>
  );
};
```

---

## Reveal After Fill (start of next scene)

At the beginning of the following scene, reverse the effect — the fill color shrinks away to reveal the new content:

```tsx
// At start of next scene: fill starts covering full screen, then shrinks to nothing
const REVEAL_FRAME = 0;
const DIAGONAL = Math.sqrt(width * width + height * height);

const shrinkProg = spring({
  frame: frame - REVEAL_FRAME,
  fps,
  config: { damping: 28, stiffness: 200 },
  durationInFrames: 30,
});
const fillRadius = interpolate(shrinkProg, [0, 1], [DIAGONAL * 1.1, 0]);

// Scene content appears as fill shrinks
const contentOpacity = interpolate(shrinkProg, [0.3, 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Reveal fill (shrinking) — same fill color as previous scene's expand
<div style={{
  position: "absolute", inset: 0,
  background: PREV_FILL_COLOR,  // must match previous scene
  clipPath: `circle(${fillRadius}px at ${width * 0.5}px ${height * 0.65}px)`,
  zIndex: 50, pointerEvents: "none",
}} />
```

---

## Trigger from CURSOR_STEPS

When using with `premium-cursor-engine`, trigger the flood fill from the final cursor click:

```tsx
// Find the last CURSOR_STEP with action: "click"
const lastClick = CURSOR_STEPS[CURSOR_STEPS.length - 1];
const TRIGGER_FRAME = lastClick.time + 5;   // 5 frames after cursor clicks
const TRIGGER_X = lastClick.x * width;
const TRIGGER_Y = lastClick.y * height;
```

---

## Variants

**Radial wipe from corner** (dramatic reveal):
```tsx
// Start from top-right corner — expansive feel
const TRIGGER_X = width * 0.98;
const TRIGGER_Y = height * 0.02;
```

**Instant snap** (energetic, kinetic style — no spring, linear):
```tsx
const fillRadius = interpolate(frame, [TRIGGER_FRAME, TRIGGER_FRAME + 12], [0, DIAGONAL], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
});
```

**Color sequence** (two fills — accent then brand bg):
```tsx
// First fill: BRAND.primary at TRIGGER_FRAME (fast)
// Second fill: BRAND.bg at TRIGGER_FRAME + 8 (slightly slower, reveals content)
```

---

## When to Use

- **CTA scenes**: user clicks "Get Started" → flood fills screen → next scene reveals
- **Feature transitions**: "click here to see Feature B" → transition
- **Dramatic reveals**: any moment of high emotion or surprise in the narrative
- **Combine with premium-kinetic-text**: after the text punch, the final word expands to fill the screen

---

## Critical Rules

1. `TRIGGER_X / TRIGGER_Y` should match the cursor's last click position exactly for visual coherence
2. The `fill color` and `trigger position` MUST match between the outgoing and incoming scenes for the transition to feel seamless
3. Use `spring` with `damping: 35–45` for the expand (snappy) and `damping: 25–30` for the reveal (slightly softer)
4. `clipPath: circle()` is hardware-accelerated — no performance cost even at 60fps
5. Do NOT use `filter: blur()` on the flood fill div — it defeats the clean edge
