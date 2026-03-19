---
title: Premium Chaos-to-UI Resolve — Entropy Collapse into Product
impact: HIGH
impactDescription: Floating chaotic elements (avatars, nodes, data pills) suddenly snap into the exact positions of a real product UI at a triggerFrame. The single most emotionally powerful problem→solution transition available.
tags: chaos, resolve, entropy, attractor, transition, aha, problem-solution, avatar, ui-schema, useEntropyWithAttractor
---

## Core Concept

This is the **AHA moment made physical**. Scattered, chaotic floating elements (team avatars, data nodes, message bubbles) suddenly snap into place to form a clean product UI layout — driven entirely by the `useEntropyWithAttractor` hook already in compiler scope.

**The emotional arc:**
1. Chaos phase (0 → triggerFrame): elements float with entropy drift — disorder, confusion
2. Snap phase (triggerFrame → triggerFrame+30): everything springs to product positions — order, relief
3. Hold phase: the product UI holds fully assembled — viewer absorbs the transformation

---

## Core Implementation Pattern

```tsx
// MUST be defined outside component — stable seeds
const CHAOS_ELEMENTS = [
  { id: "avatar-0", label: "Sarah", emoji: "👩", targetX: 0.18, targetY: 0.35 },
  { id: "avatar-1", label: "Marcus", emoji: "👨🏾", targetX: 0.18, targetY: 0.52 },
  { id: "avatar-2", label: "Priya", emoji: "👩🏽", targetX: 0.18, targetY: 0.69 },
  { id: "data-0",   label: "12 tasks", emoji: "📋",  targetX: 0.55, targetY: 0.38 },
  { id: "data-1",   label: "3 overdue", emoji: "⚠️", targetX: 0.55, targetY: 0.55 },
  { id: "data-2",   label: "Deal won", emoji: "🎯",  targetX: 0.72, targetY: 0.42 },
];

export const ChaosToUiResolveScene = ({ BRAND }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const TRIGGER_FRAME = 90; // when chaos snaps to order

  // useEntropyWithAttractor is already in compiler scope
  const { getFloat, attractorProgress, chaosStrength } = useEntropyWithAttractor(0.6, TRIGGER_FRAME);

  // Background dims as chaos resolves
  const bgOpacity = interpolate(attractorProgress, [0, 1], [0.0, 0.85]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: "hidden" }}>

      {/* Ghost UI skeleton — fades in as chaos resolves */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: interpolate(attractorProgress, [0.3, 1], [0, 1]),
        transform: `scale(${interpolate(attractorProgress, [0, 1], [0.95, 1])})`,
      }}>
        <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
      </div>

      {/* Chaotic floating elements */}
      {CHAOS_ELEMENTS.map((el, i) => {
        // Chaos position: random sine drift
        const chaosX = width * (0.1 + (i * 0.17) % 0.8) + getFloat(i, 60);
        const chaosY = height * (0.15 + (i * 0.13) % 0.7) + getFloat(i + 10, 45);

        // Target position: exact UI coordinate
        const targetX = el.targetX * width;
        const targetY = el.targetY * height;

        // Lerp between chaos and target using attractorProgress
        const x = interpolate(attractorProgress, [0, 1], [chaosX, targetX]);
        const y = interpolate(attractorProgress, [0, 1], [chaosY, targetY]);

        // Scale: chaotic = random size, ordered = UI-appropriate size
        const chaosScale = 0.7 + (i % 3) * 0.3;
        const targetScale = 0.85;
        const scale = interpolate(attractorProgress, [0, 1], [chaosScale, targetScale]);

        // Rotation: spins in chaos, levels out
        const rotation = chaosStrength * (Math.sin(frame * 0.04 + i) * 15);

        // Fade out non-UI elements after snap completes
        const opacity = interpolate(attractorProgress, [0.85, 1.0], [1, 0.0]);

        return (
          <div key={el.id} style={{
            position: "absolute",
            left: x - 30, top: y - 30,
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            opacity,
            transition: "none",
          }}>
            <div style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px) saturate(150%)",
              borderRadius: 12,
              padding: "8px 14px",
              display: "flex", alignItems: "center", gap: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 14, color: BRAND.text, whiteSpace: "nowrap" as const,
            }}>
              <span style={{ fontSize: 18 }}>{el.emoji}</span>
              <span style={{ fontWeight: 600 }}>{el.label}</span>
            </div>
          </div>
        );
      })}

      {/* Headline: transforms from problem to solution */}
      <div style={{
        position: "absolute", bottom: "12%", left: "8%",
        opacity: interpolate(frame, [0, 20], [0, 1]),
      }}>
        <MaskedReveal startFrame={5}>
          <div style={{
            fontSize: 96, fontWeight: 900, color: BRAND.text,
            letterSpacing: "-0.04em", lineHeight: 1.0,
            // Crossfade problem text → solution text at triggerFrame
            opacity: attractorProgress < 0.5 ? 1 : 0,
          }}>
            Scattered.
          </div>
        </MaskedReveal>
        <MaskedReveal startFrame={TRIGGER_FRAME + 10}>
          <div style={{
            fontSize: 96, fontWeight: 900,
            color: BRAND.primary,
            letterSpacing: "-0.04em", lineHeight: 1.0,
            opacity: attractorProgress > 0.5 ? 1 : 0,
            position: "absolute", top: 0, left: 0,
          }}>
            Organized.
          </div>
        </MaskedReveal>
      </div>

      {/* GlowBloom at trigger point — "aha" flash */}
      <GlowBloom
        color={BRAND.primary}
        blurPx={80}
        opacity={interpolate(frame, [TRIGGER_FRAME, TRIGGER_FRAME + 8, TRIGGER_FRAME + 35], [0, 0.6, 0])}
        spread={200}
      >
        <div style={{ width: 1, height: 1, position: "absolute", left: "50%", top: "50%" }} />
      </GlowBloom>

    </AbsoluteFill>
  );
};
```

---

## With UISchema Positions (Precise Snapping)

When `UI_SCHEMA` is available, snap elements directly to detected UI sections:

```tsx
// Map UI schema sections to target positions
const uiTargets = UI_SCHEMA?.sections?.map((section, i) => ({
  x: section.x ?? 0.5,
  y: section.y ?? 0.5,
  label: section.label,
})) ?? [];

// Use uiTargets[i] instead of CHAOS_ELEMENTS[i].targetX/Y
```

---

## Timing Guidelines

| Phase | Frames | What happens |
|---|---|---|
| Entry | 0–20 | Chaos elements fade in, start drifting |
| Full chaos | 20–triggerFrame | Max entropy drift, chaotic rotation |
| Snap trigger | triggerFrame | `useEntropyWithAttractor` fires — attractorProgress starts |
| Snap animation | triggerFrame → +30f | Spring snap to UI positions, UI skeleton fades in |
| Hold | +30f → end | UI fully assembled, headline switches, GlowBloom fades |

**triggerFrame recommendation**: 40–50% through scene duration. For a 210f scene: TRIGGER_FRAME = 90.

---

## When to Use

- **Problem → Solution transitions**: floating chaos snaps into clean product
- **AHA moment scenes**: `isAhaMoment: true` — most impactful use case
- **Team coordination products**: scattered avatars snap into a project board
- **Data/analytics products**: floating numbers snap into a dashboard layout
- **Workflow automation**: disconnected steps snap into a pipeline view

---

## Anti-Patterns

- **NEVER define CHAOS_ELEMENTS inside the component** — new random seeds every frame = flicker
- **NEVER use Math.random()** — always `random("stable-key")` or derive from index
- **NEVER snap at frame 0** — chaos phase must last at least 60 frames for contrast
- **NEVER skip the GlowBloom flash** at triggerFrame — it's the emotional punctuation
