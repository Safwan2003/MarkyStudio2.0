import React from 'react';
import { useCurrentFrame } from 'remotion';

interface GradientBlobProps {
    color: string;
    x: number;      // Center X position (pixels)
    y: number;      // Center Y position (pixels)
    size: number;   // Diameter (pixels)
    opacity?: number;
    speed?: number; // Animation speed multiplier (default: 0.5)
}

export const GradientBlob: React.FC<GradientBlobProps> = ({
    color,
    x,
    y,
    size,
    opacity = 0.5,
    speed = 0.5
}) => {
    const frame = useCurrentFrame();

    // 1. Gentle Organic Drift (Brownian-like motion)
    // Uses different frequencies for X and Y to avoid a perfect circle path
    const driftX = Math.sin(frame * 0.02 * speed) * 40;
    const driftY = Math.cos(frame * 0.03 * speed) * 40;

    // 2. "Breathing" Scale Animation
    const breathe = 1 + Math.sin(frame * 0.05 * speed) * 0.05;

    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY}px) scale(${breathe})`,
                opacity: opacity,
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                filter: 'blur(50px)', // Heavy blur for "Atmospheric" look
                pointerEvents: 'none',
                zIndex: 0, // Always behind content
            }}
        />
    );
};
