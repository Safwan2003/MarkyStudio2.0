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
