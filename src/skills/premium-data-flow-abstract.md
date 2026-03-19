---
title: Premium Data Flow Abstract — Conceptual Metaphor Engine
impact: HIGH
impactDescription: transforms abstract concepts (API integrations, AI pipelines, data sync) into cinematic glowing-node network visualizations — the hallmark of $10K agency explainer videos
tags: data-flow, abstract, integration, api, network, nodes, svg-path, glowing, orbs, conceptual, metaphor, isometric, pipeline, ai-processing, connection
---

## Core Concept

When your video needs to explain **how** something works (data syncing, AI processing, API integrations), don't show a boring settings page. Visualize the concept with a glowing network graph.

The 3-layer architecture:
- **Hubs**: Glowing circles with brand/integration names (Salesforce, Stripe, "Your App")
- **Paths**: SVG bezier curves that "draw themselves" using stroke-dashoffset
- **Packets**: Glowing data orbs that travel along the paths using parametric bezier interpolation

---

## Bezier Path with Animated Drawing Effect

The path draws itself over 60 frames using stroke-dashoffset.

```tsx
const TOTAL_LENGTH = 400; // approximate path length in px
const drawProgress = interpolate(frame, [30, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const dashOffset = TOTAL_LENGTH * (1 - drawProgress);

// In the SVG:
<svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
  {/* Glow copy (blurred, wider) */}
  <path
    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
    stroke={BRAND.primary}
    strokeWidth={4}
    strokeOpacity={0.3}
    fill="none"
    filter="url(#glow)"
    strokeDasharray={TOTAL_LENGTH}
    strokeDashoffset={dashOffset}
    strokeLinecap="round"
  />
  {/* Crisp foreground line */}
  <path
    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
    stroke={BRAND.primary}
    strokeWidth={1.5}
    fill="none"
    strokeDasharray={TOTAL_LENGTH}
    strokeDashoffset={dashOffset}
    strokeLinecap="round"
  />
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
</svg>
```

---

## Parametric Bezier — Data Packet Position

**Do NOT use `getPointAtLength`** (requires DOM ref, breaks server rendering). Use the cubic bezier formula directly:

```tsx
// Cubic bezier position at t ∈ [0,1]
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// Packet travels from hub A to hub B over 60 frames, starting at frame 90
const packetT = interpolate(frame, [90, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const packetX = cubicBezier(packetT, x1, cx1, cx2, x2);
const packetY = cubicBezier(packetT, y1, cy1, cy2, y2);
const packetOpacity = packetT > 0 && packetT < 1 ? 1 : 0;
```

---

## Hub Node Component Pattern

```tsx
// Hub: glowing circle + icon + label
function Hub({ x, y, label, color, size = 80, appearFrame = 0 }) {
  const prog = spring({ frame: frame - appearFrame, fps, config: { damping: 14, stiffness: 180 }, durationInFrames: 20 });
  const scale = interpolate(prog, [0, 1], [0.6, 1]);
  const pulseScale = 1 + 0.04 * Math.sin(frame * 0.08 + x);

  return (
    <div style={{
      position: "absolute",
      left: x - size / 2, top: y - size / 2,
      width: size, height: size,
      transform: `scale(${scale * pulseScale})`,
      opacity: prog,
    }}>
      {/* Outer glow ring */}
      <div style={{
        position: "absolute", inset: -12,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
        filter: "blur(8px)",
      }} />
      {/* Hub circle */}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${color}33, ${color}11)`,
        border: `1.5px solid ${color}88`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        boxShadow: `0 0 24px ${color}44, inset 0 1px 0 ${color}33`,
      }}>
        <div style={{ fontSize: 11, color: "#fff", fontWeight: 600, textAlign: "center", padding: "0 6px", lineHeight: 1.3, fontFamily: BRAND.font ?? "Inter" }}>
          {label}
        </div>
      </div>
    </div>
  );
}
```

---

## Data Packet (Traveling Orb)

```tsx
// Glowing orb traveling along the bezier
function Packet({ x, y, color, opacity }) {
  return (
    <div style={{
      position: "absolute",
      left: x - 6, top: y - 6,
      width: 12, height: 12,
      borderRadius: "50%",
      background: color,
      opacity,
      boxShadow: `0 0 12px ${color}, 0 0 24px ${color}88`,
      filter: "blur(0.5px)",
    }} />
  );
}
```

---

## Full Scene: Integration Network

Star topology — central "Your App" hub with 3-4 satellite integration nodes.

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Hub positions
  const CENTER = { x: width * 0.5,  y: height * 0.5  };
  const HUBS = [
    { x: width * 0.18, y: height * 0.3,  label: "Salesforce", color: "#00A1E0", appear: 20  },
    { x: width * 0.82, y: height * 0.3,  label: "Stripe",     color: "#635BFF", appear: 35  },
    { x: width * 0.18, y: height * 0.72, label: "Slack",       color: "#4A154B", appear: 50  },
    { x: width * 0.82, y: height * 0.72, label: "Google",      color: "#EA4335", appear: 65  },
  ];

  // Connections: satellite → center
  const CONNECTIONS = HUBS.map((hub) => {
    const cx1 = hub.x + (CENTER.x - hub.x) * 0.35;
    const cy1 = hub.y;
    const cx2 = CENTER.x + (hub.x - CENTER.x) * 0.35;
    const cy2 = CENTER.y;
    const drawStart = hub.appear + 10;
    const drawEnd   = drawStart + 50;
    const packetStart = drawEnd + 5;
    const packetEnd   = packetStart + 55;

    const drawP = interpolate(frame, [drawStart, drawEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const packP = interpolate(frame, [packetStart, packetEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // Approximate length: ~distance * 1.2 for curved path
    const dist = Math.hypot(CENTER.x - hub.x, CENTER.y - hub.y);
    const approxLen = dist * 1.2;

    const packetX = cubicBezier(packP, hub.x, cx1, cx2, CENTER.x);
    const packetY = cubicBezier(packP, hub.y, cy1, cy2, CENTER.y);
    const packetOpacity = packP > 0 && packP < 1 ? interpolate(packP, [0, 0.05, 0.9, 1], [0, 1, 1, 0]) : 0;

    return { hub, cx1, cy1, cx2, cy2, approxLen, drawP, packetX, packetY, packetOpacity };
  });

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Subtle dot grid background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle, ${BRAND.primary}33 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        opacity: 0.4,
      }} />

      {/* SVG Connections */}
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={width} height={height}>
        <defs>
          <filter id="pathGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {CONNECTIONS.map(({ hub, cx1, cy1, cx2, cy2, approxLen, drawP }, i) => (
          <g key={i}>
            {/* Glow path */}
            <path
              d={`M ${hub.x} ${hub.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${CENTER.x} ${CENTER.y}`}
              stroke={hub.color} strokeWidth={5} strokeOpacity={0.18} fill="none"
              filter="url(#pathGlow)"
              strokeDasharray={approxLen} strokeDashoffset={approxLen * (1 - drawP)}
              strokeLinecap="round"
            />
            {/* Crisp path */}
            <path
              d={`M ${hub.x} ${hub.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${CENTER.x} ${CENTER.y}`}
              stroke={hub.color} strokeWidth={1.5} fill="none"
              strokeDasharray={approxLen} strokeDashoffset={approxLen * (1 - drawP)}
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* Data Packets */}
      {CONNECTIONS.map(({ hub, packetX, packetY, packetOpacity }, i) => (
        <Packet key={i} x={packetX} y={packetY} color={hub.color} opacity={packetOpacity} />
      ))}

      {/* Hub nodes */}
      {HUBS.map((hub, i) => (
        <Hub key={i} {...hub} />
      ))}

      {/* Center hub (main app) */}
      <Hub x={CENTER.x} y={CENTER.y} label="Your App" color={BRAND.primary} size={96} appearFrame={0} />

      {/* Hero headline */}
      <div style={{
        position: "absolute", bottom: height * 0.1, left: 0, right: 0,
        textAlign: "center", fontSize: 32, fontWeight: 700,
        color: BRAND.text, fontFamily: BRAND.font ?? "Inter",
        opacity: interpolate(frame, [80, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        Everything connected. Nothing lost.
      </div>
    </AbsoluteFill>
  );
};
```

---

## Layout Variants

**Linear pipeline** (A → B → C → D): ideal for "AI processing" or "data transformation" flows.

```tsx
// 4 nodes in a horizontal line, each connected with a bezier
// Nodes: "Raw Data" → "AI Engine" → "Insight" → "Action"
// Use BRAND.primary for paths, BRAND.secondary for packet glow
```

**Funnel topology** (many → one): ideal for "all your data sources → one platform".

**Bi-directional** (two-way arrows): ideal for "real-time sync" or "two-way integration" concepts. Add a `reverse` packet traveling back from center → hub with a 90-frame delay.

---

## When to Use

- Explaining **integrations** ("Connect Salesforce, Stripe, Slack to Your App")
- Explaining **AI pipelines** ("Raw video → AI analysis → Structured insights")
- Explaining **data sync** ("Changes in one tool instantly appear everywhere")
- Any scene where the concept is more powerful than the UI itself
- **Do NOT use** when you have real screenshots — use `premium-cursor-engine` or `premium-chameleon-ui` instead

---

## Helper function (always include in the component)

```tsx
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}
```
