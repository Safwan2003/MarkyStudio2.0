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
