---
title: Premium CTA Scene
impact: HIGH
impactDescription: creates a high-converting final scene with kinetic word-by-word headline, pulsing gradient CTA button, glassmorphism logo, and animated mesh orb background
tags: cta, call-to-action, kinetic-headline, button, logo, dark, mesh, orb, glassmorphism
---

## CTA Scene Structure

Three layers from back to front:
1. **Animated mesh orb background** — rotating radial gradients with blur
2. **Content**: logo pop → kinetic headline → subtitle → CTA button
3. **Floating glassmorphism ambient icons** (optional)

---

## Animated Mesh Orb Background

```tsx
const frame = useCurrentFrame();
const meshRotate = frame * 0.15;
const meshScale  = 1.2 + Math.sin(frame / 80) * 0.1;

const COLOR_PRIMARY   = "#6366f1"; // brand
const COLOR_SECONDARY = "#8b5cf6";
const COLOR_ACCENT    = "#ec4899";

<AbsoluteFill style={{ backgroundColor: "#020617", overflow: "hidden" }}>
  {/* Rotating radial gradient orbs */}
  <div style={{
    position: "absolute",
    top: "50%", left: "50%",
    width: "160%", height: "160%",
    transform: `translate(-50%, -50%) rotate(${meshRotate}deg) scale(${meshScale})`,
    background: `
      radial-gradient(circle at 30% 30%, ${COLOR_PRIMARY}44 0%, transparent 40%),
      radial-gradient(circle at 70% 70%, ${COLOR_SECONDARY}33 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, ${COLOR_ACCENT}22 0%, transparent 40%),
      radial-gradient(circle at 70% 30%, #06b6d422 0%, transparent 40%)
    `,
    filter: "blur(80px)",
    opacity: 0.7,
  }} />

  {/* Subtle grid lines */}
  <div style={{
    position: "absolute", inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1.5px, transparent 1.5px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1.5px, transparent 1.5px)
    `,
    backgroundSize: "60px 60px",
    opacity: 0.4,
    maskImage: "radial-gradient(circle at center, black 30%, transparent 90%)",
  }} />
</AbsoluteFill>
```

---

## Logo Section (Spring Pop + Slight Rotation)

```tsx
const LOGO_START = 5;
const logoSpring = spring({
  frame: frame - LOGO_START,
  fps,
  config: { damping: 10, stiffness: 120, mass: 0.8 },
});
const logoScale  = interpolate(logoSpring, [0, 1], [0, 1]);
const logoRotate = interpolate(logoSpring, [0, 1], [-15, 0]);

<div style={{
  display: "flex", alignItems: "center", gap: 20,
  transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
  opacity: logoSpring,
}}>
  {/* Logo icon */}
  <div style={{
    width: 72, height: 72, borderRadius: 20,
    background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 32, fontWeight: 900, color: "#0f172a",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
  }}>
    B
  </div>
  <span style={{
    fontSize: 36, fontWeight: 800, color: "#fff",
    letterSpacing: "-0.03em",
    textShadow: "0 10px 20px rgba(0,0,0,0.3)",
    fontFamily: "Inter, sans-serif",
  }}>
    BrandName
  </span>
</div>
```

---

## Kinetic Word-by-Word Headline

Each word springs in independently with a slight rotation snap for maximum energy:

```tsx
const TEXT_START = 20;
const HEADLINE   = "Ready to grow your business?";
const words      = HEADLINE.split(" ");

<div style={{
  display: "flex", flexWrap: "wrap",
  justifyContent: "center", gap: "0 20px",
  maxWidth: 1000,
}}>
  {words.map((word, i) => {
    const wordSpring = spring({
      frame: frame - (TEXT_START + i * 3),
      fps,
      config: { damping: 12, stiffness: 150, mass: 0.8 },
    });
    return (
      <div key={i} style={{ overflow: "hidden", paddingBottom: 10 }}>
        <h1 style={{
          fontSize: 96, fontWeight: 900, color: "#fff",
          margin: 0, lineHeight: 1,
          fontFamily: "Inter, sans-serif",
          transform: `translateY(${(1 - wordSpring) * 100}%) rotate(${(1 - wordSpring) * 5}deg)`,
          opacity: wordSpring,
          textShadow: "0 20px 50px rgba(0,0,0,0.5)",
          letterSpacing: "-0.02em",
        }}>
          {word}
        </h1>
      </div>
    );
  })}
</div>
```

**Key**: Wrap each word's `overflow: "hidden"` so the word slides up into view like a reveal wipe.

---

## Subtitle Fade-Up

```tsx
<p style={{
  fontSize: 24, fontWeight: 500, color: "#94a3b8",
  maxWidth: 700, textAlign: "center",
  margin: 0, lineHeight: 1.6,
  fontFamily: "Inter, sans-serif",
  opacity: spring({ frame: frame - (TEXT_START + 15), fps }),
  transform: `translateY(${interpolate(
    spring({ frame: frame - (TEXT_START + 15), fps }), [0, 1], [20, 0]
  )}px)`,
}}>
  Join thousands of teams building the future with our platform.
</p>
```

---

## Pulsing CTA Button with Shine Sweep

```tsx
const BUTTON_START  = 45;
const buttonSpring  = spring({ frame: frame - BUTTON_START, fps, config: { damping: 14, stiffness: 160 } }); // Snappy entrance
const buttonPulse   = interpolate(Math.sin((frame - 60) * 0.05), [-1, 1], [1, 1.03]); // Gentle heartbeat in hold phase
const BUTTON_COLOR  = "#6366f1";

<div style={{
  transform: `scale(${buttonSpring * buttonPulse})`,
  opacity: buttonSpring,
  marginTop: 20,
}}>
  <div style={{
    position: "relative",
    backgroundColor: BUTTON_COLOR,
    padding: "28px 80px",
    borderRadius: 24,
    boxShadow: `0 20px 40px -10px ${BUTTON_COLOR}80, 0 0 0 1px rgba(255,255,255,0.2) inset`,
    overflow: "hidden",
  }}>
    {/* Button label */}
    <span style={{
      color: "#fff", fontSize: 28, fontWeight: 800,
      letterSpacing: "0.02em",
      position: "relative", zIndex: 10,
      textShadow: "0 2px 4px rgba(0,0,0,0.2)",
      fontFamily: "Inter, sans-serif",
    }}>
      Get Started Free
    </span>

    {/* Looping glass shine sweep */}
    <div style={{
      position: "absolute", top: 0, left: 0,
      width: "200%", height: "100%",
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
      transform: `translateX(${interpolate(frame % 120, [0, 120], [-100, 100])}%) skewX(-30deg)`,
      zIndex: 5,
    }} />

    {/* Inner bevel */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
      borderRadius: 24, zIndex: 6,
    }} />
  </div>
</div>
```

---

## Floating Ambient Icons (Optional)

Dark glassmorphism "squircles" floating around the center content:

```tsx
const AMBIENT_ICONS = [
  { emoji: "❤️",  dx: -width * 0.25, dy: -height * 0.20, delay: 0,  size: 65 },
  { emoji: "✅",  dx:  width * 0.28, dy: -height * 0.15, delay: 15, size: 55 },
  { emoji: "📊",  dx: -width * 0.22, dy:  height * 0.25, delay: 30, size: 75 },
  { emoji: "🚀",  dx:  width * 0.24, dy:  height * 0.20, delay: 10, size: 70 },
];

{AMBIENT_ICONS.map((icon, i) => {
  const iconSpring = spring({ frame: frame - (30 + icon.delay), fps, config: { damping: 15, stiffness: 100 } });
  const floatY = Math.sin((frame + i * 40) / 45) * 20;
  const floatX = Math.cos((frame + i * 30) / 60) * 15;
  const rotate = Math.sin((frame + i * 20) / 50) * 12;

  return (
    <div key={i} style={{
      position: "absolute",
      left: "50%", top: "50%",
      transform: `
        translate(-50%, -50%)
        translate(${icon.dx + floatX}px, ${icon.dy + floatY}px)
        scale(${iconSpring})
        rotate(${rotate}deg)
      `,
      opacity: iconSpring * 0.8,
      zIndex: 20,
    }}>
      <div style={{
        width: icon.size * 1.8, height: icon.size * 1.8,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(12px)",
        borderRadius: "35%", // Squircle
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        fontSize: icon.size * 0.55,
      }}>
        {icon.emoji}
      </div>
    </div>
  );
})}
```

**Note:** `dx`/`dy` are pixel offsets from center `(50%, 50%)`, not fractions. Negative = left/up.

---

## Minimal Light CTA Variant (Clean / Logo-Centered)

For light-themed brands — no dark mesh orbs, no glassmorphism. Just a crisp centered layout on a dot-matrix or plain white background. The tagline has one rotating bold word that swaps between brand benefit terms. Used in JustCall, Linear, Notion-style CTAs.

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const MinimalCTA = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo entrance
  const logoProgress = spring({ frame, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: 22 });
  const logoScale    = interpolate(logoProgress, [0, 1], [0.7, 1]);
  const logoOpacity  = interpolate(logoProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Tagline entrance
  const TAGLINE_DELAY = 20;
  const tagProgress   = spring({ frame: frame - TAGLINE_DELAY, fps, config: { damping: 20, stiffness: 140 }, durationInFrames: 20 });
  const tagY          = interpolate(tagProgress, [0, 1], [18, 0]);
  const tagOpacity    = interpolate(tagProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Rotating bold word in tagline
  const ROTATING_WORDS = ["Support", "Business", "Sales"];
  const SWAP_INTERVAL  = 45;
  const wordIndex      = Math.floor(frame / SWAP_INTERVAL) % ROTATING_WORDS.length;
  const swapProgress   = spring({
    frame: frame % SWAP_INTERVAL,
    fps,
    config: { damping: 22, stiffness: 220 },
    durationInFrames: 10,
  });

  // Button entrance
  const BTN_DELAY   = 36;
  const btnProgress = spring({ frame: frame - BTN_DELAY, fps, config: { damping: 20, stiffness: 130 }, durationInFrames: 18 });
  const btnScale    = interpolate(btnProgress, [0, 1], [0.8, 1]);
  const btnOpacity  = interpolate(btnProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Button pulse (very subtle)
  const btnPulse = 1 + Math.sin(frame / 18) * 0.012;

  const ICON_SIZE = 48;

  return (
    <AbsoluteFill style={{
      background: "#f0f2f5",
      backgroundImage: "radial-gradient(circle, rgba(30,40,70,0.15) 1px, transparent 1px)",
      backgroundSize: "22px 22px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        textAlign: "center",
      }}>
        {/* Logo lockup */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          transformOrigin: "center center",
        }}>
          {/* Brand icon */}
          <div style={{
            width: ICON_SIZE, height: ICON_SIZE,
            borderRadius: "30%",
            background: BRAND.primary || "#2dd4bf",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: ICON_SIZE * 0.45, height: ICON_SIZE * 0.45,
              borderRadius: "50% 50% 50% 0",
              background: "rgba(0,0,0,0.25)",
              transform: "rotate(-45deg)",
            }} />
          </div>
          {/* Brand name */}
          <span style={{
            fontSize: ICON_SIZE * 0.8,
            fontWeight: 800,
            color: "#1e2846",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}>
            {BRAND.name || "Brand"}
          </span>
        </div>

        {/* Rotating tagline */}
        <div style={{
          display: "flex", gap: 10, alignItems: "baseline",
          fontSize: 32,
          fontWeight: 500,
          color: "#1e2846",
          fontFamily: "Inter, sans-serif",
          transform: `translateY(${tagY}px)`,
          opacity: tagOpacity,
        }}>
          <span style={{ opacity: 0.7 }}>Your unfair</span>
          <span style={{
            fontWeight: 800,
            color: BRAND.primary || "#2dd4bf",
            transform: `translateY(${interpolate(swapProgress, [0, 1], [14, 0])}px)`,
            opacity: interpolate(swapProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
            display: "inline-block",
          }}>
            {ROTATING_WORDS[wordIndex]}
          </span>
          <span style={{ opacity: 0.7 }}>advantage</span>
        </div>

        {/* CTA Button — dark navy pill */}
        <div style={{
          transform: `scale(${btnScale * btnPulse})`,
          opacity: btnOpacity,
          transformOrigin: "center center",
        }}>
          <div style={{
            background: "#1e2846",
            color: "white",
            borderRadius: 9999,
            padding: "16px 40px",
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.01em",
            boxShadow: "0 8px 24px rgba(30,40,70,0.28)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}>
            {BRAND.cta || "Try it now!"}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Key differences from the dark CTA variant:**
- Light dot-matrix background (no dark mesh orbs)
- Brand icon is small and centered above wordmark (not a full pill card)
- Tagline has rotating bold word that swaps between benefit terms
- CTA button is a dark navy pill (not gradient) — clean, minimal
- No glassmorphism, no ambient icon squircles

---

## Simple Logo + Wide Button + URL Variant (Pretaa / Clean Light CTA)

For light-themed brands that need an ultra-clean finale: just the wordmark centered, a wide rounded brand-colored button, and a small URL below. No tagline, no rotating words, no ambient icons. Maximum whitespace.

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const SimpleLogoCTA = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo entrance
  const logoSpring = spring({ frame, fps, config: { damping: 16, stiffness: 130 } });
  const logoScale  = interpolate(logoSpring, [0, 1], [0.8, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Button entrance
  const BTN_DELAY = 22;
  const btnSpring = spring({ frame: frame - BTN_DELAY, fps, config: { damping: 18, stiffness: 140 } });
  const btnScale  = interpolate(btnSpring, [0, 1], [0.85, 1]);
  const btnOpacity = interpolate(btnSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // URL text
  const URL_DELAY = 36;
  const urlOpacity = interpolate(frame, [URL_DELAY, URL_DELAY + 15], [0, 1], { extrapolateRight: "clamp" });

  // Subtle button pulse
  const btnPulse = 1 + Math.sin(frame / 20) * 0.01;

  const BRAND_PRIMARY = BRAND.primary || "#6366f1";
  const BRAND_NAME    = BRAND.name    || "BrandName";
  const BRAND_URL     = BRAND.url     || "yourbrand.com";
  const BRAND_CTA     = BRAND.cta     || "Get Started Free";

  return (
    <AbsoluteFill style={{ backgroundColor: "#f0f2f6" }}>
      {/* Corner gradient blobs */}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "65%", height: "70%",
        background: "radial-gradient(circle at 0% 100%, rgba(99,102,241,0.18) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, width: "60%", height: "65%",
        background: "radial-gradient(circle at 100% 0%, rgba(248,113,113,0.14) 0%, transparent 58%)" }} />

      {/* Center content column */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 36,
        textAlign: "center",
      }}>
        {/* Wordmark lockup */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          transformOrigin: "center center",
        }}>
          {/* Brand icon mark */}
          <div style={{
            width: 64, height: 64,
            borderRadius: "30%",
            backgroundColor: BRAND_PRIMARY,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 12px 30px ${BRAND_PRIMARY}44`,
          }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: "50% 50% 50% 0",
              backgroundColor: "rgba(255,255,255,0.9)",
              transform: "rotate(-45deg)",
            }} />
          </div>
          {/* Brand name */}
          <span style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#0f172a",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}>
            {BRAND_NAME}
          </span>
        </div>

        {/* Wide rounded CTA button */}
        <div style={{
          transform: `scale(${btnScale * btnPulse})`,
          opacity: btnOpacity,
          transformOrigin: "center center",
        }}>
          <div style={{
            backgroundColor: BRAND_PRIMARY,
            color: "white",
            borderRadius: 9999,
            padding: "22px 80px",
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.01em",
            boxShadow: `0 20px 50px ${BRAND_PRIMARY}55, 0 6px 16px ${BRAND_PRIMARY}33`,
            position: "relative",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}>
            {/* Looping shine sweep */}
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: "200%", height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
              transform: `translateX(${interpolate(frame % 100, [0, 100], [-100, 100])}%) skewX(-30deg)`,
              zIndex: 1,
            }} />
            <span style={{ position: "relative", zIndex: 2 }}>{BRAND_CTA}</span>
          </div>
        </div>

        {/* URL text — types in character by character */}
        <div style={{
          opacity: urlOpacity,
          fontSize: 18,
          color: "#64748b",
          fontWeight: 500,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.01em",
          // monospace-style tracking so characters don't shift as they appear
          fontVariantNumeric: "tabular-nums",
        }}>
          {/* Typewriter: reveal one character every 2 frames after URL_DELAY */}
          {BRAND_URL.slice(0, Math.floor(Math.max(0, frame - URL_DELAY) / 2))}
          {/* Blinking cursor while typing */}
          {frame - URL_DELAY < BRAND_URL.length * 2 && (
            <span style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0 }}>|</span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Key differences from both other variants:**
- Corner gradient blobs (from `premium-multi-corner-gradient`) instead of dot-matrix or dark mesh
- Wordmark-only (no tagline, no rotating words)
- Wide full-rounded button with brand primary color + shine sweep
- URL line at the bottom — the only "text below button"
- Gap between elements is generous (36px) — breathable, premium whitespace
- Use `BRAND.url` for the URL text field (fallback to `"yourbrand.com"`)

---

## Settle Zoom Wrapper (CTA Finality Rule)

CTA scenes must feel like the video is **landing**, not advancing. The correct camera move is zoom **OUT** — the scene starts slightly zoomed in and settles back to 1.0.

```tsx
// RULE: CTA scenes zoom OUT (1.05 → 1.0). Never zoom in. Zooming in creates tension.
const settleScale = interpolate(frame, [0, 90], [1.05, 1.0], { extrapolateRight: "clamp" });

// Wrap the ENTIRE scene content in this:
<div style={{
  position: "absolute", inset: 0,
  transform: `scale(${settleScale})`,
  transformOrigin: "center center",
}}>
  {/* All scene content here */}
</div>
```

**Why zoom out:**
- Hook scenes build tension with zoom-in
- CTA scenes resolve that tension — the zoom-out says "we've arrived"
- `1.05→1.0` over 90 frames = ~3 seconds, matches the time for button + text to fully appear

**Headline spring for CTA (heavy, authoritative):**
```tsx
config: { damping: 22, stiffness: 100 }  // Heavier than hook (damping:12). Slower, weighty landing.
```

---

## Anti-Patterns

- **NEVER zoom IN on a CTA scene.** Zoom-in = tension. CTA = resolution. Use `settleScale: 1.05→1.0` instead.
- **NEVER use `Math.sin(frame / 15) * 0.03`** for button pulse — this creates micro-jitter that reads as unstable. Use `Math.sin((frame - 60) * 0.05)` mapped via `interpolate` to `[1, 1.03]` for a slow, breathing pulse that starts AFTER the entrance spring settles (~frame 60).
- **NEVER skip the `inset` box-shadow on the button.** The `0 0 0 1px rgba(255,255,255,0.2) inset` adds an inner highlight that lifts the button off the background — without it, buttons look flat.
- **NEVER show the URL line static** — use typewriter reveal (1 char per 2 frames) for a "live" feel.

---

## AGENCY UPGRADE MANDATES (added 2026-03)

**Elastic button entrance (MANDATORY)**
Use `{ damping: 8, stiffness: 200 }` for the button entrance — elastic bounce gives CTA physical weight and urgency. This is different from headline config (which uses damping:22 for authority).

**Background NEVER plain color**
CTA backgrounds MUST have motion:
- Dark brands: 18 entropy dust particles (ENTROPY_DUST_PARTICLES from scope) + drifting mesh gradient blobs
- Light brands: LightArcBg component or corner gradient blobs (premium-multi-corner-gradient)

**useVitality button pulse (replaces Math.sin pulse)**
```tsx
const vButton = useVitality("breathe", 0);
// Apply: scale: 1 + vButton * 0.015
```

---

## Quality Checklist

- [ ] Scene wrapped in `settleScale: interpolate(frame, [0,90], [1.05, 1.0])` zoom-out
- [ ] Headline spring uses `{ damping: 22, stiffness: 100 }` (authoritative, not bouncy)
- [ ] **Button spring uses `{ damping: 8, stiffness: 200 }` (elastic bounce entrance)**
- [ ] **Button hold-phase pulse uses `useVitality("breathe", 0)`** (not raw Math.sin)
- [ ] Button boxShadow includes `inset` highlight: `0 0 0 1px rgba(255,255,255,0.2) inset`
- [ ] Shine sweep loops via `frame % 100` (not one-shot)
- [ ] Logo spring includes slight rotation (`rotate(${(1-logoSpring)*-15}deg)`) for character
- [ ] **Background has motion** — entropy dust + gradient (never plain flat color)
- [ ] URL uses typewriter reveal (1 char per 2–3 frames) if BRAND.url is available
