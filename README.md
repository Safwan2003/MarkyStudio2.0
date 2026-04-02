# MarkyStudio

AI-powered **SaaS explainer / product demo** video generator built with **Next.js + Remotion**.

You give it:
- a structured product brief (from the landing form)
- optional screenshots / recording frames
- optional logo

It outputs:
- a multi-scene Remotion composition (previewable in-browser, renderable via the local render API)

## How it works (high level)

```
Input → (optional) Flow Analyze → Plan → Review/Edit → Generate → Compile → Preview/Render
```

- **Plan**: `/api/plan` turns the brief (+ images) into `ScenePlan[]` + `BrandTokens`, with Director-layer enforcement (intent-first skill selection, motion/skill budgets, continuity defaults).
- **Generate**: `/api/generate` produces per-scene React/Remotion code with the required skill docs injected.
- **Compile**: `src/remotion/compiler.ts` compiles the generated JSX in-browser (Babel) with a large injected scope (no imports needed in LLM output).
- **Quality loop**: `useFullVideoGeneration.ts` runs an audit gate and auto-retries low-scoring generations.

## Key docs

- **System context (authoritative)**: `context.md`
- **Architecture overview**: `ARCHITECTURE.md`

## Dev

```bash
npm i
npm run dev
```
