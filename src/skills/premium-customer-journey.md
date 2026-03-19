---
title: Premium Customer Journey Timeline
impact: HIGH
impactDescription: visualizes a user/customer lifecycle as a horizontal curved SVG path with animated milestone dots, pop-up info cards, and a traveling dot that triggers each card reveal
tags: customer journey, timeline, milestones, svg path, cards, lifecycle, b2b, crm, stages, pretaa
---

## Customer Journey Pattern

A horizontal curved SVG path with 3–5 milestone dots. A dot traveler animates along the path. When the traveler reaches each milestone, a white info card pops up above the dot, revealing the stage name and a short description.

**Typical use case**: CRM, customer success, sales pipeline, or onboarding products showing how a customer progresses through a workflow.

---

## Path + Milestone Data

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Milestones — x/y are fractions of video dimensions
const MILESTONES = [
  {
    id: 0,
    x: 0.15,
    y: 0.55,
    label: "Deal Closed",
    description: "Contract signed",
    color: "#6366f1",
    cardDelay: 60,
  },
  {
    id: 1,
    x: 0.38,
    y: 0.42,
    label: "Onboarding",
    description: "Getting started",
    color: "#f59e0b",
    cardDelay: 100,
  },
  {
    id: 2,
    x: 0.62,
    y: 0.48,
    label: "First Value",
    description: "Live in production",
    color: "#f59e0b",
    cardDelay: 140,
  },
  {
    id: 3,
    x: 0.85,
    y: 0.38,
    label: "Happy Customer",
    description: "Upsell opportunity",
    color: "#10b981",
    cardDelay: 180,
  },
];

// Convert fractions to pixels
const pts = MILESTONES.map(m => ({ x: m.x * width, y: m.y * height }));
```

---

## SVG Curved Path

Draw a smooth cubic bezier through the milestones using a spring-animated `strokeDashoffset`:

```tsx
// Build SVG path through all milestone points (catmull-rom style via control points)
function buildCurvePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) * 0.5;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) * 0.5;
    const cpY2 = p1.y;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return d;
}

const PATH_D = buildCurvePath(pts);
const PATH_LENGTH = 1200; // approximate — adjust per layout

// Path draws in from frame 10
const pathProgress = spring({
  frame: frame - 10,
  fps,
  config: { stiffness: 30, damping: 20 },
});
const pathDashOffset = interpolate(pathProgress, [0, 1], [PATH_LENGTH, 0]);

<svg
  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
>
  {/* Shadow / glow track */}
  <path
    d={PATH_D}
    stroke="rgba(0,0,0,0.06)"
    strokeWidth={6}
    fill="none"
    strokeLinecap="round"
  />

  {/* Animated main path */}
  <path
    d={PATH_D}
    stroke="#1e293b"
    strokeWidth={3}
    fill="none"
    strokeLinecap="round"
    strokeDasharray={PATH_LENGTH}
    strokeDashoffset={pathDashOffset}
    opacity={0.35}
  />
</svg>
```

---

## Milestone Dot Markers

Dark filled circles with a white inner dot — appear when the traveler reaches them:

```tsx
{MILESTONES.map((m, i) => {
  const dotSpring = spring({
    frame: frame - m.cardDelay,
    fps,
    config: { stiffness: 200, damping: 14, mass: 0.8 },
  });
  return (
    <div
      key={m.id}
      style={{
        position: "absolute",
        left: m.x * width,
        top: m.y * height,
        transform: `translate(-50%, -50%) scale(${dotSpring})`,
        zIndex: 20,
      }}
    >
      {/* Outer dot */}
      <div style={{
        width: 20, height: 20,
        borderRadius: "50%",
        backgroundColor: "#1e293b",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 4px 12px rgba(0,0,0,0.25), 0 0 0 4px rgba(255,255,255,0.8)`,
      }}>
        {/* Inner white dot */}
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "white" }} />
      </div>
    </div>
  );
})}
```

---

## Traveling Dot Along the Path

Linearly interpolates position between milestone points to simulate travel:

```tsx
// Traveler starts at frame 20, reaches final milestone by frame 200
const TRAVEL_START = 20;
const TRAVEL_END = 210;

// Overall travel progress (0 → 1)
const travelProgress = interpolate(frame, [TRAVEL_START, TRAVEL_END], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Map progress to segment index + segment progress
const segmentCount = MILESTONES.length - 1;
const globalT = travelProgress * segmentCount;
const segIdx = Math.min(Math.floor(globalT), segmentCount - 1);
const segT = globalT - segIdx;

// Lerp between current and next milestone
const fromPt = pts[segIdx];
const toPt = pts[segIdx + 1] ?? pts[segIdx];

// Smooth easing within each segment
const easedT = segT < 0.5 ? 2 * segT * segT : -1 + (4 - 2 * segT) * segT;

const travelerX = fromPt.x + (toPt.x - fromPt.x) * easedT;
const travelerY = fromPt.y + (toPt.y - fromPt.y) * easedT;

{/* Traveling dot */}
<div style={{
  position: "absolute",
  left: travelerX,
  top: travelerY,
  transform: "translate(-50%, -50%)",
  width: 18, height: 18,
  borderRadius: "50%",
  backgroundColor: "#6366f1",
  boxShadow: "0 0 0 4px rgba(99,102,241,0.25), 0 4px 12px rgba(99,102,241,0.5)",
  zIndex: 30,
}} />
```

---

## Info Cards (Pop Up at Each Milestone)

White rounded cards that spring pop upward from each dot when the traveler arrives:

```tsx
{MILESTONES.map((m, i) => {
  // Card appears at cardDelay + a brief settle offset
  const cardSpring = spring({
    frame: frame - (m.cardDelay + 8),
    fps,
    config: { stiffness: 180, damping: 14, mass: 0.9 },
  });

  if (frame < m.cardDelay) return null;

  return (
    <div
      key={m.id}
      style={{
        position: "absolute",
        left: m.x * width,
        // Card sits above the milestone dot
        top: m.y * height - 110,
        transform: `translate(-50%, 0) scale(${cardSpring})`,
        transformOrigin: "center bottom",
        opacity: cardSpring,
        zIndex: 40,
        minWidth: 180,
      }}
    >
      <div style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: "14px 20px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
      }}>
        {/* Stage label */}
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 4,
          whiteSpace: "nowrap",
        }}>
          {m.label}
        </div>
        {/* Short description */}
        <div style={{
          fontSize: 12,
          color: "#64748b",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}>
          {m.description}
        </div>
        {/* Color accent bar at bottom */}
        <div style={{
          marginTop: 10,
          height: 3,
          borderRadius: 2,
          backgroundColor: m.color,
          opacity: 0.8,
        }} />
      </div>
      {/* Pointer triangle down toward the dot */}
      <div style={{
        position: "absolute",
        bottom: -8,
        left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "8px solid transparent",
        borderRight: "8px solid transparent",
        borderTop: "8px solid white",
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.08))",
      }} />
    </div>
  );
})}
```

---

## Stage Labels Below Dots (Optional)

Small stage-number labels below each dot:

```tsx
{MILESTONES.map((m, i) => {
  const labelOpacity = interpolate(frame, [m.cardDelay, m.cardDelay + 15], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div key={m.id} style={{
      position: "absolute",
      left: m.x * width,
      top: m.y * height + 22,
      transform: "translateX(-50%)",
      fontSize: 11,
      fontWeight: 600,
      color: "#94a3b8",
      fontFamily: "Inter, sans-serif",
      opacity: labelOpacity,
      whiteSpace: "nowrap",
    }}>
      Stage {i + 1}
    </div>
  );
})}
```

---

## Complete Scene Structure

```tsx
export const CustomerJourneyScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* 1. Background — use premium-multi-corner-gradient */}
      <AbsoluteFill style={{ backgroundColor: "#f0f2f6" }}>
        <div style={{ position: "absolute", left: 0, bottom: 0, width: "65%", height: "70%",
          background: "radial-gradient(circle at 0% 100%, rgba(99,102,241,0.22) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", right: 0, top: 0, width: "60%", height: "65%",
          background: "radial-gradient(circle at 100% 0%, rgba(248,113,113,0.16) 0%, transparent 58%)" }} />
      </AbsoluteFill>

      {/* 2. Headline */}
      <div style={{
        position: "absolute", top: "8%", left: "50%",
        transform: "translateX(-50%)",
        fontSize: 44, fontWeight: 800, color: "#0f172a",
        fontFamily: "Inter, sans-serif",
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        whiteSpace: "nowrap",
        letterSpacing: "-0.03em",
      }}>
        The Customer Journey
      </div>

      {/* 3. SVG path layer */}
      {/* ... PATH SVG ... */}

      {/* 4. Milestone dots */}
      {/* ... DOTS ... */}

      {/* 5. Traveler dot */}
      {/* ... TRAVELER ... */}

      {/* 6. Info cards */}
      {/* ... CARDS ... */}
    </AbsoluteFill>
  );
};
```

---

## Usage Notes

- `PATH_LENGTH` should match the actual pixel length of your SVG path — use 1000–1400 for a 1920x1080 canvas spanning ~80% of the width
- `cardDelay` for each milestone should roughly equal the frame when the traveler reaches it: `TRAVEL_START + (i / segmentCount) * (TRAVEL_END - TRAVEL_START)`
- The card pointer triangle uses CSS border trick — no SVG needed
- Add `overflow: "visible"` to the SVG so dots and traveler near edges don't clip
- For more visual punch, give each card's accent bar the brand color (`BRAND.primary`)
