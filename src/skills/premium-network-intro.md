---
title: Premium Network / Connection Intro
impact: HIGH
impactDescription: creates a trust-building "ecosystem" intro with avatar nodes connected by animated polka-dot paths, ripple rings, and studio float
tags: network, connections, avatars, nodes, polka-dot, path, ripple, ecosystem, b2b
---

## Network Intro Pattern

For B2B, HR, collaboration, or community products — show avatars connected by animated dot paths, each popping in with an elastic spring and ripple ring.

**Typical use case**: "Join a network of professionals" or as a social proof intro scene.

---

## Node Layout (Kite / Diamond Shape)

Position 4–6 avatar nodes at calculated positions using fractional coordinates:

```tsx
const { width, height } = useVideoConfig();

const NODES = [
  { id: 0, x: width * 0.25, y: height * 0.32, size: 190, src: "AVATAR_URL_1" },
  { id: 1, x: width * 0.75, y: height * 0.28, size: 160, src: "AVATAR_URL_2" },
  { id: 2, x: width * 0.32, y: height * 0.72, size: 170, src: "AVATAR_URL_3" },
  { id: 3, x: width * 0.72, y: height * 0.68, size: 165, src: "AVATAR_URL_4" },
];

// Choreographed reveal sequence
const SEQUENCE = [
  { type: "avatar", nodeId: 0, at: 15 },
  { type: "line",   from: 0, to: 1, at: 30 },
  { type: "avatar", nodeId: 1, at: 45 },
  { type: "line",   from: 1, to: 3, at: 60 },
  { type: "avatar", nodeId: 3, at: 75 },
  { type: "line",   from: 3, to: 2, at: 90 },
  { type: "avatar", nodeId: 2, at: 105 },
];
```

---

## Animated Polka-Dot Connection Path

SVG path that "draws" from one node to another using spring-animated `strokeDashoffset`:

```tsx
const ConnectionPath = ({ start, end, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Organic arch control point
  const cpX = midX - dy * 0.2;
  const cpY = midY + dx * 0.2;

  const path = `M ${start.x} ${start.y} Q ${cpX} ${cpY} ${end.x} ${end.y}`;
  const len  = Math.sqrt(dx * dx + dy * dy) * 1.2; // rough arc length

  const progress   = spring({ frame: frame - delay, fps, config: { stiffness: 40, damping: 20 } });
  const dashOffset = interpolate(progress, [0, 1], [len, 0]);

  return (
    <path
      d={path}
      stroke="#94a3b8"
      strokeWidth="3.5"
      strokeLinecap="round"    // CRITICAL — creates the polka-dot look with wide spacing
      strokeDasharray="0 16"   // 0px dash + 16px gap = dots spaced 16px apart
      strokeDashoffset={dashOffset}
      fill="none"
      style={{ opacity: 0.5 }}
    />
  );
};

{/* Render in an SVG layer behind avatars */}
<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
  {SEQUENCE.filter(s => s.type === "line").map((step, i) => (
    <ConnectionPath
      key={i}
      start={NODES[step.from]}
      end={NODES[step.to]}
      delay={step.at}
    />
  ))}
</svg>
```

**The polka-dot trick**: `strokeDasharray="0 16"` with `strokeLinecap="round"` creates dots. Adjust `16` for dot spacing.

---

## Avatar Node with Ripple Ring + Elastic Pop

```tsx
const AvatarNode = ({ src, x, y, size, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < delay) return null;

  // Elastic pop entrance
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { stiffness: 160, damping: 12, mass: 1.2 }, // Overshoot!
  });

  // Shockwave ripple
  const rippleFrame   = frame - delay;
  const rippleScale   = interpolate(rippleFrame, [0, 30], [0.8, 2.2], { extrapolateRight: "clamp" });
  const rippleOpacity = interpolate(rippleFrame, [0, 25], [0.5, 0], { extrapolateRight: "clamp" });

  // Studio float
  const floatY = Math.sin((frame / 50) + x * 0.001) * 6;

  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 20 }}>
      {/* Ripple ring */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        width: size, height: size, borderRadius: "50%",
        border: "2px solid #6366f1",
        transform: `translate(-50%, -50%) scale(${rippleScale})`,
        opacity: rippleOpacity,
      }} />

      {/* Avatar */}
      <div style={{
        width: size, height: size,
        transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
        borderRadius: "50%",
        background: "white",
        padding: 8, // thick white border ring
        boxShadow: "0 30px 60px rgba(0,0,0,0.12), 0 18px 36px rgba(0,0,0,0.08)",
      }}>
        <img
          src={src}
          style={{
            width: "100%", height: "100%",
            borderRadius: "50%", objectFit: "cover",
          }}
        />
      </div>
    </div>
  );
};
```

---

## Center Headline Overlay

Position a large headline in the center of the network, fading in last:

```tsx
<div style={{
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
  zIndex: 40,
  pointerEvents: "none",
  opacity: interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" }),
}}>
  <h1 style={{
    fontFamily: "Inter, sans-serif",
    fontSize: 80, fontWeight: 800, color: "#1e293b",
    letterSpacing: "-0.04em", margin: 0, lineHeight: 1.1,
    textShadow: "0 20px 40px rgba(255,255,255,0.8), 0 5px 15px rgba(0,0,0,0.1)",
    transform: `scale(${interpolate(
      spring({ frame: frame - 10, fps: 30 }), [0, 1], [0.9, 1]
    )})`,
  }}>
    Connect your team
  </h1>
</div>
```

---

## Light Background with Gradient Blobs

Pure white background with gentle, slow-moving color clouds — no harsh contrast:

```tsx
<AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
  {/* Blob 1 */}
  <div style={{
    position: "absolute",
    left: width * 0.2, top: height * 0.3,
    width: 1000, height: 1000, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(241,245,249,0.8) 0%, transparent 60%)",
    filter: "blur(60px)",
    transform: `translate(-50%, -50%) translateY(${Math.sin(frame * 0.01) * 30}px)`,
  }} />
  {/* Blob 2 */}
  <div style={{
    position: "absolute",
    left: width * 0.8, top: height * 0.7,
    width: 1000, height: 1000, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(237,233,254,0.6) 0%, transparent 60%)",
    filter: "blur(60px)",
    transform: `translate(-50%, -50%) translateY(${Math.cos(frame * 0.01) * 20}px)`,
  }} />
</AbsoluteFill>
```
