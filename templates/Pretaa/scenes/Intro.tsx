import React, { useMemo } from 'react';
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
} from 'remotion';
import { Scene } from '@/lib/types';
import { GradientBlob } from '../components/GradientBlob';

// --- High-End SaaS Design Tokens ---
const THEME = {
    bg: '#FFFFFF',       // Pure studio white
    dot: '#94A3B8',      // Slate-400 (subtle connection grey)
    primary: '#6366f1',  // Indigo brand color for ripple
    // Ultra-soft, deep ambient shadow for big elements
    shadow: '0 30px 60px -12px rgba(0, 0, 0, 0.12), 0 18px 36px -18px rgba(0, 0, 0, 0.08)',
};

// --- Curated Professional Avatars (Unsplash IDs) ---
const PROFESSIONAL_AVATARS = [
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&h=500&fit=crop', // Professional Man 1
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&h=500&fit=crop', // Professional Woman 1
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&h=500&fit=crop', // Professional Man 2
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&h=500&fit=crop', // Professional Woman 2
];

// --- Helper: The Perfect "Polka Dot" Connector ---
const ConnectionLine = ({ start, end, delay }: { start: { x: number, y: number }, end: { x: number, y: number }, delay: number }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // Organic arch control point
    const cpX = midX - dy * 0.2;
    const cpY = midY + dx * 0.2;

    const pathData = `M ${start.x} ${start.y} Q ${cpX} ${cpY} ${end.x} ${end.y}`;
    const len = Math.sqrt(dx * dx + dy * dy) * 1.2;

    // Animation: "Travel" effect
    const progress = spring({ frame: frame - delay, fps, config: { stiffness: 40, damping: 20 } });
    const dashOffset = interpolate(progress, [0, 1], [len, 0]);

    return (
        <path
            d={pathData}
            stroke={THEME.dot}
            strokeWidth="3.5" // Slightly thicker for impact
            strokeLinecap="round" // ESSENTIAL for round dots
            strokeDasharray="0 16" // Wide spacing for clean look
            strokeDashoffset={dashOffset}
            fill="none"
            style={{ opacity: 0.5 }}
        />
    );
};

// --- Helper: BIG Avatar with Pop & Ripple ---
const AvatarNode = ({ src, size, x, y, delay }: { src: string, size: number, x: number, y: number, delay: number }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // 1. Elastic Pop Entrance (Overshoot)
    const scale = spring({
        frame: frame - delay,
        fps,
        config: { stiffness: 160, damping: 12, mass: 1.2 }
    });

    // 2. Shockwave Ripple Ring
    const rippleFrame = frame - delay;
    const rippleScale = interpolate(rippleFrame, [0, 30], [0.8, 2.2], { extrapolateRight: 'clamp' });
    const rippleOpacity = interpolate(rippleFrame, [0, 25], [0.5, 0], { extrapolateRight: 'clamp' });

    // 3. Gentle Studio Float
    const floatY = Math.sin((frame / 50) + x) * 6;

    if (frame < delay) return null;

    return (
        <div style={{ position: 'absolute', left: x, top: y, zIndex: 20 }}>
            {/* Ripple Effect */}
            <div style={{
                position: 'absolute', left: '50%', top: '50%',
                width: size, height: size, borderRadius: '50%',
                border: `2px solid ${THEME.primary}`,
                transform: `translate(-50%, -50%) scale(${rippleScale})`,
                opacity: rippleOpacity,
            }} />

            {/* Main Avatar */}
            <div style={{
                width: size, height: size,
                transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
                borderRadius: '50%',
                backgroundColor: '#fff',
                padding: 8, // Thick, crisp white border
                boxShadow: THEME.shadow,
            }}>
                <img src={src} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            </div>
        </div>
    );
};

export const Intro: React.FC<{ scene: Scene }> = ({ scene }) => {
    const { width, height } = useVideoConfig();
    const frame = useCurrentFrame();

    // Use curated avatars if no scene data provided
    const avatars = useMemo(() => {
        const list = scene.testimonials?.map(t => t.avatar) || [];
        return [...list, ...PROFESSIONAL_AVATARS].slice(0, 4);
    }, [scene.testimonials]);

    // Layout: "Kite" shape with BIG sizes
    const nodes = [
        { id: 0, x: width * 0.25, y: height * 0.32, size: 190 }, // Top Left (Hero)
        { id: 1, x: width * 0.75, y: height * 0.28, size: 160 }, // Top Right
        { id: 2, x: width * 0.32, y: height * 0.72, size: 170 }, // Bottom Left
        { id: 3, x: width * 0.72, y: height * 0.68, size: 165 }, // Bottom Right
    ];

    // Sequence Timing
    const sequence = [
        { type: 'AVATAR', index: 0, at: 15 },
        { type: 'LINE', from: 0, to: 1, at: 30 },
        { type: 'AVATAR', index: 1, at: 45 },
        { type: 'LINE', from: 1, to: 3, at: 60 },
        { type: 'AVATAR', index: 3, at: 75 },
        { type: 'LINE', from: 3, to: 2, at: 90 },
        { type: 'AVATAR', index: 2, at: 105 },
    ];

    // Very subtle background fade-in
    const bgOpacity = interpolate(frame, [0, 20], [0, 0.8]);

    return (
        <AbsoluteFill style={{ backgroundColor: THEME.bg, overflow: 'hidden' }}>
            {/* Ultra-subtle atmosphere */}
            <AbsoluteFill style={{ opacity: bgOpacity }}>
                <GradientBlob color="#F1F5F9" x={width * 0.2} y={height * 0.3} size={1000} opacity={0.5} speed={0.1} />
                <GradientBlob color="#EDE9FE" x={width * 0.8} y={height * 0.7} size={1000} opacity={0.4} speed={0.1} />
            </AbsoluteFill>

            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                {sequence.map((step, i) => step.type === 'LINE' && (
                    <ConnectionLine key={i} start={nodes[step.from]} end={nodes[step.to]} delay={step.at} />
                ))}
            </svg>

            {nodes.map((node, i) => {
                const step = sequence.find(s => s.type === 'AVATAR' && s.index === i);
                return step && <AvatarNode key={i} src={avatars[i]} x={node.x} y={node.y} size={node.size} delay={step.at} />;
            })}

            {/* Restored Dynamic Headline */}
            {scene.mainText && (
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 40,
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    <h1 style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 90,
                        fontWeight: 800,
                        color: '#1e293b',
                        letterSpacing: '-0.04em',
                        margin: 0,
                        lineHeight: 1.1,
                        textShadow: '0 20px 40px rgba(255,255,255,0.8), 0 5px 15px rgba(0,0,0,0.1)',
                        opacity: interpolate(frame, [10, 40], [0, 1]),
                        transform: `scale(${interpolate(spring({ frame: frame - 10, fps: 30 }), [0, 1], [0.9, 1])})`
                    }}>
                        {scene.mainText}
                    </h1>
                </div>
            )}

        </AbsoluteFill>
    );
};