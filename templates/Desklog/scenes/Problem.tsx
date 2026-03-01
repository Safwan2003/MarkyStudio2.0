import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  random,
  Easing,
} from 'remotion';
import { Scene } from '@/lib/types';
import { ThemeStyles } from '../components/ThemeEngine';

export const Problem = ({ scene, brand, themeStyles }: { scene: Scene, brand?: any, themeStyles: ThemeStyles }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // --- Dynamic Config ---
  const PRIMARY_COLOR = brand?.accentColor || brand?.primaryColor || '#00ff9d';
  const GRID_SIZE = 80;

  // Configuration for the Process Stages
  const defaultStages = [
    { label: "Check In", x: 250, y: 850, rot: -6 },
    { label: "Test Drive", x: 650, y: 650, rot: 8 },
    { label: "Write Up", x: 1150, y: 450, rot: -4 },
    { label: "F&I", x: 350, y: 750, rot: 12 },
    { label: "Active Delivery", x: 800, y: 550, rot: -3 },
    { label: "Sold", x: 1650, y: 250, rot: 5 },
  ];

  const STAGES = scene.features && scene.features.length > 0
    ? scene.features.map((f, i) => ({
      label: f.title,
      x: defaultStages[i % 6].x,
      y: defaultStages[i % 6].y,
      rot: defaultStages[i % 6].rot
    }))
    : defaultStages;

  // --- Animation Timeline ---
  const chaosStart = 75;

  // 1. Path Drawing (Smooth Ease Out)
  const drawProgress = spring({
    frame, fps,
    config: { stiffness: 40, damping: 200 }
  });

  // 2. The Chaos "Crash" Spring (Heavy Physics)
  const chaos = spring({
    frame: frame - chaosStart, fps,
    config: { stiffness: 120, damping: 14, mass: 2 },
  });

  // 3. Impact Flash (White screen glitch)
  const impactFlash = interpolate(frame, [chaosStart, chaosStart + 4, chaosStart + 12], [0, 0.3, 0], { extrapolateRight: 'clamp' });

  // 4. Path Pulse (Voltage buildup before break)
  const pulse = Math.sin(frame / 5) * 2; 

  // --- Visual States ---
  const pathOpacity = interpolate(chaos, [0, 0.1], [1, 0]);
  const ghostPathOpacity = interpolate(chaos, [0, 0.4], [0, 0.25]);

  // --- Debris Particle System ---
  const particles = useMemo(() => {
    return new Array(20).fill(0).map((_, i) => ({
      x: random(i) * width,
      y: random(i + 100) * height,
      size: random(i + 200) * 8 + 2,
      rotation: random(i + 300) * 360,
      velocity: random(i + 400) * 20 + 10,
      angle: random(i + 500) * Math.PI * 2,
    }));
  }, [width, height]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#020403', overflow: 'hidden' }}>

      {/* --- A. ATMOSPHERE & DEPTH --- */}
      <AbsoluteFill>
        {/* Deep Aurora Gradient */}
        <div style={{
          position: 'absolute', inset: -200,
          background: `
            radial-gradient(circle at 20% 80%, ${PRIMARY_COLOR}22 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, #064e3b 0%, transparent 50%)
          `,
          filter: 'blur(100px)',
          opacity: 0.6,
          transform: `scale(1.1) rotate(${frame * 0.05}deg)`
        }} />
        
        {/* Animated Tech Grid */}
        <div style={{
          position: 'absolute', inset: -100,
          backgroundImage: `
            linear-gradient(${PRIMARY_COLOR}11 1px, transparent 1px),
            linear-gradient(90deg, ${PRIMARY_COLOR}11 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          transform: `perspective(800px) rotateX(20deg) translateY(${frame * 0.5}px)`,
          opacity: 0.3,
          maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
        }} />
      </AbsoluteFill>

      {/* --- B. PATHS SYSTEM --- */}
      <svg width={width} height={height} style={{ position: 'absolute', overflow: 'visible' }}>
        <defs>
          <filter id="neonPath" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Broken Ghost Path (Appears on Chaos) */}
        <path
          d="M -50 950 C 400 950, 600 700, 960 600 S 1500 300, 1970 150"
          fill="none" stroke={PRIMARY_COLOR} strokeWidth="2"
          strokeDasharray="0 15" strokeLinecap="round"
          style={{ opacity: ghostPathOpacity }}
        />

        {/* 2. Active Neon Path (Disappears on Chaos) */}
        <path
          d="M -50 950 C 400 950, 600 700, 960 600 S 1500 300, 1970 150"
          fill="none" stroke={PRIMARY_COLOR} 
          strokeWidth={4 + pulse} // Pulsating width
          strokeLinecap="round"
          filter="url(#neonPath)"
          strokeDasharray={2600}
          strokeDashoffset={2600 * (1 - drawProgress)}
          style={{ opacity: pathOpacity }}
        />
      </svg>

      {/* --- C. NODES (The Crash) --- */}
      {STAGES.map((node, i) => {
        // Staggered Entrance
        const entrance = spring({
          frame: frame - (i * 8), fps,
          config: { stiffness: 100, damping: 15 }
        });

        // CHAOS PHYSICS
        const seed = i * 999;
        // The "Pile Up" Target Coordinates
        const crashX = 960 + (random(seed) - 0.5) * 500;
        const crashY = 540 + (random(seed + 1) - 0.5) * 300;
        const crashRot = (random(seed + 2) - 0.5) * 120; // Extreme rotation

        const currentX = interpolate(chaos, [0, 1], [node.x, crashX]);
        const currentY = interpolate(chaos, [0, 1], [node.y, crashY]);
        const currentRot = interpolate(chaos, [0, 1], [node.rot, crashRot]);
        
        // Impact Jitter (Vibration)
        const jitterX = chaos > 0 && chaos < 1 ? (random(frame + i) - 0.5) * 10 * (1 - chaos) : 0;
        const jitterY = chaos > 0 && chaos < 1 ? (random(frame + i + 10) - 0.5) * 10 * (1 - chaos) : 0;

        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: 0, top: 0,
              transform: `
                translate(${currentX + jitterX}px, ${currentY + jitterY}px)
                translate(-50%, -50%)
                scale(${entrance})
                rotate(${currentRot}deg)
              `,
              zIndex: 100 + i,
            }}
          >
            {/* Glass Pill */}
            <div style={{
              padding: '18px 48px',
              borderRadius: '60px',
              background: `linear-gradient(160deg, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.7) 100%)`,
              boxShadow: `
                inset 0 1px 0 rgba(255,255,255,0.2), 
                0 0 0 1px ${PRIMARY_COLOR}44, 
                0 20px 50px -10px rgba(0,0,0,0.8)
              `,
              backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{
                color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '26px',
                letterSpacing: '-0.02em', textShadow: `0 2px 10px rgba(0,0,0,0.5)`
              }}>
                {node.label}
              </span>
            </div>

            {/* Connector Dot */}
            <div style={{
              position: 'absolute', bottom: -20, left: '50%',
              width: 12, height: 12, borderRadius: '50%', background: PRIMARY_COLOR,
              transform: 'translateX(-50%)',
              boxShadow: `0 0 15px ${PRIMARY_COLOR}`,
              opacity: interpolate(chaos, [0, 0.05], [1, 0]),
            }} />
          </div>
        );
      })}

      {/* --- D. EXPLOSIVE DEBRIS (Glass Shards) --- */}
      {chaos > 0.01 && particles.map((p, i) => {
        // Explosion Physics
        const t = (frame - chaosStart) * 1.5;
        if (t < 0) return null;
        
        const x = width/2 + Math.cos(p.angle) * p.velocity * t;
        const y = height/2 + Math.sin(p.angle) * p.velocity * t;
        const op = interpolate(t, [0, 10, 40], [0, 0.6, 0]);

        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y,
            width: p.size, height: p.size,
            background: PRIMARY_COLOR,
            opacity: op,
            transform: `rotate(${p.rotation + t * 10}deg)`,
            clipPath: i % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none', // Triangles & Squares
            boxShadow: `0 0 10px ${PRIMARY_COLOR}`
          }} />
        )
      })}

      {/* --- E. IMPACT FLASH --- */}
      <AbsoluteFill style={{
        backgroundColor: 'white',
        opacity: impactFlash,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />

      {/* --- F. VIGNETTE --- */}
      <AbsoluteFill style={{
        background: 'radial-gradient(circle at center, transparent 30%, #000000 100%)',
        pointerEvents: 'none', opacity: 0.7
      }} />

    </AbsoluteFill>
  );
};