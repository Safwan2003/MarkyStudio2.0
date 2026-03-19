---
title: Premium Kinetic Text & Brand Reveal
impact: HIGH
impactDescription: creates energetic word-by-word entrances, animated brand pills with glass effects, and flash transition overlays
tags: kinetic-text, typography, word-stagger, brand-pill, glassmorphism, flash-transition, headline, masked-reveal, section-label
qualityBar: Every headline uses MaskedReveal (not opacity fade). Every text scene has a Section Label above the headline. The 3-layer stack (label → headline → sub-line) fires at exactly 8f → 24f → 42f. Background is never flat color — use grid, arcs, or gradient orbs. Split layout (text left 40% / UI right 60%) for showcase scenes.
---

## Visual Blueprint
```text
HOOK / CTA (centered):              SHOWCASE (split layout):

  [Section Label — 13px]            [Section Label] | [UI screenshot / device]
  [HERO HEADLINE                ]   [Hero Headline ] |  rotateY(-8deg) tilt
  [96-128px MaskedReveal        ]   [Sub-line      ] |
  [Sub-line — 24px, muted       ]                    |
```

---

## 3-Layer Text Stack — Complete Scene Template

This is the canonical pattern. Every text-focused scene must use this. Copy it verbatim:

```tsx
export const TextScene = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // EXACT TIMING — snappy cascade
  const LABEL_DELAY    = 5;
  const HEADLINE_DELAY = 12;
  const SUBLINE_DELAY  = 22;

  // Scene entry/exit
  const sceneOpacity = frame < 15
    ? interpolate(frame, [0, 15], [0, 1])
    : frame > durationInFrames - 10
      ? interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0])
      : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", opacity: sceneOpacity }}>

      {/* Background — never flat color. Choose one: */}
      {/* Option A: ArcBg from scope (light arcs on dark bg) */}
      <ArcBg brand={BRAND} />
      {/* Option B: floating orbs (see Rotating Background Orbs section) */}
      {/* Option C: dot-matrix (use premium-dot-matrix-bg skill) */}

      {/* Entropy dust — always (18 particles OUTSIDE component) */}
      {ENTROPY_DUST.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: BRAND.primary,
          opacity: 0.08 + Math.sin(frame * p.freq + p.phase) * 0.03,
          transform: `translate(${Math.sin(frame * p.freq) * 6}px, ${Math.cos(frame * p.freq * 0.7) * 4}px)`,
          zIndex: 1,
        }} />
      ))}

      {/* Text stack — left-aligned for showcase, centered for hook/CTA */}
      <div style={{
        position: "absolute",
        left: "14%", top: "50%",       // use left:30% for centered
        transform: "translateY(-50%)",
        maxWidth: "42%",               // 42% = safe text column for split layout
        // For centered: maxWidth: "72%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center"
      }}>

        {/* Layer 1 — Section Label (MANDATORY, even on 90-frame scenes) */}
        {/* Also uses overflow:hidden masked reveal — not just opacity */}
        <div style={{ overflow: "hidden", marginBottom: 18 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: BRAND.primary,
            fontFamily: BRAND.font + ", sans-serif",
            transform: `translateY(${interpolate(
              spring({ frame: frame - LABEL_DELAY, fps, config: { stiffness: 140, damping: 16 } }),
              [0, 1], [100, 0]
            )}%)`,
            opacity: interpolate(frame, [LABEL_DELAY, LABEL_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            THE PROBLEM   {/* or: THE SOLUTION / RESULTS / INTRODUCING */}
          </div>
        </div>

        {/* Layer 2 — Hero Headline: PER-LINE masked reveal with micro-stagger */}
        {/* NEVER wrap the entire headline in one overflow:hidden — each line gets its own */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
          {["Your hours are", "gone."].map((line, i) => {
            const lineSpring = spring({
              frame: frame - (HEADLINE_DELAY + i * 4), // 4f stagger per line
              fps,
              config: { stiffness: 120, damping: 18 },
            });
            return (
              <div key={i} style={{ overflow: "hidden", paddingBottom: 4 /* prevents descender clipping */ }}>
                <div style={{
                  fontSize: 108,
                  fontWeight: 900,
                  lineHeight: 1.0,
                  letterSpacing: "-0.04em",
                  color: i === 1 ? BRAND.primary : (BRAND.text || "#f8fafc"), // accent on last line
                  fontFamily: BRAND.font + ", sans-serif",
                  transform: `translateY(${interpolate(lineSpring, [0, 1], [100, 0])}%)`,
                }}>
                  {line}
                </div>
              </div>
            );
          })}
        </div>

        {/* Layer 3 — Sub-line (also overflow:hidden) */}
        <div style={{ overflow: "hidden" }}>
          <div style={{
            fontSize: 24,
            fontWeight: 400,
            lineHeight: 1.5,
            color: BRAND.textMuted || "rgba(255,255,255,0.55)",
            maxWidth: 480,
            transform: `translateY(${interpolate(
              spring({ frame: frame - SUBLINE_DELAY, fps, config: { stiffness: 120, damping: 18 } }),
              [0, 1], [100, 0]
            )}%)`,
            opacity: interpolate(frame, [SUBLINE_DELAY, SUBLINE_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            The average team wastes 11 hours a week on manual reporting.
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// Entropy dust — DEFINE OUTSIDE COMPONENT (stable seeds, no flicker)
const ENTROPY_DUST = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100,
  size: 3 + (i % 4),
  freq: 0.008 + i * 0.003,
  phase: i * 0.7,
}));
```

---

## Typography Exact Values

| Element | fontSize | fontWeight | lineHeight | letterSpacing |
|---|---|---|---|---|
| **Hero headline** | 96–128px | 900 | 1.0 | -0.04em |
| **Scene title** | 72–88px | 800 | 1.05 | -0.03em |
| **Section label** | 12–14px | 600–700 | 1.0 | 0.18em |
| **Sub-line** | 22–28px | 400 | 1.5 | 0 |
| **Badge / pill** | 13–16px | 600 | 1.0 | 0.04em |

**Violation:** `fontSize < 80px` for the primary headline = it's body text, not a headline.

---

## Headline Styles

### MaskedReveal (DEFAULT — all hero headlines)
MaskedReveal uses `overflow: hidden` + `translateY` to wipe text in from an invisible floor. Apply **per line**, not to the whole block:
```tsx
// Per-line masked reveal — correct pattern:
{["Done in seconds,", "not in hours."].map((line, i) => {
  const s = spring({ frame: frame - (12 + i * 4), fps, config: { stiffness: 120, damping: 18 } });
  return (
    <div key={i} style={{ overflow: "hidden", paddingBottom: 4 }}>
      <div style={{
        fontSize: 96, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.0,
        transform: `translateY(${interpolate(s, [0, 1], [100, 0])}%)`,
      }}>
        {line}
      </div>
    </div>
  );
})}
```

### Word Highlight Variant
Accent ONE word with brand color + subtle scale pulse:
```tsx
{["Done in", "seconds,", "not hours."].map((word, i) => {
  const isAccent = i === 1; // "seconds" gets brand color
  return (
    <span key={i} style={{
      color: isAccent ? BRAND.primary : (BRAND.text || "#f8fafc"),
      display: "inline-block",
      marginRight: "0.25em",
    }}>
      {word}
    </span>
  );
})}
// Use this INSIDE a per-line overflow:hidden container
```

### Word-by-Word Spring Pop (hooks / high-energy scenes only)
Only use for 2–4 word punchlines on HOOK scenes, not for full sentences:
```tsx
const words = ["Stop.", "Losing.", "Deals."];
const STAGGER = 4;

{words.map((word, i) => {
  const delay = i * STAGGER;
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <div key={i} style={{ overflow: "hidden", display: "inline-block", marginRight: "0.2em" }}>
      <span style={{
        display: "inline-block",
        fontSize: 128, fontWeight: 900,
        letterSpacing: "-0.04em", lineHeight: 1.0,
        color: BRAND.text,
        fontFamily: BRAND.font + ", sans-serif",
        transform: `translateY(${interpolate(s, [0, 1], [100, 0])}%)`,
      }}>
        {word}
      </span>
    </div>
  );
})}
```

Note: Wrap each word in `overflow: hidden` to create a reveal (wipe-up), not a pop. Skip the rotation — it looks cheap.

### Multi-Line Headline Handling
For headlines > 1 line, reveal each line separately:
```tsx
const LINES = ["You're losing", "deals every week"];

{LINES.map((line, i) => (
  <div key={i} style={{ overflow: "hidden" }}>
    <MaskedReveal startFrame={HEADLINE_DELAY + i * 14} durationInFrames={18}>
      <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: BRAND.text }}>
        {line}
      </div>
    </MaskedReveal>
  </div>
))}
```

---

## Split Layout (Showcase / Solution Scenes)

Text left 40% / UI right 60% — mandatory for showcase scenes:

```tsx
{/* Left 40%: text stack */}
<div style={{
  position: "absolute",
  left: "8%", top: "50%", transform: "translateY(-50%)",
  width: "33%",
}}>
  {/* 3-layer text stack (see above) */}
</div>

{/* Right 60%: UI in a tilted glass frame */}
<div style={{
  position: "absolute",
  right: "4%", top: "10%",
  width: "52%", height: "80%",
  borderRadius: 16, overflow: "hidden",
  transform: "rotateY(-8deg) rotateX(2deg)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 25px 50px -12px rgba(0,0,0,0.50)",
  opacity: interpolate(frame, [HEADLINE_DELAY, HEADLINE_DELAY + 20], [0, 1], { extrapolateRight: "clamp" }),
}}>
  <CinematicCamera targetX={0.5} targetY={0.45} zoomTo={1.04}>
    {ATTACHED_IMAGES[0] && (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    )}
  </CinematicCamera>
</div>
```

---

## Brand Pill (Hook / CTA entry card)

White glass pill with logo, brand name, and animated light sweep:

```tsx
const PILL_DELAY = 20;
const pillSpring = spring({ frame: frame - PILL_DELAY, fps, config: { stiffness: 150, damping: 14 } });

<div style={{
  opacity: interpolate(frame, [PILL_DELAY, PILL_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }),
  transform: `translateY(${interpolate(pillSpring, [0, 1], [50, 0])}px) scale(${pillSpring})`,
}}>
  <div style={{
    position: "relative",
    display: "inline-flex", alignItems: "center", gap: 20,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 20px 60px rgba(100,116,139,0.25)",
    padding: "20px 48px", borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.6)",
    overflow: "hidden",
  }}>
    {/* Flash sweep */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
      transform: `translateX(${interpolate(frame, [PILL_DELAY, PILL_DELAY + 40], [-200, 200])}%) skewX(12deg)`,
      pointerEvents: "none",
    }} />
    {/* Brand icon */}
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary || BRAND.primary})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: 24, color: "white", flexShrink: 0, position: "relative", zIndex: 10,
    }}>
      {(BRAND.name || "B")[0].toUpperCase()}
    </div>
    {/* Text */}
    <div style={{ position: "relative", zIndex: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.primary, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
        Introducing
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "Inter, sans-serif" }}>
        {BRAND.name || "BrandName"}
      </div>
    </div>
  </div>
</div>
```

---

## PersistentSectionLabel (in scope)

Renders a persistent section label that stays visible for multiple scenes — use for chapter-like transitions:

```tsx
// Shows from startFrame, fades at exitFrame
<PersistentSectionLabel
  text="THE SOLUTION"
  brand={BRAND}
  startFrame={0}
  exitFrame={durationInFrames - 10}
/>
```

Rules: `position: absolute, top: 48, left: "14%"`, `zIndex: 20`. For centered scenes: `left: "50%", transform: "translateX(-50%)"`.

---

## Background Recipes for Text Scenes

Never use a flat color. Always choose one:

### Gradient Orbs (dark theme — default)
```tsx
{[
  { top: "-20%", left: "-10%", color: BRAND.primary, size: 600, opacity: 0.18 },
  { bottom: "-10%", right: "-5%", color: BRAND.secondary || "#3b82f6", size: 500, opacity: 0.15 },
].map((orb, i) => (
  <div key={i} style={{
    position: "absolute", ...orb,
    width: orb.size, height: orb.size, borderRadius: "50%",
    background: orb.color,
    filter: "blur(100px)", opacity: orb.opacity,
    transform: `translate(${Math.sin(frame * 0.02 + i) * 40}px, ${Math.cos(frame * 0.02 + i) * 30}px)`,
  }} />
))}
```

### ArcBg from Scope (light-arc lines)
```tsx
<ArcBg brand={BRAND} />
```

### Grid Background
```tsx
<div style={{
  position: "absolute", inset: 0,
  backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
  backgroundSize: "60px 60px",
  zIndex: 0,
}} />
```

---

## Accent Animations

### Underline Accent Draw
```tsx
const UNDERLINE_START = HEADLINE_DELAY + 18;
const underlineW = interpolate(frame, [UNDERLINE_START, UNDERLINE_START + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

<div style={{ height: 3, width: `${underlineW * 100}%`, background: BRAND.primary, borderRadius: 2, marginTop: 8, transformOrigin: "left center" }} />
```
Start after the last word of the headline lands: `UNDERLINE_START = HEADLINE_DELAY + 18`.

### Rotating Bold Word in Tagline
```tsx
const WORDS = ["Support", "Business", "Sales", "Growth"];
const INTERVAL = 40;
const wordIdx = Math.floor(frame / INTERVAL) % WORDS.length;
const swapP = spring({ frame: frame % INTERVAL, fps, config: { damping: 20, stiffness: 200 }, durationInFrames: 12 });

<span style={{ fontWeight: 800, color: BRAND.primary, display: "inline-block",
  transform: `translateY(${interpolate(swapP, [0, 1], [20, 0])}px)`,
  opacity: interpolate(swapP, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }) }}>
  {WORDS[wordIdx]}
</span>
```

### Flash Transition Overlay
```tsx
{/* White flash (scene entry) */}
<div style={{ position: "absolute", inset: 0, background: "white", opacity: interpolate(frame, [0, 10], [1, 0], { extrapolateRight: "clamp" }), zIndex: 9999, pointerEvents: "none" }} />
```

### Spinning Starburst Accent
```tsx
<div style={{ position: "absolute", top: "25%", right: "15%", opacity: 0.7, zIndex: 2 }}>
  <svg width="60" height="60" viewBox="0 0 40 40"
    style={{ transform: `rotate(${frame * 2}deg) scale(${spring({ frame: frame - 10, fps })})` }}>
    <path d="M20 0L23 17L40 20L23 23L20 40L17 23L0 20L17 17L20 0" fill={BRAND.primary} />
  </svg>
</div>
```

---

## Light / Dark Theme Colors

| Element | Dark theme | Light theme |
|---|---|---|
| **Headline** | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) — never pure `#000` |
| **Sub-line** | `#94a3b8` (Slate 400) | `#64748b` (Slate 500) |
| **Section label** | `BRAND.primary` | `BRAND.primary` |
| **BG** | `#0f172a` or gradient orbs | `#f8fafc` or arc lines |

---

## Short Scene Handling (< 90 frames)

For scenes 60–90 frames, compress timing: `LABEL_DELAY=4, HEADLINE_DELAY=12, SUBLINE_DELAY=24`. Skip sub-line if < 60 frames.

---

## Anti-Patterns
- **NEVER use `opacity` alone to reveal a headline** — always `overflow:hidden` + `translateY(100%→0%)`. Using `MaskedReveal` from scope is fine but apply it per-line, not to the whole block.
- **NEVER wrap a multi-line headline in a single `overflow:hidden`** — each line needs its own wrapper or the lower lines will be clipped
- **NEVER skip the section label** — even a 60-frame scene gets "INTRODUCING" or "RESULTS"
- **NEVER use `letterSpacing: 0` on headlines** — minimum -0.02em, preferred -0.04em
- **NEVER use `fontSize < 80px` for the primary headline** — that's body text
- **NEVER center-align text in showcase scenes** — left-align for split layouts
- **NEVER accent more than one word per headline** with brand color
- **NEVER use flat solid color background on text scenes** — use orbs, arcs, or grid
- **NEVER use word-rotation-pop stagger on full sentences** — only on 2–4 word punchlines; full sentences use MaskedReveal

## Quality Checklist
- [ ] Section label (13px, uppercase, 0.18em tracking, brand color) appears first at f:8
- [ ] Hero headline uses `MaskedReveal`, not opacity fade, at f:24
- [ ] Headline is 96–128px, `fontWeight: 900`, `letterSpacing: -0.04em`, `lineHeight: 1.0`
- [ ] Sub-line is 22–28px, `fontWeight: 400`, muted color, at f:42
- [ ] Only ONE word accented with brand color in headline
- [ ] Background uses orbs/arcs/grid — never flat color
- [ ] Entropy dust (18 particles defined OUTSIDE component, zIndex:1)
- [ ] Scene fades in over first 15 frames, out over last 10
- [ ] Showcase scenes use split layout (text left 40% / UI right 60%, `rotateY(-8deg)` tilt)
- [ ] Centered layout only for hook and CTA scenes
