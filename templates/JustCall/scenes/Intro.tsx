
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Scene } from '@/lib/types';
import { ThemeStyles } from '../../Pretaa/components/ThemeEngine';

export const Intro = ({ scene, themeStyles, brand }: { scene: Scene, themeStyles: ThemeStyles, brand: any }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Smoother Animations
    const slideUp = spring({ frame, fps, config: { damping: 20 } });
    // Continuous subtle zoom for cinematic feel
    const scale = interpolate(frame, [0, 150], [1, 1.1]);

    // Background movement (Subtle parallax)
    const bgPan = interpolate(frame, [0, 300], [0, -50]);

    return (
        <AbsoluteFill className="bg-[#f8fafc] flex items-center justify-center overflow-hidden">
            {/* 1. Dynamic "Vibe" Background (Orbs) */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Orb 1: Teal Pulse */}
                <div
                    className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#2dd4bf] rounded-full blur-[100px] opacity-20 mix-blend-multiply"
                    style={{
                        transform: `translate(${Math.sin(frame * 0.02) * 50}px, ${Math.cos(frame * 0.02) * 50}px) scale(${interpolate(frame, [0, 100], [0.8, 1.2])})`
                    }}
                />
                {/* Orb 2: Blue Drift */}
                <div
                    className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#3b82f6] rounded-full blur-[120px] opacity-20 mix-blend-multiply"
                    style={{
                        transform: `translate(${Math.cos(frame * 0.03) * -40}px, ${Math.sin(frame * 0.03) * 40}px)`
                    }}
                />
                {/* Orb 3: Accent Flash (Violet) */}
                <div
                    className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-[#8b5cf6] rounded-full blur-[80px] opacity-15 mix-blend-multiply"
                    style={{
                        transform: `scale(${interpolate(frame, [0, 20, 40], [0, 1.5, 1])})`
                    }}
                />
            </div>

            {/* Grid Overlay for texture (lower opacity) */}
            <div
                className="absolute inset-0 opacity-[0.3]"
                style={{
                    backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    transform: `translateY(${bgPan}px)`
                }}
            />

            {/* Spark Accents (Rotating) */}
            <div className="absolute top-[25%] right-[15%] opacity-80 z-0">
                <svg width="60" height="60" viewBox="0 0 40 40" fill="none" style={{ transform: `rotate(${frame * 2}deg) scale(${spring({ frame: frame - 10, fps })})` }}>
                    <path d="M20 0L23 17L40 20L23 23L20 40L17 23L0 20L17 17L20 0" fill="#2dd4bf" />
                </svg>
            </div>

            {/* Content Container */}
            <div
                className="relative z-10 max-w-6xl px-8 text-center flex flex-col items-center justify-center h-full"
                style={{
                    transform: `scale(${scale})`
                }}
            >
                {/* Beat 1: The Hook (Kinetic Word Reveal) */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 max-w-4xl mb-12 relative">
                    {(scene.mainText || "Tired of Clueless Conversations?").split(" ").map((word, i) => {
                        const delay = i * 3; // Tight stagger (3 frames)
                        // Kinetic Pop: Scale 0->1 + Slide Up
                        const wordSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200 } });
                        const wordY = interpolate(wordSpring, [0, 1], [40, 0]);
                        const wordRotate = interpolate(wordSpring, [0, 1], [10, 0]); // Subtle rotation snap

                        return (
                            <span key={i} style={{
                                display: 'inline-block',
                                opacity: interpolate(frame, [delay, delay + 5], [0, 1]),
                                transform: `translateY(${wordY}px) rotate(${wordRotate}deg) scale(${wordSpring})`,
                                ...themeStyles.heading,
                                fontSize: 100, // Big & Bold
                                color: '#1e293b', // Slate 800
                                lineHeight: 1.0,
                                textShadow: '0 4px 20px rgba(0,0,0,0.1)', // Soft shadow depth
                            }}>
                                {word}
                            </span>
                        );
                    })}
                </div>

                {/* Beat 2: The Setup / Brand Intro (Maximum Hype) */}
                <div style={{
                    opacity: interpolate(frame, [30, 40], [0, 1]),
                    transform: `translateY(${interpolate(spring({ frame: frame - 30, fps }), [0, 1], [50, 0])}px)`
                }}>
                    <div
                        className="flex items-center gap-6 bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-300/60 px-12 py-6 rounded-full border border-white/60 relative overflow-hidden group"
                        style={{
                            transform: `scale(${spring({ frame: frame - 35, fps, config: { stiffness: 150 } })})`
                        }}
                    >
                        {/* Flash Sweep */}
                        <div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent skew-x-12 opacity-80"
                            style={{
                                transform: `translateX(${interpolate(frame, [40, 80], [-200, 200])}%)`
                            }}
                        />

                        {/* Brand Icon Pulse */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#2dd4bf] rounded-full blur-lg opacity-50 animate-pulse" />
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2dd4bf] to-[#0d9488] flex items-center justify-center font-black text-2xl text-white shadow-inner relative z-10">
                                {brand?.name?.[0] || 'J'}
                            </div>
                        </div>

                        <div className="text-left relative z-10">
                            <div className="text-sm font-bold text-[#2dd4bf] tracking-widest uppercase mb-0.5">It's time for</div>
                            <div className="text-4xl font-black text-slate-800 tracking-tighter leading-none">
                                {brand?.name || 'JustCall'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Flash Transition Overlay (Start of scene) */}
            <div
                className="absolute inset-0 bg-white pointer-events-none z-50"
                style={{
                    opacity: interpolate(frame, [0, 10], [1, 0])
                }}
            />
        </AbsoluteFill>
    );
};
