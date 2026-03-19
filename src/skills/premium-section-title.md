# premium-section-title

## When to Use
Use for chapter-break scenes between major product feature demos. Creates breathing room in the video pacing. Duration: 90 frames (3 seconds).

## Component
Use the SectionTitle component (in scope):
```tsx
<AbsoluteFill>
  <LightArcBg brand={BRAND} variant={GLOBAL_BG || "arcs"} />
  <SectionTitle
    title="Feature Name"
    subtitle="Optional subtitle"
    icon="🔒"
    brand={BRAND}
    startFrame={10}
  />
</AbsoluteFill>
```

## Rules
- Title text is in BRAND.primary color
- Font size: 48px for title, 18px for subtitle
- Use the same GLOBAL_BG background as all other scenes in the video
- Keep it simple — no additional elements needed
- Spring fade-in starting at frame 10
- Duration should be 90 frames (3 seconds at 30fps)
