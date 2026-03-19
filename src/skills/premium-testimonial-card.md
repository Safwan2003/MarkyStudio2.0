# premium-testimonial-card

## WHAT IT IS
A full-screen trust-building quote card: large opening quotation mark (decorative, 200px, BRAND.primary at 12% opacity), 2–3 lines of testimonial text that appears word by word, then the person's avatar circle + name + company role slides up from below. 5 gold star icons pop in. The overall feel is editorial — like a magazine pullquote but animated.

## WHEN TO USE
- Social proof scene (primary or supplementary)
- Works as a standalone trust scene between showcase and CTA
- When you have a real customer quote — use verbatim text
- Use instead of premium-social-proof when the video needs a focused single testimonial moment (not a wall of cards)
- Pairs perfectly after a premium-stat-counter or premium-metric-flyout scene

## COMPOSITION
- Background: BRAND.bg (dark) or white (light); subtle vignette radial gradient at edges
- Opening quote mark: `"` character, fontSize 240px, fontWeight 900, color BRAND.primary at 12% opacity, positioned top-left behind text block
- Quote text block: centered, maxWidth 860px, fontSize 40–46px, fontWeight 400, lineHeight 1.55, BRAND.text
- Attribution row: avatar circle (80px) + name (22px, fontWeight 700) + title/company (15px, BRAND.textMuted), centered, marginTop 48px
- Stars: 5 gold star characters, fontSize 26px, color "#F59E0B", gap 6px
- Closing thin horizontal rule: 1px line, 180px wide, BRAND.border, centered, appears after attribution

## ANIMATION SEQUENCE
1. f:0: Background fades in + decorative quote mark scales from 0.6 to 1.0 via SPRING_CONFIGS.entrance
2. f:20–90: Quote text reveals word by word — each word fades in + slides up 10px (stagger: 4 frames per word)
3. f:90 (or after all words): Attribution slides up from translateY(+40px), spring entrance
4. f:105: Stars pop in one by one (stagger 3 frames each), scale 0 to 1 with SPRING_CONFIGS.pop
5. f:120: Horizontal rule draws from center outward (width 0 to 180px)

## WORD-BY-WORD REVEAL PATTERN
```tsx
const QUOTE_WORDS = QUOTE_TEXT.split(" ");

// In JSX return:
// <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px", justifyContent: "center", maxWidth: 860 }}>
//   {QUOTE_WORDS.map((word, i) => {
//     const wordFrame = Math.max(0, frame - 20 - i * 4);
//     const wordOpacity = interpolate(wordFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
//     const wordY = interpolate(wordFrame, [0, 8], [10, 0], { extrapolateRight: "clamp", easing: EASINGS.easeOutCubic });
//     return (
//       <span key={i} style={{ opacity: wordOpacity, transform: translateY(wordY px), display: "inline-block" }}>
//         {word + " "}
//       </span>
//     );
//   })}
// </div>
```

## AVATAR VARIANTS
- With ATTACHED_IMAGES: use ATTACHED_IMAGES[0] as circular avatar (width 80, height 80, borderRadius "50%", objectFit "cover")
- Without image: colored circle with initials (2 chars from person name), background BRAND.primary, text white, fontSize 28px

## LIGHT THEME ADAPTATION
When BRAND.style === "light":
- Use LightArcBg as first child
- Background: white
- Attribution card: white card with medium shadow elevation, borderRadius 20, padding "24px 32px"

## DARK THEME ADAPTATION
When BRAND.style === "dark" or "neon":
- Background: BRAND.bg with radial glow (BRAND.primary at 5% opacity) centered
- Attribution: glass card via getGlassCard(BRAND)

## CONTENT GUIDELINES
- Quote text: 15–30 words (2–3 lines at 40px)
- Name: First + Last name only
- Title: "Head of Sales, CompanyName" or "CEO at CompanyName"
- Stars: always 5 full stars

## PAIRING RULES
- Follow with premium-cta-scene for strong close
- Can precede premium-logo-wall (testimonial then trusted-by)
- Add NotificationToast at f:60 with "Verified customer" for extra credibility
