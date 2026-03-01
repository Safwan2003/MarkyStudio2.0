import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from 'remotion';

// const PRIMARY_COLOR = '#00ff9d'; // Removed in favor of dynamic brand color

import { Scene } from '@/lib/types';
import { ThemeStyles } from '../components/ThemeEngine';

export const Intro = ({ scene, brand, themeStyles }: { scene: Scene, brand?: any, themeStyles: ThemeStyles }) => {
  // --- Dynamic Config ---
  const primaryColor = brand?.accentColor || brand?.primaryColor || '#00ff9d';
  // Use scene screenshot or fallback to the high-res dealership image
  const placeholderImg = scene.screenshotUrl || "https://placehold.co/1920x1080/png";

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Animation Drivers ---

  // 1. The initial pop-in of the heart icon
  const entrance = spring({
    frame,
    fps,
    config: { stiffness: 100, damping: 15, mass: 0.8 },
  });

  // 2. The "Pulse" (Heartbeat) - subtle and continuous
  const heartbeat = Math.sin((frame / fps) * 3 * Math.PI) * 0.03 * entrance;

  // 3. The "Expand" (Reveal video) - happens later
  const expandStart = 45;
  const expand = spring({
    frame: frame - expandStart,
    fps,
    config: { stiffness: 60, damping: 14, mass: 1.5 },
  });

  // Scale logic: Pop in -> Pulse -> Expand to fill screen (optional) or just settle
  const scale = (0.5 + entrance * 0.5) + heartbeat + (expand * 0.2);

  // --- Visual Assets ---

  // Sonar Rings (Matches hook4.png - thin, technical lines)
  const renderSonar = (index: number) => {
    const delay = index * 15;
    const progress = (frame - delay) % 90;
    const active = frame > delay;

    // Ring expansion
    const rScale = interpolate(progress, [0, 90], [0.8, 3]);
    const rOpacity = interpolate(progress, [0, 20, 90], [0, 0.4, 0]);

    if (!active) return null;

    return (
      <div
        key={index}
        style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: 500, height: 500,
          borderRadius: '50%',
          border: `1px solid ${primaryColor}`,
          transform: `translate(-50%, -50%) scale(${rScale})`,
          opacity: rOpacity,
          filter: `drop-shadow(0 0 5px ${primaryColor})`,
        }}
      />
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#020403', overflow: 'hidden' }}>

      {/* 1. CINEMATIC BACKGROUND */}
      <AbsoluteFill>
        {/* Subtle Radial Gradient for focus */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at center, #0a1f14 0%, #000000 70%)`,
          opacity: 0.8,
        }} />

        {/* Noise Texture (Agency feel) */}
        <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.05 }}>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </AbsoluteFill>

      {/* 2. SONAR RINGS */}
      {[0, 1, 2].map(renderSonar)}

      {/* 3. HERO ELEMENT (Heart) */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: 600, height: 600,
        transform: `translate(-50%, -50%) scale(${scale})`,
        filter: `drop-shadow(0 0 30px ${primaryColor}40)`, // Soft glow behind everything
      }}>
        <svg width="600" height="600" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id="heartMask">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </clipPath>

            {/* Neon Glow Filter */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* A. The Image/Video Container (Masked) */}
          <foreignObject x="0" y="0" width="24" height="24" clipPath="url(#heartMask)">
            <div style={{
              width: '100%', height: '100%',
              background: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Img
                src={placeholderImg}
                style={{
                  width: '120%', height: '120%',
                  objectFit: 'cover',
                  opacity: interpolate(entrance, [0, 1], [0, 1]),
                  // Subtle zoom out inside the mask (Cinematic effect)
                  transform: `scale(${interpolate(frame, [0, 100], [1.2, 1])})`,
                }}
              />
              {/* Internal Shadow for depth */}
              <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)' }} />
            </div>
          </foreignObject>

          {/* B. The Neon Stroke (Border) */}
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="none"
            stroke={primaryColor}
            strokeWidth={interpolate(expand, [0, 1], [0.8, 0.3])} // Thins out as it gets larger
            strokeLinecap="round"
            filter="url(#neonGlow)"
            style={{ opacity: 1 }}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};