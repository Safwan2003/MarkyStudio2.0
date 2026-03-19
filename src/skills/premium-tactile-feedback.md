# premium-tactile-feedback

## Purpose
A behavioral trait skill — teaches any UI element to physically react to CURSOR_STATE. Produces the "hand-animated weight" seen in WhatAStory videos where cards tilt toward the cursor, buttons squish on click, and the background glows follow the mouse. Use this skill in ANY cursor-engine or chameleon-ui scene to add an extra layer of tactile realism.

## When to use
- Add to any scene that also uses `premium-cursor-engine` or `premium-chameleon-ui`
- When product cards, avatars, or feature tiles should feel "physical" and reactive
- When you want the glow bg to follow the cursor (ambient light effect)
- Works best on interactive-showcase scenes with 2–4 interactable elements

## Scope variables available
- `useCursorState(CURSOR_STEPS)` — derive `{ x, y, vx, vy, isClicking, speed }` per frame
- `useMagnetic(cursorX, cursorY, elementX, elementY, intensity, radius)` — tilt element toward cursor
- `useInteractionFeedback(clickFrame, direction)` — squish/nudge on click

## 1. Magnetic Pull Pattern

Elements tilt 2–4° toward cursor when within 150px. Creates "hand-animated weight."

```tsx
const { width, height } = useVideoConfig();
const cursorState = useCursorState(CURSOR_STEPS);
const cursorPxX = cursorState.x * width;
const cursorPxY = cursorState.y * height;

// For each card/element, know its center position in px
const CARD_X = width * 0.5;  // card center X
const CARD_Y = height * 0.45; // card center Y

const { rotateX, rotateY } = useMagnetic(cursorPxX, cursorPxY, CARD_X, CARD_Y, 1, 150);

<div style={{
  transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
  transformStyle: "preserve-3d",
  transition: "none", // let physics handle it — no CSS transition
}}>
  {/* card content */}
</div>
```

## 2. Squish on Click Pattern

On click: scaleY: 0.95, scaleX: 1.05 (physical press squish, not just uniform scale).

```tsx
// CLICK_FRAME: the frame when cursor arrives and clicks (step.time + 25)
const { scale, nudgeY, glowOpacity } = useInteractionFeedback(CLICK_FRAME, "down");

// Apply asymmetric squish: scaleX slightly expands while scaleY compresses
const squishX = 1 + (1 - scale) * 0.5;  // expands slightly horizontally
const squishY = scale;                    // compresses vertically

<div style={{
  transform: `scaleX(${squishX}) scaleY(${squishY}) translateY(${nudgeY}px)`,
}}>
  {/* button or card */}
</div>

{/* Click glow burst behind element */}
<div style={{
  position: "absolute", inset: -8, borderRadius: "inherit",
  background: BRAND.primary,
  filter: "blur(16px)",
  opacity: glowOpacity * 0.5,
  pointerEvents: "none",
}} />
```

## 3. Glow Trail Pattern

Background radial gradient follows CURSOR_STATE.x/y — ambient light tracks the cursor.

```tsx
const { width, height } = useVideoConfig();
const cursorState = useCursorState(CURSOR_STEPS);

// Smooth the cursor position so the glow lags slightly behind cursor (cinematic)
const glowX = cursorState.x * 100; // % position
const glowY = cursorState.y * 100;

<div style={{
  position: "absolute", inset: 0,
  background: `radial-gradient(circle 300px at ${glowX}% ${glowY}%, ${BRAND.primary}18 0%, transparent 70%)`,
  pointerEvents: "none",
  zIndex: 1,
}} />
```

## 4. Velocity Tilt Pattern

Element leans in the direction of cursor movement — amplifies the sense of motion.

```tsx
const cursorState = useCursorState(CURSOR_STEPS);

// Velocity-based tilt: vx/vy are px/frame
// Cap at ±3° to avoid wild rotations
const tiltY = Math.max(-3, Math.min(3, cursorState.vx * 0.015));
const tiltX = Math.max(-3, Math.min(3, -cursorState.vy * 0.015));

<div style={{
  transform: `perspective(600px) rotateY(${tiltY}deg) rotateX(${tiltX}deg)`,
}}>
  {/* cursor or fast-moving element */}
</div>
```

## Complete Scene Example

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cursorState = useCursorState(CURSOR_STEPS);
  const cursorPxX = cursorState.x * width;
  const cursorPxY = cursorState.y * height;

  // Card positions
  const cards = [
    { label: "Analytics", x: width * 0.3, y: height * 0.5, clickFrame: 55 },
    { label: "Reports",   x: width * 0.7, y: height * 0.5, clickFrame: 95 },
  ];

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Ambient cursor glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle 350px at ${cursorState.x * 100}% ${cursorState.y * 100}%, ${BRAND.primary}15 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {cards.map((card, i) => {
        const { rotateX, rotateY } = useMagnetic(cursorPxX, cursorPxY, card.x, card.y, 1, 150);
        const { scale, nudgeY, glowOpacity } = useInteractionFeedback(card.clickFrame, "down");
        const squishX = 1 + (1 - scale) * 0.5;

        return (
          <div key={i} style={{
            position: "absolute",
            left: card.x - 120, top: card.y - 80,
            width: 240, height: 160,
            transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scaleX(${squishX}) scaleY(${scale}) translateY(${nudgeY}px)`,
            transformStyle: "preserve-3d",
            ...getGlassCard(BRAND),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* Click glow */}
            <div style={{
              position: "absolute", inset: -4, borderRadius: 24,
              background: BRAND.primary, filter: "blur(20px)",
              opacity: glowOpacity * 0.45, pointerEvents: "none",
            }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: BRAND.text }}>{card.label}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
```

## Key Rules

- **Always use `useCursorState(CURSOR_STEPS)`** — not manual frame checks — so velocity is available
- **Max magnetic tilt: 8°** — beyond this feels broken, not responsive
- **Cap velocity tilt at 3°** — more = nauseating
- **Glow trail opacity: 0.15–0.25** — should feel ambient, not overwhelming
- **Layer order**: glow trail at zIndex:0, cards at zIndex:1, cursor at zIndex:10
