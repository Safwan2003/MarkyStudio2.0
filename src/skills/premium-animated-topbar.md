# premium-animated-topbar

## When to Use
Use alongside AnimatedSidebar when reconstructing a SaaS product UI. The topbar goes between the sidebar and the main content area.

## Component
```tsx
<AnimatedTopbar
  tabs={[
    { label: "Overview", isActive: false },
    { label: "Integrations", isActive: true },
    { label: "Settings", isActive: false },
  ]}
  breadcrumb="Projects / KMS Project"
  hasSearch={true}
  hasAvatar={true}
  brand={BRAND}
  startFrame={10}
  activeTabIndex={activeTabIndex}  // ← derive dynamically from frame
/>
```

## Tab Switching Animation — CRITICAL PATTERN

To animate the cursor clicking a tab and the underline sliding, derive `activeTabIndex` from the current frame:

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Define when each tab becomes active (frame when cursor click fires)
// cursor click fires at: step.time + 25 (TRAVEL frames)
const TAB_CLICK_FRAMES = [
  { tabIndex: 0, frame: 0 },         // initial tab (Overiew active from start)
  { tabIndex: 2, frame: 95 },        // cursor clicks "Settings" tab at f:95
];

// Derive active tab from current frame
const activeTabIndex = TAB_CLICK_FRAMES.reduce(
  (acc, { tabIndex, frame: switchFrame }) => frame >= switchFrame ? tabIndex : acc,
  TAB_CLICK_FRAMES[0].tabIndex
);

// Use in AnimatedTopbar:
<AnimatedTopbar
  tabs={[
    { label: "Overview", isActive: false },
    { label: "Analytics", isActive: false },
    { label: "Settings", isActive: false },
  ]}
  brand={BRAND}
  startFrame={10}
  activeTabIndex={activeTabIndex}  // ← spring-animates when this changes
/>
```

The underline will smoothly spring from the old position to the new one.

## Timing Rules
- Topbar appears at `startFrame={10}` (sidebar at 0, topbar at 10, content at 25)
- Tab click frame = `cursor_step.time + 25` (TRAVEL frames after spring starts)
- After tab click, show new main content area sliding in from right (translateX 100% → 0%)

## Props
- `tabs`: array of `{ label: string; isActive?: boolean }`
- `breadcrumb`: optional breadcrumb path string (e.g., "Projects / Settings")
- `hasSearch`: shows a search input on the right
- `hasAvatar`: shows a user avatar circle on the right
- `activeTabIndex`: **0-based index** of the currently active tab — drives the sliding underline
- `height`: default 48px — matches sidebar layout math: `SIDEBAR_W=240, TOPBAR_H=48`

