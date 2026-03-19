---
title: Premium Real Photo + Device Mockup
impact: HIGH
impactDescription: photorealistic product-in-context scene — real environment photo fills the background, a portrait tablet or phone mockup floats centered with the product UI inside, ultra-realistic "product in the wild" feel
tags: real photo, device mockup, tablet, phone, product-in-context, social proof, realism, background photo, desklog
---

## Real Photo + Device Pattern

A real environment photo (office, dealership, home, clinic — whatever matches the product's context) fills the entire background. A white-framed portrait tablet or phone mockup is centered, containing the product UI screenshot. The mockup has a realistic shadow and slight scale entrance. The combination feels like a real product photograph rather than a generated animation.

**Typical use case**: Social proof or showcase scenes where you want to show "the product in someone's hands" or "in the real world". Especially powerful for B2B vertical products (auto dealerships, healthcare, hospitality).

---

## Full-Bleed Environment Photo Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Background: very slow zoom out (Ken Burns effect in reverse — starts slightly cropped, pulls back)
const bgScale = interpolate(frame, [0, 240], [1.06, 1.0]);

<AbsoluteFill style={{ overflow: "hidden" }}>
  {ATTACHED_IMAGES[0] ? (
    <img
      src={ATTACHED_IMAGES[0]}
      style={{
        width: "100%", height: "100%",
        objectFit: "cover",
        objectPosition: "center center",
        transform: `scale(${bgScale})`,
        transformOrigin: "center center",
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}
    />
  ) : (
    // Fallback: realistic-looking gradient suggesting an interior space
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(160deg, #c8b89a 0%, #8a7560 40%, #5c4a36 100%)",
    }} />
  )}

  {/* Subtle darkening vignette — draws eye to center device */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)",
  }} />
</AbsoluteFill>
```

---

## Portrait Tablet Mockup

A white-framed portrait tablet centered on the canvas. Dimensions mimic a real iPad (roughly 3:4 ratio):

```tsx
// Mockup dimensions (portrait tablet)
const TABLET_W = 380;  // px
const TABLET_H = 520;  // px
const BEZEL    = 18;   // px — frame thickness
const RADIUS   = 24;   // border radius of frame

// Entrance spring
const MOCKUP_DELAY = 10;
const mockupSpring = spring({
  frame: frame - MOCKUP_DELAY,
  fps,
  config: { stiffness: 90, damping: 18, mass: 1.2 },
});
const mockupScale = interpolate(mockupSpring, [0, 1], [0.85, 1]);
const mockupY     = interpolate(mockupSpring, [0, 1], [30, 0]);

// Slow ambient float
const floatY = Math.sin(frame * 0.025) * 8;

<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: `translate(-50%, -50%) scale(${mockupScale}) translateY(${mockupY + floatY}px)`,
  zIndex: 20,
}}>
  {/* Outer frame — white device body */}
  <div style={{
    width: TABLET_W,
    height: TABLET_H,
    borderRadius: RADIUS,
    backgroundColor: "#f0f0f0",
    boxShadow: `
      0 60px 120px rgba(0,0,0,0.45),
      0 25px 50px rgba(0,0,0,0.30),
      0 8px 20px rgba(0,0,0,0.20),
      inset 0 1px 0 rgba(255,255,255,0.8),
      inset 0 -2px 4px rgba(0,0,0,0.12)
    `,
    padding: BEZEL,
    position: "relative",
    overflow: "hidden",
  }}>
    {/* Camera notch at top center */}
    <div style={{
      position: "absolute",
      top: 8, left: "50%",
      transform: "translateX(-50%)",
      width: 10, height: 10,
      borderRadius: "50%",
      backgroundColor: "#d0d0d0",
      zIndex: 5,
    }} />

    {/* Screen area */}
    <div style={{
      width: "100%", height: "100%",
      borderRadius: RADIUS - BEZEL,
      overflow: "hidden",
      backgroundColor: "#1a1a2e",
      position: "relative",
    }}>
      {/* Product UI screenshot on screen */}
      {ATTACHED_IMAGES[1] ? (
        <img
          src={ATTACHED_IMAGES[1]}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition: "top left",
          }}
        />
      ) : (
        // Fallback: product-like UI color
        <div style={{
          width: "100%", height: "100%",
          background: `linear-gradient(160deg, ${BRAND.primary || "#6366f1"}22 0%, #0f172a 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 24, fontWeight: 700, color: "white",
            fontFamily: "Inter, sans-serif",
            opacity: 0.4,
          }}>
            {BRAND.name || "Product"}
          </span>
        </div>
      )}

      {/* Screen reflection sheen — glassy top-left highlight */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%)",
        borderRadius: RADIUS - BEZEL,
        pointerEvents: "none",
      }} />
    </div>
  </div>
</div>
```

---

## Phone Mockup Variant (Narrower, Portrait)

For consumer apps — a slimmer portrait phone shape:

```tsx
const PHONE_W = 260;
const PHONE_H = 520;
const BEZEL   = 14;
const RADIUS  = 36;

{/* Side buttons */}
<div style={{
  position: "absolute",
  left: -4, top: PHONE_H * 0.28,
  width: 4, height: 40,
  borderRadius: "2px 0 0 2px",
  backgroundColor: "#d8d8d8",
}} />
<div style={{
  position: "absolute",
  right: -4, top: PHONE_H * 0.35,
  width: 4, height: 60,
  borderRadius: "0 2px 2px 0",
  backgroundColor: "#d8d8d8",
}} />
```

---

## Floating Brand Label (Optional)

A small label above the device that pops in after the mockup:

```tsx
const LABEL_DELAY = 35;
const labelSpring = spring({
  frame: frame - LABEL_DELAY,
  fps,
  config: { damping: 18, stiffness: 160 },
});

<div style={{
  position: "absolute",
  left: "50%",
  top: `calc(50% - ${TABLET_H / 2 + 50}px)`,
  transform: `translateX(-50%) scale(${labelSpring}) translateY(${(1 - labelSpring) * -10}px)`,
  opacity: labelSpring,
  display: "flex", alignItems: "center", gap: 10,
  zIndex: 25,
}}>
  <div style={{
    backgroundColor: "white",
    borderRadius: 9999,
    padding: "8px 20px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.20)",
    display: "flex", alignItems: "center", gap: 8,
    fontFamily: "Inter, sans-serif",
  }}>
    <div style={{
      width: 24, height: 24,
      borderRadius: "30%",
      backgroundColor: BRAND.primary || "#6366f1",
    }} />
    <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
      {BRAND.name || "Product"}
    </span>
  </div>
</div>
```

---

## Image Assignment

```tsx
// ATTACHED_IMAGES[0] = real environment/context photo (office, showroom, clinic, etc.)
// ATTACHED_IMAGES[1] = product UI screenshot to display on the device screen
//
// If only one image provided:
// - Use ATTACHED_IMAGES[0] as both background AND device screen (different objectPosition)
//   Background: objectPosition "center center"
//   Device screen: objectPosition "top left" — shows the UI, not the blurry background
```

---

## Usage Notes

- The three-layer box-shadow on the tablet creates realism: far shadow (depth), mid shadow (elevation), close shadow (contact). Use real values, not a single `0 30px 60px` shortcut
- `inset 0 1px 0 rgba(255,255,255,0.8)` creates a top-edge highlight — simulates the device's chamfered edge catching light
- Ken Burns slow zoom: `scale(1.06 → 1.0)` over the scene duration keeps the background alive without distracting from the device
- The vignette radial gradient (`rgba(0,0,0,0.35)` at edges) darkens the photo perimeter and naturally draws the eye to the centered device
- `floatY = Math.sin(frame * 0.025) * 8` is a very slow float — barely perceptible but adds life
- For dark device variants (Space Gray iPad, black phone): change `backgroundColor: "#f0f0f0"` to `"#2a2a2a"` and `inset 0 1px 0 rgba(255,255,255,0.8)` to `rgba(255,255,255,0.15)`
