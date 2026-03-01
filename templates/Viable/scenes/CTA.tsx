import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';
import { Scene } from '@/lib/types';

// --- Pure Code Design: "Clean Finale" ---

export const CTA: React.FC<{ scene: Scene; brand?: any }> = ({ scene, brand }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();

    const ctaText = scene.ctaText || "Get Started Today";
    const brandName = brand?.name || "Viable";
    const brandColor = brand?.primaryColor || '#10B981';

    // Animations
    const scale = spring({ frame, fps, config: { stiffness: 100 } });
    const fadeIn = interpolate(frame, [0, 20], [0, 1]);

    return (
        <AbsoluteFill style={{ backgroundColor: '#ffffff' }}>

            {/* 1. Abstract Background Shapes */}
            <AbsoluteFill style={{ overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', top: -200, left: -200, width: 800, height: 800,
                    background: `radial-gradient(circle, ${brandColor}20 0%, transparent 70%)`,
                    borderRadius: '50%', filter: 'blur(80px)',
                    transform: `translate(${Math.sin(frame / 50) * 50}px, ${Math.cos(frame / 50) * 50}px)`
                }} />
                <div style={{
                    position: 'absolute', bottom: -100, right: -100, width: 600, height: 600,
                    background: `radial-gradient(circle, #6366F120 0%, transparent 70%)`,
                    borderRadius: '50%', filter: 'blur(80px)'
                }} />
            </AbsoluteFill>

            {/* 2. Center Content */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column'
            }}>
                {/* Brand Name (Massive) */}
                <h1 style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 140, fontWeight: 900,
                    color: '#111827',
                    letterSpacing: '-0.06em',
                    lineHeight: 0.9,
                    margin: 0,
                    transform: `scale(${scale})`,
                    opacity: fadeIn,
                    backgroundImage: `linear-gradient(135deg, #111827 50%, ${brandColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    {brandName}
                </h1>

                {/* Subtext/URL */}
                <div style={{
                    marginTop: 20, fontSize: 30, fontWeight: 500, color: '#6B7280',
                    opacity: interpolate(frame, [10, 30], [0, 1])
                }}>
                    {brand?.url || 'viable.com'}
                </div>

                {/* CTA Button */}
                <div style={{
                    marginTop: 60,
                    padding: '30px 100px',
                    background: '#111827',
                    borderRadius: 100,
                    boxShadow: `0 20px 50px -10px ${brandColor}60`,
                    transform: `translateY(${interpolate(spring({ frame: frame - 20, fps }), [0, 1], [50, 0])}px)`,
                    opacity: interpolate(spring({ frame: frame - 20, fps }), [0, 1], [0, 1]),
                    cursor: 'pointer'
                }}>
                    <span style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 32, fontWeight: 700, color: 'white'
                    }}>
                        {ctaText}
                    </span>
                </div>
            </div>
        </AbsoluteFill>
    );
};
