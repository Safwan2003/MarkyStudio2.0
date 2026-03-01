import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface ChatBubbleProps {
    text: string;
    avatarSrc: string;
    x: number;
    y: number;
    delay?: number;
    direction?: 'left' | 'right';
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
    text,
    avatarSrc,
    x,
    y,
    delay = 0,
    direction = 'left',
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        frame: frame - delay,
        fps,
        config: { stiffness: 100, damping: 14 },
    });

    const float = Math.sin((frame + delay * 5) / 35) * 6;

    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${scale}) translateY(${float}px)`,
                opacity: scale,
                display: 'flex',
                flexDirection: direction === 'left' ? 'row' : 'row-reverse',
                alignItems: 'center',
                gap: 0,
            }}
        >
            {/* Avatar */}
            <div
                style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '4px solid #fff',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                    flexShrink: 0,
                    zIndex: 2,
                }}
            >
                <img
                    src={avatarSrc}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>

            {/* Bubble */}
            <div
                style={{
                    background: '#fff',
                    borderRadius: direction === 'left' ? '0 24px 24px 24px' : '24px 0 24px 24px',
                    padding: '16px 24px',
                    marginLeft: direction === 'left' ? -10 : 0,
                    marginRight: direction === 'right' ? -10 : 0,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    maxWidth: 280,
                    zIndex: 1,
                }}
            >
                <span
                    style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 22,
                        fontWeight: 600,
                        color: '#1f2937',
                        letterSpacing: '0.02em',
                    }}
                >
                    {text}
                </span>
            </div>
        </div>
    );
};
