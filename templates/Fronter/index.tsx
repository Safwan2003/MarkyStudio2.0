import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { VideoScript, ThemeStyles } from '@/lib/types';

import { Intro } from './scenes/Intro';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Showcase } from './scenes/Showcase';
import { SocialProof } from './scenes/SocialProof';
import { CTA } from './scenes/CTA';

// Default Theme 
const getTheme = (script: VideoScript): ThemeStyles => {
    const global = script?.globalDesign || {};
    return {
        primary: global.primaryColor || '#2563EB',
        secondary: global.secondaryColor || '#1E293B',
        accent: global.accentColor || '#F59E0B',
        background: global.backgroundColor || '#FFFFFF',
        text: global.textColor || '#0F172A',
        headingFont: global.headingFont || 'Inter',
        bodyFont: global.bodyFont || 'Inter',
        borderRadius: global.borderRadius || '24px'
    };
};

export const FronterTemplate: React.FC<{ plan: VideoScript }> = ({ plan }) => {
    const themeStyles = getTheme(plan);

    // Safety check
    if (!plan || !plan.scenes) {
        return <AbsoluteFill style={{ backgroundColor: 'black', color: 'white', justifyContent: 'center', alignItems: 'center' }}>No Script Data</AbsoluteFill>;
    }

    // Sequence Logic
    let startFrame = 0;

    return (
        <AbsoluteFill>
            {plan.scenes.map((scene, index) => {
                const durationInFrames = Math.round((scene.duration || 5) * 30);
                const currentStartFrame = startFrame;
                startFrame += durationInFrames;

                return (
                    <Sequence
                        key={scene.id || index}
                        from={currentStartFrame}
                        durationInFrames={durationInFrames}
                    >
                        {(() => {
                            switch (scene.type) {
                                case 'hook':
                                case 'intro':
                                    return <Intro scene={scene} themeStyles={themeStyles} />;
                                case 'problem':
                                    return <Problem scene={scene} themeStyles={themeStyles} />;
                                case 'solution':
                                    return <Solution scene={scene} themeStyles={themeStyles} />;
                                case 'showcase':
                                case 'interactive_showcase':
                                    return <Showcase scene={scene} themeStyles={themeStyles} />;
                                case 'social_proof':
                                    return <SocialProof scene={scene} themeStyles={themeStyles} />;
                                case 'cta':
                                    return <CTA scene={scene} themeStyles={themeStyles} />;
                                default:
                                    return (
                                        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                                            <h1 style={{ color: 'white' }}>Unknown Scene Type: {scene.type}</h1>
                                        </AbsoluteFill>
                                    );
                            }
                        })()}
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};
