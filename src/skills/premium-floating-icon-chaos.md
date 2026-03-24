# Floating Icon Chaos Scene

> Fronter-style "communication chaos" intro — floating app icons + chat bubbles around a central device/photo on real footage or gradient bg. The WhatAStory signature opening scene.

## When to Use
- **Intro/problem scenes** about communication fragmentation, tool overload, or collaboration pain
- B2B SaaS products replacing multiple disconnected tools
- When establishing the "before" state (chaos → order narrative)

## Layout Pattern

```
Central Element:       Laptop/phone mockup or person avatar (40% of frame)
Floating Layer (z:3):  6–10 colored icon circles orbiting with useEntropy float
Chat Bubbles (z:4):    2–3 white pill-shaped speech bubbles with truncated text
Background:            Stock footage (OffthreadVideo + dark overlay) OR gradient bg
```

## Icon Pattern (safest — avoid complex SVGs)

Each icon is a **colored circle** with a **1-2 letter abbreviation**:

```jsx
// Icon array — colors + letters. LLM should invent appropriate ones for the product.
const CHAOS_ICONS = [
  { letter: "Wh", color: "#25D366", label: "WhatsApp" },
  { letter: "Sk", color: "#00AFF0", label: "Skype" },
  { letter: "Dr", color: "#0061FF", label: "Dropbox" },
  { letter: "Gm", color: "#EA4335", label: "Gmail" },
  { letter: "Sl", color: "#4A154B", label: "Slack" },
  { letter: "Tr", color: "#0079BF", label: "Trello" },
];

// Each icon
const FloatingIcon = ({ icon, index, startFrame }) => {
  const { x: ex, y: ey } = useEntropy(index, { amplitude: 15, frequency: 0.04 });
  const entrance = spring({ frame: frame - startFrame - index * 6, fps, config: SPRING_CONFIGS.pop });
  return (
    <div style={{
      position: "absolute", left: positions[index].x, top: positions[index].y,
      transform: `translate(${ex}px, ${ey}px) scale(${entrance})`,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: icon.color, display: "flex",
        alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        fontSize: 18, fontWeight: 700, color: "#fff",
      }}>
        {icon.letter}
      </div>
    </div>
  );
};
```

## Chat Bubble Pattern

```jsx
const ChatBubble = ({ text, side, index, startFrame }) => {
  const entrance = spring({ frame: frame - startFrame - index * 10, fps, config: SPRING_CONFIGS.snap });
  return (
    <div style={{
      position: "absolute",
      background: "#ffffff", borderRadius: 16,
      padding: "8px 16px", maxWidth: 180,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      transform: `scale(${entrance})`,
      fontSize: 13, color: "#334155",
    }}>
      {text}
    </div>
  );
};
```

## Composition Rules

1. **Central element** stays still — floating icons orbit around it
2. Icons use `useEntropy` with different indices for organic independent movement
3. Stagger icon entrances 6-8 frames apart (spring pop)
4. Chat bubbles appear 20-30 frames after icons
5. Keep total icon count 6-10 — too many looks cluttered
6. Use `useVitality("float")` on the central device for subtle breathing
7. Position icons in a rough circle/ellipse around center (not random scatter)

## Scene Arc

```
Frames 0-15:   Background fades in (stock footage or gradient)
Frames 10-20:  Central device/photo springs in (SPRING_CONFIGS.entrance)
Frames 20-60:  Icons pop in staggered (6f apart, SPRING_CONFIGS.pop)
Frames 40-80:  Chat bubbles slide in from sides
Frames 60+:    Everything floats gently (useEntropy + useVitality)
```

## Anti-Patterns
- Do NOT use complex SVG icons — colored circles with letters are safer and more consistent
- Do NOT scatter icons randomly — arrange in an orbital pattern
- Do NOT use more than 3 chat bubbles — keeps scene readable
- Do NOT skip the darkening overlay on stock footage — elements must be readable
