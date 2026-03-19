# premium-app-walkthrough

## When to Use
Use when the video shows multiple screens from the SAME product (e.g., Settings → Integrations → Billing). The sidebar and topbar should persist while only the main content area transitions between screens.

## Pattern
Instead of generating each screen as a completely independent scene:
1. Generate ONE persistent app shell (AnimatedSidebar + AnimatedTopbar)
2. For each screen transition, only change the main content area
3. Animate the content transition as a slide (old exits, new enters)
4. Update the activeTabIndex on AnimatedTopbar for each screen switch

## Code Pattern
```tsx
const SCREENS = [
  { activeTab: 0, startFrame: 0 },
  { activeTab: 2, startFrame: 180 },
  { activeTab: 4, startFrame: 360 },
];

const currentScreenIdx = SCREENS.findIndex((s, i) =>
  frame >= s.startFrame && (i === SCREENS.length - 1 || frame < SCREENS[i+1].startFrame)
);
const currentScreen = SCREENS[Math.max(0, currentScreenIdx)];

const SIDEBAR_WIDTH = 240;
const TOPBAR_HEIGHT = 48;

// Persistent shell
<AnimatedSidebar appName="MyApp" items={sidebarItems} brand={BRAND} startFrame={0} />
<AnimatedTopbar
  tabs={topbarTabs}
  brand={BRAND}
  startFrame={10}
  activeTabIndex={currentScreen.activeTab}
/>

// Main content area — slides between screens
<div style={{ position: "absolute", left: SIDEBAR_WIDTH, top: TOPBAR_HEIGHT, right: 0, bottom: 0, overflow: "hidden" }}>
  {SCREENS.map((screen, i) => {
    const isActive = frame >= screen.startFrame &&
      (i === SCREENS.length - 1 || frame < SCREENS[i+1].startFrame);
    const slideProgress = spring({
      frame: frame - screen.startFrame, fps,
      config: SPRING_CONFIGS.entrance
    });
    return (
      <div key={i} style={{
        position: "absolute", inset: 0,
        transform: `translateX(${isActive ? (1 - slideProgress) * 100 : 100}%)`,
        opacity: isActive ? slideProgress : 0,
      }}>
        {/* Screen-specific content for screen i */}
      </div>
    );
  })}
</div>
```

## Rules
- Always keep AnimatedSidebar and AnimatedTopbar outside the sliding content area
- The active sidebar item should update as the cursor navigates between screens
- Pair this skill with premium-cursor-engine to show cursor clicking tabs/nav items
- Recommended for products with 2-3 screens in a single showcase scene
