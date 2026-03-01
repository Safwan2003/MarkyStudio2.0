import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Scene } from '@/lib/types';
import { ThemeStyles } from '../../Pretaa/components/ThemeEngine';

export const Problem = ({ scene, themeStyles, brand }: { scene: Scene, themeStyles: ThemeStyles, brand: any }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Shake effect - Refined
    const shake = Math.sin(frame * 0.8) * 3 * Math.max(0, 1 - frame / 30);
    const scale = interpolate(frame, [0, 100], [1.05, 1]);
    const opacity = interpolate(frame, [0, 20], [0, 1]);

    // Background movement (consistent with Intro/Solution)
    const bgPan = interpolate(frame, [0, 300], [0, -30]);

    return (

        <AbsoluteFill className="bg-[#f8fafc] flex items-center justify-center overflow-hidden">
            {/* 1. Dynamic "Agitated" Background (Red/Orange Orbs) */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Orb 1: Red Stress */}
                <div
                    className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] bg-[#f87171] rounded-full blur-[120px] opacity-15 mix-blend-multiply"
                    style={{
                        transform: `translate(${Math.sin(frame * 0.1) * 20}px, ${Math.cos(frame * 0.1) * 20}px) scale(${interpolate(frame, [0, 50], [1, 1.1])})`
                    }}
                />
                {/* Orb 2: Orange Anxiety */}
                <div
                    className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-[#fb923c] rounded-full blur-[100px] opacity-15 mix-blend-multiply"
                    style={{
                        transform: `scale(${interpolate(frame, [0, 30], [0.9, 1.2])})`
                    }}
                />
            </div>

            {/* Grid Overlay (Darker/Grittier for Problem) */}
            <div
                className="absolute inset-0 opacity-[0.4]"
                style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    transform: `translateY(${bgPan}px)`
                }}
            />

            {/* Content Container (Shake Effect + Kinetic Text) */}
            <div
                className="relative z-10 w-full max-w-6xl px-12 flex flex-col items-center text-center justify-center h-full"
                style={{
                    transform: `translate(${shake}px, 0) scale(${scale})`,
                    opacity
                }}
            >
                {/* Main Headline (Kinetic 'Problem' Text) */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 max-w-5xl relative z-10">
                    {(scene.mainText || "Manage Sales & Support from one place").replace(/<br\s*\/?>/gi, ' ').split(" ").map((word, i) => {
                        const delay = i * 2; // Rapid fire
                        const wordSpring = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 300 } });
                        const wordY = interpolate(wordSpring, [0, 1], [30, 0]);

                        return (
                            <span key={i} style={{
                                display: 'inline-block',
                                opacity: interpolate(frame, [delay, delay + 5], [0, 1]),
                                transform: `translateY(${wordY}px)`,
                                ...themeStyles.heading,
                                fontSize: 90,
                                color: '#0f172a',
                                lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                position: 'relative'
                            }}>
                                {/* Red Highlight/Strike for key words (simple heuristic) */}
                                {['Sales', 'Support', 'Problem', 'Clueless'].some(k => word.includes(k)) && (
                                    <div
                                        className="absolute bottom-2 left-0 w-full h-3 bg-red-400/30 -z-10 rounded-sm"
                                        style={{ transform: `scaleX(${wordSpring})` }}
                                    />
                                )}
                                {word}
                            </span>
                        )
                    })}
                </div>
            </div>

            {/* Flash Transition Overlay (Start of scene) */}
            <div
                className="absolute inset-0 bg-white pointer-events-none z-50"
                style={{
                    opacity: interpolate(frame, [0, 8], [0.8, 0])
                }}
            />
        </AbsoluteFill>
    );
};
