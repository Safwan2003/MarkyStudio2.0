---
title: Premium 3D Isometric Explode — Screenshot Layer Reveal
impact: HIGH
impactDescription: splits a static screenshot into floating 3D isometric layers using CSS perspective — the dramatic "architecture reveal" opening used in top-tier agency videos
tags: 3d, isometric, explode, screenshot, layers, depth, css-3d, perspective, parallax, reveal, dramatic, cinematic, architecture, panels
---

## Core Concept

Take ATTACHED_IMAGES[0] and slice it into 3 vertical panels (Sidebar | Main Panel | Right Panel). Float them apart in a CSS 3D isometric space. Panels slowly drift together and snap flat into the live 2D UI.

This creates the illusion that the app "assembles itself in 3D space" before revealing the real product.

**No Three.js required.** Pure CSS transforms with `perspective` + `rotateX` + `rotateY` + `translateZ`.

---

## The Isometric Camera Angle

```css
perspective: 1200px;
rotateX(35deg) rotateY(-20deg) rotateZ(-5deg)
```

This gives a cinematic isometric view that reveals depth without distorting the UI too much.

---

## Panel Slicing Technique

Each panel shows exactly 1/3 of the screenshot by setting `backgroundImage` + `backgroundSize` + `backgroundPosition`. No cropping, no cuts — the browser handles it.

```tsx
const PANEL_W = width * 0.31;  // each panel is ~31% of total width
const PANEL_H = height * 0.82;

// Panel 0 (left/sidebar):    backgroundPosition "0% 50%"
// Panel 1 (center/main):     backgroundPosition "50% 50%"
// Panel 2 (right/detail):    backgroundPosition "100% 50%"

function IsoPanel({ src, posX, bgPositionX, explodeZ, enterFrame }) {
  const prog = spring({ frame: frame - enterFrame, fps, config: { damping: 18, stiffness: 80 }, durationInFrames: 40 });
  const currentZ = interpolate(prog, [0, 1], [explodeZ, 0]); // drift in to Z=0
  const opacity = interpolate(prog, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute",
      left: posX, top: (height - PANEL_H) / 2,
      width: PANEL_W, height: PANEL_H,
      backgroundImage: `url(${src})`,
      backgroundSize: `${(width / PANEL_W) * 100}% auto`,
      backgroundPosition: `${bgPositionX} 50%`,
      backgroundRepeat: "no-repeat",
      transform: `translateZ(${currentZ}px)`,
      opacity,
      borderRadius: 4,
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: `0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)`,
    }} />
  );
}
```

---

## Full Scene Layout

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phase 1 (0–60):   Iso view, panels exploded apart (translateZ: far → 0)
  // Phase 2 (60–100): ISO → FLAT: camera un-rotates while panels close the gap
  // Phase 3 (100+):   Flat screenshot fully assembled, cursor can start walkthrough

  // Camera de-rotation: iso view → flat 2D
  const deRotateP = interpolate(frame, [65, 105], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const rotX  = interpolate(deRotateP, [0, 1], [35, 0]);
  const rotY  = interpolate(deRotateP, [0, 1], [-20, 0]);
  const rotZ  = interpolate(deRotateP, [0, 1], [-5, 0]);

  // Overall scene scale: pull back slightly during explode, zoom in to flat
  const sceneScale = interpolate(deRotateP, [0, 1], [0.78, 1]);

  // Panel gap: panels drift apart from center and come back together
  const gapProgress = spring({ frame, fps, config: { damping: 22, stiffness: 60 }, durationInFrames: 60 });
  const gap = interpolate(gapProgress, [0, 1], [60, 4]); // large gap → tight

  const PANEL_W = width * 0.31;

  return (
    <AbsoluteFill style={{ background: BRAND.bg, overflow: "hidden" }}>
      {/* Ambient glow behind the panels */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 500, borderRadius: "50%",
        background: `radial-gradient(ellipse, ${BRAND.primary}22 0%, transparent 70%)`,
        filter: "blur(60px)",
      }} />

      {/* 3D container */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        perspective: 1200,
      }}>
        <div style={{
          position: "relative",
          width: PANEL_W * 3 + gap * 2,
          height: height * 0.82,
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${sceneScale})`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}>
          {/* Left panel (Sidebar) */}
          {ATTACHED_IMAGES[0] && (
            <div style={{
              position: "absolute",
              left: 0, top: 0, width: PANEL_W, height: "100%",
              backgroundImage: `url(${ATTACHED_IMAGES[0]})`,
              backgroundSize: `${(width / PANEL_W) * 100}% auto`,
              backgroundPosition: "0% 50%",
              backgroundRepeat: "no-repeat",
              transform: `translateZ(${interpolate(spring({ frame, fps, config: {damping:18,stiffness:60}, durationInFrames:60}), [0,1], [120, 0])}px)`,
              opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
              borderRadius: 4, border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }} />
          )}

          {/* Center panel (Main) — no translateZ, anchors the composition */}
          {ATTACHED_IMAGES[0] && (
            <div style={{
              position: "absolute",
              left: PANEL_W + gap, top: 0, width: PANEL_W, height: "100%",
              backgroundImage: `url(${ATTACHED_IMAGES[0]})`,
              backgroundSize: `${(width / PANEL_W) * 100}% auto`,
              backgroundPosition: "50% 50%",
              backgroundRepeat: "no-repeat",
              opacity: interpolate(frame, [8, 25], [0, 1], { extrapolateRight: "clamp" }),
              borderRadius: 4, border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
            }} />
          )}

          {/* Right panel (Detail) */}
          {ATTACHED_IMAGES[0] && (
            <div style={{
              position: "absolute",
              left: (PANEL_W + gap) * 2, top: 0, width: PANEL_W, height: "100%",
              backgroundImage: `url(${ATTACHED_IMAGES[0]})`,
              backgroundSize: `${(width / PANEL_W) * 100}% auto`,
              backgroundPosition: "100% 50%",
              backgroundRepeat: "no-repeat",
              transform: `translateZ(${interpolate(spring({ frame, fps, config: {damping:18,stiffness:60}, durationInFrames:60}), [0,1], [120, 0])}px)`,
              opacity: interpolate(frame, [16, 35], [0, 1], { extrapolateRight: "clamp" }),
              borderRadius: 4, border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }} />
          )}

          {/* No screenshot: show gradient placeholder panels */}
          {!ATTACHED_IMAGES[0] && [0, 1, 2].map((i) => (
            <div key={i} style={{
              position: "absolute",
              left: i * (PANEL_W + gap), top: 0, width: PANEL_W, height: "100%",
              background: `linear-gradient(160deg, ${BRAND.primary}22, ${BRAND.surface})`,
              borderRadius: 4, border: `1px solid ${BRAND.border}`,
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }} />
          ))}
        </div>
      </div>

      {/* Hero label — only visible in iso phase */}
      <div style={{
        position: "absolute", bottom: height * 0.08, left: 0, right: 0,
        textAlign: "center",
        opacity: interpolate(frame, [20, 50, 80, 100], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        <div style={{ fontSize: 13, letterSpacing: 3, textTransform: "uppercase" as const, color: BRAND.primary, fontWeight: 600, fontFamily: BRAND.font ?? "Inter" }}>
          Built for scale
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: BRAND.text, fontFamily: BRAND.font ?? "Inter", marginTop: 6 }}>
          Every layer working together
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

---

## Without Screenshot (Pure Concept Version)

Replace panel background-images with gradient layers labeled by function:

```tsx
const CONCEPT_PANELS = [
  { label: "Data Layer",      bg: `linear-gradient(160deg, #1e3a5f, #0a1628)` },
  { label: "Logic Layer",     bg: `linear-gradient(160deg, ${BRAND.primary}33, #0a0a14)` },
  { label: "Interface Layer", bg: `linear-gradient(160deg, #1a2a3a, #0f0f1a)` },
];
```

---

## When to Use

- **Scene 2 (Problem/Showcase)**: "Architecture reveal" — the app's components assemble from 3D space
- **Hook scene**: "See how X is built" before showing the real UI
- **Transition bridge**: iso explode at end of scene A → flat at start of scene B
- Best with ATTACHED_IMAGES; falls back gracefully to gradient panels without screenshots

---

## Performance Notes

- Use `willChange: "transform"` on the 3D container
- Keep panels to 3 max — more panels = heavy re-paint at each frame
- Use `backgroundRepeat: "no-repeat"` to avoid tiling artifacts
- Don't use `filter: blur()` inside the `preserve-3d` subtree — causes compositing issues
