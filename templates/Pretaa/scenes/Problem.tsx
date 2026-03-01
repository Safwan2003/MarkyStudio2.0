import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Scene } from '@/lib/types';
import { GradientBlob } from '../components/GradientBlob';

// --- Curated Professional Avatars (Different set for Problem scene) ---
const PROFESSIONAL_PROBLEM_AVATARS = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop', // Man smiling doubtfully
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=500&fit=crop', // Woman serious
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop', // Man profile
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=500&fit=crop'  // Woman looking away
];

// Symbols matching
const GIBBERISH = ["? )*[ #@@", "\" #+*@@ ??", "@**[ ##??", "##$#@ @!!>"];

// --- Helper: The "Confused Pill" Bubble ---
const ChatBubble = ({ text, x, y, delay, align = 'left' }: any) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Snappy spring pop-up
    const scale = spring({ frame: frame - delay, fps, config: { stiffness: 250, damping: 15 } });

    // Subtle nervous shake
    const shake = Math.sin((frame + delay) * 0.8) * 3;

    return (
        <div style={{
            position: 'absolute',
            left: x, top: y,
            // Position bubble relative to avatar based on 'align' prop
            transform: `translate(${align === 'left' ? '50px' : '-160%'}, -50%) scale(${scale}) translateY(${shake}px)`,
            background: '#FFFFFF',
            padding: '14px 28px', // Larger, pill shape
            borderRadius: 50,
            boxShadow: '0 15px 35px rgba(0,0,0,0.08), 0 5px 15px rgba(0,0,0,0.05)',
            whiteSpace: 'nowrap',
            zIndex: 30,
        }}>
            <span style={{
                fontFamily: '"Roboto Mono", monospace', // Technical/confused font looks best
                fontSize: 20,
                fontWeight: 700,
                color: '#334155',
                letterSpacing: 3
            }}>
                {text}
            </span>
        </div>
    );
};

// --- Helper: BIG Frustrated Avatar ---
const FrustratedAvatar = ({ src, x, y, size, delay }: any) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const scale = spring({ frame: frame - delay, fps, config: { stiffness: 180, mass: 1 } });

    return (
        <div style={{
            position: 'absolute', left: x, top: y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            zIndex: 10
        }}>
            <div style={{
                width: size, height: size, borderRadius: '50%',
                backgroundColor: '#fff',
                padding: 8, // Thick white border
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12)', // Deep shadow
            }}>
                <img src={src} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
            </div>
        </div>
    );
};

export const Problem: React.FC<{ scene: Scene }> = ({ scene }) => {
    const { width, height } = useVideoConfig();
    const frame = useCurrentFrame();

    // Layout: Scattered and BIG sizes
    const items = [
        { x: width * 0.28, y: height * 0.32, size: 180, text: GIBBERISH[0], align: 'left', delay: 15 },
        { x: width * 0.72, y: height * 0.28, size: 160, text: GIBBERISH[1], align: 'right', delay: 35 },
        { x: width * 0.32, y: height * 0.70, size: 170, text: GIBBERISH[2], align: 'left', delay: 55 },
        { x: width * 0.75, y: height * 0.65, size: 165, text: GIBBERISH[3], align: 'right', delay: 75 },
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            {/* Very subtle, slightly chaotic background atmosphere */}
            <GradientBlob color="#F1F5F9" x={width * 0.3} y={height * 0.8} size={900} speed={0.2} opacity={0.6} />
            <GradientBlob color="#F8FAFC" x={width * 0.7} y={height * 0.2} size={800} speed={0.3} opacity={0.6} />

            {items.map((item, i) => (
                <React.Fragment key={i}>
                    <FrustratedAvatar
                        src={PROFESSIONAL_PROBLEM_AVATARS[i]}
                        x={item.x} y={item.y} size={item.size} delay={item.delay}
                    />
                    <ChatBubble
                        text={item.text}
                        x={item.x} y={item.y} align={item.align} delay={item.delay + 10}
                    />
                </React.Fragment>
            ))}

            {/* Restored Dynamic Headline */}
            {scene.mainText && (
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 40,
                    textAlign: 'center',
                    width: '80%',
                    pointerEvents: 'none'
                }}>
                    <h2 style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 80,
                        fontWeight: 900,
                        color: '#b91c1c',
                        lineHeight: 1.1,
                        textShadow: '0 4px 20px rgba(220, 38, 38, 0.2), 0 0 0 5px rgba(255,255,255,0.8)',
                        transform: `scale(${spring({ frame: frame - 15, fps: 30, config: { stiffness: 100 } })})`,
                        opacity: spring({ frame: frame - 15, fps: 30 })
                    }}>
                        {scene.mainText}
                    </h2>
                    {scene.subText && (
                        <p style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: 32,
                            fontWeight: 600,
                            color: '#7f1d1d',
                            marginTop: 20,
                            background: 'rgba(255,255,255,0.7)',
                            padding: '10px 20px',
                            borderRadius: 20,
                            display: 'inline-block',
                            opacity: interpolate(frame - 25, [0, 10], [0, 1])
                        }}>
                            {scene.subText}
                        </p>
                    )}
                </div>
            )}
        </AbsoluteFill>
    );
};