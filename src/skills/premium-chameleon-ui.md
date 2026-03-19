---
title: Premium Chameleon UI Overlays
impact: HIGH
impactDescription: overlays precisely-positioned React components over static screenshots to fake real UI interactivity — typing in inputs, dropdowns opening, panels sliding in, plus cinematic camera zoom
tags: chameleon, overlay, typing, dropdown, panel, cinematic, interactive, input-overlay, glass-panel
qualityBar: The scene feels like a live screen recording, not a cursor over an image. Panels push and blur the background when they open. Glass cards have deep blur and directional border highlights. The cursor uses the hand SVG with dwell-jitter. The camera slowly punches in. A section label + headline grounds the left side during the walkthrough.
---

## Architecture

Never rebuild static UI — the screenshot IS the UI. Strict Z-index hierarchy (no exceptions):

```
z: 100 ── Animated Hand Cursor + Intent Pill
z: 80  ── Toast Notifications / Feature Banner
z: 60  ── Glass Panels / Modals (TaskDetailPanel)
z: 50  ── Modal Backdrop (dim + backdropFilter blur)
z: 10  ── Chameleon Overlays (ChameleonInput, ChameleonHighlight, DropdownMenu)
z: 5   ── Element Spotlight (dim overlay with focus-ring cutout)
z: 0   ── Background Screenshot (inside CinematicCamera)
```

Cursor is ALWAYS rendered **outside** any camera or zoom wrapper.

---

## Core Overlays

### ChameleonInput — Typing on Input Fields

With focus ring (mandatory — makes it look like a live HTML element, not a label):
```tsx
<ChameleonInput
  x={0.200}   // box.x from INTERACTION_SCRIPT (0-1 fraction)
  y={0.150}   // box.y
  w={0.400}   // box.w
  h={0.050}   // box.h
  text="Search for Q3 reports..."
  startFrame={52}    // the CLICK frame (DWELL_START + DWELL from CURSOR_STEPS)
  brand={BRAND}
/>
```
`useTyping(text, startFrame, fps)` handles character reveal + blinking cursor internally.

**Inline implementation** (if building manually):
```tsx
const isFocused = frame >= startFrame && frame < startFrame + 90;
const focusSpring = spring({ frame: frame - startFrame, fps, config: { damping: 15, stiffness: 150 } });
const charsToShow = Math.max(0, Math.floor((frame - startFrame - 8) / (fps / 15)));
const showBlink = isFocused && Math.floor(frame / 15) % 2 === 0;

<div style={{
  position: "absolute",
  left: `${x * 100}%`, top: `${y * 100}%`,
  width: `${w * 100}%`, height: `${h * 100}%`,
  backgroundColor: "#ffffff", borderRadius: 6,
  border: `2px solid rgba(99,102,241,${isFocused ? interpolate(focusSpring, [0, 1], [0, 1]) : 0})`,
  boxShadow: isFocused ? `0 0 0 3px ${BRAND.primary}33` : "none", // focus glow
  display: "flex", alignItems: "center", padding: "0 12px",
  fontSize: 14, color: "#0f172a", fontFamily: "Inter, sans-serif",
  zIndex: 10,
}}>
  {text.slice(0, charsToShow)}
  {showBlink && <span style={{ width: 2, height: "60%", backgroundColor: BRAND.primary, marginLeft: 2 }} />}
</div>
```

### ChameleonHighlight — Click Glow on Buttons
```tsx
<ChameleonHighlight
  x={0.450} y={0.700} w={0.100} h={0.060}
  triggerFrame={114}   // the CLICK frame
  brand={BRAND}
/>
```
Use for: `elementType: "button"` (always), `elementType: "card"` (on click), `elementType: "nav"` (tab activation).

### DropdownMenu — Spring-In with Staggered Items
```tsx
<DropdownMenu
  x={0.300}
  y={0.225}    // triggerBox.y + triggerBox.h + 0.005
  w={0.180}
  items={["All Projects", "Active", "Archived", "Shared with me"]}
  openFrame={68}
  closeFrame={130}
  brand={BRAND}
/>
```

**Stagger is mandatory** — items must slide in sequentially, never all at once:
```tsx
// Container scales from top origin:
const containerSpring = spring({ frame: frame - openFrame, fps, config: { damping: 18, stiffness: 140 } });
<div style={{
  transform: `scaleY(${containerSpring}) translateY(${interpolate(containerSpring, [0, 1], [-8, 0])}px)`,
  transformOrigin: "top center",
  overflow: "hidden",
  // ... glass card styles
}}>
  {items.map((item, i) => {
    // Each item starts 3 frames after previous — "falling cards" effect
    const itemSpring = spring({ frame: frame - (openFrame + 4 + i * 3), fps, config: { damping: 14, stiffness: 120 } });
    return (
      <div key={i} style={{
        opacity: interpolate(itemSpring, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(itemSpring, [0, 1], [8, 0])}px)`,
        padding: "8px 16px", fontSize: 13, fontFamily: "Inter, sans-serif",
        color: i === 0 ? BRAND.primary : "#334155",
        background: i === 0 ? `${BRAND.primary}15` : "transparent",
      }}>
        {item}
      </div>
    );
  })}
</div>
```

---

## CinematicCamera

Wrap screenshot + overlays. Cursor stays **outside**:

```tsx
<CinematicCamera targetX={0.5} targetY={0.4} zoomTo={1.06}>
  {/* screenshot + chameleon overlays */}
</CinematicCamera>
{/* Cursor at z=100, OUTSIDE CinematicCamera */}
<div style={{ position: "absolute", left: cursorX, top: cursorY, zIndex: 100 }}>
  {/* hand cursor SVG */}
</div>
```

**Hard cap:** `zoomTo` ≤ `1.06`. Never 1.12+. With progressive camera motion, keep at `1.04`.

### Progressive Camera Follow
```tsx
const CAMERA_LAG = 30;
const camProg = Math.min(Math.max(frame - cur.time + CAMERA_LAG, 0) / CAMERA_LAG, 1);
const cameraX = prev.x + (cur.x - prev.x) * camProg;
const cameraY = prev.y + (cur.y - prev.y) * camProg;

<CinematicCamera targetX={cameraX} targetY={cameraY} zoomTo={1.04}>
```

---

## Panel Push + Background Reaction (MANDATORY when panel/modal opens)

Premium panels physically push the scene — the background must SCALE DOWN (0.98) + BLUR (8px) + DIM together. Just blurring is not enough:

```tsx
const PANEL_OPEN_FRAME = 80;
const panelProgress = spring({
  frame: frame - PANEL_OPEN_FRAME, fps,
  config: { stiffness: 120, damping: 20 },  // heavy, deliberate weight
});

// Background reacts: scale shrinks slightly, adds blur, dims
const bgScale  = interpolate(panelProgress, [0, 1], [1.0, 0.98]); // subtle shrink = physical depth
const bgBlur   = interpolate(panelProgress, [0, 1], [0, 8]);       // 8px for panel, 12px for modal
const bgDarken = interpolate(panelProgress, [0, 1], [0, 0.40]);    // 40% dim

{/* Screenshot layer — scale + blur reacts to panel opening */}
<div style={{
  position: "absolute", inset: 0,
  transform: `scale(${bgScale})`,  // scales down as panel opens
  filter: `blur(${bgBlur}px)`,
  transformOrigin: "center center",
}}>
  {ATTACHED_IMAGES[0] && (
    <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
  )}
  {/* Dark scrim */}
  <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${bgDarken})`, pointerEvents: "none" }} />
</div>

{/* Panel at z=60 — slides in from right */}
<TaskDetailPanel openFrame={PANEL_OPEN_FRAME} title="Task Details" fields={[...]} brand={BRAND} />
```

### Modal with Real Backdrop Blur
Modals must use `backdropFilter: blur(12px)` on a z:50 overlay — NOT just a dark overlay:

```tsx
{panelProgress > 0.05 && (
  <>
    {/* z=50 backdrop — real physical blur (12px for modals) */}
    <div style={{
      position: "absolute", inset: 0,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      background: `rgba(0,0,0,${bgDarken})`,
      zIndex: 50,
    }} />
    {/* z=60 modal card on top of backdrop */}
    <ModalOverlay openFrame={PANEL_OPEN_FRAME} title="Confirm Export" brand={BRAND} />
  </>
)}
```

---

## Glass Panel Quality Spec

When building TaskDetailPanel, ModalOverlay, or DropdownMenu inline (not using scope components), use these exact values:

```tsx
// Premium glass card — matches WhatAStory reference video quality
const glassCard = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  // Directional border: top + left brighter (catches the light)
  border: "1px solid transparent",
  borderTop: "1px solid rgba(255,255,255,0.22)",
  borderLeft: "1px solid rgba(255,255,255,0.16)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  // Layered shadow: contact (tight) + diffuse (broad) = separation from bg
  boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 25px 50px -12px rgba(0,0,0,0.50)",
  borderRadius: 16,
};
```

For light-theme backgrounds, swap to:
```tsx
{
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(255,255,255,0.90)",
  borderLeft: "1px solid rgba(255,255,255,0.75)",
  borderRight: "1px solid rgba(0,0,0,0.06)",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 20px 40px -8px rgba(0,0,0,0.18)",
}
```

---

## INTERACTION_SCRIPT / CURSOR_STEPS Pattern

When `CURSOR_WAYPOINTS` is injected in the prompt, copy it verbatim:

```tsx
const CURSOR_STEPS = [
  { x: 0.400, y: 0.175, label: "Search Bar", time: 45, action: "click",
    box: { x: 0.200, y: 0.150, w: 0.400, h: 0.050 }, elementType: "input" },
  { x: 0.500, y: 0.730, label: "Submit",     time: 107, action: "click",
    box: { x: 0.450, y: 0.700, w: 0.100, h: 0.060 }, elementType: "button" },
  { x: 0.500, y: 0.730, label: "",           time: 155, action: "none" },
];
// TRAVEL=22 + DWELL=10 → click fires at step.time+32
// step[0] click: f:77  | step[1] click: f:139
```

**Overlay mapping rules:**
- `elementType: "input"` → `ChameleonInput` + `ChameleonHighlight` (startFrame = `step.time + 32`)
- `elementType: "button"` → `ChameleonHighlight` only (triggerFrame = `step.time + 32`)
- `elementType: "dropdown"` → `ChameleonHighlight` on trigger + `DropdownMenu` below it
- `elementType: "card"` → `ChameleonHighlight` + optionally `TaskDetailPanel`

---

## Form Success State — Loading → Checkmark

```tsx
const submitClickFrame = 139; // step.time + 32 for the submit step
const submitBox = { x: 0.450, y: 0.700, w: 0.100, h: 0.060 };
const afterSubmit = frame - submitClickFrame;

const showLoader  = afterSubmit >= 0 && afterSubmit < 20;
const showSuccess = afterSubmit >= 20 && afterSubmit < 60;
const successScale   = showSuccess ? spring({ frame: afterSubmit - 20, fps, config: { damping: 10, stiffness: 200 }, durationInFrames: 15 }) : 0;
const successOpacity = showSuccess ? interpolate(afterSubmit, [20, 28, 52, 60], [0, 1, 1, 0]) : 0;

{/* Render inside screenshot wrapper, z=11 */}
{showLoader && (
  <div style={{
    position: "absolute",
    left: (submitBox.x + submitBox.w / 2) * width - 12,
    top:  (submitBox.y + submitBox.h / 2) * height - 12,
    width: 24, height: 24, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: BRAND.primary,
    transform: `rotate(${frame * 12}deg)`,
    zIndex: 11,
  }} />
)}
{successOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: submitBox.x * width - 16, top: submitBox.y * height - 16,
    width: submitBox.w * width + 32, height: submitBox.h * height + 32,
    borderRadius: 12,
    background: "rgba(34,197,94,0.15)", border: "1.5px solid #22c55e",
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: successOpacity, transform: `scale(${successScale})`, zIndex: 11,
  }}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10 L8 14 L16 6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)}
```

---

## Toast / Snackbar Notification (MANDATORY after final action)

```tsx
const toastFrame = submitClickFrame + 25;
const toastProg  = spring({ frame: frame - toastFrame, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 20 });
const toastSlide   = frame < toastFrame ? 60 : interpolate(toastProg, [0, 1], [60, 0]);
const toastOpacity = frame < toastFrame ? 0
  : frame > toastFrame + 60
    ? interpolate(frame, [toastFrame + 60, toastFrame + 75], [1, 0], { extrapolateRight: "clamp" })
    : Math.min(toastProg * 2, 1);

{/* Render OUTSIDE CinematicCamera at z=50 */}
{toastOpacity > 0 && (
  <div style={{
    position: "absolute", bottom: 32 + toastSlide, left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(15,20,30,0.95)",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
    padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
    opacity: toastOpacity, zIndex: 50,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
  }}>
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
    <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, fontFamily: BRAND.font + ", sans-serif" }}>
      Changes saved successfully
    </span>
  </div>
)}
```

---

## Element Spotlight — Dim + Focus Ring

When cursor arrives at an element, dim the surrounding UI:

```tsx
const hasBox = !!cur.box;
const framesAfterArrival = frame - cur.time - 22; // after TRAVEL
const spotlightOpacity = hasBox && framesAfterArrival >= 0
  ? interpolate(framesAfterArrival, [0, 15], [0, 0.45], { extrapolateRight: "clamp" })
  : 0;

{/* Dim overlay inside screenshot wrapper, z=5 */}
{spotlightOpacity > 0 && (
  <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${spotlightOpacity})`, zIndex: 5 }} />
)}

{/* Focus ring cutout z=6 */}
{hasBox && spotlightOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: cur.box.x * width - 8, top: cur.box.y * height - 8,
    width: cur.box.w * width + 16, height: cur.box.h * height + 16,
    borderRadius: 10,
    boxShadow: `0 0 0 2px ${BRAND.primary}80, 0 0 30px ${BRAND.primary}40`,
    zIndex: 6,
    opacity: Math.min(spotlightOpacity * 1.5, 1),
  }} />
)}
```

---

## Contextual Section Headers (for 3+ interaction steps)

Use `ContextualSectionHeader` (in scope) above the UI for multi-step demos:

```tsx
<ContextualSectionHeader text="Live Redaction"  subtext="Google Docs" icon="✏️" startFrame={30} exitFrame={90}  brand={BRAND} />
<ContextualSectionHeader text="Apply Filters"   subtext="Advanced"              startFrame={90} exitFrame={140} brand={BRAND} />
<ContextualSectionHeader text="Export Results"  icon="📤"                       startFrame={150}                brand={BRAND} />
```

Rules: `top: 60, left: 80`, `z=50` (above UI, below cursor). One per major feature area.

---

## 3-Layer Text Stack Integration (Split Layout)

For showcase/walkthrough scenes, place the text stack on the **left 40%** while the UI occupies the right 60%:

```tsx
{/* Left 40%: section label + headline + sub-line */}
<div style={{ position: "absolute", left: "8%", top: "50%", transform: "translateY(-50%)", width: "30%", zIndex: 20 }}>
  {/* Section label */}
  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: BRAND.primary, marginBottom: 14, opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }) }}>
    {SECTION_LABEL}
  </div>
  {/* Headline — MaskedReveal from scope */}
  <MaskedReveal startFrame={8} durationInFrames={20}>
    <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.0, color: BRAND.text || "#0f172a" }}>
      {HEADLINE}
    </div>
  </MaskedReveal>
  {/* Sub-line */}
  <div style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.5, color: BRAND.muted || "#64748b", marginTop: 16, opacity: interpolate(frame, [24, 36], [0, 1], { extrapolateRight: "clamp" }) }}>
    {SUBLINE}
  </div>
</div>

{/* Right 60%: screenshot in a glass card frame */}
<div style={{
  position: "absolute", right: "4%", top: "10%",
  width: "54%", height: "80%",
  borderRadius: 16, overflow: "hidden",
  transform: "rotateY(-8deg) rotateX(2deg)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 25px 50px -12px rgba(0,0,0,0.50)",
  zIndex: 10,
}}>
  <CinematicCamera targetX={0.5} targetY={0.45} zoomTo={1.04}>
    {ATTACHED_IMAGES[0] && (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    )}
    {/* Chameleon overlays */}
  </CinematicCamera>
</div>
```

---

## Scene Entry / Exit

Always fade the scene in on the first 15 frames and out on the last 10:

```tsx
const { durationInFrames } = useVideoConfig();
const sceneOpacity = frame < 15
  ? interpolate(frame, [0, 15], [0, 1])
  : frame > durationInFrames - 10
    ? interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0])
    : 1;

<AbsoluteFill style={{ opacity: sceneOpacity }}>
```

---

## Feature Demo Banner (top progress bar)

For 3+ step walkthroughs:
```tsx
const STEP_LABELS = ["Search & Filter", "Select Record", "Export Report"];
const bannerProgress = spring({ frame, fps, config: { damping: 20, stiffness: 140 } });

<div style={{
  position: "absolute", top: 0, left: 0, right: 0, height: 52,
  background: "rgba(10,12,20,0.88)", backdropFilter: "blur(12px)",
  borderBottom: `1px solid ${BRAND.primary}30`,
  display: "flex", alignItems: "center", paddingLeft: 32, paddingRight: 32, gap: 16,
  transform: `translateY(${interpolate(bannerProgress, [0, 1], [-52, 0])}px)`,
  opacity: Math.min(bannerProgress * 2, 1), zIndex: 80,
}}>
  <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.primary }} />
  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>
    {STEP_LABELS[Math.min(stepIndex, STEP_LABELS.length - 1)]}
  </span>
  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
    {STEP_LABELS.map((_, i) => (
      <div key={i} style={{
        width: i === stepIndex ? 24 : 8, height: 8, borderRadius: 4,
        background: i <= stepIndex ? BRAND.primary : "rgba(255,255,255,0.2)",
      }} />
    ))}
  </div>
</div>
```

---

## Full Integration Example (Premium Pattern)

```tsx
export const MyAnimation = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // ── Timing constants ──────────────────────────────────────────────────────
  const TRAVEL = 22; const DWELL = 10; const CLICK = 14;

  // ── CURSOR_STEPS (paste verbatim from CURSOR WAYPOINTS injection) ─────────
  const CURSOR_STEPS = [
    { x: 0.50, y: 1.10, label: "",             time: 0,   action: "none" },
    { x: 0.40, y: 0.175, label: "Search field", time: 20,  action: "click",
      box: { x: 0.200, y: 0.150, w: 0.400, h: 0.050 }, elementType: "input" },
    { x: 0.50, y: 0.730, label: "Submit",        time: 82,  action: "click",
      box: { x: 0.450, y: 0.700, w: 0.100, h: 0.060 }, elementType: "button" },
    { x: 0.50, y: 0.730, label: "",              time: 144, action: "none" },
  ];

  // ── Cursor position (magnetic snap + bezier arc) ──────────────────────────
  const stepIndex = Math.max(0, CURSOR_STEPS.findLastIndex((s) => frame >= s.time));
  const cur  = CURSOR_STEPS[stepIndex];
  const prev = CURSOR_STEPS[Math.max(0, stepIndex - 1)];
  const timeSinceStep = frame - cur.time;

  const travelSpring = spring({ frame: timeSinceStep, fps, config: { stiffness: 160, damping: 12 }, durationInFrames: TRAVEL });
  const pos = cubicBezier({ x: prev.x * width, y: prev.y * height }, { x: cur.x * width, y: cur.y * height }, travelSpring, 0.15);
  let cursorX = pos.x;
  let cursorY = pos.y;

  // Dwell jitter
  const DWELL_START = cur.time + TRAVEL;
  const isDwelling  = frame >= DWELL_START && frame < DWELL_START + DWELL;
  if (isDwelling && cur.action !== "none") {
    cursorX += Math.sin(frame * 1.8) * 1.2;
    cursorY += Math.cos(frame * 2.1) * 0.8;
  }

  // Click
  const CLICK_START      = DWELL_START + DWELL;
  const framesAfterClick = frame - CLICK_START;
  const isClicking       = cur.action === "click" && framesAfterClick >= 0 && framesAfterClick < CLICK;
  const clickSqueeze     = isClicking ? interpolate(framesAfterClick, [0, 4, CLICK], [1, 0.84, 1]) : 1;

  const ripple1Scale   = isClicking ? interpolate(framesAfterClick, [0, 16], [0.1, 2.8]) : 0;
  const ripple1Opacity = isClicking ? interpolate(framesAfterClick, [0, 16], [0.7, 0]) : 0;
  const ripple2Scale   = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, 14], [0.1, 2.2]) : 0;
  const ripple2Opacity = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, 14], [0.5, 0]) : 0;

  // Click-zoom
  const ZOOM_IN = 18; const ZOOM_HOLD = 20; const ZOOM_OUT = 22;
  const shouldZoom = cur.action === "click" && framesAfterClick >= 0;
  const zoomScale  = shouldZoom
    ? framesAfterClick < ZOOM_IN
      ? interpolate(framesAfterClick, [0, ZOOM_IN], [1.0, 1.06])
      : framesAfterClick < ZOOM_IN + ZOOM_HOLD
        ? 1.06
        : interpolate(framesAfterClick, [ZOOM_IN + ZOOM_HOLD, ZOOM_IN + ZOOM_HOLD + ZOOM_OUT], [1.06, 1.0], { extrapolateRight: "clamp" })
    : 1.0;

  // Intent pill
  const isTraveling = timeSinceStep >= 0 && timeSinceStep < TRAVEL;
  const distPx  = Math.hypot((cur.x - prev.x) * width, (cur.y - prev.y) * height);
  const travelPct = timeSinceStep / TRAVEL;
  const pillOpacity = isTraveling && cur.label && distPx > 200
    ? travelPct < 0.65
      ? interpolate(timeSinceStep, [0, 6], [0, 1], { extrapolateRight: "clamp" })
      : interpolate(travelPct, [0.65, 1.0], [1, 0])
    : 0;

  // Panel push + blur (fires when cursor does final action)
  const panelOpenFrame = 82 + TRAVEL + DWELL; // submit click frame
  const panelProgress  = spring({ frame: frame - panelOpenFrame, fps, config: { stiffness: 140, damping: 16 } });
  const bgBlur   = interpolate(panelProgress, [0, 1], [0, 3]);
  const bgDarken = interpolate(panelProgress, [0, 1], [0, 0.28]);

  // Form success
  const submitClickFrame = 82 + TRAVEL + DWELL;
  const afterSubmit = frame - submitClickFrame;
  const successScale   = afterSubmit >= 20 ? spring({ frame: afterSubmit - 20, fps, config: { damping: 10, stiffness: 200 }, durationInFrames: 15 }) : 0;
  const successOpacity = afterSubmit >= 20 && afterSubmit < 60 ? interpolate(afterSubmit, [20, 28, 52, 60], [0, 1, 1, 0]) : 0;

  // Toast
  const toastFrame   = submitClickFrame + 25;
  const toastProg    = spring({ frame: frame - toastFrame, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 20 });
  const toastSlide   = frame < toastFrame ? 60 : interpolate(toastProg, [0, 1], [60, 0]);
  const toastOpacity = frame < toastFrame ? 0 : frame > toastFrame + 60
    ? interpolate(frame, [toastFrame + 60, toastFrame + 75], [1, 0], { extrapolateRight: "clamp" })
    : Math.min(toastProg * 2, 1);

  // Scene entry/exit fade
  const sceneOpacity = frame < 15
    ? interpolate(frame, [0, 15], [0, 1])
    : frame > durationInFrames - 10
      ? interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0])
      : 1;

  // Spotlight
  const framesAfterArrival = frame - cur.time - TRAVEL;
  const spotlightOpacity = cur.box && framesAfterArrival >= 0
    ? interpolate(framesAfterArrival, [0, 15], [0, 0.45], { extrapolateRight: "clamp" })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, opacity: sceneOpacity }}>

      {/* ── Progressive camera + screenshot (dims/blurs when panel opens) ── */}
      <div style={{ position: "absolute", inset: 0, filter: `blur(${bgBlur}px)` }}>
        <CinematicCamera targetX={0.5} targetY={0.4} zoomTo={1.04}>
          <div style={{
            position: "absolute", inset: 0,
            transform: `scale(${zoomScale})`,
            transformOrigin: `${cur.x * 100}% ${cur.y * 100}%`,
          }}>
            {ATTACHED_IMAGES[0] ? (
              <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#0f172a" }} />
            )}
          </div>

          {/* Spotlight dim */}
          {spotlightOpacity > 0 && (
            <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${spotlightOpacity})`, zIndex: 5 }} />
          )}
          {cur.box && spotlightOpacity > 0 && (
            <div style={{
              position: "absolute",
              left: cur.box.x * width - 8, top: cur.box.y * height - 8,
              width: cur.box.w * width + 16, height: cur.box.h * height + 16,
              borderRadius: 10,
              boxShadow: `0 0 0 2px ${BRAND.primary}80, 0 0 30px ${BRAND.primary}40`,
              zIndex: 6,
            }} />
          )}

          {/* Chameleon overlays */}
          <ChameleonInput x={0.200} y={0.150} w={0.400} h={0.050} text="Search Q3 reports..." startFrame={52} brand={BRAND} />
          <ChameleonHighlight x={0.200} y={0.150} w={0.400} h={0.050} triggerFrame={52}  brand={BRAND} />
          <ChameleonHighlight x={0.450} y={0.700} w={0.100} h={0.060} triggerFrame={114} brand={BRAND} />

          {/* Form success */}
          {successOpacity > 0 && (
            <div style={{
              position: "absolute",
              left: 0.450 * width - 16, top: 0.700 * height - 16,
              width: 0.100 * width + 32, height: 0.060 * height + 32,
              borderRadius: 10, background: "rgba(34,197,94,0.15)", border: "1.5px solid #22c55e",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: successOpacity, transform: `scale(${successScale})`, zIndex: 11,
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 10 L8 14 L16 6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </CinematicCamera>

        {/* Dark scrim */}
        <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${bgDarken})`, pointerEvents: "none" }} />
      </div>

      {/* ── Toast notification (outside camera, z=50) ── */}
      {toastOpacity > 0 && (
        <div style={{
          position: "absolute", bottom: 32 + toastSlide, left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15,20,30,0.95)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12, padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 10,
          opacity: toastOpacity, zIndex: 50,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, fontFamily: BRAND.font + ", sans-serif" }}>
            Search results loaded
          </span>
        </div>
      )}

      {/* ── Cursor (ALWAYS outside CinematicCamera, z=100) ── */}
      <div style={{ position: "absolute", left: cursorX, top: cursorY, zIndex: 100, pointerEvents: "none" }}>
        {/* Double ripple */}
        <div style={{ position: "absolute", width: 44, height: 44, borderRadius: "50%", border: `2px solid ${BRAND.primary}`, transform: `translate(-50%,-50%) scale(${ripple1Scale})`, opacity: ripple1Opacity, left: 8, top: 8 }} />
        <div style={{ position: "absolute", width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.6)", transform: `translate(-50%,-50%) scale(${ripple2Scale})`, opacity: ripple2Opacity, left: 8, top: 8 }} />

        {/* Hand cursor SVG */}
        <div style={{ transform: `scale(${clickSqueeze})`, transformOrigin: "8px 2px" }}>
          <svg width="30" height="38" viewBox="0 0 30 38" fill="none"
            style={{ transform: "rotate(-8deg) translate(-8px, -2px)", transformOrigin: "8px 4px", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.30))" }}>
            <path d="M8 2 C8 1 9 0 10 0 C11 0 12 1 12 2 L12 16 C14 14 17 14 18 16 L18 22 C18 26 22 28 22 32 C22 35 20 38 17 38 L10 38 C7 38 5 36 5 33 L5 16 C4 16 2 15 2 13 L2 8 C2 6 3 5 4 5 C5 5 6 6 6 7 L6 12 C6 13 8 13 8 12 Z" fill="white" stroke="#1e293b" strokeWidth="1.2"/>
            <path d="M6 10 Q8 9.5 10 10" stroke="#d1d5db" strokeWidth="0.8" fill="none"/>
          </svg>
        </div>

        {/* Intent pill during travel */}
        <div style={{
          position: "absolute", left: 24, top: 10,
          background: "#1e293b", color: "#fff", padding: "6px 12px", borderRadius: 8,
          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "Inter, sans-serif",
          opacity: pillOpacity, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", pointerEvents: "none",
        }}>
          {cur.label}…
        </div>
      </div>

    </AbsoluteFill>
  );
};
```

---

## Light / Dark Theme Glass Panel Values

**Dark theme** (default — deep navy/slate bg):
```tsx
{
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
  borderTop: "1px solid rgba(255,255,255,0.22)",
  borderLeft: "1px solid rgba(255,255,255,0.16)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.40), 0 25px 50px -12px rgba(0,0,0,0.60)",
}
```

**Light theme** (white/off-white bg):
```tsx
{
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(255,255,255,0.90)",
  borderLeft: "1px solid rgba(255,255,255,0.75)",
  borderRight: "1px solid rgba(0,0,0,0.05)",
  borderBottom: "1px solid rgba(0,0,0,0.05)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 20px 40px -8px rgba(0,0,0,0.18)",
}
```

---

## Anti-Patterns
- **NEVER `zoomTo: 1.12`** — hard cap at 1.06. Anything above is jarring.
- **NEVER arrow cursor in chameleon scenes** — hand cursor is mandatory.
- **NEVER `stiffness: 90`** for cursor spring — use 160/12.
- **NEVER TRAVEL=25** — use 22.
- **NEVER skip DWELL** — 10-frame dwell with jitter before every click.
- **NEVER use just a dark overlay for modals** — must use `backdropFilter: blur(12px)` at z=50.
- **NEVER let panels appear without background push** — `bgScale: 0.98` + `bgBlur: 8px` + `bgDarken: 0.40` ALWAYS accompanies panel open.
- **NEVER build glass cards without directional borders** (top/left brighter than right/bottom).
- **NEVER let dropdown items appear all at once** — mandatory `i * 3` frame stagger.
- **NEVER skip the input focus ring** — `box-shadow` glow must appear when cursor clicks an input.

## Quality Checklist
- [ ] Scene fades in over first 15 frames, out over last 10
- [ ] CinematicCamera wraps screenshot + overlays, `zoomTo` ≤ 1.06
- [ ] Hand cursor (not arrow) outside camera at z=100
- [ ] TRAVEL=22, `stiffness:160, damping:12`, 10-frame DWELL with jitter
- [ ] Click-zoom on screenshot (1.0→1.06), origin at click coordinates
- [ ] Background dims (28%) + blurs (3px) when panel/modal opens
- [ ] Modal/panel uses `backdropFilter: blur(24px)`, NOT just dark overlay
- [ ] Glass panels use directional borders (top/left bright, right/bottom dim)
- [ ] Glass panels use layered boxShadow (contact + diffuse)
- [ ] ChameleonHighlight on every button/input click
- [ ] Element spotlight (dim overlay + focus ring) on cursor arrival
- [ ] Toast notification after final action
- [ ] ContextualSectionHeader for 3+ step walkthroughs
