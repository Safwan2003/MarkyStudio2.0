# premium-notification-toast

## When to Use
Use when a cursor interaction should trigger a visible result — e.g., clicking "Resolve" shows "Ticket Resolved", clicking "Save" shows "Settings Saved". Slides in from the right side of the screen.

## Component
```tsx
<NotificationToast
  icon="✅"
  title="Ticket Resolved"
  body="Support ticket #1234 has been closed"
  brand={BRAND}
  startFrame={80}  // appears ~15 frames after cursor clicks at frame ~65
  duration={90}
/>
```

## Timing Rules
- `startFrame` should be ~15 frames AFTER the cursor click event
- `duration`: 90 frames default (3 seconds), then auto-fades out
- Position: fixed top-right of the screen, above the product UI (zIndex: 100)
- Multiple toasts: stagger startFrames by 30 frames

## Props
- `icon`: emoji (e.g., "✅", "📋", "🔔")
- `title`: main notification text
- `body`: optional secondary line
- `startFrame`: when it appears
- `duration`: how long it stays visible before auto-fading (default 90)

## Examples
- After form submit: `icon="✅" title="Settings Saved" body="Your changes have been applied"`
- After resolve click: `icon="✅" title="Ticket Resolved" body="Ticket #1234 closed"`
- After invite: `icon="📧" title="Invitation Sent" body="Team member added"`
