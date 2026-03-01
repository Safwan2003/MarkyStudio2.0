import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { VideoScript, Scene } from '@/lib/types';
import { Intro } from './scenes/Intro';
import { Problem } from './scenes/Problem';
import { Solution } from './scenes/Solution';
import { Showcase } from './scenes/Showcase';
import { CTA } from './scenes/CTA';
import { SocialProof } from './scenes/SocialProof';

const DEFAULT_DURATIONS: Record<string, number> = {
    intro: 4,
    problem: 5,
    solution: 6,
    showcase: 8,
    social_proof: 5,
    cta: 4,
};

interface ViableTemplateProps {
    plan: VideoScript;
}

export const ViableTemplate: React.FC<ViableTemplateProps> = ({ plan }) => {
    const { fps } = useVideoConfig();

    const effectiveScript = plan || {
        brandName: 'Viable',
        brandColor: '#10B981', // Emerald Green default
        scenes: [
            { type: 'intro', mainText: 'Scale Faster', duration: 4 },
            { type: 'problem', mainText: 'Manual Data Entry?', duration: 5 },
            { type: 'solution', mainText: 'Automated Intelligence', duration: 6 },
            { type: 'showcase', mainText: 'Seamless Integration', duration: 8 },
            { type: 'social_proof', mainText: 'Trusted by Leaders', duration: 5 },
            { type: 'cta', mainText: 'Start for Free', ctaText: 'Get Viable', duration: 4 },
        ],
    };

    const brand = {
        name: effectiveScript.brandName || 'Viable',
        primaryColor: effectiveScript.brandColor || effectiveScript.globalDesign?.primaryColor || '#10B981',
        url: 'viable.com',
    };

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

    const renderScene = (scene: Scene) => {
        const sceneType = scene.type.toLowerCase().replace('-', '_');
        const props = { scene, brand };

        switch (sceneType) {
            case 'intro': return <Intro {...props} />;
            case 'problem': return <Problem {...props} />;
            case 'solution': return <Solution {...props} />;
            case 'showcase': return <Showcase {...props} />;
            case 'social_proof': return <SocialProof {...props} />;
            case 'cta': return <CTA {...props} />;
            default: return <Intro {...props} />;
        }
    };

    return (
        <AbsoluteFill style={{ backgroundColor: '#ffffff' }}>
            {sceneSequence.map(({ scene, startFrame, durationFrames }, index) => (
                <Sequence
                    key={`${scene.type}-${index}`}
                    from={startFrame}
                    durationInFrames={durationFrames}
                    name={scene.type}
                >
                    {renderScene(scene)}
                </Sequence>
            ))}
        </AbsoluteFill>
    );
};

export default ViableTemplate;
