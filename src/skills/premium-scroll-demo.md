---
title: Premium Scroll Simulation Demo
impact: HIGH
impactDescription: simulates the product being scrolled inside a browser/device — creates the illusion of "someone actually using the product" without recording
tags: scroll, product-demo, browser, interaction, screenshot, ATTACHED_IMAGES, walkthrough, website-demo
---

## Scroll Demo Pattern Overview

The "living product" technique: place `ATTACHED_IMAGES[0]` (a tall screenshot or composite) inside a browser shell and animate it scrolling. Combined with a cursor and section highlights, it feels like a real screen recording.

---

## Core Scroll Animation

```tsx
const frame = useCurrentFrame();
const { fps, width, height } = useVideoConfig();

// Phase timing
const BROWSER_ENTER_END = 30;   // browser finishes sliding in
const SCROLL_START      = 45;   // scroll begins
const SCROLL_END        = 200;  // scroll finishes at bottom
const HIGHLIGHT_START   = 210;  // section highlight pulse

// Browser entrance
const browserEntrance = spring({
  frame,
  fps,
  config: { damping: 22, stiffness: 75 },
});
const browserY = interpolate(browserEntrance, [0, 1], [height * 0.4, 0]);

// Scroll progress — smooth eased scroll, not spring (springs feel wrong for scrolling)
const scrollProgress = interpolate(
  frame,
  [SCROLL_START, SCROLL_END],
  [0, 1],
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,  // ease-in-out quad
  }
);

// The screenshot is 2–3x taller than the viewport — scroll reveals more content
const SCREENSHOT_HEIGHT_FACTOR = 2.5;  // screenshot is 2.5x the viewport height
const maxScrollPx = (SCREENSHOT_HEIGHT_FACTOR - 1) * height * 0.72; // 72% = content area height
const scrollY = interpolate(scrollProgress, [0, 1], [0, -maxScrollPx]);

// Section spotlight — highlights a particular part of the page
const highlightPulse = Math.sin((frame - HIGHLIGHT_START) * 0.15) * 0.5 + 0.5;
const highlightOpacity = interpolate(
  frame,
  [HIGHLIGHT_START, HIGHLIGHT_START + 15, SCROLL_END + 30],
  [0, 1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

---

## Browser Shell + Scrolling Content

```tsx
const BROWSER_W = width * 0.78;
const BROWSER_H = BROWSER_W * 0.65;
const CONTENT_H = BROWSER_H - 40;  // minus chrome bar height

<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
  <div style={{
    width: BROWSER_W,
    height: BROWSER_H,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 50px 100px rgba(0,0,0,0.40)",
    transform: `translateY(${browserY}px)`,
    display: "flex", flexDirection: "column",
  }}>
    {/* Browser chrome bar */}
    <div style={{
      height: 40, flexShrink: 0,
      background: "#f1f5f9",
      borderBottom: "1px solid #e2e8f0",
      display: "flex", alignItems: "center",
      padding: "0 14px", gap: 8,
    }}>
      <div style={{ display: "flex", gap: 6 }}>
        {["#ef4444","#eab308","#22c55e"].map((c,i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
      </div>
      <div style={{
        flex: 1, maxWidth: 360, height: 24, marginLeft: 12,
        background: "white", border: "1px solid #e2e8f0", borderRadius: 6,
        display: "flex", alignItems: "center", paddingLeft: 10,
        fontSize: 11, color: "#64748b", fontFamily: "Inter, sans-serif",
      }}>
        🔒 yourproduct.com
      </div>
    </div>

    {/* Scrollable content area */}
    <div style={{
      width: "100%", height: CONTENT_H,
      overflow: "hidden", position: "relative",
    }}>
      {/* The screenshot — taller than visible area, scrolled by translateY */}
      <div style={{
        transform: `translateY(${scrollY}px)`,
        willChange: "transform",
      }}>
        {ATTACHED_IMAGES[0] ? (
          <img
            src={ATTACHED_IMAGES[0]}
            style={{
              width: "100%",
              height: CONTENT_H * SCREENSHOT_HEIGHT_FACTOR,
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
          />
        ) : (
          /* Fallback: multi-section placeholder */
          <div style={{ width: "100%", height: CONTENT_H * SCREENSHOT_HEIGHT_FACTOR, background: "#f8fafc" }}>
            {/* Hero section */}
            <div style={{ height: CONTENT_H * 0.5, background: "linear-gradient(135deg, #0f172a, #1e293b)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "60%", height: 60, background: "rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </div>
            {/* Features section */}
            <div style={{ height: CONTENT_H * 0.7, padding: 40, display: "flex", flexWrap: "wrap", gap: 20 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ flex: "1 1 40%", height: 100, background: "white", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }} />)}
            </div>
            {/* CTA section */}
            <div style={{ height: CONTENT_H * 0.5, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 180, height: 48, background: "white", borderRadius: 24, opacity: 0.9 }} />
            </div>
          </div>
        )}
      </div>

      {/* Section highlight overlay — appears mid-scroll to spotlight a key area */}
      {highlightOpacity > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse 70% 30% at 50% ${45 + scrollProgress * 55}%, rgba(99,102,241,${0.18 * highlightPulse * highlightOpacity}) 0%, transparent 80%)`,
          pointerEvents: "none",
        }} />
      )}

      {/* Scrollbar indicator */}
      <div style={{
        position: "absolute", right: 4, top: 4, bottom: 4,
        width: 4, background: "rgba(0,0,0,0.06)", borderRadius: 2,
      }}>
        <div style={{
          position: "absolute",
          top: `${scrollProgress * 80}%`,
          left: 0, right: 0,
          height: "20%",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 2,
        }} />
      </div>
    </div>
  </div>
</AbsoluteFill>
```

---

## Overlay Label — "Section" Callout

Appears when scroll stops on a key section:

```tsx
const labelOpacity = interpolate(
  frame,
  [SCROLL_END, SCROLL_END + 20, SCROLL_END + 60],
  [0, 1, 0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);

{labelOpacity > 0 && (
  <div style={{
    position: "absolute",
    bottom: "18%", left: "50%",
    transform: `translateX(-50%) translateY(${interpolate(labelOpacity, [0,1], [10,0])}px)`,
    opacity: labelOpacity,
    background: "rgba(15,23,42,0.92)",
    backdropFilter: "blur(8px)",
    color: "white",
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
    fontWeight: 600,
    padding: "10px 24px",
    borderRadius: 100,
    whiteSpace: "nowrap",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  }}>
    ✦ 10,000+ Verified Vehicles
  </div>
)}
```

---

## Animated Scroll Cursor

Add a pointing cursor that appears and "initiates" the scroll:

```tsx
const CURSOR_APPEAR = 25;
const CURSOR_SCROLL_END = 60;

const cursorOpacity = interpolate(frame, [CURSOR_APPEAR, CURSOR_APPEAR + 10, CURSOR_SCROLL_END], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const cursorY = interpolate(frame, [CURSOR_APPEAR, CURSOR_SCROLL_END], [height * 0.3, height * 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const cursorX = width * 0.5;

{cursorOpacity > 0 && (
  <div style={{
    position: "absolute",
    left: cursorX, top: cursorY,
    transform: "translate(-50%, -50%)",
    opacity: cursorOpacity,
    fontSize: 28,
    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
    pointerEvents: "none",
    zIndex: 100,
  }}>
    🖱
  </div>
)}
```

---

## Key Rules

- **`SCREENSHOT_HEIGHT_FACTOR = 2.5`** — the image renders at 2.5× the visible height so there's content to scroll through. If using a real screenshot, prefer landscape or full-page captures.
- **Easing for scroll**: use quadratic ease-in-out, NOT spring — springs have bounce which feels wrong for a page scroll
- **Scroll then pause**: always pause at the end (`SCROLL_END`) for 20+ frames before the next element appears — let the viewer read what's on screen
- **Section highlight**: the radial gradient tied to scroll position guides the eye to the most relevant product area
- **Scrollbar**: small indicator on the right side adds authenticity
