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
