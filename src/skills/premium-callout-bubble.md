---
title: Premium Callout Bubble (Annotation Card)
impact: HIGH
impactDescription: floating comment/annotation card that slides up near the cursor with avatar, message text, and optional CTA button — the signature "someone's commenting in real-time" effect seen in Fronter, Figma, and Notion demos
tags: callout, annotation, comment, bubble, cursor, popup, card, collaboration, ui-demo
---

## Callout Bubble Pattern

A floating white card that "pops up" near the cursor when it hovers or clicks a UI element. Used to show real-time collaboration (comments, feedback, suggestions) as part of a product demo. Two sub-variants:

1. **Comment card** — avatar + username + typed message + action button (Fronter showcase)
2. **Simple tooltip card** — icon + short label (lighter, for quick annotations)

---

## Comment Card Variant (Full)

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

// Trigger position: where the cursor is when the card appears
// Card floats ABOVE and to the right of the cursor
const CARD_APPEAR_FRAME = 40; // when to show the card (after cursor arrives)
const CARD_X = 0.52;          // fraction of width
const CARD_Y = 0.38;          // fraction of height (card top-left anchor)

export const CalloutBubbleScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cardProgress = spring({
    frame: frame - CARD_APPEAR_FRAME,
    fps,
    config: { damping: 20, stiffness: 140 },
    durationInFrames: 22,
  });

  const cardOpacity   = interpolate(cardProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  const cardTranslateY = interpolate(cardProgress, [0, 1], [24, 0]);
  const cardScale      = interpolate(cardProgress, [0, 1], [0.92, 1]);

  // Blue selection outline on the targeted element
  // Define the element the cursor is pointing at (fractions of video size)
  const TARGET = { x: 0.08, y: 0.20, w: 0.38, h: 0.08 };
  const outlineOpacity = frame >= CARD_APPEAR_FRAME - 10
    ? interpolate(frame - (CARD_APPEAR_FRAME - 10), [0, 12, 60, 80], [0, 0.8, 0.6, 0.4], { extrapolateRight: "clamp" })
    : 0;

  // Typing animation for message text
  const FULL_MESSAGE = "@Jennykim Please reduce this title's font size to 16";
  const typeFrame = Math.max(0, frame - (CARD_APPEAR_FRAME + 15));
  const charsToShow = Math.min(FULL_MESSAGE.length, Math.floor(typeFrame * 1.8));
  const displayedMessage = FULL_MESSAGE.slice(0, charsToShow);

  if (frame < CARD_APPEAR_FRAME) return null;

  const cardLeft = CARD_X * width;
  const cardTop  = CARD_Y * height;
  const cardWidth = Math.min(380, width * 0.42);

  return (
    <>
      {/* Blue pulsing selection outline on target element */}
      {outlineOpacity > 0 && (
        <div style={{
          position: "absolute",
          left: TARGET.x * width - 4,
          top:  TARGET.y * height - 4,
          width:  TARGET.w * width + 8,
          height: TARGET.h * height + 8,
          border: "2.5px solid #3b82f6",
          borderRadius: 6,
          boxShadow: "0 0 0 4px rgba(59,130,246,0.15)",
          opacity: outlineOpacity,
          pointerEvents: "none",
          zIndex: 50,
        }} />
      )}

      {/* Comment card */}
      <div style={{
        position: "absolute",
        left: cardLeft,
        top:  cardTop,
        width: cardWidth,
        opacity: cardOpacity,
        transform: `translateY(${cardTranslateY}px) scale(${cardScale})`,
        transformOrigin: "left top",
        zIndex: 80,
        pointerEvents: "none",
      }}>
        <div style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
          padding: "16px 18px",
          fontFamily: "Inter, sans-serif",
        }}>
          {/* Header: "New comment" label */}
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 8, letterSpacing: 0.3 }}>
            New comment
          </div>

          {/* User row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {/* Avatar circle */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0,
            }}>
              E
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
              Eric Johanson
            </div>
          </div>

          {/* Message with mention highlight */}
          <div style={{
            fontSize: 13,
            color: "#334155",
            lineHeight: 1.5,
            minHeight: 36,
          }}>
            <span style={{ color: "#6366f1", fontWeight: 600 }}>@Jennykim</span>
            {" "}
            {displayedMessage.slice(9) /* skip the @Jennykim we rendered above */}
            {/* Blinking cursor at end while typing */}
            {charsToShow < FULL_MESSAGE.length && (
              <span style={{
                display: "inline-block",
                width: 2, height: 14,
                background: "#6366f1",
                marginLeft: 1,
                verticalAlign: "middle",
                opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
              }} />
            )}
          </div>

          {/* CTA Button */}
          <div style={{
            marginTop: 14,
            background: BRAND.primary || "#6366f1",
            color: "white",
            borderRadius: 8,
            padding: "9px 0",
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            opacity: charsToShow >= FULL_MESSAGE.length
              ? interpolate(frame - (CARD_APPEAR_FRAME + 30), [0, 10], [0, 1], { extrapolateRight: "clamp" })
              : 0,
          }}>
            Add comment
          </div>
        </div>

        {/* Connector dot pointing toward the target element */}
        <div style={{
          position: "absolute",
          top: -6, left: 24,
          width: 12, height: 12,
          borderRadius: "50%",
          background: BRAND.primary || "#6366f1",
          boxShadow: `0 0 0 3px rgba(99,102,241,0.2)`,
        }} />
      </div>
    </>
  );
};
```

---

## Simple Annotation Tooltip Variant

For lightweight quick annotations — just icon + text, no avatar or CTA:

```tsx
const ANNOTATION_STEPS = [
  { x: 0.30, y: 0.22, label: "Click to open project", icon: "👆", frame: 30 },
  { x: 0.65, y: 0.48, label: "Drag to reorder cards",  icon: "↕️", frame: 90 },
];

{ANNOTATION_STEPS.map((ann, i) => {
  if (frame < ann.frame) return null;
  const prog = spring({ frame: frame - ann.frame, fps, config: { damping: 22, stiffness: 150 } });
  const opacity = interpolate(prog, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(prog, [0, 1], [12, 0]);

  return (
    <div key={i} style={{
      position: "absolute",
      left: ann.x * width,
      top:  ann.y * height,
      transform: `translate(-50%, -110%) translateY(${translateY}px)`,
      opacity,
      zIndex: 80,
      pointerEvents: "none",
    }}>
      <div style={{
        background: "white",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 500,
        color: "#1e293b",
        fontFamily: "Inter, sans-serif",
        whiteSpace: "nowrap",
      }}>
        <span style={{ fontSize: 16 }}>{ann.icon}</span>
        {ann.label}
      </div>
      {/* Tail pointing down */}
      <div style={{
        position: "absolute",
        bottom: -7,
        left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderTop: "7px solid white",
        filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.1))",
      }} />
    </div>
  );
})}
```

---

## Slide-In Side Panel Variant

For collaboration/comments panels that slide in from the right edge (Fronter showcase25 style):

```tsx
const PANEL_APPEAR_FRAME = 50;

const panelProgress = spring({
  frame: frame - PANEL_APPEAR_FRAME,
  fps,
  config: { damping: 22, stiffness: 110 },
  durationInFrames: 28,
});

const panelX = interpolate(panelProgress, [0, 1], [300, 0]); // slides left into view
const panelOpacity = interpolate(panelProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

const COMMENTS = [
  { user: "Eric Johanson", time: "2 hours ago", text: "I think the shadow gray should be lighter so @Johnric...", meta: "Chrome 66 on Mac OS 10.13.4" },
  { user: "Luke Havard",   time: "2 hours ago", text: "Please reduce this title's font size by 10% and make it Bold please", meta: "Comment left on /pricing.html" },
];

{frame >= PANEL_APPEAR_FRAME && (
  <div style={{
    position: "absolute",
    right: 0, top: 0, bottom: 0,
    width: Math.min(300, width * 0.32),
    background: "white",
    borderLeft: "1px solid #e2e8f0",
    transform: `translateX(${panelX}px)`,
    opacity: panelOpacity,
    zIndex: 60,
    overflowY: "hidden",
    display: "flex",
    flexDirection: "column",
  }}>
    {/* Panel header */}
    <div style={{
      padding: "14px 16px",
      borderBottom: "1px solid #f1f5f9",
      fontSize: 13,
      fontWeight: 700,
      color: "#1e293b",
      fontFamily: "Inter, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      All comments
      <div style={{
        background: BRAND.primary || "#6366f1",
        color: "white",
        borderRadius: 4,
        fontSize: 11,
        padding: "2px 8px",
        fontWeight: 600,
      }}>
        Export
      </div>
    </div>

    {/* Comment list */}
    {COMMENTS.map((comment, i) => (
      <div key={i} style={{
        padding: "14px 16px",
        borderBottom: "1px solid #f8fafc",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{comment.user}</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{comment.time}</span>
        </div>
        <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: 0, marginBottom: 6 }}>
          {comment.text}
        </p>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{comment.meta}</span>
      </div>
    ))}
  </div>
)}
```

---

## When to Use

- Any product demo scene where the cursor interacts with a UI element and you want to show the feature's effect (e.g., adding a comment, leaving feedback, annotating a design)
- Collaboration tool demos (Figma, Notion, Linear, Fronter)
- When showing multi-user or async workflows — the comment card implies "someone else did this"
- Pair with `premium-hand-cursor` or `premium-cursor-engine` — the cursor triggers the callout bubble
- **Do NOT** use as a tooltip replacement — tooltips are small and appear on hover; callout bubbles are full cards that appear after a click action

## Positioning Relative to Reconstructed Components

When using callout bubbles alongside `premium-reconstructed-ui`, position them relative to the reconstructed layout geometry rather than screenshot pixel coordinates:

```tsx
const SIDEBAR_W = 240;
const TOPBAR_H = 48;
const { width, height } = useVideoConfig();

// Position callout bubble near a metric card (top-right of the card area)
// Metric cards typically start at x=SIDEBAR_W+24, y=TOPBAR_H+24
const CALLOUT_TARGETS = {
  "metric-card-1": {
    x: (SIDEBAR_W + 24 + 180) / width,  // right edge of first card
    y: (TOPBAR_H + 24 + 40) / height,   // top of card row
  },
  "table-action": {
    x: 0.75,
    y: 0.55,
  },
  "topbar-tab": {
    x: (SIDEBAR_W + 175) / width,
    y: TOPBAR_H / height,
  },
};

// Callout bubble appears when cursor dwells at the target
const showCallout = frame >= cursorArrivalFrame + 10;
```

**Rule**: Never use hardcoded pixel coords from a screenshot when the UI is reconstructed — the layout positions are deterministic from the component geometry.
