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

## Video Plate Composite Pattern (STOCK_VIDEO_URL)

When STOCK_VIDEO_URL is set in scope (non-null), use video footage instead of a static photo.
This is the WhatAStory cinematic fusion look.

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const parallaxFg = useTrackedParallax(0.8);
const parallaxMid = useTrackedParallax(0.45);
const card1Progress = spring({ frame: frame - 15, fps, config: SPRING_CONFIGS.snap });
const card2Progress = spring({ frame: frame - 28, fps, config: SPRING_CONFIGS.snap });
const textProgress = spring({ frame: frame - 10, fps, config: SPRING_CONFIGS.entrance });

return (
  <AbsoluteFill>
    {STOCK_VIDEO_URL ? (
      <>
        <OffthreadVideo
          src={STOCK_VIDEO_URL}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.78 }}
          muted
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 100%)", backdropFilter: "blur(1.5px)" }} />
      </>
    ) : (
      <LightArcBg brand={BRAND} />
    )}
    <div style={{ position: "absolute", inset: 0, transform: `translate(${parallaxMid.x}px, ${parallaxMid.y}px)` }}>
      <div style={{ position: "absolute", top: "18%", right: "8%", opacity: card2Progress * 0.7, transform: `translateY(${(1 - card2Progress) * 30}px)` }}>
        <TiltWrapper tiltX={-2.5} tiltY={3} glossy>
          <ChunkCard title="Pain Metric" metric="6 hrs/week" trend="up" brand={BRAND} startFrame={28} width={240} height={130} />
        </TiltWrapper>
      </div>
    </div>
    <div style={{ position: "absolute", inset: 0, transform: `translate(${parallaxFg.x}px, ${parallaxFg.y}px)` }}>
      <div style={{ position: "absolute", top: "28%", left: "6%", opacity: card1Progress, transform: `translateY(${(1 - card1Progress) * 40}px)` }}>
        <TiltWrapper tiltX={-1.5} tiltY={2.5} glossy>
          <div style={{ ...getGlassCard(BRAND), padding: "20px 24px", minWidth: 260 }}>{/* metric card content */}</div>
        </TiltWrapper>
      </div>
    </div>
    <div style={{ position: "absolute", bottom: 72, left: 72, right: 72, background: "rgba(0,0,0,0.58)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: 14, padding: "20px 28px", border: "1px solid rgba(255,255,255,0.1)", opacity: textProgress, transform: `translateY(${(1 - textProgress) * 20}px)` }}>
      <MaskedReveal startFrame={10}>
        <div style={{ fontSize: 58, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.04em" }}>[HEADLINE FROM SCENE PROMPT]</div>
      </MaskedReveal>
      <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>[SUBLINE FROM SCENE PROMPT]</div>
    </div>
  </AbsoluteFill>
);
```

## Rules for video plate composite
- ALWAYS `muted` on OffthreadVideo — audio comes from voiceover + SFX only
- ALWAYS use `useTrackedParallax` on floating elements — without it they look pasted on
- NEVER put cursor interaction over live-action — footage competes with cursor
- Max 3 floating UI elements visible at once
- Text: always glass-backed lower third — never floating text directly on footage
- Video opacity: 0.70–0.82 so footage is visible but not dominating
