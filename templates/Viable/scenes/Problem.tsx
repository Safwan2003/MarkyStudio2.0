import React, { useMemo } from 'react';
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Sequence,
    Img
} from 'remotion';
import {
    Zap,
    MessageCircle,
    Play,
    MessageSquare,
    Command,
    Smile,
    ShoppingBag,
    Layout
} from 'lucide-react';

// --- Theme & Configuration ---

const THEME = {
    bgLight: '#FDF4FF', // Soft pink/lavender
    bgPurple: '#8B237E', // Deep Viable Purple for the "Mess"
    red: '#EF4444',
    orange: '#F97316',
    textMain: '#1F2937',
    font: 'Inter, sans-serif'
};

const LOGOS = [
    { id: 1, icon: Command, label: "Zendesk", bg: 'white', color: '#03363D', size: 120, x: 500, y: 700 },
    { id: 2, icon: MessageCircle, label: "Gong", bg: 'white', color: '#8B5CF6', size: 140, x: 300, y: 300 },
    { id: 3, icon: ShoppingBag, label: "App Store", bg: 'white', color: '#1C9BF0', size: 110, x: 200, y: 600 },
    { id: 4, icon: Play, label: "Google Play", bg: 'white', color: '#34A853', size: 130, x: 700, y: 300 },
    { id: 5, icon: MessageSquare, label: "Intercom", bg: 'white', color: '#2563EB', size: 100, x: 800, y: 600 },
    { id: 6, icon: Smile, label: "Reddit", bg: 'white', color: '#FF4500', size: 110, x: 700, y: 700 },
    { id: 7, icon: Layout, label: "Typeform", bg: 'white', color: '#333', size: 90, x: 850, y: 500 },
    { id: 8, icon: Zap, label: "Zapier", bg: 'white', color: '#FF4F00', size: 100, x: 500, y: 200 },
    { id: 9, icon: Command, label: "Front", bg: 'white', color: '#F24E1E', size: 100, x: 450, y: 450 },
    { id: 10, icon: Smile, label: "Delighted", bg: 'white', color: '#333', size: 110, x: 350, y: 650 },
];

// --- Sub-Components ---

const TechCircle = ({ type, x, y, scale, opacity }: any) => {
    const isAI = type === 'AI';
    const color = isAI ? THEME.red : THEME.orange;

    return (
        <div style={{
            position: 'absolute', left: x, top: y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30
        }}>
            {/* Circle */}
            <div style={{
                width: 180, height: 180, borderRadius: '50%',
                background: isAI ? '#EF4444' : '#F97316', // Flat vibrant color
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 20px 40px -10px ${color}66`,
                color: 'white'
            }}>
                {isAI ? (
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                        <circle cx="12" cy="12" r="6" strokeDasharray="4 4" />
                        <text x="12" y="14" fontSize="8" fontWeight="bold" fill="white" stroke="none" textAnchor="middle">A</text>
                    </svg>
                ) : (
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        <path d="M8 10h.01" />
                        <path d="M12 10h.01" />
                        <path d="M16 10h.01" />
                        <path d="M12 14v2" />
                    </svg>
                )}
            </div>
            {/* Label */}
            <div style={{
                fontSize: 32, fontWeight: 700, color: THEME.textMain,
                textAlign: 'center', width: 300, lineHeight: 1.2
            }}>
                {isAI ? "Artificial\nIntelligence" : "Natural Language\nProcessing"}
            </div>
        </div>
    );
};

const LogoCard = ({ item, delay, progress, fps }: any) => {
    // Pile-up physics: Fall from top, bounce, then settle
    // We simulate a chaotic pile by randomizing end positions slightly or using the static layout

    // Scale entrance
    const scale = spring({
        frame: progress - delay,
        fps,
        config: { stiffness: 200, damping: 12 }
    });

    const Icon = item.icon;

    return (
        <div style={{
            position: 'absolute',
            left: item.x, top: item.y,
            transform: `translate(-50%, -50%) scale(${scale}) rotate(${Math.sin(delay) * 10}deg)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            zIndex: 10
        }}>
            <div style={{
                width: item.size, height: item.size,
                backgroundColor: 'white',
                borderRadius: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
            }}>
                <Icon size={item.size * 0.5} color={item.color} strokeWidth={2.5} />
            </div>
            <span style={{
                fontFamily: 'sans-serif', fontWeight: 700, color: 'white', fontSize: 18,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                {item.label}
            </span>
        </div>
    );
};

const ConnectionArc = ({ progress }: { progress: number }) => (
    <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 300, overflow: 'visible' }}>
        <path
            d="M 100 150 Q 300 0 500 150"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="10 10"
            style={{ opacity: interpolate(progress, [0, 1], [0, 1]) }}
        />
        {/* Traveling Dot */}
        {progress > 0.2 && (
            <circle r="8" fill="#8B5CF6">
                <animateMotion
                    dur="1.5s"
                    repeatCount="indefinite"
                    path="M 100 150 Q 300 0 500 150"
                />
            </circle>
        )}
    </svg>
);

// --- Main Scene ---

export const Problem: React.FC = () => {
    const { width, height, fps } = useVideoConfig();
    const frame = useCurrentFrame();

    // --- TIMELINE ---
    // 0-60: Tech Intro (Clean White BG)
    // 60-90: Connection Formed
    // 90-150: Transition to "The Mess" (Purple BG)

    // 1. Tech Intro
    const techScale = spring({ frame, fps, config: { stiffness: 100 } });
    const techOpacity = interpolate(frame, [0, 20], [0, 1]);

    // 2. Connection
    const connectProgress = spring({ frame: frame - 40, fps, config: { stiffness: 50 } });

    // 3. The Mess Transition
    const messStart = 90;
    // Background wipe: Circle expand or Fade? Let's do a Fade to Purple
    const bgPhase = interpolate(frame, [messStart, messStart + 20], [0, 1]);

    // Tech elements exit
    const techExit = interpolate(frame, [messStart, messStart + 10], [1, 0]);

    return (
        <AbsoluteFill style={{ backgroundColor: THEME.bgLight }}>

            {/* PHASE 1: CLEAN TECH */}
            <AbsoluteFill style={{ opacity: techExit }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ConnectionArc progress={connectProgress} />
                </div>

                {/* AI Node (Left) */}
                <TechCircle
                    type="AI"
                    x={width * 0.35} y={height * 0.5}
                    scale={techScale} opacity={techOpacity}
                />

                {/* NLP Node (Right) */}
                <TechCircle
                    type="NLP"
                    x={width * 0.65} y={height * 0.5}
                    scale={techScale} opacity={techOpacity}
                />
            </AbsoluteFill>

            {/* PHASE 2: THE DATA MESS */}
            {frame > messStart && (
                <AbsoluteFill style={{
                    backgroundColor: THEME.bgPurple,
                    opacity: bgPhase
                }}>
                    {/* Logos piling up */}
                    {LOGOS.map((logo, i) => (
                        <LogoCard
                            key={i} item={logo}
                            progress={frame - messStart}
                            delay={i * 3} // Fast cascade
                            fps={fps}
                        />
                    ))}
                </AbsoluteFill>
            )}

        </AbsoluteFill>
    );
};
