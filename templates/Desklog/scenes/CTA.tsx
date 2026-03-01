import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  Easing,
  random,
} from 'remotion';
import { Sparkles } from 'lucide-react';
import { Scene } from '@/lib/types';
import { ThemeStyles } from '../components/ThemeEngine';

// --- Configuration ---
const BRAND_GREEN = '#10b981'; // Emerald 500 - Professional Green
const TEXT_DARK = '#111827';
const AVATAR_SIZE = 160;

// Avatar helper for safe resolution
const getAvatar = (src?: string, seed?: string) => {
  if (src && typeof src === 'string' && src.trim().length > 0) return src;
  return `https://i.pravatar.cc/300?u=${seed || 'user'}`;
};

export const CTA = ({ scene, themeStyles, brand }: { scene: Scene, themeStyles: ThemeStyles, brand?: any }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // --- Dynamic Content ---
  const title = scene.mainText || 'Make sales easier';
  const subtitle = scene.subText || 'for your showroom sales team';
  const ctaButton = scene.ctaText || 'Get a demo now';
  const ctaLink = scene.ctaUrl || 'Visit desklog.ai';
  const brandName = brand?.name ? brand.name.toLowerCase() : 'desklog';

  // Dynamic avatars from testimonials or fallback
  const AVATARS = scene.testimonials && scene.testimonials.length > 0
    ? scene.testimonials.slice(0, 5).map((t, i) => getAvatar(t.avatar, t.author || `user${i}`))
    : [
      "https://i.pravatar.cc/300?u=alex",
      "https://i.pravatar.cc/300?u=jordan",
      "https://i.pravatar.cc/300?u=taylor",
      "https://i.pravatar.cc/300?u=morgan",
      "https://i.pravatar.cc/300?u=casey",
    ];

  // --- Animation Phasing ---
  // 0-40: Avatars Pop in sequence
  // 30-70: Text Reveal
  // 110+: Finale Transition

  // 1. Text Reveal
  const textEntrance = spring({
    frame: frame - 30,
    fps,
    config: { stiffness: 80, damping: 20 }
  });

  // --- Dynamic Timing ---
  const durationInFrames = Math.floor(scene.duration * fps);
  // Reserve last 3 seconds (90 frames) for Finale.
  // If scene is short, ensure at least 2 seconds (60 frames) for main content,
  // or split 50/50 if extremely short.
  const finaleDuration = 90;
  const minMainDuration = 60;

  let finaleStart = durationInFrames - finaleDuration;
  if (finaleStart < minMainDuration) {
    // If video is too short to accomodate 3s finale + 2s main,
    // compromise: Start finale at roughly 60% of video
    finaleStart = Math.floor(durationInFrames * 0.6);
  }

  // A. Exit Main Content (Slide Up + Fade Out)
  const mainContentExit = spring({
    frame: frame - finaleStart,
    fps,
    config: { stiffness: 80, damping: 20 },
    durationInFrames: 20
  });

  const mainContentOpacity = interpolate(mainContentExit, [0, 1], [1, 0]);
  const mainContentY = interpolate(mainContentExit, [0, 1], [0, -100]);

  // B. Enter Finale Content (Slide Up + Fade In)
  const finaleEntrance = spring({
    frame: frame - (finaleStart + 10), // Small delay for overlap
    fps,
    config: { stiffness: 60, damping: 14 }
  });

  const finaleOpacity = interpolate(finaleEntrance, [0, 1], [0, 1]);
  const finaleY = interpolate(finaleEntrance, [0, 1], [100, 0]);

  // --- Arc Calculations ---
  // The arc is convex up (hill). Center is below the viewport.
  const arcRadius = 1400; // Large radius for gentle curve
  const arcCenterY = height + 800; // Center way below screen
  const arcCenterX = width / 2;
  const spreadAngle = 40 * (Math.PI / 180); // Total spread in radians
  const startAngle = -Math.PI / 2 - spreadAngle / 2;

  return (
    <AbsoluteFill style={{
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center'
    }}>

      {/* 1. ANIMATED BACKGROUND GRADIENT */}
      <AbsoluteFill>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 100%, #ecfdf5 0%, #ffffff 60%)', // Very subtle green glow at bottom
          opacity: 0.8
        }} />
      </AbsoluteFill>

      {/* --- PART 1: MAIN CONTENT Group --- */}
      <AbsoluteFill style={{
        opacity: mainContentOpacity,
        transform: `translateY(${mainContentY}px)`
      }}>

        {/* 2. ARC DOTTED LINE */}
        <svg
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <path
            d={`
              M ${arcCenterX + arcRadius * Math.cos(startAngle - 0.2)} ${arcCenterY + arcRadius * Math.sin(startAngle - 0.2)}
              A ${arcRadius} ${arcRadius} 0 0 1 ${arcCenterX + arcRadius * Math.cos(startAngle + spreadAngle + 0.2)} ${arcCenterY + arcRadius * Math.sin(startAngle + spreadAngle + 0.2)}
            `}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="10 20"
            strokeLinecap="round"
            strokeOpacity="0.4"
            style={{
              strokeDashoffset: -frame * 2
            }}
          />
        </svg>

        {/* 3. AVATARS ON ARC */}
        {AVATARS.map((src, i) => {
          // Distribute evenly along the arc
          const step = spreadAngle / (AVATARS.length - 1);
          const angle = startAngle + step * i;

          // Calculate position
          const x = arcCenterX + arcRadius * Math.cos(angle);
          const y = arcCenterY + arcRadius * Math.sin(angle);

          // Animation
          const delay = i * 6; // Stagger
          const scale = spring({
            frame: frame - delay,
            fps,
            config: { stiffness: 180, damping: 12, mass: 0.6 }
          });

          // Floating effect
          const floatY = Math.sin((frame + i * 100) / 40) * 10;

          // Shadow fade-in
          const shadowOpacity = interpolate(scale, [0, 1], [0, 0.2]);

          return (
            <div key={i} style={{
              position: 'absolute',
              left: x,
              top: y + floatY,
              transform: 'translate(-50%, -50%)', // Center on the coordinate
              zIndex: 10
            }}>
              {/* Wrapper for scale anim */}
              <div style={{ transform: `scale(${scale})` }}>
                {/* Avatar Circle */}
                <div style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: '50%',
                  border: '6px solid white',
                  boxShadow: `0 20px 50px -10px rgba(16, 185, 129, ${shadowOpacity})`, // Greenish shadow
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  position: 'relative'
                }}>
                  <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>
          );
        })}

        {/* 4. MAIN TEXT */}
        <div style={{
          position: 'absolute',
          top: height * 0.65, // Below the arc which sits high
          display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
          opacity: textEntrance,
          transform: `translateY(${interpolate(textEntrance, [0, 1], [40, 0])}px)`
        }}>

          <h1 style={{
            fontFamily: themeStyles?.heading?.fontFamily || 'Inter, sans-serif',
            fontSize: 80,
            fontWeight: 800,
            color: BRAND_GREEN, // Green "Make sales easier"
            margin: 0,
            letterSpacing: -2,
            textAlign: 'center',
            lineHeight: 1.1
          }}>
            {title}
          </h1>

          <h2 style={{
            fontFamily: themeStyles?.body?.fontFamily || 'Inter, sans-serif',
            fontSize: 80,
            fontWeight: 600,
            color: TEXT_DARK, // Dark "for your showroom..."
            margin: '10px 0 0 0',
            letterSpacing: -1.5,
            textAlign: 'center',
            lineHeight: 1.1
          }}>
            {subtitle}
          </h2>

        </div>
      </AbsoluteFill>

      {/* --- PART 2: FINALE Group (Enters) --- */}
      <AbsoluteFill style={{
        opacity: finaleOpacity,
        transform: `translateY(${finaleY}px)`,
        justifyContent: 'center', alignItems: 'center',
        flexDirection: 'column', gap: 50,
        zIndex: 20
      }}>

        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Green Icon "D" */}
          <div style={{
            width: 80, height: 80,
            backgroundColor: BRAND_GREEN,
            borderRadius: '50% 0 50% 50%', // Leaf/Abstract D shape
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: 25, height: 25, background: 'white', borderRadius: '50%' }} />
          </div>
          {/* Logo Text */}
          <span style={{
            fontSize: 90, fontWeight: 800, color: '#111827',
            letterSpacing: -4, fontFamily: 'Inter, sans-serif'
          }}>
            {brandName}<span style={{ fontWeight: 400 }}>ai</span>
          </span>
        </div>

        {/* GREEN CTA BUTTON */}
        <div style={{
          padding: '28px 70px',
          backgroundColor: BRAND_GREEN,
          borderRadius: 100,
          boxShadow: '0 20px 60px -10px rgba(16, 185, 129, 0.4)',
          cursor: 'pointer',
          // Subtle pulse
          transform: `scale(${1 + Math.sin(frame / 20) * 0.02})`
        }}>
          <span style={{ color: 'white', fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>
            {ctaButton}
          </span>
        </div>

        {/* WEBSITE LINK */}
        <div style={{ fontSize: 24, color: '#374151', fontWeight: 600, letterSpacing: 0 }}>
          {ctaLink}
        </div>

      </AbsoluteFill>

    </AbsoluteFill>
  );
};