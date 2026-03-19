---
title: Premium Responsive Viewport Switcher
impact: HIGH
impactDescription: simulates the device-switcher toolbar inside a browser frame — cursor clicks desktop/tablet/phone icons and the content area smoothly reflows to show each responsive breakpoint
tags: responsive, device-switcher, browser, viewport, mobile, tablet, product-demo, ui-walkthrough
---

## Responsive Viewport Pattern

Shows a product's responsiveness by switching the browser viewport between desktop, tablet, and mobile views — each triggered by a cursor click on device icons in a bottom toolbar. The content area smoothly transitions width, simulating a real browser's responsive design mode.

This is the exact pattern used in Fronter's showcase scene (showcase1–15): full browser frame + bottom toolbar with device icons + cursor clicks to switch views.

---

## Core Data Setup

```tsx
const VIEWPORT_STEPS = [
  { device: "desktop", widthFraction: 1.00, startFrame: 0,   label: "Desktop",  icon: "desktop"  },
  { device: "tablet",  widthFraction: 0.60, startFrame: 60,  label: "Tablet",   icon: "tablet"   },
  { device: "mobile",  widthFraction: 0.42, startFrame: 120, label: "Mobile",   icon: "mobile"   },
];

// Toolbar device icon click positions (fractions of video width)
// These align with the device icons in the bottom bar
const DEVICE_ICON_POSITIONS = {
  desktop: 0.48,
  tablet:  0.53,
  mobile:  0.57,
};
```

---

## Viewport Width Interpolation

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

const stepIndex   = VIEWPORT_STEPS.findLastIndex((s) => frame >= s.startFrame);
const currentStep = VIEWPORT_STEPS[Math.max(0, stepIndex)];
const prevStep    = VIEWPORT_STEPS[Math.max(0, stepIndex - 1)];

const transitionProgress = spring({
  frame: frame - currentStep.startFrame,
  fps,
  config: { damping: 24, stiffness: 130 },
  durationInFrames: 30,
});

// Interpolate content area width
const contentWidthFraction = interpolate(
  transitionProgress,
  [0, 1],
  [prevStep.widthFraction, currentStep.widthFraction],
);
const contentWidth = contentWidthFraction * width;
```

---

## Full Scene Component

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

const VIEWPORT_STEPS = [
  { device: "desktop", widthFraction: 1.00, startFrame: 0   },
  { device: "tablet",  widthFraction: 0.60, startFrame: 60  },
  { device: "mobile",  widthFraction: 0.42, startFrame: 120 },
];

// Cursor click positions for the device icons in the bottom toolbar
const CURSOR_STEPS = [
  { x: 0.50, y: 0.94, time: 50,  action: "click" }, // click tablet icon
  { x: 0.55, y: 0.94, time: 110, action: "click" }, // click mobile icon
  { x: 0.50, y: 0.50, time: 160, action: "none"  }, // settle
];

export const ResponsiveViewportScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // --- Viewport state ---
  const vStep    = VIEWPORT_STEPS.findLastIndex((s) => frame >= s.startFrame);
  const vCurrent = VIEWPORT_STEPS[Math.max(0, vStep)];
  const vPrev    = VIEWPORT_STEPS[Math.max(0, vStep - 1)];

  const vProgress = spring({
    frame: frame - vCurrent.startFrame,
    fps,
    config: { damping: 24, stiffness: 130 },
    durationInFrames: 30,
  });

  const contentWidthFraction = interpolate(vProgress, [0, 1], [vPrev.widthFraction, vCurrent.widthFraction]);
  const contentWidth = contentWidthFraction * width;

  // --- Cursor state ---
  const cStep    = CURSOR_STEPS.findLastIndex((s) => frame >= s.time);
  const cCurrent = CURSOR_STEPS[Math.max(0, cStep)];
  const cPrev    = CURSOR_STEPS[Math.max(0, cStep - 1)];
  const TRAVEL   = 22;

  const cProgress = spring({
    frame: frame - cCurrent.time,
    fps,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: TRAVEL,
  });

  const cursorX = interpolate(cProgress, [0, 1], [cPrev.x * width,  cCurrent.x * width]);
  const cursorY = interpolate(cProgress, [0, 1], [cPrev.y * height, cCurrent.y * height]);

  const framesAfterArrival = frame - cCurrent.time - TRAVEL;
  const isClicking = cCurrent.action === "click" && framesAfterArrival >= 0 && framesAfterArrival < 14;
  const clickScale = isClicking ? interpolate(framesAfterArrival, [0, 4, 8, 14], [1, 0.88, 0.95, 1]) : 1;
  const rippleScale   = isClicking ? interpolate(framesAfterArrival, [0, 14], [0.1, 2.4]) : 0;
  const rippleOpacity = isClicking ? interpolate(framesAfterArrival, [0, 14], [0.5, 0])   : 0;

  // --- Layout constants ---
  const CHROME_H   = height * 0.06;  // top browser bar
  const TOOLBAR_H  = height * 0.09;  // bottom device toolbar
  const CONTENT_H  = height - CHROME_H - TOOLBAR_H;
  const CONTENT_TOP = CHROME_H;

  // Blue border highlight on selected device icon
  const ICON_POSITIONS = [
    { device: "desktop", cx: width * 0.48 },
    { device: "tablet",  cx: width * 0.53 },
    { device: "mobile",  cx: width * 0.57 },
  ];

  return (
    <AbsoluteFill style={{ background: "#f1f5f9" }}>

      {/* --- Browser Chrome Bar --- */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: CHROME_H,
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", padding: "0 14px", gap: 8,
        zIndex: 50,
      }}>
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 6 }}>
          {["#ef4444", "#eab308", "#22c55e"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        {/* URL bar */}
        <div style={{
          flex: 1, maxWidth: 340, height: 22, marginLeft: 10,
          background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 5,
          display: "flex", alignItems: "center", paddingLeft: 10,
          fontSize: 11, color: "#64748b", fontFamily: "Inter, sans-serif",
        }}>
          yourproduct.com
        </div>
      </div>

      {/* --- Content Area (width transitions responsively) --- */}
      <div style={{
        position: "absolute",
        top: CONTENT_TOP,
        left: "50%",
        transform: "translateX(-50%)",
        width: contentWidth,
        height: CONTENT_H,
        overflow: "hidden",
        background: "white",
        border: "2.5px solid #6366f1",
        borderBottom: "none",
        boxSizing: "border-box",
      }}>
        {/* Product screenshot fills the content area */}
        {ATTACHED_IMAGES[0] ? (
          <img
            src={ATTACHED_IMAGES[0]}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" }}
          />
        ) : (
          // Fallback: simple website layout skeleton
          <div style={{ padding: 20, fontFamily: "Inter, sans-serif", height: "100%" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 8, width: "60%", background: "#f1f5f9", borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 6, width: "80%", background: "#f8fafc", borderRadius: 4, marginBottom: 4 }} />
              <div style={{ height: 6, width: "70%", background: "#f8fafc", borderRadius: 4 }} />
            </div>
            <div style={{ height: 32, width: 100, background: BRAND.primary || "#6366f1", borderRadius: 6 }} />
          </div>
        )}

        {/* Width ruler label */}
        <div style={{
          position: "absolute",
          bottom: 6, right: 8,
          fontSize: 10, color: "#94a3b8",
          fontFamily: "Inter, sans-serif",
          background: "rgba(255,255,255,0.8)",
          padding: "2px 6px", borderRadius: 4,
        }}>
          {Math.round(contentWidthFraction * 1440)}px
        </div>
      </div>

      {/* --- Bottom Toolbar --- */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: TOOLBAR_H,
        background: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8,
        zIndex: 50,
      }}>
        {/* Left toolbar items */}
        <div style={{ position: "absolute", left: 16, display: "flex", gap: 6 }}>
          {["#e2e8f0", "#e2e8f0", "#6366f1"].map((c, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: c }} />
          ))}
        </div>

        {/* Center: device icons */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {ICON_POSITIONS.map(({ device, cx }) => {
            const isActive = vCurrent.device === device;
            const iconProg = spring({
              frame: frame - (vCurrent.startFrame),
              fps,
              config: { damping: 20, stiffness: 200 },
              durationInFrames: 15,
            });
            const activeBorder = isActive
              ? interpolate(iconProg, [0, 1], [0, 1], { extrapolateRight: "clamp" })
              : 0;

            return (
              <div key={device} style={{
                width: 32, height: 32,
                borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${isActive ? BRAND.primary || "#6366f1" : "transparent"}`,
                background: isActive ? `${BRAND.primary || "#6366f1"}10` : "transparent",
                opacity: 0.5 + activeBorder * 0.5,
                transition: "none",
              }}>
                {/* Device icon SVGs */}
                {device === "desktop" && (
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                    <rect x="1" y="1" width="16" height="10" rx="2" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5"/>
                    <line x1="7" y1="11" x2="11" y2="11" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="9" y1="11" x2="9" y2="13" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {device === "tablet" && (
                  <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
                    <rect x="1" y="1" width="9" height="12" rx="2" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5"/>
                    <circle cx="5.5" cy="11.5" r="0.8" fill={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"}/>
                  </svg>
                )}
                {device === "mobile" && (
                  <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                    <rect x="0.75" y="0.75" width="6.5" height="11.5" rx="1.5" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5"/>
                    <line x1="3" y1="10.5" x2="5" y2="10.5" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: avatar stack */}
        <div style={{ position: "absolute", right: 16, display: "flex", gap: -8 }}>
          {["#6366f1", "#ec4899", "#f59e0b"].map((c, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: "50%",
              background: c, border: "2px solid white",
              marginLeft: i > 0 ? -8 : 0,
            }} />
          ))}
        </div>
      </div>

      {/* --- Hand Cursor Overlay --- */}
      <div style={{
        position: "absolute",
        left: cursorX, top: cursorY,
        transform: "translate(-22px, 0px)",
        zIndex: 100, pointerEvents: "none",
      }}>
        {/* Ripple on click */}
        <div style={{
          position: "absolute", width: 40, height: 40, borderRadius: "50%",
          border: `2px solid ${BRAND.primary || "#6366f1"}`,
          transform: `translate(-50%, -50%) scale(${rippleScale})`,
          opacity: rippleOpacity, left: 22, top: 0,
        }} />
        {/* Hand cursor SVG */}
        <svg width="44" height="54" viewBox="0 0 44 54" fill="none"
          style={{ transform: `scale(${clickScale})`, transformOrigin: "22px 0px", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.3))" }}>
          <path
            d="M 14 0 Q 14 0 14 6 L 14 26 Q 10 24 7 26 Q 4 28 4 32 L 4 40 Q 4 48 12 50 L 32 50 Q 40 48 40 40 L 40 32 Q 40 28 37 26 Q 34 24 30 26 L 30 6 Q 30 0 22 0 Q 14 0 14 0 Z"
            fill="white" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
          />
          <line x1="14" y1="26" x2="30" y2="26" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
          <line x1="10" y1="36" x2="34" y2="36" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

    </AbsoluteFill>
  );
};
```

---

## Key Formulas

| Variable | Formula | Notes |
|---|---|---|
| Content width | `interpolate(spring, [0,1], [prevFraction, curFraction]) * videoWidth` | Springs between breakpoints |
| Ruler label | `Math.round(contentWidthFraction * 1440)` | Simulates real pixel count |
| Toolbar height | `height * 0.09` | 9% of video height |
| Chrome bar | `height * 0.06` | 6% of video height |

---

## When to Use

- Any product demo where **responsiveness** or **cross-device compatibility** is a key selling point
- Web design tools (Figma, Webflow), website builders, e-commerce platforms, CMS products
- Combine with `premium-hand-cursor` for the cursor clicking device icons
- Combine with `premium-callout-bubble` to annotate a specific element after switching viewport
- **Do NOT** use for native mobile or desktop apps — only makes sense for web products
