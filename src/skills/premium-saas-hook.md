---
title: Premium SaaS Hook / Brand Intro
impact: HIGH
impactDescription: creates cinematic product intros with floating brand icons, device mockups, and chat overlays
tags: saas, intro, hook, floating-icons, brand, laptop, mockup, chat-bubbles, stagger
---

## Premium SaaS Intro Pattern

The highest-impact SaaS intro uses a **hero device mockup** (laptop or phone) as the anchor, with **floating brand/integration icons** orbiting it — each popping in with a spring entrance and a sinusoidal float loop. Optionally overlay chat bubbles for social proof.

### Core Structure

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// All timing constants INSIDE the component
const ICON_SPRING = { stiffness: 100, damping: 15 };
const CHAT_SPRING = { stiffness: 120, damping: 14 };
```

---

## Floating Icon Pattern

Each icon has a `delay` (frames before it appears), a `size` (px), and a fractional `x`/`y` position (0–1 mapped to width/height).

```tsx
const FLOATING_ICONS = [
  { emoji: "✉️",  x: 0.15, y: 0.25, delay: 10,  size: 80 },
  { emoji: "💬",  x: 0.18, y: 0.55, delay: 15,  size: 65 },
  { emoji: "📊",  x: 0.32, y: 0.40, delay: 20,  size: 50 },
  { emoji: "⚡",  x: 0.78, y: 0.28, delay: 35,  size: 55 },
  { emoji: "🔔",  x: 0.63, y: 0.60, delay: 55,  size: 45 },
];

{FLOATING_ICONS.map((item, i) => {
  if (frame < item.delay) return null;

  const progress = spring({
    frame: frame - item.delay,
    fps,
    config: ICON_SPRING,
  });

  const scale   = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Sinusoidal float loop — each icon moves independently
  const floatY = Math.sin((frame - item.delay) / 30) * 10;
  const floatX = Math.cos((frame - item.delay) / 40) * 5;

  return (
    <div
      key={i}
      style={{
        position: "absolute",
        left: item.x * width,
        top:  item.y * height,
        transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
        opacity,
        zIndex: 10 + i,
      }}
    >
      <div style={{
        width: item.size, height: item.size,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: item.size * 0.45,
      }}>
        {item.emoji}
      </div>
    </div>
  );
})}
```

**Key rules:**
- Use `frame - item.delay` so each icon animates from its own zero-point
- Guard with `if (frame < item.delay) return null` to prevent negative-frame springs
- Float amplitude: `±10px` vertical, `±5px` horizontal — subtle, not distracting
- Stagger delays in increments of 5–10 frames for a cascading reveal effect

---

## Browser / Laptop Screen Inset

The hero device is a background image. The screen content sits inside an absolutely-positioned inset fitted to the laptop bezel:

```tsx
{/* Screen inset — adjust percentages to match your device image */}
<div style={{
  position: "absolute",
  top: "34.5%", left: "34.5%",
  width: "27.5%", height: "30%",
  borderRadius: 5,
  overflow: "hidden",
  backgroundColor: "#ffffff",
  boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
}}>
  {/* Mini UI: navbar + hero headline + CTA */}
  <div style={{ width: "100%", height: "100%", padding: "6% 8%", fontFamily: "Inter, sans-serif" }}>
    {/* Navbar */}
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8%" }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "#0f172a" }}>Brand</span>
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ fontSize: 6, color: "#64748b" }}>Features</span>
        <div style={{ padding: "3px 8px", background: "#4f46e5", borderRadius: 3, color: "white", fontSize: 6, fontWeight: 600 }}>Sign Up</div>
      </div>
    </div>
    {/* Hero headline */}
    <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8, letterSpacing: "-0.02em" }}>
      Your product headline here
    </h1>
    <p style={{ fontSize: 6, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>
      Supporting tagline or description text.
    </p>
    {/* CTA Button */}
    <div style={{ padding: "5px 12px", background: "#4f46e5", borderRadius: 4, color: "white", fontSize: 7, fontWeight: 600, width: "fit-content" }}>
      Get Started
    </div>
  </div>

  {/* Glare overlay for realism */}
  <div style={{
    position: "absolute", inset: 0,
    background: "linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 60%)",
    pointerEvents: "none",
  }} />
</div>
```

---

## Floating Chat Bubble Pattern

Chat bubbles reinforce the "real product in use" feeling. Keep them at 2–3 max:

```tsx
const CHAT_MESSAGES = [
  { text: "Can you update the header image?", x: 0.26, y: 0.70, delay: 60, variant: "received" },
  { text: "Sure — done in 30 seconds ✓",     x: 0.70, y: 0.40, delay: 70, variant: "sent"     },
];

{CHAT_MESSAGES.map((msg, i) => {
  if (frame < msg.delay) return null;

  const progress = spring({ frame: frame - msg.delay, fps, config: CHAT_SPRING });
  const scale    = interpolate(progress, [0, 1], [0.8, 1]);
  const opacity  = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const floatY   = Math.sin((frame - msg.delay) / 35) * 8;

  const isSent = msg.variant === "sent";
  const bg     = isSent ? "#0084ff" : "#dcf8c6";
  const color  = isSent ? "#fff"    : "#000";

  return (
    <div key={i} style={{
      position: "absolute",
      left: msg.x * width, top: msg.y * height,
      transform: `translate(-50%, -50%) translateY(${floatY}px) scale(${scale})`,
      opacity, zIndex: 20 + i,
    }}>
      <div style={{
        background: bg, color,
        padding: "12px 16px", borderRadius: 12,
        fontSize: 22, fontWeight: 500, lineHeight: 1.4,
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
        maxWidth: 700, whiteSpace: "pre-line",
        fontFamily: "Inter, sans-serif",
      }}>
        {msg.text}
      </div>
    </div>
  );
})}
```

---

## Dark Hero Background

For premium look, use a solid dark or gradient background with a slight noise/grain feel:

```tsx
<AbsoluteFill style={{
  background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
}} />
```

Or use radial orbs:

```tsx
{/* Mesh orb top-left */}
<div style={{
  position: "absolute", top: "-20%", left: "-10%",
  width: 800, height: 800,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
  filter: "blur(60px)",
}} />
{/* Mesh orb bottom-right */}
<div style={{
  position: "absolute", bottom: "-20%", right: "-10%",
  width: 700, height: 700,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)",
  filter: "blur(80px)",
}} />
```
