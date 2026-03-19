---
title: Premium Feedback Storm
impact: HIGH
impactDescription: full-body person photo centered on gradient background, surrounded by floating white feedback cards with urgency pills — shows raw customer voice overwhelming the user; cinematic social proof or problem scene
tags: feedback, social proof, testimonials, person, real photo, cards, urgency, verbatim, customer voice, viable, floating cards, depth
---

## Feedback Storm Pattern

A real person photo (full body or portrait) centered on a pastel gradient background. Multiple white rounded feedback cards float around the person at varied depths — some appear in front, some behind the person (z-index layering). Each card shows a short verbatim feedback snippet and a colored urgency/priority pill (High/Medium/Low). Cards pop in with staggered spring delays and gentle float animations.

**Typical use case**: Social proof for feedback intelligence products (Viable, Qualtrics, Medallia, Intercom). Also works as a problem scene: "You're drowning in feedback."

---

## Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

<AbsoluteFill style={{ backgroundColor: "#f8f4fc", overflow: "hidden" }}>
  {/* Soft pink/lavender corner blobs */}
  <div style={{
    position: "absolute", left: 0, top: 0,
    width: "55%", height: "60%",
    background: "radial-gradient(circle at 0% 0%, rgba(236,72,153,0.15) 0%, transparent 58%)",
  }} />
  <div style={{
    position: "absolute", right: 0, bottom: 0,
    width: "50%", height: "55%",
    background: "radial-gradient(circle at 100% 100%, rgba(249,168,212,0.18) 0%, transparent 55%)",
  }} />
  <div style={{
    position: "absolute", right: 0, top: "20%",
    width: "35%", height: "50%",
    background: "radial-gradient(circle at 100% 50%, rgba(251,113,133,0.12) 0%, transparent 52%)",
  }} />
</AbsoluteFill>
```

---

## Feedback Card Data

Define outside the component for stable renders:

```tsx
// MUST be outside component
const FEEDBACK_CARDS = [
  {
    id: 0,
    text: "Premium subscription is too expensive",
    priority: "Low",
    priorityColor: "#6b7280",
    x: 0.18, y: 0.38,
    delay: 10,
    floatPhase: 0.0,
    zLayer: "front",   // renders in front of person
    rotate: -2,
  },
  {
    id: 1,
    text: "Shipping delays, Europe",
    priority: "High",
    priorityColor: "#ef4444",
    x: 0.72, y: 0.22,
    delay: 20,
    floatPhase: 1.4,
    zLayer: "back",    // renders behind person
    rotate: 3,
  },
  {
    id: 2,
    text: "Easy to use app, great features",
    priority: "Low",
    priorityColor: "#6b7280",
    x: 0.15, y: 0.62,
    delay: 30,
    floatPhase: 2.1,
    zLayer: "front",
    rotate: -1,
  },
  {
    id: 3,
    text: "Users frustrated with app bugs",
    priority: "High",
    priorityColor: "#ef4444",
    x: 0.20, y: 0.78,
    delay: 35,
    floatPhase: 0.7,
    zLayer: "front",
    rotate: 2,
  },
  {
    id: 4,
    text: "Is there an Android app?",
    priority: "Medium",
    priorityColor: "#f59e0b",
    x: 0.68, y: 0.60,
    delay: 42,
    floatPhase: 1.8,
    zLayer: "back",
    rotate: -3,
  },
  {
    id: 5,
    text: "Can't import from third party tool",
    priority: "High",
    priorityColor: "#ef4444",
    x: 0.72, y: 0.78,
    delay: 48,
    floatPhase: 0.3,
    zLayer: "back",
    rotate: 5,
  },
];
```

---

## Person Layer (Center)

The person photo is the center layer — back cards go behind it, front cards go above it:

```tsx
// Entrance: person fades + scales in
const personSpring = spring({ frame, fps, config: { stiffness: 80, damping: 20 } });
const personScale = interpolate(personSpring, [0, 1], [0.92, 1]);
const personOpacity = interpolate(personSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

// Center horizontal, bottom-aligned (full body)
const PERSON_WIDTH = width * 0.28;  // ~28% of video width

<div style={{
  position: "absolute",
  left: "50%",
  bottom: 0,
  transform: `translateX(-50%) scale(${personScale})`,
  transformOrigin: "center bottom",
  opacity: personOpacity,
  width: PERSON_WIDTH,
  zIndex: 30,  // between back cards (z=10) and front cards (z=50)
}}>
  {ATTACHED_IMAGES[0] ? (
    <img
      src={ATTACHED_IMAGES[0]}
      style={{
        width: "100%",
        objectFit: "contain",
        objectPosition: "center bottom",
        display: "block",
      }}
    />
  ) : (
    // Fallback: silhouette placeholder
    <div style={{
      width: PERSON_WIDTH,
      height: height * 0.75,
      background: "linear-gradient(to bottom, #d1d5db, #9ca3af)",
      borderRadius: "50% 50% 0 0 / 30% 30% 0 0",
      opacity: 0.4,
    }} />
  )}
</div>
```

---

## Feedback Card Component

```tsx
const FeedbackCard = ({ card, frame, fps, width, height }) => {
  const cardSpring = spring({
    frame: frame - card.delay,
    fps,
    config: { stiffness: 120, damping: 16, mass: 1 },
  });

  if (frame < card.delay) return null;

  const floatY = Math.sin((frame / 55) + card.floatPhase) * 8;
  const floatX = Math.cos((frame / 70) + card.floatPhase) * 5;

  const px = card.x * width;
  const py = card.y * height;

  // Front cards above person (z=50), back cards behind (z=10)
  const zIndex = card.zLayer === "front" ? 50 : 10;

  // Back cards: slightly more transparent to feel further away
  const depth = card.zLayer === "back" ? 0.82 : 1;

  const CARD_W = 220;

  return (
    <div style={{
      position: "absolute",
      left: px, top: py,
      transform: `
        translate(-50%, -50%)
        scale(${interpolate(cardSpring, [0, 1], [0.6, 1]) * depth})
        rotate(${card.rotate}deg)
        translate(${floatX}px, ${floatY}px)
      `,
      opacity: cardSpring * depth,
      zIndex,
    }}>
      <div style={{
        width: CARD_W,
        backgroundColor: "white",
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: card.zLayer === "front"
          ? "0 16px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.07)"
          : "0 8px 20px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {/* Header row: priority icon + pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Priority color dot */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: card.priorityColor,
            flexShrink: 0,
          }} />
          {/* Feedback text */}
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            lineHeight: 1.35,
            flex: 1,
          }}>
            {card.text}
          </div>
        </div>

        {/* Priority pill */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 10px",
            borderRadius: 9999,
            backgroundColor: `${card.priorityColor}18`,
            border: `1px solid ${card.priorityColor}40`,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              backgroundColor: card.priorityColor,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: card.priorityColor,
              letterSpacing: "0.03em",
            }}>
              {card.priority}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## Render Order (Z-Depth Layering)

The key to realism is rendering cards in the correct order — back cards first, person second, front cards on top:

```tsx
export const FeedbackStorm = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const backCards  = FEEDBACK_CARDS.filter(c => c.zLayer === "back");
  const frontCards = FEEDBACK_CARDS.filter(c => c.zLayer === "front");

  return (
    <AbsoluteFill>
      {/* 1. Background */}
      {/* ... */}

      {/* 2. Cards behind person */}
      {backCards.map(card => (
        <FeedbackCard key={card.id} card={card} frame={frame} fps={fps} width={width} height={height} />
      ))}

      {/* 3. Person (center layer) */}
      {/* ... person div ... */}

      {/* 4. Cards in front of person */}
      {frontCards.map(card => (
        <FeedbackCard key={card.id} card={card} frame={frame} fps={fps} width={width} height={height} />
      ))}
    </AbsoluteFill>
  );
};
```

---

## No-Person Variant (Cards Only)

If no person photo is available, center-anchor all cards around an invisible point and use a wider scatter:

```tsx
// All cards float freely — no z-layer distinction needed
// Add a headline in the center that fades out as cards appear
const FEEDBACK_CARDS_NO_PERSON = [
  // Wider x spread: 0.08–0.88
  // More cards: 8–10 total
  // Same card component — just omit zLayer logic
];
```

---

## Usage Notes

- `zLayer: "back"` cards get `zIndex: 10` and `opacity * 0.82` — they feel further away without any actual 3D transform
- `ATTACHED_IMAGES[0]` should be a full-body or 3/4-body cutout photo on a transparent or white background — the gradient bg shows through the photo's transparent areas
- `transformOrigin: "center bottom"` on the person div makes the scale entrance feel like they're rising from the ground (not shrinking from center)
- Float phases are offset per card (`card.floatPhase`) so no two cards bob in sync
- Priority colors: `#ef4444` (red=High), `#f59e0b` (amber=Medium), `#6b7280` (gray=Low) — match your product's urgency system
- For a "calmer" social proof version (not chaos): reduce float amplitude to 4px, increase card delays by 2×, remove back-layer z trick and give all cards the same z-index
