---
title: Premium Device Mockup with Real Screenshot
impact: HIGH
impactDescription: renders a polished MacBook / browser shell with ATTACHED_IMAGES[0] filling the screen — the #1 agency technique for product credibility
tags: device-mockup, laptop, browser, screenshot, product-demo, macbook, phone, ATTACHED_IMAGES
---

## Device Mockup Pattern Overview

Place `ATTACHED_IMAGES[0]` (the user's real product screenshot) inside a polished device shell — MacBook, browser window, or phone. This is the single highest-credibility move in SaaS video production.

---

## MacBook Shell (CSS-only, no image required)

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Spring entrance — slides up from below
const entrance = spring({ frame, fps, config: { damping: 22, stiffness: 70 } });
const slideY = interpolate(entrance, [0, 1], [height * 0.3, 0]);
const scaleIn = interpolate(entrance, [0, 1], [0.88, 1]);

// Subtle float after entrance
const floatY = Math.sin(frame * 0.035) * 7;

const LAPTOP_W = width * 0.72;
const LAPTOP_H = LAPTOP_W * 0.63;  // standard 16:10 aspect

// Screen inset percentages (tune to match device shape)
const SCREEN_TOP    = "8.5%";
const SCREEN_LEFT   = "11.5%";
const SCREEN_WIDTH  = "77%";
const SCREEN_HEIGHT = "68%";
```

```tsx
<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
  <div style={{
    width: LAPTOP_W,
    height: LAPTOP_H,
    transform: `translateY(${slideY + floatY}px) scale(${scaleIn})`,
    position: "relative",
  }}>
    {/* Laptop body */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(160deg, #d1d5db 0%, #9ca3af 100%)",
      borderRadius: "12px 12px 0 0",
      boxShadow: "0 60px 120px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.12)",
    }} />

    {/* Screen bezel */}
    <div style={{
      position: "absolute",
      top: SCREEN_TOP, left: SCREEN_LEFT,
      width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
      background: "#0a0a0a",
      borderRadius: 4,
      overflow: "hidden",
    }}>
      {/* Real screenshot from ATTACHED_IMAGES */}
      {ATTACHED_IMAGES[0] ? (
        <img
          src={ATTACHED_IMAGES[0]}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      ) : (
        /* Fallback: simulated product UI */
        <div style={{ width: "100%", height: "100%", background: "#0f172a", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 28, background: "#1e293b", display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
            {["#ef4444","#eab308","#22c55e"].map((c,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, display: "flex", gap: 1 }}>
            <div style={{ width: 48, background: "#0f172a" }} />
            <div style={{ flex: 1, background: "#f8fafc" }} />
          </div>
        </div>
      )}

      {/* Glass sheen sweep */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)",
        transform: `translateX(${interpolate(frame, [20, 80], [-120, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%)`,
        pointerEvents: "none",
      }} />
    </div>

    {/* Notch */}
    <div style={{
      position: "absolute", top: "7%", left: "50%",
      transform: "translateX(-50%)",
      width: 12, height: 4,
      background: "#111827", borderRadius: 2,
    }} />

    {/* Hinge + base */}
    <div style={{
      position: "absolute", bottom: "-4%", left: "5%", right: "5%",
      height: "5%",
      background: "linear-gradient(180deg, #9ca3af 0%, #6b7280 100%)",
      borderRadius: "0 0 8px 8px",
    }} />
  </div>
</AbsoluteFill>
```

---

## Browser Window Mockup (with ATTACHED_IMAGES)

Floating browser shell — preferred for dashboard/web app demos:

```tsx
const browserEntrance = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
const browserY = interpolate(browserEntrance, [0, 1], [150, 0]);

const BROWSER_W = width * 0.80;
const BROWSER_H = BROWSER_W * 0.65;
```

```tsx
<div style={{
  width: BROWSER_W, height: BROWSER_H,
  borderRadius: 12,
  boxShadow: "0 50px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",
  overflow: "hidden",
  transform: `translateY(${browserY}px)`,
  display: "flex", flexDirection: "column",
}}>
  {/* Chrome bar */}
  <div style={{
    height: 40, flexShrink: 0,
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    display: "flex", alignItems: "center",
    padding: "0 14px", gap: 8,
  }}>
    <div style={{ display: "flex", gap: 6 }}>
      {["#ef4444","#eab308","#22c55e"].map((c,i) => (
        <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
      ))}
    </div>
    <div style={{
      flex: 1, maxWidth: 360, height: 24, marginLeft: 12,
      background: "white", border: "1px solid #e2e8f0",
      borderRadius: 6, display: "flex", alignItems: "center",
      paddingLeft: 10, fontSize: 11, color: "#64748b",
      fontFamily: "Inter, sans-serif",
    }}>
      🔒 app.yourproduct.com
    </div>
  </div>

  {/* Screenshot content */}
  <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
    {ATTACHED_IMAGES[0] ? (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "#f8fafc" }} />
    )}
  </div>
</div>
```

---

## Phone Mockup (Tall Vertical)

For mobile app demos or 9:16 content:

```tsx
const PHONE_W = 220;
const PHONE_H = PHONE_W * 2.16;  // iPhone aspect ratio
const phoneEntrance = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 90 } });
```

```tsx
<div style={{
  width: PHONE_W, height: PHONE_H,
  background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
  borderRadius: 38,
  boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.08)",
  transform: `scale(${phoneEntrance}) translateY(${floatY}px)`,
  display: "flex", flexDirection: "column",
  alignItems: "center",
  padding: "14px 8px 12px",
  position: "relative",
}}>
  {/* Dynamic island */}
  <div style={{ width: 90, height: 26, background: "#000", borderRadius: 13, marginBottom: 8, flexShrink: 0 }} />
  {/* Screen area */}
  <div style={{ flex: 1, width: "100%", borderRadius: 28, overflow: "hidden", background: "#000" }}>
    {ATTACHED_IMAGES[0] ? (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "#1e293b" }} />
    )}
  </div>
  {/* Home bar */}
  <div style={{ width: 120, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2, marginTop: 10, flexShrink: 0 }} />
</div>
```

---

## Key Rules

- **Always use `ATTACHED_IMAGES[0]`** for the screen content when available — this is the user's real product
- **`objectPosition: "top"`** — ensures the top of the screenshot (nav/header) is always visible
- **Float loop**: `Math.sin(frame * 0.035) * 7` — slow, gentle, premium
- **Sheen sweep**: slides across screen once during entrance (frames 20–80) for glass feel
- **Shadows**: large, soft `0 60px 120px rgba(0,0,0,0.45)` — crucial for depth
- **Don't render the device bezel as SVG** — pure CSS is faster and looks just as good

## Agency upgrade (WaS look): stage the device in 3D space

For premium results, stage the entire device/browser mockup inside `IsometricWrapper` (preferred) or `TiltWrapper`.

```tsx
<IsometricWrapper lift={10} shadowOpacity={0.35} rotateX={58} rotateZ={-28}>
  {/* your device/browser mockup */}
</IsometricWrapper>
// Cursor layers stay OUTSIDE this wrapper.
```
