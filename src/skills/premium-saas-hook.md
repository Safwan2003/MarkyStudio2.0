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

---

## Real Photo Background Variant (Photorealistic Office)

When `ATTACHED_IMAGES` contains a real-world photo (office, desk, person), use it as the full background and composite the product screen on top. This is the exact pattern used by Fronter — real bokeh office photo + laptop with product UI + floating app icons.

```tsx
// Use ATTACHED_IMAGES[backgroundIndex] as the room photo
// Use ATTACHED_IMAGES[screenshotIndex] inside the laptop screen inset
<AbsoluteFill style={{ background: "#111" }}>
  {/* Full-frame office/environment photo */}
  {ATTACHED_IMAGES[0] && (
    <img
      src={ATTACHED_IMAGES[0]}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
    />
  )}
  {/* Slight dark vignette overlay for polish */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
  }} />
  {/* Laptop screen inset — positioned over the laptop in the photo */}
  {/* Adjust percentages to align with the physical screen in the photo */}
  <div style={{
    position: "absolute",
    top: "22%", left: "30%",
    width: "40%", height: "34%",
    borderRadius: 4,
    overflow: "hidden",
  }}>
    {ATTACHED_IMAGES[1] ? (
      <img src={ATTACHED_IMAGES[1]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "white", padding: "8% 10%", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Your product headline</div>
        <div style={{ width: "60%", height: 6, background: "#f1f5f9", borderRadius: 3 }} />
      </div>
    )}
  </div>
  {/* Float app icons OVER the photo */}
  {/* ... FLOATING_ICONS map (see above) ... */}
</AbsoluteFill>
```

**Key rules for photo backgrounds:**
- Always add the vignette overlay — it separates floating elements from the background and grounds them
- Laptop screen inset percentages depend on the specific photo — adjust `top/left/width/height` to align with the physical screen
- Icons should float at similar depth to the laptop, not too far in front (keep `boxShadow` subtle)

---

## PNG Logo Circle Variant (App Integration Icons)

Use PNG images as icon content inside the circles instead of emoji — this is the production-quality look seen in real explainer videos (WhatsApp green logo, Skype blue logo, etc.).

```tsx
// When using real app logos from ATTACHED_IMAGES or public URLs
const INTEGRATION_ICONS = [
  { src: "https://logo.clearbit.com/whatsapp.com",  bg: "#25d366", x: 0.14, y: 0.68, delay: 8,  size: 80 },
  { src: "https://logo.clearbit.com/skype.com",     bg: "#0078d4", x: 0.50, y: 0.18, delay: 14, size: 70 },
  { src: "https://logo.clearbit.com/dropbox.com",   bg: "#0061ff", x: 0.84, y: 0.25, delay: 20, size: 72 },
  { src: "https://logo.clearbit.com/gmail.com",     bg: "#ea4335", x: 0.20, y: 0.28, delay: 26, size: 68 },
  { src: "https://logo.clearbit.com/drive.google.com", bg: "#fbbc04", x: 0.78, y: 0.70, delay: 32, size: 66 },
  { src: "https://logo.clearbit.com/slack.com",     bg: "#4a154b", x: 0.62, y: 0.78, delay: 38, size: 62 },
];

{INTEGRATION_ICONS.map((icon, i) => {
  if (frame < icon.delay) return null;
  const progress = spring({ frame: frame - icon.delay, fps, config: { stiffness: 110, damping: 14 } });
  const scale   = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  const floatY  = Math.sin((frame - icon.delay) / 28 + i * 1.2) * 9;
  const floatX  = Math.cos((frame - icon.delay) / 38 + i * 0.9) * 5;

  return (
    <div key={i} style={{
      position: "absolute",
      left: icon.x * width,
      top:  icon.y * height,
      transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
      opacity,
      zIndex: 10 + i,
    }}>
      <div style={{
        width: icon.size, height: icon.size,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 8px 28px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <img
          src={icon.src}
          style={{ width: "65%", height: "65%", objectFit: "contain" }}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
})}
```

**Note:** If logo URLs are unavailable, fall back to a colored circle with the first letter of the app name — same visual weight, no broken image.

---

## Integration Cluster Variant (Corner Group)

Instead of spreading icons across the frame, group them as a tight cluster in one corner. Used in social-proof scenes where the focus is the product screenshot on the device, not the icons themselves (Fronter social_proof1–2 style).

```tsx
// Cluster spawns from a single corner — icons fan out in a tight arc
const CLUSTER_CENTER = { x: 0.80, y: 0.75 }; // bottom-right corner
const CLUSTER_ICONS = [
  { angle: -60, radius: 0.10, delay: 0  },
  { angle: -30, radius: 0.09, delay: 6  },
  { angle:   0, radius: 0.11, delay: 12 },
  { angle:  30, radius: 0.08, delay: 18 },
  { angle:  60, radius: 0.10, delay: 24 },
  { angle:  90, radius: 0.09, delay: 30 },
];

{CLUSTER_ICONS.map((item, i) => {
  if (frame < item.delay) return null;
  const progress = spring({ frame: frame - item.delay, fps, config: { stiffness: 130, damping: 16 } });
  const scale    = interpolate(progress, [0, 1], [0, 1]);
  const opacity  = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  const radians = (item.angle * Math.PI) / 180;
  const iconX = (CLUSTER_CENTER.x + Math.cos(radians) * item.radius) * width;
  const iconY = (CLUSTER_CENTER.y + Math.sin(radians) * item.radius) * height;

  // Subtle continuous bob
  const floatY = Math.sin((frame - item.delay) / 32 + i) * 6;

  return (
    <div key={i} style={{
      position: "absolute",
      left: iconX, top: iconY,
      transform: `translate(-50%, -50%) translateY(${floatY}px) scale(${scale})`,
      opacity,
      zIndex: 20 + i,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "white",
        boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26,
      }}>
        {["🔵", "🟢", "🟡", "🔴", "🟣", "🟠"][i]}
      </div>
    </div>
  );
})}
```

---

## UPDATED STANDARDS (WhatAStory Gap Analysis 2026-03-18)

### Cluster & Anchor Composition (PRIMARY PATTERN)

Reference videos (Screenjar, Viable) use icons as **satellites** framing the product — not scattered randomly. The product device is the ANCHOR; icons orbit it at varying depths with blur to create a 3D field.

```tsx
// ANCHOR: product/device centered or slightly right of center
// SATELLITES: clustered around anchor, varying depth via blur

// OUTSIDE component — stable
const SATELLITES = [
  // { angle°, radius (0-1 of shorter dimension), size px, blur px, delay frames }
  { angle: -55, radius: 0.30, size: 88,  blur: 0,  delay: 8  },  // sharp midground
  { angle: -15, radius: 0.42, size: 110, blur: 5,  delay: 14 },  // slightly OOF foreground
  { angle:  40, radius: 0.28, size: 64,  blur: 0,  delay: 20 },  // sharp background
  { angle: 130, radius: 0.38, size: 96,  blur: 3,  delay: 28 },  // near-OOF
  { angle: 175, radius: 0.35, size: 72,  blur: 0,  delay: 36 },  // sharp
  { angle: 220, radius: 0.44, size: 118, blur: 7,  delay: 44 },  // OOF foreground (largest = closest)
];

const ANCHOR_X = width  * 0.54;  // product anchor — slightly right of center
const ANCHOR_Y = height * 0.50;

{SATELLITES.map((sat, i) => {
  if (frame < sat.delay) return null;
  const progress = spring({
    frame: frame - sat.delay, fps,
    config: { stiffness: 110, damping: 14 },
  });
  const scale   = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const rad     = (sat.angle * Math.PI) / 180;
  const minDim  = Math.min(width, height);
  const iconX   = ANCHOR_X + Math.cos(rad) * sat.radius * minDim;
  const iconY   = ANCHOR_Y + Math.sin(rad) * sat.radius * minDim;
  // Slow orbital drift (each satellite moves independently)
  const drift   = Math.sin((frame - sat.delay) / 38 + i * 0.9) * 8;
  const driftX  = Math.cos((frame - sat.delay) / 44 + i * 1.1) * 5;

  return (
    <div key={i} style={{
      position: "absolute",
      left: iconX, top: iconY,
      transform: `translate(-50%, -50%) translate(${driftX}px, ${drift}px) scale(${scale})`,
      opacity,
      filter: sat.blur > 0 ? `blur(${sat.blur}px)` : undefined,
      zIndex: sat.blur > 0 ? 8 : 12,  // blurred = background depth
    }}>
      <div style={{
        width: sat.size, height: sat.size,
        borderRadius: "50%",
        background: "white",
        boxShadow: `0 ${sat.size * 0.12}px ${sat.size * 0.36}px rgba(0,0,0,${0.18 + sat.blur * 0.02})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: sat.size * 0.42,
      }}>
        {["✉️","💬","📊","⚡","🔔","🔗"][i]}
      </div>
    </div>
  );
})}
```

**Key rules:**
- Larger icons with higher blur = closer to viewer (foreground). Smaller + sharp = farther (background).
- `zIndex` separates depth: `blur > 0` icons get z:8 (behind product), sharp icons get z:12 (in front)
- Angular spread: distribute across 200–240° arc — NOT 360° (leave one side clear for brand text)
- Do NOT use uniform size — vary between 60–120px to create natural depth

### Anti-Patterns

- **NEVER** scatter icons at regular grid positions — cluster them around the anchor
- **NEVER** use same size for all icons — size variation = depth illusion
- **NEVER** skip blur on "foreground" icons — blur signals proximity, sharpness signals distance

---

## UPDATED STANDARDS v2 (WhatAStory Gap Analysis Round 2 — 2026-03-18)

### Orbital Groups Pattern (replaces single-cluster)

Premium videos (Screenjar, Viable) use TWO distinct orbital groups — integration icons cluster near top-left, user avatars cluster near bottom-right. Each group has its own anchor point. Icons within a group share a small radius, creating a tight "family."

```tsx
// OUTSIDE component — stable reference
const ORBITAL_GROUPS = [
  {
    // Group 1: Integration/product icons — top-left quadrant
    anchor: { x: 0.18, y: 0.32 },
    icons: [
      { emoji: "📊", size: 72, delay: 6  },
      { emoji: "⚡", size: 56, delay: 14 },
      { emoji: "✉️", size: 64, delay: 22 },
    ],
    radius: 42,  // px — tight cluster
    stagger: 0,
  },
  {
    // Group 2: User avatars / outcomes — bottom-right quadrant
    anchor: { x: 0.80, y: 0.68 },
    icons: [
      { emoji: "💬", size: 68, delay: 18 },
      { emoji: "🔔", size: 52, delay: 26 },
      { emoji: "🔗", size: 60, delay: 34 },
    ],
    radius: 36,  // px — even tighter
    stagger: 15,
  },
];

{ORBITAL_GROUPS.map((group, gi) =>
  group.icons.map((icon, i) => {
    const totalDelay = group.stagger + icon.delay;
    if (frame < totalDelay) return null;

    const progress = spring({
      frame: frame - totalDelay, fps,
      config: { stiffness: 110, damping: 14 },
    });
    const scale   = interpolate(progress, [0, 1], [0, 1]);
    const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

    // Fan icons around group anchor — spread evenly within group
    const angle   = (i / group.icons.length) * 2 * Math.PI + (gi * Math.PI * 0.7);
    const iconX   = group.anchor.x * width  + Math.cos(angle) * group.radius;
    const iconY   = group.anchor.y * height + Math.sin(angle) * group.radius;

    // VARYING FLOAT FREQUENCIES — eliminates mechanical synchrony
    // Each icon has slightly different period: 30, 32, 34, 36... frames
    const floatY = Math.sin((frame - totalDelay) / (30 + i * 2)) * (9 + i * 1.5);
    const floatX = Math.cos((frame - totalDelay) / (40 + i * 3)) * 5;

    return (
      <div key={`${gi}-${i}`} style={{
        position: "absolute",
        left: iconX, top: iconY,
        transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
        opacity,
        zIndex: 12,
      }}>
        <div style={{
          width: icon.size, height: icon.size,
          borderRadius: "50%",
          background: "white",
          boxShadow: GLOBAL_STYLE.shadowMedium,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: icon.size * 0.44,
        }}>
          {icon.emoji}
        </div>
      </div>
    );
  })
)}
```

**Key rules:**
- Two groups max — more than two feels scattered
- Group 1 anchors top-left area (0.1–0.3 x, 0.2–0.4 y)
- Group 2 anchors bottom-right area (0.7–0.9 x, 0.6–0.8 y)
- Product/device sits in the center, the groups frame it
- `(30 + i * 2)` float period formula ensures no two icons bob in sync

---

## Hook Scene Template (Complete Integration)

Full hook scene with continuous zoom, 3-layer text stack, and orbital satellites:

```tsx
export const HookScene = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Continuous cinematic slow zoom (whole scene breathes)
  const cameraZoom = interpolate(frame, [0, 150], [1.0, 1.06], { extrapolateRight: "clamp" });

  // Text stack springs (centered)
  const LABEL_DELAY    = 5;
  const HEADLINE_DELAY = 12;
  const SUBLINE_DELAY  = 22;
  const labelS    = spring({ frame: frame - LABEL_DELAY,    fps, config: { stiffness: 140, damping: 16 } });
  const headlineS = spring({ frame: frame - HEADLINE_DELAY, fps, config: { stiffness: 120, damping: 18 } });
  const sublineS  = spring({ frame: frame - SUBLINE_DELAY,  fps, config: { stiffness: 120, damping: 18 } });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* Camera zoom wrapper */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${cameraZoom})`, transformOrigin: "center center" }}>

        {/* Background gradient orbs */}
        {[
          { top: "-20%", left: "-10%", color: BRAND.primary, size: 700 },
          { bottom: "-15%", right: "-8%", color: BRAND.secondary || "#3b82f6", size: 600 },
        ].map((orb, i) => (
          <div key={i} style={{
            position: "absolute", ...orb,
            width: orb.size, height: orb.size, borderRadius: "50%",
            background: orb.color, filter: "blur(120px)", opacity: 0.15,
            transform: `translate(${Math.sin(frame * 0.018 + i) * 40}px, ${Math.cos(frame * 0.018 + i) * 30}px)`,
          }} />
        ))}

        {/* Entropy dust (OUTSIDE component — see ENTROPY_DUST const below) */}
        {ENTROPY_DUST.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: BRAND.primary, opacity: 0.06 + Math.sin(frame * p.freq + p.phase) * 0.02,
            transform: `translate(${Math.sin(frame * p.freq) * 6}px, ${Math.cos(frame * p.freq * 0.7) * 4}px)`,
            zIndex: 1,
          }} />
        ))}

        {/* Orbital satellites with Z-depth blur (use ORBITAL_GROUPS above) */}
        {/* ... satellite rendering ... */}

        {/* Centered 3-layer text stack (z=20, above satellites) */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", zIndex: 20, padding: "0 10%",
        }}>
          {/* Section label */}
          <div style={{ overflow: "hidden", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: BRAND.primary, transform: `translateY(${interpolate(labelS, [0, 1], [100, 0])}%)`, opacity: interpolate(frame, [LABEL_DELAY, LABEL_DELAY + 8], [0, 1], { extrapolateRight: "clamp" }) }}>
              INTRODUCING
            </div>
          </div>
          {/* Hero headline — per-line masked reveal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
            {["Your product name", "does X better."].map((line, i) => {
              const s = spring({ frame: frame - (HEADLINE_DELAY + i * 4), fps, config: { stiffness: 120, damping: 18 } });
              return (
                <div key={i} style={{ overflow: "hidden", paddingBottom: 4 }}>
                  <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", color: BRAND.text || "#f8fafc", fontFamily: BRAND.font + ", sans-serif", transform: `translateY(${interpolate(s, [0, 1], [100, 0])}%)` }}>
                    {line}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Sub-line */}
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.5, color: BRAND.textMuted || "#94a3b8", maxWidth: 680, transform: `translateY(${interpolate(sublineS, [0, 1], [100, 0])}%)`, opacity: interpolate(frame, [SUBLINE_DELAY, SUBLINE_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }) }}>
              The one-line outcome your audience cares about.
            </div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

const ENTROPY_DUST = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100,
  size: 3 + (i % 4), freq: 0.008 + i * 0.003, phase: i * 0.7,
}));
```

---

## Hero UI Anchor Variant

Product UI card rising from the bottom, below the text stack. Used when the hook needs to show the product immediately:

```tsx
const uiSpring = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 100 } });

{/* Push text up by adding paddingBottom to the text container */}
{/* Text container: add paddingBottom: "18vh" */}

{/* UI card at z=15 — below text, above background satellites */}
<div style={{
  position: "absolute",
  left: "50%", bottom: "-12%",
  transform: `translateX(-50%) translateY(${interpolate(uiSpring, [0, 1], [500, 0])}px)`,
  width: "58%", height: "48%",
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(24px)",
  borderTop: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "24px 24px 0 0",
  boxShadow: "0 -20px 60px rgba(0,0,0,0.4)",
  zIndex: 15, overflow: "hidden",
}}>
  {ATTACHED_IMAGES[0] && (
    <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
  )}
</div>
```

---

## Anti-Patterns
- **NEVER scatter icons at random positions** — use ORBIT_SLOTS or ORBITAL_GROUPS centered on an anchor
- **NEVER use uniform icon sizes** — vary 56–118px; size variation = depth illusion
- **NEVER skip blur on foreground icons** — blur > 0 signals proximity; sharp = distance
- **NEVER leave background as flat color** — gradient orbs + entropy dust ALWAYS
- **NEVER fade the headline in** — use per-line `overflow:hidden` + `translateY(100%→0%)`
- **NEVER skip the continuous zoom** — `interpolate(frame, [0,150], [1.0,1.06])` on the camera wrapper

## Quality Checklist
- [ ] Continuous slow zoom (1.0→1.06 over 150 frames) wraps entire scene
- [ ] Background has gradient orbs (blurred radial) + entropy dust (18 particles)
- [ ] Satellites use cluster/anchor model with Z-depth (blur + size variation)
- [ ] Maximum 5–6 satellite icons (more = cluttered)
- [ ] Text uses 3-layer stack: label at f:5, headline at f:12, sub-line at f:22
- [ ] All headline lines use per-line `overflow:hidden` + `translateY(100%→0%)`
- [ ] Text block centered (hook/CTA) — NOT left-aligned
- [ ] Text stack at z:20, foreground blur satellites at z:8, sharp satellites at z:12

