---
title: Premium Icon Bubble Row
impact: HIGH
impactDescription: large colored filled circles with white SVG icons pop in sequentially with labels, a partial decorative arc highlights one bubble — light pastel gradient background; works for feature categories, tech stack, use cases
tags: icon bubbles, categories, circles, colored icons, labels, pastel, light, arc accent, features, use-cases, viable, technology
---

## Icon Bubble Row Pattern

Large filled colored circles (each a different brand-adjacent hue) with white SVG icon paths inside. Each bubble pops in with an elastic spring and reveals a text label to its side. An optional decorative partial arc draws around one of the bubbles as a highlight or selection indicator.

**Typical use case**: Feature categories scene ("Product", "Customer Experience", "Employee Engagement"), technology stack scene (AI, NLP, ML), or "use cases" social proof scene. Clean, logo-app-icon aesthetic on pastel background.

---

## Pastel Gradient Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

<AbsoluteFill style={{ backgroundColor: "#f5f0f8", overflow: "hidden" }}>
  {/* Top-left pink blob */}
  <div style={{
    position: "absolute", left: 0, top: 0,
    width: "55%", height: "60%",
    background: "radial-gradient(circle at 0% 0%, rgba(236,72,153,0.18) 0%, transparent 60%)",
  }} />
  {/* Bottom-right warm pink blob */}
  <div style={{
    position: "absolute", right: 0, bottom: 0,
    width: "50%", height: "55%",
    background: "radial-gradient(circle at 100% 100%, rgba(251,113,133,0.15) 0%, transparent 58%)",
  }} />
  {/* Right-center salmon accent */}
  <div style={{
    position: "absolute", right: 0, top: "30%",
    width: "35%", height: "45%",
    background: "radial-gradient(circle at 100% 50%, rgba(249,168,212,0.20) 0%, transparent 55%)",
  }} />
</AbsoluteFill>
```

Swap to brand primary tones by replacing the pink RGBA values with `hexToRgba(BRAND.primary, 0.18)`.

---

## Bubble Data

```tsx
// Define bubbles with position, color, and delay
const BUBBLES = [
  {
    id: 0,
    x: 0.28,      // fraction of width
    y: 0.48,      // fraction of height
    size: 145,    // diameter in px
    color: "#e53e6d",    // bubble fill color
    delay: 5,
    label: "Artificial Intelligence",
    labelSide: "left",   // label appears to this side
    icon: "ai",
  },
  {
    id: 1,
    x: 0.52,
    y: 0.44,
    size: 130,
    color: "#f97316",
    delay: 20,
    label: "Natural Language Processing",
    labelSide: "right",
    icon: "brain",
  },
  {
    id: 2,
    x: 0.72,
    y: 0.50,
    size: 155,
    color: "#7c3aed",
    delay: 35,
    label: "Employee Engagement",
    labelSide: "right",
    icon: "chat",
  },
];
```

---

## Bubble Component

```tsx
const BubbleNode = ({ bubble, frame, fps, width, height }) => {
  const { x, y, size, color, delay, label, labelSide } = bubble;

  if (frame < delay) return null;

  // Elastic pop entrance
  const popSpring = spring({
    frame: frame - delay,
    fps,
    config: { stiffness: 140, damping: 11, mass: 1.1 },
  });
  const scale = interpolate(popSpring, [0, 1], [0.3, 1]);

  // Gentle float
  const floatY = Math.sin((frame / 55) + bubble.id * 1.4) * 7;
  const floatX = Math.cos((frame / 75) + bubble.id * 0.9) * 4;

  // Label slides in 8 frames after bubble
  const labelProgress = spring({
    frame: frame - (delay + 8),
    fps,
    config: { damping: 20, stiffness: 160 },
  });
  const labelX = labelSide === "left"
    ? interpolate(labelProgress, [0, 1], [-30, 0])
    : interpolate(labelProgress, [0, 1], [30, 0]);

  const px = x * width;
  const py = y * height;

  return (
    <div style={{ position: "absolute", left: px, top: py }}>
      {/* Bubble */}
      <div style={{
        transform: `translate(-50%, -50%) scale(${scale}) translate(${floatX}px, ${floatY}px)`,
        width: size, height: size,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 20px 50px ${color}50, 0 8px 20px ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        zIndex: 20,
      }}>
        {/* White icon — swap SVG path per bubble.icon */}
        <BubbleIcon name={bubble.icon} size={size * 0.42} />
      </div>

      {/* Label */}
      <div style={{
        position: "absolute",
        top: "50%",
        ...(labelSide === "left"
          ? { right: size * 0.5 + 24, textAlign: "right" }
          : { left: size * 0.5 + 24, textAlign: "left" }
        ),
        transform: `translateY(-50%) translateX(${labelX}px)`,
        opacity: labelProgress,
        zIndex: 25,
        pointerEvents: "none",
      }}>
        <div style={{
          fontSize: Math.max(18, size * 0.155),
          fontWeight: 700,
          color: "#1e1b2e",
          fontFamily: "Inter, sans-serif",
          lineHeight: 1.2,
          maxWidth: 220,
          letterSpacing: "-0.02em",
        }}>
          {label}
        </div>
      </div>
    </div>
  );
};
```

---

## White Icon SVG (Inside Bubble)

Replace icon content per bubble type. Keep `fill="none" stroke="white"` for outline-style, or `fill="white"` for solid:

```tsx
const BubbleIcon = ({ name, size }) => {
  const s = size;
  const icons = {
    ai: (
      // Chip / AI circuit icon
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect x="8" y="8" width="8" height="8" rx="1" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.5" fill="white" />
        <path d="M8 10H5M8 14H5M16 10H19M16 14H19M10 8V5M14 8V5M10 16V19M14 16V19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        {/* Nodes around center */}
        <circle cx="5" cy="10" r="1" fill="white" /><circle cx="5" cy="14" r="1" fill="white" />
        <circle cx="19" cy="10" r="1" fill="white" /><circle cx="19" cy="14" r="1" fill="white" />
        <circle cx="10" cy="5" r="1" fill="white" /><circle cx="14" cy="5" r="1" fill="white" />
        <circle cx="10" cy="19" r="1" fill="white" /><circle cx="14" cy="19" r="1" fill="white" />
      </svg>
    ),
    brain: (
      // Brain / NLP icon
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 4C9 4 7 6.5 7 9c0 1.5.6 2.8 1.5 3.7C7.6 13.6 7 15 7 16.5C7 19 9 21 12 21s5-2 5-4.5c0-1.5-.6-2.9-1.5-3.8C16.4 11.8 17 10.5 17 9c0-2.5-2-5-5-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 9v5M10 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    chat: (
      // Chat bubbles / engagement icon
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M8 12H8.01M12 12H12.01M16 12H16.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 12c0 4.418-4.03 8-9 8a9.862 9.862 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    star: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    target: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2" fill="white" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    box: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[name] ?? icons.target;
};
```

---

## Partial Decorative Arc Accent

Draws a partial colored arc around one bubble — acts as a "selected" or "highlighted" indicator:

```tsx
// Arc highlights bubble at index ARC_BUBBLE_IDX, starts drawing at ARC_DELAY
const ARC_BUBBLE_IDX = 1; // which bubble to arc around
const ARC_DELAY = 40;
const ARC_FILL = 0.6;     // fraction of circle (0.6 = 216°)

const arcBubble = BUBBLES[ARC_BUBBLE_IDX];
const arcCX = arcBubble.x * width;
const arcCY = arcBubble.y * height;
const arcRadius = arcBubble.size * 0.62; // just outside the bubble edge
const arcCircumference = 2 * Math.PI * arcRadius;

const arcProgress = spring({
  frame: frame - ARC_DELAY,
  fps,
  config: { stiffness: 40, damping: 22 },
});
const arcDashOffset = interpolate(arcProgress, [0, 1], [arcCircumference, arcCircumference * (1 - ARC_FILL)]);

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 10 }}>
  <circle
    cx={arcCX}
    cy={arcCY}
    r={arcRadius}
    fill="none"
    stroke={BRAND.primary || "#7c3aed"}
    strokeWidth={3}
    strokeLinecap="round"
    strokeDasharray={arcCircumference}
    strokeDashoffset={arcDashOffset}
    transform={`rotate(-90 ${arcCX} ${arcCY})`}
    opacity={0.7}
  />
</svg>
```

---

## Scene Header — Animated Title Above Bubbles

Every icon bubble scene must have a strong headline that reveals before the bubbles pop in. This anchors the viewer:

```tsx
// Header reveals at frame 0–15
const headerProgress = spring({ frame, fps, config: { damping: 22, stiffness: 130 } });
const headerY = interpolate(headerProgress, [0, 1], [20, 0]);

<div style={{
  position: "absolute", top: 100, left: 0, right: 0,
  textAlign: "center",
  transform: `translateY(${headerY}px)`,
  opacity: Math.min(headerProgress * 1.5, 1),
  zIndex: 30,
}}>
  {/* Small uppercase category label */}
  <div style={{
    fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
    color: BRAND.primary, fontFamily: "Inter, sans-serif",
    textTransform: "uppercase", marginBottom: 12,
    opacity: 0.8,
  }}>
    What We Deliver
  </div>
  {/* Main headline */}
  <div style={{
    fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em",
    color: "#1a1a2e", fontFamily: "Inter, sans-serif",
    lineHeight: 1.1,
  }}>
    Built for{" "}
    <span style={{
      color: BRAND.primary,
      // Underline draw effect via backgroundImage
      backgroundImage: `linear-gradient(${BRAND.primary}, ${BRAND.primary})`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "0 100%",
      backgroundSize: `${interpolate(headerProgress, [0.6, 1], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}% 3px`,
      paddingBottom: 4,
    }}>
      Growth
    </span>
  </div>
</div>
```

---

## Upgraded Bubble Component — Inner Gradient + Glow Shadow

Replace flat-color bubbles with depth-layered ones that have inner radial gradient and a multi-layer shadow:

```tsx
<div style={{
  transform: `translate(-50%, -50%) scale(${scale}) translate(${floatX}px, ${floatY}px)`,
  width: size, height: size,
  borderRadius: "50%",
  // Inner gradient: lighter at top-left, saturated at bottom-right
  background: `radial-gradient(circle at 35% 30%, ${lightenHex(color, 0.25)} 0%, ${color} 55%, ${darkenHex(color, 0.15)} 100%)`,
  // 3-layer shadow: brand glow + mid ambient + tight drop
  boxShadow: `0 0 ${size * 0.6}px ${color}40, 0 ${size * 0.15}px ${size * 0.4}px ${color}25, 0 ${size * 0.05}px ${size * 0.12}px ${color}50`,
  display: "flex", alignItems: "center", justifyContent: "center",
  position: "relative", zIndex: 20,
}}>
  <BubbleIcon name={bubble.icon} size={size * 0.42} />

  {/* Sheen overlay — top-left highlight for realism */}
  <div style={{
    position: "absolute", inset: 0, borderRadius: "50%",
    background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.22) 0%, transparent 55%)",
    pointerEvents: "none",
  }} />
</div>
```

---

## Stat Badge on Bubble

Small dark pill overlaid at bottom-right of a bubble, showing a metric. Pops in 15 frames after the bubble:

```tsx
{/* Stat badge — bottom-right corner of bubble */}
{frame >= node.delay + 15 && (
  <div style={{
    position: "absolute",
    bottom: -8, right: -8,
    background: "rgba(10, 10, 20, 0.92)",
    border: `1.5px solid ${color}60`,
    borderRadius: 20,
    padding: "4px 10px",
    display: "flex", alignItems: "center", gap: 5,
    boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
    transform: `scale(${spring({ frame: frame - (node.delay + 15), fps, config: { stiffness: 200, damping: 14 } })})`,
    zIndex: 25,
  }}>
    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
    <span style={{ fontSize: 12, color: "#fff", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
      {/* e.g. "3× faster", "10+ tools", "24/7" */}
      {bubble.stat}
    </span>
  </div>
)}
```

Add `stat` to your BUBBLES data:
```tsx
{ id: 0, ..., stat: "10× faster" },
{ id: 1, ..., stat: "50+ tools" },
{ id: 2, ..., stat: "24/7 live" },
```

---

## Upgraded Label — Two-Line with Descriptor

Instead of a single label, use a headline + descriptor sub-line:

```tsx
<div style={{
  position: "absolute", top: "50%",
  ...(labelSide === "left" ? { right: size * 0.5 + 24, textAlign: "right" } : { left: size * 0.5 + 24, textAlign: "left" }),
  transform: `translateY(-50%) translateX(${labelX}px)`,
  opacity: labelProgress,
  zIndex: 25,
}}>
  {/* Primary label */}
  <div style={{
    fontSize: Math.max(20, size * 0.16),
    fontWeight: 800, color: "#1a1a2e",
    fontFamily: "Inter, sans-serif",
    lineHeight: 1.15, maxWidth: 230,
    letterSpacing: "-0.025em",
  }}>
    {bubble.label}
  </div>
  {/* Descriptor sub-line */}
  <div style={{
    fontSize: Math.max(13, size * 0.10),
    fontWeight: 400, color: "#6b7280",
    fontFamily: "Inter, sans-serif",
    marginTop: 5, maxWidth: 220,
    lineHeight: 1.4,
    opacity: interpolate(labelProgress, [0.4, 1], [0, 1], { extrapolateLeft: "clamp" }),
  }}>
    {bubble.desc}
  </div>
</div>
```

Add `desc` to your BUBBLES data:
```tsx
{ id: 0, label: "Agentic AI", desc: "Intelligent process automation" },
{ id: 1, label: "Custom Dev", desc: "Web, mobile & cloud solutions" },
{ id: 2, label: "Growth Marketing", desc: "SEO, PPC & social media" },
```

---

## Connecting Dot Trail Between Bubbles

A horizontal dotted line connects the three bubbles, drawing left-to-right after all bubbles are in:

```tsx
const CONNECT_DELAY = 55; // after all 3 bubbles have appeared
const connectProgress = spring({ frame: frame - CONNECT_DELAY, fps, config: { stiffness: 30, damping: 22 } });
const b0 = { x: BUBBLES[0].x * width, y: BUBBLES[0].y * height };
const b2 = { x: BUBBLES[2].x * width, y: BUBBLES[2].y * height };
const lineW = (b2.x - b0.x) * connectProgress;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 5 }}>
  <line
    x1={b0.x} y1={height * 0.48}
    x2={b0.x + lineW} y2={height * 0.48}
    stroke={BRAND.primary || "#7c3aed"}
    strokeWidth={2}
    strokeDasharray="0 10"
    strokeLinecap="round"
    opacity={0.35}
  />
</svg>
```

---

## Usage Notes

- Float phases (`bubble.id * 1.4`) ensure all bubbles are always out of sync with each other — never the same wave
- `labelSide: "left"` or `"right"` positions the text on the correct side of the bubble center. Use `"left"` for leftmost bubbles to avoid text going off-screen
- Label `maxWidth: 230` wraps long names like "Natural Language Processing" to two lines gracefully
- The arc `ARC_FILL = 0.6` leaves a 40% gap — this is more elegant than a full circle. The gap appears at the bottom (since arc starts at 12 o'clock via `rotate(-90)`)
- For the "use cases" variant (social_proof8 style): use 3 bubbles in a horizontal row at `y: 0.48`, equally spaced at `x: 0.22, 0.50, 0.78`, all same size (~145px), labels centered BELOW each bubble (`labelSide: "bottom"`)
- Pairs with `premium-multi-corner-gradient` or with this file's own pastel pink/lavender gradient for light-themed backgrounds
- **Always add the Scene Header** — a bare scene with just bubbles and no title looks unfinished
- **Always add stat badges** on at least 2 of the 3 bubbles — they add polish and information density
- Middle bubble should be ~15px larger than flanking bubbles to create visual hierarchy
- `lightenHex` / `darkenHex` can be approximated with color blending: for lighten, mix toward white; for darken, multiply channels by 0.85
