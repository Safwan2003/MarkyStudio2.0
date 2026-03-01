import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Scene, ThemeStyles } from '@/lib/types';
import { BrandIcons } from '../components/BrandIcons';

// Floating Icons Data
const FLOATING_ICONS = [
    // Left side
    { Icon: BrandIcons.AvatarWoman, x: 0.15, y: 0.25, delay: 10, size: 160, hasBadge: true, badgeIcon: '✉️', badgeColor: '#ff6b35' },
    { Icon: BrandIcons.WhatsApp, x: 0.18, y: 0.55, delay: 15, size: 130, hasBadge: true, badgeIcon: '50', badgeColor: '#25d366' },
    { Icon: BrandIcons.Gmail, x: 0.32, y: 0.40, delay: 20, size: 100, hasBadge: false },

    // Top center
    { Icon: BrandIcons.Skype, x: 0.42, y: 0.27, delay: 25, size: 95, hasBadge: false },
    { Icon: BrandIcons.Discord, x: 0.60, y: 0.18, delay: 30, size: 80, hasBadge: false },

    // Right side
    { Icon: BrandIcons.Dropbox, x: 0.78, y: 0.28, delay: 35, size: 85, hasBadge: false },
    { Icon: BrandIcons.Avatar2, x: 0.82, y: 0.72, delay: 40, size: 160, hasBadge: true, badgeIcon: '📞', badgeColor: '#10b981' },

    // Bottom
    { Icon: BrandIcons.Google, x: 0.45, y: 0.85, delay: 45, size: 75, hasBadge: false },
    { Icon: BrandIcons.TeamViewer, x: 0.60, y: 0.75, delay: 50, size: 60, hasBadge: false },
    { Icon: BrandIcons.Slack, x: 0.63, y: 0.6, delay: 55, size: 65, hasBadge: false },
];

// Chat Bubbles Data
const CHAT_MESSAGES = [
    {
        text: 'Please change the header of image\nof the product page to the image\nI sent you by email!',
        x: 0.26, y: 0.70, delay: 60, variant: 'green', timestamp: '18:42'
    },
    {
        text: 'Can you increase the font of the\nsecond paragraph on the features\npage?',
        x: 0.70, y: 0.40, delay: 65, variant: 'blue', timestamp: '18:42'
    },
];

export const Intro: React.FC<{ scene: Scene, themeStyles: ThemeStyles }> = ({ scene, themeStyles }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    return (
        <AbsoluteFill style={{
            backgroundColor: 'black',
        }}>
            {/* Background Image */}
            <Img
                src={staticFile('/fronter_intro_laptop.jpg')}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                }}
            />

            {/* Screen Overlay Container - Fitted to Laptop Screen */}
            <div style={{
                position: 'absolute',
                top: '34.5%',
                left: '34.5%',
                width: '27.5%',
                height: '30%',
                transform: '',
                borderRadius: '5px', // Slight radius for realism
                overflow: 'hidden',
                backgroundColor: '#ffffff', // Screen base color
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)', // Inner shadow for depth
            }}>
                {/* Screen Content Logic */}
                {scene.screenshotUrl ? (
                    <Img
                        src={scene.screenshotUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    /* Website Content - Matched to Reference */
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '6% 8%', // Adjusted padding for the perspective
                        fontFamily: themeStyles.bodyFont,
                        backgroundColor: '#ffffff'
                    }}>
                        {/* Navbar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#6366f1' }} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#0f172a' }}>Company</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <span style={{ fontSize: 6, fontWeight: 600, color: '#64748b' }}>Features</span>
                                <span style={{ fontSize: 6, fontWeight: 600, color: '#64748b' }}>Pricing</span>
                                <div style={{ padding: '3px 8px', background: '#4f46e5', borderRadius: 3, color: 'white', fontSize: 6, fontWeight: 600 }}>Sign Up</div>
                            </div>
                        </div>

                        {/* Hero Section */}

                        <h1 style={{
                            fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, marginBottom: 8,
                            fontFamily: themeStyles.headingFont, width: '70%', letterSpacing: '-0.02em'
                        }}>
                            {scene.mainText || 'Mockups connects the conceptual structure'}
                        </h1>
                        <p style={{ fontSize: 6, color: '#64748b', maxWidth: '60%', lineHeight: 1.5, marginBottom: 12 }}>
                            {scene.subText || 'For the quick brown fox jumps over the lazy dog. This text is a placeholder.'}
                        </p>

                        <div style={{
                            padding: '5px 12px', background: '#4f46e5', borderRadius: 4,
                            color: 'white', fontSize: 7, fontWeight: 600, width: 'fit-content',
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)'
                        }}>
                            {scene.ctaText || 'Read More'}
                        </div>

                        {/* Mobile Mockup Preview (Bottom Right) */}
                        <div style={{
                            position: 'absolute',
                            right: '8%', bottom: '-10%',
                            width: '35%', height: '70%',
                            background: '#0f172a',
                            borderRadius: '8px',
                            border: '2px solid #1e293b',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                            transform: 'rotate(-5deg)',
                            overflow: 'hidden'
                        }}>
                            {/* Dynamic Mobile Content */}
                            {scene.mobileScreenshotUrl ? (
                                <Img
                                    src={scene.mobileScreenshotUrl}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <React.Fragment>
                                    <div style={{ width: '100%', height: '10%', background: '#1e293b', borderBottom: '1px solid #334155' }} />
                                    <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ width: '60%', height: 4, background: '#334155', borderRadius: 2 }} />
                                        <div style={{ width: '80%', height: 4, background: '#334155', borderRadius: 2 }} />
                                    </div>
                                </React.Fragment>
                            )}
                        </div>

                    </div>
                )}

                {/* Glare/Reflection Overlay for Realism */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 60%)',
                    pointerEvents: 'none'
                }} />
            </div>

            {/* Floating Icons Layer */}
            {FLOATING_ICONS.map((item, i) => {
                if (frame < item.delay) return null;

                const progress = spring({
                    frame: frame - item.delay,
                    fps,
                    config: { stiffness: 100, damping: 15 }
                });

                const scale = interpolate(progress, [0, 1], [0, 1]);
                const opacity = interpolate(progress, [0, 0.5], [0, 1]);

                // Floating animation
                const floatY = Math.sin((frame - item.delay) / 30) * 10;
                const floatX = Math.cos((frame - item.delay) / 40) * 5;

                return (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: `${item.x * 100}%`,
                            top: `${item.y * 100}%`,
                            transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
                            opacity,
                            zIndex: 10 + i
                        }}
                    >
                        {/* Icon Container */}
                        <div style={{
                            width: item.size,
                            height: item.size,
                            borderRadius: '50%',
                            background: 'white',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 12,
                            position: 'relative'
                        }}>
                            <item.Icon width="100%" height="100%" />

                            {/* Notification Badge */}
                            {item.hasBadge && (
                                <div style={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: item.badgeColor,
                                    border: '3px solid white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: 'white',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                }}>
                                    {item.badgeIcon}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Chat Bubbles Layer */}
            {CHAT_MESSAGES.map((msg, i) => {
                if (frame < msg.delay) return null;

                const progress = spring({
                    frame: frame - msg.delay,
                    fps,
                    config: { stiffness: 120, damping: 14 }
                });

                const scale = interpolate(progress, [0, 1], [0.8, 1]);
                const opacity = interpolate(progress, [0, 0.5], [0, 1]);

                // Gentle floating
                const floatY = Math.sin((frame - msg.delay) / 35) * 8;

                const bgColor = msg.variant === 'green' ? '#dcf8c6' : '#0084ff';
                const textColor = msg.variant === 'green' ? '#000' : '#fff';

                return (
                    <div
                        key={`chat-${i}`}
                        style={{
                            position: 'absolute',
                            left: `${msg.x * 100}%`,
                            top: `${msg.y * 100}%`,
                            transform: `translate(-50%, -50%) translateY(${floatY}px) scale(${scale})`,
                            opacity,
                            zIndex: 20 + i
                        }}
                    >
                        <div style={{
                            background: bgColor,
                            color: textColor,
                            padding: '12px 16px',
                            borderRadius: 12,
                            fontSize: 24,
                            fontWeight: 500,
                            lineHeight: 1.4,
                            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                            maxWidth: 900,
                            whiteSpace: 'pre-line',
                            fontFamily: themeStyles.bodyFont
                        }}>
                            {msg.text}
                            {msg.timestamp && (
                                <div style={{
                                    fontSize: 10,
                                    opacity: 0.7,
                                    marginTop: 4,
                                    textAlign: 'right'
                                }}>
                                    {msg.timestamp}
                                </div>
                            )}
                        </div>

                        {/* Chat bubble tail */}
                        <div style={{
                            position: 'absolute',
                            bottom: 10,
                            left: msg.variant === 'green' ? -8 : 'auto',
                            right: msg.variant === 'blue' ? -8 : 'auto',
                            width: 0,
                            height: 0,
                            borderTop: `10px solid ${bgColor}`,
                            borderLeft: msg.variant === 'green' ? '10px solid transparent' : 'none',
                            borderRight: msg.variant === 'blue' ? '10px solid transparent' : 'none',
                        }} />
                    </div>
                );
            })}
        </AbsoluteFill>
    );
};
