import React from 'react';

export const LaptopMockup: React.FC<{ children?: React.ReactNode, style?: React.CSSProperties }> = ({ children, style }) => (
    <div
        style={{
            width: 800,
            height: 500,
            backgroundColor: '#1e293b', // Darker slate chassis
            borderRadius: 14,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -10%) rotateX(10deg)',
            boxShadow: '0 25px 60px -10px rgba(0,0,0,0.6)',
            padding: '12px 12px 0 12px',
            perspective: 1000,
            zIndex: 5,
            ...style
        }}
    >
        {/* Screen Bezel & Panel */}
        <div
            style={{
                width: '100%',
                height: 'calc(100% - 15px)',
                backgroundColor: '#000', // Black bezel
                borderRadius: 8,
                overflow: 'hidden',
                transform: 'rotateX(-10deg)',
                transformOrigin: 'bottom center',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05)'
            }}
        >
            {/* Webcam Dot */}
            <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, background: '#333', borderRadius: '50%', zIndex: 20 }} />

            {/* Actual Screen Area */}
            <div style={{
                position: 'absolute', top: '4%', left: '3%', width: '94%', height: '92%',
                backgroundColor: 'white',
                overflow: 'hidden',
                borderRadius: 2
            }}>
                {children}
            </div>

            {/* Screen Glare */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(115deg, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0) 60%)',
                pointerEvents: 'none', zIndex: 50
            }} />
        </div>
    </div>
);
