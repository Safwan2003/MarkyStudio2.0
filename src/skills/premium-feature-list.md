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
