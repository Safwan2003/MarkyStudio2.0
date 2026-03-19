---
title: Premium Before After
impact: HIGH
impactDescription: dramatic horizontal split-screen wipe reveal — left panel shows the painful "before" state (dark, desaturated) while right panel reveals the vibrant product "after"; animated glowing divider sweeps across
tags: before-after, split-screen, wipe-reveal, contrast, old-vs-new, before, after, comparison, problem-solution, wipe, divider, transformation, horizontal-split
---

## When to Use

A dramatic problem-to-solution bridge scene. The screen is literally divided: on the left, the old painful world (manual process, broken tool, spreadsheet chaos); on the right, your product — alive, vibrant, solved.

Use for:
- Problem → Solution transition scene
- "Old way vs. New way" narrative
- Any product that replaces a worse tool or manual process
- Spreadsheet-to-product transformation story

Do NOT use when:
- The "before" state is abstract or conceptual (use premium-icon-concept-scene instead)
- You have 4+ comparison points (use premium-feature-grid instead)
- You already have premium-split-screen in the scene list (these are similar — pick one)

---

## Core Pattern

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// --- CONFIG ---
const BEFORE_LABEL = "BEFORE";
const AFTER_LABEL  = "AFTER";
const BEFORE_CAPTION = "Manual. Error-prone. Slow.";
const AFTER_CAPTION  = "Automated. Accurate. Fast."; // product tagline

const DIVIDER_START_FRAME = 20;
const DIVIDER_END_FRAME   = 60;
const FINAL_DIVIDER_X     = 42; // percent

// Divider spring travel
const dividerProgress = spring({
  frame: Math.max(0, frame - DIVIDER_START_FRAME),
  fps,
  config: SPRING_CONFIGS.cinematic,
});
const dividerX = interpolate(dividerProgress, [0, 1], [0, FINAL_DIVIDER_X], {
  extrapolateRight: "clamp",
});
// Subtle breathing oscillation after divider settles
const breathe = frame > DIVIDER_END_FRAME ? Math.sin((frame - DIVIDER_END_FRAME) * 0.04) * 0.5 : 0;
const finalDividerX = dividerX + breathe;

// AFTER panel push-in zoom
const afterZoom = interpolate(frame, [80, 150], [1.0, 1.03], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Label springs
const beforeLabelY = interpolate(
  spring({ frame: Math.max(0, frame - 35), fps, config: SPRING_CONFIGS.entrance }),
  [0, 1], [20, 0], { extrapolateRight: "clamp" }
);
const afterLabelY = interpolate(
  spring({ frame: Math.max(0, frame - 45), fps, config: SPRING_CONFIGS.entrance }),
  [0, 1], [20, 0], { extrapolateRight: "clamp" }
);

<AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: "hidden" }}>

  {/* BEFORE panel — always visible, desaturated + dark overlay */}
  <div style={{ position: "absolute", inset: 0 }}>
    {ATTACHED_IMAGES[0] ? (
      <img
        src={ATTACHED_IMAGES[0]}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          filter: "saturate(0.15) brightness(0.55)",
        }}
      />
    ) : (
      // Fallback: dark panel with a hand-drawn workflow metaphor
      <div style={{
        width: "100%", height: "100%",
        background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24,
      }}>
        {["Step 1: Export CSV", "Step 2: Copy-paste", "Step 3: Pray it works"].map((item, i) => (
          <div key={i} style={{
            border: "1.5px dashed rgba(255,255,255,0.3)",
            borderRadius: 8,
            padding: "10px 28px",
            fontSize: 18,
            color: "rgba(255,255,255,0.4)",
            fontFamily: BRAND.font ?? "Inter, sans-serif",
            transform: `rotate(${[-1.5, 1, -0.8][i]}deg)`,
          }}>
            {item}
          </div>
        ))}
      </div>
    )}
    {/* Red tint wash */}
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(180,30,30,0.12)",
    }} />
  </div>

  {/* AFTER panel — clips in from behind the divider */}
  <div style={{
    position: "absolute", inset: 0,
    clipPath: `inset(0 0 0 ${finalDividerX}%)`,
    transform: `scale(${afterZoom})`,
    transformOrigin: "center center",
  }}>
    {ATTACHED_IMAGES[0] ? (
      <img
        src={ATTACHED_IMAGES[0]}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    ) : (
      <div style={{
        width: "100%", height: "100%",
        background: `linear-gradient(135deg, ${BRAND.bg} 0%, ${BRAND.primary}18 100%)`,
      }} />
    )}
    {/* Brand glow on AFTER side */}
    <div style={{
      position: "absolute", inset: 0,
      background: `radial-gradient(ellipse at 70% 50%, ${BRAND.primary}22 0%, transparent 60%)`,
    }} />
  </div>

  {/* Glowing divider line */}
  <div style={{
    position: "absolute", top: 0, bottom: 0, width: 3,
    left: `${finalDividerX}%`,
    background: BRAND.primary,
    boxShadow: `0 0 12px 4px ${BRAND.primary}66, 0 0 30px 8px ${BRAND.primary}33`,
    zIndex: 10,
  }} />

  {/* BEFORE label — bottom-left quadrant */}
  <div style={{
    position: "absolute",
    bottom: 72,
    left: "12%",
    zIndex: 20,
    opacity: interpolate(frame, [33, 42], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${beforeLabelY}px)`,
  }}>
    <div style={{
      fontSize: 18, fontWeight: 700, letterSpacing: "0.15em",
      color: "rgba(255,255,255,0.4)",
      fontFamily: BRAND.font ?? "Inter, sans-serif",
    }}>
      {BEFORE_LABEL}
    </div>
    {BEFORE_CAPTION && (
      <div style={{
        fontSize: 13, color: "rgba(255,255,255,0.25)",
        fontFamily: BRAND.font ?? "Inter, sans-serif",
        marginTop: 4, letterSpacing: "0.05em",
      }}>
        {BEFORE_CAPTION}
      </div>
    )}
  </div>

  {/* AFTER label — bottom-right quadrant */}
  <div style={{
    position: "absolute",
    bottom: 72,
    left: `${FINAL_DIVIDER_X + 8}%`,
    zIndex: 20,
    opacity: interpolate(frame, [43, 52], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${afterLabelY}px)`,
  }}>
    <div style={{
      fontSize: 18, fontWeight: 700, letterSpacing: "0.15em",
      color: BRAND.primary,
      fontFamily: BRAND.font ?? "Inter, sans-serif",
    }}>
      {AFTER_LABEL}
    </div>
    {AFTER_CAPTION && (
      <div style={{
        fontSize: 13, color: BRAND.textMuted,
        fontFamily: BRAND.font ?? "Inter, sans-serif",
        marginTop: 4, letterSpacing: "0.05em",
      }}>
        {AFTER_CAPTION}
      </div>
    )}
  </div>

</AbsoluteFill>
```

---

## BEFORE Panel Variants (when no screenshot)

When no screenshot available for the BEFORE state, choose one of these fallbacks:

**Variant A — Dashed workflow boxes** (shown above in fallback code): 3 hand-drawn-style bordered boxes listing manual steps, slightly rotated, low opacity.

**Variant B — Warning icon cluster**: Dark panel with 3 warning icons (⚠️ ❌ 🔴) floating with slow `Math.sin` rotation at different speeds.

**Variant C — Spreadsheet grid**: Monochrome CSS grid of small text rows simulating a spreadsheet, with a slow blur `filter: blur(px)` animation on each row, staggered.

---

## Animation Timing Reference

| Event | Frame |
|---|---|
| Scene starts, BEFORE panel visible | 0 |
| Divider begins spring travel | 20 |
| AFTER panel clips in behind divider | ~25 |
| BEFORE label springs up | 35 |
| AFTER label springs up | 45 |
| Divider settles, breathing begins | 60 |
| AFTER panel push-in zoom starts | 80 |

---

## Pairing Rules

- Follow with **premium-shape-morph-transition** for a dramatic scene exit after the AFTER panel reveals
- Works best AFTER a **premium-kinetic-text** problem statement scene (sets up the contrast)
- Follow with **premium-cursor-engine** or **premium-saas-showcase** to demo the "after" in detail
- If the BEFORE state IS the product's predecessor (old UI), use `ATTACHED_IMAGES[0]` for BEFORE and `ATTACHED_IMAGES[1]` for AFTER
