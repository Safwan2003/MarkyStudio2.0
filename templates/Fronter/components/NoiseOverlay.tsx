import React from 'react';
import { AbsoluteFill, random } from 'remotion';

export const NoiseOverlay: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
    return (
        <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity, zIndex: 999 }}>
            <svg width="100%" height="100%">
                <filter id="noiseFilter">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.8"
                        numOctaves="3"
                        stitchTiles="stitch"
                    />
                </filter>
                <rect width="100%" height="100%" filter="url(#noiseFilter)" />
            </svg>
        </AbsoluteFill>
    );
};
