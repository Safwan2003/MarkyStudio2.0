import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { VideoScript, Scene } from '@/lib/types';
import { Intro } from './scenes/Intro';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { SocialProof } from './scenes/SocialProof';
import { Showcase } from './scenes/Showcase';
import { CTA } from './scenes/CTA';

// Default scene durations (in seconds) at 30fps
const DEFAULT_DURATIONS: Record<string, number> = {
    intro: 4,        // 120 frames
    problem: 5,      // 150 frames
    solution: 6,     // 180 frames
    social_proof: 6, // 180 frames
    showcase: 8,     // 240 frames
    cta: 4,          // 120 frames
};

interface PretaaTemplateProps {
    plan: VideoScript;
}

export const PretaaTemplate: React.FC<PretaaTemplateProps> = ({ plan }) => {
    const { fps } = useVideoConfig();

    // Null safety - provide defaults if plan is undefined
    const effectiveScript = plan || {
        brandName: 'pretaa',
        brandColor: '#3b5998',
        scenes: [
            { type: 'intro', mainText: 'Welcome', duration: 4 },
            { type: 'problem', mainText: 'The Challenge', duration: 5 },
            { type: 'solution', mainText: 'Our Solution', duration: 6 },
            { type: 'showcase', mainText: 'See It In Action', duration: 8 },
            { type: 'cta', mainText: 'Get Started', ctaText: 'Contact Us Today', duration: 4 },
        ],
    };

    const brand = {
        name: effectiveScript.brandName || 'pretaa',
        primaryColor: effectiveScript.brandColor || effectiveScript.globalDesign?.primaryColor || '#3b5998',
        url: 'pretaa.com',
    };

    // Build scene sequence with frame offsets
    let currentFrame = 0;
    const sceneSequence: { scene: Scene; startFrame: number; durationFrames: number }[] = [];

    const scenes = effectiveScript.scenes || [];
    for (const scene of scenes) {
        const sceneType = scene.type.toLowerCase().replace('-', '_');
        const durationSeconds = scene.duration || DEFAULT_DURATIONS[sceneType] || 5;
        const durationFrames = Math.round(durationSeconds * fps);

        sceneSequence.push({
            scene: scene as Scene,
            startFrame: currentFrame,
            durationFrames,
        });

        currentFrame += durationFrames;
    }

    const renderScene = (scene: Scene, durationFrames: number) => {
        const sceneType = scene.type.toLowerCase().replace('-', '_');
        const props = { scene, brand };

        switch (sceneType) {
            case 'intro':
                return <Intro {...props} />;
            case 'problem':
                return <Problem {...props} />;
            case 'solution':
                return <Solution {...props} />;
            case 'social_proof':
            case 'socialproof':
                return <SocialProof {...props} />;
            case 'showcase':
                return <Showcase {...props} />;
            case 'cta':
            case 'cta_finale':
                return <CTA {...props} />;
            default:
                console.warn(`Unknown scene type: ${scene.type}`);
                return <Intro {...props} />;
        }
    };

    return (
        <AbsoluteFill style={{ backgroundColor: '#f4f4f7' }}>
            {sceneSequence.map(({ scene, startFrame, durationFrames }, index) => (
                <Sequence
                    key={`${scene.type}-${index}`}
                    from={startFrame}
                    durationInFrames={durationFrames}
                    name={scene.type}
                >
                    {renderScene(scene, durationFrames)}
                </Sequence>
            ))}
        </AbsoluteFill>
    );
};

// Export default for easy importing
export default PretaaTemplate;
