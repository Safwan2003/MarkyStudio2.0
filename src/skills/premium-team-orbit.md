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
