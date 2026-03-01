import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Scene, ThemeStyles } from '@/lib/types';
import { BrandIcons } from '../components/BrandIcons';

export const CTA: React.FC<{ scene: Scene, themeStyles: ThemeStyles }> = ({ scene, themeStyles }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // --- TIMELINE ---
    const logoStart = 5;
    const textStart = 20;
    const buttonStart = 45;
    const iconsStart = 30;

    // --- ANIMATIONS ---

    // 1. Logo Physics (Overshoot pop)
    const logoSpring = spring({ 
        frame: frame - logoStart, 
        fps, 
        config: { damping: 10, stiffness: 120, mass: 0.8 } 
    });
    const logoScale = interpolate(logoSpring, [0, 1], [0, 1]);
    const logoRotate = interpolate(logoSpring, [0, 1], [-15, 0]);

    // 2. Text Stagger Logic
    const titleWords = (scene.mainText || "Ready to grow your business?").split(" ");
    
    // 3. Button Physics (Elastic pulse)
    const buttonSpring = spring({ 
        frame: frame - buttonStart, 
        fps, 
        config: { damping: 12, stiffness: 150 } 
    });
    const buttonPulse = Math.sin(frame / 15) * 0.03 * buttonSpring;

    // 4. Background Animation (Cinematic Mesh)
    const meshRotate = frame * 0.15;
    const meshScale = 1.2 + Math.sin(frame / 80) * 0.1;

    // 5. Floating Icons Configuration
    const icons = [
        { Icon: BrandIcons.Heart, x: -width * 0.25, y: -height * 0.2, delay: 0, size: 65, color: '#f43f5e' },
        { Icon: BrandIcons.CheckCircle, x: width * 0.28, y: -height * 0.15, delay: 15, size: 55, color: '#10b981' },
        { Icon: BrandIcons.Activity, x: -width * 0.22, y: height * 0.25, delay: 30, size: 75, color: '#f59e0b' },
        { Icon: BrandIcons.Layers, x: width * 0.24, y: height * 0.2, delay: 10, size: 70, color: '#3b82f6' },
        { Icon: BrandIcons.RedFocus, x: 0, y: -height * 0.35, delay: 45, size: 45, color: '#ef4444' }
    ];

    return (
        <AbsoluteFill style={{
            backgroundColor: '#020617', // Darker midnight blue
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        }}>
            {/* --- COMPLEX LAYERED BACKGROUND --- */}
            <AbsoluteFill>
                {/* Layer 1: Animated Mesh Orbs */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '160%',
                    height: '160%',
                    transform: `translate(-50%, -50%) rotate(${meshRotate}deg) scale(${meshScale})`,
                    background: `
                        radial-gradient(circle at 30% 30%, ${themeStyles.primary}44 0%, transparent 40%),
                        radial-gradient(circle at 70% 70%, #8b5cf633 0%, transparent 40%),
                        radial-gradient(circle at 30% 70%, #ec489922 0%, transparent 40%),
                        radial-gradient(circle at 70% 30%, #06b6d422 0%, transparent 40%)
                    `,
                    filter: 'blur(80px)',
                    opacity: 0.7,
                }} />
                
                {/* Layer 2: Subtle Geometric Grid */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.03) 1.5px, transparent 1.5px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1.5px, transparent 1.5px)
                    `,
                    backgroundSize: '60px 60px',
                    opacity: 0.4,
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 90%)'
                }} />

                {/* Layer 3: Noise Texture for "Grainy" look */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.03,
                    backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
                    pointerEvents: 'none'
                }} />
            </AbsoluteFill>

            {/* --- CONTENT CONTAINER --- */}
            <div style={{
                position: 'relative',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 48
            }}>
                {/* Polished Logo Section */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
                    opacity: logoSpring
                }}>
                    <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 32,
                        fontWeight: 900,
                        color: '#0f172a',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>C</div>
                    <span style={{ 
                        fontSize: 36, 
                        fontWeight: 800, 
                        color: '#fff', 
                        letterSpacing: '-0.03em',
                        textShadow: '0 10px 20px rgba(0,0,0,0.3)'
                    }}>
                        {scene.ctaUrl || "Company"}
                    </span>
                </div>

                {/* High-Impact Kinetic Headline */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        justifyContent: 'center', 
                        gap: '0 20px', 
                        maxWidth: 1000 
                    }}>
                        {titleWords.map((word, i) => {
                            const wordSpring = spring({ 
                                frame: frame - (textStart + i * 3), 
                                fps, 
                                config: { damping: 12, stiffness: 150, mass: 0.8 } 
                            });
                            return (
                                <div key={i} style={{ overflow: 'hidden', paddingBottom: 10 }}>
                                    <h1 style={{
                                        fontSize: 96,
                                        fontWeight: 900,
                                        color: '#fff',
                                        margin: 0,
                                        lineHeight: 1,
                                        fontFamily: themeStyles.headingFont,
                                        transform: `translateY(${(1 - wordSpring) * 100}%) rotate(${(1 - wordSpring) * 5}deg)`,
                                        opacity: wordSpring,
                                        textShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {word}
                                    </h1>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Refined Subtext */}
                <p style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: '#94a3b8',
                    maxWidth: 700,
                    textAlign: 'center',
                    margin: 0,
                    lineHeight: 1.6,
                    opacity: spring({ frame: frame - (textStart + 15), fps }),
                    transform: `translateY(${interpolate(spring({ frame: frame - (textStart + 15), fps }), [0, 1], [20, 0])}px)`
                }}>
                    {scene.subText || "Join thousands of teams building the future of digital experiences with our all-in-one platform."}
                </p>

                {/* Premium Pulsing CTA Button */}
                <div style={{
                    transform: `scale(${buttonSpring + buttonPulse})`,
                    opacity: buttonSpring,
                    marginTop: 20
                }}>
                    <div style={{
                        position: 'relative',
                        backgroundColor: themeStyles.primary,
                        padding: '28px 80px',
                        borderRadius: 24,
                        cursor: 'pointer',
                        boxShadow: `0 25px 60px ${themeStyles.primary}66, 0 0 0 1px rgba(255,255,255,0.1)`,
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease'
                    }}>
                        <span style={{
                            color: '#fff',
                            fontSize: 28,
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            position: 'relative',
                            zIndex: 10,
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}>
                            {scene.ctaText || "Get Started Free"}
                        </span>

                        {/* Animated Glass Shine */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '200%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            transform: `translateX(${interpolate(frame % 120, [0, 120], [-100, 100])}%) skewX(-30deg)`,
                            zIndex: 5
                        }} />

                        {/* Inner Bevel Gradient */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                            borderRadius: 24,
                            zIndex: 6
                        }} />
                    </div>
                </div>
            </div>

            {/* --- FLOATING AMBIENT 3D ICONS --- */}
            {icons.map((icon, i) => {
                const iconSpring = spring({ 
                    frame: frame - (iconsStart + icon.delay), 
                    fps, 
                    config: { damping: 15, stiffness: 100 } 
                });
                
                // Floating Physics
                const floatY = Math.sin((frame + i * 40) / 45) * 20;
                const floatX = Math.cos((frame + i * 30) / 60) * 15;
                const rotate = Math.sin((frame + i * 20) / 50) * 12;

                return (
                    <div key={i} style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `
                            translate(-50%, -50%) 
                            translate(${icon.x + floatX}px, ${icon.y + floatY}px) 
                            scale(${iconSpring}) 
                            rotate(${rotate}deg)
                        `,
                        opacity: iconSpring * 0.8,
                        zIndex: 20
                    }}>
                        <div style={{
                            width: icon.size * 1.8,
                            height: icon.size * 1.8,
                            backgroundColor: 'rgba(15, 23, 42, 0.4)', // Glassmorphism
                            backdropFilter: 'blur(12px)',
                            borderRadius: '35%', // Squircle shape
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
                            transform: 'perspective(1000px) rotateY(10deg)'
                        }}>
                            <icon.Icon width={icon.size} stroke={icon.color} style={{ color: icon.color, filter: `drop-shadow(0 0 10px ${icon.color}44)` }} />
                        </div>
                    </div>
                );
            })}
        </AbsoluteFill>
    );
};