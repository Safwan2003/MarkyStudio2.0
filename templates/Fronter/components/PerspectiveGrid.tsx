import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export const PerspectiveGrid: React.FC<{ color?: string }> = ({ color = '#cbd5e1' }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Grid animation speed
    const speed = (frame * 15) % 100; // Moves 100px then loops

    return (
        <AbsoluteFill style={{
            perspective: '600px',
            overflow: 'hidden',
            zIndex: 0,
            opacity: 0.4
        }}>
            <div style={{
                position: 'absolute',
                width: '300%',
                height: '200%',
                left: '-100%',
                top: '0%', // Start from horizon
                transform: 'rotateX(80deg) translateY(-100px) translateZ(-200px)',
                transformOrigin: '50% 0%',
                backgroundImage: `
            linear-gradient(to right, ${color} 1px, transparent 1px),
            linear-gradient(to bottom, ${color} 1px, transparent 1px)
          `,
                backgroundSize: '100px 100px',
                backgroundPosition: `0px ${speed}px`,
                // Fade out towards horizon
                maskImage: 'linear-gradient(to bottom, transparent, black 40%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40%)'
            }} />
        </AbsoluteFill>
    );
};
