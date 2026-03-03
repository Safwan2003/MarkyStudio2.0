# MarkyStudio — System Architecture

## Overview

AI code-to-video pipeline. User describes a product → LLM generates a multi-scene Remotion video as React code → compiled in-browser → rendered to MP4 via AWS Lambda.

---

## End-to-End Data Flow

```
User Input (text + screenshots)
        │
        ▼
[1] /api/plan           ← Gemini: vision brand extraction + narrative planning
        │                  Returns: { scenes[], brand{} }
        ▼
[2] useFullVideoGeneration (client hook)
        │── /api/vision  ← Gemini: detect UI elements in screenshots (for cursor steps)
        │── /api/generate (per scene, parallel SSE streams)
        │     └── Skill injection → Gemini → streaming React/Remotion code
        ▼
[3] compiler.ts          ← in-browser Babel transpile → live React component
        │                  Scope injected: Remotion APIs, GLASS_CARD, SPRING_CONFIGS,
        │                  EASINGS, UI Skeletons (Kanban, Analytics, etc.), BRAND, ATTACHED_IMAGES
        ▼
[4] DynamicComp.tsx      ← Remotion Player renders compiled scenes live in browser
        ▼
[5] /api/lambda/render   ← AWS Lambda renders final MP4 (Remotion serverless)
```

---

## Key Layers

| Layer | Files | Responsibility |
|---|---|---|
| **UI** | `generate/page.tsx`, `AnimationPlayer`, `ScenePlanEditor`, `SceneTimeline`, `ChatSidebar` | User interaction, scene editing, live preview |
| **State / Orchestration** | `useFullVideoGeneration.ts` | Plans → generates → compiles → assembles master video |
| **API: Planning** | `api/plan/route.ts` | Vision brand extraction + narrative scene plan via Gemini |
| **API: Generation** | `api/generate/route.ts` | Per-scene React/Remotion code via streaming SSE + skill injection |
| **API: Vision** | `api/vision/route.ts` | UI element detection from screenshots → cursor step coords |
| **Compiler** | `remotion/compiler.ts` | Babel transpile, strips BRAND decl, injects scope constants + UI skeletons |
| **Remotion Root** | `remotion/Root.tsx`, `DynamicComp.tsx` | Wraps compiled components, feeds inputProps (brand, images) |
| **Skills RAG** | `skills/*.md`, `skills/index.ts` | 21 skill files injected as LLM context based on scene type |
| **Lambda Render** | `api/lambda/render/route.ts`, `helpers/use-rendering.ts` | Final MP4 export via AWS Lambda |

---

## LLM Pipeline (per scene)

```
scene.prompt
    + BRAND block        ← from plan step
    + ATTACHED_IMAGES    ← user screenshots
    + skill guidance MD  ← matched from 21 skills
    + SYSTEM_PROMPT      ← Remotion code rules, scope constants, reserved names
           │
           ▼
    Gemini (streaming SSE)
           │
           ▼
    Raw React/Remotion code (chunks assembled on client)
           │
           ▼
    Babel compile → React component → injected into Remotion Sequence
```

---

## Skill System (RAG)

21 skill `.md` files — each describes a premium animation pattern with code examples.

**How it works:**
1. `SKILL_DETECTION_PROMPT` — LLM reads scene description and picks best-fit skill
2. Selected skill's `.md` content is appended to the generation prompt
3. LLM follows the pattern to produce agency-quality output

**Available skills:**

| Skill | Pattern |
|---|---|
| `premium-saas-hook` | Floating icons, laptop screen inset, chat bubbles |
| `premium-saas-showcase` | Browser chrome, dashboard layouts, mesh background |
| `premium-cursor-engine` | Spring cursor movement, click ripple, motion trail, tooltip |
| `premium-team-orbit` | Floating avatars with role badges |
| `premium-camera-zoom` | Multi-layer parallax hero zoom |
| `premium-social-proof` | Glass notification cards |
| `premium-cta-scene` | Kinetic headline, pulsing button, mesh bg |
| `premium-kinetic-text` | Word stagger, brand pill, flash transition |
| `premium-neon-dark` | Dark theme, sonar rings, SVG glow, shape mask |
| `premium-network-intro` | Avatar nodes + polka-dot paths + ripple |
| `premium-device-mockup` | MacBook / browser / phone shell |
| `premium-scroll-demo` | Scroll simulation inside browser shell |
| `premium-data-reveal` | Animated counters, stat cards, ring progress, bar fills |
| `premium-split-screen` | Before/after divider comparison |
| `premium-multi-device` | Laptop + phone + tablet composite |
| `premium-glassmorphism` | Glass cards, blend-mode orbs, parallax depth layers |
| `premium-match-cut` | Zoom-into-button match cut, whip cut, motion blur |
| `premium-char-split` | Char/word split with push-up rotation, scramble effect |
| `premium-ui-skeleton` | Pre-built KanbanBoard, AnalyticsDashboard, CodeEditorPanel, DataTable |
| `premium-audio` | Looping bg music, volume fade, per-frame SFX |

---

## Brand Pipeline

```
User uploads screenshot
        │
        ▼
/api/plan → Gemini vision → BrandTokens {
    primary, secondary, bg, surface,
    text, textMuted, border, style,
    font, accentName
}
        │
        ▼
buildBrandBlock() → injected as `const BRAND = {...}` at top of every scene prompt
        │
        ▼
compiler.ts → `brand` var pre-injected in Babel scope (LLM must NOT re-declare it)
        │
        ▼
DynamicComp.tsx → brand passed via inputProps → Lambda render chain
```

**BrandTokens fields:**

| Field | Purpose | Example |
|---|---|---|
| `primary` | CTA buttons, glows, active states | `#6366f1` |
| `secondary` | Hover states, complementary accents | `#a78bfa` |
| `bg` | Scene / page background | `#0f0f1a` |
| `surface` | Card / panel background | `rgba(255,255,255,0.06)` |
| `text` | Primary text | `#ffffff` |
| `textMuted` | Subtitles, captions | `rgba(255,255,255,0.5)` |
| `border` | Glass card borders, dividers | `rgba(255,255,255,0.12)` |
| `style` | Visual mood | `dark` \| `light` \| `neon` |
| `font` | Font family | `Inter` |
| `accentName` | Single-word descriptor | `indigo` |

---

## Compiler Scope (pre-injected constants)

The LLM never needs to declare these — they are injected before Babel compilation:

```
Remotion:    AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame,
             useVideoConfig, Audio, Img, TransitionSeries, ...transitions
React:       React, useState, useEffect, useMemo, useRef
Shapes:      @remotion/shapes (all exports)
Three.js:    ThreeCanvas (@remotion/three)
Lottie:      Lottie (@remotion/lottie)

Style consts: GLASS_CARD, SPRING_CONFIGS, EASINGS
UI Skeletons: KanbanBoard, AnalyticsDashboard, CodeEditorPanel, DataTable

Runtime:     BRAND (from inputProps), ATTACHED_IMAGES (from inputProps)
```

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **In-browser Babel compilation** | LLM code previews instantly — no server round-trip needed |
| **SSE streaming per scene** | Scenes generate in parallel; UI shows progress as each streams in |
| **Scene-level cache** | Same skill + brand + prompt → skip re-generation (session-scoped Map) |
| **Scope injection** | Pre-injecting constants (GLASS_CARD, skeletons, etc.) reduces LLM hallucination surface |
| **Master component assembled client-side** | LLM only writes per-scene code; orchestration (Sequence, fade, offsets) is deterministic code |
| **Lambda for final render** | Browser preview uses Player; export uses Remotion Lambda for full-quality MP4 |
| **Skill RAG over fine-tuning** | Swap/update skills without model retraining; additive and inspectable |
