# Premium Audio Skill

Use Remotion's `<Audio>` component to add background music, voiceover narration,
and volume automation. `Audio` is already in scope — do NOT import it.

---

## 1. Background Music (royalty-free CDN, no API key needed)

Pick a genre based on `BRAND.style` and the scene mood:

```tsx
// ── MUSIC TRACKS — select by BRAND.musicStyle (injected from plan route) ─────
const FREE_MUSIC_TRACKS = {
  "energetic":     "https://cdn.pixabay.com/audio/2024/08/20/audio_6c53572dfa.mp3",
  "cinematic":     "https://cdn.pixabay.com/audio/2024/02/15/audio_b99e82e13f.mp3",
  "corporate":     "https://cdn.pixabay.com/audio/2023/11/13/audio_3c2e86c693.mp3",
  "calm":          "https://cdn.pixabay.com/audio/2023/09/07/audio_168f2040eb.mp3",
  "playful":       "https://cdn.pixabay.com/audio/2024/04/09/audio_9c659e933b.mp3",
} as const;

// SELECTION RULES — use BRAND.musicStyle first:
// BRAND.musicStyle === "energetic" → "energetic" (fast-paced UI, high energy recording)
// BRAND.musicStyle === "calm"      → "calm" (minimal UI, deliberate pace)
// BRAND.musicStyle === "cinematic" → "cinematic" (dark SaaS, dramatic brand moments)
// BRAND.musicStyle === "corporate" → "corporate" (light B2B, enterprise)
// BRAND.musicStyle === "playful"   → "playful" (consumer SaaS, collaboration tools)
// Fallback if musicStyle not set: dark → "cinematic", light → "corporate"
const trackKey = (BRAND.musicStyle ?? (BRAND.style === "dark" ? "cinematic" : "corporate")) as keyof typeof FREE_MUSIC_TRACKS;
const SELECTED_TRACK = FREE_MUSIC_TRACKS[trackKey] ?? FREE_MUSIC_TRACKS["cinematic"];

export const MyAnimation = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const FADE_IN  = fps * 1.5;
  const FADE_OUT = fps * 2;

  const musicVolume = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0,  0.35,   0.35,                         0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill>
      <Audio
        src={SELECTED_TRACK}
        volume={musicVolume}
        loop
      />
      {/* … visual scene content … */}
    </AbsoluteFill>
  );
};
```

---

## 2. Voiceover + Background Music (when VOICEOVER_AUDIO_URL is in scope)

When a scene has pre-generated ElevenLabs narration, `VOICEOVER_AUDIO_URL` is
injected into scope as a constant. Use it like this:

```tsx
export const MyAnimation = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const FADE_IN  = fps * 0.5;
  const FADE_OUT = fps * 1;

  // Voiceover — prominent volume
  const voVolume = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0,  0.9,    0.9,                          0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Background music — ducked under voiceover
  const bgVolume = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0,  0.15,   0.15,                          0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill>
      {/* Voiceover narration */}
      {VOICEOVER_AUDIO_URL && (
        <Audio src={VOICEOVER_AUDIO_URL} volume={voVolume} />
      )}
      {/* Ducked background music — SELECTED_TRACK chosen from BRAND.musicStyle */}
      <Audio
        src={SELECTED_TRACK}
        volume={bgVolume}
        loop
      />
      {/* … visual scene content … */}
    </AbsoluteFill>
  );
};
```

---

## 3. Volume Automation (fade-in / fade-out)

```tsx
const musicVolume = interpolate(
  frame,
  [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
  [0,  0.4,    0.4,                          0],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
);
<Audio src="..." volume={musicVolume} loop />
```

The `volume` prop accepts a **per-frame callback** `(frame: number) => number`.

---

## 4. Per-Frame SFX at Specific Frames

```tsx
// Click SFX at frame 45
const sfxVolume = (f: number) => f >= 45 && f < 57 ? 1 : 0;
<Audio src="https://cdn.pixabay.com/audio/2022/03/10/audio_c5816a04bc.mp3" volume={sfxVolume} />
```

---

## 5. Audio Inside a `<Sequence>`

When `<Audio>` lives inside a `<Sequence>`, frame 0 aligns with the Sequence's `from` prop — no manual offset needed.

---

## 6. Rules & Best Practices

| Rule | Detail |
|------|--------|
| **Do NOT import Audio** | Already in scope — re-importing causes `ReferenceError` |
| **`FREE_MUSIC_TRACKS` must be declared** | Copy the const from Section 1 into your component file |
| **Check `VOICEOVER_AUDIO_URL` before use** | It may be `null` if TTS was not generated — always guard with `{VOICEOVER_AUDIO_URL && <Audio ... />}` |
| **Duck bg music under voiceover** | BG music ≤ 0.2 vol when voiceover is present |
| **Fade out before scene end** | Interpolate to 0 in last 30–45 frames for clean cuts |
| **Loop short tracks** | Always add `loop` to background music |
| **No per-frame logs in volume fn** | Fires every frame — never `console.log` inside |
