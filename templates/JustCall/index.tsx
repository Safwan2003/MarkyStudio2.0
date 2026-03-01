import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';

// ThemeStyles inline type (temporary until we have a shared module)
interface ThemeStyles {
    background: string;
    text: { color: string };
    colors: { primary: string; accent: string };
}

const getThemeStyles = (theme: string, accentColor: string): ThemeStyles => ({
    background: '#ffffff',
    text: { color: '#1f2937' },
    colors: { primary: accentColor, accent: accentColor },
});

// Scenes (To be implemented)
import { Intro } from './scenes/Intro';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Showcase } from './scenes/Showcase';
import { CTA } from './scenes/CTA';

// Types
import { Scene as VideoScene, VideoScript as VideoPlan } from '@/lib/types';

export interface JustCallTemplateProps {
    plan: VideoPlan;
    [key: string]: unknown;
}

const SceneRenderer = ({ scene, brand, themeStyles }: { scene: VideoScene, brand: any, themeStyles: ThemeStyles }) => {
    // const frame = useCurrentFrame();
    const type = scene.type;

    let content = <Intro scene={scene} themeStyles={themeStyles} />;

    switch (type) {
        case 'hook':
            content = <Intro scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
        case 'problem':
            content = <Problem scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
        case 'solution':
            content = <Solution scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
        case 'showcase':
            // Map legacy types or "Showcase" if script uses that
            content = <Showcase scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
        case 'device_showcase': // Match action types
            content = <Showcase scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
        case 'cta':
            content = <CTA scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
        case 'cta_finale': // Match action types
            content = <CTA scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
        default:
            // Fallback
            content = <Intro scene={scene} themeStyles={themeStyles} brand={brand} />;
            break;
    }

    return (
        <AbsoluteFill>
            {content}
        </AbsoluteFill>
    );
};

export const JustCallTemplate: React.FC<JustCallTemplateProps> = ({ plan }) => {

    // Defaults
    const effectivePlan = plan || {
        brandName: 'JustCall',
        brandColor: '#2563eb', // Blue default
        scenes: []
    };

    const scenes = effectivePlan.scenes || [];
    const brand = {
        accentColor: effectivePlan.brandColor || '#3b82f6',
        primaryColor: effectivePlan.globalDesign?.primaryColor || '#3b82f6',
        name: effectivePlan.brandName || 'JustCall'
    };

    const themeStyles = getThemeStyles('modern', brand.accentColor);

    // ... transitions ...
    const snapSpring = springTiming({
        config: { damping: 12, stiffness: 400, mass: 0.5 }, // Ultra-Snappy
        durationInFrames: 12, // Very fast transition (0.4s)
    });
    const slideLeft = slide({ direction: 'from-right' });
    const crossFade = fade();

    return (
        <AbsoluteFill style={{ backgroundColor: themeStyles.background }}>
            {/* Audio handler removed - will implement later */}

            <TransitionSeries>
                {scenes.map((scene, index) => (
                    <React.Fragment key={scene.id || index}>
                        <TransitionSeries.Sequence durationInFrames={Math.max(1, Math.floor((scene.duration || 5) * 30))}>
                            <SceneRenderer scene={scene} brand={brand} themeStyles={themeStyles} />
                        </TransitionSeries.Sequence>
                        {index < scenes.length - 1 && (
                            <TransitionSeries.Transition
                                presentation={index % 2 === 0 ? slideLeft : crossFade}
                                timing={snapSpring}
                            />
                        )}
                    </React.Fragment>
                ))}
            </TransitionSeries>
        </AbsoluteFill>
    );
};
