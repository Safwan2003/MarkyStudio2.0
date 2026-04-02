# Design Doc: Director Agent Architecture (Step 1 of Audit)

## Goal
Evolve the current "Planning Agent" (Phase 3) into a multi-step "Director Agent" that uses deep reasoning to ensure narrative coherence, visual continuity, and strategic alignment with the product's "Core Transformation."

## Current State
- One big prompt (`NARRATIVE_PLANNING_PROMPT`) generates 5-8 scenes in one go.
- Phase 0 (`CreativeBrief`) provides some constraints but is often ignored or loosely followed by the single-pass planner.
- Post-processing (Director Layer) uses static TypeScript functions to "fix" the plan (enforce skill budgets, transitions, etc.).

## Proposed "Director Agent" Architecture

### 1. Multi-Step Reasoning Loop
Instead of one call, use a sequence of specialized reasoning steps:

1.  **Phase 0: Creative Strategy (The Brief)**
    - *Model*: `gemini-2.5-pro:medium` (with Thinking Budget).
    - *Input*: Product prompt + Image descriptions.
    - *Output*: `CreativeBrief` (Strategic foundation).
2.  **Phase 1: Narrative Architecture (The Backbone)**
    - *Model*: `gemini-2.5-pro:high` (with Thinking Budget).
    - *Input*: Creative Brief + Images.
    - *Reasoning*: Plan the high-level scene intents (hook -> problem -> solution -> feature -> proof -> cta) and assign a "Visual Metaphor" to each. Define the "Global Visual Thread."
    - *Output*: `NarrativeBackbone` (Scene intents, durations, and visual metaphors).
3.  **Phase 2: Scene Design (The Detailed Plan)**
    - *Model*: `gemini-2.5-flash`.
    - *Input*: Narrative Backbone + Creative Brief + Images.
    - *Output*: `FullVideoPlan` (The actual `ScenePlan[]`).
4.  **Phase 3: Continuity Audit (The Quality Gate)**
    - *Model*: `gemini-2.5-flash` (or pro).
    - *Input*: The generated `FullVideoPlan`.
    - *Reasoning*: Verify transitions (cameraPan, zoomThrough), coordinate morph portals, ensure visual anchors transform correctly (broken -> resolved).
    - *Output*: `AuditedVideoPlan` (The final verified plan).

### 2. Deep Reasoning (Thinking Budget)
- Use Gemini's thinking capabilities for Phase 0 and Phase 1 to allow the model to "mull over" the core transformation and visual metaphors before committing to a structure.

### 3. Shared Visual State
- Maintain a "Director's State" that tracks:
    - Current "World" position.
    - Visual Anchor state (broken/resolved).
    - Active App Shell (for walkthrough continuity).
    - Transition flow (carry-over of camera/UI).

### 4. Implementation Plan (Phase 1)
- Refactor `src/app/api/plan/route.ts` to separate the prompts and the logic.
- Create a `DirectorEngine` class/utility to orchestrate the steps.
- Update types in `src/types/generation.ts` if needed to support the Backbone.

## Success Criteria
- [ ] Every video follows a "Core Transformation" thesis.
- [ ] Hook/Problem scenes use visual metaphors instead of raw UI.
- [ ] Walkthrough sequences share a persistent App Shell.
- [ ] Continuity (cameraPan/zoomThrough) is logically sound.
- [ ] Skill/Motion budgets are respected by the LLM (reducing the need for static post-processing).
