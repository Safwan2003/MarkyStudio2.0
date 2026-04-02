# MarkyStudio — All Skills (Full Detail)

> This file is a **single compiled reference** of every skill guidance document in `src/skills/`.
> Use it as the “skills brain” when planning or generating scenes.

> **Generated on:** 2026-03-30  
> **Notes:** The canonical skill registry (names + import wiring) lives in `src/skills/index.ts`.

---

## Table of contents

- [How to use this file](#how-to-use-this-file)
- [Skill index](#skill-index)
- [Example skills (code snippets)](#example-skills-code-snippets)
- [Skills (full content)](#skills-full-content)

---

## How to use this file

- Treat each skill as a **contract**: follow its **MANDATORY** rules and avoid its **anti-patterns**.
- Pick **1 primary** skill per scene, optionally **1 supporting** skill, and keep motion within the Director's `skillBudget` / `motionBudget`.
- For UI scenes: prefer `premium-reconstructed-ui` plus a staging skill (e.g. `premium-isometric-space`) and keep cursor outside any 3D wrapper.

---

## Skill index

### Files
- `premium-3d-device-mockup`
- `premium-3d-isometric-explode`
- `premium-ambient-environment`
- `premium-animated-topbar`
- `premium-app-walkthrough`
- `premium-audio`
- `premium-before-after`
- `premium-bold-color-showcase`
- `premium-callout-bubble`
- `premium-camera-zoom`
- `premium-chameleon-ui`
- `premium-chaos-to-ui-resolve`
- `premium-char-split`
- `premium-confetti-celebration`
- `premium-cta-scene`
- `premium-cursor-engine`
- `premium-customer-journey`
- `premium-data-flow-abstract`
- `premium-data-reveal`
- `premium-device-mockup`
- `premium-dot-matrix-bg`
- `premium-feature-bundle-cards`
- `premium-feature-grid`
- `premium-feature-list`
- `premium-feedback-storm`
- `premium-floating-icon-chaos`
- `premium-floating-path-nodes`
- `premium-glassmorphism`
- `premium-gradient-hero`
- `premium-icon-arc-reveal`
- `premium-icon-bubble-row`
- `premium-icon-concept-scene`
- `premium-in-app-chat`
- `premium-ink-logo-reveal`
- `premium-integration-wall`
- `premium-interaction-sfx`
- `premium-interactive-ui`
- `premium-isometric-space`
- `premium-kinetic-text`
- `premium-light-arc-bg`
- `premium-light-textured-bg`
- `premium-live-action-composite`
- `premium-logo-wall`
- `premium-macro-closeup`
- `premium-match-cut`
- `premium-metric-flyout`
- `premium-multi-corner-gradient`
- `premium-multi-device`
- `premium-multi-view-walkthrough`
- `premium-narration-reveal`
- `premium-narrative-overlay`
- `premium-neon-dark`
- `premium-network-intro`
- `premium-notification-scatter`
- `premium-notification-toast`
- `premium-person-cards`
- `premium-phone-notification`
- `premium-real-photo-device`
- `premium-reconstructed-ui`
- `premium-responsive-viewport`
- `premium-saas-hook`
- `premium-saas-showcase`
- `premium-scroll-demo`
- `premium-section-title`
- `premium-shape-morph-transition`
- `premium-single-shot-morphing`
- `premium-social-proof`
- `premium-split-screen`
- `premium-stat-counter`
- `premium-tactile-feedback`
- `premium-team-orbit`
- `premium-testimonial-card`
- `sequencing`

---

## Example skills (code snippets)

In addition to the markdown “guidance skills” in `src/skills/*.md`, the codebase also exposes **example skills** (complete working code references) via `src/skills/index.ts`. These are returned as embedded TSX snippets (not markdown files):

- `example-histogram`
- `example-progress-bar`
- `example-text-rotation`
- `example-falling-spheres`
- `example-animated-shapes`
- `example-lottie`
- `example-gold-price-chart`
- `example-typewriter-highlight`
- `example-word-carousel`

---

## Skills (full content)

> Below is the verbatim content of each `src/skills/*.md` file.

---

## premium-3d-device-mockup

> Source: `src/skills/premium-3d-device-mockup.md`

# premium-3d-device-mockup

## Overview
Renders a true 3D MacBook, phone, or tablet mockup using `@remotion/three` + `@react-three/fiber`.
A cinematic camera orbits the device while the product screenshot is mapped onto the screen geometry.
Unlike the CSS-only `premium-device-mockup`, this skill produces physically accurate 3D depth,
specular highlights, and real parallax — indistinguishable from a professional 3D render.

## When to use
- Product showcase scenes requiring cinematic depth (launch, hero showcase, investor demo)
- Before/after comparisons where depth separation must be tactile and premium
- Any scene where the device needs to slowly rotate, orbit, or dramatically swing into frame
- High-stakes B2B SaaS: enterprise, fintech, analytics, design tools

## Technical approach
Use `ThreeCanvas` (already in scope) + inline Three.js geometry.
Do NOT import `@react-three/fiber` — use `ThreeCanvas` directly from scope.
The screen texture is created from `ATTACHED_IMAGES[0]` via a `<Img>` element rendered as a texture.

## Component pattern — MacBook 3D

```jsx
const Scene = () => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Cinematic camera orbit: slow arc from side to front over 90 frames
  const orbitProgress = spring({ frame, fps, config: { damping: 200, stiffness: 30 }, durationInFrames: 90 });
  const cameraAngleY = interpolate(orbitProgress, [0, 1], [-0.7, 0.12]); // radians
  const cameraAngleX = interpolate(orbitProgress, [0, 1], [0.25, 0.08]);
  const cameraZ = interpolate(orbitProgress, [0, 1], [5.5, 4.2]);

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Ambient glow bloom behind device */}
      <div style={{
        position: "absolute",
        left: "50%", top: "52%",
        width: 600, height: 400,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse, ${BRAND.primary}28 0%, transparent 70%)`,
        filter: "blur(40px)",
      }} />

      <ThreeCanvas
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0 }}
      >
        <MacBook3D
          frame={frame}
          fps={fps}
          cameraAngleX={cameraAngleX}
          cameraAngleY={cameraAngleY}
          cameraZ={cameraZ}
          screenImage={ATTACHED_IMAGES[0] ?? null}
          brand={BRAND}
        />
      </ThreeCanvas>

      {/* Floating headline over the device */}
      {orbitProgress > 0.6 && (
        <div style={{
          position: "absolute",
          bottom: 160, left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: interpolate(orbitProgress, [0.6, 0.85], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <div style={{ fontFamily: BRAND.font, fontSize: 32, fontWeight: 700, color: BRAND.text }}>
            Built for your workflow
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
```

## MacBook3D component (inline in the scene)

```jsx
const MacBook3D = ({ frame, fps, cameraAngleX, cameraAngleY, cameraZ, screenImage, brand }) => {
  // Camera setup
  const camera = new THREE.PerspectiveCamera(40, 16/9, 0.1, 100);
  camera.position.set(
    Math.sin(cameraAngleY) * cameraZ,
    Math.sin(cameraAngleX) * cameraZ * 0.6,
    Math.cos(cameraAngleY) * cameraZ,
  );
  camera.lookAt(0, 0.1, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(3, 4, 5);
  const rimLight = new THREE.DirectionalLight(brand?.primary ? parseInt(brand.primary.slice(1), 16) : 0x6366f1, 0.4);
  rimLight.position.set(-4, 2, -3);

  // Screen texture from ATTACHED_IMAGES
  // Convert base64 data URLs to Blob URLs to avoid headless Chrome OOM crash during Lambda rendering.
  // THREE.TextureLoader with large base64 strings keeps the raw data in memory across all frames;
  // Blob URLs let the browser manage the backing store and GC it properly.
  const screenBlobUrl = React.useMemo(() => {
    if (!screenImage) return null;
    if (!screenImage.startsWith('data:')) return screenImage;
    try {
      const [header, b64data] = screenImage.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
      const binary = atob(b64data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: mime }));
    } catch {
      return screenImage; // fallback to raw data URL if conversion fails
    }
  }, [screenImage]);
  const screenTexture = screenBlobUrl
    ? new THREE.TextureLoader().load(screenBlobUrl)
    : null;
  const screenMaterial = new THREE.MeshStandardMaterial({
    map: screenTexture,
    color: screenTexture ? 0xffffff : 0x111827,
    roughness: 0.05,
    metalness: 0.1,
  });

  // Body material — space gray aluminum
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d2d2d,
    roughness: 0.35,
    metalness: 0.85,
  });

  // Lid: screen plane (16:10 ratio) + thin bezel frame
  const lidAngle = interpolate(frame, [0, 40], [-Math.PI * 0.45, -Math.PI * 0.02], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const scene3d = new THREE.Scene();
  scene3d.add(ambientLight);
  scene3d.add(keyLight);
  scene3d.add(rimLight);

  // Base (keyboard deck)
  const baseGeo = new THREE.BoxGeometry(2.8, 0.06, 1.8);
  const baseMesh = new THREE.Mesh(baseGeo, bodyMaterial);
  baseMesh.position.set(0, 0, 0);
  scene3d.add(baseMesh);

  // Lid group — pivot at back edge
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.03, -0.9);
  lidGroup.rotation.x = lidAngle;

  // Screen panel
  const screenGeo = new THREE.PlaneGeometry(2.6, 1.65);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, 0.88, 0.01);
  lidGroup.add(screenMesh);

  // Lid back panel
  const lidGeo = new THREE.BoxGeometry(2.8, 0.04, 1.72);
  const lidMesh = new THREE.Mesh(lidGeo, bodyMaterial);
  lidMesh.position.set(0, 0.83, -0.01);
  lidGroup.add(lidMesh);

  scene3d.add(lidGroup);

  return { scene: scene3d, camera };
};
```

## Phone 3D variant (portrait)

```jsx
// For phone mockup — use BoxGeometry for body + rounded look via ShapeGeometry
const Phone3D = ({ frame, fps, screenImage, brand }) => {
  // Slow tumble into upright position
  const settleProgress = spring({ frame, fps, config: { damping: 180, stiffness: 35 }, durationInFrames: 75 });
  const rotateY = interpolate(settleProgress, [0, 1], [0.8, 0.1]);
  const rotateX = interpolate(settleProgress, [0, 1], [-0.3, 0.0]);

  // Phone body: tall rectangle with rounded corners approximated by 3D box
  const bodyGeo = new THREE.BoxGeometry(0.85, 1.72, 0.072);
  const screenGeo = new THREE.PlaneGeometry(0.72, 1.52);

  // ... mount in scene with camera at (0, 0, 3.5), lookAt(0, 0, 0)
};
```

## Cinematic camera moves

```jsx
// Orbit: slow sweep from side angle to hero frontal
cameraAngleY: interpolate(orbitProgress, [0, 1], [-0.7, 0.12])  // wide side → slight hero angle

// Dolly push-in: camera moves closer as lid opens
cameraZ: interpolate(lidOpenProgress, [0, 1], [5.5, 3.8])

// Slight tilt during reveal: adds weight and dimension
cameraAngleX: interpolate(orbitProgress, [0, 1], [0.22, 0.06])  // looking slightly down → level
```

## Lighting setup rules
- Always add 3 lights: ambient (0.5–0.7), key directional (1.0–1.4), rim directional (BRAND.primary tinted, 0.3–0.5)
- Key light: upper-right (3, 4, 5) — mimics studio key light
- Rim light: upper-left-back (-4, 2, -3) — separation from background
- Screen: low roughness (0.05), low metalness (0.1) — screens absorb and emit
- Body: higher roughness (0.3–0.4), high metalness (0.8–0.9) — brushed aluminum

## Animation timing

| Beat | Frames | What happens |
|---|---|---|
| Lid opens | 0–40f | BoxGeometry lid rotates from closed (-0.45π) to open (-0.02π) |
| Camera orbits | 0–90f | Camera swings from side angle to front-hero position |
| Screen appears | 40–70f | Screen texture fades in as lid reaches open position |
| Hold | 90–150f | Device held at slight angle, floating (gentle Y sine ±2px) |

## Integration rules
- ATTACHED_IMAGES[0] maps to the MacBook screen texture
- ATTACHED_IMAGES[1] (if present) maps to phone screen in dual-device compositions
- Brand primary color drives rim light tint
- Always add a soft glow bloom (radial gradient div) behind the device at zIndex:-1
- Pair with `MeshGradientBg` for cinematic background depth
- `useVitality(mode: "float")` for subtle Y float after device settles

## Anti-patterns
- DO NOT use CSS perspective for this skill — that's `premium-device-mockup`
- DO NOT import THREE — it's already in scope as `THREE`
- DO NOT import @react-three/fiber — use `ThreeCanvas` from scope
- DO NOT create complex material graphs — keep to StandardMaterial only
- DO NOT use more than 3 lights — performance degrades in browser render

---

## premium-3d-isometric-explode

> Source: `src/skills/premium-3d-isometric-explode.md`

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

---

## premium-ambient-environment

> Source: `src/skills/premium-ambient-environment.md`

---
title: Premium Ambient Environment — Breathing Background & Particles
impact: HIGH
impactDescription: A mandatory global wrapper that injects cinematic zoom, entropy dust particles, and massive atmospheric gradient orbs into any flat scene. Cures "dead background syndrome."
tags: ambient, background, wrapper, particles, orbs, breathing, environment, depth, glow, cinematic, dark-mode, particle-system, atmosphere, bokeh
---

## Core Concept

A static brand-color background is dead. A premium background **breathes**.

This skill provides a single wrapper component that injects three layered systems simultaneously:
1. **Cinematic Camera** — slow `1.0→1.06` scale push on the entire scene
2. **Atmospheric Orbs** — massive, heavily blurred brand-color blobs at opposite corners
3. **Entropy Dust** — 18 tiny particles at varying speeds (foreground = fast/large, background = slow/small)

**Usage Rule:** Wrap the content of `AbsoluteFill` in `<AmbientEnvironment>` in almost every scene unless a specific full-bleed image/video background is required.

---

## Core Animation Pattern (Mandatory Wrapper)

```tsx
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

// PARTICLES must be defined OUTSIDE the component — stable seeds, no flicker
const DUST_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left:    `${(i * 13.7) % 100}%`,
  size:    i % 3 === 0 ? 4 : 2,         // Larger foreground particles
  blur:    i % 3 === 0 ? 2 : 0,         // Blur foreground particles
  speed:   0.2 + (i * 0.03),            // Varying speeds = depth of field
  opacity: 0.1 + (i * 0.01),
}));

export const AmbientEnvironment = ({ BRAND, children }) => {
  const frame = useCurrentFrame();

  // Cinematic camera — slow, continuous push
  const cameraZoom = interpolate(frame, [0, 150], [1.0, 1.06], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* ATMOSPHERIC ORBS — placed at opposite corners for diagonal depth */}
      {/* Top-left: brand primary */}
      <div style={{
        position: "absolute",
        top: "-20%", left: "-10%",
        width: "65vw", height: "65vw",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${BRAND.primary || "#6366f1"} 0%, transparent 70%)`,
        opacity: 0.15,
        filter: "blur(120px)",
        transform: `translateY(${Math.sin(frame * 0.02) * 40}px)`,
        pointerEvents: "none",
      }} />
      {/* Bottom-right: brand secondary / complementary */}
      <div style={{
        position: "absolute",
        bottom: "-30%", right: "-10%",
        width: "80vw", height: "80vw",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${BRAND.secondary || "#38bdf8"} 0%, transparent 70%)`,
        opacity: 0.10,
        filter: "blur(140px)",
        transform: `translateY(${Math.cos(frame * 0.015) * -50}px)`,
        pointerEvents: "none",
      }} />

      {/* CAMERA WRAPPER — entire scene scales together */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${cameraZoom})`,
        transformOrigin: "center center",
      }}>

        {/* ENTROPY DUST — tiny particles at z:1, behind all content */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
          {DUST_PARTICLES.map((p, i) => {
            // Modulo loop: particle rises from bottom, wraps back to top seamlessly
            const yDrift = (frame * p.speed * 30) % 1080;
            return (
              <div key={i} style={{
                position: "absolute",
                left: p.left,
                bottom: yDrift - 20,
                width: p.size,
                height: p.size,
                backgroundColor: "white",
                borderRadius: "50%",
                opacity: p.opacity,
                filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
              }} />
            );
          })}
        </div>

        {/* SCENE CONTENT — z:10+ so it sits above dust */}
        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          {children}
        </div>

      </div>
    </AbsoluteFill>
  );
};
```

---

## Usage Example

```tsx
export const MyScene = ({ BRAND }) => {
  return (
    <AmbientEnvironment BRAND={BRAND}>
      {/* All scene content here — text stacks, UI panels, cards, etc. */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ fontSize: 96, fontWeight: 900, color: "#fff" }}>Your Content</h1>
      </div>
    </AmbientEnvironment>
  );
};
```

---

## Orbiting Glow Orb Variant (Full Orbital)

For scenes where orbs should actively orbit rather than drift — each orb has its own orbital radius, speed, and phase offset. Use `mix-blend-mode: "screen"` on dark backgrounds for additive color mixing:

```tsx
const ORBS = [
  { r: 0.28, speed: 0.006, phase: 0,           color: BRAND.primary,             size: 700, opacity: 0.55 },
  { r: 0.22, speed: 0.009, phase: Math.PI,      color: BRAND.secondary || "#38bdf8", size: 600, opacity: 0.45 },
  { r: 0.32, speed: 0.004, phase: Math.PI / 2,  color: BRAND.primary,             size: 550, opacity: 0.30 },
  { r: 0.18, speed: 0.013, phase: Math.PI * 1.5, color: BRAND.secondary || "#38bdf8", size: 400, opacity: 0.35 },
];

{ORBS.map((orb, i) => {
  const angle = frame * orb.speed + orb.phase;
  const orbX  = Math.cos(angle) * orb.r * width;
  const orbY  = Math.sin(angle) * orb.r * height;
  return (
    <div key={i} style={{
      position: "absolute",
      left: "50%", top: "50%",
      width: orb.size, height: orb.size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${orb.color}99 0%, transparent 65%)`,
      filter: "blur(80px)",
      transform: `translate(-50%, -50%) translate(${orbX}px, ${orbY}px)`,
      mixBlendMode: "screen",
      opacity: orb.opacity,
      pointerEvents: "none",
    }} />
  );
})}
```

**When to use orbital vs corner orbs:**
- **Corner orbs** (wrapper default): subtle, constant. Works for all scene types.
- **Orbital orbs**: more energetic, visible rotation. Best for Hook and Social Proof scenes.

---

## Orb Size & Opacity Reference

| Scene Energy | Orb Size | Opacity | Blur |
|---|---|---|---|
| Calm / CTA | `50–60vw` | `0.08–0.12` | `120–140px` |
| Standard showcase | `60–70vw` | `0.12–0.18` | `100–120px` |
| Hook / high-energy | `70–90vw` | `0.18–0.25` | `80–100px` |

**Rule**: Orbs must NEVER be small enough to have a visible boundary. If you can see the edge of the orb, it's too small or not blurred enough.

---

## Anti-Patterns

- **NEVER leave a scene background as a flat hex color** like `#0f172a`. It removes all 3D physical context. Wrap in `<AmbientEnvironment>`.
- **NEVER use `linear-gradient` for premium dark backgrounds.** They look like 2015 web design. Use massive absolute-positioned `radial-gradient` circles with extreme blur (`120px+`).
- **NEVER define DUST_PARTICLES inside the component.** Each render generates new random seeds = particles flicker. Always define outside component.
- **NEVER use small orbs** (under 40vw). The blur radius must far exceed the visible content area — they're atmospheric washes, not visible shapes.
- **NEVER use `mix-blend-mode: "screen"` on light backgrounds** — only works on dark (#111 or darker). On light: use standard `opacity` without blend mode.

---

## Quality Checklist

- [ ] `DUST_PARTICLES` array defined OUTSIDE the component (stable, no flicker)
- [ ] Orbs are `60vw+` diameter, `blur(120px+)`, opacity ≤ 0.18
- [ ] Orbs placed at opposite corners (diagonal) for natural depth gradient
- [ ] Orbs drift via `Math.sin` / `Math.cos` (slow, visible motion)
- [ ] Camera zoom: `interpolate(frame, [0, 150], [1.0, 1.06])` wraps full content
- [ ] Entropy dust uses modulo `(frame * speed * 30) % 1080` for seamless loop
- [ ] Dust sits at `zIndex: 1`, scene content at `zIndex: 10`

---

## premium-animated-topbar

> Source: `src/skills/premium-animated-topbar.md`

# premium-animated-topbar

## When to Use
Use alongside AnimatedSidebar when reconstructing a SaaS product UI. The topbar goes between the sidebar and the main content area.

## Component
```tsx
<AnimatedTopbar
  tabs={[
    { label: "Overview", isActive: false },
    { label: "Integrations", isActive: true },
    { label: "Settings", isActive: false },
  ]}
  breadcrumb="Projects / KMS Project"
  hasSearch={true}
  hasAvatar={true}
  brand={BRAND}
  startFrame={10}
  activeTabIndex={activeTabIndex}  // ← derive dynamically from frame
/>
```

## Tab Switching Animation — CRITICAL PATTERN

To animate the cursor clicking a tab and the underline sliding, derive `activeTabIndex` from the current frame:

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Define when each tab becomes active (frame when cursor click fires)
// cursor click fires at: step.time + 25 (TRAVEL frames)
const TAB_CLICK_FRAMES = [
  { tabIndex: 0, frame: 0 },         // initial tab (Overiew active from start)
  { tabIndex: 2, frame: 95 },        // cursor clicks "Settings" tab at f:95
];

// Derive active tab from current frame
const activeTabIndex = TAB_CLICK_FRAMES.reduce(
  (acc, { tabIndex, frame: switchFrame }) => frame >= switchFrame ? tabIndex : acc,
  TAB_CLICK_FRAMES[0].tabIndex
);

// Use in AnimatedTopbar:
<AnimatedTopbar
  tabs={[
    { label: "Overview", isActive: false },
    { label: "Analytics", isActive: false },
    { label: "Settings", isActive: false },
  ]}
  brand={BRAND}
  startFrame={10}
  activeTabIndex={activeTabIndex}  // ← spring-animates when this changes
/>
```

The underline will smoothly spring from the old position to the new one.

## Timing Rules
- Topbar appears at `startFrame={10}` (sidebar at 0, topbar at 10, content at 25)
- Tab click frame = `cursor_step.time + 25` (TRAVEL frames after spring starts)
- After tab click, show new main content area sliding in from right (translateX 100% → 0%)

## Props
- `tabs`: array of `{ label: string; isActive?: boolean }`
- `breadcrumb`: optional breadcrumb path string (e.g., "Projects / Settings")
- `hasSearch`: shows a search input on the right
- `hasAvatar`: shows a user avatar circle on the right
- `activeTabIndex`: **0-based index** of the currently active tab — drives the sliding underline
- `height`: default 48px — matches sidebar layout math: `SIDEBAR_W=240, TOPBAR_H=48`

---

## premium-app-walkthrough

> Source: `src/skills/premium-app-walkthrough.md`

# premium-app-walkthrough

## When to Use
Use when the video shows multiple screens from the SAME product (e.g., Settings → Integrations → Billing). The sidebar and topbar should persist while only the main content area transitions between screens.

## Pattern
Instead of generating each screen as a completely independent scene:
1. Generate ONE persistent app shell (AnimatedSidebar + AnimatedTopbar)
2. For each screen transition, only change the main content area
3. Animate the content transition as a slide (old exits, new enters)
4. Update the activeTabIndex on AnimatedTopbar for each screen switch

## Code Pattern
```tsx
const SCREENS = [
  { activeTab: 0, startFrame: 0 },
  { activeTab: 2, startFrame: 180 },
  { activeTab: 4, startFrame: 360 },
];

const currentScreenIdx = SCREENS.findIndex((s, i) =>
  frame >= s.startFrame && (i === SCREENS.length - 1 || frame < SCREENS[i+1].startFrame)
);
const currentScreen = SCREENS[Math.max(0, currentScreenIdx)];

const SIDEBAR_WIDTH = 240;
const TOPBAR_HEIGHT = 48;

// Persistent shell
<AnimatedSidebar appName="MyApp" items={sidebarItems} brand={BRAND} startFrame={0} />
<AnimatedTopbar
  tabs={topbarTabs}
  brand={BRAND}
  startFrame={10}
  activeTabIndex={currentScreen.activeTab}
/>

// Main content area — slides between screens
<div style={{ position: "absolute", left: SIDEBAR_WIDTH, top: TOPBAR_HEIGHT, right: 0, bottom: 0, overflow: "hidden" }}>
  {SCREENS.map((screen, i) => {
    const isActive = frame >= screen.startFrame &&
      (i === SCREENS.length - 1 || frame < SCREENS[i+1].startFrame);
    const slideProgress = spring({
      frame: frame - screen.startFrame, fps,
      config: SPRING_CONFIGS.entrance
    });
    return (
      <div key={i} style={{
        position: "absolute", inset: 0,
        transform: `translateX(${isActive ? (1 - slideProgress) * 100 : 100}%)`,
        opacity: isActive ? slideProgress : 0,
      }}>
        {/* Screen-specific content for screen i */}
      </div>
    );
  })}
</div>
```

## Rules
- Always keep AnimatedSidebar and AnimatedTopbar outside the sliding content area
- The active sidebar item should update as the cursor navigates between screens
- Pair this skill with premium-cursor-engine to show cursor clicking tabs/nav items
- Recommended for products with 2-3 screens in a single showcase scene

---

## premium-audio

> Source: `src/skills/premium-audio.md`

# Premium Audio Skill

Use Remotion's `<Audio>` component to add background music, voiceover narration,
and volume automation. `Audio` is already in scope — do NOT import it.

---

## 1. Background Music (royalty-free CDN, no API key needed)

Pick a genre based on `BRAND.style` and the scene mood:

```tsx
// ── MUSIC TRACKS — select by BRAND.musicStyle (injected from plan route) ─────
const FREE_MUSIC_TRACKS = {
  "energetic":     "https://cdn.pixabay.com/audio/2024/08/20/audio_6c53572dfa.mp3",
  "cinematic":     "https://cdn.pixabay.com/audio/2024/02/15/audio_b99e82e13f.mp3",
  "corporate":     "https://cdn.pixabay.com/audio/2023/11/13/audio_3c2e86c693.mp3",
  "calm":          "https://cdn.pixabay.com/audio/2023/09/07/audio_168f2040eb.mp3",
  "playful":       "https://cdn.pixabay.com/audio/2024/04/09/audio_9c659e933b.mp3",
} as const;

// SELECTION RULES — use BRAND.musicStyle first:
// BRAND.musicStyle === "energetic" → "energetic" (fast-paced UI, high energy recording)
// BRAND.musicStyle === "calm"      → "calm" (minimal UI, deliberate pace)
// BRAND.musicStyle === "cinematic" → "cinematic" (dark SaaS, dramatic brand moments)
// BRAND.musicStyle === "corporate" → "corporate" (light B2B, enterprise)
// BRAND.musicStyle === "playful"   → "playful" (consumer SaaS, collaboration tools)
// Fallback if musicStyle not set: dark → "cinematic", light → "corporate"
const trackKey = (BRAND.musicStyle ?? (BRAND.style === "dark" ? "cinematic" : "corporate")) as keyof typeof FREE_MUSIC_TRACKS;
const SELECTED_TRACK = FREE_MUSIC_TRACKS[trackKey] ?? FREE_MUSIC_TRACKS["cinematic"];

export const MyAnimation = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const FADE_IN  = fps * 1.5;
  const FADE_OUT = fps * 2;

  const musicVolume = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0,  0.35,   0.35,                         0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill>
      <Audio
        src={SELECTED_TRACK}
        volume={musicVolume}
        loop
      />
      {/* … visual scene content … */}
    </AbsoluteFill>
  );
};
```

---

## 2. Voiceover + Background Music (when VOICEOVER_AUDIO_URL is in scope)

When a scene has pre-generated ElevenLabs narration, `VOICEOVER_AUDIO_URL` is
injected into scope as a constant. Use it like this:

```tsx
export const MyAnimation = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const FADE_IN  = fps * 0.5;
  const FADE_OUT = fps * 1;

  // Voiceover — prominent volume
  const voVolume = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0,  0.9,    0.9,                          0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Background music — ducked under voiceover
  const bgVolume = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0,  0.15,   0.15,                          0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill>
      {/* Voiceover narration */}
      {VOICEOVER_AUDIO_URL && (
        <Audio src={VOICEOVER_AUDIO_URL} volume={voVolume} />
      )}
      {/* Ducked background music — SELECTED_TRACK chosen from BRAND.musicStyle */}
      <Audio
        src={SELECTED_TRACK}
        volume={bgVolume}
        loop
      />
      {/* … visual scene content … */}
    </AbsoluteFill>
  );
};
```

---

## 3. Volume Automation (fade-in / fade-out)

```tsx
const musicVolume = interpolate(
  frame,
  [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
  [0,  0.4,    0.4,                          0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);
<Audio src="..." volume={musicVolume} loop />
```

The `volume` prop accepts a **per-frame callback** `(frame: number) => number`.

---

## 4. Per-Frame SFX at Specific Frames

```tsx
// Click SFX at frame 45
const sfxVolume = (f: number) => f >= 45 && f < 57 ? 1 : 0;
<Audio src="https://cdn.pixabay.com/audio/2022/03/10/audio_c5816a04bc.mp3" volume={sfxVolume} />
```

---

## 5. Audio Inside a `<Sequence>`

When `<Audio>` lives inside a `<Sequence>`, frame 0 aligns with the Sequence's `from` prop — no manual offset needed.

---

## 6. Rules & Best Practices

| Rule | Detail |
|------|--------|
| **Do NOT import Audio** | Already in scope — re-importing causes `ReferenceError` |
| **`FREE_MUSIC_TRACKS` must be declared** | Copy the const from Section 1 into your component file |
| **Check `VOICEOVER_AUDIO_URL` before use** | It may be `null` if TTS was not generated — always guard with `{VOICEOVER_AUDIO_URL && <Audio ... />}` |
| **Duck bg music under voiceover** | BG music ≤ 0.2 vol when voiceover is present |
| **Fade out before scene end** | Interpolate to 0 in last 30–45 frames for clean cuts |
| **Loop short tracks** | Always add `loop` to background music |
| **No per-frame logs in volume fn** | Fires every frame — never `console.log` inside |

---

## premium-before-after

> Source: `src/skills/premium-before-after.md`

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

---

## premium-bold-color-showcase

> Source: `src/skills/premium-bold-color-showcase.md`

# premium-bold-color-showcase

## When to use
- AHA/CONFIDENCE scene that needs dramatic visual punctuation
- After several light/neutral scenes, create contrast with a bold saturated color fill
- Single-punch "this is the moment" reveal — maximum visual impact

## Pattern
```tsx
<BoldColorBg color={BRAND.primary} vignetteStrength={0.12} />
<AbsoluteFill style={{ zIndex: 10 }}>
  <TiltWrapper tiltX={-2} tiltY={3} glossy={true}>
    {/* Product UI or device mockup here — white card with extra-heavy shadow */}
    <div style={{
      background: "white",
      borderRadius: 20,
      boxShadow: GLOBAL_STYLE.shadowHigh,
      padding: 40,
    }}>
      {/* Feature content */}
    </div>
  </TiltWrapper>
</AbsoluteFill>
```

## Rules
1. Only use BRAND.primary or BRAND.secondary as the bg color — never custom hex
2. Only for CONFIDENCE or AHA scenes (emotionalIntent: CONFIDENCE | AHA)
3. Card shadows MUST be GLOBAL_STYLE.shadowHigh (high-elevation 3-layer shadow)
4. Text on cards: dark (#0f172a) regardless of brand style
5. Maximum 1 bold-color scene per video — use sparingly for maximum contrast effect
6. vignetteStrength: 0.10–0.18 (light vignette reinforces focus on card)
7. Add a MaskedReveal on the headline for the signature WhatAStory slide-up

## BoldColorBg component
`BoldColorBg` is already in scope — do NOT redeclare it.
Props: `color` (hex string), `vignetteStrength` (0–1, default 0.15)

## Typical structure
```tsx
const headlineProgress = spring({ frame: frame - 20, fps, config: SPRING_CONFIGS.snap });

<AbsoluteFill>
  <BoldColorBg color={BRAND.primary} vignetteStrength={0.12} />
  {/* White card — springs in with snap config */}
  <AbsoluteFill style={{ zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <TiltWrapper tiltX={-3} tiltY={4} glossy={true}>
      <div style={{
        background: "white", borderRadius: 24,
        boxShadow: "0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.06)",
        padding: "48px 56px", maxWidth: 800,
        transform: `scale(${interpolate(headlineProgress, [0,1], [0.92,1])})`,
        opacity: headlineProgress,
      }}>
        <MaskedReveal startFrame={20} config={SPRING_CONFIGS.snap}>
          <div style={{ fontSize: 108, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.04em" }}>
            Done in seconds.
          </div>
        </MaskedReveal>
        <div style={{ fontSize: 28, color: "rgba(15,23,42,0.6)", marginTop: 16 }}>
          {BRAND.cta || "Start your free trial"}
        </div>
      </div>
    </TiltWrapper>
  </AbsoluteFill>
</AbsoluteFill>
```

---

## premium-callout-bubble

> Source: `src/skills/premium-callout-bubble.md`

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
- Pair with `premium-cursor-engine` — the cursor triggers the callout bubble
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

---

## premium-camera-zoom

> Source: `src/skills/premium-camera-zoom.md`

---
title: Premium Camera Zoom / Hero Reveal
impact: HIGH
impactDescription: creates cinematic "zoom into screen" reveal — starts with a device mockup wide shot, then zooms into the product UI for maximum impact
tags: camera-zoom, hero-reveal, laptop-mockup, zoom, cinematic, pan, parallax
---

## Hero Zoom: Laptop → Full Screen

The most cinematic SaaS technique: start wide showing a laptop on a desk, then slowly spring-zoom into the screen until the product UI fills the frame.

### Spring-Based Zoom

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Delay the zoom — hold the wide shot for 1.5s (45 frames) first
const zoomProgress = spring({
  frame: frame - 45,
  fps,
  config: { damping: 26, stiffness: 35, mass: 1.5 }, // Heavy, slow, cinematic
});

// Laptop screen coordinates as % of video (tune to match your device image)
const START_TOP    = 33.6;  // % from top
const START_LEFT   = 33.6;  // % from left
const START_WIDTH  = 29;    // % of video width
const START_HEIGHT = 32;    // % of video height

// Interpolate from screen inset → full video
const top    = interpolate(zoomProgress, [0, 1], [START_TOP,    0]);
const left   = interpolate(zoomProgress, [0, 1], [START_LEFT,   0]);
const width  = interpolate(zoomProgress, [0, 1], [START_WIDTH,  100]);
const height = interpolate(zoomProgress, [0, 1], [START_HEIGHT, 100]);
const radius = interpolate(zoomProgress, [0, 1], [5,            0]);

// Fade out the device photo as the screen fills the frame
const deviceOpacity = interpolate(zoomProgress, [0.85, 1], [1, 0]);
```

### Rendering

```tsx
<AbsoluteFill style={{ backgroundColor: "#000" }}>
  {/* Laptop/device background photo — fades as zoom completes */}
  {deviceOpacity > 0 && (
    <AbsoluteFill style={{ opacity: deviceOpacity }}>
      {/* Use a flat color or your device image */}
      <div style={{ width: "100%", height: "100%", background: "#0a0a0a" }} />
    </AbsoluteFill>
  )}

  {/* Animated content layer */}
  <div style={{
    position: "absolute",
    top:    `${top}%`,
    left:   `${left}%`,
    width:  `${width}%`,
    height: `${height}%`,
    borderRadius: `${radius}px`,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    zIndex: 10,
  }}>
    {ATTACHED_IMAGES[0] ? (
      <img
        src={ATTACHED_IMAGES[0]}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
      />
    ) : (
      /* Fallback: white content area with subtle grid */
      <div style={{
        width: "100%", height: "100%",
        backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        backgroundColor: "#f8fafc",
      }} />
    )}
  </div>
</AbsoluteFill>
```

---

## True Parallax Multi-Layer Zoom (Agency Quality)

The single-layer zoom looks flat. The professional version drives three layers from the same spring at different rates — background barely moves, midground floats past, foreground zooms fully. This creates real perceived depth.

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

const zoomProgress = spring({
  frame: frame - 40,
  fps,
  config: { damping: 26, stiffness: 35, mass: 1.5 }, // cinematic weight
});

// ── Layer 1: Deep background (grid + gradient orbs) ──────────────────────────
// Barely moves — only a subtle scale to prevent static feel
const bgScale  = interpolate(zoomProgress, [0, 1], [1.0, 1.12]);
const bgOffsetX = interpolate(zoomProgress, [0, 1], [0, -width * 0.04]); // drift opposite to zoom
const bgOffsetY = interpolate(zoomProgress, [0, 1], [0, -height * 0.03]);

// ── Layer 2: Midground floating UI cards ─────────────────────────────────────
// Moves ~40% of the foreground movement — "flies past" the camera as it pushes in
const mgOffsetY = interpolate(zoomProgress, [0, 1], [0, height * 0.18]);
const mgOffsetX = interpolate(zoomProgress, [0, 1], [0, -width * 0.06]);
const mgScale   = interpolate(zoomProgress, [0, 1], [1.0, 0.72]);
const mgOpacity = interpolate(zoomProgress, [0.7, 1], [1, 0]);

// ── Layer 3: Foreground product screen (full zoom) ───────────────────────────
// Screen inset coordinates — tune to match your device
const START_TOP    = 33.6;
const START_LEFT   = 33.6;
const START_WIDTH  = 29;
const START_HEIGHT = 32;

const top    = interpolate(zoomProgress, [0, 1], [START_TOP,    0]);
const left   = interpolate(zoomProgress, [0, 1], [START_LEFT,   0]);
const w      = interpolate(zoomProgress, [0, 1], [START_WIDTH,  100]);
const h      = interpolate(zoomProgress, [0, 1], [START_HEIGHT, 100]);
const radius = interpolate(zoomProgress, [0, 1], [8, 0]);
const deviceOpacity = interpolate(zoomProgress, [0.8, 1], [1, 0]);
// Sheen sweep — fires once as zoom completes
const sheenX = interpolate(zoomProgress, [0.5, 1.0], [-100, 220]);
```

```tsx
<AbsoluteFill style={{ background: "#0a0a14", overflow: "hidden" }}>

  {/* ── Layer 1: Background ── */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${bgScale}) translate(${bgOffsetX}px, ${bgOffsetY}px)`,
    transformOrigin: "center center",
    willChange: "transform",
  }}>
    {/* Deep-space gradient */}
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at 30% 40%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(59,130,246,0.12) 0%, transparent 60%)",
    }} />
    {/* Dot grid */}
    <div style={{
      position: "absolute", inset: 0, opacity: 0.15,
      backgroundImage: "radial-gradient(rgba(148,163,184,0.8) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }} />
  </div>

  {/* ── Layer 2: Midground floating UI cards ── */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${mgScale}) translate(${mgOffsetX}px, ${mgOffsetY}px)`,
    transformOrigin: "center center",
    opacity: mgOpacity,
    willChange: "transform, opacity",
  }}>
    {/* Left floating card */}
    <div style={{
      position: "absolute", top: "20%", left: "5%",
      width: 260, padding: "16px 20px", borderRadius: 16,
      background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>ACTIVE USERS</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>2,847</div>
      <div style={{ fontSize: 12, color: "#22c55e", marginTop: 4, fontFamily: "Inter, sans-serif" }}>↑ 12.4% this week</div>
    </div>
    {/* Right floating card */}
    <div style={{
      position: "absolute", top: "55%", right: "6%",
      width: 220, padding: "14px 18px", borderRadius: 14,
      background: "rgba(99,102,241,0.15)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(99,102,241,0.3)",
      boxShadow: "0 8px 40px rgba(99,102,241,0.2)",
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>CONVERSION</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>94.2%</div>
    </div>
  </div>

  {/* ── Layer 3: Device frame (fades as screen expands) ── */}
  {deviceOpacity > 0 && (
    <div style={{ position: "absolute", inset: 0, opacity: deviceOpacity }}>
      <div style={{ width: "100%", height: "100%", background: "#111827" }}>
        {/* Your laptop/device image or CSS frame here */}
      </div>
    </div>
  )}

  {/* ── Layer 4: Product screen — zooms to fill frame ── */}
  <div style={{
    position: "absolute",
    top: `${top}%`, left: `${left}%`,
    width: `${w}%`, height: `${h}%`,
    borderRadius: `${radius}px`,
    overflow: "hidden",
    zIndex: 10,
    willChange: "top, left, width, height",
  }}>
    {ATTACHED_IMAGES[0] ? (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "#f8fafc" }} />
    )}

    {/* Sheen sweep fires as zoom completes */}
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.35) 43%, transparent 48%)",
      transform: `translateX(${sheenX}%)`,
      zIndex: 20,
    }} />
  </div>

</AbsoluteFill>
```

**Why this looks premium**: the background drifts *against* the zoom direction (slight parallax counter-movement), the midground cards scale down and slide out of frame as if the camera physically flew past them, and the sheen sweep fires exactly as the screen hits full size — like a camera lens flare on impact.

---

## Continuous Slow Pan (Documentary Style)

For Problem/Solution scenes — a gentle continuous scale/pan that keeps the viewer in the same world:

```tsx
// Starts at scale 1.0 (zoomed out) and slowly pushes to 2.2
const cameraScale = interpolate(frame, [0, 150], [1.0, 2.2], { extrapolateRight: "clamp" });
const cameraY     = interpolate(frame, [0, 150], [0,   1],   { extrapolateRight: "clamp" });

<div style={{
  width: "100%", height: "100%",
  transform: `scale(${cameraScale}) translateY(${cameraY}%)`,
  transformOrigin: "center center",
  willChange: "transform",
}}>
  {/* background content */}
</div>
```

**Continuity trick**: If a previous scene ends at `scale(2.2)`, start the next scene at `scale(2.2)` and continue pushing to `scale(2.8)`. This creates a seamless "push" across scene cuts.

---

## Slow Background Scale (Zoom-In Feel Without Moving Content)

For scenes where you want the background to slowly zoom while foreground stays stable:

```tsx
// Subtle slow scale — feels alive without being distracting
const bgScale = interpolate(frame, [0, 300], [1, 1.1]);
const bgPan   = interpolate(frame, [0, 300], [0, -20]); // subtle upward drift

<AbsoluteFill style={{ overflow: "hidden" }}>
  {/* Slow-scaling background */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${bgScale}) translateY(${bgPan}px)`,
    transformOrigin: "center center",
  }}>
    {/* Background image or gradient */}
  </div>

  {/* Foreground content — unaffected */}
  <div style={{ position: "relative", zIndex: 10 }}>
    {/* ... */}
  </div>
</AbsoluteFill>
```

---

## Device Screen Inset Coordinates

Standard coordinates for common device image configurations. Adjust to match your specific image:

| Device Position | `top` | `left` | `width` | `height` |
|----------------|-------|--------|---------|----------|
| Laptop centered front-facing | 34.5% | 34.5% | 27.5% | 30% |
| Laptop angled (perspective) | 31% | 27.5% | 36% | 39% |
| Monitor slightly tilted | 31% | 27.5% | 36% | 39% |

Add `transform: perspective(1000px) rotateY(-5deg) rotateX(2deg)` to the inset div if the device image is shown in perspective.

---

## Sheen / Glass Sweep Effect

A horizontal light sweep that slides across the UI for premium feel:

```tsx
const SHEEN_DURATION = 120; // frames to complete one sweep
const sheenPos = interpolate(frame, [0, SHEEN_DURATION], [-100, 200]);

<div style={{
  position: "absolute", inset: 0,
  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, transparent 50%)",
  transform: `translateX(${sheenPos}%)`,
  zIndex: 20,
  pointerEvents: "none",
}} />
```

## Works Best with Reconstructed UI

Camera zoom is dramatically more effective with vector-reconstructed UI than with screenshot overlays:

- **Screenshot overlay**: Zoom past 1.5× causes pixelation and blur
- **Reconstructed UI**: Vectors stay perfectly crisp at any zoom level — zoom 2× or 3× with no quality loss

**Recommended pairing**: Use `premium-reconstructed-ui` for the showcase scene, then apply camera zoom to push into the specific UI element being demonstrated:

```tsx
// Zoom into a specific reconstructed component (e.g., a metric card)
const zoomProgress = spring({ frame: frame - 60, fps, config: { damping: 200, stiffness: 80 } });
const scale = interpolate(zoomProgress, [0, 1], [1.0, 1.8]);
const targetX = 0.65 * width;  // metric card position
const targetY = 0.3 * height;

const translateX = (width / 2 - targetX) * (scale - 1);
const translateY = (height / 2 - targetY) * (scale - 1);

// Apply to the reconstructed UI container
<div style={{
  position: "absolute", inset: 0,
  transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
  transformOrigin: "center center",
}}>
  <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
</div>
```

---

## premium-chameleon-ui

> Source: `src/skills/premium-chameleon-ui.md`

---
title: Premium Chameleon UI Overlays
impact: HIGH
impactDescription: overlays precisely-positioned React components over static screenshots to fake real UI interactivity — typing in inputs, dropdowns opening, panels sliding in, plus cinematic camera zoom
tags: chameleon, overlay, typing, dropdown, panel, cinematic, interactive, input-overlay, glass-panel
qualityBar: The scene feels like a live screen recording, not a cursor over an image. Panels push and blur the background when they open. Glass cards have deep blur and directional border highlights. The cursor uses the hand SVG with dwell-jitter. The camera slowly punches in. A section label + headline grounds the left side during the walkthrough.
---

## Architecture

Never rebuild static UI — the screenshot IS the UI. Strict Z-index hierarchy (no exceptions):

```
z: 100 ── Animated Hand Cursor + Intent Pill
z: 80  ── Toast Notifications / Feature Banner
z: 60  ── Glass Panels / Modals (TaskDetailPanel)
z: 50  ── Modal Backdrop (dim + backdropFilter blur)
z: 10  ── Chameleon Overlays (ChameleonInput, ChameleonHighlight, DropdownMenu)
z: 5   ── Element Spotlight (dim overlay with focus-ring cutout)
z: 0   ── Background Screenshot (inside CinematicCamera)
```

Cursor is ALWAYS rendered **outside** any camera or zoom wrapper.

---

## Core Overlays

### ChameleonInput — Typing on Input Fields

With focus ring (mandatory — makes it look like a live HTML element, not a label):
```tsx
<ChameleonInput
  x={0.200}   // box.x from INTERACTION_SCRIPT (0-1 fraction)
  y={0.150}   // box.y
  w={0.400}   // box.w
  h={0.050}   // box.h
  text="Search for Q3 reports..."
  startFrame={52}    // the CLICK frame (DWELL_START + DWELL from CURSOR_STEPS)
  brand={BRAND}
/>
```
`useTyping(text, startFrame, fps)` handles character reveal + blinking cursor internally.

**Inline implementation** (if building manually):
```tsx
const isFocused = frame >= startFrame && frame < startFrame + 90;
const focusSpring = spring({ frame: frame - startFrame, fps, config: { damping: 15, stiffness: 150 } });
const charsToShow = Math.max(0, Math.floor((frame - startFrame - 8) / (fps / 15)));
const showBlink = isFocused && Math.floor(frame / 15) % 2 === 0;

<div style={{
  position: "absolute",
  left: `${x * 100}%`, top: `${y * 100}%`,
  width: `${w * 100}%`, height: `${h * 100}%`,
  backgroundColor: "#ffffff", borderRadius: 6,
  border: `2px solid rgba(99,102,241,${isFocused ? interpolate(focusSpring, [0, 1], [0, 1]) : 0})`,
  boxShadow: isFocused ? `0 0 0 3px ${BRAND.primary}33` : "none", // focus glow
  display: "flex", alignItems: "center", padding: "0 12px",
  fontSize: 14, color: "#0f172a", fontFamily: "Inter, sans-serif",
  zIndex: 10,
}}>
  {text.slice(0, charsToShow)}
  {showBlink && <span style={{ width: 2, height: "60%", backgroundColor: BRAND.primary, marginLeft: 2 }} />}
</div>
```

### ChameleonHighlight — Click Glow on Buttons
```tsx
<ChameleonHighlight
  x={0.450} y={0.700} w={0.100} h={0.060}
  triggerFrame={114}   // the CLICK frame
  brand={BRAND}
/>
```
Use for: `elementType: "button"` (always), `elementType: "card"` (on click), `elementType: "nav"` (tab activation).

### DropdownMenu — Spring-In with Staggered Items
```tsx
<DropdownMenu
  x={0.300}
  y={0.225}    // triggerBox.y + triggerBox.h + 0.005
  w={0.180}
  items={["All Projects", "Active", "Archived", "Shared with me"]}
  openFrame={68}
  closeFrame={130}
  brand={BRAND}
/>
```

**Stagger is mandatory** — items must slide in sequentially, never all at once:
```tsx
// Container scales from top origin:
const containerSpring = spring({ frame: frame - openFrame, fps, config: { damping: 18, stiffness: 140 } });
<div style={{
  transform: `scaleY(${containerSpring}) translateY(${interpolate(containerSpring, [0, 1], [-8, 0])}px)`,
  transformOrigin: "top center",
  overflow: "hidden",
  // ... glass card styles
}}>
  {items.map((item, i) => {
    // Each item starts 3 frames after previous — "falling cards" effect
    const itemSpring = spring({ frame: frame - (openFrame + 4 + i * 3), fps, config: { damping: 14, stiffness: 120 } });
    return (
      <div key={i} style={{
        opacity: interpolate(itemSpring, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(itemSpring, [0, 1], [8, 0])}px)`,
        padding: "8px 16px", fontSize: 13, fontFamily: "Inter, sans-serif",
        color: i === 0 ? BRAND.primary : "#334155",
        background: i === 0 ? `${BRAND.primary}15` : "transparent",
      }}>
        {item}
      </div>
    );
  })}
</div>
```

---

## CinematicCamera

Wrap screenshot + overlays. Cursor stays **outside**:

```tsx
<CinematicCamera targetX={0.5} targetY={0.4} zoomTo={1.06}>
  {/* screenshot + chameleon overlays */}
</CinematicCamera>
{/* Cursor at z=100, OUTSIDE CinematicCamera */}
<div style={{ position: "absolute", left: cursorX, top: cursorY, zIndex: 100 }}>
  {/* hand cursor SVG */}
</div>
```

**Hard cap:** `zoomTo` ≤ `1.06`. Never 1.12+. With progressive camera motion, keep at `1.04`.

### Progressive Camera Follow
```tsx
const CAMERA_LAG = 30;
const camProg = Math.min(Math.max(frame - cur.time + CAMERA_LAG, 0) / CAMERA_LAG, 1);
const cameraX = prev.x + (cur.x - prev.x) * camProg;
const cameraY = prev.y + (cur.y - prev.y) * camProg;

<CinematicCamera targetX={cameraX} targetY={cameraY} zoomTo={1.04}>
```

---

## Panel Push + Background Reaction (MANDATORY when panel/modal opens)

Premium panels physically push the scene — the background must SCALE DOWN (0.98) + BLUR (8px) + DIM together. Just blurring is not enough:

```tsx
const PANEL_OPEN_FRAME = 80;
const panelProgress = spring({
  frame: frame - PANEL_OPEN_FRAME, fps,
  config: { stiffness: 120, damping: 20 },  // heavy, deliberate weight
});

// Background reacts: scale shrinks slightly, adds blur, dims
const bgScale  = interpolate(panelProgress, [0, 1], [1.0, 0.98]); // subtle shrink = physical depth
const bgBlur   = interpolate(panelProgress, [0, 1], [0, 8]);       // 8px for panel, 12px for modal
const bgDarken = interpolate(panelProgress, [0, 1], [0, 0.40]);    // 40% dim

{/* Screenshot layer — scale + blur reacts to panel opening */}
<div style={{
  position: "absolute", inset: 0,
  transform: `scale(${bgScale})`,  // scales down as panel opens
  filter: `blur(${bgBlur}px)`,
  transformOrigin: "center center",
}}>
  {ATTACHED_IMAGES[0] && (
    <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
  )}
  {/* Dark scrim */}
  <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${bgDarken})`, pointerEvents: "none" }} />
</div>

{/* Panel at z=60 — slides in from right */}
<TaskDetailPanel openFrame={PANEL_OPEN_FRAME} title="Task Details" fields={[...]} brand={BRAND} />
```

### Modal with Real Backdrop Blur
Modals must use `backdropFilter: blur(12px)` on a z:50 overlay — NOT just a dark overlay:

```tsx
{panelProgress > 0.05 && (
  <>
    {/* z=50 backdrop — real physical blur (12px for modals) */}
    <div style={{
      position: "absolute", inset: 0,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      background: `rgba(0,0,0,${bgDarken})`,
      zIndex: 50,
    }} />
    {/* z=60 modal card on top of backdrop */}
    <ModalOverlay openFrame={PANEL_OPEN_FRAME} title="Confirm Export" brand={BRAND} />
  </>
)}
```

---

## Glass Panel Quality Spec

When building TaskDetailPanel, ModalOverlay, or DropdownMenu inline (not using scope components), use these exact values:

```tsx
// Premium glass card — matches WhatAStory reference video quality
const glassCard = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  // Directional border: top + left brighter (catches the light)
  border: "1px solid transparent",
  borderTop: "1px solid rgba(255,255,255,0.22)",
  borderLeft: "1px solid rgba(255,255,255,0.16)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  // Layered shadow: contact (tight) + diffuse (broad) = separation from bg
  boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 25px 50px -12px rgba(0,0,0,0.50)",
  borderRadius: 16,
};
```

For light-theme backgrounds, swap to:
```tsx
{
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(255,255,255,0.90)",
  borderLeft: "1px solid rgba(255,255,255,0.75)",
  borderRight: "1px solid rgba(0,0,0,0.06)",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 20px 40px -8px rgba(0,0,0,0.18)",
}
```

---

## INTERACTION_SCRIPT / CURSOR_STEPS Pattern

When `CURSOR_WAYPOINTS` is injected in the prompt, copy it verbatim:

```tsx
const CURSOR_STEPS = [
  { x: 0.400, y: 0.175, label: "Search Bar", time: 45, action: "click",
    box: { x: 0.200, y: 0.150, w: 0.400, h: 0.050 }, elementType: "input" },
  { x: 0.500, y: 0.730, label: "Submit",     time: 107, action: "click",
    box: { x: 0.450, y: 0.700, w: 0.100, h: 0.060 }, elementType: "button" },
  { x: 0.500, y: 0.730, label: "",           time: 155, action: "none" },
];
// TRAVEL=22 + DWELL=10 → click fires at step.time+32
// step[0] click: f:77  | step[1] click: f:139
```

**Overlay mapping rules:**
- `elementType: "input"` → `ChameleonInput` + `ChameleonHighlight` (startFrame = `step.time + 32`)
- `elementType: "button"` → `ChameleonHighlight` only (triggerFrame = `step.time + 32`)
- `elementType: "dropdown"` → `ChameleonHighlight` on trigger + `DropdownMenu` below it
- `elementType: "card"` → `ChameleonHighlight` + optionally `TaskDetailPanel`

---

## Form Success State — Loading → Checkmark

```tsx
const submitClickFrame = 139; // step.time + 32 for the submit step
const submitBox = { x: 0.450, y: 0.700, w: 0.100, h: 0.060 };
const afterSubmit = frame - submitClickFrame;

const showLoader  = afterSubmit >= 0 && afterSubmit < 20;
const showSuccess = afterSubmit >= 20 && afterSubmit < 60;
const successScale   = showSuccess ? spring({ frame: afterSubmit - 20, fps, config: { damping: 10, stiffness: 200 }, durationInFrames: 15 }) : 0;
const successOpacity = showSuccess ? interpolate(afterSubmit, [20, 28, 52, 60], [0, 1, 1, 0]) : 0;

{/* Render inside screenshot wrapper, z=11 */}
{showLoader && (
  <div style={{
    position: "absolute",
    left: (submitBox.x + submitBox.w / 2) * width - 12,
    top:  (submitBox.y + submitBox.h / 2) * height - 12,
    width: 24, height: 24, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: BRAND.primary,
    transform: `rotate(${frame * 12}deg)`,
    zIndex: 11,
  }} />
)}
{successOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: submitBox.x * width - 16, top: submitBox.y * height - 16,
    width: submitBox.w * width + 32, height: submitBox.h * height + 32,
    borderRadius: 12,
    background: "rgba(34,197,94,0.15)", border: "1.5px solid #22c55e",
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: successOpacity, transform: `scale(${successScale})`, zIndex: 11,
  }}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10 L8 14 L16 6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)}
```

---

## Toast / Snackbar Notification (MANDATORY after final action)

```tsx
const toastFrame = submitClickFrame + 25;
const toastProg  = spring({ frame: frame - toastFrame, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 20 });
const toastSlide   = frame < toastFrame ? 60 : interpolate(toastProg, [0, 1], [60, 0]);
const toastOpacity = frame < toastFrame ? 0
  : frame > toastFrame + 60
    ? interpolate(frame, [toastFrame + 60, toastFrame + 75], [1, 0], { extrapolateRight: "clamp" })
    : Math.min(toastProg * 2, 1);

{/* Render OUTSIDE CinematicCamera at z=50 */}
{toastOpacity > 0 && (
  <div style={{
    position: "absolute", bottom: 32 + toastSlide, left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(15,20,30,0.95)",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
    padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
    opacity: toastOpacity, zIndex: 50,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
  }}>
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
    <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, fontFamily: BRAND.font + ", sans-serif" }}>
      Changes saved successfully
    </span>
  </div>
)}
```

---

## Element Spotlight — Dim + Focus Ring

When cursor arrives at an element, dim the surrounding UI:

```tsx
const hasBox = !!cur.box;
const framesAfterArrival = frame - cur.time - 22; // after TRAVEL
const spotlightOpacity = hasBox && framesAfterArrival >= 0
  ? interpolate(framesAfterArrival, [0, 15], [0, 0.45], { extrapolateRight: "clamp" })
  : 0;

{/* Dim overlay inside screenshot wrapper, z=5 */}
{spotlightOpacity > 0 && (
  <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${spotlightOpacity})`, zIndex: 5 }} />
)}

{/* Focus ring cutout z=6 */}
{hasBox && spotlightOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: cur.box.x * width - 8, top: cur.box.y * height - 8,
    width: cur.box.w * width + 16, height: cur.box.h * height + 16,
    borderRadius: 10,
    boxShadow: `0 0 0 2px ${BRAND.primary}80, 0 0 30px ${BRAND.primary}40`,
    zIndex: 6,
    opacity: Math.min(spotlightOpacity * 1.5, 1),
  }} />
)}
```

---

## Contextual Section Headers (for 3+ interaction steps)

Use `ContextualSectionHeader` (in scope) above the UI for multi-step demos:

```tsx
<ContextualSectionHeader text="Live Redaction"  subtext="Google Docs" icon="✏️" startFrame={30} exitFrame={90}  brand={BRAND} />
<ContextualSectionHeader text="Apply Filters"   subtext="Advanced"              startFrame={90} exitFrame={140} brand={BRAND} />
<ContextualSectionHeader text="Export Results"  icon="📤"                       startFrame={150}                brand={BRAND} />
```

Rules: `top: 60, left: 80`, `z=50` (above UI, below cursor). One per major feature area.

---

## 3-Layer Text Stack Integration (Split Layout)

For showcase/walkthrough scenes, place the text stack on the **left 40%** while the UI occupies the right 60%:

```tsx
{/* Left 40%: section label + headline + sub-line */}
<div style={{ position: "absolute", left: "8%", top: "50%", transform: "translateY(-50%)", width: "30%", zIndex: 20 }}>
  {/* Section label */}
  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: BRAND.primary, marginBottom: 14, opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }) }}>
    {SECTION_LABEL}
  </div>
  {/* Headline — MaskedReveal from scope */}
  <MaskedReveal startFrame={8} durationInFrames={20}>
    <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.0, color: BRAND.text || "#0f172a" }}>
      {HEADLINE}
    </div>
  </MaskedReveal>
  {/* Sub-line */}
  <div style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.5, color: BRAND.muted || "#64748b", marginTop: 16, opacity: interpolate(frame, [24, 36], [0, 1], { extrapolateRight: "clamp" }) }}>
    {SUBLINE}
  </div>
</div>

{/* Right 60%: screenshot in a glass card frame */}
<div style={{
  position: "absolute", right: "4%", top: "10%",
  width: "54%", height: "80%",
  borderRadius: 16, overflow: "hidden",
  transform: "rotateY(-8deg) rotateX(2deg)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 25px 50px -12px rgba(0,0,0,0.50)",
  zIndex: 10,
}}>
  <CinematicCamera targetX={0.5} targetY={0.45} zoomTo={1.04}>
    {ATTACHED_IMAGES[0] && (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    )}
    {/* Chameleon overlays */}
  </CinematicCamera>
</div>
```

---

## Scene Entry / Exit

Always fade the scene in on the first 15 frames and out on the last 10:

```tsx
const { durationInFrames } = useVideoConfig();
const sceneOpacity = frame < 15
  ? interpolate(frame, [0, 15], [0, 1])
  : frame > durationInFrames - 10
    ? interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0])
    : 1;

<AbsoluteFill style={{ opacity: sceneOpacity }}>
```

---

## Feature Demo Banner (top progress bar)

For 3+ step walkthroughs:
```tsx
const STEP_LABELS = ["Search & Filter", "Select Record", "Export Report"];
const bannerProgress = spring({ frame, fps, config: { damping: 20, stiffness: 140 } });

<div style={{
  position: "absolute", top: 0, left: 0, right: 0, height: 52,
  background: "rgba(10,12,20,0.88)", backdropFilter: "blur(12px)",
  borderBottom: `1px solid ${BRAND.primary}30`,
  display: "flex", alignItems: "center", paddingLeft: 32, paddingRight: 32, gap: 16,
  transform: `translateY(${interpolate(bannerProgress, [0, 1], [-52, 0])}px)`,
  opacity: Math.min(bannerProgress * 2, 1), zIndex: 80,
}}>
  <div style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.primary }} />
  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>
    {STEP_LABELS[Math.min(stepIndex, STEP_LABELS.length - 1)]}
  </span>
  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
    {STEP_LABELS.map((_, i) => (
      <div key={i} style={{
        width: i === stepIndex ? 24 : 8, height: 8, borderRadius: 4,
        background: i <= stepIndex ? BRAND.primary : "rgba(255,255,255,0.2)",
      }} />
    ))}
  </div>
</div>
```

---

## Full Integration Example (Premium Pattern)

```tsx
export const MyAnimation = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // ── Timing constants ──────────────────────────────────────────────────────
  const TRAVEL = 22; const DWELL = 10; const CLICK = 14;

  // ── CURSOR_STEPS (paste verbatim from CURSOR WAYPOINTS injection) ─────────
  const CURSOR_STEPS = [
    { x: 0.50, y: 1.10, label: "",             time: 0,   action: "none" },
    { x: 0.40, y: 0.175, label: "Search field", time: 20,  action: "click",
      box: { x: 0.200, y: 0.150, w: 0.400, h: 0.050 }, elementType: "input" },
    { x: 0.50, y: 0.730, label: "Submit",        time: 82,  action: "click",
      box: { x: 0.450, y: 0.700, w: 0.100, h: 0.060 }, elementType: "button" },
    { x: 0.50, y: 0.730, label: "",              time: 144, action: "none" },
  ];

  // ── Cursor position (magnetic snap + bezier arc) ──────────────────────────
  const stepIndex = Math.max(0, CURSOR_STEPS.findLastIndex((s) => frame >= s.time));
  const cur  = CURSOR_STEPS[stepIndex];
  const prev = CURSOR_STEPS[Math.max(0, stepIndex - 1)];
  const timeSinceStep = frame - cur.time;

  const travelSpring = spring({ frame: timeSinceStep, fps, config: { stiffness: 160, damping: 12 }, durationInFrames: TRAVEL });
  const pos = cubicBezier({ x: prev.x * width, y: prev.y * height }, { x: cur.x * width, y: cur.y * height }, travelSpring, 0.15);
  let cursorX = pos.x;
  let cursorY = pos.y;

  // Dwell jitter
  const DWELL_START = cur.time + TRAVEL;
  const isDwelling  = frame >= DWELL_START && frame < DWELL_START + DWELL;
  if (isDwelling && cur.action !== "none") {
    cursorX += Math.sin(frame * 1.8) * 1.2;
    cursorY += Math.cos(frame * 2.1) * 0.8;
  }

  // Click
  const CLICK_START      = DWELL_START + DWELL;
  const framesAfterClick = frame - CLICK_START;
  const isClicking       = cur.action === "click" && framesAfterClick >= 0 && framesAfterClick < CLICK;
  const clickSqueeze     = isClicking ? interpolate(framesAfterClick, [0, 4, CLICK], [1, 0.84, 1]) : 1;

  const ripple1Scale   = isClicking ? interpolate(framesAfterClick, [0, 16], [0.1, 2.8]) : 0;
  const ripple1Opacity = isClicking ? interpolate(framesAfterClick, [0, 16], [0.7, 0]) : 0;
  const ripple2Scale   = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, 14], [0.1, 2.2]) : 0;
  const ripple2Opacity = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, 14], [0.5, 0]) : 0;

  // Click-zoom
  const ZOOM_IN = 18; const ZOOM_HOLD = 20; const ZOOM_OUT = 22;
  const shouldZoom = cur.action === "click" && framesAfterClick >= 0;
  const zoomScale  = shouldZoom
    ? framesAfterClick < ZOOM_IN
      ? interpolate(framesAfterClick, [0, ZOOM_IN], [1.0, 1.06])
      : framesAfterClick < ZOOM_IN + ZOOM_HOLD
        ? 1.06
        : interpolate(framesAfterClick, [ZOOM_IN + ZOOM_HOLD, ZOOM_IN + ZOOM_HOLD + ZOOM_OUT], [1.06, 1.0], { extrapolateRight: "clamp" })
    : 1.0;

  // Intent pill
  const isTraveling = timeSinceStep >= 0 && timeSinceStep < TRAVEL;
  const distPx  = Math.hypot((cur.x - prev.x) * width, (cur.y - prev.y) * height);
  const travelPct = timeSinceStep / TRAVEL;
  const pillOpacity = isTraveling && cur.label && distPx > 200
    ? travelPct < 0.65
      ? interpolate(timeSinceStep, [0, 6], [0, 1], { extrapolateRight: "clamp" })
      : interpolate(travelPct, [0.65, 1.0], [1, 0])
    : 0;

  // Panel push + blur (fires when cursor does final action)
  const panelOpenFrame = 82 + TRAVEL + DWELL; // submit click frame
  const panelProgress  = spring({ frame: frame - panelOpenFrame, fps, config: { stiffness: 140, damping: 16 } });
  const bgBlur   = interpolate(panelProgress, [0, 1], [0, 3]);
  const bgDarken = interpolate(panelProgress, [0, 1], [0, 0.28]);

  // Form success
  const submitClickFrame = 82 + TRAVEL + DWELL;
  const afterSubmit = frame - submitClickFrame;
  const successScale   = afterSubmit >= 20 ? spring({ frame: afterSubmit - 20, fps, config: { damping: 10, stiffness: 200 }, durationInFrames: 15 }) : 0;
  const successOpacity = afterSubmit >= 20 && afterSubmit < 60 ? interpolate(afterSubmit, [20, 28, 52, 60], [0, 1, 1, 0]) : 0;

  // Toast
  const toastFrame   = submitClickFrame + 25;
  const toastProg    = spring({ frame: frame - toastFrame, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 20 });
  const toastSlide   = frame < toastFrame ? 60 : interpolate(toastProg, [0, 1], [60, 0]);
  const toastOpacity = frame < toastFrame ? 0 : frame > toastFrame + 60
    ? interpolate(frame, [toastFrame + 60, toastFrame + 75], [1, 0], { extrapolateRight: "clamp" })
    : Math.min(toastProg * 2, 1);

  // Scene entry/exit fade
  const sceneOpacity = frame < 15
    ? interpolate(frame, [0, 15], [0, 1])
    : frame > durationInFrames - 10
      ? interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0])
      : 1;

  // Spotlight
  const framesAfterArrival = frame - cur.time - TRAVEL;
  const spotlightOpacity = cur.box && framesAfterArrival >= 0
    ? interpolate(framesAfterArrival, [0, 15], [0, 0.45], { extrapolateRight: "clamp" })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, opacity: sceneOpacity }}>

      {/* ── Progressive camera + screenshot (dims/blurs when panel opens) ── */}
      <div style={{ position: "absolute", inset: 0, filter: `blur(${bgBlur}px)` }}>
        <CinematicCamera targetX={0.5} targetY={0.4} zoomTo={1.04}>
          <div style={{
            position: "absolute", inset: 0,
            transform: `scale(${zoomScale})`,
            transformOrigin: `${cur.x * 100}% ${cur.y * 100}%`,
          }}>
            {ATTACHED_IMAGES[0] ? (
              <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#0f172a" }} />
            )}
          </div>

          {/* Spotlight dim */}
          {spotlightOpacity > 0 && (
            <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${spotlightOpacity})`, zIndex: 5 }} />
          )}
          {cur.box && spotlightOpacity > 0 && (
            <div style={{
              position: "absolute",
              left: cur.box.x * width - 8, top: cur.box.y * height - 8,
              width: cur.box.w * width + 16, height: cur.box.h * height + 16,
              borderRadius: 10,
              boxShadow: `0 0 0 2px ${BRAND.primary}80, 0 0 30px ${BRAND.primary}40`,
              zIndex: 6,
            }} />
          )}

          {/* Chameleon overlays */}
          <ChameleonInput x={0.200} y={0.150} w={0.400} h={0.050} text="Search Q3 reports..." startFrame={52} brand={BRAND} />
          <ChameleonHighlight x={0.200} y={0.150} w={0.400} h={0.050} triggerFrame={52}  brand={BRAND} />
          <ChameleonHighlight x={0.450} y={0.700} w={0.100} h={0.060} triggerFrame={114} brand={BRAND} />

          {/* Form success */}
          {successOpacity > 0 && (
            <div style={{
              position: "absolute",
              left: 0.450 * width - 16, top: 0.700 * height - 16,
              width: 0.100 * width + 32, height: 0.060 * height + 32,
              borderRadius: 10, background: "rgba(34,197,94,0.15)", border: "1.5px solid #22c55e",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: successOpacity, transform: `scale(${successScale})`, zIndex: 11,
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 10 L8 14 L16 6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </CinematicCamera>

        {/* Dark scrim */}
        <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${bgDarken})`, pointerEvents: "none" }} />
      </div>

      {/* ── Toast notification (outside camera, z=50) ── */}
      {toastOpacity > 0 && (
        <div style={{
          position: "absolute", bottom: 32 + toastSlide, left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15,20,30,0.95)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12, padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 10,
          opacity: toastOpacity, zIndex: 50,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 13, color: "#fff", fontWeight: 500, fontFamily: BRAND.font + ", sans-serif" }}>
            Search results loaded
          </span>
        </div>
      )}

      {/* ── Cursor (ALWAYS outside CinematicCamera, z=100) ── */}
      <div style={{ position: "absolute", left: cursorX, top: cursorY, zIndex: 100, pointerEvents: "none" }}>
        {/* Double ripple */}
        <div style={{ position: "absolute", width: 44, height: 44, borderRadius: "50%", border: `2px solid ${BRAND.primary}`, transform: `translate(-50%,-50%) scale(${ripple1Scale})`, opacity: ripple1Opacity, left: 8, top: 8 }} />
        <div style={{ position: "absolute", width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.6)", transform: `translate(-50%,-50%) scale(${ripple2Scale})`, opacity: ripple2Opacity, left: 8, top: 8 }} />

        {/* Hand cursor SVG */}
        <div style={{ transform: `scale(${clickSqueeze})`, transformOrigin: "8px 2px" }}>
          <svg width="30" height="38" viewBox="0 0 30 38" fill="none"
            style={{ transform: "rotate(-8deg) translate(-8px, -2px)", transformOrigin: "8px 4px", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.30))" }}>
            <path d="M8 2 C8 1 9 0 10 0 C11 0 12 1 12 2 L12 16 C14 14 17 14 18 16 L18 22 C18 26 22 28 22 32 C22 35 20 38 17 38 L10 38 C7 38 5 36 5 33 L5 16 C4 16 2 15 2 13 L2 8 C2 6 3 5 4 5 C5 5 6 6 6 7 L6 12 C6 13 8 13 8 12 Z" fill="white" stroke="#1e293b" strokeWidth="1.2"/>
            <path d="M6 10 Q8 9.5 10 10" stroke="#d1d5db" strokeWidth="0.8" fill="none"/>
          </svg>
        </div>

        {/* Intent pill during travel */}
        <div style={{
          position: "absolute", left: 24, top: 10,
          background: "#1e293b", color: "#fff", padding: "6px 12px", borderRadius: 8,
          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "Inter, sans-serif",
          opacity: pillOpacity, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", pointerEvents: "none",
        }}>
          {cur.label}…
        </div>
      </div>

    </AbsoluteFill>
  );
};
```

---

## Light / Dark Theme Glass Panel Values

**Dark theme** (default — deep navy/slate bg):
```tsx
{
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
  borderTop: "1px solid rgba(255,255,255,0.22)",
  borderLeft: "1px solid rgba(255,255,255,0.16)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.40), 0 25px 50px -12px rgba(0,0,0,0.60)",
}
```

**Light theme** (white/off-white bg):
```tsx
{
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(255,255,255,0.90)",
  borderLeft: "1px solid rgba(255,255,255,0.75)",
  borderRight: "1px solid rgba(0,0,0,0.05)",
  borderBottom: "1px solid rgba(0,0,0,0.05)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 20px 40px -8px rgba(0,0,0,0.18)",
}
```

---

## Anti-Patterns
- **NEVER `zoomTo: 1.12`** — hard cap at 1.06. Anything above is jarring.
- **NEVER arrow cursor in chameleon scenes** — hand cursor is mandatory.
- **NEVER `stiffness: 90`** for cursor spring — use 160/12.
- **NEVER TRAVEL=25** — use 22.
- **NEVER skip DWELL** — 10-frame dwell with jitter before every click.
- **NEVER use just a dark overlay for modals** — must use `backdropFilter: blur(12px)` at z=50.
- **NEVER let panels appear without background push** — `bgScale: 0.98` + `bgBlur: 8px` + `bgDarken: 0.40` ALWAYS accompanies panel open.
- **NEVER build glass cards without directional borders** (top/left brighter than right/bottom).
- **NEVER let dropdown items appear all at once** — mandatory `i * 3` frame stagger.
- **NEVER skip the input focus ring** — `box-shadow` glow must appear when cursor clicks an input.

## Quality Checklist
- [ ] Scene fades in over first 15 frames, out over last 10
- [ ] CinematicCamera wraps screenshot + overlays, `zoomTo` ≤ 1.06
- [ ] Hand cursor (not arrow) outside camera at z=100
- [ ] TRAVEL=22, `stiffness:160, damping:12`, 10-frame DWELL with jitter
- [ ] Click-zoom on screenshot (1.0→1.06), origin at click coordinates
- [ ] Background dims (28%) + blurs (3px) when panel/modal opens
- [ ] Modal/panel uses `backdropFilter: blur(24px)`, NOT just dark overlay
- [ ] Glass panels use directional borders (top/left bright, right/bottom dim)
- [ ] Glass panels use layered boxShadow (contact + diffuse)
- [ ] ChameleonHighlight on every button/input click
- [ ] Element spotlight (dim overlay + focus ring) on cursor arrival
- [ ] Toast notification after final action
- [ ] ContextualSectionHeader for 3+ step walkthroughs

---

## premium-chaos-to-ui-resolve

> Source: `src/skills/premium-chaos-to-ui-resolve.md`

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

---

## premium-char-split

> Source: `src/skills/premium-char-split.md`

---
title: Premium Character-Split Kinetic Typography
impact: HIGH
impactDescription: character-level and word-level text reveals — each letter rotates 90° and pushes up from a hidden bounding box, the After Effects "type on" technique in pure React
tags: kinetic-text, typography, character-split, letter-animation, word-split, text-reveal, push-up, masking, animated-text, headline
---

## Character-Split Pattern Overview

Three escalating techniques:
1. **Word-split stagger** — words slide up from a masked container (simplest, most reliable)
2. **Character-split with rotation** — each char rotates 90° and pushes up (AE "type on" standard)
3. **Mixed: word-stagger + char-highlight** — word stagger with per-char color reveal

All require splitting text into arrays and mapping with frame offsets.

---

## Word-Split Stagger (Recommended Starting Point)

Each word slides up from behind an invisible "slot". The slot clips the animation:

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

function WordReveal({
  text,
  startFrame = 0,
  staggerFrames = 6,
  style = {},
}: {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  style?: React.CSSProperties;
}) {
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.28em", ...style }}>
      {words.map((word, i) => {
        const wordFrame = frame - startFrame - i * staggerFrames;
        const entrance = spring({
          frame: wordFrame,
          fps,
          config: { damping: 14, stiffness: 120 },
        });
        const translateY = interpolate(entrance, [0, 1], [40, 0]);
        const opacity = interpolate(entrance, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

        return (
          // Overflow-hidden slot clips the word rising up
          <div key={i} style={{ overflow: "hidden", display: "inline-block" }}>
            <div style={{
              transform: `translateY(${translateY}px)`,
              opacity,
              display: "inline-block",
              whiteSpace: "nowrap",
            }}>
              {word}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Usage:
// <WordReveal text="Ship products faster than ever" startFrame={10} staggerFrames={5} style={{ fontSize: 64, fontWeight: 900, color: "white" }} />
```

---

## Character-Split with 90° Rotation (After Effects Technique)

Each character rotates from 90° (lying flat) to 0° (upright) while translating up from the slot. The `overflow: "hidden"` on the slot makes the rotation appear to push through a floor:

```tsx
function CharReveal({
  text,
  startFrame = 0,
  staggerFrames = 3,
  style = {},
}: {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  style?: React.CSSProperties;
}) {
  const chars = text.split("");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", ...style }}>
      {chars.map((char, i) => {
        if (char === " ") {
          return <span key={i} style={{ display: "inline-block", width: "0.3em" }} />;
        }

        const charFrame = frame - startFrame - i * staggerFrames;
        const entrance = spring({
          frame: charFrame,
          fps,
          config: { damping: 12, stiffness: 130 },  // slight overshoot for snap
        });
        const rotateX  = interpolate(entrance, [0, 1], [90, 0]);
        const translateY = interpolate(entrance, [0, 1], [30, 0]);
        const opacity  = interpolate(entrance, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

        return (
          // Slot clips the 3D rotation
          <div key={i} style={{
            overflow: "hidden",
            display: "inline-block",
            // Extra height headroom for the rotation arc
            paddingTop: "0.15em",
          }}>
            <div style={{
              display: "inline-block",
              transform: `rotateX(${rotateX}deg) translateY(${translateY}px)`,
              transformOrigin: "bottom center",
              opacity,
              // Perspective on parent makes rotateX look 3D
            }}>
              {char}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Wrap the parent with `perspective` for the 3D effect:**

```tsx
<div style={{ perspective: 600, perspectiveOrigin: "50% 100%" }}>
  <CharReveal
    text="The Future"
    startFrame={0}
    staggerFrames={2}
    style={{ fontSize: 96, fontWeight: 900, color: "white", fontFamily: "Inter, sans-serif" }}
  />
</div>
```

---

## Multi-Line Headline with Line-by-Line Reveal

For two-line hero headlines, stagger each line independently:

```tsx
const LINES = [
  { text: "Close deals", startFrame: 0 },
  { text: "in half the time.", startFrame: 12 },
];

<div style={{
  display: "flex", flexDirection: "column",
  alignItems: "center", gap: "0.08em",
  fontFamily: "Inter, sans-serif",
  fontSize: 80, fontWeight: 900, color: "white",
  lineHeight: 1.05,
  perspective: 700,
}}>
  {LINES.map((line, i) => (
    <WordReveal
      key={i}
      text={line.text}
      startFrame={line.startFrame}
      staggerFrames={5}
    />
  ))}
</div>
```

---

## Per-Character Color Reveal

Highlight text by having each character change color as it enters — brand color → white:

```tsx
function ColorCharReveal({
  text,
  startFrame = 0,
  staggerFrames = 4,
  accentColor = "#6366f1",
  baseColor = "white",
  style = {},
}: {
  text: string; startFrame?: number; staggerFrames?: number;
  accentColor?: string; baseColor?: string; style?: React.CSSProperties;
}) {
  const chars = text.split("");

  return (
    <div style={{ display: "flex", ...style }}>
      {chars.map((char, i) => {
        if (char === " ") return <span key={i} style={{ width: "0.28em", display: "inline-block" }} />;

        const charFrame = frame - startFrame - i * staggerFrames;
        const entrance = spring({ frame: charFrame, fps, config: { damping: 14, stiffness: 120 } });

        // Color transitions from accent → base over the entrance
        const colorT = interpolate(entrance, [0, 0.6, 1], [0, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        // Simple lerp between two hex colors via opacity trick
        const translateY = interpolate(entrance, [0, 1], [28, 0]);
        const opacity = interpolate(entrance, [0, 0.25], [0, 1], { extrapolateRight: "clamp" });

        return (
          <div key={i} style={{ overflow: "hidden", display: "inline-block" }}>
            <div style={{
              display: "inline-block",
              transform: `translateY(${translateY}px)`,
              opacity,
              position: "relative",
            }}>
              {/* Base color layer */}
              <span style={{ color: baseColor }}>{char}</span>
              {/* Accent color overlay — fades out as char settles */}
              <span style={{
                position: "absolute", left: 0, top: 0,
                color: accentColor,
                opacity: 1 - colorT,
                pointerEvents: "none",
              }}>{char}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Countdown + Scramble Effect (Number/Character Scramble)

Characters randomly cycle through ASCII before settling on the real letter — "hacker/reveal" effect:

```tsx
function ScrambleReveal({
  text,
  startFrame = 0,
  settleDuration = 40,
}: {
  text: string; startFrame?: number; settleDuration?: number;
}) {
  const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  const chars = text.toUpperCase().split("");

  return (
    <div style={{ display: "flex", fontFamily: "monospace", fontSize: 64, fontWeight: 700, color: "white" }}>
      {chars.map((realChar, i) => {
        if (realChar === " ") return <span key={i} style={{ width: "0.5em" }} />;

        // Each char settles at a staggered time
        const settleAt = startFrame + i * 4 + settleDuration;
        const isSettled = frame >= settleAt;

        // During scramble: pick random char from CHARSET based on frame seed
        const scrambleSeed = Math.floor(frame * 7 + i * 13) % CHARSET.length;
        const displayChar = isSettled
          ? realChar
          : (frame >= startFrame + i * 4 ? CHARSET[scrambleSeed] : "_");

        return (
          <span key={i} style={{
            color: isSettled ? "white" : "rgba(99,102,241,0.8)",
            transition: "color 0.1s",
          }}>
            {displayChar}
          </span>
        );
      })}
    </div>
  );
}
```

---

## Key Rules

- **`overflow: "hidden"` on the slot is mandatory** — without it, the translateY animation is visible before the reveal, ruining the effect
- **`staggerFrames: 3–6`** for characters, **5–8** for words — faster than 3 chars/frame looks like a blur; slower than 8 words/frame feels sluggish
- **`perspective: 600–800`** on the parent container for `rotateX` — without it, the rotation looks flat/2D
- **`transformOrigin: "bottom center"`** on the char — rotation pivots from the baseline, not the center, so the letter pushes up through the slot floor
- **Never use `white-space: nowrap` on the slot itself** — only on the content inside; slots can wrap as needed
- **`fontVariantNumeric: "tabular-nums"`** when mixing numbers in a scramble or counter — prevents layout shift
- **Limit character splits to headlines ≤40 chars** — beyond that, the stagger duration becomes too long and the animation loses energy

---

## premium-confetti-celebration

> Source: `src/skills/premium-confetti-celebration.md`

---
title: Premium Confetti Celebration
impact: MEDIUM
impactDescription: colorful confetti particles rain down over a full-screen product UI screenshot, with an optional dark header bar overlay and kinetic text — the "moment of success" showcase scene
tags: confetti, celebration, particles, showcase, product, screenshot, desklog, success, launch, festive
---

## Confetti Celebration Pattern

Product screenshot fills the entire frame. Confetti particles (small colored rectangles and rotated squares) rain from the top at varied speeds. An optional semi-transparent header bar overlays the top with product name and animated text. Creates a "launch day" or "deal closed" euphoria.

**Typical use case**: Showcase/product demo scene for CRM, project management, or sales tools where celebrating a win (deal closed, project shipped) is the narrative.

---

## Full-Screen Product Screenshot Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Screenshot fades in at scene start
const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

<AbsoluteFill>
  {/* Product screenshot fills full frame */}
  {ATTACHED_IMAGES[0] ? (
    <img
      src={ATTACHED_IMAGES[0]}
      style={{
        width: "100%", height: "100%",
        objectFit: "cover",
        objectPosition: "top left",
        opacity: bgOpacity,
      }}
    />
  ) : (
    // Fallback: dark product-like gradient
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(160deg, #1a2332 0%, #0f1923 100%)",
      opacity: bgOpacity,
    }} />
  )}
</AbsoluteFill>
```

---

## Confetti Particles

Generate particles outside the component (stable across renders). Each particle has random x position, fall speed, color, rotation speed, and shape:

```tsx
// MUST be defined outside the component — stable across renders
const CONFETTI_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#8b5cf6", // purple
  "#f97316", // orange
  "#06b6d4", // cyan
  "#ec4899", // pink
];

// Generate 80 particles
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,              // % of width
  fallSpeed: 0.18 + Math.random() * 0.28, // px per frame (varies per particle)
  rotateSpeed: (Math.random() - 0.5) * 6, // deg per frame
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  width: 6 + Math.random() * 10,       // px
  height: 4 + Math.random() * 6,       // px
  delay: Math.random() * 60,           // frames before this particle starts
  wobble: Math.random() * Math.PI * 2, // phase offset for horizontal wobble
  wobbleAmp: 20 + Math.random() * 40,  // px horizontal wobble amplitude
}));

// Inside the component:
{PARTICLES.map((p) => {
  const elapsed = frame - p.delay;
  if (elapsed < 0) return null;

  const y = -20 + elapsed * p.fallSpeed * (height / 400); // falls from above top
  if (y > height + 20) return null; // off screen

  // Horizontal wobble (sine wave drift)
  const x = (p.x / 100) * width + Math.sin(elapsed * 0.06 + p.wobble) * p.wobbleAmp;
  const rotate = elapsed * p.rotateSpeed;

  return (
    <div
      key={p.id}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: p.width,
        height: p.height,
        backgroundColor: p.color,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        borderRadius: p.width > 10 ? 1 : 0, // slightly rounded for larger pieces
        opacity: 0.9,
      }}
    />
  );
})}
```

**Performance**: 80 particles is safe. Go up to 120 for denser confetti, but avoid per-frame `Math.random()` — pre-generate everything outside the component.

---

## Shaped Confetti Variants

Mix rectangle particles with circular dots and thin streaks for variety:

```tsx
// Add to PARTICLES generation — shape property
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  // ... existing props ...
  shape: i % 5 === 0 ? "circle" : i % 7 === 0 ? "streak" : "rect",
}));

// In the render:
<div style={{
  // ... position, transform ...
  borderRadius: p.shape === "circle" ? "50%" : p.shape === "streak" ? 0 : 1,
  width:  p.shape === "streak" ? 2 : p.width,
  height: p.shape === "streak" ? p.height * 3 : p.height,
}} />
```

---

## Dark Header Bar Overlay (Optional)

Semi-transparent dark header bar at the top with product name and animated title text:

```tsx
const HEADER_HEIGHT = 56;
const headerOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

// Animated title: words appear one by one
const TITLE_WORDS = ["Desklog", "AI", "—", "Live", "Pipeline"];
const TITLE_START = 15;

<div style={{
  position: "absolute",
  top: 0, left: 0, right: 0,
  height: HEADER_HEIGHT,
  backgroundColor: "rgba(10, 15, 20, 0.75)",
  backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center",
  paddingLeft: 32, gap: 8,
  opacity: headerOpacity,
  zIndex: 50,
}}>
  {TITLE_WORDS.map((word, i) => {
    const wordSpring = spring({
      frame: frame - (TITLE_START + i * 4),
      fps,
      config: { damping: 16, stiffness: 200 },
    });
    return (
      <span key={i} style={{
        fontSize: 18,
        fontWeight: i < 2 ? 700 : 400,
        color: i < 2 ? "white" : "rgba(255,255,255,0.6)",
        fontFamily: "Inter, sans-serif",
        letterSpacing: "-0.01em",
        transform: `translateY(${(1 - wordSpring) * -12}px)`,
        opacity: wordSpring,
      }}>
        {word}
      </span>
    );
  })}
</div>
```

---

## Confetti Burst (Triggered Event)

For a confetti burst from a specific point (e.g. a "Deal Closed" button location) rather than rain from the top:

```tsx
const BURST_FRAME = 45; // frame when burst starts
const BURST_X = width * 0.65; // x center of burst
const BURST_Y = height * 0.35; // y center of burst

// Generate burst particles outside component
const BURST_PARTICLES = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * Math.PI * 2;
  const speed = 3 + Math.random() * 5;
  return {
    id: i + 1000,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 4, // upward bias
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + Math.random() * 8,
    rotateSpeed: (Math.random() - 0.5) * 12,
  };
});

// In component:
{BURST_PARTICLES.map((p) => {
  const elapsed = frame - BURST_FRAME;
  if (elapsed < 0) return null;

  const gravity = 0.15;
  const x = BURST_X + p.vx * elapsed;
  const y = BURST_Y + p.vy * elapsed + 0.5 * gravity * elapsed * elapsed;
  const opacity = interpolate(elapsed, [0, 30, 60], [1, 0.8, 0], { extrapolateRight: "clamp" });

  return (
    <div key={p.id} style={{
      position: "absolute",
      left: x, top: y,
      width: p.size, height: p.size * 0.6,
      backgroundColor: p.color,
      transform: `translate(-50%, -50%) rotate(${elapsed * p.rotateSpeed}deg)`,
      opacity,
      borderRadius: 1,
    }} />
  );
})}
```

---

## Complete Scene Structure

```tsx
// OUTSIDE COMPONENT — stable across frames
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({ /* ... */ }));

export const ConfettiCelebration = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 1. Product screenshot background */}
      {/* 2. Header bar overlay (optional) */}
      {/* 3. Confetti rain particles */}
    </AbsoluteFill>
  );
};
```

---

## Usage Notes

- Define `PARTICLES` array OUTSIDE the component — never inside. Defining inside causes new random values on every frame, creating a flickering mess
- `overflow: "hidden"` on AbsoluteFill prevents confetti from rendering outside the video frame
- `fallSpeed * (height / 400)` normalizes fall speed relative to canvas height — the same config works at 1920x1080 and 1280x720
- For confetti starting at the very top edge: initial `y = -20 + elapsed * fallSpeed`. Guard `if (y > height + 20) return null` to skip off-screen particles
- `objectPosition: "top left"` keeps the important parts of the UI screenshot (header, KPIs) visible even if the image is cropped
- The header bar `backdropFilter: blur(8px)` blurs the screenshot behind it for a glassy effect

---

## premium-cta-scene

> Source: `src/skills/premium-cta-scene.md`

---
title: Premium CTA Scene
impact: HIGH
impactDescription: creates a high-converting final scene with kinetic word-by-word headline, pulsing gradient CTA button, glassmorphism logo, and animated mesh orb background
tags: cta, call-to-action, kinetic-headline, button, logo, dark, mesh, orb, glassmorphism
---

## CTA Scene Structure

Three layers from back to front:
1. **Animated mesh orb background** — rotating radial gradients with blur
2. **Content**: logo pop → kinetic headline → subtitle → CTA button
3. **Floating glassmorphism ambient icons** (optional)

---

## Animated Mesh Orb Background

```tsx
const frame = useCurrentFrame();
const meshRotate = frame * 0.15;
const meshScale  = 1.2 + Math.sin(frame / 80) * 0.1;

const COLOR_PRIMARY   = "#6366f1"; // brand
const COLOR_SECONDARY = "#8b5cf6";
const COLOR_ACCENT    = "#ec4899";

<AbsoluteFill style={{ backgroundColor: "#020617", overflow: "hidden" }}>
  {/* Rotating radial gradient orbs */}
  <div style={{
    position: "absolute",
    top: "50%", left: "50%",
    width: "160%", height: "160%",
    transform: `translate(-50%, -50%) rotate(${meshRotate}deg) scale(${meshScale})`,
    background: `
      radial-gradient(circle at 30% 30%, ${COLOR_PRIMARY}44 0%, transparent 40%),
      radial-gradient(circle at 70% 70%, ${COLOR_SECONDARY}33 0%, transparent 40%),
      radial-gradient(circle at 30% 70%, ${COLOR_ACCENT}22 0%, transparent 40%),
      radial-gradient(circle at 70% 30%, #06b6d422 0%, transparent 40%)
    `,
    filter: "blur(80px)",
    opacity: 0.7,
  }} />

  {/* Subtle grid lines */}
  <div style={{
    position: "absolute", inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.03) 1.5px, transparent 1.5px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1.5px, transparent 1.5px)
    `,
    backgroundSize: "60px 60px",
    opacity: 0.4,
    maskImage: "radial-gradient(circle at center, black 30%, transparent 90%)",
  }} />
</AbsoluteFill>
```

---

## Logo Section (Spring Pop + Slight Rotation)

```tsx
const LOGO_START = 5;
const logoSpring = spring({
  frame: frame - LOGO_START,
  fps,
  config: { damping: 10, stiffness: 120, mass: 0.8 },
});
const logoScale  = interpolate(logoSpring, [0, 1], [0, 1]);
const logoRotate = interpolate(logoSpring, [0, 1], [-15, 0]);

<div style={{
  display: "flex", alignItems: "center", gap: 20,
  transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
  opacity: logoSpring,
}}>
  {/* Logo icon */}
  <div style={{
    width: 72, height: 72, borderRadius: 20,
    background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 32, fontWeight: 900, color: "#0f172a",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
  }}>
    B
  </div>
  <span style={{
    fontSize: 36, fontWeight: 800, color: "#fff",
    letterSpacing: "-0.03em",
    textShadow: "0 10px 20px rgba(0,0,0,0.3)",
    fontFamily: "Inter, sans-serif",
  }}>
    BrandName
  </span>
</div>
```

---

## Kinetic Word-by-Word Headline

Each word springs in independently with a slight rotation snap for maximum energy:

```tsx
const TEXT_START = 20;
const HEADLINE   = "Ready to grow your business?";
const words      = HEADLINE.split(" ");

<div style={{
  display: "flex", flexWrap: "wrap",
  justifyContent: "center", gap: "0 20px",
  maxWidth: 1000,
}}>
  {words.map((word, i) => {
    const wordSpring = spring({
      frame: frame - (TEXT_START + i * 3),
      fps,
      config: { damping: 12, stiffness: 150, mass: 0.8 },
    });
    return (
      <div key={i} style={{ overflow: "hidden", paddingBottom: 10 }}>
        <h1 style={{
          fontSize: 96, fontWeight: 900, color: "#fff",
          margin: 0, lineHeight: 1,
          fontFamily: "Inter, sans-serif",
          transform: `translateY(${(1 - wordSpring) * 100}%) rotate(${(1 - wordSpring) * 5}deg)`,
          opacity: wordSpring,
          textShadow: "0 20px 50px rgba(0,0,0,0.5)",
          letterSpacing: "-0.02em",
        }}>
          {word}
        </h1>
      </div>
    );
  })}
</div>
```

**Key**: Wrap each word's `overflow: "hidden"` so the word slides up into view like a reveal wipe.

---

## Subtitle Fade-Up

```tsx
<p style={{
  fontSize: 24, fontWeight: 500, color: "#94a3b8",
  maxWidth: 700, textAlign: "center",
  margin: 0, lineHeight: 1.6,
  fontFamily: "Inter, sans-serif",
  opacity: spring({ frame: frame - (TEXT_START + 15), fps }),
  transform: `translateY(${interpolate(
    spring({ frame: frame - (TEXT_START + 15), fps }), [0, 1], [20, 0]
  )}px)`,
}}>
  Join thousands of teams building the future with our platform.
</p>
```

---

## Pulsing CTA Button with Shine Sweep

```tsx
const BUTTON_START  = 45;
const buttonSpring  = spring({ frame: frame - BUTTON_START, fps, config: { damping: 14, stiffness: 160 } }); // Snappy entrance
const buttonPulse   = interpolate(Math.sin((frame - 60) * 0.05), [-1, 1], [1, 1.03]); // Gentle heartbeat in hold phase
const BUTTON_COLOR  = "#6366f1";

<div style={{
  transform: `scale(${buttonSpring * buttonPulse})`,
  opacity: buttonSpring,
  marginTop: 20,
}}>
  <div style={{
    position: "relative",
    backgroundColor: BUTTON_COLOR,
    padding: "28px 80px",
    borderRadius: 24,
    boxShadow: `0 20px 40px -10px ${BUTTON_COLOR}80, 0 0 0 1px rgba(255,255,255,0.2) inset`,
    overflow: "hidden",
  }}>
    {/* Button label */}
    <span style={{
      color: "#fff", fontSize: 28, fontWeight: 800,
      letterSpacing: "0.02em",
      position: "relative", zIndex: 10,
      textShadow: "0 2px 4px rgba(0,0,0,0.2)",
      fontFamily: "Inter, sans-serif",
    }}>
      Get Started Free
    </span>

    {/* Looping glass shine sweep */}
    <div style={{
      position: "absolute", top: 0, left: 0,
      width: "200%", height: "100%",
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
      transform: `translateX(${interpolate(frame % 120, [0, 120], [-100, 100])}%) skewX(-30deg)`,
      zIndex: 5,
    }} />

    {/* Inner bevel */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
      borderRadius: 24, zIndex: 6,
    }} />
  </div>
</div>
```

---

## Floating Ambient Icons (Optional)

Dark glassmorphism "squircles" floating around the center content:

```tsx
const AMBIENT_ICONS = [
  { emoji: "❤️",  dx: -width * 0.25, dy: -height * 0.20, delay: 0,  size: 65 },
  { emoji: "✅",  dx:  width * 0.28, dy: -height * 0.15, delay: 15, size: 55 },
  { emoji: "📊",  dx: -width * 0.22, dy:  height * 0.25, delay: 30, size: 75 },
  { emoji: "🚀",  dx:  width * 0.24, dy:  height * 0.20, delay: 10, size: 70 },
];

{AMBIENT_ICONS.map((icon, i) => {
  const iconSpring = spring({ frame: frame - (30 + icon.delay), fps, config: { damping: 15, stiffness: 100 } });
  const floatY = Math.sin((frame + i * 40) / 45) * 20;
  const floatX = Math.cos((frame + i * 30) / 60) * 15;
  const rotate = Math.sin((frame + i * 20) / 50) * 12;

  return (
    <div key={i} style={{
      position: "absolute",
      left: "50%", top: "50%",
      transform: `
        translate(-50%, -50%)
        translate(${icon.dx + floatX}px, ${icon.dy + floatY}px)
        scale(${iconSpring})
        rotate(${rotate}deg)
      `,
      opacity: iconSpring * 0.8,
      zIndex: 20,
    }}>
      <div style={{
        width: icon.size * 1.8, height: icon.size * 1.8,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(12px)",
        borderRadius: "35%", // Squircle
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        fontSize: icon.size * 0.55,
      }}>
        {icon.emoji}
      </div>
    </div>
  );
})}
```

**Note:** `dx`/`dy` are pixel offsets from center `(50%, 50%)`, not fractions. Negative = left/up.

---

## Minimal Light CTA Variant (Clean / Logo-Centered)

For light-themed brands — no dark mesh orbs, no glassmorphism. Just a crisp centered layout on a dot-matrix or plain white background. The tagline has one rotating bold word that swaps between brand benefit terms. Used in JustCall, Linear, Notion-style CTAs.

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const MinimalCTA = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo entrance
  const logoProgress = spring({ frame, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: 22 });
  const logoScale    = interpolate(logoProgress, [0, 1], [0.7, 1]);
  const logoOpacity  = interpolate(logoProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Tagline entrance
  const TAGLINE_DELAY = 20;
  const tagProgress   = spring({ frame: frame - TAGLINE_DELAY, fps, config: { damping: 20, stiffness: 140 }, durationInFrames: 20 });
  const tagY          = interpolate(tagProgress, [0, 1], [18, 0]);
  const tagOpacity    = interpolate(tagProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Rotating bold word in tagline
  const ROTATING_WORDS = ["Support", "Business", "Sales"];
  const SWAP_INTERVAL  = 45;
  const wordIndex      = Math.floor(frame / SWAP_INTERVAL) % ROTATING_WORDS.length;
  const swapProgress   = spring({
    frame: frame % SWAP_INTERVAL,
    fps,
    config: { damping: 22, stiffness: 220 },
    durationInFrames: 10,
  });

  // Button entrance
  const BTN_DELAY   = 36;
  const btnProgress = spring({ frame: frame - BTN_DELAY, fps, config: { damping: 20, stiffness: 130 }, durationInFrames: 18 });
  const btnScale    = interpolate(btnProgress, [0, 1], [0.8, 1]);
  const btnOpacity  = interpolate(btnProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Button pulse (very subtle)
  const btnPulse = 1 + Math.sin(frame / 18) * 0.012;

  const ICON_SIZE = 48;

  return (
    <AbsoluteFill style={{
      background: "#f0f2f5",
      backgroundImage: "radial-gradient(circle, rgba(30,40,70,0.15) 1px, transparent 1px)",
      backgroundSize: "22px 22px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        textAlign: "center",
      }}>
        {/* Logo lockup */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          transformOrigin: "center center",
        }}>
          {/* Brand icon */}
          <div style={{
            width: ICON_SIZE, height: ICON_SIZE,
            borderRadius: "30%",
            background: BRAND.primary || "#2dd4bf",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: ICON_SIZE * 0.45, height: ICON_SIZE * 0.45,
              borderRadius: "50% 50% 50% 0",
              background: "rgba(0,0,0,0.25)",
              transform: "rotate(-45deg)",
            }} />
          </div>
          {/* Brand name */}
          <span style={{
            fontSize: ICON_SIZE * 0.8,
            fontWeight: 800,
            color: "#1e2846",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}>
            {BRAND.name || "Brand"}
          </span>
        </div>

        {/* Rotating tagline */}
        <div style={{
          display: "flex", gap: 10, alignItems: "baseline",
          fontSize: 32,
          fontWeight: 500,
          color: "#1e2846",
          fontFamily: "Inter, sans-serif",
          transform: `translateY(${tagY}px)`,
          opacity: tagOpacity,
        }}>
          <span style={{ opacity: 0.7 }}>Your unfair</span>
          <span style={{
            fontWeight: 800,
            color: BRAND.primary || "#2dd4bf",
            transform: `translateY(${interpolate(swapProgress, [0, 1], [14, 0])}px)`,
            opacity: interpolate(swapProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
            display: "inline-block",
          }}>
            {ROTATING_WORDS[wordIndex]}
          </span>
          <span style={{ opacity: 0.7 }}>advantage</span>
        </div>

        {/* CTA Button — dark navy pill */}
        <div style={{
          transform: `scale(${btnScale * btnPulse})`,
          opacity: btnOpacity,
          transformOrigin: "center center",
        }}>
          <div style={{
            background: "#1e2846",
            color: "white",
            borderRadius: 9999,
            padding: "16px 40px",
            fontSize: 20,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.01em",
            boxShadow: "0 8px 24px rgba(30,40,70,0.28)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}>
            {BRAND.cta || "Try it now!"}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Key differences from the dark CTA variant:**
- Light dot-matrix background (no dark mesh orbs)
- Brand icon is small and centered above wordmark (not a full pill card)
- Tagline has rotating bold word that swaps between benefit terms
- CTA button is a dark navy pill (not gradient) — clean, minimal
- No glassmorphism, no ambient icon squircles

---

## Simple Logo + Wide Button + URL Variant (Pretaa / Clean Light CTA)

For light-themed brands that need an ultra-clean finale: just the wordmark centered, a wide rounded brand-colored button, and a small URL below. No tagline, no rotating words, no ambient icons. Maximum whitespace.

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const SimpleLogoCTA = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo entrance
  const logoSpring = spring({ frame, fps, config: { damping: 16, stiffness: 130 } });
  const logoScale  = interpolate(logoSpring, [0, 1], [0.8, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Button entrance
  const BTN_DELAY = 22;
  const btnSpring = spring({ frame: frame - BTN_DELAY, fps, config: { damping: 18, stiffness: 140 } });
  const btnScale  = interpolate(btnSpring, [0, 1], [0.85, 1]);
  const btnOpacity = interpolate(btnSpring, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // URL text
  const URL_DELAY = 36;
  const urlOpacity = interpolate(frame, [URL_DELAY, URL_DELAY + 15], [0, 1], { extrapolateRight: "clamp" });

  // Subtle button pulse
  const btnPulse = 1 + Math.sin(frame / 20) * 0.01;

  const BRAND_PRIMARY = BRAND.primary || "#6366f1";
  const BRAND_NAME    = BRAND.name    || "BrandName";
  const BRAND_URL     = BRAND.url     || "yourbrand.com";
  const BRAND_CTA     = BRAND.cta     || "Get Started Free";

  return (
    <AbsoluteFill style={{ backgroundColor: "#f0f2f6" }}>
      {/* Corner gradient blobs */}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: "65%", height: "70%",
        background: "radial-gradient(circle at 0% 100%, rgba(99,102,241,0.18) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, width: "60%", height: "65%",
        background: "radial-gradient(circle at 100% 0%, rgba(248,113,113,0.14) 0%, transparent 58%)" }} />

      {/* Center content column */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 36,
        textAlign: "center",
      }}>
        {/* Wordmark lockup */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          transformOrigin: "center center",
        }}>
          {/* Brand icon mark */}
          <div style={{
            width: 64, height: 64,
            borderRadius: "30%",
            backgroundColor: BRAND_PRIMARY,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 12px 30px ${BRAND_PRIMARY}44`,
          }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: "50% 50% 50% 0",
              backgroundColor: "rgba(255,255,255,0.9)",
              transform: "rotate(-45deg)",
            }} />
          </div>
          {/* Brand name */}
          <span style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#0f172a",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}>
            {BRAND_NAME}
          </span>
        </div>

        {/* Wide rounded CTA button */}
        <div style={{
          transform: `scale(${btnScale * btnPulse})`,
          opacity: btnOpacity,
          transformOrigin: "center center",
        }}>
          <div style={{
            backgroundColor: BRAND_PRIMARY,
            color: "white",
            borderRadius: 9999,
            padding: "22px 80px",
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "-0.01em",
            boxShadow: `0 20px 50px ${BRAND_PRIMARY}55, 0 6px 16px ${BRAND_PRIMARY}33`,
            position: "relative",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}>
            {/* Looping shine sweep */}
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: "200%", height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
              transform: `translateX(${interpolate(frame % 100, [0, 100], [-100, 100])}%) skewX(-30deg)`,
              zIndex: 1,
            }} />
            <span style={{ position: "relative", zIndex: 2 }}>{BRAND_CTA}</span>
          </div>
        </div>

        {/* URL text — types in character by character */}
        <div style={{
          opacity: urlOpacity,
          fontSize: 18,
          color: "#64748b",
          fontWeight: 500,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.01em",
          // monospace-style tracking so characters don't shift as they appear
          fontVariantNumeric: "tabular-nums",
        }}>
          {/* Typewriter: reveal one character every 2 frames after URL_DELAY */}
          {BRAND_URL.slice(0, Math.floor(Math.max(0, frame - URL_DELAY) / 2))}
          {/* Blinking cursor while typing */}
          {frame - URL_DELAY < BRAND_URL.length * 2 && (
            <span style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0 }}>|</span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Key differences from both other variants:**
- Corner gradient blobs (from `premium-multi-corner-gradient`) instead of dot-matrix or dark mesh
- Wordmark-only (no tagline, no rotating words)
- Wide full-rounded button with brand primary color + shine sweep
- URL line at the bottom — the only "text below button"
- Gap between elements is generous (36px) — breathable, premium whitespace
- Use `BRAND.url` for the URL text field (fallback to `"yourbrand.com"`)

---

## Settle Zoom Wrapper (CTA Finality Rule)

CTA scenes must feel like the video is **landing**, not advancing. The correct camera move is zoom **OUT** — the scene starts slightly zoomed in and settles back to 1.0.

```tsx
// RULE: CTA scenes zoom OUT (1.05 → 1.0). Never zoom in. Zooming in creates tension.
const settleScale = interpolate(frame, [0, 90], [1.05, 1.0], { extrapolateRight: "clamp" });

// Wrap the ENTIRE scene content in this:
<div style={{
  position: "absolute", inset: 0,
  transform: `scale(${settleScale})`,
  transformOrigin: "center center",
}}>
  {/* All scene content here */}
</div>
```

**Why zoom out:**
- Hook scenes build tension with zoom-in
- CTA scenes resolve that tension — the zoom-out says "we've arrived"
- `1.05→1.0` over 90 frames = ~3 seconds, matches the time for button + text to fully appear

**Headline spring for CTA (heavy, authoritative):**
```tsx
config: { damping: 22, stiffness: 100 }  // Heavier than hook (damping:12). Slower, weighty landing.
```

---

## Anti-Patterns

- **NEVER zoom IN on a CTA scene.** Zoom-in = tension. CTA = resolution. Use `settleScale: 1.05→1.0` instead.
- **NEVER use `Math.sin(frame / 15) * 0.03`** for button pulse — this creates micro-jitter that reads as unstable. Use `Math.sin((frame - 60) * 0.05)` mapped via `interpolate` to `[1, 1.03]` for a slow, breathing pulse that starts AFTER the entrance spring settles (~frame 60).
- **NEVER skip the `inset` box-shadow on the button.** The `0 0 0 1px rgba(255,255,255,0.2) inset` adds an inner highlight that lifts the button off the background — without it, buttons look flat.
- **NEVER show the URL line static** — use typewriter reveal (1 char per 2 frames) for a "live" feel.

---

## AGENCY UPGRADE MANDATES (added 2026-03)

**Elastic button entrance (MANDATORY)**
Use `{ damping: 8, stiffness: 200 }` for the button entrance — elastic bounce gives CTA physical weight and urgency. This is different from headline config (which uses damping:22 for authority).

**Background NEVER plain color**
CTA backgrounds MUST have motion:
- Dark brands: 18 entropy dust particles (ENTROPY_DUST_PARTICLES from scope) + drifting mesh gradient blobs
- Light brands: LightArcBg component or corner gradient blobs (premium-multi-corner-gradient)

**useVitality button pulse (replaces Math.sin pulse)**
```tsx
const vButton = useVitality("breathe", 0);
// Apply: scale: 1 + vButton * 0.015
```

---

## Quality Checklist

- [ ] Scene wrapped in `settleScale: interpolate(frame, [0,90], [1.05, 1.0])` zoom-out
- [ ] Headline spring uses `{ damping: 22, stiffness: 100 }` (authoritative, not bouncy)
- [ ] **Button spring uses `{ damping: 8, stiffness: 200 }` (elastic bounce entrance)**
- [ ] **Button hold-phase pulse uses `useVitality("breathe", 0)`** (not raw Math.sin)
- [ ] Button boxShadow includes `inset` highlight: `0 0 0 1px rgba(255,255,255,0.2) inset`
- [ ] Shine sweep loops via `frame % 100` (not one-shot)
- [ ] Logo spring includes slight rotation (`rotate(${(1-logoSpring)*-15}deg)`) for character
- [ ] **Background has motion** — entropy dust + gradient (never plain flat color)
- [ ] URL uses typewriter reveal (1 char per 2–3 frames) if BRAND.url is available

---

## premium-cursor-engine

> Source: `src/skills/premium-cursor-engine.md`

---
title: Premium Cursor Engine
impact: HIGH
impactDescription: creates realistic, human-feeling cursor walkthroughs using a magnetic hand cursor, intent pills during travel, and dwell-jitter before clicks
tags: cursor, click, walkthrough, interaction, spring, ui-demo, product-demo, hand-cursor, intent-pill
qualityBar: The cursor feels like a real human hand navigating the UI with purpose. It travels in smooth arcs, displays its intent while moving, dwells with a tiny jitter before clicking, and triggers a tactile double-ripple and "squeeze" on click, while the camera subtly punches in on the action.
---

## Scene Purpose
Demonstrates how a user interacts with the product. It transforms static UI screenshots or reconstructed components into a living, breathing application tour. It is the core of the "show, don't tell" methodology.

## Visual Blueprint
```text
[      Cinematic Camera Wrapper (1.0 -> 1.06 Zoom)      ]
[                                                        ]
[   [UI Element]            [UI Element]                 ]
[                                                        ]
[                     (Travel Arc)                       ]
[           +-----------------------+                    ]
[           |                       v                    ]
[   [UI Element]               [Target Element]          ]
[                              ((Ripple))                ]
[                              👆 (Hand Cursor)          ]
[                              [Intent Pill]             ]
```

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const CursorShowcase = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. DEFINE WAYPOINTS (normalize 0-1 coordinates)
  const CURSOR_STEPS = [
    { x: 0.50, y: 1.10, label: "",               time: 0,   action: "none"  }, // start off-screen bottom
    { x: 0.45, y: 0.38, label: "Open Dashboard", time: 30,  action: "click" },
    { x: 0.62, y: 0.55, label: "View Analytics", time: 92,  action: "click" }, // prev.time + TRAVEL(22) + DWELL(10) + CLICK(14) + hold(~16)
    { x: 0.50, y: 0.80, label: "",               time: 154, action: "none"  },
  ];

  // Optional but recommended: add elementType so CursorRenderer can switch icons
  // elementType: "button" | "input" | "dropdown" | "card" | "nav"
  // Example:
  // { x:0.45, y:0.38, label:"Open Dashboard", time:30, action:"click", elementType:"nav" }

  // 2. TIMING CONSTANTS (MANDATORY EXACT VALUES)
  const TRAVEL = 22;   // fast, snappy travel
  const DWELL  = 10;   // pause before clicking — makes it feel human
  const CLICK  = 14;   // squeeze and release

  // 3. DETERMINE CURRENT STATE
  const stepIndex = Math.max(0, CURSOR_STEPS.findLastIndex((s) => frame >= s.time));
  const cur  = CURSOR_STEPS[stepIndex];
  const prev = CURSOR_STEPS[Math.max(0, stepIndex - 1)];

  const timeSinceStep = frame - cur.time;

  // 4. MAGNETIC SNAP MOTION PROFILE (stiffness:160, damping:12 = subtle overshoot)
  const travelSpring = spring({
    frame: timeSinceStep,
    fps,
    config: { stiffness: 160, damping: 12 },
    durationInFrames: TRAVEL,
  });

  // 5. BEZIER ARC INTERPOLATION (cubicBezier is in scope — do NOT declare it)
  const pos = cubicBezier(
    { x: prev.x * width, y: prev.y * height },
    { x: cur.x * width,  y: cur.y * height },
    travelSpring,
    0.15, // arc intensity: 0.15 subtle, 0.25 dramatic
  );

  let cursorX = pos.x;
  let cursorY = pos.y;

  // 6. DWELL PHASE — arrives after TRAVEL, dwells for DWELL frames
  const DWELL_START = cur.time + TRAVEL;
  const isDwelling  = frame >= DWELL_START && frame < DWELL_START + DWELL;

  // Micro-jitter during dwell: sine/cosine tremor simulates human hand
  if (isDwelling && cur.action !== "none") {
    cursorX += Math.sin(frame * 1.8) * 1.2;
    cursorY += Math.cos(frame * 2.1) * 0.8;
  }

  // 7. CLICK — fires AFTER dwell
  const CLICK_START       = DWELL_START + DWELL;
  const framesAfterClick  = frame - CLICK_START;
  const isClicking        = cur.action === "click" && framesAfterClick >= 0 && framesAfterClick < CLICK;

  // Hand squeezes down on click
  const clickSqueeze = isClicking
    ? interpolate(framesAfterClick, [0, 4, CLICK], [1, 0.84, 1])
    : 1;

  // Double ripple (ring 2 delayed 3 frames after ring 1)
  const RIPPLE_DUR = 16;
  const ripple1Scale   = isClicking ? interpolate(framesAfterClick,     [0, RIPPLE_DUR], [0.1, 2.8]) : 0;
  const ripple1Opacity = isClicking ? interpolate(framesAfterClick,     [0, RIPPLE_DUR], [0.7, 0])   : 0;
  const ripple2Scale   = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, RIPPLE_DUR], [0.1, 2.2]) : 0;
  const ripple2Opacity = isClicking && framesAfterClick >= 3 ? interpolate(framesAfterClick - 3, [0, RIPPLE_DUR], [0.5, 0])   : 0;

  // 8. INTENT PILL — shows during travel for significant distances (> 200px)
  const isTraveling = timeSinceStep >= 0 && timeSinceStep < TRAVEL;
  const distPx      = Math.hypot((cur.x - prev.x) * width, (cur.y - prev.y) * height);
  const showPill    = isTraveling && cur.label && distPx > 200;
  const travelPct   = timeSinceStep / TRAVEL; // 0 → 1
  const pillOpacity = showPill
    ? travelPct < 0.65
      ? interpolate(timeSinceStep, [0, 6], [0, 1], { extrapolateRight: "clamp" })
      : interpolate(travelPct, [0.65, 1.0], [1, 0])
    : 0;

  // 9. CLICK-ZOOM — camera punches in on click, eases back out
  const ZOOM_IN = 18; const ZOOM_HOLD = 20; const ZOOM_OUT = 22;
  const shouldZoom = cur.action === "click" && framesAfterClick >= 0;
  const zoomScale  = shouldZoom
    ? framesAfterClick < ZOOM_IN
      ? interpolate(framesAfterClick, [0, ZOOM_IN], [1.0, 1.06])
      : framesAfterClick < ZOOM_IN + ZOOM_HOLD
        ? 1.06
        : interpolate(framesAfterClick, [ZOOM_IN + ZOOM_HOLD, ZOOM_IN + ZOOM_HOLD + ZOOM_OUT], [1.06, 1.0], { extrapolateRight: "clamp" })
    : 1.0;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a" }}>

      {/* Screenshot layer — zooms in on click, origin at click point */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${zoomScale})`,
        transformOrigin: `${cur.x * 100}% ${cur.y * 100}%`,
      }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#0f172a" }} />
        )}
        {/* Chameleon overlays go inside this div at z=10 */}
      </div>

      {/* Cursor layer (always outside zoom/camera wrappers, at z=150) */}
      {/* Preferred: use CursorRenderer so icon switching is automatic */}
      {/* <CursorRenderer steps={CURSOR_STEPS} uiSchema={UI_SCHEMA} /> */}

      {/* Manual cursor rendering (fallback) */}
      <div style={{ position: "absolute", left: cursorX, top: cursorY, zIndex: 150, pointerEvents: "none" }}>

        {/* Double ripple */}
        <div style={{ position: "absolute", width: 44, height: 44, borderRadius: "50%", border: `2px solid ${BRAND.primary || "#6366f1"}`, transform: `translate(-50%,-50%) scale(${ripple1Scale})`, opacity: ripple1Opacity, left: 8, top: 8 }} />
        <div style={{ position: "absolute", width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.6)", transform: `translate(-50%,-50%) scale(${ripple2Scale})`, opacity: ripple2Opacity, left: 8, top: 8 }} />

        {/* HAND_CURSOR — use the scope variable, NEVER create inline SVG */}
        <div style={{ transform: `scale(${clickSqueeze})`, transformOrigin: "12px 4px" }}>
          {HAND_CURSOR}
        </div>

        {/* Intent pill — visible during long-distance travel, fades as cursor decelerates */}
        <div style={{
          position: "absolute", left: 24, top: 10,
          background: "#1e293b", color: "#fff",
          padding: "6px 12px", borderRadius: 8,
          fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
          fontFamily: "Inter, sans-serif",
          opacity: pillOpacity,
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          transform: `translateY(${interpolate(pillOpacity, [0, 1], [4, 0])}px)`,
          pointerEvents: "none",
        }}>
          {cur.label}…
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

## Spring / Timing Reference

| Event | Start Frame | Config | Description |
|---|---|---|---|
| **Travel** | `cur.time` | `dur: 22`, `stiff: 160, damp: 12` | Magnetic snap with subtle overshoot. |
| **Dwell** | `cur.time + 22` | `dur: 10`, `sin(f*1.8)*1.2` | Pause + micro-tremor before click. |
| **Click/Squeeze** | `cur.time + 32` | `dur: 14`, `interp([0,4,14],[1,.84,1])` | Finger curls into click position. |
| **Ripple 1** | `cur.time + 32` | `dur: 16`, `scale(0.1→2.8)`, brand color | First ring, fast expand. |
| **Ripple 2** | `cur.time + 35` | `dur: 16`, `scale(0.1→2.2)`, white | Second ring, delayed 3f. |
| **Click-Zoom In** | `cur.time + 32` | `18f`, `scale(1.0→1.06)` | Camera punches in on click. |
| **Click-Zoom Hold** | `cur.time + 50` | `20f at 1.06` | Hold at peak zoom. |
| **Click-Zoom Out** | `cur.time + 70` | `22f`, `scale(1.06→1.0)` | Ease back to normal. |

## CURSOR_STEPS Timing Formula

With `TRAVEL=22 + DWELL=10 + CLICK=14 + hold≈16`, each step needs **62+ frames** minimum:

```tsx
const CURSOR_STEPS = [
  { x: 0.50, y: 1.10, label: "",               time: 0,   action: "none"  }, // off-screen entry
  { x: 0.45, y: 0.38, label: "Open Dashboard", time: 20,  action: "click" }, // arrives f:42, click f:52
  { x: 0.62, y: 0.52, label: "View Analytics", time: 82,  action: "click" }, // arrives f:104, click f:114
  { x: 0.30, y: 0.65, label: "Export Report",  time: 144, action: "click" }, // arrives f:166, click f:176
  { x: 0.50, y: 0.50, label: "",               time: 206, action: "none"  }, // settle
];
```

---

## Variants

### Progressive Camera Follow
Camera slowly lerps toward the cursor's general area, like a real videographer:

```tsx
const CAMERA_LAG = 35;
const camProg = Math.min(Math.max(timeSinceStep + CAMERA_LAG, 0) / CAMERA_LAG, 1);
const cameraX = prev.x + (cur.x - prev.x) * camProg;
const cameraY = prev.y + (cur.y - prev.y) * camProg;

// Pass to CinematicCamera (keep zoomTo at 1.06 max with progressive zoom)
<CinematicCamera targetX={cameraX} targetY={cameraY} zoomTo={1.06}>
  {/* scene content */}
</CinematicCamera>
```

### Full-Screen Screenshot with Browser Chrome
```tsx
<AbsoluteFill style={{ background: "#0a0a14" }}>
  {/* Thin browser chrome bar */}
  <div style={{
    position: "absolute", top: 0, left: 0, right: 0, height: "6%",
    background: "#1e1e2e", borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 50,
  }}>
    <div style={{ display: "flex", gap: 6 }}>
      {["#ef4444", "#eab308", "#22c55e"].map((c, i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
      ))}
    </div>
    <div style={{ flex: 1, maxWidth: 360, height: 20, marginLeft: 12, background: "rgba(255,255,255,0.08)", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif" }}>
      app.yourproduct.com
    </div>
  </div>
  {/* Screenshot fills below chrome (6%→100%) */}
  <div style={{ position: "absolute", top: "6%", left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
    {ATTACHED_IMAGES[0] && (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top",
        transform: `scale(${zoomScale})`, transformOrigin: `${cur.x * 100}% ${cur.y * 100}%` }} />
    )}
  </div>
  {/* Cursor at z=100 */}
</AbsoluteFill>
```

---

## Additional Techniques

### Cursor Motion Trail (Glow Afterimage)
```tsx
const TRAIL_LENGTH = 8;
const TRAIL_SPACING = 3;

function getCursorPos(atFrame: number, steps: typeof CURSOR_STEPS, w: number, h: number, fpsVal: number) {
  const si  = steps.findLastIndex((s) => atFrame >= s.time);
  const cur = steps[Math.max(0, si)];
  const prv = steps[Math.max(0, si - 1)];
  const prog = spring({ frame: atFrame - cur.time, fps: fpsVal, config: { stiffness: 160, damping: 12 }, durationInFrames: 22 });
  const pos = cubicBezier({ x: prv.x * w, y: prv.y * h }, { x: cur.x * w, y: cur.y * h }, prog, 0.15);
  return pos;
}

const isMoving = timeSinceStep < TRAVEL;
const trailDots = isMoving
  ? Array.from({ length: TRAIL_LENGTH }, (_, i) => {
      const pastFrame = Math.max(0, frame - (i + 1) * TRAIL_SPACING);
      return {
        pos: getCursorPos(pastFrame, CURSOR_STEPS, width, height, fps),
        opacity: interpolate(i, [0, TRAIL_LENGTH - 1], [0.4, 0]),
        size: interpolate(i, [0, TRAIL_LENGTH - 1], [9, 3]),
      };
    })
  : [];

{/* Render at z=99, before cursor div */}
{trailDots.map((dot, i) => (
  <div key={i} style={{
    position: "absolute",
    left: dot.pos.x - dot.size / 2, top: dot.pos.y - dot.size / 2,
    width: dot.size, height: dot.size, borderRadius: "50%",
    background: `rgba(${BRAND.primary ? "99,102,241" : "99,102,241"},${dot.opacity})`,
    zIndex: 99, pointerEvents: "none",
  }} />
))}
```

### I-Beam Morphing (Input Fields)
When `elementType === "input"`, swap to an I-beam cursor:
```tsx
{cur.elementType === "input" ? (
  <svg width="16" height="28" viewBox="0 0 16 28" style={{ transform: `scale(${clickSqueeze})`, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}>
    <line x1="2" y1="4" x2="14" y2="4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="2" y1="24" x2="14" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="4" x2="8" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
) : (
  // Hand cursor SVG (see above)
)}
```

### Keyboard Key Pill (Input Steps)
Show `Enter ↵` or `Tab ⇥` near end of typing step:
```tsx
const isTypingStep = cur.elementType === "input";
const nextStep = CURSOR_STEPS[Math.min(stepIndex + 1, CURSOR_STEPS.length - 1)];
const KEY_SHOW_AT = (cur.dwellFrames ?? 30) - 15;
const showKeyPill = isTypingStep && framesAfterClick > KEY_SHOW_AT && framesAfterClick < KEY_SHOW_AT + 20;
const keyLabel = nextStep?.elementType === "input" ? "Tab ⇥" : "Enter ↵";

{showKeyPill && (
  <div style={{
    position: "absolute", left: cursorX - 20, top: cursorY + 28,
    background: "rgba(30,30,50,0.92)", border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff", padding: "4px 12px", borderRadius: 8,
    fontSize: 12, fontWeight: 600, fontFamily: "monospace",
    opacity: interpolate(framesAfterClick, [KEY_SHOW_AT, KEY_SHOW_AT+6, KEY_SHOW_AT+14, KEY_SHOW_AT+20], [0,1,1,0]),
    zIndex: 102, pointerEvents: "none",
  }}>
    {keyLabel}
  </div>
)}
```

### Element Highlight Pulse
Pulse a selection ring on the target element when cursor arrives:
```tsx
const TARGET_BOXES: Record<number, { x: number; y: number; w: number; h: number }> = {
  1: { x: 0.40, y: 0.33, w: 0.12, h: 0.06 },
  2: { x: 0.57, y: 0.47, w: 0.10, h: 0.10 },
};

{TARGET_BOXES[stepIndex] && (() => {
  const box = TARGET_BOXES[stepIndex];
  const framesIn = frame - cur.time - TRAVEL;
  if (framesIn < 0) return null;
  const pulseOpacity = interpolate(framesIn, [0, 5, 30, 50], [0, 0.5, 0.3, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute",
      left: box.x * width, top: box.y * height,
      width: box.w * width, height: box.h * height,
      border: `2px solid ${BRAND.primary}`,
      borderRadius: 8,
      boxShadow: `0 0 12px ${BRAND.primary}66`,
      opacity: pulseOpacity, pointerEvents: "none",
    }} />
  );
})()}
```

### Reconstructed UI Targeting (Named Target System)
For cursor scenes over `AnimatedSidebar`, `AnimatedTopbar`, `AnimatedTable`:
```tsx
const SIDEBAR_W = 240;
const TOPBAR_H  = 48;

const TARGETS = {
  "sidebar-dashboard":   { x: SIDEBAR_W / 2 / width,         y: 0.15 },
  "sidebar-reports":     { x: SIDEBAR_W / 2 / width,         y: 0.22 },
  "topbar-tab-0":        { x: (SIDEBAR_W + 60) / width,      y: TOPBAR_H / 2 / height },
  "topbar-tab-1":        { x: (SIDEBAR_W + 175) / width,     y: TOPBAR_H / 2 / height },
  "table-row-1":         { x: 0.6,  y: 0.45 },
  "form-submit":         { x: 0.65, y: 0.75 },
};

// Sidebar item y by index: (80 + index * 44 + 22) / height
```

State changes fire 10 frames after click (DWELL_START + DWELL):
```tsx
const activeTab      = frame >= /* click frame */ + 10 ? 1 : 0;
const highlightedRow = frame >= /* click frame */ + 10 ? 0 : -1;

<AnimatedTopbar activeTabIndex={activeTab} ... />
<AnimatedTable rows={rows.map((r, i) => ({ ...r, isHighlighted: i === highlightedRow }))} ... />
```

### DETECTED_ELEMENTS Injection Pattern
When `DETECTED_ELEMENTS` is injected in the prompt, copy coordinates verbatim:
```tsx
// System injects: DETECTED_ELEMENTS = [{ label, x, y }, ...]
const CURSOR_STEPS = [
  { x: 0.50, y: 1.10, label: "", time: 0, action: "none" },
  { x: DETECTED_ELEMENTS[0].x, y: DETECTED_ELEMENTS[0].y, label: DETECTED_ELEMENTS[0].label, time: 20,  action: "click" },
  { x: DETECTED_ELEMENTS[1].x, y: DETECTED_ELEMENTS[1].y, label: DETECTED_ELEMENTS[1].label, time: 82,  action: "click" },
  { x: DETECTED_ELEMENTS[2].x, y: DETECTED_ELEMENTS[2].y, label: DETECTED_ELEMENTS[2].label, time: 144, action: "click" },
  { x: 0.5, y: 0.5, label: "", time: 206, action: "none" },
];
```

---

## Hover Pre-State (Three-Phase Interaction Model)

**This is the most important quality upgrade for cursor scenes.**
WhatAStory UI elements react *before* the click — not just *during* it. Use `useCursorState` which returns `approachPhase`, `isHovering`, and `hoverProgress` to drive all three phases.

```
Phase 1 — approach   (last 12 travel frames):  approachPhase 0→1  → element brightens
Phase 2 — hover      (17 frames pre-click):    isHovering=true, hoverProgress 0→1  → focus ring, glow, scale-up
Phase 3 — click      (4 frames):               isClicking=true  → squish, ripple, state change
```

### Pattern: Full Three-Phase Button

```tsx
const { x, y, approachPhase, isHovering, hoverProgress, isClicking } = useCursorState(CURSOR_STEPS);
const cursorX = x * width;
const cursorY = y * height;

// Only react when cursor is near this specific button (proximity guard)
const BTN = { x: 0.62, y: 0.55, w: 0.18, h: 0.07 }; // normalized box
const isTargeted = x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h;
const glowActive = isTargeted ? hoverProgress : 0;

<div style={{
  position: "absolute",
  left: BTN.x * width, top: BTN.y * height,
  width: BTN.w * width, height: BTN.h * height,
  background: BRAND.primary,
  borderRadius: 10,
  // Phase 1 — brighten as cursor approaches
  filter: `brightness(${1 + 0.15 * approachPhase * (isTargeted ? 1 : 0)})`,
  // Phase 2 — glow + focus ring + scale up
  boxShadow: `0 0 ${24 * glowActive}px ${BRAND.primary}88`,
  outline: isHovering && isTargeted ? `2px solid ${BRAND.primary}` : "none",
  transform: `scale(${isClicking && isTargeted ? 0.94 : 1 + 0.04 * glowActive})`,
  transition: "none", // Remotion does not use CSS transitions
}}>
  Submit
</div>
```

### Pattern: Tooltip on Hover

```tsx
const tooltipOpacity = isHovering && isTargeted
  ? interpolate(hoverProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" })
  : 0;

{/* Tooltip appears above the button during hover */}
<div style={{
  position: "absolute",
  left: BTN.x * width + (BTN.w * width / 2), top: BTN.y * height - 40,
  transform: `translateX(-50%) translateY(${interpolate(tooltipOpacity, [0,1], [8,0])}px)`,
  background: "#1e293b", color: "#fff",
  padding: "5px 10px", borderRadius: 6,
  fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
  opacity: tooltipOpacity, pointerEvents: "none", zIndex: 101,
  fontFamily: "Inter, sans-serif",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
}}>
  Click to submit
  {/* Small arrow */}
  <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1e293b" }} />
</div>
```

### Pattern: Input Focus Ring (typing steps)

```tsx
// For elementType === "input" steps — show focus ring when cursor hovers over the field
const INPUT_BOX = { x: 0.28, y: 0.44, w: 0.45, h: 0.06 };
const inputTargeted = x >= INPUT_BOX.x && x <= INPUT_BOX.x + INPUT_BOX.w;
const focusRingOpacity = isHovering && inputTargeted ? hoverProgress : 0;

<div style={{
  position: "absolute",
  left: INPUT_BOX.x * width, top: INPUT_BOX.y * height,
  width: INPUT_BOX.w * width, height: INPUT_BOX.h * height,
  outline: `2px solid ${BRAND.primary}`,
  outlineOffset: 2,
  borderRadius: 6,
  opacity: focusRingOpacity,
  boxShadow: `0 0 0 4px ${BRAND.primary}20`,
  pointerEvents: "none", zIndex: 10,
}} />
```

### Timing Reference (with hover phases added)

| Phase | Frame offset | Duration | State |
|---|---|---|---|
| **Travel** | `cur.time` | 22f | `approachPhase` rises last 12f |
| **Overshoot settle** | `cur.time + 22` | 12f | `isHovering=true`, `hoverProgress` 0→0.7 |
| **Pre-click pause** | `cur.time + 34` | 5f | `isHovering=true`, `hoverProgress` 0.7→1.0 |
| **Click/Squeeze** | `cur.time + 39` | 4f | `isClicking=true` |
| **Post-click** | `cur.time + 43` | — | `hoverProgress` stays at 1.0 |

**Update the checklist item:** Step timing now needs TRAVEL(22) + HOVER(17) + CLICK(4) = **43f minimum** between steps (previously 32f).

---

## When to Use the Hand Cursor

- Any cursor-engine scene for a SaaS explainer, tutorial, or product demo video
- Particularly when the brand style is friendly, consumer-facing, or the video tone is "watch how easy this is"
- **Do NOT** use for technical/dev tool brands — those look better with the default arrow cursor
- The flat cartoon pointing-hand is the #1 cursor style in SaaS explainer videos (Fronter, Arcade, Loom). It reads as a human demonstrating the product rather than a system cursor.

## Anti-Patterns (NEVER do these)
- **NEVER create an inline `<svg>` for the cursor**. Always use `{HAND_CURSOR}` from scope. Creating your own SVG is a quality violation.
- **NEVER add headline text, subtitles, or floating text to a cursor scene**. The screenshot + cursor IS the content. Text goes in separate scenes.
- **NEVER use the arrow SVG** (`M0 0 L0 20...`). It looks robotic. Always use `{HAND_CURSOR}`.
- **NEVER skip hover pre-states**. Buttons that don't react before the click feel like slideshows, not products.
- **NEVER click the instant the cursor arrives**. Zero-dwell feels artificial. Always add 10-frame DWELL with micro-jitter.
- **NEVER move in straight lines**. Use `cubicBezier()` for natural arcs.
- **NEVER use stiffness:90** for cursor travel. Use `stiffness:160, damping:12` for magnetic snap.
- **NEVER skip the click-zoom**. Even 1.0→1.06 centered on the click point adds enormous production value.
- **NEVER show intent pill for short hops** (< 200px). Only show for significant cross-screen travel.

## AGENCY UPGRADE MANDATES (added 2026-03)

**SteppedCamera — MANDATORY for all cursor scenes**
The camera must anticipate the cursor, not follow it. Use usePreFocusCamera:
```tsx
// Camera pre-locks on next target 15f before cursor arrives
const nextTarget = CURSOR_STEPS[stepIndex + 1];
const { zoom, panX, panY } = usePreFocusCamera(
  nextTarget?.x ?? curX, nextTarget?.y ?? curY,
  (nextTarget?.time ?? frame) - 15
);
```
Camera sequence per click: drift toward target → hard lock (hold 20f) → cursor arrives → click.

**Anticipation Rule — cursor arrives 10–15f before click**
The hover pre-state (glow/focus-ring) MUST be visible for at least 10 frames before the click triggers. This is the #1 difference between agency-quality and robotic cursor demos. The `isHovering` state from useHumanizedCursor handles this automatically — just make sure the UI element reacts to `hoverProgress`.

**Context-aware cursor icon (WhatAStory style)**
- Use `CursorRenderer` (in scope) to auto-switch icons:
  - buttons/tabs: hand cursor
  - inputs: I‑beam
  - elsewhere: pointer
- If you render cursor manually, you must still switch the icon based on `elementType`.

**Premium path smoothing**
If you need UI elements to react to cursor proximity, compute cursor position with Catmull–Rom smoothing:
```tsx
const cursorPos = useCursorPos(CURSOR_STEPS, 30, { smoothing: "catmullRom", tension: 0.5 });
```

**Tactile Feedback — mandatory at every click**
Every click MUST trigger `useInteractionFeedback`:
```tsx
const { squish, nudgeX, nudgeY, glowRadius } = useInteractionFeedback(clickFrame, "down");
// Apply to clicked element: scale(squish) and GlowBloom behind it
```

**No raw screenshots**
UI elements MUST use ReconstructedAppShell (when UI_SCHEMA present) or AppShell/TaskDetailPanel/ModalOverlay components. Never `<img>` tags in cursor scenes.

---

## Quality Checklist
- [ ] Hand cursor SVG (realistic pointing finger with knuckle crease), NOT arrow
- [ ] TRAVEL = 22 frames, `stiffness: 160, damping: 12` (magnetic snap with overshoot)
- [ ] `cubicBezier()` arc interpolation (not linear)
- [ ] **usePreFocusCamera** active — camera leads cursor by 15f to each target
- [ ] **Approach phase**: target element brightens as cursor decelerates into it (`approachPhase` 0→1)
- [ ] **Hover pre-state**: focus ring / glow / scale-up appears when cursor arrives (`isHovering`, `hoverProgress`) — minimum 10f before click
- [ ] **useInteractionFeedback** on every click (squish + GlowBloom)
- [ ] **Click squish**: element scales to 0.94 during `isClicking`, springs back
- [ ] Intent pill visible during travel, fades as cursor decelerates into target
- [ ] Intent pill only shows for travel distance > 200px
- [ ] Double ripple on click (ring 1 brand color, ring 2 white, 3-frame delay)
- [ ] Click-zoom: screenshot scales 1.0→1.06, origin at click coordinates, eases back out
- [ ] Cursor rendered OUTSIDE any zoom/camera wrapper (stays at z=100)
- [ ] Step timing accounts for TRAVEL(22) + HOVER(17) + CLICK(4) + hold — minimum 43f per step (use 60f+ for readability)
- [ ] No raw `<img>` tags — UI in AppShell/ReconstructedAppShell components

---

## premium-customer-journey

> Source: `src/skills/premium-customer-journey.md`

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

---

## premium-data-flow-abstract

> Source: `src/skills/premium-data-flow-abstract.md`

---
title: Premium Data Flow Abstract — Conceptual Metaphor Engine
impact: HIGH
impactDescription: transforms abstract concepts (API integrations, AI pipelines, data sync) into cinematic glowing-node network visualizations — the hallmark of $10K agency explainer videos
tags: data-flow, abstract, integration, api, network, nodes, svg-path, glowing, orbs, conceptual, metaphor, isometric, pipeline, ai-processing, connection
---

## Core Concept

When your video needs to explain **how** something works (data syncing, AI processing, API integrations), don't show a boring settings page. Visualize the concept with a glowing network graph.

The 3-layer architecture:
- **Hubs**: Glowing circles with brand/integration names (Salesforce, Stripe, "Your App")
- **Paths**: SVG bezier curves that "draw themselves" using stroke-dashoffset
- **Packets**: Glowing data orbs that travel along the paths using parametric bezier interpolation

---

## Bezier Path with Animated Drawing Effect

The path draws itself over 60 frames using stroke-dashoffset.

```tsx
const TOTAL_LENGTH = 400; // approximate path length in px
const drawProgress = interpolate(frame, [30, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const dashOffset = TOTAL_LENGTH * (1 - drawProgress);

// In the SVG:
<svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
  {/* Glow copy (blurred, wider) */}
  <path
    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
    stroke={BRAND.primary}
    strokeWidth={4}
    strokeOpacity={0.3}
    fill="none"
    filter="url(#glow)"
    strokeDasharray={TOTAL_LENGTH}
    strokeDashoffset={dashOffset}
    strokeLinecap="round"
  />
  {/* Crisp foreground line */}
  <path
    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
    stroke={BRAND.primary}
    strokeWidth={1.5}
    fill="none"
    strokeDasharray={TOTAL_LENGTH}
    strokeDashoffset={dashOffset}
    strokeLinecap="round"
  />
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
</svg>
```

---

## Parametric Bezier — Data Packet Position

**Do NOT use `getPointAtLength`** (requires DOM ref, breaks server rendering). Use the cubic bezier formula directly:

```tsx
// Cubic bezier position at t ∈ [0,1]
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// Packet travels from hub A to hub B over 60 frames, starting at frame 90
const packetT = interpolate(frame, [90, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const packetX = cubicBezier(packetT, x1, cx1, cx2, x2);
const packetY = cubicBezier(packetT, y1, cy1, cy2, y2);
const packetOpacity = packetT > 0 && packetT < 1 ? 1 : 0;
```

---

## Hub Node Component Pattern

```tsx
// Hub: glowing circle + icon + label
function Hub({ x, y, label, color, size = 80, appearFrame = 0 }) {
  const prog = spring({ frame: frame - appearFrame, fps, config: { damping: 14, stiffness: 180 }, durationInFrames: 20 });
  const scale = interpolate(prog, [0, 1], [0.6, 1]);
  const pulseScale = 1 + 0.04 * Math.sin(frame * 0.08 + x);

  return (
    <div style={{
      position: "absolute",
      left: x - size / 2, top: y - size / 2,
      width: size, height: size,
      transform: `scale(${scale * pulseScale})`,
      opacity: prog,
    }}>
      {/* Outer glow ring */}
      <div style={{
        position: "absolute", inset: -12,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
        filter: "blur(8px)",
      }} />
      {/* Hub circle */}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${color}33, ${color}11)`,
        border: `1.5px solid ${color}88`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        boxShadow: `0 0 24px ${color}44, inset 0 1px 0 ${color}33`,
      }}>
        <div style={{ fontSize: 11, color: "#fff", fontWeight: 600, textAlign: "center", padding: "0 6px", lineHeight: 1.3, fontFamily: BRAND.font ?? "Inter" }}>
          {label}
        </div>
      </div>
    </div>
  );
}
```

---

## Data Packet (Traveling Orb)

```tsx
// Glowing orb traveling along the bezier
function Packet({ x, y, color, opacity }) {
  return (
    <div style={{
      position: "absolute",
      left: x - 6, top: y - 6,
      width: 12, height: 12,
      borderRadius: "50%",
      background: color,
      opacity,
      boxShadow: `0 0 12px ${color}, 0 0 24px ${color}88`,
      filter: "blur(0.5px)",
    }} />
  );
}
```

---

## Full Scene: Integration Network

Star topology — central "Your App" hub with 3-4 satellite integration nodes.

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Hub positions
  const CENTER = { x: width * 0.5,  y: height * 0.5  };
  const HUBS = [
    { x: width * 0.18, y: height * 0.3,  label: "Salesforce", color: "#00A1E0", appear: 20  },
    { x: width * 0.82, y: height * 0.3,  label: "Stripe",     color: "#635BFF", appear: 35  },
    { x: width * 0.18, y: height * 0.72, label: "Slack",       color: "#4A154B", appear: 50  },
    { x: width * 0.82, y: height * 0.72, label: "Google",      color: "#EA4335", appear: 65  },
  ];

  // Connections: satellite → center
  const CONNECTIONS = HUBS.map((hub) => {
    const cx1 = hub.x + (CENTER.x - hub.x) * 0.35;
    const cy1 = hub.y;
    const cx2 = CENTER.x + (hub.x - CENTER.x) * 0.35;
    const cy2 = CENTER.y;
    const drawStart = hub.appear + 10;
    const drawEnd   = drawStart + 50;
    const packetStart = drawEnd + 5;
    const packetEnd   = packetStart + 55;

    const drawP = interpolate(frame, [drawStart, drawEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const packP = interpolate(frame, [packetStart, packetEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    // Approximate length: ~distance * 1.2 for curved path
    const dist = Math.hypot(CENTER.x - hub.x, CENTER.y - hub.y);
    const approxLen = dist * 1.2;

    const packetX = cubicBezier(packP, hub.x, cx1, cx2, CENTER.x);
    const packetY = cubicBezier(packP, hub.y, cy1, cy2, CENTER.y);
    const packetOpacity = packP > 0 && packP < 1 ? interpolate(packP, [0, 0.05, 0.9, 1], [0, 1, 1, 0]) : 0;

    return { hub, cx1, cy1, cx2, cy2, approxLen, drawP, packetX, packetY, packetOpacity };
  });

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Subtle dot grid background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle, ${BRAND.primary}33 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        opacity: 0.4,
      }} />

      {/* SVG Connections */}
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={width} height={height}>
        <defs>
          <filter id="pathGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {CONNECTIONS.map(({ hub, cx1, cy1, cx2, cy2, approxLen, drawP }, i) => (
          <g key={i}>
            {/* Glow path */}
            <path
              d={`M ${hub.x} ${hub.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${CENTER.x} ${CENTER.y}`}
              stroke={hub.color} strokeWidth={5} strokeOpacity={0.18} fill="none"
              filter="url(#pathGlow)"
              strokeDasharray={approxLen} strokeDashoffset={approxLen * (1 - drawP)}
              strokeLinecap="round"
            />
            {/* Crisp path */}
            <path
              d={`M ${hub.x} ${hub.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${CENTER.x} ${CENTER.y}`}
              stroke={hub.color} strokeWidth={1.5} fill="none"
              strokeDasharray={approxLen} strokeDashoffset={approxLen * (1 - drawP)}
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* Data Packets */}
      {CONNECTIONS.map(({ hub, packetX, packetY, packetOpacity }, i) => (
        <Packet key={i} x={packetX} y={packetY} color={hub.color} opacity={packetOpacity} />
      ))}

      {/* Hub nodes */}
      {HUBS.map((hub, i) => (
        <Hub key={i} {...hub} />
      ))}

      {/* Center hub (main app) */}
      <Hub x={CENTER.x} y={CENTER.y} label="Your App" color={BRAND.primary} size={96} appearFrame={0} />

      {/* Hero headline */}
      <div style={{
        position: "absolute", bottom: height * 0.1, left: 0, right: 0,
        textAlign: "center", fontSize: 32, fontWeight: 700,
        color: BRAND.text, fontFamily: BRAND.font ?? "Inter",
        opacity: interpolate(frame, [80, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        Everything connected. Nothing lost.
      </div>
    </AbsoluteFill>
  );
};
```

---

## Layout Variants

**Linear pipeline** (A → B → C → D): ideal for "AI processing" or "data transformation" flows.

```tsx
// 4 nodes in a horizontal line, each connected with a bezier
// Nodes: "Raw Data" → "AI Engine" → "Insight" → "Action"
// Use BRAND.primary for paths, BRAND.secondary for packet glow
```

**Funnel topology** (many → one): ideal for "all your data sources → one platform".

**Bi-directional** (two-way arrows): ideal for "real-time sync" or "two-way integration" concepts. Add a `reverse` packet traveling back from center → hub with a 90-frame delay.

---

## When to Use

- Explaining **integrations** ("Connect Salesforce, Stripe, Slack to Your App")
- Explaining **AI pipelines** ("Raw video → AI analysis → Structured insights")
- Explaining **data sync** ("Changes in one tool instantly appear everywhere")
- Any scene where the concept is more powerful than the UI itself
- **Do NOT use** when you have real screenshots — use `premium-cursor-engine` or `premium-chameleon-ui` instead

---

## Helper function (always include in the component)

```tsx
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}
```

---

## premium-data-reveal

> Source: `src/skills/premium-data-reveal.md`

---
title: Premium Data Reveal — Animated Stats & Counters
impact: HIGH
impactDescription: animated counting numbers, bar fills, ring progress, and stat cards — the fastest way to establish product credibility with concrete numbers
tags: data, stats, counters, numbers, metrics, animated-counter, bar-chart, ring-progress, credibility, kpi
---

## Data Reveal Pattern Overview

Three patterns — mix and match:
1. **Counting number** — animates from 0 to the target value (e.g. "10,847 vehicles")
2. **Bar fill** — horizontal bar fills left to right with the metric label
3. **Ring/donut progress** — SVG ring that draws itself (e.g. "94% satisfaction")

Combine 2–3 stat cards in a staggered reveal for maximum impact.

---

## Counting Number Animation

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

function useCounter(targetValue: number, startFrame: number, durationFrames: number) {
  const progress = interpolate(
    frame - startFrame,
    [0, durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),  // ease-out cubic — fast start, smooth finish
    }
  );
  return Math.round(progress * targetValue);
}

// Usage
const vehicleCount = useCounter(10847, 30, 60);    // counts to 10,847 over 2s
const satisfactionPct = useCounter(94, 45, 50);    // counts to 94% over ~1.7s
const avgPriceK = useCounter(12, 60, 45);          // counts to 12 (shown as $12K)

// Format with comma separators
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
```

```tsx
{/* Counting stat display */}
<div style={{
  fontFamily: "Inter, sans-serif",
  display: "flex", flexDirection: "column", alignItems: "center",
}}>
  <div style={{
    fontSize: 72, fontWeight: 900, lineHeight: 1,
    color: "white",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.03em",
  }}>
    {formatNumber(vehicleCount)}
  </div>
  <div style={{
    fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 8,
  }}>
    Verified Vehicles
  </div>
</div>
```

---

## Stat Card Grid (3 cards, staggered reveal)

```tsx
const CARDS = [
  { label: "Verified Vehicles", value: 10847, format: (n: number) => `${formatNumber(n)}+`, color: "#6366f1", delay: 0 },
  { label: "Satisfaction Rate", value: 94, format: (n: number) => `${n}%`, color: "#10b981", delay: 15 },
  { label: "Countries Served", value: 78, format: (n: number) => `${n}`, color: "#f59e0b", delay: 30 },
];

{CARDS.map((card, i) => {
  const cardEntrance = spring({
    frame: frame - (30 + card.delay),
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const count = useCounter(card.value, 30 + card.delay, 60);

  return (
    <div key={i} style={{
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 20,
      padding: "28px 32px",
      minWidth: 200,
      transform: `translateY(${interpolate(cardEntrance, [0,1], [40,0])}px) scale(${interpolate(cardEntrance, [0,1], [0.9,1])})`,
      opacity: cardEntrance,
      fontFamily: "Inter, sans-serif",
    }}>
      {/* Accent color top bar */}
      <div style={{ width: 32, height: 3, background: card.color, borderRadius: 2, marginBottom: 16 }} />
      <div style={{
        fontSize: 54, fontWeight: 900, color: "white",
        fontVariantNumeric: "tabular-nums", lineHeight: 1,
        letterSpacing: "-0.03em",
      }}>
        {card.format(count)}
      </div>
      <div style={{
        fontSize: 13, color: "rgba(255,255,255,0.45)",
        fontWeight: 500, marginTop: 8,
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {card.label}
      </div>
    </div>
  );
})}
```

---

## Horizontal Bar Fill

```tsx
function BarStat({ label, value, maxValue, color, delay }: {
  label: string; value: number; maxValue: number; color: string; delay: number;
}) {
  const barProgress = interpolate(
    frame - delay,
    [0, 60],
    [0, value / maxValue],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 2) }
  );
  const countedValue = useCounter(value, delay, 55);
  const cardEntrance = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 90 } });

  return (
    <div style={{
      opacity: cardEntrance,
      transform: `translateX(${interpolate(cardEntrance, [0,1], [-20,0])}px)`,
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "white", fontVariantNumeric: "tabular-nums" }}>
          {countedValue.toLocaleString()}
        </span>
      </div>
      {/* Track */}
      <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
        {/* Fill */}
        <div style={{
          height: "100%",
          width: `${barProgress * 100}%`,
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          borderRadius: 4,
          boxShadow: `0 0 12px ${color}80`,
        }} />
      </div>
    </div>
  );
}
```

---

## SVG Ring / Donut Progress

```tsx
function RingStat({ percent, label, color, delay }: {
  percent: number; label: string; color: string; delay: number;
}) {
  const R = 52;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  const progress = interpolate(
    frame - delay,
    [0, 70],
    [0, percent / 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) }
  );
  const offset = CIRCUMFERENCE * (1 - progress);
  const countedPct = useCounter(percent, delay, 65);
  const entrance = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 80 } });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      transform: `scale(${entrance})`, opacity: entrance,
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ position: "relative", width: 128, height: 128 }}>
        <svg width={128} height={128} viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
          {/* Background track */}
          <circle cx={64} cy={64} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
          {/* Progress arc */}
          <circle
            cx={64} cy={64} r={R}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        {/* Center number */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, fontWeight: 800, color: "white",
          fontVariantNumeric: "tabular-nums",
        }}>
          {countedPct}%
        </div>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        textAlign: "center",
      }}>
        {label}
      </div>
    </div>
  );
}
```

---

## Big Hero Number (full-screen emphasis)

For a single KPI that dominates the screen — with a reveal flash:

```tsx
const flashOpacity = interpolate(frame, [0, 8, 20], [1, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const numberScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
const bigCount = useCounter(10000, 0, 50);

<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
  {/* Flash on entrance */}
  <div style={{ position: "absolute", inset: 0, background: "white", opacity: flashOpacity, pointerEvents: "none" }} />

  <div style={{
    fontSize: 140, fontWeight: 900, color: "white",
    fontVariantNumeric: "tabular-nums", lineHeight: 1,
    letterSpacing: "-0.05em",
    transform: `scale(${numberScale})`,
    textShadow: "0 0 80px rgba(99,102,241,0.5)",
  }}>
    {bigCount.toLocaleString()}+
  </div>
  <div style={{
    fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.5)",
    marginTop: 16, letterSpacing: "0.15em", textTransform: "uppercase",
  }}>
    Vehicles Ready to Ship
  </div>
</AbsoluteFill>
```

---

## Key Rules

- **`fontVariantNumeric: "tabular-nums"`** — prevents layout shift as numbers change width
- **Ease-out cubic** for counters — fast start, smooth deceleration (like a slot machine stopping)
- **Stagger delays**: 0, 15, 30 frames between cards — enough to read each number as it counts
- **Glow on bars**: `boxShadow: "0 0 12px colorHex80"` — adds energy to the brand color fill
- **Ring progress**: always rotate the SVG by -90deg to start from the top (12 o'clock)
- **Never show decimals** during counting — `Math.round()` keeps it readable

---

## premium-device-mockup

> Source: `src/skills/premium-device-mockup.md`

---
title: Premium Device Mockup with Real Screenshot
impact: HIGH
impactDescription: renders a polished MacBook / browser shell with ATTACHED_IMAGES[0] filling the screen — the #1 agency technique for product credibility
tags: device-mockup, laptop, browser, screenshot, product-demo, macbook, phone, ATTACHED_IMAGES
---

## Device Mockup Pattern Overview

Place `ATTACHED_IMAGES[0]` (the user's real product screenshot) inside a polished device shell — MacBook, browser window, or phone. This is the single highest-credibility move in SaaS video production.

---

## MacBook Shell (CSS-only, no image required)

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Spring entrance — slides up from below
const entrance = spring({ frame, fps, config: { damping: 22, stiffness: 70 } });
const slideY = interpolate(entrance, [0, 1], [height * 0.3, 0]);
const scaleIn = interpolate(entrance, [0, 1], [0.88, 1]);

// Subtle float after entrance
const floatY = Math.sin(frame * 0.035) * 7;

const LAPTOP_W = width * 0.72;
const LAPTOP_H = LAPTOP_W * 0.63;  // standard 16:10 aspect

// Screen inset percentages (tune to match device shape)
const SCREEN_TOP    = "8.5%";
const SCREEN_LEFT   = "11.5%";
const SCREEN_WIDTH  = "77%";
const SCREEN_HEIGHT = "68%";
```

```tsx
<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
  <div style={{
    width: LAPTOP_W,
    height: LAPTOP_H,
    transform: `translateY(${slideY + floatY}px) scale(${scaleIn})`,
    position: "relative",
  }}>
    {/* Laptop body */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(160deg, #d1d5db 0%, #9ca3af 100%)",
      borderRadius: "12px 12px 0 0",
      boxShadow: "0 60px 120px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.12)",
    }} />

    {/* Screen bezel */}
    <div style={{
      position: "absolute",
      top: SCREEN_TOP, left: SCREEN_LEFT,
      width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
      background: "#0a0a0a",
      borderRadius: 4,
      overflow: "hidden",
    }}>
      {/* Real screenshot from ATTACHED_IMAGES */}
      {ATTACHED_IMAGES[0] ? (
        <img
          src={ATTACHED_IMAGES[0]}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      ) : (
        /* Fallback: simulated product UI */
        <div style={{ width: "100%", height: "100%", background: "#0f172a", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 28, background: "#1e293b", display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
            {["#ef4444","#eab308","#22c55e"].map((c,i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, display: "flex", gap: 1 }}>
            <div style={{ width: 48, background: "#0f172a" }} />
            <div style={{ flex: 1, background: "#f8fafc" }} />
          </div>
        </div>
      )}

      {/* Glass sheen sweep */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)",
        transform: `translateX(${interpolate(frame, [20, 80], [-120, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%)`,
        pointerEvents: "none",
      }} />
    </div>

    {/* Notch */}
    <div style={{
      position: "absolute", top: "7%", left: "50%",
      transform: "translateX(-50%)",
      width: 12, height: 4,
      background: "#111827", borderRadius: 2,
    }} />

    {/* Hinge + base */}
    <div style={{
      position: "absolute", bottom: "-4%", left: "5%", right: "5%",
      height: "5%",
      background: "linear-gradient(180deg, #9ca3af 0%, #6b7280 100%)",
      borderRadius: "0 0 8px 8px",
    }} />
  </div>
</AbsoluteFill>
```

---

## Browser Window Mockup (with ATTACHED_IMAGES)

Floating browser shell — preferred for dashboard/web app demos:

```tsx
const browserEntrance = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
const browserY = interpolate(browserEntrance, [0, 1], [150, 0]);

const BROWSER_W = width * 0.80;
const BROWSER_H = BROWSER_W * 0.65;
```

```tsx
<div style={{
  width: BROWSER_W, height: BROWSER_H,
  borderRadius: 12,
  boxShadow: "0 50px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",
  overflow: "hidden",
  transform: `translateY(${browserY}px)`,
  display: "flex", flexDirection: "column",
}}>
  {/* Chrome bar */}
  <div style={{
    height: 40, flexShrink: 0,
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    display: "flex", alignItems: "center",
    padding: "0 14px", gap: 8,
  }}>
    <div style={{ display: "flex", gap: 6 }}>
      {["#ef4444","#eab308","#22c55e"].map((c,i) => (
        <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
      ))}
    </div>
    <div style={{
      flex: 1, maxWidth: 360, height: 24, marginLeft: 12,
      background: "white", border: "1px solid #e2e8f0",
      borderRadius: 6, display: "flex", alignItems: "center",
      paddingLeft: 10, fontSize: 11, color: "#64748b",
      fontFamily: "Inter, sans-serif",
    }}>
      🔒 app.yourproduct.com
    </div>
  </div>

  {/* Screenshot content */}
  <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
    {ATTACHED_IMAGES[0] ? (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "#f8fafc" }} />
    )}
  </div>
</div>
```

---

## Phone Mockup (Tall Vertical)

For mobile app demos or 9:16 content:

```tsx
const PHONE_W = 220;
const PHONE_H = PHONE_W * 2.16;  // iPhone aspect ratio
const phoneEntrance = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 90 } });
```

```tsx
<div style={{
  width: PHONE_W, height: PHONE_H,
  background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
  borderRadius: 38,
  boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.08)",
  transform: `scale(${phoneEntrance}) translateY(${floatY}px)`,
  display: "flex", flexDirection: "column",
  alignItems: "center",
  padding: "14px 8px 12px",
  position: "relative",
}}>
  {/* Dynamic island */}
  <div style={{ width: 90, height: 26, background: "#000", borderRadius: 13, marginBottom: 8, flexShrink: 0 }} />
  {/* Screen area */}
  <div style={{ flex: 1, width: "100%", borderRadius: 28, overflow: "hidden", background: "#000" }}>
    {ATTACHED_IMAGES[0] ? (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "#1e293b" }} />
    )}
  </div>
  {/* Home bar */}
  <div style={{ width: 120, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2, marginTop: 10, flexShrink: 0 }} />
</div>
```

---

## Key Rules

- **Always use `ATTACHED_IMAGES[0]`** for the screen content when available — this is the user's real product
- **`objectPosition: "top"`** — ensures the top of the screenshot (nav/header) is always visible
- **Float loop**: `Math.sin(frame * 0.035) * 7` — slow, gentle, premium
- **Sheen sweep**: slides across screen once during entrance (frames 20–80) for glass feel
- **Shadows**: large, soft `0 60px 120px rgba(0,0,0,0.45)` — crucial for depth
- **Don't render the device bezel as SVG** — pure CSS is faster and looks just as good

## Agency upgrade (WaS look): stage the device in 3D space

For premium results, stage the entire device/browser mockup inside `IsometricWrapper` (preferred) or `TiltWrapper`.

```tsx
<IsometricWrapper lift={10} shadowOpacity={0.35} rotateX={58} rotateZ={-28}>
  {/* your device/browser mockup */}
</IsometricWrapper>
// Cursor layers stay OUTSIDE this wrapper.
```

---

## premium-dot-matrix-bg

> Source: `src/skills/premium-dot-matrix-bg.md`

---
title: Premium Dot-Matrix Background
impact: HIGH
impactDescription: creates a sophisticated light-themed halftone dot-grid texture background with floating teal accent dots and dark dash marks — the signature look of modern SaaS brands like JustCall
tags: background, dot-matrix, halftone, light-theme, dots, texture, floating, accent, minimal, clean
---

## Dot-Matrix Background Pattern

A clean, airy light-gray background with a repeating halftone dot grid created via CSS `repeating-radial-gradient`. Floating teal/brand-color accent dots and small dark dash marks drift independently across the frame. Works as the base layer under kinetic text, logo reveals, or any light-themed product scene.

---

## Core Background (CSS Dot Grid)

```tsx
// The dot grid is built with a repeating-radial-gradient — no images needed
<AbsoluteFill style={{
  background: "#f0f2f5", // light gray base
  backgroundImage: "radial-gradient(circle, rgba(30,40,70,0.18) 1px, transparent 1px)",
  backgroundSize: "22px 22px", // dot spacing
}} />
```

Adjust the `1px` radius and `0.18` opacity to control dot density. Common configurations:
- **Dense**: `backgroundSize: "16px 16px"` — busier, more texture
- **Airy** (JustCall style): `backgroundSize: "22px 22px"` — light, barely-there
- **Dark grid**: change dot color to `rgba(255,255,255,0.12)` on a dark background

---

## Floating Accent Dots (Teal/Brand Color)

Large-ish soft dots (12–18px) scattered across the frame. Each bobs slowly with phase-offset sine motion — no spring needed, pure Math.sin for continuous idle loop.

```tsx
const ACCENT_DOTS = [
  { x: 0.18, y: 0.62, size: 14, delay: 0,  speed: 28, amp: 8 },
  { x: 0.44, y: 0.78, size: 10, delay: 12, speed: 35, amp: 6 },
  { x: 0.72, y: 0.20, size: 12, delay: 5,  speed: 32, amp: 7 },
  { x: 0.85, y: 0.65, size: 16, delay: 20, speed: 26, amp: 9 },
  { x: 0.30, y: 0.30, size: 8,  delay: 8,  speed: 40, amp: 5 },
  { x: 0.60, y: 0.50, size: 6,  delay: 16, speed: 38, amp: 4 },
];

// Fade in at start
const accentFadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

{ACCENT_DOTS.map((dot, i) => {
  const floatY = Math.sin((frame - dot.delay) / dot.speed) * dot.amp;
  const floatX = Math.cos((frame - dot.delay) / (dot.speed * 1.3)) * (dot.amp * 0.5);
  return (
    <div key={i} style={{
      position: "absolute",
      left:   dot.x * width  - dot.size / 2,
      top:    dot.y * height - dot.size / 2,
      width:  dot.size,
      height: dot.size,
      borderRadius: "50%",
      background: BRAND.primary || "#2dd4bf", // teal / brand accent
      opacity: accentFadeIn * 0.85,
      transform: `translate(${floatX}px, ${floatY}px)`,
    }} />
  );
})}
```

---

## Floating Dash Marks (Dark Navy)

Small dark rectangular dashes (4×2px, or 6×2px) at slight angles — they look like pen strokes or typographic accents scattered across the frame. Very subtle; think of them as punctuation in the background composition.

```tsx
const DASH_MARKS = [
  { x: 0.78, y: 0.18, angle: -45, delay: 0  },
  { x: 0.82, y: 0.24, angle:  30, delay: 6  },
  { x: 0.25, y: 0.85, angle: -20, delay: 3  },
  { x: 0.55, y: 0.12, angle:  55, delay: 10 },
  { x: 0.68, y: 0.88, angle: -35, delay: 8  },
];

const dashFadeIn = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

{DASH_MARKS.map((dash, i) => {
  // Slow drift — dashes move less than accent dots
  const floatY = Math.sin((frame - dash.delay) / 45 + i) * 5;
  const floatX = Math.cos((frame - dash.delay) / 55 + i) * 3;
  return (
    <div key={i} style={{
      position: "absolute",
      left:   dash.x * width,
      top:    dash.y * height,
      width:  6,
      height: 2,
      borderRadius: 1,
      background: "#1e2846", // dark navy
      opacity: dashFadeIn * 0.55,
      transform: `translate(${floatX}px, ${floatY}px) rotate(${dash.angle}deg)`,
    }} />
  );
})}
```

---

## Full Background Component

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate } from "remotion";

export const DotMatrixBackground = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const ACCENT_DOTS = [
    { x: 0.14, y: 0.68, size: 13, delay: 0,  speed: 28, amp: 9 },
    { x: 0.42, y: 0.82, size: 9,  delay: 10, speed: 36, amp: 6 },
    { x: 0.74, y: 0.18, size: 11, delay: 4,  speed: 32, amp: 8 },
    { x: 0.88, y: 0.60, size: 15, delay: 18, speed: 26, amp: 7 },
    { x: 0.28, y: 0.32, size: 7,  delay: 7,  speed: 40, amp: 5 },
    { x: 0.58, y: 0.52, size: 5,  delay: 15, speed: 38, amp: 4 },
    { x: 0.50, y: 0.92, size: 10, delay: 22, speed: 30, amp: 6 },
  ];

  const DASH_MARKS = [
    { x: 0.79, y: 0.17, angle: -45 },
    { x: 0.83, y: 0.23, angle:  28 },
    { x: 0.24, y: 0.84, angle: -22 },
    { x: 0.55, y: 0.11, angle:  52 },
    { x: 0.67, y: 0.89, angle: -38 },
    { x: 0.10, y: 0.44, angle:  15 },
  ];

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "#f0f2f5",
      backgroundImage: "radial-gradient(circle, rgba(30,40,70,0.16) 1px, transparent 1px)",
      backgroundSize: "22px 22px",
    }}>
      {/* Teal accent dots */}
      {ACCENT_DOTS.map((dot, i) => (
        <div key={`dot-${i}`} style={{
          position: "absolute",
          left:   dot.x * width  - dot.size / 2,
          top:    dot.y * height - dot.size / 2,
          width:  dot.size,
          height: dot.size,
          borderRadius: "50%",
          background: BRAND.primary || "#2dd4bf",
          opacity: fadeIn * 0.9,
          transform: `translate(${Math.cos((frame - dot.delay) / (dot.speed * 1.3)) * dot.amp * 0.5}px, ${Math.sin((frame - dot.delay) / dot.speed) * dot.amp}px)`,
        }} />
      ))}
      {/* Dark dash marks */}
      {DASH_MARKS.map((dash, i) => (
        <div key={`dash-${i}`} style={{
          position: "absolute",
          left:   dash.x * width,
          top:    dash.y * height,
          width:  6, height: 2,
          borderRadius: 1,
          background: "#1e2846",
          opacity: fadeIn * 0.5,
          transform: `translate(${Math.cos((frame / 55) + i) * 3}px, ${Math.sin((frame / 45) + i) * 5}px) rotate(${dash.angle}deg)`,
        }} />
      ))}
    </AbsoluteFill>
  );
};
```

---

## Usage with Content Layers

Always render the dot-matrix background first (lowest z-index), then stack content above it:

```tsx
<AbsoluteFill>
  {/* Layer 0: Dot-matrix bg */}
  <DotMatrixBackground />

  {/* Layer 1: Product device frame / text / logo etc. */}
  <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
    {/* ... your scene content ... */}
  </div>
</AbsoluteFill>
```

---

## Variants

| Variant | Change |
|---|---|
| **Brand-tinted bg** | Replace `#f0f2f5` with `rgba(45,212,191,0.04)` for a faint teal wash |
| **Darker dots** | Increase dot opacity to `0.28`, reduce `backgroundSize` to `18px` |
| **Minimal** | Remove dash marks entirely; only 3–4 accent dots |
| **Dark mode** | `background: "#0f172a"`, dot color `rgba(255,255,255,0.1)`, accent dots to `rgba(99,102,241,1)` |

---

## When to Use

- Any light-themed SaaS product video (especially for productivity, communication, or analytics tools)
- Under `premium-kinetic-text` scenes for a more polished, branded feel than plain white
- Under logo reveal scenes — the dots create depth without competing with the brand mark
- Under simple CTA / logo-only scenes — adds texture without visual noise
- **Do NOT** combine with `premium-ambient-environment` (conflicting texture styles); choose one or the other

---

## premium-feature-bundle-cards

> Source: `src/skills/premium-feature-bundle-cards.md`

# premium-feature-bundle-cards

## When to Use
Use for "product overview" scenes showing 3 key integrations, capabilities, or feature bundles.
Pattern: Brand logo above → 3 white cards side by side connected by "+" symbols → tagline below.

Best for: integration products (Zapier-style), multi-feature platforms, API/platform products.

## What It Looks Like
- 3 floating white cards in a horizontal row
- Each card: integration/product icon top, bold title, accent-colored feature label
- "+" connector symbols between cards
- Brand logo/name centered above
- Tagline centered below

## Implementation

```tsx
const CARDS = [
  { icon: "🔐", title: "KMS Encryption", label: "AES-256 Standard", color: BRAND.primary },
  { icon: "📊", title: "Live Analytics", label: "Real-time Insights", color: BRAND.secondary },
  { icon: "🔗", title: "API Gateway", label: "REST + GraphQL", color: BRAND.primary },
];

const CARD_WIDTH = Math.round(width * 0.24);
const CARD_HEIGHT = Math.round(height * 0.38);
const CARD_GAP = Math.round(width * 0.04);
const ROW_WIDTH = CARD_WIDTH * 3 + CARD_GAP * 2;
const ROW_LEFT = (width - ROW_WIDTH) / 2;

const logoProgress = spring({ frame: frame - 10, fps, config: { damping: 200, stiffness: 120 } });
const taglineProgress = spring({ frame: frame - 60, fps, config: { damping: 200, stiffness: 100 } });

return (
  <AbsoluteFill style={{ background: BRAND.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

    {/* Brand logo above */}
    <div style={{
      marginBottom: 40,
      opacity: logoProgress,
      transform: `translateY(${(1 - logoProgress) * -20}px)`,
      fontSize: 32, fontWeight: 800, color: BRAND.text, fontFamily: BRAND.font || "Inter",
    }}>
      {BRAND.name || "YourBrand"}
    </div>

    {/* Card row */}
    <div style={{ display: "flex", alignItems: "center", gap: CARD_GAP }}>
      {CARDS.map((card, i) => {
        const cardProgress = spring({ frame: frame - (25 + i * 12), fps, config: { damping: 200, stiffness: 120 } });
        const connectorProgress = i < CARDS.length - 1
          ? spring({ frame: frame - (35 + i * 12), fps, config: { damping: 200, stiffness: 80 } })
          : 0;

        return (
          <React.Fragment key={i}>
            {/* Card */}
            <div style={{
              width: CARD_WIDTH, height: CARD_HEIGHT,
              background: "white",
              borderRadius: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "32px 24px",
              opacity: cardProgress,
              transform: `translateY(${(1 - cardProgress) * 24}px) scale(${0.92 + cardProgress * 0.08})`,
            }}>
              {/* Icon */}
              <div style={{ fontSize: 48, marginBottom: 20 }}>{card.icon}</div>
              {/* Title */}
              <div style={{
                fontSize: 22, fontWeight: 700, color: BRAND.text || "#0f172a",
                fontFamily: BRAND.font || "Inter", textAlign: "center", marginBottom: 10,
                letterSpacing: "-0.02em",
              }}>{card.title}</div>
              {/* Accent label */}
              <div style={{
                fontSize: 14, fontWeight: 600, color: card.color,
                fontFamily: BRAND.font || "Inter", textAlign: "center",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>{card.label}</div>
            </div>

            {/* "+" connector */}
            {i < CARDS.length - 1 && (
              <div style={{
                fontSize: 28, fontWeight: 300, color: BRAND.textMuted || "rgba(15,23,42,0.3)",
                opacity: connectorProgress, flexShrink: 0,
              }}>+</div>
            )}
          </React.Fragment>
        );
      })}
    </div>

    {/* Tagline below */}
    <div style={{
      marginTop: 40,
      opacity: taglineProgress,
      transform: `translateY(${(1 - taglineProgress) * 16}px)`,
      fontSize: 20, fontWeight: 400, color: BRAND.textMuted || "rgba(15,23,42,0.5)",
      fontFamily: BRAND.font || "Inter",
    }}>
      All your tools, unified in one platform.
    </div>
  </AbsoluteFill>
);
```

## Customization

- Replace emoji icons with SVG product logos when available
- For dark backgrounds: change card background to `BRAND.surface`, add glass border
- Connector can be `→` for sequential flow, `+` for additive/integration
- Card count: always 3 (odd number always looks better in this layout)

---

## premium-feature-grid

> Source: `src/skills/premium-feature-grid.md`

---
title: Premium Feature Grid
impact: HIGH
impactDescription: Animates a 2x2 or 3x2 grid of glassmorphic feature cards with high-speed micro-staggers and a sequential highlight pulse.
tags: feature-grid, feature-cards, product-features, grid, micro-stagger, glassmorphism, highlight, benefits, capabilities
qualityBar: The cards do not fade in; they cascade sharply from the bottom. They use the strict Glassmorphism CSS standard. Once all cards are in, one specific card scales up slightly and brightens to draw the viewer's focus.
---

## When to Use

When you need to show 4–6 features simultaneously with visual density. More impactful than a stacked list — the grid fills the frame and lets the viewer absorb multiple features at once.

Use for:
- "Here's what you get" showcase scenes
- Product capabilities overview
- Comparison of use-case categories
- Feature highlight before CTA

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const FeatureGridScene = ({ BRAND, textStack, features, highlightIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const GRID_START = 15;
  const COLS = 3; // Use 2 for 2x2, 3 for 3x2

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", display: "flex", flexDirection: "column", padding: "6% 8%", overflow: "hidden" }}>

      {/* HEADER — Centered 3-Layer Stack */}
      <div style={{ textAlign: "center", marginBottom: 48, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {(() => {
          const labelS    = spring({ frame: frame,      fps, config: { damping: 16, stiffness: 140 } });
          const headlineS = spring({ frame: frame - 7,  fps, config: { damping: 18, stiffness: 120 } });
          const sublineS  = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 120 } });
          return (
            <>
              <div style={{ overflow: "hidden", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: BRAND.primary || "#6366f1", fontFamily: "Inter, sans-serif", transform: `translateY(${interpolate(labelS, [0, 1], [100, 0])}%)` }}>
                  {textStack?.label}
                </div>
              </div>
              <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: 16 }}>
                <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#fff", fontFamily: "Inter, sans-serif", transform: `translateY(${interpolate(headlineS, [0, 1], [100, 0])}%)` }}>
                  {textStack?.headline}
                </div>
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 22, color: "#94a3b8", fontFamily: "Inter, sans-serif", transform: `translateY(${interpolate(sublineS, [0, 1], [100, 0])}%)`, opacity: sublineS }}>
                  {textStack?.subline}
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* THE GRID */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: 28,
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        flex: 1,
      }}>
        {features.slice(0, 6).map((feature, i) => {
          // Micro-stagger: 3 frames per card (tight, rapid cascade)
          const cardSpring = spring({
            frame: frame - (GRID_START + i * 3),
            fps,
            config: { damping: 16, stiffness: 140 },
          });

          // Highlight logic: wait until all cards enter, then pop the target
          const HIGHLIGHT_START = GRID_START + (features.slice(0, 6).length * 3) + 15;
          const isTarget = i === highlightIndex;
          const highlightSpring = isTarget
            ? spring({ frame: frame - HIGHLIGHT_START, fps, config: { damping: 14, stiffness: 120 } })
            : 0;

          const cardScale   = interpolate(cardSpring, [0, 1], [0.8, 1]) + interpolate(highlightSpring, [0, 1], [0, 0.05]);
          const cardOpacity = isTarget || frame < HIGHLIGHT_START
            ? cardSpring
            : interpolate(frame, [HIGHLIGHT_START, HIGHLIGHT_START + 12], [1, 0.4], { extrapolateRight: "clamp" });

          const isHighlighted = isTarget && frame > HIGHLIGHT_START;

          return (
            <div key={i} style={{
              // High-Depth Glassmorphism (mandatory)
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              borderTop:    `1px solid rgba(255,255,255,${isHighlighted ? 0.5 : 0.2})`,
              borderLeft:   `1px solid rgba(255,255,255,${isHighlighted ? 0.3 : 0.12})`,
              borderRight:  "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 24,
              padding: 32,
              transform: `translateY(${interpolate(cardSpring, [0, 1], [60, 0])}px) scale(${cardScale})`,
              opacity: cardOpacity,
              boxShadow: isHighlighted
                ? `0 20px 40px ${BRAND.primary || "#6366f1"}40, 0 1px 2px rgba(0,0,0,0.12)`
                : "0 1px 2px rgba(0,0,0,0.12), 0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}>
              {/* Icon container */}
              <div style={{
                width: 48, height: 48,
                borderRadius: 12,
                background: isHighlighted ? (BRAND.primary || "#6366f1") : "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                transition: "background 0.3s",
              }}>
                {feature.icon || "✨"}
              </div>
              <h3 style={{
                fontSize: 20, fontWeight: 700, color: "#fff",
                fontFamily: "Inter, sans-serif",
                margin: 0, letterSpacing: "-0.02em",
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: 15, color: "#94a3b8",
                fontFamily: "Inter, sans-serif",
                margin: 0, lineHeight: 1.5,
              }}>
                {feature.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

---

## Timing Reference

| Element | Formula | Result |
|---|---|---|
| Card entrance stagger | `GRID_START + i * 3` | 3-frame gap between each card |
| Highlight trigger | `GRID_START + n_cards * 3 + 15` | Starts 15f after last card settles |
| Non-target dim | `interpolate(frame, [HL_START, HL_START+12], [1, 0.4])` | Smooth 12-frame fade to 40% |

---

## 2×2 Variant (4 Features, Maximum Impact)

For 4 features at larger card size — use `gridTemplateColumns: "repeat(2, 1fr)"` and `padding: 32px` per card with `fontSize: 24` for titles.

```tsx
// 2x2 FEATURES definition
const FEATURES = [
  { icon: "⚡", title: "Instant Sync",      desc: "Changes propagate in under 200ms — no waiting." },
  { icon: "🔒", title: "Zero-Trust Access", desc: "Every action is authenticated, logged, and auditable." },
  { icon: "📊", title: "Live Dashboards",   desc: "Real-time metrics with sub-second refresh." },
  { icon: "🔗", title: "200+ Integrations", desc: "One-click connection to your entire stack." },
];
```

---

## Anti-Patterns

- **NEVER let all cards appear simultaneously.** Enforce the 3-frame micro-stagger (`i * 3`). A simultaneous pop looks like a CSS transition, not animation.
- **NEVER leave the grid static after entrance.** It becomes a flat slide. The `highlightIndex` highlight logic dims surrounding cards to `0.4` opacity and scales/glows the target — giving the scene a narrative arc.
- **NEVER use uniform border** (`border: "1px solid rgba(255,255,255,0.1)"`). Use four directional borders (top/left brighter).
- **NEVER make the highlight icon the same style as non-highlighted icons.** Fill it with `BRAND.primary` to create a clear visual anchor.

---

## Quality Checklist

- [ ] Micro-stagger is exactly 3 frames between grid items (`i * 3`)
- [ ] Cards cascade from `translateY(60px)` to `0` — not fade-in from opacity 0
- [ ] Glassmorphism uses `blur(24px) saturate(150%)` with directional borders
- [ ] Post-entrance highlight dims non-target cards to `0.4` opacity
- [ ] Highlighted card gets `BRAND.primary` icon fill + brand-color `boxShadow` glow
- [ ] Scene wrapped in slow cinematic zoom (`1.0→1.05` over 150f)

---

## premium-feature-list

> Source: `src/skills/premium-feature-list.md`

# Premium Feature List Skill

Use this pattern for a staggered 3–4 feature reveal with icon circles, titles, and subtitles.

## Key Patterns

### FEATURES constant array
Always define features as a top-level constant:
```tsx
const FEATURES = [
  { icon: "⚡", title: "Blazing Fast", subtitle: "Sub-second response times" },
  { icon: "🔒", title: "Secure by Default", subtitle: "End-to-end encryption" },
  { icon: "📊", title: "Real-time Analytics", subtitle: "Live dashboard updates" },
  { icon: "🤝", title: "Team Collaboration", subtitle: "Invite unlimited members" },
];
```

### Staggered spring entrance
Each feature slides in from the left with opacity, staggered by `i * 12` frames:
```tsx
const featureSpring = (i: number) =>
  spring({ frame: frame - i * 12, fps, config: { damping: 18, stiffness: 120 } });

const x = interpolate(featureSpring(i), [0, 1], [-60, 0]);
const opacity = interpolate(featureSpring(i), [0, 1], [0, 1]);
```

### Feature row layout
```tsx
<div style={{ display: "flex", alignItems: "center", gap: 20, transform: `translateX(${x}px)`, opacity }}>
  {/* Icon circle — use brand primary color */}
  <div style={{
    width: 52, height: 52, borderRadius: "50%",
    backgroundColor: PRIMARY_COLOR,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, flexShrink: 0,
  }}>
    {feature.icon}
  </div>
  {/* Text */}
  <div>
    <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>
      {feature.title}
    </div>
    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif", marginTop: 3 }}>
      {feature.subtitle}
    </div>
  </div>
</div>
```

### Full component structure
```tsx
const FEATURES = [ /* ... */ ];
const PRIMARY_COLOR = "#6366f1"; // Use brand primary from prompt

export const DynamicAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title appears first
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG_COLOR, justifyContent: "center", padding: "0 120px" }}>
      {/* Section title */}
      <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 48 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: PRIMARY_COLOR, textTransform: "uppercase", letterSpacing: 2, fontFamily: "Inter, sans-serif" }}>
          Key Features
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif", marginTop: 8 }}>
          Everything you need
        </div>
      </div>

      {/* Feature rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {FEATURES.map((feature, i) => {
          const progress = spring({ frame: frame - i * 12 - 15, fps, config: { damping: 18, stiffness: 120 } });
          const x = interpolate(progress, [0, 1], [-60, 0]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, transform: `translateX(${x}px)`, opacity }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: PRIMARY_COLOR, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {feature.icon}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>{feature.title}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif", marginTop: 3 }}>{feature.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```

## Rules
- Always use `useVideoConfig()` to get `fps` for spring animations
- Default 3–4 features (3 if durationInFrames ≤ 150, 4 otherwise)
- Icon circles use brand primary color from the prompt
- Background: dark (`#0f0f1a`) unless prompt specifies light
- Each feature stagger: 12 frames apart, starting at frame 15
- Total minimum duration: 180 frames to show all 4 features fully animated

---

## premium-feedback-storm

> Source: `src/skills/premium-feedback-storm.md`

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

---

## premium-floating-icon-chaos

> Source: `src/skills/premium-floating-icon-chaos.md`

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

---

## premium-floating-path-nodes

> Source: `src/skills/premium-floating-path-nodes.md`

---
title: Premium Floating Path Nodes
impact: HIGH
impactDescription: dark green background with aurora nebula wave, floating outline circles and pill nodes, dotted curved SVG path that draws in with an animated dot traveling along it
tags: dark, nodes, circles, pills, path, floating, nebula, aurora, dotted, traveling-dot, problem, desklog, dark-theme
---

## Floating Path Nodes Pattern

A very dark background with a flowing aurora/nebula blob on the right side. Empty outline circles (stroke only, no fill) float at scattered positions in various sizes. Some evolve into rounded-rectangle pill shapes with label text. A dotted curved SVG path draws from off-screen, and a small filled dot travels along it.

**Typical use case**: Problem scenes for dark-themed tech/analytics products. Shows complexity, disconnected data silos, scattered systems — the "chaos" that the product solves.

**Quality bar**: The reference for this skill is the Desklog hook/problem sequence — icon on pitch-black bg, teal neon glow pool, arcs drawing, organic aurora nebula. Every scene using this skill must achieve that level of cinematic depth.

---

## Cinematic Hook Opener (Scene 1 / Intro Variant)

When used as the **first scene**, start with a central brand reveal before the nodes emerge. This gives the scene a dramatic opening anchor:

```tsx
// Phase 1: Brand icon springs in (frames 0–40)
const iconSpring = spring({ frame, fps, config: { stiffness: 80, damping: 18 } });
const iconScale = interpolate(iconSpring, [0, 1], [0.4, 1]);
const heartbeat = Math.sin(frame * 0.07) * 0.018 * Math.min(iconSpring, 1);

// Phase 2: Scene headline slides up (frames 20–60)
const headlineProgress = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 100 } });
const headlineY = interpolate(headlineProgress, [0, 1], [30, 0]);

// Render brand identity at center before nodes appear
{frame < 60 && (
  <div style={{
    position: "absolute", left: "50%", top: "50%",
    transform: `translate(-50%, -50%) scale(${iconScale + heartbeat})`,
    zIndex: 40,
  }}>
    {/* Brand wordmark — use BRAND.name in large bold font */}
    <div style={{
      fontSize: 72, fontWeight: 900, letterSpacing: "-0.04em",
      color: BRAND_COLOR, fontFamily: "Inter, sans-serif",
      textShadow: `0 0 40px ${BRAND_COLOR}80, 0 0 80px ${BRAND_COLOR}30`,
      lineHeight: 1,
    }}>
      {BRAND.name}
    </div>
  </div>
)}

{/* Headline line (tagline or scene context) — slides up from below */}
<div style={{
  position: "absolute", bottom: 90, left: 0, right: 0,
  textAlign: "center",
  transform: `translateY(${headlineY}px)`,
  opacity: Math.min(headlineProgress * 2, 1),
  zIndex: 35,
}}>
  <div style={{
    fontSize: 22, fontWeight: 600, letterSpacing: "0.12em",
    color: `${BRAND_COLOR}aa`, fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
  }}>
    {/* e.g. "Scattered. Siloed. Slow." — the problem hook */}
    The Complexity You Face
  </div>
</div>
```

---

## Scene Title Overlay (Top-Left Label)

Every scene should have a bold section label that anchors the viewer:

```tsx
// Label slides in from left at frame 8
const labelProgress = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 120 } });

<div style={{
  position: "absolute", top: 56, left: 72,
  transform: `translateX(${interpolate(labelProgress, [0, 1], [-40, 0])}px)`,
  opacity: Math.min(labelProgress * 2, 1),
  zIndex: 50,
}}>
  {/* Accent bar */}
  <div style={{
    width: interpolate(labelProgress, [0, 1], [0, 36]),
    height: 3, borderRadius: 2,
    background: BRAND_COLOR,
    marginBottom: 10,
  }} />
  <div style={{
    fontSize: 13, fontWeight: 700, letterSpacing: "0.18em",
    color: `${BRAND_COLOR}bb`, fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
  }}>
    {/* Use the scene purpose: "The Problem" / "The Chaos" / "Status Quo" */}
    The Challenge
  </div>
</div>
```

---

## Particle Depth Field

Add 18–22 micro-particles scattered behind the main nodes for depth. DEFINE outside the component to avoid flicker:

```tsx
// ── OUTSIDE component (stable — defined once) ─────────────────────────────
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 137.5) % 100,       // golden-ratio spread
  y: (i * 97.3 + 11) % 100,
  size: 1 + (i % 3),          // 1–3 px
  phase: i * 0.62,
  speed: 0.008 + (i % 5) * 0.002,
  opacity: 0.08 + (i % 4) * 0.05,
}));

// ── Inside component ────────────────────────────────────────────────────────
<div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
  {PARTICLES.map((p, i) => (
    <div key={i} style={{
      position: "absolute",
      left: `${p.x}%`,
      top: `${p.y + Math.sin(frame * p.speed + p.phase) * 1.5}%`,
      width: p.size, height: p.size,
      borderRadius: "50%",
      background: BRAND_COLOR,
      opacity: p.opacity,
    }} />
  ))}
</div>
```

---

## Upgraded Node Rendering — Glow + Depth

Replace the plain border-only circles with nodes that have inner glow, making them feel like energy nodes:

```tsx
// Circle node (upgraded — glow halo)
<div key={node.id} style={{
  position: "absolute",
  left: px, top: py,
  transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
  width: node.size, height: node.size,
  borderRadius: "50%",
  border: `1.5px solid ${BRAND_COLOR}`,
  opacity: 0.7 * nodeSpring,
  // Inner + outer glow for energy node feel
  boxShadow: `0 0 ${node.size * 0.3}px ${BRAND_COLOR}20, inset 0 0 ${node.size * 0.4}px ${BRAND_COLOR}08`,
  background: `radial-gradient(circle at 40% 35%, ${BRAND_COLOR}06, transparent 65%)`,
}} />

// Pill node (upgraded — semi-transparent fill)
<div key={node.id} style={{
  position: "absolute",
  left: px, top: py,
  transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
  width: node.size * 1.6, height: node.size * 0.6,
  borderRadius: 9999,
  border: `1.5px solid ${BRAND_COLOR}`,
  background: `${BRAND_COLOR}0f`,  // 6% opacity fill — gives it body
  boxShadow: `0 0 20px ${BRAND_COLOR}15, inset 0 0 12px ${BRAND_COLOR}08`,
  display: "flex", alignItems: "center", justifyContent: "center",
  opacity: nodeSpring,
}}>
  {/* Accent dot before label */}
  <div style={{
    width: 5, height: 5, borderRadius: "50%",
    background: BRAND_COLOR, marginRight: 8, opacity: 0.8,
    boxShadow: `0 0 6px ${BRAND_COLOR}`,
  }} />
  <span style={{
    fontSize: node.size * 0.18,
    color: BRAND_COLOR,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    opacity: 0.9,
    letterSpacing: "0.03em",
  }}>
    {node.label}
  </span>
</div>
```

---

## Dual Aurora — Left + Right

Add a second aurora on the left to balance the composition:

```tsx
{/* Left aurora — cooler, dimmer counterpart */}
<div style={{
  position: "absolute",
  left: "-15%", top: "30%",
  width: "50%", height: "60%",
  background: `radial-gradient(ellipse 55% 90% at 20% 50%, ${BRAND_COLOR}0d 0%, transparent 65%)`,
  transform: `rotate(15deg) scaleX(0.6) translateY(${Math.cos(frame * 0.011) * 18}px)`,
  filter: "blur(45px)",
  opacity: 0.6,
}} />
```

---

## Multi-Path Network (Advanced — 3 connected segments)

For richer "network chaos" scenes, connect the nodes with 3 path segments that draw in sequence:

```tsx
const PATHS = [
  // Main bottom sweep
  { d: `M -60 ${height * 0.82} Q ${width * 0.30} ${height * 0.92} ${width * 0.60} ${height * 0.72}`, len: 750, delay: 35 },
  // Branch connecting upper nodes
  { d: `M ${width * 0.18} ${height * 0.62} Q ${width * 0.35} ${height * 0.45} ${width * 0.53} ${height * 0.28}`, len: 480, delay: 65 },
  // Third tendril reaching upper right
  { d: `M ${width * 0.53} ${height * 0.28} Q ${width * 0.68} ${height * 0.18} ${width * 0.79} ${height * 0.10}`, len: 320, delay: 90 },
];

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 8 }}>
  <defs>
    <filter id="pathGlow"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
  </defs>
  {PATHS.map((p, i) => {
    const prog = spring({ frame: frame - p.delay, fps, config: { stiffness: 32 - i * 3, damping: 20 } });
    const offset = interpolate(prog, [0, 1], [p.len, 0]);
    const dotT = Math.min(Math.max(prog, 0), 1);
    // Parse bezier for dot position (quadratic: only works if d is a Q command)
    // For traveling dot, use: render a circle that fades to invisible after path completes
    return (
      <g key={i}>
        <path
          d={p.d} stroke={BRAND_COLOR} strokeWidth={i === 0 ? 2 : 1.5}
          fill="none" strokeLinecap="round"
          strokeDasharray={`0 ${11 - i * 2}`}  // denser dots on branches
          strokeDashoffset={offset}
          filter="url(#pathGlow)"
          opacity={i === 0 ? 0.65 : 0.4}
        />
      </g>
    );
  })}
</svg>
```

---

## Dark Background + Aurora Nebula

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const BRAND_COLOR = BRAND.primary || "#00e5a0"; // teal/neon green

<AbsoluteFill style={{ backgroundColor: "#020c06", overflow: "hidden" }}>
  {/* Base dark gradient */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 20% 50%, #071a0e 0%, #020c06 70%)",
  }} />

  {/* Aurora / nebula blob — right side, irregular flowing shape */}
  {/* Implemented as a blurred, rotated, highly elliptical radial gradient */}
  <div style={{
    position: "absolute",
    right: "-10%", top: "15%",
    width: "60%", height: "70%",
    background: `radial-gradient(ellipse 60% 100% at 80% 50%, ${BRAND_COLOR}22 0%, ${BRAND_COLOR}0a 40%, transparent 70%)`,
    transform: `rotate(-20deg) scaleX(0.7) translateY(${Math.sin(frame * 0.012) * 20}px)`,
    filter: "blur(40px)",
    opacity: 0.9,
  }} />

  {/* Secondary nebula tendril — curves differently for organic feel */}
  <div style={{
    position: "absolute",
    right: "5%", top: "40%",
    width: "45%", height: "50%",
    background: `radial-gradient(ellipse 50% 80% at 70% 60%, ${BRAND_COLOR}18 0%, transparent 65%)`,
    transform: `rotate(15deg) translateY(${Math.cos(frame * 0.015) * 15}px)`,
    filter: "blur(50px)",
    opacity: 0.7,
  }} />
</AbsoluteFill>
```

---

## Floating Outline Nodes (Circles)

Nodes are circles with only a stroke, no fill. They vary in size and float independently:

```tsx
const NODES = [
  { id: 0, x: 0.53, y: 0.28, size: 100, delay:  5, floatPhase: 0.0, type: "circle" },
  { id: 1, x: 0.79, y: 0.10, size: 130, delay: 15, floatPhase: 1.2, type: "circle" },
  { id: 2, x: 0.18, y: 0.62, size: 115, delay: 25, floatPhase: 2.5, type: "circle" },
  { id: 3, x: 0.88, y: 0.08, size:  24, delay: 20, floatPhase: 0.8, type: "dot"    },
  { id: 4, x: 0.62, y: 0.30, size:  12, delay: 30, floatPhase: 1.5, type: "dot"    },
  // Pill nodes (rounded rectangle) — appear later
  { id: 5, x: 0.15, y: 0.55, size: 115, delay: 40, floatPhase: 0.3, type: "pill", label: "Active Delivery" },
  { id: 6, x: 0.70, y: 0.72, size:  80, delay: 55, floatPhase: 1.8, type: "pill", label: "F&I" },
];

{NODES.map((node) => {
  const nodeSpring = spring({
    frame: frame - node.delay,
    fps,
    config: { stiffness: 90, damping: 18, mass: 1 },
  });
  if (frame < node.delay) return null;

  const floatY = Math.sin((frame / 55) + node.floatPhase) * 8;
  const floatX = Math.cos((frame / 75) + node.floatPhase) * 4;
  const px = node.x * width;
  const py = node.y * height;

  if (node.type === "dot") {
    return (
      <div key={node.id} style={{
        position: "absolute",
        left: px, top: py,
        transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
        width: node.size, height: node.size,
        borderRadius: "50%",
        border: `1.5px solid ${BRAND_COLOR}`,
        opacity: 0.5 * nodeSpring,
      }} />
    );
  }

  if (node.type === "pill") {
    return (
      <div key={node.id} style={{
        position: "absolute",
        left: px, top: py,
        transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
        width: node.size * 1.6, height: node.size * 0.6,
        borderRadius: 9999,
        border: `1.5px solid ${BRAND_COLOR}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: nodeSpring,
      }}>
        <span style={{
          fontSize: node.size * 0.18,
          color: BRAND_COLOR,
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
          opacity: 0.85,
          letterSpacing: "0.02em",
        }}>
          {node.label}
        </span>
      </div>
    );
  }

  // Default: circle
  return (
    <div key={node.id} style={{
      position: "absolute",
      left: px, top: py,
      transform: `translate(-50%, -50%) scale(${nodeSpring}) translate(${floatX}px, ${floatY}px)`,
      width: node.size, height: node.size,
      borderRadius: "50%",
      border: `1.5px solid ${BRAND_COLOR}`,
      opacity: 0.6 * nodeSpring,
    }} />
  );
})}
```

---

## Dotted Curved Path with Traveling Dot

The path draws in from the left/bottom while a bright dot travels along it. Use a quadratic bezier that curves organically across the lower portion of the frame:

```tsx
// Path: starts bottom-left, curves across the bottom of the scene
const PATH_START_X = -60;
const PATH_START_Y = height * 0.82;
const PATH_CP_X    = width * 0.30;
const PATH_CP_Y    = height * 0.92;
const PATH_END_X   = width * 0.60;
const PATH_END_Y   = height * 0.72;

const PATH_D = `M ${PATH_START_X} ${PATH_START_Y} Q ${PATH_CP_X} ${PATH_CP_Y} ${PATH_END_X} ${PATH_END_Y}`;
const PATH_LENGTH = 750; // approximate arc length in px

// Path draws in from frame 35
const PATH_DRAW_DELAY = 35;
const pathProgress = spring({
  frame: frame - PATH_DRAW_DELAY,
  fps,
  config: { stiffness: 32, damping: 20 },
});
const pathDashOffset = interpolate(pathProgress, [0, 1], [PATH_LENGTH, 0]);

// Traveling dot: linear interpolation along the quadratic bezier
// t goes from 0 to 1 as path draws
const travelT = Math.min(Math.max(pathProgress, 0), 1);

// Quadratic bezier point formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
const dotX = Math.pow(1 - travelT, 2) * PATH_START_X
           + 2 * (1 - travelT) * travelT * PATH_CP_X
           + Math.pow(travelT, 2) * PATH_END_X;
const dotY = Math.pow(1 - travelT, 2) * PATH_START_Y
           + 2 * (1 - travelT) * travelT * PATH_CP_Y
           + Math.pow(travelT, 2) * PATH_END_Y;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  <defs>
    <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  {/* Dotted path */}
  <path
    d={PATH_D}
    stroke={BRAND_COLOR}
    strokeWidth={2}
    fill="none"
    strokeLinecap="round"
    strokeDasharray="0 14"     // polka-dot trick: 0px dot + 14px gap
    strokeDashoffset={pathDashOffset}
    filter="url(#pathGlow)"
    opacity={0.6}
  />

  {/* Traveling dot — follows the path tip */}
  {frame > PATH_DRAW_DELAY && (
    <circle
      cx={dotX}
      cy={dotY}
      r={6}
      fill="white"
      filter="url(#pathGlow)"
      opacity={Math.min(pathProgress * 3, 1)}
    />
  )}
</svg>
```

---

## Multiple Path Segments (Advanced)

For more complex scenes, add a second path segment that branches off from the first:

```tsx
// Branch path connecting two nodes
const BRANCH_D = `M ${width * 0.18} ${height * 0.62} Q ${width * 0.35} ${height * 0.50} ${width * 0.53} ${height * 0.28}`;
const BRANCH_LENGTH = 500;

const BRANCH_DELAY = 70;
const branchProgress = spring({
  frame: frame - BRANCH_DELAY,
  fps,
  config: { stiffness: 28, damping: 18 },
});
const branchDashOffset = interpolate(branchProgress, [0, 1], [BRANCH_LENGTH, 0]);

{/* Render alongside main path in same SVG */}
<path
  d={BRANCH_D}
  stroke={BRAND_COLOR}
  strokeWidth={1.5}
  fill="none"
  strokeLinecap="round"
  strokeDasharray="0 14"
  strokeDashoffset={branchDashOffset}
  filter="url(#pathGlow)"
  opacity={0.4}
/>
```

---

## Scene Choreography

Recommended timing for a 210-frame scene:

```
Frames 0–10:   Background + nebula fades in
Frames 5–30:   Circles pop in sequentially (each 10 frames apart)
Frames 35–90:  Main path draws in + traveling dot follows tip
Frames 40–70:  Pills animate in (after circles)
Frames 70–110: Branch path draws (if using multiple paths)
Frames 90+:    Traveling dot pauses at end, gentle float continues
```

---

## Usage Notes

- All nodes use `border: 1.5px solid BRAND_COLOR` — no background fill. This creates the "outline only" look
- Keep `opacity` on circles at 0.5–0.7 — they should feel ghostly, not solid
- The aurora nebula uses `filter: blur(40–50px)` on a highly stretched ellipse — this is what creates the organic flowing shape without any SVG path
- `strokeDasharray="0 14"` with `strokeLinecap="round"` is the polka-dot trick. Decrease `14` for denser dots
- The traveling dot uses the analytic quadratic bezier formula — no DOM refs or `getTotalLength()` needed
- For cubic bezier paths, use: `B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3`

---

## premium-glassmorphism

> Source: `src/skills/premium-glassmorphism.md`

---
title: Premium Glassmorphism, Blend Modes & Parallax Depth
impact: HIGH
impactDescription: glass UI cards, glowing orbs with blend modes, and layered parallax camera movement — the techniques that separate agency-quality from DIY
tags: glassmorphism, glass, blur, backdrop-filter, blend-mode, parallax, depth, glow, orbs, dark-mode, premium-look
---

## Glassmorphism Pattern

The "glass card" effect: frosted glass with a 1px semi-transparent border, radial glow behind it, and content on top. Use on dark backgrounds only.

```tsx
{/* The glow sits BEHIND the card — place it first */}
<div style={{
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  width: 480, height: 480,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
  filter: "blur(60px)",
  pointerEvents: "none",
}} />

{/* Glass card with directional lighting bevel */}
<div style={{
  background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderTop: "1px solid rgba(255,255,255,0.20)",
  borderLeft: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 24,
  padding: "32px 40px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.40), inset 0 1px 1px rgba(255,255,255,0.15)",
}}>
  {/* content */}
</div>
```

### Tuning Table

| Use Case | blur | bg opacity | border opacity |
|---|---|---|---|
| Subtle card | 8px | 0.04 | 0.08 |
| Standard card | 14px | 0.06 | 0.12 |
| Heavy glass | 22px | 0.10 | 0.18 |
| Full panel | 32px | 0.14 | 0.20 |

---

## Glowing Orbs with CSS Blend Modes

Orbs that sit *naturally* in the scene using `mix-blend-mode`. Works for animated background spheres, light streaks, and color washes.

```tsx
const frame = useCurrentFrame();

// Slow drift — each orb moves independently
const orb1X = Math.sin(frame * 0.018) * 80;
const orb1Y = Math.cos(frame * 0.014) * 60;
const orb2X = Math.sin(frame * 0.022 + 1.5) * 100;
const orb2Y = Math.cos(frame * 0.016 + 2) * 70;
```

```tsx
<AbsoluteFill style={{ background: "#080c14", overflow: "hidden" }}>

  {/* Orb 1 — indigo, screen blend */}
  <div style={{
    position: "absolute",
    top: "20%", left: "15%",
    width: 600, height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.7) 0%, transparent 65%)",
    filter: "blur(80px)",
    transform: `translate(${orb1X}px, ${orb1Y}px)`,
    mixBlendMode: "screen",
    pointerEvents: "none",
  }} />

  {/* Orb 2 — teal, screen blend */}
  <div style={{
    position: "absolute",
    bottom: "10%", right: "10%",
    width: 500, height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(20,184,166,0.6) 0%, transparent 65%)",
    filter: "blur(70px)",
    transform: `translate(${orb2X}px, ${orb2Y}px)`,
    mixBlendMode: "screen",
    pointerEvents: "none",
  }} />

  {/* Content sits on top */}
</AbsoluteFill>
```

### Blend Mode Cheat Sheet

| Mode | Effect | Best For |
|---|---|---|
| `screen` | Brightens — dark areas become transparent | Glowing orbs on dark bg |
| `overlay` | Deepens contrast | Text glow sweeps |
| `multiply` | Darkens — white areas become transparent | Vignette overlays |
| `color-dodge` | Dramatic light burst | Flash transitions |

---

## Light Sweep Across Text

A diagonal shine that sweeps across a headline — standard agency technique:

```tsx
const { width } = useVideoConfig();
const sweepX = interpolate(
  frame,
  [20, 80],
  [-width, width * 0.5],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

```tsx
<div style={{ position: "relative", display: "inline-block" }}>
  <h1 style={{
    fontSize: 72, fontWeight: 900, color: "white",
    fontFamily: "Inter, sans-serif", margin: 0,
  }}>
    Your Headline
  </h1>
  {/* Sweep overlay — blend mode makes it glow only over text */}
  <div style={{
    position: "absolute", inset: 0,
    background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)`,
    transform: `translateX(${sweepX}px)`,
    mixBlendMode: "overlay",
    pointerEvents: "none",
  }} />
</div>
```

---

## Parallax Depth System

Background, midground, and foreground scale/pan at **different rates** on the same camera move — creates true 3D depth without Three.js.

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Camera push-in: 0 → 1 over 90 frames
const cameraProgress = interpolate(
  frame,
  [0, 90],
  [0, 1],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
  }
);

// Each layer gets a different multiplier — background moves least
const bgScale    = interpolate(cameraProgress, [0, 1], [1.00, 1.06]);  // barely moves
const gridScale  = interpolate(cameraProgress, [0, 1], [1.00, 1.14]);  // mid
const cardScale  = interpolate(cameraProgress, [0, 1], [1.00, 1.28]);  // most
const cursorScale = interpolate(cameraProgress, [0, 1], [1.00, 1.45]); // cursor overtakes fastest

// Pan offset (if camera tracks left→right)
const bgPanX    = interpolate(cameraProgress, [0, 1], [0, -20]);
const gridPanX  = interpolate(cameraProgress, [0, 1], [0, -50]);
const cardPanX  = interpolate(cameraProgress, [0, 1], [0, -100]);
```

```tsx
<AbsoluteFill style={{ background: "#0a0f1e", overflow: "hidden" }}>

  {/* Layer 0: Background gradient — barely moves */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)",
    transform: `scale(${bgScale}) translateX(${bgPanX}px)`,
    transformOrigin: "center center",
  }} />

  {/* Layer 1: Dot grid — moves a little more */}
  <div style={{
    position: "absolute", inset: 0,
    opacity: 0.15,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
    transform: `scale(${gridScale}) translateX(${gridPanX}px)`,
    transformOrigin: "center center",
  }} />

  {/* Layer 2: Background UI cards — inactive / blurred */}
  <div style={{
    position: "absolute",
    top: "20%", left: "5%",
    transform: `scale(${bgScale}) translateX(${bgPanX * 1.5}px)`,
    transformOrigin: "center center",
    opacity: 0.4,
    filter: "blur(2px)",
  }}>
    {/* ghost cards */}
    {[0,1].map(i => (
      <div key={i} style={{
        width: 200, height: 120, marginBottom: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
      }} />
    ))}
  </div>

  {/* Layer 3: Foreground hero card — moves the most */}
  <div style={{
    position: "absolute",
    top: "50%", left: "50%",
    transform: `translate(-50%, -50%) scale(${cardScale}) translateX(${cardPanX}px)`,
    transformOrigin: "center center",
  }}>
    <div style={{
      width: 520, height: 320,
      background: "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderTop: "1px solid rgba(255,255,255,0.24)",
      borderLeft: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 20,
      boxShadow: "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
    }}>
      {/* card content */}
    </div>
  </div>

</AbsoluteFill>
```

---

---

## Gradient-Glow Border (Linear/Stripe style)

Instead of a flat 1px border, use a layered box-shadow trick that produces a colored glow ring:

```tsx
{/* Glowing border card — brand color ring with outer diffuse halo */}
<div style={{
  background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: 20,
  // Layered shadows: 1px sharp brand ring + diffuse outer glow
  boxShadow: `0 0 0 1px ${BRAND.primary}55, 0 0 24px ${BRAND.primary}22, 0 16px 48px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.12)`,
  padding: "24px 32px",
}}>
  {/* content */}
</div>
```

For a subtle inactive state and bold active state (tabs, selected cards):
```tsx
const activeGlow = `0 0 0 1px ${BRAND.primary}88, 0 0 32px ${BRAND.primary}33, 0 8px 32px rgba(0,0,0,0.35)`;
const inactiveGlow = `0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.25)`;
style={{ boxShadow: isActive ? activeGlow : inactiveGlow }}
```

---

## Glass Notification / Toast Card

Floating notification that slides up from the bottom with a brand-color left stripe:

```tsx
const toastOpacity = interpolate(frame, [openFrame, openFrame + 10, closeFrame - 8, closeFrame], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const toastY = interpolate(frame, [openFrame, openFrame + 12], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });

<div style={{
  position: "absolute",
  bottom: 48, right: 48,
  opacity: toastOpacity,
  transform: `translateY(${toastY}px)`,
  zIndex: 200,
  display: "flex", alignItems: "stretch",
  background: "rgba(15,20,35,0.88)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 14,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
  overflow: "hidden",
  minWidth: 300,
}}>
  {/* Brand color left stripe */}
  <div style={{ width: 4, background: BRAND.primary, flexShrink: 0 }} />
  <div style={{ padding: "14px 18px", flex: 1 }}>
    <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.text, fontFamily: BRAND.font + ", sans-serif", marginBottom: 4 }}>
      Success
    </div>
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: BRAND.font + ", sans-serif" }}>
      Changes saved successfully
    </div>
  </div>
  {/* Checkmark icon */}
  <div style={{ padding: "14px 16px", display: "flex", alignItems: "center" }}>
    <div style={{ width: 22, height: 22, borderRadius: "50%", background: BRAND.primary + "30", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 10, height: 6, border: `2px solid ${BRAND.primary}`, borderTop: "none", borderRight: "none", transform: "rotate(-45deg) translateY(-1px)" }} />
    </div>
  </div>
</div>
```

---

## Stat / Metric Glass Widget (Stripe Dashboard style)

Compact metric card with trend indicator — great for floating overlays on showcase scenes:

```tsx
const METRICS = [
  { label: "Revenue",    value: "$124K", trend: "+18%", up: true  },
  { label: "Users",      value: "8,421",  trend: "+6%",  up: true  },
  { label: "Churn Rate", value: "2.1%",   trend: "-0.3%",up: true  },
];

{METRICS.map((m, i) => {
  const delay = i * 12;
  const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [delay, delay + 15], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <div key={i} style={{
      opacity: cardOpacity, transform: `translateY(${cardY}px)`,
      background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderTop: "1px solid rgba(255,255,255,0.14)",
      borderRadius: 16, padding: "18px 22px",
      minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: BRAND.font + ", sans-serif", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {m.label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: BRAND.text, fontFamily: BRAND.font + ", sans-serif", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {m.value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: m.up ? "#22c55e" : "#ef4444", fontFamily: BRAND.font + ", sans-serif", marginTop: 6 }}>
        {m.trend} this month
      </div>
    </div>
  );
})}
```

---

## Glass Navbar (Frosted Dark)

Sticky top bar with frosted glass — works across dark and medium backgrounds:

```tsx
<div style={{
  position: "absolute", top: 0, left: 0, right: 0,
  height: 56,
  background: "rgba(8,12,24,0.75)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  display: "flex", alignItems: "center", padding: "0 32px", gap: 32,
  zIndex: 50,
}}>
  {/* Logo */}
  <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.primary, fontFamily: BRAND.font + ", sans-serif", letterSpacing: "-0.03em" }}>
    {BRAND.name ?? "Product"}
  </div>
  {/* Nav links */}
  {["Features", "Pricing", "Docs"].map((link, i) => (
    <div key={i} style={{ fontSize: 14, color: i === 0 ? BRAND.text : "rgba(255,255,255,0.45)", fontWeight: i === 0 ? 600 : 400, fontFamily: BRAND.font + ", sans-serif", cursor: "default" }}>
      {link}
    </div>
  ))}
  {/* CTA pill button */}
  <div style={{ marginLeft: "auto", background: BRAND.primary, color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 20px", borderRadius: 99, fontFamily: BRAND.font + ", sans-serif" }}>
    Get started
  </div>
</div>
```

---

## Glass CTA Button with Shine Sweep

A pill CTA button with a diagonal light sweep on entrance — the standard premium SaaS CTA:

```tsx
const SHINE_START = 30;
const { width: vw } = useVideoConfig();
const shineX = interpolate(frame, [SHINE_START, SHINE_START + 40], [-vw * 0.3, vw * 0.3], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
});

<div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 99 }}>
  <div style={{
    background: BRAND.primary,
    color: "#fff",
    fontSize: 18, fontWeight: 700,
    padding: "18px 48px",
    borderRadius: 99,
    fontFamily: BRAND.font + ", sans-serif",
    letterSpacing: "-0.01em",
    boxShadow: `0 8px 32px ${BRAND.primary}55`,
    position: "relative",
  }}>
    {/* Shine sweep */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
      transform: `translateX(${shineX}px)`,
      pointerEvents: "none",
    }} />
    Get Started Free →
  </div>
</div>
```

---

## Light Glassmorphism (Frosted White)

For light-background brands — cards feel like frosted white glass over a soft gradient:

```tsx
{/* On a pastel/white bg, use white with high opacity + colored drop shadow */}
<div style={{
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.9)",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  borderRight: "1px solid rgba(0,0,0,0.04)",
  borderRadius: 20,
  boxShadow: `0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)`,
  padding: "24px 28px",
}}>
  {/* content — use dark text: BRAND.text or #0f172a */}
</div>
```

For floating metric card on light bg:
```tsx
boxShadow: `0 12px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04), 0 0 0 1px ${BRAND.primary}18`
```

---

## Feature Card Grid (2×2 / 3×2)

Staggered glass card grid with icon, headline, and description — standard SaaS feature section:

```tsx
const FEATURES = [
  { icon: "⚡", title: "Lightning Fast",   desc: "Sub-100ms response times globally" },
  { icon: "🔒", title: "Secure by Default", desc: "SOC2 Type II certified infrastructure" },
  { icon: "📊", title: "Real-time Analytics", desc: "Live dashboards with zero latency" },
  { icon: "🔗", title: "200+ Integrations", desc: "Connect your entire tech stack" },
];

const COLS = 2;
const CARD_W = 280, CARD_H = 160, GAP = 16;
const gridW = COLS * CARD_W + (COLS - 1) * GAP;

{FEATURES.map((f, i) => {
  const col = i % COLS, row = Math.floor(i / COLS);
  const delay = (col + row * COLS) * 8;
  const cardScale = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const cardOpacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div key={i} style={{
      position: "absolute",
      left: (width - gridW) / 2 + col * (CARD_W + GAP),
      top: (height - (Math.ceil(FEATURES.length / COLS) * (CARD_H + GAP) - GAP)) / 2 + row * (CARD_H + GAP),
      width: CARD_W, height: CARD_H,
      opacity: cardOpacity,
      transform: `scale(${cardScale})`,
      transformOrigin: "center center",
      background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderTop: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 18,
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      padding: "20px 24px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      <div style={{ fontSize: 28 }}>{f.icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: BRAND.text, fontFamily: BRAND.font + ", sans-serif", marginBottom: 4 }}>{f.title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: BRAND.font + ", sans-serif", lineHeight: 1.4 }}>{f.desc}</div>
      </div>
    </div>
  );
})}
```

---

## Key Rules

- **`WebkitBackdropFilter`** — always mirror `backdropFilter` for Safari/Chrome compatibility
- **Orbs behind content**: render orb `<div>`s before the card `<div>`s in the JSX
- **`mix-blend-mode: "screen"`**: only works on dark backgrounds — on white, use `"multiply"`
- **Parallax multipliers**: background 1.06, midground 1.14, foreground 1.28+ — the bigger the gap between layers, the more "depth"
- **`transformOrigin: "center center"`** on all parallax layers — otherwise they scale from top-left
- **Never animate `filter: blur()` per-frame** — it's GPU-expensive; use a fixed blur on static "depth" layers only
- **Light vs dark glass**: dark bg → `rgba(255,255,255,0.07)` surface + `rgba(255,255,255,0.08)` border; light bg → `rgba(255,255,255,0.72)` surface + `rgba(0,0,0,0.06)` shadow ring
- **Gradient-glow border**: use layered `box-shadow` (`0 0 0 1px ${primary}55`) instead of `border` for glowing outlines

---

## High-Depth Glass Formula (WhatAStory Standard — 2026-03-18)

This is the ONLY acceptable glass card formula for premium SaaS scenes. Replace all existing glass card styles with this.

```tsx
// High-Depth Glassmorphism — directional light from top-left
// Copy-paste this EXACTLY. Do not simplify or merge the borders into one shorthand.
{
  background: "rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(24px) saturate(150%)",      // saturate(150%) prevents muddy gray blur
  WebkitBackdropFilter: "blur(24px) saturate(150%)",
  // Directional borders: top+left are brighter (light source = top-left)
  borderTop:    "1px solid rgba(255, 255, 255, 1.0)", // Full-brightness catch light on top edge
  borderLeft:   "1px solid rgba(255, 255, 255, 0.15)",
  borderRight:  "1px solid rgba(255, 255, 255, 0.06)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
  borderRadius: 20,
  // Deep shadow: sharp contact + broad ambient occlusion
  boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 25px 50px -12px rgba(0, 0, 0, 0.50)",
}
```

**Why `saturate(150%)`:** Without saturation boost, `blur()` averages the colors behind the card and produces a muddy gray haze. `saturate(150%)` keeps the colors vibrant through the frost — the background is still identifiable, just softened.

**Why `borderTop: rgba(255,255,255,1.0)`:** The top edge is where studio light hits glass at full intensity. Full-brightness white top = physical specular highlight. 0.20 opacity looks like a subtle hairline; 1.0 looks like real frosted glass.

**Why directional borders matter:** Uniform borders look flat. Top/left brighter = simulated studio light from top-left. This is the single biggest difference between generic glass and WhatAStory glass.

**Blur 24px vs 16px:** 24px is perceptibly more "frosted" — feels physical. 16px looks like a CSS effect.

**Box-shadow breakdown:**
- `0 1px 2px rgba(0,0,0,0.12)` — sharp contact shadow (object is resting on a surface)
- `0 25px 50px -12px rgba(0,0,0,0.50)` — deep ambient occlusion (object has physical mass)

---

## Light Glass Formula (Frosted White — Copy-Paste)

```tsx
// Light Glass — for pastel/white backgrounds (Pretaa, JustCall light themes)
{
  background: "rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(20px) saturate(150%)",
  WebkitBackdropFilter: "blur(20px) saturate(150%)",
  borderTop:    "1px solid rgba(255, 255, 255, 1.0)",
  borderLeft:   "1px solid rgba(255, 255, 255, 0.9)",
  borderRight:  "1px solid rgba(0, 0, 0, 0.04)",
  borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
  borderRadius: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
}
```

---

## Anti-Patterns

- **NEVER use `backdropFilter: "blur(Xpx)"` alone** — always append `saturate(150%)`. Blur without saturation boost = muddy gray haze.
- **NEVER use a single uniform border** (`border: "1px solid rgba(255,255,255,0.1)"`) — it looks flat. Use four separate directional borders.
- **NEVER skip `borderTop: "1px solid rgba(255,255,255,1.0)"`** — the top catch-light is the single most important detail for physical realism.
- **NEVER use standard `opacity` to make a card transparent** (`opacity: 0.8`) — this fades the card's content too. Use `background: "rgba(...)"` opacity instead.
- **NEVER animate `filter: blur()` per-frame** — GPU-expensive and causes jitter. Apply fixed blur to static depth layers only.
- **NEVER use `mix-blend-mode: "screen"` on light backgrounds** — orbs only work with screen blend on dark (#0a0f1e or darker).

---

## Quality Checklist

- [ ] `backdropFilter` includes both `blur(24px)` AND `saturate(150%)` — never blur alone
- [ ] All four borders set independently (not shorthand `border:`) with directional values
- [ ] `borderTop` is `rgba(255,255,255,1.0)` — full-brightness catch light
- [ ] `WebkitBackdropFilter` mirrors `backdropFilter` exactly (Safari compatibility)
- [ ] Box-shadow uses two-layer formula: sharp contact + deep AO (`0 25px 50px -12px`)
- [ ] Orb glow `<div>` is rendered BEFORE the glass card in JSX (behind in paint order)

---

## premium-gradient-hero

> Source: `src/skills/premium-gradient-hero.md`

---
title: Premium Gradient Hero
impact: HIGH
impactDescription: full-screen bold headline with brand gradient text — single punchy message, zero chrome, maximum impact
tags: gradient-text, hero, headline, typography, minimal, chapter-card, bold, brand-gradient, full-screen-text
---

## When to Use

Single-sentence scenes that need maximum visual punch. No cards, no UI, no device — just oversized words and gradient color. Used for:
- Chapter title cards between showcase scenes
- Bold problem statements ("73% of teams miss deadlines")
- CTA openers and brand reveal moments
- Any scene where the MESSAGE is the visual

---

## Core Gradient Text Pattern (copy exactly)

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

const HEADLINE = "Built for teams that ship.";
const words = HEADLINE.split(" ");

<AbsoluteFill style={{
  backgroundColor: BRAND.bg,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexDirection: "column", gap: 28, padding: "0 80px",
}}>

  {/* Optional: soft radial glow behind text */}
  <div style={{
    position: "absolute", width: 900, height: 600, borderRadius: "50%",
    background: `radial-gradient(ellipse, ${BRAND.primary}20 0%, transparent 70%)`,
    filter: "blur(80px)", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  }} />

  {/* Gradient headline — word-by-word spring stagger */}
  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 20px", position: "relative" }}>
    {words.map((word, i) => {
      const delay = i * 5;
      const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 160 } });
      return (
        <span key={i} style={{
          display: "inline-block",
          fontSize: words.length <= 3 ? 140 : words.length <= 6 ? 108 : 80,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.0,
          fontFamily: BRAND.font ?? "Inter, sans-serif",
          // GRADIENT TEXT — the critical pattern:
          background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 60%, ${BRAND.primary} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          opacity: interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
          willChange: "transform",
        }}>
          {word}
        </span>
      );
    })}
  </div>

  {/* Subheadline — appears after headline completes */}
  <div style={{
    fontSize: 28, fontWeight: 400, color: BRAND.textMuted,
    fontFamily: BRAND.font ?? "Inter, sans-serif",
    letterSpacing: "-0.01em", textAlign: "center", maxWidth: "65%",
    opacity: interpolate(frame, [words.length * 5 + 15, words.length * 5 + 30], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [words.length * 5 + 15, words.length * 5 + 30], [20, 0], { extrapolateRight: "clamp" })}px)`,
  }}>
    {SUBHEADLINE}
  </div>

</AbsoluteFill>
```

---

## Typography Sizing Rule

Size based on word count so text FILLS the frame:

| Words in headline | fontSize | letterSpacing |
|---|---|---|
| 1–3 words | **140–160px** | -0.05em |
| 4–6 words | **96–120px** | -0.04em |
| 7–9 words | **72–88px** | -0.03em |
| 10+ words | **56–68px** | -0.02em |

**NEVER use less than 72px for the hero headline. Never.**

---

## Accent Word Variant

One bold gradient word, rest in plain text:

```tsx
const ACCENT_INDEX = 2; // which word gets the gradient

words.map((word, i) => (
  <span key={i} style={i === ACCENT_INDEX ? {
    background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  } : {
    color: BRAND.text,
  }}>
    {word}{" "}
  </span>
))
```

---

## Underline Draw Accent

A brand-colored line that sweeps under the key phrase:

```tsx
const UNDERLINE_START = words.length * 5 + 5;
const underlineW = interpolate(frame, [UNDERLINE_START, UNDERLINE_START + 25], [0, 100], {
  extrapolateRight: "clamp",
  easing: (t) => 1 - Math.pow(1 - t, 3),
});

// Sibling div after the word span:
<div style={{
  height: 5, borderRadius: 3, marginTop: 8,
  width: `${underlineW}%`,
  background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.secondary})`,
}} />
```

---

## Light Background Variant

```tsx
// Replace background gradient with brand colors on white bg:
backgroundColor: "#f8fafc",
// Headline: same gradient pattern — works on light bg
// Subheadline: color: "rgba(15,23,42,0.5)"
// Remove glow overlay
```

---

## premium-icon-arc-reveal

> Source: `src/skills/premium-icon-arc-reveal.md`

---
title: Premium Icon Arc Reveal
impact: HIGH
impactDescription: dramatic hook scene — brand icon centered on dark glow pool, SVG arc draws around it, concentric rings expand outward, then icon grows into a shape-masked reveal
tags: icon, arc, hook, reveal, dark, neon, glow, shape-mask, concentric rings, cinematic, intro, desklog
---

## Icon Arc Reveal Pattern

A single brand/product icon centered on a dark background. A radial glow pool expands behind it. An SVG circular arc draws around the icon via `strokeDashoffset` animation. Multiple concentric rings at different radii pulse with varying opacity. Strong cinematic hook — works for any icon-forward brand.

**Typical use case**: First scene of any dark-themed SaaS/tech video. Desklog's hook scene is exactly this.

---

## Dark Glow Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Glow breathes slowly
const glowScale = 1 + Math.sin(frame * 0.03) * 0.06;

const BRAND_COLOR = BRAND.primary || "#00e5a0"; // teal/neon green

<AbsoluteFill style={{ backgroundColor: "#030d07", overflow: "hidden" }}>
  {/* Large radial glow pool centered */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    width: "90%", height: "90%",
    transform: `translate(-50%, -50%) scale(${glowScale})`,
    background: `radial-gradient(circle at 50% 55%, ${BRAND_COLOR}28 0%, ${BRAND_COLOR}10 30%, transparent 65%)`,
    borderRadius: "50%",
  }} />
  {/* Darker center overlay — keeps icon readable */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    width: "40%", height: "40%",
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, rgba(0,0,0,0.35) 0%, transparent 100%)",
    borderRadius: "50%",
  }} />
</AbsoluteFill>
```

---

## Centered Brand Icon (SVG, Outlined)

Use a stroke-only SVG icon. No fill — the neon outline on dark bg is the look:

```tsx
const ICON_SIZE = 120; // px in the SVG viewBox coordinate space

// Icon entrance spring
const iconSpring = spring({ frame, fps, config: { stiffness: 100, damping: 16, mass: 1 } });
const iconScale = interpolate(iconSpring, [0, 1], [0.5, 1]);

// Heartbeat after entrance
const heartbeat = Math.sin(frame * 0.08) * 0.025 * Math.min(iconSpring, 1);

<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: `translate(-50%, -50%) scale(${iconScale + heartbeat})`,
  zIndex: 30,
}}>
  <svg
    width={200} height={200}
    viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
    style={{ overflow: "visible" }}
  >
    <defs>
      <filter id="iconGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Heart icon path — swap for any brand icon */}
    <path
      d="M60 85 L60 85 C35 65 20 50 20 35 C20 22 30 12 43 12 C52 12 58 17 60 22 C62 17 68 12 77 12 C90 12 100 22 100 35 C100 50 85 65 60 85 Z"
      fill="none"
      stroke={BRAND_COLOR}
      strokeWidth="3.5"
      strokeLinejoin="round"
      filter="url(#iconGlow)"
    />
  </svg>
</div>
```

**Swappable icons**: Replace the `<path>` with any SVG icon. Keep `fill="none"` and `stroke={BRAND_COLOR}`. Common ones:
- Circle target: `<circle cx="60" cy="60" r="30" />`
- Lightning bolt: `<polyline points="70,10 45,55 65,55 50,110" />`
- Star: use a 5-point star polygon

---

## SVG Arc Drawing Around the Icon

A single circular arc draws from the top using spring-animated `strokeDashoffset`. The arc is centered exactly on the icon:

```tsx
// Arc parameters
const ARC_RADIUS = 140; // px from center — adjust to clear the icon size
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS; // full circle perimeter

// Arc starts drawing at frame 10, completes around frame 80
const ARC_DELAY = 10;
const arcProgress = spring({
  frame: frame - ARC_DELAY,
  fps,
  config: { stiffness: 35, damping: 22 },
});

// How much of the full circle to draw (0.75 = 270°, 1.0 = full circle)
const ARC_FILL = 0.72;
const visibleLength = interpolate(arcProgress, [0, 1], [0, ARC_CIRCUMFERENCE * ARC_FILL]);
const dashOffset = ARC_CIRCUMFERENCE - visibleLength;

// cx, cy = center of canvas
const cx = width / 2;
const cy = height / 2;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  <defs>
    <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="b" />
      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  {/* Main arc — draws clockwise from top (rotate -90 to start at 12 o'clock) */}
  <circle
    cx={cx}
    cy={cy}
    r={ARC_RADIUS}
    fill="none"
    stroke={BRAND_COLOR}
    strokeWidth={2}
    strokeLinecap="round"
    strokeDasharray={`${ARC_CIRCUMFERENCE} ${ARC_CIRCUMFERENCE}`}
    strokeDashoffset={dashOffset}
    transform={`rotate(-90 ${cx} ${cy})`}
    filter="url(#arcGlow)"
    opacity={0.85}
  />
</svg>
```

**Key**: `rotate(-90 cx cy)` starts the arc at 12 o'clock. A full circle `strokeDasharray` equals the circumference. Animating `strokeDashoffset` from full (hidden) to 0 (revealed) draws it in.

---

## Concentric Rings

Multiple rings at different radii and opacities, expanding very slowly — creates a sonar/depth feel distinct from the drawing arc:

```tsx
const RINGS = [
  { radius: 200, opacity: 0.12, delay:  0 },
  { radius: 280, opacity: 0.08, delay: 10 },
  { radius: 360, opacity: 0.05, delay: 20 },
  { radius: 440, opacity: 0.04, delay: 30 },
];

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  {RINGS.map((ring, i) => {
    const ringProgress = spring({
      frame: frame - ring.delay,
      fps,
      config: { stiffness: 25, damping: 30 }, // very slow — barely any spring
    });
    const r = interpolate(ringProgress, [0, 1], [ring.radius * 0.6, ring.radius]);
    const opacity = ring.opacity * Math.min(ringProgress, 1);
    return (
      <circle
        key={i}
        cx={width / 2} cy={height / 2}
        r={r}
        fill="none"
        stroke={BRAND_COLOR}
        strokeWidth={1}
        opacity={opacity}
      />
    );
  })}
</svg>
```

---

## Optional: Shape-Mask Reveal Phase (hook3→4)

After the arc completes (~frame 80+), the icon expands to fill the screen and reveals a screenshot inside it:

```tsx
const EXPAND_DELAY = 80;
const expandSpring = spring({
  frame: frame - EXPAND_DELAY,
  fps,
  config: { stiffness: 60, damping: 16, mass: 1.5 },
});
const expandScale = interpolate(expandSpring, [0, 1], [1, 20]); // icon grows 20x to fill frame

// Use premium-neon-dark's shape-masked reveal pattern for the content inside
// The icon SVG path becomes a clipPath that reveals ATTACHED_IMAGES[0]
const maskOpacity = interpolate(expandSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

{/* Expanding masked screenshot — rendered behind the icon layer */}
<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: `translate(-50%, -50%) scale(${expandScale})`,
  opacity: maskOpacity,
  width: 200, height: 200,
  borderRadius: "50%", // or use clipPath for icon shape
  overflow: "hidden",
}}>
  {ATTACHED_IMAGES[0] && (
    <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  )}
</div>
```

---

## Complete Scene Structure

```tsx
export const IconArcReveal = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* 1. Dark background + glow pool */}
      {/* 2. SVG layer 1: concentric rings (behind arc) */}
      {/* 3. SVG layer 2: drawing arc */}
      {/* 4. Brand icon (with neon glow filter) */}
      {/* 5. Optional: expanding shape-mask reveal */}
    </AbsoluteFill>
  );
};
```

---

## Wordmark + Tagline Layer (Brand Identity Phase)

After the arc completes, add the brand name and tagline below the icon. This makes the hook feel like a full brand reveal:

```tsx
// Text appears after arc finishes (delay ~ 60)
const textDelay = 60;
const textProgress = spring({ frame: frame - textDelay, fps, config: { damping: 18, stiffness: 110 } });
const textY = interpolate(textProgress, [0, 1], [16, 0]);

{frame >= textDelay && (
  <div style={{
    position: "absolute", left: "50%", top: "58%",
    transform: `translate(-50%, -50%) translateY(${textY}px)`,
    opacity: Math.min(textProgress * 1.5, 1),
    textAlign: "center", zIndex: 35,
  }}>
    {/* Brand wordmark */}
    <div style={{
      fontSize: 56, fontWeight: 900, letterSpacing: "-0.04em",
      color: "#fff", fontFamily: "Inter, sans-serif",
      textShadow: `0 0 30px ${BRAND_COLOR}50`,
    }}>
      {BRAND.name}
    </div>
    {/* Tagline */}
    <div style={{
      fontSize: 16, fontWeight: 500, letterSpacing: "0.14em",
      color: `${BRAND_COLOR}cc`, fontFamily: "Inter, sans-serif",
      textTransform: "uppercase", marginTop: 12,
      opacity: interpolate(textProgress, [0.4, 1], [0, 1], { extrapolateLeft: "clamp" }),
    }}>
      {BRAND.tagline || "AI-Powered Solutions"}
    </div>
  </div>
)}
```

---

## Dual-Arc Variant (Inner + Outer)

For more visual richness, draw two arcs: a faster inner arc and a slower outer arc. The inner completes first, outer finishes later:

```tsx
const ARC_INNER_RADIUS = 120;
const ARC_OUTER_RADIUS = 175;
const CIRC_INNER = 2 * Math.PI * ARC_INNER_RADIUS;
const CIRC_OUTER = 2 * Math.PI * ARC_OUTER_RADIUS;

// Inner arc — fast, 270°
const innerProg = spring({ frame: frame - 8, fps, config: { stiffness: 45, damping: 24 } });
// Outer arc — slower, 220°
const outerProg = spring({ frame: frame - 20, fps, config: { stiffness: 28, damping: 22 } });

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  <defs>
    <filter id="arcGlow"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
  </defs>
  {/* Inner arc — 270°, starts at 12 o'clock */}
  <circle cx={cx} cy={cy} r={ARC_INNER_RADIUS}
    fill="none" stroke={BRAND_COLOR} strokeWidth={2.5} strokeLinecap="round"
    strokeDasharray={`${CIRC_INNER} ${CIRC_INNER}`}
    strokeDashoffset={interpolate(innerProg, [0, 1], [CIRC_INNER, CIRC_INNER * 0.25])}
    transform={`rotate(-90 ${cx} ${cy})`} filter="url(#arcGlow)" opacity={0.9}
  />
  {/* Outer arc — 220°, counter-clockwise feel via different start angle */}
  <circle cx={cx} cy={cy} r={ARC_OUTER_RADIUS}
    fill="none" stroke={BRAND_COLOR} strokeWidth={1.5} strokeLinecap="round"
    strokeDasharray={`${CIRC_OUTER} ${CIRC_OUTER}`}
    strokeDashoffset={interpolate(outerProg, [0, 1], [CIRC_OUTER, CIRC_OUTER * 0.39])}
    transform={`rotate(-120 ${cx} ${cy})`} filter="url(#arcGlow)" opacity={0.5}
  />
</svg>
```

---

## Usage Notes

- `ARC_RADIUS` should be ~30–50% larger than the icon's rendered size so the arc clears the icon
- `ARC_FILL = 0.72` draws ~260° — leaving a gap at the bottom for elegance. Use `1.0` for a full circle
- The glow filter `feGaussianBlur stdDeviation="1.5–2"` is enough for a visible neon glow without performance cost
- For non-heart icons: the shape-mask expand works best with a circle clipPath (simpler and cleaner at large scales)
- Pairs naturally with `premium-floating-path-nodes` for the subsequent problem scene (same dark bg, same brand glow color)
- Use `BRAND.primary` for `BRAND_COLOR`; if dark brand (e.g. dark blue), the icon + arc still works — just ensure the glow color contrasts with the near-black bg
- **Always add the wordmark + tagline text layer** after arc completion — a bare icon with arc but no text feels incomplete
- **Dual-arc variant** is always preferred over single arc — the second arc adds almost no code but doubles the visual richness

---

## premium-icon-bubble-row

> Source: `src/skills/premium-icon-bubble-row.md`

---
title: Premium Icon Bubble Row
impact: HIGH
impactDescription: large colored filled circles with white SVG icons pop in sequentially with labels, a partial decorative arc highlights one bubble — light pastel gradient background; works for feature categories, tech stack, use cases
tags: icon bubbles, categories, circles, colored icons, labels, pastel, light, arc accent, features, use-cases, viable, technology
---

## Icon Bubble Row Pattern

Large filled colored circles (each a different brand-adjacent hue) with white SVG icon paths inside. Each bubble pops in with an elastic spring and reveals a text label to its side. An optional decorative partial arc draws around one of the bubbles as a highlight or selection indicator.

**Typical use case**: Feature categories scene ("Product", "Customer Experience", "Employee Engagement"), technology stack scene (AI, NLP, ML), or "use cases" social proof scene. Clean, logo-app-icon aesthetic on pastel background.

---

## Pastel Gradient Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

<AbsoluteFill style={{ backgroundColor: "#f5f0f8", overflow: "hidden" }}>
  {/* Top-left pink blob */}
  <div style={{
    position: "absolute", left: 0, top: 0,
    width: "55%", height: "60%",
    background: "radial-gradient(circle at 0% 0%, rgba(236,72,153,0.18) 0%, transparent 60%)",
  }} />
  {/* Bottom-right warm pink blob */}
  <div style={{
    position: "absolute", right: 0, bottom: 0,
    width: "50%", height: "55%",
    background: "radial-gradient(circle at 100% 100%, rgba(251,113,133,0.15) 0%, transparent 58%)",
  }} />
  {/* Right-center salmon accent */}
  <div style={{
    position: "absolute", right: 0, top: "30%",
    width: "35%", height: "45%",
    background: "radial-gradient(circle at 100% 50%, rgba(249,168,212,0.20) 0%, transparent 55%)",
  }} />
</AbsoluteFill>
```

Swap to brand primary tones by replacing the pink RGBA values with `hexToRgba(BRAND.primary, 0.18)`.

---

## Bubble Data

```tsx
// Define bubbles with position, color, and delay
const BUBBLES = [
  {
    id: 0,
    x: 0.28,      // fraction of width
    y: 0.48,      // fraction of height
    size: 145,    // diameter in px
    color: "#e53e6d",    // bubble fill color
    delay: 5,
    label: "Artificial Intelligence",
    labelSide: "left",   // label appears to this side
    icon: "ai",
  },
  {
    id: 1,
    x: 0.52,
    y: 0.44,
    size: 130,
    color: "#f97316",
    delay: 20,
    label: "Natural Language Processing",
    labelSide: "right",
    icon: "brain",
  },
  {
    id: 2,
    x: 0.72,
    y: 0.50,
    size: 155,
    color: "#7c3aed",
    delay: 35,
    label: "Employee Engagement",
    labelSide: "right",
    icon: "chat",
  },
];
```

---

## Bubble Component

```tsx
const BubbleNode = ({ bubble, frame, fps, width, height }) => {
  const { x, y, size, color, delay, label, labelSide } = bubble;

  if (frame < delay) return null;

  // Elastic pop entrance
  const popSpring = spring({
    frame: frame - delay,
    fps,
    config: { stiffness: 140, damping: 11, mass: 1.1 },
  });
  const scale = interpolate(popSpring, [0, 1], [0.3, 1]);

  // Gentle float
  const floatY = Math.sin((frame / 55) + bubble.id * 1.4) * 7;
  const floatX = Math.cos((frame / 75) + bubble.id * 0.9) * 4;

  // Label slides in 8 frames after bubble
  const labelProgress = spring({
    frame: frame - (delay + 8),
    fps,
    config: { damping: 20, stiffness: 160 },
  });
  const labelX = labelSide === "left"
    ? interpolate(labelProgress, [0, 1], [-30, 0])
    : interpolate(labelProgress, [0, 1], [30, 0]);

  const px = x * width;
  const py = y * height;

  return (
    <div style={{ position: "absolute", left: px, top: py }}>
      {/* Bubble */}
      <div style={{
        transform: `translate(-50%, -50%) scale(${scale}) translate(${floatX}px, ${floatY}px)`,
        width: size, height: size,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 20px 50px ${color}50, 0 8px 20px ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        zIndex: 20,
      }}>
        {/* White icon — swap SVG path per bubble.icon */}
        <BubbleIcon name={bubble.icon} size={size * 0.42} />
      </div>

      {/* Label */}
      <div style={{
        position: "absolute",
        top: "50%",
        ...(labelSide === "left"
          ? { right: size * 0.5 + 24, textAlign: "right" }
          : { left: size * 0.5 + 24, textAlign: "left" }
        ),
        transform: `translateY(-50%) translateX(${labelX}px)`,
        opacity: labelProgress,
        zIndex: 25,
        pointerEvents: "none",
      }}>
        <div style={{
          fontSize: Math.max(18, size * 0.155),
          fontWeight: 700,
          color: "#1e1b2e",
          fontFamily: "Inter, sans-serif",
          lineHeight: 1.2,
          maxWidth: 220,
          letterSpacing: "-0.02em",
        }}>
          {label}
        </div>
      </div>
    </div>
  );
};
```

---

## White Icon SVG (Inside Bubble)

Replace icon content per bubble type. Keep `fill="none" stroke="white"` for outline-style, or `fill="white"` for solid:

```tsx
const BubbleIcon = ({ name, size }) => {
  const s = size;
  const icons = {
    ai: (
      // Chip / AI circuit icon
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect x="8" y="8" width="8" height="8" rx="1" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.5" fill="white" />
        <path d="M8 10H5M8 14H5M16 10H19M16 14H19M10 8V5M14 8V5M10 16V19M14 16V19" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        {/* Nodes around center */}
        <circle cx="5" cy="10" r="1" fill="white" /><circle cx="5" cy="14" r="1" fill="white" />
        <circle cx="19" cy="10" r="1" fill="white" /><circle cx="19" cy="14" r="1" fill="white" />
        <circle cx="10" cy="5" r="1" fill="white" /><circle cx="14" cy="5" r="1" fill="white" />
        <circle cx="10" cy="19" r="1" fill="white" /><circle cx="14" cy="19" r="1" fill="white" />
      </svg>
    ),
    brain: (
      // Brain / NLP icon
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 4C9 4 7 6.5 7 9c0 1.5.6 2.8 1.5 3.7C7.6 13.6 7 15 7 16.5C7 19 9 21 12 21s5-2 5-4.5c0-1.5-.6-2.9-1.5-3.8C16.4 11.8 17 10.5 17 9c0-2.5-2-5-5-5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 9v5M10 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    chat: (
      // Chat bubbles / engagement icon
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M8 12H8.01M12 12H12.01M16 12H16.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 12c0 4.418-4.03 8-9 8a9.862 9.862 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    star: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    target: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2" fill="white" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    box: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[name] ?? icons.target;
};
```

---

## Partial Decorative Arc Accent

Draws a partial colored arc around one bubble — acts as a "selected" or "highlighted" indicator:

```tsx
// Arc highlights bubble at index ARC_BUBBLE_IDX, starts drawing at ARC_DELAY
const ARC_BUBBLE_IDX = 1; // which bubble to arc around
const ARC_DELAY = 40;
const ARC_FILL = 0.6;     // fraction of circle (0.6 = 216°)

const arcBubble = BUBBLES[ARC_BUBBLE_IDX];
const arcCX = arcBubble.x * width;
const arcCY = arcBubble.y * height;
const arcRadius = arcBubble.size * 0.62; // just outside the bubble edge
const arcCircumference = 2 * Math.PI * arcRadius;

const arcProgress = spring({
  frame: frame - ARC_DELAY,
  fps,
  config: { stiffness: 40, damping: 22 },
});
const arcDashOffset = interpolate(arcProgress, [0, 1], [arcCircumference, arcCircumference * (1 - ARC_FILL)]);

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 10 }}>
  <circle
    cx={arcCX}
    cy={arcCY}
    r={arcRadius}
    fill="none"
    stroke={BRAND.primary || "#7c3aed"}
    strokeWidth={3}
    strokeLinecap="round"
    strokeDasharray={arcCircumference}
    strokeDashoffset={arcDashOffset}
    transform={`rotate(-90 ${arcCX} ${arcCY})`}
    opacity={0.7}
  />
</svg>
```

---

## Scene Header — Animated Title Above Bubbles

Every icon bubble scene must have a strong headline that reveals before the bubbles pop in. This anchors the viewer:

```tsx
// Header reveals at frame 0–15
const headerProgress = spring({ frame, fps, config: { damping: 22, stiffness: 130 } });
const headerY = interpolate(headerProgress, [0, 1], [20, 0]);

<div style={{
  position: "absolute", top: 100, left: 0, right: 0,
  textAlign: "center",
  transform: `translateY(${headerY}px)`,
  opacity: Math.min(headerProgress * 1.5, 1),
  zIndex: 30,
}}>
  {/* Small uppercase category label */}
  <div style={{
    fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
    color: BRAND.primary, fontFamily: "Inter, sans-serif",
    textTransform: "uppercase", marginBottom: 12,
    opacity: 0.8,
  }}>
    What We Deliver
  </div>
  {/* Main headline */}
  <div style={{
    fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em",
    color: "#1a1a2e", fontFamily: "Inter, sans-serif",
    lineHeight: 1.1,
  }}>
    Built for{" "}
    <span style={{
      color: BRAND.primary,
      // Underline draw effect via backgroundImage
      backgroundImage: `linear-gradient(${BRAND.primary}, ${BRAND.primary})`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "0 100%",
      backgroundSize: `${interpolate(headerProgress, [0.6, 1], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}% 3px`,
      paddingBottom: 4,
    }}>
      Growth
    </span>
  </div>
</div>
```

---

## Upgraded Bubble Component — Inner Gradient + Glow Shadow

Replace flat-color bubbles with depth-layered ones that have inner radial gradient and a multi-layer shadow:

```tsx
<div style={{
  transform: `translate(-50%, -50%) scale(${scale}) translate(${floatX}px, ${floatY}px)`,
  width: size, height: size,
  borderRadius: "50%",
  // Inner gradient: lighter at top-left, saturated at bottom-right
  background: `radial-gradient(circle at 35% 30%, ${lightenHex(color, 0.25)} 0%, ${color} 55%, ${darkenHex(color, 0.15)} 100%)`,
  // 3-layer shadow: brand glow + mid ambient + tight drop
  boxShadow: `0 0 ${size * 0.6}px ${color}40, 0 ${size * 0.15}px ${size * 0.4}px ${color}25, 0 ${size * 0.05}px ${size * 0.12}px ${color}50`,
  display: "flex", alignItems: "center", justifyContent: "center",
  position: "relative", zIndex: 20,
}}>
  <BubbleIcon name={bubble.icon} size={size * 0.42} />

  {/* Sheen overlay — top-left highlight for realism */}
  <div style={{
    position: "absolute", inset: 0, borderRadius: "50%",
    background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.22) 0%, transparent 55%)",
    pointerEvents: "none",
  }} />
</div>
```

---

## Stat Badge on Bubble

Small dark pill overlaid at bottom-right of a bubble, showing a metric. Pops in 15 frames after the bubble:

```tsx
{/* Stat badge — bottom-right corner of bubble */}
{frame >= node.delay + 15 && (
  <div style={{
    position: "absolute",
    bottom: -8, right: -8,
    background: "rgba(10, 10, 20, 0.92)",
    border: `1.5px solid ${color}60`,
    borderRadius: 20,
    padding: "4px 10px",
    display: "flex", alignItems: "center", gap: 5,
    boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
    transform: `scale(${spring({ frame: frame - (node.delay + 15), fps, config: { stiffness: 200, damping: 14 } })})`,
    zIndex: 25,
  }}>
    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
    <span style={{ fontSize: 12, color: "#fff", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
      {/* e.g. "3× faster", "10+ tools", "24/7" */}
      {bubble.stat}
    </span>
  </div>
)}
```

Add `stat` to your BUBBLES data:
```tsx
{ id: 0, ..., stat: "10× faster" },
{ id: 1, ..., stat: "50+ tools" },
{ id: 2, ..., stat: "24/7 live" },
```

---

## Upgraded Label — Two-Line with Descriptor

Instead of a single label, use a headline + descriptor sub-line:

```tsx
<div style={{
  position: "absolute", top: "50%",
  ...(labelSide === "left" ? { right: size * 0.5 + 24, textAlign: "right" } : { left: size * 0.5 + 24, textAlign: "left" }),
  transform: `translateY(-50%) translateX(${labelX}px)`,
  opacity: labelProgress,
  zIndex: 25,
}}>
  {/* Primary label */}
  <div style={{
    fontSize: Math.max(20, size * 0.16),
    fontWeight: 800, color: "#1a1a2e",
    fontFamily: "Inter, sans-serif",
    lineHeight: 1.15, maxWidth: 230,
    letterSpacing: "-0.025em",
  }}>
    {bubble.label}
  </div>
  {/* Descriptor sub-line */}
  <div style={{
    fontSize: Math.max(13, size * 0.10),
    fontWeight: 400, color: "#6b7280",
    fontFamily: "Inter, sans-serif",
    marginTop: 5, maxWidth: 220,
    lineHeight: 1.4,
    opacity: interpolate(labelProgress, [0.4, 1], [0, 1], { extrapolateLeft: "clamp" }),
  }}>
    {bubble.desc}
  </div>
</div>
```

Add `desc` to your BUBBLES data:
```tsx
{ id: 0, label: "Agentic AI", desc: "Intelligent process automation" },
{ id: 1, label: "Custom Dev", desc: "Web, mobile & cloud solutions" },
{ id: 2, label: "Growth Marketing", desc: "SEO, PPC & social media" },
```

---

## Connecting Dot Trail Between Bubbles

A horizontal dotted line connects the three bubbles, drawing left-to-right after all bubbles are in:

```tsx
const CONNECT_DELAY = 55; // after all 3 bubbles have appeared
const connectProgress = spring({ frame: frame - CONNECT_DELAY, fps, config: { stiffness: 30, damping: 22 } });
const b0 = { x: BUBBLES[0].x * width, y: BUBBLES[0].y * height };
const b2 = { x: BUBBLES[2].x * width, y: BUBBLES[2].y * height };
const lineW = (b2.x - b0.x) * connectProgress;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", zIndex: 5 }}>
  <line
    x1={b0.x} y1={height * 0.48}
    x2={b0.x + lineW} y2={height * 0.48}
    stroke={BRAND.primary || "#7c3aed"}
    strokeWidth={2}
    strokeDasharray="0 10"
    strokeLinecap="round"
    opacity={0.35}
  />
</svg>
```

---

## Usage Notes

- Float phases (`bubble.id * 1.4`) ensure all bubbles are always out of sync with each other — never the same wave
- `labelSide: "left"` or `"right"` positions the text on the correct side of the bubble center. Use `"left"` for leftmost bubbles to avoid text going off-screen
- Label `maxWidth: 230` wraps long names like "Natural Language Processing" to two lines gracefully
- The arc `ARC_FILL = 0.6` leaves a 40% gap — this is more elegant than a full circle. The gap appears at the bottom (since arc starts at 12 o'clock via `rotate(-90)`)
- For the "use cases" variant (social_proof8 style): use 3 bubbles in a horizontal row at `y: 0.48`, equally spaced at `x: 0.22, 0.50, 0.78`, all same size (~145px), labels centered BELOW each bubble (`labelSide: "bottom"`)
- Pairs with `premium-multi-corner-gradient` or with this file's own pastel pink/lavender gradient for light-themed backgrounds
- **Always add the Scene Header** — a bare scene with just bubbles and no title looks unfinished
- **Always add stat badges** on at least 2 of the 3 bubbles — they add polish and information density
- Middle bubble should be ~15px larger than flanking bubbles to create visual hierarchy
- `lightenHex` / `darkenHex` can be approximated with color blending: for lighten, mix toward white; for darken, multiply channels by 0.85

---

## premium-icon-concept-scene

> Source: `src/skills/premium-icon-concept-scene.md`

---
title: Premium Icon Concept Scene
impact: HIGH
impactDescription: visualizes an abstract concept — a large white icon circle centered on a soft radial glow, with a dark badge at the bottom-right corner and a dotted SVG curved path that draws around the scene edge with a triangle arrowhead
tags: icon, concept, metaphor, radial glow, badge, dotted path, arrowhead, pretaa, b2b, abstract
---

## Icon Concept Scene Pattern

A single, oversized white icon circle is centered on the canvas. Behind it, a radial color glow (matching the concept — red for cost/time, green for growth, blue for data) creates depth. A dark coin/badge overlays the bottom-right of the icon circle. A dotted SVG curved path draws along the edges of the scene with a triangle arrowhead at its tip.

**Typical use case**: Problem scenes (showing "the cost of the problem"), solution scenes (showing "the benefit"), or any conceptual metaphor where the product concept is more important than the UI.

---

## Icon Circle with Radial Glow

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Icon entrance spring
const iconSpring = spring({ frame, fps, config: { stiffness: 120, damping: 14, mass: 1 } });
const iconScale = interpolate(iconSpring, [0, 1], [0.6, 1]);

// Glow pulse (slow breathe)
const glowScale = 1 + Math.sin(frame * 0.04) * 0.06;
const glowOpacity = 0.35 + Math.sin(frame * 0.05) * 0.08;

// Concept color — adapt to meaning
const CONCEPT_COLOR = "#ef4444"; // red = cost/time/risk; "#10b981" = growth; "#6366f1" = data/insight
const ICON_SIZE = 260;

<AbsoluteFill style={{ backgroundColor: "#f0f2f6" }}>
  {/* Corner blobs for context (from premium-multi-corner-gradient) */}
  <div style={{ position: "absolute", left: 0, bottom: 0, width: "65%", height: "70%",
    background: "radial-gradient(circle at 0% 100%, rgba(99,102,241,0.18) 0%, transparent 60%)" }} />
  <div style={{ position: "absolute", right: 0, top: 0, width: "60%", height: "65%",
    background: "radial-gradient(circle at 100% 0%, rgba(248,113,113,0.14) 0%, transparent 58%)" }} />

  {/* Radial glow behind icon */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    width: ICON_SIZE * 2.8,
    height: ICON_SIZE * 2.8,
    transform: `translate(-50%, -50%) scale(${glowScale})`,
    background: `radial-gradient(circle at 50% 50%, ${CONCEPT_COLOR}40 0%, ${CONCEPT_COLOR}18 35%, transparent 70%)`,
    opacity: glowOpacity,
    borderRadius: "50%",
  }} />

  {/* Icon circle */}
  <div style={{
    position: "absolute",
    left: "50%", top: "50%",
    transform: `translate(-50%, -50%) scale(${iconScale})`,
  }}>
    {/* White circle container */}
    <div style={{
      width: ICON_SIZE, height: ICON_SIZE,
      borderRadius: "50%",
      backgroundColor: "white",
      boxShadow: "0 40px 100px rgba(0,0,0,0.10), 0 16px 40px rgba(0,0,0,0.07)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      {/* SVG icon — replace with brand icon or conceptual icon */}
      <svg width={ICON_SIZE * 0.45} height={ICON_SIZE * 0.45} viewBox="0 0 24 24" fill="none">
        {/* Example: clock/time icon */}
        <circle cx="12" cy="12" r="10" stroke={CONCEPT_COLOR} strokeWidth="2" />
        <path d="M12 6v6l4 2" stroke={CONCEPT_COLOR} strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Dark badge — bottom-right corner of icon circle */}
      <BadgeCoin frame={frame} fps={fps} iconSize={ICON_SIZE} />
    </div>
  </div>
</AbsoluteFill>
```

---

## Dark Badge (Bottom-Right Corner)

A dark coin badge overlaid at the bottom-right of the icon circle, showing a number or metric:

```tsx
const BadgeCoin = ({ frame, fps, iconSize }) => {
  const BADGE_DELAY = 18;
  const badgeSpring = spring({
    frame: frame - BADGE_DELAY,
    fps,
    config: { stiffness: 200, damping: 12, mass: 0.7 },
  });
  const BADGE_SIZE = iconSize * 0.36;

  return (
    <div style={{
      position: "absolute",
      right: -BADGE_SIZE * 0.15,
      bottom: -BADGE_SIZE * 0.15,
      width: BADGE_SIZE, height: BADGE_SIZE,
      borderRadius: "50%",
      backgroundColor: "#1e293b",
      border: "4px solid white",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column",
      transform: `scale(${badgeSpring})`,
      transformOrigin: "center center",
    }}>
      <span style={{
        fontSize: BADGE_SIZE * 0.28,
        fontWeight: 800,
        color: "white",
        lineHeight: 1,
        fontFamily: "Inter, sans-serif",
      }}>
        $2.4M
      </span>
      <span style={{
        fontSize: BADGE_SIZE * 0.16,
        color: "rgba(255,255,255,0.6)",
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
        marginTop: 1,
      }}>
        wasted
      </span>
    </div>
  );
};
```

---

## Dotted SVG Curved Path with Triangle Arrowhead

A dotted path draws around the bottom + right edges of the scene, finishing with a triangle arrowhead pointing in the direction of travel:

```tsx
// Path: starts bottom-left, curves along bottom, up the right side
// Adjust control points to wrap around the scene perimeter
const PATH_D = `M ${width * 0.05} ${height * 0.92}
  Q ${width * 0.5} ${height * 1.02} ${width * 0.95} ${height * 0.75}
  T ${width * 0.95} ${height * 0.18}`;

const PATH_LENGTH = 1100; // approximate arc length in px

// Path draws in from frame 30
const pathProgress = spring({
  frame: frame - 30,
  fps,
  config: { stiffness: 28, damping: 18 },
});
const dashOffset = interpolate(pathProgress, [0, 1], [PATH_LENGTH, 0]);

// Arrowhead appears when path is nearly complete
const arrowOpacity = interpolate(pathProgress, [0.85, 1.0], [0, 1], { extrapolateRight: "clamp" });

// Arrowhead position: approximate the tip of the path (right side, upper area)
const ARROW_X = width * 0.95;
const ARROW_Y = height * 0.18;

<svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
  {/* Dotted path */}
  <path
    d={PATH_D}
    stroke="#94a3b8"
    strokeWidth={3}
    fill="none"
    strokeLinecap="round"
    strokeDasharray="0 18"   // 0px dot, 18px gap = spaced dots
    strokeDashoffset={dashOffset}
    opacity={0.5}
  />

  {/* Triangle arrowhead pointing upward */}
  <polygon
    points={`
      ${ARROW_X},${ARROW_Y - 14}
      ${ARROW_X - 9},${ARROW_Y + 6}
      ${ARROW_X + 9},${ARROW_Y + 6}
    `}
    fill="#94a3b8"
    opacity={arrowOpacity * 0.7}
  />
</svg>
```

---

## Concept Headline

A bold label below or above the icon circle:

```tsx
const headlineOpacity = interpolate(frame, [8, 28], [0, 1], { extrapolateRight: "clamp" });
const headlineY = interpolate(
  spring({ frame: frame - 8, fps }),
  [0, 1], [20, 0]
);

<div style={{
  position: "absolute",
  left: "50%",
  top: "72%",
  transform: `translate(-50%, 0) translateY(${headlineY}px)`,
  opacity: headlineOpacity,
  textAlign: "center",
  fontFamily: "Inter, sans-serif",
}}>
  <div style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
    The Real Cost of Inaction
  </div>
  <div style={{ fontSize: 20, color: "#64748b", fontWeight: 500, marginTop: 8 }}>
    Every missed signal is a missed renewal
  </div>
</div>
```

---

## Adapting the Icon SVG

Use any SVG icon that matches the concept:

- **Clock/time waste** → `circle + path "M12 6v6l4 2"` (clock hands)
- **Money/cost** → `circle + "$"` text or coin SVG
- **Growth** → upward arrow or plant SVG in `#10b981` green
- **Data/insight** → bar chart or magnifying glass in `#6366f1` indigo
- **Risk** → warning triangle in `#f59e0b` amber

The icon should use `CONCEPT_COLOR` as both stroke and/or fill. Keep it simple — single-path icons work best at this scale.

---

## Usage Notes

- `ICON_SIZE = 260` works for 1920x1080. For smaller canvases scale down proportionally.
- The glow `radial-gradient` uses the same concept color at low alpha — no `filter: blur()` needed
- The badge `transformOrigin: "center center"` combined with a fast spring creates a satisfying pop-in
- Dotted path: `strokeDasharray="0 18"` with `strokeLinecap="round"` is the polka-dot trick — adjust `18` for dot spacing
- The triangle arrowhead uses a CSS `<polygon>` — compute tip point by evaluating the SVG path at t=1.0 or hardcode an approximate endpoint
- Pairs naturally with `premium-multi-corner-gradient` as the background layer

---

## premium-in-app-chat

> Source: `src/skills/premium-in-app-chat.md`

# In-App Chat Panel

> Bordio-style team messaging overlay — slide-in chat thread with avatars, timestamps, typing indicators. For showcasing collaboration, customer support, or project management tools.

## When to Use
- Showcase scenes for products with built-in messaging/chat features
- Demonstrating team collaboration, customer support threads
- Project management tools with comment threads
- Any product where in-app communication is a key feature

## Components Available
- `InAppChatPanel` — pre-built in scope (slide-in panel with message thread)

## Usage Patterns

### Overlay Mode (Chat over existing UI)
```jsx
const SceneComponent = () => {
  return (
    <AbsoluteFill>
      {/* Existing product UI underneath */}
      <AppShell sidebar={...} topbar={...} brand={BRAND}>
        {/* Main content */}
      </AppShell>

      {/* Chat panel slides in from right at frame 40 */}
      <InAppChatPanel
        startFrame={40}
        brand={BRAND}
        side="right"
        overlay={true}
        messages={[
          { name: "Sarah K.", text: "Can you check the Q3 report?", avatar: "S" },
          { name: "Mike T.", text: "Sure, looking at it now. The metrics look good.", avatar: "M" },
          { name: "Sarah K.", text: "Great! Let me know if the revenue numbers match.", avatar: "S" },
          { name: "Mike T.", text: "", avatar: "M", isTyping: true },
        ]}
      />
    </AbsoluteFill>
  );
};
```

### Split View Mode (Chat alongside content)
```jsx
<AbsoluteFill style={{ display: "flex" }}>
  <div style={{ flex: 1 }}>
    {/* Main product view */}
  </div>
  <InAppChatPanel
    startFrame={20}
    brand={BRAND}
    side="right"
    overlay={false}
    messages={[...]}
  />
</AbsoluteFill>
```

## Message Design
- Each message has: avatar circle (28px, brand-colored bg), name (bold), text
- Messages stagger in with 10-frame delay between each
- Last message can be `isTyping: true` — shows animated 3-dot indicator
- Keep messages SHORT — 1-2 lines max per message
- Use 3-5 messages total — enough to show thread, not overwhelming

## Composition Rules

1. Panel slides in from the specified side (default: right)
2. Background dims (rgba 0,0,0,0.3) when overlay=true
3. Messages appear one by one with spring entrance
4. Always end with a typing indicator for "live" feeling
5. Use real-sounding short messages — not lorem ipsum
6. Avatar shows first letter of name with brand-colored background
7. Panel width is 35% of video width

## Scene Arc
```
Frames 0-30:   Show base product UI
Frames 30-40:  Chat panel slides in, backdrop dims
Frames 45-75:  Messages appear one by one (10f stagger)
Frames 80+:    Typing indicator pulses, panel stays visible
```

## Anti-Patterns
- Do NOT use more than 5 messages — panel gets cramped
- Do NOT use long messages — keep under 60 characters each
- Do NOT show chat without base UI underneath — needs context
- Do NOT use both overlay and split-view in the same scene

---

## premium-ink-logo-reveal

> Source: `src/skills/premium-ink-logo-reveal.md`

---
title: Premium Ink / Blob Logo Reveal
impact: HIGH
impactDescription: brand logo that forms from an organic paint-blob shape — the blob appears first, morphs into the brand icon via border-radius animation, then the wordmark slides in beside it; cinematic brand moment
tags: logo, brand, reveal, ink, blob, morph, brand-reveal, logo-reveal, paint, cinematic, intro
---

## Ink Logo Reveal Pattern

The brand mark "forms" out of an ink drop or paint blob. The blob starts soft and rounded, then transitions through border-radius morphing and scale to become the brand icon shape. The wordmark text springs in beside it after the icon settles. JustCall uses this to bridge their problem scene (just the blob) into the solution reveal (full logo).

---

## Core Animation Phases

| Phase | Frames | What Happens |
|---|---|---|
| **Blob** | 0–20 | Soft round blob appears via scale spring, slightly shifts position |
| **Morph** | 20–50 | `border-radius` morphs from round → brand icon shape; `clip-path` tightens |
| **Wordmark** | 40–70 | Brand name springs in from the right of the icon |
| **Hold** | 70+ | Settled logo; slight continuous breathing scale (1.0→1.01→1.0) |

---

## Full Component

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

export const InkLogoReveal = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phase 1: blob appears
  const blobProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: 30,
  });

  // Phase 2: morph into icon shape (linear interpolate, NOT spring — we want controlled timing)
  const MORPH_START = 20;
  const MORPH_DUR   = 30;
  const morphProgress = interpolate(
    frame,
    [MORPH_START, MORPH_START + MORPH_DUR],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Phase 3: wordmark entrance
  const WORD_START = 40;
  const wordProgress = spring({
    frame: frame - WORD_START,
    fps,
    config: { damping: 20, stiffness: 140 },
    durationInFrames: 22,
  });

  // Blob: starts very round (50% = circle), morphs to brand-icon shape
  // For a rounded-square brand icon: morph to ~28% border-radius
  // For a leaf/phone shape: morph to "55% 45% 55% 45% / 55% 45% 55% 45%"
  // Adjust the target border-radius to match your brand icon silhouette
  const blobBorderRadius = interpolate(morphProgress, [0, 1], [50, 30]); // % → square-ish

  // Blob color: starts as brand primary, stays as brand primary (the icon IS the blob)
  const blobScale  = interpolate(blobProgress, [0, 1], [0.4, 1]);
  const blobOpacity = interpolate(blobProgress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  // Icon size — the blob IS the brand icon
  const ICON_SIZE = Math.min(width, height) * 0.10; // 10% of shortest dimension

  // Wordmark slide + fade
  const wordX      = interpolate(wordProgress, [0, 1], [20, 0]);
  const wordOpacity = interpolate(wordProgress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Breathing (very subtle continuous scale after settle)
  const breathe = frame > 70
    ? 1 + Math.sin((frame - 70) / 40) * 0.008
    : 1;

  // Layout: icon + wordmark centered
  const centerX = width  / 2;
  const centerY = height / 2;

  return (
    <AbsoluteFill>
      {/* Combined logo lockup: icon + wordmark */}
      <div style={{
        position: "absolute",
        left:      centerX,
        top:       centerY,
        transform: `translate(-50%, -50%) scale(${breathe})`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        {/* Brand icon — the ink blob that morphs */}
        <div style={{
          width:  ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: `${blobBorderRadius}%`,
          background: BRAND.primary || "#2dd4bf",
          transform: `scale(${blobScale})`,
          opacity: blobOpacity,
          transformOrigin: "center center",
          // Optional: add a small white inner mark to indicate the icon's detail
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {/* Inner icon detail — replace with brand-specific SVG */}
          <div style={{
            width:  ICON_SIZE * 0.45,
            height: ICON_SIZE * 0.45,
            borderRadius: "50% 50% 50% 0",
            background: "rgba(0,0,0,0.25)",
            transform: "rotate(-45deg)",
          }} />
        </div>

        {/* Wordmark */}
        <div style={{
          opacity:   wordOpacity,
          transform: `translateX(${wordX}px)`,
          fontSize:  ICON_SIZE * 0.65,
          fontWeight: 800,
          color: "#1e2846",
          fontFamily: "Inter, sans-serif",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}>
          {BRAND.name || "Brand"}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

---

## Morphing Border-Radius Reference

The blob-to-icon transition is controlled by the `border-radius` values at `morphProgress = 1`. Common brand icon shapes:

| Shape | CSS border-radius at end |
|---|---|
| Circle (pill) | `"50%"` — stays circular |
| Rounded square | `"24%"` |
| Leaf / droplet | `"72% 28% 72% 28% / 28% 72% 28% 72%"` |
| Shield | `"50% 50% 20% 20%"` |
| Squircle | `"35%"` |

Apply via interpolating from the initial `50%` to your target value. For multi-value border-radius, switch from numeric interpolation to a direct `morphProgress > 0.5 ? targetShape : "50%"` snap at the midpoint.

---

## Two-Stage Reveal (Blob First, Then Logo)

For scenes where the blob appears alone first (like JustCall's problem scene), then the full logo reveals:

```tsx
// Stage 1: blob alone — problem_1 style
// Stage 2: full logo — problem_2 style
// Controlled by an overall scene timer

const STAGE_1_END   = 60; // hold the blob for 2s
const STAGE_2_START = 60; // then start morphing to logo

// Only begin morph phase when stage 2 starts
const morphProgress = interpolate(
  frame,
  [STAGE_2_START, STAGE_2_START + 30],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);

// Blob wanders slightly during Stage 1 (pre-logo idle)
const blobWanderX = frame < STAGE_1_END
  ? Math.sin(frame / 18) * 14
  : interpolate(frame, [STAGE_1_END, STAGE_2_START + 10], [Math.sin(STAGE_1_END / 18) * 14, 0], { extrapolateRight: "clamp" });
const blobWanderY = frame < STAGE_1_END
  ? Math.cos(frame / 22) * 10
  : interpolate(frame, [STAGE_1_END, STAGE_2_START + 10], [Math.cos(STAGE_1_END / 22) * 10, 0], { extrapolateRight: "clamp" });

// Apply to the icon div's transform:
// transform: `translate(${blobWanderX}px, ${blobWanderY}px) scale(${blobScale})`
```

---

## Underline Accent (Wordmark Decoration)

After the wordmark appears, optionally draw a thin colored underline beneath the brand name:

```tsx
const UNDERLINE_START = 60;
const underlineWidth = interpolate(
  frame,
  [UNDERLINE_START, UNDERLINE_START + 20],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);

// Render beneath the wordmark text:
<div style={{
  height: 2,
  width: `${underlineWidth * 100}%`,
  background: BRAND.primary || "#2dd4bf",
  borderRadius: 1,
  marginTop: 4,
  transformOrigin: "left center",
}} />
```

---

## When to Use

- Opening or transition scenes where you need to establish the brand identity dramatically
- Problem→Solution transitions: show the blob on the problem scene, reveal the full logo on the solution scene
- Any scene immediately before the CTA where you want a strong brand moment
- Combine with `premium-dot-matrix-bg` for the JustCall aesthetic
- **Do NOT** use for secondary logo appearances in the middle of UI demo scenes — keep those to simple fade-ins

---

## premium-integration-wall

> Source: `src/skills/premium-integration-wall.md`

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

---

## premium-interaction-sfx

> Source: `src/skills/premium-interaction-sfx.md`

---
title: Premium Interaction SFX (Audio-Visual Sync)
impact: HIGH
impactDescription: makes clicks and UI actions feel tactile by syncing sound effects to interaction frames
tags: sfx, audio, click, whoosh, tactile, sync, whatastory, sandwich
qualityBar: Every click lands with a soft UI “thud/click”, transitions have whooshes, and sounds are timed to motion (never early/late). SFX volume is subtle and consistent.
---

## What this skill does
It hard-codes the **relationship between motion and sound**. In agency videos, sound is “invisible animation glue”.

## Runtime primitive you MUST use
`SfxSequencer` is in scope and is designed for this:

```tsx
// Plays sounds for events at exact frames
<SfxSequencer events={INTERACTION_EVENTS} sfxUrls={SFX_URLS} />
```

## Cursor engine rule (mandatory)
If you have `CURSOR_STEPS` with click actions:
- Trigger a click SFX at **clickFrame + 1**
- Keep volume subtle (0.25–0.4)

### Canonical pattern

```tsx
const TRAVEL = 25;
const DWELL = 10;

// Example: click happens after arriving + dwell
const clickFrames = CURSOR_STEPS
  .filter((s) => s.action === "click" && typeof s.time === "number")
  .map((s) => s.time + TRAVEL + DWELL + 1);

const INTERACTION_EVENTS = clickFrames.map((f) => ({ frame: f, sfx: "click" }));

return (
  <AbsoluteFill>
    {/* visuals */}
    <SfxSequencer events={INTERACTION_EVENTS} sfxUrls={SFX_URLS} />
  </AbsoluteFill>
);
```

## Transition SFX rule (recommended)
- cameraPan / zoomThrough: add a subtle `whoosh` aligned to peak motion (mid-transition)
- shape morph flood-fill: add a `swoosh` 2–4 frames after the expansion starts

## Anti-patterns
- Loud SFX (volume > 0.5) — sounds should be felt, not heard.
- SFX without corresponding motion (fake UI).
- Using random internet SFX URLs ad-hoc; use `SFX_URLS` only so the system stays consistent.

---

## premium-interactive-ui

> Source: `src/skills/premium-interactive-ui.md`

---
title: Premium Interactive UI — Full App Reconstruction
impact: HIGH
impactDescription: builds a complete SaaS app shell from scratch (AppShell + SidebarNav + InputField + typing + dropdowns + panels) without needing screenshots — Bordio-quality scenes from zero assets
tags: appshell, sidebar, app reconstruction, full app, saas app, typing demo, task creation, interactive ui, no screenshot
---

## When to Use This Skill

Use `premium-interactive-ui` when:
- You want a **Bordio-quality interaction scene** but have **no screenshots** (or don't want to overlay them)
- You need **full layout control** — custom sidebar items, topbar, main content
- The scene shows **task creation, form filling, dashboard navigation, or any CRUD flow**

Use `premium-chameleon-ui` instead when the user uploaded screenshots and you want to overlay animations exactly on top of the real UI.

---

## New: Animated Component Suite (preferred for standard SaaS layouts)

For standard SaaS dashboards (sidebar + metric cards + charts + tables), use the **new animated components** instead of building everything from AppShell manually. These animate every element independently — sidebar items stagger in, cards count up, charts draw themselves.

### Use `ReconstructedAppShell` when `UI_SCHEMA` is available
```tsx
// UI_SCHEMA is injected from /api/ui-decompose when present
<ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
```

### Build manually with individual animated components
```tsx
return (
  <AbsoluteFill style={{ background: BRAND.bg || "#f8f9fc" }}>
    {/* Sidebar slides in first */}
    <AnimatedSidebar
      appName="Acme CRM"
      items={[
        { label: "Dashboard", icon: "📊", isActive: true },
        { label: "Contacts", icon: "👥", isActive: false },
        { label: "Deals", icon: "💼", isActive: false },
        { label: "Reports", icon: "📈", isActive: false },
      ]}
      brand={BRAND}
      startFrame={0}
    />

    {/* Main content area */}
    <div style={{ position: "absolute", left: 240, top: 0, right: 0, bottom: 0, padding: 32 }}>
      {/* Metric cards count up */}
      <AnimatedMetricCards
        cards={[
          { label: "Total Revenue", value: "$284K", numericValue: 284000, trend: "up", trendValue: "+18%" },
          { label: "Active Deals", value: "147", numericValue: 147, trend: "up", trendValue: "+12%" },
          { label: "Win Rate", value: "68%", numericValue: 68, trend: "neutral", trendValue: "stable" },
        ]}
        brand={BRAND}
        startFrame={25}
        columns={3}
      />

      {/* Chart draws itself */}
      <div style={{ marginTop: 24 }}>
        <AnimatedChart
          type="line"
          title="Revenue trend"
          dataPoints={[42, 58, 51, 73, 69, 84, 91, 88]}
          color={BRAND.primary}
          brand={BRAND}
          startFrame={40}
        />
      </div>

      {/* Table rows stagger in */}
      <div style={{ marginTop: 24 }}>
        <AnimatedTable
          columns={[
            { label: "Company", width: "wide" },
            { label: "Stage", width: "medium" },
            { label: "Value", width: "narrow" },
          ]}
          rows={[
            { cells: ["Acme Corp", "Proposal", "$48K"], isHighlighted: true },
            { cells: ["Beta Inc", "Discovery", "$32K"] },
            { cells: ["Gamma Ltd", "Negotiation", "$67K"] },
            { cells: ["Delta Co", "Closed Won", "$91K"] },
          ]}
          brand={BRAND}
          startFrame={55}
        />
      </div>
    </div>
  </AbsoluteFill>
);
```

**Global stagger timing**: sidebar f:0–30, topbar f:10–25, metric cards f:25–50, chart f:40–65, table f:55–80. This creates a satisfying sequential reveal where each layer arrives as the previous one settles.

**Use `AnimatedForm` for modal/form scenes:**
```tsx
<AnimatedForm
  title="Create New Deal"
  fields={[
    { label: "Deal Name", type: "text", value: "Acme Enterprise", placeholder: "Deal name" },
    { label: "Stage", type: "dropdown", options: ["Discovery", "Proposal", "Negotiation", "Closed Won"] },
    { label: "Value", type: "text", placeholder: "$0" },
    { label: "Close Date", type: "date", placeholder: "Select date" },
  ]}
  submitLabel="Create Deal"
  brand={BRAND}
  startFrame={20}
/>
```

---

## The 3-Component Stack

### AppShell — Full SaaS Layout Container

```tsx
<AppShell
  brand={BRAND}
  zoom={1.08}
  sidebar={<SidebarNav appName="Acme" items={NAV_ITEMS} activeItem="Projects" brand={BRAND} />}
  topbar={
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
      <span style={{ fontSize: 15, color: BRAND.text, fontWeight: 600, fontFamily: "Inter" }}>My Projects</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: BRAND.primary }} />
      </div>
    </div>
  }
>
  {/* main content goes here */}
</AppShell>
```

Props:
- `sidebar` — pass `<SidebarNav>` component
- `topbar` — any JSX, renders in the 52px top bar
- `children` — the main content area (flex: 1, position: relative)
- `zoom` — optional scale for cinematic push-in (1.0–1.12)
- `brand` — BRAND object

### SidebarNav — Dark Glass Sidebar (220px)

```tsx
const NAV_ITEMS = [
  { label: "Dashboard", icon: "⬛", badge: undefined },
  { label: "Projects",  icon: "📁", badge: 12 },
  { label: "Tasks",     icon: "✓",  badge: 3 },
  { label: "Reports",   icon: "📊" },
  { label: "Settings",  icon: "⚙️" },
];

<SidebarNav
  appName="Acme"
  items={NAV_ITEMS}
  activeItem="Projects"   // must match a label exactly
  brand={BRAND}
/>
```

- Active item gets brand-color left border + faint brand-color background
- `badge` shows a brand-color pill with number
- `icon` shows as an emoji prefix

### InputField — Styled Input with Typing Cursor

```tsx
const taskTitle = useTyping("Design new landing page", TYPING_START, fps);

<InputField
  value={taskTitle.displayText}
  placeholder="Task title..."
  label="Task Name"
  focused={frame >= TYPING_START && frame < TYPING_START + 80}
  brand={BRAND}
  width="100%"
/>
```

- Pass `useTyping().displayText` as `value`
- `focused={true}` shows brand-color ring + blinking cursor
- `label` renders as uppercase muted label above the field

---

## Interaction Hooks Reference

```tsx
// Typing — reveals text char by char
const { displayText, showCursor } = useTyping(
  "Design new landing page",  // full text
  45,                          // startFrame
  fps,                         // from useVideoConfig()
  10                           // chars per second (optional, default 10)
);

// Popup — spring open/close for dropdowns, modals, panels
const { scale, opacity, visible } = usePopup(
  90,   // openFrame
  180,  // closeFrame (optional — stays open if omitted)
);
// Use: transform: `scale(${scale})`, opacity

// Accordion — smooth height expand
const { height, opacity } = useAccordion(
  60,   // triggerFrame
  240,  // expandedHeight in px
);
// Use: height on a div with overflow:hidden

// Drag — animate an element from A to B
const { x, y, isDragging, elevation } = useDragItem(
  { x: 200, y: 400 },  // from (absolute px)
  { x: 800, y: 200 },  // to (absolute px)
  120,                  // startFrame
);
// Use: position:absolute + left:x + top:y + boxShadow:elevation
```

---

## Pre-Built Panel Components

### TaskDetailPanel — Slide-Over Panel (38% width, from right)

```tsx
<TaskDetailPanel
  openFrame={90}
  title="Design new landing page"
  fields={[
    { label: "Status",    value: "In Progress" },
    { label: "Assignee",  value: "Sarah Chen" },
    { label: "Due Date",  value: "March 15, 2026" },
    { label: "Priority",  value: "High" },
  ]}
  brand={BRAND}
/>
```

- Slides in from right via `translateX` spring
- Glass backdrop blur (`blur(24px)`) over main content
- Fields render as label/value pairs

### ModalOverlay — Centered Glass Modal

```tsx
<ModalOverlay
  openFrame={60}
  closeFrame={180}     // optional
  title="Create New Task"
  brand={BRAND}
/>
```

- Dark backdrop + centered glass card springs in
- `title` renders as 22px bold header inside

### DropdownMenu — Spring-In Context Menu

```tsx
<DropdownMenu
  x={0.62}            // 0–1 normalized position
  y={0.28}
  w={0.18}
  items={["In Progress", "Done", "Blocked", "On Hold"]}
  openFrame={120}
  closeFrame={195}
  brand={BRAND}
/>
```

- First item gets brand-color highlight (selected state)
- Glass card with staggered items

### ChatBubble — Message with Avatar Dot

```tsx
<ChatBubble message="LGTM! Shipping today" author="Sarah" color="#10b981" appearFrame={150} brand={BRAND} />
<ChatBubble message="Added to sprint board" author="You"   color={BRAND.primary}  appearFrame={170} brand={BRAND} />
```

- Springs in at `appearFrame` with `translateY(10px)` → 0
- Author initial in colored circle
- Stagger multiple bubbles by 15–20 frame intervals

---

## Frame Budget Template

A 150-frame (5s at 30fps) task creation scene:

```
f:0   → AppShell fades in (opacity 0→1 over 20 frames)
f:20  → SidebarNav + topbar visible; cursor enters frame
f:30  → Cursor moves to "+ New Task" button (CURSOR_STEPS step 1)
f:45  → ChameleonHighlight fires on button; ModalOverlay opens (openFrame:45)
f:60  → Cursor moves to title InputField (CURSOR_STEPS step 2)
f:70  → useTyping starts (TYPING_START = 70), InputField shows focused ring
f:110 → Cursor moves to Status dropdown (CURSOR_STEPS step 3)
f:120 → DropdownMenu opens (openFrame:120); cursor hovers "In Progress"
f:145 → DropdownMenu closes (closeFrame:145); TaskDetailPanel opens (openFrame:145)
f:150 → Scene holds — panel visible with fields
```

---

## Full Example — Task Creation Flow

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const TYPING_START = 70;
const taskTitle = useTyping("Design new landing page", TYPING_START, fps);

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⬛" },
  { label: "Projects",  icon: "📁", badge: 12 },
  { label: "Tasks",     icon: "✓",  badge: 3 },
];

const CURSOR_STEPS = [
  { time: 30, x: 0.78, y: 0.12, action: "click",  label: "+ New Task" },
  { time: 60, x: 0.38, y: 0.32, action: "click",  label: "Title input" },
  { time: 110,x: 0.62, y: 0.28, action: "click",  label: "Status" },
];

// shell fade in
const shellOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

return (
  <div style={{ position: "absolute", inset: 0, opacity: shellOpacity }}>
    <AppShell
      brand={BRAND}
      zoom={interpolate(frame, [0, 120], [1, 1.08], { extrapolateRight: "clamp" })}
      sidebar={<SidebarNav appName="Acme" items={NAV_ITEMS} activeItem="Projects" brand={BRAND} />}
      topbar={
        <span style={{ fontSize: 15, color: BRAND.text, fontWeight: 600, fontFamily: "Inter" }}>
          My Projects
        </span>
      }
    >
      {/* Main content — task list mock */}
      <div style={{ padding: 24 }}>
        <InputField
          value={taskTitle.displayText}
          placeholder="Task title..."
          label="Task Name"
          focused={frame >= TYPING_START && frame < TYPING_START + 80}
          brand={BRAND}
          width={380}
        />
        <ChatBubble message="Added to sprint" author="Sarah" color="#10b981" appearFrame={140} brand={BRAND} />
      </div>

      {/* Panels */}
      <ModalOverlay openFrame={45} closeFrame={145} title="Create New Task" brand={BRAND} />
      <TaskDetailPanel
        openFrame={145}
        title="Design new landing page"
        fields={[
          { label: "Status",   value: "In Progress" },
          { label: "Assignee", value: "Sarah Chen" },
          { label: "Due",      value: "March 15" },
        ]}
        brand={BRAND}
      />
    </AppShell>

    {/* Dropdown — outside AppShell so z-index is clean */}
    <DropdownMenu
      x={0.58} y={0.28} w={0.18}
      items={["In Progress", "Done", "Blocked"]}
      openFrame={120} closeFrame={145}
      brand={BRAND}
    />

    {/* Cursor stays at z=100, outside everything */}
    {/* ... cursor engine code here ... */}
  </div>
);
```

---

## Combination Rules

- **With cursor engine**: Always render cursor div OUTSIDE `<AppShell>` at `zIndex:100`
- **With CinematicCamera**: Wrap `<AppShell>` inside `<CinematicCamera>` but keep cursor outside
- **Zoom**: Use `AppShell zoom` prop for static push-in; use `CinematicCamera` for tracking zoom
- **No screenshots needed**: This skill works with zero `ATTACHED_IMAGES` — all UI is constructed
- **Dark brand**: Set `brand.bg` to dark value; `brand.surface` to `rgba(255,255,255,0.06)`
- **Light brand**: Set `brand.bg` to `#f8fafc`; `brand.surface` to `white`; sidebar will still be dark glass (correct — SidebarNav always dark)

---

## premium-isometric-space

> Source: `src/skills/premium-isometric-space.md`

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

---

## premium-kinetic-text

> Source: `src/skills/premium-kinetic-text.md`

---
title: Premium Kinetic Text & Brand Reveal
impact: HIGH
impactDescription: creates energetic word-by-word entrances, animated brand pills with glass effects, and flash transition overlays
tags: kinetic-text, typography, word-stagger, brand-pill, glassmorphism, flash-transition, headline, masked-reveal, section-label
qualityBar: Every headline uses MaskedReveal (not opacity fade). Every text scene has a Section Label above the headline. The 3-layer stack (label → headline → sub-line) fires at exactly 8f → 24f → 42f. Background is never flat color — use grid, arcs, or gradient orbs. Split layout (text left 40% / UI right 60%) for showcase scenes.
---

## Visual Blueprint
```text
HOOK / CTA (centered):              SHOWCASE (split layout):

  [Section Label — 13px]            [Section Label] | [UI screenshot / device]
  [HERO HEADLINE                ]   [Hero Headline ] |  rotateY(-8deg) tilt
  [96-128px MaskedReveal        ]   [Sub-line      ] |
  [Sub-line — 24px, muted       ]                    |
```

---

## 3-Layer Text Stack — Complete Scene Template

This is the canonical pattern. Every text-focused scene must use this. Copy it verbatim:

```tsx
export const TextScene = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // EXACT TIMING — snappy cascade
  const LABEL_DELAY    = 5;
  const HEADLINE_DELAY = 12;
  const SUBLINE_DELAY  = 22;

  // Scene entry/exit
  const sceneOpacity = frame < 15
    ? interpolate(frame, [0, 15], [0, 1])
    : frame > durationInFrames - 10
      ? interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0])
      : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", opacity: sceneOpacity }}>

      {/* Background — never flat color. Choose one: */}
      {/* Option A: ArcBg from scope (light arcs on dark bg) */}
      <ArcBg brand={BRAND} />
      {/* Option B: floating orbs (see Rotating Background Orbs section) */}
      {/* Option C: dot-matrix (use premium-dot-matrix-bg skill) */}

      {/* Entropy dust — always (18 particles OUTSIDE component) */}
      {ENTROPY_DUST.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: BRAND.primary,
          opacity: 0.08 + Math.sin(frame * p.freq + p.phase) * 0.03,
          transform: `translate(${Math.sin(frame * p.freq) * 6}px, ${Math.cos(frame * p.freq * 0.7) * 4}px)`,
          zIndex: 1,
        }} />
      ))}

      {/* Text stack — left-aligned for showcase, centered for hook/CTA */}
      <div style={{
        position: "absolute",
        left: "14%", top: "50%",       // use left:30% for centered
        transform: "translateY(-50%)",
        maxWidth: "42%",               // 42% = safe text column for split layout
        // For centered: maxWidth: "72%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center"
      }}>

        {/* Layer 1 — Section Label (MANDATORY, even on 90-frame scenes) */}
        {/* Also uses overflow:hidden masked reveal — not just opacity */}
        <div style={{ overflow: "hidden", marginBottom: 18 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: BRAND.primary,
            fontFamily: BRAND.font + ", sans-serif",
            transform: `translateY(${interpolate(
              spring({ frame: frame - LABEL_DELAY, fps, config: { stiffness: 140, damping: 16 } }),
              [0, 1], [100, 0]
            )}%)`,
            opacity: interpolate(frame, [LABEL_DELAY, LABEL_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            THE PROBLEM   {/* or: THE SOLUTION / RESULTS / INTRODUCING */}
          </div>
        </div>

        {/* Layer 2 — Hero Headline: PER-LINE masked reveal with micro-stagger */}
        {/* NEVER wrap the entire headline in one overflow:hidden — each line gets its own */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
          {["Your hours are", "gone."].map((line, i) => {
            const lineSpring = spring({
              frame: frame - (HEADLINE_DELAY + i * 4), // 4f stagger per line
              fps,
              config: { stiffness: 120, damping: 18 },
            });
            return (
              <div key={i} style={{ overflow: "hidden", paddingBottom: 4 /* prevents descender clipping */ }}>
                <div style={{
                  fontSize: 108,
                  fontWeight: 900,
                  lineHeight: 1.0,
                  letterSpacing: "-0.04em",
                  color: i === 1 ? BRAND.primary : (BRAND.text || "#f8fafc"), // accent on last line
                  fontFamily: BRAND.font + ", sans-serif",
                  transform: `translateY(${interpolate(lineSpring, [0, 1], [100, 0])}%)`,
                }}>
                  {line}
                </div>
              </div>
            );
          })}
        </div>

        {/* Layer 3 — Sub-line (also overflow:hidden) */}
        <div style={{ overflow: "hidden" }}>
          <div style={{
            fontSize: 24,
            fontWeight: 400,
            lineHeight: 1.5,
            color: BRAND.textMuted || "rgba(255,255,255,0.55)",
            maxWidth: 480,
            transform: `translateY(${interpolate(
              spring({ frame: frame - SUBLINE_DELAY, fps, config: { stiffness: 120, damping: 18 } }),
              [0, 1], [100, 0]
            )}%)`,
            opacity: interpolate(frame, [SUBLINE_DELAY, SUBLINE_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            The average team wastes 11 hours a week on manual reporting.
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// Entropy dust — DEFINE OUTSIDE COMPONENT (stable seeds, no flicker)
const ENTROPY_DUST = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100,
  size: 3 + (i % 4),
  freq: 0.008 + i * 0.003,
  phase: i * 0.7,
}));
```

---

## Typography Exact Values

| Element | fontSize | fontWeight | lineHeight | letterSpacing |
|---|---|---|---|---|
| **Hero headline** | 96–128px | 900 | 1.0 | -0.04em |
| **Scene title** | 72–88px | 800 | 1.05 | -0.03em |
| **Section label** | 12–14px | 600–700 | 1.0 | 0.18em |
| **Sub-line** | 22–28px | 400 | 1.5 | 0 |
| **Badge / pill** | 13–16px | 600 | 1.0 | 0.04em |

**Violation:** `fontSize < 80px` for the primary headline = it's body text, not a headline.

---

## Headline Styles

### MaskedReveal (DEFAULT — all hero headlines)
MaskedReveal uses `overflow: hidden` + `translateY` to wipe text in from an invisible floor. Apply **per line**, not to the whole block:
```tsx
// Per-line masked reveal — correct pattern:
{["Done in seconds,", "not in hours."].map((line, i) => {
  const s = spring({ frame: frame - (12 + i * 4), fps, config: { stiffness: 120, damping: 18 } });
  return (
    <div key={i} style={{ overflow: "hidden", paddingBottom: 4 }}>
      <div style={{
        fontSize: 96, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.0,
        transform: `translateY(${interpolate(s, [0, 1], [100, 0])}%)`,
      }}>
        {line}
      </div>
    </div>
  );
})}
```

### Word Highlight Variant
Accent ONE word with brand color + subtle scale pulse:
```tsx
{["Done in", "seconds,", "not hours."].map((word, i) => {
  const isAccent = i === 1; // "seconds" gets brand color
  return (
    <span key={i} style={{
      color: isAccent ? BRAND.primary : (BRAND.text || "#f8fafc"),
      display: "inline-block",
      marginRight: "0.25em",
    }}>
      {word}
    </span>
  );
})}
// Use this INSIDE a per-line overflow:hidden container
```

### Word-by-Word Spring Pop (hooks / high-energy scenes only)
Only use for 2–4 word punchlines on HOOK scenes, not for full sentences:
```tsx
const words = ["Stop.", "Losing.", "Deals."];
const STAGGER = 4;

{words.map((word, i) => {
  const delay = i * STAGGER;
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200 } });
  return (
    <div key={i} style={{ overflow: "hidden", display: "inline-block", marginRight: "0.2em" }}>
      <span style={{
        display: "inline-block",
        fontSize: 128, fontWeight: 900,
        letterSpacing: "-0.04em", lineHeight: 1.0,
        color: BRAND.text,
        fontFamily: BRAND.font + ", sans-serif",
        transform: `translateY(${interpolate(s, [0, 1], [100, 0])}%)`,
      }}>
        {word}
      </span>
    </div>
  );
})}
```

Note: Wrap each word in `overflow: hidden` to create a reveal (wipe-up), not a pop. Skip the rotation — it looks cheap.

### Multi-Line Headline Handling
For headlines > 1 line, reveal each line separately:
```tsx
const LINES = ["You're losing", "deals every week"];

{LINES.map((line, i) => (
  <div key={i} style={{ overflow: "hidden" }}>
    <MaskedReveal startFrame={HEADLINE_DELAY + i * 14} durationInFrames={18}>
      <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: BRAND.text }}>
        {line}
      </div>
    </MaskedReveal>
  </div>
))}
```

---

## Split Layout (Showcase / Solution Scenes)

Text left 40% / UI right 60% — mandatory for showcase scenes:

```tsx
{/* Left 40%: text stack */}
<div style={{
  position: "absolute",
  left: "8%", top: "50%", transform: "translateY(-50%)",
  width: "33%",
}}>
  {/* 3-layer text stack (see above) */}
</div>

{/* Right 60%: UI in a tilted glass frame */}
<div style={{
  position: "absolute",
  right: "4%", top: "10%",
  width: "52%", height: "80%",
  borderRadius: 16, overflow: "hidden",
  transform: "rotateY(-8deg) rotateX(2deg)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 25px 50px -12px rgba(0,0,0,0.50)",
  opacity: interpolate(frame, [HEADLINE_DELAY, HEADLINE_DELAY + 20], [0, 1], { extrapolateRight: "clamp" }),
}}>
  <CinematicCamera targetX={0.5} targetY={0.45} zoomTo={1.04}>
    {ATTACHED_IMAGES[0] && (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    )}
  </CinematicCamera>
</div>
```

---

## Brand Pill (Hook / CTA entry card)

White glass pill with logo, brand name, and animated light sweep:

```tsx
const PILL_DELAY = 20;
const pillSpring = spring({ frame: frame - PILL_DELAY, fps, config: { stiffness: 150, damping: 14 } });

<div style={{
  opacity: interpolate(frame, [PILL_DELAY, PILL_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }),
  transform: `translateY(${interpolate(pillSpring, [0, 1], [50, 0])}px) scale(${pillSpring})`,
}}>
  <div style={{
    position: "relative",
    display: "inline-flex", alignItems: "center", gap: 20,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 20px 60px rgba(100,116,139,0.25)",
    padding: "20px 48px", borderRadius: 9999,
    border: "1px solid rgba(255,255,255,0.6)",
    overflow: "hidden",
  }}>
    {/* Flash sweep */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
      transform: `translateX(${interpolate(frame, [PILL_DELAY, PILL_DELAY + 40], [-200, 200])}%) skewX(12deg)`,
      pointerEvents: "none",
    }} />
    {/* Brand icon */}
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary || BRAND.primary})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: 24, color: "white", flexShrink: 0, position: "relative", zIndex: 10,
    }}>
      {(BRAND.name || "B")[0].toUpperCase()}
    </div>
    {/* Text */}
    <div style={{ position: "relative", zIndex: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.primary, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
        Introducing
      </div>
      <div style={{ fontSize: 36, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "Inter, sans-serif" }}>
        {BRAND.name || "BrandName"}
      </div>
    </div>
  </div>
</div>
```

---

## PersistentSectionLabel (in scope)

Renders a persistent section label that stays visible for multiple scenes — use for chapter-like transitions:

```tsx
// Shows from startFrame, fades at exitFrame
<PersistentSectionLabel
  text="THE SOLUTION"
  brand={BRAND}
  startFrame={0}
  exitFrame={durationInFrames - 10}
/>
```

Rules: `position: absolute, top: 48, left: "14%"`, `zIndex: 20`. For centered scenes: `left: "50%", transform: "translateX(-50%)"`.

---

## Background Recipes for Text Scenes

Never use a flat color. Always choose one:

### Gradient Orbs (dark theme — default)
```tsx
{[
  { top: "-20%", left: "-10%", color: BRAND.primary, size: 600, opacity: 0.18 },
  { bottom: "-10%", right: "-5%", color: BRAND.secondary || "#3b82f6", size: 500, opacity: 0.15 },
].map((orb, i) => (
  <div key={i} style={{
    position: "absolute", ...orb,
    width: orb.size, height: orb.size, borderRadius: "50%",
    background: orb.color,
    filter: "blur(100px)", opacity: orb.opacity,
    transform: `translate(${Math.sin(frame * 0.02 + i) * 40}px, ${Math.cos(frame * 0.02 + i) * 30}px)`,
  }} />
))}
```

### ArcBg from Scope (light-arc lines)
```tsx
<ArcBg brand={BRAND} />
```

### Grid Background
```tsx
<div style={{
  position: "absolute", inset: 0,
  backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
  backgroundSize: "60px 60px",
  zIndex: 0,
}} />
```

---

## Accent Animations

### Underline Accent Draw
```tsx
const UNDERLINE_START = HEADLINE_DELAY + 18;
const underlineW = interpolate(frame, [UNDERLINE_START, UNDERLINE_START + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

<div style={{ height: 3, width: `${underlineW * 100}%`, background: BRAND.primary, borderRadius: 2, marginTop: 8, transformOrigin: "left center" }} />
```
Start after the last word of the headline lands: `UNDERLINE_START = HEADLINE_DELAY + 18`.

### Rotating Bold Word in Tagline
```tsx
const WORDS = ["Support", "Business", "Sales", "Growth"];
const INTERVAL = 40;
const wordIdx = Math.floor(frame / INTERVAL) % WORDS.length;
const swapP = spring({ frame: frame % INTERVAL, fps, config: { damping: 20, stiffness: 200 }, durationInFrames: 12 });

<span style={{ fontWeight: 800, color: BRAND.primary, display: "inline-block",
  transform: `translateY(${interpolate(swapP, [0, 1], [20, 0])}px)`,
  opacity: interpolate(swapP, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }) }}>
  {WORDS[wordIdx]}
</span>
```

### Flash Transition Overlay
```tsx
{/* White flash (scene entry) */}
<div style={{ position: "absolute", inset: 0, background: "white", opacity: interpolate(frame, [0, 10], [1, 0], { extrapolateRight: "clamp" }), zIndex: 9999, pointerEvents: "none" }} />
```

### Spinning Starburst Accent
```tsx
<div style={{ position: "absolute", top: "25%", right: "15%", opacity: 0.7, zIndex: 2 }}>
  <svg width="60" height="60" viewBox="0 0 40 40"
    style={{ transform: `rotate(${frame * 2}deg) scale(${spring({ frame: frame - 10, fps })})` }}>
    <path d="M20 0L23 17L40 20L23 23L20 40L17 23L0 20L17 17L20 0" fill={BRAND.primary} />
  </svg>
</div>
```

---

## Light / Dark Theme Colors

| Element | Dark theme | Light theme |
|---|---|---|
| **Headline** | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) — never pure `#000` |
| **Sub-line** | `#94a3b8` (Slate 400) | `#64748b` (Slate 500) |
| **Section label** | `BRAND.primary` | `BRAND.primary` |
| **BG** | `#0f172a` or gradient orbs | `#f8fafc` or arc lines |

---

## Short Scene Handling (< 90 frames)

For scenes 60–90 frames, compress timing: `LABEL_DELAY=4, HEADLINE_DELAY=12, SUBLINE_DELAY=24`. Skip sub-line if < 60 frames.

---

## Anti-Patterns
- **NEVER use `opacity` alone to reveal a headline** — always `overflow:hidden` + `translateY(100%→0%)`. Using `MaskedReveal` from scope is fine but apply it per-line, not to the whole block.
- **NEVER wrap a multi-line headline in a single `overflow:hidden`** — each line needs its own wrapper or the lower lines will be clipped
- **NEVER skip the section label** — even a 60-frame scene gets "INTRODUCING" or "RESULTS"
- **NEVER use `letterSpacing: 0` on headlines** — minimum -0.02em, preferred -0.04em
- **NEVER use `fontSize < 80px` for the primary headline** — that's body text
- **NEVER center-align text in showcase scenes** — left-align for split layouts
- **NEVER accent more than one word per headline** with brand color
- **NEVER use flat solid color background on text scenes** — use orbs, arcs, or grid
- **NEVER use word-rotation-pop stagger on full sentences** — only on 2–4 word punchlines; full sentences use MaskedReveal

## Quality Checklist
- [ ] Section label (13px, uppercase, 0.18em tracking, brand color) appears first at f:8
- [ ] Hero headline uses `MaskedReveal`, not opacity fade, at f:24
- [ ] Headline is 96–128px, `fontWeight: 900`, `letterSpacing: -0.04em`, `lineHeight: 1.0`
- [ ] Sub-line is 22–28px, `fontWeight: 400`, muted color, at f:42
- [ ] Only ONE word accented with brand color in headline
- [ ] Background uses orbs/arcs/grid — never flat color
- [ ] Entropy dust (18 particles defined OUTSIDE component, zIndex:1)
- [ ] Scene fades in over first 15 frames, out over last 10
- [ ] Showcase scenes use split layout (text left 40% / UI right 60%, `rotateY(-8deg)` tilt)
- [ ] Centered layout only for hook and CTA scenes

---

## premium-light-arc-bg

> Source: `src/skills/premium-light-arc-bg.md`

# premium-light-arc-bg

## When to Use
Use as the base background layer for ALL light-themed B2B SaaS videos. This creates the subtle texture that differentiates premium agency work from flat backgrounds.

Apply when: BRAND.style === "light" or BRAND.bg is near-white (#f8f9fc, #f0f2f8, #ffffff, etc.)

## What It Looks Like
- Near-white base background (#f8f9fc)
- 6–8 concentric arc lines (partial SVG circles) radiating from an off-center origin
- Soft pastel radial-gradient blobs bleeding from corners at 5–8% opacity
- Subtle slow rotation over scene duration for living motion

## Implementation

```tsx
const LightArcBg = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const ARC_COUNT = 8;
  const ORIGIN = { x: width * 0.3, y: height * 0.6 };

  const arcs = Array.from({ length: ARC_COUNT }, (_, i) => ({
    radius: 180 + i * 130,
    opacity: Math.max(0, 0.04 - i * 0.003),
    dashArray: `${55 + i * 18} ${180 + i * 36}`,
    dashOffset: i * 40,
  }));

  const rotation = frame * 0.05; // 0.05 deg/frame = ~1.5 deg/s at 30fps

  return (
    <AbsoluteFill style={{ background: BRAND.bg || "#f8f9fc" }}>
      {/* Corner gradient blobs */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse at 0% 100%, rgba(99,102,241,0.07) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, rgba(236,72,153,0.05) 0%, transparent 45%),
          radial-gradient(ellipse at 100% 100%, rgba(239,68,68,0.04) 0%, transparent 40%)
        `
      }} />

      {/* Concentric arc lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={ORIGIN.x}
            cy={ORIGIN.y}
            r={arc.radius}
            fill="none"
            stroke={`rgba(0,0,0,${arc.opacity.toFixed(3)})`}
            strokeWidth={1}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            transform={`rotate(${rotation + i * 5}, ${ORIGIN.x}, ${ORIGIN.y})`}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
```

## Usage Pattern

Place as the first child of AbsoluteFill, before all other content:

```tsx
return (
  <AbsoluteFill>
    <LightArcBg />
    {/* All scene content above */}
    <div style={{ position: "absolute", inset: 0, padding: 80 }}>
      {/* Your scene content */}
    </div>
  </AbsoluteFill>
);
```

## Corner Blob Colors

Adapt the corner blob colors to the brand:
- Indigo/purple brand: `rgba(99,102,241,0.07)` BL, `rgba(139,92,246,0.05)` TR
- Teal/green brand: `rgba(20,184,166,0.07)` BL, `rgba(16,185,129,0.05)` TR
- Blue brand: `rgba(59,130,246,0.07)` BL, `rgba(14,165,233,0.05)` TR
- Orange brand: `rgba(249,115,22,0.07)` BL, `rgba(234,179,8,0.05)` TR

## Visual Rules for Light Theme Scenes

When using this background, all content above must follow light-theme rules:
- Cards: white background, `boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04)"` (medium elevation)
- Text: `color: "#0f172a"` for headlines, `color: "rgba(15,23,42,0.5)"` for subtext
- Borders: `border: "1px solid rgba(0,0,0,0.08)"`
- NO glass backdrop-filter on light bg — use solid white cards instead

---

## premium-light-textured-bg

> Source: `src/skills/premium-light-textured-bg.md`

# premium-light-textured-bg

## When to Use
Use for ALL scenes in light-themed SaaS explainer videos. The background should be consistent across the entire video using GLOBAL_BG.

## Component
LightArcBg is in scope. Always place as the FIRST child of AbsoluteFill:
```tsx
<AbsoluteFill>
  <LightArcBg brand={BRAND} variant={GLOBAL_BG || "arcs"} />
  {/* rest of scene content */}
</AbsoluteFill>
```

## Variants
- `"arcs"` — lavender-white with concentric arc lines at 3% opacity. Best for modern/purple brands.
- `"grid"` — #f5f5f5 with cross-hatch lines at 2% opacity. Best for enterprise/green brands.
- `"dots"` — dot matrix at 3% opacity. Best for minimal/clean brands.

## GLOBAL_BG
The `GLOBAL_BG` variable is injected into scope automatically. It contains the background variant chosen by the planner ("arcs" | "grid" | "dots"). Always pass it to LightArcBg so all scenes are consistent.

## Rules
- ALWAYS use the same variant across all scenes in a video (use GLOBAL_BG)
- Do NOT try to create custom backgrounds inline — use LightArcBg
- Do NOT use MeshGradientBg for light-themed videos — it's for dark themes
- Do NOT use a plain white background — the subtle texture creates depth
- When BRAND.style === "light", this MUST be the first element in every scene

---

## premium-live-action-composite

> Source: `src/skills/premium-live-action-composite.md`

---
title: Premium Live-Action Composite
impact: HIGH
impactDescription: real environment photo/video background with floating UI elements composited over it — the Viable/WhatAStory "product in the real world" look; 3D-tracked UI panels, floating metric cards, and TiltWrapper perspective matching make digital elements feel grounded in physical space
tags: live-action, real photo, compositing, floating UI, ken burns, environment, viable, whatastory, product-in-context, depth
---

## Live-Action Composite Pattern

A real environment photo (office desk, hands on keyboard, team meeting, product context) fills the frame. Digital UI elements — metric cards, feature panels, notification toasts — float over the photo as if composited into the scene. TiltWrapper is used to match the perspective of surfaces visible in the photo (monitor, desk, table).

This is the "Viable" video look: live-action footage of a real workspace with isometric/flat UI panels floating around the human actor. It transforms a standard SaaS explainer into something that feels premium and grounded.

**When to use**: showcase or hook scenes where one or more attached images show a real environment (desk, office, hands at keyboard). The product UI floats into that world as if overlaid on the actual shot.

---

## Core Component: `<VideoPlateMockup>`

Pre-built in compiler scope. Use instead of `<LightArcBg>` when ATTACHED_IMAGES contains an environment photo.

```tsx
// Basic usage — env photo with floating UI card:
<VideoPlateMockup src={ATTACHED_IMAGES[0]} darkOverlay={0.3}>
  {/* UI elements float over the plate */}
</VideoPlateMockup>
```

Props:
- `src` — image URL (typically `ATTACHED_IMAGES[0]`)
- `kenBurns` — slow zoom push-in (default true, scale 1.0→1.04 over 90 frames)
- `kenBurnsScale` — max zoom (default 1.04; use 1.08 for more dramatic push-in)
- `darkOverlay` — 0–1 darkness overlay for UI contrast (0.25–0.40 typical)
- `vignetteStrength` — 0–1 radial dark edge vignette (default 0.5)
- `children` — UI elements to composite over the plate

---

## Full Composite Scene (env photo + floating metric cards)

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Card entrance stagger
const card1Progress = spring({ frame: frame - 20, fps, config: SPRING_CONFIGS.snap });
const card2Progress = spring({ frame: frame - 32, fps, config: SPRING_CONFIGS.snap });
const card3Progress = spring({ frame: frame - 44, fps, config: SPRING_CONFIGS.snap });

return (
  <AbsoluteFill>
    <VideoPlateMockup src={ATTACHED_IMAGES[0]} darkOverlay={0.32} kenBurnsScale={1.06}>

      {/* Floating metric card — top right, slight tilt matching desk perspective */}
      <div style={{
        position: "absolute", top: "12%", right: "6%",
        opacity: card1Progress,
        transform: `translateY(${(1 - card1Progress) * 20}px)`,
      }}>
        <TiltWrapper tiltX={-2.5} tiltY={3}>
          <div style={{
            background: "white", borderRadius: 16, padding: "20px 24px",
            boxShadow: GLOBAL_STYLE.shadowHigh, minWidth: 220,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(15,23,42,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Response time
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: BRAND.text, letterSpacing: "-0.03em" }}>2.4s</div>
            <div style={{ fontSize: 13, color: "#10b981", fontWeight: 500, marginTop: 4 }}>↓ 68% faster</div>
          </div>
        </TiltWrapper>
      </div>

      {/* Floating notification toast — top left */}
      <NotificationToast
        icon="✅"
        title="Deal closed"
        body="Acme Corp · $48,000"
        brand={BRAND}
        startFrame={38}
        duration={80}
      />

      {/* Centered headline over the plate */}
      <div style={{
        position: "absolute", bottom: "18%", left: 80, right: 80,
        textAlign: "center",
      }}>
        <MaskedReveal startFrame={18}>
          <div style={{
            fontSize: 88, fontWeight: 900, letterSpacing: "-0.04em",
            color: "white",
            textShadow: "0 2px 20px rgba(0,0,0,0.6), 0 4px 40px rgba(0,0,0,0.4)",
            lineHeight: 1.05,
          }}>
            {BRAND.name} in the wild.
          </div>
        </MaskedReveal>
      </div>
    </VideoPlateMockup>
  </AbsoluteFill>
);
```

---

## Monitor Composite (UI tracked to a screen in the photo)

Use this when ATTACHED_IMAGES[0] contains a visible monitor or device screen. The product UI is positioned and tilted to sit INSIDE the monitor's perspective.

```tsx
// Monitor is positioned roughly: center-left, angled ~15° right
// Adjust top/left/width to match where the monitor appears in the photo
const MONITOR_SLOT = {
  top: "18%", left: "28%",
  width: "42%",    // monitor screen width as % of frame
  aspectRatio: "16/10",
  // Tilt to match monitor's perspective in the photo (adjust to your photo)
  tiltX: -2, tiltY: 8,
};

return (
  <AbsoluteFill>
    <VideoPlateMockup src={ATTACHED_IMAGES[0]} darkOverlay={0.15} kenBurns={false}>

      {/* Product UI composited into the monitor screen */}
      <div style={{
        position: "absolute",
        top: MONITOR_SLOT.top,
        left: MONITOR_SLOT.left,
        width: MONITOR_SLOT.width,
        aspectRatio: MONITOR_SLOT.aspectRatio,
        overflow: "hidden",
        borderRadius: 4,
      }}>
        <TiltWrapper tiltX={MONITOR_SLOT.tiltX} tiltY={MONITOR_SLOT.tiltY} perspective={1200}>
          {/* ATTACHED_IMAGES[1] = product UI screenshot */}
          {ATTACHED_IMAGES[1] && (
            <img
              src={ATTACHED_IMAGES[1]}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          )}
        </TiltWrapper>
      </div>

      {/* Floating annotation card beside the monitor */}
      <div style={{
        position: "absolute", top: "22%", right: "8%",
        opacity: spring({ frame: frame - 25, fps, config: SPRING_CONFIGS.snap }),
      }}>
        <TiltWrapper tiltX={-1} tiltY={-2}>
          <div style={{
            background: "white", borderRadius: 14, padding: "16px 20px",
            boxShadow: GLOBAL_STYLE.shadowHigh, maxWidth: 200,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.primary }}>Live sync</div>
            <div style={{ fontSize: 12, color: "rgba(15,23,42,0.6)", marginTop: 4 }}>
              Updates in real time across all devices
            </div>
          </div>
        </TiltWrapper>
      </div>
    </VideoPlateMockup>
  </AbsoluteFill>
);
```

---

## Key Rules

1. **Always use `darkOverlay` 0.25–0.40** — white UI cards need contrast against real-world photos
2. **TiltWrapper is mandatory** on floating UI cards — matches the physical perspective of the environment
3. **Use `GLOBAL_STYLE.shadowHigh`** on all floating cards — they need deep shadow to lift off the photo
4. **MaskedReveal for any headline text** — text over photos needs the premium slide-up entrance
5. **Ken Burns on by default** — the slow zoom gives life to a static photo and prevents the "freeze frame" look
6. **Vignette is automatic** — `VideoPlateMockup` adds a radial vignette; don't add a second one manually
7. **Only use this skill when ATTACHED_IMAGES[0] contains an environment/context photo** — not a product screenshot

## Agency upgrade: Isometric living UI over footage

If you’re compositing a full dashboard (ReconstructedAppShell/AppShell) over the plate, wrap that UI in `IsometricWrapper` so it feels like it exists in the environment:

```tsx
<VideoPlateMockup src={ATTACHED_IMAGES[0]} darkOverlay={0.3}>
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <IsometricWrapper lift={12} shadowOpacity={0.35}>
      <ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
    </IsometricWrapper>
  </div>
  {/* Cursor stays OUTSIDE the wrapper */}
</VideoPlateMockup>
```

---

## premium-logo-wall

> Source: `src/skills/premium-logo-wall.md`

---
title: Premium Logo Wall
impact: HIGH
impactDescription: trusted-by / partner logos in an animated grid or infinite marquee — social proof through brand recognition
tags: logo-wall, trusted-by, social-proof, logos, marquee, brand-logos, partners, customers, grid
---

## When to Use

"Trusted by 500+ companies" social proof scenes. Shows logos of well-known customers or integration partners. Different from `premium-integration-wall` (which shows scattered app icon cards on a colored bg) — Logo Wall is a clean, structured layout of company logos.

Use for:
- Social proof / testimonial intro scene
- "Joins the network of..." brand trust moment
- Partner ecosystem showcases

---

## Grid Variant (6–12 logos)

Logos in a 3×2 or 4×3 responsive grid, each springing in with stagger:

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

const LOGOS = [
  { name: "Salesforce", color: "#00A1E0" },
  { name: "HubSpot",    color: "#FF7A59" },
  { name: "Zendesk",    color: "#03363D" },
  { name: "Notion",     color: "#000000" },
  { name: "Slack",      color: "#4A154B" },
  { name: "Linear",     color: "#5E6AD2" },
  { name: "Figma",      color: "#F24E1E" },
  { name: "Stripe",     color: "#635BFF" },
];

const COLS = 4;
const CARD_W = Math.round(width * 0.18);
const CARD_H = Math.round(CARD_W * 0.55);
const GAP = Math.round(width * 0.025);

const isLight = BRAND.style === "light";

<AbsoluteFill style={{ backgroundColor: BRAND.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48 }}>

  {/* Headline */}
  <div style={{
    fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
    color: BRAND.textMuted, fontFamily: BRAND.font ?? "Inter, sans-serif",
    opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
  }}>
    Trusted by teams at
  </div>

  {/* Logo grid */}
  <div style={{
    display: "grid",
    gridTemplateColumns: `repeat(${COLS}, ${CARD_W}px)`,
    gap: GAP,
  }}>
    {LOGOS.map((logo, i) => {
      const delay = i * 4;
      const s = spring({ frame: frame - delay - 10, fps, config: { damping: 14, stiffness: 120 } });
      return (
        <div key={i} style={{
          width: CARD_W, height: CARD_H,
          background: isLight
            ? "rgba(255,255,255,0.9)"
            : "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 12,
          boxShadow: isLight
            ? "0 4px 20px rgba(0,0,0,0.06)"
            : "0 8px 32px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          opacity: interpolate(frame, [delay + 10, delay + 18], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
        }}>
          {/* Colored initial as logo placeholder */}
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: logo.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
            fontFamily: BRAND.font ?? "Inter, sans-serif",
          }}>
            {logo.name[0]}
          </div>
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: isLight ? "rgba(15,23,42,0.7)" : "rgba(255,255,255,0.7)",
            fontFamily: BRAND.font ?? "Inter, sans-serif",
            letterSpacing: "-0.01em",
          }}>
            {logo.name}
          </span>
        </div>
      );
    })}
  </div>

  {/* Optional stat below */}
  <div style={{
    fontSize: 18, fontWeight: 500, color: BRAND.textMuted,
    fontFamily: BRAND.font ?? "Inter, sans-serif",
    opacity: interpolate(frame, [LOGOS.length * 4 + 20, LOGOS.length * 4 + 35], [0, 1], { extrapolateRight: "clamp" }),
  }}>
    and <span style={{ color: BRAND.primary, fontWeight: 700 }}>500+ more</span> fast-growing teams
  </div>

</AbsoluteFill>
```

---

## Infinite Marquee Variant (many logos)

Horizontally scrolling ticker — great for 12+ logos:

```tsx
// Define LOGOS outside component (stable):
const MARQUEE_LOGOS = [
  { name: "Salesforce", color: "#00A1E0" },
  { name: "HubSpot",    color: "#FF7A59" },
  // ... more logos
];
// Duplicate for seamless loop:
const ALL_LOGOS = [...MARQUEE_LOGOS, ...MARQUEE_LOGOS];

// Inside component:
const LOGO_W = 140;
const LOGO_GAP = 24;
const TOTAL_W = MARQUEE_LOGOS.length * (LOGO_W + LOGO_GAP);
const scrollX = ((frame * 1.5) % TOTAL_W);

<div style={{ overflow: "hidden", width: "100%", position: "relative" }}>
  {/* Fade masks on edges */}
  <div style={{
    position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2,
    background: `linear-gradient(90deg, ${BRAND.bg}, transparent)`,
  }} />
  <div style={{
    position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2,
    background: `linear-gradient(-90deg, ${BRAND.bg}, transparent)`,
  }} />

  <div style={{
    display: "flex", gap: LOGO_GAP, alignItems: "center",
    transform: `translateX(-${scrollX}px)`,
    willChange: "transform",
  }}>
    {ALL_LOGOS.map((logo, i) => (
      <div key={i} style={{
        minWidth: LOGO_W, height: 52,
        background: BRAND.style === "light" ? "white" : "rgba(255,255,255,0.06)",
        border: `1px solid ${BRAND.border}`,
        borderRadius: 10, display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: logo.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color: "#fff",
          fontFamily: BRAND.font ?? "Inter",
        }}>
          {logo.name[0]}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.text, fontFamily: BRAND.font ?? "Inter" }}>
          {logo.name}
        </span>
      </div>
    ))}
  </div>
</div>
```

---

## Layout Tips

- Grid variant: 3 or 4 columns, centered. Don't use 5+ columns — logos become too small.
- Stagger: `delay = i * 4` with `spring` entrance — do NOT animate all at once
- Card height: `~55% of card width` looks best
- For ATTACHED_IMAGES: if user provides a real logo PNG, use `<img src={ATTACHED_IMAGES[i]} />` instead of the initial placeholder

---

## premium-macro-closeup

> Source: `src/skills/premium-macro-closeup.md`

---
title: Premium Macro Close-Up
impact: CRITICAL
impactDescription: Bordio-style extreme 3-5x zoom into specific UI sections with radial depth-of-field blur. The single biggest visual differentiator between amateur and agency-produced videos.
tags: macro, zoom, closeup, dof, blur, selective-focus, camera, bordio, showcase, deep-dive
qualityBar: The scene zooms 3-5x into a specific UI region with easeOutExpo snap, holds with subtle drift while surrounding UI blurs out via SelectiveFocus DOF, then whips back out. Cursor layers stay outside the zoom wrapper. Max 2 macro moments per video.
---

## Scene Purpose

The "Deep Dive" moment. Zooms the viewer into a specific UI section — sidebar item, data row, button group, settings panel — to create the feeling of being inside the product. WhatAStory's Bordio and Viable videos use this 2-3 times per video for maximum visual impact.

## Visual Blueprint

```text
[   Full UI (1x) — viewer sees entire dashboard                    ]
[                                                                   ]
[   ┌──────────┬──────────────────────────────┐                    ]
[   │ Sidebar  │  Main Content Area           │                    ]
[   │ ────── ◄─┼─── focusPoint (0.15, 0.45)  │                    ]
[   │  Teams   │  ┌─────────────────────┐     │                    ]
[   │  Projects│  │   Task Table        │     │                    ]
[   │  Settings│  └─────────────────────┘     │                    ]
[   └──────────┴──────────────────────────────┘                    ]
[                                                                   ]
[   === SNAP ZOOM (25f easeOutExpo) ===                            ]
[                                                                   ]
[   ┌──────────────────────────┐  ← 3x zoom, blurred edges        ]
[   │                          │                                    ]
[   │  ◉ Marketing Campaign    │  ← sharp focus circle (r=0.3)    ]
[   │  ◉ Product Roadmap       │                                    ]
[   │  ◉ Sprint Planning       │                                    ]
[   │                     blur │                                    ]
[   └──────────────────────────┘                                    ]
[                                                                   ]
[   Hand cursor clicks "Marketing Campaign" during hold phase       ]
[                                                                   ]
[   === WHIP ZOOM-OUT (25f easeInExpo) ===                         ]
[   Back to full UI view                                            ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill, Img } from "remotion";

export const MacroCloseupScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // === TIMING ===
  const ZOOM_START = 30;    // frames before zoom begins (let UI settle first)
  const HOLD_FRAMES = 80;   // frames at max zoom (viewer reads the focused area)
  const ZOOM_DURATION = 25; // snap-in and whip-out speed

  // === FOCUS TARGET ===
  // Where to zoom into (normalized 0-1). Example: sidebar area
  const FOCUS = { x: 0.15, y: 0.45 };

  return (
    <AbsoluteFill>
      {/* MacroCamera wraps SelectiveFocus wraps UI content */}
      <MacroCamera
        zoomLevel={3.5}
        focusPoint={FOCUS}
        zoomInFrame={ZOOM_START}
        holdFrames={HOLD_FRAMES}
        zoomDuration={ZOOM_DURATION}
      >
        <SelectiveFocus
          focusX={FOCUS.x}
          focusY={FOCUS.y}
          focusRadius={0.3}
          blurAmount={10}
          active={frame >= ZOOM_START && frame < ZOOM_START + ZOOM_DURATION + HOLD_FRAMES + ZOOM_DURATION}
        >
          {/* Full product UI screenshot */}
          <AbsoluteFill>
            <Img src={ATTACHED_IMAGES[0]} style={{
              width: '100%', height: '100%', objectFit: 'cover',
            }} />
          </AbsoluteFill>
        </SelectiveFocus>
      </MacroCamera>

      {/* Cursor OUTSIDE zoom wrapper — stays at screen scale */}
      {/* <CursorRenderer ... /> */}
    </AbsoluteFill>
  );
};
```

---

## Three Macro Patterns

### Pattern A: Sidebar Deep-Dive (Bordio-style)
Focus on sidebar navigation to highlight project/team structure.
```
focusPoint: { x: 0.12, y: 0.45 }   // left sidebar center
zoomLevel: 3.5                       // tight on sidebar items
focusRadius: 0.25                    // narrow focus circle
blurAmount: 10                       // strong DOF
```

### Pattern B: Data Table Macro (Bordio-style)
Zoom into a specific table row to highlight a task or data entry.
```
focusPoint: { x: 0.55, y: 0.5 }     // center-right main content
zoomLevel: 3.0                       // moderate zoom
focusRadius: 0.35                    // wider focus to show row context
blurAmount: 8                        // moderate DOF
```

### Pattern C: Single Element Isolation (Viable-style)
Extreme close-up on a button, input, or metric card.
```
focusPoint: { x: 0.7, y: 0.3 }      // target element position
zoomLevel: 4.5                       // extreme isolation
focusRadius: 0.2                     // tight circle
blurAmount: 14                       // heavy DOF
```

---

## Composition Rules

1. **MacroCamera OUTSIDE, SelectiveFocus INSIDE**: `<MacroCamera><SelectiveFocus>...</SelectiveFocus></MacroCamera>`
2. **Cursor layers ALWAYS outside both wrappers** — they must stay at screen scale
3. **Max 2 macro zoom moments per video** — overuse kills the effect
4. **Let UI settle before zooming** — zoomInFrame should be 20-40f after scene start so the viewer orients to the full layout first
5. **Hold phase is the payoff** — holdFrames should be 60-100f (2-3 seconds) so the viewer has time to absorb the focused content
6. **Match SelectiveFocus to MacroCamera focus** — focusX/focusY and focusPoint.x/y should be identical
7. **SelectiveFocus active timing** — activate DOF only during the zoom phases, not the full scene

## When to Use

- **Complex dashboards** with multiple panels (zoom into the relevant one)
- **Sidebar navigation** highlighting project structure or team hierarchy
- **Data tables** drawing attention to a specific row or metric
- **Settings panels** showing configuration details
- **Any UI with 3+ sections** where you need to direct viewer attention

## When NOT to Use

- Simple single-panel UIs (no need to zoom when there's only one thing to see)
- CTA/outro scenes (these need full-frame brand presence)
- Problem/frustration scenes (macro zoom implies precision, not chaos)

## Checklist

- [ ] focusPoint matches the interactive element the cursor will click
- [ ] SelectiveFocus focusX/focusY matches MacroCamera focusPoint
- [ ] Cursor layers are OUTSIDE both wrappers
- [ ] zoomInFrame > 20 (UI has time to settle)
- [ ] holdFrames >= 60 (viewer has time to read)
- [ ] No more than 2 MacroCamera uses in the full video
- [ ] SelectiveFocus active prop toggles off after zoom-out completes

---

## premium-match-cut

> Source: `src/skills/premium-match-cut.md`

---
title: Premium Match-Cut Transitions & Motion Blur
impact: HIGH
impactDescription: cinematic match cuts (zoom-into-button becomes next scene's background) and simulated motion blur for fast pans — the transition techniques that make cuts feel intentional and expensive
tags: match-cut, transition, zoom, cinematic, motion-blur, wipe, color-match, scene-change, camera-cut
---

## Match-Cut Transition Overview

A match cut: Scene A zooms infinitely into a UI button → the button's color fills the frame → Scene B opens from that color. No crossfade — the geometry connects the two scenes.

**Implementation in a multi-scene `<Sequence>` setup:**
Each scene is its own component. The cut is handled by:
1. Scene A zooms to `scale(40)` at its end — the button fills the frame
2. A color-fill overlay fades over the last few frames
3. Scene B's background is the same color — it starts at `scale(40)` and springs back to `scale(1)`

---

## Scene A — Zoom-Into-Button Exit

```tsx
// Scene A receives a `durationInFrames` prop from the Sequence
// The match-cut begins in the last 30 frames

const frame = useCurrentFrame();
const { fps, durationInFrames } = useVideoConfig();

const CUT_START = durationInFrames - 30;  // last 30 frames

// Exponential zoom into the button
const zoomProgress = interpolate(
  frame,
  [CUT_START, durationInFrames],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t * t }
);
const matchScale = interpolate(zoomProgress, [0, 1], [1, 40]);
const matchX = interpolate(zoomProgress, [0, 1], [0, -buttonCenterX]);  // pan to button center
const matchY = interpolate(zoomProgress, [0, 1], [0, -buttonCenterY]);

// Color overlay — fills the frame with the button's color
const overlayOpacity = interpolate(zoomProgress, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Scene A button center coords (set these to match your layout)
const buttonCenterX = 0;   // offset from screen center in px
const buttonCenterY = 80;  // button is below center
const MATCH_COLOR = "#6366f1";  // the button's brand color
```

```tsx
<AbsoluteFill style={{ overflow: "hidden" }}>
  {/* All Scene A content — scaled and panned together */}
  <div style={{
    width: "100%", height: "100%",
    transform: `scale(${matchScale}) translate(${matchX}px, ${matchY}px)`,
    transformOrigin: "center center",
  }}>
    {/* ... Scene A content ... */}

    {/* The target button */}
    <div style={{
      position: "absolute",
      bottom: "18%", left: "50%",
      transform: "translateX(-50%)",
      background: MATCH_COLOR,
      color: "white",
      fontFamily: "Inter, sans-serif",
      fontSize: 18, fontWeight: 700,
      padding: "16px 40px", borderRadius: 100,
    }}>
      Get Started Free
    </div>
  </div>

  {/* Color fill overlay — last layer */}
  <div style={{
    position: "absolute", inset: 0,
    background: MATCH_COLOR,
    opacity: overlayOpacity,
    pointerEvents: "none",
  }} />
</AbsoluteFill>
```

---

## Scene B — Zoom-Out Entry (same color)

```tsx
// Scene B starts with the same color and zooms out to reveal content
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const MATCH_COLOR = "#6366f1";  // must match Scene A

// Spring zoom-out: starts at scale 40, springs back to 1
const zoomOutSpring = spring({
  frame,
  fps,
  config: { damping: 28, stiffness: 60 },  // slower spring = more cinematic
});
const entryScale = interpolate(zoomOutSpring, [0, 1], [12, 1]);

// Color overlay fades out as the scene reveals
const bgFadeOut = interpolate(frame, [0, 25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
```

```tsx
<AbsoluteFill style={{ overflow: "hidden" }}>
  {/* Scene B background — same color as match cut */}
  <div style={{ position: "absolute", inset: 0, background: MATCH_COLOR }} />

  {/* Content zooms in from scale 12 */}
  <div style={{
    position: "absolute", inset: 0,
    transform: `scale(${entryScale})`,
    transformOrigin: "center center",
  }}>
    {/* ... Scene B content ... */}
  </div>

  {/* Color overlay fades out to reveal content */}
  <div style={{
    position: "absolute", inset: 0,
    background: MATCH_COLOR,
    opacity: bgFadeOut,
    pointerEvents: "none",
  }} />
</AbsoluteFill>
```

---

## Simulated Motion Blur

For fast camera pans, cursor dashes, or whip-transitions. CSS `filter: blur()` applied only during the fast phase:

```tsx
// Horizontal whip pan — blur peaks at maximum speed
const panProgress = interpolate(
  frame,
  [0, 15, 30],
  [0, 0.5, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);

// Blur is highest at mid-point (fastest speed)
const speedCurve = Math.sin(panProgress * Math.PI);  // 0 → 1 → 0
const motionBlur = speedCurve * 12;  // max 12px horizontal blur

// Pan distance
const panX = interpolate(panProgress, [0, 1], [0, -width * 0.6]);
```

```tsx
<div style={{
  position: "absolute", inset: 0,
  transform: `translateX(${panX}px)`,
  filter: `blur(${motionBlur}px)`,
  // Directional blur illusion: stretch slightly on horizontal pan
  transform: `translateX(${panX}px) scaleX(${1 + speedCurve * 0.04})`,
}}>
  {/* Scene content being panned */}
</div>
```

### Cursor Motion Blur Trail

For the cursor darting between click targets — add a fading duplicate:

```tsx
// Current cursor position (from spring interpolation)
const cursorX = /* current X */;
const cursorY = /* current Y */;

// Trail: previous position with opacity + blur
const trailOpacity = interpolate(speedCurve, [0, 1], [0, 0.35]);
const trailBlur = speedCurve * 6;
```

```tsx
{/* Trail ghost — renders at previous position */}
{trailOpacity > 0.01 && (
  <div style={{
    position: "absolute",
    left: prevCursorX,
    top: prevCursorY,
    width: 28, height: 28,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.4)",
    opacity: trailOpacity,
    filter: `blur(${trailBlur}px)`,
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  }} />
)}

{/* Actual cursor */}
<div style={{
  position: "absolute",
  left: cursorX, top: cursorY,
  transform: "translate(-50%, -50%)",
  // ...cursor SVG/circle...
}} />
```

---

## Whip-Cut Transition (fast + blur)

One scene whips out left, next whips in from right — no crossfade needed:

```tsx
// In the master sequence controller
// Scene A: whips out left
const whipOut = interpolate(
  frame,
  [durationA - 12, durationA],
  [0, -width * 1.2],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => t * t }
);
const whipOutBlur = interpolate(frame, [durationA - 12, durationA - 4], [0, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Scene B: whips in from right
const whipIn = interpolate(
  frame,
  [0, 14],
  [width * 1.2, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1-t, 3) }
);
const whipInBlur = interpolate(frame, [0, 10], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
```

---

## Key Rules

- **Match color must be identical** — the `MATCH_COLOR` hex in Scene A and Scene B must match exactly
- **Button center offsets**: calculate `buttonCenterX/Y` as the pixel offset from screen center where the button is, then negate for the pan
- **Scene B spring config `damping: 28`**: slower than standard springs (damping 14–18) — the cinematic "breathing room" after a hard cut
- **Motion blur cap at 18px**: beyond 18px blur looks like a rendering error, not intentional motion
- **Whip cuts need 12–14 frames**: slower and the motion is too visible as a slide; faster and it reads as a flash
- **In `<Sequence>` setups**: each scene is isolated — match-cut logic lives entirely at the end of Scene A's component and beginning of Scene B's

---

## premium-metric-flyout

> Source: `src/skills/premium-metric-flyout.md`

---
title: Premium Metric Flyout
impact: HIGH
impactDescription: hero metric at 280px scale in center + 3-4 satellite stat pills flying in from screen edges; radial glow behind central number; constellation of data proof
tags: metric, stats, flyout, satellite-stats, roi, data-proof, big-number, supporting-stats, constellation, kpi, impact, proof, numbers, multi-stat
---

## When to Use

Use when your scene is anchored on ONE impressive metric (e.g. "94%", "$2.4M", "3×") and you have 3–4 supporting stats that reinforce it. The hero number dominates; the satellites orbit to add credibility.

Use for:
- Dedicated "proof of impact" scene after the problem statement
- Before/after ROI reveal with supporting evidence
- Any B2B product with quantifiable outcomes

Use **premium-stat-counter** instead when:
- You have only 1 stat and no supporting data
- The scene is 90 frames or less (metric-flyout needs ~120+ frames to land)

Use **premium-data-reveal** instead when:
- All stats are equally weighted (no clear hero number)

---

## Core Pattern

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// --- CONFIG ---
const HERO_VALUE  = 94;           // Final hero number
const HERO_SUFFIX = "%";          // "%", "×", "K+", "M"
const HERO_LABEL  = "faster time-to-close";
const TARGET_VALUE = 94;          // same as HERO_VALUE for count-up

// Supporting satellite stats
const SATELLITE_STATS = [
  { value: "3×",    label: "more pipeline",    side: "left"   },
  { value: "$2.4M", label: "avg annual ROI",   side: "right"  },
  { value: "18s",   label: "avg response time", side: "top"   },
  { value: "99%",   label: "customer retention", side: "bottom" },
];

// --- HERO COUNT-UP ---
const heroProgress = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
});
const displayValue = Math.round(TARGET_VALUE * heroProgress);

// --- GLOW PULSE ---
const glowScale = interpolate(
  spring({ frame: Math.max(0, frame - 20), fps, config: SPRING_CONFIGS.entrance }),
  [0, 1], [0.8, 1.0], { extrapolateRight: "clamp" }
);

// --- HERO ENTRANCE ---
const heroSpring = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 100 } });
const heroScale  = interpolate(heroSpring, [0, 1], [0.7, 1.0], { extrapolateRight: "clamp" });

// --- FINAL HERO PUNCH (last frames) ---
const punchProgress = interpolate(frame, [80, 90, 100], [1.0, 1.04, 1.0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Satellite float
const float = Math.sin(frame * 0.04) * 3;

// Satellite positions (% of width/height, from top-left)
const SATELLITE_POSITIONS = {
  left:   { x: "18%",  y: "50%" },
  right:  { x: "82%",  y: "50%" },
  top:    { x: "72%",  y: "25%" },
  bottom: { x: "28%",  y: "75%" },
};

// Satellite animation (fly in from edges, staggered by 12 frames)
const SATELLITE_OFFSETS = { left: -200, right: 200, top: -150, bottom: 150 };
const SATELLITE_AXES    = { left: "X",  right: "X",  top: "Y",   bottom: "Y"  };

<AbsoluteFill style={{
  backgroundColor: BRAND.bg,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexDirection: "column",
}}>

  {/* Background radial glow behind hero number */}
  <div style={{
    position: "absolute",
    width: 480, height: 480, borderRadius: "50%",
    background: `radial-gradient(circle, ${BRAND.primary}1a 0%, transparent 65%)`,
    top: "50%", left: "50%",
    transform: `translate(-50%, -50%) scale(${glowScale})`,
    pointerEvents: "none",
  }} />

  {/* SVG arc ring drawing around glow area */}
  <svg
    style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
    width={340} height={340} viewBox="0 0 340 340"
  >
    <circle
      cx={170} cy={170} r={160}
      fill="none"
      stroke={`${BRAND.primary}33`}
      strokeWidth={1.5}
      strokeDasharray={`${2 * Math.PI * 160} ${2 * Math.PI * 160}`}
      strokeDashoffset={interpolate(
        frame, [30, 75], [2 * Math.PI * 160, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )}
      strokeLinecap="round"
      transform="rotate(-90 170 170)"
    />
  </svg>

  {/* HERO NUMBER */}
  <div style={{
    display: "flex", alignItems: "baseline", gap: 4,
    transform: `scale(${heroScale * punchProgress})`,
    opacity: interpolate(frame, [5, 18], [0, 1], { extrapolateRight: "clamp" }),
  }}>
    <span style={{
      fontSize: TARGET_VALUE.toString().length <= 2 ? 280 : TARGET_VALUE.toString().length <= 4 ? 220 : 160,
      fontWeight: 900,
      letterSpacing: "-0.05em",
      lineHeight: 0.9,
      fontFamily: BRAND.font ?? "Inter, sans-serif",
      fontVariantNumeric: "tabular-nums",
      background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary ?? BRAND.primary} 100%)`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    }}>
      {displayValue}
    </span>
    <span style={{
      fontSize: 90,
      fontWeight: 800,
      color: BRAND.primary,
      fontFamily: BRAND.font ?? "Inter, sans-serif",
      opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
    }}>
      {HERO_SUFFIX}
    </span>
  </div>

  {/* Hero label below number */}
  <div style={{
    fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em",
    color: BRAND.textMuted,
    fontFamily: BRAND.font ?? "Inter, sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginTop: 16,
    opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(frame, [30, 45], [12, 0], { extrapolateRight: "clamp" })}px)`,
  }}>
    {HERO_LABEL}
  </div>

  {/* SATELLITE STATS */}
  {SATELLITE_STATS.map((stat, i) => {
    const enterFrame = 40 + i * 12;
    const p = spring({ frame: Math.max(0, frame - enterFrame), fps, config: SPRING_CONFIGS.entrance });
    const axis = SATELLITE_AXES[stat.side as keyof typeof SATELLITE_AXES];
    const offset = SATELLITE_OFFSETS[stat.side as keyof typeof SATELLITE_OFFSETS];
    const translate = interpolate(p, [0, 1], [offset, 0], { extrapolateRight: "clamp" });
    const opacity = interpolate(frame, [enterFrame, enterFrame + 10], [0, 1], { extrapolateRight: "clamp" });
    const pos = SATELLITE_POSITIONS[stat.side as keyof typeof SATELLITE_POSITIONS];
    const floatOffset = Math.sin((frame + i * 30) * 0.04) * 3;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: pos.x, top: pos.y,
          transform: `translate(-50%, -50%) translate${axis}(${translate}px) translateY(${floatOffset}px)`,
          opacity,
        }}
      >
        {/* Stat card */}
        <div style={{
          background: BRAND.style === "dark"
            ? "rgba(255,255,255,0.08)"
            : "white",
          backdropFilter: BRAND.style === "dark" ? "blur(12px)" : undefined,
          border: `1px solid ${BRAND.border ?? "rgba(0,0,0,0.08)"}`,
          borderRadius: 16,
          padding: "16px 24px",
          textAlign: "center",
          boxShadow: BRAND.style === "dark"
            ? "0 4px 24px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          minWidth: 120,
        }}>
          <div style={{
            fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em",
            color: BRAND.text,
            fontFamily: BRAND.font ?? "Inter, sans-serif",
            fontVariantNumeric: "tabular-nums",
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: 13, color: BRAND.textMuted, marginTop: 4,
            fontFamily: BRAND.font ?? "Inter, sans-serif",
          }}>
            {stat.label}
          </div>
        </div>
      </div>
    );
  })}

</AbsoluteFill>
```

---

## Hero Metric Sizing

| Stat length | fontSize |
|---|---|
| 1–2 chars (94%, 3×) | 280px |
| 3–4 chars ($2.4M, 10K+) | 220px |
| 5+ chars ($24.8M) | 160px |

Always use `fontVariantNumeric: "tabular-nums"` to prevent layout shift during count-up.

---

## Currency / Decimal Count-Up

```tsx
// For $2.4M:
const displayFormatted = `$${(2.4 * heroProgress).toFixed(1)}M`;

// For 10K+:
const displayFormatted = `${Math.round(10 * heroProgress)}K+`;

// For multiples (3×):
// Skip count-up — just reveal at f:30 with scale spring; multipliers don't read well when counting up from 0
```

---

## Satellite Positions Layout

```
                    [TOP stat]
                      72%, 25%

[LEFT stat]      [HERO NUMBER]      [RIGHT stat]
  18%, 50%                             82%, 50%

  [BOTTOM stat]
    28%, 75%
```

---

## Pairing Rules

- Pair with **premium-ambient-environment** as base layer for extra depth on dark themes
- Follow with **premium-cta-scene** for a strong close if this is the last proof scene
- Works well AFTER **premium-team-orbit** or **premium-floating-path-nodes** (problem → proof)
- Use **premium-stat-counter** instead for scenes under 90 frames (single stat, no satellites)

---

## premium-multi-corner-gradient

> Source: `src/skills/premium-multi-corner-gradient.md`

---
title: Premium Multi-Corner Gradient Background
impact: MEDIUM
impactDescription: creates a soft, airy pastel background with colored blobs bleeding in from multiple corners — near-white center with rich corner depth
tags: background, gradient, corner blobs, pastel, light, clean, multi-corner, soft, pretaa
---

## Multi-Corner Gradient Pattern

A near-white base with large, soft radial-gradient blobs positioned at screen corners. Each blob is a different hue (typically brand primary tones — blue/indigo, salmon, warm red). The center stays bright white, drawing focus to the content.

**Typical use case**: Any scene on a light-colored brand (Pretaa, Linear, Notion-style). Use as the background layer under network intros, customer journey scenes, CTA scenes, or logo reveals.

---

## Background Implementation

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();

// Animate blobs with very slow drift for a living background feel
const blobDrift = Math.sin(frame * 0.008) * 0.02; // tiny oscillation, max 2%

<AbsoluteFill style={{ backgroundColor: "#f0f2f6" }}>
  {/* Bottom-left blob — brand primary (indigo/blue) */}
  <div style={{
    position: "absolute",
    left: 0, bottom: 0,
    width: "65%",
    height: "70%",
    background: `radial-gradient(circle at 0% 100%, rgba(99,102,241,0.28) 0%, transparent 60%)`,
    transform: `translateY(${blobDrift * height}px)`,
  }} />

  {/* Top-right blob — salmon/coral */}
  <div style={{
    position: "absolute",
    right: 0, top: 0,
    width: "60%",
    height: "65%",
    background: `radial-gradient(circle at 100% 0%, rgba(248,113,113,0.22) 0%, transparent 58%)`,
    transform: `translateY(${-blobDrift * height}px)`,
  }} />

  {/* Bottom-right blob — warm red, subtle */}
  <div style={{
    position: "absolute",
    right: 0, bottom: 0,
    width: "45%",
    height: "50%",
    background: `radial-gradient(circle at 100% 100%, rgba(239,68,68,0.14) 0%, transparent 50%)`,
  }} />

  {/* Optional: top-left accent — very faint blue */}
  <div style={{
    position: "absolute",
    left: 0, top: 0,
    width: "35%",
    height: "40%",
    background: `radial-gradient(circle at 0% 0%, rgba(139,92,246,0.10) 0%, transparent 55%)`,
  }} />
</AbsoluteFill>
```

**Key**: No `filter: blur()` needed — the radial-gradient falloff IS the blur. This is lightweight (no GPU compositing layers).

---

## Adapting Colors to Brand

Swap the RGBA colors to match `BRAND.primary`. Use 0.20–0.30 opacity for the primary corner, 0.10–0.18 for secondary corners:

```tsx
// Helper: hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const primary = BRAND.primary || "#6366f1";
const secondary = BRAND.secondary || "#f87171";

// Bottom-left: primary at 0.28
background: `radial-gradient(circle at 0% 100%, ${hexToRgba(primary, 0.28)} 0%, transparent 60%)`

// Top-right: secondary at 0.20
background: `radial-gradient(circle at 100% 0%, ${hexToRgba(secondary, 0.20)} 0%, transparent 58%)`
```

---

## 2-Corner Minimal Variant

For cleaner, more restrained scenes — just two corners:

```tsx
<AbsoluteFill style={{ backgroundColor: "#f8f9fc" }}>
  {/* Bottom-left only */}
  <div style={{
    position: "absolute", left: 0, bottom: 0,
    width: "70%", height: "75%",
    background: `radial-gradient(circle at 0% 100%, rgba(99,102,241,0.22) 0%, transparent 55%)`,
  }} />
  {/* Top-right only */}
  <div style={{
    position: "absolute", right: 0, top: 0,
    width: "55%", height: "60%",
    background: `radial-gradient(circle at 100% 0%, rgba(248,113,113,0.16) 0%, transparent 52%)`,
  }} />
</AbsoluteFill>
```

---

## Usage Notes

- Pairs perfectly with `premium-network-intro`, `premium-customer-journey`, `premium-cta-scene` (light variant), and `premium-icon-concept-scene`
- Layer content (avatars, text, cards) at `zIndex: 10+` above the background divs
- The near-white center keeps headlines and data cards readable without any text shadow
- Do NOT use `filter: blur()` on corner blobs — it adds compositing cost with no visual benefit over the gradient falloff

---

## premium-multi-device

> Source: `src/skills/premium-multi-device.md`

---
title: Premium Multi-Device Composite
impact: HIGH
impactDescription: laptop + phone (+ optional tablet) in one frame — the agency signature shot showing the product works everywhere. Staggered spring entrances, all screens showing ATTACHED_IMAGES.
tags: multi-device, laptop, phone, tablet, composite, responsive, cross-platform, ATTACHED_IMAGES, device-showcase
---

## Multi-Device Composite Overview

Three devices arranged in a balanced composition:
- **Laptop** (center-left, large) — the hero device, product's main interface
- **Phone** (right, elevated) — mobile companion / app
- **Tablet** (far left or behind laptop, partially visible) — optional depth layer

All screens display `ATTACHED_IMAGES[0]` (or fallback UI). Staggered entrance with independent float loops gives the scene life.

---

## Layout Constants

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Laptop dimensions — center-stage
const LAPTOP_W = width * 0.55;
const LAPTOP_H = LAPTOP_W * 0.63;

// Phone dimensions — right side
const PHONE_W  = 140;
const PHONE_H  = PHONE_W * 2.16;

// Tablet dimensions — peeking from behind left
const TABLET_W = width * 0.28;
const TABLET_H = TABLET_W * 0.75;

// Entrance delays
const LAPTOP_DELAY  = 0;
const TABLET_DELAY  = 8;
const PHONE_DELAY   = 16;

// Float phases (so devices don't bob in sync)
const laptopFloat = Math.sin(frame * 0.03 + 0) * 8;
const phoneFloat  = Math.sin(frame * 0.04 + 2) * 10;
const tabletFloat = Math.sin(frame * 0.025 + 4) * 6;
```

---

## Entrance Springs

```tsx
const laptopEntrance = spring({
  frame: frame - LAPTOP_DELAY,
  fps,
  config: { damping: 22, stiffness: 70 },
});
const phoneEntrance = spring({
  frame: frame - PHONE_DELAY,
  fps,
  config: { damping: 18, stiffness: 85 },
});
const tabletEntrance = spring({
  frame: frame - TABLET_DELAY,
  fps,
  config: { damping: 20, stiffness: 75 },
});

const laptopY  = interpolate(laptopEntrance,  [0, 1], [height * 0.3, 0]);
const phoneY   = interpolate(phoneEntrance,   [0, 1], [height * 0.4, 0]);
const tabletY  = interpolate(tabletEntrance,  [0, 1], [height * 0.25, 0]);
const laptopScale  = interpolate(laptopEntrance,  [0, 1], [0.85, 1]);
const phoneScale   = interpolate(phoneEntrance,   [0, 1], [0.80, 1]);
const tabletScale  = interpolate(tabletEntrance,  [0, 1], [0.88, 1]);
```

---

## Full Composite Render

```tsx
<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>

  {/* ─── TABLET (behind, left) ─── */}
  <div style={{
    position: "absolute",
    left: width * 0.03,
    top: "50%",
    transform: `translateY(calc(-50% + ${tabletY + tabletFloat}px)) scale(${tabletScale})`,
    transformOrigin: "center center",
    zIndex: 10,
    opacity: tabletEntrance,
  }}>
    <div style={{
      width: TABLET_W,
      height: TABLET_H,
      background: "linear-gradient(145deg, #d1d5db, #9ca3af)",
      borderRadius: 16,
      boxShadow: "0 30px 60px rgba(0,0,0,0.30)",
      padding: 10,
      display: "flex", flexDirection: "column",
    }}>
      {/* Home bar */}
      <div style={{
        height: 20, background: "#1f2937", borderRadius: "6px 6px 0 0",
        display: "flex", alignItems: "center", padding: "0 10px", gap: 4,
      }}>
        {["#ef4444","#eab308","#22c55e"].map((c,i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
        ))}
      </div>
      {/* Screen */}
      <div style={{ flex: 1, overflow: "hidden", borderRadius: "0 0 6px 6px" }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#f8fafc" }} />
        )}
      </div>
    </div>
  </div>

  {/* ─── LAPTOP (center, hero) ─── */}
  <div style={{
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: `translate(-52%, calc(-46% + ${laptopY + laptopFloat}px)) scale(${laptopScale})`,
    zIndex: 20,
  }}>
    <div style={{
      width: LAPTOP_W,
      height: LAPTOP_H,
      position: "relative",
    }}>
      {/* Body */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, #d1d5db 0%, #9ca3af 100%)",
        borderRadius: "12px 12px 0 0",
        boxShadow: "0 60px 120px rgba(0,0,0,0.50), 0 0 0 1px rgba(0,0,0,0.12)",
      }} />

      {/* Screen bezel — 77% × 68% of laptop */}
      <div style={{
        position: "absolute",
        top: "8.5%", left: "11.5%",
        width: "77%", height: "68%",
        background: "#0a0a0a",
        borderRadius: 4,
        overflow: "hidden",
      }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#0f172a" }} />
        )}
        {/* Sheen sweep */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)",
          transform: `translateX(${interpolate(frame, [20, 70], [-120, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%)`,
          pointerEvents: "none",
        }} />
      </div>

      {/* Notch */}
      <div style={{
        position: "absolute", top: "7%", left: "50%",
        transform: "translateX(-50%)",
        width: 10, height: 3, background: "#111827", borderRadius: 2,
      }} />

      {/* Hinge */}
      <div style={{
        position: "absolute", bottom: "-4%", left: "4%", right: "4%", height: "5%",
        background: "linear-gradient(180deg, #9ca3af, #6b7280)",
        borderRadius: "0 0 6px 6px",
      }} />
    </div>
  </div>

  {/* ─── PHONE (right) ─── */}
  <div style={{
    position: "absolute",
    right: width * 0.05,
    top: "50%",
    transform: `translateY(calc(-50% + ${phoneY + phoneFloat}px)) scale(${phoneScale})`,
    zIndex: 30,
    opacity: phoneEntrance,
  }}>
    <div style={{
      width: PHONE_W,
      height: PHONE_H,
      background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
      borderRadius: 32,
      boxShadow: "0 40px 80px rgba(0,0,0,0.50), inset 0 0 0 1.5px rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      padding: "10px 6px 10px",
      position: "relative",
    }}>
      {/* Dynamic island */}
      <div style={{ width: 70, height: 20, background: "#000", borderRadius: 10, marginBottom: 6, flexShrink: 0 }} />
      {/* Screen */}
      <div style={{ flex: 1, width: "100%", borderRadius: 22, overflow: "hidden", background: "#000" }}>
        {ATTACHED_IMAGES[0] ? (
          <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#1e293b" }} />
        )}
      </div>
      {/* Home bar */}
      <div style={{ width: 80, height: 3, background: "rgba(255,255,255,0.25)", borderRadius: 2, marginTop: 8, flexShrink: 0 }} />
    </div>
  </div>

</AbsoluteFill>
```

---

## Background Options

Works best with either:

```tsx
{/* Option A: Dark gradient with soft orbs */}
<AbsoluteFill style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
  <div style={{ position: "absolute", top: "-20%", left: "20%", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", filter: "blur(50px)" }} />
  <div style={{ position: "absolute", bottom: "-10%", right: "10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
</AbsoluteFill>

{/* Option B: Clean light with dot grid */}
<AbsoluteFill style={{ background: "#f8fafc" }}>
  <div style={{ position: "absolute", inset: 0, opacity: 0.3, backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
</AbsoluteFill>
```

---

## Headline + CTA Below Devices (Optional)

```tsx
const headlineEntrance = spring({ frame: frame - 40, fps, config: { damping: 14, stiffness: 80 } });

<div style={{
  position: "absolute", bottom: "6%", left: "50%",
  transform: `translateX(-50%) translateY(${interpolate(headlineEntrance, [0,1], [20,0])}px)`,
  opacity: headlineEntrance,
  textAlign: "center", fontFamily: "Inter, sans-serif",
}}>
  <div style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 6 }}>
    Works on every device. Ships from Japan.
  </div>
  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}>
    Web · iOS · Android
  </div>
</div>
```

---

## Key Rules

- **Z-order**: tablet (10) → laptop (20) → phone (30) — phone is the "newest" device, front
- **Float phases**: different `Math.sin` phases (0, 2, 4) prevent synchronized bobbing
- **Stagger delays**: LAPTOP_DELAY=0, TABLET_DELAY=8, PHONE_DELAY=16 — laptop arrives first as the main event
- **Sheen only on laptop** — it's the hero screen; phone and tablet don't need the shine effect
- **Scale**: laptop at 55% of video width is the right proportion — large enough to be impressive, not overwhelming
- **`ATTACHED_IMAGES[0]`** on all three screens — shows the product is truly cross-platform

---

## premium-multi-view-walkthrough

> Source: `src/skills/premium-multi-view-walkthrough.md`

# Multi-View Product Walkthrough

> Bordio-style multi-screenshot scene — sequence through multiple product views (table → kanban → calendar → detail) within a single scene using tab-switching transitions.

## When to Use
- Showcase scenes with 3+ uploaded screenshots of the same product
- Products with multiple views: table, kanban, calendar, list, detail, settings
- When `imageIndices` is set on ScenePlan (multiple images assigned to one scene)
- Complex dashboards requiring a "product tour" feel

## How It Works

When a scene has `imageIndices: [0, 2, 4]`, all three images are available as:
- `ATTACHED_IMAGES[0]` — first view
- `ATTACHED_IMAGES[1]` — second view
- `ATTACHED_IMAGES[2]` — third view

## Usage Pattern

```jsx
const SceneComponent = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const VIEWS = [
    { image: ATTACHED_IMAGES[0], label: "Board View", startFrame: 0 },
    { image: ATTACHED_IMAGES[1], label: "Calendar", startFrame: 80 },
    { image: ATTACHED_IMAGES[2], label: "Analytics", startFrame: 160 },
  ];

  // Find active view
  const activeIdx = VIEWS.reduce((acc, v, i) => frame >= v.startFrame ? i : acc, 0);

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Tab bar at top */}
      <div style={{
        position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 4, background: BRAND.surface,
        borderRadius: 10, padding: 4, zIndex: 50,
      }}>
        {VIEWS.map((v, i) => (
          <div key={i} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: i === activeIdx ? BRAND.primary : "transparent",
            color: i === activeIdx ? "#fff" : BRAND.textMuted,
            fontFamily: BRAND.font,
          }}>
            {v.label}
          </div>
        ))}
      </div>

      {/* View content with crossfade */}
      {VIEWS.map((v, i) => {
        const isActive = i === activeIdx;
        const enterProgress = spring({
          frame: frame - v.startFrame, fps,
          config: SPRING_CONFIGS.entrance
        });
        const opacity = isActive ? enterProgress : 0;
        const scale = interpolate(enterProgress, [0, 1], [0.97, 1]);
        return (
          <AbsoluteFill key={i} style={{ opacity, transform: `scale(${scale})` }}>
            <Img src={v.image} style={{
              width: width * 0.85, height: height * 0.75,
              objectFit: "contain",
              position: "absolute", left: "50%", top: "55%",
              transform: "translate(-50%, -50%)",
              borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
```

## Composition Rules

1. Show 2-4 views maximum per scene — more is too fast
2. Each view gets ~80 frames (2.7s at 30fps) — enough for a good look
3. Use a visible tab bar to indicate which view is active
4. Crossfade between views with spring entrance (not hard cut)
5. Optional: pair with MacroCamera to zoom into a specific area of each view
6. Optional: use SteppedCamera for a slow pan across each view
7. Add subtle scale transition (0.97 → 1.0) for depth feeling

## Tab Bar Variants

### Pill Tabs (Default)
Rounded pill selector, brand color on active tab

### Icon Tabs
Small icon + label, underline on active tab

### Breadcrumb Style
`Board > Calendar > Analytics` — active item is bold

## Scene Arc
```
Frames 0-10:    Scene enters, tab bar appears
Frames 0-80:    View 1 visible, optional cursor exploration
Frames 80-90:   Tab switches (active tab highlight moves)
Frames 80-160:  View 2 visible, optional cursor exploration
Frames 160-170: Tab switches again
Frames 160-240: View 3 visible
```

## UI Continuity Rules (CRITICAL — makes views feel like one product, not a slideshow)

The #1 quality differentiator: multi-view must feel like the SAME app evolving, not separate screenshots swapped in.

1. **Persistent Chrome**: The AppShell frame (sidebar, topbar, browser chrome) must STAY VISIBLE across all views. Only the inner content area crossfades. This means: render ONE AppShell wrapper, and swap the content region inside it.
2. **Tab Animation**: When switching views, animate the tab indicator (color pill slides from old tab to new tab over 12 frames using spring). The cursor should click the next tab, THEN the content transitions.
3. **Shared Elements**: If two views share a sidebar or header, those elements must NOT re-enter — they persist. Only the main content panel crossfades.
4. **Scale Continuity**: All views must render at the same scale and position. Do NOT resize or reposition the screenshot container between views — this breaks the spatial illusion.
5. **Cursor Guides the Switch**: The cursor should click the tab/nav item that triggers the view change. Never switch views without cursor interaction — it feels like the app is changing by itself.

### Pattern: Persistent Shell + Content Swap
```jsx
// ONE AppShell stays, content inside swaps
<AbsoluteFill>
  <AppShell brand={BRAND} chromeColor={BRAND.primary}>
    {/* This inner region crossfades between views */}
    {VIEWS.map((v, i) => {
      const isActive = i === activeIdx;
      const progress = spring({ frame: frame - v.startFrame, fps, config: SPRING_CONFIGS.entrance });
      return (
        <AbsoluteFill key={i} style={{
          opacity: isActive ? progress : 0,
          transform: `translateX(${isActive ? interpolate(progress, [0,1], [20, 0]) : 0}px)`,
        }}>
          <Img src={v.image} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </AbsoluteFill>
      );
    })}
  </AppShell>
</AbsoluteFill>
```

## Anti-Patterns
- Do NOT show all views simultaneously — sequence them
- Do NOT use hard cuts between views — use spring crossfade
- Do NOT skip the tab bar — viewer needs navigation context
- Do NOT assign more than 4 screenshots to one scene — split into 2 scenes instead
- Do NOT re-render the AppShell/browser frame for each view — keep ONE persistent frame
- Do NOT switch views without cursor clicking the tab first — unmotivated switches look broken
- Do NOT resize/reposition the content container between views — spatial jump = amateur

---

## premium-narration-reveal

> Source: `src/skills/premium-narration-reveal.md`

---
title: Premium Narration Reveal
impact: HIGH
impactDescription: Word-by-word color transition synced to voiceover timing. Words start gray and illuminate as narration speaks them — one of the highest-impact "perceived intelligence" techniques in video production.
tags: narration, voiceover, word-sync, text-reveal, progressive, word-by-word, qanapi, conclusion, summary, cta
qualityBar: Text renders with all words visible but dimmed. As voiceover reaches each word, it transitions from gray to full color with easeOutCubic smoothness. Optional fontWeight transition 400→700 adds physical weight. Max 1 per video — reserved for the key takeaway or CTA statement.
---

## Scene Purpose

The "Key Takeaway" moment. A single powerful sentence reveals word-by-word in sync with the voiceover, creating the impression that the narrator is illuminating each word as they speak it. Qanapi's summary scene uses this exact technique for maximum message retention.

## Visual Blueprint

```text
[   Clean background (light arc bg or brand gradient)              ]
[                                                                   ]
[   Optional: DrawOnIcon (shield, target, check) centered above    ]
[                                                                   ]
[     In just a few clicks, you've deployed                        ]
[     ^^^^^^^^^^^^^^^^^^^^^ (active — BRAND.text, full opacity)    ]
[                            ^^^^^^^^^^^^^^^^                       ]
[                            a complete Zero-Trust security          ]
[                            ^^^^^ (transitioning — mid-opacity)    ]
[                                   ^^^^^^^^^^^^^^^^^^^^^^^^        ]
[                                   (inactive — gray, low opacity)  ]
[                                                                   ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const NarrationRevealScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SUMMARY_TEXT = "In just a few clicks, you've deployed a complete Zero-Trust security solution";

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 120 }}>
      {/* Optional icon above text */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: BRAND.primary, marginBottom: 40,
        display: "flex", justifyContent: "center", alignItems: "center",
        opacity: spring({ frame: frame - 10, fps, config: SPRING_CONFIGS.entrance }),
        transform: `scale(${spring({ frame: frame - 10, fps, config: SPRING_CONFIGS.snap })})`,
      }}>
        {/* Shield icon or similar */}
      </div>

      {/* NarrationReveal — words illuminate as voiceover speaks */}
      <NarrationReveal
        text={SUMMARY_TEXT}
        timings={WORD_TIMINGS}
        activeColor={BRAND.text}
        inactiveColor={BRAND.style === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
        fontSize={56}
        fontWeight={700}
        boldOnActive={true}
        brand={BRAND}
        maxWidth="75%"
      />
    </AbsoluteFill>
  );
};
```

---

## Usage Patterns

### Pattern A: Summary Statement (Qanapi-style)
Clean background, icon above, single powerful sentence that summarizes the product's value.
```
fontSize: 56
boldOnActive: true
maxWidth: "75%"
```

### Pattern B: CTA Reveal
Brand-colored background, large text, narration reveals the call-to-action.
```
fontSize: 72
activeColor: "#ffffff"
inactiveColor: "rgba(255,255,255,0.15)"
boldOnActive: false
```

### Pattern C: Problem Statement
Dark/muted background, narration reveals the pain point before the solution.
```
fontSize: 48
activeColor: "#ef4444" (red for pain)
inactiveColor: "rgba(239,68,68,0.15)"
boldOnActive: true
```

---

## Rules

1. **Max 1 NarrationReveal per video** — overuse dilutes the impact
2. **Always pass WORD_TIMINGS** when voiceover audio exists
3. **Reserve for conclusion/CTA/summary scenes** — not for intro or problem scenes
4. **Keep text under 20 words** — longer text loses the sync effect
5. **Pair with clean background** — no competing visual elements during the reveal
6. **Center the text** — NarrationReveal demands the viewer's full attention

## Checklist

- [ ] WORD_TIMINGS passed to timings prop
- [ ] Text matches voiceoverText from scene plan
- [ ] activeColor uses BRAND.text (not hardcoded)
- [ ] Background is clean (arc bg, gradient, or solid)
- [ ] No more than 1 NarrationReveal in the full video
- [ ] Text is under 20 words

---

## premium-narrative-overlay

> Source: `src/skills/premium-narrative-overlay.md`

---
title: Premium Narrative Text Overlay
impact: HIGH
impactDescription: on-screen story text layer — bold headline + section label + sub-line that tells the narrative visually, independent of voiceover; the WhatAStory signature pattern applied to every scene
tags: narrative, text, headline, overlay, story, emotional, on-screen-copy, section-label, sub-line, every-scene
---

## Narrative Overlay Pattern

Every premium SaaS video scene has a visual text layer that tells the story even with sound off. This is separate from voiceover — it is the on-screen copy that appears as graphical elements alongside the visual content.

**The 3-layer text stack (used on every scene):**
1. **Section label** — 12px, uppercase, BRAND.primary, letterSpacing 0.22em — the category/context
2. **Headline** — 80–120px, weight 900, BRAND.text — the story beat in 3–6 words
3. **Sub-line** — 22px, weight 400, BRAND.textMuted — the specific detail/outcome

**The golden rule**: The headline text is always written in OUTCOME language — what the viewer gains, never what the feature does.

---

## Complete Pattern (copy and adapt)

```tsx
// Define in constants (read from scene prompt — use exact text specified)
const SECTION_LABEL = "THE PROBLEM";         // or "AUTOMATION", "RESULTS", etc.
const HEADLINE_PARTS = ["Hours lost.", "Every week."]; // split at natural break
const ACCENT_WORD = "Hours";                 // one word gets BRAND.primary color
const SUBLINE = "12 hours of manual work — per person";

// Timing constants (read from scene prompt Act 1 timing)
const LABEL_START   = 8;
const HEADLINE_START = 18;
const SUBLINE_START  = HEADLINE_START + 14;

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Springs — match emotional intent from scene prompt
const labelOpacity   = spring({ frame: frame - LABEL_START,   fps, config: { damping: 200, stiffness: 120 } });
const headlineSpring = spring({ frame: frame - HEADLINE_START, fps, config: { damping: 200, stiffness: 120 } });
const sublineOpacity = spring({ frame: frame - SUBLINE_START,  fps, config: { damping: 200, stiffness: 100 } });

// Section label
<div style={{
  fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
  color: BRAND.primary, fontFamily: BRAND.font + ", Inter, sans-serif",
  textTransform: "uppercase",
  opacity: Math.min(labelOpacity * 2, 1),
  marginBottom: 14,
  transform: `translateY(${interpolate(labelOpacity, [0, 1], [8, 0])}px)`,
}}>
  {SECTION_LABEL}
</div>

// Headline — with accent word highlighted
<div style={{
  fontSize: 96, fontWeight: 900, letterSpacing: "-0.04em",
  color: BRAND.text, fontFamily: BRAND.font + ", Inter, sans-serif",
  lineHeight: 1.05, maxWidth: "82%", wordBreak: "break-word",
  transform: `translateY(${interpolate(headlineSpring, [0, 1], [28, 0])}px)`,
  opacity: headlineSpring,
}}>
  {HEADLINE_PARTS.map((part, i) => (
    <span key={i}>
      {part.split(" ").map((word, j) => (
        <span key={j} style={
          word.replace(/[.,!?]/, "") === ACCENT_WORD
            ? {
                background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }
            : {}
        }>
          {word}{" "}
        </span>
      ))}
      {i < HEADLINE_PARTS.length - 1 && <br />}
    </span>
  ))}
</div>

// Sub-line
{frame >= SUBLINE_START && (
  <div style={{
    fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em",
    color: BRAND.textMuted, fontFamily: BRAND.font + ", Inter, sans-serif",
    marginTop: 20, maxWidth: "60%", lineHeight: 1.5,
    opacity: sublineOpacity,
    transform: `translateY(${interpolate(sublineOpacity, [0, 1], [12, 0])}px)`,
  }}>
    {SUBLINE}
  </div>
)}
```

---

## Positioning Rules (by scene composition)

**Left-side text (showcase scenes — text 40%, visual 55%):**
```tsx
<div style={{
  position: "absolute",
  left: 80, top: "50%",
  transform: "translateY(-50%)",
  width: "38%",
  display: "flex", flexDirection: "column",
  zIndex: 20,
}}>
  {/* label + headline + subline stack */}
</div>
```

**Centered text (title cards, stat scenes, CTA):**
```tsx
<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
  width: "75%",
  display: "flex", flexDirection: "column", alignItems: "center",
  zIndex: 20,
}}>
  {/* label + headline + subline centered */}
</div>
```

**Top-left anchor (problem scenes with full-frame visual):**
```tsx
<div style={{
  position: "absolute",
  left: 80, top: 80,
  width: "45%",
  display: "flex", flexDirection: "column",
  zIndex: 20,
}}>
  {/* label + headline + subline */}
</div>
```

---

## Emotional Variant — Headline Size + Weight by Intent

| emotionalIntent | Headline size | Weight | Character |
|---|---|---|---|
| FRUSTRATION | 80–96px | 900 | Short, blunt. No punctuation softening. "Chaos. Every. Day." |
| PAIN | 72–88px | 800 | One sentence, specific cost. "$4,200 in wasted hours." |
| RELIEF | 96–120px | 800 | Spacious, breathing. "Finally." or "Done. Automatically." |
| CONFIDENCE | 72–96px | 800 | Clear, direct. "See everything. Instantly." |
| TRUST | 64–80px | 700 | Warm, understated. "Trusted by 2,400 teams." |
| URGENCY | 96–128px | 900 | Action-forward. "Start in 2 minutes." |
| EXCITEMENT | 108–160px | 900 | Big, celebratory. "You're ready." |

---

## Animated Underline Draw (optional — for single-line headlines)

Adds a brand-color underline that draws left-to-right under the accent word:

```tsx
const underlineProgress = spring({ frame: frame - (HEADLINE_START + 10), fps, config: { stiffness: 40, damping: 22 } });

{/* Underline under accent word — position manually */}
<div style={{
  position: "absolute",
  bottom: -4,
  left: 0,
  width: `${interpolate(underlineProgress, [0, 1], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
  height: 4,
  borderRadius: 2,
  background: BRAND.primary,
  boxShadow: `0 0 12px ${BRAND.primary}80`,
}} />
```

---

## Multi-Line Kinetic Reveal (word by word)

For problem/hook scenes, reveal each word independently for dramatic impact:

```tsx
// OUTSIDE component — stable reference
const WORDS = "Your team is losing hours every single week".split(" ");
const WORD_DELAY = 6; // frames between each word

{WORDS.map((word, i) => {
  const wordProgress = spring({
    frame: frame - (HEADLINE_START + i * WORD_DELAY),
    fps,
    config: { damping: 200, stiffness: 180 },
  });
  if (frame < HEADLINE_START + i * WORD_DELAY) return null;
  return (
    <span key={i} style={{
      display: "inline-block",
      opacity: wordProgress,
      transform: `translateY(${interpolate(wordProgress, [0, 1], [20, 0])}px)`,
      marginRight: "0.25em",
      color: i === WORDS.length - 1 ? BRAND.primary : BRAND.text,
    }}>
      {word}
    </span>
  );
})}
```

---

## Usage Notes

- **Use this pattern on EVERY scene** — even showcase scenes need a headline above or beside the UI
- The section label is optional for action-heavy cursor scenes (it can interfere with the demo) — use it for all other scene types
- NEVER invent headline text — use the exact strings from the scene prompt
- For AHA MOMENT scenes: make the headline the LARGEST element on screen. It IS the moment. Visual is secondary.
- Accent word rule: one word per headline, not two. "Done **instantly**." not "Done **instantly** **always**."
- Sub-line font size never above 24px — it is context, not story
- In split-composition scenes (text left, visual right): text block width = 38–42% of frame width, never more

---

## premium-neon-dark

> Source: `src/skills/premium-neon-dark.md`

---
title: Premium Dark / Neon Theme
impact: HIGH
impactDescription: creates cinematic dark-theme animations with SVG neon glow filters, sonar rings, shape-masked reveals, and heartbeat pulses
tags: dark, neon, glow, sonar, svg-filter, shape-mask, heartbeat, cinematic
---

## Dark Theme Foundation

For tech/analytics/healthcare products — deep dark background with neon accent color:

```tsx
const PRIMARY_COLOR = "#00ff9d"; // neon green — swap for any brand neon

<AbsoluteFill style={{ backgroundColor: "#020403", overflow: "hidden" }}>
  {/* Radial focus gradient */}
  <div style={{
    position: "absolute", inset: 0,
    background: `radial-gradient(circle at center, #0a1f14 0%, #000000 70%)`,
    opacity: 0.8,
  }} />

  {/* SVG Noise texture for "agency film grain" feel */}
  <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.05 }}>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
</AbsoluteFill>
```

---

## Sonar / Radar Rings

Expanding rings that pulse outward from a center point — for AI, analytics, or precision-tech products:

```tsx
const renderSonarRing = (index: number) => {
  const RING_PERIOD = 90; // frames per full expansion
  const delay       = index * 15; // stagger between rings
  const progress    = (frame - delay) % RING_PERIOD;
  const active      = frame > delay;

  if (!active) return null;

  const rScale   = interpolate(progress, [0, RING_PERIOD], [0.8, 3]);
  const rOpacity = interpolate(progress, [0, 20, RING_PERIOD], [0, 0.4, 0]);

  return (
    <div
      key={index}
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 500, height: 500,
        borderRadius: "50%",
        border: `1px solid ${PRIMARY_COLOR}`,
        transform: `translate(-50%, -50%) scale(${rScale})`,
        opacity: rOpacity,
        filter: `drop-shadow(0 0 5px ${PRIMARY_COLOR})`,
      }}
    />
  );
};

{[0, 1, 2].map(renderSonarRing)}
```

**Parameters to tune:**
- `RING_PERIOD` — how long each ring takes to expand (60–120 frames)
- Stagger of `15` frames = 3 rings always visible at once
- `width/height: 500` — ring size at scale 1 (actual max = 500 * 3 = 1500px)

---

## SVG Neon Glow Filter

Apply to any SVG element for a professional neon glow effect:

```tsx
<svg width="600" height="600" style={{ overflow: "visible" }}>
  <defs>
    <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  {/* Apply to any path */}
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 ..."
    fill="none"
    stroke={PRIMARY_COLOR}
    strokeWidth="0.8"
    filter="url(#neonGlow)"
  />
</svg>
```

---

## Shape-Masked Image Reveal

Reveal a photo/screenshot inside any SVG shape (heart, circle, star, custom):

```tsx
<svg width="600" height="600" viewBox="0 0 24 24" style={{ overflow: "visible" }}>
  <defs>
    <clipPath id="shapeMask">
      {/* Heart path — replace with any closed SVG path */}
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
               2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
               C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
               c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </clipPath>
  </defs>

  {/* Masked image */}
  <foreignObject x="0" y="0" width="24" height="24" clipPath="url(#shapeMask)">
    <div style={{ width: "100%", height: "100%", background: "#000" }}>
      <img
        src="YOUR_IMAGE_URL"
        style={{
          width: "120%", height: "120%", objectFit: "cover",
          opacity: interpolate(frame, [0, 30], [0, 1]),
          transform: `scale(${interpolate(frame, [0, 100], [1.2, 1])})`,
        }}
      />
    </div>
  </foreignObject>

  {/* Neon stroke border */}
  <path
    d="M12 21.35l-1.45-1.32C5.4 15.36 ..."
    fill="none"
    stroke={PRIMARY_COLOR}
    strokeWidth="0.8"
    filter="url(#neonGlow)"
  />
</svg>
```

---

## Heartbeat / Pulse Animation

A living, breathing scale on a hero element:

```tsx
// 1. Initial pop-in
const entrance = spring({
  frame,
  fps,
  config: { stiffness: 100, damping: 15, mass: 0.8 },
});

// 2. Heartbeat (continuous after entrance)
const HEARTBEAT_SPEED = 3; // beats per second (lower = slower)
const heartbeat = Math.sin((frame / fps) * HEARTBEAT_SPEED * Math.PI) * 0.03 * entrance;

// 3. Optional expand-to-fill (later in scene)
const EXPAND_START = 45;
const expand = spring({
  frame: frame - EXPAND_START,
  fps,
  config: { stiffness: 60, damping: 14, mass: 1.5 },
});

// Combined scale
const scale = (0.5 + entrance * 0.5) + heartbeat + expand * 0.2;

<div style={{ transform: `scale(${scale})` }}>
  {/* Hero logo, icon, or masked image */}
</div>
```

---

## Dark Dashboard Screen with Subtle Dot Grid

```tsx
<AbsoluteFill style={{ background: "#050505" }}>
  {/* Very subtle dot grid — adds depth without distraction */}
  <div style={{
    position: "absolute", inset: 0,
    backgroundImage: `radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)`,
    backgroundSize: "24px 24px",
    opacity: 0.5,
  }} />
</AbsoluteFill>
```

---

## premium-network-intro

> Source: `src/skills/premium-network-intro.md`

---
title: Premium Network & Integration Intro
impact: HIGH
impactDescription: Generates a high-energy, 3D network of connected nodes to show integrations, user networks, or data flow.
tags: network, nodes, integrations, svg-lines, pulse, 3d-depth, data-flow, avatars, polka-dot
qualityBar: The central hub pops in with authority. Surrounding nodes stagger into existence across the Z-axis (varying scale/blur). Smooth, curved SVG lines animate outward from the center to connect the nodes, followed by a bright "data pulse" traveling down the paths.
---

## Scene Purpose

Used to visually demonstrate integrations (e.g., "Connects with all your tools"), global reach ("Used by teams worldwide"), or data consolidation ("All your data in one place"). It physicalizes the concept of connectivity.

## Visual Blueprint

```text
[      Cinematic Camera Wrapper (1.0 -> 1.05 Zoom)      ]
[                                                       ]
[    [Node] (Blur: 4px)                [Node] (Blur: 0) ]
[        \                             /                ]
[         \___                     ___/                 ]
[             \___             ___/                     ]
[                 \           /                         ]
[                  [HERO HUB]                           ]
[                 /           \                         ]
[             ___/             \___                     ]
[         ___/                     \___                 ]
[        /                             \                ]
[    [Node] (Blur: 2px)                [Node] (Blur: 8) ]
[                                                       ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const NetworkIntroScene = ({ BRAND, centerLogo, integrationLogos }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. TIMING (3-beat rhythm: Hub → Nodes → Lines)
  const HUB_START       = 5;
  const NODE_START      = 15;
  const LINE_DRAW_START = 25;

  // 2. HUB SPRING & PULSE
  const hubSpring = spring({ frame: frame - HUB_START, fps, config: { damping: 14, stiffness: 180 } }); // Snappy pop
  const hubPulse  = interpolate(Math.sin((frame - 30) * 0.1), [-1, 1], [0.95, 1.05]); // Ambient breathing

  // 3. NODE SLOTS — Pre-mapped for 3D depth and balanced layout
  // x/y are ratios from center hub (0,0). scale/blur simulate Z-axis depth.
  const SATELLITE_SLOTS = [
    { x: -0.35, y: -0.35, scale: 0.8, blur: 0 },  // Top Left — sharp (background)
    { x:  0.40, y: -0.25, scale: 1.2, blur: 4 },  // Top Right — medium foreground
    { x: -0.45, y:  0.20, scale: 1.5, blur: 8 },  // Bottom Left — heavy foreground
    { x:  0.30, y:  0.35, scale: 0.6, blur: 0 },  // Bottom Right — sharp (background)
    { x:  0.0,  y: -0.45, scale: 0.7, blur: 2 },  // Top Center
    { x: -0.50, y: -0.05, scale: 0.9, blur: 0 },  // Far Left
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* 3D CAMERA WRAPPER */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${interpolate(frame, [0, 150], [1.0, 1.05])})`,
        display: "flex", justifyContent: "center", alignItems: "center",
      }}>

        {/* SVG LAYER — CONNECTING LINES (Z: 10) */}
        <svg style={{ position: "absolute", width: "100%", height: "100%", zIndex: 10, overflow: "visible" }}>
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={BRAND.primary || "#6366f1"} stopOpacity="0.8" />
              <stop offset="100%" stopColor={BRAND.primary || "#6366f1"} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {integrationLogos.slice(0, SATELLITE_SLOTS.length).map((_, i) => {
            const slot = SATELLITE_SLOTS[i];

            // Absolute positions from screen center
            const startX = width / 2;
            const startY = height / 2;
            const endX   = startX + (slot.x * width);
            const endY   = startY + (slot.y * height);

            // Quadratic Bezier — organic curve instead of rigid straight line
            const controlX = startX + (endX - startX) * 0.5;
            const controlY = startY;
            const pathData  = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

            // Draw from center outward via strokeDashoffset
            const lineProgress = spring({
              frame: frame - (LINE_DRAW_START + i * 4),
              fps,
              config: { damping: 20, stiffness: 100 },
            });
            const PATH_LENGTH = 2500; // Safe max — slightly over screen diagonal

            return (
              <path
                key={i}
                d={pathData}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth={2}
                strokeDasharray={PATH_LENGTH}
                strokeDashoffset={interpolate(lineProgress, [0, 1], [PATH_LENGTH, 0])}
                style={{ opacity: lineProgress }}
              />
            );
          })}
        </svg>

        {/* HERO HUB NODE (Z: 30) */}
        <div style={{
          position: "absolute",
          zIndex: 30,
          width: 120, height: 120,
          borderRadius: 24,
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: `2px solid ${BRAND.primary || "#6366f1"}`,
          boxShadow: `0 0 60px ${BRAND.primary || "#6366f1"}40`,
          display: "flex", justifyContent: "center", alignItems: "center",
          transform: `scale(${interpolate(hubSpring, [0, 1], [0, 1])}) scale(${frame > 30 ? hubPulse : 1})`,
        }}>
          {centerLogo ? (
            <img src={centerLogo} style={{ width: 64, height: 64, objectFit: "contain" }} />
          ) : (
            <div style={{
              width: 64, height: 64,
              borderRadius: 14,
              backgroundColor: BRAND.primary || "#6366f1",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif",
            }}>
              {(BRAND.name || "?")[0]}
            </div>
          )}
        </div>

        {/* SATELLITE NODES (Z: 20) */}
        {integrationLogos.slice(0, SATELLITE_SLOTS.length).map((logo, i) => {
          const slot       = SATELLITE_SLOTS[i];
          const nodeSpring = spring({
            frame: frame - (NODE_START + i * 3),
            fps,
            config: { damping: 15, stiffness: 160 },
          });
          const floatY = Math.sin((frame + i * 100) / 45) * 8;

          return (
            <div key={i} style={{
              position: "absolute",
              zIndex: 20 + i,
              left: `calc(50% + ${slot.x * 100}%)`,
              top:  `calc(50% + ${slot.y * 100}%)`,
              width: 80, height: 80,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              display: "flex", justifyContent: "center", alignItems: "center",
              transform: `translate(-50%, -50%) scale(${interpolate(nodeSpring, [0, 1], [0, slot.scale])}) translateY(${floatY}px)`,
              filter: `blur(${slot.blur}px)`,
              opacity: nodeSpring,
            }}>
              <img src={logo} style={{ width: 40, height: 40, objectFit: "contain" }} />
            </div>
          );
        })}

      </div>
    </AbsoluteFill>
  );
};
```

---

## Spring / Timing Reference

| Element | Start Frame | Config | Description |
|---|---|---|---|
| **Hero Hub** | `5` | `stiff:180, damp:14` | High-energy pop |
| **Satellites** | `15 + (i*3)` | `stiff:160, damp:15` | Rapid, bouncy cascade |
| **Line Draw** | `25 + (i*4)` | `stiff:100, damp:20` | Smooth, deliberate path trace |

---

## Avatar Network Variant (Polka-Dot Paths + Ripple)

For B2B, HR, and community products — avatar nodes connected by animated dot paths:

```tsx
const NODES = [
  { id: 0, x: width * 0.25, y: height * 0.32, size: 190, src: ATTACHED_IMAGES[0] ?? null, label: "A" },
  { id: 1, x: width * 0.75, y: height * 0.28, size: 160, src: ATTACHED_IMAGES[1] ?? null, label: "B" },
  { id: 2, x: width * 0.32, y: height * 0.72, size: 170, src: ATTACHED_IMAGES[2] ?? null, label: "C" },
  { id: 3, x: width * 0.72, y: height * 0.68, size: 165, src: ATTACHED_IMAGES[3] ?? null, label: "D" },
];
```

### Polka-Dot Connection Path

```tsx
const ConnectionPath = ({ start, end, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dx   = end.x - start.x;
  const dy   = end.y - start.y;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const cpX  = midX - dy * 0.2;  // Organic arch
  const cpY  = midY + dx * 0.2;

  const path = `M ${start.x} ${start.y} Q ${cpX} ${cpY} ${end.x} ${end.y}`;
  const len  = Math.sqrt(dx * dx + dy * dy) * 1.2;

  const progress   = spring({ frame: frame - delay, fps, config: { stiffness: 40, damping: 20 } });
  const dashOffset = interpolate(progress, [0, 1], [len, 0]);

  return (
    <path
      d={path}
      stroke="#94a3b8"
      strokeWidth="3.5"
      strokeLinecap="round"  // Creates polka-dot look with wide gap
      strokeDasharray="0 16" // 0px dash + 16px gap = dots 16px apart
      strokeDashoffset={dashOffset}
      fill="none"
      style={{ opacity: 0.5 }}
    />
  );
};
```

**The polka-dot trick**: `strokeDasharray="0 16"` with `strokeLinecap="round"` creates dots. Adjust `16` for dot spacing.

### Avatar Node with Ripple + Float

```tsx
const AvatarNode = ({ src, x, y, size, delay, label = "?" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < delay) return null;

  const scale       = spring({ frame: frame - delay, fps, config: { stiffness: 160, damping: 12, mass: 1.2 } }); // Overshoot!
  const rippleFrame   = frame - delay;
  const rippleScale   = interpolate(rippleFrame, [0, 30], [0.8, 2.2], { extrapolateRight: "clamp" });
  const rippleOpacity = interpolate(rippleFrame, [0, 25], [0.5, 0],   { extrapolateRight: "clamp" });
  const floatY        = Math.sin((frame / 50) + x * 0.001) * 6;

  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 20 }}>
      {/* Ripple ring */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${BRAND.primary || "#6366f1"}`,
        transform: `translate(-50%, -50%) scale(${rippleScale})`,
        opacity: rippleOpacity,
      }} />
      {/* Avatar */}
      <div style={{
        width: size, height: size,
        transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
        borderRadius: "50%",
        background: "white",
        padding: 8,
        boxShadow: "0 30px 60px rgba(0,0,0,0.12), 0 18px 36px rgba(0,0,0,0.08)",
      }}>
        {src ? (
          <img src={src} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", borderRadius: "50%",
            backgroundColor: BRAND.primary || "#6366f1",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.38, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif",
          }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
```

**Rule**: Always guard `ATTACHED_IMAGES[i]` with `?? null` — use colored initial fallback when no image is provided.

---

## Light Background Variant

```tsx
<AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
  <div style={{
    position: "absolute",
    left: width * 0.2, top: height * 0.3,
    width: 1000, height: 1000, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(241,245,249,0.8) 0%, transparent 60%)",
    filter: "blur(60px)",
    transform: `translate(-50%, -50%) translateY(${Math.sin(frame * 0.01) * 30}px)`,
  }} />
  <div style={{
    position: "absolute",
    left: width * 0.8, top: height * 0.7,
    width: 1000, height: 1000, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(237,233,254,0.6) 0%, transparent 60%)",
    filter: "blur(60px)",
    transform: `translate(-50%, -50%) translateY(${Math.cos(frame * 0.01) * 20}px)`,
  }} />
</AbsoluteFill>
```

---

## Anti-Patterns

- **NEVER animate SVG lines with basic opacity.** It looks like a cheap crossfade. Use `strokeDasharray` + `strokeDashoffset` math to physically draw the line from center outward.
- **NEVER draw straight rigid lines** (`<line x1="..." y1="..." />`). Use `<path d="M... Q... " />` (Quadratic Bezier) for organic curves.
- **NEVER randomly position nodes.** Use `SATELLITE_SLOTS` to guarantee balanced 3D depth-of-field (mixing large/blurred foreground nodes with small/sharp background nodes).
- **NEVER start all animations on frame 0.** Follow the strict 3-beat rhythm: Hub pop → Nodes pop → Lines draw.
- **NEVER skip the hub pulse.** `Math.sin((frame-30)*0.1)` mapped to `[0.95, 1.05]` is the signal that the hub is "live" and the network is active.

---

## Quality Checklist

- [ ] Central hub node has ambient pulse effect (`Math.sin` mapped to `[0.95, 1.05]`)
- [ ] Nodes mapped via `SATELLITE_SLOTS` for 3D scale/blur depth variation
- [ ] Connection paths use `<path d="M... Q...">` (Bezier), not `<line>`
- [ ] Lines use `strokeDashoffset` animated from `PATH_LENGTH→0` (not opacity)
- [ ] Strict 3-beat sequence: Hub(f:5) → Nodes(f:15+i*3) → Lines(f:25+i*4)
- [ ] Scene wrapped in continuous zoom wrapper (`1.0→1.05` over 150f)
- [ ] Hub fallback renders brand initial when no `centerLogo` image provided

---

## premium-notification-scatter

> Source: `src/skills/premium-notification-scatter.md`

# Notification Card Scatter

> Pretaa-style scene — 4-6 white notification cards floating on dark background with staggered spring entrance. Perfect for CRM, workflow, and notification-heavy SaaS products.

## When to Use
- Showcase scenes for CRM/workflow/notification products
- Demonstrating notification feed, activity stream, or event tracking
- Trust/social-proof scenes showing real-time product activity
- Dark background scenes needing floating white card composition

## Components Available
- `NotificationCard` — pre-built in scope (white card with category, message, avatar, timestamp)
- `useVitality("float")` — gentle floating animation per card

## Layout Patterns

### Diagonal Cascade (Top-Left to Bottom-Right)
```jsx
const CARDS = [
  { category: "Pipeline", message: "New deal added: Acme Corp $50K", avatar: "🏢", categoryColor: "#6366f1", x: 120, y: 80 },
  { category: "Contact", message: "Sarah updated her email address", avatar: "👤", categoryColor: "#f59e0b", x: 380, y: 220 },
  { category: "Rating", message: "Customer satisfaction: 4.8/5.0", avatar: "⭐", categoryColor: "#22c55e", x: 640, y: 360 },
  { category: "Onboarding", message: "3 new users completed setup", avatar: "🚀", categoryColor: "#8b5cf6", x: 900, y: 500 },
  { category: "News", message: "Competitor raised Series B funding", avatar: "📰", categoryColor: "#ef4444", x: 1160, y: 640 },
];
```

### Centered Cluster with Radial Scatter
```jsx
// Cards emanate from center
const centerX = 960, centerY = 540;
const POSITIONS = [
  { x: centerX - 400, y: centerY - 250 },
  { x: centerX + 200, y: centerY - 280 },
  { x: centerX - 300, y: centerY + 50 },
  { x: centerX + 300, y: centerY + 20 },
  { x: centerX - 100, y: centerY + 280 },
  { x: centerX + 450, y: centerY + 250 },
];
```

## Usage Pattern

```jsx
const SceneComponent = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0f172a" }}>
      {/* Dark gradient overlay for depth */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08), transparent 70%)",
      }} />

      {CARDS.map((card, i) => (
        <NotificationCard
          key={i}
          category={card.category}
          message={card.message}
          avatar={card.avatar}
          categoryColor={card.categoryColor}
          timestamp="2m ago"
          index={i}
          startFrame={20}
          brand={BRAND}
          x={card.x}
          y={card.y}
        />
      ))}
    </AbsoluteFill>
  );
};
```

## Composition Rules

1. Use 4-6 cards maximum — more gets cluttered
2. Cards stagger 8 frames apart (built into NotificationCard `index` prop)
3. Each card should have a DIFFERENT `categoryColor` — visual variety
4. Always include an avatar emoji or initial for each card
5. Use dark background (#0f172a or brand.bg for dark themes)
6. Add a subtle radial gradient glow at center for depth
7. Keep message text SHORT (under 40 characters) — cards are small
8. Category names should be UPPERCASE, short (1-2 words)

## Recommended Categories
CRM: Pipeline, Contact, Rating, Onboarding, News, Revenue, Support
Workflow: Task, Alert, Update, Review, Deploy, Merge, Release
Notification: Email, Mention, Comment, Invite, Share, Reminder

---

## premium-notification-toast

> Source: `src/skills/premium-notification-toast.md`

# premium-notification-toast

## When to Use
Use when a cursor interaction should trigger a visible result — e.g., clicking "Resolve" shows "Ticket Resolved", clicking "Save" shows "Settings Saved". Slides in from the right side of the screen.

## Component
```tsx
<NotificationToast
  icon="✅"
  title="Ticket Resolved"
  body="Support ticket #1234 has been closed"
  brand={BRAND}
  startFrame={80}  // appears ~15 frames after cursor clicks at frame ~65
  duration={90}
/>
```

## Timing Rules
- `startFrame` should be ~15 frames AFTER the cursor click event
- `duration`: 90 frames default (3 seconds), then auto-fades out
- Position: fixed top-right of the screen, above the product UI (zIndex: 100)
- Multiple toasts: stagger startFrames by 30 frames

## Props
- `icon`: emoji (e.g., "✅", "📋", "🔔")
- `title`: main notification text
- `body`: optional secondary line
- `startFrame`: when it appears
- `duration`: how long it stays visible before auto-fading (default 90)

## Examples
- After form submit: `icon="✅" title="Settings Saved" body="Your changes have been applied"`
- After resolve click: `icon="✅" title="Ticket Resolved" body="Ticket #1234 closed"`
- After invite: `icon="📧" title="Invitation Sent" body="Team member added"`

---

## premium-person-cards

> Source: `src/skills/premium-person-cards.md`

# premium-person-cards

## When to use
- Problem scenes showing disconnected teams or persona types
- "Meet the team" or "who it's for" scenes
- Social proof with named faces
- Customer journey milestone cards with headshots

## Components in scope (do NOT redeclare)
- `PersonCard` — real headshot photo card with role badge
- `STOCK_AVATARS` — array of 8 real headshot photo URLs (indices 0–7)

## PersonCard props
```tsx
PersonCard({
  photoIndex: number,     // 0–7, maps to STOCK_AVATARS[photoIndex]
  name?: string,          // Person name displayed below photo
  role?: string,          // Role shown in brand-color pill badge
  accentColor?: string,   // Override for badge + ring color (defaults to BRAND.primary)
  startFrame?: number,    // When this card springs in (stagger per card)
  brand?: object,         // BRAND object for font/color tokens
  size?: number,          // Avatar diameter in px (default 80)
})
```

## Pattern: Problem scene with 3 disconnected personas
```tsx
const PERSONAS = [
  { name: "Sarah", role: "Account Manager", photoIndex: 1 },
  { name: "James", role: "Sales Lead", photoIndex: 4 },
  { name: "Maria", role: "CS Team", photoIndex: 5 },
];

<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>
  {PERSONAS.map((p, i) => (
    <PersonCard
      key={i}
      photoIndex={p.photoIndex}
      name={p.name}
      role={p.role}
      brand={BRAND}
      startFrame={useStagger(i, 20, 10)}
    />
  ))}
</AbsoluteFill>
```

## Pattern: "Frustrated user" — single large PersonCard with GarbledText
```tsx
<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 32 }}>
  <PersonCard photoIndex={2} name="Alex Chen" role="Operations Lead" brand={BRAND} size={120} startFrame={15} />
  {/* Garbled/confusing data they're receiving */}
  <div style={{ fontSize: 36, fontFamily: "monospace", color: BRAND.primary }}>
    <GarbledText finalText="Q3 Revenue Report" resolveFrame={180} startFrame={30} scrambleStrength={0.9} style={{ fontSize: 36 }} />
  </div>
</AbsoluteFill>
```

## Pattern: Team orbit scene (5 personas around central product)
```tsx
// Use premium-team-orbit skill for the full orbit pattern
// Use PersonCard for individual avatar cards that pop in sequentially

const TEAM = [
  { photoIndex: 0, name: "CEO", role: "Exec Sponsor", angle: 0 },
  { photoIndex: 1, name: "Sales", role: "RevOps", angle: 72 },
  { photoIndex: 3, name: "CS", role: "Support", angle: 144 },
  { photoIndex: 5, name: "Product", role: "PM", angle: 216 },
  { photoIndex: 7, name: "Ops", role: "Admin", angle: 288 },
];

{TEAM.map((m, i) => {
  const rad = (m.angle * Math.PI) / 180;
  const orbitR = 320;
  const cx = 960 + orbitR * Math.cos(rad);
  const cy = 540 + orbitR * Math.sin(rad);
  return (
    <div key={i} style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)" }}>
      <PersonCard photoIndex={m.photoIndex} name={m.name} role={m.role} brand={BRAND} startFrame={useStagger(i, 15, 8)} size={64} />
    </div>
  );
})}
```

## GarbledText companion
`GarbledText` renders scrambled characters that resolve to the final text at `resolveFrame`.
Use for problem scenes where data/communication is broken or confusing.

Props:
- `finalText` — the string to resolve to
- `resolveFrame` — frame when characters start resolving (left to right over 20f)
- `scrambleStrength` — 0–1 (0.8 = mostly garbled, 0.3 = mostly readable)
- `startFrame` — frame when garbling begins
- `style` — React CSSProperties applied to the span

---

## premium-phone-notification

> Source: `src/skills/premium-phone-notification.md`

# premium-phone-notification

## WHAT IT IS
An iOS-style push notification that slides down from the top of the frame, hovers for ~60 frames, then slides back up. The notification pill has: a rounded-square product icon (borderRadius 12, BRAND.primary background with white emoji icon inside), app name label, bold notification title, and a body text line. Creates instant product recognition and a "real-world moment" that grounds the demo.

## WHEN TO USE
- Mobile SaaS, consumer apps, HR tools, notification-heavy products
- Any scene needing a "real-time event" moment (new lead, approval, task complete, mention)
- Works as an OVERLAY on top of any device/cursor scene (z:500) OR as a standalone 3-second SOLO scene
- Pairs with premium-cursor-engine or premium-device-mockup as an overlay element
- Especially effective for CRM (new lead), HR (offer accepted), project mgmt (@mention), analytics (alert)

## NOTIFICATION ANATOMY
```
┌──────────────────────────────────────────┐
│ [ICON]  APP NAME              now         │
│         Notification Title Bold           │
│         Body text single line truncated   │
└──────────────────────────────────────────┘
```
- Container: width 340px, borderRadius 22px, height 78px, padding "0 16px"
- Background DARK: "rgba(28,28,30,0.88)" + backdropFilter "blur(40px) saturate(180%)"
- Background LIGHT: "rgba(255,255,255,0.88)" + backdropFilter "blur(40px) saturate(180%)"
- boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)"
- Icon: 44x44px square, borderRadius 12, background BRAND.primary, centered white emoji 28px
- App name: 11px, fontWeight 600, color "rgba(255,255,255,0.5)" (dark) or "rgba(0,0,0,0.45)" (light)
- Title: 15px, fontWeight 600, white (dark) or "#1c1c1e" (light)
- Body: 13px, fontWeight 400, "rgba(255,255,255,0.6)" (dark) or "rgba(0,0,0,0.5)" (light), overflow "hidden", textOverflow "ellipsis", whiteSpace "nowrap"
- Time: "now", 11px, textMuted, position absolute top-right

## ANIMATION TIMING
```tsx
const ENTER_END = 18;
const HOLD_END = 80;
const EXIT_START = 80;

const slideY = (() => {
  if (frame <= ENTER_END) {
    const p = spring({ frame, fps, config: SPRING_CONFIGS.entrance });
    return interpolate(p, [0, 1], [-110, 20], { extrapolateRight: "clamp" });
  }
  if (frame <= HOLD_END) {
    return 20 + Math.sin(frame * 0.08) * 1.5; // micro-float
  }
  const exitFrame = frame - EXIT_START;
  const p = spring({ frame: exitFrame, fps, config: { damping: 200, stiffness: 200 } });
  return interpolate(p, [0, 1], [20, -110], { extrapolateRight: "clamp" });
})();
```

## POSITION
- Centered horizontally: position "absolute", left "50%", transform `translateX(-50%) translateY(${slideY}px)`
- Top: 28px (simulates iOS notification drop zone below Dynamic Island)
- zIndex: 500 (overlay mode) or 10 (solo mode)

## CONTENT — MAKE IT PRODUCT-SPECIFIC
The notification content must match the product being shown:
- CRM: title "New lead: Acme Corp → $45K", body "Sarah Johnson requested a demo"
- HR: title "Offer accepted!", body "Alex Chen starts Monday, March 15"
- Analytics: title "Conversion drop detected", body "Checkout funnel −12% in last hour"
- Project mgmt: title "Mentioned in Design Review", body "@you can you check the mockup?"
- E-commerce: title "New order #4821", body "Nike Air Max × 2 — $240.00"
- Support: title "High priority ticket", body "Enterprise client: 'system is down'"

## VARIANTS

### SOLO MODE (dedicated 3-second scene, 90 frames)
Full-screen background (BRAND.bg or dark gradient), notification centered, appears at f:0, dismisses at f:70.
Add subtle radial glow behind notification: BRAND.primary at 8% opacity, 300px radius.

### OVERLAY MODE (stacked on existing scene)
zIndex 500 overlay. Configure `entryFrame` prop to trigger at specific moment:
```tsx
// Offset all frame calculations: frame - entryFrame
const notifFrame = Math.max(0, frame - 60); // enters at f:60
```

### STACKED (2 notifications)
Second notification appears at f:30, translateY = firstNotif.y + 88px.
Both visible until f:60 when first exits, second exits at f:90.

## PAIRING RULES
- OVERLAY MODE: place over premium-device-mockup or premium-saas-showcase
- Time the entry 10–15 frames AFTER the main scene's key interaction (adds realism — the action triggered the notification)
- SOLO MODE works great as a transition beat between showcase and social-proof scenes
- Pair with SfxSequencer event: sfx "pop" at the entry frame for tactile feel

---

## premium-real-photo-device

> Source: `src/skills/premium-real-photo-device.md`

---
title: Premium Real Photo + Device Mockup
impact: HIGH
impactDescription: photorealistic product-in-context scene — real environment photo fills the background, a portrait tablet or phone mockup floats centered with the product UI inside, ultra-realistic "product in the wild" feel
tags: real photo, device mockup, tablet, phone, product-in-context, social proof, realism, background photo, desklog
---

## Real Photo + Device Pattern

A real environment photo (office, dealership, home, clinic — whatever matches the product's context) fills the entire background. A white-framed portrait tablet or phone mockup is centered, containing the product UI screenshot. The mockup has a realistic shadow and slight scale entrance. The combination feels like a real product photograph rather than a generated animation.

**Typical use case**: Social proof or showcase scenes where you want to show "the product in someone's hands" or "in the real world". Especially powerful for B2B vertical products (auto dealerships, healthcare, hospitality).

---

## Full-Bleed Environment Photo Background

```tsx
const { width, height } = useVideoConfig();
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Background: very slow zoom out (Ken Burns effect in reverse — starts slightly cropped, pulls back)
const bgScale = interpolate(frame, [0, 240], [1.06, 1.0]);

<AbsoluteFill style={{ overflow: "hidden" }}>
  {ATTACHED_IMAGES[0] ? (
    <img
      src={ATTACHED_IMAGES[0]}
      style={{
        width: "100%", height: "100%",
        objectFit: "cover",
        objectPosition: "center center",
        transform: `scale(${bgScale})`,
        transformOrigin: "center center",
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}
    />
  ) : (
    // Fallback: realistic-looking gradient suggesting an interior space
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(160deg, #c8b89a 0%, #8a7560 40%, #5c4a36 100%)",
    }} />
  )}

  {/* Subtle darkening vignette — draws eye to center device */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)",
  }} />
</AbsoluteFill>
```

---

## Portrait Tablet Mockup

A white-framed portrait tablet centered on the canvas. Dimensions mimic a real iPad (roughly 3:4 ratio):

```tsx
// Mockup dimensions (portrait tablet)
const TABLET_W = 380;  // px
const TABLET_H = 520;  // px
const BEZEL    = 18;   // px — frame thickness
const RADIUS   = 24;   // border radius of frame

// Entrance spring
const MOCKUP_DELAY = 10;
const mockupSpring = spring({
  frame: frame - MOCKUP_DELAY,
  fps,
  config: { stiffness: 90, damping: 18, mass: 1.2 },
});
const mockupScale = interpolate(mockupSpring, [0, 1], [0.85, 1]);
const mockupY     = interpolate(mockupSpring, [0, 1], [30, 0]);

// Slow ambient float
const floatY = Math.sin(frame * 0.025) * 8;

<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: `translate(-50%, -50%) scale(${mockupScale}) translateY(${mockupY + floatY}px)`,
  zIndex: 20,
}}>
  {/* Outer frame — white device body */}
  <div style={{
    width: TABLET_W,
    height: TABLET_H,
    borderRadius: RADIUS,
    backgroundColor: "#f0f0f0",
    boxShadow: `
      0 60px 120px rgba(0,0,0,0.45),
      0 25px 50px rgba(0,0,0,0.30),
      0 8px 20px rgba(0,0,0,0.20),
      inset 0 1px 0 rgba(255,255,255,0.8),
      inset 0 -2px 4px rgba(0,0,0,0.12)
    `,
    padding: BEZEL,
    position: "relative",
    overflow: "hidden",
  }}>
    {/* Camera notch at top center */}
    <div style={{
      position: "absolute",
      top: 8, left: "50%",
      transform: "translateX(-50%)",
      width: 10, height: 10,
      borderRadius: "50%",
      backgroundColor: "#d0d0d0",
      zIndex: 5,
    }} />

    {/* Screen area */}
    <div style={{
      width: "100%", height: "100%",
      borderRadius: RADIUS - BEZEL,
      overflow: "hidden",
      backgroundColor: "#1a1a2e",
      position: "relative",
    }}>
      {/* Product UI screenshot on screen */}
      {ATTACHED_IMAGES[1] ? (
        <img
          src={ATTACHED_IMAGES[1]}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition: "top left",
          }}
        />
      ) : (
        // Fallback: product-like UI color
        <div style={{
          width: "100%", height: "100%",
          background: `linear-gradient(160deg, ${BRAND.primary || "#6366f1"}22 0%, #0f172a 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 24, fontWeight: 700, color: "white",
            fontFamily: "Inter, sans-serif",
            opacity: 0.4,
          }}>
            {BRAND.name || "Product"}
          </span>
        </div>
      )}

      {/* Screen reflection sheen — glassy top-left highlight */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%)",
        borderRadius: RADIUS - BEZEL,
        pointerEvents: "none",
      }} />
    </div>
  </div>
</div>
```

---

## Phone Mockup Variant (Narrower, Portrait)

For consumer apps — a slimmer portrait phone shape:

```tsx
const PHONE_W = 260;
const PHONE_H = 520;
const BEZEL   = 14;
const RADIUS  = 36;

{/* Side buttons */}
<div style={{
  position: "absolute",
  left: -4, top: PHONE_H * 0.28,
  width: 4, height: 40,
  borderRadius: "2px 0 0 2px",
  backgroundColor: "#d8d8d8",
}} />
<div style={{
  position: "absolute",
  right: -4, top: PHONE_H * 0.35,
  width: 4, height: 60,
  borderRadius: "0 2px 2px 0",
  backgroundColor: "#d8d8d8",
}} />
```

---

## Floating Brand Label (Optional)

A small label above the device that pops in after the mockup:

```tsx
const LABEL_DELAY = 35;
const labelSpring = spring({
  frame: frame - LABEL_DELAY,
  fps,
  config: { damping: 18, stiffness: 160 },
});

<div style={{
  position: "absolute",
  left: "50%",
  top: `calc(50% - ${TABLET_H / 2 + 50}px)`,
  transform: `translateX(-50%) scale(${labelSpring}) translateY(${(1 - labelSpring) * -10}px)`,
  opacity: labelSpring,
  display: "flex", alignItems: "center", gap: 10,
  zIndex: 25,
}}>
  <div style={{
    backgroundColor: "white",
    borderRadius: 9999,
    padding: "8px 20px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.20)",
    display: "flex", alignItems: "center", gap: 8,
    fontFamily: "Inter, sans-serif",
  }}>
    <div style={{
      width: 24, height: 24,
      borderRadius: "30%",
      backgroundColor: BRAND.primary || "#6366f1",
    }} />
    <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
      {BRAND.name || "Product"}
    </span>
  </div>
</div>
```

---

## Image Assignment

```tsx
// ATTACHED_IMAGES[0] = real environment/context photo (office, showroom, clinic, etc.)
// ATTACHED_IMAGES[1] = product UI screenshot to display on the device screen
//
// If only one image provided:
// - Use ATTACHED_IMAGES[0] as both background AND device screen (different objectPosition)
//   Background: objectPosition "center center"
//   Device screen: objectPosition "top left" — shows the UI, not the blurry background
```

---

## Usage Notes

- The three-layer box-shadow on the tablet creates realism: far shadow (depth), mid shadow (elevation), close shadow (contact). Use real values, not a single `0 30px 60px` shortcut
- `inset 0 1px 0 rgba(255,255,255,0.8)` creates a top-edge highlight — simulates the device's chamfered edge catching light
- Ken Burns slow zoom: `scale(1.06 → 1.0)` over the scene duration keeps the background alive without distracting from the device
- The vignette radial gradient (`rgba(0,0,0,0.35)` at edges) darkens the photo perimeter and naturally draws the eye to the centered device
- `floatY = Math.sin(frame * 0.025) * 8` is a very slow float — barely perceptible but adds life
- For dark device variants (Space Gray iPad, black phone): change `backgroundColor: "#f0f0f0"` to `"#2a2a2a"` and `inset 0 1px 0 rgba(255,255,255,0.8)` to `rgba(255,255,255,0.15)`

---

## premium-reconstructed-ui

> Source: `src/skills/premium-reconstructed-ui.md`

---
title: Premium Reconstructed UI
impact: HIGH
impactDescription: Builds stylized, staggered, and physically layered UI replicas that animate into existence piece-by-piece within a 40/60 split.
tags: ui, app-window, cascade, micro-stagger, glassmorphism, isometric, dashboard, 40-60-split, sidebar, table
qualityBar: The UI feels like a tangible, layered physical object occupying the right 60% of the screen. It arrives as a blank glass shell, and its internal components cascade into place with high-speed micro-staggers. It utilizes deep shadows and subtle borders to separate it from the cinematic background.
---

## Scene Purpose

To abstract and simplify a complex software interface so the viewer focuses *only* on the value proposition. Instead of showing a cluttered real screenshot, we build a clean, stylized replica of the UI that animates beautifully and guides the eye — paired with authoritative contextual text.

## Visual Blueprint

```text
[      Cinematic Camera Wrapper (1.0 -> 1.05 Zoom)              ]
[                                                               ]
[   (Left 40%: The 3-Layer Stack)    (Right 60%: Isometric UI)  ]
[                                                               ]
[   A U T O M A T E D                     . . .                 ]
[                                    +------------------------+ ]
[   Workflows that                   | [Sidebar]   [Header]   | ]
[   build themselves.                |             [Row 1]    | ]
[                                    |             [Row 2]    | ]
[   Connect your data and            |             [Row 3]    | ]
[   let the engine run.              +------------------------+ ]
[                                                               ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const ReconstructedUIScene = ({ BRAND, textStack }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. TIMING CONSTANTS (The Cascade)
  const TEXT_START    = 5;
  const BASE_START    = 15;
  const SIDEBAR_START = 22;
  const HEADER_START  = 26;
  const ROW_START     = 30;

  // 2. SPRINGS — Strict Premium Weights across ALL elements
  // stiffness:140 + damping:16 = snappy but highly controlled
  const labelSpring    = spring({ frame: frame - TEXT_START,        fps, config: { damping: 16, stiffness: 140 } });
  const headlineSpring = spring({ frame: frame - (TEXT_START + 5),  fps, config: { damping: 16, stiffness: 140 } });
  const sublineSpring  = spring({ frame: frame - (TEXT_START + 12), fps, config: { damping: 16, stiffness: 140 } });

  const baseSpring    = spring({ frame: frame - BASE_START,    fps, config: { damping: 16, stiffness: 140 } });
  const sidebarSpring = spring({ frame: frame - SIDEBAR_START, fps, config: { damping: 16, stiffness: 140 } });
  const headerSpring  = spring({ frame: frame - HEADER_START,  fps, config: { damping: 16, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* GLOBAL CINEMATIC ZOOM */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${interpolate(frame, [0, 150], [1.0, 1.05])})`,
        display: "flex", width: "100%", height: "100%",
      }}>

        {/* LEFT 40%: TEXT STACK */}
        <div style={{ width: "40%", paddingLeft: "8%", display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 20 }}>
          {/* Section Label */}
          <div style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase",
              color: BRAND.primary || "#6366f1", fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(labelSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.label}
            </div>
          </div>
          {/* Hero Headline */}
          <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: 24 }}>
            <div style={{
              fontSize: 80, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#ffffff",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(headlineSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.headline}
            </div>
          </div>
          {/* Sub-line */}
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontSize: 24, fontWeight: 400, lineHeight: 1.5, color: "#94a3b8",
              maxWidth: "90%", fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(sublineSpring, [0, 1], [100, 0])}%)`,
              opacity: sublineSpring,
            }}>
              {textStack.subline}
            </div>
          </div>
        </div>

        {/* RIGHT 60%: RECONSTRUCTED UI CASCADE */}
        <div style={{ width: "60%", display: "flex", alignItems: "center", paddingLeft: "5%", perspective: 1200 }}>

          {/* Base Window Shell — tilted for 3D presence */}
          <div style={{
            width: "110%", height: "70%", // Bleeds off right edge
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(24px)",
            borderRadius: 16,
            border: "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.02)",
            transformStyle: "preserve-3d",
            transform: `
              rotateY(-8deg) rotateX(2deg)
              translateY(${interpolate(baseSpring, [0, 1], [60, 0])}px)
              scale(${interpolate(baseSpring, [0, 1], [0.95, 1])})
            `,
            opacity: baseSpring,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>

            {/* WINDOW CHROME — macOS dots */}
            <div style={{
              height: 40, background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex", alignItems: "center",
              padding: "0 16px", gap: 6, flexShrink: 0,
            }}>
              {["#f87171", "#fbbf24", "#34d399"].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

              {/* SIDEBAR — slides in from left */}
              <div style={{
                width: 200, background: "#f1f5f9",
                borderRight: "1px solid #e2e8f0",
                padding: 20, flexShrink: 0,
                transform: `translateX(${interpolate(sidebarSpring, [0, 1], [-20, 0])}px)`,
                opacity: sidebarSpring,
              }}>
                {/* Active nav item */}
                <div style={{ width: "100%", height: 32, borderRadius: 6, background: BRAND.primary || "#6366f1", marginBottom: 8, opacity: 0.9 }} />
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: "100%", height: 24, borderRadius: 4, background: "#cbd5e1", marginBottom: 8, opacity: 0.5 }} />
                ))}
              </div>

              {/* MAIN CONTENT AREA */}
              <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column" }}>

                {/* HEADER ROW — drops in from top */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 28,
                  transform: `translateY(${interpolate(headerSpring, [0, 1], [-12, 0])}px)`,
                  opacity: headerSpring,
                }}>
                  <div style={{ width: 180, height: 28, borderRadius: 6, background: "#94a3b8" }} />
                  <div style={{ width: 100, height: 32, borderRadius: 8, background: BRAND.primary || "#6366f1" }} />
                </div>

                {/* CASCADING TABLE ROWS — 3-frame stagger */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[0, 1, 2].map((i) => {
                    const rowSpring = spring({
                      frame: frame - (ROW_START + i * 3),
                      fps,
                      config: { damping: 16, stiffness: 140 },
                    });
                    return (
                      <div key={i} style={{
                        height: 60, background: "#ffffff",
                        border: "1px solid #e2e8f0", borderRadius: 8,
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                        transform: `translateY(${interpolate(rowSpring, [0, 1], [20, 0])}px)`,
                        opacity: rowSpring,
                        display: "flex", alignItems: "center", padding: "0 16px", gap: 14,
                      }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#cbd5e1", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ width: "40%", height: 11, borderRadius: 2, background: "#94a3b8", marginBottom: 6 }} />
                          <div style={{ width: "25%", height: 9,  borderRadius: 2, background: "#cbd5e1" }} />
                        </div>
                        {/* Status pill */}
                        <div style={{ width: 60, height: 22, borderRadius: 99, background: `${BRAND.primary || "#6366f1"}22` }} />
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};
```

---

## Spring / Timing Reference

| Element | Start Frame | Config | Description |
|---|---|---|---|
| Section label | `5` | `stiff:140, damp:16` | MaskedReveal translateY |
| Headline | `10` | `stiff:140, damp:16` | MaskedReveal translateY |
| Subline | `17` | `stiff:140, damp:16` | MaskedReveal translateY |
| Base shell | `15` | `stiff:140, damp:16` | Rise + scale from bottom |
| Sidebar | `22` | `stiff:140, damp:16` | Slide from left |
| Header row | `26` | `stiff:140, damp:16` | Drop from top |
| Table rows | `30 + i*3` | `stiff:140, damp:16` | 3-frame cascade up |

**Rule**: Every animation in a reconstructed UI scene uses `{ stiffness: 140, damping: 16 }`. Consistency makes the cascade feel like one choreographed system, not a bag of parts.

---

## "Come Alive" Crossfade Variant

For transitions from skeleton → populated UI (e.g., loading state → data arrives):

```tsx
const SKELETON_FRAMES = 45;  // Skeleton shows for 45 frames
const ALIVE_START = 50;      // Real content fades in at frame 50

const skeletonOpacity = interpolate(frame, [SKELETON_FRAMES, ALIVE_START], [1, 0], { extrapolateRight: "clamp" });
const aliveOpacity    = interpolate(frame, [SKELETON_FRAMES, ALIVE_START], [0, 1], { extrapolateLeft: "clamp" });

{/* Skeleton layer */}
<div style={{ position: "absolute", inset: 0, opacity: skeletonOpacity }}>
  {/* Skeleton rows — gray placeholder bars */}
  {[0, 1, 2].map(i => (
    <div key={i} style={{ height: 60, background: "#f1f5f9", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
    </div>
  ))}
</div>

{/* Live data layer */}
<div style={{ position: "absolute", inset: 0, opacity: aliveOpacity }}>
  {/* Actual content */}
</div>
```

---

## Anti-Patterns

- **NEVER center the reconstructed UI without a text stack.** Use the 40/60 split to contextualize what the UI is doing.
- **NEVER fade the entire UI in at once.** Always use the Cascade Build (Base → Sidebar → Header → Rows with 3-frame stagger between rows).
- **NEVER use pure flat colors without borders or window chrome.** Without macOS dots + divider lines, the UI looks like a flat vector drawing instead of an application.
- **NEVER use inconsistent spring configs.** Every element must use `{ stiffness: 140, damping: 16 }` — mixing configs makes the cascade feel chaotic.
- **NEVER make the window fit perfectly inside the 60% column.** Set width to `110%` to bleed off the right edge, implying scale.

---

## Quality Checklist

- [ ] Scene wrapped in slow cinematic zoom (`1.0→1.05` over 150f)
- [ ] Follows 40/60 split with 3-Layer Text Stack on the left
- [ ] All animations use `{ stiffness: 140, damping: 16 }` uniformly
- [ ] Base shell has `rotateY(-8deg) rotateX(2deg)` — breaks the 2D plane
- [ ] Window chrome (3 macOS dots + title bar) present
- [ ] Sidebar slides from `translateX(-20px)`, header drops from `translateY(-12px)`
- [ ] Table rows use 3-frame stagger (`ROW_START + i * 3`)
- [ ] Window width is `110%` to bleed off right edge

---

## premium-responsive-viewport

> Source: `src/skills/premium-responsive-viewport.md`

---
title: Premium Responsive Viewport Switcher
impact: HIGH
impactDescription: simulates the device-switcher toolbar inside a browser frame — cursor clicks desktop/tablet/phone icons and the content area smoothly reflows to show each responsive breakpoint
tags: responsive, device-switcher, browser, viewport, mobile, tablet, product-demo, ui-walkthrough
---

## Responsive Viewport Pattern

Shows a product's responsiveness by switching the browser viewport between desktop, tablet, and mobile views — each triggered by a cursor click on device icons in a bottom toolbar. The content area smoothly transitions width, simulating a real browser's responsive design mode.

This is the exact pattern used in Fronter's showcase scene (showcase1–15): full browser frame + bottom toolbar with device icons + cursor clicks to switch views.

---

## Core Data Setup

```tsx
const VIEWPORT_STEPS = [
  { device: "desktop", widthFraction: 1.00, startFrame: 0,   label: "Desktop",  icon: "desktop"  },
  { device: "tablet",  widthFraction: 0.60, startFrame: 60,  label: "Tablet",   icon: "tablet"   },
  { device: "mobile",  widthFraction: 0.42, startFrame: 120, label: "Mobile",   icon: "mobile"   },
];

// Toolbar device icon click positions (fractions of video width)
// These align with the device icons in the bottom bar
const DEVICE_ICON_POSITIONS = {
  desktop: 0.48,
  tablet:  0.53,
  mobile:  0.57,
};
```

---

## Viewport Width Interpolation

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

const stepIndex   = VIEWPORT_STEPS.findLastIndex((s) => frame >= s.startFrame);
const currentStep = VIEWPORT_STEPS[Math.max(0, stepIndex)];
const prevStep    = VIEWPORT_STEPS[Math.max(0, stepIndex - 1)];

const transitionProgress = spring({
  frame: frame - currentStep.startFrame,
  fps,
  config: { damping: 24, stiffness: 130 },
  durationInFrames: 30,
});

// Interpolate content area width
const contentWidthFraction = interpolate(
  transitionProgress,
  [0, 1],
  [prevStep.widthFraction, currentStep.widthFraction],
);
const contentWidth = contentWidthFraction * width;
```

---

## Full Scene Component

```tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from "remotion";

const VIEWPORT_STEPS = [
  { device: "desktop", widthFraction: 1.00, startFrame: 0   },
  { device: "tablet",  widthFraction: 0.60, startFrame: 60  },
  { device: "mobile",  widthFraction: 0.42, startFrame: 120 },
];

// Cursor click positions for the device icons in the bottom toolbar
const CURSOR_STEPS = [
  { x: 0.50, y: 0.94, time: 50,  action: "click" }, // click tablet icon
  { x: 0.55, y: 0.94, time: 110, action: "click" }, // click mobile icon
  { x: 0.50, y: 0.50, time: 160, action: "none"  }, // settle
];

export const ResponsiveViewportScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // --- Viewport state ---
  const vStep    = VIEWPORT_STEPS.findLastIndex((s) => frame >= s.startFrame);
  const vCurrent = VIEWPORT_STEPS[Math.max(0, vStep)];
  const vPrev    = VIEWPORT_STEPS[Math.max(0, vStep - 1)];

  const vProgress = spring({
    frame: frame - vCurrent.startFrame,
    fps,
    config: { damping: 24, stiffness: 130 },
    durationInFrames: 30,
  });

  const contentWidthFraction = interpolate(vProgress, [0, 1], [vPrev.widthFraction, vCurrent.widthFraction]);
  const contentWidth = contentWidthFraction * width;

  // --- Cursor state ---
  const cStep    = CURSOR_STEPS.findLastIndex((s) => frame >= s.time);
  const cCurrent = CURSOR_STEPS[Math.max(0, cStep)];
  const cPrev    = CURSOR_STEPS[Math.max(0, cStep - 1)];
  const TRAVEL   = 22;

  const cProgress = spring({
    frame: frame - cCurrent.time,
    fps,
    config: { damping: 18, stiffness: 120 },
    durationInFrames: TRAVEL,
  });

  const cursorX = interpolate(cProgress, [0, 1], [cPrev.x * width,  cCurrent.x * width]);
  const cursorY = interpolate(cProgress, [0, 1], [cPrev.y * height, cCurrent.y * height]);

  const framesAfterArrival = frame - cCurrent.time - TRAVEL;
  const isClicking = cCurrent.action === "click" && framesAfterArrival >= 0 && framesAfterArrival < 14;
  const clickScale = isClicking ? interpolate(framesAfterArrival, [0, 4, 8, 14], [1, 0.88, 0.95, 1]) : 1;
  const rippleScale   = isClicking ? interpolate(framesAfterArrival, [0, 14], [0.1, 2.4]) : 0;
  const rippleOpacity = isClicking ? interpolate(framesAfterArrival, [0, 14], [0.5, 0])   : 0;

  // --- Layout constants ---
  const CHROME_H   = height * 0.06;  // top browser bar
  const TOOLBAR_H  = height * 0.09;  // bottom device toolbar
  const CONTENT_H  = height - CHROME_H - TOOLBAR_H;
  const CONTENT_TOP = CHROME_H;

  // Blue border highlight on selected device icon
  const ICON_POSITIONS = [
    { device: "desktop", cx: width * 0.48 },
    { device: "tablet",  cx: width * 0.53 },
    { device: "mobile",  cx: width * 0.57 },
  ];

  return (
    <AbsoluteFill style={{ background: "#f1f5f9" }}>

      {/* --- Browser Chrome Bar --- */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: CHROME_H,
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", padding: "0 14px", gap: 8,
        zIndex: 50,
      }}>
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 6 }}>
          {["#ef4444", "#eab308", "#22c55e"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
          ))}
        </div>
        {/* URL bar */}
        <div style={{
          flex: 1, maxWidth: 340, height: 22, marginLeft: 10,
          background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 5,
          display: "flex", alignItems: "center", paddingLeft: 10,
          fontSize: 11, color: "#64748b", fontFamily: "Inter, sans-serif",
        }}>
          yourproduct.com
        </div>
      </div>

      {/* --- Content Area (width transitions responsively) --- */}
      <div style={{
        position: "absolute",
        top: CONTENT_TOP,
        left: "50%",
        transform: "translateX(-50%)",
        width: contentWidth,
        height: CONTENT_H,
        overflow: "hidden",
        background: "white",
        border: "2.5px solid #6366f1",
        borderBottom: "none",
        boxSizing: "border-box",
      }}>
        {/* Product screenshot fills the content area */}
        {ATTACHED_IMAGES[0] ? (
          <img
            src={ATTACHED_IMAGES[0]}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" }}
          />
        ) : (
          // Fallback: simple website layout skeleton
          <div style={{ padding: 20, fontFamily: "Inter, sans-serif", height: "100%" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 8, width: "60%", background: "#f1f5f9", borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 6, width: "80%", background: "#f8fafc", borderRadius: 4, marginBottom: 4 }} />
              <div style={{ height: 6, width: "70%", background: "#f8fafc", borderRadius: 4 }} />
            </div>
            <div style={{ height: 32, width: 100, background: BRAND.primary || "#6366f1", borderRadius: 6 }} />
          </div>
        )}

        {/* Width ruler label */}
        <div style={{
          position: "absolute",
          bottom: 6, right: 8,
          fontSize: 10, color: "#94a3b8",
          fontFamily: "Inter, sans-serif",
          background: "rgba(255,255,255,0.8)",
          padding: "2px 6px", borderRadius: 4,
        }}>
          {Math.round(contentWidthFraction * 1440)}px
        </div>
      </div>

      {/* --- Bottom Toolbar --- */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: TOOLBAR_H,
        background: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8,
        zIndex: 50,
      }}>
        {/* Left toolbar items */}
        <div style={{ position: "absolute", left: 16, display: "flex", gap: 6 }}>
          {["#e2e8f0", "#e2e8f0", "#6366f1"].map((c, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: c }} />
          ))}
        </div>

        {/* Center: device icons */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {ICON_POSITIONS.map(({ device, cx }) => {
            const isActive = vCurrent.device === device;
            const iconProg = spring({
              frame: frame - (vCurrent.startFrame),
              fps,
              config: { damping: 20, stiffness: 200 },
              durationInFrames: 15,
            });
            const activeBorder = isActive
              ? interpolate(iconProg, [0, 1], [0, 1], { extrapolateRight: "clamp" })
              : 0;

            return (
              <div key={device} style={{
                width: 32, height: 32,
                borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${isActive ? BRAND.primary || "#6366f1" : "transparent"}`,
                background: isActive ? `${BRAND.primary || "#6366f1"}10` : "transparent",
                opacity: 0.5 + activeBorder * 0.5,
                transition: "none",
              }}>
                {/* Device icon SVGs */}
                {device === "desktop" && (
                  <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                    <rect x="1" y="1" width="16" height="10" rx="2" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5"/>
                    <line x1="7" y1="11" x2="11" y2="11" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="9" y1="11" x2="9" y2="13" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {device === "tablet" && (
                  <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
                    <rect x="1" y="1" width="9" height="12" rx="2" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5"/>
                    <circle cx="5.5" cy="11.5" r="0.8" fill={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"}/>
                  </svg>
                )}
                {device === "mobile" && (
                  <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                    <rect x="0.75" y="0.75" width="6.5" height="11.5" rx="1.5" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5"/>
                    <line x1="3" y1="10.5" x2="5" y2="10.5" stroke={isActive ? BRAND.primary || "#6366f1" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: avatar stack */}
        <div style={{ position: "absolute", right: 16, display: "flex", gap: -8 }}>
          {["#6366f1", "#ec4899", "#f59e0b"].map((c, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: "50%",
              background: c, border: "2px solid white",
              marginLeft: i > 0 ? -8 : 0,
            }} />
          ))}
        </div>
      </div>

      {/* --- Hand Cursor Overlay --- */}
      <div style={{
        position: "absolute",
        left: cursorX, top: cursorY,
        transform: "translate(-22px, 0px)",
        zIndex: 100, pointerEvents: "none",
      }}>
        {/* Ripple on click */}
        <div style={{
          position: "absolute", width: 40, height: 40, borderRadius: "50%",
          border: `2px solid ${BRAND.primary || "#6366f1"}`,
          transform: `translate(-50%, -50%) scale(${rippleScale})`,
          opacity: rippleOpacity, left: 22, top: 0,
        }} />
        {/* Hand cursor SVG */}
        <svg width="44" height="54" viewBox="0 0 44 54" fill="none"
          style={{ transform: `scale(${clickScale})`, transformOrigin: "22px 0px", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.3))" }}>
          <path
            d="M 14 0 Q 14 0 14 6 L 14 26 Q 10 24 7 26 Q 4 28 4 32 L 4 40 Q 4 48 12 50 L 32 50 Q 40 48 40 40 L 40 32 Q 40 28 37 26 Q 34 24 30 26 L 30 6 Q 30 0 22 0 Q 14 0 14 0 Z"
            fill="white" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
          />
          <line x1="14" y1="26" x2="30" y2="26" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
          <line x1="10" y1="36" x2="34" y2="36" stroke="#e2e8f0" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

    </AbsoluteFill>
  );
};
```

---

## Key Formulas

| Variable | Formula | Notes |
|---|---|---|
| Content width | `interpolate(spring, [0,1], [prevFraction, curFraction]) * videoWidth` | Springs between breakpoints |
| Ruler label | `Math.round(contentWidthFraction * 1440)` | Simulates real pixel count |
| Toolbar height | `height * 0.09` | 9% of video height |
| Chrome bar | `height * 0.06` | 6% of video height |

---

## When to Use

- Any product demo where **responsiveness** or **cross-device compatibility** is a key selling point
- Web design tools (Figma, Webflow), website builders, e-commerce platforms, CMS products
- Combine with `premium-cursor-engine` for the cursor clicking device icons
- Combine with `premium-callout-bubble` to annotate a specific element after switching viewport
- **Do NOT** use for native mobile or desktop apps — only makes sense for web products

---

## premium-saas-hook

> Source: `src/skills/premium-saas-hook.md`

---
title: Premium SaaS Hook / Brand Intro
impact: HIGH
impactDescription: creates cinematic product intros with floating brand icons, device mockups, and chat overlays
tags: saas, intro, hook, floating-icons, brand, laptop, mockup, chat-bubbles, stagger
---

## Premium SaaS Intro Pattern

The highest-impact SaaS intro uses a **hero device mockup** (laptop or phone) as the anchor, with **floating brand/integration icons** orbiting it — each popping in with a spring entrance and a sinusoidal float loop. Optionally overlay chat bubbles for social proof.

### Core Structure

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// All timing constants INSIDE the component
const ICON_SPRING = { stiffness: 100, damping: 15 };
const CHAT_SPRING = { stiffness: 120, damping: 14 };
```

---

## Floating Icon Pattern

Each icon has a `delay` (frames before it appears), a `size` (px), and a fractional `x`/`y` position (0–1 mapped to width/height).

```tsx
const FLOATING_ICONS = [
  { emoji: "✉️",  x: 0.15, y: 0.25, delay: 10,  size: 80 },
  { emoji: "💬",  x: 0.18, y: 0.55, delay: 15,  size: 65 },
  { emoji: "📊",  x: 0.32, y: 0.40, delay: 20,  size: 50 },
  { emoji: "⚡",  x: 0.78, y: 0.28, delay: 35,  size: 55 },
  { emoji: "🔔",  x: 0.63, y: 0.60, delay: 55,  size: 45 },
];

{FLOATING_ICONS.map((item, i) => {
  if (frame < item.delay) return null;

  const progress = spring({
    frame: frame - item.delay,
    fps,
    config: ICON_SPRING,
  });

  const scale   = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Sinusoidal float loop — each icon moves independently
  const floatY = Math.sin((frame - item.delay) / 30) * 10;
  const floatX = Math.cos((frame - item.delay) / 40) * 5;

  return (
    <div
      key={i}
      style={{
        position: "absolute",
        left: item.x * width,
        top:  item.y * height,
        transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
        opacity,
        zIndex: 10 + i,
      }}
    >
      <div style={{
        width: item.size, height: item.size,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: item.size * 0.45,
      }}>
        {item.emoji}
      </div>
    </div>
  );
})}
```

**Key rules:**
- Use `frame - item.delay` so each icon animates from its own zero-point
- Guard with `if (frame < item.delay) return null` to prevent negative-frame springs
- Float amplitude: `±10px` vertical, `±5px` horizontal — subtle, not distracting
- Stagger delays in increments of 5–10 frames for a cascading reveal effect

---

## Browser / Laptop Screen Inset

The hero device is a background image. The screen content sits inside an absolutely-positioned inset fitted to the laptop bezel:

```tsx
{/* Screen inset — adjust percentages to match your device image */}
<div style={{
  position: "absolute",
  top: "34.5%", left: "34.5%",
  width: "27.5%", height: "30%",
  borderRadius: 5,
  overflow: "hidden",
  backgroundColor: "#ffffff",
  boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
}}>
  {/* Mini UI: navbar + hero headline + CTA */}
  <div style={{ width: "100%", height: "100%", padding: "6% 8%", fontFamily: "Inter, sans-serif" }}>
    {/* Navbar */}
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8%" }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: "#0f172a" }}>Brand</span>
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ fontSize: 6, color: "#64748b" }}>Features</span>
        <div style={{ padding: "3px 8px", background: "#4f46e5", borderRadius: 3, color: "white", fontSize: 6, fontWeight: 600 }}>Sign Up</div>
      </div>
    </div>
    {/* Hero headline */}
    <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8, letterSpacing: "-0.02em" }}>
      Your product headline here
    </h1>
    <p style={{ fontSize: 6, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>
      Supporting tagline or description text.
    </p>
    {/* CTA Button */}
    <div style={{ padding: "5px 12px", background: "#4f46e5", borderRadius: 4, color: "white", fontSize: 7, fontWeight: 600, width: "fit-content" }}>
      Get Started
    </div>
  </div>

  {/* Glare overlay for realism */}
  <div style={{
    position: "absolute", inset: 0,
    background: "linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 60%)",
    pointerEvents: "none",
  }} />
</div>
```

---

## Floating Chat Bubble Pattern

Chat bubbles reinforce the "real product in use" feeling. Keep them at 2–3 max:

```tsx
const CHAT_MESSAGES = [
  { text: "Can you update the header image?", x: 0.26, y: 0.70, delay: 60, variant: "received" },
  { text: "Sure — done in 30 seconds ✓",     x: 0.70, y: 0.40, delay: 70, variant: "sent"     },
];

{CHAT_MESSAGES.map((msg, i) => {
  if (frame < msg.delay) return null;

  const progress = spring({ frame: frame - msg.delay, fps, config: CHAT_SPRING });
  const scale    = interpolate(progress, [0, 1], [0.8, 1]);
  const opacity  = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const floatY   = Math.sin((frame - msg.delay) / 35) * 8;

  const isSent = msg.variant === "sent";
  const bg     = isSent ? "#0084ff" : "#dcf8c6";
  const color  = isSent ? "#fff"    : "#000";

  return (
    <div key={i} style={{
      position: "absolute",
      left: msg.x * width, top: msg.y * height,
      transform: `translate(-50%, -50%) translateY(${floatY}px) scale(${scale})`,
      opacity, zIndex: 20 + i,
    }}>
      <div style={{
        background: bg, color,
        padding: "12px 16px", borderRadius: 12,
        fontSize: 22, fontWeight: 500, lineHeight: 1.4,
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
        maxWidth: 700, whiteSpace: "pre-line",
        fontFamily: "Inter, sans-serif",
      }}>
        {msg.text}
      </div>
    </div>
  );
})}
```

---

## Dark Hero Background

For premium look, use a solid dark or gradient background with a slight noise/grain feel:

```tsx
<AbsoluteFill style={{
  background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
}} />
```

Or use radial orbs:

```tsx
{/* Mesh orb top-left */}
<div style={{
  position: "absolute", top: "-20%", left: "-10%",
  width: 800, height: 800,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
  filter: "blur(60px)",
}} />
{/* Mesh orb bottom-right */}
<div style={{
  position: "absolute", bottom: "-20%", right: "-10%",
  width: 700, height: 700,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)",
  filter: "blur(80px)",
}} />
```

---

## Real Photo Background Variant (Photorealistic Office)

When `ATTACHED_IMAGES` contains a real-world photo (office, desk, person), use it as the full background and composite the product screen on top. This is the exact pattern used by Fronter — real bokeh office photo + laptop with product UI + floating app icons.

```tsx
// Use ATTACHED_IMAGES[backgroundIndex] as the room photo
// Use ATTACHED_IMAGES[screenshotIndex] inside the laptop screen inset
<AbsoluteFill style={{ background: "#111" }}>
  {/* Full-frame office/environment photo */}
  {ATTACHED_IMAGES[0] && (
    <img
      src={ATTACHED_IMAGES[0]}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
    />
  )}
  {/* Slight dark vignette overlay for polish */}
  <div style={{
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
  }} />
  {/* Laptop screen inset — positioned over the laptop in the photo */}
  {/* Adjust percentages to align with the physical screen in the photo */}
  <div style={{
    position: "absolute",
    top: "22%", left: "30%",
    width: "40%", height: "34%",
    borderRadius: 4,
    overflow: "hidden",
  }}>
    {ATTACHED_IMAGES[1] ? (
      <img src={ATTACHED_IMAGES[1]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "white", padding: "8% 10%", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Your product headline</div>
        <div style={{ width: "60%", height: 6, background: "#f1f5f9", borderRadius: 3 }} />
      </div>
    )}
  </div>
  {/* Float app icons OVER the photo */}
  {/* ... FLOATING_ICONS map (see above) ... */}
</AbsoluteFill>
```

**Key rules for photo backgrounds:**
- Always add the vignette overlay — it separates floating elements from the background and grounds them
- Laptop screen inset percentages depend on the specific photo — adjust `top/left/width/height` to align with the physical screen
- Icons should float at similar depth to the laptop, not too far in front (keep `boxShadow` subtle)

---

## PNG Logo Circle Variant (App Integration Icons)

Use PNG images as icon content inside the circles instead of emoji — this is the production-quality look seen in real explainer videos (WhatsApp green logo, Skype blue logo, etc.).

```tsx
// When using real app logos from ATTACHED_IMAGES or public URLs
const INTEGRATION_ICONS = [
  { src: "https://logo.clearbit.com/whatsapp.com",  bg: "#25d366", x: 0.14, y: 0.68, delay: 8,  size: 80 },
  { src: "https://logo.clearbit.com/skype.com",     bg: "#0078d4", x: 0.50, y: 0.18, delay: 14, size: 70 },
  { src: "https://logo.clearbit.com/dropbox.com",   bg: "#0061ff", x: 0.84, y: 0.25, delay: 20, size: 72 },
  { src: "https://logo.clearbit.com/gmail.com",     bg: "#ea4335", x: 0.20, y: 0.28, delay: 26, size: 68 },
  { src: "https://logo.clearbit.com/drive.google.com", bg: "#fbbc04", x: 0.78, y: 0.70, delay: 32, size: 66 },
  { src: "https://logo.clearbit.com/slack.com",     bg: "#4a154b", x: 0.62, y: 0.78, delay: 38, size: 62 },
];

{INTEGRATION_ICONS.map((icon, i) => {
  if (frame < icon.delay) return null;
  const progress = spring({ frame: frame - icon.delay, fps, config: { stiffness: 110, damping: 14 } });
  const scale   = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  const floatY  = Math.sin((frame - icon.delay) / 28 + i * 1.2) * 9;
  const floatX  = Math.cos((frame - icon.delay) / 38 + i * 0.9) * 5;

  return (
    <div key={i} style={{
      position: "absolute",
      left: icon.x * width,
      top:  icon.y * height,
      transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
      opacity,
      zIndex: 10 + i,
    }}>
      <div style={{
        width: icon.size, height: icon.size,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 8px 28px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <img
          src={icon.src}
          style={{ width: "65%", height: "65%", objectFit: "contain" }}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
})}
```

**Note:** If logo URLs are unavailable, fall back to a colored circle with the first letter of the app name — same visual weight, no broken image.

---

## Integration Cluster Variant (Corner Group)

Instead of spreading icons across the frame, group them as a tight cluster in one corner. Used in social-proof scenes where the focus is the product screenshot on the device, not the icons themselves (Fronter social_proof1–2 style).

```tsx
// Cluster spawns from a single corner — icons fan out in a tight arc
const CLUSTER_CENTER = { x: 0.80, y: 0.75 }; // bottom-right corner
const CLUSTER_ICONS = [
  { angle: -60, radius: 0.10, delay: 0  },
  { angle: -30, radius: 0.09, delay: 6  },
  { angle:   0, radius: 0.11, delay: 12 },
  { angle:  30, radius: 0.08, delay: 18 },
  { angle:  60, radius: 0.10, delay: 24 },
  { angle:  90, radius: 0.09, delay: 30 },
];

{CLUSTER_ICONS.map((item, i) => {
  if (frame < item.delay) return null;
  const progress = spring({ frame: frame - item.delay, fps, config: { stiffness: 130, damping: 16 } });
  const scale    = interpolate(progress, [0, 1], [0, 1]);
  const opacity  = interpolate(progress, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  const radians = (item.angle * Math.PI) / 180;
  const iconX = (CLUSTER_CENTER.x + Math.cos(radians) * item.radius) * width;
  const iconY = (CLUSTER_CENTER.y + Math.sin(radians) * item.radius) * height;

  // Subtle continuous bob
  const floatY = Math.sin((frame - item.delay) / 32 + i) * 6;

  return (
    <div key={i} style={{
      position: "absolute",
      left: iconX, top: iconY,
      transform: `translate(-50%, -50%) translateY(${floatY}px) scale(${scale})`,
      opacity,
      zIndex: 20 + i,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "white",
        boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26,
      }}>
        {["🔵", "🟢", "🟡", "🔴", "🟣", "🟠"][i]}
      </div>
    </div>
  );
})}
```

---

## UPDATED STANDARDS (WhatAStory Gap Analysis 2026-03-18)

### Cluster & Anchor Composition (PRIMARY PATTERN)

Reference videos (Screenjar, Viable) use icons as **satellites** framing the product — not scattered randomly. The product device is the ANCHOR; icons orbit it at varying depths with blur to create a 3D field.

```tsx
// ANCHOR: product/device centered or slightly right of center
// SATELLITES: clustered around anchor, varying depth via blur

// OUTSIDE component — stable
const SATELLITES = [
  // { angle°, radius (0-1 of shorter dimension), size px, blur px, delay frames }
  { angle: -55, radius: 0.30, size: 88,  blur: 0,  delay: 8  },  // sharp midground
  { angle: -15, radius: 0.42, size: 110, blur: 5,  delay: 14 },  // slightly OOF foreground
  { angle:  40, radius: 0.28, size: 64,  blur: 0,  delay: 20 },  // sharp background
  { angle: 130, radius: 0.38, size: 96,  blur: 3,  delay: 28 },  // near-OOF
  { angle: 175, radius: 0.35, size: 72,  blur: 0,  delay: 36 },  // sharp
  { angle: 220, radius: 0.44, size: 118, blur: 7,  delay: 44 },  // OOF foreground (largest = closest)
];

const ANCHOR_X = width  * 0.54;  // product anchor — slightly right of center
const ANCHOR_Y = height * 0.50;

{SATELLITES.map((sat, i) => {
  if (frame < sat.delay) return null;
  const progress = spring({
    frame: frame - sat.delay, fps,
    config: { stiffness: 110, damping: 14 },
  });
  const scale   = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const rad     = (sat.angle * Math.PI) / 180;
  const minDim  = Math.min(width, height);
  const iconX   = ANCHOR_X + Math.cos(rad) * sat.radius * minDim;
  const iconY   = ANCHOR_Y + Math.sin(rad) * sat.radius * minDim;
  // Slow orbital drift (each satellite moves independently)
  const drift   = Math.sin((frame - sat.delay) / 38 + i * 0.9) * 8;
  const driftX  = Math.cos((frame - sat.delay) / 44 + i * 1.1) * 5;

  return (
    <div key={i} style={{
      position: "absolute",
      left: iconX, top: iconY,
      transform: `translate(-50%, -50%) translate(${driftX}px, ${drift}px) scale(${scale})`,
      opacity,
      filter: sat.blur > 0 ? `blur(${sat.blur}px)` : undefined,
      zIndex: sat.blur > 0 ? 8 : 12,  // blurred = background depth
    }}>
      <div style={{
        width: sat.size, height: sat.size,
        borderRadius: "50%",
        background: "white",
        boxShadow: `0 ${sat.size * 0.12}px ${sat.size * 0.36}px rgba(0,0,0,${0.18 + sat.blur * 0.02})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: sat.size * 0.42,
      }}>
        {["✉️","💬","📊","⚡","🔔","🔗"][i]}
      </div>
    </div>
  );
})}
```

**Key rules:**
- Larger icons with higher blur = closer to viewer (foreground). Smaller + sharp = farther (background).
- `zIndex` separates depth: `blur > 0` icons get z:8 (behind product), sharp icons get z:12 (in front)
- Angular spread: distribute across 200–240° arc — NOT 360° (leave one side clear for brand text)
- Do NOT use uniform size — vary between 60–120px to create natural depth

### Anti-Patterns

- **NEVER** scatter icons at regular grid positions — cluster them around the anchor
- **NEVER** use same size for all icons — size variation = depth illusion
- **NEVER** skip blur on "foreground" icons — blur signals proximity, sharpness signals distance

---

## UPDATED STANDARDS v2 (WhatAStory Gap Analysis Round 2 — 2026-03-18)

### Orbital Groups Pattern (replaces single-cluster)

Premium videos (Screenjar, Viable) use TWO distinct orbital groups — integration icons cluster near top-left, user avatars cluster near bottom-right. Each group has its own anchor point. Icons within a group share a small radius, creating a tight "family."

```tsx
// OUTSIDE component — stable reference
const ORBITAL_GROUPS = [
  {
    // Group 1: Integration/product icons — top-left quadrant
    anchor: { x: 0.18, y: 0.32 },
    icons: [
      { emoji: "📊", size: 72, delay: 6  },
      { emoji: "⚡", size: 56, delay: 14 },
      { emoji: "✉️", size: 64, delay: 22 },
    ],
    radius: 42,  // px — tight cluster
    stagger: 0,
  },
  {
    // Group 2: User avatars / outcomes — bottom-right quadrant
    anchor: { x: 0.80, y: 0.68 },
    icons: [
      { emoji: "💬", size: 68, delay: 18 },
      { emoji: "🔔", size: 52, delay: 26 },
      { emoji: "🔗", size: 60, delay: 34 },
    ],
    radius: 36,  // px — even tighter
    stagger: 15,
  },
];

{ORBITAL_GROUPS.map((group, gi) =>
  group.icons.map((icon, i) => {
    const totalDelay = group.stagger + icon.delay;
    if (frame < totalDelay) return null;

    const progress = spring({
      frame: frame - totalDelay, fps,
      config: { stiffness: 110, damping: 14 },
    });
    const scale   = interpolate(progress, [0, 1], [0, 1]);
    const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

    // Fan icons around group anchor — spread evenly within group
    const angle   = (i / group.icons.length) * 2 * Math.PI + (gi * Math.PI * 0.7);
    const iconX   = group.anchor.x * width  + Math.cos(angle) * group.radius;
    const iconY   = group.anchor.y * height + Math.sin(angle) * group.radius;

    // VARYING FLOAT FREQUENCIES — eliminates mechanical synchrony
    // Each icon has slightly different period: 30, 32, 34, 36... frames
    const floatY = Math.sin((frame - totalDelay) / (30 + i * 2)) * (9 + i * 1.5);
    const floatX = Math.cos((frame - totalDelay) / (40 + i * 3)) * 5;

    return (
      <div key={`${gi}-${i}`} style={{
        position: "absolute",
        left: iconX, top: iconY,
        transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
        opacity,
        zIndex: 12,
      }}>
        <div style={{
          width: icon.size, height: icon.size,
          borderRadius: "50%",
          background: "white",
          boxShadow: GLOBAL_STYLE.shadowMedium,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: icon.size * 0.44,
        }}>
          {icon.emoji}
        </div>
      </div>
    );
  })
)}
```

**Key rules:**
- Two groups max — more than two feels scattered
- Group 1 anchors top-left area (0.1–0.3 x, 0.2–0.4 y)
- Group 2 anchors bottom-right area (0.7–0.9 x, 0.6–0.8 y)
- Product/device sits in the center, the groups frame it
- `(30 + i * 2)` float period formula ensures no two icons bob in sync

---

## Hook Scene Template (Complete Integration)

Full hook scene with continuous zoom, 3-layer text stack, and orbital satellites:

```tsx
export const HookScene = ({ BRAND, ATTACHED_IMAGES }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Continuous cinematic slow zoom (whole scene breathes)
  const cameraZoom = interpolate(frame, [0, 150], [1.0, 1.06], { extrapolateRight: "clamp" });

  // Text stack springs (centered)
  const LABEL_DELAY    = 5;
  const HEADLINE_DELAY = 12;
  const SUBLINE_DELAY  = 22;
  const labelS    = spring({ frame: frame - LABEL_DELAY,    fps, config: { stiffness: 140, damping: 16 } });
  const headlineS = spring({ frame: frame - HEADLINE_DELAY, fps, config: { stiffness: 120, damping: 18 } });
  const sublineS  = spring({ frame: frame - SUBLINE_DELAY,  fps, config: { stiffness: 120, damping: 18 } });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* Camera zoom wrapper */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${cameraZoom})`, transformOrigin: "center center" }}>

        {/* Background gradient orbs */}
        {[
          { top: "-20%", left: "-10%", color: BRAND.primary, size: 700 },
          { bottom: "-15%", right: "-8%", color: BRAND.secondary || "#3b82f6", size: 600 },
        ].map((orb, i) => (
          <div key={i} style={{
            position: "absolute", ...orb,
            width: orb.size, height: orb.size, borderRadius: "50%",
            background: orb.color, filter: "blur(120px)", opacity: 0.15,
            transform: `translate(${Math.sin(frame * 0.018 + i) * 40}px, ${Math.cos(frame * 0.018 + i) * 30}px)`,
          }} />
        ))}

        {/* Entropy dust (OUTSIDE component — see ENTROPY_DUST const below) */}
        {ENTROPY_DUST.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: BRAND.primary, opacity: 0.06 + Math.sin(frame * p.freq + p.phase) * 0.02,
            transform: `translate(${Math.sin(frame * p.freq) * 6}px, ${Math.cos(frame * p.freq * 0.7) * 4}px)`,
            zIndex: 1,
          }} />
        ))}

        {/* Orbital satellites with Z-depth blur (use ORBITAL_GROUPS above) */}
        {/* ... satellite rendering ... */}

        {/* Centered 3-layer text stack (z=20, above satellites) */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", zIndex: 20, padding: "0 10%",
        }}>
          {/* Section label */}
          <div style={{ overflow: "hidden", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: BRAND.primary, transform: `translateY(${interpolate(labelS, [0, 1], [100, 0])}%)`, opacity: interpolate(frame, [LABEL_DELAY, LABEL_DELAY + 8], [0, 1], { extrapolateRight: "clamp" }) }}>
              INTRODUCING
            </div>
          </div>
          {/* Hero headline — per-line masked reveal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
            {["Your product name", "does X better."].map((line, i) => {
              const s = spring({ frame: frame - (HEADLINE_DELAY + i * 4), fps, config: { stiffness: 120, damping: 18 } });
              return (
                <div key={i} style={{ overflow: "hidden", paddingBottom: 4 }}>
                  <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", color: BRAND.text || "#f8fafc", fontFamily: BRAND.font + ", sans-serif", transform: `translateY(${interpolate(s, [0, 1], [100, 0])}%)` }}>
                    {line}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Sub-line */}
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 24, fontWeight: 400, lineHeight: 1.5, color: BRAND.textMuted || "#94a3b8", maxWidth: 680, transform: `translateY(${interpolate(sublineS, [0, 1], [100, 0])}%)`, opacity: interpolate(frame, [SUBLINE_DELAY, SUBLINE_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }) }}>
              The one-line outcome your audience cares about.
            </div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

const ENTROPY_DUST = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100,
  size: 3 + (i % 4), freq: 0.008 + i * 0.003, phase: i * 0.7,
}));
```

---

## Hero UI Anchor Variant

Product UI card rising from the bottom, below the text stack. Used when the hook needs to show the product immediately:

```tsx
const uiSpring = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 100 } });

{/* Push text up by adding paddingBottom to the text container */}
{/* Text container: add paddingBottom: "18vh" */}

{/* UI card at z=15 — below text, above background satellites */}
<div style={{
  position: "absolute",
  left: "50%", bottom: "-12%",
  transform: `translateX(-50%) translateY(${interpolate(uiSpring, [0, 1], [500, 0])}px)`,
  width: "58%", height: "48%",
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(24px)",
  borderTop: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "24px 24px 0 0",
  boxShadow: "0 -20px 60px rgba(0,0,0,0.4)",
  zIndex: 15, overflow: "hidden",
}}>
  {ATTACHED_IMAGES[0] && (
    <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
  )}
</div>
```

---

## Anti-Patterns
- **NEVER scatter icons at random positions** — use ORBIT_SLOTS or ORBITAL_GROUPS centered on an anchor
- **NEVER use uniform icon sizes** — vary 56–118px; size variation = depth illusion
- **NEVER skip blur on foreground icons** — blur > 0 signals proximity; sharp = distance
- **NEVER leave background as flat color** — gradient orbs + entropy dust ALWAYS
- **NEVER fade the headline in** — use per-line `overflow:hidden` + `translateY(100%→0%)`
- **NEVER skip the continuous zoom** — `interpolate(frame, [0,150], [1.0,1.06])` on the camera wrapper

## Quality Checklist
- [ ] Continuous slow zoom (1.0→1.06 over 150 frames) wraps entire scene
- [ ] Background has gradient orbs (blurred radial) + entropy dust (18 particles)
- [ ] Satellites use cluster/anchor model with Z-depth (blur + size variation)
- [ ] Maximum 5–6 satellite icons (more = cluttered)
- [ ] Text uses 3-layer stack: label at f:5, headline at f:12, sub-line at f:22
- [ ] All headline lines use per-line `overflow:hidden` + `translateY(100%→0%)`
- [ ] Text block centered (hook/CTA) — NOT left-aligned
- [ ] Text stack at z:20, foreground blur satellites at z:8, sharp satellites at z:12

---

## premium-saas-showcase

> Source: `src/skills/premium-saas-showcase.md`

---
title: Premium SaaS Showcase
impact: HIGH
impactDescription: The workhorse scene for displaying UI features, strictly enforcing the 40/60 split layout and isometric product presentation.
tags: showcase, split-layout, isometric, ui-demo, 40-60, browser, dashboard
qualityBar: The scene uses a strict 40/60 split. The left 40% holds the 3-Layer Text Stack. The right 60% holds the product UI, tilted in 3D space, anchored by a floating glass feature badge, with a slow cinematic zoom wrapping the entire scene.
---

## Scene Purpose

The core "Show, Don't Tell" scene. Introduces a specific feature by pairing highly readable contextual text with a dynamic, physicalized view of the product interface.

## Visual Blueprint

```text
[      Cinematic Camera Wrapper (1.0 -> 1.05 Zoom)              ]
[                                                               ]
[   (Left 40%: The 3-Layer Stack)    (Right 60%: Isometric UI)  ]
[                                                               ]
[   S E A M L E S S   S Y N C             [Floating Badge]      ]
[                                               \               ]
[   Connect all your                           +-----------+    ]
[   favorite tools.                           / Screenshot/     ]
[                                            /   or UI   /      ]
[   No coding required. Just                /   Replica /       ]
[   click, authenticate, and go.           +-----------+        ]
[                                                               ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const SaasShowcaseScene = ({ BRAND, textStack, uiImage, badgeText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. TIMING
  const TEXT_START  = 5;
  const UI_START    = 15;
  const BADGE_START = 28;

  // 2. TEXT SPRINGS
  const labelSpring    = spring({ frame: frame - TEXT_START,        fps, config: { damping: 16, stiffness: 140 } });
  const headlineSpring = spring({ frame: frame - (TEXT_START + 5),  fps, config: { damping: 18, stiffness: 120 } });
  const sublineSpring  = spring({ frame: frame - (TEXT_START + 12), fps, config: { damping: 18, stiffness: 120 } });

  // 3. UI + BADGE SPRINGS
  const uiSpring    = spring({ frame: frame - UI_START,    fps, config: { damping: 18, stiffness: 110 } });
  const badgeSpring = spring({ frame: frame - BADGE_START, fps, config: { damping: 14, stiffness: 150 } }); // Snappy pop

  // 4. SCENE SETTLE (zoom out for finality if this is a CTA-adjacent scene)
  const cameraZoom = interpolate(frame, [0, 150], [1.0, 1.05], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${cameraZoom})`, transformOrigin: "center center", display: "flex", flexDirection: "row" }}>

        {/* LEFT 40%: TEXT STACK */}
        <div style={{
          width: "40%",
          paddingLeft: "8%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 20,
        }}>
          {/* Section Label */}
          <div style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: BRAND.primary || "#6366f1",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(labelSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.label}
            </div>
          </div>
          {/* Hero Headline */}
          <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: 24 }}>
            <div style={{
              fontSize: 80, fontWeight: 900, lineHeight: 1.05,
              letterSpacing: "-0.04em", color: "#ffffff",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(headlineSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.headline}
            </div>
          </div>
          {/* Sub-line */}
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontSize: 24, fontWeight: 400, lineHeight: 1.5,
              color: "#94a3b8", maxWidth: "90%",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(sublineSpring, [0, 1], [100, 0])}%)`,
              opacity: sublineSpring,
            }}>
              {textStack.subline}
            </div>
          </div>
        </div>

        {/* RIGHT 60%: ISOMETRIC UI */}
        <div style={{
          width: "60%",
          position: "relative",
          perspective: 1200,
          display: "flex",
          alignItems: "center",
          paddingLeft: "5%",
        }}>

          {/* Main UI Container — intentionally bleeds off right edge */}
          <div style={{
            width: "120%", // Bleeds off the right edge to imply expansive software
            height: "70%",
            transformStyle: "preserve-3d",
            transform: `
              rotateY(-12deg) rotateX(4deg)
              translateY(${interpolate(uiSpring, [0, 1], [100, 0])}px)
              scale(${interpolate(uiSpring, [0, 1], [0.9, 1])})
            `,
            opacity: uiSpring,
            borderRadius: 24,
            boxShadow: "-30px 40px 80px rgba(0,0,0,0.4)", // Shadow leans left (matches rotation)
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}>
            {uiImage ? (
              <img src={uiImage} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top" }} />
            ) : (
              // Fallback reconstructed UI shell
              <div style={{ width: "100%", height: "100%", background: "#1e293b", display: "flex" }}>
                {/* Sidebar */}
                <div style={{ width: 240, height: "100%", background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.08)" }} />
                {/* Content */}
                <div style={{ flex: 1, padding: 32 }}>
                  <div style={{ height: 24, width: 200, background: "rgba(255,255,255,0.1)", borderRadius: 6, marginBottom: 16 }} />
                  <div style={{ height: 16, width: 320, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
                </div>
              </div>
            )}
          </div>

          {/* Floating Feature Badge — bridges text and UI columns */}
          {badgeText && (
            <div style={{
              position: "absolute",
              left: "-5%", // Hangs off the left edge of the UI panel
              top: "30%",
              transform: `translateZ(50px) scale(${badgeSpring}) translateY(${interpolate(Math.sin(frame * 0.05), [-1, 1], [-8, 8])}px)`,
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              borderTop: "1px solid rgba(255,255,255,0.3)",
              borderLeft: "1px solid rgba(255,255,255,0.15)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              padding: "16px 24px",
              borderRadius: 16,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: 12,
              zIndex: 30,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: BRAND.primary || "#6366f1" }} />
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{badgeText}</span>
            </div>
          )}
        </div>

      </div>
    </AbsoluteFill>
  );
};
```

---

## Spring / Timing Reference

| Element | Start Frame | Config | Description |
|---|---|---|---|
| Section label | `5` | `stiff:140, damp:16` | MaskedReveal translateY |
| Headline | `10` | `stiff:120, damp:18` | MaskedReveal translateY |
| Subline | `17` | `stiff:120, damp:18` | MaskedReveal translateY |
| UI panel | `15` | `stiff:110, damp:18` | Rise + scale entrance |
| Feature badge | `28` | `stiff:150, damp:14` | Snappy pop after UI settles |

---

## Browser Frame Variant (Classic Mockup)

For showing web apps in a realistic browser window — use when the product is web-first and the URL/nav chrome adds credibility:

```tsx
{/* Browser frame — traffic lights + URL bar */}
<div style={{
  width: "90%", maxWidth: 1100,
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.12)",
  transform: `translateY(${BROWSER_Y + floatY}px)`,
}}>
  {/* Chrome */}
  <div style={{ height: 44, background: "#1e293b", display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
    {/* Traffic lights */}
    {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
      <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c }} />
    ))}
    {/* URL bar */}
    <div style={{ flex: 1, marginLeft: 12, height: 26, background: "rgba(255,255,255,0.08)", borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 12 }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif" }}>
        app.{BRAND.name?.toLowerCase() || "product"}.com/dashboard
      </span>
    </div>
  </div>
  {/* Content */}
  <div style={{ height: 480, background: "#0f172a" }}>
    {uiImage && <img src={uiImage} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
  </div>
</div>
```

**Use browser frame when:** the user's product is web-based and the URL/nav adds realism.
**Use isometric directly when:** showing mobile, multi-platform, or abstract product capabilities.

---

## AGENCY UPGRADE MANDATES (added 2026-03)

These mandates close the gap between "functional" and "WhatAStory-quality":

**1. BrowserMockup for ALL screenshots — no raw `<img>` tags**
When UI_SCHEMA is present: use `<ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />` — no screenshots at all.
When showing screenshot directly: ALWAYS wrap in the browser chrome frame (traffic lights + URL bar) shown in "Browser Frame Variant" below. A raw `<img>` floating in the scene is a quality fail.

**2. useVitality on hold-phase elements (>60f holds)**
During the hold phase, the floating badge and UI panel must breathe:
```tsx
const vBadge = useVitality("float", 0);    // badge floats: translateY(v * -6px)
const vPanel = useVitality("breathe", 1);  // panel breathes: scale(1 + v * 0.008)
```

**3. SteppedCamera when this scene has cursor interactions**
If the LLM adds cursor waypoints to this scene, use usePreFocusCamera:
```tsx
const { zoom, panX, panY } = usePreFocusCamera(cursorTargetX, cursorTargetY, arrivalFrame - 15);
```

**4. rotateY(-8deg) for lighter tilt when using BrowserMockup**
When the UI is in a browser frame (not raw isometric), use `rotateY(-8deg)` instead of `-12deg` for a more natural perspective.

---

## Anti-Patterns

- **NEVER use a raw `<img>` tag for product screenshots.** Always wrap in browser chrome or use ReconstructedAppShell. Raw screenshots look like a PowerPoint slide.
- **NEVER center the UI and put text below.** It creates dead space and kills readability. Always use the 40/60 split.
- **NEVER present the UI completely flat** unless doing a direct cursor interaction. Use `perspective:1200` + `rotateY(-12deg)` to create an isometric volume.
- **NEVER fit the UI perfectly inside the 60% column.** Set width to `120%` so it bleeds off the right edge — this implies a larger, expansive software system.
- **NEVER skip the floating badge.** The badge physically bridges the gap between the text column and UI panel — without it, the two halves feel disconnected.
- **NEVER use `rotateY` without a matching shadow direction.** If `rotateY(-12deg)` (leaning left), the shadow must fall bottom-left: `boxShadow: "-30px 40px 80px rgba(0,0,0,0.4)"`.

---

## Quality Checklist

- [ ] Scene uses 40/60 split (not centered layout)
- [ ] Text follows 3-Layer Stack: label → headline (MaskedReveal) → subline
- [ ] UI container has `perspective:1200` + `rotateY(-12deg) rotateX(4deg)` (or -8deg for browser frame)
- [ ] UI shadow direction matches rotation (left tilt = shadow falls bottom-left)
- [ ] UI width is `120%` to bleed off right edge
- [ ] Floating badge uses High-Depth glass formula with directional borders
- [ ] Scene wrapped in slow cinematic zoom (`1.0→1.05` over 150f)
- [ ] **No raw `<img>` tags** — all screenshots inside browser frame or ReconstructedAppShell
- [ ] Hold phase elements use `useVitality` (float/breathe/bounce)

---

## premium-scroll-demo

> Source: `src/skills/premium-scroll-demo.md`

---
title: Premium Scroll Simulation Demo
impact: HIGH
impactDescription: simulates the product being scrolled inside a browser/device — creates the illusion of "someone actually using the product" without recording
tags: scroll, product-demo, browser, interaction, screenshot, ATTACHED_IMAGES, walkthrough, website-demo
---

## Scroll Demo Pattern Overview

The "living product" technique: place `ATTACHED_IMAGES[0]` (a tall screenshot or composite) inside a browser shell and animate it scrolling. Combined with a cursor and section highlights, it feels like a real screen recording.

---

## Core Scroll Animation

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Phase timing
const BROWSER_ENTER_END = 30;   // browser finishes sliding in
const SCROLL_START      = 45;   // scroll begins
const SCROLL_END        = 200;  // scroll finishes at bottom
const HIGHLIGHT_START   = 210;  // section highlight pulse

// Browser entrance
const browserEntrance = spring({
  frame,
  fps,
  config: { damping: 22, stiffness: 75 },
});
const browserY = interpolate(browserEntrance, [0, 1], [height * 0.4, 0]);

// Scroll progress — smooth eased scroll, not spring (springs feel wrong for scrolling)
const scrollProgress = interpolate(
  frame,
  [SCROLL_START, SCROLL_END],
  [0, 1],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,  // ease-in-out quad
  }
);

// The screenshot is 2–3x taller than the viewport — scroll reveals more content
const SCREENSHOT_HEIGHT_FACTOR = 2.5;  // screenshot is 2.5x the viewport height
const maxScrollPx = (SCREENSHOT_HEIGHT_FACTOR - 1) * height * 0.72; // 72% = content area height
const scrollY = interpolate(scrollProgress, [0, 1], [0, -maxScrollPx]);

// Section spotlight — highlights a particular part of the page
const highlightPulse = Math.sin((frame - HIGHLIGHT_START) * 0.15) * 0.5 + 0.5;
const highlightOpacity = interpolate(
  frame,
  [HIGHLIGHT_START, HIGHLIGHT_START + 15, SCROLL_END + 30],
  [0, 1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

---

## Browser Shell + Scrolling Content

```tsx
const BROWSER_W = width * 0.78;
const BROWSER_H = BROWSER_W * 0.65;
const CONTENT_H = BROWSER_H - 40;  // minus chrome bar height

<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
  <div style={{
    width: BROWSER_W,
    height: BROWSER_H,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 50px 100px rgba(0,0,0,0.40)",
    transform: `translateY(${browserY}px)`,
    display: "flex", flexDirection: "column",
  }}>
    {/* Browser chrome bar */}
    <div style={{
      height: 40, flexShrink: 0,
      background: "#f1f5f9",
      borderBottom: "1px solid #e2e8f0",
      display: "flex", alignItems: "center",
      padding: "0 14px", gap: 8,
    }}>
      <div style={{ display: "flex", gap: 6 }}>
        {["#ef4444","#eab308","#22c55e"].map((c,i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
      </div>
      <div style={{
        flex: 1, maxWidth: 360, height: 24, marginLeft: 12,
        background: "white", border: "1px solid #e2e8f0", borderRadius: 6,
        display: "flex", alignItems: "center", paddingLeft: 10,
        fontSize: 11, color: "#64748b", fontFamily: "Inter, sans-serif",
      }}>
        🔒 yourproduct.com
      </div>
    </div>

    {/* Scrollable content area */}
    <div style={{
      width: "100%", height: CONTENT_H,
      overflow: "hidden", position: "relative",
    }}>
      {/* The screenshot — taller than visible area, scrolled by translateY */}
      <div style={{
        transform: `translateY(${scrollY}px)`,
        willChange: "transform",
      }}>
        {ATTACHED_IMAGES[0] ? (
          <img
            src={ATTACHED_IMAGES[0]}
            style={{
              width: "100%",
              height: CONTENT_H * SCREENSHOT_HEIGHT_FACTOR,
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
          />
        ) : (
          /* Fallback: multi-section placeholder */
          <div style={{ width: "100%", height: CONTENT_H * SCREENSHOT_HEIGHT_FACTOR, background: "#f8fafc" }}>
            {/* Hero section */}
            <div style={{ height: CONTENT_H * 0.5, background: "linear-gradient(135deg, #0f172a, #1e293b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "60%", height: 60, background: "rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </div>
            {/* Features section */}
            <div style={{ height: CONTENT_H * 0.7, padding: 40, display: "flex", flexWrap: "wrap", gap: 20 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ flex: "1 1 40%", height: 100, background: "white", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />)}
            </div>
            {/* CTA section */}
            <div style={{ height: CONTENT_H * 0.5, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 180, height: 48, background: "white", borderRadius: 24, opacity: 0.9 }} />
            </div>
          </div>
        )}
      </div>

      {/* Section highlight overlay — appears mid-scroll to spotlight a key area */}
      {highlightOpacity > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 70% 30% at 50% ${45 + scrollProgress * 55}%, rgba(99,102,241,${0.18 * highlightPulse * highlightOpacity}) 0%, transparent 80%)`,
          pointerEvents: "none",
        }} />
      )}

      {/* Scrollbar indicator */}
      <div style={{
        position: "absolute", right: 4, top: 4, bottom: 4,
        width: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2,
      }}>
        <div style={{
          position: "absolute",
          top: `${scrollProgress * 80}%`,
          left: 0, right: 0,
          height: "20%",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 2,
        }} />
      </div>
    </div>
  </div>
</AbsoluteFill>
```

---

## Overlay Label — "Section" Callout

Appears when scroll stops on a key section:

```tsx
const labelOpacity = interpolate(
  frame,
  [SCROLL_END, SCROLL_END + 20, SCROLL_END + 60],
  [0, 1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);

{labelOpacity > 0 && (
  <div style={{
    position: "absolute",
    bottom: "18%", left: "50%",
    transform: `translateX(-50%) translateY(${interpolate(labelOpacity, [0,1], [10,0])}px)`,
    opacity: labelOpacity,
    background: "rgba(15,23,42,0.92)",
    backdropFilter: "blur(8px)",
    color: "white",
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
    fontWeight: 600,
    padding: "10px 24px",
    borderRadius: 100,
    whiteSpace: "nowrap",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  }}>
    ✦ 10,000+ Verified Vehicles
  </div>
)}
```

---

## Animated Scroll Cursor

Add a pointing cursor that appears and "initiates" the scroll:

```tsx
const CURSOR_APPEAR = 25;
const CURSOR_SCROLL_END = 60;

const cursorOpacity = interpolate(frame, [CURSOR_APPEAR, CURSOR_APPEAR + 10, CURSOR_SCROLL_END], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const cursorY = interpolate(frame, [CURSOR_APPEAR, CURSOR_SCROLL_END], [height * 0.3, height * 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const cursorX = width * 0.5;

{cursorOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: cursorX, top: cursorY,
    transform: "translate(-50%, -50%)",
    opacity: cursorOpacity,
    fontSize: 28,
    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
    pointerEvents: "none",
    zIndex: 100,
  }}>
    🖱
  </div>
)}
```

---

## Key Rules

- **`SCREENSHOT_HEIGHT_FACTOR = 2.5`** — the image renders at 2.5× the visible height so there's content to scroll through. If using a real screenshot, prefer landscape or full-page captures.
- **Easing for scroll**: use quadratic ease-in-out, NOT spring — springs have bounce which feels wrong for a page scroll
- **Scroll then pause**: always pause at the end (`SCROLL_END`) for 20+ frames before the next element appears — let the viewer read what's on screen
- **Section highlight**: the radial gradient tied to scroll position guides the eye to the most relevant product area
- **Scrollbar**: small indicator on the right side adds authenticity

---

## premium-section-title

> Source: `src/skills/premium-section-title.md`

# premium-section-title

## When to Use
Use for chapter-break scenes between major product feature demos. Creates breathing room in the video pacing. Duration: 90 frames (3 seconds).

## Component
Use the SectionTitle component (in scope):
```tsx
<AbsoluteFill>
  <LightArcBg brand={BRAND} variant={GLOBAL_BG || "arcs"} />
  <SectionTitle
    title="Feature Name"
    subtitle="Optional subtitle"
    icon="🔒"
    brand={BRAND}
    startFrame={10}
  />
</AbsoluteFill>
```

## Rules
- Title text is in BRAND.primary color
- Font size: 48px for title, 18px for subtitle
- Use the same GLOBAL_BG background as all other scenes in the video
- Keep it simple — no additional elements needed
- Spring fade-in starting at frame 10
- Duration should be 90 frames (3 seconds at 30fps)

---

## premium-shape-morph-transition

> Source: `src/skills/premium-shape-morph-transition.md`

---
title: Premium Shape Morph Transition — Color Flood Fill
impact: HIGH
impactDescription: a clicked element's color explosively expands to fill the entire screen then reveals the next scene — the signature fluid transition of $10K agency videos
tags: transition, morph, flood-fill, color-expand, clip-path, shape, wipe, cinematic, button-click, scene-change, fluid, reveal
---

## Core Concept

Instead of a crossfade, a UI element (button click, icon tap) **explodes outward** to fill the screen with its color, then that solid color sweeps away to reveal the next scene.

Uses `clipPath: circle(radius at x y)` — hardware-accelerated, zero dependencies.

---

## The Flood Fill Expand

```tsx
// Trigger: the cursor clicks an element at (triggerX, triggerY) at frame triggerFrame
// Phase 1: circle expands from trigger point to cover entire screen (25 frames)
// Phase 2: solid fill holds for 5 frames
// Phase 3: content fades in over the solid fill (20 frames)

const DIAGONAL = Math.sqrt(width * width + height * height); // max radius needed

const expandProgress = spring({
  frame: frame - triggerFrame,
  fps,
  config: { damping: 40, stiffness: 300 },
  durationInFrames: 25,
});

const fillRadius = interpolate(expandProgress, [0, 1], [0, DIAGONAL * 1.05]);

// The flood fill layer
<div style={{
  position: "absolute", inset: 0,
  background: fillColor,   // BRAND.primary or the button's color
  clipPath: `circle(${fillRadius}px at ${triggerX}px ${triggerY}px)`,
  zIndex: 50,
  pointerEvents: "none",
}} />
```

---

## Full Transition Pattern (end of one scene)

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationInFrames = useVideoConfig().durationInFrames;

  // The trigger: last big cursor click in the scene
  const TRIGGER_FRAME = durationInFrames - 45;
  const TRIGGER_X = width * 0.5;    // center of the CTA button
  const TRIGGER_Y = height * 0.65;
  const FILL_COLOR = BRAND.primary;

  const DIAGONAL = Math.sqrt(width * width + height * height);

  const expandProg = spring({
    frame: frame - TRIGGER_FRAME,
    fps,
    config: { damping: 40, stiffness: 280 },
    durationInFrames: 22,
  });
  const fillRadius = interpolate(expandProg, [0, 1], [0, DIAGONAL * 1.1]);
  const isExpanding = frame >= TRIGGER_FRAME;

  // Content that fades out as the fill expands
  const contentOpacity = isExpanding
    ? interpolate(frame, [TRIGGER_FRAME, TRIGGER_FRAME + 15], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* ── Scene content ── */}
      <div style={{ opacity: contentOpacity }}>
        {/* your scene elements here */}
        <div style={{
          position: "absolute", left: "50%", top: "60%",
          transform: "translate(-50%, -50%)",
        }}>
          {/* CTA button at TRIGGER_X, TRIGGER_Y */}
          <div style={{
            padding: "16px 40px", borderRadius: 12,
            background: BRAND.primary, color: "#fff",
            fontSize: 18, fontWeight: 700, fontFamily: BRAND.font ?? "Inter",
          }}>
            Get Started
          </div>
        </div>
      </div>

      {/* ── Flood fill overlay ── */}
      {isExpanding && (
        <div style={{
          position: "absolute", inset: 0,
          background: FILL_COLOR,
          clipPath: `circle(${fillRadius}px at ${TRIGGER_X}px ${TRIGGER_Y}px)`,
          zIndex: 50,
          pointerEvents: "none",
        }} />
      )}
    </AbsoluteFill>
  );
};
```

---

## Reveal After Fill (start of next scene)

At the beginning of the following scene, reverse the effect — the fill color shrinks away to reveal the new content:

```tsx
// At start of next scene: fill starts covering full screen, then shrinks to nothing
const REVEAL_FRAME = 0;
const DIAGONAL = Math.sqrt(width * width + height * height);

const shrinkProg = spring({
  frame: frame - REVEAL_FRAME,
  fps,
  config: { damping: 28, stiffness: 200 },
  durationInFrames: 30,
});
const fillRadius = interpolate(shrinkProg, [0, 1], [DIAGONAL * 1.1, 0]);

// Scene content appears as fill shrinks
const contentOpacity = interpolate(shrinkProg, [0.3, 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Reveal fill (shrinking) — same fill color as previous scene's expand
<div style={{
  position: "absolute", inset: 0,
  background: PREV_FILL_COLOR,  // must match previous scene
  clipPath: `circle(${fillRadius}px at ${width * 0.5}px ${height * 0.65}px)`,
  zIndex: 50, pointerEvents: "none",
}} />
```

---

## Trigger from CURSOR_STEPS

When using with `premium-cursor-engine`, trigger the flood fill from the final cursor click:

```tsx
// Find the last CURSOR_STEP with action: "click"
const lastClick = CURSOR_STEPS[CURSOR_STEPS.length - 1];
const TRIGGER_FRAME = lastClick.time + 5;   // 5 frames after cursor clicks
const TRIGGER_X = lastClick.x * width;
const TRIGGER_Y = lastClick.y * height;
```

---

## Variants

**Radial wipe from corner** (dramatic reveal):
```tsx
// Start from top-right corner — expansive feel
const TRIGGER_X = width * 0.98;
const TRIGGER_Y = height * 0.02;
```

**Instant snap** (energetic, kinetic style — no spring, linear):
```tsx
const fillRadius = interpolate(frame, [TRIGGER_FRAME, TRIGGER_FRAME + 12], [0, DIAGONAL], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
});
```

**Color sequence** (two fills — accent then brand bg):
```tsx
// First fill: BRAND.primary at TRIGGER_FRAME (fast)
// Second fill: BRAND.bg at TRIGGER_FRAME + 8 (slightly slower, reveals content)
```

---

## When to Use

- **CTA scenes**: user clicks "Get Started" → flood fills screen → next scene reveals
- **Feature transitions**: "click here to see Feature B" → transition
- **Dramatic reveals**: any moment of high emotion or surprise in the narrative
- **Combine with premium-kinetic-text**: after the text punch, the final word expands to fill the screen

---

## Critical Rules

1. `TRIGGER_X / TRIGGER_Y` should match the cursor's last click position exactly for visual coherence
2. The `fill color` and `trigger position` MUST match between the outgoing and incoming scenes for the transition to feel seamless
3. Use `spring` with `damping: 35–45` for the expand (snappy) and `damping: 25–30` for the reveal (slightly softer)
4. `clipPath: circle()` is hardware-accelerated — no performance cost even at 60fps
5. Do NOT use `filter: blur()` on the flood fill div — it defeats the clean edge

---

## premium-single-shot-morphing

> Source: `src/skills/premium-single-shot-morphing.md`

---
title: Premium Single‑Shot Morphing (Seamless Thread)
impact: HIGH
impactDescription: avoids “scene cuts” by morphing an element from Scene A into Scene B using morphExport/morphImport + continuous camera language
tags: morph, shared element, continuity, seamless, single-shot, whatastory, bordio
qualityBar: The viewer feels like the camera is moving through one continuous world. A recognizable UI element persists or transforms across scenes (card → header, icon → badge), with no hard cut feeling.
---

## What this skill does
This skill implements a **shared-element continuity** using the built-in Morph Portal system:
- Scene N sets `morphExport` (rect of the exiting element)
- Scene N+1 sets `morphImport` (rect of where it lands)
- Generated code uses `useMorphEntrance(MORPH_FROM, targetRect)` automatically when `MORPH_FROM` is present

## Planner usage (must be explicit in prompts)
Pick ONE “anchor element” per video:
- a card, a badge, a pill, a sidebar highlight, a “✅ success” chip

Then do **max 1 morph portal per video** (agency-style restraint).

## Scene authoring pattern

### Scene N (export)
- Hold the element cleanly for 18–24 frames at the end of the scene so the viewer registers it.
- Provide `morphExport` rect for that element.

### Scene N+1 (import)
- Make that element the **first** thing visible at frame 0.
- Use `useMorphEntrance(MORPH_FROM, morphImport.rect)` on the receiving element.

## Code pattern (receiving scene)

```tsx
// MORPH_FROM is injected in scope when the previous scene exported a rect
const morph = useMorphEntrance(MORPH_FROM, { x: 0.18, y: 0.18, w: 0.44, h: 0.12 });

return (
  <AbsoluteFill>
    <div style={{ transform: morph.transform, opacity: morph.opacity }}>
      {/* This element is the “same thing” as the export, now re-contextualized */}
      <div style={{ ...getGlassCard(BRAND), padding: 18 }}>Realtime Dashboard</div>
    </div>
  </AbsoluteFill>
);
```

## Anti-patterns (hard fails)
- Morphing multiple unrelated elements (looks gimmicky).
- Exporting an element then not showing it immediately in the next scene.
- Using morphing to hide bad composition (should enhance, not fix).

---

## premium-social-proof

> Source: `src/skills/premium-social-proof.md`

---
title: Premium Social Proof Scene
impact: HIGH
impactDescription: builds trust with glass notification cards, orbiting integration icons, and a slow-zoom background feel
tags: social-proof, notifications, glass-card, integrations, orbit, trust, testimonials
---

## Social Proof Pattern Overview

Three layered elements create maximum credibility:
1. **Orbiting integration/app icons** — show ecosystem compatibility
2. **Floating glass notification cards** — quick evidence snippets ("Task Completed ✓", "3 Collaborators Active")
3. **Slow zoom background** — the product in context, keeps momentum

---

## Orbiting App Integration Icons

```tsx
const INTEGRATIONS = [
  { emoji: "💬", label: "Slack",    x: 0.75, y: 0.35, size: 90, delay: 0  },
  { emoji: "📁", label: "Dropbox", x: 0.82, y: 0.55, size: 84, delay: 4  },
  { emoji: "✅", label: "Asana",   x: 0.65, y: 0.45, size: 78, delay: 8  },
  { emoji: "📊", label: "Notion",  x: 0.22, y: 0.25, size: 80, delay: 16 },
  { emoji: "🗓", label: "Monday",  x: 0.28, y: 0.60, size: 88, delay: 20 },
];

{INTEGRATIONS.map((icon, i) => {
  const entranceSpring = spring({
    frame: frame - (iconsStart + icon.delay),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  // Each icon floats at its own phase
  const floatY = Math.sin((frame + i * 100) / 40) * 15;

  return (
    <div key={i} style={{
      position: "absolute",
      left: `${icon.x * 100}%`,
      top:  `${icon.y * 100}%`,
      transform: `translate(-50%, -50%) scale(${entranceSpring}) translateY(${floatY}px)`,
      zIndex: 100,
    }}>
      <div style={{
        width: icon.size, height: icon.size,
        borderRadius: "50%",
        backgroundColor: "#fff",
        boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid rgba(0,0,0,0.05)",
        fontSize: icon.size * 0.45,
      }}>
        {icon.emoji}
      </div>
    </div>
  );
})}
```

**Tip:** Place most icons on the sides (x < 0.35 or x > 0.65) so they frame but don't cover the central product.

---

## Floating Glass Notification Cards

```tsx
const NOTIFICATIONS = [
  {
    icon: "✅", iconBg: "#3b82f6",
    title: "Task Completed",
    subtitle: "Just now",
    x: "15%", y: "40%",
    delay: 10, floatPhase: 0,
  },
  {
    icon: "👥", iconBg: "#10b981",
    title: "3 Collaborators",
    subtitle: "Active now",
    x: "72%", y: "63%",
    delay: 25, floatPhase: 2,
  },
];

{NOTIFICATIONS.map((notif, i) => {
  const entranceSpring = spring({
    frame: frame - notif.delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const floatY = Math.sin(frame / 40 + notif.floatPhase) * 10;

  return (
    <div key={i} style={{
      position: "absolute",
      left: notif.x,
      top:  notif.y,
      background: "rgba(255, 255, 255, 0.92)",
      backdropFilter: "blur(12px)",
      padding: "16px 24px",
      borderRadius: 16,
      boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 16,
      transform: `translateY(${floatY}px) scale(${entranceSpring})`,
      zIndex: 50,
      fontFamily: "Inter, sans-serif",
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: notif.iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>
        {notif.icon}
      </div>
      {/* Text */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{notif.title}</div>
        <div style={{ fontSize: 13, color: "#64748b" }}>{notif.subtitle}</div>
      </div>
    </div>
  );
})}
```

---

## Stacked Avatars (Collaboration Badge)

```tsx
{/* Stacked avatar circles — "+N users active" */}
<div style={{ display: "flex", paddingLeft: 10 }}>
  {["#ef4444", "#f59e0b", "#3b82f6"].map((color, i) => (
    <div key={i} style={{
      width: 36, height: 36,
      borderRadius: "50%",
      backgroundColor: color,
      marginLeft: i > 0 ? -12 : 0,
      border: "2.5px solid white",
      zIndex: 3 - i,
    }} />
  ))}
</div>
```

---

## Slow Scene Zoom (Background)

Keep the background alive with a subtle slow zoom:

```tsx
const sceneScale = interpolate(frame, [0, 300], [1, 1.1]);
const sceneY     = interpolate(frame, [0, 300], [0, -20]);

<AbsoluteFill style={{ transform: `scale(${sceneScale}) translateY(${sceneY}px)` }}>
  {/* Background: product screenshot or dark gradient */}
</AbsoluteFill>
```

---

## Avatar-Widget-Orbit Variant (Pretaa / CRM Style)

Central avatar photo surrounded by orbiting mini data-widget cards — donut chart, text snippets, star-rating pills, bar chart. Shows the product's insight capabilities around a single customer.

```tsx
// Central avatar — spring pop in at frame 0
const avatarSpring = spring({ frame, fps, config: { stiffness: 120, damping: 14, mass: 1 } });
const AVATAR_SIZE = 220;
const CX = width / 2;
const CY = height / 2;

{/* Central photo circle */}
<div style={{
  position: "absolute",
  left: CX, top: CY,
  transform: `translate(-50%, -50%) scale(${avatarSpring})`,
  zIndex: 30,
}}>
  <div style={{
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: "50%",
    backgroundColor: "white",
    padding: 8,
    boxShadow: "0 30px 60px rgba(0,0,0,0.12)",
  }}>
    {ATTACHED_IMAGES[0] ? (
      <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: BRAND.primary || "#6366f1",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 72, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif" }}>
        {(BRAND.name || "?")[0]}
      </div>
    )}
  </div>
</div>
```

### Orbiting Mini Data Cards

Each card orbits at a fixed angle with a slow rotation drift + float:

```tsx
const ORBIT_RADIUS = 340; // px from center
const ORBIT_SPEED = 0.003; // radians per frame — very slow drift

const WIDGETS = [
  {
    angle: -0.5,   // radians from right (0=right, π/2=bottom, π=left, -π/2=top)
    delay: 15,
    render: () => (
      // Star rating pill
      <div style={{
        backgroundColor: "white", borderRadius: 12,
        padding: "10px 16px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
        display: "flex", gap: 6, alignItems: "center",
        fontFamily: "Inter, sans-serif",
      }}>
        {"★★★★★".split("").map((s, i) => (
          <span key={i} style={{ color: "#f59e0b", fontSize: 18 }}>{s}</span>
        ))}
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginLeft: 4 }}>5.0</span>
      </div>
    ),
  },
  {
    angle: 0.9,
    delay: 30,
    render: () => (
      // Mini donut chart (SVG)
      <div style={{
        backgroundColor: "white", borderRadius: 14,
        padding: "12px 16px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
        display: "flex", alignItems: "center", gap: 12,
        fontFamily: "Inter, sans-serif",
      }}>
        <svg width={48} height={48} viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="18" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="24" cy="24" r="18" fill="none" stroke={BRAND.primary || "#6366f1"}
            strokeWidth="6" strokeDasharray="82 31" strokeLinecap="round"
            transform="rotate(-90 24 24)" />
          <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f172a">72%</text>
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Health</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Score</div>
        </div>
      </div>
    ),
  },
  {
    angle: 2.5,
    delay: 45,
    render: () => (
      // Text snippet / quote pill
      <div style={{
        backgroundColor: "white", borderRadius: 14,
        padding: "12px 18px",
        maxWidth: 220,
        boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", lineHeight: 1.4 }}>
          "Best tool we've adopted this year."
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginTop: 6 }}>
          Sarah M. — Head of CS
        </div>
      </div>
    ),
  },
  {
    angle: -2.0,
    delay: 55,
    render: () => (
      // Mini bar chart
      <div style={{
        backgroundColor: "white", borderRadius: 14,
        padding: "12px 16px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.10)",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Engagement</div>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 36 }}>
          {[60, 45, 80, 55, 90, 72, 85].map((h, i) => (
            <div key={i} style={{
              width: 8, borderRadius: 3,
              height: `${h}%`,
              backgroundColor: BRAND.primary || "#6366f1",
              opacity: 0.7 + i * 0.04,
            }} />
          ))}
        </div>
      </div>
    ),
  },
];

{WIDGETS.map((w, i) => {
  const orbitAngle = w.angle + frame * ORBIT_SPEED;
  const x = CX + Math.cos(orbitAngle) * ORBIT_RADIUS;
  const y = CY + Math.sin(orbitAngle) * ORBIT_RADIUS;
  const floatY = Math.sin((frame + i * 80) / 45) * 10;

  const wSpring = spring({
    frame: frame - w.delay,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div key={i} style={{
      position: "absolute",
      left: x, top: y,
      transform: `translate(-50%, -50%) scale(${wSpring}) translateY(${floatY}px)`,
      opacity: wSpring,
      zIndex: 20,
    }}>
      {w.render()}
    </div>
  );
})}
```

**Key**: `angle + frame * ORBIT_SPEED` creates a very slow rotation of all widgets together, keeping relative spacing fixed. Use `ORBIT_SPEED = 0` if you prefer static positions.

---

## Cascading Avatar Cluster (PRIMARY trust signal)

Avatars overlap with tight 2-frame stagger and negative margins — the universal "community" pattern:

```tsx
const AVATAR_START = 15;

<div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
  {avatars.slice(0, 7).map((avatar, i) => {
    const avatarSpring = spring({ frame: frame - (AVATAR_START + i * 2), fps, config: { damping: 14, stiffness: 180 } });
    return (
      <div key={i} style={{
        width: 64, height: 64, borderRadius: "50%",
        border: `3px solid ${BRAND.bg || "#0f172a"}`, // creates overlapping cutout
        marginLeft: i === 0 ? 0 : -20,               // negative margin for overlap
        transform: `scale(${avatarSpring})`,
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        backgroundImage: `url(${avatar})`, backgroundSize: "cover",
        zIndex: 100 - i,                              // leftmost on top
        flexShrink: 0,
      }} />
    );
  })}
</div>
```

Rules:
- 2-frame stagger (`i * 2`) — tight, rapid cascade
- Negative `marginLeft: -20px` creates overlap (not side-by-side)
- `border` color MUST match background for clean cutout
- `zIndex: 100 - i` keeps leftmost avatar on top

---

## Muted Logo Marquee (background trust layer)

Logos scroll continuously at 1.5px/frame, fully grayscale, 15% opacity — never full color or full opacity:

```tsx
// marqueeOffset resets via modulo — smooth infinite scroll
const marqueeOffset1 = (frame * 1.5) % width;
const marqueeOffset2 = (frame * -1.5) % width;

{/* Row 1 — scrolls right */}
<div style={{ position: "absolute", top: "15%", width: "200%", display: "flex", gap: 80, transform: `translateX(${-marqueeOffset1}px)`, opacity: 0.15 }}>
  {[...logos, ...logos, ...logos].map((logo, i) => (
    <img key={i} src={logo} style={{ height: 40, filter: "grayscale(100%) contrast(200%)", flexShrink: 0 }} />
  ))}
</div>

{/* Row 2 — scrolls left */}
<div style={{ position: "absolute", bottom: "15%", width: "200%", display: "flex", gap: 80, transform: `translateX(${marqueeOffset2}px)`, opacity: 0.15 }}>
  {[...logos, ...logos, ...logos].map((logo, i) => (
    <img key={i} src={logo} style={{ height: 40, filter: "grayscale(100%) contrast(200%)", flexShrink: 0 }} />
  ))}
</div>
```

Rules:
- `filter: grayscale(100%)` mandatory — full-color logos distract from the core message
- `opacity: 0.15` max — background texture, not foreground element
- Triplicate the logo array for seamless infinite loop

---

## Anti-Patterns
- NEVER show 100% opacity logos in background — apply `grayscale(100%)` + opacity ≤ 0.30
- NEVER space avatars evenly — use `marginLeft: -20px` overlap for community feel
- NEVER stagger avatars more than 3 frames apart — 2f keeps it rapid and decisive

## Quality Checklist
- [ ] Avatars use 2-frame stagger, negative margin overlap, border matching bg color
- [ ] Logo marquees use `grayscale(100%)` filter and opacity ≤ 0.15
- [ ] Marquee uses `(frame * speed) % width` for seamless infinite scroll
- [ ] Central stat/label uses `overflow:hidden` + `translateY(100%→0%)` masked reveal
- [ ] Scene has CinematicCamera wrapper (zoomTo: 1.03 — subtle, not dramatic)

---

## Interface Pop-In on Screen

For a product screenshot inside a device frame — pop in with scale + fade:

```tsx
const interfacePopIn = spring({
  frame: frame - 15,
  fps,
  config: { damping: 12, stiffness: 100 },
});

<img
  src="YOUR_SCREENSHOT_URL"
  style={{
    width: "100%", height: "100%", objectFit: "cover",
    opacity: interpolate(interfacePopIn, [0, 1], [0, 1]),
    transform: `scale(${interpolate(interfacePopIn, [0, 1], [1.1, 1])})`,
  }}
/>
```

---

## premium-split-screen

> Source: `src/skills/premium-split-screen.md`

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

---

## premium-stat-counter

> Source: `src/skills/premium-stat-counter.md`

---
title: Premium Stat Counter
impact: HIGH
impactDescription: Generates an ultra-large, spring-eased number counter to highlight massive metrics (ROI, time saved, users). The number is the undeniable hero of the scene.
tags: stat, counter, numbers, data, massive-text, kpi, metric, percentage, animated-counter
qualityBar: The number is the undeniable hero, sized at 160px+. It does not count linearly; it eases quickly at first and slows drastically as it approaches the final target, creating suspense and weight.
---

## When to Use

A single metric that proves the product's value, shown at massive scale. The stat fills the screen — nothing else competes for attention.

Use for:
- Problem scenes: "73% of customer data is never acted on"
- Value proof: "Teams close deals 3× faster"
- Impact scenes: "$2.4M saved per year on average"
- One before, one after — shown sequentially

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const StatCounterScene = ({ BRAND, textStack, targetNumber, prefix = "", suffix = "%" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring-eased counter: low stiffness = decelerates heavily near the end
  // This creates "suspense weight" — not a robotic linear count
  const countSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 24, stiffness: 60 }, // Low stiffness = slow deceleration
    durationInFrames: 60,
  });
  const currentNumber = Math.floor(interpolate(countSpring, [0, 1], [0, targetNumber]));
  const formattedNumber = currentNumber.toLocaleString(); // Comma-separated: 1,234,567

  // Label reveal (early, sets context before number lands)
  const labelSpring = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 140 } });
  // Subline reveal (after counter reaches 80% of target)
  const sublineReveal = interpolate(countSpring, [0.8, 1], [0, 1], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{
      backgroundColor: BRAND.bg || "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* Ambient background glow — number casts a light source */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "80%", height: "60%",
        borderRadius: "50%",
        background: `radial-gradient(ellipse, ${BRAND.primary || "#6366f1"}18 0%, transparent 70%)`,
        filter: "blur(60px)",
        opacity: countSpring,
      }} />

      {/* Section Label — reveals first to frame the incoming number */}
      <div style={{ overflow: "hidden", marginBottom: 24 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: BRAND.primary || "#6366f1",
          fontFamily: "Inter, sans-serif",
          transform: `translateY(${interpolate(labelSpring, [0, 1], [100, 0])}%)`,
        }}>
          {textStack?.label || "The Result"}
        </div>
      </div>

      {/* MASSIVE NUMBER — the hero */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        fontFamily: "Inter, sans-serif",
        lineHeight: 1.0,
        letterSpacing: "-0.05em", // Extremely tight — essential for heroic scale
      }}>
        {/* Prefix (e.g. "$") — 55% of number size, brand colored */}
        {prefix && (
          <span style={{
            fontSize: 120,
            fontWeight: 900,
            color: BRAND.primary || "#6366f1",
            marginRight: 8,
          }}>
            {prefix}
          </span>
        )}

        {/* Main number — 220px heroic scale */}
        <span style={{
          fontSize: 220,
          fontWeight: 900,
          color: "#ffffff",
          fontVariantNumeric: "tabular-nums",
        }}>
          {formattedNumber}
        </span>

        {/* Suffix (e.g. "%", "×", "K") — 55% of number size, brand colored */}
        {suffix && (
          <span style={{
            fontSize: 120,
            fontWeight: 900,
            color: BRAND.primary || "#6366f1",
            marginLeft: 8,
          }}>
            {suffix}
          </span>
        )}
      </div>

      {/* Subline — appears once the counter reaches 80% of target */}
      <div style={{ overflow: "hidden", marginTop: 32 }}>
        <div style={{
          fontSize: 28, color: "#94a3b8",
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          textAlign: "center",
          maxWidth: 700,
          transform: `translateY(${interpolate(sublineReveal, [0, 1], [100, 0])}%)`,
          opacity: sublineReveal,
        }}>
          {textStack?.subline || "compared to industry average"}
        </div>
      </div>

    </AbsoluteFill>
  );
};
```

---

## Spring / Timing Reference

| Element | Config | Behavior |
|---|---|---|
| Counter spring | `stiff:60, damp:24` | Rapid start, heavy deceleration — like a car braking |
| Section label | `stiff:140, damp:16` | Normal MaskedReveal, reveals at f:5 |
| Subline reveal | Triggers at `countSpring > 0.8` | Only appears after counter is nearly done |

---

## Multiple Stats Variant (3-Column)

For showing 3 metrics side-by-side — each counter is staggered by 20 frames:

```tsx
const STATS = [
  { value: 94,   prefix: "",  suffix: "%",  label: "Faster", context: "time to close" },
  { value: 2400, prefix: "$", suffix: "K",  label: "Saved",  context: "per team per year" },
  { value: 12,   prefix: "",  suffix: "×",  label: "More",   context: "leads converted" },
];

{STATS.map((stat, i) => {
  const STAT_START = i * 20;
  const statSpring = spring({ frame: frame - STAT_START, fps, config: { damping: 24, stiffness: 60 }, durationInFrames: 60 });
  const current = Math.floor(interpolate(statSpring, [0, 1], [0, stat.value]));

  return (
    <div key={i} style={{ textAlign: "center", opacity: statSpring }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: BRAND.primary, marginBottom: 8 }}>{stat.label}</div>
      <div style={{ fontSize: 120, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.0 }}>
        {stat.prefix}{current.toLocaleString()}{stat.suffix}
      </div>
      <div style={{ fontSize: 18, color: "#64748b", marginTop: 8 }}>{stat.context}</div>
    </div>
  );
})}
```

---

## Anti-Patterns

- **NEVER use linear math** (`frame * speed`) for the counter. It feels robotic and stops abruptly. Drive with a low-stiffness `spring` so it decelerates naturally.
- **NEVER make prefix/suffix the same size as the main number.** The `$`, `%`, `×` should be ~55% of the number size and branded with `BRAND.primary`.
- **NEVER go below 160px for the main number.** Anything smaller loses the "heroic scale" impact that makes the stat memorable.
- **NEVER use `fontVariantNumeric: "tabular-nums"` only on the suffix** — it must wrap the entire number to prevent layout shift as digits change.
- **NEVER reveal the subline simultaneously with the number.** Tie it to `countSpring > 0.8` — the label is the punchline, it lands AFTER the number settles.

---

## Quality Checklist

- [ ] Number size is `160px` minimum (`220px` preferred for full-screen stat)
- [ ] Letter spacing is extremely tight: `-0.05em`
- [ ] Number formatted with `.toLocaleString()` for comma separators
- [ ] Counter uses `spring` with `stiffness:60` — NOT linear frame math
- [ ] Prefix/suffix are ~55% of number size and colored with `BRAND.primary`
- [ ] Subline reveal tied to `countSpring > 0.8` (appears after counter settles)
- [ ] Background has radial glow behind number (opacity tied to `countSpring`)

---

## premium-tactile-feedback

> Source: `src/skills/premium-tactile-feedback.md`

# premium-tactile-feedback

## Purpose
A behavioral trait skill — teaches any UI element to physically react to CURSOR_STATE. Produces the "hand-animated weight" seen in WhatAStory videos where cards tilt toward the cursor, buttons squish on click, and the background glows follow the mouse. Use this skill in ANY cursor-engine or chameleon-ui scene to add an extra layer of tactile realism.

## When to use
- Add to any scene that also uses `premium-cursor-engine` or `premium-chameleon-ui`
- When product cards, avatars, or feature tiles should feel "physical" and reactive
- When you want the glow bg to follow the cursor (ambient light effect)
- Works best on interactive-showcase scenes with 2–4 interactable elements

## Scope variables available
- `useCursorState(CURSOR_STEPS)` — derive `{ x, y, vx, vy, isClicking, speed }` per frame
- `useMagnetic(cursorX, cursorY, elementX, elementY, intensity, radius)` — tilt element toward cursor
- `useInteractionFeedback(clickFrame, direction)` — squish/nudge on click

## 1. Magnetic Pull Pattern

Elements tilt 2–4° toward cursor when within 150px. Creates "hand-animated weight."

```tsx
const { width, height } = useVideoConfig();
const cursorState = useCursorState(CURSOR_STEPS);
const cursorPxX = cursorState.x * width;
const cursorPxY = cursorState.y * height;

// For each card/element, know its center position in px
const CARD_X = width * 0.5;  // card center X
const CARD_Y = height * 0.45; // card center Y

const { rotateX, rotateY } = useMagnetic(cursorPxX, cursorPxY, CARD_X, CARD_Y, 1, 150);

<div style={{
  transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
  transformStyle: "preserve-3d",
  transition: "none", // let physics handle it — no CSS transition
}}>
  {/* card content */}
</div>
```

## 2. Squish on Click Pattern

On click: scaleY: 0.95, scaleX: 1.05 (physical press squish, not just uniform scale).

```tsx
// CLICK_FRAME: the frame when cursor arrives and clicks (step.time + 25)
const { scale, nudgeY, glowOpacity } = useInteractionFeedback(CLICK_FRAME, "down");

// Apply asymmetric squish: scaleX slightly expands while scaleY compresses
const squishX = 1 + (1 - scale) * 0.5;  // expands slightly horizontally
const squishY = scale;                    // compresses vertically

<div style={{
  transform: `scaleX(${squishX}) scaleY(${squishY}) translateY(${nudgeY}px)`,
}}>
  {/* button or card */}
</div>

{/* Click glow burst behind element */}
<div style={{
  position: "absolute", inset: -8, borderRadius: "inherit",
  background: BRAND.primary,
  filter: "blur(16px)",
  opacity: glowOpacity * 0.5,
  pointerEvents: "none",
}} />
```

## 3. Glow Trail Pattern

Background radial gradient follows CURSOR_STATE.x/y — ambient light tracks the cursor.

```tsx
const { width, height } = useVideoConfig();
const cursorState = useCursorState(CURSOR_STEPS);

// Smooth the cursor position so the glow lags slightly behind cursor (cinematic)
const glowX = cursorState.x * 100; // % position
const glowY = cursorState.y * 100;

<div style={{
  position: "absolute", inset: 0,
  background: `radial-gradient(circle 300px at ${glowX}% ${glowY}%, ${BRAND.primary}18 0%, transparent 70%)`,
  pointerEvents: "none",
  zIndex: 1,
}} />
```

## 4. Velocity Tilt Pattern

Element leans in the direction of cursor movement — amplifies the sense of motion.

```tsx
const cursorState = useCursorState(CURSOR_STEPS);

// Velocity-based tilt: vx/vy are px/frame
// Cap at ±3° to avoid wild rotations
const tiltY = Math.max(-3, Math.min(3, cursorState.vx * 0.015));
const tiltX = Math.max(-3, Math.min(3, -cursorState.vy * 0.015));

<div style={{
  transform: `perspective(600px) rotateY(${tiltY}deg) rotateX(${tiltX}deg)`,
}}>
  {/* cursor or fast-moving element */}
</div>
```

## Complete Scene Example

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cursorState = useCursorState(CURSOR_STEPS);
  const cursorPxX = cursorState.x * width;
  const cursorPxY = cursorState.y * height;

  // Card positions
  const cards = [
    { label: "Analytics", x: width * 0.3, y: height * 0.5, clickFrame: 55 },
    { label: "Reports",   x: width * 0.7, y: height * 0.5, clickFrame: 95 },
  ];

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Ambient cursor glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle 350px at ${cursorState.x * 100}% ${cursorState.y * 100}%, ${BRAND.primary}15 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {cards.map((card, i) => {
        const { rotateX, rotateY } = useMagnetic(cursorPxX, cursorPxY, card.x, card.y, 1, 150);
        const { scale, nudgeY, glowOpacity } = useInteractionFeedback(card.clickFrame, "down");
        const squishX = 1 + (1 - scale) * 0.5;

        return (
          <div key={i} style={{
            position: "absolute",
            left: card.x - 120, top: card.y - 80,
            width: 240, height: 160,
            transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scaleX(${squishX}) scaleY(${scale}) translateY(${nudgeY}px)`,
            transformStyle: "preserve-3d",
            ...getGlassCard(BRAND),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* Click glow */}
            <div style={{
              position: "absolute", inset: -4, borderRadius: 24,
              background: BRAND.primary, filter: "blur(20px)",
              opacity: glowOpacity * 0.45, pointerEvents: "none",
            }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: BRAND.text }}>{card.label}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
```

## Key Rules

- **Always use `useCursorState(CURSOR_STEPS)`** — not manual frame checks — so velocity is available
- **Max magnetic tilt: 8°** — beyond this feels broken, not responsive
- **Cap velocity tilt at 3°** — more = nauseating
- **Glow trail opacity: 0.15–0.25** — should feel ambient, not overwhelming
- **Layer order**: glow trail at zIndex:0, cards at zIndex:1, cursor at zIndex:10

---

## premium-team-orbit

> Source: `src/skills/premium-team-orbit.md`

---
title: Premium Team Orbit
impact: HIGH
impactDescription: Generates a 3D isometric orbiting ring of avatars or icons around a central product hub, complete with dynamic Z-depth and blur.
tags: orbit, team, collaboration, avatars, 3d-depth, split-layout, 40-60-split, real-time, multiplayer
qualityBar: The scene feels like a 3D diorama. Avatars travel in an isometric ellipse, scaling down and blurring as they pass *behind* the central hub, and scaling up sharply as they pass in front. The 40/60 layout pairs this motion with an authoritative text stack.
---

## Scene Purpose

To visualize "multiplayer" features: real-time collaboration, team invites, role management, or community. It physicalizes the concept of users surrounding and interacting with your product.

## Visual Blueprint

```text
[      Cinematic Camera Wrapper (1.0 -> 1.05 Zoom)              ]
[                                                               ]
[   (Left 40%: The 3-Layer Stack)    (Right 60%: 3D Orbit)      ]
[                                                               ]
[   T E A M W O R K                       ___ [Avatar] ___      ]
[                                      __/  (Small/Blur)  \__   ]
[   Collaborate in                    /                      \  ]
[   real-time.                     [Avatar]  [HERO HUB]  [Avatar]
[                                     \__                  __/  ]
[   Invite your whole team               \__ (Large/Sharp)__/   ]
[   with custom role access.                  [Avatar]          ]
[                                                               ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const TeamOrbitScene = ({ BRAND, textStack, avatars, centerIcon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. TIMING & ORBIT CONSTANTS
  const TEXT_START   = 5;
  const HUB_START    = 15;
  const AVATAR_START = 22;
  const ORBIT_SPEED  = 400; // Frames per full rotation (slow, graceful)

  // 2. SPRINGS — All elements use stiff:140, damp:16
  const labelSpring    = spring({ frame: frame - TEXT_START,        fps, config: { damping: 16, stiffness: 140 } });
  const headlineSpring = spring({ frame: frame - (TEXT_START + 5),  fps, config: { damping: 16, stiffness: 140 } });
  const sublineSpring  = spring({ frame: frame - (TEXT_START + 12), fps, config: { damping: 16, stiffness: 140 } });
  const hubSpring      = spring({ frame: frame - HUB_START,         fps, config: { damping: 16, stiffness: 140 } });

  // 3. ORBIT GEOMETRY — Ellipse creates 3D tilt
  // CRITICAL: RADIUS_X >> RADIUS_Y creates isometric 3D depth
  const RADIUS_X = 260;  // Wide horizontal axis
  const RADIUS_Y = 80;   // Narrow vertical axis — creates the 3D illusion

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg || "#0f172a", overflow: "hidden" }}>

      {/* GLOBAL CINEMATIC ZOOM */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `scale(${interpolate(frame, [0, 150], [1.0, 1.05])})`,
        display: "flex", width: "100%", height: "100%",
      }}>

        {/* LEFT 40%: TEXT STACK */}
        <div style={{ width: "40%", paddingLeft: "8%", display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 20 }}>
          {/* Section Label */}
          <div style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase",
              color: BRAND.primary || "#6366f1", fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(labelSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.label}
            </div>
          </div>
          {/* Hero Headline */}
          <div style={{ overflow: "hidden", paddingBottom: 4, marginBottom: 24 }}>
            <div style={{
              fontSize: 80, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#ffffff",
              fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(headlineSpring, [0, 1], [100, 0])}%)`,
            }}>
              {textStack.headline}
            </div>
          </div>
          {/* Sub-line */}
          <div style={{ overflow: "hidden" }}>
            <div style={{
              fontSize: 24, fontWeight: 400, lineHeight: 1.5, color: "#94a3b8",
              maxWidth: "90%", fontFamily: "Inter, sans-serif",
              transform: `translateY(${interpolate(sublineSpring, [0, 1], [100, 0])}%)`,
              opacity: sublineSpring,
            }}>
              {textStack.subline}
            </div>
          </div>
        </div>

        {/* RIGHT 60%: 3D ORBIT */}
        <div style={{
          width: "60%",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>

          {/* Orbit Track Ring — subtle glass ellipse */}
          <div style={{
            position: "absolute",
            width: RADIUS_X * 2,
            height: RADIUS_Y * 2,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.05)",
            boxShadow: "0 0 40px rgba(255,255,255,0.02) inset",
            opacity: interpolate(hubSpring, [0, 1], [0, 1]),
          }} />

          {/* Central Hub (Z: 50) — glass card, ambient pulse */}
          <div style={{
            position: "absolute",
            zIndex: 50,
            width: 140, height: 140, borderRadius: 32,
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            borderTop:    "1px solid rgba(255, 255, 255, 0.20)",
            borderLeft:   "1px solid rgba(255, 255, 255, 0.12)",
            borderRight:  "1px solid rgba(255, 255, 255, 0.06)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.40)",
            boxShadow: `0 30px 60px rgba(0,0,0,0.4), 0 0 40px ${BRAND.primary || "#6366f1"}20`,
            display: "flex", justifyContent: "center", alignItems: "center",
            transform: `scale(${hubSpring}) translateY(${interpolate(Math.sin(frame * 0.05), [-1, 1], [-5, 5])}px)`,
          }}>
            {centerIcon ? (
              <img src={centerIcon} style={{ width: 64, height: 64, objectFit: "contain" }} />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: BRAND.primary || "#6366f1",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif",
              }}>
                {(BRAND.name || "?")[0]}
              </div>
            )}
          </div>

          {/* ORBITING AVATARS — 3D depth sorting */}
          {avatars.slice(0, 5).map((avatar, i) => {
            const avatarSpring = spring({
              frame: frame - (AVATAR_START + i * 8),
              fps,
              config: { damping: 16, stiffness: 140 },
            });

            // Evenly space avatars around the orbit + continuous rotation
            const angleOffset   = (Math.PI * 2) * (i / 5);
            const currentAngle  = angleOffset + ((frame / ORBIT_SPEED) * Math.PI * 2);

            // Position on the ellipse
            const x = Math.cos(currentAngle) * RADIUS_X;
            const y = Math.sin(currentAngle) * RADIUS_Y;

            // 3D DEPTH MATH:
            // y > 0 = front of orbit (closer to viewer) = higher z, larger, sharp
            // y < 0 = back of orbit (behind hub) = lower z, smaller, blurred
            const zIndex      = y > 0 ? 60 : 40;
            const depthScale  = interpolate(y, [-RADIUS_Y, RADIUS_Y], [0.65, 1.2]);
            const depthBlur   = interpolate(y, [-RADIUS_Y, RADIUS_Y], [6, 0]);
            const depthBright = interpolate(y, [-RADIUS_Y, RADIUS_Y], [0.5, 1]);

            return (
              <div key={i} style={{
                position: "absolute",
                zIndex,
                transform: `translate(${x}px, ${y}px) scale(${interpolate(avatarSpring, [0, 1], [0, depthScale])})`,
                filter: `blur(${depthBlur}px) brightness(${depthBright})`,
                opacity: avatarSpring,
              }}>
                <div style={{
                  width: 72, height: 72,
                  borderRadius: "50%",
                  border: `3px solid ${BRAND.bg || "#1e293b"}`, // Cutout border matches bg
                  backgroundImage: avatar ? `url(${avatar})` : undefined,
                  backgroundSize: "cover",
                  backgroundColor: avatar ? undefined : (BRAND.primary || "#6366f1"),
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif",
                }}>
                  {!avatar && ["A","B","C","D","E"][i]}
                </div>
              </div>
            );
          })}

        </div>

      </div>
    </AbsoluteFill>
  );
};
```

---

## Depth Math Reference

| Y Position | zIndex | Scale | Blur | Brightness |
|---|---|---|---|---|
| Back (`y = -80`) | 40 | 0.65× | 6px | 50% |
| Side (`y = 0`) | 50 | 0.925× | 3px | 75% |
| Front (`y = +80`) | 60 | 1.20× | 0px | 100% |

**The rule**: `zIndex = y > 0 ? 60 : 40` — avatars passing in front of the hub get `z:60`, behind get `z:40`. The hub stays at `z:50` always.

---

## Logo + Brand Reveal Variant

For a product reveal scene where the hub transitions from logo → full brand identity:

```tsx
const REVEAL_START = 60; // After orbit is established

// Phase 0: Just the hub logo
// Phase 1: Hub pulses + brand name rises below it
const brandReveal = spring({ frame: frame - REVEAL_START, fps, config: { damping: 16, stiffness: 140 } });

{/* Brand name beneath hub — rises up from below */}
<div style={{
  position: "absolute",
  zIndex: 55,
  top: "calc(50% + 90px)", // Below the hub
  left: "50%",
  transform: `translate(-50%, 0) translateY(${interpolate(brandReveal, [0, 1], [20, 0])}px)`,
  opacity: brandReveal,
  textAlign: "center",
}}>
  <div style={{
    fontSize: 28, fontWeight: 800, color: "#fff",
    letterSpacing: "-0.03em", fontFamily: "Inter, sans-serif",
  }}>
    {BRAND.name}
  </div>
</div>
```

---

## Anti-Patterns

- **NEVER use a perfect circle for the orbit** (`RADIUS_X === RADIUS_Y`). It looks flat and 2D. The ellipse (`RADIUS_X:260, RADIUS_Y:80`) creates the 3D tilt illusion — the narrower the Y, the more dramatic the perspective.
- **NEVER use static zIndex for orbiting avatars.** The dynamic `zIndex = y > 0 ? 60 : 40` swap is what makes avatars physically travel *behind* the hub.
- **NEVER center the orbit without the text stack.** The 40/60 split provides the narrative context that makes the orbit meaningful.
- **NEVER skip the depth blur.** `blur(6px)` on background avatars + `blur(0px)` on foreground is the visual shorthand for 3D depth — without it, the orbit reads as flat rotation.

---

## Quality Checklist

- [ ] Scene wrapped in slow cinematic zoom (`1.0→1.05` over 150f)
- [ ] 40/60 split with 3-Layer Text Stack on the left
- [ ] All springs use `{ stiffness: 140, damping: 16 }`
- [ ] Ellipse: `RADIUS_X:260` (wide), `RADIUS_Y:80` (narrow) — NOT a circle
- [ ] `zIndex` dynamically switches based on `y > 0` threshold
- [ ] Depth scale: `[0.65, 1.2]` across `y` range
- [ ] Depth blur: `[6px, 0]` across `y` range (front = sharp, back = soft)
- [ ] Hub has ambient sine-wave pulse (`frame * 0.05`)
- [ ] Avatar border color matches `BRAND.bg` for clean cutout overlap

---

## premium-testimonial-card

> Source: `src/skills/premium-testimonial-card.md`

# premium-testimonial-card

## WHAT IT IS
A full-screen trust-building quote card: large opening quotation mark (decorative, 200px, BRAND.primary at 12% opacity), 2–3 lines of testimonial text that appears word by word, then the person's avatar circle + name + company role slides up from below. 5 gold star icons pop in. The overall feel is editorial — like a magazine pullquote but animated.

## WHEN TO USE
- Social proof scene (primary or supplementary)
- Works as a standalone trust scene between showcase and CTA
- When you have a real customer quote — use verbatim text
- Use instead of premium-social-proof when the video needs a focused single testimonial moment (not a wall of cards)
- Pairs perfectly after a premium-stat-counter or premium-metric-flyout scene

## COMPOSITION
- Background: BRAND.bg (dark) or white (light); subtle vignette radial gradient at edges
- Opening quote mark: `"` character, fontSize 240px, fontWeight 900, color BRAND.primary at 12% opacity, positioned top-left behind text block
- Quote text block: centered, maxWidth 860px, fontSize 40–46px, fontWeight 400, lineHeight 1.55, BRAND.text
- Attribution row: avatar circle (80px) + name (22px, fontWeight 700) + title/company (15px, BRAND.textMuted), centered, marginTop 48px
- Stars: 5 gold star characters, fontSize 26px, color "#F59E0B", gap 6px
- Closing thin horizontal rule: 1px line, 180px wide, BRAND.border, centered, appears after attribution

## ANIMATION SEQUENCE
1. f:0: Background fades in + decorative quote mark scales from 0.6 to 1.0 via SPRING_CONFIGS.entrance
2. f:20–90: Quote text reveals word by word — each word fades in + slides up 10px (stagger: 4 frames per word)
3. f:90 (or after all words): Attribution slides up from translateY(+40px), spring entrance
4. f:105: Stars pop in one by one (stagger 3 frames each), scale 0 to 1 with SPRING_CONFIGS.pop
5. f:120: Horizontal rule draws from center outward (width 0 to 180px)

## WORD-BY-WORD REVEAL PATTERN
```tsx
const QUOTE_WORDS = QUOTE_TEXT.split(" ");

// In JSX return:
// <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px", justifyContent: "center", maxWidth: 860 }}>
//   {QUOTE_WORDS.map((word, i) => {
//     const wordFrame = Math.max(0, frame - 20 - i * 4);
//     const wordOpacity = interpolate(wordFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
//     const wordY = interpolate(wordFrame, [0, 8], [10, 0], { extrapolateRight: "clamp", easing: EASINGS.easeOutCubic });
//     return (
//       <span key={i} style={{ opacity: wordOpacity, transform: translateY(wordY px), display: "inline-block" }}>
//         {word + " "}
//       </span>
//     );
//   })}
// </div>
```

## AVATAR VARIANTS
- With ATTACHED_IMAGES: use ATTACHED_IMAGES[0] as circular avatar (width 80, height 80, borderRadius "50%", objectFit "cover")
- Without image: colored circle with initials (2 chars from person name), background BRAND.primary, text white, fontSize 28px

## LIGHT THEME ADAPTATION
When BRAND.style === "light":
- Use LightArcBg as first child
- Background: white
- Attribution card: white card with medium shadow elevation, borderRadius 20, padding "24px 32px"

## DARK THEME ADAPTATION
When BRAND.style === "dark" or "neon":
- Background: BRAND.bg with radial glow (BRAND.primary at 5% opacity) centered
- Attribution: glass card via getGlassCard(BRAND)

## CONTENT GUIDELINES
- Quote text: 15–30 words (2–3 lines at 40px)
- Name: First + Last name only
- Title: "Head of Sales, CompanyName" or "CEO at CompanyName"
- Stars: always 5 full stars

## PAIRING RULES
- Follow with premium-cta-scene for strong close
- Can precede premium-logo-wall (testimonial then trusted-by)
- Add NotificationToast at f:60 with "Verified customer" for extra credibility

---

## sequencing

> Source: `src/skills/sequencing.md`

---
title: Timing & Sequencing
impact: HIGH
impactDescription: controls when elements appear and enables complex choreography
tags: sequence, series, timing, delay, choreography
---

## Sequence for Delayed Elements

Use Sequence to delay when an element appears in the timeline.

**Incorrect (manual frame checks):**

```tsx
{
  frame >= 30 && <Title />;
}
{
  frame >= 60 && <Subtitle />;
}
```

**Correct (Sequence component):**

```tsx
import { Sequence } from "remotion";

<Sequence from={30} durationInFrames={90}>
  <Title />
</Sequence>
<Sequence from={60} durationInFrames={60}>
  <Subtitle />
</Sequence>
```

## Series for Sequential Playback

Use Series when elements should play one after another without overlap.

```tsx
import { Series } from "remotion";

<Series>
  <Series.Sequence durationInFrames={45}>
    <Intro />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <MainContent />
  </Series.Sequence>
  <Series.Sequence durationInFrames={30}>
    <Outro />
  </Series.Sequence>
</Series>;
```

## Series with Offset for Overlap

Use negative offset for overlapping sequences:

```tsx
<Series>
  <Series.Sequence durationInFrames={60}>
    <SceneA />
  </Series.Sequence>
  <Series.Sequence offset={-15} durationInFrames={60}>
    {/* Starts 15 frames before SceneA ends */}
    <SceneB />
  </Series.Sequence>
</Series>
```

## Staggered Element Entrances

For staggered animations of multiple items, calculate delays:

**Incorrect (hardcoded delays):**

```tsx
const items = data.map((item, i) => {
  const delay = i === 0 ? 0 : i === 1 ? 10 : i === 2 ? 20 : 30;
  // ...
});
```

**Correct (calculated stagger):**

```tsx
const STAGGER_DELAY = 8;
const BASE_DELAY = 15;

const items = data.map((item, i) => {
  const delay = BASE_DELAY + i * STAGGER_DELAY;
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  return (
    <Item
      key={i}
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 20}px)`,
      }}
    />
  );
});
```

## Nested Sequences

Sequences can be nested for complex timing:

```tsx
<Sequence from={0} durationInFrames={120}>
  <Background />
  <Sequence from={15} durationInFrames={90}>
    <Title />
  </Sequence>
  <Sequence from={45} durationInFrames={60}>
    <Subtitle />
  </Sequence>
</Sequence>
```

## Frame References Inside Sequences

Inside a Sequence, useCurrentFrame() returns the local frame (starting from 0):

```tsx
<Sequence from={60} durationInFrames={30}>
  <MyComponent />
  {/* Inside MyComponent, useCurrentFrame() returns 0-29, not 60-89 */}
</Sequence>
```

## Per-Scene-Type Duration Defaults

Always use these frame counts as starting points (at 30fps):

| Scene type | Frames | Seconds | Notes |
|---|---|---|---|
| intro | 150 | 5s | Brand reveal, hook scene |
| section-title | 90 | 3s | Chapter break card |
| showcase | 210 | 7s | Product demo screen |
| features | 180 | 6s | Feature list/grid |
| social-proof | 150 | 5s | Trust scene |
| cta | 150 | 5s | Call-to-action finale |

## Hold Frames Before Transitions

After all animations complete, hold the final state for 20–30 frames before the cross-dissolve begins. This prevents the rushed feeling where elements are still animating when the transition starts.

```tsx
// Scene internally: animate over first 120–180 frames
// Hold at final state: frames 180–210
// Cross-dissolve begins: frame 210 (triggered by master composition)

// Example: animate cards at f:0–90, hold f:90–120 (no new animations)
const progress = spring({ frame: Math.min(frame, 90), fps, config: { damping: 200, stiffness: 120 } });
```

**Rule of thumb**: If your last animation completes at frame F, set `durationInFrames` to F + 30. The master composition adds HOLD_FRAMES (24) on top of that before starting the next scene's transition.

## Scene Pacing Pattern (Agency Standard)

For a 7-second showcase scene (210 frames):
- f:0–30 → Background + persistent elements appear
- f:0–80 → Main UI reconstruction staggers in (sidebar, topbar, cards, chart)
- f:80–110 → Cursor enters frame, springs to first target
- f:110–140 → First interaction (click + state change)
- f:140–180 → Second interaction or result state (toast, highlight)
- f:180–210 → Hold final state (no new animations — viewer absorbs the scene)

---

## Narrative Pacing — Emotional Intent Controls the Stagger

The `emotionalIntent` from the scene prompt changes how elements are sequenced and timed.
Read it from the prompt and adjust all timing accordingly:

### FRUSTRATION / PAIN scenes — chaotic, heavy

```tsx
// Stagger with RANDOM offsets — elements don't arrive at clean intervals
// This creates the "chaos" feeling
const NODES = [
  { delay: 5,  floatPhase: 0.0 },
  { delay: 22, floatPhase: 2.1 },  // uneven gaps: 17 frames
  { delay: 31, floatPhase: 1.4 },  // 9 frames — much shorter
  { delay: 48, floatPhase: 0.7 },  // 17 frames again
  { delay: 53, floatPhase: 3.2 },  // 5 frames — very fast
];
// Each element uses slow, heavy spring: { damping: 300, stiffness: 60 }
// Nothing is synchronized. Disorder IS the message.
```

### RELIEF / CONFIDENCE scenes — synchronized, clean

```tsx
// Stagger with EVEN, predictable intervals — elements arrive in formation
const STAGGER = 10; // exactly 10 frames each
const BASE = 20;

items.map((item, i) => ({
  ...item,
  delay: BASE + i * STAGGER, // 20, 30, 40, 50, 60 — clean, ordered
}));
// Each element uses smooth spring: { damping: 400, stiffness: 80 }
// Everything is synchronized. Order IS the message.
```

### URGENCY scenes — fast, compressed

```tsx
// Tight stagger: all elements arrive quickly (3–5 frames apart)
const STAGGER = 4;
const BASE = 8;
// Spring: { damping: 120, stiffness: 200 } — fast entrance, slight overshoot
// Total entrance window: 8 + (n * 4) frames — very compressed
```

### EXCITEMENT scenes — elastic, pop-in

```tsx
// Stagger: each element pops in with elastic spring
const STAGGER = 8;
const BASE = 5;
// Spring: { damping: 8, stiffness: 200 } — elastic pop, strong overshoot
// Each element visibly bounces past its final position before settling
```

---

## Scene Act Implementation

Every scene has 3 acts. Implement them with explicit frame gates:

```tsx
// At top of component — read act timing from scene prompt
const ACT_1_END = 50;     // setup phase ends
const ACT_2_END = 155;    // content phase ends
// ACT_3 = ACT_2_END → durationInFrames (hold phase)

// Act 1: ONE anchor element only
// Nothing else renders until ACT_1_END
{frame < ACT_1_END ? (
  // Only show: background + ONE anchor (section label, or main headline, or single icon)
  <HeadlineSectionLabel />
) : null}

// Act 2: Main content unfolds
{frame >= ACT_1_END && frame < ACT_2_END && (
  // All other elements, staggered from ACT_1_END
  // Stagger relative to ACT_1_END, not absolute frame 0
  <MainContent startFrame={ACT_1_END} />
)}

// Act 3: FREEZE. No new animations. Final state only.
// The resolve act is enforced by capping all spring frame inputs:
const safeFrame = Math.min(frame, ACT_2_END); // springs stop evolving after act 2
const cardSpring = spring({ frame: safeFrame - cardDelay, fps, config: {...} });
// After ACT_2_END: cardSpring is at its settled value forever — static hold
```

**The capped spring pattern is the key to WhatAStory's polished feel**. Every element reaches its final position and stays there. No floating, no pulsing, no drift in the resolve act (except a gentle CTA pulse).

---

## Problem Scene Timing Blueprint (180 frames / 6s)

```
f:0–15:   Background + aurora/atmosphere fades in
f:10–45:  First chaos element enters (large outline circle — problem node 1)
f:20–55:  Second chaos element (irregular gap — chaos feel)
f:33–65:  Third element
f:40–72:  Fourth element (pill with label: "Manual Process")
f:55–85:  Path starts drawing (dotted SVG — connecting the chaos)
f:60–95:  Headline enters top-left: "The chaos is costing you." (96px, weight 900)
f:75–100: Sub-line: "12 hours/week per person — just in reporting"
f:90–130: Path completes, traveling dot reaches end
f:130–180: HOLD. Nothing new. The chaos is visible. The cost is readable.
```

## Solution / AHA Scene Timing Blueprint (210 frames / 7s)

```
f:0–20:   Dark to light transition — background shifts (match cut from problem)
f:15–50:  Product UI enters cleanly (single smooth slide-up)
f:40–70:  AHA headline enters: "Done. Automatically." (120px, weight 900, BRAND.primary accent)
f:60–85:  Sub-line enters: "MarkyStudio handles the rest"
f:70–140: Cursor interaction / key transformation happens
f:140–170: Success state (checkmark / green / toast)
f:170–210: HOLD — viewer absorbs the transformation. Minimum 40 frames.
           The headline stays. The success state is visible. This is the payoff.
```

## CTA Scene Timing Blueprint (150 frames / 5s)

```
f:0–15:   Background enters (CTA skill's own atmosphere)
f:10–35:  Hero headline pops in (120–160px, 3–5 words, gradient text)
f:30–60:  CTA button springs in (elastic: damping:8, stiffness:200)
f:50–90:  URL types in character by character
f:60–90:  Supporting sub-line fades in
f:90–150: HOLD — button pulse only (scale: 1.0 → 1.02 → 1.0, 60-frame loop)
          Everything else is static. The CTA is the only thing that moves.
```

---

## WhatAStory Composition Standard (MANDATORY FOR ALL SCENES)

These rules apply globally — every scene must satisfy all of them. They define the "agency-grade" quality bar observed across Screenjar, Qanapi, Fronter, Pretaa, Viable, and Bordio reference videos.

### 1. The 3-Layer Text Stack

Every scene with text MUST have this exact 3-level hierarchy:

```tsx
// Layer 1 — Section Label (z:20) — uppercase, brand.primary, tracked out
<div style={{
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: BRAND.primary,
  fontFamily: BRAND.font + ", sans-serif",
  opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateRight: "clamp" }),
  marginBottom: 16,
}}>
  THE PROBLEM  {/* or: THE SOLUTION / FEATURES / RESULTS */}
</div>

// Layer 2 — Outcome Headline (z:20) — 96–128px, weight 900, outcome-focused
// MANDATORY: wrap in MaskedReveal — NEVER use opacity fade alone
<MaskedReveal startFrame={20}>
  <div style={{
    fontSize: 108,
    fontWeight: 900,
    lineHeight: 1.0,
    letterSpacing: "-0.04em",
    color: BRAND.text,
    fontFamily: BRAND.font + ", sans-serif",
  }}>
    Done in seconds.
  </div>
</MaskedReveal>

// Layer 3 — Sub-line (z:20) — 22–28px, muted, contextual
<div style={{
  fontSize: 24,
  fontWeight: 400,
  color: BRAND.textMuted,
  lineHeight: 1.5,
  fontFamily: BRAND.font + ", sans-serif",
  maxWidth: 520,
  opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" }),
  transform: `translateY(${interpolate(frame, [40, 55], [12, 0], { extrapolateRight: "clamp" })}px)`,
  marginTop: 20,
}}>
  No manual steps. No exports. No waiting.
</div>
```

**Rules:**
- Section Label is ALWAYS present — even if short ("HOOK", "RESULTS", "GET STARTED")
- Headline NEVER uses opacity fade alone — always MaskedReveal
- Sub-line font size NEVER above 32px — it supports, not competes with headline
- All 3 layers appear at different frames: label f:8, headline f:20, sub-line f:40

---

### 2. Compositional Padding Standard

Reference videos use **15–20% margin** on all sides. Elements are never cramped against frame edges.

```tsx
// Minimum safe zones — never place content outside these bounds
const SAFE_LEFT   = width  * 0.14;   // 14% from left
const SAFE_RIGHT  = width  * 0.86;   // 86% from left (14% margin right)
const SAFE_TOP    = height * 0.12;   // 12% from top
const SAFE_BOTTOM = height * 0.88;   // 88% from top (12% margin bottom)

// Content padding rule: 80px minimum, 120px preferred for hero layouts
const CONTENT_PAD = 120;

// Text column width for split layouts: never wider than 42% of frame
const TEXT_COLUMN_MAX = width * 0.42;
```

---

### 3. Split-Screen Layout Rule (Showcase Scenes)

When a scene shows UI + explanatory text simultaneously:

```tsx
// Text occupies LEFT 40% — UI occupies RIGHT 60%
// UI gets slight 3D tilt (perspective + rotateY) for depth

// Text block — left side
<div style={{
  position: "absolute",
  left: CONTENT_PAD,
  top: "50%",
  transform: "translateY(-50%)",
  width: width * 0.38,
}}>
  {/* 3-layer text stack here */}
</div>

// UI block — right side, with 3D tilt
<div style={{
  position: "absolute",
  right: 0,
  top: "50%",
  transform: `translateY(-50%) perspective(1200px) rotateY(-8deg) rotateX(2deg) scale(${uiScale})`,
  transformOrigin: "right center",
  width: width * 0.58,
}}>
  {/* product screenshot or reconstructed UI */}
</div>
```

The `rotateY(-8deg)` tilt is the WhatAStory signature. It implies depth and makes the UI feel physical. Keep tilt between -6° and -10° — more than 12° looks distorted.

---

### 4. Entropy Dust Background (ALL Dark-Theme Scenes)

Every dark-theme scene must have 15–20 background dust particles at `zIndex: 5`. These are slow-drifting tiny bokeh dots that make the background feel "alive" without being distracting.

```tsx
// OUTSIDE component — stable reference
const DUST_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: random(`dust-x-${i}`) * 0.92 + 0.04,
  y: random(`dust-y-${i}`) * 0.92 + 0.04,
  size: random(`dust-s-${i}`) * 3 + 1.5,     // 1.5–4.5px
  speed: random(`dust-sp-${i}`) * 0.4 + 0.2, // slow
  phase: random(`dust-p-${i}`) * Math.PI * 2,
  opacity: random(`dust-o-${i}`) * 0.25 + 0.05, // 0.05–0.30
}));

// INSIDE component render
{DUST_PARTICLES.map((p, i) => (
  <div
    key={i}
    style={{
      position: "absolute",
      left: p.x * width + Math.sin(frame * p.speed * 0.03 + p.phase) * 12,
      top:  p.y * height + Math.cos(frame * p.speed * 0.025 + p.phase) * 8,
      width: p.size,
      height: p.size,
      borderRadius: "50%",
      background: BRAND.primary,
      opacity: p.opacity,
      zIndex: 1,
      filter: `blur(${p.size * 0.6}px)`,
      pointerEvents: "none",
    }}
  />
))}
```

**Why:** These micro-particles are visible in every Screenjar, Viable, and Pretaa scene. They signal studio-quality — their absence makes dark scenes feel "dead." 15–20 particles at 5% opacity is imperceptible individually but transforms the atmosphere.

---

### 5. Cinematic Camera Wrapper (ALL Scenes with UI Content)

Wrap all product UI content in a slow-zoom `CinematicCamera` — the signature polish of Fronter and Bordio. The zoom is barely perceptible (1.0 → 1.06) but adds unmistakable depth.

```tsx
// Target: the most important element in the scene
// For cursor scenes: use first waypoint x/y
// For UI scenes: use UI center (0.5, 0.5) or slightly above center (0.5, 0.42)
<CinematicCamera targetX={0.5} targetY={0.42} zoomTo={1.06}>
  {/* All UI content, screenshots, overlays */}
  {/* Do NOT put cursor inside — cursor stays outside at z:100 */}
</CinematicCamera>
```

Use `zoomTo: 1.06` for calm scenes (TRUST, RELIEF, CONFIDENCE).
Use `zoomTo: 1.10` for energetic scenes (URGENCY, EXCITEMENT, AHA).
Never exceed `zoomTo: 1.15` — it becomes nausea-inducing.

---

### 6. Hand Cursor Standard (ALL Cursor/Demo Scenes)

Reference videos universally use a **hand cursor** (pointing finger), not the standard arrow. This is non-negotiable for scenes with the `premium-cursor-engine` or `premium-chameleon-ui` skill.

**Every cursor scene must:**
- Use `premium-cursor-engine` hand cursor SVG (pointing finger with squeeze click animation)
- Have a `CursorAnnotationPill` during travel phases (not just on arrival)
- Use 22-frame travel duration (snappier than 25)
- Include a 10-frame dwell with micro-jitter before clicking

```tsx
// Hand cursor SVG — use this, not the arrow
const HAND_CURSOR = (
  <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
    <path d="M10 30 C10 33 12 35 15 35 L22 35 C26 35 28 32 28 29 L28 18 C28 16 27 15 25 15 L24 15 L24 10 C24 8 23 7 21 7 C19 7 18 8 18 10 L18 15 L16 15 L16 6 C16 4 15 3 13 3 C11 3 10 4 10 6 L10 15 C9 15 8 16 8 18 L8 24 Z" fill="white" stroke="#1e293b" strokeWidth="1.2"/>
    <path d="M10 18 L10 24" stroke="#1e293b" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

// Click squeeze: scale from 1 → 0.88 on click, spring back
const CLICK_SQUEEZE = isClicking
  ? interpolate(framesAfterArrival, [0, 5, 14], [1, 0.88, 1])
  : 1;

// Micro-jitter during dwell (10 frames before click)
const DWELL_START = currentStep.time + TRAVEL;
const isDwelling = frame >= DWELL_START && frame < DWELL_START + 10;
const jitterX = isDwelling ? Math.sin(frame * 1.8) * 1.2 : 0;
const jitterY = isDwelling ? Math.cos(frame * 2.1) * 0.8 : 0;
```

---

### 7. useVitality — Organic Life After Entrance

After elements enter the scene, they must not be frozen. Use `useVitality` to keep scenes alive during the hold phase.

**Available modes:**

| mode | motion | use on |
|---|---|---|
| `"bounce"` | Periodic Y dip + spring up (~1.5s interval) | Avatars, icons, notification badges |
| `"breathe"` | Sinusoidal scale ±1.5% | Inactive cards, background panels |
| `"float"` | Gentle Y sine drift ±4px | Orbiting pills, decorative blobs |
| `"pulse"` | Opacity 0.7→1.0 sine flicker | Status dots, badge pings, live indicators |

**Usage pattern — avatar row:**
```jsx
{avatars.map((a, i) => {
  const { y } = useVitality({ mode: "bounce", index: i, interval: 90 });
  return <div key={i} style={{ transform: `translateY(${y}px)` }}>{a}</div>;
})}
```

**Usage pattern — inactive cards breathing while active card is highlighted:**
```jsx
{cards.map((c, i) => {
  const isActive = i === activeIndex;
  const { scale } = useVitality({ mode: "breathe", index: i, speed: isActive ? 0 : 0.8 });
  return <div key={i} style={{ transform: `scale(${scale})`, outline: isActive ? `2px solid ${BRAND.primary}` : "none" }}>{c}</div>;
})}
```

**Rules:**
- ALWAYS add vitality to scenes with 3+ frame-hold avatars
- Use `index` parameter to stagger phase — never pass the same index to two elements
- `speed: 0` disables breathing (use on the "active" card that has other animation)
- Combine with entropy dust — vitality handles foreground elements, entropy handles background particles

### 8. Beat-Driven Choreography

Every generated video has a music track with a known BPM. Use `MUSIC_BPM` (injected scope variable) to align entrances and transitions to musical downbeats rather than arbitrary frame numbers.

**Available tools:**

| Symbol | Type | Description |
|---|---|---|
| `MUSIC_BPM` | number | BPM of the current track (90 corp, 128 energetic, 80 cinematic, 68 calm, 110 playful) |
| `useBeat()` | hook | 0–1 pulse value that peaks on each beat. Auto-reads `MUSIC_BPM` if no arg |
| `useBeatClock()` | hook | Returns `{ beat, bar, beatProgress, barProgress, isDownbeat }` |
| `snapToDownbeat(approxFrame, MUSIC_BPM, fps)` | function | Rounds frame up to next bar start (beat 1) |

**Pattern 1 — entrance on next downbeat after warm-up:**
```jsx
const { fps } = useVideoConfig();
const BEAT = fps * 60 / MUSIC_BPM;           // frames per beat
const enterFrame = snapToDownbeat(18, MUSIC_BPM, fps);  // first bar start ≥ frame 18
const bodyStart  = enterFrame + BEAT * 4;    // one bar later
const ctaStart   = bodyStart + BEAT * 4;     // two bars in
const prog = spring({ frame: frame - enterFrame, fps, config: SPRING_CONFIGS.entrance });
```

**Pattern 2 — pulse element on every beat:**
```jsx
const beat = useBeat();  // auto-reads MUSIC_BPM
<div style={{ transform: `scale(${1 + beat * 0.05})`, filter: `brightness(${1 + beat * 0.15})` }}>
  {headline}
</div>
```

**Pattern 3 — flash accent on bar downbeat only:**
```jsx
const { isDownbeat } = useBeatClock();  // auto-reads MUSIC_BPM
<div style={{ boxShadow: isDownbeat ? `0 0 24px ${BRAND.primary}` : "none" }}>...</div>
```

**Rules:**
- Use `snapToDownbeat` for first entrance frame — never hardcode `frame - 20` if a downbeat is available nearby
- Use `useBeat()` (no args) — it auto-reads `MUSIC_BPM` from scope
- Entrance stagger within a bar: space elements `BEAT / 2` frames apart (half-beat = tight but musical)
- Do NOT force every element onto a downbeat — only 1–2 key elements per scene should be beat-locked; the rest can follow freely

### 9. ZoomThrough Match Cut — Spatial Scene Continuity

The most cinematic transition type. The camera zooms INTO a UI coordinate at the end of Scene N, and zooms OUT from the same area at the start of Scene N+1. Fakes a continuous world without a shared coordinate system — pure CSS `scale` + `transformOrigin` trick.

**When to use:**
- Cursor ends on a CTA button → next scene shows the product "after" that click
- Problem scene ends zoomed on the pain point → solution scene zooms out from the fix
- Demo ends on a specific feature card → next scene dives into that feature

**Planner fields (set on BOTH scenes):**
```json
// Scene N (the zooming-out scene):
{
  "exitAnchor": { "x": 0.62, "y": 0.48 }
}
// Scene N+1 (the receiving scene):
{
  "transition": "zoomThrough"
}
```

`exitAnchor` x/y = normalized 0–1 center of the element being zoomed into. If Scene N has cursor waypoints, use the last waypoint's x/y directly.

**Rules:**
- Max 2 zoomThrough cuts per video
- Scene N's `exitAnchor` drives the zoom-in transform origin — match it to the cursor's last click or the dominant UI element
- Scene N+1's content must be visible at frame 0 (do NOT fly primary content in from off-screen — the zoom-out handles the entrance energy)
- Supporting elements (labels, badges) may spring in from frame 15+ as normal

**What the renderer does automatically:**
- Scene N: at exit window, `scale(1→10)` with `transformOrigin = exitAnchor.x% exitAnchor.y%`
- Scene N+1: at entrance, `scale(10→1)` from center — the portal "opens up" to reveal context
- No opacity change on either — pure zoom, no fade

### 10. Global Quality Anti-Patterns

**NEVER do these — they are the most common reasons generated scenes look "cheap":**

| Anti-Pattern | What it looks like | Fix |
|---|---|---|
| Headline opacity fade | Text fades in without movement | Use MaskedReveal — always |
| Same enter frame for all siblings | Elements pop in together | useStagger with min 8-frame gap |
| Hardcoded hex colors | Scene ignores brand | All colors via BRAND.* tokens |
| Standard arrow cursor | Robotic, impersonal | Use hand cursor SVG |
| No section label | Text floats without context | Always add 3-layer text stack |
| Static dark background | Scene feels dead | Add entropy dust (18 particles) |
| Centered text only (no split) | Boring, no depth | Use split layout for showcase scenes |
| Spring completes but scene continues | Elements drift/float forever | Cap spring input at act 2 end |
| Font size under 80px for hero | Hard to read, looks like body text | 96–128px for hero headlines |
| More than 3 elements entering simultaneously | Visual noise | Strict stagger — 1 element at a time |
| Avatars/cards are completely frozen after entering | Scene feels static mid-hold | Apply useVitality — bounce on avatars, breathe on cards |
| Literal dashboard panel in non-cursor scene | Cluttered, unreadable | Use ChunkCard + SkeletonTextBlock instead |
| Flat stagger when elements have parent-child hierarchy | Feels mechanical | Use useCascadeTree — card enters, then badge pops 4f later |
| CinematicCamera on cursor demo scenes | Camera fights the cursor | Use SteppedCamera: whip → hold → drift |
| Text headline pinned flat in spatial scene | Text floats disconnected from 3D | Use InWorldText at appropriate depth |

### 11. Agency-Tier Motion Systems

#### useCascadeTree — Hierarchical Micro-Choreography

Replace flat `useStagger` with `useCascadeTree` when elements have **parent-child relationships**. This is what makes agency videos feel like each element "births" the next.

```tsx
const cascade = useCascadeTree([
  { id: "card", frame: 20, children: [
    { id: "header", delay: 4, children: [
      { id: "badge", delay: 6, config: SPRING_CONFIGS.pop },
    ]},
    { id: "body", delay: 8 },
    { id: "cta",  delay: 14 },
  ]},
]);

// Each element driven by its cascade progress
<div style={{ opacity: cascade.get("card"), transform: `scale(${0.92 + cascade.get("card") * 0.08})` }}>
  <div style={{ opacity: cascade.get("header") }}>Title</div>
  <div style={{ opacity: cascade.get("badge"), transform: `scale(${cascade.get("badge")})` }}>🔔</div>
  <div style={{ opacity: cascade.get("body") }}><SkeletonTextBlock lines={2} startFrame={cascade.getFrame("body")} /></div>
</div>
```

**Rules:**
- Use flat `useStagger` for homogeneous siblings (list items, avatar rows)
- Use `useCascadeTree` when child B only makes sense after parent A appears
- Max nesting depth: 3 levels

#### SteppedCamera — Whip-Pan + Hard Hold

Replaces `CinematicCamera` for **cursor demo and showcase scenes**. Gives the "human camera operator" feel.

```tsx
// Pattern: snap to feature → hold so viewer reads UI → drift → whip back
<SteppedCamera keyframes={[
  { frame: 0,   x: 0.5,  y: 0.5,  zoom: 1.0,  easing: "ease"  },
  { frame: 20,  x: 0.62, y: 0.44, zoom: 1.18, easing: "whip", duration: 14 },
  { frame: 34,  x: 0.62, y: 0.44, zoom: 1.18, easing: "hold" },  // hard freeze
  { frame: 90,  x: 0.60, y: 0.47, zoom: 1.14, easing: "drift" }, // slight drift
  { frame: 130, x: 0.5,  y: 0.5,  zoom: 1.0,  easing: "whip", duration: 12 },
]}>
  <AppShell ... />
</SteppedCamera>
<CursorRenderer ... />  {/* ALWAYS outside SteppedCamera */}
```

**Easing reference:**
- `"whip"` — easeOutExpo, 15f default — urgent snap-to
- `"ease"` — easeOutCubic, 20f default — standard move
- `"hold"` — instant cut, 1f — hard freeze at current keyframe
- `"drift"` — linear, 60f — slow documentary drift

**Rules:**
- Always keep cursor/annotation layers OUTSIDE `<SteppedCamera>`
- Hard `"hold"` keyframe = viewer reads the UI — always provide at least 30f hold after a `"whip"`
- Max zoom 1.25 before composition clips

#### InWorldText — Typography in 3D Space

Use when text is a **prop in the scene** (floating stat, ambient label) rather than a primary headline.

```tsx
// Floating metric that lives at mid-depth, scales with camera push-in
<InWorldText depth={0.65} attach={{ x: 0.60, y: 0.42 }} cameraProgress={zoomProg}>
  <MaskedReveal startFrame={25}>
    <div style={{ fontSize: 56, fontWeight: 900, color: "#fff" }}>+124%</div>
  </MaskedReveal>
</InWorldText>

// Ghost label behind glass card (barely visible — adds depth context)
<InWorldText depth={0.15} attach={{ x: 0.28, y: 0.62 }}>
  <div style={{ fontSize: 32, opacity: 0.2, color: "#fff", fontWeight: 700 }}>Revenue</div>
</InWorldText>
```

**depth scale reference:** 0 = 0.55× scale (deep bg), 0.5 = 1.0× scale (neutral), 1 = 1.45× scale (foreground)

#### ChunkCard + SkeletonTextBlock — Stylized "Toy UI"

For non-cursor scenes where the UI is **context, not the demo**. Renders abstract oversized cards instead of literal reconstructed dashboards.

```tsx
// Problem scene: chunky cards to establish context (NOT a cursor demo)
<ChunkCard title="Monthly Churn" metric="18%" trend="up" brand={BRAND} startFrame={20} width={280} height={160} />
<ChunkCard title="Tickets Resolved" metric="847" trend="down" brand={BRAND} startFrame={28} width={280} height={160} />

// Replace unreadable paragraphs with skeleton bars
<SkeletonTextBlock lines={3} color={BRAND.primary} startFrame={30} />
```

**Rule:** If a scene does not have a cursor interaction with the UI, use `ChunkCard` instead of `ReconstructedAppShell`. Only render literal legible UI for the exact feature being demoed.

#### useTrackedParallax — Live-Action Composite Sway

For scenes with real video/photo backgrounds, simulates camera tracking parallax so UI overlays feel spatially "pinned" to the world.

```tsx
// Foreground panel drifts more than background card (depth = depth layer 0–1)
const panelSway = useTrackedParallax(0.75);
const bgSway    = useTrackedParallax(0.25);

<div style={{ transform: `translate(${bgSway.x}px, ${bgSway.y}px)` }}>
  <AnimatedMetricCards ... />
</div>
<div style={{ transform: `translate(${panelSway.x}px, ${panelSway.y}px)` }}>
  <ContentCard brand={BRAND}><AppShell .../></ContentCard>
</div>
```

---

