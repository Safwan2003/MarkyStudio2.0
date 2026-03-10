# premium-feature-bundle-cards

## When to Use
Use for "product overview" scenes showing 3 key integrations, capabilities, or feature bundles.
Pattern: Brand logo above → 3 white cards side by side connected by "+" symbols → tagline below.

Best for: integration products (Zapier-style), multi-feature platforms, API/platform products.

## What It Looks Like
- 3 floating white cards in a horizontal row
- Each card: integration/product icon top, bold title, accent-colored feature label
- "+" connector symbols between cards
- Brand logo/name centered above
- Tagline centered below

## Implementation

```tsx
const CARDS = [
  { icon: "🔐", title: "KMS Encryption", label: "AES-256 Standard", color: BRAND.primary },
  { icon: "📊", title: "Live Analytics", label: "Real-time Insights", color: BRAND.secondary },
  { icon: "🔗", title: "API Gateway", label: "REST + GraphQL", color: BRAND.primary },
];

const CARD_WIDTH = Math.round(width * 0.24);
const CARD_HEIGHT = Math.round(height * 0.38);
const CARD_GAP = Math.round(width * 0.04);
const ROW_WIDTH = CARD_WIDTH * 3 + CARD_GAP * 2;
const ROW_LEFT = (width - ROW_WIDTH) / 2;

const logoProgress = spring({ frame: frame - 10, fps, config: { damping: 200, stiffness: 120 } });
const taglineProgress = spring({ frame: frame - 60, fps, config: { damping: 200, stiffness: 100 } });

return (
  <AbsoluteFill style={{ background: BRAND.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

    {/* Brand logo above */}
    <div style={{
      marginBottom: 40,
      opacity: logoProgress,
      transform: `translateY(${(1 - logoProgress) * -20}px)`,
      fontSize: 32, fontWeight: 800, color: BRAND.text, fontFamily: BRAND.font || "Inter",
    }}>
      {BRAND.name || "YourBrand"}
    </div>

    {/* Card row */}
    <div style={{ display: "flex", alignItems: "center", gap: CARD_GAP }}>
      {CARDS.map((card, i) => {
        const cardProgress = spring({ frame: frame - (25 + i * 12), fps, config: { damping: 200, stiffness: 120 } });
        const connectorProgress = i < CARDS.length - 1
          ? spring({ frame: frame - (35 + i * 12), fps, config: { damping: 200, stiffness: 80 } })
          : 0;

        return (
          <React.Fragment key={i}>
            {/* Card */}
            <div style={{
              width: CARD_WIDTH, height: CARD_HEIGHT,
              background: "white",
              borderRadius: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "32px 24px",
              opacity: cardProgress,
              transform: `translateY(${(1 - cardProgress) * 24}px) scale(${0.92 + cardProgress * 0.08})`,
            }}>
              {/* Icon */}
              <div style={{ fontSize: 48, marginBottom: 20 }}>{card.icon}</div>
              {/* Title */}
              <div style={{
                fontSize: 22, fontWeight: 700, color: BRAND.text || "#0f172a",
                fontFamily: BRAND.font || "Inter", textAlign: "center", marginBottom: 10,
                letterSpacing: "-0.02em",
              }}>{card.title}</div>
              {/* Accent label */}
              <div style={{
                fontSize: 14, fontWeight: 600, color: card.color,
                fontFamily: BRAND.font || "Inter", textAlign: "center",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>{card.label}</div>
            </div>

            {/* "+" connector */}
            {i < CARDS.length - 1 && (
              <div style={{
                fontSize: 28, fontWeight: 300, color: BRAND.textMuted || "rgba(15,23,42,0.3)",
                opacity: connectorProgress, flexShrink: 0,
              }}>+</div>
            )}
          </React.Fragment>
        );
      })}
    </div>

    {/* Tagline below */}
    <div style={{
      marginTop: 40,
      opacity: taglineProgress,
      transform: `translateY(${(1 - taglineProgress) * 16}px)`,
      fontSize: 20, fontWeight: 400, color: BRAND.textMuted || "rgba(15,23,42,0.5)",
      fontFamily: BRAND.font || "Inter",
    }}>
      All your tools, unified in one platform.
    </div>
  </AbsoluteFill>
);
```

## Customization

- Replace emoji icons with SVG product logos when available
- For dark backgrounds: change card background to `BRAND.surface`, add glass border
- Connector can be `→` for sequential flow, `+` for additive/integration
- Card count: always 3 (odd number always looks better in this layout)
