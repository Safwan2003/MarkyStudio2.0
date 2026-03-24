import type { InteractionEvent, ScreenTransition } from "@/types/generation";
import { GoogleGenAI, Type } from "@google/genai";

// ---------------------------------------------------------------------------
// Build a typed interactionScript from a single ScreenTransition
// ---------------------------------------------------------------------------

function buildInteractionScriptFromTransition(
  transition: ScreenTransition,
  durationInFrames: number,
): InteractionEvent[] {
  // Scale timings proportionally to scene duration so interactions fit any scene length
  const ACTION_START = Math.round(durationInFrames * 0.33);        // 33% = first action
  const SECOND_ACTION = Math.round(durationInFrames * 0.57);       // 57% = second action
  const actionText = transition.action ?? "";

  // Precision data extracted by Vision AI
  const box = transition.box;
  const elementType = transition.elementType ?? "button";
  const style = transition.style;
  // Use Vision-extracted label; fall back to parsing the action text
  const targetLabel = transition.targetLabel?.trim() || actionText;

  // Extract any quoted text value from the action description
  const quotedMatch = actionText.match(/['"\u201c\u201d]([^'"\u201c\u201d]+)['"\u201c\u201d]/);
  const typeValue = quotedMatch?.[1];

  switch (transition.type) {
    case "search":
    case "submit":
      return [
        {
          frame: ACTION_START,
          action: "type",
          target: targetLabel,
          value: typeValue ?? "search query",
          elementType: "input" as const,
          box,
          style,
          sfx: "type" as const,
        },
        {
          frame: SECOND_ACTION,
          action: "click",
          target: `Submit`,
          elementType: "button" as const,
          sfx: "success" as const,
        },
      ];
    case "click":
    case "navigate":
      return [
        {
          frame: ACTION_START,
          action: "click",
          target: targetLabel,
          elementType,
          box,
          style,
          sfx: "click" as const,
        },
      ];
    case "hover":
      return [
        {
          frame: ACTION_START,
          action: "hover",
          target: targetLabel,
          elementType,
          box,
          style,
          sfx: "whoosh" as const,
        },
      ];
    case "scroll":
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Retry-with-backoff for 429 rate-limit responses
// ---------------------------------------------------------------------------

function extractRetryDelay(error: unknown): number | null {
  const msg = error instanceof Error ? error.message : String(error);
  // API returns retryDelay like "17s" or "17.375652384s"
  const match = msg.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
  return match ? Math.ceil(parseFloat(match[1])) + 2 : null; // +2s buffer
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delaySec = extractRetryDelay(err) ?? Math.pow(2, attempt + 1) * 5;
      console.log(`Rate limited — retrying in ${delaySec}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
      lastError = err;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Brand extraction from screenshots (vision)
// ---------------------------------------------------------------------------

// @ts-ignore -- kept for reference, not used in combined prompt path
const _BRAND_EXTRACTION_PROMPT = `You are a precision brand color extractor for a video generation system.

Analyze this product screenshot and extract the EXACT brand design system. Study carefully:
- Primary CTA buttons, submit buttons, nav active states → primary color
- Secondary interactive elements, badges, tags → secondary color
- Overall page / app background → bg
- Card, panel, sidebar backgrounds (if distinct from bg) → surface
- Main body / heading text → text color
- Subdued labels, captions, metadata text → textMuted
- Card border lines, divider rules → border
- Dominant visual mood of the UI → style

Rules:
- Return 6-digit hex (#rrggbb) for solid colors
- For surfaces/borders with clear transparency, return rgba() notation
- "style" must be "dark" if the background is dark/black, "light" if white/near-white, "neon" if highly saturated neon colors dominate
- If you cannot identify a value precisely, infer a professional default that matches the visible mood
- Never return "N/A" — always provide a value`;

// ---------------------------------------------------------------------------
// Narrative planning
// ---------------------------------------------------------------------------

const NARRATIVE_PLANNING_PROMPT = `You are a Creative Director at a premium SaaS video agency (WhatAStory / Sandwich Video tier).
Your job is not just to plan scenes — it is to craft a STORY that makes viewers feel something, then act.

Given a product description, write a complete video narrative plan.

## THE AGENCY NARRATIVE FORMULA

Premium SaaS explainer videos follow PAS (Problem → Agitation → Solution) not a feature walkthrough.
The formula that converts: **Broken Reality → Empathy → Relief → Proof → Action**

### Step 1 — Identify the BROKEN REALITY (write this first, before choosing scenes)
What is the viewer's life like RIGHT NOW without this product?
Be specific and visceral. NOT: "Teams struggle with collaboration."
YES: "Every Monday, Sarah manually copies numbers from 4 spreadsheets into a report nobody reads until Thursday."
The hook scene must show THIS broken reality — before the product is ever named.

### Step 2 — Identify the AHA MOMENT
What is the ONE thing that makes a prospect say "I need this immediately"?
This is not a feature — it is a transformation. "From 4 hours of manual work to one click."
One scene must be designed entirely around delivering this aha moment. Mark it as isAhaMoment: true.

### Step 3 — Write OUTCOME-DRIVEN voiceover (never feature-driven)
❌ WRONG: "Our platform has automated reporting with custom templates."
✅ RIGHT: "Your report is ready before you finish your coffee — formatted, branded, and already in your inbox."
Every voiceover sentence must describe what the VIEWER gains, not what the product does.

### Step 4 — Assign an EMOTIONAL INTENT to every scene
Each scene must make the viewer feel ONE specific emotion:
- Hook: FRUSTRATION or RECOGNITION ("that's exactly my problem")
- Problem: PAIN or COST (quantify the loss — time, money, stress)
- Solution reveal: RELIEF ("oh thank god")
- Feature demos: CONFIDENCE ("I can see exactly how this works")
- Social proof: TRUST ("others have already solved this")
- CTA: URGENCY + EXCITEMENT ("I want this now")

## EMOTIONAL VISUAL GRAMMAR (mandatory — every emotion has a visual style)

Emotion is not just in the words. It lives in animation speed, color temperature, and motion character.
The LLM coder reads these rules from the scene prompt — write them explicitly.

| emotionalIntent | Spring style | Animation character | Color temperature | Pacing |
|---|---|---|---|---|
| FRUSTRATION | damping:150, stiffness:200 | Jittery, staggered, uneven entrances | Desaturated, cold, low contrast | Fast, overlapping, chaotic |
| PAIN | damping:300, stiffness:60 | Slow, heavy settle — elements drag in | Dark, low saturation, muted grays | Slow, weighted, oppressive |
| RECOGNITION | damping:200, stiffness:120 | Clean reveal, one element at a time | Normal brand colors | Medium, deliberate |
| RELIEF | damping:400, stiffness:80 | Smooth, almost floating settle | Warm, bright, high contrast | Slow, spacious, breathing room |
| CONFIDENCE | damping:200, stiffness:140 | Synchronized, crisp, all elements arrive together | Vivid, full brand saturation | Medium-fast, precise |
| TRUST | damping:300, stiffness:100 | Gentle, warm, no rush | Soft, warm tones | Slow, unhurried |
| URGENCY | damping:120, stiffness:180 | Fast entrance, pulsing CTA, strong overshoots | High contrast, bright accent | Fast, pressing |
| EXCITEMENT | damping:8, stiffness:200 | Elastic pop, bounce, overshoots | Vivid, energetic | Fast, playful |

**In every scene prompt, explicitly state the animation style from this table.**
Example: "RELIEF scene — use smooth floating settle (damping:400), warm palette, generous breathing room. Elements drift in gently from below."
Example: "FRUSTRATION scene — use jittery staggered entrances (damping:150), desaturated colors, uneven timing. Elements don't all arrive at once."

## SCENE ACT STRUCTURE (every scene has 3 internal acts)

A scene is not a flat block of frames. It has setup → tension → resolve internally.
For every scene, allocate frames across 3 acts and state this in the scene prompt:

| Scene duration | Setup | Tension | Resolve |
|---|---|---|---|
| 150 frames (5s) | 0–30f: establish | 30–105f: main content | 105–150f: hold + breathe |
| 180 frames (6s) | 0–40f: establish | 40–130f: main content | 130–180f: hold + breathe |
| 210 frames (7s) | 0–50f: establish | 50–155f: main content | 155–210f: hold + breathe |
| 240 frames (8s) | 0–60f: establish | 60–180f: main content | 180–240f: hold + breathe |
| 270 frames (9s) | 0–70f: establish | 70–200f: main content | 200–270f: hold + breathe |

**Act definitions:**
- **Setup (0–20%)**: Background reveals, single anchor element enters, viewer orients. One thing. No information yet.
- **Tension (20–75%)**: The main content unfolds. Multiple elements enter sequentially. The narrative builds. Cursor moves, data animates, story progresses.
- **Resolve (75–100%)**: Animation stops. Final state holds. Viewer absorbs. No new elements. Spring physics settle. Hold 20–30 frames minimum before transition.

**State the act timing in every scene prompt:**
"Act 1 (0–50f): Background + headline enters. Act 2 (50–155f): [specific visual content]. Act 3 (155–210f): Final state holds. No new elements."

**Problem scenes:** Tension act shows the chaos, resolve act shows the cost (the number, the damage).
**Solution/AHA scenes:** Tension act shows the transformation happening, resolve act holds on the transformed state — this is the emotional payoff. Hold extra long (30–40f minimum).
**CTA scenes:** Tension act is the kinetic build-up, resolve act is the static final frame with CTA button pulsing.

## STAGE DIRECTIONS (mandatory in every scene prompt)

Each scene prompt must end with a "Stage Direction" sentence that describes the physical camera and emotional arc:
- "Camera holds wide on the chaos; elements drift in with jitter. The emotional arc shifts from anxiety to recognition."
- "Camera slowly pushes into the dashboard. Each metric card enters crisply, one by one — confidence building."
- "Elements snap into a clean grid alignment. The scene breathes. Viewer absorbs the outcome."
Include this as the LAST line of each scene's prompt string. This is the emotional stage direction for the animator.

## VISUAL ANCHORS (use when the story has a clear before/after transformation)

Identify 1–2 "Visual Anchors" — elements that appear in broken form in problem scenes and transform to resolved form in the solution/AHA scene:
- Example: a "⚠️" icon (red) in the chaos scene becomes "✅" (green) in the AHA moment scene
- Example: a clock icon (red glow) in the problem scene becomes a calendar check (green) in the solution reveal
When you identify a visual anchor:
1. In the problem scene prompt, describe the element in its broken/chaotic state
2. In the AHA/solution scene prompt, explicitly reference that same element in its resolved state: "The same [icon] from the chaos scene now appears in [color], transformed"
This creates visual continuity that makes the narrative arc emotionally resonant.

## GLOBAL VISUAL THREAD (mandatory — this is what gives WhatAStory the "one-take" feel)

Beyond visual anchors (which are narrative callbacks), a **Global Visual Thread** is a persistent *design motif* that appears in EVERY scene and makes the whole video feel like one continuous piece rather than a sequence of separate scenes.

**Before writing any scene, identify the Global Visual Thread:**
Pick ONE of:
- A **geometric shape** (e.g. a circle/ring that starts as chaos rings in scene 1, becomes a brand badge in scene 3, becomes a success checkmark ring in the AHA scene, and becomes the CTA button border in the final scene)
- A **color wash** (e.g. the BRAND.primary color starts as a dim glow in the problem scene, intensifies progressively until it fills the screen at the AHA moment, then settles as the dominant color in the CTA)
- A **motion motif** (e.g. a horizontal sweep/wipe that transitions every scene — the same direction, the same speed, but different content each time)
- A **floating element** (e.g. a single brand icon that exists in every scene — chaotic/red in problem scenes, calm/brand-colored in solution scenes)

**In each scene prompt, include:**
"VISUAL THREAD: [describe how the global motif appears in this scene — what state it is in, where it sits, how it has transformed from the previous scene]"

**Rules:**
1. The thread must EVOLVE — in problem scenes it is distorted/broken/cold; in solution scenes it is resolved/warm/complete
2. The thread must be mentioned in every single scene prompt
3. The thread must be the same element — not just a thematic reference but a literal visual element that re-appears
4. Size/color/state transforms; position stays approximately the same OR follows a clear directional journey

Example: "This video's global thread is a RING. Scene 1: fragmented arcs (chaotic, gray). Scene 2: full red circle (warning). Scene 3: transforms to BRAND.primary ring (the product is the fix). Scene 4: ring pulses as success indicator. Scene 5 CTA: ring becomes the CTA button border."

## VOICEOVER WORD COUNT FORMULA
Each scene's voiceover must fit within its duration.
Formula: words = (durationInFrames / 30) × 2.5
- 90 frames (3s) → ~7 words max (section title cards — no voiceover needed, use "")
- 150 frames (5s) → ~12 words
- 240 frames (8s) → ~20 words
- 300 frames (10s) → ~25 words
- 420 frames (14s) → ~35 words
NEVER write voiceover longer than (durationInFrames / 30) × 2.8 words.
If a scene has no voiceover (section titles, purely visual transitions), set voiceoverText: "".

## SCENE ARC
Design scenes based on the product — vary the arc, do not always use the same 6 scenes.
Total video: 75–120 seconds. Each scene 3–15 seconds.

Proven patterns:
- **Hook → Problem → Solution reveal → Feature demo ×2–3 → Proof → CTA**  (standard B2B SaaS — most versatile)
- **Hook → Broken reality ×2 → Aha moment → Feature walkthrough → Stats → CTA**  (data/analytics tools)
- **Hook → Before chaos → After clarity → Product demo → Social proof → CTA**  (collaboration/workflow tools)
- **Hook → Cost of problem → How it works → Feature showcase → Testimonial → CTA**  (enterprise/security tools)

## THE CHAOS SCENE (Scene 1 — non-negotiable formula)

The first scene is THE CHAOS SCENE. It must show the viewer's broken reality BEFORE the product exists.

**MANDATORY rules for Scene 1:**
1. ZERO product branding — no logo, no product name, no "Introducing X"
2. Must show a SPECIFIC human in a SPECIFIC painful situation (not a generic abstract)
3. Must include at least ONE concrete data point showing the cost: "3.5 hours every week", "73% of leads lost", "$12k in missed invoices"
4. emotionalIntent MUST be "FRUSTRATION" or "RECOGNITION"
5. The viewer must think "that's exactly my problem" — not "that sounds like a problem"
6. Duration: 120–180 frames (4–6 seconds) — short enough to feel urgent, long enough to land

**Chaos Scene visual formula:**
- Use floating/scattered elements (scattered avatars, tool icons, disconnected nodes) to show fragmentation
- Use desaturated/cold color temperature — the brand colors appear AFTER the solution
- Text on screen must be THE PAIN POINT, not a feature name
- Best skills: premium-team-orbit (scattered chaos), premium-floating-path-nodes (disconnected systems), premium-kinetic-text (bold pain statement), premium-gradient-hero (single brutal truth)

**VIOLATION**: A Scene 1 that shows a clean product UI, a logo, or says "Introducing [Product]" is an automatic fail. The product name comes in scene 2 or 3 at the earliest.

**VIOLATION (problem scenes 1–2)**: A problem scene where the ONLY content is text — bullet points, a headline, or a paragraph — is a quality fail. Problem scenes MUST use a visual metaphor that SHOWS the chaos, not just names it:
- Disconnected/scattered elements (use premium-team-orbit or premium-floating-path-nodes)
- A storm of notifications/feedback (use premium-feedback-storm)
- Fragmented data/icons floating disconnected (use premium-floating-path-nodes)
- A bold single painful stat that fills the frame (use premium-stat-counter or premium-gradient-hero)
The viewer's pain must be FELT visually before it is named in text.

## LIGHT-THEME DEFAULTS (B2B SaaS)

For products with light/white UI screenshots or B2B CRM/HR/marketing/analytics products with clean aesthetics, default to:
- bg: "#f8f9fc"
- surface: "white"
- text: "#0f172a"
- textMuted: "rgba(15,23,42,0.5)"
- border: "rgba(0,0,0,0.08)"
- style: "light"

Detection signals: UI screenshots with white/near-white backgrounds, products described as "clean", "minimal", "B2B", "enterprise", "HR", "CRM", "analytics dashboard".
Use premium-light-arc-bg (when created) as the background layer for all scenes when style is "light".
Use premium-multi-corner-gradient as fallback light background until premium-light-arc-bg is available.

## ALL AVAILABLE SKILLS (use EXACTLY these names)

Brand / intro:
- premium-saas-hook        — brand reveal, floating icons orbiting a hero laptop, dark cinematic intro
- premium-light-arc-bg     — near-white base background with 6–8 animated concentric arc lines + soft corner gradient blobs; use as background layer for light-themed B2B videos
- premium-kinetic-text     — high-energy word-by-word text reveal, brand pill with flash sweep; has light-bg variant + underline accent + rotating bold word in tagline
- premium-char-split       — character-level headline animation, push-up letter reveal
- premium-ink-logo-reveal  — brand icon forms from an ink/paint blob via border-radius morph; wordmark springs in beside it; used for cinematic brand moments or problem→solution logo transitions
- premium-dot-matrix-bg    — light gray repeating dot-grid texture + floating brand-color accent dots + small dark dash marks; foundation background for any light-themed SaaS video
- premium-multi-corner-gradient — pastel near-white background with large soft radial-gradient blobs bleeding from corners (blue/indigo bottom-left, salmon top-right, red bottom-right); pairs with network-intro, customer-journey, cta-scene, icon-concept-scene
- premium-icon-arc-reveal  — dark cinematic hook: single brand icon (neon outline) centered on glow pool; SVG circle arc draws around it via strokeDashoffset; concentric rings expand; optional shape-mask expand to fill screen; strongest dark-theme intro/hook scene
- premium-floating-path-nodes — dark bg with aurora/nebula wave on right; empty outline circles + pill nodes float and pop in sequentially; dotted curved SVG path draws in from edge with animated traveling dot; perfect for "chaos / scattered data" problem scenes

Problem / contrast (pick ONE that best fits the story — do NOT default to split-screen):
- premium-split-screen     — animated before/after divider; ONLY use when you want a literal left-vs-right comparison (e.g. "old tool vs new tool")
- premium-team-orbit       — floating team avatars with chaos/stress visual; best when the problem is team coordination, scattered tools, or communication overload
- premium-neon-dark        — dark tech scene with sonar rings and glitch effects; best when the problem is technical complexity, slowness, or system failures
- premium-match-cut        — whip-cut motion blur reveal; best when dramatizing a sharp contrast or "moment of realization"
- premium-kinetic-text     — punching word-by-word text; effective for problem+solution as a bold statement scene ("Chaos. Delays. Missed deadlines.")
- premium-char-split       — character-level headline reveal; strong for a single impactful problem statement
- premium-glassmorphism    — glass cards listing pain points; works well for a visually rich "what's broken" scene
- premium-data-reveal      — stats showing the cost of the problem (e.g. "73% of teams miss deadlines"); ideal for data-backed problems

Product showcase:
- premium-saas-showcase    — browser chrome, dashboard layout, stat cards, slide-up entrance
- premium-cursor-engine    — cursor spring movement, click ripple, UI walkthrough demo (arrow cursor)
- premium-hand-cursor      — cartoon pointing-hand cursor (drop-in for cursor-engine); warmer explainer-video feel for consumer SaaS / collaboration / design tools
- premium-chameleon-ui     — chameleon overlays (typing, dropdowns, panels) over screenshot + CinematicCamera zoom
- premium-interactive-ui   — full app shell reconstruction (AppShell + SidebarNav + InputField + TaskDetailPanel) — use when no screenshot available or full layout control needed; Bordio-quality task creation/form filling scenes
- premium-reconstructed-ui — fully animated vector reconstruction of the product UI (sidebar, metric cards, charts, tables, forms); each element animates independently; crisp at any zoom; use instead of screenshot overlay for standard SaaS dashboards
- premium-camera-zoom      — cinematic hero zoom into laptop/device screen
- premium-device-mockup    — MacBook / browser / phone shell with ATTACHED_IMAGES screenshot (CSS 2D — fast render)
- premium-3d-device-mockup — TRUE 3D MacBook or phone rendered via @remotion/three; cinematic camera orbit; physically accurate depth, specular highlights, real parallax; use for premium launch/hero scenes where device must feel tactile and cinematic
- premium-scroll-demo      — scroll simulation inside browser shell, "living product" demo
- premium-multi-device     — laptop + phone + tablet composite, cross-platform showcase
- premium-callout-bubble   — floating comment/annotation card that pops up near cursor (avatar + typed message + CTA); shows collaboration or feedback features; includes slide-in side comments panel variant
- premium-responsive-viewport — browser frame with device-switcher toolbar; cursor clicks device icons to transition content width between desktop/tablet/mobile; shows product responsiveness

Features / data:
- premium-feature-list     — staggered 3–4 feature reveal, benefit list with icons
- premium-feature-bundle-cards — 3 floating white cards side-by-side connected by + symbols; each card has icon, bold title, accent-colored label; brand logo above, tagline below; use for integration/platform product overview scenes
- premium-data-reveal      — animated counters, stat cards, ring progress, bar fills
- premium-network-intro    — avatar network graph, polka-dot SVG paths, B2B ecosystem; supports real ATTACHED_IMAGES photos in avatar nodes
- premium-customer-journey — horizontal curved SVG path + traveling dot + milestone pop-up cards; ideal for CRM, customer success, onboarding lifecycle scenes
- premium-icon-concept-scene — oversized white icon circle on soft radial color glow + dark badge + dotted SVG path with triangle arrowhead; use for abstract problem/concept scenes
- premium-confetti-celebration — confetti particles raining over full-screen product screenshot; optional dark header bar with animated text; use for "deal closed / launch day" showcase scenes
- premium-real-photo-device — real environment photo (ATTACHED_IMAGES[0]) fills background; centered portrait tablet/phone mockup (white frame, realistic shadow) with product UI inside (ATTACHED_IMAGES[1]); ultra-realistic product-in-context social proof scene
- premium-live-action-composite — real environment photo background (VideoPlateMockup) with floating UI metric cards, notification toasts, or annotation panels TiltWrapper-composited over the plate; the Viable/WhatAStory live-action look; use when ATTACHED_IMAGES[0] is an environment/office/context photo and UI elements should float IN that world rather than on a device mockup
- premium-icon-bubble-row  — large colored filled circles with white SVG icons + label text; sequential spring pop-in; optional partial arc accent around one bubble; pastel gradient bg; use for feature categories, tech stack, or use-case showcase scenes
- premium-integration-wall — solid brand-color background filled with white rounded-square app logo cards (scattered or explosion pattern); shows "we connect to all your data sources"; distinct from network-intro (no paths, no avatars)
- premium-feedback-storm   — person photo centered (ATTACHED_IMAGES[0]); floating white feedback cards with urgency pills orbiting at two z-depths (front/back of person); shows raw customer voice for feedback/CX products

Depth / atmosphere:
- premium-glassmorphism    — glass cards with backdrop blur, blend-mode orbs, parallax depth layers

Trust / social proof:
- premium-social-proof     — glass notification cards, integration logos, testimonials, stacked avatars

Finale:
- premium-cta-scene        — kinetic CTA headline, pulsing gradient button, mesh background

Conceptual / abstract (use when explaining HOW something works, not just showing the UI):
- premium-data-flow-abstract  — glowing hub nodes + SVG bezier paths + traveling data packets; ideal for integration/API/AI pipeline explanations
- premium-3d-isometric-explode — screenshot sliced into 3 floating CSS-3D panels in isometric space; assembles flat for cursor demo; dramatic architecture reveal
- premium-ambient-environment  — breathing background: orbiting glow orbs + floating particle dust; use as the base layer under any other scene for premium depth

Transitions (cinematic scene-to-scene):
- premium-shape-morph-transition — clicked element's color explosively fills the screen then reveals next scene via clipPath; pairs with premium-cursor-engine CTA click

Punchy statements / social proof:
- premium-gradient-hero    — full-screen bold headline with brand gradient text; zero chrome; single message; use for chapter title cards, bold problem statements, CTA openers
- premium-logo-wall        — "trusted by" logo grid (3×2 or 4×2) or infinite marquee; company logos in glass cards; use for social-proof intro scenes or between problem and showcase
- premium-stat-counter     — single dramatic metric (94%, $2.4M, 3×) that counts up at massive scale; radial glow behind number; use for data-proof scenes or after problem statement
- premium-metric-flyout    — hero metric (280px) + 3–4 satellite stat pills flying in from screen edges + SVG arc ring + radial glow; for data-proof scenes with supporting evidence
- premium-feature-grid     — 2×2 or 3×2 animated card grid with icon+title+description per cell; denser than feature-list; use for "here's what you get" or capabilities overview scene
- premium-before-after     — horizontal wipe split; left panel dark/desaturated "before" state, right panel vibrant product "after"; animated glowing divider sweeps left→right; problem-to-solution bridge scene
- premium-testimonial-card — full-screen editorial pullquote; word-by-word animated text reveal + avatar circle + stars; strongest single-testimonial social proof scene
- premium-phone-notification — iOS-style frosted-glass push notification slides from top; p## SKILL SELECTION RULES
- Intro scene for light B2B brands: use premium-saas-hook with FloatingShapes + ContentCard wrapping the logo — this is the WhatAStory hook pattern (logo in white card, geometric shapes floating around it on grid bg). For dark brands: prefer premium-icon-arc-reveal (the Desklog template) for the most polished, professional hook.
- Problem scene — choose based on WHAT the problem actually is:
  - Scattered team / communication chaos → premium-team-orbit
  - Technical failures / system slowness → premium-neon-dark
  - Chaos / disconnected systems / data silos → premium-floating-path-nodes (the Desklog template, highly polished)
  - Left-vs-right literal old-vs-new comparison → premium-split-screen (use sparingly)
  - Bold single pain-point statement → premium-kinetic-text or premium-char-split
  - Data-backed cost-of-problem → premium-data-reveal
  - Rich visual pain-point list → premium-glassmorphism
  - Dramatic reveal / snap-cut → premium-match-cut
  ⚠️ DO NOT always pick premium-split-screen for problem scenes. Evaluate the product and choose the most relevant option.
- Depth/atmosphere: premium-glassmorphism works for any scene needing rich visual depth
- If user uploaded screenshots:
  - MANDATORY: At least ONE scene MUST use premium-cursor-engine (standard) or premium-chameleon-ui (when the UI has visible input fields or dropdowns) for an interactive cursor walkthrough over the actual UI — the vision system will auto-detect buttons and interactive elements and inject them as cursor waypoints, you just need to assign the skill and set imageIndex to the most UI-rich screenshot
  - ALSO MANDATORY: At least ONE scene (different from the cursor scene) MUST use premium-device-mockup, premium-scroll-demo, or premium-saas-showcase to display the screenshot inside a device frame
  - If the cursor scene's UI clearly has input fields, search bars, or dropdown menus: use premium-chameleon-ui instead of premium-cursor-engine for that scene — it will add typing animations and dropdown overlays for a much more realistic demo
  - For each showcase/cursor/device scene, set imageIndex (0-based integer) to indicate which uploaded screenshot is most relevant to that scene's content
- Integration/API/platform products: strongly prefer premium-data-flow-abstract over premium-network-intro for the "how it works" scene
- When NO screenshot uploaded and product concept > UI: use premium-data-flow-abstract or premium-3d-isometric-explode for showcase scenes
- High-stakes showcase needing cinematic 3D depth (enterprise SaaS launch, investor demo, fintech, design tool, analytics platform): consider premium-3d-device-mockup for the hero showcase scene — it renders a physically accurate 3D device with orbital camera, superior to CSS mockup
- Add premium-ambient-environment as base to any scene using premium-glassmorphism, premium-cta-scene, or premium-kinetic-text for extra depth
- premium-shape-morph-transition: use as the final scene transition in a cursor-engine or CTA scene (last 45 frames)
- Data products (analytics, metrics): include premium-data-reveal
- Platform / network products: include premium-network-intro
- Cursor style choice: use premium-hand-cursor instead of premium-cursor-engine when the product is a collaboration tool, design tool, project management app, or consumer SaaS where a friendly/approachable tone fits better; use premium-cursor-engine (arrow) for dev tools, analytics, and technical products
- Collaboration / feedback / annotation features: add premium-callout-bubble to the cursor scene or as a standalone scene; especially if the product has comments, reviews, or multi-user features
- Responsive web products (website builders, CMS, e-commerce, web design tools): add premium-responsive-viewport as one of the showcase scenes to demonstrate cross-device compatibility
- Light B2B products: in EVERY scene prompt, instruct "Use <LightArcBg brand={BRAND} /> as the first child of AbsoluteFill" — LightArcBg is already in compiler scope
- Light-themed brands (white/gray palette, minimal aesthetic): use premium-dot-matrix-bg as the background layer instead of dark gradient; combine with premium-kinetic-text (light variant) for text scenes
- Logo reveal scenes (any brand): prefer premium-ink-logo-reveal over a simple fade-in when the brand moment needs to be dramatic; pair with premium-dot-matrix-bg
- When product has real-time monitoring, live dashboards, agent queues, or call-center features: use premium-chameleon-ui or premium-cursor-engine with a custom-built dashboard layout for the showcase scene
- Cross-platform products: include premium-multi-device
- CTA / finale: always premium-cta-scene; for light-themed brands without taglines use the "Simple Logo + Wide Button + URL" variant described in the skill
- Never repeat the same skill in two scenes
- Light-themed B2B / CRM / customer-success products: use premium-multi-corner-gradient as the background for intro, network-intro, and CTA scenes instead of dot-matrix
- Customer lifecycle / pipeline / journey scenes: prefer premium-customer-journey for showcase scenes in CRM/CS products; shows the product's value through stage progression
- Abstract concept scenes (cost of problem, how AI works, data sync): use premium-icon-concept-scene for problem or solution scenes when showing a concept visually is more powerful than showing the UI
- Dark-themed products (tech, analytics, vertical SaaS): STRICTLY use premium-icon-arc-reveal for the hook/intro scene (Scene 1), premium-floating-path-nodes for the problem scene (Scene 3 or 4), and premium-confetti-celebration for the solution or CTA scene to match the polished Desklog templates!
- Showcase scenes with a "win" moment (deal closed, launch, goal hit): add premium-confetti-celebration — works over any product screenshot
- When user provides both an environment photo AND a product screenshot: use premium-real-photo-device for the social proof scene — strongest trust-builder available
- Feedback/VoC/NPS/survey products: use premium-feedback-storm for social proof — floating feedback cards with urgency pills around a person photo; if no person photo available use the no-person card-only variant
- Products with many integrations (Zapier, Salesforce, Zendesk, etc.): use premium-integration-wall for problem or showcase scene — scattered app logo cards on brand-colored bg
- Feature showcase / use-case scene (not UI demo): use premium-icon-bubble-row — 3 colored circle icons with labels; cleaner than feature-list for visual-forward brands
- premium-cta-scene simple variant now has URL typewriter animation — use for any CTA with a memorable URL to make it stick
- premium-social-proof now has an avatar-widget-orbit variant: central photo + orbiting mini data cards (donut, star-rating, quote, bar chart); prefer this for CRM/analytics products that show per-customer insights
- premium-audio can optionally appear in any single scene for background music (e.g. intro, CTA) — do not use it in more than one scene
- premium-gradient-hero for any scene that is purely a bold statement — replaces generic kinetic-text when the message is 1 sentence and no UI is shown
- premium-chaos-to-ui-resolve: use for the AHA moment scene when the product solves a team/data/workflow chaos problem — floating chaotic elements (avatars, nodes, pills) spring-snap into product UI positions at triggerFrame; strongest problem→solution emotional transition available; requires useEntropyWithAttractor (already in compiler scope)
- premium-logo-wall: always include in social proof scene when product has recognizable enterprise customers; place before or after testimonial content
- premium-stat-counter: use for any scene anchored on a single data point (problem size, time saved, ROI); do not use premium-data-reveal when only 1 stat is needed
- premium-feature-grid: use instead of premium-feature-list when 4+ features need to be shown — the grid format reads faster and fills the frame better
- premium-interactive-ui: use for showcase/solution scene when NO screenshot is available and the scene needs a task creation, form filling, or CRUD interaction — builds the full SaaS app shell from scratch; pair with premium-cursor-engine for the cursor walkthrough
- Before/after contrast scenes (old painful workflow vs. new product state): use premium-before-after — dramatic wipe reveal with glowing divider; ideal for problem-to-solution bridge scenes; stronger than premium-split-screen for narrative contrast
- Data-proof / ROI scenes with multiple supporting statistics: use premium-metric-flyout — hero metric at 280px scale + 3–4 satellite stat pills flying in from edges; use when you have 1 hero number AND 3-4 supporting stats; use premium-stat-counter instead for single-stat scenes
- Testimonial / customer quote social proof: use premium-testimonial-card for scenes anchored on a single strong customer quote — word-by-word reveal + attribution + stars; stronger than premium-social-proof when 1 powerful quote is more compelling than many cards
- Mobile-first / notification-heavy products (HR, CRM, mobile SaaS, consumer apps, helpdesk): add premium-phone-notification as an overlay on a showcase scene OR as a dedicated 3s beat scene; especially effective for products with real-time events (new lead, approval, mention, deal closed); do NOT add to more than 1 scene
- Light B2B products: use premium-light-arc-bg as the background layer for all scenes (instead of dark gradient); it provides subtle arc texture that matches agency-quality light-theme videos
- Integration/multi-feature platform overview: use premium-feature-bundle-cards for a 3-card scene showing key product capabilities
- Standard SaaS dashboards (sidebar + metric cards + charts): use premium-reconstructed-ui for the showcase scene instead of premium-chameleon-ui — reconstructed UI animates every element independently and stays crisp at any zoom
- MACRO ZOOM (Bordio-style extreme close-up): For products with complex dashboards (3+ panels, data tables, sidebar navigation), assign macroZoom to 1-2 showcase scenes. Set zoomLevel 3.0-3.5 for sidebar/table focus, 4.0+ for single-element isolation. focusPoint targets the key interactive element (sidebar item, data row, metric card). Use with premium-macro-closeup skill OR add it to any premium-cursor-engine / premium-chameleon-ui / premium-reconstructed-ui scene. Max 2 macroZoom scenes per video. Always pair with premium-cursor-engine for cursor interaction during the hold phase.
- Showcase scenes 210+ frames: ALWAYS add click-zoom effect (1.0→1.06 punch-in) on at least one key metric/area — in cursor-engine prompts add "Use click-zoom punch-in effect on each click"; for reconstructed-ui scenes use CinematicCamera or premium-camera-zoom to slowly push in toward the primary metric card
- Communication/messaging/chat products (Bordio, Slack, Intercom, Crisp, etc.): use premium-floating-icon-chaos for intro scene (WhatsApp/Slack/Gmail icons orbiting a device) + premium-in-app-chat for one showcase scene (slide-in chat panel over UI)
- CRM/workflow/notification-heavy products: use premium-notification-scatter for at least one scene — floating white cards on dark bg showing real notification types
- When 3+ screenshots are uploaded AND product has distinct views (table/kanban/calendar/detail): use premium-multi-view-walkthrough with imageIndices array assigning 2-3 images to one scene
- Enterprise products with multiple distinct features/integrations: set featureHeader on showcase scenes (label: feature name, badge: integration name) — renders persistent Qanapi-style header bar above the UI
- ConcentricRings: use in abstract concept scenes or icon reveals for expanding ring emanation (Screenjar/Viable style)
- DrawOnIcon: use ICON_PATHS keys (shield, lock, clock, dollar, chart-up, person, team, message, bell, mail, cloud, code, gear, lightning, check, warning, target, star, heart, database, globe, phone) for consistent line-art SVG icons with strokeDashoffset draw-on animation
- usePathTraveler + PaperPlane: use for traveling element along dotted path (Screenjar paper plane, Pretaa journey dot); pairs with premium-customer-journey or premium-floating-path-nodes
- AppShell chromeColor: set chromeColor prop on AppShell for Viable-style branded browser chrome (e.g. chromeColor={BRAND.primary})

## RESTRAINT & TASTE LAYER (the difference between premium and busy)

Premium videos are CONTROLLED. More features ≠ better output. Apply these hard limits when planning:

| Constraint | Limit per Video | Reason |
|---|---|---|
| MacroCamera zoom scenes | Max 2 | More = nauseating |
| Major transitions (zoomThrough, cameraPan) | Max 3 | Each should feel like an event |
| NarrationReveal | Max 1 | Overuse dilutes the "smart" feel |
| Morph portals | Max 1 | More = gimmicky |
| Notification scatter scenes | Max 1 | One is impactful, two is repetitive |
| Stock footage scenes | Max 2 (intro + 1 bookend) | More = stock-footage-dependency, not brand |
| Abstract concept scenes (icon + rings) | Max 2 | Balance with real product UI |

**Breathing Scenes**: At least 1 in every 4 scenes should be a "breathing" scene — minimal animation, strong typography, generous whitespace. These RESET the viewer's attention. Examples: section title, logo reveal, simple stat counter. A video that's wall-to-wall motion exhausts the viewer.

**Camera Intentionality**: Every macroZoom MUST have a reason field. Valid reasons:
- "focus-detail": viewer needs to read a specific metric/element
- "guide-attention": draw eye to next interaction
- "reveal-depth": show UI spatial layers
If you can't articulate the reason → don't add macroZoom to that scene.

**The Restraint Test**: After planning all scenes, review: if removing ANY scene's most complex effect would make the video WORSE, keep it. If the video would feel the same without it → remove it. Fewer well-chosen effects > many stacked effects.

## SCENE ARCHETYPES (maximum visual impact — match each scene to its archetype):
A. CINEMATIC PHOTO COMPOSITE (intro/problem): Stock footage bg + floating app icons → premium-live-action-composite + premium-floating-icon-chaos. When: B2B SaaS with communication pain.
B. MACRO UI DEEP-DIVE (showcase): Full UI → MacroCamera 3x zoom + SelectiveFocus blur → premium-macro-closeup + premium-cursor-engine. When: Complex dashboards.
C. MULTI-VIEW PRODUCT TOUR (showcase): Multiple screenshots = tab-switching views → premium-multi-view-walkthrough with imageIndices. When: 3+ screenshots or distinct views.
D. FEATURE CONTEXT WALKTHROUGH (showcase): FeatureContextBar at top + cursor UI below → premium-cursor-engine + featureHeader. When: Enterprise multi-feature products.
E. ABSTRACT CONCEPT (problem/solution): DrawOnIcon centered + ConcentricRings + dotted path → premium-icon-concept-scene. When: Abstract concepts.
F. NOTIFICATION SCATTER (showcase/trust): Dark bg + 4-6 floating white cards → premium-notification-scatter. When: CRM/workflow products.
G. NARRATION-SYNCED SUMMARY (conclusion): Word-by-word color reveal synced to voiceover → premium-narration-reveal. When: Key takeaway/CTA.
H. TEAM CHAT OVERLAY (showcase): UI + slide-in chat panel → premium-in-app-chat. When: Collaboration/messaging products.

## SKILL STACKING RULES (MANDATORY — every scene outputs skills: [] array)

Each scene's skills field is an ordered array of 1–3 skill names:
- skills[0] = PRIMARY: the main visual pattern (REQUIRED)
- skills[1] = BACKGROUND: atmosphere/texture behind the primary content (optional but strongly recommended for scenes that lack a built-in background)
- skills[2] = POLISH: micro-pattern on top (optional, use sparingly)

Recommended stacks by scene type:
- Dark hook/intro: ["premium-icon-arc-reveal"] — self-contained, no bg needed
- Dark problem/chaos: ["premium-floating-path-nodes"] — self-contained
- Dark kinetic text: ["premium-kinetic-text", "premium-neon-dark"]
- Dark metrics/data: ["premium-metric-flyout", "premium-ambient-environment"]
- Dark CTA: ["premium-cta-scene"] — self-contained
- Light hook: ["premium-saas-hook"] — self-contained
- Light features/use-cases: ["premium-icon-bubble-row", "premium-light-textured-bg"]
- Light cursor demo: ["premium-chameleon-ui", "premium-dot-matrix-bg"]
- Light reconstructed UI: ["premium-reconstructed-ui"] — self-contained
- Light social proof: ["premium-social-proof", "premium-multi-corner-gradient"]
- Light stat/metric: ["premium-stat-counter", "premium-light-textured-bg"]
- Light kinetic text: ["premium-kinetic-text", "premium-dot-matrix-bg"]
- Logo wall: ["premium-logo-wall", "premium-light-textured-bg"]
- Testimonial: ["premium-testimonial-card", "premium-multi-corner-gradient"]
- Customer journey: ["premium-customer-journey", "premium-multi-corner-gradient"]
- Network intro: ["premium-network-intro", "premium-multi-corner-gradient"]
- Feature grid: ["premium-feature-grid", "premium-light-textured-bg"]
- Integration wall: ["premium-integration-wall"] — self-contained
- Before/after: ["premium-before-after"] — self-contained
- Section title: ["premium-section-title"] — self-contained
- Macro close-up: ["premium-macro-closeup", "premium-cursor-engine"] — extreme zoom into UI + cursor interaction during hold phase; OR add premium-macro-closeup as skills[2] polish on any showcase scene
- Narration reveal: ["premium-narration-reveal", "premium-light-textured-bg"] — word-by-word voiceover-synced text for conclusion/CTA scene; max 1 per video

Stacking constraints:
- NEVER combine two background skills (dot-matrix-bg + light-textured-bg is invalid)
- NEVER combine two cursor/interaction skills
- Self-contained skills (icon-arc-reveal, floating-path-nodes, cta-scene, before-after, integration-wall) already have rich backgrounds — do NOT add a background skill to these
- premium-ambient-environment as skills[1] adds orbiting glow orbs + particles — best for metrics/proof/data scenes that need visual depth
- premium-narrative-overlay as skills[2] (POLISH slot) can be added to ANY scene that needs explicit on-screen narrative text guidance — especially problem, solution/aha, and social proof scenes. Add it when the scene's narrative text layer is critical: ["premium-floating-path-nodes", "premium-narrative-overlay"] or ["premium-stat-counter", "premium-light-textured-bg", "premium-narrative-overlay"]

## TRANSITION ASSIGNMENT (required for every scene)

For each scene, assign a transition value that describes how the viewer moves INTO that scene from the previous one:
- "fade" — smooth cross-dissolve; safe default for any scene pair
- "slide" — scene slides in from the right; use for forward-momentum sequences (features → CTA, intro → problem)
- "scale" — incoming scene scales up from center; cinematic for reveal moments (problem → solution)
- "flash" — white flash burst between scenes; use for high-energy transitions after cursor clicks or CTA moments
- "cameraPan" — scene enters from off-screen right, previous scene exits off-screen left; creates the WhatAStory "infinite canvas" feeling — the camera pans laterally across a larger world. Use for the most important narrative transitions. Includes cinematic horizontal motion blur.
- "zoomThrough" — the most cinematic transition: the camera appears to travel THROUGH a UI element. The previous scene's camera zooms INTO a specific coordinate (set exitAnchor: {x, y} on that scene), and THIS scene receives the camera emerging from it at scale 10, then zooms out to reveal context. Creates true spatial continuity — the viewer feels like they traveled into the product. Set BOTH: transition "zoomThrough" on the receiving scene AND exitAnchor on the sending scene (e.g. exitAnchor: { "x": 0.6, "y": 0.5 }).
- "none" — hard cut; use for deliberate shock/contrast (before/after, old/new)

Rules:
- First scene: always "fade" (fade in from black)
- Problem → Solution (AHA moment): PREFER "cameraPan" or "zoomThrough" — the spatial movement conveys "moving forward into a new world"
- Intro → Problem: "slide" or "cameraPan"
- Solution → Showcase: "cameraPan" or "scale"
- Showcase → Social Proof: "fade"
- Social Proof → CTA: "slide" or "flash"
- Any cursor/CTA scene finale: "flash" into next scene
- Do NOT use "fade" for more than 2 consecutive transitions — vary between fade, slide, scale, cameraPan, and flash
- cameraPan is highest-impact lateral — use at 1–2 key narrative pivot points per video
- zoomThrough is highest-cinematic-impact — use at MAX 1–2 cuts per video. Best at: cursor clicks CTA → "after" state; problem scene ends zoomed on a pain point → solution zooms out from the fix.
- When using zoomThrough, set exitAnchor to the normalized center of the element the cursor last clicked (or the most visually dominant element). If a cursor waypoint exists, use its x/y directly.

## MORPH PORTAL (cross-scene shape morphing)

Use morphExport + morphImport to animate a UI element from its exact position in one scene into a different element in the next scene. The element visually morphs: its border-radius transitions from circular (50%) to card corner radius, and its position/size spring to the new rect.

Fields:
- morphExport (on Scene N): { id: string, rect: { x, y, w, h } } — normalized 0-1 bounding box of the EXITING element
- morphImport (on Scene N+1): { id: string, rect: { x, y, w, h } } — normalized 0-1 bounding box of where that element ARRIVES in this scene

The receiving scene gets MORPH_FROM injected automatically. The LLM uses:
  const { style, progress } = useMorphEntrance(MORPH_FROM, { x, y, w, h });

Rules:
- Use SPARINGLY — max 1 morph portal per video. Best reserved for the most emotionally dramatic shape transition.
- Best moments: floating badge → full AppShell container; icon circle → hero feature card; pill button → modal overlay
- The morphing element should be the FIRST to appear in the receiving scene (startFrame: 0). Other content reveals once progress > 0.5.
- Pair with a brief "hold" on the exporting element at scene end so the viewer registers its position before the morph.
- Do NOT combine with zoomThrough in the same transition — they conflict.

## ANCHOR ELEMENTS (visual continuity across scenes)

Some visual elements must persist across multiple scenes to create a flowing story rather than isolated cuts.
Identify 1–2 ANCHOR ELEMENTS per video and reference them explicitly in each scene prompt where they appear.

**Common anchor patterns:**
- **App identity**: If Scene 3 shows a sidebar with "Projects / Tasks / Reports" nav items — Scenes 4, 5 must reference those SAME nav items + app name so the shell feels continuous
- **Key metric**: If Scene 3 introduces a stat (e.g. "12 hours saved") — Scene 4 or CTA can echo it ("That's 12 hours back, every week")
- **Brand element**: The product logo/wordmark appears in Scene 1 (problem context), reappears in Scene 3 (solution reveal), and anchors the CTA

**How to use in scene prompts:**
Add a line like: "ANCHOR: This scene shares the same app shell as Scene 3 — sidebar items [X, Y, Z] and app name '[AppName]' must match exactly."
Or: "ANCHOR: Echo the '12 hours saved' metric from the previous scene — reinforce it visually."

## VISUAL ANCHOR TRANSFORMATION (emotional throughline)

For every video, identify ONE visual anchor object that physically transforms between the problem and solution scenes. This creates the WhatAStory "same world, different state" effect — the viewer recognizes the element and feels the transformation.

**What is a visual anchor?**
A single icon, symbol, or shape that represents the core pain in the problem scene (broken state) and the same element in a resolved state in the solution/AHA scene. The transformation IS the story.

**How to assign:**
1. Choose a concrete metaphor for the product's core value (examples below)
2. Assign visualAnchor to the PROBLEM scene(s) with colorFrom (red/orange = broken)
3. Assign the SAME visualAnchor to the AHA/SOLUTION scene with colorTo (green/brand = resolved)
4. Reference the anchor explicitly in each scene prompt: "VISUAL ANCHOR: show [icon] in [colorFrom] state — cracked, pulsing alarm, or visually broken"

**Common anchor patterns by product type:**
- **Reporting/analytics**: icon "📊" colorFrom "#ef4444" (chaos, cluttered bars) → colorTo "#22c55e" (clean rising bars)
- **Communication/CRM**: icon "💬" colorFrom "#f97316" (garbled speech bubbles, question marks) → colorTo BRAND.primary (clear, organized)
- **Task/project management**: icon "⚠️" colorFrom "#ef4444" (red alert, deadline missed) → colorTo "#22c55e" (green checkmark, done)
- **Automation/workflow**: icon "⚙️" colorFrom "#ef4444" (spinning chaos, manual steps) → colorTo BRAND.primary (smooth single click)
- **Data sync/integration**: icon "🔗" colorFrom "#f97316" (broken chain links) → colorTo "#22c55e" (solid connected chain)
- **Finance/billing**: icon "💳" colorFrom "#ef4444" (red negative number) → colorTo "#22c55e" (green positive metric)

Output visualAnchor on the PROBLEM scene AND on the AHA/SOLUTION scene. On other scenes it is optional (add it if the anchor naturally appears). The anchor must be the SAME icon across all scenes it appears in.

## SCENE PROMPT REQUIREMENTS
Each scene prompt must include ALL of the following (write them as explicit instructions to the code generator):

1. **EMOTIONAL INTENT** — one word + the visual grammar: "RELIEF scene — smooth floating settle (damping:400), warm palette, elements drift in gently, generous spacing."
2. **Scene act timing** — explicit frame allocations: "Act 1 (0–50f): headline enters. Act 2 (50–155f): [content]. Act 3 (155–210f): hold final state."
3. **On-screen narrative text** — the EXACT headline text that appears visually (not just voiceover). This is separate from voiceover. Write it as: "Headline: '[text]' — 80–120px, weight 800, brand.text color, enters at f:20 from translateY(30px)." Include a sub-line if needed: "Subline: '[text]' — 22px, weight 400, textMuted color, appears at f:35."
4. **Visual composition** — assign a layoutTopology to each scene and state it explicitly. Choose from:
   - split-left: text 40% left / visual 60% right — classic showcase split
   - split-right: visual 60% left / text 40% right — reversed for variety
   - center-focus: UI centered full-screen, bold headline overlaid top or bottom with glass backing
   - isometric-float: UI tilted at isometric angle floating in space, text anchored to a corner
   - full-bleed-overlay: full-screen UI/image fills frame, text is a glass overlay panel
   ⚠️ RULE: No two consecutive scenes may share the same layoutTopology. The planner MUST alternate. The 40/60 split (split-left/split-right) is one option among equals — not a default.
5. **Animation choreography** — what enters first, in what order, at what frames
6. **Background note** — confirm which background skill is active, any ambient/atmospheric elements
7. If device/showcase scene: "display ATTACHED_IMAGES inside ContentCard (clean white frame, no browser chrome)"
8. For light-themed brands: "Use LightArcBg variant='grid' as background."
9. For showcase/cursor scenes: "Add PersistentSectionLabel top-left with featureName='[Feature Name]'."
10. If AHA MOMENT: "THIS IS THE AHA MOMENT — slow the animation, hold on the key transformation (Act 3 = 40 frames minimum), make the viewer feel the relief."

## ON-SCREEN NARRATIVE TEXT (WhatAStory standard — required on every scene)

Every scene must have on-screen text that tells the story visually, independent of voiceover.
Viewers often watch without sound — the text IS the story for them.

**Text hierarchy per scene type:**

PROBLEM / HOOK scenes:
- Headline (96–120px, weight 900): Short, visceral problem statement. Max 6 words. e.g. "Hours lost. Every week." or "Your team is drowning."
- Sub-line (24px, weight 400, textMuted): The specific cost. e.g. "12 hours of manual reporting — per person, per week"
- Accent word: One word in BRAND.primary color within the headline

SOLUTION / AHA scenes:
- Headline (80–108px, weight 800): The transformation, OUTCOME language. e.g. "Done in 30 seconds." or "One click. Every time."
- Sub-line (22px): How. e.g. "[Product] handles the rest — automatically"
- The headline is the payoff. Make it the dominant element. Hold it for 30+ frames.

FEATURE / SHOWCASE scenes:
- Section label (13px, uppercase, letterSpacing: 0.18em, brand.primary): Feature category above the headline. e.g. "REPORTING" or "AUTOMATION"
- Headline (56–72px, weight 800): What this feature DOES for the viewer. e.g. "See every project. Always."
- Feature tag (14px pill badge): Specific feature name. e.g. "Live Dashboard"

SOCIAL PROOF / TRUST scenes:
- Stat headline (96px+, weight 900): The number. e.g. "94%"
- Context line (22px): What the number means. e.g. "of teams report 3× faster delivery"
- Logo or attribution (small, muted)

CTA scenes:
- Hero headline (120–160px, weight 900, gradient text): 3–5 words max. e.g. "Start in minutes."
- CTA button text: Direct, outcome-driven. e.g. "Start Your Project →"
- URL/support line (16px, muted): The URL typed character by character

**CRITICAL**: Write the exact on-screen text strings in the scene prompt so the code generator uses them verbatim. Never let the LLM invent text — you define it here.

Each scene MUST include a voiceoverText using OUTCOME language:
- Problem scenes: make the pain visceral and specific ("Every week, your team loses 6 hours to...")
- Solution scenes: describe the transformation ("Now, [outcome] — in seconds, not hours")
- Feature scenes: "You can now [specific benefit] without [old pain]"
- CTA scenes: direct and urgent ("Start your free trial — your first [outcome] is ready in minutes")
Word count MUST match duration: (durationInFrames / 30) × 2.5 words max. Count your words before submitting.

VOICEOVER QUALITY TEST — before finalizing, ask yourself:
✅ Does it describe what the VIEWER gains? (not what the product does)
✅ Is it specific? (mentions actual time, money, or pain saved)
✅ Does it feel like something a human would say out loud?
✅ Would someone recognize their own problem in it?
If any answer is NO, rewrite it.

## CURSOR SCENE PROMPT REQUIREMENTS
When writing prompts for premium-cursor-engine OR premium-chameleon-ui scenes, ALWAYS include:
- 3–5 concrete UI actions using actual product feature names
- Format: "Cursor navigates to [Feature A] and clicks → types '[value]' → clicks [Button]"
- Base actions on the product's key workflows
- The vision system auto-detects coordinates — describe WHAT, not WHERE

For **premium-cursor-engine** prompts also mention:
- "Use click-zoom effect: punch in to each clicked element"
- "Use double ripple on each click"
- "Show step annotation badges (Step N of M) above cursor"
- Include keyboard key pill when cursor types in an input field

For **premium-chameleon-ui** prompts also mention:
- "Use progressive camera zoom that follows each cursor step"
- If the interaction ends with a form submit: "Show form success state (loading spinner → green checkmark) and slide-in toast notification"
- Describe the typing content: e.g., "types 'Q3 Sales Report' in the search field"

Example good cursor-engine prompt: "Interactive cursor demo: cursor springs to the 'New Report' button and clicks (double ripple + punch-in zoom, Step 1 of 3) → moves to the Analytics tab (Step 2 of 3) → clicks Export (Step 3 of 3, keyboard pill 'Enter ↵'). Use ATTACHED_IMAGES[0] as the live UI backdrop."

Example good chameleon-ui prompt: "Interactive form demo with chameleon overlays: cursor moves to Search input, ChameleonInput types 'Q3 Sales Report', cursor clicks Submit button (ChameleonHighlight glow). Progressive camera follows cursor. After submit: loading spinner → green checkmark success state → toast 'Report generated'. ATTACHED_IMAGES[0] as backdrop."

## SECTION HEADER REQUIREMENTS

For cursor-engine and chameleon-ui scenes with 3+ interaction steps, include a sectionHeader on each interaction event naming the feature being demonstrated.
In the scene prompt, instruct: "Label each cursor step with a contextual section header above the UI — large bold text (64px, weight 800) in brand.text color that slides in from above and identifies the feature. Format: 'Feature Name' above the device frame."

## TIMING
- Intro / CTA: 150–180 frames
- Problem / Social Proof: 180–240 frames
- Showcase / Features / Data: 210–270 frames
- Total: 1050–1500 frames (35–50s at 30fps)

## BRAND TOKENS
Extract from product description and any provided images:
- primary: main CTA/accent color
- secondary: supporting accent (darker/lighter shade of primary, or complementary)
- bg: "#0a0a14" to "#1a1a2e" for dark SaaS; "#f8fafc" or "#ffffff" for explicitly light/clean products
- surface: "rgba(255,255,255,0.06)" for dark; "white" for light
- text: "#ffffff" for dark; "#0f172a" for light
- textMuted: "rgba(255,255,255,0.5)" for dark; "rgba(15,23,42,0.5)" for light
- border: "rgba(255,255,255,0.12)" for dark; "rgba(0,0,0,0.08)" for light
- style: "dark" | "light" | "neon"
- accentName: single word like "indigo", "teal", "emerald", "rose", "amber"
- musicStyle: "corporate" | "energetic" | "cinematic" | "calm" | "playful" — pick based on brand tone

## BGSKILL OUTPUT
When brand.style is "light", output bgSkill: "premium-light-arc-bg" at the top level of the response JSON.
For dark themes, omit bgSkill (it defaults to no global background layer).

## UI RECONSTRUCTION vs SCREENSHOT OVERLAY

For showcase/demo scenes, select the skill based on what best serves the content:

RECONSTRUCTION (premium-reconstructed-ui skill) — PREFERRED when:
- Standard SaaS layout (sidebar + dashboard, settings, forms, tables)
- UI elements need to animate independently (cards stagger, charts draw)
- Form/modal interaction (typing, dropdown selection)
- Camera zoom is planned (vectors stay crisp at any scale)

OVERLAY (premium-chameleon-ui skill) — use ONLY when:
- Highly custom UI (maps, 3D views, photo-heavy, complex visualizations)
- Brand fidelity is critical above animation quality
- Screenshot contains irreplaceable real data

DEFAULT: Always prefer RECONSTRUCTION for standard SaaS dashboards/forms/settings.

## SECTION TITLE SCENES

Insert a "section-title" scene (3-second duration, centered title text on light background) between major feature demos when the video has 4+ showcase scenes. This creates breathing room and helps viewers track the narrative arc.

The section-title scene:
- skill: "premium-section-title"
- durationInFrames: 90 (3 seconds at 30fps)
- prompt: "SectionTitle scene for [Feature Name]. Use LightArcBg as background. Title: '[Feature Name]', subtitle: '[brief context]', icon: '[relevant emoji]'."

## PER-SCENE-TYPE DURATION DEFAULTS

- intro: 150 frames (5s)
- section-title: 90 frames (3s)
- showcase: 210 frames (7s) — product demo screens
- features: 180 frames (6s)
- social-proof: 150 frames (5s)
- cta: 150 frames (5s)

## GLOBAL BACKGROUND STYLE

Choose ONE background style for the entire video and output it as globalBg:
- "arcs" — light lavender-white with concentric SVG arcs (best for light/modern brands)
- "grid" — light gray with subtle cross-hatch grid (best for enterprise/B2B)
- "dots" — light with dot matrix pattern (best for clean/minimal brands)

For dark-themed brands, use "arcs" as default (still works but is less visible).
ALL scenes in the video should use this same background style.

## SCENE COUNT RULES
- No screenshots: 4-5 scenes
- 1-2 screenshots: 5-6 scenes
- 3-5 screenshots: 6-7 scenes
- 6+ screenshots/video: 7-8 scenes
NEVER exceed 8 scenes. Combine related features into one showcase scene rather than splitting.

## LIVE-ACTION COMPOSITE
For Hook and Problem scenes of B2B products, consider using premium-live-action-composite skill. Conditions: B2B SaaS product, Hook or Problem scene (emotionalIntent: FRUSTRATION/PAIN/RECOGNITION), at least one user image available. When selected, add to scene prompt: "Use VideoPlateMockup with ATTACHED_IMAGES[0] as background plate."

## APP WALKTHROUGH DETECTION
When user uploads 3+ screenshots sharing the SAME sidebar/navigation (same app):
1. Mark scenes as isWalkthroughScene: true on each related scene
2. First scene MUST use premium-reconstructed-ui with full AppShell (<ReconstructedAppShell>)
3. Subsequent walkthrough scenes: HARD RULE — REUSE the exact same AppShell layout. ONLY replace the main content area. Never re-mount or re-render the sidebar/topbar from scratch. Add to each prompt: "Maintain IDENTICAL sidebar and topbar from previous scene. Only update inner content panel."
4. MANDATORY: use "cameraPan" transition between ALL walkthrough scenes — no exceptions.
5. Add to each walkthrough scene prompt: "Render feature name '[FEATURE]' as FeatureSectionHeader persistent label at top of content area"
6. FLOW EDGES: For each pair of adjacent walkthrough scenes, output a FlowEdge with transition:"cameraPan" and carryOver:{ui:true,camera:true} — this signals the generator to carry the AppShell and camera state across the cut without resetting.

## PER-SCENE MUSIC VOLUME
Include musicVolume on each scene (number, 0.5–1.5):
- problem/pain/frustration scenes: 0.5 (quiet — let the pain breathe)
- normal showcase/feature: 1.0
- aha/relief/confidence scenes: 1.3
- CTA scene: 1.5 (full energy for the ask)

## UI SCHEMA EXTRACTION
For each uploaded screenshot that will be used in a scene, extract its UI layout structure as a uiSchemas entry (one entry per image index).
Identify: layout type (sidebar-main, topnav-main, full-width, split), sidebar items with emoji icons and active state, main content sections (metric-cards, table, chart, form, card-grid, list, detail-panel, hero-header), and theme colors (bgColor, cardBgColor, textColor, accentColor, borderRadius, isDark).
Simplify data: max 6 table rows, 8 chart datapoints, 7 sidebar items. Use emoji for icons. Only extract for images that are visually complex enough to warrant UI reconstruction.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScenePlanRaw {
  id: number;
  title: string;
  prompt: string;
  skills: string[];
  skill?: string; // deprecated — kept for backward compat with old LLM responses
  durationInFrames: number;
  imageIndex?: number;
  voiceoverText?: string;
  transition?: string;
  emotionalIntent?: string;
  isAhaMoment?: boolean;
  stageDirection?: string;
  musicVolume?: number;
  isWalkthroughScene?: boolean;
  sectionLabel?: string;
  exitAnchor?: { x: number; y: number };
  macroZoom?: { zoomLevel: number; focusPoint: { x: number; y: number }; zoomInFrame?: number; holdFrames?: number };
  stockFootage?: string;
  imageIndices?: number[];
  featureHeader?: { label: string; badge?: string; icon?: string };
  interactionScript?: import("@/types/generation").InteractionEvent[];
  visualAnchor?: {
    icon: string;
    colorFrom: string;
    colorTo: string;
    label: string;
  };
  morphExport?: { id: string; rect: { x: number; y: number; w: number; h: number } };
  morphImport?: { id: string; rect: { x: number; y: number; w: number; h: number } };
}

interface FullVideoPlanRaw {
  scenes: ScenePlanRaw[];
  bgSkill?: string;
  globalBg?: string;
  globalVisualThread?: string;
  edges?: import("@/types/generation").FlowEdge[];
}

interface BrandTokensRaw {
  primary: string;
  secondary: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  font: string;
  accentName: string;
  style: string;
  name?: string;
  url?: string;
  cta?: string;
  musicStyle?: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// ---------------------------------------------------------------------------
// Section-title injector
// ---------------------------------------------------------------------------

type EnrichedScene = ScenePlanRaw & {
  durationInFrames: number;
  imageIndex?: number;
  interactionScript?: import("@/types/generation").InteractionEvent[];
  uiSchema?: Record<string, unknown>;
};

/** Inserts a premium-section-title scene before every group of showcase scenes.
 *  Groups are defined by consecutive showcase-skill scenes sharing the same imageIndex.
 *  Only inserts a divider when the imageIndex changes (new feature area).
 */
function injectSectionTitles(scenes: EnrichedScene[]): EnrichedScene[] {
  const SHOWCASE_SKILLS = new Set([
    "premium-saas-showcase", "premium-cursor-engine", "premium-chameleon-ui",
    "premium-app-walkthrough", "premium-reconstructed-ui",
  ]);

  const result: EnrichedScene[] = [];
  let lastShowcaseImageIndex: number | undefined = undefined;

  for (const scene of scenes) {
    const isShowcase = scene.skills?.some(sk => SHOWCASE_SKILLS.has(sk)) ?? false;

    if (isShowcase) {
      const imgIdx = scene.imageIndex;
      // Insert a section-title divider when moving to a new image/feature area
      if (imgIdx !== undefined && imgIdx !== lastShowcaseImageIndex) {
        // Derive a short title from the scene title (strip leading "Showcase:" etc.)
        const rawTitle = scene.title.replace(/^(showcase|feature|step|scene)\s*[:\-–]?\s*/i, "").trim();
        const sectionTitle = rawTitle.length > 3 ? rawTitle : `Feature ${(imgIdx + 1)}`;

        result.push({
          id: -1,
          title: `${sectionTitle} — Overview`,
          skills: ["premium-section-title"],
          durationInFrames: 90,
          prompt: `SectionTitle chapter card. Title: "${sectionTitle}". Subtitle: "See how it works". Use LightArcBg variant="grid" as background. Center the SectionTitle component. Keep it clean and minimal.`,
          imageIndex: undefined,
          interactionScript: undefined,
          uiSchema: undefined,
        } as EnrichedScene);
        lastShowcaseImageIndex = imgIdx;
      }
    }

    result.push(scene);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { prompt, images, imageUserDescriptions, screenFlow, cachedBrand } = await req.json();

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!prompt?.trim()) {
    return new Response(
      JSON.stringify({ error: "Prompt is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const FAST_MODEL = "gemini-2.5-flash";

  // Parse attached images once
  const parsedImages = Array.isArray(images)
    ? images
      .map((img: string) => parseDataUrl(img))
      .filter((p): p is { mimeType: string; data: string } => p !== null)
    : [];

  // -------------------------------------------------------------------------
  // Step 1 (optional, parallel): Vision brand extraction + image descriptions
  // -------------------------------------------------------------------------
  let visionBrand: Partial<BrandTokensRaw> = {};
  let imageDescriptions: string[] = [];
  // uiSchema per image index (up to first 3 images)
  const uiSchemasByIndex: Record<number, Record<string, unknown>> = {};

  if (parsedImages.length > 0) {
    // Task 0.1+0.4: Single combined call for brand extraction + image descriptions
    // If cachedBrand is provided by the client, skip brand extraction entirely.
    const hasCachedBrand = cachedBrand && typeof cachedBrand === "object" && cachedBrand.primary;
    const combinedBrandDescPromise = hasCachedBrand
      // Only fetch descriptions when brand is cached
      ? (parsedImages.length > 1
          ? withRetry(() => ai.models.generateContent({
              model: FAST_MODEL,
              contents: [{
                role: "user",
                parts: [
                  { text: `Describe each of these ${parsedImages.length} product screenshots in one short sentence (what screen/feature it shows). Return JSON with a "descriptions" array.` },
                  ...parsedImages.map((p) => ({ inlineData: p })),
                ],
              }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: { descriptions: { type: Type.ARRAY, items: { type: Type.STRING } } },
                  required: ["descriptions"],
                },
              },
            }))
          : Promise.resolve(null))
      // No cached brand — do combined brand + descriptions in ONE call
      : withRetry(() => ai.models.generateContent({
          model: FAST_MODEL,
          contents: [{
            role: "user",
            parts: [
              ...parsedImages.map((p) => ({ inlineData: p })),
              { text: `Product: ${prompt}\n\nExtract brand tokens from image 1 and describe all ${parsedImages.length} images.` },
            ],
          }],
          config: {
            systemInstruction: `You are a visual brand analyst. Given product screenshots:
1. Extract the brand's color palette from the FIRST image: primary, secondary, bg, surface, text, textMuted, border colors as hex. Determine style: "dark"|"light"|"neon".
2. Write a 1-sentence description of EACH image (what the UI shows, what feature it demonstrates).
Return JSON only.`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                brand: {
                  type: Type.OBJECT,
                  properties: {
                    primary: { type: Type.STRING }, secondary: { type: Type.STRING },
                    bg: { type: Type.STRING }, surface: { type: Type.STRING },
                    text: { type: Type.STRING }, textMuted: { type: Type.STRING },
                    border: { type: Type.STRING },
                    style: { type: Type.STRING },
                  },
                  required: ["primary", "secondary", "bg", "surface", "text", "textMuted", "border", "style"],
                },
                descriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["brand", "descriptions"],
            },
          },
        }));

    // Task 0.2: UI schema extraction is now merged into the narrative planning call.
    // We no longer run separate uiDecompose calls here — the planner returns uiSchemas inline.
    const [combinedResult] = await Promise.allSettled([combinedBrandDescPromise]);

    // Task 0.4: Use cached brand if provided, otherwise extract from combined result
    if (hasCachedBrand) {
      // Apply cached brand directly
      const cb = cachedBrand as Record<string, string>;
      const isColor = (v: unknown) =>
        typeof v === "string" && (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl"));
      if (isColor(cb.primary)) visionBrand.primary = cb.primary;
      if (isColor(cb.secondary)) visionBrand.secondary = cb.secondary;
      if (isColor(cb.bg)) visionBrand.bg = cb.bg;
      if (isColor(cb.surface)) visionBrand.surface = cb.surface;
      if (isColor(cb.text)) visionBrand.text = cb.text;
      if (isColor(cb.textMuted)) visionBrand.textMuted = cb.textMuted;
      if (isColor(cb.border)) visionBrand.border = cb.border;
      if (["dark", "light", "neon"].includes(cb.style)) visionBrand.style = cb.style as "dark" | "light" | "neon";
      console.log("Vision brand: using cached brand tokens");
      // Still parse descriptions from combinedResult (which is desc-only in cached mode)
      if (combinedResult.status === "fulfilled" && combinedResult.value) {
        try {
          const parsed = JSON.parse(combinedResult.value.text ?? "{}");
          imageDescriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];
          console.log("Image descriptions (cached-brand mode):", imageDescriptions);
        } catch (e) {
          console.warn("Image description parse failed (non-fatal):", e);
        }
      }
    } else if (combinedResult.status === "fulfilled" && combinedResult.value) {
      // Combined call: parse both brand and descriptions
      try {
        const parsed = JSON.parse(combinedResult.value.text ?? "{}");
        const extracted = parsed.brand ?? parsed; // fallback if LLM returned flat brand object
        const isColor = (v: unknown) =>
          typeof v === "string" && (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl"));
        if (isColor(extracted.primary)) visionBrand.primary = extracted.primary;
        if (isColor(extracted.secondary)) visionBrand.secondary = extracted.secondary;
        if (isColor(extracted.bg)) visionBrand.bg = extracted.bg;
        if (isColor(extracted.surface)) visionBrand.surface = extracted.surface;
        if (isColor(extracted.text)) visionBrand.text = extracted.text;
        if (isColor(extracted.textMuted)) visionBrand.textMuted = extracted.textMuted;
        if (isColor(extracted.border)) visionBrand.border = extracted.border;
        if (["dark", "light", "neon"].includes(extracted.style)) visionBrand.style = extracted.style;

        // Auto-detect light theme from bg luminance — overrides LLM style classification
        if (visionBrand.bg) {
          const hex = visionBrand.bg.replace("#", "");
          if (/^[0-9a-fA-F]{6}$/.test(hex)) {
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (luminance > 0.5) {
              visionBrand.style = "light";
              console.log(`Auto-detected light theme from bg luminance: ${luminance.toFixed(2)}`);
            }
          }
        }

        imageDescriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];
        console.log("Vision brand + descriptions (combined call):", visionBrand);
      } catch (e) {
        console.warn("Combined brand+desc parse failed (non-fatal):", e);
      }
    } else if (combinedResult.status === "rejected") {
      console.warn("Combined brand+desc extraction failed (non-fatal):", combinedResult.reason);
    }

    // uiSchemasByIndex will be populated from the planner response (Task 0.2).

    // -----------------------------------------------------------------------
    // Phase 1 — Tiered Summarization
    //
    // For 3+ images (screenshots): single narrative pass
    // For 10+ images (video frames): full 3-tier pipeline
    //   Tier 1: Per-segment event extraction (groups of ~10 frames)
    //   Tier 2: Segment summaries
    //   Tier 3: Final cohesive narrative
    // -----------------------------------------------------------------------
    if (parsedImages.length > 2) {
      const isVideoFrames = parsedImages.length >= 10;

      try {
        if (isVideoFrames) {
          // Tier 1: Chunked event extraction — sample every ~10 frames
          const CHUNK_SIZE = 10;
          const chunks: Array<typeof parsedImages> = [];
          for (let i = 0; i < parsedImages.length; i += CHUNK_SIZE) {
            chunks.push(parsedImages.slice(i, i + CHUNK_SIZE));
          }

          const chunkSummaries: string[] = [];
          for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            try {
              const chunkResult = await withRetry(() => ai.models.generateContent({
                model: FAST_MODEL,
                contents: [{
                  role: "user",
                  parts: [
                    { text: `Analyze frames ${chunkIdx * CHUNK_SIZE}–${chunkIdx * CHUNK_SIZE + chunk.length - 1} of a product walkthrough video. Extract: what feature/screen is shown, what user actions occur, and what the key UI state changes are. Return a 2-sentence event summary.` },
                    ...chunk.map((p: { mimeType: string; data: string }) => ({ inlineData: p })),
                  ],
                }],
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: { summary: { type: Type.STRING } },
                    required: ["summary"],
                  },
                },
              }));
              const d = JSON.parse(chunkResult.text ?? "{}");
              if (d.summary) chunkSummaries.push(`[Frames ${chunkIdx * CHUNK_SIZE}+] ${d.summary}`);
            } catch { /* non-fatal */ }
          }

          // Tier 2+3: Synthesize chunk summaries into cohesive narrative
          if (chunkSummaries.length > 0) {
            try {
              const narrativeResult = await withRetry(() => ai.models.generateContent({
                model: FAST_MODEL,
                contents: [{
                  role: "user",
                  parts: [{ text: `Given these sequential segment summaries from a product walkthrough video, synthesize a cohesive 3-sentence narrative describing the complete user journey. Focus on the product's core value demonstrated.\n\nSegments:\n${chunkSummaries.join("\n")}` }],
                }],
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      narrative: { type: Type.STRING },
                      keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["narrative"],
                  },
                },
              }));
              const nd = JSON.parse(narrativeResult.text ?? "{}");
              if (nd.narrative) {
                console.log("Video tiered narrative:", nd.narrative);
                // Inject narrative into the first image description for the planner
                if (!imageDescriptions[0] || imageDescriptions[0].length < nd.narrative.length) {
                  imageDescriptions[0] = `[VIDEO WALKTHROUGH] ${nd.narrative}`;
                }
              }
            } catch { /* non-fatal */ }
          }
        } else {
          // Screenshot sequence: single narrative pass
          const FLOW_ANALYSIS_PROMPT = `You are analyzing a sequence of product screenshots to extract a user journey narrative.

For each screenshot in order, identify:
1. What screen/state it represents (1 sentence)
2. The KEY interactive element the user would click next
3. The transition action: what does the user DO to reach the next screen?

Then synthesize a 2-3 sentence cohesive narrative of what the user is accomplishing.

Return JSON with: screenSummaries (array of {screen, keyElement, action}), narrative (string)`;

          const flowResult = await withRetry(() => ai.models.generateContent({
            model: FAST_MODEL,
            contents: [{
              role: "user",
              parts: [
                { text: `Analyze this ${parsedImages.length}-screen product journey and extract the user flow narrative.` },
                ...parsedImages.map((p) => ({ inlineData: p })),
              ],
            }],
            config: {
              systemInstruction: FLOW_ANALYSIS_PROMPT,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  screenSummaries: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        screen: { type: Type.STRING },
                        keyElement: { type: Type.STRING },
                        action: { type: Type.STRING },
                      },
                      required: ["screen", "keyElement", "action"],
                    },
                  },
                  narrative: { type: Type.STRING },
                },
                required: ["screenSummaries", "narrative"],
              },
            },
          }));

          const flowData = JSON.parse(flowResult.text ?? "{}");
          if (Array.isArray(flowData.screenSummaries)) {
            flowData.screenSummaries.forEach((s: { screen: string; keyElement: string; action: string }, i: number) => {
              if (s.screen && (!imageDescriptions[i] || s.screen.length > imageDescriptions[i].length)) {
                imageDescriptions[i] = `${s.screen}. Key action: ${s.action}`;
              }
            });
            console.log("Screenshot flow narrative:", flowData.narrative);
          }
        }
      } catch (e) {
        console.warn("Tiered summarization failed (non-fatal):", e);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: Narrative planning (scenes + text-inferred brand)
  // -------------------------------------------------------------------------
  const hasImages = parsedImages.length > 0;

  // Merge user-provided descriptions with AI descriptions (user takes priority)
  const userDescs: string[] = Array.isArray(imageUserDescriptions) ? imageUserDescriptions : [];
  const finalDescriptions = parsedImages.map((_, i) =>
    userDescs[i]?.trim() || imageDescriptions[i] || `screenshot ${i + 1}`
  );

  // Extract visual energy fields from flow-analyze result (if present)
  const flowEnergy = (["high", "medium", "calm"].includes(screenFlow?.energyLevel) ? screenFlow.energyLevel : undefined) as "high" | "medium" | "calm" | undefined;
  const flowUiPace = (["fast", "slow"].includes(screenFlow?.uiPace) ? screenFlow.uiPace : undefined) as "fast" | "slow" | undefined;

  // Build screenFlow narrative block when the user has confirmed a flow
  let screenFlowBlock = "";
  if (screenFlow && Array.isArray(screenFlow.transitions) && screenFlow.transitions.length > 0) {
    const lines: string[] = ["USER JOURNEY FLOW (confirmed by user):"];
    const screens: { index: number; description: string }[] = screenFlow.screens ?? [];
    const transitions: { from: number; to: number; action: string; type: string; elementType?: string }[] = screenFlow.transitions;

    // Build the narrative chain
    for (let i = 0; i < parsedImages.length; i++) {
      const screen = screens.find((s) => s.index === i);
      const desc = screen?.description || finalDescriptions[i] || `screenshot ${i + 1}`;
      lines.push(`Screen ${i}: "${desc}"`);
      const t = transitions.find((tr) => tr.from === i);
      if (t) lines.push(`→ [${t.action || t.type}] (${t.type}) →`);
    }

    lines.push("");
    lines.push("SCENE ASSIGNMENT RULES:");
    for (let i = 0; i < parsedImages.length; i++) {
      const t = transitions.find((tr) => tr.from === i);
      const prefix = `- Scenes using Screen ${i} → set imageIndex: ${i}`;
      if (t?.type === "scroll") {
        lines.push(`${prefix}, prefer premium-scroll-demo for this screen`);
      } else if (t?.type === "search" || t?.type === "submit" || t?.elementType === "input") {
        lines.push(`${prefix}, the [${t.type}] transition has form/input interaction → prefer premium-chameleon-ui (typing overlay + form success state + toast)`);
      } else if (t) {
        lines.push(`${prefix}, the [${t.type}] transition → prefer premium-cursor-engine (click-zoom + double ripple + step badges) on this screen`);
      } else {
        lines.push(prefix);
      }
    }

    screenFlowBlock = "\n" + lines.join("\n") + "\n";
  }

  // Build image context block for the planner
  let imageContextBlock = "";
  if (hasImages) {
    const countStr = parsedImages.length === 1
      ? "1 product screenshot (index 0)"
      : `${parsedImages.length} product screenshots (indices 0–${parsedImages.length - 1})`;
    const descLines = finalDescriptions.map((d, i) => `  - Image ${i}: ${d}`).join("\n");
    const energyNote = flowEnergy === "high"
      ? `\nVISUAL ENERGY: HIGH (detected from recording). UI pace: ${flowUiPace ?? "fast"}. Add +40 to all spring stiffness values compared to table defaults. Prefer musicStyle: "energetic".`
      : flowEnergy === "calm"
        ? `\nVISUAL ENERGY: CALM (detected from recording). UI pace: ${flowUiPace ?? "slow"}. Use stiffness values as-is (do not boost). Prefer musicStyle: "calm".`
        : "";
    imageContextBlock = `\nATTACHED IMAGES: The user has uploaded ${countStr}.\n${descLines}\n${screenFlowBlock}${energyNote}\nFor showcase/cursor/device scenes, set imageIndex to the most relevant image index.\n`;
  }

  const textPart = {
    text: `Product/video prompt: "${prompt}"
${imageContextBlock}
Plan a complete 5–6 scene narrative video for this product, and extract brand tokens.`,
  };
  // Cap inline images to 4 for the narrative planner — the imageContextBlock text already
  // describes all screens; additional images beyond 4 add token cost with minimal planning value.
  const imageParts = parsedImages.slice(0, 4).map((p) => ({ inlineData: p }));

  try {
    const result = await withRetry(() => ai.models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [textPart, ...imageParts] }],
      config: {
        systemInstruction: NARRATIVE_PLANNING_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
                bg: { type: Type.STRING },
                surface: { type: Type.STRING },
                text: { type: Type.STRING },
                textMuted: { type: Type.STRING },
                border: { type: Type.STRING },
                font: { type: Type.STRING },
                accentName: { type: Type.STRING },
                style: { type: Type.STRING },
                name: { type: Type.STRING },
                url: { type: Type.STRING },
                cta: { type: Type.STRING },
                musicStyle: { type: Type.STRING },
              },
              required: ["primary", "secondary", "bg", "surface", "text", "textMuted", "border", "font", "accentName", "style"],
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ordered skill stack: [primarySkill, backgroundSkill?, polishSkill?]. See SKILL STACKING RULES." },
                  durationInFrames: { type: Type.NUMBER },
                  imageIndex: { type: Type.NUMBER },
                  imageIndices: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Multiple 0-based image indices for multi-view walkthrough scenes. When set, all referenced images become ATTACHED_IMAGES[0], [1], [2], etc." },
                  featureHeader: {
                    type: Type.OBJECT,
                    description: "Persistent feature context bar (Qanapi-style). Shows feature name + integration badge above UI during multi-feature walkthroughs.",
                    properties: {
                      label: { type: Type.STRING, description: "Feature name, e.g. 'KMS for CSE'" },
                      badge: { type: Type.STRING, description: "Integration badge, e.g. 'Google Workspace'" },
                      icon: { type: Type.STRING, description: "Optional emoji icon" },
                    },
                    required: ["label"],
                  },
                  voiceoverText: { type: Type.STRING },
                  transition: { type: Type.STRING },
                  emotionalIntent: { type: Type.STRING, description: "FRUSTRATION | RELIEF | CONFIDENCE | TRUST | URGENCY | EXCITEMENT" },
                  isAhaMoment: { type: Type.BOOLEAN, description: "true for the single scene delivering the core product transformation" },
                  stageDirection: { type: Type.STRING, description: "Cinematic stage direction for the animator: camera move, emotional arc shift, pacing" },
                  musicVolume: { type: Type.NUMBER, description: "Volume multiplier: 0.5 for pain/problem scenes, 1.0 normal, 1.3 for aha/relief, 1.5 for CTA" },
                  isWalkthroughScene: { type: Type.BOOLEAN, description: "true when this scene is part of a persistent-shell app walkthrough sequence" },
                  sectionLabel: { type: Type.STRING, description: "Short label shown as persistent section header above browser chrome" },
                  stockFootage: { type: Type.STRING, description: "Stock video URL for background compositing. Available clips: /videos/stock/office-desk.mp4 (portrait desk view), /videos/stock/team-meeting.mp4 (1080p team), /videos/stock/person-computer.mp4 (4K person at screen), /videos/stock/startup-office.mp4 (4K modern office). Only for intro/problem scenes of B2B SaaS products." },
                  macroZoom: {
                    type: Type.OBJECT,
                    description: "Bordio-style extreme close-up. Assign to 1-2 showcase scenes with complex UIs. zoomLevel 2-5, focusPoint normalized 0-1 targeting the key UI element.",
                    properties: {
                      zoomLevel: { type: Type.NUMBER, description: "Scale factor 2.0-5.0. 3.0 for sidebar, 3.5 for table row, 4.5 for single element" },
                      focusPoint: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER, description: "Normalized 0-1 horizontal center of zoom target" },
                          y: { type: Type.NUMBER, description: "Normalized 0-1 vertical center of zoom target" },
                        },
                        required: ["x", "y"],
                      },
                      zoomInFrame: { type: Type.NUMBER, description: "Frame when zoom starts (default 30 — let UI settle first)" },
                      holdFrames: { type: Type.NUMBER, description: "Frames at max zoom (default 80 — viewer reads focused area)" },
                    },
                    required: ["zoomLevel", "focusPoint"],
                  },
                  visualAnchor: {
                    type: Type.OBJECT,
                    properties: {
                      icon: { type: Type.STRING, description: "Emoji representing the anchor element (e.g. '⚠️', '📊', '💬')" },
                      colorFrom: { type: Type.STRING, description: "Hex color in broken/problem state (e.g. '#ef4444' red)" },
                      colorTo: { type: Type.STRING, description: "Hex color in resolved/success state (e.g. '#22c55e' green or BRAND.primary)" },
                      label: { type: Type.STRING, description: "Semantic label for prompt system (e.g. 'missed_deadline', 'cluttered_reports')" },
                    },
                    required: ["icon", "colorFrom", "colorTo", "label"],
                  },
                  exitAnchor: {
                    type: Type.OBJECT,
                    description: "Normalized 0-1 coordinate the camera zooms INTO as this scene exits. Set on Scene N when using zoomThrough transition into Scene N+1. Target the last-clicked UI element or most visually dominant element.",
                    properties: {
                      x: { type: Type.NUMBER, description: "Normalized 0-1 horizontal center" },
                      y: { type: Type.NUMBER, description: "Normalized 0-1 vertical center" },
                    },
                    required: ["x", "y"],
                  },
                  morphExport: {
                    type: Type.OBJECT,
                    description: "Cross-scene element morph: bounding box of element exiting THIS scene. Max 1 morph per video. The element animates from this rect to morphImport rect in the next scene.",
                    properties: {
                      id: { type: Type.STRING, description: "Unique morph element id (e.g. 'hero-icon')" },
                      rect: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER }, y: { type: Type.NUMBER },
                          w: { type: Type.NUMBER }, h: { type: Type.NUMBER },
                        },
                        required: ["x", "y", "w", "h"],
                      },
                    },
                    required: ["id", "rect"],
                  },
                  morphImport: {
                    type: Type.OBJECT,
                    description: "Cross-scene element morph: bounding box where the morphExport element ARRIVES in THIS scene. Must match morphExport.id from previous scene.",
                    properties: {
                      id: { type: Type.STRING, description: "Must match morphExport.id from previous scene" },
                      rect: {
                        type: Type.OBJECT,
                        properties: {
                          x: { type: Type.NUMBER }, y: { type: Type.NUMBER },
                          w: { type: Type.NUMBER }, h: { type: Type.NUMBER },
                        },
                        required: ["x", "y", "w", "h"],
                      },
                    },
                    required: ["id", "rect"],
                  },
                },
                required: ["id", "title", "prompt", "skills", "durationInFrames"],
              },
            },
            bgSkill: { type: Type.STRING },
            globalBg: { type: Type.STRING, description: "arcs | grid | dots" },
            globalVisualThread: { type: Type.STRING, description: "One sentence describing the single geometric/color/motion motif that persists across ALL scenes and evolves from broken→resolved. E.g. 'A glowing ring: fragmented arcs in problem scenes, full brand-color ring in solution scenes, exploding into the logo on CTA.'" },
            edges: {
              type: Type.ARRAY,
              description: "Flow graph edges describing transitions and state carry-over between adjacent scenes. Required for all walkthrough scene pairs.",
              items: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.NUMBER, description: "Source scene id" },
                  to: { type: Type.NUMBER, description: "Destination scene id" },
                  transition: { type: Type.STRING, description: "Transition type: fade | slide | scale | flash | none | cameraPan | zoomThrough" },
                  carryOver: {
                    type: Type.OBJECT,
                    properties: {
                      cursor: { type: Type.BOOLEAN, description: "Cursor position continues across the cut" },
                      camera: { type: Type.BOOLEAN, description: "Camera zoom/pan state maintained — no reset to 1.0" },
                      ui: { type: Type.BOOLEAN, description: "App shell (sidebar, topbar) stays mounted unchanged" },
                    },
                  },
                },
                required: ["from", "to", "transition"],
              },
            },
            uiSchemas: {
              type: Type.ARRAY,
              description: "For each uploaded screenshot (by index), extract the UI layout structure. Return one entry per image.",
              items: {
                type: Type.OBJECT,
                properties: {
                  imageIndex: { type: Type.NUMBER, description: "0-based index of the screenshot this schema describes" },
                  layout: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, description: "sidebar-main | topnav-main | full-width | split" },
                      sidebar: {
                        type: Type.OBJECT,
                        properties: {
                          appName: { type: Type.STRING },
                          items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, icon: { type: Type.STRING }, isActive: { type: Type.BOOLEAN } }, required: ["label", "icon", "isActive"] } },
                        },
                        required: ["appName", "items"],
                      },
                    },
                    required: ["type"],
                  },
                  mainContent: {
                    type: Type.OBJECT,
                    properties: {
                      sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, data: { type: Type.OBJECT } }, required: ["type", "data"] } },
                    },
                    required: ["sections"],
                  },
                  theme: {
                    type: Type.OBJECT,
                    properties: {
                      bgColor: { type: Type.STRING }, cardBgColor: { type: Type.STRING },
                      textColor: { type: Type.STRING }, accentColor: { type: Type.STRING },
                      borderRadius: { type: Type.NUMBER }, isDark: { type: Type.BOOLEAN },
                    },
                    required: ["bgColor", "textColor", "accentColor", "isDark"],
                  },
                },
                required: ["imageIndex", "layout", "mainContent", "theme"],
              },
            },
          },
          required: ["brand", "scenes"],
        },
      },
    }));

    const parsed = JSON.parse(result.text ?? "{}") as FullVideoPlanRaw & { brand: BrandTokensRaw; uiSchemas?: Array<{ imageIndex: number } & Record<string, unknown>> };

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("No scenes returned from planner");
    }

    // Task 0.2: Populate uiSchemasByIndex from the planner's inline uiSchemas
    if (Array.isArray(parsed.uiSchemas)) {
      parsed.uiSchemas.forEach((schema) => {
        if (typeof schema.imageIndex === "number") {
          uiSchemasByIndex[schema.imageIndex] = schema;
          console.log(`UI schema[${schema.imageIndex}] (from planner):`, (schema as any)?.layout?.type, "sections:", ((schema as any)?.mainContent?.sections ?? []).length);
        }
      });
    }

    // Merge: vision-extracted colors take priority over text-inferred
    const textBrand = parsed.brand ?? {};
    const brand = {
      primary: visionBrand.primary ?? textBrand.primary ?? "#6366f1",
      secondary: visionBrand.secondary ?? textBrand.secondary ?? "#a78bfa",
      bg: visionBrand.bg ?? textBrand.bg ?? "#0f0f1a",
      surface: visionBrand.surface ?? textBrand.surface ?? "rgba(255,255,255,0.06)",
      text: visionBrand.text ?? textBrand.text ?? "#ffffff",
      textMuted: visionBrand.textMuted ?? textBrand.textMuted ?? "rgba(255,255,255,0.5)",
      border: visionBrand.border ?? textBrand.border ?? "rgba(255,255,255,0.12)",
      font: textBrand.font ?? "Inter",
      accentName: textBrand.accentName ?? "indigo",
      style: (visionBrand.style ?? textBrand.style ?? "dark") as "dark" | "light" | "neon",
      name: textBrand.name,
      url: textBrand.url,
      cta: textBrand.cta,
      // Flow-analyze energy overrides text-inferred musicStyle (stronger signal)
      musicStyle: flowEnergy === "high"
        ? "energetic"
        : flowEnergy === "calm"
          ? "calm"
          : textBrand.musicStyle,
    };

    // Scene prompts are returned clean (no brand prefix) — the generation layer
    // injects brand as a structured block at call time.
    // Clamp imageIndex to valid range so bad LLM output doesn't cause errors downstream.
    const maxImageIdx = parsedImages.length - 1;
    const confirmedFlow = (screenFlow && Array.isArray(screenFlow.transitions) && screenFlow.transitions.length > 0)
      ? screenFlow as { screens: { index: number; description: string }[]; transitions: ScreenTransition[] }
      : null;

    const scenes = parsed.scenes.map((s) => {
      const imageIdx = (typeof s.imageIndex === "number" && s.imageIndex >= 0 && s.imageIndex <= maxImageIdx)
        ? s.imageIndex
        : undefined;

      // For chameleon-ui scenes with a confirmed screenFlow, derive an interactionScript
      // from the transition associated with this scene's primary image.
      // Normalize skills: support old LLM responses that returned a single `skill` string
      const resolvedSkills: string[] = Array.isArray(s.skills) && s.skills.length > 0
        ? s.skills
        : (s.skill ? [s.skill] : ["premium-saas-showcase"]);

      let interactionScript: InteractionEvent[] | undefined;
      if (resolvedSkills.includes("premium-chameleon-ui") && confirmedFlow && imageIdx !== undefined) {
        const transition = confirmedFlow.transitions.find((t) => t.from === imageIdx);
        if (transition) {
          const events = buildInteractionScriptFromTransition(transition, s.durationInFrames);
          if (events.length > 0) interactionScript = events;
        }
      }

      // Attach uiSchema to any scene with an imageIndex — the generator decides whether to use it
      const uiSchema = imageIdx !== undefined ? (uiSchemasByIndex[imageIdx] ?? undefined) : undefined;

      const safeDuration = Number.isFinite(s.durationInFrames) ? s.durationInFrames : 240;

      // Validate and clamp exitAnchor to [0,1] range
      let exitAnchor = s.exitAnchor as { x: number; y: number } | undefined;
      if (exitAnchor) {
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        exitAnchor = { x: clamp01(exitAnchor.x), y: clamp01(exitAnchor.y) };
      }

      // Validate and clamp macroZoom focusPoint to [0,1] range
      let macroZoom = s.macroZoom as { zoomLevel: number; focusPoint: { x: number; y: number }; zoomInFrame?: number; holdFrames?: number } | undefined;
      if (macroZoom?.focusPoint) {
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        macroZoom = {
          ...macroZoom,
          zoomLevel: Math.max(1.5, Math.min(5, macroZoom.zoomLevel)),
          focusPoint: { x: clamp01(macroZoom.focusPoint.x), y: clamp01(macroZoom.focusPoint.y) },
        };
      }

      const effectiveMusicVolume = (s.isAhaMoment ?? false) ? Math.max(s.musicVolume ?? 1.0, 1.6) : s.musicVolume;

      // Pass through imageIndices and featureHeader from planner output
      const imageIndices = Array.isArray(s.imageIndices) ? s.imageIndices.filter((idx: number) => typeof idx === "number" && idx >= 0 && idx <= maxImageIdx) : undefined;
      const featureHeader = (s.featureHeader && typeof (s.featureHeader as any).label === "string") ? s.featureHeader as { label: string; badge?: string; icon?: string } : undefined;

      return { ...s, skills: resolvedSkills, durationInFrames: safeDuration, imageIndex: imageIdx, imageIndices, featureHeader, interactionScript, uiSchema, emotionalIntent: s.emotionalIntent, isAhaMoment: s.isAhaMoment ?? false, stageDirection: s.stageDirection, visualAnchor: s.visualAnchor, musicVolume: effectiveMusicVolume, isWalkthroughScene: s.isWalkthroughScene, sectionLabel: s.sectionLabel, exitAnchor, macroZoom, stockFootage: s.stockFootage, morphExport: s.morphExport, morphImport: s.morphImport };
    });

    // ── Auto-insert section-title dividers ─────────────────────────────────
    // When a video has 4+ showcase/cursor/walkthrough scenes AND the LLM didn't
    // already include any section-title scenes, inject them programmatically
    // between groups of showcase scenes so the video has chapter breathing room.
    const SHOWCASE_SKILLS = new Set([
      "premium-saas-showcase", "premium-cursor-engine", "premium-chameleon-ui",
      "premium-app-walkthrough", "premium-reconstructed-ui",
    ]);
    const showcaseCount = scenes.filter(s => s.skills?.some(sk => SHOWCASE_SKILLS.has(sk))).length;
    const alreadyHasSectionTitles = scenes.some(s => s.skills?.includes("premium-section-title"));

    const finalScenes = (showcaseCount >= 4 && !alreadyHasSectionTitles)
      ? injectSectionTitles(scenes as EnrichedScene[])
      : scenes;

    console.log(
      "Narrative plan:",
      finalScenes.map((s) => `${s.title} (${(s.skills ?? []).join("+")}${s.imageIndex !== undefined ? `, img${s.imageIndex}` : ""})`).join(" → "),
    );
    console.log("Final brand:", brand);

    const bgSkill = brand.style === "light" ? "premium-light-arc-bg" : undefined;
    // Light-theme B2B demos use "grid" by default (WhatAStory style — clean static grid lines).
    // "arcs" is reserved for brands that explicitly request a more dynamic feel.
    const globalBg = parsed.globalBg ?? (brand.style === "light" ? "grid" : "arcs");

    const globalVisualThread = parsed.globalVisualThread ?? undefined;
    return new Response(JSON.stringify({ scenes: finalScenes, brand, bgSkill, globalBg, globalVisualThread, imageDescriptions: finalDescriptions, edges: parsed.edges ?? [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Planning error:", error);

    // Surface quota / rate-limit errors with actionable messaging
    const msg = error instanceof Error ? error.message : String(error);
    const isQuota = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
    const retryMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    const retrySec = retryMatch ? parseInt(retryMatch[1], 10) : null;

    const userMessage = isQuota
      ? `Google AI quota exceeded.${retrySec ? ` Retry in ${retrySec}s.` : ""} Add billing at aistudio.google.com or wait for your daily quota to reset.`
      : "Failed to generate video plan. Please try again.";

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: isQuota ? 429 : 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
