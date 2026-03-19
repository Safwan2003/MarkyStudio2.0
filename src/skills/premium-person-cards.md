# premium-person-cards

## When to use
- Problem scenes showing disconnected teams or persona types
- "Meet the team" or "who it's for" scenes
- Social proof with named faces
- Customer journey milestone cards with headshots

## Components in scope (do NOT redeclare)
- `PersonCard` — real headshot photo card with role badge
- `STOCK_AVATARS` — array of 8 real headshot photo URLs (indices 0–7)

## PersonCard props
```tsx
PersonCard({
  photoIndex: number,     // 0–7, maps to STOCK_AVATARS[photoIndex]
  name?: string,          // Person name displayed below photo
  role?: string,          // Role shown in brand-color pill badge
  accentColor?: string,   // Override for badge + ring color (defaults to BRAND.primary)
  startFrame?: number,    // When this card springs in (stagger per card)
  brand?: object,         // BRAND object for font/color tokens
  size?: number,          // Avatar diameter in px (default 80)
})
```

## Pattern: Problem scene with 3 disconnected personas
```tsx
const PERSONAS = [
  { name: "Sarah", role: "Account Manager", photoIndex: 1 },
  { name: "James", role: "Sales Lead", photoIndex: 4 },
  { name: "Maria", role: "CS Team", photoIndex: 5 },
];

<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 80 }}>
  {PERSONAS.map((p, i) => (
    <PersonCard
      key={i}
      photoIndex={p.photoIndex}
      name={p.name}
      role={p.role}
      brand={BRAND}
      startFrame={useStagger(i, 20, 10)}
    />
  ))}
</AbsoluteFill>
```

## Pattern: "Frustrated user" — single large PersonCard with GarbledText
```tsx
<AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 32 }}>
  <PersonCard photoIndex={2} name="Alex Chen" role="Operations Lead" brand={BRAND} size={120} startFrame={15} />
  {/* Garbled/confusing data they're receiving */}
  <div style={{ fontSize: 36, fontFamily: "monospace", color: BRAND.primary }}>
    <GarbledText finalText="Q3 Revenue Report" resolveFrame={180} startFrame={30} scrambleStrength={0.9} style={{ fontSize: 36 }} />
  </div>
</AbsoluteFill>
```

## Pattern: Team orbit scene (5 personas around central product)
```tsx
// Use premium-team-orbit skill for the full orbit pattern
// Use PersonCard for individual avatar cards that pop in sequentially

const TEAM = [
  { photoIndex: 0, name: "CEO", role: "Exec Sponsor", angle: 0 },
  { photoIndex: 1, name: "Sales", role: "RevOps", angle: 72 },
  { photoIndex: 3, name: "CS", role: "Support", angle: 144 },
  { photoIndex: 5, name: "Product", role: "PM", angle: 216 },
  { photoIndex: 7, name: "Ops", role: "Admin", angle: 288 },
];

{TEAM.map((m, i) => {
  const rad = (m.angle * Math.PI) / 180;
  const orbitR = 320;
  const cx = 960 + orbitR * Math.cos(rad);
  const cy = 540 + orbitR * Math.sin(rad);
  return (
    <div key={i} style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%,-50%)" }}>
      <PersonCard photoIndex={m.photoIndex} name={m.name} role={m.role} brand={BRAND} startFrame={useStagger(i, 15, 8)} size={64} />
    </div>
  );
})}
```

## GarbledText companion
`GarbledText` renders scrambled characters that resolve to the final text at `resolveFrame`.
Use for problem scenes where data/communication is broken or confusing.

Props:
- `finalText` — the string to resolve to
- `resolveFrame` — frame when characters start resolving (left to right over 20f)
- `scrambleStrength` — 0–1 (0.8 = mostly garbled, 0.3 = mostly readable)
- `startFrame` — frame when garbling begins
- `style` — React CSSProperties applied to the span
