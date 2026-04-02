# Codebase Structure

**Analysis Date:** 2025-03-26

## Directory Layout

```
/
├── src/
│   ├── app/               # Next.js 15 App Router (Pages & API)
│   │   ├── api/           # Backend endpoints (AI, Audio, Vision)
│   │   ├── generate/      # Secondary generation page (likely legacy or experimental)
│   │   └── page.tsx       # Primary UI entry point
│   ├── components/        # Frontend UI components
│   │   ├── ui/            # Radix-based design system components
│   │   ├── AnimationPlayer/ # Remotion player & render controls
│   │   ├── ScenePlanEditor/ # AI Plan editor & review tools
│   │   ├── ChatSidebar/   # Assistant chat interface
│   │   └── ...
│   ├── helpers/           # Logic for sanitization and API processing
│   ├── hooks/             # Core state and pipeline logic
│   ├── lib/               # Shared logic (image extraction, scene alignment)
│   ├── remotion/          # Remotion root, dynamic composition, and compiler
│   ├── skills/            # Markdown skill definitions (RAG memory)
│   ├── types/             # TypeScript interfaces and enums
│   └── styles/            # Tailwind global CSS
├── public/                # Static assets (logos, audio samples)
├── templates/             # Project-specific template configurations
├── remotion.config.ts     # Remotion configuration
└── project.md             # Detailed project overview (generated)
```

## Directory Purposes

**`src/app/api/`:**
- Purpose: All server-side logic, primarily integrating with Gemini and ElevenLabs.
- Contains: Individual API route files for planning, generating, auditing, and audio generation.
- Key files: `/api/plan/route.ts`, `/api/generate/route.ts`, `/api/vision/route.ts`.

**`src/components/`:**
- Purpose: Both high-level feature components and shared UI primitives.
- Contains: Feature-specific folders and a `ui/` folder for base components.
- Key files: `AnimationPlayer/index.tsx`, `ScenePlanEditor/index.tsx`, `LandingPageInput.tsx`.

**`src/hooks/`:**
- Purpose: Essential for managing complex application state and orchestrating side effects.
- Contains: React custom hooks for generation, conversation, and animation state.
- Key files: `useFullVideoGeneration.ts` (orchestrator), `useAnimationState.ts`.

**`src/remotion/`:**
- Purpose: All video-rendering and composition-specific code.
- Contains: The Babel-powered compiler and the top-level Remotion compositions.
- Key files: `compiler.ts` (scope and transpilation), `Root.tsx` (Remotion entry), `DynamicComp.tsx`.

**`src/skills/`:**
- Purpose: High-level animation templates and patterns used by the AI code generator.
- Contains: Markdown files (`.md`) that are injected into LLM prompts as context.
- Key files: `premium-cursor-engine.md`, `premium-app-walkthrough.md`, `index.ts`.

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: The primary frontend application entry point.
- `src/remotion/Root.tsx`: The primary entry point for Remotion compositions.

**Configuration:**
- `next.config.js`: Next.js configuration.
- `remotion.config.ts`: Remotion-specific build settings.
- `package.json`: Core dependencies (Next.js, Remotion, AI SDKs).

**Core Logic:**
- `src/hooks/useFullVideoGeneration.ts`: Orchestrates the video generation pipeline.
- `src/remotion/compiler.ts`: Defines the available components and hooks for AI-generated code.

**Testing:**
- `src/remotion/compiler.test.ts`: Tests the code generation and compilation logic.

## Naming Conventions

**Files:**
- PascalCase for React components: `AnimationPlayer.tsx`.
- camelCase for hooks and utilities: `useFullVideoGeneration.ts`, `api-response.ts`.
- kebab-case for API routes and skills: `flow-analyze`, `premium-saas-hook.md`.

**Directories:**
- PascalCase or camelCase depending on content (e.g., `ScenePlanEditor` vs `helpers`).

## Where to Add New Code

**New Feature (UI):**
- Implementation: `src/components/` (use a folder if it's complex).
- Integration: `src/app/page.tsx`.

**New AI Pipeline Step:**
- API Route: `src/app/api/new-step/route.ts`.
- Orchestration: `src/hooks/useFullVideoGeneration.ts`.

**New Animation Style (Skill):**
- Implementation: `src/skills/premium-new-style.md`.
- Registration: `src/skills/index.ts`.

**New Shared UI Primitive:**
- Implementation: `src/components/ui/new-component.tsx`.

---

*Structure analysis: 2025-03-26*
