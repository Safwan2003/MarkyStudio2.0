import {
  getCombinedSkillContent,
  SKILL_DETECTION_PROMPT,
  SKILL_NAMES,
  type SkillName,
} from "@/skills";
import { GoogleGenAI, Type } from "@google/genai";

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const VALIDATION_PROMPT = `You are a prompt classifier for a motion graphics generation tool.

Determine if the user's prompt is asking for motion graphics/animation content that can be created as a React/Remotion component.

VALID prompts include requests for:
- Animated text, titles, or typography
- Data visualizations (charts, graphs, progress bars)
- UI animations (buttons, cards, transitions)
- Logo animations or brand intros
- Social media content (stories, reels, posts)
- Explainer animations
- Kinetic typography
- Abstract motion graphics
- Animated illustrations
- Product showcases
- Countdown timers
- Loading animations
- Any visual/animated content

INVALID prompts include:
- Questions (e.g., "What is 2+2?", "How do I...")
- Requests for text/written content (poems, essays, stories, code explanations)
- Conversations or chat
- Non-visual tasks (calculations, translations, summaries)
- Requests completely unrelated to visual content

Return true if the prompt is valid for motion graphics generation, false otherwise.`;

const SYSTEM_PROMPT = `
You are an expert at generating agency-quality React components for Remotion animations.
Your output must look like it was made by a premium motion graphics studio.

## COMPONENT STRUCTURE

1. Start with ES6 imports
2. Export as: export const MyAnimation = () => { ... };
3. Component body order:
   - Hooks (useCurrentFrame, useVideoConfig)
   - Constants (COLORS, TEXT, TIMING, LAYOUT) — UPPER_SNAKE_CASE, defined INSIDE the component
   - Calculations and derived values
   - Return JSX

## BRAND DESIGN SYSTEM (CRITICAL — read first)

If the prompt contains a "## BRAND DESIGN SYSTEM" block, you MUST use those exact values everywhere:
- bg → AbsoluteFill backgroundColor and all scene backgrounds (never deviate)
- primary → CTA buttons, key accents, active UI, glow colors, progress fills
- secondary → secondary panels, complementary accents, hover states
- surface → glass card background (copy exactly — it already has the right opacity)
- text → ALL headline and label text color
- textMuted → subtitles, captions, metadata labels
- border → glass card borders, divider lines
- font → fontFamily on every text element

Deviating from these values produces an off-brand, amateur result. Do not invent new colors.

## SPRING CONFIG PRESETS — "Pro Standard" (MANDATORY — agency-grade physics)

The "Pro Standard" is: **damping:200** for all standard UI transitions (crisp inertial settle, zero overshoot).
**damping:8** exclusively for intentionally playful/bouncy elements.

Use SPRING_CONFIGS presets (already in scope) or these exact values:
- Standard UI reveal (cards, panels, overlays, text): spring({ frame, fps, config: { damping: 200, stiffness: 120 } })
- Gentle floating loop (device mockup, avatar): spring({ frame, fps, config: { damping: 22, stiffness: 70 } })
- Playful pop ONLY (notification badge, emoji, confetti): spring({ frame, fps, config: { damping: 8, stiffness: 150 } })
- Cinematic camera push-in: spring({ frame, fps, config: { damping: 200, stiffness: 80 } })

NEVER use \`{ damping: 14 }\` or \`{ damping: 28 }\` — these are low-quality defaults.

## EASING PATTERNS (always add easing to visible interpolations)

Never use bare interpolate(frame, [0,90], [0,1]) for visible motion.
Always add easing or use spring():
\`\`\`tsx
// Ease-out cubic — counters, reveals, progress fills
easing: (t) => 1 - Math.pow(1 - t, 3)

// Ease-in-out cubic — camera moves, dividers, transitions
easing: (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2

// Ease-in quad — exits, fade-outs
easing: (t) => t * t
\`\`\`

## GLASS CARD PATTERN (use for all UI cards on dark backgrounds)

\`\`\`tsx
// Standard glass card — copy exactly:
{
  background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderTop: "1px solid rgba(255,255,255,0.2)",
  borderLeft: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 20,
  boxShadow: "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.15)",
}
// For brand block, mix the custom background gradient but keep the lighter top/left borders and shadow
\`\`\`

## SHADOW DEPTH SCALE (mandatory for light themes, recommended for all)

For light-background scenes, NEVER use single-layer shadows. Use multi-layer soft shadows based on elevation:

| Elevation | boxShadow |
|-----------|-----------|
| Low | 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06) |
| Medium | 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.04) |
| High | 0 4px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.06) |

NEVER use shadow opacity > 0.15 on light backgrounds.
Use "Medium" elevation for floating cards, panels, device mockups.
Use "High" elevation for hero elements (device mockups, central feature cards).
Use "Low" for subtle depth (list items, table rows).

## LIGHT THEME SCENE RULES

When BRAND.style === "light":
1. ALWAYS start with <LightArcBg brand={BRAND} /> as first child of AbsoluteFill
2. Use white cards (background: "white") NOT glass cards (no backdropFilter on light bg)
3. Apply Medium or High shadow elevation to all floating cards
4. Text: BRAND.text (#0f172a), labels: BRAND.textMuted (rgba(15,23,42,0.5))
5. Accent color (BRAND.primary) on max 2–3 elements — never as background fill
6. Border: 1px solid rgba(0,0,0,0.08) on cards and dividers

## ATTACHED IMAGES (CRITICAL — mandatory when present)

ATTACHED_IMAGES is an array of the user's real product screenshots.
Do NOT declare or import ATTACHED_IMAGES — it is already in scope.

When ATTACHED_IMAGES.length > 0, you MUST:
1. Display ATTACHED_IMAGES[0] inside a polished device shell (laptop, browser window, or phone)
2. NEVER show a blank or simulated UI when the real screenshot is available
3. Use: style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top" }}

Correct guard pattern:
\`\`\`tsx
{ATTACHED_IMAGES[0] ? (
  <img src={ATTACHED_IMAGES[0]} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top" }} />
) : (
  <div style={{ width:"100%", height:"100%", background:"#0f172a" }} />  // fallback only
)}
\`\`\`

## CHAMELEON OVERLAY ARCHITECTURE (use for cursor-engine scenes with INTERACTION_SCRIPT)

When an INTERACTION_SCRIPT block is present in the prompt:
- NEVER rebuild the static UI from scratch
- ATTACHED_IMAGES[0] is the immutable background (z=0)
- Place ChameleonInput, ChameleonHighlight, DropdownMenu at exact [box] coordinates (z=10)
- Keep cursor at z=100
- Use the frame numbers from INTERACTION_SCRIPT to trigger each chameleon at the right time

Components in scope (do NOT declare):
- useTyping(text, startFrame, fps, cps?) → {displayText, showCursor}
- usePopup(openFrame, closeFrame?) → {scale, opacity, visible}
- useAccordion(triggerFrame, targetHeight) → {height, opacity}
- useDragItem(from, to, startFrame) → {x, y, elevation}
- ChameleonInput({x, y, w, h, text, startFrame, brand}) — typing overlay on input
- ChameleonHighlight({x, y, w, h, triggerFrame, brand}) — click glow on button
- DropdownMenu({x, y, w, items, openFrame, closeFrame, brand}) — spring-in dropdown
- CinematicCamera({targetX, targetY, zoomTo, children}) — push-in zoom + 3D tilt wrapper
- TaskDetailPanel({openFrame, title, fields, brand}) — glass panel slides from right
- ModalOverlay({openFrame, closeFrame, title, brand}) — center modal with backdrop
- InputField({value, placeholder, label, focused, brand, width?}) — styled input with typing cursor (value = useTyping() result)
- ChatBubble({message, author, color, appearFrame, brand}) — message with avatar dot, springs in at appearFrame
- SidebarNav({appName, items, activeItem, brand}) — dark glass sidebar; items=[{label,badge?,icon?}]
- AppShell({sidebar, topbar, children, brand, zoom?}) — full SaaS layout: sidebar left + topbar + main content

## CONCEPTUAL-TIER PATTERNS (from premium-data-flow-abstract / premium-3d-isometric-explode / premium-ambient-environment / premium-shape-morph-transition skills)
- Data flow: Hub nodes + SVG bezier paths (stroke-dashoffset draw animation) + traveling orbs via cubicBezier() formula — see premium-data-flow-abstract skill
- 3D isometric: CSS perspective+rotateX+rotateY on a preserve-3d container; slice screenshot into 3 panels via backgroundPosition — see premium-3d-isometric-explode skill
- Ambient background: orbiting blur orbs (ORBS array, Math.cos/sin, mix-blend-mode:screen) + PARTICLES array with sine drift — MUST be defined outside component — see premium-ambient-environment skill
- Shape morph: clipPath:"circle(Rpx at Xpx Ypx)" expanding from click point to DIAGONAL — see premium-shape-morph-transition skill

Rigid rules:
1. When CURSOR WAYPOINTS block is present in the prompt: paste the CURSOR_STEPS const VERBATIM — do NOT change x/y/box/time values
2. ChameleonInput x, y, w, h come DIRECTLY from CURSOR_STEPS box values — copy them exactly
3. triggerFrame/startFrame for chameleon overlays = step.time + 25 (TRAVEL frames after spring starts). The comment above each step says "arrives+clicks at f:X" — use that X as your triggerFrame/startFrame
4. For input elements: use ChameleonInput + ChameleonHighlight + spotlight darkening (from premium-cursor-engine skill)
5. For button elements: use ChameleonHighlight only
6. For dropdowns: use ChameleonHighlight on trigger + DropdownMenu below it
7. Render cursor div OUTSIDE the CinematicCamera wrapper so it stays at z=100 unaffected by zoom
8. Use progressive camera zoom (camera target lerps toward cur.x/cur.y with a lag) instead of fixed target
9. Add double-ripple click effect (two concentric rings at frame offsets 0 and 4)
10. Add step annotation badges above cursor: "Step N of M" pill in brand.primary color
11. After a button submit step: show loading spinner (rotate via frame*12) → green checkmark success state → slide-in toast
12. For input steps: show keyboard key pill ("Enter ↵" or "Tab ⇥") near end of dwell frames

## TYPOGRAPHY SCALE (MANDATORY — never deviate)

Text size determines visual impact. Size every text element based on its role:

| Role | fontSize | fontWeight | letterSpacing |
|---|---|---|---|
| Hero headline (1–4 words) | **128–160px** | 900 | -0.05em |
| Scene headline (5–8 words) | **80–108px** | 800–900 | -0.04em |
| Section title / card headline | **40–56px** | 700 | -0.02em |
| Body / description text | **22–32px** | 400–500 | -0.01em |
| Badge / label / caption | **14–18px** | 500–600 | 0.01em–0.12em |

**CRITICAL RULES:**
- NEVER use less than 72px for a scene headline that spans the full width
- NEVER use less than 20px for any text the viewer is supposed to read
- For 1–3 word headlines: target 140px+ so text FILLS most of the frame width
- Always set lineHeight 1.0 to 1.1 for headlines (no default browser line-height)
- Always set letterSpacing "-0.03em" minimum on weights 700+

## GRADIENT TEXT PATTERN (use for hero headlines and key accents)

\`\`\`tsx
// Standard gradient text — copy exactly, always works:
style={{
  background: \`linear-gradient(135deg, \${BRAND.primary} 0%, \${BRAND.secondary} 60%, \${BRAND.primary} 100%)\`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  // No color property needed — WebkitTextFillColor overrides it
}}

// Accent word only (one word gradient, rest solid):
// Apply gradient styles only to the accent word span
// Apply color: BRAND.text to all other word spans
\`\`\`

Use gradient text on: hero/opener scene headlines, CTA scene primary headline, bold problem statements, brand name reveals.

## VISUAL COMPOSITION (follow these to look agency-quality)

**Layout:**
- Give every element 80–120px breathing room from screen edges (160px minimum for hero/title scenes — generous negative space = premium)
- Use a split composition for showcase/feature scenes: text left (40%), visual right (55%), 5% gap
- For full-screen text scenes: center everything, max 75% width constraint on text blocks
- AbsoluteFill background must match BRAND.bg from frame 0 — never fade in background

**Visual hierarchy:**
- One dominant element per scene (the largest, brightest, or first to animate)
- Everything else is subordinate — reduce size, weight, or opacity of secondary elements
- CTA buttons: at minimum 60px tall, min-width 280px, full border-radius (9999px for pill shape)

**Alignment:**
- Left-aligned text + right-side visual = modern, editorial feel (showcase scenes)
- Center-aligned = dramatic reveal (title cards, stat counters, CTA)
- Never mix alignment within the same text block

**Color usage:**
- Primary (BRAND.primary) on max 2–3 elements per scene — overusing it kills impact
- Use \`\${BRAND.primary}20\` (12.5% opacity) for background washes, never full-opacity fills
- Glow/bloom effect: \`radial-gradient(circle, \${BRAND.primary}25 0%, transparent 60%)\` + \`filter: blur(60px)\` behind key elements

## SAAS COLOR PALETTE PRESETS (use when BRAND colors are not specified)

If no BRAND design system is provided, default to one of these polished palettes based on the product type:

| Style | bg | primary | secondary | text |
|---|---|---|---|---|
| Dark SaaS (dev/data) | #0a0f1e | #6366f1 | #14b8a6 | #f8fafc |
| Dark SaaS (enterprise) | #0c1220 | #3b82f6 | #8b5cf6 | #f1f5f9 |
| Light SaaS (B2B) | #f8fafc | #4f46e5 | #0ea5e9 | #0f172a |
| Dark Neon | #080c14 | #22d3ee | #a855f7 | #e2e8f0 |
| Warm Light | #faf9f7 | #f97316 | #eab308 | #1c1917 |

Always prefer dark SaaS (dev/data) as default when product type is unclear.

## CURSOR ENTRY CONVENTION

When generating scenes with cursor waypoints, the cursor must ALWAYS start off-screen by including an initial anchor step:
\`\`\`tsx
const CURSOR_STEPS = [
  { x: 0.5, y: 0.85, label: "", time: 0, action: "none" }, // enters from bottom-center
  // ... actual waypoints below
];
\`\`\`
Without this anchor, the cursor is pre-positioned at the first waypoint from frame 0 instead of traveling to it.

## SECTION HEADER REQUIREMENTS

For cursor-engine and chameleon-ui scenes with 3+ interaction steps, include a sectionHeader on each interaction event naming the feature being demonstrated.
In the scene prompt, instruct: "Label each cursor step with a contextual section header above the UI — large bold text (64px, weight 800) in brand.text color that slides in from above and identifies the feature. Format: 'Feature Name' above the device frame."

## PERFORMANCE RULES

- Add willChange: "transform" on elements that animate every frame (device floats, orbs)
- Do NOT animate filter: blur() per frame — use a fixed blur on static depth layers
- Use transform for all movement — never animate top/left/width/height
- For text counters: fontVariantNumeric: "tabular-nums" prevents layout shift

## DETERMINISM RULE (CRITICAL for distributed rendering)

NEVER use Math.random() — it produces different values on each render chunk, breaking consistency.
ALWAYS use random('stable-seed-string') from Remotion scope instead:
\`\`\`tsx
// WRONG: Math.random() * 100
// RIGHT: random('particle-x') * 100
const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  x: random(\`p-\${i}-x\`) * width,
  y: random(\`p-\${i}-y\`) * height,
  size: 4 + random(\`p-\${i}-size\`) * 8,
}));
\`\`\`

## LAYOUT RULES

- Use full width/height — never constrain content to a small centered box
- Use Math.max(minPx, Math.round(width * fraction)) for responsive sizing
- AbsoluteFill backgroundColor must be set from frame 0 — never fade in backgrounds
- You have full layout freedom — build unique dashboards, kanban boards, and data tables from base HTML elements tailored to the prompt. Do NOT replicate a generic template.

## AVAILABLE IMPORTS

\`\`\`tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring, Sequence } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Circle, Rect, Triangle, Star, Ellipse, Pie } from "@remotion/shapes";
import { ThreeCanvas } from "@remotion/three";
import { useState, useEffect } from "react";
\`\`\`

## PRE-BUILT SCOPE CONSTANTS (already in scope — do NOT re-declare)

These are injected into every generated component automatically. Using them avoids
boilerplate and guarantees consistency:

- **getGlassCard(brand)** — dark/light adaptive glass card styles. Call it directly:
  \`\`\`tsx
  style={{ ...getGlassCard(BRAND ?? undefined), padding: 32 }}
  \`\`\`
- **ParallaxLayer** — 3D depth layer for scrolling/zooming backgrounds. Depth 0-1.
  \`\`\`tsx
  <ParallaxLayer depth={0.5} cameraProgress={progress}><div/></ParallaxLayer>
  \`\`\`
- **SheenOverlay** — Diagonal sweeping light overlay for buttons/cards.
  \`\`\`tsx
  <SheenOverlay startFrame={30} width={200} angle={105} />
  \`\`\`
- **MotionBlurWhip** — Cinematic motion blur wrapper for fast transitions.
  \`\`\`tsx
  <MotionBlurWhip frame={frame} startFrame={0} duration={14} maxBlur={18}><div/></MotionBlurWhip>
  \`\`\`
- **SPRING_CONFIGS** — { entrance, float, pop, cinematic } — named presets for spring()
  \`\`\`tsx
  spring({ frame, fps, config: SPRING_CONFIGS.entrance })
  spring({ frame, fps, config: SPRING_CONFIGS.pop })
  \`\`\`
- **EASINGS** — { easeOutCubic, easeInOutCubic, easeInQuad } — easing functions
  \`\`\`tsx
  interpolate(frame, [0, 60], [0, 1], { easing: EASINGS.easeOutCubic, extrapolateRight: "clamp" })
  \`\`\`
- **Audio** — Remotion Audio component for background music and SFX (do NOT import it)
  \`\`\`tsx
  <Audio src="https://..." volume={0.4} loop />
  \`\`\`
- **MeshGradientBg** — Animated mesh gradient background (4 radial gradients that slowly drift). Use instead of static CSS gradients for rich, living backgrounds.
  \`\`\`tsx
  // colors defaults to brand-appropriate tones if omitted
  <MeshGradientBg colors={["#6366f1", "#8b5cf6", "#14b8a6", "#3b82f6"]} animate speed={0.8} />
  \`\`\`
- **CameraMotionBlur** — Cinematic directional motion blur (shutterAngle=180° standard). Wrap high-velocity container shifts.
  \`\`\`tsx
  // velocityX/Y in px/frame — drives blur intensity via shutterAngle
  <CameraMotionBlur velocityX={slideSpeed} shutterAngle={180}>
    <div style={{ transform: \`translateX(\${x}px)\` }} />
  </CameraMotionBlur>
  \`\`\`
- **random(seed)** — Remotion's seeded random (deterministic across renders). ALWAYS use this instead of Math.random() for any visual variation.
  \`\`\`tsx
  // Returns stable 0–1 value. Use string seeds for named elements.
  const x = random('particle-3-x') * width;
  const delay = random(\`card-\${i}-delay\`) * 20;
  \`\`\`
- **useAudioSync(wordTimings?)** — Returns \`{ currentWord, wordProgress, completedWords }\` synced to pre-computed word timestamps. Use WORD_TIMINGS (pre-built array, already in scope) as the argument.
  \`\`\`tsx
  const { currentWord, completedWords } = useAudioSync(WORD_TIMINGS);
  // Highlight the currentWord in the caption, show completedWords faded
  \`\`\`
- **useBeat(bpm, offset?)** — Returns a 0–1 pulse value that peaks on every beat. Sharp attack, slow decay (mimics sidechain compression).
  \`\`\`tsx
  const beat = useBeat(120); // 120 BPM
  // Use for scale, opacity, or glow pulses on each beat
  style={{ transform: \`scale(\${1 + beat * 0.04})\` }}
  \`\`\`
- **WORD_TIMINGS** — Pre-computed word timing array for the scene's voiceover. Pass to useAudioSync(). Array of \`{ word, startFrame, endFrame }\`.
- **GLOBAL_STYLE** — Visual consistency constants: \`{ contentPadding: 80, cardRadius: 20, headlineSize: 88, shadowMedium, shadowHigh, shadowLow }\` — use for consistent spacing across scenes
- **FilmGrain** — Subtle noise overlay for organic feel. Add as topmost layer: \`<FilmGrain opacity={0.03} />\`
- **ContextualSectionHeader** — Large bold text above UI during cursor demos. \`<ContextualSectionHeader text="Feature Name" subtext="Context" startFrame={30} brand={BRAND} />\`
- **SfxSequencer** — Places Audio elements for SFX events: \`<SfxSequencer events={interactionEvents} />\`
- **AnimatedSidebar** — Staggered sidebar nav: \`<AnimatedSidebar appName="App" items={[{label, icon, isActive}]} brand={BRAND} startFrame={0} />\`
- **AnimatedMetricCards** — Count-up metric cards: \`<AnimatedMetricCards cards={[{label, value, numericValue, trend, trendValue}]} brand={BRAND} columns={3} />\`
- **AnimatedTable** — Staggered table reveal: \`<AnimatedTable columns={[{label, width}]} rows={[{cells, isHighlighted}]} brand={BRAND} />\`
- **AnimatedChart** — SVG animated charts: \`<AnimatedChart type="line|bar|donut" dataPoints={[...]} color={BRAND.primary} brand={BRAND} />\`
- **AnimatedForm** — Sequential form field reveal: \`<AnimatedForm title="" fields={[{label, type, value}]} submitLabel="" brand={BRAND} />\`
- **ReconstructedAppShell** — Full app reconstruction from UISchema: \`<ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />\`
- **cubicBezier(from, to, t, controlOffset?)** — Natural arc movement for cursors. Returns \`{x, y}\`. \`from\`/\`to\` are \`{x, y}\` objects, \`t\` is 0–1 spring progress, \`controlOffset\` defaults to 0.15.
  \`\`\`tsx
  const pos = cubicBezier(prevWaypoint, currentWaypoint, springProgress);
  // pos.x, pos.y — use for cursor position
  \`\`\`
- **LightArcBg** — Animated near-white background with concentric arc lines + corner gradient blobs. Drop-in for light-themed scenes.
  \`\`\`tsx
  // Always place as first child of AbsoluteFill for light-theme scenes:
  <LightArcBg brand={BRAND} />
  \`\`\`

## RESERVED NAMES (CRITICAL — never shadow these)

spring, interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence,
ATTACHED_IMAGES, getGlassCard, ParallaxLayer, SheenOverlay, MotionBlurWhip, SPRING_CONFIGS, EASINGS, Audio, BRAND,
MeshGradientBg, CameraMotionBlur, useAudioSync, useBeat, WORD_TIMINGS, random,
useTyping, usePopup, useAccordion, useDragItem,
ChameleonInput, ChameleonHighlight, DropdownMenu,
CinematicCamera, TaskDetailPanel, ModalOverlay, InputField, ChatBubble, SidebarNav, AppShell,
cubicBezier, LightArcBg,
GLOBAL_STYLE, FilmGrain, ContextualSectionHeader, SfxSequencer, AnimatedSidebar, AnimatedMetricCards, AnimatedTable, AnimatedChart, AnimatedForm, ReconstructedAppShell

## OUTPUT FORMAT (CRITICAL)

- Output ONLY code — no explanations, no markdown fences, no questions
- Response must start with "import" and end with "};"
- Make ambitious, high-quality creative choices — do not produce minimal/generic output

`;

const FOLLOW_UP_SYSTEM_PROMPT = `
You are an expert at making targeted edits to React/Remotion animation components.

Given the current code and a user request, decide whether to:
1. Use targeted edits (for small, specific changes)
2. Provide full replacement code (for major restructuring)

## WHEN TO USE TARGETED EDITS (type: "edit")
- Changing colors, text, numbers, timing values
- Adding or removing a single element
- Modifying styles or properties
- Small additions (new variable, new element)
- Changes affecting <30% of the code

## WHEN TO USE FULL REPLACEMENT (type: "full")
- Completely different animation style
- Major structural reorganization
- User asks to "start fresh" or "rewrite"
- Changes affect >50% of the code

## EDIT FORMAT
For targeted edits, each edit needs:
- old_string: The EXACT string to find (including whitespace/indentation)
- new_string: The replacement string

CRITICAL:
- old_string must match the code EXACTLY character-for-character
- Include enough surrounding context to make old_string unique
- If multiple similar lines exist, include more surrounding code
- Preserve indentation exactly as it appears in the original

## PRESERVING USER EDITS
If the user has made manual edits, preserve them unless explicitly asked to change.
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EditOperation = {
  description: string;
  old_string: string;
  new_string: string;
  lineNumber?: number;
};

function getLineNumber(code: string, searchString: string): number {
  const index = code.indexOf(searchString);
  if (index === -1) return -1;
  return code.substring(0, index).split("\n").length;
}

function applyEdits(
  code: string,
  edits: EditOperation[],
): {
  success: boolean;
  result: string;
  error?: string;
  enrichedEdits?: EditOperation[];
  failedEdit?: EditOperation;
} {
  let result = code;
  const enrichedEdits: EditOperation[] = [];

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const { old_string, new_string, description } = edit;

    if (!result.includes(old_string)) {
      return {
        success: false,
        result: code,
        error: `Edit ${i + 1} failed: Could not find the specified text`,
        failedEdit: edit,
      };
    }

    const matches = result.split(old_string).length - 1;
    if (matches > 1) {
      return {
        success: false,
        result: code,
        error: `Edit ${i + 1} failed: Found ${matches} matches. The edit target is ambiguous.`,
        failedEdit: edit,
      };
    }

    const lineNumber = getLineNumber(result, old_string);
    result = result.replace(old_string, new_string);
    enrichedEdits.push({ description, old_string, new_string, lineNumber });
  }

  return { success: true, result, enrichedEdits };
}

/** Parse a base64 data URL into mimeType + raw base64 data */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/** Build a Google content parts array from text + optional base64 images */
function buildParts(
  text: string,
  images?: string[],
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text }];
  if (images?.length) {
    for (const img of images) {
      const parsed = parseDataUrl(img);
      if (parsed) parts.push({ inlineData: parsed });
    }
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface ConversationContextMessage {
  role: "user" | "assistant";
  content: string;
  attachedImages?: string[];
}

interface ErrorCorrectionContext {
  error: string;
  attemptNumber: number;
  maxAttempts: number;
  failedEdit?: {
    description: string;
    old_string: string;
    new_string: string;
  };
}

interface GenerateRequest {
  prompt: string;
  model?: string;
  currentCode?: string;
  conversationHistory?: ConversationContextMessage[];
  isFollowUp?: boolean;
  hasManualEdits?: boolean;
  errorCorrection?: ErrorCorrectionContext;
  previouslyUsedSkills?: string[];
  frameImages?: string[];
  forcedSkills?: string[];
}

interface GenerateResponse {
  code: string;
  summary: string;
  metadata: {
    skills: string[];
    editType: "tool_edit" | "full_replacement";
    edits?: EditOperation[];
    model: string;
  };
}

// Map thinking effort label to token budget
const THINKING_BUDGETS: Record<string, number> = {
  low: 1024,
  medium: 8192,
  high: 24576,
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const {
    prompt,
    model = "gemini-3-flash-preview",
    currentCode,
    conversationHistory = [],
    isFollowUp = false,
    hasManualEdits = false,
    errorCorrection,
    previouslyUsedSkills = [],
    frameImages,
    forcedSkills,
  }: GenerateRequest = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          'The environment variable "GOOGLE_GENERATIVE_AI_API_KEY" is not set. Add it to your .env file and try again.',
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const [modelName, thinkingEffort] = model.split(":");
  const thinkingBudget = thinkingEffort ? THINKING_BUDGETS[thinkingEffort] : undefined;

  const ai = new GoogleGenAI({ apiKey });

  // Fast model for quick classification (validation + skill detection)
  // gemini-2.5-flash has a confirmed free tier (1500 req/day)
  const FAST_MODEL = "gemini-2.5-flash";

  // -------------------------------------------------------------------------
  // 1. Validate the prompt (initial generation only, skip when skill is forced)
  // -------------------------------------------------------------------------
  if (!isFollowUp && !forcedSkills?.length) {
    try {
      const valResult = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: [{ role: "user", parts: [{ text: `User prompt: "${prompt}"` }] }],
        config: {
          systemInstruction: VALIDATION_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { valid: { type: Type.BOOLEAN } },
            required: ["valid"],
          },
        },
      });
      const { valid } = JSON.parse(valResult.text ?? "{}");
      if (!valid) {
        return new Response(
          JSON.stringify({
            error:
              "No valid motion graphics prompt. Please describe an animation or visual content you'd like to create.",
            type: "validation",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    } catch (validationError) {
      console.error("Validation error:", validationError);
      // Allow through on error rather than blocking
    }
  }

  // -------------------------------------------------------------------------
  // 2. Detect applicable skills (skip if forcedSkills provided)
  // -------------------------------------------------------------------------
  let detectedSkills: SkillName[] = [];
  if (forcedSkills && forcedSkills.length > 0) {
    // Use forced skills directly (from narrative planner) — skip AI re-detection
    detectedSkills = forcedSkills.filter((s) =>
      (SKILL_NAMES as readonly string[]).includes(s),
    ) as SkillName[];
    console.log("Using forced skills:", detectedSkills);
  } else {
    try {
      const skillResult = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: [{ role: "user", parts: buildParts(`User prompt: "${prompt}"`, frameImages) }],
        config: {
          systemInstruction: SKILL_DETECTION_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["skills"],
          },
        },
      });
      const parsed = JSON.parse(skillResult.text ?? "{}");
      detectedSkills = ((parsed.skills as string[]) ?? []).filter((s) =>
        (SKILL_NAMES as readonly string[]).includes(s),
      ) as SkillName[];
      console.log("Detected skills:", detectedSkills);
    } catch (skillError) {
      console.error("Skill detection error:", skillError);
    }
  }

  // Filter out previously used skills to avoid redundant context
  const newSkills = detectedSkills.filter(
    (skill) => !previouslyUsedSkills.includes(skill),
  );

  const skillContent = getCombinedSkillContent(newSkills);
  const enhancedSystemPrompt = skillContent
    ? `${SYSTEM_PROMPT}\n\n## SKILL-SPECIFIC GUIDANCE\n${skillContent}`
    : SYSTEM_PROMPT;

  // -------------------------------------------------------------------------
  // 3. Follow-up edit mode (non-streaming, structured JSON response)
  // -------------------------------------------------------------------------
  if (isFollowUp && currentCode) {
    try {
      // Build conversation context string
      const contextMessages = conversationHistory.slice(-6);
      let conversationContext = "";
      if (contextMessages.length > 0) {
        conversationContext =
          "\n\n## RECENT CONVERSATION:\n" +
          contextMessages
            .map((m) => {
              const imageNote =
                m.attachedImages && m.attachedImages.length > 0
                  ? ` [with ${m.attachedImages.length} attached image${m.attachedImages.length > 1 ? "s" : ""}]`
                  : "";
              return `${m.role.toUpperCase()}: ${m.content}${imageNote}`;
            })
            .join("\n");
      }

      const manualEditNotice = hasManualEdits
        ? "\n\nNOTE: The user has made manual edits to the code. Preserve these changes."
        : "";

      let errorCorrectionNotice = "";
      if (errorCorrection) {
        const failedEditInfo = errorCorrection.failedEdit
          ? `\n\nThe previous edit attempt failed. Here's what was tried:\n- Description: ${errorCorrection.failedEdit.description}\n- Tried to find: \`${errorCorrection.failedEdit.old_string}\`\n- Wanted to replace with: \`${errorCorrection.failedEdit.new_string}\`\n\nThe old_string was either not found or matched multiple locations. You MUST include more surrounding context to make the match unique.`
          : "";

        const isEditFailure =
          errorCorrection.error.includes("Edit") &&
          errorCorrection.error.includes("failed");

        errorCorrectionNotice = isEditFailure
          ? `\n\n## EDIT FAILED (ATTEMPT ${errorCorrection.attemptNumber}/${errorCorrection.maxAttempts})\n${errorCorrection.error}${failedEditInfo}\n\nCRITICAL: Include MORE surrounding code context in old_string to make it unique.`
          : `\n\n## COMPILATION ERROR (ATTEMPT ${errorCorrection.attemptNumber}/${errorCorrection.maxAttempts})\nThe previous code failed to compile:\n\`\`\`\n${errorCorrection.error}\n\`\`\`\n\nFix this error only. Do not make other changes.`;
      }

      const editPromptText = `## CURRENT CODE:\n\`\`\`tsx\n${currentCode}\n\`\`\`${conversationContext}${manualEditNotice}${errorCorrectionNotice}\n\n## USER REQUEST:\n${prompt}${frameImages && frameImages.length > 0 ? `\n\n(See the attached ${frameImages.length === 1 ? "image" : "images"} for visual reference)` : ""}

Analyze the request and decide: use targeted edits (type: "edit") for small changes, or full replacement (type: "full") for major restructuring.`;

      console.log("Follow-up edit — model:", modelName, "skills:", detectedSkills.join(", ") || "general");

      const editResult = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: buildParts(editPromptText, frameImages) }],
        config: {
          systemInstruction: FOLLOW_UP_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: 'Use "edit" for small targeted changes, "full" for major restructuring',
              },
              summary: {
                type: Type.STRING,
                description: "Brief 1-sentence summary of changes made",
              },
              edits: {
                type: Type.ARRAY,
                description: "Required when type is edit",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    old_string: { type: Type.STRING, description: "Exact string to find" },
                    new_string: { type: Type.STRING, description: "Replacement string" },
                  },
                  required: ["description", "old_string", "new_string"],
                },
              },
              code: {
                type: Type.STRING,
                description: "Required when type is full: complete replacement code",
              },
            },
            required: ["type", "summary"],
          },
          ...(thinkingBudget !== undefined && {
            thinkingConfig: { thinkingBudget },
          }),
        },
      });

      const response = JSON.parse(editResult.text ?? "{}") as {
        type: "edit" | "full";
        summary: string;
        edits?: EditOperation[];
        code?: string;
      };

      let finalCode: string;
      let editType: "tool_edit" | "full_replacement";
      let appliedEdits: EditOperation[] | undefined;

      if (response.type === "edit" && response.edits) {
        const result = applyEdits(currentCode, response.edits);
        if (!result.success) {
          return new Response(
            JSON.stringify({ error: result.error, type: "edit_failed", failedEdit: result.failedEdit }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        finalCode = result.result;
        editType = "tool_edit";
        appliedEdits = result.enrichedEdits;
        console.log(`Applied ${response.edits.length} edit(s) successfully`);
      } else if (response.type === "full" && response.code) {
        finalCode = response.code;
        editType = "full_replacement";
        console.log("Using full code replacement");
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid AI response: missing required fields", type: "edit_failed" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const responseData: GenerateResponse = {
        code: finalCode,
        summary: response.summary,
        metadata: { skills: detectedSkills, editType, edits: appliedEdits, model: modelName },
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in follow-up edit:", error);
      return new Response(
        JSON.stringify({ error: "Something went wrong while processing the edit request." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Initial generation — streaming
  // -------------------------------------------------------------------------
  try {
    const hasImages = frameImages && frameImages.length > 0;
    const initialPromptText = hasImages
      ? `${prompt}\n\n(See the attached ${frameImages.length === 1 ? "image" : "images"} for visual reference)`
      : prompt;

    console.log(
      "Generating — model:", modelName,
      "skills:", detectedSkills.join(", ") || "general",
      thinkingBudget !== undefined ? `thinking: ${thinkingBudget}` : "",
      hasImages ? `images: ${frameImages.length}` : "",
    );

    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: [{ role: "user", parts: buildParts(initialPromptText, frameImages) }],
      config: {
        systemInstruction: enhancedSystemPrompt,
        ...(thinkingBudget !== undefined && {
          thinkingConfig: { thinkingBudget },
        }),
      },
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        // Prepend skill metadata so the client can show which skills were used
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "metadata", skills: detectedSkills })}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "text-start" })}\n\n`),
        );

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text-delta", delta: text })}\n\n`,
              ),
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating code:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const isQuota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
    return new Response(
      JSON.stringify({
        error: isQuota
          ? "Google AI quota exceeded. Add billing at aistudio.google.com or wait for your daily quota to reset."
          : "Something went wrong while trying to reach Google AI APIs."
      }),
      { status: isQuota ? 429 : 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
