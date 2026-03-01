import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface ChatBubbleProps {
    x: number;
    y: number;
    delay: number;
    text: string;
    avatar?: React.ReactNode;
    direction?: 'left' | 'right';
    variant?: 'blue' | 'green' | 'gray';
    scale?: number;
    timestamp?: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
    x, y, delay, text, avatar, direction = 'left', variant = 'blue', scale = 1, timestamp
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (frame < delay) return null;

    const pop = spring({ frame: frame - delay, fps, config: { damping: 14 } });
    const float = Math.sin((frame + delay) / 30) * 8;

    const colors = {
        blue: { bg: '#3B82F6', text: 'white' },
        green: { bg: '#10B981', text: 'white' },
        gray: { bg: 'white', text: '#1F2937' },
    };

    const style = colors[variant];
    const isLeft = direction === 'left';

    return (
        <div style={{
            position: 'absolute',
            left: x, top: y,
            transform: `translateY(${float}px) scale(${pop * scale})`,
            display: 'flex',
            flexDirection: isLeft ? 'row' : 'row-reverse',
            alignItems: 'flex-end',
            gap: 12,
            zIndex: 20
        }}>
            {/* Avatar Circle */}
            <div style={{
                width: 50, height: 50,
                borderRadius: '50%',
                backgroundColor: '#ddd',
                overflow: 'hidden',
                border: '3px solid white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                {avatar}
            </div>

            {/* Bubble */}
            <div style={{
                backgroundColor: style.bg,
                color: style.text,
                padding: '16px 20px',
                borderRadius: 24,
                borderBottomLeftRadius: isLeft ? 4 : 24,
                borderBottomRightRadius: isLeft ? 24 : 4,
                boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)',
                fontSize: 20,
                fontWeight: 600,
                maxWidth: 400,
                fontFamily: 'Inter, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end'
            }}>
                <span style={{ textAlign: 'left', lineHeight: 1.4 }}>{text}</span>
                {timestamp && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 4,
                        fontSize: 12,
                        opacity: 0.8,
                        fontWeight: 500
                    }}>
                        {timestamp}
                        {/* Double Check SVG */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 12l5 5 10-10" />
                            <path d="M2 12l5 5m5-5l5-5" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
};
