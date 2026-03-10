# premium-reconstructed-ui

## When to Use

Use for showcase/demo scenes when:
- Standard SaaS layout (sidebar + dashboard, settings forms, tables)
- Elements need to animate independently (cards stagger, charts draw)
- Form/modal interaction (typing, dropdown selection)
- Camera zoom planned (vectors stay crisp at any scale)
- Light/clean UI theme (reconstructed version looks cleaner than screenshot)

Use premium-chameleon-ui INSTEAD when:
- Highly custom UI (maps, 3D views, photo-heavy, complex visualizations)
- Brand fidelity is critical
- Screenshot contains real data that must be shown exactly

## Available Components (all in scope)

These components are pre-built and injected into compiler scope:

### AnimatedSidebar
```tsx
// Items slide in from left with spring stagger, active item has growing left border
<AnimatedSidebar
  appName="MyApp"
  items={[
    { label: "Dashboard", icon: "📊", isActive: true },
    { label: "Reports", icon: "📈", isActive: false },
    { label: "Settings", icon: "⚙️", isActive: false },
  ]}
  brand={BRAND}
  startFrame={0}
/>
```

### AnimatedMetricCards
```tsx
// Cards slide up with stagger, numbers count from 0 to final value
<AnimatedMetricCards
  cards={[
    { label: "Revenue", value: "$42.3K", numericValue: 42300, trend: "up", trendValue: "+12%" },
    { label: "Users", value: "12,847", numericValue: 12847, trend: "up", trendValue: "+8%" },
    { label: "Churn", value: "1.2%", numericValue: 1.2, trend: "down", trendValue: "-0.3%" },
  ]}
  brand={BRAND}
  startFrame={25}
  columns={3}
/>
```

### AnimatedTable
```tsx
// Header appears, then rows slide in with stagger
<AnimatedTable
  columns={[
    { label: "Name", width: "wide" },
    { label: "Status", width: "narrow" },
    { label: "Revenue", width: "medium" },
  ]}
  rows={[
    { cells: ["Acme Corp", "Active", "$12,400"], isHighlighted: true },
    { cells: ["Beta Inc", "Trial", "$8,200"] },
    { cells: ["Gamma Co", "Active", "$6,100"] },
    { cells: ["Delta Ltd", "Churned", "$0"] },
  ]}
  brand={BRAND}
  startFrame={40}
/>
```

### AnimatedChart
```tsx
// Line chart: path draws in; Bar chart: bars grow; Donut: arc sweeps
<AnimatedChart
  type="line"
  title="Monthly Revenue"
  dataPoints={[30, 45, 38, 62, 71, 58, 85, 92]}
  color={BRAND.primary}
  brand={BRAND}
  startFrame={30}
/>
```

### AnimatedForm
```tsx
// Fields appear sequentially, active field gets focus ring, useTyping() on text fields
<AnimatedForm
  title="Create New Project"
  fields={[
    { label: "Project Name", type: "text", placeholder: "My Project", value: "KMS Project" },
    { label: "Environment", type: "dropdown", options: ["Production", "Staging", "Dev"] },
    { label: "Encryption", type: "dropdown", options: ["AES-256", "RSA-2048"] },
  ]}
  submitLabel="Create Project"
  brand={BRAND}
  startFrame={20}
/>
```

### ReconstructedAppShell
```tsx
// Orchestrates sidebar + content with global timing: sidebar first, then content sections
<ReconstructedAppShell
  uiSchema={UI_SCHEMA}
  brand={BRAND}
/>
```

## Hybrid "Come Alive" Technique

For maximum cinematic impact, start with the screenshot visible, then crossfade to the reconstructed version:

```tsx
const screenshotOpacity = interpolate(frame, [30, 50], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const reconstructedOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

return (
  <AbsoluteFill>
    {/* Screenshot phase */}
    <div style={{ position: "absolute", inset: 0, opacity: screenshotOpacity }}>
      {ATTACHED_IMAGES[0] && <img src={ATTACHED_IMAGES[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>

    {/* Reconstructed phase */}
    <div style={{ position: "absolute", inset: 0, opacity: reconstructedOpacity }}>
      <AnimatedSidebar ... />
      <AnimatedMetricCards ... />
    </div>
  </AbsoluteFill>
);
```

## Global Stagger Timing Pattern

Standard timing when using ReconstructedAppShell:
- f:0–30: Sidebar slides in
- f:10–25: Topbar fades down
- f:25–50: First content section (metric cards)
- f:40–65: Second content section (chart or table)
- f:55–80: Third content section (if any)
- f:70+: Cursor or interaction begins
