---
title: Premium Feature Grid
impact: HIGH
impactDescription: Animates a 2x2 or 3x2 grid of glassmorphic feature cards with high-speed micro-staggers and a sequential highlight pulse.
tags: feature-grid, feature-cards, product-features, grid, micro-stagger, glassmorphism, highlight, benefits, capabilities
qualityBar: The cards do not fade in; they cascade sharply from the bottom. They use the strict Glassmorphism CSS standard. Once all cards are in, one specific card scales up slightly and brightens to draw the viewer's focus.
---

## When to Use

When you need to show 4–6 features simultaneously with visual density. More impactful than a stacked list — the grid fills the frame and lets the viewer absorb multiple features at once.

Use for:
- "Here's what you get" showcase scenes
- Product capabilities overview
- Comparison of use-case categories
- Feature highlight before CTA

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const FeatureGridScene = ({ BRAND, textStack, features, highlightIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const GRID_START = 15;
  const COLS = 3; // Use 2 for 2x2, 3 for 3x2

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", display: "flex", flexDirection: "column", padding: "6% 8%", overflow: "hidden" }}>

      {/* HEADER — Centered 3-Layer Stack */}
      <div style={{ textAlign: "center", marginBottom: 48, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {(() => {
          const labelS    = spring({ frame: frame,      fps, config: { damping: 16, stiffness: 140 } });
          const headlineS = spring({ frame: frame - 7,  fps, config: { damping: 18, stiffness: 120 } });
          const sublineS  = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 120 } });
          return (
            <>
              <div style={{ overflow: "hidden", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: BRAND.primary || "#6366f1", fontFamily: "Inter, sans-serif", transform: `translateY(${interpolate(labelS, [0, 1], [100, 0])}%)` }}>
                  {textStack?.label}
                </div>
              </div>
              <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: 16 }}>
                <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#fff", fontFamily: "Inter, sans-serif", transform: `translateY(${interpolate(headlineS, [0, 1], [100, 0])}%)` }}>
                  {textStack?.headline}
                </div>
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 22, color: "#94a3b8", fontFamily: "Inter, sans-serif", transform: `translateY(${interpolate(sublineS, [0, 1], [100, 0])}%)`, opacity: sublineS }}>
                  {textStack?.subline}
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* THE GRID */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: 28,
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        flex: 1,
      }}>
        {features.slice(0, 6).map((feature, i) => {
          // Micro-stagger: 3 frames per card (tight, rapid cascade)
          const cardSpring = spring({
            frame: frame - (GRID_START + i * 3),
            fps,
            config: { damping: 16, stiffness: 140 },
          });

          // Highlight logic: wait until all cards enter, then pop the target
          const HIGHLIGHT_START = GRID_START + (features.slice(0, 6).length * 3) + 15;
          const isTarget = i === highlightIndex;
          const highlightSpring = isTarget
            ? spring({ frame: frame - HIGHLIGHT_START, fps, config: { damping: 14, stiffness: 120 } })
            : 0;

          const cardScale   = interpolate(cardSpring, [0, 1], [0.8, 1]) + interpolate(highlightSpring, [0, 1], [0, 0.05]);
          const cardOpacity = isTarget || frame < HIGHLIGHT_START
            ? cardSpring
            : interpolate(frame, [HIGHLIGHT_START, HIGHLIGHT_START + 12], [1, 0.4], { extrapolateRight: "clamp" });

          const isHighlighted = isTarget && frame > HIGHLIGHT_START;

          return (
            <div key={i} style={{
              // High-Depth Glassmorphism (mandatory)
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              borderTop:    `1px solid rgba(255,255,255,${isHighlighted ? 0.5 : 0.2})`,
              borderLeft:   `1px solid rgba(255,255,255,${isHighlighted ? 0.3 : 0.12})`,
              borderRight:  "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 24,
              padding: 32,
              transform: `translateY(${interpolate(cardSpring, [0, 1], [60, 0])}px) scale(${cardScale})`,
              opacity: cardOpacity,
              boxShadow: isHighlighted
                ? `0 20px 40px ${BRAND.primary || "#6366f1"}40, 0 1px 2px rgba(0,0,0,0.12)`
                : "0 1px 2px rgba(0,0,0,0.12), 0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              {/* Icon container */}
              <div style={{
                width: 48, height: 48,
                borderRadius: 12,
                background: isHighlighted ? (BRAND.primary || "#6366f1") : "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                transition: "background 0.3s",
              }}>
                {feature.icon || "✨"}
              </div>
              <h3 style={{
                fontSize: 20, fontWeight: 700, color: "#fff",
                fontFamily: "Inter, sans-serif",
                margin: 0, letterSpacing: "-0.02em",
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: 15, color: "#94a3b8",
                fontFamily: "Inter, sans-serif",
                margin: 0, lineHeight: 1.5,
              }}>
                {feature.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

---

## Timing Reference

| Element | Formula | Result |
|---|---|---|
| Card entrance stagger | `GRID_START + i * 3` | 3-frame gap between each card |
| Highlight trigger | `GRID_START + n_cards * 3 + 15` | Starts 15f after last card settles |
| Non-target dim | `interpolate(frame, [HL_START, HL_START+12], [1, 0.4])` | Smooth 12-frame fade to 40% |

---

## 2×2 Variant (4 Features, Maximum Impact)

For 4 features at larger card size — use `gridTemplateColumns: "repeat(2, 1fr)"` and `padding: 32px` per card with `fontSize: 24` for titles.

```tsx
// 2x2 FEATURES definition
const FEATURES = [
  { icon: "⚡", title: "Instant Sync",      desc: "Changes propagate in under 200ms — no waiting." },
  { icon: "🔒", title: "Zero-Trust Access", desc: "Every action is authenticated, logged, and auditable." },
  { icon: "📊", title: "Live Dashboards",   desc: "Real-time metrics with sub-second refresh." },
  { icon: "🔗", title: "200+ Integrations", desc: "One-click connection to your entire stack." },
];
```

---

## Anti-Patterns

- **NEVER let all cards appear simultaneously.** Enforce the 3-frame micro-stagger (`i * 3`). A simultaneous pop looks like a CSS transition, not animation.
- **NEVER leave the grid static after entrance.** It becomes a flat slide. The `highlightIndex` highlight logic dims surrounding cards to `0.4` opacity and scales/glows the target — giving the scene a narrative arc.
- **NEVER use uniform border** (`border: "1px solid rgba(255,255,255,0.1)"`). Use four directional borders (top/left brighter).
- **NEVER make the highlight icon the same style as non-highlighted icons.** Fill it with `BRAND.primary` to create a clear visual anchor.

---

## Quality Checklist

- [ ] Micro-stagger is exactly 3 frames between grid items (`i * 3`)
- [ ] Cards cascade from `translateY(60px)` to `0` — not fade-in from opacity 0
- [ ] Glassmorphism uses `blur(24px) saturate(150%)` with directional borders
- [ ] Post-entrance highlight dims non-target cards to `0.4` opacity
- [ ] Highlighted card gets `BRAND.primary` icon fill + brand-color `boxShadow` glow
- [ ] Scene wrapped in slow cinematic zoom (`1.0→1.05` over 150f)
