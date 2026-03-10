# premium-light-arc-bg

## When to Use
Use as the base background layer for ALL light-themed B2B SaaS videos. This creates the subtle texture that differentiates premium agency work from flat backgrounds.

Apply when: BRAND.style === "light" or BRAND.bg is near-white (#f8f9fc, #f0f2f8, #ffffff, etc.)

## What It Looks Like
- Near-white base background (#f8f9fc)
- 6–8 concentric arc lines (partial SVG circles) radiating from an off-center origin
- Soft pastel radial-gradient blobs bleeding from corners at 5–8% opacity
- Subtle slow rotation over scene duration for living motion

## Implementation

```tsx
const LightArcBg = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const ARC_COUNT = 8;
  const ORIGIN = { x: width * 0.3, y: height * 0.6 };

  const arcs = Array.from({ length: ARC_COUNT }, (_, i) => ({
    radius: 180 + i * 130,
    opacity: Math.max(0, 0.04 - i * 0.003),
    dashArray: `${55 + i * 18} ${180 + i * 36}`,
    dashOffset: i * 40,
  }));

  const rotation = frame * 0.05; // 0.05 deg/frame = ~1.5 deg/s at 30fps

  return (
    <AbsoluteFill style={{ background: BRAND.bg || "#f8f9fc" }}>
      {/* Corner gradient blobs */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse at 0% 100%, rgba(99,102,241,0.07) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, rgba(236,72,153,0.05) 0%, transparent 45%),
          radial-gradient(ellipse at 100% 100%, rgba(239,68,68,0.04) 0%, transparent 40%)
        `
      }} />

      {/* Concentric arc lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={ORIGIN.x}
            cy={ORIGIN.y}
            r={arc.radius}
            fill="none"
            stroke={`rgba(0,0,0,${arc.opacity.toFixed(3)})`}
            strokeWidth={1}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            transform={`rotate(${rotation + i * 5}, ${ORIGIN.x}, ${ORIGIN.y})`}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
```

## Usage Pattern

Place as the first child of AbsoluteFill, before all other content:

```tsx
return (
  <AbsoluteFill>
    <LightArcBg />
    {/* All scene content above */}
    <div style={{ position: "absolute", inset: 0, padding: 80 }}>
      {/* Your scene content */}
    </div>
  </AbsoluteFill>
);
```

## Corner Blob Colors

Adapt the corner blob colors to the brand:
- Indigo/purple brand: `rgba(99,102,241,0.07)` BL, `rgba(139,92,246,0.05)` TR
- Teal/green brand: `rgba(20,184,166,0.07)` BL, `rgba(16,185,129,0.05)` TR
- Blue brand: `rgba(59,130,246,0.07)` BL, `rgba(14,165,233,0.05)` TR
- Orange brand: `rgba(249,115,22,0.07)` BL, `rgba(234,179,8,0.05)` TR

## Visual Rules for Light Theme Scenes

When using this background, all content above must follow light-theme rules:
- Cards: white background, `boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04)"` (medium elevation)
- Text: `color: "#0f172a"` for headlines, `color: "rgba(15,23,42,0.5)"` for subtext
- Borders: `border: "1px solid rgba(0,0,0,0.08)"`
- NO glass backdrop-filter on light bg — use solid white cards instead
