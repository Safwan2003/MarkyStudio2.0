# Marky Studio Template System

> **Goal**: Create a scalable, programmatic video generation engine capable of producing "Agency Quality" SaaS explainers (comparable to *What a Story*).

## 📂 Directory Structure

We use a modular architecture where each "Template" is a composition of reusable "Scenes".

```text
src/remotion/templates/
├── SaaSExplainer/               # MASTER TEMPLATE: "Agency SaaS Explainer"
│   ├── index.tsx                # The Orchestrator (Main Composition)
│   ├── manifest.json            # Metadata (Duration: 60-80s, Tags)
│   ├── scenes/                  # The Building Blocks
│   │   ├── Intro.tsx            # [0-10s] The Hook (Kinetic Type)
│   │   ├── Problem.tsx          # [10-25s] Pain Agitation (Abstract/Chaos)
│   │   ├── Solution.tsx         # [25-40s] The Hero (Product Reveal)
│   │   ├── Showcase.tsx         # [40-60s] Walkthrough (Cursor, Clicking, Mockups)
│   │   └── CTA.tsx              # [60-80s] Call to Action
│   └── assets/                  # Default assets
└── components/                  # Shared Primitives
    ├── BrowserFrame.tsx         # Mac-style window container
    ├── Cursor.tsx               # Animated mouse pointer (SVG)
    ├── KineticText.tsx          # Dynamic text engine
    └── GridLayout.tsx           # Background patterns
```

## 🎭 The Narrative Arc (60-80 Seconds)

Based on research into high-converting SaaS videos, we follow this strict 5-part structure:

### 1. The Hook (0-10s)
*   **Goal**: Graphic disruption. Stop the scroll.
*   **Visuals**: Big, bold Kinetic Typography. Fast cuts.
*   **Audio**: High energy.
*   **Data Injection**: `headline` (e.g., "Stop Wasting Time"), `subHeadline`.

### 2. The Problem (10-25s)
*   **Goal**: Agitate the pain point.
*   **Visuals**: "Chaos" state. Red/Orange tints. Floating broken icons. Disconnected nodes.
*   **Audio**: Slightly dissonant or tense.
*   **Data Injection**: `problemKeywords` (e.g., "Slow", "Manual", "Error-prone").

### 3. The Solution (25-40s)
*   **Goal**: The "Aha!" moment. Product Reveal.
*   **Visuals**: Smooth transition (Zoom/Wipe). clean, organized UI. "Glassmorphism".
*   **Data Injection**: `productName`, `tagline`.

### 4. The Showcase / Walkthrough (40-60s) **(CRITICAL)**
*   **Goal**: Prove it works. Simulate usage.
*   **Visuals**: High-fidelity Browser Mockup.
*   **Interaction**:
    *   **Cursor Animation**: Mouse moves from A -> B.
    *   **Click Event**: Cursor clicks "Login" or "Dashboard". Ripple effect.
    *   **Response**: UI changes (e.g., Graph rises, notification appears).
*   **Data Injection**: `features` list, `screenshots` (or programmatic DOM mockups).

### 5. Call to Action (60-80s)
*   **Goal**: Conversion.
*   **Visuals**: Logo + Button + URL. Clean background.
*   **Data Injection**: `ctaText`, `websiteUrl`.

## � Data & Color Injection Protocol

To support AI generation and future model training, **NO HARDCODED VALUES** are allowed in scenes.

### The `Script` Object
 Every scene receives a slice of the global script + global styles.

```typescript
// defined in src/lib/types.ts
interface VideoScript {
  globalStyle: {
    primaryColor: "#3B82F6", // Brand Color
    accentColor: "#F59E0B",  // Highlight
    fontFamily: "Inter",
    mode: "dark" | "light"
  },
  scenes: [
    {
      type: "Showcase",
      text: "Automate your workflow",
      visualCue: "Cursor clicks 'Generate' button",
      // ...
    }
  ]
}
```

### Injection Rules
1.  **Colors**: Use `script.globalStyle.primaryColor` for buttons/highlights. Use `tailwind-merge` to override defaults.
2.  **Timing**: All animations must use `spring` or `interpolate` based on `durationInFrames`.
3.  **Text**: All text must come from props.
