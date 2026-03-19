---
title: Premium Icon Concept Scene
impact: HIGH
impactDescription: visualizes an abstract concept — a large white icon circle centered on a soft radial glow, with a dark badge at the bottom-right corner and a dotted SVG curved path that draws around the scene edge with a triangle arrowhead
tags: icon, concept, metaphor, radial glow, badge, dotted path, arrowhead, pretaa, b2b, abstract
---

## Icon Concept Scene Pattern

A single, oversized white icon circle is centered on the canvas. Behind it, a radial color glow (matching the concept — red for cost/time, green for growth, blue for data) creates depth. A dark coin/badge overlays the bottom-right of the icon circle. A dotted SVG curved path draws along the edges of the scene with a triangle arrowhead at its tip.

**Typical use case**: Problem scenes (showing "the cost of the problem"), solution scenes (showing "the benefit"), or any conceptual metaphor where the product concept is more important than the UI.

---

## Icon Circle with Radial Glow

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Icon entrance spring
const iconSpring = spring({ frame, fps, config: { stiffness: 120, damping: 14, mass: 1 } });
const iconScale = interpolate(iconSpring, [0, 1], [0.6, 1]);

// Glow pulse (slow breathe)
const glowScale = 1 + Math.sin(frame * 0.04) * 0.06;
const glowOpacity = 0.35 + Math.sin(frame * 0.05) * 0.08;

// Concept color — adapt to meaning
const CONCEPT_COLOR = "#ef4444"; // red = cost/time/risk; "#10b981" = growth; "#6366f1" = data/insight
const ICON_SIZE = 260;

<AbsoluteFill style={{ backgroundColor: "#f0f2f6" }}>
  {/* Corner blobs for context (from premium-multi-corner-gradient) */}
  <div style={{ position: "absolute", left: 0, bottom: 0, width: "65%", height: "70%",
    background: "radial-gradient(circle at 0% 100%, rgba(99,102,241,0.18) 0%, transparent 60%)" }} />
  <div style={{ position: "absolute", right: 0, top: 0, width: "60%", height: "65%",
    background: "radial-gradient(circle at 100% 0%, rgba(248,113,113,0.14) 0%, transparent 58%)" }} />

  {/* Radial glow behind icon */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    width: ICON_SIZE * 2.8,
    height: ICON_SIZE * 2.8,
    transform: `translate(-50%, -50%) scale(${glowScale})`,
    background: `radial-gradient(circle at 50% 50%, ${CONCEPT_COLOR}40 0%, ${CONCEPT_COLOR}18 35%, transparent 70%)`,
    opacity: glowOpacity,
    borderRadius: "50%",
  }} />

  {/* Icon circle */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    transform: `translate(-50%, -50%) scale(${iconScale})`,
  }}>
    {/* White circle container */}
    <div style={{
      width: ICON_SIZE, height: ICON_SIZE,
      borderRadius: "50%",
      backgroundColor: "white",
      boxShadow: "0 40px 100px rgba(0,0,0,0.10), 0 16px 40px rgba(0,0,0,0.07)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {/* SVG icon — replace with brand icon or conceptual icon */}
      <svg width={ICON_SIZE * 0.45} height={ICON_SIZE * 0.45} viewBox="0 0 24 24" fill="none">
        {/* Example: clock/time icon */}
        <circle cx="12" cy="12" r="10" stroke={CONCEPT_COLOR} strokeWidth="2" />
        <path d="M12 6v6l4 2" stroke={CONCEPT_COLOR} strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Dark badge — bottom-right corner of icon circle */}
      <BadgeCoin frame={frame} fps={fps} iconSize={ICON_SIZE} />
    </div>
  </div>
</AbsoluteFill>
```

---

## Dark Badge (Bottom-Right Corner)

A dark coin badge overlaid at the bottom-right of the icon circle, showing a number or metric:

```tsx
const BadgeCoin = ({ frame, fps, iconSize }) => {
  const BADGE_DELAY = 18;
  const badgeSpring = spring({
    frame: frame - BADGE_DELAY,
    fps,
    config: { stiffness: 200, damping: 12, mass: 0.7 },
  });
  const BADGE_SIZE = iconSize * 0.36;

  return (
    <div style={{
      position: "absolute",
      right: -BADGE_SIZE * 0.15,
      bottom: -BADGE_SIZE * 0.15,
      width: BADGE_SIZE, height: BADGE_SIZE,
      borderRadius: "50%",
      backgroundColor: "#1e293b",
      border: "4px solid white",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column",
      transform: `scale(${badgeSpring})`,
      transformOrigin: "center center",
    }}>
      <span style={{
        fontSize: BADGE_SIZE * 0.28,
        fontWeight: 800,
        color: "white",
        lineHeight: 1,
        fontFamily: "Inter, sans-serif",
      }}>
        $2.4M
      </span>
      <span style={{
        fontSize: BADGE_SIZE * 0.16,
        color: "rgba(255,255,255,0.6)",
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
        marginTop: 1,
      }}>
        wasted
      </span>
    </div>
  );
};
```

---

## Dotted SVG Curved Path with Triangle Arrowhead

A dotted path draws around the bottom + right edges of the scene, finishing with a triangle arrowhead pointing in the direction of travel:

```tsx
// Path: starts bottom-left, curves along bottom, up the right side
// Adjust control points to wrap around the scene perimeter
const PATH_D = `M ${width * 0.05} ${height * 0.92}
  Q ${width * 0.5} ${height * 1.02} ${width * 0.95} ${height * 0.75}
  T ${width * 0.95} ${height * 0.18}`;

const PATH_LENGTH = 1100; // approximate arc length in px

// Path draws in from frame 30
const pathProgress = spring({
  frame: frame - 30,
  fps,
  config: { stiffness: 28, damping: 18 },
});
const dashOffset = interpolate(pathProgress, [0, 1], [PATH_LENGTH, 0]);

// Arrowhead appears when path is nearly complete
const arrowOpacity = interpolate(pathProgress, [0.85, 1.0], [0, 1], { extrapolateRight: "clamp" });

// Arrowhead position: approximate the tip of the path (right side, upper area)
const ARROW_X = width * 0.95;
const ARROW_Y = height * 0.18;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  {/* Dotted path */}
  <path
    d={PATH_D}
    stroke="#94a3b8"
    strokeWidth={3}
    fill="none"
    strokeLinecap="round"
    strokeDasharray="0 18"   // 0px dot, 18px gap = spaced dots
    strokeDashoffset={dashOffset}
    opacity={0.5}
  />

  {/* Triangle arrowhead pointing upward */}
  <polygon
    points={`
      ${ARROW_X},${ARROW_Y - 14}
      ${ARROW_X - 9},${ARROW_Y + 6}
      ${ARROW_X + 9},${ARROW_Y + 6}
    `}
    fill="#94a3b8"
    opacity={arrowOpacity * 0.7}
  />
</svg>
```

---

## Concept Headline

A bold label below or above the icon circle:

```tsx
const headlineOpacity = interpolate(frame, [8, 28], [0, 1], { extrapolateRight: "clamp" });
const headlineY = interpolate(
  spring({ frame: frame - 8, fps }),
  [0, 1], [20, 0]
);

<div style={{
  position: "absolute",
  left: "50%",
  top: "72%",
  transform: `translate(-50%, 0) translateY(${headlineY}px)`,
  opacity: headlineOpacity,
  textAlign: "center",
  fontFamily: "Inter, sans-serif",
}}>
  <div style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
    The Real Cost of Inaction
  </div>
  <div style={{ fontSize: 20, color: "#64748b", fontWeight: 500, marginTop: 8 }}>
    Every missed signal is a missed renewal
  </div>
</div>
```

---

## Adapting the Icon SVG

Use any SVG icon that matches the concept:

- **Clock/time waste** → `circle + path "M12 6v6l4 2"` (clock hands)
- **Money/cost** → `circle + "$"` text or coin SVG
- **Growth** → upward arrow or plant SVG in `#10b981` green
- **Data/insight** → bar chart or magnifying glass in `#6366f1` indigo
- **Risk** → warning triangle in `#f59e0b` amber

The icon should use `CONCEPT_COLOR` as both stroke and/or fill. Keep it simple — single-path icons work best at this scale.

---

## Usage Notes

- `ICON_SIZE = 260` works for 1920x1080. For smaller canvases scale down proportionally.
- The glow `radial-gradient` uses the same concept color at low alpha — no `filter: blur()` needed
- The badge `transformOrigin: "center center"` combined with a fast spring creates a satisfying pop-in
- Dotted path: `strokeDasharray="0 18"` with `strokeLinecap="round"` is the polka-dot trick — adjust `18` for dot spacing
- The triangle arrowhead uses a CSS `<polygon>` — compute tip point by evaluating the SVG path at t=1.0 or hardcode an approximate endpoint
- Pairs naturally with `premium-multi-corner-gradient` as the background layer
