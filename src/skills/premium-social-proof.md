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
