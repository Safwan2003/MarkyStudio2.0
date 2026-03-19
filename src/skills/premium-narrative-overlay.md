---
title: Premium Narrative Text Overlay
impact: HIGH
impactDescription: on-screen story text layer — bold headline + section label + sub-line that tells the narrative visually, independent of voiceover; the WhatAStory signature pattern applied to every scene
tags: narrative, text, headline, overlay, story, emotional, on-screen-copy, section-label, sub-line, every-scene
---

## Narrative Overlay Pattern

Every premium SaaS video scene has a visual text layer that tells the story even with sound off. This is separate from voiceover — it is the on-screen copy that appears as graphical elements alongside the visual content.

**The 3-layer text stack (used on every scene):**
1. **Section label** — 12px, uppercase, BRAND.primary, letterSpacing 0.22em — the category/context
2. **Headline** — 80–120px, weight 900, BRAND.text — the story beat in 3–6 words
3. **Sub-line** — 22px, weight 400, BRAND.textMuted — the specific detail/outcome

**The golden rule**: The headline text is always written in OUTCOME language — what the viewer gains, never what the feature does.

---

## Complete Pattern (copy and adapt)

```tsx
// Define in constants (read from scene prompt — use exact text specified)
const SECTION_LABEL = "THE PROBLEM";         // or "AUTOMATION", "RESULTS", etc.
const HEADLINE_PARTS = ["Hours lost.", "Every week."]; // split at natural break
const ACCENT_WORD = "Hours";                 // one word gets BRAND.primary color
const SUBLINE = "12 hours of manual work — per person";

// Timing constants (read from scene prompt Act 1 timing)
const LABEL_START   = 8;
const HEADLINE_START = 18;
const SUBLINE_START  = HEADLINE_START + 14;

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Springs — match emotional intent from scene prompt
const labelOpacity   = spring({ frame: frame - LABEL_START,   fps, config: { damping: 200, stiffness: 120 } });
const headlineSpring = spring({ frame: frame - HEADLINE_START, fps, config: { damping: 200, stiffness: 120 } });
const sublineOpacity = spring({ frame: frame - SUBLINE_START,  fps, config: { damping: 200, stiffness: 100 } });

// Section label
<div style={{
  fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
  color: BRAND.primary, fontFamily: BRAND.font + ", Inter, sans-serif",
  textTransform: "uppercase",
  opacity: Math.min(labelOpacity * 2, 1),
  marginBottom: 14,
  transform: `translateY(${interpolate(labelOpacity, [0, 1], [8, 0])}px)`,
}}>
  {SECTION_LABEL}
</div>

// Headline — with accent word highlighted
<div style={{
  fontSize: 96, fontWeight: 900, letterSpacing: "-0.04em",
  color: BRAND.text, fontFamily: BRAND.font + ", Inter, sans-serif",
  lineHeight: 1.05, maxWidth: "82%", wordBreak: "break-word",
  transform: `translateY(${interpolate(headlineSpring, [0, 1], [28, 0])}px)`,
  opacity: headlineSpring,
}}>
  {HEADLINE_PARTS.map((part, i) => (
    <span key={i}>
      {part.split(" ").map((word, j) => (
        <span key={j} style={
          word.replace(/[.,!?]/, "") === ACCENT_WORD
            ? {
                background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }
            : {}
        }>
          {word}{" "}
        </span>
      ))}
      {i < HEADLINE_PARTS.length - 1 && <br />}
    </span>
  ))}
</div>

// Sub-line
{frame >= SUBLINE_START && (
  <div style={{
    fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em",
    color: BRAND.textMuted, fontFamily: BRAND.font + ", Inter, sans-serif",
    marginTop: 20, maxWidth: "60%", lineHeight: 1.5,
    opacity: sublineOpacity,
    transform: `translateY(${interpolate(sublineOpacity, [0, 1], [12, 0])}px)`,
  }}>
    {SUBLINE}
  </div>
)}
```

---

## Positioning Rules (by scene composition)

**Left-side text (showcase scenes — text 40%, visual 55%):**
```tsx
<div style={{
  position: "absolute",
  left: 80, top: "50%",
  transform: "translateY(-50%)",
  width: "38%",
  display: "flex", flexDirection: "column",
  zIndex: 20,
}}>
  {/* label + headline + subline stack */}
</div>
```

**Centered text (title cards, stat scenes, CTA):**
```tsx
<div style={{
  position: "absolute",
  left: "50%", top: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
  width: "75%",
  display: "flex", flexDirection: "column", alignItems: "center",
  zIndex: 20,
}}>
  {/* label + headline + subline centered */}
</div>
```

**Top-left anchor (problem scenes with full-frame visual):**
```tsx
<div style={{
  position: "absolute",
  left: 80, top: 80,
  width: "45%",
  display: "flex", flexDirection: "column",
  zIndex: 20,
}}>
  {/* label + headline + subline */}
</div>
```

---

## Emotional Variant — Headline Size + Weight by Intent

| emotionalIntent | Headline size | Weight | Character |
|---|---|---|---|
| FRUSTRATION | 80–96px | 900 | Short, blunt. No punctuation softening. "Chaos. Every. Day." |
| PAIN | 72–88px | 800 | One sentence, specific cost. "$4,200 in wasted hours." |
| RELIEF | 96–120px | 800 | Spacious, breathing. "Finally." or "Done. Automatically." |
| CONFIDENCE | 72–96px | 800 | Clear, direct. "See everything. Instantly." |
| TRUST | 64–80px | 700 | Warm, understated. "Trusted by 2,400 teams." |
| URGENCY | 96–128px | 900 | Action-forward. "Start in 2 minutes." |
| EXCITEMENT | 108–160px | 900 | Big, celebratory. "You're ready." |

---

## Animated Underline Draw (optional — for single-line headlines)

Adds a brand-color underline that draws left-to-right under the accent word:

```tsx
const underlineProgress = spring({ frame: frame - (HEADLINE_START + 10), fps, config: { stiffness: 40, damping: 22 } });

{/* Underline under accent word — position manually */}
<div style={{
  position: "absolute",
  bottom: -4,
  left: 0,
  width: `${interpolate(underlineProgress, [0, 1], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
  height: 4,
  borderRadius: 2,
  background: BRAND.primary,
  boxShadow: `0 0 12px ${BRAND.primary}80`,
}} />
```

---

## Multi-Line Kinetic Reveal (word by word)

For problem/hook scenes, reveal each word independently for dramatic impact:

```tsx
// OUTSIDE component — stable reference
const WORDS = "Your team is losing hours every single week".split(" ");
const WORD_DELAY = 6; // frames between each word

{WORDS.map((word, i) => {
  const wordProgress = spring({
    frame: frame - (HEADLINE_START + i * WORD_DELAY),
    fps,
    config: { damping: 200, stiffness: 180 },
  });
  if (frame < HEADLINE_START + i * WORD_DELAY) return null;
  return (
    <span key={i} style={{
      display: "inline-block",
      opacity: wordProgress,
      transform: `translateY(${interpolate(wordProgress, [0, 1], [20, 0])}px)`,
      marginRight: "0.25em",
      color: i === WORDS.length - 1 ? BRAND.primary : BRAND.text,
    }}>
      {word}
    </span>
  );
})}
```

---

## Usage Notes

- **Use this pattern on EVERY scene** — even showcase scenes need a headline above or beside the UI
- The section label is optional for action-heavy cursor scenes (it can interfere with the demo) — use it for all other scene types
- NEVER invent headline text — use the exact strings from the scene prompt
- For AHA MOMENT scenes: make the headline the LARGEST element on screen. It IS the moment. Visual is secondary.
- Accent word rule: one word per headline, not two. "Done **instantly**." not "Done **instantly** **always**."
- Sub-line font size never above 24px — it is context, not story
- In split-composition scenes (text left, visual right): text block width = 38–42% of frame width, never more
