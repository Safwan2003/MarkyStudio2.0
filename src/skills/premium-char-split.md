---
title: Premium Character-Split Kinetic Typography
impact: HIGH
impactDescription: character-level and word-level text reveals — each letter rotates 90° and pushes up from a hidden bounding box, the After Effects "type on" technique in pure React
tags: kinetic-text, typography, character-split, letter-animation, word-split, text-reveal, push-up, masking, animated-text, headline
---

## Character-Split Pattern Overview

Three escalating techniques:
1. **Word-split stagger** — words slide up from a masked container (simplest, most reliable)
2. **Character-split with rotation** — each char rotates 90° and pushes up (AE "type on" standard)
3. **Mixed: word-stagger + char-highlight** — word stagger with per-char color reveal

All require splitting text into arrays and mapping with frame offsets.

---

## Word-Split Stagger (Recommended Starting Point)

Each word slides up from behind an invisible "slot". The slot clips the animation:

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

function WordReveal({
  text,
  startFrame = 0,
  staggerFrames = 6,
  style = {},
}: {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  style?: React.CSSProperties;
}) {
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.28em", ...style }}>
      {words.map((word, i) => {
        const wordFrame = frame - startFrame - i * staggerFrames;
        const entrance = spring({
          frame: wordFrame,
          fps,
          config: { damping: 14, stiffness: 120 },
        });
        const translateY = interpolate(entrance, [0, 1], [40, 0]);
        const opacity = interpolate(entrance, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

        return (
          // Overflow-hidden slot clips the word rising up
          <div key={i} style={{ overflow: "hidden", display: "inline-block" }}>
            <div style={{
              transform: `translateY(${translateY}px)`,
              opacity,
              display: "inline-block",
              whiteSpace: "nowrap",
            }}>
              {word}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Usage:
// <WordReveal text="Ship products faster than ever" startFrame={10} staggerFrames={5} style={{ fontSize: 64, fontWeight: 900, color: "white" }} />
```

---

## Character-Split with 90° Rotation (After Effects Technique)

Each character rotates from 90° (lying flat) to 0° (upright) while translating up from the slot. The `overflow: "hidden"` on the slot makes the rotation appear to push through a floor:

```tsx
function CharReveal({
  text,
  startFrame = 0,
  staggerFrames = 3,
  style = {},
}: {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  style?: React.CSSProperties;
}) {
  const chars = text.split("");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", ...style }}>
      {chars.map((char, i) => {
        if (char === " ") {
          return <span key={i} style={{ display: "inline-block", width: "0.3em" }} />;
        }

        const charFrame = frame - startFrame - i * staggerFrames;
        const entrance = spring({
          frame: charFrame,
          fps,
          config: { damping: 12, stiffness: 130 },  // slight overshoot for snap
        });
        const rotateX  = interpolate(entrance, [0, 1], [90, 0]);
        const translateY = interpolate(entrance, [0, 1], [30, 0]);
        const opacity  = interpolate(entrance, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

        return (
          // Slot clips the 3D rotation
          <div key={i} style={{
            overflow: "hidden",
            display: "inline-block",
            // Extra height headroom for the rotation arc
            paddingTop: "0.15em",
          }}>
            <div style={{
              display: "inline-block",
              transform: `rotateX(${rotateX}deg) translateY(${translateY}px)`,
              transformOrigin: "bottom center",
              opacity,
              // Perspective on parent makes rotateX look 3D
            }}>
              {char}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Wrap the parent with `perspective` for the 3D effect:**

```tsx
<div style={{ perspective: 600, perspectiveOrigin: "50% 100%" }}>
  <CharReveal
    text="The Future"
    startFrame={0}
    staggerFrames={2}
    style={{ fontSize: 96, fontWeight: 900, color: "white", fontFamily: "Inter, sans-serif" }}
  />
</div>
```

---

## Multi-Line Headline with Line-by-Line Reveal

For two-line hero headlines, stagger each line independently:

```tsx
const LINES = [
  { text: "Close deals", startFrame: 0 },
  { text: "in half the time.", startFrame: 12 },
];

<div style={{
  display: "flex", flexDirection: "column",
  alignItems: "center", gap: "0.08em",
  fontFamily: "Inter, sans-serif",
  fontSize: 80, fontWeight: 900, color: "white",
  lineHeight: 1.05,
  perspective: 700,
}}>
  {LINES.map((line, i) => (
    <WordReveal
      key={i}
      text={line.text}
      startFrame={line.startFrame}
      staggerFrames={5}
    />
  ))}
</div>
```

---

## Per-Character Color Reveal

Highlight text by having each character change color as it enters — brand color → white:

```tsx
function ColorCharReveal({
  text,
  startFrame = 0,
  staggerFrames = 4,
  accentColor = "#6366f1",
  baseColor = "white",
  style = {},
}: {
  text: string; startFrame?: number; staggerFrames?: number;
  accentColor?: string; baseColor?: string; style?: React.CSSProperties;
}) {
  const chars = text.split("");

  return (
    <div style={{ display: "flex", ...style }}>
      {chars.map((char, i) => {
        if (char === " ") return <span key={i} style={{ width: "0.28em", display: "inline-block" }} />;

        const charFrame = frame - startFrame - i * staggerFrames;
        const entrance = spring({ frame: charFrame, fps, config: { damping: 14, stiffness: 120 } });

        // Color transitions from accent → base over the entrance
        const colorT = interpolate(entrance, [0, 0.6, 1], [0, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        // Simple lerp between two hex colors via opacity trick
        const translateY = interpolate(entrance, [0, 1], [28, 0]);
        const opacity = interpolate(entrance, [0, 0.25], [0, 1], { extrapolateRight: "clamp" });

        return (
          <div key={i} style={{ overflow: "hidden", display: "inline-block" }}>
            <div style={{
              display: "inline-block",
              transform: `translateY(${translateY}px)`,
              opacity,
              position: "relative",
            }}>
              {/* Base color layer */}
              <span style={{ color: baseColor }}>{char}</span>
              {/* Accent color overlay — fades out as char settles */}
              <span style={{
                position: "absolute", left: 0, top: 0,
                color: accentColor,
                opacity: 1 - colorT,
                pointerEvents: "none",
              }}>{char}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Countdown + Scramble Effect (Number/Character Scramble)

Characters randomly cycle through ASCII before settling on the real letter — "hacker/reveal" effect:

```tsx
function ScrambleReveal({
  text,
  startFrame = 0,
  settleDuration = 40,
}: {
  text: string; startFrame?: number; settleDuration?: number;
}) {
  const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  const chars = text.toUpperCase().split("");

  return (
    <div style={{ display: "flex", fontFamily: "monospace", fontSize: 64, fontWeight: 700, color: "white" }}>
      {chars.map((realChar, i) => {
        if (realChar === " ") return <span key={i} style={{ width: "0.5em" }} />;

        // Each char settles at a staggered time
        const settleAt = startFrame + i * 4 + settleDuration;
        const isSettled = frame >= settleAt;

        // During scramble: pick random char from CHARSET based on frame seed
        const scrambleSeed = Math.floor(frame * 7 + i * 13) % CHARSET.length;
        const displayChar = isSettled
          ? realChar
          : (frame >= startFrame + i * 4 ? CHARSET[scrambleSeed] : "_");

        return (
          <span key={i} style={{
            color: isSettled ? "white" : "rgba(99,102,241,0.8)",
            transition: "color 0.1s",
          }}>
            {displayChar}
          </span>
        );
      })}
    </div>
  );
}
```

---

## Key Rules

- **`overflow: "hidden"` on the slot is mandatory** — without it, the translateY animation is visible before the reveal, ruining the effect
- **`staggerFrames: 3–6`** for characters, **5–8** for words — faster than 3 chars/frame looks like a blur; slower than 8 words/frame feels sluggish
- **`perspective: 600–800`** on the parent container for `rotateX` — without it, the rotation looks flat/2D
- **`transformOrigin: "bottom center"`** on the char — rotation pivots from the baseline, not the center, so the letter pushes up through the slot floor
- **Never use `white-space: nowrap` on the slot itself** — only on the content inside; slots can wrap as needed
- **`fontVariantNumeric: "tabular-nums"`** when mixing numbers in a scramble or counter — prevents layout shift
- **Limit character splits to headlines ≤40 chars** — beyond that, the stagger duration becomes too long and the animation loses energy
