# premium-light-textured-bg

## When to Use
Use for ALL scenes in light-themed SaaS explainer videos. The background should be consistent across the entire video using GLOBAL_BG.

## Component
LightArcBg is in scope. Always place as the FIRST child of AbsoluteFill:
```tsx
<AbsoluteFill>
  <LightArcBg brand={BRAND} variant={GLOBAL_BG || "arcs"} />
  {/* rest of scene content */}
</AbsoluteFill>
```

## Variants
- `"arcs"` — lavender-white with concentric arc lines at 3% opacity. Best for modern/purple brands.
- `"grid"` — #f5f5f5 with cross-hatch lines at 2% opacity. Best for enterprise/green brands.
- `"dots"` — dot matrix at 3% opacity. Best for minimal/clean brands.

## GLOBAL_BG
The `GLOBAL_BG` variable is injected into scope automatically. It contains the background variant chosen by the planner ("arcs" | "grid" | "dots"). Always pass it to LightArcBg so all scenes are consistent.

## Rules
- ALWAYS use the same variant across all scenes in a video (use GLOBAL_BG)
- Do NOT try to create custom backgrounds inline — use LightArcBg
- Do NOT use MeshGradientBg for light-themed videos — it's for dark themes
- Do NOT use a plain white background — the subtle texture creates depth
- When BRAND.style === "light", this MUST be the first element in every scene
