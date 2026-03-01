---
title: Premium SaaS Product Showcase
impact: HIGH
impactDescription: creates polished browser-framed dashboard demos with smooth entrance animations and mesh backgrounds
tags: saas, showcase, browser, dashboard, product-demo, mockup, slide-up
---

## Premium Product Showcase Pattern

The gold standard for SaaS product demos: a **browser window** (OS chrome + URL bar + traffic-light dots) that slides up from below and gently floats. Inside: a realistic dashboard or feature UI.

### Core Entrance Animation

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Slide-up entrance with spring
const slideUp = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
const BROWSER_Y = interpolate(slideUp, [0, 1], [120, 0]);

// Subtle float loop after entrance
const FLOAT_AMPLITUDE = 8; // px
const floatY = Math.sin(frame * 0.04) * FLOAT_AMPLITUDE;
```

Apply combined transform:

```tsx
style={{ transform: `translateY(${BROWSER_Y + floatY}px)` }}
```

---

## Browser Window Chrome

Replicate a macOS-style browser window for instant product credibility:

```tsx
<div style={{
  width: "85%",
  height: "85%",
  background: "white",
  borderRadius: "12px 12px 0 0",
  boxShadow: "0 40px 80px rgba(0,0,0,0.25)",
  border: "1px solid rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  transform: `translateY(${BROWSER_Y + floatY}px)`,
}}>
  {/* Title bar / toolbar */}
  <div style={{
    height: 40,
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: 8,
    flexShrink: 0,
  }}>
    {/* Traffic light dots */}
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#eab308" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
    </div>
    {/* URL bar */}
    <div style={{
      flex: 1, maxWidth: 400,
      height: 24, marginLeft: 16,
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      paddingLeft: 10,
      fontSize: 11,
      color: "#64748b",
      fontFamily: "Inter, sans-serif",
    }}>
      app.yourproduct.com/dashboard
    </div>
  </div>

  {/* Dashboard content area */}
  <div style={{ flex: 1, background: "#f8fafc", overflow: "hidden" }}>
    {/* Your dashboard UI here */}
  </div>
</div>
```

---

## Dashboard Stat Card Pattern

For metrics and KPI cards:

```tsx
{/* Stat Card */}
<div style={{
  background: "white",
  borderRadius: 16,
  padding: "24px 28px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
  border: "1px solid #f1f5f9",
  display: "flex",
  flexDirection: "column",
  gap: 8,
}}>
  <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
    Active Users
  </span>
  <div style={{ fontSize: 48, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
    2,847
  </div>
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>↑ 12.5%</span>
    <span style={{ fontSize: 11, color: "#94a3b8" }}>vs last month</span>
  </div>
</div>
```

---

## Sidebar + Main Content Layout

Canonical SaaS dashboard two-column layout:

```tsx
<div style={{ display: "flex", height: "100%", fontFamily: "Inter, sans-serif" }}>
  {/* Sidebar */}
  <div style={{
    width: 64, background: "#0f172a",
    display: "flex", flexDirection: "column",
    alignItems: "center", padding: "20px 0", gap: 20,
  }}>
    {/* Logo */}
    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#6366f1" }} />
    {/* Nav icons */}
    {["#6366f1", "#334155", "#334155", "#334155"].map((bg, i) => (
      <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: bg }} />
    ))}
  </div>

  {/* Main area */}
  <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
    {/* Top row: stat cards */}
    <div style={{ display: "flex", gap: 16 }}>
      {["2,847", "94%", "$48K"].map((val, i) => (
        <div key={i} style={{
          flex: 1, background: "white", borderRadius: 12, padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          border: "1px solid #f1f5f9",
        }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{val}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Metric label</div>
        </div>
      ))}
    </div>

    {/* Table rows */}
    <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 20, border: "1px solid #f1f5f9" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 0",
          borderBottom: i < 5 ? "1px solid #f8fafc" : "none",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0" }} />
          <div style={{ flex: 1, height: 10, background: "#f1f5f9", borderRadius: 4 }} />
          <div style={{ width: 60, height: 10, background: "#e2e8f0", borderRadius: 4 }} />
        </div>
      ))}
    </div>
  </div>
</div>
```

---

## Background: Mesh Orb Pattern

Premium light background with subtle orbs:

```tsx
{/* Light background base */}
<AbsoluteFill style={{ background: "#f8fafc" }} />

{/* Orbs */}
<div style={{
  position: "absolute", top: "-30%", left: "10%",
  width: 900, height: 900, borderRadius: "50%",
  background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
  filter: "blur(40px)",
}} />
<div style={{
  position: "absolute", bottom: "-20%", right: "-10%",
  width: 800, height: 800, borderRadius: "50%",
  background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
  filter: "blur(40px)",
}} />

{/* Dot grid overlay */}
<div style={{
  position: "absolute", inset: 0, opacity: 0.3,
  backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
  backgroundSize: "30px 30px",
}} />
```
