import React, { useMemo } from 'react';
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Img,
    Sequence,
    Easing,
    random
} from 'remotion';
import { Scene } from '@/lib/types';
import { MousePointer2 } from 'lucide-react';

// --- Assets ---
const BACKGROUND_URL = "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=2070&auto=format&fit=crop";

// Logos
const LOGOS = [
    { label: 'Z', bg: '#03363D', color: 'white' }, // Zendesk
    { label: 'A', bg: '#1C9BF0', color: 'white' }, // App Store
    { label: 'G', bg: '#8A2BE2', color: 'white' }, // Gong
    { label: 'F', bg: '#F24E1E', color: 'white' }, // Figma
    { label: 'G2', bg: '#FF492C', color: 'white' }, // G2
    { label: 'D', bg: '#333333', color: 'white' }, // Delighted
    { label: 'S', bg: '#00C853', color: 'white' }, // SurveyMonkey
];

// Avatars
const AVATARS = [
    { src: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&h=300&fit=crop', role: 'Product Manager' },
    { src: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop', role: 'Customer Experience' },
    { src: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop', role: 'Voice of Customer' },
    { src: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop', role: 'Employee Experience' },
    { src: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&h=300&fit=crop', role: 'Product Operations' },
];

const THEME = {
    brand: '#8B237E', // Viable Purple
    bg: '#FDF4FF', // Soft pinkish background
    chartPurple: '#9333EA',
    chartOrange: '#F97316'
};

// --- Sub-Components ---

const TargetIcon = ({ scale = 1, opacity = 1, progress = 1 }) => {
    const dashOffset = interpolate(progress, [0, 1], [300, 0]);
    
    return (
        <div style={{
            transform: `scale(${scale})`, opacity,
            width: 120, height: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <circle cx="50" cy="50" r="45" stroke={THEME.brand} strokeWidth="8" fill="none" 
                    strokeDasharray="300" strokeDashoffset={dashOffset} strokeLinecap="round" filter="url(#glow)" />
                <circle cx="50" cy="50" r="25" stroke={THEME.brand} strokeWidth="8" fill="none" 
                    strokeDasharray="160" strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transformOrigin: 'center', transform: 'rotate(-180deg)' }}/>
                <circle cx="50" cy="50" r="10" fill={THEME.brand} style={{ opacity: progress }} />
                {/* Arrow */}
                <g style={{ opacity: interpolate(progress, [0.8, 1], [0, 1]) }}>
                    <path d="M50 50 L82 18" stroke={THEME.brand} strokeWidth="8" strokeLinecap="round" />
                    <path d="M82 18 L82 38 M82 18 L62 18" stroke={THEME.brand} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>
            </svg>
        </div>
    );
};

const LogoBubble = ({ label, bg, color, x, y, delay, scale, convergeProgress }: any) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    
    const pop = spring({ frame: frame - delay, fps, config: { stiffness: 200, damping: 15 } });
    
    // Convergence logic: Move from (x,y) to Center (300, 200) based on progress
    const currentX = interpolate(convergeProgress, [0, 1], [x, 300]);
    const currentY = interpolate(convergeProgress, [0, 1], [y, 200]);
    const currentScale = interpolate(convergeProgress, [0, 0.8, 1], [1, 0.5, 0]); // Shrink to nothing
    const currentOpacity = interpolate(convergeProgress, [0.8, 1], [1, 0]);

    if (frame < delay) return null;

    return (
        <div style={{
            position: 'absolute', left: 0, top: 0,
            transform: `translate(${currentX}px, ${currentY}px) translate(-50%, -50%) scale(${pop * scale * currentScale})`,
            opacity: currentOpacity,
            width: 50, height: 50, borderRadius: '50%',
            backgroundColor: 'white',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                backgroundColor: bg, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 16, fontFamily: 'sans-serif'
            }}>
                {label}
            </div>
        </div>
    );
};

const PersonaBubble = ({ src, role, x, y, delay, monitorCenter }: any) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    
    const pop = spring({ frame: frame - delay, fps, config: { stiffness: 180, damping: 18 } });
    const float = Math.sin((frame + delay) / 40) * 10;

    // Line drawing
    const lineProgress = spring({ frame: frame - delay - 10, fps, config: { stiffness: 50 } });

    return (
        <>
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40 }}>
                <line 
                    x1={x} y1={y} 
                    x2={monitorCenter.x} y2={monitorCenter.y} 
                    stroke="white" strokeWidth="2" strokeDasharray="4 4"
                    strokeOpacity={0.6 * lineProgress}
                />
                <circle cx={x} cy={y} r="4" fill="white" fillOpacity={lineProgress} />
            </svg>

            <div style={{
                position: 'absolute', left: x, top: y,
                transform: `translate(-50%, -50%) translateY(${float}px) scale(${pop})`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                zIndex: 50
            }}>
                <div style={{
                    width: 70, height: 70, borderRadius: '50%',
                    border: '3px solid white',
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}>
                    <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                {/* Glassmorphic Label */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.85)', 
                    backdropFilter: 'blur(8px)',
                    padding: '6px 12px', borderRadius: 12,
                    fontSize: 11, fontWeight: 700, color: THEME.brand,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.5)'
                }}>
                    {role}
                </div>
            </div>
        </>
    );
};

const DashboardScreen = ({ opacity, scale }: { opacity: number, scale: number }) => (
    <div style={{
        position: 'absolute', inset: 0,
        opacity, transform: `scale(${scale})`,
        background: '#FFFFFF', display: 'flex', flexDirection: 'column',
        fontFamily: 'Inter, sans-serif', padding: 20
    }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#333' }}>Helpdesk Analysis</div>
                <div style={{ fontSize: 8, color: '#999', fontWeight: 600 }}>Weekly Volume</div>
            </div>
            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#eee' }} />
        </div>
        
        {/* Wave Chart Area (Matches Reference) */}
        <div style={{ height: 70, marginBottom: 15, position: 'relative', overflow: 'hidden' }}>
             <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={THEME.chartPurple} stopOpacity="0.8"/>
                        <stop offset="1" stopColor={THEME.chartPurple} stopOpacity="0.2"/>
                    </linearGradient>
                    <linearGradient id="gradO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={THEME.chartOrange} stopOpacity="0.8"/>
                        <stop offset="1" stopColor={THEME.chartOrange} stopOpacity="0.2"/>
                    </linearGradient>
                </defs>
                <path d="M0,50 L0,20 C20,10 40,30 60,15 C80,0 100,20 100,20 V50 Z" fill="url(#gradP)" />
                <path d="M0,50 L0,35 C30,45 50,20 70,30 C90,40 100,25 100,25 V50 Z" fill="url(#gradO)" style={{ mixBlendMode: 'multiply' }} />
             </svg>
             {/* Grid Lines */}
             <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', opacity: 0.1 }}>
                 {[1,2,3,4,5].map(i => <div key={i} style={{ width: 1, height: '100%', background: 'black' }} />)}
             </div>
        </div>

        {/* Table Mockup */}
        <div style={{ display: 'flex', fontSize: 8, fontWeight: 700, color: '#999', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>Email</div>
            <div style={{ flex: 1 }}>NPS</div>
            <div style={{ flex: 2 }}>Feedback</div>
            <div style={{ flex: 1 }}>Score</div>
        </div>
        {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', height: 20, borderBottom: '1px solid #f9f9f9', marginBottom: 2 }}>
                <div style={{ flex: 1 }}><div style={{ width: '60%', height: 4, background: '#f0f0f0', borderRadius: 2 }} /></div>
                <div style={{ flex: 1 }}><div style={{ width: '30%', height: 4, background: '#f0f0f0', borderRadius: 2 }} /></div>
                <div style={{ flex: 2 }}><div style={{ width: '80%', height: 4, background: '#f0f0f0', borderRadius: 2 }} /></div>
                <div style={{ flex: 1 }}><div style={{ width: '40%', height: 4, background: i === 0 ? THEME.brand : '#f0f0f0', borderRadius: 2 }} /></div>
            </div>
        ))}
    </div>
);

// --- Main Scene ---

export const Intro: React.FC<{ scene: Scene }> = ({ scene }) => {
    const { fps, width, height } = useVideoConfig();
    const frame = useCurrentFrame();

    // --- TIMELINE ---
    // 0-60: Brand Reveal (Target -> Logo -> URL)
    // 60-100: Office Reveal + Empty Screen
    // 100-160: Integrations Float In
    // 160-190: Converge + Click -> Target Processing
    // 190-230: Target Expands to Dashboard
    // 230+: Avatars (Ecosystem)

    // 1. Brand Reveal (0-60)
    const logoProgress = spring({ frame, fps, config: { stiffness: 80, damping: 20 } });
    const brandOpacity = interpolate(frame, [0, 50, 60], [1, 1, 0]);
    const textSlide = spring({ frame: frame - 15, fps, config: { damping: 15 } });

    // Floating Particles for Brand Scene
    const particles = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
        x: random(i) * width,
        y: random(i + 10) * height,
        size: random(i + 20) * 10 + 2,
    })), [width, height]);

    // 2. Office Scene (60+)
    const officeOpacity = interpolate(frame, [55, 65], [0, 1]);
    
    // Monitor Perspective Transform
    // Adjusted to match the specific "man looking at screen" image
    const monitorStyle: React.CSSProperties = {
        position: 'absolute',
        top: '31%', left: '27.5%', width: '36%', height: '39%',
        transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)',
        backgroundColor: '#fff',
        overflow: 'hidden',
        boxShadow: '0 0 30px rgba(255,255,255,0.2)' 
    };

    // 3. Integrations (100-160)
    const convergeStart = 160;
    const convergeProgress = spring({ frame: frame - convergeStart, fps, config: { stiffness: 60 } });
    
    const logoPositions = [
        { x: 100, y: 100 }, { x: 500, y: 80 }, 
        { x: 550, y: 300 }, { x: 50, y: 320 }, 
        { x: 300, y: 50 }, { x: 300, y: 350 },
        { x: 150, y: 200 }
    ];

    // 4. Cursor Interaction (150-170)
    // Cursor enters, clicks center, leaves
    const cursorX = interpolate(frame, [150, 165, 180], [600, 300, 600], { easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    const cursorY = interpolate(frame, [150, 165, 180], [400, 250, 400], { easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    const clickScale = interpolate(frame, [165, 168, 171], [1, 0.8, 1], { extrapolateRight: 'clamp' });
    const showCursor = frame > 150 && frame < 190;

    // 5. Target Center (Processing) (160-190)
    const showTargetOnScreen = frame > 160;
    const targetScale = interpolate(convergeProgress, [0, 0.8, 1], [0, 1.2, 1]); // Pop in
    const targetOpacity = interpolate(frame, [190, 200], [1, 0]); // Fade out for dashboard

    // 6. Dashboard (190+)
    const dashboardStart = 190;
    const dashboardScale = interpolate(spring({ frame: frame - dashboardStart, fps }), [0, 1], [0.8, 1]);
    const dashboardOpacity = interpolate(frame, [dashboardStart, dashboardStart + 10], [0, 1]);

    // 7. Personas (230+)
    const monitorCenter = { x: width * 0.45, y: height * 0.5 };
    const personaPositions = [
        { x: width * 0.20, y: height * 0.25 },
        { x: width * 0.70, y: height * 0.20 },
        { x: width * 0.15, y: height * 0.65 },
        { x: width * 0.80, y: height * 0.60 },
        { x: width * 0.50, y: height * 0.85 },
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: THEME.bg }}>
            
            {/* PART 1: Brand Reveal Sequence */}
            <AbsoluteFill style={{ 
                opacity: brandOpacity, 
                alignItems: 'center', justifyContent: 'center',
                background: `radial-gradient(circle, #fff 0%, ${THEME.bg} 100%)`,
                zIndex: 100
            }}>
                {/* Background Particles */}
                {particles.map((p, i) => (
                    <div key={i} style={{
                        position: 'absolute', left: p.x, top: p.y,
                        width: p.size, height: p.size, borderRadius: '50%',
                        background: THEME.brand, opacity: 0.05,
                        transform: `translateY(${Math.sin(frame / 20 + i) * 20}px)`
                    }} />
                ))}

                <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
                    <TargetIcon scale={1.5} progress={logoProgress} />
                    <div style={{ overflow: 'hidden' }}>
                        <h1 style={{ 
                            fontSize: 120, color: THEME.brand, margin: 0, fontWeight: 800,
                            fontFamily: 'Inter, sans-serif', letterSpacing: '-0.04em',
                            transform: `translateY(${interpolate(textSlide, [0, 1], [100, 0])}%)`,
                            opacity: interpolate(textSlide, [0, 1], [0, 1])
                        }}>
                            viable
                        </h1>
                    </div>
                </div>
                <div style={{
                    position: 'absolute', bottom: '30%',
                    fontSize: 32, fontWeight: 600, color: '#666',
                    opacity: interpolate(frame, [30, 40], [0, 1])
                }}>
                    Start your free trial
                </div>
                <div style={{
                    position: 'absolute', bottom: '10%',
                    fontSize: 24, fontWeight: 500, color: THEME.brand, letterSpacing: 2,
                    opacity: interpolate(frame, [35, 45], [0, 1])
                }}>
                    askviable.com
                </div>
            </AbsoluteFill>

            {/* PART 2: Office Scene */}
            <AbsoluteFill style={{ opacity: officeOpacity }}>
                <Img src={BACKGROUND_URL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* The Monitor Content */}
                <div style={monitorStyle}>
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        
                        {/* A. Integrations Floating & Converging */}
                        {LOGOS.map((logo, i) => (
                            <LogoBubble 
                                key={i} {...logo} 
                                x={logoPositions[i].x} 
                                y={logoPositions[i].y} 
                                delay={100 + i * 8}
                                scale={1}
                                convergeProgress={convergeProgress}
                            />
                        ))}

                        {/* B. Target Processing */}
                        {showTargetOnScreen && (
                            <div style={{ 
                                position: 'absolute', inset: 0, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: targetOpacity
                            }}>
                                <TargetIcon scale={targetScale} />
                            </div>
                        )}

                        {/* C. Cursor Interaction (Inside Screen Space) */}
                        {showCursor && (
                            <div style={{
                                position: 'absolute', left: 0, top: 0,
                                transform: `translate(${cursorX}px, ${cursorY}px) scale(${clickScale})`,
                                zIndex: 100
                            }}>
                                <MousePointer2 size={32} fill="black" color="white" />
                            </div>
                        )}

                        {/* D. Dashboard Reveal */}
                        <DashboardScreen opacity={dashboardOpacity} scale={dashboardScale} />
                    </div>
                </div>

                {/* PART 3: AR Personas Overlay */}
                {/* Connecting to the monitor from outside */}
                {AVATARS.map((avatar, i) => {
                    const delay = 230 + i * 10;
                    if (frame < delay) return null;
                    return (
                        <PersonaBubble 
                            key={i} {...avatar}
                            x={personaPositions[i].x}
                            y={personaPositions[i].y}
                            delay={delay}
                            monitorCenter={monitorCenter}
                        />
                    );
                })}

            </AbsoluteFill>

        </AbsoluteFill>
    );
};
