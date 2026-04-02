---
title: Premium Single‑Shot Morphing (Seamless Thread)
impact: HIGH
impactDescription: avoids “scene cuts” by morphing an element from Scene A into Scene B using morphExport/morphImport + continuous camera language
tags: morph, shared element, continuity, seamless, single-shot, whatastory, bordio
qualityBar: The viewer feels like the camera is moving through one continuous world. A recognizable UI element persists or transforms across scenes (card → header, icon → badge), with no hard cut feeling.
---

## What this skill does
This skill implements a **shared-element continuity** using the built-in Morph Portal system:
- Scene N sets `morphExport` (rect of the exiting element)
- Scene N+1 sets `morphImport` (rect of where it lands)
- Generated code uses `useMorphEntrance(MORPH_FROM, targetRect)` automatically when `MORPH_FROM` is present

## Planner usage (must be explicit in prompts)
Pick ONE “anchor element” per video:
- a card, a badge, a pill, a sidebar highlight, a “✅ success” chip

Then do **max 1 morph portal per video** (agency-style restraint).

## Scene authoring pattern

### Scene N (export)
- Hold the element cleanly for 18–24 frames at the end of the scene so the viewer registers it.
- Provide `morphExport` rect for that element.

### Scene N+1 (import)
- Make that element the **first** thing visible at frame 0.
- Use `useMorphEntrance(MORPH_FROM, morphImport.rect)` on the receiving element.

## Code pattern (receiving scene)

```tsx
// MORPH_FROM is injected in scope when the previous scene exported a rect
const morph = useMorphEntrance(MORPH_FROM, { x: 0.18, y: 0.18, w: 0.44, h: 0.12 });

return (
  <AbsoluteFill>
    <div style={{ transform: morph.transform, opacity: morph.opacity }}>
      {/* This element is the “same thing” as the export, now re-contextualized */}
      <div style={{ ...getGlassCard(BRAND), padding: 18 }}>Realtime Dashboard</div>
    </div>
  </AbsoluteFill>
);
```

## Anti-patterns (hard fails)
- Morphing multiple unrelated elements (looks gimmicky).
- Exporting an element then not showing it immediately in the next scene.
- Using morphing to hide bad composition (should enhance, not fix).

