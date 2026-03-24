---
title: Premium Narration Reveal
impact: HIGH
impactDescription: Word-by-word color transition synced to voiceover timing. Words start gray and illuminate as narration speaks them — one of the highest-impact "perceived intelligence" techniques in video production.
tags: narration, voiceover, word-sync, text-reveal, progressive, word-by-word, qanapi, conclusion, summary, cta
qualityBar: Text renders with all words visible but dimmed. As voiceover reaches each word, it transitions from gray to full color with easeOutCubic smoothness. Optional fontWeight transition 400→700 adds physical weight. Max 1 per video — reserved for the key takeaway or CTA statement.
---

## Scene Purpose

The "Key Takeaway" moment. A single powerful sentence reveals word-by-word in sync with the voiceover, creating the impression that the narrator is illuminating each word as they speak it. Qanapi's summary scene uses this exact technique for maximum message retention.

## Visual Blueprint

```text
[   Clean background (light arc bg or brand gradient)              ]
[                                                                   ]
[   Optional: DrawOnIcon (shield, target, check) centered above    ]
[                                                                   ]
[     In just a few clicks, you've deployed                        ]
[     ^^^^^^^^^^^^^^^^^^^^^ (active — BRAND.text, full opacity)    ]
[                            ^^^^^^^^^^^^^^^^                       ]
[                            a complete Zero-Trust security          ]
[                            ^^^^^ (transitioning — mid-opacity)    ]
[                                   ^^^^^^^^^^^^^^^^^^^^^^^^        ]
[                                   (inactive — gray, low opacity)  ]
[                                                                   ]
```

---

## Core Animation Pattern

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";

export const NarrationRevealScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SUMMARY_TEXT = "In just a few clicks, you've deployed a complete Zero-Trust security solution";

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 120 }}>
      {/* Optional icon above text */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: BRAND.primary, marginBottom: 40,
        display: "flex", justifyContent: "center", alignItems: "center",
        opacity: spring({ frame: frame - 10, fps, config: SPRING_CONFIGS.entrance }),
        transform: `scale(${spring({ frame: frame - 10, fps, config: SPRING_CONFIGS.snap })})`,
      }}>
        {/* Shield icon or similar */}
      </div>

      {/* NarrationReveal — words illuminate as voiceover speaks */}
      <NarrationReveal
        text={SUMMARY_TEXT}
        timings={WORD_TIMINGS}
        activeColor={BRAND.text}
        inactiveColor={BRAND.style === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
        fontSize={56}
        fontWeight={700}
        boldOnActive={true}
        brand={BRAND}
        maxWidth="75%"
      />
    </AbsoluteFill>
  );
};
```

---

## Usage Patterns

### Pattern A: Summary Statement (Qanapi-style)
Clean background, icon above, single powerful sentence that summarizes the product's value.
```
fontSize: 56
boldOnActive: true
maxWidth: "75%"
```

### Pattern B: CTA Reveal
Brand-colored background, large text, narration reveals the call-to-action.
```
fontSize: 72
activeColor: "#ffffff"
inactiveColor: "rgba(255,255,255,0.15)"
boldOnActive: false
```

### Pattern C: Problem Statement
Dark/muted background, narration reveals the pain point before the solution.
```
fontSize: 48
activeColor: "#ef4444" (red for pain)
inactiveColor: "rgba(239,68,68,0.15)"
boldOnActive: true
```

---

## Rules

1. **Max 1 NarrationReveal per video** — overuse dilutes the impact
2. **Always pass WORD_TIMINGS** when voiceover audio exists
3. **Reserve for conclusion/CTA/summary scenes** — not for intro or problem scenes
4. **Keep text under 20 words** — longer text loses the sync effect
5. **Pair with clean background** — no competing visual elements during the reveal
6. **Center the text** — NarrationReveal demands the viewer's full attention

## Checklist

- [ ] WORD_TIMINGS passed to timings prop
- [ ] Text matches voiceoverText from scene plan
- [ ] activeColor uses BRAND.text (not hardcoded)
- [ ] Background is clean (arc bg, gradient, or solid)
- [ ] No more than 1 NarrationReveal in the full video
- [ ] Text is under 20 words
