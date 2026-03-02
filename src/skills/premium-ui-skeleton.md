# Premium UI Skeleton Skill

Four pre-built UI component functions are already in scope — **do NOT re-declare them**.
Pass structured data props; all layout, animation, and styling is handled internally.

---

## 1. `KanbanBoard` — Task / Project Board

```tsx
export const MyAnimation = () => {
  // Define up to 3 columns with card titles
  const COLUMNS = [
    {
      label: "Backlog",
      accent: BRAND.textMuted,                      // dot color
      cards: ["Write Q3 report", "Fix mobile nav", "Update docs"],
    },
    {
      label: "In Progress",
      accent: BRAND.primary,
      cards: ["Redesign dashboard", "API rate-limit"],
    },
    {
      label: "Done",
      accent: "#22c55e",
      cards: ["Launch beta", "User interviews"],
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <KanbanBoard columns={COLUMNS} brand={BRAND} />
    </AbsoluteFill>
  );
};
```

**Props:**
- `columns: Array<{ label: string; accent?: string; cards: string[] }>` — max 3 columns
- `brand: BrandTokens` — pass `BRAND` directly

**Animation:** Columns stagger-slide in, then cards within each column cascade in.

---

## 2. `AnalyticsDashboard` — KPI Cards + Bar Chart

```tsx
export const MyAnimation = () => {
  const KPIS = [
    { label: "Monthly Revenue", value: "$48,200", delta: "+12.4%", up: true  },
    { label: "Active Users",    value: "3,847",   delta: "+8.1%",  up: true  },
    { label: "Churn Rate",      value: "1.9%",    delta: "-0.4%",  up: false },
    { label: "Avg Session",     value: "4m 32s",  delta: "+22s",   up: true  },
  ];

  const BARS = [
    { label: "Mon", value: 0.45 },  // value = 0–1 normalized height
    { label: "Tue", value: 0.62 },
    { label: "Wed", value: 0.54 },
    { label: "Thu", value: 0.78 },
    { label: "Fri", value: 0.66 },
    { label: "Sat", value: 0.88 },
    { label: "Sun", value: 0.72 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <AnalyticsDashboard
        title="Analytics Overview"
        kpis={KPIS}
        bars={BARS}
        brand={BRAND}
      />
    </AbsoluteFill>
  );
};
```

**Props:**
- `title?: string` — section heading
- `kpis: Array<{ label: string; value: string; delta: string; up: boolean }>` — max 4
- `bars: Array<{ label: string; value: number }>` — value 0–1; any number of bars
- `brand: BrandTokens`

**Animation:** KPI cards cascade in, bars fill upward.

---

## 3. `CodeEditorPanel` — Code Editor + Terminal

```tsx
export const MyAnimation = () => {
  const LINES = [
    { text: 'import { Client } from "@yourproduct/sdk";',  color: BRAND.textMuted },
    { text: '' },
    { text: 'const client = new Client({' },
    { text: '  apiKey: process.env.API_KEY,',              color: "#94a3b8" },
    { text: '  workspace: "acme-corp",',                   color: "#94a3b8" },
    { text: '});' },
    { text: '' },
    { text: 'const result = await client.run("analyze");', color: BRAND.primary },
  ];

  const TERMINAL = [
    { text: "$ npm install @yourproduct/sdk",  color: BRAND.textMuted },
    { text: "✓  Installed in 0.8s",            color: "#22c55e"       },
    { text: "$ node run.js",                   color: BRAND.textMuted },
    { text: "→  Result: 12 insights found",    color: BRAND.text      },
  ];

  return (
    <AbsoluteFill>
      <CodeEditorPanel
        lines={LINES}
        terminalLines={TERMINAL}
        filename="run.js"
        brand={BRAND}
      />
    </AbsoluteFill>
  );
};
```

**Props:**
- `lines: Array<{ text: string; color?: string }>` — code lines; default color = #e2e8f0
- `terminalLines?: Array<{ text: string; color?: string }>` — omit to hide terminal
- `filename?: string` — tab label (default: "main.tsx")
- `brand: BrandTokens`

**Animation:** Code lines appear one-by-one, then terminal output streams in.

---

## 4. `DataTable` — CRM / Pipeline / Data Grid

```tsx
export const MyAnimation = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <DataTable
        title="Deals Pipeline"
        columns={["Company", "Status", "ARR", "Last Activity", "Owner"]}
        rows={[
          { cells: ["Acme Corp",    "Active",  "$124K", "2h ago",  "Sarah K."], statusIndex: 1 },
          { cells: ["Globex Inc",   "Trial",   "$0",    "1d ago",  "Mike T."],  statusIndex: 1 },
          { cells: ["Initech",      "Active",  "$48K",  "5h ago",  "Sarah K."], statusIndex: 1 },
          { cells: ["Umbrella Co",  "Churned", "$0",    "14d ago", "James R."], statusIndex: 1 },
          { cells: ["Soylent Corp", "Active",  "$210K", "30m ago", "Lisa M."],  statusIndex: 1 },
        ]}
        statusColors={{ Active: "#22c55e", Trial: "#f59e0b", Churned: "#ef4444" }}
        brand={BRAND}
      />
    </AbsoluteFill>
  );
};
```

**Props:**
- `title?: string`
- `columns: string[]` — header labels
- `rows: Array<{ cells: string[]; statusIndex?: number }>` — `statusIndex` = which column renders as a pill badge
- `statusColors?: Record<string, string>` — maps status text → color hex
- `brand: BrandTokens`

**Animation:** Rows slide in from the left, staggered.

---

## Rules

| Rule | Detail |
|------|--------|
| **Do NOT import or re-declare** | All 4 components are already in scope |
| **Always pass `brand={BRAND}`** | Never hardcode colors inside the components |
| **Fill data with real copy** | Use actual product feature names, metrics, entity names from the prompt |
| **Pair with other skills** | These are mid-video showcase scenes — combine with premium-camera-zoom, premium-cursor-engine, or premium-saas-showcase for cinematic intros |
| **ATTACHED_IMAGES goes elsewhere** | Use premium-device-mockup or premium-scroll-demo for screenshot display, not these skeletons |
