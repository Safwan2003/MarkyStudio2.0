import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';

// Scenes
// Scenes
// import { Intro } from './scenes/Intro'; // Removed
import { Intro } from './scenes/Intro';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Showcase } from './scenes/Showcase';
import { CTA } from './scenes/CTA';
// Removed unused imports
import { SocialProof } from './scenes/SocialProof';

// Types
import { Scene as VideoScene, VideoScript as VideoPlan } from '@/lib/types';
import { getThemeStyles, ThemeStyles } from './components/ThemeEngine';

const SceneRenderer = ({ scene, brand, themeStyles }: { scene: VideoScene, brand: any, themeStyles: ThemeStyles }) => {
    switch (scene.type) {
        case 'hook':
            return <Intro scene={scene} themeStyles={themeStyles} />;
        case 'kinetic_typo':
        case 'intro':
            return <Intro scene={scene} themeStyles={themeStyles} />;
        case 'problem':
            return <Problem scene={scene} themeStyles={themeStyles} brand={brand} />;
        case 'solution':
            return <Solution scene={scene} themeStyles={themeStyles} />;
        case 'showcase':
        case 'device_showcase':
        case 'bento_grid':
            return <Showcase scene={scene} themeStyles={themeStyles} brand={brand} />;
        // Dashboard removed
        case 'transition_how':
        // TransitionHow removed
        case 'social-proof':
        case 'social_proof':
            return <SocialProof scene={scene} themeStyles={themeStyles} brand={brand} />;
        case 'cta':
        case 'cta_finale':
            return <CTA scene={scene} themeStyles={themeStyles} brand={brand} />;
        default:
            return <Intro scene={scene} themeStyles={themeStyles} />;
    }
};

export interface DesklogReactTemplateProps {
    plan: VideoPlan;
}

export const DesklogTemplate: React.FC<DesklogReactTemplateProps> = ({ plan }) => {
    const scenes = plan?.scenes || [];
    const brand = {
        name: plan?.brandName || 'Desklog',
        primaryColor: plan?.globalDesign?.primaryColor || '#059669',
        accentColor: plan?.globalDesign?.accentColor || '#10b981',
    };

    const themeStyles = getThemeStyles('modern_clean', brand.primaryColor);

    // Transitions
    const snapSpring = springTiming({
        config: { damping: 25, stiffness: 300, mass: 0.8 },
        durationInFrames: 20,
    });
    const slideLeft = slide({ direction: 'from-right' });
    const crossFade = fade();

    return (
        <AbsoluteFill style={{
            background: plan?.globalDesign?.backgroundColor || themeStyles.background,
            fontFamily: plan?.globalDesign?.bodyFont || 'Inter',
            color: plan?.globalDesign?.textColor || themeStyles.text.color as string
        }}>
            {/* Audio can be added here if needed */}

            <TransitionSeries>
                {scenes.map((scene, index) => (
                    <React.Fragment key={scene.id || index}>
                        <TransitionSeries.Sequence durationInFrames={Math.ceil((scene.duration || 5) * 30)}>
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

            {/* Overlay removed */}
        </AbsoluteFill>
    );
};
