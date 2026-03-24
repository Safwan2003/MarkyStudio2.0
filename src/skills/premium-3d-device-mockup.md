# premium-3d-device-mockup

## Overview
Renders a true 3D MacBook, phone, or tablet mockup using `@remotion/three` + `@react-three/fiber`.
A cinematic camera orbits the device while the product screenshot is mapped onto the screen geometry.
Unlike the CSS-only `premium-device-mockup`, this skill produces physically accurate 3D depth,
specular highlights, and real parallax — indistinguishable from a professional 3D render.

## When to use
- Product showcase scenes requiring cinematic depth (launch, hero showcase, investor demo)
- Before/after comparisons where depth separation must be tactile and premium
- Any scene where the device needs to slowly rotate, orbit, or dramatically swing into frame
- High-stakes B2B SaaS: enterprise, fintech, analytics, design tools

## Technical approach
Use `ThreeCanvas` (already in scope) + inline Three.js geometry.
Do NOT import `@react-three/fiber` — use `ThreeCanvas` directly from scope.
The screen texture is created from `ATTACHED_IMAGES[0]` via a `<Img>` element rendered as a texture.

## Component pattern — MacBook 3D

```jsx
const Scene = () => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  // Cinematic camera orbit: slow arc from side to front over 90 frames
  const orbitProgress = spring({ frame, fps, config: { damping: 200, stiffness: 30 }, durationInFrames: 90 });
  const cameraAngleY = interpolate(orbitProgress, [0, 1], [-0.7, 0.12]); // radians
  const cameraAngleX = interpolate(orbitProgress, [0, 1], [0.25, 0.08]);
  const cameraZ = interpolate(orbitProgress, [0, 1], [5.5, 4.2]);

  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      {/* Ambient glow bloom behind device */}
      <div style={{
        position: "absolute",
        left: "50%", top: "52%",
        width: 600, height: 400,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse, ${BRAND.primary}28 0%, transparent 70%)`,
        filter: "blur(40px)",
      }} />

      <ThreeCanvas
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0 }}
      >
        <MacBook3D
          frame={frame}
          fps={fps}
          cameraAngleX={cameraAngleX}
          cameraAngleY={cameraAngleY}
          cameraZ={cameraZ}
          screenImage={ATTACHED_IMAGES[0] ?? null}
          brand={BRAND}
        />
      </ThreeCanvas>

      {/* Floating headline over the device */}
      {orbitProgress > 0.6 && (
        <div style={{
          position: "absolute",
          bottom: 160, left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: interpolate(orbitProgress, [0.6, 0.85], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <div style={{ fontFamily: BRAND.font, fontSize: 32, fontWeight: 700, color: BRAND.text }}>
            Built for your workflow
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
```

## MacBook3D component (inline in the scene)

```jsx
const MacBook3D = ({ frame, fps, cameraAngleX, cameraAngleY, cameraZ, screenImage, brand }) => {
  // Camera setup
  const camera = new THREE.PerspectiveCamera(40, 16/9, 0.1, 100);
  camera.position.set(
    Math.sin(cameraAngleY) * cameraZ,
    Math.sin(cameraAngleX) * cameraZ * 0.6,
    Math.cos(cameraAngleY) * cameraZ,
  );
  camera.lookAt(0, 0.1, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(3, 4, 5);
  const rimLight = new THREE.DirectionalLight(brand?.primary ? parseInt(brand.primary.slice(1), 16) : 0x6366f1, 0.4);
  rimLight.position.set(-4, 2, -3);

  // Screen texture from ATTACHED_IMAGES
  // Convert base64 data URLs to Blob URLs to avoid headless Chrome OOM crash during Lambda rendering.
  // THREE.TextureLoader with large base64 strings keeps the raw data in memory across all frames;
  // Blob URLs let the browser manage the backing store and GC it properly.
  const screenBlobUrl = React.useMemo(() => {
    if (!screenImage) return null;
    if (!screenImage.startsWith('data:')) return screenImage;
    try {
      const [header, b64data] = screenImage.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
      const binary = atob(b64data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: mime }));
    } catch {
      return screenImage; // fallback to raw data URL if conversion fails
    }
  }, [screenImage]);
  const screenTexture = screenBlobUrl
    ? new THREE.TextureLoader().load(screenBlobUrl)
    : null;
  const screenMaterial = new THREE.MeshStandardMaterial({
    map: screenTexture,
    color: screenTexture ? 0xffffff : 0x111827,
    roughness: 0.05,
    metalness: 0.1,
  });

  // Body material — space gray aluminum
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d2d2d,
    roughness: 0.35,
    metalness: 0.85,
  });

  // Lid: screen plane (16:10 ratio) + thin bezel frame
  const lidAngle = interpolate(frame, [0, 40], [-Math.PI * 0.45, -Math.PI * 0.02], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const scene3d = new THREE.Scene();
  scene3d.add(ambientLight);
  scene3d.add(keyLight);
  scene3d.add(rimLight);

  // Base (keyboard deck)
  const baseGeo = new THREE.BoxGeometry(2.8, 0.06, 1.8);
  const baseMesh = new THREE.Mesh(baseGeo, bodyMaterial);
  baseMesh.position.set(0, 0, 0);
  scene3d.add(baseMesh);

  // Lid group — pivot at back edge
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.03, -0.9);
  lidGroup.rotation.x = lidAngle;

  // Screen panel
  const screenGeo = new THREE.PlaneGeometry(2.6, 1.65);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, 0.88, 0.01);
  lidGroup.add(screenMesh);

  // Lid back panel
  const lidGeo = new THREE.BoxGeometry(2.8, 0.04, 1.72);
  const lidMesh = new THREE.Mesh(lidGeo, bodyMaterial);
  lidMesh.position.set(0, 0.83, -0.01);
  lidGroup.add(lidMesh);

  scene3d.add(lidGroup);

  return { scene: scene3d, camera };
};
```

## Phone 3D variant (portrait)

```jsx
// For phone mockup — use BoxGeometry for body + rounded look via ShapeGeometry
const Phone3D = ({ frame, fps, screenImage, brand }) => {
  // Slow tumble into upright position
  const settleProgress = spring({ frame, fps, config: { damping: 180, stiffness: 35 }, durationInFrames: 75 });
  const rotateY = interpolate(settleProgress, [0, 1], [0.8, 0.1]);
  const rotateX = interpolate(settleProgress, [0, 1], [-0.3, 0.0]);

  // Phone body: tall rectangle with rounded corners approximated by 3D box
  const bodyGeo = new THREE.BoxGeometry(0.85, 1.72, 0.072);
  const screenGeo = new THREE.PlaneGeometry(0.72, 1.52);

  // ... mount in scene with camera at (0, 0, 3.5), lookAt(0, 0, 0)
};
```

## Cinematic camera moves

```jsx
// Orbit: slow sweep from side angle to hero frontal
cameraAngleY: interpolate(orbitProgress, [0, 1], [-0.7, 0.12])  // wide side → slight hero angle

// Dolly push-in: camera moves closer as lid opens
cameraZ: interpolate(lidOpenProgress, [0, 1], [5.5, 3.8])

// Slight tilt during reveal: adds weight and dimension
cameraAngleX: interpolate(orbitProgress, [0, 1], [0.22, 0.06])  // looking slightly down → level
```

## Lighting setup rules
- Always add 3 lights: ambient (0.5–0.7), key directional (1.0–1.4), rim directional (BRAND.primary tinted, 0.3–0.5)
- Key light: upper-right (3, 4, 5) — mimics studio key light
- Rim light: upper-left-back (-4, 2, -3) — separation from background
- Screen: low roughness (0.05), low metalness (0.1) — screens absorb and emit
- Body: higher roughness (0.3–0.4), high metalness (0.8–0.9) — brushed aluminum

## Animation timing

| Beat | Frames | What happens |
|---|---|---|
| Lid opens | 0–40f | BoxGeometry lid rotates from closed (-0.45π) to open (-0.02π) |
| Camera orbits | 0–90f | Camera swings from side angle to front-hero position |
| Screen appears | 40–70f | Screen texture fades in as lid reaches open position |
| Hold | 90–150f | Device held at slight angle, floating (gentle Y sine ±2px) |

## Integration rules
- ATTACHED_IMAGES[0] maps to the MacBook screen texture
- ATTACHED_IMAGES[1] (if present) maps to phone screen in dual-device compositions
- Brand primary color drives rim light tint
- Always add a soft glow bloom (radial gradient div) behind the device at zIndex:-1
- Pair with `MeshGradientBg` for cinematic background depth
- `useVitality(mode: "float")` for subtle Y float after device settles

## Anti-patterns
- DO NOT use CSS perspective for this skill — that's `premium-device-mockup`
- DO NOT import THREE — it's already in scope as `THREE`
- DO NOT import @react-three/fiber — use `ThreeCanvas` from scope
- DO NOT create complex material graphs — keep to StandardMaterial only
- DO NOT use more than 3 lights — performance degrades in browser render
