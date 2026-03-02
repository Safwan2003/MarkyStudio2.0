---
title: Premium Split-Screen Before/After
impact: HIGH
impactDescription: side-by-side before/after comparison — the most persuasive visual for SaaS problem/solution scenes. Old chaotic state vs clean product state.
tags: split-screen, before-after, comparison, problem-solution, contrast, side-by-side, chaos-vs-clean
---

## Split-Screen Pattern Overview

The definitive "problem → solution" visual. A vertical divider splits the screen:
- **Left (BEFORE)**: messy, dark, stressful — scattered spreadsheets, red numbers, chaos
- **Right (AFTER)**: clean, bright, organized — your product in action

The divider **animates from center** to the side, revealing more of the "after" state.

---

## Core Structure + Divider Animation

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Phase 1 (0–40f): both sides enter simultaneously
// Phase 2 (50–120f): divider slides left, AFTER side expands
// Phase 3 (130+f): hold on expanded AFTER view

const DIVIDER_SETTLE_START = 50;
const DIVIDER_SETTLE_END   = 120;

// Divider position: starts at 50% center, animates to 32% (AFTER dominates)
const dividerPosition = interpolate(
  frame,
  [DIVIDER_SETTLE_START, DIVIDER_SETTLE_END],
  [50, 32],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,  // ease-in-out cubic
  }
);

// Entrance: both panels slide in from their sides
const leftEntrance = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
const rightEntrance = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 80 } });

const leftX  = interpolate(leftEntrance,  [0, 1], [-width * 0.25, 0]);
const rightX = interpolate(rightEntrance, [0, 1], [width * 0.25, 0]);

// BEFORE side darkens as AFTER expands — amplifies contrast
const beforeDimOpacity = interpolate(
  frame,
  [DIVIDER_SETTLE_START, DIVIDER_SETTLE_END],
  [0, 0.45],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

---

## Full Scene Render

```tsx
<AbsoluteFill style={{ overflow: "hidden", fontFamily: "Inter, sans-serif" }}>
  {/* ─── BEFORE (left panel) ─── */}
  <div style={{
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: `${dividerPosition}%`,
    overflow: "hidden",
    transform: `translateX(${leftX}px)`,
  }}>
    {/* Dark, chaotic background */}
    <div style={{ position: "absolute", inset: 0, background: "#0f0f0f" }} />

    {/* Scattered messy elements */}
    {[
      { x: "10%", y: "20%", w: 140, rot: -12, label: "Spreadsheet.xlsx", color: "#ef4444" },
      { x: "30%", y: "50%", w: 120, rot: 8, label: "Email thread", color: "#f59e0b" },
      { x: "15%", y: "65%", w: 100, rot: -6, label: "Manual entry", color: "#6366f1" },
      { x: "45%", y: "30%", w: 90,  rot: 14, label: "Invoice.pdf", color: "#94a3b8" },
    ].map((item, i) => {
      const itemEntrance = spring({ frame: frame - i * 5, fps, config: { damping: 14, stiffness: 90 } });
      return (
        <div key={i} style={{
          position: "absolute",
          left: item.x, top: item.y,
          transform: `rotate(${item.rot}deg) scale(${itemEntrance})`,
          opacity: itemEntrance,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${item.color}40`,
          borderRadius: 8,
          padding: "8px 14px",
          width: item.w,
          color: item.color,
          fontSize: 11, fontWeight: 600,
          boxShadow: `0 4px 20px ${item.color}20`,
          backdropFilter: "blur(4px)",
        }}>
          {item.label}
        </div>
      );
    })}

    {/* Big red X / error indicator */}
    <div style={{
      position: "absolute", bottom: "20%", left: "50%",
      transform: `translateX(-50%) scale(${leftEntrance})`,
      fontSize: 64, opacity: 0.4,
    }}>❌</div>

    {/* "BEFORE" label */}
    <div style={{
      position: "absolute", bottom: "8%", left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(239,68,68,0.15)",
      border: "1px solid rgba(239,68,68,0.3)",
      color: "#ef4444", fontSize: 11, fontWeight: 700,
      padding: "4px 14px", borderRadius: 100,
      letterSpacing: "0.1em", textTransform: "uppercase",
    }}>
      Before
    </div>

    {/* Dim overlay as "After" expands */}
    <div style={{
      position: "absolute", inset: 0,
      background: `rgba(0,0,0,${beforeDimOpacity})`,
      pointerEvents: "none",
    }} />
  </div>

  {/* ─── AFTER (right panel) ─── */}
  <div style={{
    position: "absolute",
    left: `${dividerPosition}%`, top: 0, bottom: 0,
    right: 0,
    overflow: "hidden",
    transform: `translateX(${rightX}px)`,
  }}>
    {/* Clean, bright background */}
    <div style={{ position: "absolute", inset: 0, background: "#f8fafc" }} />

    {/* Light orb */}
    <div style={{
      position: "absolute", top: "-20%", left: "20%",
      width: 500, height: 500, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
      filter: "blur(30px)",
    }} />

    {/* Product UI — use ATTACHED_IMAGES if available */}
    <div style={{
      position: "absolute",
      top: "10%", left: "5%", right: "5%", bottom: "20%",
      borderRadius: 12,
      boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
      overflow: "hidden",
      transform: `scale(${interpolate(rightEntrance, [0,1], [0.92,1])})`,
    }}>
      {ATTACHED_IMAGES[0] ? (
        <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      ) : (
        /* Fallback: clean dashboard */
        <div style={{ width: "100%", height: "100%", background: "white", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 32, background: "#0f172a", display: "flex", alignItems: "center", padding: "0 12px", gap: 6 }}>
            {["#ef4444","#eab308","#22c55e"].map((c,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, display: "flex" }}>
            <div style={{ width: 48, background: "#f1f5f9" }} />
            <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 36, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* "AFTER" label */}
    <div style={{
      position: "absolute", bottom: "8%", left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(16,185,129,0.12)",
      border: "1px solid rgba(16,185,129,0.3)",
      color: "#10b981", fontSize: 11, fontWeight: 700,
      padding: "4px 14px", borderRadius: 100,
      letterSpacing: "0.1em", textTransform: "uppercase",
    }}>
      After
    </div>
  </div>

  {/* ─── Divider Line ─── */}
  <div style={{
    position: "absolute",
    left: `${dividerPosition}%`,
    top: 0, bottom: 0,
    width: 2,
    background: "linear-gradient(180deg, transparent, white, transparent)",
    opacity: 0.6,
    transform: "translateX(-50%)",
    zIndex: 20,
  }}>
    {/* Divider handle */}
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: 32, height: 32,
      background: "white",
      borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      fontSize: 12, color: "#64748b",
    }}>
      ⇔
    </div>
  </div>
</AbsoluteFill>
```

---

## Headline Overlay (Optional)

Centered text that fades in after the divider settles:

```tsx
const headlineOpacity = interpolate(frame, [DIVIDER_SETTLE_END, DIVIDER_SETTLE_END + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

{headlineOpacity > 0 && (
  <div style={{
    position: "absolute", top: "6%", left: "50%",
    transform: `translateX(-50%) translateY(${interpolate(headlineOpacity, [0,1], [8,0])}px)`,
    opacity: headlineOpacity,
    background: "rgba(15,23,42,0.85)",
    backdropFilter: "blur(12px)",
    color: "white", fontFamily: "Inter, sans-serif",
    fontSize: 18, fontWeight: 700,
    padding: "10px 28px", borderRadius: 100,
    border: "1px solid rgba(255,255,255,0.1)",
    whiteSpace: "nowrap",
    zIndex: 30,
  }}>
    Say goodbye to spreadsheets
  </div>
)}
```

---

## Key Rules

- **Divider position 32–35%**: AFTER side should occupy ~65–68% — it's the hero, the product wins
- **BEFORE should feel uncomfortable**: dark bg, rotated/scattered elements, red accents, desaturated
- **AFTER should feel clean**: white/light bg, ordered layout, brand color accents, green checkmarks
- **Dim BEFORE as AFTER expands**: the `beforeDimOpacity` increasing from 0→0.45 reinforces the "old way fades away" narrative
- **Always use `ATTACHED_IMAGES[0]`** in the AFTER side when available — this is the real product vs abstract illustration
