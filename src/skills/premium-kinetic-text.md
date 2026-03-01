---
title: Premium Kinetic Text & Brand Reveal
impact: HIGH
impactDescription: creates energetic word-by-word entrances, animated brand pills with glass effects, and flash transition overlays
tags: kinetic-text, typography, word-stagger, brand-pill, glassmorphism, flash-transition, headline
---

## Word-by-Word Spring Stagger (High Energy)

The fastest way to make any headline feel premium — each word pops in with spring physics, a slight rotation snap, and a slide-up:

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const HEADLINE  = "Tired of broken workflows?";
const STAGGER   = 3; // frames between words (tight = energetic, 5+ = dramatic)
const BASE_DELAY = 0;

const words = HEADLINE.split(" ");

<div style={{
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "0 16px",
  maxWidth: "80%",
}}>
  {words.map((word, i) => {
    const delay = BASE_DELAY + i * STAGGER;
    const wordSpring = spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 200 },
    });
    const wordY      = interpolate(wordSpring, [0, 1], [40, 0]);
    const wordRotate = interpolate(wordSpring, [0, 1], [10, 0]);

    return (
      <span key={i} style={{
        display: "inline-block",
        opacity: interpolate(frame, [delay, delay + 5], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${wordY}px) rotate(${wordRotate}deg) scale(${wordSpring})`,
        fontSize: 100,
        fontWeight: 900,
        color: "#1e293b",
        lineHeight: 1.0,
        fontFamily: "Inter, sans-serif",
        letterSpacing: "-0.03em",
        textShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}>
        {word}
      </span>
    );
  })}
</div>
```

**Tips:**
- `stagger: 3` = fast, punchy
- `stagger: 5–8` = dramatic, cinematic
- Wrap in `overflow: "hidden"` per-word to create a "text reveal" instead of a pop
- `fontSize: 80–120` for hero headlines; `40–60` for subheadlines

---

## Animated Brand Pill (Glassmorphism + Flash Sweep)

A premium "brand entry" card — white glass pill with a logo, brand name, and an animated light sweep:

```tsx
const PILL_DELAY = 30;

<div style={{
  opacity: interpolate(frame, [PILL_DELAY, PILL_DELAY + 10], [0, 1], { extrapolateRight: "clamp" }),
  transform: `translateY(${interpolate(
    spring({ frame: frame - PILL_DELAY, fps }),
    [0, 1], [50, 0]
  )}px)`,
}}>
  <div style={{
    position: "relative",
    display: "flex", alignItems: "center", gap: 20,
    background: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(20px)",
    boxShadow: "0 20px 60px rgba(100,116,139,0.25)",
    padding: "20px 48px",
    borderRadius: 9999, // Full pill
    border: "1px solid rgba(255,255,255,0.6)",
    overflow: "hidden",
    // Extra scale spring on the pill itself
    transform: `scale(${spring({ frame: frame - (PILL_DELAY + 5), fps, config: { stiffness: 150 } })})`,
  }}>
    {/* Flash sweep animation */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
      transform: `translateX(${interpolate(frame, [PILL_DELAY, PILL_DELAY + 40], [-200, 200])}%) skewX(12deg)`,
      pointerEvents: "none",
    }} />

    {/* Brand icon */}
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: 24, color: "white",
      flexShrink: 0,
      position: "relative", zIndex: 10,
    }}>
      B
    </div>

    {/* Text */}
    <div style={{ position: "relative", zIndex: 10 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: "#2dd4bf",
        letterSpacing: "0.15em", textTransform: "uppercase",
        fontFamily: "Inter, sans-serif",
        marginBottom: 2,
      }}>
        It's time for
      </div>
      <div style={{
        fontSize: 36, fontWeight: 900, color: "#1e293b",
        letterSpacing: "-0.03em", lineHeight: 1,
        fontFamily: "Inter, sans-serif",
      }}>
        BrandName
      </div>
    </div>
  </div>
</div>
```

---

## Flash Transition Overlay

A white flash at the very start of a scene for sharp, cinematic scene transitions:

```tsx
{/* White flash fades out in first 10 frames */}
<div style={{
  position: "absolute", inset: 0,
  background: "white",
  opacity: interpolate(frame, [0, 10], [1, 0], { extrapolateRight: "clamp" }),
  zIndex: 9999,
  pointerEvents: "none",
}} />
```

For a **dark flash** (into a dark scene):

```tsx
<div style={{
  position: "absolute", inset: 0,
  background: "black",
  opacity: interpolate(frame, [0, 8], [1, 0], { extrapolateRight: "clamp" }),
  zIndex: 9999,
  pointerEvents: "none",
}} />
```

---

## Headline Slide-Up from Clip (Wipe Reveal)

Wrap each word in an overflow container to create a clean wipe-in effect (no pop, just reveal):

```tsx
{words.map((word, i) => {
  const delay  = i * 4;
  const reveal = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });

  return (
    <div key={i} style={{ overflow: "hidden", lineHeight: 1.2 }}>
      <span style={{
        display: "inline-block",
        fontFamily: "Inter, sans-serif",
        fontSize: 80, fontWeight: 800, color: "#fff",
        transform: `translateY(${interpolate(reveal, [0, 1], [100, 0])}%)`,
      }}>
        {word}
      </span>
    </div>
  );
})}
```

---

## Rotating Background Orbs for Light Theme

Animated blurred orbs that drift slowly — pairs with the brand pill on white/soft backgrounds:

```tsx
const COLOR_ORB1 = "#2dd4bf"; // brand teal
const COLOR_ORB2 = "#3b82f6"; // blue
const COLOR_ORB3 = "#8b5cf6"; // violet

{/* Orb 1 */}
<div style={{
  position: "absolute", top: "-20%", left: "-10%",
  width: 600, height: 600, borderRadius: "50%",
  background: COLOR_ORB1,
  filter: "blur(100px)", opacity: 0.2,
  transform: `translate(${Math.sin(frame * 0.02) * 50}px, ${Math.cos(frame * 0.02) * 50}px)
              scale(${interpolate(frame, [0, 100], [0.8, 1.2])})`,
}} />

{/* Orb 2 */}
<div style={{
  position: "absolute", bottom: "-10%", right: "-5%",
  width: 500, height: 500, borderRadius: "50%",
  background: COLOR_ORB2,
  filter: "blur(120px)", opacity: 0.2,
  transform: `translate(${Math.cos(frame * 0.03) * -40}px, ${Math.sin(frame * 0.03) * 40}px)`,
}} />
```

---

## Spinning Spark / Starburst Accent

A decorative starburst that rotates continuously — adds dynamism to corners:

```tsx
<div style={{
  position: "absolute",
  top: "25%", right: "15%",
  opacity: 0.8, zIndex: 0,
}}>
  <svg
    width="60" height="60" viewBox="0 0 40 40"
    style={{
      transform: `rotate(${frame * 2}deg) scale(${spring({ frame: frame - 10, fps })})`,
    }}
  >
    <path
      d="M20 0L23 17L40 20L23 23L20 40L17 23L0 20L17 17L20 0"
      fill="#2dd4bf"
    />
  </svg>
</div>
```
