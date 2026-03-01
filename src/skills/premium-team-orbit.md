---
title: Premium Team/Problem Scene — Orbiting Team Members
impact: HIGH
impactDescription: creates a "chaotic team" or "collaboration" scene with floating avatar nodes, role badges, and staggered spring entrances
tags: team, avatars, orbit, roles, problem-scene, stagger, float, spring
---

## Team Member Orbit Pattern

Used for "Problem" or "Who We Help" scenes: multiple team member avatars float in with spring physics, each tagged with a colored role badge. Works on any dark or photo background.

### Data Setup

```tsx
const TEAM_MEMBERS = [
  { emoji: "👩‍💼", role: "MANAGER",    roleBg: "#ffedd5", roleColor: "#000", x: 0.15, y: 0.20, delay: 10,  size: 120 },
  { emoji: "👨‍💻", role: "DEVELOPER",  roleBg: "#fcd34d", roleColor: "#000", x: 0.80, y: 0.22, delay: 15,  size: 120 },
  { emoji: "🎨", role: "DESIGNER",   roleBg: "#f43f5e", roleColor: "#fff", x: 0.08, y: 0.50, delay: 20,  size: 110 },
  { emoji: "✍️", role: "COPYWRITER", roleBg: "#312e81", roleColor: "#fff", x: 0.90, y: 0.52, delay: 25,  size: 110 },
  { emoji: "🔬", role: "QA TESTER",  roleBg: "#2dd4bf", roleColor: "#fff", x: 0.20, y: 0.80, delay: 30,  size: 120 },
];
```

Coordinates are fractions of video `width`/`height`.

---

## Rendering Each Team Member

```tsx
{TEAM_MEMBERS.map((member, i) => {
  if (frame < member.delay) return null;

  const progress = spring({
    frame: frame - member.delay,
    fps,
    config: { stiffness: 100, damping: 15 },
  });

  const scale   = interpolate(progress, [0, 1], [0, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Independent float per member (phase-shifted by index)
  const floatY = Math.sin((frame - member.delay) / 35 + i) * 8;
  const floatX = Math.cos((frame - member.delay) / 45 + i) * 6;

  return (
    <div
      key={i}
      style={{
        position: "absolute",
        left: member.x * width,
        top:  member.y * height,
        transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
        opacity,
        zIndex: 10 + i,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Avatar Circle */}
      <div style={{
        width: member.size, height: member.size,
        borderRadius: "50%",
        background: "white",
        boxShadow: `0 20px 50px rgba(0,0,0,0.4), 0 0 0 4px ${member.roleBg}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: member.size * 0.45,
      }}>
        {member.emoji}
      </div>

      {/* Role Badge */}
      <div style={{
        background: member.roleBg,
        color: member.roleColor,
        padding: "8px 20px",
        borderRadius: 100,
        fontSize: 18,
        fontWeight: 800,
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        border: "3px solid white",
        fontFamily: "Inter, sans-serif",
        whiteSpace: "nowrap",
        letterSpacing: "0.05em",
      }}>
        {member.role}
      </div>
    </div>
  );
})}
```

---

## Animated Connecting Dots (SVG Overlay)

Subtle white dot at each member position + optional animated dashed line to center:

```tsx
{/* SVG dot overlay — place BEHIND the avatars (lower zIndex) */}
{TEAM_MEMBERS.map((member, i) => {
  if (frame < member.delay) return null;
  const progress = spring({ frame: frame - member.delay, fps, config: { stiffness: 100, damping: 15 } });
  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <svg key={i} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}>
      <circle
        cx={`${member.x * 100}%`}
        cy={`${member.y * 100}%`}
        r="4"
        fill="white"
        fillOpacity={opacity * 0.5}
      />
    </svg>
  );
})}
```

---

## Background: Dark Photo with Slow Zoom

For the "Problem" context feel — zoom into a real-world background image:

```tsx
const cameraScale = interpolate(frame, [0, 150], [1, 2.2], { extrapolateRight: "clamp" });
const cameraY     = interpolate(frame, [0, 150], [0, 1],   { extrapolateRight: "clamp" });

<AbsoluteFill style={{ backgroundColor: "black" }}>
  <div style={{
    width: "100%", height: "100%",
    transform: `scale(${cameraScale}) translateY(${cameraY}%)`,
    transformOrigin: "center center",
    willChange: "transform",
  }}>
    {/* Dark photo or gradient background */}
    <div style={{
      width: "100%", height: "100%",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    }} />
  </div>
</AbsoluteFill>
```

Combine with team members at `zIndex: 10+` so they float above the zooming background.

---

## Stagger Delay Formula

For N members, spread delays evenly:

```tsx
const TEAM_COUNT = 6;
const STAGGER = 10; // frames between each
// member[i].delay = i * STAGGER + BASE_DELAY
```

Common `BASE_DELAY` values:
- `0` — members appear immediately (fast hook)
- `30` — give background context 1s first
- `100+` — members appear after a dashboard or logo reveal
