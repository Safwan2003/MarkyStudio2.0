import React from 'react';
import { AbsoluteFill } from 'remotion';

interface BrowserFrameProps {
    children: React.ReactNode;
    url?: string;
    theme?: 'dark' | 'light';
    style?: React.CSSProperties;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
    children,
    url = "https://marky.studio",
    theme = 'light',
    style
}) => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#1e293b' : '#ffffff';
    const text = isDark ? '#94a3b8' : '#64748b';
    const border = isDark ? '#334155' : '#e2e8f0';

    return (
        <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: bg,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            border: `1px solid ${border}`,
            fontFamily: 'Inter, sans-serif',
            ...style
        }}>
            {/* Chrome Header */}
            <div style={{
                height: 52,
                borderBottom: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                gap: 16,
                background: isDark ? '#0f172a' : '#f8fafc',
                zIndex: 10
            }}>
                {/* Traffic Lights */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10B981' }} />
                </div>

                {/* Address Bar */}
                <div style={{
                    flex: 1,
                    height: 32,
                    backgroundColor: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: text,
                    fontWeight: 500
                }}>
                    <span style={{ opacity: 0.6 }}>🔒</span>
                    <span style={{ marginLeft: 8 }}>{url}</span>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <AbsoluteFill>
                    {children}
                </AbsoluteFill>
            </div>
        </div>
    );
};
