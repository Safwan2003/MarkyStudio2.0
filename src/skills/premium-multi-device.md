---
title: Premium Multi-Device Composite
impact: HIGH
impactDescription: laptop + phone (+ optional tablet) in one frame — the agency signature shot showing the product works everywhere. Staggered spring entrances, all screens showing ATTACHED_IMAGES.
tags: multi-device, laptop, phone, tablet, composite, responsive, cross-platform, ATTACHED_IMAGES, device-showcase
---

## Multi-Device Composite Overview

Three devices arranged in a balanced composition:
- **Laptop** (center-left, large) — the hero device, product's main interface
- **Phone** (right, elevated) — mobile companion / app
- **Tablet** (far left or behind laptop, partially visible) — optional depth layer

All screens display `ATTACHED_IMAGES[0]` (or fallback UI). Staggered entrance with independent float loops gives the scene life.

---

## Layout Constants

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Laptop dimensions — center-stage
const LAPTOP_W = width * 0.55;
const LAPTOP_H = LAPTOP_W * 0.63;

// Phone dimensions — right side
const PHONE_W  = 140;
const PHONE_H  = PHONE_W * 2.16;

// Tablet dimensions — peeking from behind left
const TABLET_W = width * 0.28;
const TABLET_H = TABLET_W * 0.75;

// Entrance delays
const LAPTOP_DELAY  = 0;
const TABLET_DELAY  = 8;
const PHONE_DELAY   = 16;

// Float phases (so devices don't bob in sync)
const laptopFloat = Math.sin(frame * 0.03 + 0) * 8;
const phoneFloat  = Math.sin(frame * 0.04 + 2) * 10;
const tabletFloat = Math.sin(frame * 0.025 + 4) * 6;
```

---

## Entrance Springs

```tsx
const laptopEntrance = spring({
  frame: frame - LAPTOP_DELAY,
  fps,
  config: { damping: 22, stiffness: 70 },
});
const phoneEntrance = spring({
  frame: frame - PHONE_DELAY,
  fps,
  config: { damping: 18, stiffness: 85 },
});
const tabletEntrance = spring({
  frame: frame - TABLET_DELAY,
  fps,
  config: { damping: 20, stiffness: 75 },
});

const laptopY  = interpolate(laptopEntrance,  [0, 1], [height * 0.3, 0]);
const phoneY   = interpolate(phoneEntrance,   [0, 1], [height * 0.4, 0]);
const tabletY  = interpolate(tabletEntrance,  [0, 1], [height * 0.25, 0]);
const laptopScale  = interpolate(laptopEntrance,  [0, 1], [0.85, 1]);
const phoneScale   = interpolate(phoneEntrance,   [0, 1], [0.80, 1]);
const tabletScale  = interpolate(tabletEntrance,  [0, 1], [0.88, 1]);
```

---

## Full Composite Render

```tsx
<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>

  {/* ─── TABLET (behind, left) ─── */}
  <div style={{
    position: "absolute",
    left: width * 0.03,
    top: "50%",
    transform: `translateY(calc(-50% + ${tabletY + tabletFloat}px)) scale(${tabletScale})`,
    transformOrigin: "center center",
    zIndex: 10,
    opacity: tabletEntrance,
  }}>
    <div style={{
      width: TABLET_W,
      height: TABLET_H,
      background: "linear-gradient(145deg, #d1d5db, #9ca3af)",
      borderRadius: 16,
      boxShadow: "0 30px 60px rgba(0,0,0,0.30)",
      padding: 10,
      display: "flex", flexDirection: "column",
    }}>
      {/* Home bar */}
      <div style={{
        height: 20, background: "#1f2937", borderRadius: "6px 6px 0 0",
        display: "flex", alignItems: "center", padding: "0 10px", gap: 4,
      }}>
        {["#ef4444","#eab308","#22c55e"].map((c,i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
        ))}
      </div>
      {/* Screen */}
      <div style={{ flex: 1, overflow: "hidden", borderRadius: "0 0 6px 6px" }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f8fafc" }} />
        )}
      </div>
    </div>
  </div>

  {/* ─── LAPTOP (center, hero) ─── */}
  <div style={{
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: `translate(-52%, calc(-46% + ${laptopY + laptopFloat}px)) scale(${laptopScale})`,
    zIndex: 20,
  }}>
    <div style={{
      width: LAPTOP_W,
      height: LAPTOP_H,
      position: "relative",
    }}>
      {/* Body */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #d1d5db 0%, #9ca3af 100%)",
        borderRadius: "12px 12px 0 0",
        boxShadow: "0 60px 120px rgba(0,0,0,0.50), 0 0 0 1px rgba(0,0,0,0.12)",
      }} />

      {/* Screen bezel — 77% × 68% of laptop */}
      <div style={{
        position: "absolute",
        top: "8.5%", left: "11.5%",
        width: "77%", height: "68%",
        background: "#0a0a0a",
        borderRadius: 4,
        overflow: "hidden",
      }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#0f172a" }} />
        )}
        {/* Sheen sweep */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)",
          transform: `translateX(${interpolate(frame, [20, 70], [-120, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%)`,
          pointerEvents: "none",
        }} />
      </div>

      {/* Notch */}
      <div style={{
        position: "absolute", top: "7%", left: "50%",
        transform: "translateX(-50%)",
        width: 10, height: 3, background: "#111827", borderRadius: 2,
      }} />

      {/* Hinge */}
      <div style={{
        position: "absolute", bottom: "-4%", left: "4%", right: "4%", height: "5%",
        background: "linear-gradient(180deg, #9ca3af, #6b7280)",
        borderRadius: "0 0 6px 6px",
      }} />
    </div>
  </div>

  {/* ─── PHONE (right) ─── */}
  <div style={{
    position: "absolute",
    right: width * 0.05,
    top: "50%",
    transform: `translateY(calc(-50% + ${phoneY + phoneFloat}px)) scale(${phoneScale})`,
    zIndex: 30,
    opacity: phoneEntrance,
  }}>
    <div style={{
      width: PHONE_W,
      height: PHONE_H,
      background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
      borderRadius: 32,
      boxShadow: "0 40px 80px rgba(0,0,0,0.50), inset 0 0 0 1.5px rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      padding: "10px 6px 10px",
      position: "relative",
    }}>
      {/* Dynamic island */}
      <div style={{ width: 70, height: 20, background: "#000", borderRadius: 10, marginBottom: 6, flexShrink: 0 }} />
      {/* Screen */}
      <div style={{ flex: 1, width: "100%", borderRadius: 22, overflow: "hidden", background: "#000" }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#1e293b" }} />
        )}
      </div>
      {/* Home bar */}
      <div style={{ width: 80, height: 3, background: "rgba(255,255,255,0.25)", borderRadius: 2, marginTop: 8, flexShrink: 0 }} />
    </div>
  </div>

</AbsoluteFill>
```

---

## Background Options

Works best with either:

```tsx
{/* Option A: Dark gradient with soft orbs */}
<AbsoluteFill style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
  <div style={{ position: "absolute", top: "-20%", left: "20%", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
  <div style={{ position: "absolute", bottom: "-10%", right: "10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
</AbsoluteFill>

{/* Option B: Clean light with dot grid */}
<AbsoluteFill style={{ background: "#f8fafc" }}>
  <div style={{ position: "absolute", inset: 0, opacity: 0.3, backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
</AbsoluteFill>
```

---

## Headline + CTA Below Devices (Optional)

```tsx
const headlineEntrance = spring({ frame: frame - 40, fps, config: { damping: 14, stiffness: 80 } });

<div style={{
  position: "absolute", bottom: "6%", left: "50%",
  transform: `translateX(-50%) translateY(${interpolate(headlineEntrance, [0,1], [20,0])}px)`,
  opacity: headlineEntrance,
  textAlign: "center", fontFamily: "Inter, sans-serif",
}}>
  <div style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 6 }}>
    Works on every device. Ships from Japan.
  </div>
  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}>
    Web · iOS · Android
  </div>
</div>
```

---

## Key Rules

- **Z-order**: tablet (10) → laptop (20) → phone (30) — phone is the "newest" device, front
- **Float phases**: different `Math.sin` phases (0, 2, 4) prevent synchronized bobbing
- **Stagger delays**: LAPTOP_DELAY=0, TABLET_DELAY=8, PHONE_DELAY=16 — laptop arrives first as the main event
- **Sheen only on laptop** — it's the hero screen; phone and tablet don't need the shine effect
- **Scale**: laptop at 55% of video width is the right proportion — large enough to be impressive, not overwhelming
- **`ATTACHED_IMAGES[0]`** on all three screens — shows the product is truly cross-platform
