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
