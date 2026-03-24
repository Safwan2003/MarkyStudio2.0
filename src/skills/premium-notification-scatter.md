# Notification Card Scatter

> Pretaa-style scene — 4-6 white notification cards floating on dark background with staggered spring entrance. Perfect for CRM, workflow, and notification-heavy SaaS products.

## When to Use
- Showcase scenes for CRM/workflow/notification products
- Demonstrating notification feed, activity stream, or event tracking
- Trust/social-proof scenes showing real-time product activity
- Dark background scenes needing floating white card composition

## Components Available
- `NotificationCard` — pre-built in scope (white card with category, message, avatar, timestamp)
- `useVitality("float")` — gentle floating animation per card

## Layout Patterns

### Diagonal Cascade (Top-Left to Bottom-Right)
```jsx
const CARDS = [
  { category: "Pipeline", message: "New deal added: Acme Corp $50K", avatar: "🏢", categoryColor: "#6366f1", x: 120, y: 80 },
  { category: "Contact", message: "Sarah updated her email address", avatar: "👤", categoryColor: "#f59e0b", x: 380, y: 220 },
  { category: "Rating", message: "Customer satisfaction: 4.8/5.0", avatar: "⭐", categoryColor: "#22c55e", x: 640, y: 360 },
  { category: "Onboarding", message: "3 new users completed setup", avatar: "🚀", categoryColor: "#8b5cf6", x: 900, y: 500 },
  { category: "News", message: "Competitor raised Series B funding", avatar: "📰", categoryColor: "#ef4444", x: 1160, y: 640 },
];
```

### Centered Cluster with Radial Scatter
```jsx
// Cards emanate from center
const centerX = 960, centerY = 540;
const POSITIONS = [
  { x: centerX - 400, y: centerY - 250 },
  { x: centerX + 200, y: centerY - 280 },
  { x: centerX - 300, y: centerY + 50 },
  { x: centerX + 300, y: centerY + 20 },
  { x: centerX - 100, y: centerY + 280 },
  { x: centerX + 450, y: centerY + 250 },
];
```

## Usage Pattern

```jsx
const SceneComponent = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0f172a" }}>
      {/* Dark gradient overlay for depth */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.08), transparent 70%)",
      }} />

      {CARDS.map((card, i) => (
        <NotificationCard
          key={i}
          category={card.category}
          message={card.message}
          avatar={card.avatar}
          categoryColor={card.categoryColor}
          timestamp="2m ago"
          index={i}
          startFrame={20}
          brand={BRAND}
          x={card.x}
          y={card.y}
        />
      ))}
    </AbsoluteFill>
  );
};
```

## Composition Rules

1. Use 4-6 cards maximum — more gets cluttered
2. Cards stagger 8 frames apart (built into NotificationCard `index` prop)
3. Each card should have a DIFFERENT `categoryColor` — visual variety
4. Always include an avatar emoji or initial for each card
5. Use dark background (#0f172a or brand.bg for dark themes)
6. Add a subtle radial gradient glow at center for depth
7. Keep message text SHORT (under 40 characters) — cards are small
8. Category names should be UPPERCASE, short (1-2 words)

## Recommended Categories
CRM: Pipeline, Contact, Rating, Onboarding, News, Revenue, Support
Workflow: Task, Alert, Update, Review, Deploy, Merge, Release
Notification: Email, Mention, Comment, Invite, Share, Reminder
