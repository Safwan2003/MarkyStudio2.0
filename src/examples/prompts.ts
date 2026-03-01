export const examplePrompts = [
  {
    id: "kinetic-hook",
    headline: "Kinetic hook",
    icon: "Zap",
    prompt: `Create a kinetic text intro for a SaaS product called "Pulse Analytics".

Word-by-word stagger animation: each word punches in with a spring pop, slight rotation, then settles. Brand color: teal (#14b8a6). Show the tagline "Know your users. Grow faster." with a bold brand pill badge below it. End with a bright flash transition to white.`,
    color: "#14b8a6",
  },
  {
    id: "team-orbit",
    headline: "Team orbit",
    icon: "Users",
    prompt: `Create a team collaboration intro scene for a project management tool called "Orbit".

Show 5 floating avatar cards with names and role badges (Designer, Engineer, PM, Marketing, Sales) that drift across the screen with gentle physics. Brand color: purple (#8b5cf6). Show chaos transforming into order — avatars align into a clean grid formation at the end with the headline "Your team, in sync."`,
    color: "#8b5cf6",
  },
  {
    id: "dashboard-demo",
    headline: "Dashboard demo",
    icon: "Monitor",
    prompt: `Create a product showcase animation for a CRM dashboard called "Clarity CRM".

Show a browser chrome window with a realistic dashboard inside: sidebar nav, metric cards (MRR $48K, Churn 1.2%, NPS 72), and an animated line chart. Brand color: blue (#60a5fa). Animate a cursor moving to click on a contact row, expanding a detail panel. Use a subtle mesh gradient background.`,
    color: "#60a5fa",
  },
  {
    id: "social-proof",
    headline: "Social proof",
    icon: "Star",
    prompt: `Create a social proof scene for a SaaS tool called "Beacon".

Show 4 glass-morphism notification cards floating in from the sides, each with an avatar, name, and testimonial snippet: "Just hit $10K MRR thanks to Beacon!", "Replaced 3 tools with this one", "Our churn dropped 40% in 60 days", "Best onboarding I've ever seen". Brand color: amber (#f59e0b). Cards stack with spring physics and a subtle glow.`,
    color: "#f59e0b",
  },
  {
    id: "bold-cta",
    headline: "Bold CTA",
    icon: "Rocket",
    prompt: `Create a bold call-to-action closing scene for a SaaS product called "LaunchKit".

Kinetic headline animation: "Ship faster." slams in word by word. Below it, a pulsing green (#22c55e) CTA button labeled "Start free trial" with a ripple glow effect. Animated mesh gradient background in dark tones. End with the product URL fading in at the bottom.`,
    color: "#22c55e",
  },
] as const;

export type ExamplePrompt = (typeof examplePrompts)[number];
