import { examples } from "@/examples/code";

// Import markdown files at build time
import threeDSkill from "./3d.md";
import chartsSkill from "./charts.md";
import messagingSkill from "./messaging.md";
import sequencingSkill from "./sequencing.md";
import socialMediaSkill from "./social-media.md";
import springPhysicsSkill from "./spring-physics.md";
import transitionsSkill from "./transitions.md";
import typographySkill from "./typography.md";
// Premium template-derived skills
import premiumSaasHookSkill from "./premium-saas-hook.md";
import premiumSaasShowcaseSkill from "./premium-saas-showcase.md";
import premiumCursorEngineSkill from "./premium-cursor-engine.md";
import premiumTeamOrbitSkill from "./premium-team-orbit.md";
import premiumCameraZoomSkill from "./premium-camera-zoom.md";
import premiumSocialProofSkill from "./premium-social-proof.md";
import premiumCtaSceneSkill from "./premium-cta-scene.md";
import premiumKineticTextSkill from "./premium-kinetic-text.md";
import premiumNeonDarkSkill from "./premium-neon-dark.md";
import premiumNetworkIntroSkill from "./premium-network-intro.md";
import premiumFeatureListSkill from "./premium-feature-list.md";
import premiumDeviceMockupSkill from "./premium-device-mockup.md";
import premiumScrollDemoSkill from "./premium-scroll-demo.md";
import premiumDataRevealSkill from "./premium-data-reveal.md";
import premiumSplitScreenSkill from "./premium-split-screen.md";
import premiumMultiDeviceSkill from "./premium-multi-device.md";
import premiumGlassmorphismSkill from "./premium-glassmorphism.md";
import premiumMatchCutSkill from "./premium-match-cut.md";
import premiumCharSplitSkill from "./premium-char-split.md";
import premiumAudioSkill from "./premium-audio.md";
import premiumChameleonUiSkill from "./premium-chameleon-ui.md";
import premiumDataFlowAbstractSkill from "./premium-data-flow-abstract.md";
import premium3dIsometricExplodeSkill from "./premium-3d-isometric-explode.md";
import premiumAmbientEnvironmentSkill from "./premium-ambient-environment.md";
import premiumShapeMorphTransitionSkill from "./premium-shape-morph-transition.md";
import premiumHandCursorSkill from "./premium-hand-cursor.md";
import premiumCalloutBubbleSkill from "./premium-callout-bubble.md";
import premiumResponsiveViewportSkill from "./premium-responsive-viewport.md";
import premiumDotMatrixBgSkill from "./premium-dot-matrix-bg.md";
import premiumInkLogoRevealSkill from "./premium-ink-logo-reveal.md";
import premiumMultiCornerGradientSkill from "./premium-multi-corner-gradient.md";
import premiumCustomerJourneySkill from "./premium-customer-journey.md";
import premiumIconConceptSceneSkill from "./premium-icon-concept-scene.md";
import premiumIconArcRevealSkill from "./premium-icon-arc-reveal.md";
import premiumFloatingPathNodesSkill from "./premium-floating-path-nodes.md";
import premiumConfettiCelebrationSkill from "./premium-confetti-celebration.md";
import premiumRealPhotoDeviceSkill from "./premium-real-photo-device.md";
import premiumIconBubbleRowSkill from "./premium-icon-bubble-row.md";
import premiumIntegrationWallSkill from "./premium-integration-wall.md";
import premiumFeedbackStormSkill from "./premium-feedback-storm.md";
import premiumGradientHeroSkill from "./premium-gradient-hero.md";
import premiumLogoWallSkill from "./premium-logo-wall.md";
import premiumStatCounterSkill from "./premium-stat-counter.md";
import premiumFeatureGridSkill from "./premium-feature-grid.md";
import premiumInteractiveUiSkill from "./premium-interactive-ui.md";
import premiumLightArcBgSkill from "./premium-light-arc-bg.md";
import premiumFeatureBundleCardsSkill from "./premium-feature-bundle-cards.md";
import premiumReconstructedUiSkill from "./premium-reconstructed-ui.md";
import premiumSectionTitleSkill from "./premium-section-title.md";
import premiumAnimatedTopbarSkill from "./premium-animated-topbar.md";
import premiumLightTexturedBgSkill from "./premium-light-textured-bg.md";
import premiumNotificationToastSkill from "./premium-notification-toast.md";
import premiumAppWalkthroughSkill from "./premium-app-walkthrough.md";
import premiumBeforeAfterSkill from "./premium-before-after.md";
import premiumMetricFlyoutSkill from "./premium-metric-flyout.md";
import premiumTestimonialCardSkill from "./premium-testimonial-card.md";
import premiumPhoneNotificationSkill from "./premium-phone-notification.md";
import premiumNarrativeOverlaySkill from "./premium-narrative-overlay.md";
import premiumTactileFeedbackSkill from "./premium-tactile-feedback.md";
import premiumLiveActionCompositeSkill from "./premium-live-action-composite.md";
import premiumBoldColorShowcaseSkill from "./premium-bold-color-showcase.md";
import premiumPersonCardsSkill from "./premium-person-cards.md";
import premiumChaosToUiResolveSkill from "./premium-chaos-to-ui-resolve.md";
import premium3dDeviceMockupSkill from "./premium-3d-device-mockup.md";
import premiumMacroCloseupSkill from "./premium-macro-closeup.md";
import premiumNarrationRevealSkill from "./premium-narration-reveal.md";
import premiumFloatingIconChaosSkill from "./premium-floating-icon-chaos.md";
import premiumNotificationScatterSkill from "./premium-notification-scatter.md";
import premiumInAppChatSkill from "./premium-in-app-chat.md";
import premiumMultiViewWalkthroughSkill from "./premium-multi-view-walkthrough.md";

// Guidance skills (markdown files with patterns/rules)
const GUIDANCE_SKILLS = [
  "charts",
  "typography",
  "social-media",
  "messaging",
  "3d",
  "transitions",
  "sequencing",
  "spring-physics",
  // Premium template-derived skills
  "premium-saas-hook",
  "premium-saas-showcase",
  "premium-cursor-engine",
  "premium-team-orbit",
  "premium-camera-zoom",
  "premium-social-proof",
  "premium-cta-scene",
  "premium-kinetic-text",
  "premium-neon-dark",
  "premium-network-intro",
  "premium-feature-list",
  "premium-device-mockup",
  "premium-scroll-demo",
  "premium-data-reveal",
  "premium-split-screen",
  "premium-multi-device",
  "premium-glassmorphism",
  "premium-match-cut",
  "premium-char-split",
  "premium-audio",
  "premium-chameleon-ui",
  "premium-data-flow-abstract",
  "premium-3d-isometric-explode",
  "premium-ambient-environment",
  "premium-shape-morph-transition",
  "premium-hand-cursor",
  "premium-callout-bubble",
  "premium-responsive-viewport",
  "premium-dot-matrix-bg",
  "premium-ink-logo-reveal",
  "premium-multi-corner-gradient",
  "premium-customer-journey",
  "premium-icon-concept-scene",
  "premium-icon-arc-reveal",
  "premium-floating-path-nodes",
  "premium-confetti-celebration",
  "premium-real-photo-device",
  "premium-icon-bubble-row",
  "premium-integration-wall",
  "premium-feedback-storm",
  "premium-gradient-hero",
  "premium-logo-wall",
  "premium-stat-counter",
  "premium-feature-grid",
  "premium-interactive-ui",
  "premium-light-arc-bg",
  "premium-feature-bundle-cards",
  "premium-reconstructed-ui",
  "premium-section-title",
  "premium-animated-topbar",
  "premium-light-textured-bg",
  "premium-notification-toast",
  "premium-app-walkthrough",
  "premium-before-after",
  "premium-metric-flyout",
  "premium-testimonial-card",
  "premium-phone-notification",
  "premium-narrative-overlay",
  "premium-tactile-feedback",
  "premium-live-action-composite",
  "premium-bold-color-showcase",
  "premium-person-cards",
  "premium-chaos-to-ui-resolve",
  "premium-3d-device-mockup",
  "premium-macro-closeup",
  "premium-narration-reveal",
  "premium-floating-icon-chaos",
  "premium-notification-scatter",
  "premium-in-app-chat",
  "premium-multi-view-walkthrough",
] as const;

// Example skills (complete working code references)
const EXAMPLE_SKILLS = [
  "example-histogram",
  "example-progress-bar",
  "example-text-rotation",
  "example-falling-spheres",
  "example-animated-shapes",
  "example-lottie",
  "example-gold-price-chart",
  "example-typewriter-highlight",
  "example-word-carousel",
] as const;

export const SKILL_NAMES = [...GUIDANCE_SKILLS, ...EXAMPLE_SKILLS] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

// Map guidance skill names to imported content
const guidanceSkillContent: Record<(typeof GUIDANCE_SKILLS)[number], string> = {
  charts: chartsSkill,
  typography: typographySkill,
  "social-media": socialMediaSkill,
  messaging: messagingSkill,
  "3d": threeDSkill,
  transitions: transitionsSkill,
  sequencing: sequencingSkill,
  "spring-physics": springPhysicsSkill,
  // Premium template-derived skills
  "premium-saas-hook": premiumSaasHookSkill,
  "premium-saas-showcase": premiumSaasShowcaseSkill,
  "premium-cursor-engine": premiumCursorEngineSkill,
  "premium-team-orbit": premiumTeamOrbitSkill,
  "premium-camera-zoom": premiumCameraZoomSkill,
  "premium-social-proof": premiumSocialProofSkill,
  "premium-cta-scene": premiumCtaSceneSkill,
  "premium-kinetic-text": premiumKineticTextSkill,
  "premium-neon-dark": premiumNeonDarkSkill,
  "premium-network-intro": premiumNetworkIntroSkill,
  "premium-feature-list": premiumFeatureListSkill,
  "premium-device-mockup": premiumDeviceMockupSkill,
  "premium-scroll-demo": premiumScrollDemoSkill,
  "premium-data-reveal": premiumDataRevealSkill,
  "premium-split-screen": premiumSplitScreenSkill,
  "premium-multi-device": premiumMultiDeviceSkill,
  "premium-glassmorphism": premiumGlassmorphismSkill,
  "premium-match-cut": premiumMatchCutSkill,
  "premium-char-split": premiumCharSplitSkill,
  "premium-audio": premiumAudioSkill,
  "premium-chameleon-ui": premiumChameleonUiSkill,
  "premium-data-flow-abstract": premiumDataFlowAbstractSkill,
  "premium-3d-isometric-explode": premium3dIsometricExplodeSkill,
  "premium-ambient-environment": premiumAmbientEnvironmentSkill,
  "premium-shape-morph-transition": premiumShapeMorphTransitionSkill,
  "premium-hand-cursor": premiumHandCursorSkill,
  "premium-callout-bubble": premiumCalloutBubbleSkill,
  "premium-responsive-viewport": premiumResponsiveViewportSkill,
  "premium-dot-matrix-bg": premiumDotMatrixBgSkill,
  "premium-ink-logo-reveal": premiumInkLogoRevealSkill,
  "premium-multi-corner-gradient": premiumMultiCornerGradientSkill,
  "premium-customer-journey": premiumCustomerJourneySkill,
  "premium-icon-concept-scene": premiumIconConceptSceneSkill,
  "premium-icon-arc-reveal": premiumIconArcRevealSkill,
  "premium-floating-path-nodes": premiumFloatingPathNodesSkill,
  "premium-confetti-celebration": premiumConfettiCelebrationSkill,
  "premium-real-photo-device": premiumRealPhotoDeviceSkill,
  "premium-icon-bubble-row": premiumIconBubbleRowSkill,
  "premium-integration-wall": premiumIntegrationWallSkill,
  "premium-feedback-storm": premiumFeedbackStormSkill,
  "premium-gradient-hero": premiumGradientHeroSkill,
  "premium-logo-wall": premiumLogoWallSkill,
  "premium-stat-counter": premiumStatCounterSkill,
  "premium-feature-grid": premiumFeatureGridSkill,
  "premium-interactive-ui": premiumInteractiveUiSkill,
  "premium-light-arc-bg": premiumLightArcBgSkill,
  "premium-feature-bundle-cards": premiumFeatureBundleCardsSkill,
  "premium-reconstructed-ui": premiumReconstructedUiSkill,
  "premium-section-title": premiumSectionTitleSkill,
  "premium-animated-topbar": premiumAnimatedTopbarSkill,
  "premium-light-textured-bg": premiumLightTexturedBgSkill,
  "premium-notification-toast": premiumNotificationToastSkill,
  "premium-app-walkthrough": premiumAppWalkthroughSkill,
  "premium-before-after": premiumBeforeAfterSkill,
  "premium-metric-flyout": premiumMetricFlyoutSkill,
  "premium-testimonial-card": premiumTestimonialCardSkill,
  "premium-phone-notification": premiumPhoneNotificationSkill,
  "premium-narrative-overlay": premiumNarrativeOverlaySkill,
  "premium-tactile-feedback": premiumTactileFeedbackSkill,
  "premium-live-action-composite": premiumLiveActionCompositeSkill,
  "premium-bold-color-showcase": premiumBoldColorShowcaseSkill,
  "premium-person-cards": premiumPersonCardsSkill,
  "premium-chaos-to-ui-resolve": premiumChaosToUiResolveSkill,
  "premium-3d-device-mockup": premium3dDeviceMockupSkill,
  "premium-macro-closeup": premiumMacroCloseupSkill,
  "premium-narration-reveal": premiumNarrationRevealSkill,
  "premium-floating-icon-chaos": premiumFloatingIconChaosSkill,
  "premium-notification-scatter": premiumNotificationScatterSkill,
  "premium-in-app-chat": premiumInAppChatSkill,
  "premium-multi-view-walkthrough": premiumMultiViewWalkthroughSkill,
};

// Map example skill names to example IDs
const exampleIdMap: Record<(typeof EXAMPLE_SKILLS)[number], string> = {
  "example-histogram": "histogram",
  "example-progress-bar": "progress-bar",
  "example-text-rotation": "text-rotation",
  "example-falling-spheres": "falling-spheres",
  "example-animated-shapes": "animated-shapes",
  "example-lottie": "lottie-animation",
  "example-gold-price-chart": "gold-price-chart",
  "example-typewriter-highlight": "typewriter-highlight",
  "example-word-carousel": "word-carousel",
};

export function getSkillContent(skillName: SkillName): string {
  // Handle example skills - return the code directly
  if (skillName.startsWith("example-")) {
    const exampleId =
      exampleIdMap[skillName as (typeof EXAMPLE_SKILLS)[number]];
    const example = examples.find((e) => e.id === exampleId);
    if (example) {
      return `## Example: ${example.name}\n${example.description}\n\n\`\`\`tsx\n${example.code}\n\`\`\``;
    }
    return "";
  }

  // Handle guidance skills - return imported markdown content
  return (
    guidanceSkillContent[skillName as (typeof GUIDANCE_SKILLS)[number]] || ""
  );
}

export function getCombinedSkillContent(skills: SkillName[]): string {
  if (skills.length === 0) {
    return "";
  }

  const contents = skills
    .map((skill) => getSkillContent(skill))
    .filter((content) => content.length > 0);

  return contents.join("\n\n---\n\n");
}

export const SKILL_DETECTION_PROMPT = `Classify this motion graphics prompt into ALL applicable categories.
A prompt can match multiple categories. Only include categories that are clearly relevant.

Guidance categories (patterns and rules):
- charts: data visualizations, graphs, histograms, bar charts, pie charts, progress bars, statistics, metrics
- typography: kinetic text, typewriter effects, text animations, word carousels, animated titles, text-heavy content
- social-media: Instagram stories, TikTok content, YouTube shorts, social media posts, reels, vertical video
- messaging: chat interfaces, WhatsApp conversations, iMessage, chat bubbles, text messages, DMs, messenger
- 3d: 3D objects, ThreeJS, spatial animations, rotating cubes, 3D scenes
- transitions: scene changes, fades between clips, slide transitions, wipes, multiple scenes
- sequencing: multiple elements appearing at different times, staggered animations, choreographed entrances
- spring-physics: bouncy animations, organic motion, elastic effects, overshoot animations

Premium SaaS / Agency-quality template skills:
- premium-saas-hook: SaaS product intro, brand reveal, floating brand/app icons orbiting a hero device, laptop mockup with screen inset, chat bubble overlays, dark hero background
- premium-saas-showcase: product dashboard demo, browser window with OS chrome (traffic lights + URL bar), slide-up entrance, kanban board, stat cards, SaaS dashboard, product screenshot showcase
- premium-cursor-engine: cursor walkthrough, clicking UI elements, mouse pointer animation, interaction demo, "watch me use the app", click ripple, cursor spring movement between targets
- premium-team-orbit: floating team avatars with role badges, "meet the team", collaboration scene, problem scene with chaotic team, orbiting people/personas around a product
- premium-camera-zoom: hero zoom into laptop/device screen, cinematic push-in reveal, slow continuous camera pan, device mockup to fullscreen transition, "zoom into product"
- premium-social-proof: trust scene, glass notification cards, integration logos orbiting, "task completed" badges, collaborator count, social proof testimonials, stacked avatars
- premium-cta-scene: call-to-action finale, dark background with rotating mesh orbs, word-by-word kinetic headline, pulsing gradient CTA button with shine sweep, logo pop animation
- premium-kinetic-text: energetic word-by-word spring entrance, brand pill with glassmorphism and flash sweep, white flash transition, rotating starburst accent, high-energy text reveal
- premium-neon-dark: dark/neon theme, tech/analytics product, sonar radar rings, SVG glow filter, neon accent color, shape-masked image reveal (heart/circle/custom), heartbeat pulse
- premium-network-intro: network graph, avatar nodes connected by polka-dot SVG paths, B2B ecosystem, "join the network", ripple ring on avatar pop, elastic spring node entrance
- premium-feature-list: feature list, product features, bullet points, 3-4 items, benefit list, key features, feature showcase, "what you get", "why choose us", staggered feature reveal
- premium-device-mockup: device mockup, MacBook mockup, laptop with screenshot, browser window with product, phone mockup, product screenshot inside device shell, ATTACHED_IMAGES on screen, device frame
- premium-3d-device-mockup: true 3D device mockup, 3D MacBook, three.js device, 3D phone render, cinematic 3D orbit, physically accurate device, 3D product render, orbital camera device, enterprise launch scene
- premium-scroll-demo: scroll simulation, scrolling product demo, website walkthrough, scroll through page, animated scroll, browser scroll, "living product" demo, scroll reveal
- premium-data-reveal: animated stats, counting numbers, animated metrics, KPI reveal, number counter, stat cards, progress ring, bar fill animation, percentage counter, data credibility
- premium-split-screen: before/after, comparison, side-by-side, problem vs solution, split screen, chaos vs clean, old way vs new way, contrast scene, divider reveal
- premium-multi-device: multi-device, cross-platform, laptop and phone, responsive showcase, all devices, MacBook iPhone composite, device family, works everywhere
- premium-glassmorphism: glass card, frosted glass, glassmorphism, backdrop blur, glowing orbs, blend mode, parallax depth, dark mode premium, mix-blend-mode, depth layers, parallax camera
- premium-match-cut: match cut, zoom transition, cinematic transition, zoom into button, whip cut, motion blur, fast pan, scene transition, color match cut, cinematic cut
- premium-char-split: character animation, letter by letter, char split, kinetic typography, text reveal, push-up text, rotating letters, scramble text, word stagger, headline animation, type on effect
- premium-audio: background music, sound effects, SFX, audio track, looping music, ambient sound, volume fade, audio automation, soundtrack, sound design
- premium-chameleon-ui: chameleon overlay, typing animation, input overlay, dropdown animation, cinematic zoom, glass panel slide, interactive overlay, realistic product demo, cursor typing, fake interactivity, UI takeover, element overlay
- premium-data-flow-abstract: data flow, api integration, network graph, nodes connected, glowing orbs, data packets, integration diagram, pipeline visualization, conceptual metaphor, abstract concept, data sync, ai processing, salesforce integration, API connection, node network, hub and spoke
- premium-3d-isometric-explode: isometric, 3d layers, explode view, screenshot layers, 3d depth, css 3d, perspective reveal, architecture reveal, layer separation, panels floating, isometric explode, 3d screenshot, floating panels, depth reveal
- premium-ambient-environment: breathing background, ambient particles, floating particles, mesh gradient, orbiting orbs, particle system, aurora background, bokeh background, living background, atmospheric depth, ambient glow, dynamic background
- premium-shape-morph-transition: color flood fill, shape morph, clip path expand, button click transition, scene transition, color wipe, explosive transition, circle expand, morph cut, fluid transition, shape expand, color reveal
- premium-hand-cursor: cartoon hand pointer, pointing finger cursor, explainer video cursor, hand cursor, flat hand icon, click hand animation, friendly cursor, tutorial cursor
- premium-callout-bubble: floating comment card, annotation bubble, collaboration popup, comment overlay, feedback card, review annotation, mention card, typing annotation, slide-in panel, comments panel
- premium-responsive-viewport: responsive demo, device switcher, viewport toggle, mobile preview, tablet view, responsive layout, browser toolbar, device icons, responsive product demo, viewport width
- premium-dot-matrix-bg: dot grid background, halftone texture, dot matrix, light background, clean background, polka dot texture, minimal texture, floating accent dots, dash marks, light theme background, airy background
- premium-ink-logo-reveal: logo reveal, ink blob reveal, brand reveal, paint blob, logo morph, blob to logo, ink drop, brand emergence, cinematic logo, wordmark reveal, brand intro, logo animation
- premium-multi-corner-gradient: pastel background, corner blobs, light gradient, multi-corner gradient, soft background, airy background, light bg with color corners, near-white background, gentle gradient, pastel corners, Pretaa background
- premium-customer-journey: customer journey, lifecycle, timeline, milestones, stages, pipeline stages, customer success, deal stages, onboarding stages, journey map, traveling dot, milestone cards, stage progression, CRM journey
- premium-icon-concept-scene: icon concept, abstract concept, metaphor scene, concept visual, icon with glow, radial glow icon, badge overlay, dotted path arrowhead, cost visualization, time waste visual, conceptual scene, single icon hero
- premium-icon-arc-reveal: icon arc, SVG arc draw, circular arc, brand icon hook, dark intro, neon icon, arc animation, strokeDashoffset circle, concentric rings, icon reveal, heartbeat icon, dark hook, cinematic intro, shape mask reveal, neon glow
- premium-floating-path-nodes: floating nodes, outline circles, dark nodes, ghost circles, nebula background, aurora background, dotted path, traveling dot, scattered circles, dark problem scene, data silos, disconnected systems, node graph dark
- premium-confetti-celebration: confetti, celebration, falling particles, product screenshot party, launch scene, deal closed, success scene, colorful particles, confetti rain, festive, achievement
- premium-real-photo-device: real photo background, product in context, device in environment, tablet mockup photo, phone mockup realistic, office photo device, social proof product, real world product, dealership tablet, environment mockup
- premium-icon-bubble-row: icon bubbles, colored circles, category icons, tech stack, feature categories, use cases, large circles with icons, bubble row, arc accent, spring pop circles, customer experience categories, AI NLP circles
- premium-integration-wall: integration cards, app logos, data sources, scattered cards, app wall, integration showcase, zapier zendesk cards, tool cards, scattered app icons, integration explosion, data sources wall, colored background cards
- premium-feedback-storm: feedback cards, customer voice, verbatim feedback, person with cards, feedback floating, urgency pills, priority tags, social proof floating, customer feedback storm, testimonial cards around person
- premium-gradient-hero: gradient text headline, full-screen text, chapter card, bold statement, single message, brand gradient words, gradient typography, no chrome, title card, big text reveal, text-only scene
- premium-logo-wall: trusted by, company logos, logo grid, partner logos, customer logos, social proof logos, brand wall, logo marquee, scrolling logos, who uses it
- premium-stat-counter: single stat, big number, percentage counter, metric punch, 94%, 3x, count-up number, dramatic number, full-screen stat, data proof, one big fact
- premium-feature-grid: feature grid, 2x2 grid, product features grid, feature cards, capabilities grid, what you get, 4 features, 6 features, card grid layout
- premium-interactive-ui: full app shell, AppShell, SidebarNav, task creation demo, saas walkthrough, app reconstruction, no screenshot needed, full layout control, sidebar navigation, form filling, CRUD demo, task panel, modal creation, Bordio style
- premium-light-arc-bg: light theme, arc background, white background, arc texture, near-white background, light B2B background, concentric arcs, subtle arc lines, light themed video
- premium-feature-bundle-cards: feature bundle, integration cards, 3 cards, product overview with cards, three feature cards, capability cards, bundle overview, platform features, integration overview, plus connector cards
- premium-reconstructed-ui: reconstructed ui, animated dashboard, vector reconstruction, animate independently, sidebar animation, metric cards animation, animated table, animated chart, animated form, vector dashboard, fully animated UI
- premium-section-title: chapter title, section break, feature name card, divider scene, breathing room, title card between demos, section header
- premium-animated-topbar: top navigation, tab bar, breadcrumb, horizontal tabs, tab switching, navigation bar, topbar animation, animated tabs
- premium-light-textured-bg: light background, textured background, arc background, grid background, dot background, near-white, clean background, SaaS background, light theme bg
- premium-notification-toast: notification, toast, success message, action result, floating notification, slide-in alert, ticket resolved, save confirmation, feedback popup
- premium-app-walkthrough: multi-screen, app navigation, screen transition, persistent sidebar, tab switching, walkthrough, product tour, multiple pages, same app different screens, persistent shell
- premium-before-after: before after, old way new way, split reveal, wipe reveal, painful process vs product, manual vs automated, spreadsheet vs product, contrast reveal, transformation, before after comparison, divider wipe, problem solution bridge, old tool vs new tool
- premium-metric-flyout: multiple stats, satellite stats, hero metric plus supporting data, roi stats, data constellation, proof of impact, supporting statistics, 3 stats 4 stats, metric with context, stat cluster, data flyout, roi proof scene
- premium-testimonial-card: testimonial, customer quote, single quote, word by word quote, pullquote, customer voice, editorial quote, review card, quote reveal, attribution, stars and quote, social proof quote
- premium-phone-notification: push notification, ios notification, mobile notification, phone alert, real-time alert, new lead notification, mobile saas notification, frosted glass notification, app notification, notification overlay, crm alert, hr notification, helpdesk notification
- premium-narrative-overlay: on-screen text, story text, narrative headline, bold copy overlay, section label, sub-line, kinetic narrative, outcome headline, emotional text, word-by-word reveal, story layer, text-driven narrative, visual storytelling, problem statement text, relief headline
- premium-bold-color-showcase: bold color background, saturated bg, AHA moment reveal, confidence scene, dramatic background, brand-color fill, white card on color bg, punch scene, transformation reveal
- premium-person-cards: team personas, avatar cards, person with role, headshot photo cards, named faces, disconnected team, frustrated user, persona showcase, team orbit cards, social proof photos, person with badge
- premium-macro-closeup: macro zoom, extreme close-up, deep dive UI, zoom into sidebar, zoom into table row, selective focus, depth of field, DOF blur, Bordio-style zoom, UI section zoom, magnify UI element, macro camera, close-up detail, zoom 3x, focus isolation, blurred background UI
- premium-narration-reveal: word by word text, narration sync, voiceover text reveal, progressive text coloring, gray to active, word timing, summary text, conclusion text, key takeaway, Qanapi-style, narration highlight, word illuminate, spoken word sync
- premium-floating-icon-chaos: floating icons, app icons, communication chaos, tool overload, WhatsApp Slack Gmail icons floating, chat bubbles, Fronter-style intro, icon orbit, communication fragmentation, scattered app logos, before state, chaos intro
- premium-notification-scatter: notification cards, floating cards dark bg, CRM notifications, activity feed, card scatter, Pretaa-style, notification feed, event cards, white cards on dark, workflow notifications, alert cards
- premium-in-app-chat: chat panel, messaging thread, team chat, collaboration chat, typing indicator, message thread, Bordio-style chat, customer support chat, comment thread, in-app messaging, chat overlay
- premium-multi-view-walkthrough: multi-view, product tour, multiple screenshots, tab switching, view switching, table to kanban, calendar view, multi-screenshot, product views, Bordio-style walkthrough, view tabs, dashboard tour

Code examples (complete working references):
- example-histogram: animated bar chart with spring animations and @remotion/shapes
- example-progress-bar: loading bar animation from 0 to 100%
- example-text-rotation: rotating words with fade/blur transitions
- example-falling-spheres: 3D bouncing spheres with ThreeJS and physics simulation
- example-animated-shapes: bouncing/rotating SVG shapes (circle, triangle, rect, star)
- example-lottie: loading and displaying Lottie animations from URL
- example-gold-price-chart: bar chart with Y-axis labels, monthly data, staggered animations
- example-typewriter-highlight: typewriter effect with cursor blink, pause, and word highlight
- example-word-carousel: rotating words with crossfade and blur transitions

Return an array of matching category names. Return an empty array if none apply.`;
