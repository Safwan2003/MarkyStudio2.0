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
const buttonSpring  = spring({ frame: frame - BUTTON_START, fps, config: { damping: 12, stiffness: 150 } });
const buttonPulse   = Math.sin(frame / 15) * 0.03 * buttonSpring; // Subtle heartbeat
const BUTTON_COLOR  = "#6366f1";

<div style={{
  transform: `scale(${buttonSpring + buttonPulse})`,
  opacity: buttonSpring,
  marginTop: 20,
}}>
  <div style={{
    position: "relative",
    backgroundColor: BUTTON_COLOR,
    padding: "28px 80px",
    borderRadius: 24,
    boxShadow: `0 25px 60px ${BUTTON_COLOR}66, 0 0 0 1px rgba(255,255,255,0.1)`,
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
