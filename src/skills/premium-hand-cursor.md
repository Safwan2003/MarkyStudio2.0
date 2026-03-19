---
title: Premium Hand Cursor (Explainer Video Style)
impact: HIGH
impactDescription: replaces the default arrow cursor with a flat cartoon pointing-hand — the industry-standard cursor style for SaaS explainer videos (Fronter, Arcade, Loom)
tags: cursor, hand-cursor, pointer, explainer-video, click, interaction, walkthrough
---

## Hand Cursor Pattern

The flat cartoon pointing-hand is the #1 cursor style in SaaS explainer videos. It reads as a human demonstrating the product rather than a system cursor. Drop it into any `premium-cursor-engine` scene by swapping the SVG element.

**Hotspot**: tip of the index finger = top-center of the SVG (`translate(-22px, 0px)`).

---

## The Hand Cursor SVG

```tsx
// Flat cartoon pointing hand — index finger up, palm + curled fingers below
// Hotspot is the fingertip: offset wrapper by translate(-22px, 0px)
const HandCursorSVG = ({ scale = 1 }: { scale?: number }) => (
  <svg
    width="44" height="54"
    viewBox="0 0 44 54"
    fill="none"
    style={{ transform: `scale(${scale})`, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))", transformOrigin: "22px 0px" }}
  >
    {/* Index finger + palm unified path */}
    <path
      d="M 14 0 Q 14 0 14 6 L 14 26 Q 10 24 7 26 Q 4 28 4 32 L 4 40 Q 4 48 12 50 L 32 50 Q 40 48 40 40 L 40 32 Q 40 28 37 26 Q 34 24 30 26 L 30 6 Q 30 0 22 0 Q 14 0 14 0 Z"
      fill="white"
      stroke="#1e293b"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    {/* Knuckle crease between finger and palm */}
    <line x1="14" y1="26" x2="30" y2="26" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
    {/* Palm crease */}
    <line x1="10" y1="36" x2="34" y2="36" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
```

---

## Full Drop-In Replacement for Cursor Engine

Replace the arrow SVG block in `premium-cursor-engine` with this. Everything else (spring position, click timing, CURSOR_STEPS, trail) stays identical.

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

const CURSOR_STEPS = [
  { x: 0.45, y: 0.38, label: "Click here", time: 20,  action: "click" },
  { x: 0.62, y: 0.55, label: "Open menu",  time: 70,  action: "click" },
  { x: 0.50, y: 0.50, label: "",           time: 130, action: "none"  },
];

export const HandCursorShowcase = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const stepIndex    = CURSOR_STEPS.findLastIndex((s) => frame >= s.time);
  const currentStep  = CURSOR_STEPS[Math.max(0, stepIndex)];
  const prevStep     = CURSOR_STEPS[Math.max(0, stepIndex - 1)];
  const TRAVEL       = 25;

  const travelProgress = spring({
    frame: frame - currentStep.time,
    fps,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: TRAVEL,
  });

  const cursorX = interpolate(travelProgress, [0, 1], [prevStep.x * width,  currentStep.x * width]);
  const cursorY = interpolate(travelProgress, [0, 1], [prevStep.y * height, currentStep.y * height]);

  const framesAfterArrival = frame - currentStep.time - TRAVEL;
  const isClicking = currentStep.action === "click" && framesAfterArrival >= 0 && framesAfterArrival < 14;

  // Click animation: finger squeezes down slightly
  const clickScale = isClicking
    ? interpolate(framesAfterArrival, [0, 4, 8, 14], [1, 0.88, 0.95, 1])
    : 1;

  // Double ripple
  const ripple1Scale   = isClicking ? interpolate(framesAfterArrival, [0, 14], [0.1, 2.6]) : 0;
  const ripple1Opacity = isClicking ? interpolate(framesAfterArrival, [0, 14], [0.6, 0])   : 0;
  const ripple2Scale   = isClicking && framesAfterArrival >= 4
    ? interpolate(framesAfterArrival - 4, [0, 14], [0.1, 2.0]) : 0;
  const ripple2Opacity = isClicking && framesAfterArrival >= 4
    ? interpolate(framesAfterArrival - 4, [0, 14], [0.4, 0]) : 0;

  return (
    <AbsoluteFill style={{ background: "#f8fafc" }}>
      {/* Product UI behind cursor */}
      {ATTACHED_IMAGES[0] && (
        <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      )}

      {/* Hand cursor overlay */}
      {/* Hotspot = fingertip = translate(-22px, 0px) */}
      <div style={{
        position: "absolute",
        left: cursorX,
        top:  cursorY,
        transform: "translate(-22px, 0px)",
        zIndex: 100,
        pointerEvents: "none",
      }}>
        {/* Ripple ring 1 */}
        <div style={{
          position: "absolute",
          width: 44, height: 44, borderRadius: "50%",
          border: `2px solid ${BRAND.primary}`,
          transform: `translate(-50%, -50%) scale(${ripple1Scale})`,
          opacity: ripple1Opacity,
          left: 22, top: 0,
          pointerEvents: "none",
        }} />
        {/* Ripple ring 2 */}
        <div style={{
          position: "absolute",
          width: 32, height: 32, borderRadius: "50%",
          border: "1.5px solid rgba(255,255,255,0.5)",
          transform: `translate(-50%, -50%) scale(${ripple2Scale})`,
          opacity: ripple2Opacity,
          left: 22, top: 0,
          pointerEvents: "none",
        }} />

        {/* Hand cursor SVG */}
        <svg
          width="44" height="54"
          viewBox="0 0 44 54"
          fill="none"
          style={{
            transform: `scale(${clickScale})`,
            transformOrigin: "22px 0px",
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
          }}
        >
          <path
            d="M 14 0 Q 14 0 14 6 L 14 26 Q 10 24 7 26 Q 4 28 4 32 L 4 40 Q 4 48 12 50 L 32 50 Q 40 48 40 40 L 40 32 Q 40 28 37 26 Q 34 24 30 26 L 30 6 Q 30 0 22 0 Q 14 0 14 0 Z"
            fill="white"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <line x1="14" y1="26" x2="30" y2="26" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
          <line x1="10" y1="36" x2="34" y2="36" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
        </svg>

        {/* Tooltip */}
        {currentStep.label && framesAfterArrival >= 0 && (
          <div style={{
            position: "absolute",
            left: 48, top: -4,
            background: "#1e293b",
            color: "white",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            fontFamily: "Inter, sans-serif",
            opacity: interpolate(framesAfterArrival, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(framesAfterArrival, [0, 8], [6, 0], { extrapolateRight: "clamp" })}px)`,
          }}>
            {currentStep.label}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
```

---

## Click Animation Details

| Frame offset | clickScale | Effect |
|---|---|---|
| 0 | 1.0 | normal |
| 4 | 0.88 | finger presses down (squeeze) |
| 8 | 0.95 | rebound |
| 14 | 1.0 | fully back to rest |

The `transformOrigin: "22px 0px"` pins the squeeze animation to the fingertip so the hand appears to press downward rather than shrink from center.

---

## When to Use

- Any `premium-cursor-engine` scene for a SaaS explainer, tutorial, or product demo video
- Particularly when the brand style is friendly, consumer-facing, or the video tone is "watch how easy this is"
- **Do NOT** use for technical/dev tool brands — those look better with the default arrow cursor
- Use `premium-cursor-engine` for arrow cursor (default), `premium-hand-cursor` for cartoon hand (warmer, friendlier feel)
