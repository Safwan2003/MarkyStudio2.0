import { useCurrentFrame } from 'remotion';

interface GradientBlobProps {
    color: string;
    size?: number;
    x: number;
    y: number;
    speed?: number;
    opacity?: number;
}

export const GradientBlob: React.FC<GradientBlobProps> = ({
    color,
    size = 400,
    x,
    y,
    speed = 1,
    opacity = 0.6,
}) => {
    const frame = useCurrentFrame();

    const driftX = Math.sin(frame / (80 / speed)) * 30;
    const driftY = Math.cos(frame / (90 / speed)) * 30;

    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                transform: `translate(-50%, -50%) translate(${driftX}px, ${driftY}px)`,
                filter: 'blur(60px)',
                opacity,
                pointerEvents: 'none',
            }}
        />
    );
};
