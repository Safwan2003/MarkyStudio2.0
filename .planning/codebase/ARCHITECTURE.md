# Architecture

**Analysis Date:** 2025-03-26

## Pattern Overview

**Overall:** AI-Driven Video Generation Pipeline (6-Phase)

**Key Characteristics:**
- **AI-Orchestrated:** Uses Gemini 2.5 for planning, analyzing, and coding video scenes.
- **In-Browser Compilation:** Transpiles LLM-generated React/Remotion code on the client side for instant preview.
- **RAG-Enhanced Code Gen:** Injects "Skill" documentation (Markdown) into prompts to guide visual style and complex animations.

## Layers

**Orchestration Layer:**
- Purpose: Manages the video generation lifecycle from input to final render.
- Location: `src/hooks/useFullVideoGeneration.ts`
- Contains: Pipeline state, concurrency logic, API orchestration.
- Depends on: `/api/plan`, `/api/generate`, `/api/vision`, `/api/tts`, `/api/music`.
- Used by: `src/app/page.tsx`, `src/components/AnimationPlayer`.

**Compilation Layer:**
- Purpose: Transpiles and executes LLM-generated JSX in a sandboxed Remotion environment.
- Location: `src/remotion/compiler.ts`
- Contains: Babel configuration, scope variable injection (hooks, components).
- Depends on: `@babel/standalone`, `remotion`.
- Used by: `src/hooks/useFullVideoGeneration.ts`, `src/remotion/DynamicComp.tsx`.

**AI API Layer:**
- Purpose: Specialized endpoints for different AI tasks (planning, vision, coding, audio).
- Location: `src/app/api/`
- Contains: Gemini and ElevenLabs integration logic.
- Depends on: `google-generative-ai`, ElevenLabs SDK.
- Used by: Orchestration Layer hooks.

**Visual Component Layer (Skills):**
- Purpose: High-fidelity, pre-built animation patterns and UI components.
- Location: `src/skills/` and `src/remotion/compiler.ts` (scope components)
- Contains: Markdown definitions for prompts and React components for the compiler scope.
- Depends on: `remotion`, `framer-motion` (sometimes), `@remotion/shapes`.

## Data Flow

**Video Generation Flow:**

1. **Analysis:** `/api/flow-analyze` extracts brand and transition data from screenshots.
2. **Planning:** `/api/plan` creates a scene-by-scene narrative and technical blueprint.
3. **Prefetch:** Audio assets (TTS, music, SFX) are generated in parallel via ElevenLabs.
4. **Generation:** `/api/generate` produces JSX for each scene based on the plan and skills.
5. **Composition:** `createMasterComponent` (in `useFullVideoGeneration.ts`) merges compiled scenes into the final video.

**State Management:**
- Project-level state is handled by `useAnimationState.ts`.
- Conversation/AI assistant state is handled by `useConversationState.ts`.
- Low-level generation progress is tracked within `useFullVideoGeneration.ts`.

## Key Abstractions

**Skill:**
- Purpose: A modular animation pattern or UI style described in Markdown for LLM consumption.
- Examples: `src/skills/premium-cursor-engine.md`, `src/skills/premium-app-walkthrough.md`.
- Pattern: RAG (Retrieval-Augmented Generation) where specific docs are injected based on scene intent.

**ScenePlan:**
- Purpose: A structured object defining a single scene's script, duration, and visual requirements.
- Location: `src/types/generation.ts`
- Pattern: Blueprint for Phase 5 (Code Generation).

## Entry Points

**App Page:**
- Location: `src/app/page.tsx`
- Triggers: User interaction with `LandingPageInput`.
- Responsibilities: Main UI container, connects input to generation.

**Generation Hook:**
- Location: `src/hooks/useFullVideoGeneration.ts`
- Triggers: Form submission or "Generate" click.
- Responsibilities: Running the 6-phase pipeline.

## Error Handling

**Strategy:** Multi-tier recovery (Retries, Fallbacks, Error Boundaries).

**Patterns:**
- **SceneErrorBoundary:** Catches runtime errors in LLM-generated code and displays a branded fallback scene instead of crashing.
- **Auto-Retry:** The generation hook retries failed API calls or compilation errors with simplified prompts.
- **Skill Fallback:** If a complex "Premium Skill" fails to compile, the system retries with a simpler base animation.

## Cross-Cutting Concerns

**Logging:** Custom console logging with stage-specific prefixes (e.g., `[rhythm]`, `[vision]`).
**Validation:** Word count validation for voiceovers against scene duration.
**Authentication:** Environment-variable based API keys for Gemini and ElevenLabs.

---

*Architecture analysis: 2025-03-26*
