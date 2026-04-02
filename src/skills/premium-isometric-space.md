---
title: Premium Isometric Space (Viable / WhatAStory Look)
impact: HIGH
impactDescription: forces UI showcases into a 3D/isometric plane with deep shadows so every product shot feels “in the world”, not a flat slideshow
tags: isometric, 3d, depth, viable, whatastory, product-showcase, tilt, shadow, staging
qualityBar: The UI always has perspective depth and feels physically staged. Shadows are soft and cinematic, the plane floats slightly, and the cursor layer stays in true screen-space (not tilted).
---

## What this skill does
This skill is a **mandatory wrapper** for high-end product showcases (reconstructed UI, device mockups, app shells). It prevents flat 2D screenshots by enforcing a consistent isometric stage.

## Core rule (mandatory)
- Wrap your primary UI content in `IsometricWrapper`.
- Keep **cursor layers OUTSIDE** the wrapper so the cursor doesn’t tilt/scale with the plane.

## Canonical pattern (copy)

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gentle float up (keeps it “alive” before hold)
  const float = Math.sin(frame * 0.03) * 2;

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Background first */}
      <LightArcBg brand={BRAND} variant={GLOBAL_BG || "arcs"} />

      {/* Isometric staged UI */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IsometricWrapper lift={12} shadowOpacity={0.35} rotateX={58} rotateZ={-28} scale={1.0}>
          <div style={{ transform: `translateY(${float}px)` }}>
            {/* Prefer reconstructed UI when UI_SCHEMA is available */}
            {UI_SCHEMA ? (
              <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
            ) : (
              <AppShell brand={BRAND}>{/* ... */}</AppShell>
            )}
          </div>
        </IsometricWrapper>
      </div>

      {/* Cursor must be OUTSIDE the isometric wrapper */}
      {/* <CursorRenderer steps={CURSOR_STEPS} uiSchema={UI_SCHEMA} /> */}
    </AbsoluteFill>
  );
};
```

## Camera + depth notes
- If you need additional depth, add `DepthStack` **inside** `IsometricWrapper` (not outside).
- Never combine multiple heavy perspectives (e.g. don’t stack `TiltWrapper` + `IsometricWrapper` + extreme `rotateY` on the same layer).

## Anti-patterns (hard fails)
- Flat UI (no perspective) on any showcase scene.
- Cursor inside the isometric wrapper (feels “stuck to glass” and breaks realism).
- Harsh shadows (opacity > 0.5) or sharp edges; keep shadows soft, multi-layer.

