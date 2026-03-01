import React, { useMemo } from 'react';
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Sequence
} from 'remotion';
import { Scene } from '@/lib/types';
import { GradientBlob } from '../components/GradientBlob';

// --- 1. Studio Design Tokens ---
const THEME = {
    bg: '#F8FAFC',
    textMain: '#1E293B',
    textSub: '#64748B',
    accent: '#3B82F6', // Brand Blue
    dark: '#1e1b4b',   // Navy for charts
    // Soft, deep "floating" shadow
    cardShadow: '0 20px 40px -5px rgba(0,0,0,0.1), 0 8px 16px -6px rgba(0,0,0,0.05)',
};

// --- 2. Professional Avatars (Unsplash) ---
const PRO_AVATARS = [
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop', // Woman Glasses
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop', // Man Suit
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop', // Woman Smile
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop', // Man Tie
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop', // Woman Friendly
];

// --- 3. Custom Vector Widgets ---

const StarIcon = ({ delay }: { delay: number }) => {
    const frame = useCurrentFrame();
    const scale = spring({ frame: frame - delay, fps: 30, config: { stiffness: 200 } });
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24" style={{ transform: `scale(${scale})` }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    );
};

// The "Wave" Widget (Top Center in Image 01)
const WidgetWave = () => (
    <svg width="100%" height="100%" viewBox="0 0 80 40" preserveAspectRatio="none">
        <path d="M0,40 L0,15 C20,5 40,25 60,10 S80,5 80,20 L80,40 Z" fill={THEME.dark} />
    </svg>
);

// The "Trend" Widget (Right Side in Image 01)
const WidgetTrend = () => (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Arrow */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={THEME.textMain} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: 0, right: 0 }}>
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
        </svg>
        {/* Bars */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, display: 'flex', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ width: 8, height: 15, background: THEME.textMain, borderRadius: 2, opacity: 0.4 }} />
            <div style={{ width: 8, height: 22, background: THEME.textMain, borderRadius: 2, opacity: 0.7 }} />
            <div style={{ width: 8, height: 30, background: THEME.textMain, borderRadius: 2 }} />
        </div>
    </div>
);

// The "Skeleton Chat" Widget (Left Side in Image 01)
const WidgetChat = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: '70%', height: 4, background: THEME.textMain, borderRadius: 2 }} />
        <div style={{ width: '90%', height: 4, background: THEME.textMain, borderRadius: 2, opacity: 0.5 }} />
        <div style={{ width: '40%', height: 4, background: THEME.textMain, borderRadius: 2, opacity: 0.3 }} />
    </div>
);

// --- 4. Component Wrappers ---

const FloatingCard = ({ children, x, y, delay, type = 'square' }: any) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Physics: Spring Entrance + Gentle Float
    const scale = spring({ frame: frame - delay, fps, config: { stiffness: 150, damping: 15 } });
    const floatY = Math.sin((frame + delay * 10) / 50) * 8;

    const styleMap = {
        square: { width: 90, height: 90, borderRadius: 24, padding: 16 },
        pill: { width: 140, height: 50, borderRadius: 100, padding: '0 20px' },
        rect: { width: 110, height: 70, borderRadius: 18, padding: 12 },
    };

    const styles = styleMap[type as keyof typeof styleMap];

    return (
        <div style={{
            position: 'absolute', left: x, top: y,
            transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
            background: 'white',
            boxShadow: THEME.cardShadow,
            border: '1px solid white',
            ...styles,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            {children}
        </div>
    );
};

// --- 5. Main Scene ---

// --- 5. Main Scene ---

export const SocialProof: React.FC<{ scene: Scene; brand?: any }> = ({ scene, brand }) => {
    const { width, height } = useVideoConfig();
    const frame = useCurrentFrame();

    // Center Animation
    const centerScale = spring({ frame, fps: 30, config: { mass: 1, stiffness: 100 } });

    // --- Dynamic Data ---
    const testimonials = scene.testimonials || [];
    const getAvatar = (idx: number) => testimonials[idx]?.avatar || PRO_AVATARS[idx % PRO_AVATARS.length];
    const getQuote = (idx: number) => testimonials[idx]?.quote || "Excellent service!";

    // --- Layout Strategy: Cloud ---
    // We manually position these to match the "Scatter" look of Image 01 perfectly.
    const cx = width / 2;
    const cy = height / 2;

    const widgets = [
        // Top Left: Text Pill (Dynamic Quote)
        {
            type: 'pill', x: cx - 180, y: cy - 120,
            content: testimonials[0] ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <img src={getAvatar(0)} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: THEME.textMain }}>"{getQuote(0).slice(0, 15)}..."</span>
                </div>
            ) : <WidgetChat />,
            delay: 10
        },
        // Top: Wave Chart
        { type: 'rect', x: cx, y: cy - 200, content: <WidgetWave />, delay: 15 },
        // Top Right: Stars
        {
            type: 'pill', x: cx + 160, y: cy - 140,
            content: <div style={{ display: 'flex', gap: 4 }}>{[1, 2, 3, 4, 5].map(i => <StarIcon key={i} delay={20 + i * 2} />)}</div>,
            delay: 20
        },
        // Right: Trend Chart
        { type: 'square', x: cx + 220, y: cy, content: <WidgetTrend />, delay: 25 },
        // Bottom Right: Avatar (Small)
        {
            type: 'square', x: cx + 180, y: cy + 140,
            content: <img src={getAvatar(2)} style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} />,
            delay: 30
        },
        // Bottom Left: Avatar (Review)
        {
            type: 'square', x: cx - 200, y: cy + 100,
            content: <img src={getAvatar(1)} style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} />,
            delay: 35
        },
        // Left: Stars (Small)
        {
            type: 'pill', x: cx - 240, y: cy - 20,
            content: <div style={{ display: 'flex', gap: 4 }}>{[1, 2, 3, 4].map(i => <StarIcon key={i} delay={40 + i * 2} />)}</div>,
            delay: 40
        }
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: THEME.bg, overflow: 'hidden' }}>

            {/* Background Atmosphere */}
            <GradientBlob color="#E2E8F0" x={width * 0.2} y={height * 0.8} size={900} opacity={0.5} />
            <GradientBlob color="#F1F5F9" x={width * 0.8} y={height * 0.2} size={800} opacity={0.6} />

            {/* Connecting Lines (Dashed Ring like Image 04) */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <circle
                    cx={cx} cy={cy} r={280}
                    fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="8 8"
                    opacity={0.3}
                    strokeDashoffset={frame * 0.5} // Rotate effect
                />
            </svg>

            {/* Central Hub */}
            <div style={{
                position: 'absolute', left: cx, top: cy,
                transform: `translate(-50%, -50%) scale(${centerScale})`,
                zIndex: 20
            }}>
                <div style={{
                    width: 220, height: 220, borderRadius: '50%',
                    background: 'white',
                    padding: 12, // Thick white border
                    boxShadow: '0 30px 60px -10px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <img
                        src={getAvatar(0)} // Central "Hero" User
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                </div>
            </div>

            {/* Floating Widgets */}
            {widgets.map((w, i) => (
                <FloatingCard
                    key={i}
                    x={w.x} y={w.y}
                    type={w.type}
                    delay={w.delay}
                >
                    {w.content}
                </FloatingCard>
            ))}

        </AbsoluteFill>
    );
};