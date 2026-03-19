---
title: Premium Metric Flyout
impact: HIGH
impactDescription: hero metric at 280px scale in center + 3-4 satellite stat pills flying in from screen edges; radial glow behind central number; constellation of data proof
tags: metric, stats, flyout, satellite-stats, roi, data-proof, big-number, supporting-stats, constellation, kpi, impact, proof, numbers, multi-stat
---

## When to Use

Use when your scene is anchored on ONE impressive metric (e.g. "94%", "$2.4M", "3×") and you have 3–4 supporting stats that reinforce it. The hero number dominates; the satellites orbit to add credibility.

Use for:
- Dedicated "proof of impact" scene after the problem statement
- Before/after ROI reveal with supporting evidence
- Any B2B product with quantifiable outcomes

Use **premium-stat-counter** instead when:
- You have only 1 stat and no supporting data
- The scene is 90 frames or less (metric-flyout needs ~120+ frames to land)

Use **premium-data-reveal** instead when:
- All stats are equally weighted (no clear hero number)

---

## Core Pattern

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// --- CONFIG ---
const HERO_VALUE  = 94;           // Final hero number
const HERO_SUFFIX = "%";          // "%", "×", "K+", "M"
const HERO_LABEL  = "faster time-to-close";
const TARGET_VALUE = 94;          // same as HERO_VALUE for count-up

// Supporting satellite stats
const SATELLITE_STATS = [
  { value: "3×",    label: "more pipeline",    side: "left"   },
  { value: "$2.4M", label: "avg annual ROI",   side: "right"  },
  { value: "18s",   label: "avg response time", side: "top"   },
  { value: "99%",   label: "customer retention", side: "bottom" },
];

// --- HERO COUNT-UP ---
const heroProgress = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
});
const displayValue = Math.round(TARGET_VALUE * heroProgress);

// --- GLOW PULSE ---
const glowScale = interpolate(
  spring({ frame: Math.max(0, frame - 20), fps, config: SPRING_CONFIGS.entrance }),
  [0, 1], [0.8, 1.0], { extrapolateRight: "clamp" }
);

// --- HERO ENTRANCE ---
const heroSpring = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 100 } });
const heroScale  = interpolate(heroSpring, [0, 1], [0.7, 1.0], { extrapolateRight: "clamp" });

// --- FINAL HERO PUNCH (last frames) ---
const punchProgress = interpolate(frame, [80, 90, 100], [1.0, 1.04, 1.0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Satellite float
const float = Math.sin(frame * 0.04) * 3;

// Satellite positions (% of width/height, from top-left)
const SATELLITE_POSITIONS = {
  left:   { x: "18%",  y: "50%" },
  right:  { x: "82%",  y: "50%" },
  top:    { x: "72%",  y: "25%" },
  bottom: { x: "28%",  y: "75%" },
};

// Satellite animation (fly in from edges, staggered by 12 frames)
const SATELLITE_OFFSETS = { left: -200, right: 200, top: -150, bottom: 150 };
const SATELLITE_AXES    = { left: "X",  right: "X",  top: "Y",   bottom: "Y"  };

<AbsoluteFill style={{
  backgroundColor: BRAND.bg,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexDirection: "column",
}}>

  {/* Background radial glow behind hero number */}
  <div style={{
    position: "absolute",
    width: 480, height: 480, borderRadius: "50%",
    background: `radial-gradient(circle, ${BRAND.primary}1a 0%, transparent 65%)`,
    top: "50%", left: "50%",
    transform: `translate(-50%, -50%) scale(${glowScale})`,
    pointerEvents: "none",
  }} />

  {/* SVG arc ring drawing around glow area */}
  <svg
    style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
    width={340} height={340} viewBox="0 0 340 340"
  >
    <circle
      cx={170} cy={170} r={160}
      fill="none"
      stroke={`${BRAND.primary}33`}
      strokeWidth={1.5}
      strokeDasharray={`${2 * Math.PI * 160} ${2 * Math.PI * 160}`}
      strokeDashoffset={interpolate(
        frame, [30, 75], [2 * Math.PI * 160, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )}
      strokeLinecap="round"
      transform="rotate(-90 170 170)"
    />
  </svg>

  {/* HERO NUMBER */}
  <div style={{
    display: "flex", alignItems: "baseline", gap: 4,
    transform: `scale(${heroScale * punchProgress})`,
    opacity: interpolate(frame, [5, 18], [0, 1], { extrapolateRight: "clamp" }),
  }}>
    <span style={{
      fontSize: TARGET_VALUE.toString().length <= 2 ? 280 : TARGET_VALUE.toString().length <= 4 ? 220 : 160,
      fontWeight: 900,
      letterSpacing: "-0.05em",
      lineHeight: 0.9,
      fontFamily: BRAND.font ?? "Inter, sans-serif",
      fontVariantNumeric: "tabular-nums",
      background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary ?? BRAND.primary} 100%)`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }}>
      {displayValue}
    </span>
    <span style={{
      fontSize: 90,
      fontWeight: 800,
      color: BRAND.primary,
      fontFamily: BRAND.font ?? "Inter, sans-serif",
      opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
    }}>
      {HERO_SUFFIX}
    </span>
  </div>

  {/* Hero label below number */}
  <div style={{
    fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em",
    color: BRAND.textMuted,
    fontFamily: BRAND.font ?? "Inter, sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginTop: 16,
    opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [30, 45], [12, 0], { extrapolateRight: "clamp" })}px)`,
  }}>
    {HERO_LABEL}
  </div>

  {/* SATELLITE STATS */}
  {SATELLITE_STATS.map((stat, i) => {
    const enterFrame = 40 + i * 12;
    const p = spring({ frame: Math.max(0, frame - enterFrame), fps, config: SPRING_CONFIGS.entrance });
    const axis = SATELLITE_AXES[stat.side as keyof typeof SATELLITE_AXES];
    const offset = SATELLITE_OFFSETS[stat.side as keyof typeof SATELLITE_OFFSETS];
    const translate = interpolate(p, [0, 1], [offset, 0], { extrapolateRight: "clamp" });
    const opacity = interpolate(frame, [enterFrame, enterFrame + 10], [0, 1], { extrapolateRight: "clamp" });
    const pos = SATELLITE_POSITIONS[stat.side as keyof typeof SATELLITE_POSITIONS];
    const floatOffset = Math.sin((frame + i * 30) * 0.04) * 3;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: pos.x, top: pos.y,
          transform: `translate(-50%, -50%) translate${axis}(${translate}px) translateY(${floatOffset}px)`,
          opacity,
        }}
      >
        {/* Stat card */}
        <div style={{
          background: BRAND.style === "dark"
            ? "rgba(255,255,255,0.08)"
            : "white",
          backdropFilter: BRAND.style === "dark" ? "blur(12px)" : undefined,
          border: `1px solid ${BRAND.border ?? "rgba(0,0,0,0.08)"}`,
          borderRadius: 16,
          padding: "16px 24px",
          textAlign: "center",
          boxShadow: BRAND.style === "dark"
            ? "0 4px 24px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          minWidth: 120,
        }}>
          <div style={{
            fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em",
            color: BRAND.text,
            fontFamily: BRAND.font ?? "Inter, sans-serif",
            fontVariantNumeric: "tabular-nums",
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: 13, color: BRAND.textMuted, marginTop: 4,
            fontFamily: BRAND.font ?? "Inter, sans-serif",
          }}>
            {stat.label}
          </div>
        </div>
      </div>
    );
  })}

</AbsoluteFill>
```

---

## Hero Metric Sizing

| Stat length | fontSize |
|---|---|
| 1–2 chars (94%, 3×) | 280px |
| 3–4 chars ($2.4M, 10K+) | 220px |
| 5+ chars ($24.8M) | 160px |

Always use `fontVariantNumeric: "tabular-nums"` to prevent layout shift during count-up.

---

## Currency / Decimal Count-Up

```tsx
// For $2.4M:
const displayFormatted = `$${(2.4 * heroProgress).toFixed(1)}M`;

// For 10K+:
const displayFormatted = `${Math.round(10 * heroProgress)}K+`;

// For multiples (3×):
// Skip count-up — just reveal at f:30 with scale spring; multipliers don't read well when counting up from 0
```

---

## Satellite Positions Layout

```
                    [TOP stat]
                      72%, 25%

[LEFT stat]      [HERO NUMBER]      [RIGHT stat]
  18%, 50%                             82%, 50%

  [BOTTOM stat]
    28%, 75%
```

---

## Pairing Rules

- Pair with **premium-ambient-environment** as base layer for extra depth on dark themes
- Follow with **premium-cta-scene** for a strong close if this is the last proof scene
- Works well AFTER **premium-team-orbit** or **premium-floating-path-nodes** (problem → proof)
- Use **premium-stat-counter** instead for scenes under 90 frames (single stat, no satellites)
