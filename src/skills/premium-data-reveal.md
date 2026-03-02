---
title: Premium Data Reveal — Animated Stats & Counters
impact: HIGH
impactDescription: animated counting numbers, bar fills, ring progress, and stat cards — the fastest way to establish product credibility with concrete numbers
tags: data, stats, counters, numbers, metrics, animated-counter, bar-chart, ring-progress, credibility, kpi
---

## Data Reveal Pattern Overview

Three patterns — mix and match:
1. **Counting number** — animates from 0 to the target value (e.g. "10,847 vehicles")
2. **Bar fill** — horizontal bar fills left to right with the metric label
3. **Ring/donut progress** — SVG ring that draws itself (e.g. "94% satisfaction")

Combine 2–3 stat cards in a staggered reveal for maximum impact.

---

## Counting Number Animation

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

function useCounter(targetValue: number, startFrame: number, durationFrames: number) {
  const progress = interpolate(
    frame - startFrame,
    [0, durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),  // ease-out cubic — fast start, smooth finish
    }
  );
  return Math.round(progress * targetValue);
}

// Usage
const vehicleCount = useCounter(10847, 30, 60);    // counts to 10,847 over 2s
const satisfactionPct = useCounter(94, 45, 50);    // counts to 94% over ~1.7s
const avgPriceK = useCounter(12, 60, 45);          // counts to 12 (shown as $12K)

// Format with comma separators
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
```

```tsx
{/* Counting stat display */}
<div style={{
  fontFamily: "Inter, sans-serif",
  display: "flex", flexDirection: "column", alignItems: "center",
}}>
  <div style={{
    fontSize: 72, fontWeight: 900, lineHeight: 1,
    color: "white",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
  }}>
    {formatNumber(vehicleCount)}
  </div>
  <div style={{
    fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 8,
  }}>
    Verified Vehicles
  </div>
</div>
```

---

## Stat Card Grid (3 cards, staggered reveal)

```tsx
const CARDS = [
  { label: "Verified Vehicles", value: 10847, format: (n: number) => `${formatNumber(n)}+`, color: "#6366f1", delay: 0 },
  { label: "Satisfaction Rate", value: 94, format: (n: number) => `${n}%`, color: "#10b981", delay: 15 },
  { label: "Countries Served", value: 78, format: (n: number) => `${n}`, color: "#f59e0b", delay: 30 },
];

{CARDS.map((card, i) => {
  const cardEntrance = spring({
    frame: frame - (30 + card.delay),
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const count = useCounter(card.value, 30 + card.delay, 60);

  return (
    <div key={i} style={{
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 20,
      padding: "28px 32px",
      minWidth: 200,
      transform: `translateY(${interpolate(cardEntrance, [0,1], [40,0])}px) scale(${interpolate(cardEntrance, [0,1], [0.9,1])})`,
      opacity: cardEntrance,
      fontFamily: "Inter, sans-serif",
    }}>
      {/* Accent color top bar */}
      <div style={{ width: 32, height: 3, background: card.color, borderRadius: 2, marginBottom: 16 }} />
      <div style={{
        fontSize: 54, fontWeight: 900, color: "white",
        fontVariantNumeric: "tabular-nums", lineHeight: 1,
        letterSpacing: "-0.03em",
      }}>
        {card.format(count)}
      </div>
      <div style={{
        fontSize: 13, color: "rgba(255,255,255,0.45)",
        fontWeight: 500, marginTop: 8,
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {card.label}
      </div>
    </div>
  );
})}
```

---

## Horizontal Bar Fill

```tsx
function BarStat({ label, value, maxValue, color, delay }: {
  label: string; value: number; maxValue: number; color: string; delay: number;
}) {
  const barProgress = interpolate(
    frame - delay,
    [0, 60],
    [0, value / maxValue],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 2) }
  );
  const countedValue = useCounter(value, delay, 55);
  const cardEntrance = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 90 } });

  return (
    <div style={{
      opacity: cardEntrance,
      transform: `translateX(${interpolate(cardEntrance, [0,1], [-20,0])}px)`,
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
          {countedValue.toLocaleString()}
        </span>
      </div>
      {/* Track */}
      <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
        {/* Fill */}
        <div style={{
          height: "100%",
          width: `${barProgress * 100}%`,
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          borderRadius: 4,
          boxShadow: `0 0 12px ${color}80`,
        }} />
      </div>
    </div>
  );
}
```

---

## SVG Ring / Donut Progress

```tsx
function RingStat({ percent, label, color, delay }: {
  percent: number; label: string; color: string; delay: number;
}) {
  const R = 52;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  const progress = interpolate(
    frame - delay,
    [0, 70],
    [0, percent / 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) }
  );
  const offset = CIRCUMFERENCE * (1 - progress);
  const countedPct = useCounter(percent, delay, 65);
  const entrance = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 80 } });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      transform: `scale(${entrance})`, opacity: entrance,
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ position: "relative", width: 128, height: 128 }}>
        <svg width={128} height={128} viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
          {/* Background track */}
          <circle cx={64} cy={64} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
          {/* Progress arc */}
          <circle
            cx={64} cy={64} r={R}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        {/* Center number */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, fontWeight: 800, color: "white",
          fontVariantNumeric: "tabular-nums",
        }}>
          {countedPct}%
        </div>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        textAlign: "center",
      }}>
        {label}
      </div>
    </div>
  );
}
```

---

## Big Hero Number (full-screen emphasis)

For a single KPI that dominates the screen — with a reveal flash:

```tsx
const flashOpacity = interpolate(frame, [0, 8, 20], [1, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const numberScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
const bigCount = useCounter(10000, 0, 50);

<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
  {/* Flash on entrance */}
  <div style={{ position: "absolute", inset: 0, background: "white", opacity: flashOpacity, pointerEvents: "none" }} />

  <div style={{
    fontSize: 140, fontWeight: 900, color: "white",
    fontVariantNumeric: "tabular-nums", lineHeight: 1,
    letterSpacing: "-0.05em",
    transform: `scale(${numberScale})`,
    textShadow: "0 0 80px rgba(99,102,241,0.5)",
  }}>
    {bigCount.toLocaleString()}+
  </div>
  <div style={{
    fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.5)",
    marginTop: 16, letterSpacing: "0.15em", textTransform: "uppercase",
  }}>
    Vehicles Ready to Ship
  </div>
</AbsoluteFill>
```

---

## Key Rules

- **`fontVariantNumeric: "tabular-nums"`** — prevents layout shift as numbers change width
- **Ease-out cubic** for counters — fast start, smooth deceleration (like a slot machine stopping)
- **Stagger delays**: 0, 15, 30 frames between cards — enough to read each number as it counts
- **Glow on bars**: `boxShadow: "0 0 12px colorHex80"` — adds energy to the brand color fill
- **Ring progress**: always rotate the SVG by -90deg to start from the top (12 o'clock)
- **Never show decimals** during counting — `Math.round()` keeps it readable
