
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Scene } from '@/lib/types';
import { ThemeStyles } from '../../Pretaa/components/ThemeEngine';

export const CTA = ({ scene, themeStyles, brand }: { scene: Scene, themeStyles: ThemeStyles, brand: any }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Animations
    const opacity = interpolate(frame, [0, 20], [0, 1]);
    const slideUp = spring({ frame, fps, config: { damping: 20 } });
    const y = interpolate(slideUp, [0, 1], [30, 0]);

    // Background movement
    const bgPan = interpolate(frame, [0, 300], [0, -30]);

    return (

        <AbsoluteFill className="bg-[#f8fafc] flex items-center justify-center overflow-hidden">
            {/* 1. Dynamic "Celebration" Background (Multi-Color Pulse) */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Orb 1: Blue Depth */}
                <div
                    className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-[#3b82f6] rounded-full blur-[120px] opacity-20 mix-blend-multiply"
                    style={{
                        transform: `scale(${interpolate(frame, [0, 20], [0.8, 1.2])})`
                    }}
                />
                {/* Orb 2: Teal Brightness */}
                <div
                    className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-[#2dd4bf] rounded-full blur-[120px] opacity-20 mix-blend-multiply"
                    style={{
                        transform: `scale(${interpolate(frame, [0, 30], [1.2, 0.9])})`
                    }}
                />
                {/* Orb 3: Violet Energy (Center) */}
                <div
                    className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] bg-[#8b5cf6] rounded-full blur-[100px] opacity-15 mix-blend-multiply"
                    style={{
                        transform: `scale(${interpolate(frame, [0, 15], [0, 1.5])})`
                    }}
                />
            </div>

            {/* Grid Overlay */}
            <div
                className="absolute inset-0 opacity-[0.3]"
                style={{
                    backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    transform: `translateY(${bgPan}px)`
                }}
            />
            {/* Floating Particles (Teal/Blue dots for celebration) */}
            {[...Array(15)].map((_, i) => (
                <div key={i} className={`absolute rounded-full ${i % 2 === 0 ? 'bg-[#2dd4bf]' : 'bg-[#3b82f6]'}`}
                    style={{
                        left: `${(i * 20) % 100}%`, top: `${(i * 15) % 100}%`, width: i % 3 === 0 ? 8 : 4, height: i % 3 === 0 ? 8 : 4,
                        opacity: interpolate(frame, [0, 30], [0, 0.6]),
                        transform: `translateY(${interpolate(frame, [0, 100], [0, -50 - (i * 5)])}px)`
                    }} />
            ))}

            <div
                className="relative z-10 flex flex-col items-center text-center w-full max-w-5xl"
                style={{
                    opacity,
                    transform: `translateY(${y}px)`
                }}
            >
                {/* Logo Block */}
                <div className="flex items-center gap-5 mb-12 transform scale-110">
                    <div className="w-16 h-16 relative">
                        <div className="absolute inset-0 bg-[#4ade80] rounded-full shadow-lg shadow-green-200" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#f8fafc]" style={{ borderRadius: '50% 0 0 50%' }} />
                    </div>
                    <div className="text-7xl font-bold text-slate-900 tracking-tight">{brand?.name || 'JustCall'}</div>
                </div>

                {/* Slogan (Kinetic Word Reveal) */}
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-16 relative z-10">
                    {(scene.mainText || "Your unfair Support advantage").split(" ").map((word, i) => {
                        const delay = i * 3;
                        const wordSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200 } });
                        const wordY = interpolate(wordSpring, [0, 1], [40, 0]);

                        return (
                            <span key={i} style={{
                                display: 'inline-block',
                                opacity: interpolate(frame, [delay, delay + 5], [0, 1]),
                                transform: `translateY(${wordY}px) scale(${wordSpring})`,
                                ...themeStyles.heading,
                                fontSize: 60, // Slightly smaller than intro to fit
                                color: '#1e293b',
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                                position: 'relative'
                            }}>
                                {/* Mint Underline for "advantage" or similar keywords */}
                                {['advantage', 'unfair'].some(k => word.includes(k)) && (
                                    <div
                                        className="absolute -bottom-1 left-0 w-full h-3 bg-[#2dd4bf] -z-10 opacity-40 rounded-sm origin-left"
                                        style={{ transform: `scaleX(${wordSpring})` }}
                                    />
                                )}
                                {word}
                            </span>
                        )
                    })}
                </div>

                {/* Primary CTA Button (Magnetic Pulse) */}
                <div
                    className="relative group"
                    style={{
                        transform: `scale(${spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 200 } })})`
                    }}
                >
                    {/* Shockwave Pulse */}
                    <div
                        className="absolute -inset-4 bg-[#2dd4bf] rounded-full blur-xl opacity-40 animate-ping duration-1000"
                        style={{
                            animationDuration: '2s'
                        }}
                    />

                    <div className="absolute -inset-1 bg-gradient-to-r from-[#2dd4bf] to-[#3b82f6] rounded-full blur opacity-60" />

                    <div className="relative px-10 py-5 bg-slate-900 rounded-full text-white font-bold text-2xl flex items-center gap-4 shadow-2xl shadow-blue-500/20">
                        {scene.ctaText || "Try it now!"}
                        <svg className="w-6 h-6 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};
