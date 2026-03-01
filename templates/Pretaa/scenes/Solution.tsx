import React, { useMemo } from 'react';
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Easing
} from 'remotion';
import { Scene } from '@/lib/types';
import { GradientBlob } from '../components/GradientBlob';

// --- 1. High-End Studio Tokens ---
const THEME = {
    bg: '#FFFFFF',       // Pure studio white
    text: '#1e1b4b',     // Deep navy for logo
    path: '#334155',     // Slate-700 for the growth curve
    primary: '#6366f1',  // Indigo brand accent
    accent: '#0EA5E9',   // Sky blue for charts
    // Multi-layered ambient shadow for floating elements
    shadow: '0 30px 60px -15px rgba(0,0,0,0.1), 0 15px 25px -10px rgba(0,0,0,0.05)',
};

// --- 2. Refined Assets ---

// The "Time is Money" Icon (Polished)
const TimeMoneyIcon = () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="48" fill="white" stroke="#E2E8F0" strokeWidth="2" />
        {/* Clock details */}
        <circle cx="50" cy="50" r="40" stroke={THEME.path} strokeWidth="4" />
        <path d="M50 50 L50 22" stroke={THEME.path} strokeWidth="4" strokeLinecap="round" />
        <path d="M50 50 L75 50" stroke={THEME.path} strokeWidth="4" strokeLinecap="round" />
        {/* Dollar Badge */}
        <g transform="translate(65, 65)">
            <circle cx="15" cy="15" r="22" fill={THEME.path} stroke="white" strokeWidth="3" />
            <text x="15" y="24" textAnchor="middle" fill="white" fontSize="26" fontFamily="sans-serif" fontWeight="bold">$</text>
        </g>
    </svg>
);



// --- 3. Math Helper for Smooth Path Following ---
// Calculates a point on a Cubic Bezier curve at a specific t (0-1)
const getBezierPoint = (t: number, p0: Point, p1: Point, p2: Point, p3: Point) => {
    const cX = 3 * (p1.x - p0.x);
    const bX = 3 * (p2.x - p1.x) - cX;
    const aX = p3.x - p0.x - cX - bX;
    const cY = 3 * (p1.y - p0.y);
    const bY = 3 * (p2.y - p1.y) - cY;
    const aY = p3.y - p0.y - cY - bY;
    const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
    const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;
    return { x, y };
};
type Point = { x: number, y: number };


// --- 4. Main Component ---

export const Solution: React.FC<{ scene: Scene; brand?: any }> = ({ scene, brand }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // --- A. The exact "Growth Path" Geometry ---
    // Define the 4 control points for the cubic bezier curve
    const p0 = { x: width * 0.15, y: height * 0.8 }; // Start (Bottom Left)
    const p1 = { x: width * 0.4, y: height * 0.9 };  // Control 1 (Dip down slightly)
    const p2 = { x: width * 0.5, y: height * 0.4 };  // Control 2 (Sweep up)
    const p3 = { x: width * 0.85, y: height * 0.15 }; // End (Top Right)
    const pathString = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

    // --- B. Timeline & Animation Config ---
    // 0-40: Entrance (Hero pops up)
    // 40-120: Icon travels the path
    // 110-140: Seamless transition to logo

    const entranceSpring = spring({ frame, fps, config: { stiffness: 80, damping: 15 } });

    const travelProgress = spring({
        frame: frame - 40, fps, config: { damping: 25, mass: 1.2 }, // Slower, smoother glide
    });

    // Calculate exact icon position based on progress
    const iconPos = getBezierPoint(travelProgress, p0, p1, p2, p3);

    // Transition opacities
    // Fade out hero elements as icon nears the end
    const heroOpacity = interpolate(travelProgress, [0.8, 1], [1, 0], { extrapolateRight: 'clamp' });
    // Scale them down slightly for a dynamic exit
    const heroExitScale = interpolate(travelProgress, [0.8, 1], [1, 0.9], { extrapolateRight: 'clamp' });

    // Logo reveal starts just before travel ends
    const logoEntrance = spring({
        frame: frame - 115, fps, config: { stiffness: 120, damping: 20 }
    });


    return (
        <AbsoluteFill style={{ backgroundColor: THEME.bg, overflow: 'hidden' }}>

            {/* 1. Clean Studio Atmosphere */}
            <GradientBlob color="#F8FAFC" x={width * 0.3} y={height * 0.4} size={1200} opacity={0.7} />
            <GradientBlob color="#F1F5F9" x={width * 0.7} y={height * 0.6} size={1200} opacity={0.6} />

            {/* 2. Phase 1: The Solution Path */}
            <div style={{ opacity: heroOpacity, transform: `scale(${heroExitScale})`, transition: 'all 0.2s ease-out', width: '100%', height: '100%' }}>

                {/* Background Dashed Path */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <path d={pathString} stroke={THEME.path} strokeWidth="3" strokeDasharray="8 12" fill="none" strokeLinecap="round" opacity={0.3} />
                    {/* Arrow Head at end */}
                    <path d={`M ${p3.x - 15} ${p3.y + 20} L ${p3.x} ${p3.y} L ${p3.x + 15} ${p3.y + 10}`} stroke={THEME.path} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
                </svg>

                {/* Central Hero Avatar */}
                <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: `translate(-50%, -50%) scale(${entranceSpring})`,
                    zIndex: 10
                }}>
                    <div style={{
                        width: 180, height: 180, borderRadius: '50%',
                        backgroundColor: '#fff', padding: 10,
                        boxShadow: THEME.shadow
                    }}>
                        <img
                            src={scene.testimonials?.[0]?.avatar || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&h=500&fit=crop"}
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>
                </div>

                {/* Dynamic Floating UI Cards */}
                {/* Feature 1 (Left) */}
                <div style={{ position: 'absolute', left: '28%', top: '42%', transform: `scale(${entranceSpring})` }}>
                    <div style={{
                        background: 'white', borderRadius: 20, padding: '12px 16px',
                        boxShadow: THEME.shadow, display: 'flex', alignItems: 'center', gap: 10,
                        minWidth: 140
                    }}>
                        <div style={{ width: 32, height: 32, background: THEME.accent, borderRadius: 8, opacity: 0.2 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text }}>
                                {typeof scene.features?.[0] === 'string' ? scene.features[0] : scene.features?.[0]?.title || "Growth"}
                            </span>
                            <span style={{ fontSize: 10, color: '#64748B' }}>Active</span>
                        </div>
                    </div>
                </div>

                {/* Feature 2 (Right) */}
                <div style={{
                    position: 'absolute', left: '72%', top: '48%',
                    transform: `scale(${spring({ frame: frame - 5, fps })})`,
                    background: 'white', borderRadius: 24, boxShadow: THEME.shadow,
                    padding: 12, display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${THEME.primary}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Simple Dot for "Active" */}
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: THEME.primary }} />
                    </div>
                    {scene.features?.[1] && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text, maxWidth: 80, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {typeof scene.features[1] === 'string' ? scene.features[1] : scene.features[1]?.title}
                        </span>
                    )}
                </div>

                {/* The Traveling Icon */}
                <div style={{
                    position: 'absolute',
                    left: iconPos.x, top: iconPos.y,
                    width: 110, height: 110,
                    // Subtle rotation based on progress for realism
                    transform: `translate(-50%, -50%) scale(${entranceSpring}) rotate(${interpolate(travelProgress, [0, 1], [-15, 5])}deg)`,
                    zIndex: 20,
                }}>
                    <div style={{ width: '100%', height: '100%', background: 'white', borderRadius: '50%', boxShadow: THEME.shadow }}>
                        <TimeMoneyIcon />
                    </div>
                </div>
            </div>

            {/* 3. Phase 2: Clean Logo Reveal */}
            {frame > 110 && (
                <div style={{
                    position: 'absolute', left: '50%', top: '50%',
                    transform: `translate(-50%, -50%) scale(${logoEntrance})`,
                    opacity: logoEntrance,
                    textAlign: 'center', zIndex: 50
                }}>
                    {brand?.logoUrl ? (
                        <img src={brand.logoUrl} height={120} style={{ objectFit: 'contain' }} />
                    ) : (
                        <h1 style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: 120,
                            fontWeight: 900,
                            color: THEME.text,
                            letterSpacing: '-0.04em',
                            margin: 0,
                            lineHeight: 1
                        }}>
                            {brand?.name || 'pretaa'}<span style={{ color: THEME.primary }}>.</span>
                        </h1>
                    )}
                </div>
            )}
        </AbsoluteFill>
    );
};