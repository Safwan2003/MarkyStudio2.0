# Premium Audio Skill

Use Remotion's `<Audio>` component to add background music, per-frame sound effects,
and volume automation. `Audio` is already in scope — do NOT import it.

---

## 1. Background Music (looping)

```tsx
// Audio is already in scope — no import needed
export const MyAnimation = () => {
  const { durationInFrames, fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Background music — loops for entire video */}
      <Audio
        src="https://example.com/bg-music.mp3"
        volume={0.4}                         // 0–1 master volume
        startFrom={0}
        endAt={durationInFrames}
        loop                                 // loop if track shorter than video
      />

      {/* … visual scene content … */}
    </AbsoluteFill>
  );
};
```

**Key props:**
- `volume` — scalar 0–1 or per-frame function `(f) => number`
- `loop` — repeat track when it ends
- `startFrom` / `endAt` — trim the audio clip (in frames)
- `playbackRate` — speed factor (1 = normal)

---

## 2. Volume Automation (fade-in / fade-out)

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const FADE_IN  = fps * 1;   // 1-second fade in
  const FADE_OUT = fps * 1.5; // 1.5-second fade out

  const musicVolume = interpolate(
    frame,
    [0, FADE_IN, durationInFrames - FADE_OUT, durationInFrames],
    [0,  0.5,    0.5,                          0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill>
      <Audio
        src="https://example.com/ambient.mp3"
        volume={musicVolume}
        loop
      />
    </AbsoluteFill>
  );
};
```

The `volume` prop accepts a **per-frame callback** `(frame: number) => number` —
Remotion calls it for each rendered frame, enabling smooth automation curves.

---

## 3. Per-Frame SFX at Specific Frames

Trigger a sound effect at an exact frame by computing volume as 0 except at the
target window:

```tsx
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Play a click sound at frame 30 (0.5 s into a 60-fps video)
  const clickFrame = fps * 0.5;
  const SFX_DURATION = 12; // frames the SFX plays for

  const sfxVolume = (f: number) =>
    f >= clickFrame && f < clickFrame + SFX_DURATION ? 1 : 0;

  // Play a chime at 2 s
  const chimeFrame = fps * 2;
  const chimeVolume = (f: number) =>
    f >= chimeFrame && f < chimeFrame + SFX_DURATION ? 0.8 : 0;

  return (
    <AbsoluteFill>
      {/* Background music */}
      <Audio src="https://example.com/bg.mp3" volume={0.35} loop />

      {/* Click SFX */}
      <Audio src="https://example.com/click.mp3" volume={sfxVolume} />

      {/* Chime SFX */}
      <Audio src="https://example.com/chime.mp3" volume={chimeVolume} />
    </AbsoluteFill>
  );
};
```

---

## 4. Audio Inside a `<Sequence>`

When `<Audio>` lives inside a `<Sequence>`, frame 0 of the Audio aligns with the
Sequence's `from` prop — no manual offset needed:

```tsx
export const MyAnimation = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Intro scene (0–90 frames) */}
      <Sequence from={0} durationInFrames={90}>
        <Audio src="https://example.com/intro-sting.mp3" volume={0.9} />
        {/* … intro visuals … */}
      </Sequence>

      {/* Main scene (90–270 frames) */}
      <Sequence from={90} durationInFrames={180}>
        <Audio src="https://example.com/main-loop.mp3" volume={0.4} loop />
        {/* … main visuals … */}
      </Sequence>
    </AbsoluteFill>
  );
};
```

---

## 5. Rules & Best Practices

| Rule | Detail |
|------|--------|
| **Do NOT import Audio** | It is already in scope — declaring it again causes a `ReferenceError` |
| **Use public URLs or data URIs** | Audio src must be a reachable URL at render time |
| **Keep bg music ≤ 0.45 volume** | Prevents music from overpowering narration |
| **Avoid per-frame logs inside volume fn** | The callback fires every frame — no console.log |
| **Loop short tracks** | Add `loop` whenever the music track may be shorter than the scene |
| **Fade out before scene end** | Interpolate volume to 0 in the last 30–45 frames for clean cuts |
