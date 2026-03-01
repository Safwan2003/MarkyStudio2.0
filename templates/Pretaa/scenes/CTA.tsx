import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Scene } from '@/lib/types';
import { GradientBlob } from '../components/GradientBlob';

interface CTAProps {
    scene: Scene;
    brand?: { name?: string; primaryColor?: string; url?: string };
}

export const CTA: React.FC<CTAProps> = ({ scene, brand }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const brandName = brand?.name || 'pretaa';
    const primaryColor = brand?.primaryColor || '#3b5998';
    const ctaText = scene.ctaText || 'Contact Us Today';
    const ctaUrl = scene.ctaUrl || brand?.url || 'pretaa.com';

    const logoScale = spring({ frame, fps, config: { stiffness: 50, damping: 12 } });
    const buttonScale = spring({ frame: frame - 20, fps, config: { stiffness: 80, damping: 14 } });
    const urlOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{ backgroundColor: '#f4f4f7', overflow: 'hidden' }}>
            {/* Background gradient blobs */}
            <GradientBlob color="rgba(59, 130, 246, 0.25)" x={width * 0.15} y={height * 0.3} size={400} speed={0.5} />
            <GradientBlob color="rgba(248, 113, 113, 0.2)" x={width * 0.85} y={height * 0.7} size={350} speed={0.7} />

            {/* Spotlight effect */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.6,
                    pointerEvents: 'none',
                }}
            />

            {/* Main Content */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 40,
                }}
            >
                {/* Brand Logo / Name */}
                <h1
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 120,
                        fontWeight: 800,
                        color: '#1e3a5f',
                        letterSpacing: '-0.04em',
                        transform: `scale(${logoScale})`,
                        opacity: logoScale,
                        textShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    }}
                >
                    {brandName}
                </h1>

                {/* CTA Button with Pulse */}
                <button
                    style={{
                        background: primaryColor,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 16,
                        padding: '24px 64px',
                        fontSize: 24,
                        fontWeight: 700,
                        fontFamily: 'Inter, sans-serif',
                        cursor: 'pointer',
                        boxShadow: `0 20px 50px ${primaryColor}50, inset 0 2px 0 rgba(255,255,255,0.2)`,
                        transform: `scale(${buttonScale + Math.sin(frame / 10) * 0.02})`,
                        opacity: buttonScale,
                    }}
                >
                    {ctaText}
                </button>

                {/* URL */}
                <span
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 20,
                        color: '#6b7280',
                        opacity: urlOpacity,
                    }}
                >
                    {ctaUrl}
                </span>
            </div>
        </AbsoluteFill>
    );
};
