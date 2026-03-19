---
title: Premium Gradient Hero
impact: HIGH
impactDescription: full-screen bold headline with brand gradient text — single punchy message, zero chrome, maximum impact
tags: gradient-text, hero, headline, typography, minimal, chapter-card, bold, brand-gradient, full-screen-text
---

## When to Use

Single-sentence scenes that need maximum visual punch. No cards, no UI, no device — just oversized words and gradient color. Used for:
- Chapter title cards between showcase scenes
- Bold problem statements ("73% of teams miss deadlines")
- CTA openers and brand reveal moments
- Any scene where the MESSAGE is the visual

---

## Core Gradient Text Pattern (copy exactly)

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

const HEADLINE = "Built for teams that ship.";
const words = HEADLINE.split(" ");

<AbsoluteFill style={{
  backgroundColor: BRAND.bg,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexDirection: "column", gap: 28, padding: "0 80px",
}}>

  {/* Optional: soft radial glow behind text */}
  <div style={{
    position: "absolute", width: 900, height: 600, borderRadius: "50%",
    background: `radial-gradient(ellipse, ${BRAND.primary}20 0%, transparent 70%)`,
    filter: "blur(80px)", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  }} />

  {/* Gradient headline — word-by-word spring stagger */}
  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 20px", position: "relative" }}>
    {words.map((word, i) => {
      const delay = i * 5;
      const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 160 } });
      return (
        <span key={i} style={{
          display: "inline-block",
          fontSize: words.length <= 3 ? 140 : words.length <= 6 ? 108 : 80,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.0,
          fontFamily: BRAND.font ?? "Inter, sans-serif",
          // GRADIENT TEXT — the critical pattern:
          background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 60%, ${BRAND.primary} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          opacity: interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
          willChange: "transform",
        }}>
          {word}
        </span>
      );
    })}
  </div>

  {/* Subheadline — appears after headline completes */}
  <div style={{
    fontSize: 28, fontWeight: 400, color: BRAND.textMuted,
    fontFamily: BRAND.font ?? "Inter, sans-serif",
    letterSpacing: "-0.01em", textAlign: "center", maxWidth: "65%",
    opacity: interpolate(frame, [words.length * 5 + 15, words.length * 5 + 30], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [words.length * 5 + 15, words.length * 5 + 30], [20, 0], { extrapolateRight: "clamp" })}px)`,
  }}>
    {SUBHEADLINE}
  </div>

</AbsoluteFill>
```

---

## Typography Sizing Rule

Size based on word count so text FILLS the frame:

| Words in headline | fontSize | letterSpacing |
|---|---|---|
| 1–3 words | **140–160px** | -0.05em |
| 4–6 words | **96–120px** | -0.04em |
| 7–9 words | **72–88px** | -0.03em |
| 10+ words | **56–68px** | -0.02em |

**NEVER use less than 72px for the hero headline. Never.**

---

## Accent Word Variant

One bold gradient word, rest in plain text:

```tsx
const ACCENT_INDEX = 2; // which word gets the gradient

words.map((word, i) => (
  <span key={i} style={i === ACCENT_INDEX ? {
    background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  } : {
    color: BRAND.text,
  }}>
    {word}{" "}
  </span>
))
```

---

## Underline Draw Accent

A brand-colored line that sweeps under the key phrase:

```tsx
const UNDERLINE_START = words.length * 5 + 5;
const underlineW = interpolate(frame, [UNDERLINE_START, UNDERLINE_START + 25], [0, 100], {
  extrapolateRight: "clamp",
  easing: (t) => 1 - Math.pow(1 - t, 3),
});

// Sibling div after the word span:
<div style={{
  height: 5, borderRadius: 3, marginTop: 8,
  width: `${underlineW}%`,
  background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.secondary})`,
}} />
```

---

## Light Background Variant

```tsx
// Replace background gradient with brand colors on white bg:
backgroundColor: "#f8fafc",
// Headline: same gradient pattern — works on light bg
// Subheadline: color: "rgba(15,23,42,0.5)"
// Remove glow overlay
```
