---
title: Premium Macro Close-Up
impact: CRITICAL
impactDescription: Bordio-style extreme 3-5x zoom into specific UI sections with radial depth-of-field blur. The single biggest visual differentiator between amateur and agency-produced videos.
tags: macro, zoom, closeup, dof, blur, selective-focus, camera, bordio, showcase, deep-dive
qualityBar: The scene zooms 3-5x into a specific UI region with easeOutExpo snap, holds with subtle drift while surrounding UI blurs out via SelectiveFocus DOF, then whips back out. Cursor layers stay outside the zoom wrapper. Max 2 macro moments per video.
---

## Scene Purpose

The "Deep Dive" moment. Zooms the viewer into a specific UI section — sidebar item, data row, button group, settings panel — to create the feeling of being inside the product. WhatAStory's Bordio and Viable videos use this 2-3 times per video for maximum visual impact.

## Visual Blueprint

```text
[   Full UI (1x) — viewer sees entire dashboard                    ]
[                                                                   ]
[   ┌──────────┬──────────────────────────────┐                    ]
[   │ Sidebar  │  Main Content Area           │                    ]
[   │ ────── ◄─┼─── focusPoint (0.15, 0.45)  │                    ]
[   │  Teams   │  ┌─────────────────────┐     │                    ]
[   │  Projects│  │   Task Table        │     │                    ]
[   │  Settings│  └─────────────────────┘     │                    ]
[   └──────────┴──────────────────────────────┘                    ]
[                                                                   ]
[   === SNAP ZOOM (25f easeOutExpo) ===                            ]
[                                                                   ]
[   ┌──────────────────────────┐  ← 3x zoom, blurred edges        ]
[   │                          │                                    ]
[   │  ◉ Marketing Campaign    │  ← sharp focus circle (r=0.3)    ]
[   │  ◉ Product Roadmap       │                                    ]
[   │  ◉ Sprint Planning       │                                    ]
[   │                     blur │                                    ]
[   └──────────────────────────┘                                    ]
[                                                                   ]
[   Hand cursor clicks "Marketing Campaign" during hold phase       ]
[                                                                   ]
[   === WHIP ZOOM-OUT (25f easeInExpo) ===                         ]
[   Back to full UI view                                            ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill, Img } from "remotion";

export const MacroCloseupScene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // === TIMING ===
  const ZOOM_START = 30;    // frames before zoom begins (let UI settle first)
  const HOLD_FRAMES = 80;   // frames at max zoom (viewer reads the focused area)
  const ZOOM_DURATION = 25; // snap-in and whip-out speed

  // === FOCUS TARGET ===
  // Where to zoom into (normalized 0-1). Example: sidebar area
  const FOCUS = { x: 0.15, y: 0.45 };

  return (
    <AbsoluteFill>
      {/* MacroCamera wraps SelectiveFocus wraps UI content */}
      <MacroCamera
        zoomLevel={3.5}
        focusPoint={FOCUS}
        zoomInFrame={ZOOM_START}
        holdFrames={HOLD_FRAMES}
        zoomDuration={ZOOM_DURATION}
      >
        <SelectiveFocus
          focusX={FOCUS.x}
          focusY={FOCUS.y}
          focusRadius={0.3}
          blurAmount={10}
          active={frame >= ZOOM_START && frame < ZOOM_START + ZOOM_DURATION + HOLD_FRAMES + ZOOM_DURATION}
        >
          {/* Full product UI screenshot */}
          <AbsoluteFill>
            <Img src={ATTACHED_IMAGES[0]} style={{
              width: '100%', height: '100%', objectFit: 'cover',
            }} />
          </AbsoluteFill>
        </SelectiveFocus>
      </MacroCamera>

      {/* Cursor OUTSIDE zoom wrapper — stays at screen scale */}
      {/* <CursorRenderer ... /> */}
    </AbsoluteFill>
  );
};
```

---

## Three Macro Patterns

### Pattern A: Sidebar Deep-Dive (Bordio-style)
Focus on sidebar navigation to highlight project/team structure.
```
focusPoint: { x: 0.12, y: 0.45 }   // left sidebar center
zoomLevel: 3.5                       // tight on sidebar items
focusRadius: 0.25                    // narrow focus circle
blurAmount: 10                       // strong DOF
```

### Pattern B: Data Table Macro (Bordio-style)
Zoom into a specific table row to highlight a task or data entry.
```
focusPoint: { x: 0.55, y: 0.5 }     // center-right main content
zoomLevel: 3.0                       // moderate zoom
focusRadius: 0.35                    // wider focus to show row context
blurAmount: 8                        // moderate DOF
```

### Pattern C: Single Element Isolation (Viable-style)
Extreme close-up on a button, input, or metric card.
```
focusPoint: { x: 0.7, y: 0.3 }      // target element position
zoomLevel: 4.5                       // extreme isolation
focusRadius: 0.2                     // tight circle
blurAmount: 14                       // heavy DOF
```

---

## Composition Rules

1. **MacroCamera OUTSIDE, SelectiveFocus INSIDE**: `<MacroCamera><SelectiveFocus>...</SelectiveFocus></MacroCamera>`
2. **Cursor layers ALWAYS outside both wrappers** — they must stay at screen scale
3. **Max 2 macro zoom moments per video** — overuse kills the effect
4. **Let UI settle before zooming** — zoomInFrame should be 20-40f after scene start so the viewer orients to the full layout first
5. **Hold phase is the payoff** — holdFrames should be 60-100f (2-3 seconds) so the viewer has time to absorb the focused content
6. **Match SelectiveFocus to MacroCamera focus** — focusX/focusY and focusPoint.x/y should be identical
7. **SelectiveFocus active timing** — activate DOF only during the zoom phases, not the full scene

## When to Use

- **Complex dashboards** with multiple panels (zoom into the relevant one)
- **Sidebar navigation** highlighting project structure or team hierarchy
- **Data tables** drawing attention to a specific row or metric
- **Settings panels** showing configuration details
- **Any UI with 3+ sections** where you need to direct viewer attention

## When NOT to Use

- Simple single-panel UIs (no need to zoom when there's only one thing to see)
- CTA/outro scenes (these need full-frame brand presence)
- Problem/frustration scenes (macro zoom implies precision, not chaos)

## Checklist

- [ ] focusPoint matches the interactive element the cursor will click
- [ ] SelectiveFocus focusX/focusY matches MacroCamera focusPoint
- [ ] Cursor layers are OUTSIDE both wrappers
- [ ] zoomInFrame > 20 (UI has time to settle)
- [ ] holdFrames >= 60 (viewer has time to read)
- [ ] No more than 2 MacroCamera uses in the full video
- [ ] SelectiveFocus active prop toggles off after zoom-out completes
