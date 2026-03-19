# premium-phone-notification

## WHAT IT IS
An iOS-style push notification that slides down from the top of the frame, hovers for ~60 frames, then slides back up. The notification pill has: a rounded-square product icon (borderRadius 12, BRAND.primary background with white emoji icon inside), app name label, bold notification title, and a body text line. Creates instant product recognition and a "real-world moment" that grounds the demo.

## WHEN TO USE
- Mobile SaaS, consumer apps, HR tools, notification-heavy products
- Any scene needing a "real-time event" moment (new lead, approval, task complete, mention)
- Works as an OVERLAY on top of any device/cursor scene (z:500) OR as a standalone 3-second SOLO scene
- Pairs with premium-cursor-engine or premium-device-mockup as an overlay element
- Especially effective for CRM (new lead), HR (offer accepted), project mgmt (@mention), analytics (alert)

## NOTIFICATION ANATOMY
```
┌──────────────────────────────────────────┐
│ [ICON]  APP NAME              now         │
│         Notification Title Bold           │
│         Body text single line truncated   │
└──────────────────────────────────────────┘
```
- Container: width 340px, borderRadius 22px, height 78px, padding "0 16px"
- Background DARK: "rgba(28,28,30,0.88)" + backdropFilter "blur(40px) saturate(180%)"
- Background LIGHT: "rgba(255,255,255,0.88)" + backdropFilter "blur(40px) saturate(180%)"
- boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)"
- Icon: 44x44px square, borderRadius 12, background BRAND.primary, centered white emoji 28px
- App name: 11px, fontWeight 600, color "rgba(255,255,255,0.5)" (dark) or "rgba(0,0,0,0.45)" (light)
- Title: 15px, fontWeight 600, white (dark) or "#1c1c1e" (light)
- Body: 13px, fontWeight 400, "rgba(255,255,255,0.6)" (dark) or "rgba(0,0,0,0.5)" (light), overflow "hidden", textOverflow "ellipsis", whiteSpace "nowrap"
- Time: "now", 11px, textMuted, position absolute top-right

## ANIMATION TIMING
```tsx
const ENTER_END = 18;
const HOLD_END = 80;
const EXIT_START = 80;

const slideY = (() => {
  if (frame <= ENTER_END) {
    const p = spring({ frame, fps, config: SPRING_CONFIGS.entrance });
    return interpolate(p, [0, 1], [-110, 20], { extrapolateRight: "clamp" });
  }
  if (frame <= HOLD_END) {
    return 20 + Math.sin(frame * 0.08) * 1.5; // micro-float
  }
  const exitFrame = frame - EXIT_START;
  const p = spring({ frame: exitFrame, fps, config: { damping: 200, stiffness: 200 } });
  return interpolate(p, [0, 1], [20, -110], { extrapolateRight: "clamp" });
})();
```

## POSITION
- Centered horizontally: position "absolute", left "50%", transform `translateX(-50%) translateY(${slideY}px)`
- Top: 28px (simulates iOS notification drop zone below Dynamic Island)
- zIndex: 500 (overlay mode) or 10 (solo mode)

## CONTENT — MAKE IT PRODUCT-SPECIFIC
The notification content must match the product being shown:
- CRM: title "New lead: Acme Corp → $45K", body "Sarah Johnson requested a demo"
- HR: title "Offer accepted!", body "Alex Chen starts Monday, March 15"
- Analytics: title "Conversion drop detected", body "Checkout funnel −12% in last hour"
- Project mgmt: title "Mentioned in Design Review", body "@you can you check the mockup?"
- E-commerce: title "New order #4821", body "Nike Air Max × 2 — $240.00"
- Support: title "High priority ticket", body "Enterprise client: 'system is down'"

## VARIANTS

### SOLO MODE (dedicated 3-second scene, 90 frames)
Full-screen background (BRAND.bg or dark gradient), notification centered, appears at f:0, dismisses at f:70.
Add subtle radial glow behind notification: BRAND.primary at 8% opacity, 300px radius.

### OVERLAY MODE (stacked on existing scene)
zIndex 500 overlay. Configure `entryFrame` prop to trigger at specific moment:
```tsx
// Offset all frame calculations: frame - entryFrame
const notifFrame = Math.max(0, frame - 60); // enters at f:60
```

### STACKED (2 notifications)
Second notification appears at f:30, translateY = firstNotif.y + 88px.
Both visible until f:60 when first exits, second exits at f:90.

## PAIRING RULES
- OVERLAY MODE: place over premium-device-mockup or premium-saas-showcase
- Time the entry 10–15 frames AFTER the main scene's key interaction (adds realism — the action triggered the notification)
- SOLO MODE works great as a transition beat between showcase and social-proof scenes
- Pair with SfxSequencer event: sfx "pop" at the entry frame for tactile feel
