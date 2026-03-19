---
title: Premium Interactive UI — Full App Reconstruction
impact: HIGH
impactDescription: builds a complete SaaS app shell from scratch (AppShell + SidebarNav + InputField + typing + dropdowns + panels) without needing screenshots — Bordio-quality scenes from zero assets
tags: appshell, sidebar, app reconstruction, full app, saas app, typing demo, task creation, interactive ui, no screenshot
---

## When to Use This Skill

Use `premium-interactive-ui` when:
- You want a **Bordio-quality interaction scene** but have **no screenshots** (or don't want to overlay them)
- You need **full layout control** — custom sidebar items, topbar, main content
- The scene shows **task creation, form filling, dashboard navigation, or any CRUD flow**

Use `premium-chameleon-ui` instead when the user uploaded screenshots and you want to overlay animations exactly on top of the real UI.

---

## New: Animated Component Suite (preferred for standard SaaS layouts)

For standard SaaS dashboards (sidebar + metric cards + charts + tables), use the **new animated components** instead of building everything from AppShell manually. These animate every element independently — sidebar items stagger in, cards count up, charts draw themselves.

### Use `ReconstructedAppShell` when `UI_SCHEMA` is available
```tsx
// UI_SCHEMA is injected from /api/ui-decompose when present
<ReconstructedAppShell uiSchema={UI_SCHEMA} brand={BRAND} />
```

### Build manually with individual animated components
```tsx
return (
  <AbsoluteFill style={{ background: BRAND.bg || "#f8f9fc" }}>
    {/* Sidebar slides in first */}
    <AnimatedSidebar
      appName="Acme CRM"
      items={[
        { label: "Dashboard", icon: "📊", isActive: true },
        { label: "Contacts", icon: "👥", isActive: false },
        { label: "Deals", icon: "💼", isActive: false },
        { label: "Reports", icon: "📈", isActive: false },
      ]}
      brand={BRAND}
      startFrame={0}
    />

    {/* Main content area */}
    <div style={{ position: "absolute", left: 240, top: 0, right: 0, bottom: 0, padding: 32 }}>
      {/* Metric cards count up */}
      <AnimatedMetricCards
        cards={[
          { label: "Total Revenue", value: "$284K", numericValue: 284000, trend: "up", trendValue: "+18%" },
          { label: "Active Deals", value: "147", numericValue: 147, trend: "up", trendValue: "+12%" },
          { label: "Win Rate", value: "68%", numericValue: 68, trend: "neutral", trendValue: "stable" },
        ]}
        brand={BRAND}
        startFrame={25}
        columns={3}
      />

      {/* Chart draws itself */}
      <div style={{ marginTop: 24 }}>
        <AnimatedChart
          type="line"
          title="Revenue trend"
          dataPoints={[42, 58, 51, 73, 69, 84, 91, 88]}
          color={BRAND.primary}
          brand={BRAND}
          startFrame={40}
        />
      </div>

      {/* Table rows stagger in */}
      <div style={{ marginTop: 24 }}>
        <AnimatedTable
          columns={[
            { label: "Company", width: "wide" },
            { label: "Stage", width: "medium" },
            { label: "Value", width: "narrow" },
          ]}
          rows={[
            { cells: ["Acme Corp", "Proposal", "$48K"], isHighlighted: true },
            { cells: ["Beta Inc", "Discovery", "$32K"] },
            { cells: ["Gamma Ltd", "Negotiation", "$67K"] },
            { cells: ["Delta Co", "Closed Won", "$91K"] },
          ]}
          brand={BRAND}
          startFrame={55}
        />
      </div>
    </div>
  </AbsoluteFill>
);
```

**Global stagger timing**: sidebar f:0–30, topbar f:10–25, metric cards f:25–50, chart f:40–65, table f:55–80. This creates a satisfying sequential reveal where each layer arrives as the previous one settles.

**Use `AnimatedForm` for modal/form scenes:**
```tsx
<AnimatedForm
  title="Create New Deal"
  fields={[
    { label: "Deal Name", type: "text", value: "Acme Enterprise", placeholder: "Deal name" },
    { label: "Stage", type: "dropdown", options: ["Discovery", "Proposal", "Negotiation", "Closed Won"] },
    { label: "Value", type: "text", placeholder: "$0" },
    { label: "Close Date", type: "date", placeholder: "Select date" },
  ]}
  submitLabel="Create Deal"
  brand={BRAND}
  startFrame={20}
/>
```

---

## The 3-Component Stack

### AppShell — Full SaaS Layout Container

```tsx
<AppShell
  brand={BRAND}
  zoom={1.08}
  sidebar={<SidebarNav appName="Acme" items={NAV_ITEMS} activeItem="Projects" brand={BRAND} />}
  topbar={
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
      <span style={{ fontSize: 15, color: BRAND.text, fontWeight: 600, fontFamily: "Inter" }}>My Projects</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: BRAND.primary }} />
      </div>
    </div>
  }
>
  {/* main content goes here */}
</AppShell>
```

Props:
- `sidebar` — pass `<SidebarNav>` component
- `topbar` — any JSX, renders in the 52px top bar
- `children` — the main content area (flex: 1, position: relative)
- `zoom` — optional scale for cinematic push-in (1.0–1.12)
- `brand` — BRAND object

### SidebarNav — Dark Glass Sidebar (220px)

```tsx
const NAV_ITEMS = [
  { label: "Dashboard", icon: "⬛", badge: undefined },
  { label: "Projects",  icon: "📁", badge: 12 },
  { label: "Tasks",     icon: "✓",  badge: 3 },
  { label: "Reports",   icon: "📊" },
  { label: "Settings",  icon: "⚙️" },
];

<SidebarNav
  appName="Acme"
  items={NAV_ITEMS}
  activeItem="Projects"   // must match a label exactly
  brand={BRAND}
/>
```

- Active item gets brand-color left border + faint brand-color background
- `badge` shows a brand-color pill with number
- `icon` shows as an emoji prefix

### InputField — Styled Input with Typing Cursor

```tsx
const taskTitle = useTyping("Design new landing page", TYPING_START, fps);

<InputField
  value={taskTitle.displayText}
  placeholder="Task title..."
  label="Task Name"
  focused={frame >= TYPING_START && frame < TYPING_START + 80}
  brand={BRAND}
  width="100%"
/>
```

- Pass `useTyping().displayText` as `value`
- `focused={true}` shows brand-color ring + blinking cursor
- `label` renders as uppercase muted label above the field

---

## Interaction Hooks Reference

```tsx
// Typing — reveals text char by char
const { displayText, showCursor } = useTyping(
  "Design new landing page",  // full text
  45,                          // startFrame
  fps,                         // from useVideoConfig()
  10                           // chars per second (optional, default 10)
);

// Popup — spring open/close for dropdowns, modals, panels
const { scale, opacity, visible } = usePopup(
  90,   // openFrame
  180,  // closeFrame (optional — stays open if omitted)
);
// Use: transform: `scale(${scale})`, opacity

// Accordion — smooth height expand
const { height, opacity } = useAccordion(
  60,   // triggerFrame
  240,  // expandedHeight in px
);
// Use: height on a div with overflow:hidden

// Drag — animate an element from A to B
const { x, y, isDragging, elevation } = useDragItem(
  { x: 200, y: 400 },  // from (absolute px)
  { x: 800, y: 200 },  // to (absolute px)
  120,                  // startFrame
);
// Use: position:absolute + left:x + top:y + boxShadow:elevation
```

---

## Pre-Built Panel Components

### TaskDetailPanel — Slide-Over Panel (38% width, from right)

```tsx
<TaskDetailPanel
  openFrame={90}
  title="Design new landing page"
  fields={[
    { label: "Status",    value: "In Progress" },
    { label: "Assignee",  value: "Sarah Chen" },
    { label: "Due Date",  value: "March 15, 2026" },
    { label: "Priority",  value: "High" },
  ]}
  brand={BRAND}
/>
```

- Slides in from right via `translateX` spring
- Glass backdrop blur (`blur(24px)`) over main content
- Fields render as label/value pairs

### ModalOverlay — Centered Glass Modal

```tsx
<ModalOverlay
  openFrame={60}
  closeFrame={180}     // optional
  title="Create New Task"
  brand={BRAND}
/>
```

- Dark backdrop + centered glass card springs in
- `title` renders as 22px bold header inside

### DropdownMenu — Spring-In Context Menu

```tsx
<DropdownMenu
  x={0.62}            // 0–1 normalized position
  y={0.28}
  w={0.18}
  items={["In Progress", "Done", "Blocked", "On Hold"]}
  openFrame={120}
  closeFrame={195}
  brand={BRAND}
/>
```

- First item gets brand-color highlight (selected state)
- Glass card with staggered items

### ChatBubble — Message with Avatar Dot

```tsx
<ChatBubble message="LGTM! Shipping today" author="Sarah" color="#10b981" appearFrame={150} brand={BRAND} />
<ChatBubble message="Added to sprint board" author="You"   color={BRAND.primary}  appearFrame={170} brand={BRAND} />
```

- Springs in at `appearFrame` with `translateY(10px)` → 0
- Author initial in colored circle
- Stagger multiple bubbles by 15–20 frame intervals

---

## Frame Budget Template

A 150-frame (5s at 30fps) task creation scene:

```
f:0   → AppShell fades in (opacity 0→1 over 20 frames)
f:20  → SidebarNav + topbar visible; cursor enters frame
f:30  → Cursor moves to "+ New Task" button (CURSOR_STEPS step 1)
f:45  → ChameleonHighlight fires on button; ModalOverlay opens (openFrame:45)
f:60  → Cursor moves to title InputField (CURSOR_STEPS step 2)
f:70  → useTyping starts (TYPING_START = 70), InputField shows focused ring
f:110 → Cursor moves to Status dropdown (CURSOR_STEPS step 3)
f:120 → DropdownMenu opens (openFrame:120); cursor hovers "In Progress"
f:145 → DropdownMenu closes (closeFrame:145); TaskDetailPanel opens (openFrame:145)
f:150 → Scene holds — panel visible with fields
```

---

## Full Example — Task Creation Flow

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const TYPING_START = 70;
const taskTitle = useTyping("Design new landing page", TYPING_START, fps);

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⬛" },
  { label: "Projects",  icon: "📁", badge: 12 },
  { label: "Tasks",     icon: "✓",  badge: 3 },
];

const CURSOR_STEPS = [
  { time: 30, x: 0.78, y: 0.12, action: "click",  label: "+ New Task" },
  { time: 60, x: 0.38, y: 0.32, action: "click",  label: "Title input" },
  { time: 110,x: 0.62, y: 0.28, action: "click",  label: "Status" },
];

// shell fade in
const shellOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

return (
  <div style={{ position: "absolute", inset: 0, opacity: shellOpacity }}>
    <AppShell
      brand={BRAND}
      zoom={interpolate(frame, [0, 120], [1, 1.08], { extrapolateRight: "clamp" })}
      sidebar={<SidebarNav appName="Acme" items={NAV_ITEMS} activeItem="Projects" brand={BRAND} />}
      topbar={
        <span style={{ fontSize: 15, color: BRAND.text, fontWeight: 600, fontFamily: "Inter" }}>
          My Projects
        </span>
      }
    >
      {/* Main content — task list mock */}
      <div style={{ padding: 24 }}>
        <InputField
          value={taskTitle.displayText}
          placeholder="Task title..."
          label="Task Name"
          focused={frame >= TYPING_START && frame < TYPING_START + 80}
          brand={BRAND}
          width={380}
        />
        <ChatBubble message="Added to sprint" author="Sarah" color="#10b981" appearFrame={140} brand={BRAND} />
      </div>

      {/* Panels */}
      <ModalOverlay openFrame={45} closeFrame={145} title="Create New Task" brand={BRAND} />
      <TaskDetailPanel
        openFrame={145}
        title="Design new landing page"
        fields={[
          { label: "Status",   value: "In Progress" },
          { label: "Assignee", value: "Sarah Chen" },
          { label: "Due",      value: "March 15" },
        ]}
        brand={BRAND}
      />
    </AppShell>

    {/* Dropdown — outside AppShell so z-index is clean */}
    <DropdownMenu
      x={0.58} y={0.28} w={0.18}
      items={["In Progress", "Done", "Blocked"]}
      openFrame={120} closeFrame={145}
      brand={BRAND}
    />

    {/* Cursor stays at z=100, outside everything */}
    {/* ... cursor engine code here ... */}
  </div>
);
```

---

## Combination Rules

- **With cursor engine**: Always render cursor div OUTSIDE `<AppShell>` at `zIndex:100`
- **With CinematicCamera**: Wrap `<AppShell>` inside `<CinematicCamera>` but keep cursor outside
- **Zoom**: Use `AppShell zoom` prop for static push-in; use `CinematicCamera` for tracking zoom
- **No screenshots needed**: This skill works with zero `ATTACHED_IMAGES` — all UI is constructed
- **Dark brand**: Set `brand.bg` to dark value; `brand.surface` to `rgba(255,255,255,0.06)`
- **Light brand**: Set `brand.bg` to `#f8fafc`; `brand.surface` to `white`; sidebar will still be dark glass (correct — SidebarNav always dark)
