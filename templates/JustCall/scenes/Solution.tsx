import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Scene } from '@/lib/types';
import { ThemeStyles } from '../../Pretaa/components/ThemeEngine';

export const Solution = ({ scene, themeStyles, brand }: { scene: Scene, themeStyles: ThemeStyles, brand: any }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slideUp = spring({ frame, fps, config: { damping: 20 } });
    const y = interpolate(slideUp, [0, 1], [100, 0]);
    const opacity = interpolate(frame, [0, 20], [0, 1]);

    // Background movement
    const bgPan = interpolate(frame, [0, 300], [0, -30]);

    return (
        <AbsoluteFill className="bg-[#f8fafc] flex items-center justify-center overflow-hidden">
            {/* 1. Dynamic "Resolution" Background (Teal/Blue Orbs) */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Orb 1: Teal Calm */}
                < div
                    className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-[#2dd4bf] rounded-full blur-[130px] opacity-15 mix-blend-multiply"
                    style={{
                        transform: `scale(${interpolate(frame, [0, 100], [0.8, 1.2])})`
                    }
                    }
                />
                {/* Orb 2: Green Growth */}
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#4ade80] rounded-full blur-[100px] opacity-15 mix-blend-multiply"
                    style={{
                        transform: `translate(${Math.sin(frame * 0.05) * 30}px, 0)`
                    }}
                />
            </div >

            {/* Grid Overlay (Lighter/Cleaner for Solution) */}
            < div
                className="absolute inset-0 opacity-[0.3]"
                style={{
                    backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                    transform: `translateY(${bgPan}px)`
                }}
            />

            {/* Squiggle Accent */}
            <div className="absolute top-[20%] right-[30%] opacity-60">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ transform: `rotate(${frame}deg)` }}>
                    <path d="M20 0L30 20L40 0" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" />
                    <path d="M10 40L0 20" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>

            {/* Content Container - Centered and Balanced */}
            <div
                className="relative z-10 w-full max-w-5xl px-8 flex flex-col items-center justify-center h-full text-center"
                style={{
                    opacity,
                    transform: `translateY(${y}px)`
                }}
            >
                {/* 1. Visual Anchor: Product Identity (The "Solution") - High Energy Pop */}
                <div className="relative mb-8">
                    {/* Background Pulse/Burst */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#2dd4bf] rounded-full blur-3xl opacity-40"
                        style={{
                            transform: `translate(-50%, -50%) scale(${interpolate(frame, [0, 20], [0.5, 1.5])})`,
                            opacity: interpolate(frame, [0, 30], [0.8, 0]), // Flash effect
                        }}
                    />

                    <div
                        className="flex items-center gap-4 bg-white/90 backdrop-blur-xl p-4 pr-10 rounded-full shadow-2xl shadow-[#2dd4bf]/20 border border-white/50 relative z-10"
                        style={{
                            transform: `scale(${spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 300 } })})` // Bouncy snap
                        }}
                    >
                        <div className="w-14 h-14 relative shadow-lg shadow-green-400/40 rounded-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#2dd4bf] to-[#4ade80]" />
                            {/* Animated Logo Shape */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-l-full animate-pulse" />
                        </div>
                        <div className="flex flex-col items-start text-left">
                            <span className="text-xs font-bold text-[#2dd4bf] uppercase tracking-wider">Solution</span>
                            <span className="text-3xl font-black text-slate-800 tracking-tight leading-none">{brand?.name || 'JustCall'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Main Headline (Kinetic Word Reveal) */}
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 max-w-4xl mb-12 relative z-10">
                    {(scene.mainText || "Monitor in real time & Mentor at scale").split("&").map((part, partIndex) => (
                        <span key={partIndex} className="contents">
                            {part.split(" ").map((word, i) => {
                                // Add offset based on part index to stagger the second half later
                                const absoluteIndex = partIndex * 5 + i;
                                const delay = 10 + (absoluteIndex * 3);
                                const wordSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200 } });
                                const wordY = interpolate(wordSpring, [0, 1], [40, 0]);

                                return (
                                    <span key={`${partIndex}-${i}`} style={{
                                        display: 'inline-block',
                                        opacity: interpolate(frame, [delay, delay + 5], [0, 1]),
                                        transform: `translateY(${wordY}px) scale(${wordSpring})`,
                                        ...themeStyles.heading,
                                        fontSize: 70,
                                        color: '#1e293b',
                                        lineHeight: 1.1,
                                        textShadow: '0 2px 10px rgba(0,0,0,0.05)',
                                    }}>
                                        {word}
                                    </span>
                                )
                            })}
                            {/* Re-insert the & ampersand effectively */}
                            {partIndex === 0 && (
                                <span style={{
                                    opacity: interpolate(frame, [25, 30], [0, 1]),
                                    transform: `scale(${spring({ frame: frame - 25, fps })})`,
                                    fontSize: 70, color: '#2dd4bf', fontWeight: 900, margin: '0 0.2em'
                                }}>&</span>
                            )}
                        </span>
                    ))}
                </div>

                {/* 3. Feature Pillars (Clean Grid with Pop-in) */}
                <div className="flex flex-wrap justify-center gap-6 w-full px-4">
                    {(scene.features && scene.features.length > 0 ? scene.features.map(f => f.title) : ['Seamless Integration', 'Real-time Analytics', '24/7 Support']).map((text, i) => {
                        const delay = 20 + (i * 5); // Faster stagger (5 frames)
                        // Energetic Pop-in
                        const itemScale = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 300 } }); // Snappier
                        const opacity = interpolate(frame, [delay, delay + 5], [0, 1]); // Faster fade
                        // Floating hover effect
                        const floatY = Math.sin((frame - delay) * 0.1) * 5;

                        return (
                            <div
                                key={i}
                                className="group relative bg-white px-8 py-5 rounded-2xl border-2 border-slate-100 shadow-sm transition-colors"
                                style={{
                                    transform: `scale(${itemScale}) translateY(${floatY}px)`,
                                    opacity
                                }}
                            >
                                <div className="text-xl font-bold text-slate-700 transition-colors">
                                    {text}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AbsoluteFill >
    );
};
