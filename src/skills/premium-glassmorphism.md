---
title: Premium Glassmorphism, Blend Modes & Parallax Depth
impact: HIGH
impactDescription: glass UI cards, glowing orbs with blend modes, and layered parallax camera movement — the techniques that separate agency-quality from DIY
tags: glassmorphism, glass, blur, backdrop-filter, blend-mode, parallax, depth, glow, orbs, dark-mode, premium-look
---

## Glassmorphism Pattern

The "glass card" effect: frosted glass with a 1px semi-transparent border, radial glow behind it, and content on top. Use on dark backgrounds only.

```tsx
{/* The glow sits BEHIND the card — place it first */}
<div style={{
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 480, height: 480,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
  filter: "blur(60px)",
  pointerEvents: "none",
}} />

{/* Glass card with directional lighting bevel */}
<div style={{
  background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderTop: "1px solid rgba(255,255,255,0.20)",
  borderLeft: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 24,
  padding: "32px 40px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.40), inset 0 1px 1px rgba(255,255,255,0.15)",
}}>
  {/* content */}
</div>
```

### Tuning Table

| Use Case | blur | bg opacity | border opacity |
|---|---|---|---|
| Subtle card | 8px | 0.04 | 0.08 |
| Standard card | 14px | 0.06 | 0.12 |
| Heavy glass | 22px | 0.10 | 0.18 |
| Full panel | 32px | 0.14 | 0.20 |

---

## Glowing Orbs with CSS Blend Modes

Orbs that sit *naturally* in the scene using `mix-blend-mode`. Works for animated background spheres, light streaks, and color washes.

```tsx
const frame = useCurrentFrame();

// Slow drift — each orb moves independently
const orb1X = Math.sin(frame * 0.018) * 80;
const orb1Y = Math.cos(frame * 0.014) * 60;
const orb2X = Math.sin(frame * 0.022 + 1.5) * 100;
const orb2Y = Math.cos(frame * 0.016 + 2) * 70;
```

```tsx
<AbsoluteFill style={{ background: "#080c14", overflow: "hidden" }}>

  {/* Orb 1 — indigo, screen blend */}
  <div style={{
    position: "absolute",
    top: "20%", left: "15%",
    width: 600, height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.7) 0%, transparent 65%)",
    filter: "blur(80px)",
    transform: `translate(${orb1X}px, ${orb1Y}px)`,
    mixBlendMode: "screen",
    pointerEvents: "none",
  }} />

  {/* Orb 2 — teal, screen blend */}
  <div style={{
    position: "absolute",
    bottom: "10%", right: "10%",
    width: 500, height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(20,184,166,0.6) 0%, transparent 65%)",
    filter: "blur(70px)",
    transform: `translate(${orb2X}px, ${orb2Y}px)`,
    mixBlendMode: "screen",
    pointerEvents: "none",
  }} />

  {/* Content sits on top */}
</AbsoluteFill>
```

### Blend Mode Cheat Sheet

| Mode | Effect | Best For |
|---|---|---|
| `screen` | Brightens — dark areas become transparent | Glowing orbs on dark bg |
| `overlay` | Deepens contrast | Text glow sweeps |
| `multiply` | Darkens — white areas become transparent | Vignette overlays |
| `color-dodge` | Dramatic light burst | Flash transitions |

---

## Light Sweep Across Text

A diagonal shine that sweeps across a headline — standard agency technique:

```tsx
const { width } = useVideoConfig();
const sweepX = interpolate(
  frame,
  [20, 80],
  [-width, width * 0.5],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

```tsx
<div style={{ position: "relative", display: "inline-block" }}>
  <h1 style={{
    fontSize: 72, fontWeight: 900, color: "white",
    fontFamily: "Inter, sans-serif", margin: 0,
  }}>
    Your Headline
  </h1>
  {/* Sweep overlay — blend mode makes it glow only over text */}
  <div style={{
    position: "absolute", inset: 0,
    background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)`,
    transform: `translateX(${sweepX}px)`,
    mixBlendMode: "overlay",
    pointerEvents: "none",
  }} />
</div>
```

---

## Parallax Depth System

Background, midground, and foreground scale/pan at **different rates** on the same camera move — creates true 3D depth without Three.js.

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Camera push-in: 0 → 1 over 90 frames
const cameraProgress = interpolate(
  frame,
  [0, 90],
  [0, 1],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
  }
);

// Each layer gets a different multiplier — background moves least
const bgScale    = interpolate(cameraProgress, [0, 1], [1.00, 1.06]);  // barely moves
const gridScale  = interpolate(cameraProgress, [0, 1], [1.00, 1.14]);  // mid
const cardScale  = interpolate(cameraProgress, [0, 1], [1.00, 1.28]);  // most
const cursorScale = interpolate(cameraProgress, [0, 1], [1.00, 1.45]); // cursor overtakes fastest

// Pan offset (if camera tracks left→right)
const bgPanX    = interpolate(cameraProgress, [0, 1], [0, -20]);
const gridPanX  = interpolate(cameraProgress, [0, 1], [0, -50]);
const cardPanX  = interpolate(cameraProgress, [0, 1], [0, -100]);
```

```tsx
<AbsoluteFill style={{ background: "#0a0f1e", overflow: "hidden" }}>

  {/* Layer 0: Background gradient — barely moves */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)",
    transform: `scale(${bgScale}) translateX(${bgPanX}px)`,
    transformOrigin: "center center",
  }} />

  {/* Layer 1: Dot grid — moves a little more */}
  <div style={{
    position: "absolute", inset: 0,
    opacity: 0.15,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
    transform: `scale(${gridScale}) translateX(${gridPanX}px)`,
    transformOrigin: "center center",
  }} />

  {/* Layer 2: Background UI cards — inactive / blurred */}
  <div style={{
    position: "absolute",
    top: "20%", left: "5%",
    transform: `scale(${bgScale}) translateX(${bgPanX * 1.5}px)`,
    transformOrigin: "center center",
    opacity: 0.4,
    filter: "blur(2px)",
  }}>
    {/* ghost cards */}
    {[0,1].map(i => (
      <div key={i} style={{
        width: 200, height: 120, marginBottom: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
      }} />
    ))}
  </div>

  {/* Layer 3: Foreground hero card — moves the most */}
  <div style={{
    position: "absolute",
    top: "50%", left: "50%",
    transform: `translate(-50%, -50%) scale(${cardScale}) translateX(${cardPanX}px)`,
    transformOrigin: "center center",
  }}>
    <div style={{
      width: 520, height: 320,
      background: "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderTop: "1px solid rgba(255,255,255,0.24)",
      borderLeft: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 20,
      boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
    }}>
      {/* card content */}
    </div>
  </div>

</AbsoluteFill>
```

---

---

## Gradient-Glow Border (Linear/Stripe style)

Instead of a flat 1px border, use a layered box-shadow trick that produces a colored glow ring:

```tsx
{/* Glowing border card — brand color ring with outer diffuse halo */}
<div style={{
  background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: 20,
  // Layered shadows: 1px sharp brand ring + diffuse outer glow
  boxShadow: `0 0 0 1px ${BRAND.primary}55, 0 0 24px ${BRAND.primary}22, 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.12)`,
  padding: "24px 32px",
}}>
  {/* content */}
</div>
```

For a subtle inactive state and bold active state (tabs, selected cards):
```tsx
const activeGlow = `0 0 0 1px ${BRAND.primary}88, 0 0 32px ${BRAND.primary}33, 0 8px 32px rgba(0,0,0,0.35)`;
const inactiveGlow = `0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)`;
style={{ boxShadow: isActive ? activeGlow : inactiveGlow }}
```

---

## Glass Notification / Toast Card

Floating notification that slides up from the bottom with a brand-color left stripe:

```tsx
const toastOpacity = interpolate(frame, [openFrame, openFrame + 10, closeFrame - 8, closeFrame], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const toastY = interpolate(frame, [openFrame, openFrame + 12], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });

<div style={{
  position: "absolute",
  bottom: 48, right: 48,
  opacity: toastOpacity,
  transform: `translateY(${toastY}px)`,
  zIndex: 200,
  display: "flex", alignItems: "stretch",
  background: "rgba(15,20,35,0.88)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 14,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
  overflow: "hidden",
  minWidth: 300,
}}>
  {/* Brand color left stripe */}
  <div style={{ width: 4, background: BRAND.primary, flexShrink: 0 }} />
  <div style={{ padding: "14px 18px", flex: 1 }}>
    <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.text, fontFamily: BRAND.font + ", sans-serif", marginBottom: 4 }}>
      Success
    </div>
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: BRAND.font + ", sans-serif" }}>
      Changes saved successfully
    </div>
  </div>
  {/* Checkmark icon */}
  <div style={{ padding: "14px 16px", display: "flex", alignItems: "center" }}>
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: BRAND.primary + "30", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 10, height: 6, border: `2px solid ${BRAND.primary}`, borderTop: "none", borderRight: "none", transform: "rotate(-45deg) translateY(-1px)" }} />
    </div>
  </div>
</div>
```

---

## Stat / Metric Glass Widget (Stripe Dashboard style)

Compact metric card with trend indicator — great for floating overlays on showcase scenes:

```tsx
const METRICS = [
  { label: "Revenue",    value: "$124K", trend: "+18%", up: true  },
  { label: "Users",      value: "8,421",  trend: "+6%",  up: true  },
  { label: "Churn Rate", value: "2.1%",   trend: "-0.3%",up: true  },
];

{METRICS.map((m, i) => {
  const delay = i * 12;
  const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [delay, delay + 15], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <div key={i} style={{
      opacity: cardOpacity, transform: `translateY(${cardY}px)`,
      background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderTop: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 16, padding: "18px 22px",
      minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: BRAND.font + ", sans-serif", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {m.label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: BRAND.text, fontFamily: BRAND.font + ", sans-serif", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {m.value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: m.up ? "#22c55e" : "#ef4444", fontFamily: BRAND.font + ", sans-serif", marginTop: 6 }}>
        {m.trend} this month
      </div>
    </div>
  );
})}
```

---

## Glass Navbar (Frosted Dark)

Sticky top bar with frosted glass — works across dark and medium backgrounds:

```tsx
<div style={{
  position: "absolute", top: 0, left: 0, right: 0,
  height: 56,
  background: "rgba(8,12,24,0.75)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  display: "flex", alignItems: "center", padding: "0 32px", gap: 32,
  zIndex: 50,
}}>
  {/* Logo */}
  <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.primary, fontFamily: BRAND.font + ", sans-serif", letterSpacing: "-0.03em" }}>
    {BRAND.name ?? "Product"}
  </div>
  {/* Nav links */}
  {["Features", "Pricing", "Docs"].map((link, i) => (
    <div key={i} style={{ fontSize: 14, color: i === 0 ? BRAND.text : "rgba(255,255,255,0.45)", fontWeight: i === 0 ? 600 : 400, fontFamily: BRAND.font + ", sans-serif", cursor: "default" }}>
      {link}
    </div>
  ))}
  {/* CTA pill button */}
  <div style={{ marginLeft: "auto", background: BRAND.primary, color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 20px", borderRadius: 99, fontFamily: BRAND.font + ", sans-serif" }}>
    Get started
  </div>
</div>
```

---

## Glass CTA Button with Shine Sweep

A pill CTA button with a diagonal light sweep on entrance — the standard premium SaaS CTA:

```tsx
const SHINE_START = 30;
const { width: vw } = useVideoConfig();
const shineX = interpolate(frame, [SHINE_START, SHINE_START + 40], [-vw * 0.3, vw * 0.3], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
});

<div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 99 }}>
  <div style={{
    background: BRAND.primary,
    color: "#fff",
    fontSize: 18, fontWeight: 700,
    padding: "18px 48px",
    borderRadius: 99,
    fontFamily: BRAND.font + ", sans-serif",
    letterSpacing: "-0.01em",
    boxShadow: `0 8px 32px ${BRAND.primary}55`,
    position: "relative",
  }}>
    {/* Shine sweep */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
      transform: `translateX(${shineX}px)`,
      pointerEvents: "none",
    }} />
    Get Started Free →
  </div>
</div>
```

---

## Light Glassmorphism (Frosted White)

For light-background brands — cards feel like frosted white glass over a soft gradient:

```tsx
{/* On a pastel/white bg, use white with high opacity + colored drop shadow */}
<div style={{
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.9)",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  borderRight: "1px solid rgba(0,0,0,0.04)",
  borderRadius: 20,
  boxShadow: `0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)`,
  padding: "24px 28px",
}}>
  {/* content — use dark text: BRAND.text or #0f172a */}
</div>
```

For floating metric card on light bg:
```tsx
boxShadow: `0 12px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04), 0 0 0 1px ${BRAND.primary}18`
```

---

## Feature Card Grid (2×2 / 3×2)

Staggered glass card grid with icon, headline, and description — standard SaaS feature section:

```tsx
const FEATURES = [
  { icon: "⚡", title: "Lightning Fast",   desc: "Sub-100ms response times globally" },
  { icon: "🔒", title: "Secure by Default", desc: "SOC2 Type II certified infrastructure" },
  { icon: "📊", title: "Real-time Analytics", desc: "Live dashboards with zero latency" },
  { icon: "🔗", title: "200+ Integrations", desc: "Connect your entire tech stack" },
];

const COLS = 2;
const CARD_W = 280, CARD_H = 160, GAP = 16;
const gridW = COLS * CARD_W + (COLS - 1) * GAP;

{FEATURES.map((f, i) => {
  const col = i % COLS, row = Math.floor(i / COLS);
  const delay = (col + row * COLS) * 8;
  const cardScale = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const cardOpacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div key={i} style={{
      position: "absolute",
      left: (width - gridW) / 2 + col * (CARD_W + GAP),
      top: (height - (Math.ceil(FEATURES.length / COLS) * (CARD_H + GAP) - GAP)) / 2 + row * (CARD_H + GAP),
      width: CARD_W, height: CARD_H,
      opacity: cardOpacity,
      transform: `scale(${cardScale})`,
      transformOrigin: "center center",
      background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderTop: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 18,
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      padding: "20px 24px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      <div style={{ fontSize: 28 }}>{f.icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.text, fontFamily: BRAND.font + ", sans-serif", marginBottom: 4 }}>{f.title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: BRAND.font + ", sans-serif", lineHeight: 1.4 }}>{f.desc}</div>
      </div>
    </div>
  );
})}
```

---

## Key Rules

- **`WebkitBackdropFilter`** — always mirror `backdropFilter` for Safari/Chrome compatibility
- **Orbs behind content**: render orb `<div>`s before the card `<div>`s in the JSX
- **`mix-blend-mode: "screen"`**: only works on dark backgrounds — on white, use `"multiply"`
- **Parallax multipliers**: background 1.06, midground 1.14, foreground 1.28+ — the bigger the gap between layers, the more "depth"
- **`transformOrigin: "center center"`** on all parallax layers — otherwise they scale from top-left
- **Never animate `filter: blur()` per-frame** — it's GPU-expensive; use a fixed blur on static "depth" layers only
- **Light vs dark glass**: dark bg → `rgba(255,255,255,0.07)` surface + `rgba(255,255,255,0.08)` border; light bg → `rgba(255,255,255,0.72)` surface + `rgba(0,0,0,0.06)` shadow ring
- **Gradient-glow border**: use layered `box-shadow` (`0 0 0 1px ${primary}55`) instead of `border` for glowing outlines

---

## High-Depth Glass Formula (WhatAStory Standard — 2026-03-18)

This is the ONLY acceptable glass card formula for premium SaaS scenes. Replace all existing glass card styles with this.

```tsx
// High-Depth Glassmorphism — directional light from top-left
// Copy-paste this EXACTLY. Do not simplify or merge the borders into one shorthand.
{
  background: "rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(24px) saturate(150%)",      // saturate(150%) prevents muddy gray blur
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  // Directional borders: top+left are brighter (light source = top-left)
  borderTop:    "1px solid rgba(255, 255, 255, 1.0)", // Full-brightness catch light on top edge
  borderLeft:   "1px solid rgba(255, 255, 255, 0.15)",
  borderRight:  "1px solid rgba(255, 255, 255, 0.06)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
  borderRadius: 20,
  // Deep shadow: sharp contact + broad ambient occlusion
  boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 25px 50px -12px rgba(0, 0, 0, 0.50)",
}
```

**Why `saturate(150%)`:** Without saturation boost, `blur()` averages the colors behind the card and produces a muddy gray haze. `saturate(150%)` keeps the colors vibrant through the frost — the background is still identifiable, just softened.

**Why `borderTop: rgba(255,255,255,1.0)`:** The top edge is where studio light hits glass at full intensity. Full-brightness white top = physical specular highlight. 0.20 opacity looks like a subtle hairline; 1.0 looks like real frosted glass.

**Why directional borders matter:** Uniform borders look flat. Top/left brighter = simulated studio light from top-left. This is the single biggest difference between generic glass and WhatAStory glass.

**Blur 24px vs 16px:** 24px is perceptibly more "frosted" — feels physical. 16px looks like a CSS effect.

**Box-shadow breakdown:**
- `0 1px 2px rgba(0,0,0,0.12)` — sharp contact shadow (object is resting on a surface)
- `0 25px 50px -12px rgba(0,0,0,0.50)` — deep ambient occlusion (object has physical mass)

---

## Light Glass Formula (Frosted White — Copy-Paste)

```tsx
// Light Glass — for pastel/white backgrounds (Pretaa, JustCall light themes)
{
  background: "rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(20px) saturate(150%)",
  WebkitBackdropFilter: "blur(20px) saturate(150%)",
  borderTop:    "1px solid rgba(255, 255, 255, 1.0)",
  borderLeft:   "1px solid rgba(255, 255, 255, 0.9)",
  borderRight:  "1px solid rgba(0, 0, 0, 0.04)",
  borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
  borderRadius: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
}
```

---

## Anti-Patterns

- **NEVER use `backdropFilter: "blur(Xpx)"` alone** — always append `saturate(150%)`. Blur without saturation boost = muddy gray haze.
- **NEVER use a single uniform border** (`border: "1px solid rgba(255,255,255,0.1)"`) — it looks flat. Use four separate directional borders.
- **NEVER skip `borderTop: "1px solid rgba(255,255,255,1.0)"`** — the top catch-light is the single most important detail for physical realism.
- **NEVER use standard `opacity` to make a card transparent** (`opacity: 0.8`) — this fades the card's content too. Use `background: "rgba(...)"` opacity instead.
- **NEVER animate `filter: blur()` per-frame** — GPU-expensive and causes jitter. Apply fixed blur to static depth layers only.
- **NEVER use `mix-blend-mode: "screen"` on light backgrounds** — orbs only work with screen blend on dark (#0a0f1e or darker).

---

## Quality Checklist

- [ ] `backdropFilter` includes both `blur(24px)` AND `saturate(150%)` — never blur alone
- [ ] All four borders set independently (not shorthand `border:`) with directional values
- [ ] `borderTop` is `rgba(255,255,255,1.0)` — full-brightness catch light
- [ ] `WebkitBackdropFilter` mirrors `backdropFilter` exactly (Safari compatibility)
- [ ] Box-shadow uses two-layer formula: sharp contact + deep AO (`0 25px 50px -12px`)
- [ ] Orb glow `<div>` is rendered BEFORE the glass card in JSX (behind in paint order)

