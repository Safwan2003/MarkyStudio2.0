import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface AvatarProps {
    src: string;
    size?: number;
    x: number;
    y: number;
    delay?: number;
    ringColor?: string;
    ringWidth?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
    src,
    size = 100,
    x,
    y,
    delay = 0,
    ringColor = '#fff',
    ringWidth = 6,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        frame: frame - delay,
        fps,
        config: { stiffness: 80, damping: 15, mass: 1 },
    });

    const float = Math.sin((frame + delay * 10) / 40) * 8;

    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                transform: `translate(-50%, -50%) scale(${scale}) translateY(${float}px)`,
                opacity: scale,
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: `${ringWidth}px solid ${ringColor}`,
                    overflow: 'hidden',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
                    background: '#fff',
                }}
            >
                <img
                    src={src}
                    alt="avatar"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                />
            </div>
        </div>
    );
};
