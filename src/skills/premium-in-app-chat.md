# In-App Chat Panel

> Bordio-style team messaging overlay — slide-in chat thread with avatars, timestamps, typing indicators. For showcasing collaboration, customer support, or project management tools.

## When to Use
- Showcase scenes for products with built-in messaging/chat features
- Demonstrating team collaboration, customer support threads
- Project management tools with comment threads
- Any product where in-app communication is a key feature

## Components Available
- `InAppChatPanel` — pre-built in scope (slide-in panel with message thread)

## Usage Patterns

### Overlay Mode (Chat over existing UI)
```jsx
const SceneComponent = () => {
  return (
    <AbsoluteFill>
      {/* Existing product UI underneath */}
      <AppShell sidebar={...} topbar={...} brand={BRAND}>
        {/* Main content */}
      </AppShell>

      {/* Chat panel slides in from right at frame 40 */}
      <InAppChatPanel
        startFrame={40}
        brand={BRAND}
        side="right"
        overlay={true}
        messages={[
          { name: "Sarah K.", text: "Can you check the Q3 report?", avatar: "S" },
          { name: "Mike T.", text: "Sure, looking at it now. The metrics look good.", avatar: "M" },
          { name: "Sarah K.", text: "Great! Let me know if the revenue numbers match.", avatar: "S" },
          { name: "Mike T.", text: "", avatar: "M", isTyping: true },
        ]}
      />
    </AbsoluteFill>
  );
};
```

### Split View Mode (Chat alongside content)
```jsx
<AbsoluteFill style={{ display: "flex" }}>
  <div style={{ flex: 1 }}>
    {/* Main product view */}
  </div>
  <InAppChatPanel
    startFrame={20}
    brand={BRAND}
    side="right"
    overlay={false}
    messages={[...]}
  />
</AbsoluteFill>
```

## Message Design
- Each message has: avatar circle (28px, brand-colored bg), name (bold), text
- Messages stagger in with 10-frame delay between each
- Last message can be `isTyping: true` — shows animated 3-dot indicator
- Keep messages SHORT — 1-2 lines max per message
- Use 3-5 messages total — enough to show thread, not overwhelming

## Composition Rules

1. Panel slides in from the specified side (default: right)
2. Background dims (rgba 0,0,0,0.3) when overlay=true
3. Messages appear one by one with spring entrance
4. Always end with a typing indicator for "live" feeling
5. Use real-sounding short messages — not lorem ipsum
6. Avatar shows first letter of name with brand-colored background
7. Panel width is 35% of video width

## Scene Arc
```
Frames 0-30:   Show base product UI
Frames 30-40:  Chat panel slides in, backdrop dims
Frames 45-75:  Messages appear one by one (10f stagger)
Frames 80+:    Typing indicator pulses, panel stays visible
```

## Anti-Patterns
- Do NOT use more than 5 messages — panel gets cramped
- Do NOT use long messages — keep under 60 characters each
- Do NOT show chat without base UI underneath — needs context
- Do NOT use both overlay and split-view in the same scene
