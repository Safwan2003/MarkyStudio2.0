import React, { useMemo } from 'react';
import {
    AbsoluteFill,
    useVideoConfig,
    useCurrentFrame,
    Img,
    interpolate
} from 'remotion';
import {
    MessageSquare,
    Heart,
    AlertCircle,
    HelpCircle,
    Truck,
    Smartphone,
    Database,
    Calendar,
    MousePointer,
    ThumbsUp
} from 'lucide-react';

// --- 1. Design Tokens & Configuration ---

const THEME = {
    bgGradient: 'linear-gradient(180deg, #FDF4FF 0%, #F5F3FF 100%)',
    textDark: '#1F2937',
    font: 'Inter, system-ui, sans-serif',
    badges: {
        high: { bg: '#FEF2F2', text: '#B91C1C' },
        medium: { bg: '#FFFBEB', text: '#B45309' },
        low: { bg: '#F3F4F6', text: '#374151' },
    },
    iconColors: {
        red: '#DC2626',
        purple: '#7C3AED',
        orange: '#F59E0B',
        blue: '#2563EB'
    }
};

const CARDS_DATA = [
    { id: 1, icon: Truck, text: "Shipping delays, Europe", pill: "High", type: "high", color: THEME.iconColors.red },
    { id: 2, icon: Smartphone, text: "Is there an Android app?", pill: "Low", type: "low", color: THEME.iconColors.purple },
    { id: 3, icon: AlertCircle, text: "Premium subscription is too expensive", pill: "Low", type: "low", color: THEME.iconColors.purple },
    { id: 4, icon: Heart, text: "Easy to use app, great features", pill: "Low", type: "low", color: THEME.iconColors.purple },
    { id: 5, icon: AlertCircle, text: "Users frustrated with app bugs", pill: "High", type: "high", color: THEME.iconColors.red },
    { id: 6, icon: Calendar, text: "Users want more scheduling functionality", pill: "Low", type: "low", color: THEME.iconColors.orange },
    { id: 7, icon: MessageSquare, text: "Watch and phone keep unpairing", pill: "Medium", type: "medium", color: THEME.iconColors.red },
    { id: 8, icon: Database, text: "Can I export my data from the app?", pill: "Low", type: "low", color: THEME.iconColors.purple },
    { id: 9, icon: MousePointer, text: "Intrusive ads are annoying", pill: "High", type: "high", color: THEME.iconColors.red },
    { id: 10, icon: ThumbsUp, text: "Set up is very easy", pill: "Low", type: "low", color: THEME.iconColors.purple },
    { id: 11, icon: HelpCircle, text: "How do I reset my password?", pill: "Low", type: "low", color: THEME.iconColors.blue },
];

// --- 2. Sub-Components ---

const DataParticle = ({ x, y, z, scale, opacity }: any) => {
    // A small glowing "plus" or dot
    if (opacity < 0.1) return null;
    return (
        <div style={{
            position: 'absolute',
            left: x, top: y,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity: opacity * 0.6,
            width: 8, height: 8,
            borderRadius: '50%',
            background: '#8B5CF6',
            boxShadow: '0 0 10px #8B5CF6',
            zIndex: z > 0 ? 25 : 5
        }} />
    );
};

const FeedbackCard = ({ item, scale, opacity, blur, isActive }: any) => {
    const badge = THEME.badges[item.type as keyof typeof THEME.badges] || THEME.badges.low;
    const Icon = item.icon;

    // Active State: Glow & Size Boost
    const activeTransform = isActive ? 'scale(1.05)' : 'scale(1)';
    const activeShadow = isActive ?
        '0 30px 60px -12px rgba(139, 92, 246, 0.4), 0 0 0 3px rgba(139, 92, 246, 0.2)' :
        '0 20px 50px -12px rgba(139, 92, 246, 0.15), 0 4px 10px -4px rgba(0,0,0,0.05)';

    return (
        <div style={{
            transform: `${activeTransform} scale(${scale})`,
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            opacity,
            filter: `blur(${blur}px)`,
            width: 380, // Slightly wider for elegance
            background: 'white',
            borderRadius: 18,
            padding: '14px 20px',
            boxShadow: activeShadow,
            display: 'flex', alignItems: 'center', gap: 16,
            border: isActive ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255,255,255,0.8)',
        }}>
            {/* Icon Bubble */}
            <div style={{
                color: 'white',
                backgroundColor: item.color,
                borderRadius: '50%',
                width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={18} strokeWidth={2.5} />
            </div>

            {/* Text */}
            <span style={{
                flex: 1, fontSize: 14, fontWeight: 600, color: THEME.textDark,
                lineHeight: 1.4, fontFamily: THEME.font,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
                {item.text}
            </span>

            {/* Pill Badge */}
            <div style={{
                backgroundColor: badge.bg,
                padding: '5px 12px', borderRadius: 99,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <span style={{
                    fontSize: 11, fontWeight: 700, color: badge.text,
                    fontFamily: THEME.font, letterSpacing: '0.02em', lineHeight: 1
                }}>
                    {item.pill}
                </span>
            </div>
        </div>
    );
};

// --- 3. Main Scene Composition ---

export const SocialProof: React.FC = () => {
    const { width, height } = useVideoConfig();
    const frame = useCurrentFrame();

    // -- 3D Physics Engine (Tilted Ring) --

    // Config
    const RADIUS_X = 900;       // Wide ellipse
    const RADIUS_Z = 300;       // Depth
    const TILT_ANGLE = 0.15;    // Tilt down slightly (radians)
    const ROTATION_SPEED = 0.0025;

    // Interaction Zone (Where the finger points)
    // In our 3D space, the finger is roughly at X: +300, Y: -100, Z: 50 -> "Front Right"

    const positionedElements = useMemo(() => {
        // 1. CARDS interaction
        const cards = CARDS_DATA.map((card, i) => {
            const offset = (i / CARDS_DATA.length) * Math.PI * 2;
            const theta = (frame * ROTATION_SPEED) + offset;

            // 3D Position on Untilted Circle
            let xRaw = Math.cos(theta) * RADIUS_X;
            let zRaw = Math.sin(theta) * RADIUS_Z;
            let yRaw = Math.sin((frame * 0.025) + i) * 40; // Bobbing

            // Apply TILT (Rotate around X axis)
            // y' = y*cos(a) - z*sin(a)
            // z' = y*sin(a) + z*cos(a)
            let y = yRaw * Math.cos(TILT_ANGLE) - zRaw * Math.sin(TILT_ANGLE);
            let z = yRaw * Math.sin(TILT_ANGLE) + zRaw * Math.cos(TILT_ANGLE);
            let x = xRaw; // No rotation around Y/Z axes for the tilt itself

            // Project
            const scale = interpolate(z, [-RADIUS_Z, RADIUS_Z], [0.5, 1.1]);
            const screenX = width / 2 + x * 0.95;
            const screenY = height / 2 + y - 50; // -50 to shift whole ring up

            // Activation Logic
            // The finger is roughly at screen coordinates (x=width*0.6, y=height*0.45)
            // Actually, let's just pick based on Z-proximity and X-proximity
            const distToFinger = Math.sqrt(Math.pow(x - 350, 2) + Math.pow(z - 100, 2)); // Faked "sweet spot" at 350, 100
            const isActive = distToFinger < 250 && z > 0; // Must be close and in front

            return {
                type: 'card' as const,
                id: card.id,
                payload: card,
                x: screenX,
                y: screenY,
                z,
                scale,
                opacity: interpolate(z, [-RADIUS_Z, -RADIUS_Z + 100], [0.2, 1]),
                blur: interpolate(z, [-RADIUS_Z, 0], [6, 0], { extrapolateLeft: 'clamp' }),
                isActive
            };
        });

        // 2. PARTICLES (Decoration)
        // Generate a few random particles that orbit with the ring
        const particles = new Array(8).fill(0).map((_, i) => {
            const seed = i * 999;
            const theta = (frame * (ROTATION_SPEED * 1.5)) + seed; // Faster orbit

            // Random radius variation
            const rX = RADIUS_X * (0.8 + (seed % 40) / 100);
            const rZ = RADIUS_Z * (0.8 + (seed % 40) / 100);

            let xRaw = Math.cos(theta) * rX;
            let zRaw = Math.sin(theta) * rZ;
            let yRaw = (seed % 200) - 100; // Spread vertically

            let y = yRaw * Math.cos(TILT_ANGLE) - zRaw * Math.sin(TILT_ANGLE);
            let z = yRaw * Math.sin(TILT_ANGLE) + zRaw * Math.cos(TILT_ANGLE);
            let x = xRaw;

            const scale = interpolate(z, [-RADIUS_Z, RADIUS_Z], [0.3, 0.8]);

            return {
                type: 'particle' as const,
                id: `p-${i}`,
                x: width / 2 + x,
                y: height / 2 + y - 50,
                z,
                scale,
                opacity: 0.6
            };
        });

        return [...cards, ...particles]
            .sort((a, b) => a.z - b.z); // Depth Sort

    }, [frame, width, height]);

    // Split layers
    const backElements = positionedElements.filter(el => el.z < 0);
    const frontElements = positionedElements.filter(el => el.z >= 0);

    const personY = interpolate(frame, [0, 30], [200, 0], { extrapolateRight: 'clamp' });
    const personOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{
            background: THEME.bgGradient,
            perspective: '1200px',
            overflow: 'hidden'
        }}>

            {/* LAYER 1: BACK */}
            {backElements.map((el) => {
                if (el.type === 'particle') return <DataParticle key={el.id} {...el} />;
                return (
                    <div key={el.id} style={{
                        position: 'absolute', left: el.x, top: el.y,
                        transform: 'translate(-50%, -50%)', zIndex: 10
                    }}>
                        <FeedbackCard
                            item={el.payload}
                            scale={el.scale}
                            opacity={el.opacity}
                            blur={el.blur}
                            isActive={el.isActive}
                        />
                    </div>
                );
            })}

            {/* LAYER 2: MAN (Center) */}
            <div style={{
                position: 'absolute',
                left: '50%', top: '50%',
                transform: `translate(-50%, calc(-43% + ${personY}px))`, // -43% to center 
                zIndex: 20,
                opacity: personOpacity,
                height: 720, // Larger presence
                // Light ground shadow
                filter: 'drop-shadow(0 60px 50px rgba(0,0,0,0.25))',
                mixBlendMode: 'multiply'
            }}>
                <Img
                    src="/man_pointing.png"
                    style={{ height: '100%', objectFit: 'contain' }}
                />
            </div>

            {/* Holographic light emanation from hand area (Approx pos) */}
            <div style={{
                position: 'absolute',
                left: '60%', top: '45%',
                width: 400, height: 400,
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
                transform: 'translate(-50%, -50%)',
                zIndex: 25,
                pointerEvents: 'none',
                mixBlendMode: 'screen'
            }} />

            {/* LAYER 3: FRONT */}
            {frontElements.map((el) => {
                if (el.type === 'particle') return <DataParticle key={el.id} {...el} />;
                return (
                    <div key={el.id} style={{
                        position: 'absolute', left: el.x, top: el.y,
                        transform: 'translate(-50%, -50%)', zIndex: 30
                    }}>
                        <FeedbackCard
                            item={el.payload}
                            scale={el.scale}
                            opacity={el.opacity}
                            blur={el.blur}
                            isActive={el.isActive}
                        />
                    </div>
                );
            })}

        </AbsoluteFill>
    );
};