import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';

// --- Configuration ---
import { Scene } from '@/lib/types';
import { ThemeStyles } from '../components/ThemeEngine';

export const SocialProof = ({ scene, themeStyles, brand }: { scene: Scene, themeStyles: ThemeStyles, brand?: any }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // --- Dynamic Data ---
  const BRAND_GREEN = themeStyles.colors?.primary || '#00d084';
  const TEXT_DARK = themeStyles.text.color || '#1f2937';
  const TEXT_MUTED = themeStyles.colors?.secondary || '#64748b';

  // Use testimonials or fallback mock data
  // Helper for safe avatar resolution
  const getAvatar = (src?: string, fallbackSeed?: string) => {
    if (src && typeof src === 'string' && src.trim().length > 0) return src;
    return `https://i.pravatar.cc/150?u=${fallbackSeed || 'user'}`;
  };

  // Use testimonials or fallback mock data
  const rawProfile = scene.testimonials?.[0];
  const primaryProfile = {
    author: rawProfile?.author || "Melissa Johnson",
    role: rawProfile?.role || "2024 Model X • Finance", // Using role as car model/deal info
    avatar: getAvatar(rawProfile?.avatar, "melissa")
  };

  const advisorName = scene.testimonials?.[0]?.author?.split(' ')[0] || `${(brand?.name || 'Desklog')} Advisor`;
  const advisorImg = scene.testimonials?.[0]?.avatar || "https://i.pravatar.cc/150?u=advisor";

  const queueProfiles = (scene.testimonials?.slice(1) || []).map(t => ({
    name: (t.author || 'User').split(' ')[0],
    status: "Verified",
    color: "#f59e0b",
    img: getAvatar(t.avatar, t.author)
  }));

  // Ensure we have enough queue items
  while (queueProfiles.length < 3) {
    const names = ["Sarah", "Mike", "Lisa"];
    const i = queueProfiles.length;
    queueProfiles.push({
      name: names[i] || `User${i}`,
      status: i === 0 ? "Busy" : "Away",
      color: i === 0 ? "#f59e0b" : "#ef4444",
      img: getAvatar(undefined, `${i}`)
    });
  }

  const QUEUE_DATA = [
    { name: advisorName, img: advisorImg, status: "Available", color: BRAND_GREEN },
    ...queueProfiles
  ];

  // --- Animation Orchestration ---

  // 1. Queue Entrance (Elastic) - Removed unused spring


  // 2. Transition Trigger (Queue leaves, Card enters)
  const transitionStart = 60;
  const transition = spring({
    frame: frame - transitionStart,
    fps,
    config: { stiffness: 50, damping: 14 } // Smooth slide
  });

  // 3. Dark Mode Expansion (The "Success" moment)
  const darkModeStart = 120;
  const darkMode = spring({
    frame: frame - darkModeStart,
    fps,
    config: { stiffness: 40, damping: 20 }
  });

  // --- Dynamic Values ---

  // Camera/Background Movement
  const bgPan = interpolate(frame, [0, 200], [0, -100]);

  // Queue exits by scaling down and moving up
  const queueScale = interpolate(transition, [0, 1], [1, 0.8]);
  const queueOpacity = interpolate(transition, [0, 0.5], [1, 0]);
  const queueY = interpolate(transition, [0, 1], [0, -300]);

  // Card enters from bottom with tilt
  const cardY = interpolate(transition, [0, 1], [800, 0]);
  const cardTilt = interpolate(transition, [0, 1], [15, 0]);

  // Dark mode radial expansion
  const darkScale = interpolate(darkMode, [0, 1], [0, 3.5]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#f0fdf4', overflow: 'hidden' }}>

      {/* 1. LIGHT MODE BACKGROUND (Clean Grid) */}
      <AbsoluteFill>
        <div style={{
          position: 'absolute', inset: -100,
          backgroundImage: `
            radial-gradient(${BRAND_GREEN}44 1px, transparent 1px),
            radial-gradient(${BRAND_GREEN}22 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
          transform: `translateY(${bgPan}px)`,
          opacity: 0.5
        }} />
      </AbsoluteFill>

      {/* 2. QUEUE SYSTEM (The Verification Phase) */}
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center',
        transform: `translateY(${queueY}px) scale(${queueScale})`,
        opacity: queueOpacity
      }}>
        {/* SVG Connector Line */}
        <svg width={width} height={600} style={{ position: 'absolute', top: '25%' }}>
          <path
            d="M 100 300 C 400 300, 600 400, 960 400 S 1500 200, 1900 200"
            fill="none" stroke="#cbd5e1" strokeWidth="4"
            strokeDasharray="10 15" strokeLinecap="round"
            style={{ strokeDashoffset: -frame * 3 }}
          />
        </svg>

        {/* Avatars */}
        <div style={{ display: 'flex', gap: 150, marginTop: 100 }}>
          {QUEUE_DATA.map((user, i) => {
            // Staggered bounce for each avatar
            const delay = i * 6;
            const itemScale = spring({
              frame: frame - delay,
              fps,
              config: { stiffness: 120, damping: 10 }
            });

            // Subtle floating for liveliness
            const float = Math.sin((frame + i * 20) / 30) * 10;

            return (
              <div key={i} style={{
                transform: `scale(${itemScale}) translateY(${float}px)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                position: 'relative' // relative position for flow
              }}>
                {/* Avatar Ring */}
                <div style={{
                  width: 140, height: 140,
                  borderRadius: '50%',
                  padding: 5,
                  background: 'white',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                  border: user.status === 'Available' ? `3px solid ${BRAND_GREEN}` : '3px solid transparent'
                }}>
                  <Img
                    src={user.img}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                </div>

                {/* Status Pill */}
                <div style={{
                  marginTop: 15,
                  background: user.color,
                  color: 'white',
                  padding: '8px 24px',
                  borderRadius: 30,
                  fontSize: 18, fontWeight: 700,
                  boxShadow: `0 8px 16px -4px ${user.color}66`
                }}>
                  {user.status}
                </div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

      {/* 3. HERO CARD (The Match) */}
      {/* Container centers the card 3D effect */}
      <AbsoluteFill style={{
        perspective: 2000,
        justifyContent: 'center', alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{
          transform: `translateY(${cardY}px) rotateX(${cardTilt}deg)`,
          opacity: interpolate(transition, [0, 0.3], [0, 1]),
          position: 'relative'
        }}>

          {/* A. Background Stack Elements (Depth) */}
          {[1, 2].map(depth => (
            <div key={depth} style={{
              position: 'absolute',
              top: -depth * 25,
              left: '50%', transform: 'translateX(-50%) scale(0.95)',
              width: 750, height: 380,
              background: 'white', borderRadius: 40,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              zIndex: -depth,
              opacity: 0.6
            }} />
          ))}

          {/* B. Main Card */}
          <div style={{
            width: 800,
            background: 'white',
            borderRadius: 40,
            padding: 50,
            boxShadow: `
              0 50px 100px -20px rgba(0,0,0,0.1),
              0 0 0 1px rgba(0,0,0,0.02)
            `,
            display: 'flex', gap: 50, alignItems: 'center',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Subtle Glare/Gradient on the card */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)',
              pointerEvents: 'none'
            }} />

            {/* Left: Customer Avatar */}
            <div style={{ position: 'relative' }}>
              <Img
                src={primaryProfile.avatar}
                style={{ width: 200, height: 200, borderRadius: '50%', objectFit: 'cover' }}
              />
              {/* Floating Badge */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 70, height: 70,
                borderRadius: '50%', background: 'white',
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: BRAND_GREEN }} />
              </div>
            </div>

            {/* Right: Details */}
            <div style={{ flex: 1, zIndex: 1 }}>
              <div style={{ fontSize: 18, color: BRAND_GREEN, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>
                {scene.mainText || 'PROFILE MATCHED'}
              </div>
              <h1 style={{ fontSize: 52, margin: 0, color: TEXT_DARK, fontWeight: 800 }}>
                {primaryProfile.author}
              </h1>
              <div style={{ height: 30 }} />
              {[
                { icon: "📄", val: primaryProfile.role || "Verified Lead" },
                { icon: "📞", val: "Contact Available" },
                { icon: "📍", val: "Location Matched" }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12,
                  opacity: 0.8
                }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ fontSize: 24, color: TEXT_MUTED, fontWeight: 500 }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* 4. DARK MODE TRANSITION (The "Success" State) */}
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center',
        pointerEvents: 'none'
      }}>
        {/* The Expanding Circle Mask */}
        <div style={{
          width: 1000, height: 1000,
          borderRadius: '50%',
          background: '#050a08', // Dark background color
          transform: `scale(${darkScale})`,
          position: 'absolute',
        }} />

        {/* Content Reveal (Success Text) */}
        <AbsoluteFill style={{
          justifyContent: 'center', alignItems: 'center',
          opacity: interpolate(darkMode, [0.3, 0.8], [0, 1]), // Fade in after dark bg covers screen
          zIndex: 20
        }}>
          <div style={{ textAlign: 'center', transform: `translateY(${interpolate(darkMode, [0, 1], [50, 0])}px)` }}>
            <h1 style={{
              fontSize: 80, color: 'white', margin: 0, fontWeight: 900,
              textShadow: `0 10px 30px ${BRAND_GREEN}66`
            }}>
              {scene.subText || 'Thank You!'}
            </h1>
            <p style={{ fontSize: 32, color: '#94a3b8', marginTop: 20 }}>
              <span style={{ color: BRAND_GREEN, fontWeight: 'bold' }}>{advisorName}</span> is ready for you.
            </p>

            {/* Advisor Avatar Pop-in */}
            <div style={{
              marginTop: 60, width: 180, height: 180, borderRadius: '50%',
              border: `4px solid ${BRAND_GREEN}`, padding: 5,
              background: 'rgba(0,208,132,0.1)',
              boxShadow: `0 0 60px ${BRAND_GREEN}44`
            }}>
              <Img
                src={advisorImg}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};