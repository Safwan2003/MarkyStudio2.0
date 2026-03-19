---
title: Premium Confetti Celebration
impact: MEDIUM
impactDescription: colorful confetti particles rain down over a full-screen product UI screenshot, with an optional dark header bar overlay and kinetic text — the "moment of success" showcase scene
tags: confetti, celebration, particles, showcase, product, screenshot, desklog, success, launch, festive
---

## Confetti Celebration Pattern

Product screenshot fills the entire frame. Confetti particles (small colored rectangles and rotated squares) rain from the top at varied speeds. An optional semi-transparent header bar overlays the top with product name and animated text. Creates a "launch day" or "deal closed" euphoria.

**Typical use case**: Showcase/product demo scene for CRM, project management, or sales tools where celebrating a win (deal closed, project shipped) is the narrative.

---

## Full-Screen Product Screenshot Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Screenshot fades in at scene start
const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

<AbsoluteFill>
  {/* Product screenshot fills full frame */}
  {ATTACHED_IMAGES[0] ? (
    <img
      src={ATTACHED_IMAGES[0]}
      style={{
        width: "100%", height: "100%",
        objectFit: "cover",
        objectPosition: "top left",
        opacity: bgOpacity,
      }}
    />
  ) : (
    // Fallback: dark product-like gradient
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(160deg, #1a2332 0%, #0f1923 100%)",
      opacity: bgOpacity,
    }} />
  )}
</AbsoluteFill>
```

---

## Confetti Particles

Generate particles outside the component (stable across renders). Each particle has random x position, fall speed, color, rotation speed, and shape:

```tsx
// MUST be defined outside the component — stable across renders
const CONFETTI_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#8b5cf6", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ec4899", // pink
];

// Generate 80 particles
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,              // % of width
  fallSpeed: 0.18 + Math.random() * 0.28, // px per frame (varies per particle)
  rotateSpeed: (Math.random() - 0.5) * 6, // deg per frame
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  width: 6 + Math.random() * 10,       // px
  height: 4 + Math.random() * 6,       // px
  delay: Math.random() * 60,           // frames before this particle starts
  wobble: Math.random() * Math.PI * 2, // phase offset for horizontal wobble
  wobbleAmp: 20 + Math.random() * 40,  // px horizontal wobble amplitude
}));

// Inside the component:
{PARTICLES.map((p) => {
  const elapsed = frame - p.delay;
  if (elapsed < 0) return null;

  const y = -20 + elapsed * p.fallSpeed * (height / 400); // falls from above top
  if (y > height + 20) return null; // off screen

  // Horizontal wobble (sine wave drift)
  const x = (p.x / 100) * width + Math.sin(elapsed * 0.06 + p.wobble) * p.wobbleAmp;
  const rotate = elapsed * p.rotateSpeed;

  return (
    <div
      key={p.id}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: p.width,
        height: p.height,
        backgroundColor: p.color,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        borderRadius: p.width > 10 ? 1 : 0, // slightly rounded for larger pieces
        opacity: 0.9,
      }}
    />
  );
})}
```

**Performance**: 80 particles is safe. Go up to 120 for denser confetti, but avoid per-frame `Math.random()` — pre-generate everything outside the component.

---

## Shaped Confetti Variants

Mix rectangle particles with circular dots and thin streaks for variety:

```tsx
// Add to PARTICLES generation — shape property
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  // ... existing props ...
  shape: i % 5 === 0 ? "circle" : i % 7 === 0 ? "streak" : "rect",
}));

// In the render:
<div style={{
  // ... position, transform ...
  borderRadius: p.shape === "circle" ? "50%" : p.shape === "streak" ? 0 : 1,
  width:  p.shape === "streak" ? 2 : p.width,
  height: p.shape === "streak" ? p.height * 3 : p.height,
}} />
```

---

## Dark Header Bar Overlay (Optional)

Semi-transparent dark header bar at the top with product name and animated title text:

```tsx
const HEADER_HEIGHT = 56;
const headerOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

// Animated title: words appear one by one
const TITLE_WORDS = ["Desklog", "AI", "—", "Live", "Pipeline"];
const TITLE_START = 15;

<div style={{
  position: "absolute",
  top: 0, left: 0, right: 0,
  height: HEADER_HEIGHT,
  backgroundColor: "rgba(10, 15, 20, 0.75)",
  backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center",
  paddingLeft: 32, gap: 8,
  opacity: headerOpacity,
  zIndex: 50,
}}>
  {TITLE_WORDS.map((word, i) => {
    const wordSpring = spring({
      frame: frame - (TITLE_START + i * 4),
      fps,
      config: { damping: 16, stiffness: 200 },
    });
    return (
      <span key={i} style={{
        fontSize: 18,
        fontWeight: i < 2 ? 700 : 400,
        color: i < 2 ? "white" : "rgba(255,255,255,0.6)",
        fontFamily: "Inter, sans-serif",
        letterSpacing: "-0.01em",
        transform: `translateY(${(1 - wordSpring) * -12}px)`,
        opacity: wordSpring,
      }}>
        {word}
      </span>
    );
  })}
</div>
```

---

## Confetti Burst (Triggered Event)

For a confetti burst from a specific point (e.g. a "Deal Closed" button location) rather than rain from the top:

```tsx
const BURST_FRAME = 45; // frame when burst starts
const BURST_X = width * 0.65; // x center of burst
const BURST_Y = height * 0.35; // y center of burst

// Generate burst particles outside component
const BURST_PARTICLES = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * Math.PI * 2;
  const speed = 3 + Math.random() * 5;
  return {
    id: i + 1000,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 4, // upward bias
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + Math.random() * 8,
    rotateSpeed: (Math.random() - 0.5) * 12,
  };
});

// In component:
{BURST_PARTICLES.map((p) => {
  const elapsed = frame - BURST_FRAME;
  if (elapsed < 0) return null;

  const gravity = 0.15;
  const x = BURST_X + p.vx * elapsed;
  const y = BURST_Y + p.vy * elapsed + 0.5 * gravity * elapsed * elapsed;
  const opacity = interpolate(elapsed, [0, 30, 60], [1, 0.8, 0], { extrapolateRight: "clamp" });

  return (
    <div key={p.id} style={{
      position: "absolute",
      left: x, top: y,
      width: p.size, height: p.size * 0.6,
      backgroundColor: p.color,
      transform: `translate(-50%, -50%) rotate(${elapsed * p.rotateSpeed}deg)`,
      opacity,
      borderRadius: 1,
    }} />
  );
})}
```

---

## Complete Scene Structure

```tsx
// OUTSIDE COMPONENT — stable across frames
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({ /* ... */ }));

export const ConfettiCelebration = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 1. Product screenshot background */}
      {/* 2. Header bar overlay (optional) */}
      {/* 3. Confetti rain particles */}
    </AbsoluteFill>
  );
};
```

---

## Usage Notes

- Define `PARTICLES` array OUTSIDE the component — never inside. Defining inside causes new random values on every frame, creating a flickering mess
- `overflow: "hidden"` on AbsoluteFill prevents confetti from rendering outside the video frame
- `fallSpeed * (height / 400)` normalizes fall speed relative to canvas height — the same config works at 1920x1080 and 1280x720
- For confetti starting at the very top edge: initial `y = -20 + elapsed * fallSpeed`. Guard `if (y > height + 20) return null` to skip off-screen particles
- `objectPosition: "top left"` keeps the important parts of the UI screenshot (header, KPIs) visible even if the image is cropped
- The header bar `backdropFilter: blur(8px)` blurs the screenshot behind it for a glassy effect
