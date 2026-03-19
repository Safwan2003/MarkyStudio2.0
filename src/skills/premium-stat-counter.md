---
title: Premium Stat Counter
impact: HIGH
impactDescription: Generates an ultra-large, spring-eased number counter to highlight massive metrics (ROI, time saved, users). The number is the undeniable hero of the scene.
tags: stat, counter, numbers, data, massive-text, kpi, metric, percentage, animated-counter
qualityBar: The number is the undeniable hero, sized at 160px+. It does not count linearly; it eases quickly at first and slows drastically as it approaches the final target, creating suspense and weight.
---

## When to Use

A single metric that proves the product's value, shown at massive scale. The stat fills the screen — nothing else competes for attention.

Use for:
- Problem scenes: "73% of customer data is never acted on"
- Value proof: "Teams close deals 3× faster"
- Impact scenes: "$2.4M saved per year on average"
- One before, one after — shown sequentially

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const StatCounterScene = ({ BRAND, textStack, targetNumber, prefix = "", suffix = "%" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring-eased counter: low stiffness = decelerates heavily near the end
  // This creates "suspense weight" — not a robotic linear count
  const countSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 24, stiffness: 60 }, // Low stiffness = slow deceleration
    durationInFrames: 60,
  });
  const currentNumber = Math.floor(interpolate(countSpring, [0, 1], [0, targetNumber]));
  const formattedNumber = currentNumber.toLocaleString(); // Comma-separated: 1,234,567

  // Label reveal (early, sets context before number lands)
  const labelSpring = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 140 } });
  // Subline reveal (after counter reaches 80% of target)
  const sublineReveal = interpolate(countSpring, [0.8, 1], [0, 1], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{
      backgroundColor: BRAND.bg || "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* Ambient background glow — number casts a light source */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "80%", height: "60%",
        borderRadius: "50%",
        background: `radial-gradient(ellipse, ${BRAND.primary || "#6366f1"}18 0%, transparent 70%)`,
        filter: "blur(60px)",
        opacity: countSpring,
      }} />

      {/* Section Label — reveals first to frame the incoming number */}
      <div style={{ overflow: "hidden", marginBottom: 24 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: BRAND.primary || "#6366f1",
          fontFamily: "Inter, sans-serif",
          transform: `translateY(${interpolate(labelSpring, [0, 1], [100, 0])}%)`,
        }}>
          {textStack?.label || "The Result"}
        </div>
      </div>

      {/* MASSIVE NUMBER — the hero */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        fontFamily: "Inter, sans-serif",
        lineHeight: 1.0,
        letterSpacing: "-0.05em", // Extremely tight — essential for heroic scale
      }}>
        {/* Prefix (e.g. "$") — 55% of number size, brand colored */}
        {prefix && (
          <span style={{
            fontSize: 120,
            fontWeight: 900,
            color: BRAND.primary || "#6366f1",
            marginRight: 8,
          }}>
            {prefix}
          </span>
        )}

        {/* Main number — 220px heroic scale */}
        <span style={{
          fontSize: 220,
          fontWeight: 900,
          color: "#ffffff",
          fontVariantNumeric: "tabular-nums",
        }}>
          {formattedNumber}
        </span>

        {/* Suffix (e.g. "%", "×", "K") — 55% of number size, brand colored */}
        {suffix && (
          <span style={{
            fontSize: 120,
            fontWeight: 900,
            color: BRAND.primary || "#6366f1",
            marginLeft: 8,
          }}>
            {suffix}
          </span>
        )}
      </div>

      {/* Subline — appears once the counter reaches 80% of target */}
      <div style={{ overflow: "hidden", marginTop: 32 }}>
        <div style={{
          fontSize: 28, color: "#94a3b8",
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          textAlign: "center",
          maxWidth: 700,
          transform: `translateY(${interpolate(sublineReveal, [0, 1], [100, 0])}%)`,
          opacity: sublineReveal,
        }}>
          {textStack?.subline || "compared to industry average"}
        </div>
      </div>

    </AbsoluteFill>
  );
};
```

---

## Spring / Timing Reference

| Element | Config | Behavior |
|---|---|---|
| Counter spring | `stiff:60, damp:24` | Rapid start, heavy deceleration — like a car braking |
| Section label | `stiff:140, damp:16` | Normal MaskedReveal, reveals at f:5 |
| Subline reveal | Triggers at `countSpring > 0.8` | Only appears after counter is nearly done |

---

## Multiple Stats Variant (3-Column)

For showing 3 metrics side-by-side — each counter is staggered by 20 frames:

```tsx
const STATS = [
  { value: 94,   prefix: "",  suffix: "%",  label: "Faster", context: "time to close" },
  { value: 2400, prefix: "$", suffix: "K",  label: "Saved",  context: "per team per year" },
  { value: 12,   prefix: "",  suffix: "×",  label: "More",   context: "leads converted" },
];

{STATS.map((stat, i) => {
  const STAT_START = i * 20;
  const statSpring = spring({ frame: frame - STAT_START, fps, config: { damping: 24, stiffness: 60 }, durationInFrames: 60 });
  const current = Math.floor(interpolate(statSpring, [0, 1], [0, stat.value]));

  return (
    <div key={i} style={{ textAlign: "center", opacity: statSpring }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: BRAND.primary, marginBottom: 8 }}>{stat.label}</div>
      <div style={{ fontSize: 120, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.0 }}>
        {stat.prefix}{current.toLocaleString()}{stat.suffix}
      </div>
      <div style={{ fontSize: 18, color: "#64748b", marginTop: 8 }}>{stat.context}</div>
    </div>
  );
})}
```

---

## Anti-Patterns

- **NEVER use linear math** (`frame * speed`) for the counter. It feels robotic and stops abruptly. Drive with a low-stiffness `spring` so it decelerates naturally.
- **NEVER make prefix/suffix the same size as the main number.** The `$`, `%`, `×` should be ~55% of the number size and branded with `BRAND.primary`.
- **NEVER go below 160px for the main number.** Anything smaller loses the "heroic scale" impact that makes the stat memorable.
- **NEVER use `fontVariantNumeric: "tabular-nums"` only on the suffix** — it must wrap the entire number to prevent layout shift as digits change.
- **NEVER reveal the subline simultaneously with the number.** Tie it to `countSpring > 0.8` — the label is the punchline, it lands AFTER the number settles.

---

## Quality Checklist

- [ ] Number size is `160px` minimum (`220px` preferred for full-screen stat)
- [ ] Letter spacing is extremely tight: `-0.05em`
- [ ] Number formatted with `.toLocaleString()` for comma separators
- [ ] Counter uses `spring` with `stiffness:60` — NOT linear frame math
- [ ] Prefix/suffix are ~55% of number size and colored with `BRAND.primary`
- [ ] Subline reveal tied to `countSpring > 0.8` (appears after counter settles)
- [ ] Background has radial glow behind number (opacity tied to `countSpring`)
