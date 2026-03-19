---
title: Timing & Sequencing
impact: HIGH
impactDescription: controls when elements appear and enables complex choreography
tags: sequence, series, timing, delay, choreography
---

## Sequence for Delayed Elements

Use Sequence to delay when an element appears in the timeline.

**Incorrect (manual frame checks):**

```tsx
{
  frame >= 30 && <Title />;
}
{
  frame >= 60 && <Subtitle />;
}
```

**Correct (Sequence component):**

```tsx
import { Sequence } from "remotion";

<Sequence from={30} durationInFrames={90}>
  <Title />
</Sequence>
<Sequence from={60} durationInFrames={60}>
  <Subtitle />
</Sequence>
```

## Series for Sequential Playback

Use Series when elements should play one after another without overlap.

```tsx
import { Series } from "remotion";

<Series>
  <Series.Sequence durationInFrames={45}>
    <Intro />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <MainContent />
  </Series.Sequence>
  <Series.Sequence durationInFrames={30}>
    <Outro />
  </Series.Sequence>
</Series>;
```

## Series with Offset for Overlap

Use negative offset for overlapping sequences:

```tsx
<Series>
  <Series.Sequence durationInFrames={60}>
    <SceneA />
  </Series.Sequence>
  <Series.Sequence offset={-15} durationInFrames={60}>
    {/* Starts 15 frames before SceneA ends */}
    <SceneB />
  </Series.Sequence>
</Series>
```

## Staggered Element Entrances

For staggered animations of multiple items, calculate delays:

**Incorrect (hardcoded delays):**

```tsx
const items = data.map((item, i) => {
  const delay = i === 0 ? 0 : i === 1 ? 10 : i === 2 ? 20 : 30;
  // ...
});
```

**Correct (calculated stagger):**

```tsx
const STAGGER_DELAY = 8;
const BASE_DELAY = 15;

const items = data.map((item, i) => {
  const delay = BASE_DELAY + i * STAGGER_DELAY;
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  return (
    <Item
      key={i}
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 20}px)`,
      }}
    />
  );
});
```

## Nested Sequences

Sequences can be nested for complex timing:

```tsx
<Sequence from={0} durationInFrames={120}>
  <Background />
  <Sequence from={15} durationInFrames={90}>
    <Title />
  </Sequence>
  <Sequence from={45} durationInFrames={60}>
    <Subtitle />
  </Sequence>
</Sequence>
```

## Frame References Inside Sequences

Inside a Sequence, useCurrentFrame() returns the local frame (starting from 0):

```tsx
<Sequence from={60} durationInFrames={30}>
  <MyComponent />
  {/* Inside MyComponent, useCurrentFrame() returns 0-29, not 60-89 */}
</Sequence>
```

## Per-Scene-Type Duration Defaults

Always use these frame counts as starting points (at 30fps):

| Scene type | Frames | Seconds | Notes |
|---|---|---|---|
| intro | 150 | 5s | Brand reveal, hook scene |
| section-title | 90 | 3s | Chapter break card |
| showcase | 210 | 7s | Product demo screen |
| features | 180 | 6s | Feature list/grid |
| social-proof | 150 | 5s | Trust scene |
| cta | 150 | 5s | Call-to-action finale |

## Hold Frames Before Transitions

After all animations complete, hold the final state for 20–30 frames before the cross-dissolve begins. This prevents the rushed feeling where elements are still animating when the transition starts.

```tsx
// Scene internally: animate over first 120–180 frames
// Hold at final state: frames 180–210
// Cross-dissolve begins: frame 210 (triggered by master composition)

// Example: animate cards at f:0–90, hold f:90–120 (no new animations)
const progress = spring({ frame: Math.min(frame, 90), fps, config: { damping: 200, stiffness: 120 } });
```

**Rule of thumb**: If your last animation completes at frame F, set `durationInFrames` to F + 30. The master composition adds HOLD_FRAMES (24) on top of that before starting the next scene's transition.

## Scene Pacing Pattern (Agency Standard)

For a 7-second showcase scene (210 frames):
- f:0–30 → Background + persistent elements appear
- f:0–80 → Main UI reconstruction staggers in (sidebar, topbar, cards, chart)
- f:80–110 → Cursor enters frame, springs to first target
- f:110–140 → First interaction (click + state change)
- f:140–180 → Second interaction or result state (toast, highlight)
- f:180–210 → Hold final state (no new animations — viewer absorbs the scene)

---

## Narrative Pacing — Emotional Intent Controls the Stagger

The `emotionalIntent` from the scene prompt changes how elements are sequenced and timed.
Read it from the prompt and adjust all timing accordingly:

### FRUSTRATION / PAIN scenes — chaotic, heavy

```tsx
// Stagger with RANDOM offsets — elements don't arrive at clean intervals
// This creates the "chaos" feeling
const NODES = [
  { delay: 5,  floatPhase: 0.0 },
  { delay: 22, floatPhase: 2.1 },  // uneven gaps: 17 frames
  { delay: 31, floatPhase: 1.4 },  // 9 frames — much shorter
  { delay: 48, floatPhase: 0.7 },  // 17 frames again
  { delay: 53, floatPhase: 3.2 },  // 5 frames — very fast
];
// Each element uses slow, heavy spring: { damping: 300, stiffness: 60 }
// Nothing is synchronized. Disorder IS the message.
```

### RELIEF / CONFIDENCE scenes — synchronized, clean

```tsx
// Stagger with EVEN, predictable intervals — elements arrive in formation
const STAGGER = 10; // exactly 10 frames each
const BASE = 20;

items.map((item, i) => ({
  ...item,
  delay: BASE + i * STAGGER, // 20, 30, 40, 50, 60 — clean, ordered
}));
// Each element uses smooth spring: { damping: 400, stiffness: 80 }
// Everything is synchronized. Order IS the message.
```

### URGENCY scenes — fast, compressed

```tsx
// Tight stagger: all elements arrive quickly (3–5 frames apart)
const STAGGER = 4;
const BASE = 8;
// Spring: { damping: 120, stiffness: 200 } — fast entrance, slight overshoot
// Total entrance window: 8 + (n * 4) frames — very compressed
```

### EXCITEMENT scenes — elastic, pop-in

```tsx
// Stagger: each element pops in with elastic spring
const STAGGER = 8;
const BASE = 5;
// Spring: { damping: 8, stiffness: 200 } — elastic pop, strong overshoot
// Each element visibly bounces past its final position before settling
```

---

## Scene Act Implementation

Every scene has 3 acts. Implement them with explicit frame gates:

```tsx
// At top of component — read act timing from scene prompt
const ACT_1_END = 50;     // setup phase ends
const ACT_2_END = 155;    // content phase ends
// ACT_3 = ACT_2_END → durationInFrames (hold phase)

// Act 1: ONE anchor element only
// Nothing else renders until ACT_1_END
{frame < ACT_1_END ? (
  // Only show: background + ONE anchor (section label, or main headline, or single icon)
  <HeadlineSectionLabel />
) : null}

// Act 2: Main content unfolds
{frame >= ACT_1_END && frame < ACT_2_END && (
  // All other elements, staggered from ACT_1_END
  // Stagger relative to ACT_1_END, not absolute frame 0
  <MainContent startFrame={ACT_1_END} />
)}

// Act 3: FREEZE. No new animations. Final state only.
// The resolve act is enforced by capping all spring frame inputs:
const safeFrame = Math.min(frame, ACT_2_END); // springs stop evolving after act 2
const cardSpring = spring({ frame: safeFrame - cardDelay, fps, config: {...} });
// After ACT_2_END: cardSpring is at its settled value forever — static hold
```

**The capped spring pattern is the key to WhatAStory's polished feel**. Every element reaches its final position and stays there. No floating, no pulsing, no drift in the resolve act (except a gentle CTA pulse).

---

## Problem Scene Timing Blueprint (180 frames / 6s)

```
f:0–15:   Background + aurora/atmosphere fades in
f:10–45:  First chaos element enters (large outline circle — problem node 1)
f:20–55:  Second chaos element (irregular gap — chaos feel)
f:33–65:  Third element
f:40–72:  Fourth element (pill with label: "Manual Process")
f:55–85:  Path starts drawing (dotted SVG — connecting the chaos)
f:60–95:  Headline enters top-left: "The chaos is costing you." (96px, weight 900)
f:75–100: Sub-line: "12 hours/week per person — just in reporting"
f:90–130: Path completes, traveling dot reaches end
f:130–180: HOLD. Nothing new. The chaos is visible. The cost is readable.
```

## Solution / AHA Scene Timing Blueprint (210 frames / 7s)

```
f:0–20:   Dark to light transition — background shifts (match cut from problem)
f:15–50:  Product UI enters cleanly (single smooth slide-up)
f:40–70:  AHA headline enters: "Done. Automatically." (120px, weight 900, BRAND.primary accent)
f:60–85:  Sub-line enters: "MarkyStudio handles the rest"
f:70–140: Cursor interaction / key transformation happens
f:140–170: Success state (checkmark / green / toast)
f:170–210: HOLD — viewer absorbs the transformation. Minimum 40 frames.
           The headline stays. The success state is visible. This is the payoff.
```

## CTA Scene Timing Blueprint (150 frames / 5s)

```
f:0–15:   Background enters (CTA skill's own atmosphere)
f:10–35:  Hero headline pops in (120–160px, 3–5 words, gradient text)
f:30–60:  CTA button springs in (elastic: damping:8, stiffness:200)
f:50–90:  URL types in character by character
f:60–90:  Supporting sub-line fades in
f:90–150: HOLD — button pulse only (scale: 1.0 → 1.02 → 1.0, 60-frame loop)
          Everything else is static. The CTA is the only thing that moves.
```

---

## WhatAStory Composition Standard (MANDATORY FOR ALL SCENES)

These rules apply globally — every scene must satisfy all of them. They define the "agency-grade" quality bar observed across Screenjar, Qanapi, Fronter, Pretaa, Viable, and Bordio reference videos.

### 1. The 3-Layer Text Stack

Every scene with text MUST have this exact 3-level hierarchy:

```tsx
// Layer 1 — Section Label (z:20) — uppercase, brand.primary, tracked out
<div style={{
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: BRAND.primary,
  fontFamily: BRAND.font + ", sans-serif",
  opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateRight: "clamp" }),
  marginBottom: 16,
}}>
  THE PROBLEM  {/* or: THE SOLUTION / FEATURES / RESULTS */}
</div>

// Layer 2 — Outcome Headline (z:20) — 96–128px, weight 900, outcome-focused
// MANDATORY: wrap in MaskedReveal — NEVER use opacity fade alone
<MaskedReveal startFrame={20}>
  <div style={{
    fontSize: 108,
    fontWeight: 900,
    lineHeight: 1.0,
    letterSpacing: "-0.04em",
    color: BRAND.text,
    fontFamily: BRAND.font + ", sans-serif",
  }}>
    Done in seconds.
  </div>
</MaskedReveal>

// Layer 3 — Sub-line (z:20) — 22–28px, muted, contextual
<div style={{
  fontSize: 24,
  fontWeight: 400,
  color: BRAND.textMuted,
  lineHeight: 1.5,
  fontFamily: BRAND.font + ", sans-serif",
  maxWidth: 520,
  opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" }),
  transform: `translateY(${interpolate(frame, [40, 55], [12, 0], { extrapolateRight: "clamp" })}px)`,
  marginTop: 20,
}}>
  No manual steps. No exports. No waiting.
</div>
```

**Rules:**
- Section Label is ALWAYS present — even if short ("HOOK", "RESULTS", "GET STARTED")
- Headline NEVER uses opacity fade alone — always MaskedReveal
- Sub-line font size NEVER above 32px — it supports, not competes with headline
- All 3 layers appear at different frames: label f:8, headline f:20, sub-line f:40

---

### 2. Compositional Padding Standard

Reference videos use **15–20% margin** on all sides. Elements are never cramped against frame edges.

```tsx
// Minimum safe zones — never place content outside these bounds
const SAFE_LEFT   = width  * 0.14;   // 14% from left
const SAFE_RIGHT  = width  * 0.86;   // 86% from left (14% margin right)
const SAFE_TOP    = height * 0.12;   // 12% from top
const SAFE_BOTTOM = height * 0.88;   // 88% from top (12% margin bottom)

// Content padding rule: 80px minimum, 120px preferred for hero layouts
const CONTENT_PAD = 120;

// Text column width for split layouts: never wider than 42% of frame
const TEXT_COLUMN_MAX = width * 0.42;
```

---

### 3. Split-Screen Layout Rule (Showcase Scenes)

When a scene shows UI + explanatory text simultaneously:

```tsx
// Text occupies LEFT 40% — UI occupies RIGHT 60%
// UI gets slight 3D tilt (perspective + rotateY) for depth

// Text block — left side
<div style={{
  position: "absolute",
  left: CONTENT_PAD,
  top: "50%",
  transform: "translateY(-50%)",
  width: width * 0.38,
}}>
  {/* 3-layer text stack here */}
</div>

// UI block — right side, with 3D tilt
<div style={{
  position: "absolute",
  right: 0,
  top: "50%",
  transform: `translateY(-50%) perspective(1200px) rotateY(-8deg) rotateX(2deg) scale(${uiScale})`,
  transformOrigin: "right center",
  width: width * 0.58,
}}>
  {/* product screenshot or reconstructed UI */}
</div>
```

The `rotateY(-8deg)` tilt is the WhatAStory signature. It implies depth and makes the UI feel physical. Keep tilt between -6° and -10° — more than 12° looks distorted.

---

### 4. Entropy Dust Background (ALL Dark-Theme Scenes)

Every dark-theme scene must have 15–20 background dust particles at `zIndex: 5`. These are slow-drifting tiny bokeh dots that make the background feel "alive" without being distracting.

```tsx
// OUTSIDE component — stable reference
const DUST_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: random(`dust-x-${i}`) * 0.92 + 0.04,
  y: random(`dust-y-${i}`) * 0.92 + 0.04,
  size: random(`dust-s-${i}`) * 3 + 1.5,     // 1.5–4.5px
  speed: random(`dust-sp-${i}`) * 0.4 + 0.2, // slow
  phase: random(`dust-p-${i}`) * Math.PI * 2,
  opacity: random(`dust-o-${i}`) * 0.25 + 0.05, // 0.05–0.30
}));

// INSIDE component render
{DUST_PARTICLES.map((p, i) => (
  <div
    key={i}
    style={{
      position: "absolute",
      left: p.x * width + Math.sin(frame * p.speed * 0.03 + p.phase) * 12,
      top:  p.y * height + Math.cos(frame * p.speed * 0.025 + p.phase) * 8,
      width: p.size,
      height: p.size,
      borderRadius: "50%",
      background: BRAND.primary,
      opacity: p.opacity,
      zIndex: 1,
      filter: `blur(${p.size * 0.6}px)`,
      pointerEvents: "none",
    }}
  />
))}
```

**Why:** These micro-particles are visible in every Screenjar, Viable, and Pretaa scene. They signal studio-quality — their absence makes dark scenes feel "dead." 15–20 particles at 5% opacity is imperceptible individually but transforms the atmosphere.

---

### 5. Cinematic Camera Wrapper (ALL Scenes with UI Content)

Wrap all product UI content in a slow-zoom `CinematicCamera` — the signature polish of Fronter and Bordio. The zoom is barely perceptible (1.0 → 1.06) but adds unmistakable depth.

```tsx
// Target: the most important element in the scene
// For cursor scenes: use first waypoint x/y
// For UI scenes: use UI center (0.5, 0.5) or slightly above center (0.5, 0.42)
<CinematicCamera targetX={0.5} targetY={0.42} zoomTo={1.06}>
  {/* All UI content, screenshots, overlays */}
  {/* Do NOT put cursor inside — cursor stays outside at z:100 */}
</CinematicCamera>
```

Use `zoomTo: 1.06` for calm scenes (TRUST, RELIEF, CONFIDENCE).
Use `zoomTo: 1.10` for energetic scenes (URGENCY, EXCITEMENT, AHA).
Never exceed `zoomTo: 1.15` — it becomes nausea-inducing.

---

### 6. Hand Cursor Standard (ALL Cursor/Demo Scenes)

Reference videos universally use a **hand cursor** (pointing finger), not the standard arrow. This is non-negotiable for scenes with the `premium-cursor-engine` or `premium-chameleon-ui` skill.

**Every cursor scene must:**
- Use `premium-hand-cursor` SVG (pointing finger with squeeze click animation)
- Have a `CursorAnnotationPill` during travel phases (not just on arrival)
- Use 22-frame travel duration (snappier than 25)
- Include a 10-frame dwell with micro-jitter before clicking

```tsx
// Hand cursor SVG — use this, not the arrow
const HAND_CURSOR = (
  <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
    <path d="M10 30 C10 33 12 35 15 35 L22 35 C26 35 28 32 28 29 L28 18 C28 16 27 15 25 15 L24 15 L24 10 C24 8 23 7 21 7 C19 7 18 8 18 10 L18 15 L16 15 L16 6 C16 4 15 3 13 3 C11 3 10 4 10 6 L10 15 C9 15 8 16 8 18 L8 24 Z" fill="white" stroke="#1e293b" strokeWidth="1.2"/>
    <path d="M10 18 L10 24" stroke="#1e293b" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

// Click squeeze: scale from 1 → 0.88 on click, spring back
const CLICK_SQUEEZE = isClicking
  ? interpolate(framesAfterArrival, [0, 5, 14], [1, 0.88, 1])
  : 1;

// Micro-jitter during dwell (10 frames before click)
const DWELL_START = currentStep.time + TRAVEL;
const isDwelling = frame >= DWELL_START && frame < DWELL_START + 10;
const jitterX = isDwelling ? Math.sin(frame * 1.8) * 1.2 : 0;
const jitterY = isDwelling ? Math.cos(frame * 2.1) * 0.8 : 0;
```

---

### 7. useVitality — Organic Life After Entrance

After elements enter the scene, they must not be frozen. Use `useVitality` to keep scenes alive during the hold phase.

**Available modes:**

| mode | motion | use on |
|---|---|---|
| `"bounce"` | Periodic Y dip + spring up (~1.5s interval) | Avatars, icons, notification badges |
| `"breathe"` | Sinusoidal scale ±1.5% | Inactive cards, background panels |
| `"float"` | Gentle Y sine drift ±4px | Orbiting pills, decorative blobs |
| `"pulse"` | Opacity 0.7→1.0 sine flicker | Status dots, badge pings, live indicators |

**Usage pattern — avatar row:**
```jsx
{avatars.map((a, i) => {
  const { y } = useVitality({ mode: "bounce", index: i, interval: 90 });
  return <div key={i} style={{ transform: `translateY(${y}px)` }}>{a}</div>;
})}
```

**Usage pattern — inactive cards breathing while active card is highlighted:**
```jsx
{cards.map((c, i) => {
  const isActive = i === activeIndex;
  const { scale } = useVitality({ mode: "breathe", index: i, speed: isActive ? 0 : 0.8 });
  return <div key={i} style={{ transform: `scale(${scale})`, outline: isActive ? `2px solid ${BRAND.primary}` : "none" }}>{c}</div>;
})}
```

**Rules:**
- ALWAYS add vitality to scenes with 3+ frame-hold avatars
- Use `index` parameter to stagger phase — never pass the same index to two elements
- `speed: 0` disables breathing (use on the "active" card that has other animation)
- Combine with entropy dust — vitality handles foreground elements, entropy handles background particles

### 8. Beat-Driven Choreography

Every generated video has a music track with a known BPM. Use `MUSIC_BPM` (injected scope variable) to align entrances and transitions to musical downbeats rather than arbitrary frame numbers.

**Available tools:**

| Symbol | Type | Description |
|---|---|---|
| `MUSIC_BPM` | number | BPM of the current track (90 corp, 128 energetic, 80 cinematic, 68 calm, 110 playful) |
| `useBeat()` | hook | 0–1 pulse value that peaks on each beat. Auto-reads `MUSIC_BPM` if no arg |
| `useBeatClock()` | hook | Returns `{ beat, bar, beatProgress, barProgress, isDownbeat }` |
| `snapToDownbeat(approxFrame, MUSIC_BPM, fps)` | function | Rounds frame up to next bar start (beat 1) |

**Pattern 1 — entrance on next downbeat after warm-up:**
```jsx
const { fps } = useVideoConfig();
const BEAT = fps * 60 / MUSIC_BPM;           // frames per beat
const enterFrame = snapToDownbeat(18, MUSIC_BPM, fps);  // first bar start ≥ frame 18
const bodyStart  = enterFrame + BEAT * 4;    // one bar later
const ctaStart   = bodyStart + BEAT * 4;     // two bars in
const prog = spring({ frame: frame - enterFrame, fps, config: SPRING_CONFIGS.entrance });
```

**Pattern 2 — pulse element on every beat:**
```jsx
const beat = useBeat();  // auto-reads MUSIC_BPM
<div style={{ transform: `scale(${1 + beat * 0.05})`, filter: `brightness(${1 + beat * 0.15})` }}>
  {headline}
</div>
```

**Pattern 3 — flash accent on bar downbeat only:**
```jsx
const { isDownbeat } = useBeatClock();  // auto-reads MUSIC_BPM
<div style={{ boxShadow: isDownbeat ? `0 0 24px ${BRAND.primary}` : "none" }}>...</div>
```

**Rules:**
- Use `snapToDownbeat` for first entrance frame — never hardcode `frame - 20` if a downbeat is available nearby
- Use `useBeat()` (no args) — it auto-reads `MUSIC_BPM` from scope
- Entrance stagger within a bar: space elements `BEAT / 2` frames apart (half-beat = tight but musical)
- Do NOT force every element onto a downbeat — only 1–2 key elements per scene should be beat-locked; the rest can follow freely

### 9. ZoomThrough Match Cut — Spatial Scene Continuity

The most cinematic transition type. The camera zooms INTO a UI coordinate at the end of Scene N, and zooms OUT from the same area at the start of Scene N+1. Fakes a continuous world without a shared coordinate system — pure CSS `scale` + `transformOrigin` trick.

**When to use:**
- Cursor ends on a CTA button → next scene shows the product "after" that click
- Problem scene ends zoomed on the pain point → solution scene zooms out from the fix
- Demo ends on a specific feature card → next scene dives into that feature

**Planner fields (set on BOTH scenes):**
```json
// Scene N (the zooming-out scene):
{
  "exitAnchor": { "x": 0.62, "y": 0.48 }
}
// Scene N+1 (the receiving scene):
{
  "transition": "zoomThrough"
}
```

`exitAnchor` x/y = normalized 0–1 center of the element being zoomed into. If Scene N has cursor waypoints, use the last waypoint's x/y directly.

**Rules:**
- Max 2 zoomThrough cuts per video
- Scene N's `exitAnchor` drives the zoom-in transform origin — match it to the cursor's last click or the dominant UI element
- Scene N+1's content must be visible at frame 0 (do NOT fly primary content in from off-screen — the zoom-out handles the entrance energy)
- Supporting elements (labels, badges) may spring in from frame 15+ as normal

**What the renderer does automatically:**
- Scene N: at exit window, `scale(1→10)` with `transformOrigin = exitAnchor.x% exitAnchor.y%`
- Scene N+1: at entrance, `scale(10→1)` from center — the portal "opens up" to reveal context
- No opacity change on either — pure zoom, no fade

### 10. Global Quality Anti-Patterns

**NEVER do these — they are the most common reasons generated scenes look "cheap":**

| Anti-Pattern | What it looks like | Fix |
|---|---|---|
| Headline opacity fade | Text fades in without movement | Use MaskedReveal — always |
| Same enter frame for all siblings | Elements pop in together | useStagger with min 8-frame gap |
| Hardcoded hex colors | Scene ignores brand | All colors via BRAND.* tokens |
| Standard arrow cursor | Robotic, impersonal | Use hand cursor SVG |
| No section label | Text floats without context | Always add 3-layer text stack |
| Static dark background | Scene feels dead | Add entropy dust (18 particles) |
| Centered text only (no split) | Boring, no depth | Use split layout for showcase scenes |
| Spring completes but scene continues | Elements drift/float forever | Cap spring input at act 2 end |
| Font size under 80px for hero | Hard to read, looks like body text | 96–128px for hero headlines |
| More than 3 elements entering simultaneously | Visual noise | Strict stagger — 1 element at a time |
| Avatars/cards are completely frozen after entering | Scene feels static mid-hold | Apply useVitality — bounce on avatars, breathe on cards |
| Literal dashboard panel in non-cursor scene | Cluttered, unreadable | Use ChunkCard + SkeletonTextBlock instead |
| Flat stagger when elements have parent-child hierarchy | Feels mechanical | Use useCascadeTree — card enters, then badge pops 4f later |
| CinematicCamera on cursor demo scenes | Camera fights the cursor | Use SteppedCamera: whip → hold → drift |
| Text headline pinned flat in spatial scene | Text floats disconnected from 3D | Use InWorldText at appropriate depth |

### 11. Agency-Tier Motion Systems

#### useCascadeTree — Hierarchical Micro-Choreography

Replace flat `useStagger` with `useCascadeTree` when elements have **parent-child relationships**. This is what makes agency videos feel like each element "births" the next.

```tsx
const cascade = useCascadeTree([
  { id: "card", frame: 20, children: [
    { id: "header", delay: 4, children: [
      { id: "badge", delay: 6, config: SPRING_CONFIGS.pop },
    ]},
    { id: "body", delay: 8 },
    { id: "cta",  delay: 14 },
  ]},
]);

// Each element driven by its cascade progress
<div style={{ opacity: cascade.get("card"), transform: `scale(${0.92 + cascade.get("card") * 0.08})` }}>
  <div style={{ opacity: cascade.get("header") }}>Title</div>
  <div style={{ opacity: cascade.get("badge"), transform: `scale(${cascade.get("badge")})` }}>🔔</div>
  <div style={{ opacity: cascade.get("body") }}><SkeletonTextBlock lines={2} startFrame={cascade.getFrame("body")} /></div>
</div>
```

**Rules:**
- Use flat `useStagger` for homogeneous siblings (list items, avatar rows)
- Use `useCascadeTree` when child B only makes sense after parent A appears
- Max nesting depth: 3 levels

#### SteppedCamera — Whip-Pan + Hard Hold

Replaces `CinematicCamera` for **cursor demo and showcase scenes**. Gives the "human camera operator" feel.

```tsx
// Pattern: snap to feature → hold so viewer reads UI → drift → whip back
<SteppedCamera keyframes={[
  { frame: 0,   x: 0.5,  y: 0.5,  zoom: 1.0,  easing: "ease"  },
  { frame: 20,  x: 0.62, y: 0.44, zoom: 1.18, easing: "whip", duration: 14 },
  { frame: 34,  x: 0.62, y: 0.44, zoom: 1.18, easing: "hold" },  // hard freeze
  { frame: 90,  x: 0.60, y: 0.47, zoom: 1.14, easing: "drift" }, // slight drift
  { frame: 130, x: 0.5,  y: 0.5,  zoom: 1.0,  easing: "whip", duration: 12 },
]}>
  <AppShell ... />
</SteppedCamera>
<CursorRenderer ... />  {/* ALWAYS outside SteppedCamera */}
```

**Easing reference:**
- `"whip"` — easeOutExpo, 15f default — urgent snap-to
- `"ease"` — easeOutCubic, 20f default — standard move
- `"hold"` — instant cut, 1f — hard freeze at current keyframe
- `"drift"` — linear, 60f — slow documentary drift

**Rules:**
- Always keep cursor/annotation layers OUTSIDE `<SteppedCamera>`
- Hard `"hold"` keyframe = viewer reads the UI — always provide at least 30f hold after a `"whip"`
- Max zoom 1.25 before composition clips

#### InWorldText — Typography in 3D Space

Use when text is a **prop in the scene** (floating stat, ambient label) rather than a primary headline.

```tsx
// Floating metric that lives at mid-depth, scales with camera push-in
<InWorldText depth={0.65} attach={{ x: 0.60, y: 0.42 }} cameraProgress={zoomProg}>
  <MaskedReveal startFrame={25}>
    <div style={{ fontSize: 56, fontWeight: 900, color: "#fff" }}>+124%</div>
  </MaskedReveal>
</InWorldText>

// Ghost label behind glass card (barely visible — adds depth context)
<InWorldText depth={0.15} attach={{ x: 0.28, y: 0.62 }}>
  <div style={{ fontSize: 32, opacity: 0.2, color: "#fff", fontWeight: 700 }}>Revenue</div>
</InWorldText>
```

**depth scale reference:** 0 = 0.55× scale (deep bg), 0.5 = 1.0× scale (neutral), 1 = 1.45× scale (foreground)

#### ChunkCard + SkeletonTextBlock — Stylized "Toy UI"

For non-cursor scenes where the UI is **context, not the demo**. Renders abstract oversized cards instead of literal reconstructed dashboards.

```tsx
// Problem scene: chunky cards to establish context (NOT a cursor demo)
<ChunkCard title="Monthly Churn" metric="18%" trend="up" brand={BRAND} startFrame={20} width={280} height={160} />
<ChunkCard title="Tickets Resolved" metric="847" trend="down" brand={BRAND} startFrame={28} width={280} height={160} />

// Replace unreadable paragraphs with skeleton bars
<SkeletonTextBlock lines={3} color={BRAND.primary} startFrame={30} />
```

**Rule:** If a scene does not have a cursor interaction with the UI, use `ChunkCard` instead of `ReconstructedAppShell`. Only render literal legible UI for the exact feature being demoed.

#### useTrackedParallax — Live-Action Composite Sway

For scenes with real video/photo backgrounds, simulates camera tracking parallax so UI overlays feel spatially "pinned" to the world.

```tsx
// Foreground panel drifts more than background card (depth = depth layer 0–1)
const panelSway = useTrackedParallax(0.75);
const bgSway    = useTrackedParallax(0.25);

<div style={{ transform: `translate(${bgSway.x}px, ${bgSway.y}px)` }}>
  <AnimatedMetricCards ... />
</div>
<div style={{ transform: `translate(${panelSway.x}px, ${panelSway.y}px)` }}>
  <ContentCard brand={BRAND}><AppShell .../></ContentCard>
</div>
```

