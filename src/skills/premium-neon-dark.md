---
title: Premium Dark / Neon Theme
impact: HIGH
impactDescription: creates cinematic dark-theme animations with SVG neon glow filters, sonar rings, shape-masked reveals, and heartbeat pulses
tags: dark, neon, glow, sonar, svg-filter, shape-mask, heartbeat, cinematic
---

## Dark Theme Foundation

For tech/analytics/healthcare products — deep dark background with neon accent color:

```tsx
const PRIMARY_COLOR = "#00ff9d"; // neon green — swap for any brand neon

<AbsoluteFill style={{ backgroundColor: "#020403", overflow: "hidden" }}>
  {/* Radial focus gradient */}
  <div style={{
    position: "absolute", inset: 0,
    background: `radial-gradient(circle at center, #0a1f14 0%, #000000 70%)`,
    opacity: 0.8,
  }} />

  {/* SVG Noise texture for "agency film grain" feel */}
  <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.05 }}>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
</AbsoluteFill>
```

---

## Sonar / Radar Rings

Expanding rings that pulse outward from a center point — for AI, analytics, or precision-tech products:

```tsx
const renderSonarRing = (index: number) => {
  const RING_PERIOD = 90; // frames per full expansion
  const delay       = index * 15; // stagger between rings
  const progress    = (frame - delay) % RING_PERIOD;
  const active      = frame > delay;

  if (!active) return null;

  const rScale   = interpolate(progress, [0, RING_PERIOD], [0.8, 3]);
  const rOpacity = interpolate(progress, [0, 20, RING_PERIOD], [0, 0.4, 0]);

  return (
    <div
      key={index}
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 500, height: 500,
        borderRadius: "50%",
        border: `1px solid ${PRIMARY_COLOR}`,
        transform: `translate(-50%, -50%) scale(${rScale})`,
        opacity: rOpacity,
        filter: `drop-shadow(0 0 5px ${PRIMARY_COLOR})`,
      }}
    />
  );
};

{[0, 1, 2].map(renderSonarRing)}
```

**Parameters to tune:**
- `RING_PERIOD` — how long each ring takes to expand (60–120 frames)
- Stagger of `15` frames = 3 rings always visible at once
- `width/height: 500` — ring size at scale 1 (actual max = 500 * 3 = 1500px)

---

## SVG Neon Glow Filter

Apply to any SVG element for a professional neon glow effect:

```tsx
<svg width="600" height="600" style={{ overflow: "visible" }}>
  <defs>
    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  {/* Apply to any path */}
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 ..."
    fill="none"
    stroke={PRIMARY_COLOR}
    strokeWidth="0.8"
    filter="url(#neonGlow)"
  />
</svg>
```

---

## Shape-Masked Image Reveal

Reveal a photo/screenshot inside any SVG shape (heart, circle, star, custom):

```tsx
<svg width="600" height="600" viewBox="0 0 24 24" style={{ overflow: "visible" }}>
  <defs>
    <clipPath id="shapeMask">
      {/* Heart path — replace with any closed SVG path */}
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
               2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
               C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
               c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </clipPath>
  </defs>

  {/* Masked image */}
  <foreignObject x="0" y="0" width="24" height="24" clipPath="url(#shapeMask)">
    <div style={{ width: "100%", height: "100%", background: "#000" }}>
      <img
        src="YOUR_IMAGE_URL"
        style={{
          width: "120%", height: "120%", objectFit: "cover",
          opacity: interpolate(frame, [0, 30], [0, 1]),
          transform: `scale(${interpolate(frame, [0, 100], [1.2, 1])})`,
        }}
      />
    </div>
  </foreignObject>

  {/* Neon stroke border */}
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 ..."
    fill="none"
    stroke={PRIMARY_COLOR}
    strokeWidth="0.8"
    filter="url(#neonGlow)"
  />
</svg>
```

---

## Heartbeat / Pulse Animation

A living, breathing scale on a hero element:

```tsx
// 1. Initial pop-in
const entrance = spring({
  frame,
  fps,
  config: { stiffness: 100, damping: 15, mass: 0.8 },
});

// 2. Heartbeat (continuous after entrance)
const HEARTBEAT_SPEED = 3; // beats per second (lower = slower)
const heartbeat = Math.sin((frame / fps) * HEARTBEAT_SPEED * Math.PI) * 0.03 * entrance;

// 3. Optional expand-to-fill (later in scene)
const EXPAND_START = 45;
const expand = spring({
  frame: frame - EXPAND_START,
  fps,
  config: { stiffness: 60, damping: 14, mass: 1.5 },
});

// Combined scale
const scale = (0.5 + entrance * 0.5) + heartbeat + expand * 0.2;

<div style={{ transform: `scale(${scale})` }}>
  {/* Hero logo, icon, or masked image */}
</div>
```

---

## Dark Dashboard Screen with Subtle Dot Grid

```tsx
<AbsoluteFill style={{ background: "#050505" }}>
  {/* Very subtle dot grid — adds depth without distraction */}
  <div style={{
    position: "absolute", inset: 0,
    backgroundImage: `radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)`,
    backgroundSize: "24px 24px",
    opacity: 0.5,
  }} />
</AbsoluteFill>
```
