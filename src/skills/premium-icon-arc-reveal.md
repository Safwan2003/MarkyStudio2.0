---
title: Premium Icon Arc Reveal
impact: HIGH
impactDescription: dramatic hook scene — brand icon centered on dark glow pool, SVG arc draws around it, concentric rings expand outward, then icon grows into a shape-masked reveal
tags: icon, arc, hook, reveal, dark, neon, glow, shape-mask, concentric rings, cinematic, intro, desklog
---

## Icon Arc Reveal Pattern

A single brand/product icon centered on a dark background. A radial glow pool expands behind it. An SVG circular arc draws around the icon via `strokeDashoffset` animation. Multiple concentric rings at different radii pulse with varying opacity. Strong cinematic hook — works for any icon-forward brand.

**Typical use case**: First scene of any dark-themed SaaS/tech video. Desklog's hook scene is exactly this.

---

## Dark Glow Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Glow breathes slowly
const glowScale = 1 + Math.sin(frame * 0.03) * 0.06;

const BRAND_COLOR = BRAND.primary || "#00e5a0"; // teal/neon green

<AbsoluteFill style={{ backgroundColor: "#030d07", overflow: "hidden" }}>
  {/* Large radial glow pool centered */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    width: "90%", height: "90%",
    transform: `translate(-50%, -50%) scale(${glowScale})`,
    background: `radial-gradient(circle at 50% 55%, ${BRAND_COLOR}28 0%, ${BRAND_COLOR}10 30%, transparent 65%)`,
    borderRadius: "50%",
  }} />
  {/* Darker center overlay — keeps icon readable */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    width: "40%", height: "40%",
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, rgba(0,0,0,0.35) 0%, transparent 100%)",
    borderRadius: "50%",
  }} />
</AbsoluteFill>
```

---

## Centered Brand Icon (SVG, Outlined)

Use a stroke-only SVG icon. No fill — the neon outline on dark bg is the look:

```tsx
const ICON_SIZE = 120; // px in the SVG viewBox coordinate space

// Icon entrance spring
const iconSpring = spring({ frame, fps, config: { stiffness: 100, damping: 16, mass: 1 } });
const iconScale = interpolate(iconSpring, [0, 1], [0.5, 1]);

// Heartbeat after entrance
const heartbeat = Math.sin(frame * 0.08) * 0.025 * Math.min(iconSpring, 1);

<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: `translate(-50%, -50%) scale(${iconScale + heartbeat})`,
  zIndex: 30,
}}>
  <svg
    width={200} height={200}
    viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
    style={{ overflow: "visible" }}
  >
    <defs>
      <filter id="iconGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Heart icon path — swap for any brand icon */}
    <path
      d="M60 85 L60 85 C35 65 20 50 20 35 C20 22 30 12 43 12 C52 12 58 17 60 22 C62 17 68 12 77 12 C90 12 100 22 100 35 C100 50 85 65 60 85 Z"
      fill="none"
      stroke={BRAND_COLOR}
      strokeWidth="3.5"
      strokeLinejoin="round"
      filter="url(#iconGlow)"
    />
  </svg>
</div>
```

**Swappable icons**: Replace the `<path>` with any SVG icon. Keep `fill="none"` and `stroke={BRAND_COLOR}`. Common ones:
- Circle target: `<circle cx="60" cy="60" r="30" />`
- Lightning bolt: `<polyline points="70,10 45,55 65,55 50,110" />`
- Star: use a 5-point star polygon

---

## SVG Arc Drawing Around the Icon

A single circular arc draws from the top using spring-animated `strokeDashoffset`. The arc is centered exactly on the icon:

```tsx
// Arc parameters
const ARC_RADIUS = 140; // px from center — adjust to clear the icon size
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS; // full circle perimeter

// Arc starts drawing at frame 10, completes around frame 80
const ARC_DELAY = 10;
const arcProgress = spring({
  frame: frame - ARC_DELAY,
  fps,
  config: { stiffness: 35, damping: 22 },
});

// How much of the full circle to draw (0.75 = 270°, 1.0 = full circle)
const ARC_FILL = 0.72;
const visibleLength = interpolate(arcProgress, [0, 1], [0, ARC_CIRCUMFERENCE * ARC_FILL]);
const dashOffset = ARC_CIRCUMFERENCE - visibleLength;

// cx, cy = center of canvas
const cx = width / 2;
const cy = height / 2;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  <defs>
    <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  {/* Main arc — draws clockwise from top (rotate -90 to start at 12 o'clock) */}
  <circle
    cx={cx}
    cy={cy}
    r={ARC_RADIUS}
    fill="none"
    stroke={BRAND_COLOR}
    strokeWidth={2}
    strokeLinecap="round"
    strokeDasharray={`${ARC_CIRCUMFERENCE} ${ARC_CIRCUMFERENCE}`}
    strokeDashoffset={dashOffset}
    transform={`rotate(-90 ${cx} ${cy})`}
    filter="url(#arcGlow)"
    opacity={0.85}
  />
</svg>
```

**Key**: `rotate(-90 cx cy)` starts the arc at 12 o'clock. A full circle `strokeDasharray` equals the circumference. Animating `strokeDashoffset` from full (hidden) to 0 (revealed) draws it in.

---

## Concentric Rings

Multiple rings at different radii and opacities, expanding very slowly — creates a sonar/depth feel distinct from the drawing arc:

```tsx
const RINGS = [
  { radius: 200, opacity: 0.12, delay:  0 },
  { radius: 280, opacity: 0.08, delay: 10 },
  { radius: 360, opacity: 0.05, delay: 20 },
  { radius: 440, opacity: 0.04, delay: 30 },
];

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  {RINGS.map((ring, i) => {
    const ringProgress = spring({
      frame: frame - ring.delay,
      fps,
      config: { stiffness: 25, damping: 30 }, // very slow — barely any spring
    });
    const r = interpolate(ringProgress, [0, 1], [ring.radius * 0.6, ring.radius]);
    const opacity = ring.opacity * Math.min(ringProgress, 1);
    return (
      <circle
        key={i}
        cx={width / 2} cy={height / 2}
        r={r}
        fill="none"
        stroke={BRAND_COLOR}
        strokeWidth={1}
        opacity={opacity}
      />
    );
  })}
</svg>
```

---

## Optional: Shape-Mask Reveal Phase (hook3→4)

After the arc completes (~frame 80+), the icon expands to fill the screen and reveals a screenshot inside it:

```tsx
const EXPAND_DELAY = 80;
const expandSpring = spring({
  frame: frame - EXPAND_DELAY,
  fps,
  config: { stiffness: 60, damping: 16, mass: 1.5 },
});
const expandScale = interpolate(expandSpring, [0, 1], [1, 20]); // icon grows 20x to fill frame

// Use premium-neon-dark's shape-masked reveal pattern for the content inside
// The icon SVG path becomes a clipPath that reveals ATTACHED_IMAGES[0]
const maskOpacity = interpolate(expandSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

{/* Expanding masked screenshot — rendered behind the icon layer */}
<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: `translate(-50%, -50%) scale(${expandScale})`,
  opacity: maskOpacity,
  width: 200, height: 200,
  borderRadius: "50%", // or use clipPath for icon shape
  overflow: "hidden",
}}>
  {ATTACHED_IMAGES[0] && (
    <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  )}
</div>
```

---

## Complete Scene Structure

```tsx
export const IconArcReveal = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* 1. Dark background + glow pool */}
      {/* 2. SVG layer 1: concentric rings (behind arc) */}
      {/* 3. SVG layer 2: drawing arc */}
      {/* 4. Brand icon (with neon glow filter) */}
      {/* 5. Optional: expanding shape-mask reveal */}
    </AbsoluteFill>
  );
};
```

---

## Wordmark + Tagline Layer (Brand Identity Phase)

After the arc completes, add the brand name and tagline below the icon. This makes the hook feel like a full brand reveal:

```tsx
// Text appears after arc finishes (delay ~ 60)
const textDelay = 60;
const textProgress = spring({ frame: frame - textDelay, fps, config: { damping: 18, stiffness: 110 } });
const textY = interpolate(textProgress, [0, 1], [16, 0]);

{frame >= textDelay && (
  <div style={{
    position: "absolute", left: "50%", top: "58%",
    transform: `translate(-50%, -50%) translateY(${textY}px)`,
    opacity: Math.min(textProgress * 1.5, 1),
    textAlign: "center", zIndex: 35,
  }}>
    {/* Brand wordmark */}
    <div style={{
      fontSize: 56, fontWeight: 900, letterSpacing: "-0.04em",
      color: "#fff", fontFamily: "Inter, sans-serif",
      textShadow: `0 0 30px ${BRAND_COLOR}50`,
    }}>
      {BRAND.name}
    </div>
    {/* Tagline */}
    <div style={{
      fontSize: 16, fontWeight: 500, letterSpacing: "0.14em",
      color: `${BRAND_COLOR}cc`, fontFamily: "Inter, sans-serif",
      textTransform: "uppercase", marginTop: 12,
      opacity: interpolate(textProgress, [0.4, 1], [0, 1], { extrapolateLeft: "clamp" }),
    }}>
      {BRAND.tagline || "AI-Powered Solutions"}
    </div>
  </div>
)}
```

---

## Dual-Arc Variant (Inner + Outer)

For more visual richness, draw two arcs: a faster inner arc and a slower outer arc. The inner completes first, outer finishes later:

```tsx
const ARC_INNER_RADIUS = 120;
const ARC_OUTER_RADIUS = 175;
const CIRC_INNER = 2 * Math.PI * ARC_INNER_RADIUS;
const CIRC_OUTER = 2 * Math.PI * ARC_OUTER_RADIUS;

// Inner arc — fast, 270°
const innerProg = spring({ frame: frame - 8, fps, config: { stiffness: 45, damping: 24 } });
// Outer arc — slower, 220°
const outerProg = spring({ frame: frame - 20, fps, config: { stiffness: 28, damping: 22 } });

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  <defs>
    <filter id="arcGlow"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
  </defs>
  {/* Inner arc — 270°, starts at 12 o'clock */}
  <circle cx={cx} cy={cy} r={ARC_INNER_RADIUS}
    fill="none" stroke={BRAND_COLOR} strokeWidth={2.5} strokeLinecap="round"
    strokeDasharray={`${CIRC_INNER} ${CIRC_INNER}`}
    strokeDashoffset={interpolate(innerProg, [0, 1], [CIRC_INNER, CIRC_INNER * 0.25])}
    transform={`rotate(-90 ${cx} ${cy})`} filter="url(#arcGlow)" opacity={0.9}
  />
  {/* Outer arc — 220°, counter-clockwise feel via different start angle */}
  <circle cx={cx} cy={cy} r={ARC_OUTER_RADIUS}
    fill="none" stroke={BRAND_COLOR} strokeWidth={1.5} strokeLinecap="round"
    strokeDasharray={`${CIRC_OUTER} ${CIRC_OUTER}`}
    strokeDashoffset={interpolate(outerProg, [0, 1], [CIRC_OUTER, CIRC_OUTER * 0.39])}
    transform={`rotate(-120 ${cx} ${cy})`} filter="url(#arcGlow)" opacity={0.5}
  />
</svg>
```

---

## Usage Notes

- `ARC_RADIUS` should be ~30–50% larger than the icon's rendered size so the arc clears the icon
- `ARC_FILL = 0.72` draws ~260° — leaving a gap at the bottom for elegance. Use `1.0` for a full circle
- The glow filter `feGaussianBlur stdDeviation="1.5–2"` is enough for a visible neon glow without performance cost
- For non-heart icons: the shape-mask expand works best with a circle clipPath (simpler and cleaner at large scales)
- Pairs naturally with `premium-floating-path-nodes` for the subsequent problem scene (same dark bg, same brand glow color)
- Use `BRAND.primary` for `BRAND_COLOR`; if dark brand (e.g. dark blue), the icon + arc still works — just ensure the glow color contrasts with the near-black bg
- **Always add the wordmark + tagline text layer** after arc completion — a bare icon with arc but no text feels incomplete
- **Dual-arc variant** is always preferred over single arc — the second arc adds almost no code but doubles the visual richness
