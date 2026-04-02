# MarkyStudio: "Agency-Grade" Evolution Roadmap
**Objective:** Transition from an AI code generator to a high-end Motion Graphics Production Suite matching the standards of `WhatAStory.agency`.

---

## 🏗 Pillar 1: Semantic Vision & UI Reconstruction
*The "WhatAStory" look starts with UI that feels like a real app, not a static image.*

### 1.1 Hierarchical UI Decomposition
*   **Current:** `/api/vision` returns basic bounding boxes.
*   **Upgrade:** Implement **Semantic Classification**. The vision model must identify:
    *   **Containers:** (Sidebars, Modals, Top Nav, Feed Cards).
    *   **Interactions:** (Primary Buttons, Input Fields, Toggles).
    *   **Content:** (Avatars, Metric Text, Headlines).
*   **Implementation:** Update `src/app/api/ui-decompose/route.ts` to return a `Z-Index` aware schema. This allows the AI to "lift" a Sidebar higher than the Background.

### 1.2 Coordinate Anchoring
*   **Objective:** Eliminate "Near Miss" cursor clicks.
*   **Task:** Assign unique IDs to detected elements.
*   **Instruction:** The LLM should never write `x: 450, y: 300`. It should write `target: DETECTED_ELEMENTS["sidebar-submit-btn"]`.
*   **Benefit:** 100% precision in humanized cursor movement.

---

## 🎥 Pillar 2: Cinematic Continuity (The "Infinite Canvas")
*Premium videos don't "jump" between scenes; they pan through a world.*

### 2.1 The "Visual Thread" Handoff
*   **Mechanism:** Expand `VISUAL_STATE` in `src/hooks/useFullVideoGeneration.ts`.
*   **Requirement:** Scene $N$ must export its **Exit Velocity**.
    *   *Example:* If the camera is panning right at 5px/frame at the end of Scene 1, Scene 2 **must** start with that same 5px/frame velocity to ensure a seamless "match-cut."
*   **Task:** Update the "Director Agent" in `/api/plan` to define a global "Motion Path."

### 2.2 Depth Orchestration (Rule of Three Depths)
Automatically inject three layers into every generated scene:
1.  **Background:** `MeshGradientBg` + `EntropyDust` (Stable across all scenes).
2.  **Midground:** The UI Reconstruction (Animated with `TiltWrapper`).
3.  **Foreground:** `GlassOverlay`, `FloatingOrbs`, or `LightLeak` (Provides cinematic texture).

---

## ⚡ Pillar 3: "Agency-Grade" Motion Primitives
*WhatAStory videos feel "heavy" and "expensive." This is a result of specific physics.*

### 3.1 The `useAgencySpring` Hook
*   **Problem:** Standard springs are too "bouncy" or too "linear."
*   **Fix:** Add a pre-tuned hook to the compiler scope:
    *   `config.heavy`: High mass, high damping (For large UI panels).
    *   `config.snappy`: Low mass, subtle overshoot (For buttons/clicks).
    *   `config.fluid`: Variable damping based on `AUDIO_STIFFNESS` (For text).

### 3.2 Dynamic Kinetic Typography
*   **Mandate:** No plain opacity fades.
*   **Standard:** Every headline MUST use either:
    *   `MaskedReveal`: Text sliding up from a baseline mask.
    *   `KineticText`: Word-by-word "slam" synchronized to the TTS beat.

---

## 🔊 Pillar 4: Automated Audio-Visual "Juice"
*Sound design shouldn't be an afterthought; it should be triggered by the code.*

### 4.1 Visual-Triggered SFX
*   **Current:** AI manually places `<Audio />` tags (Error-prone).
*   **Upgrade:** Implement a **Global SFX Observer**.
    *   The `useHumanizedCursor` hook should automatically emit a `click` SFX event when `cursorState.clicked === true`.
    *   The `withTransition` wrapper should automatically inject `whoosh` or `swoosh` sounds based on the `transitionType`.

### 4.2 Narration Density Adaptation
*   **Upgrade:** The system already calculates `avgGap`.
*   **Task:** The `MasterVideo` should automatically adjust **Music Ducking** based on whether the AI is currently speaking or if there is a "visual-only" hold phase.

---

## 🛠 Phase 1 Action Plan (Immediate Steps)

1.  **Audit `/api/vision`:** Refine the prompt to enforce 0-1000 normalized coordinates and semantic labelling.
2.  **Expand `compiler.ts`:** Inject the `DepthOrchestrator` and `useAgencySpring`.
3.  **Update `premium-skill` Library:** Rewrite the markdown templates to use the new `target: ELEMENT_ID` syntax instead of raw coordinates.

---

**Status:** Ready for implementation.
**Current Version:** 2.5 (Automated Generation)
**Target Version:** 3.0 (Agency-Grade Autonomous Studio)
