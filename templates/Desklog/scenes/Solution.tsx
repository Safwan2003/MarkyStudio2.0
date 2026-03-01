import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    random,
    Img,
} from 'remotion';
import { Sparkles } from 'lucide-react';

// Dynamic color palette is set inside the component based on props

import { Scene } from '@/lib/types';
import { ThemeStyles } from '../components/ThemeEngine';

export const Solution = ({ scene, brand, themeStyles }: { scene: Scene, brand?: any, themeStyles: ThemeStyles }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // --- Dynamic Config ---
    const BRAND_GREEN = brand?.primaryColor || themeStyles.colors?.primary || '#10b981';
    const TEXT_DARK = themeStyles.text.color || '#0f172a';
    const TEXT_MUTED = themeStyles.colors?.secondary || '#64748b';

    const brandName = brand?.name ? brand.name.toLowerCase() : 'desklog';
    const brandSuffix = scene.mainText ? '' : 'ai'; // Only add suffix if using default, otherwise trust scene.mainText
    const tagline = scene.subText || 'Sell smarter, not harder.';


    // --- Animation Orchestration ---

    // 1. Logo Container Entrance (3D Flip)
    const logoEntrance = spring({
        frame,
        fps,
        config: { stiffness: 80, damping: 15, mass: 1.2 }
    });

    // 2. Text Slide-Up Reveal
    const textDelay = 25;
    const textReveal = spring({
        frame: frame - textDelay,
        fps,
        config: { stiffness: 60, damping: 14 }
    });

    // 3. Tagline Staggered Reveal
    const taglineDelay = 45;
    const taglineReveal = spring({
        frame: frame - taglineDelay,
        fps,
        config: { stiffness: 60, damping: 20 }
    });

    // --- Dynamic Interpolations ---

    // Background Pulse
    const bgScale = interpolate(frame, [0, 100], [1, 1.1]);
    const bgRotate = frame * 0.05;

    // 3D Logo Rotation
    const rotateX = interpolate(logoEntrance, [0, 1], [40, 0]);
    const rotateY = interpolate(logoEntrance, [0, 1], [-30, 0]);
    const logoScale = interpolate(logoEntrance, [0, 1], [0.5, 1]);
    const logoY = interpolate(logoEntrance, [0, 1], [200, 0]);

    return (
        <AbsoluteFill style={{
            backgroundColor: '#ffffff',
            perspective: 2000,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center'
        }}>

            {/* 1. ATMOSPHERE (Matching the Showcase Light Mode) */}
            <AbsoluteFill>
                {/* Animated Radial Gradient */}
                <div style={{
                    position: 'absolute', inset: -200,
                    background: `
            radial-gradient(circle at 30% 20%, #ecfdf5 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, #d1fae5 0%, transparent 40%)
          `,
                    transform: `scale(${bgScale}) rotate(${bgRotate}deg)`,
                    opacity: 0.8
                }} />

                {/* Technical Grid */}
                <div style={{
                    position: 'absolute', inset: -100,
                    backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)
          `,
                    backgroundSize: '80px 80px',
                    transform: `perspective(1000px) rotateX(20deg) translateY(${frame * 0.5}px)`,
                    opacity: 0.5
                }} />
            </AbsoluteFill>

            {/* 2. MAIN LOGO COMPOSITION */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transform: `translateY(${logoY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${logoScale})`,
                zIndex: 10
            }}>

                {/* A. The Logo Icon */}
                <div style={{ position: 'relative', marginBottom: 50 }}>
                    {/* Glow Layer */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: BRAND_GREEN, filter: 'blur(40px)', opacity: 0.4,
                        transform: 'scale(1.2)'
                    }} />

                    {/* Icon Container */}
                    <div style={{
                        width: 180, height: 180,
                        borderRadius: 48,
                        background: `linear-gradient(135deg, ${BRAND_GREEN}, #059669)`,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        boxShadow: `
               0 20px 50px -10px rgba(16, 185, 129, 0.4),
               inset 0 2px 0 rgba(255,255,255,0.2)
             `,
                        position: 'relative', overflow: 'hidden'
                    }}>
                        {/* Shine Effect */}
                        <div style={{
                            position: 'absolute', top: -50, left: -50, width: 200, height: 300,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                            transform: `rotate(45deg) translateX(${interpolate(frame, [0, 60], [-200, 200])}px)`
                        }} />

                        <span style={{
                            color: 'white', fontSize: 100, fontWeight: 900,
                            fontFamily: 'Inter, sans-serif',
                            textShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                            D
                        </span>
                    </div>

                    {/* Sparkle Decoration */}
                    <div style={{
                        position: 'absolute', top: -20, right: -20,
                        transform: `scale(${interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' })})`
                    }}>
                        <Sparkles size={60} color="#fbbf24" fill="#fbbf24" />
                    </div>
                </div>

                {/* B. Brand Name Reveal */}
                <div style={{ overflow: 'hidden', height: 130 }}>
                    <h1 style={{
                        fontSize: 120, margin: 0,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 900, color: TEXT_DARK,
                        letterSpacing: '-0.04em', lineHeight: 1,
                        transform: `translateY(${interpolate(textReveal, [0, 1], [120, 0])}px)`,
                        opacity: interpolate(textReveal, [0, 0.5], [0, 1])
                    }}>
                        {brandName}<span style={{ color: BRAND_GREEN }}>{brandSuffix}</span>
                    </h1>
                </div>

                {/* C. Tagline */}
                <div style={{ overflow: 'hidden', marginTop: 10 }}>
                    <p style={{
                        fontSize: 36, margin: 0,
                        color: TEXT_MUTED, fontWeight: 500,
                        transform: `translateY(${interpolate(taglineReveal, [0, 1], [50, 0])}px)`,
                        opacity: taglineReveal
                    }}>
                        {tagline}
                    </p>
                </div>

            </div>

            {/* 3. FLOATING PARTICLES (Tech Texture) */}
            {[...Array(15)].map((_, i) => {
                const r = random(i);
                const x = interpolate(r, [0, 1], [0, width]);
                const y = interpolate(random(i + 10), [0, 1], [0, height]);
                const size = 5 + r * 15;
                const delay = i * 5;
                const pop = spring({ frame: frame - delay, fps, config: { stiffness: 50 } });

                return (
                    <div key={i} style={{
                        position: 'absolute', left: x, top: y,
                        width: size, height: size,
                        borderRadius: '50%',
                        backgroundColor: i % 2 === 0 ? BRAND_GREEN : '#cbd5e1',
                        opacity: interpolate(pop, [0, 1], [0, 0.4]),
                        transform: `scale(${pop}) translateY(${Math.sin(frame / 40 + i) * 20}px)`
                    }} />
                )
            })}

        </AbsoluteFill>
    );
};