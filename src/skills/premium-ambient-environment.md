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
