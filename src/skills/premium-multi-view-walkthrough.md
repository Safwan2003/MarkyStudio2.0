# Multi-View Product Walkthrough

> Bordio-style multi-screenshot scene — sequence through multiple product views (table → kanban → calendar → detail) within a single scene using tab-switching transitions.

## When to Use
- Showcase scenes with 3+ uploaded screenshots of the same product
- Products with multiple views: table, kanban, calendar, list, detail, settings
- When `imageIndices` is set on ScenePlan (multiple images assigned to one scene)
- Complex dashboards requiring a "product tour" feel

## How It Works

When a scene has `imageIndices: [0, 2, 4]`, all three images are available as:
- `ATTACHED_IMAGES[0]` — first view
- `ATTACHED_IMAGES[1]` — second view
- `ATTACHED_IMAGES[2]` — third view

## Usage Pattern

```jsx
const SceneComponent = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const VIEWS = [
    { image: ATTACHED_IMAGES[0], label: "Board View", startFrame: 0 },
    { image: ATTACHED_IMAGES[1], label: "Calendar", startFrame: 80 },
    { image: ATTACHED_IMAGES[2], label: "Analytics", startFrame: 160 },
  ];

  // Find active view
  const activeIdx = VIEWS.reduce((acc, v, i) => frame >= v.startFrame ? i : acc, 0);

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Tab bar at top */}
      <div style={{
        position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 4, background: BRAND.surface,
        borderRadius: 10, padding: 4, zIndex: 50,
      }}>
        {VIEWS.map((v, i) => (
          <div key={i} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: i === activeIdx ? BRAND.primary : "transparent",
            color: i === activeIdx ? "#fff" : BRAND.textMuted,
            fontFamily: BRAND.font,
          }}>
            {v.label}
          </div>
        ))}
      </div>

      {/* View content with crossfade */}
      {VIEWS.map((v, i) => {
        const isActive = i === activeIdx;
        const enterProgress = spring({
          frame: frame - v.startFrame, fps,
          config: SPRING_CONFIGS.entrance
        });
        const opacity = isActive ? enterProgress : 0;
        const scale = interpolate(enterProgress, [0, 1], [0.97, 1]);
        return (
          <AbsoluteFill key={i} style={{ opacity, transform: `scale(${scale})` }}>
            <Img src={v.image} style={{
              width: width * 0.85, height: height * 0.75,
              objectFit: "contain",
              position: "absolute", left: "50%", top: "55%",
              transform: "translate(-50%, -50%)",
              borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
```

## Composition Rules

1. Show 2-4 views maximum per scene — more is too fast
2. Each view gets ~80 frames (2.7s at 30fps) — enough for a good look
3. Use a visible tab bar to indicate which view is active
4. Crossfade between views with spring entrance (not hard cut)
5. Optional: pair with MacroCamera to zoom into a specific area of each view
6. Optional: use SteppedCamera for a slow pan across each view
7. Add subtle scale transition (0.97 → 1.0) for depth feeling

## Tab Bar Variants

### Pill Tabs (Default)
Rounded pill selector, brand color on active tab

### Icon Tabs
Small icon + label, underline on active tab

### Breadcrumb Style
`Board > Calendar > Analytics` — active item is bold

## Scene Arc
```
Frames 0-10:    Scene enters, tab bar appears
Frames 0-80:    View 1 visible, optional cursor exploration
Frames 80-90:   Tab switches (active tab highlight moves)
Frames 80-160:  View 2 visible, optional cursor exploration
Frames 160-170: Tab switches again
Frames 160-240: View 3 visible
```

## UI Continuity Rules (CRITICAL — makes views feel like one product, not a slideshow)

The #1 quality differentiator: multi-view must feel like the SAME app evolving, not separate screenshots swapped in.

1. **Persistent Chrome**: The AppShell frame (sidebar, topbar, browser chrome) must STAY VISIBLE across all views. Only the inner content area crossfades. This means: render ONE AppShell wrapper, and swap the content region inside it.
2. **Tab Animation**: When switching views, animate the tab indicator (color pill slides from old tab to new tab over 12 frames using spring). The cursor should click the next tab, THEN the content transitions.
3. **Shared Elements**: If two views share a sidebar or header, those elements must NOT re-enter — they persist. Only the main content panel crossfades.
4. **Scale Continuity**: All views must render at the same scale and position. Do NOT resize or reposition the screenshot container between views — this breaks the spatial illusion.
5. **Cursor Guides the Switch**: The cursor should click the tab/nav item that triggers the view change. Never switch views without cursor interaction — it feels like the app is changing by itself.

### Pattern: Persistent Shell + Content Swap
```jsx
// ONE AppShell stays, content inside swaps
<AbsoluteFill>
  <AppShell brand={BRAND} chromeColor={BRAND.primary}>
    {/* This inner region crossfades between views */}
    {VIEWS.map((v, i) => {
      const isActive = i === activeIdx;
      const progress = spring({ frame: frame - v.startFrame, fps, config: SPRING_CONFIGS.entrance });
      return (
        <AbsoluteFill key={i} style={{
          opacity: isActive ? progress : 0,
          transform: `translateX(${isActive ? interpolate(progress, [0,1], [20, 0]) : 0}px)`,
        }}>
          <Img src={v.image} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </AbsoluteFill>
      );
    })}
  </AppShell>
</AbsoluteFill>
```

## Anti-Patterns
- Do NOT show all views simultaneously — sequence them
- Do NOT use hard cuts between views — use spring crossfade
- Do NOT skip the tab bar — viewer needs navigation context
- Do NOT assign more than 4 screenshots to one scene — split into 2 scenes instead
- Do NOT re-render the AppShell/browser frame for each view — keep ONE persistent frame
- Do NOT switch views without cursor clicking the tab first — unmotivated switches look broken
- Do NOT resize/reposition the content container between views — spatial jump = amateur
