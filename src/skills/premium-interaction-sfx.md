---
title: Premium Interaction SFX (Audio-Visual Sync)
impact: HIGH
impactDescription: makes clicks and UI actions feel tactile by syncing sound effects to interaction frames
tags: sfx, audio, click, whoosh, tactile, sync, whatastory, sandwich
qualityBar: Every click lands with a soft UI “thud/click”, transitions have whooshes, and sounds are timed to motion (never early/late). SFX volume is subtle and consistent.
---

## What this skill does
It hard-codes the **relationship between motion and sound**. In agency videos, sound is “invisible animation glue”.

## Runtime primitive you MUST use
`SfxSequencer` is in scope and is designed for this:

```tsx
// Plays sounds for events at exact frames
<SfxSequencer events={INTERACTION_EVENTS} sfxUrls={SFX_URLS} />
```

## Cursor engine rule (mandatory)
If you have `CURSOR_STEPS` with click actions:
- Trigger a click SFX at **clickFrame + 1**
- Keep volume subtle (0.25–0.4)

### Canonical pattern

```tsx
const TRAVEL = 25;
const DWELL = 10;

// Example: click happens after arriving + dwell
const clickFrames = CURSOR_STEPS
  .filter((s) => s.action === "click" && typeof s.time === "number")
  .map((s) => s.time + TRAVEL + DWELL + 1);

const INTERACTION_EVENTS = clickFrames.map((f) => ({ frame: f, sfx: "click" }));

return (
  <AbsoluteFill>
    {/* visuals */}
    <SfxSequencer events={INTERACTION_EVENTS} sfxUrls={SFX_URLS} />
  </AbsoluteFill>
);
```

## Transition SFX rule (recommended)
- cameraPan / zoomThrough: add a subtle `whoosh` aligned to peak motion (mid-transition)
- shape morph flood-fill: add a `swoosh` 2–4 frames after the expansion starts

## Anti-patterns
- Loud SFX (volume > 0.5) — sounds should be felt, not heard.
- SFX without corresponding motion (fake UI).
- Using random internet SFX URLs ad-hoc; use `SFX_URLS` only so the system stays consistent.

