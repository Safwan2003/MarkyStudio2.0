# Video Generation Pipeline — Root Cause Fix Plan

## Root Causes (Definitive)

After reading all 9,067 lines of `compiler.ts`, all 3,234 lines of `useFullVideoGeneration.ts`, and all 2,418 lines of `generate/route.ts`, here are the **5 confirmed root causes** that result in placeholders and compile errors:

---

### RC-1: `sanitizeChild` only runs on the top-level component return, not on particles rendered inside `.map()`

**The bug:** `DynamicAnimation` calls `sanitizeChild(result)` on the root JSX returned by `_UserComponent`. But when the LLM writes `{particles.map(p => <div style={{...p}} />)}` and accidentally inlines a raw particle object as a child (e.g., `{p}` instead of a value from it) the sanitizer never sees it — React throws before `sanitizeChild` can intercept.

**Why:** `sanitizeChild` wraps the final render return. By then React is already reconciling the children tree. `SafeReact.createElement` *does* sanitize each `children` arg, but only at the point of element creation. If a nested call happens *inside* a `.map()` callback that generates its own plain-object children, those inner elements can bypass the guard.

**Fix needed:** `SafeReact.createElement` must recursively sanitize deeply-nested children arrays, not just the top-level spread. The current implementation calls `sanitizeChild` on each element of the spread args but `sanitizeChild` does not recurse into React element `props.children` trees.

---

### RC-2: `extractComponentBody` regex fails silently for implicit-return arrow functions

**The bug:** When the LLM emits:
```tsx
export const Scene = ({ BRAND }) => (
  <AbsoluteFill>...</AbsoluteFill>
)
```
The body extractor correctly enters the `parenStartRel !== -1` path and extracts `<AbsoluteFill>...</AbsoluteFill>`. **But** if there are any helper function declarations *after* the closing `)`, they get silently dropped. If the helpers have top-level `const` declarations that the JSX body references, those names become undefined at runtime → `ReferenceError` → compile error → placeholder.

**Fix needed:** After extracting the implicit-return body, also scan for any trailing `const`/`function` declarations after the closing `)` and prepend them as helpers.

---

### RC-3: `hoistTopLevelConsts` is unsafe for consts that reference other consts declared below them

**The bug:** The `hoistTopLevelConsts` function forcibly moves large `const X = [...]` arrays to the top of the component body. If the array initializer references a variable that is *also* being hoisted but lands after it alphabetically, you get `ReferenceError: Cannot access 'Y' before initialization`.

This is a known TDZ (Temporal Dead Zone) issue. The `hoistPureTopLevelConstsToTop` has a topological sort, but it only handles the *pre-body* phase. The later `hoistTopLevelConsts` does a second pass that can **undo** the correct ordering.

**Fix needed:** Remove the second `hoistTopLevelConsts` pass, or at minimum make it dependency-aware (don't move a const if its initializer references a name that hasn't been hoisted yet).

---

### RC-4: `postProcessCode` TypeScript stripping regex is too aggressive

**The bug:**
```
processed.replace(/\s+as\s+(?:React\.)?[A-Z][A-Za-z0-9_$]*(?:<[^>]*>)?/g, '')
```
This regex also strips `as` in template literals like `` `${x} as string` `` or in variable names like `aString`. More critically, it strips type casts inside object destructuring that the LLM uses legally:
```ts
const { width, height } = useVideoConfig() as { width: number; height: number };
```
→ becomes: `const { width, height } = useVideoConfig();` which is fine, BUT when the regex matches ` as { width` it strips everything up to the closing `}` — breaking the destructure completely.

**The current regex `[^>]*` stops at `>` characters only, not `}`**. So `as { width: number; height: number }` eats the closing `}` of the destructure, producing broken syntax → Babel error → placeholder.

**Fix needed:** Scope this regex to only simple named types (no `{` inside) and let Babel's TypeScript preset handle the rest (since `presets: ["typescript"]` is already applied).

---

### RC-5: `wrapperSource` passes `DynamicAnimation` but JSX runtime is `classic` — `React` must be in scope AND is passed as `SafeReact`

**The bug:** The `wrappedSource` is transpiled with `{ runtime: "classic" }` which means every JSX expression becomes `React.createElement(...)`. The scope injection passes `React = SafeReact`. This works for LLM-generated code.

But the pre-built scope components (e.g., `ParallaxLayer`, `SheenOverlay`, `KineticText`) defined at the top of `compiler.ts` also use JSX and were already compiled by the TypeScript compiler against the *real* `React`. So `SafeReact.createElement` never wraps their children — **any plain object passed as a child to a scope-injected component will bypass the guard entirely**.

**Fix needed:** Scope-injected component factories should use `SafeReact.createElement` internally, OR we need to guard at the boundary: any component in scope that renders children should call `sanitizeChild` on its children prop before passing to the real `React.createElement`.

---

## Proposed Changes

### `compiler.ts` — 4 targeted fixes

#### Fix RC-1: Deep-recursive child sanitization in `SafeReact.createElement`

```diff
 const sanitizeChild = (v: any): any => {
   if (Array.isArray(v)) return v.map(sanitizeChild);
   if (isPlainObject(v)) return null;
+  // Sanitize children inside already-created React elements
+  if (React.isValidElement(v) && (v as any).props?.children !== undefined) {
+    const el = v as any;
+    return React.cloneElement(el, {
+      ...el.props,
+      children: sanitizeChild(el.props.children),
+    });
+  }
   return v;
 };
```

#### Fix RC-4: Narrow the `as Type` stripping regex

```diff
-  processed = processed.replace(/\s+as\s+(?:React\.)?[A-Z][A-Za-z0-9_$]*(?:<[^>]*>)?/g, '');
+  // Only strip simple named type casts like `as string`, `as React.CSSProperties`
+  // Do NOT strip object-type casts like `as { width: number }` — those have `{` which
+  // breaks the destructure they might be applied to.
+  processed = processed.replace(/\s+as\s+(?:React\.)?[A-Z][A-Za-z0-9_$]*(?:<[A-Za-z,\s|&]*>)?(?!\s*\{)/g, '');
```

#### Fix RC-3: Remove the redundant second hoisting pass

```diff
-    componentBody = hoistTopLevelConsts(componentBody); // then local chunk refinement
+    // NOTE: hoistPureTopLevelConstsToTop already does a dependency-aware topo-sort.
+    // The second hoistTopLevelConsts pass can violate TDZ ordering — removed.
```

#### Fix RC-2: Capture trailing helpers in implicit-return pattern

In `extractComponentBody`, after the `parenStartRel !== -1` branch closes:
```diff
-          const body = `return (\n${inner}\n);`;
-          return cleanHelpers ? `${cleanHelpers}\n\n${body}` : body;
+          // Also capture trailing declarations after the closing paren
+          const trailingRaw = cleaned.slice(i + 1).trim();
+          const trailingHelpers = trailingRaw
+            ? stripExports(trailingRaw).trim()
+            : '';
+          const body = `return (\n${inner}\n);`;
+          const allHelpers = [cleanHelpers, trailingHelpers].filter(Boolean).join('\n\n');
+          return allHelpers ? `${allHelpers}\n\n${body}` : body;
```

### `useFullVideoGeneration.ts` — 1 improvement

#### Improve error logging visibility

Currently when both compile attempts fail, the log is:
```
console.warn(`Scene "X" failed to compile after retry, using placeholder`)
```

Make this a `console.error` with the actual error reason so it's impossible to miss in DevTools:
```diff
-  console.warn(`Scene "${scene.title}" failed to compile after retry, using placeholder`);
+  console.error(
+    `[VideoGen] ❌ Scene "${scene.title}" — BOTH compile attempts failed. Falling back to placeholder.\n` +
+    `Last error seen above. Check the [Scene "..."] Compile error logs above this line.`
+  );
```

---

## Verification Plan

### Automated
- `npx tsc --noEmit` — TypeScript must pass with 0 errors
- `npm run dev` — dev server must start

### Manual
1. Generate a scene with particle animations → confirm no "Objects are not valid" error
2. Generate a scene with complex nested ternaries in JSX → confirm renders, no placeholder
3. Open DevTools → confirm all compile errors surface clearly with `console.error`
4. Test a known-bad prompt with `as { width: number }` style casts → confirm compiler doesn't produce broken code

> [!IMPORTANT]
> Fix RC-3 (remove second hoisting pass) is the highest-risk change — test scenes with large particle arrays declared at top-level after fixing to confirm ordering is preserved.

> [!NOTE]
> RC-5 (SafeReact not covering scope-injected components) is a structural limitation. The quick mitigation is `sanitizeChild` being applied to the *final result* of `_UserComponent` before React reconciles it — which is already done via `DynamicAnimation`. The deeper fix (wrapping pre-built components) is a larger refactor best done incrementally.


## Phase 2: Reimagining LLM Output Constraints

### Root Cause (Cognitive Overload)
The `SYSTEM_PROMPT` in `src/app/api/generate/route.ts` is ~1,800 lines long. It interleaves component API documentation, layout philosophy, motion design rules, and critical syntax constraints. By the time the LLM reaches the end of the prompt, the "HARD SYNTAX BANS" (lines 92-99) are flushed from its immediate attention context. This leads to broken object literals, unclosed brackets, and general syntax errors when generating complex JSX.

### Proposed Changes for `route.ts`

#### 1. Move "HARD SYNTAX BANS" to the bottom of the prompt
Move the syntax bans and structural rules to the very end of the `SYSTEM_PROMPT`, just above `OUTPUT FORMAT`. This ensures they are the last instructions the model processes before generation.

#### 2. Enhance the `OUTPUT FORMAT` section with syntax checks
Add a strict syntax checklist to the `OUTPUT FORMAT` section, emphasizing:
- Closing all JSX tags properly
- Closing all `{`, `[`, and `(` properly
- Finishing component declarations
- Adding a mandatory `// EOF` comment at the absolute end to signal complete generation and prevent cutoff artifacts.

#### 3. Streamline redundant sections
Remove unnecessarily verbose or purely philosophical sections if they distract from actual implementation requirements.

## Phase 2 Verification Plan
1. Send a complex prompt requiring `useStagger` and deep nesting.
2. Confirm the LLM outputs syntactically valid code that runs without Babel compilation errors.
3. Check that the final lines include `// EOF`.
