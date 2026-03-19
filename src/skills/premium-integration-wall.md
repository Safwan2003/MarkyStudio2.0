---
title: Premium Integration Wall
impact: HIGH
impactDescription: solid brand-colored background with white rounded-square integration cards flying in from center — shows "we connect to everything" or "so many scattered data sources"; cards overlap at varied rotations and scales
tags: integrations, app cards, scattered, data sources, problem scene, showcase, logos, wall, explosion, viable, zapier, zendesk
---

## Integration Wall Pattern

A solid brand-primary background (purple, teal, etc.) filled with white rounded-square cards — each representing an app or data source the product connects to. Cards scatter outward from center (explosion) or fly in from edges to fill the canvas. Each card has an app logo image or text logo + app name label.

**Two modes:**
- **Chaos/problem mode** — Cards scatter with random rotations, staggered flying outward. Represents "fragmented data sources the user drowns in."
- **Showcase/solution mode** — Cards settle into organized positions, flat orientation, clean grid-ish layout. Represents "Viable connects to all of them."

---

## Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Brand solid color background — strong, high-contrast
const BG_COLOR = BRAND.primary || "#7c3aed"; // vivid purple

<AbsoluteFill style={{ backgroundColor: BG_COLOR, overflow: "hidden" }}>
  {/* Subtle radial vignette — darkens edges slightly */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.20) 100%)",
  }} />
</AbsoluteFill>
```

---

## Integration Card Data

```tsx
// MUST be defined outside the component — stable across renders
const INTEGRATIONS = [
  { id: 0,  name: "Zendesk",    x: 0.46, y: 0.48, rotate:  0, delay:  5, scale: 1.15 },
  { id: 1,  name: "Gong",       x: 0.22, y: 0.22, rotate: -8, delay: 10, scale: 1.00 },
  { id: 2,  name: "Zapier",     x: 0.44, y: 0.12, rotate:  3, delay: 12, scale: 0.95 },
  { id: 3,  name: "Google Play",x: 0.66, y: 0.18, rotate:  6, delay: 15, scale: 1.05 },
  { id: 4,  name: "Front",      x: 0.42, y: 0.30, rotate: -4, delay: 18, scale: 0.90 },
  { id: 5,  name: "App Store",  x: 0.16, y: 0.53, rotate: -6, delay: 20, scale: 0.92 },
  { id: 6,  name: "Delighted",  x: 0.24, y: 0.65, rotate:  5, delay: 22, scale: 0.88 },
  { id: 7,  name: "Reddit",     x: 0.60, y: 0.60, rotate: -3, delay: 25, scale: 1.00 },
  { id: 8,  name: "Typeform",   x: 0.74, y: 0.50, rotate:  7, delay: 28, scale: 0.95 },
  { id: 9,  name: "Intercom",   x: 0.72, y: 0.67, rotate: -5, delay: 30, scale: 0.90 },
  { id: 10, name: "Qualtrics",  x: 0.18, y: 0.78, rotate:  4, delay: 33, scale: 0.85 },
  { id: 11, name: "Salesforce", x: 0.56, y: 0.78, rotate: -6, delay: 36, scale: 0.92 },
];
```

---

## Integration Card Component

White rounded-square card with app logo (emoji/image) and name below:

```tsx
const IntegrationCard = ({ card, frame, fps, width, height }) => {
  const cardSpring = spring({
    frame: frame - card.delay,
    fps,
    config: { stiffness: 110, damping: 14, mass: 1 },
  });

  if (frame < card.delay) return null;

  // Entrance: scale from 0 + slight overshoot
  const entryScale = interpolate(cardSpring, [0, 1], [0, 1]);

  // Gentle float after entrance
  const floatY = Math.sin((frame / 60) + card.id * 0.8) * 6;
  const floatX = Math.cos((frame / 80) + card.id * 1.1) * 4;

  const CARD_SIZE = 110 * card.scale;
  const px = card.x * width;
  const py = card.y * height;

  return (
    <div style={{
      position: "absolute",
      left: px, top: py,
      transform: `
        translate(-50%, -50%)
        scale(${entryScale})
        rotate(${card.rotate}deg)
        translate(${floatX}px, ${floatY}px)
      `,
      zIndex: 20,
    }}>
      <div style={{
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: CARD_SIZE * 0.22,  // ~22% = app-icon squircle
        backgroundColor: "white",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 6,
        padding: 10,
        fontFamily: "Inter, sans-serif",
      }}>
        {/* App logo area — if ATTACHED_IMAGES contains logos, use them */}
        {/* Otherwise: colored emoji/letter placeholder */}
        <div style={{
          width: CARD_SIZE * 0.5,
          height: CARD_SIZE * 0.5,
          borderRadius: CARD_SIZE * 0.12,
          backgroundColor: getAppColor(card.name),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: CARD_SIZE * 0.24,
          color: "white",
          fontWeight: 800,
        }}>
          {card.name[0]}
        </div>

        {/* App name */}
        <div style={{
          fontSize: Math.min(11, CARD_SIZE * 0.11),
          fontWeight: 600,
          color: "#374151",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: "90%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {card.name}
        </div>
      </div>
    </div>
  );
};

// Color palette for app placeholder icons
function getAppColor(name: string): string {
  const colors: Record<string, string> = {
    Zendesk:    "#03363d",
    Gong:       "#6c34b8",
    Zapier:     "#ff4a00",
    "Google Play": "#4285f4",
    Front:      "#1b2559",
    "App Store": "#0d96f6",
    Delighted:  "#00b0ff",
    Reddit:     "#ff4500",
    Typeform:   "#262627",
    Intercom:   "#286efa",
    Qualtrics:  "#d9282f",
    Salesforce: "#00a1e0",
  };
  return colors[name] ?? "#6366f1";
}
```

---

## Explosion Entrance (Chaos / Problem Mode)

Cards fly outward from center, creating an "overflow" feeling:

```tsx
// Override: cards start near center and fly to their final positions
const ChaosCard = ({ card, frame, fps, width, height }) => {
  const cardSpring = spring({
    frame: frame - card.delay,
    fps,
    config: { stiffness: 80, damping: 16, mass: 1.2 },
  });

  // Start position: near center (50%, 50%) — fly outward to target
  const startX = 0.5 * width;
  const startY = 0.5 * height;
  const endX = card.x * width;
  const endY = card.y * height;

  const currentX = interpolate(cardSpring, [0, 1], [startX, endX]);
  const currentY = interpolate(cardSpring, [0, 1], [startY, endY]);

  // Start rotation: 0 → settles to card.rotate
  const currentRotate = interpolate(cardSpring, [0, 1], [0, card.rotate]);

  // Start at full size, cards were already "there" and scatter outward
  const opacity = interpolate(cardSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  const CARD_SIZE = 110 * card.scale;

  return (
    <div style={{
      position: "absolute",
      left: currentX, top: currentY,
      transform: `translate(-50%, -50%) rotate(${currentRotate}deg)`,
      opacity,
      zIndex: 20,
    }}>
      {/* Same card body as above */}
    </div>
  );
};
```

---

## Clean Organized Mode (Showcase)

For the "we support all these integrations cleanly" showcase version, remove rotations:

```tsx
// Same INTEGRATIONS data but with rotate: 0 for all
// Cards fly in from their final positions (no chaos scatter)
// Tighter grid-ish layout — increase spacing between cards
const SHOWCASE_INTEGRATIONS = INTEGRATIONS.map(c => ({ ...c, rotate: 0 }));
```

---

## Foreground Label (Optional)

Large bold text overlaid in the center, fading out as cards settle:

```tsx
const CENTER_LABEL_OPACITY = interpolate(frame, [0, 20, 60, 90], [0, 1, 1, 0], { extrapolateRight: "clamp" });

<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
  zIndex: 50,
  opacity: CENTER_LABEL_OPACITY,
  pointerEvents: "none",
}}>
  <div style={{
    fontSize: 52, fontWeight: 800, color: "white",
    fontFamily: "Inter, sans-serif",
    letterSpacing: "-0.03em",
    textShadow: "0 4px 20px rgba(0,0,0,0.4)",
  }}>
    All your data sources
  </div>
  <div style={{ fontSize: 24, color: "rgba(255,255,255,0.7)", marginTop: 8, fontWeight: 500 }}>
    One unified intelligence layer
  </div>
</div>
```

---

## Usage Notes

- Define `INTEGRATIONS` array OUTSIDE the component — stable across renders
- `rotate: ±5–8°` per card creates organic scattered feel; avoid large rotations (>15°) which look messy
- `card.scale` variation (0.85–1.15) gives depth: smaller cards feel farther away
- The explosion pattern (chaos mode) works well for problem scenes: "all this fragmented data exists" — then the next scene shows it organized
- For screenshot-based logos: replace the colored letter placeholder with `<img src={ATTACHED_IMAGES[i]} style={{ width: "100%", height: "100%", objectFit: "contain" }} />`
- Box shadow: use two layers (far `0 20px 50px` + near `0 8px 20px`) for depth
- Pair with a kinetic text headline that appears at frame 60 after cards settle: "All your customer feedback, analyzed"
