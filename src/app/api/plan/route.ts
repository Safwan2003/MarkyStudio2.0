import type { InteractionEvent, ScreenTransition } from "@/types/generation";
import { GoogleGenAI, Type } from "@google/genai";

// ---------------------------------------------------------------------------
// Build a typed interactionScript from a single ScreenTransition
// ---------------------------------------------------------------------------

function buildInteractionScriptFromTransition(
  transition: ScreenTransition,
  durationInFrames: number,
): InteractionEvent[] {
  const REVEAL_END = 60; // first ~2s for scene reveal
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
          frame: REVEAL_END,
          action: "type",
          target: targetLabel,
          value: typeValue ?? "search query",
          elementType: "input" as const,
          box,
          style,
          sfx: "type" as const,
        },
        {
          frame: REVEAL_END + 60,
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
          frame: REVEAL_END + 15,
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
          frame: REVEAL_END + 15,
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

const BRAND_EXTRACTION_PROMPT = `You are a precision brand color extractor for a video generation system.

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

const NARRATIVE_PLANNING_PROMPT = `You are a video narrative planner for SaaS product explainer videos.

Given a product description, plan a complete 5–6 scene video narrative tailored to the product.

## SCENE ARC
Design scenes based on the product — vary the arc, do not always use the same 6 scenes.
Common patterns:
- Intro → Problem → Showcase → Features → Social Proof → CTA  (standard SaaS)
- Intro → Before/After → Product Demo → Data/Stats → CTA       (data-driven product)
- Intro → Problem → Solution Network → Device Demo → CTA       (platform/network product)
- Hook → Scroll Demo → Feature List → Social Proof → CTA       (website/landing page product)

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
- premium-device-mockup    — MacBook / browser / phone shell with ATTACHED_IMAGES screenshot
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
- premium-feature-grid     — 2×2 or 3×2 animated card grid with icon+title+description per cell; denser than feature-list; use for "here's what you get" or capabilities overview scene

Sound (add to any scene that benefits from audio atmosphere):
- premium-audio            — background music loop, per-frame SFX, volume fade automation

## SKILL SELECTION RULES
- Intro scene: prefer premium-kinetic-text or premium-saas-hook or premium-char-split (rotate between them across videos)
- Problem scene — choose based on WHAT the problem actually is:
  - Scattered team / communication chaos → premium-team-orbit
  - Technical failures / system slowness → premium-neon-dark
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
- Dark-themed products (tech, analytics, vertical SaaS): use premium-icon-arc-reveal for the hook/intro scene and premium-floating-path-nodes for the problem scene
- Showcase scenes with a "win" moment (deal closed, launch, goal hit): add premium-confetti-celebration — works over any product screenshot
- When user provides both an environment photo AND a product screenshot: use premium-real-photo-device for the social proof scene — strongest trust-builder available
- Feedback/VoC/NPS/survey products: use premium-feedback-storm for social proof — floating feedback cards with urgency pills around a person photo; if no person photo available use the no-person card-only variant
- Products with many integrations (Zapier, Salesforce, Zendesk, etc.): use premium-integration-wall for problem or showcase scene — scattered app logo cards on brand-colored bg
- Feature showcase / use-case scene (not UI demo): use premium-icon-bubble-row — 3 colored circle icons with labels; cleaner than feature-list for visual-forward brands
- premium-cta-scene simple variant now has URL typewriter animation — use for any CTA with a memorable URL to make it stick
- premium-social-proof now has an avatar-widget-orbit variant: central photo + orbiting mini data cards (donut, star-rating, quote, bar chart); prefer this for CRM/analytics products that show per-customer insights
- premium-audio can optionally appear in any single scene for background music (e.g. intro, CTA) — do not use it in more than one scene
- premium-gradient-hero for any scene that is purely a bold statement — replaces generic kinetic-text when the message is 1 sentence and no UI is shown
- premium-logo-wall: always include in social proof scene when product has recognizable enterprise customers; place before or after testimonial content
- premium-stat-counter: use for any scene anchored on a single data point (problem size, time saved, ROI); do not use premium-data-reveal when only 1 stat is needed
- premium-feature-grid: use instead of premium-feature-list when 4+ features need to be shown — the grid format reads faster and fills the frame better
- premium-interactive-ui: use for showcase/solution scene when NO screenshot is available and the scene needs a task creation, form filling, or CRUD interaction — builds the full SaaS app shell from scratch; pair with premium-cursor-engine for the cursor walkthrough
- Light B2B products: use premium-light-arc-bg as the background layer for all scenes (instead of dark gradient); it provides subtle arc texture that matches agency-quality light-theme videos
- Integration/multi-feature platform overview: use premium-feature-bundle-cards for a 3-card scene showing key product capabilities
- Standard SaaS dashboards (sidebar + metric cards + charts): use premium-reconstructed-ui for the showcase scene instead of premium-chameleon-ui — reconstructed UI animates every element independently and stays crisp at any zoom

## TRANSITION ASSIGNMENT (required for every scene)

For each scene, assign a transition value that describes how the viewer moves INTO that scene from the previous one:
- "fade" — smooth cross-dissolve; safe default for any scene pair
- "slide" — scene slides in from the right; use for forward-momentum sequences (features → CTA, intro → problem)
- "scale" — incoming scene scales up from center; cinematic for reveal moments (problem → solution)
- "flash" — white flash burst between scenes; use for high-energy transitions after cursor clicks or CTA moments
- "none" — hard cut; use for deliberate shock/contrast (before/after, old/new)

Rules:
- First scene: always "fade" (fade in from black)
- Problem → Solution/Showcase: "scale" or "slide"
- Showcase → Social Proof: "fade"
- Social Proof → CTA: "slide" or "flash"
- Any cursor/CTA scene finale: "flash" into next scene
- Do NOT use "fade" for more than 2 consecutive transitions — vary between fade, slide, scale, and flash

## SCENE PROMPT REQUIREMENTS
Each scene prompt must include (2–4 sentences):
1. Visual goal — what the viewer should see and feel, including dominant composition (e.g. "text left, device right" or "centered full-screen")
2. Exact content — headline text, subheadline, CTA text (use actual product name and features); for hero/gradient-hero scenes specify the exact headline word count
3. Animation note — what enters first, what moves, in what order; specify if headline should be gradient-colored
4. If it is a device/showcase scene: explicitly mention "display ATTACHED_IMAGES inside the device shell"
5. For light-themed brands (BRAND.style === "light"): always start the scene prompt with "Use LightArcBg as background. " — this ensures every scene gets the animated arc texture.

Each scene must also include a voiceoverText: a crisp 15–25 word spoken narration for that scene.
Write it as natural spoken English — the viewer hears this while watching the visuals.
Example: "Introducing [Product] — the fastest way your team moves from idea to shipped, without the chaos."

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
For dark themes, omit bgSkill (it defaults to no global background layer).`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScenePlanRaw {
  id: number;
  title: string;
  prompt: string;
  skill: string;
  durationInFrames: number;
  imageIndex?: number;
  voiceoverText?: string;
  transition?: string;
  interactionScript?: import("@/types/generation").InteractionEvent[];
}

interface FullVideoPlanRaw {
  scenes: ScenePlanRaw[];
  bgSkill?: string;
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
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { prompt, images, imageUserDescriptions, screenFlow } = await req.json();

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
  let uiSchemaResult: Record<string, unknown> | null = null;

  if (parsedImages.length > 0) {
    // Run brand extraction and (if >1 image) description extraction in parallel
    const brandPromise = withRetry(() => ai.models.generateContent({
      model: FAST_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract the brand design system from this product screenshot." },
            { inlineData: parsedImages[0] },
          ],
        },
      ],
      config: {
        systemInstruction: BRAND_EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primary: { type: Type.STRING },
            secondary: { type: Type.STRING },
            bg: { type: Type.STRING },
            surface: { type: Type.STRING },
            text: { type: Type.STRING },
            textMuted: { type: Type.STRING },
            border: { type: Type.STRING },
            style: { type: Type.STRING },
          },
          required: ["primary", "secondary", "bg", "surface", "text", "textMuted", "border", "style"],
        },
      },
    }));

    // For multiple images, ask the LLM to label each one so the planner can assign them
    const descPromise = parsedImages.length > 1
      ? withRetry(() => ai.models.generateContent({
        model: FAST_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Describe each of these ${parsedImages.length} product screenshots in one short sentence (what screen/feature it shows). Return JSON.`,
              },
              ...parsedImages.map((p) => ({ inlineData: p })),
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              descriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["descriptions"],
          },
        },
      }))
      : Promise.resolve(null);

    // UI schema decomposition — runs in parallel with brand extraction
    // Only for the first (most UI-rich) image; non-fatal if it fails
    const uiDecomposePromise = withRetry(() => ai.models.generateContent({
      model: FAST_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Decompose this product screenshot into a structural UI schema for animation." },
            { inlineData: parsedImages[0] },
          ],
        },
      ],
      config: {
        systemInstruction: `You are a UI architect for a video animation system.
Analyze this product screenshot and decompose it into a STRUCTURAL SCHEMA.
Extract: layout type (sidebar-main/topnav-main/full-width/split), sidebar items (label+emoji icon+isActive), topbar presence, main content sections in order (metric-cards/table/chart/form/card-grid/list), and theme colors.
Simplify: max 6 table rows, 8 chart datapoints normalized 0-100, 7 sidebar items, clean round numbers.
Use emoji for all icons. Return only valid JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layout: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
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
                sections: {
                  type: Type.ARRAY,
                  items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, data: { type: Type.OBJECT } }, required: ["type", "data"] },
                },
              },
              required: ["sections"],
            },
            theme: {
              type: Type.OBJECT,
              properties: {
                bgColor: { type: Type.STRING },
                cardBgColor: { type: Type.STRING },
                textColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                borderRadius: { type: Type.NUMBER },
                isDark: { type: Type.BOOLEAN },
              },
              required: ["bgColor", "textColor", "accentColor", "isDark"],
            },
          },
          required: ["layout", "mainContent", "theme"],
        },
      },
    }));

    const [brandResult, descResult, uiDecomposeSettled] = await Promise.allSettled([brandPromise, descPromise, uiDecomposePromise]);

    if (brandResult.status === "fulfilled") {
      try {
        const extracted = JSON.parse(brandResult.value.text ?? "{}");
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

        console.log("Vision brand extraction:", visionBrand);
      } catch (e) {
        console.warn("Vision brand parse failed (non-fatal):", e);
      }
    } else {
      console.warn("Vision brand extraction failed (non-fatal):", brandResult.reason);
    }

    if (descResult.status === "fulfilled" && descResult.value) {
      try {
        const parsed = JSON.parse(descResult.value.text ?? "{}");
        imageDescriptions = Array.isArray(parsed.descriptions) ? parsed.descriptions : [];
        console.log("Image descriptions:", imageDescriptions);
      } catch (e) {
        console.warn("Image description parse failed (non-fatal):", e);
      }
    }

    if (uiDecomposeSettled.status === "fulfilled") {
      try {
        uiSchemaResult = JSON.parse(uiDecomposeSettled.value.text ?? "{}") as Record<string, unknown>;
        console.log("UI schema extracted:", (uiSchemaResult as any)?.layout?.type, "sections:", ((uiSchemaResult as any)?.mainContent?.sections ?? []).length);
      } catch (e) {
        console.warn("UI schema parse failed (non-fatal):", e);
      }
    } else {
      console.warn("UI schema extraction failed (non-fatal):", uiDecomposeSettled.reason);
    }

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
    imageContextBlock = `\nATTACHED IMAGES: The user has uploaded ${countStr}.\n${descLines}\n${screenFlowBlock}\nFor showcase/cursor/device scenes, set imageIndex to the most relevant image index.\n`;
  }

  const textPart = {
    text: `Product/video prompt: "${prompt}"
${imageContextBlock}
Plan a complete 5–6 scene narrative video for this product, and extract brand tokens.`,
  };
  const imageParts = parsedImages.map((p) => ({ inlineData: p }));

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
                  skill: { type: Type.STRING },
                  durationInFrames: { type: Type.NUMBER },
                  imageIndex: { type: Type.NUMBER },
                  voiceoverText: { type: Type.STRING },
                  transition: { type: Type.STRING },
                },
                required: ["id", "title", "prompt", "skill", "durationInFrames"],
              },
            },
            bgSkill: { type: Type.STRING },
          },
          required: ["brand", "scenes"],
        },
      },
    }));

    const parsed = JSON.parse(result.text ?? "{}") as FullVideoPlanRaw & { brand: BrandTokensRaw };

    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("No scenes returned from planner");
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
      musicStyle: textBrand.musicStyle,
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
      let interactionScript: InteractionEvent[] | undefined;
      if (s.skill === "premium-chameleon-ui" && confirmedFlow && imageIdx !== undefined) {
        const transition = confirmedFlow.transitions.find((t) => t.from === imageIdx);
        if (transition) {
          const events = buildInteractionScriptFromTransition(transition, s.durationInFrames);
          if (events.length > 0) interactionScript = events;
        }
      }

      // Attach uiSchema to reconstructed-ui scenes (and optionally interactive-ui scenes)
      const uiSchema = (s.skill === "premium-reconstructed-ui" || s.skill === "premium-interactive-ui")
        ? uiSchemaResult ?? undefined
        : undefined;

      return { ...s, imageIndex: imageIdx, interactionScript, uiSchema };
    });

    console.log(
      "Narrative plan:",
      scenes.map((s) => `${s.title} (${s.skill}${s.imageIndex !== undefined ? `, img${s.imageIndex}` : ""})`).join(" → "),
    );
    console.log("Final brand:", brand);

    const bgSkill = brand.style === "light" ? "premium-light-arc-bg" : undefined;

    return new Response(JSON.stringify({ scenes, brand, bgSkill, imageDescriptions: finalDescriptions }), {
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
