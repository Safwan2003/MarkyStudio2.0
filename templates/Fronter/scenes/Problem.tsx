import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Scene, ThemeStyles } from '@/lib/types';
import { BrandIcons } from '../components/BrandIcons';

// Team Members Data - Pixel Perfect match to new reference
const TEAM_MEMBERS = [
    // Top Left - Manager (Peach)
    {
        id: 'T1',
        role: 'MANAGER',
        roleColor: '#000000',
        roleBg: '#ffedd5', // Peach
        Avatar: BrandIcons.AvatarWoman,
        x: 0.15, y: 0.20,
        delay: 10,
        size: 140,
        badgePos: 'right',
        borderColor: '#ffedd5'
    },
    // Top Right - Copywriter (Blue)
    {
        id: 'T2',
        role: 'COPYWRITER',
        roleColor: '#ffffff',
        roleBg: '#312e81', // Indigo-900
        Avatar: BrandIcons.AvatarMan,
        x: 0.85, y: 0.20,
        delay: 15,
        size: 140,
        badgePos: 'left',
        borderColor: '#312e81'
    },
    // Middle Left - Designer (Pink)
    {
        id: 'T3',
        role: 'DESIGNER',
        roleColor: '#ffffff',
        roleBg: '#f43f5e', // Rose-500
        Avatar: BrandIcons.AvatarWoman,
        x: 0.08, y: 0.50,
        delay: 20,
        size: 130,
        badgePos: 'right',
        borderColor: '#f43f5e'
    },
    // Middle Right - Designer (Light Pink)
    {
        id: 'T4',
        role: 'DESIGNER',
        roleColor: '#000000',
        roleBg: '#fbcfe8', // Pink-200
        Avatar: BrandIcons.Avatar1,
        x: 0.92, y: 0.50,
        delay: 25,
        size: 130,
        badgePos: 'left',
        borderColor: '#fbcfe8'
    },
    // Bottom Left - QA Tester (Teal)
    {
        id: 'T5',
        role: 'QA TESTER',
        roleColor: '#ffffff',
        roleBg: '#2dd4bf', // Teal-400
        Avatar: BrandIcons.Avatar2,
        x: 0.20, y: 0.82,
        delay: 30,
        size: 140,
        badgePos: 'right',
        borderColor: '#2dd4bf'
    },
    // Bottom Right - Developer (Yellow)
    {
        id: 'T6',
        role: 'DEVELOPER',
        roleColor: '#000000',
        roleBg: '#fcd34d', // Amber-300
        Avatar: BrandIcons.Avatar2,
        x: 0.80, y: 0.82,
        delay: 35,
        size: 140,
        badgePos: 'left',
        borderColor: '#fcd34d'
    },
];

export const Problem: React.FC<{ scene: Scene, themeStyles: ThemeStyles }> = ({ scene, themeStyles }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Smoother camera zoom animation
    const zoomStartFrame = 15;
    const zoomProgress = spring({
        frame: Math.max(0, frame - zoomStartFrame),
        fps,
        config: { stiffness: 40, damping: 25 }
    });
    const cameraScale = interpolate(zoomProgress, [0, 1], [1, 2.2]);
    const cameraY = interpolate(zoomProgress, [0, 3], [0, 1]);

    // Tightened Transitions for 5s (150 frame) scene
    const logoTextOpacity = interpolate(frame, [0, 20, 30, 45], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const logoIconOpacity = interpolate(frame, [40, 55, 65, 80], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const greetingOpacity = interpolate(frame, [75, 90, 100, 115], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    // Staggered Dashboard Entrance (Now happens in Problem scene)
    const dashboardBaseStart = 100;

    // Sidebar: Slides in from left
    const sidebarOpacity = interpolate(frame, [dashboardBaseStart, dashboardBaseStart + 15], [0, 1], { extrapolateRight: 'clamp' });
    const sidebarX = interpolate(sidebarOpacity, [0, 1], [-20, 0]);

    // Header: Slides down
    const headerOpacity = interpolate(frame, [dashboardBaseStart + 5, dashboardBaseStart + 20], [0, 1], { extrapolateRight: 'clamp' });
    const headerY = interpolate(headerOpacity, [0, 1], [-10, 0]);

    // Cards Row 1: Slide up
    const cards1Opacity = interpolate(frame, [dashboardBaseStart + 10, dashboardBaseStart + 25], [0, 1], { extrapolateRight: 'clamp' });
    const cards1Y = interpolate(cards1Opacity, [0, 1], [15, 0]);

    // Cards Row 2: Slide up
    const cards2Opacity = interpolate(frame, [dashboardBaseStart + 15, dashboardBaseStart + 30], [0, 1], { extrapolateRight: 'clamp' });
    const cards2Y = interpolate(cards2Opacity, [0, 1], [15, 0]);

    const teamDelay = 120;

    return (
        <AbsoluteFill style={{
            backgroundColor: 'black',
        }}>
            {/* Camera Container */}
            <div style={{
                width: '100%',
                height: '100%',
                transform: `scale(${cameraScale}) translateY(${cameraY}%)`,
                transformOrigin: 'center center',
                willChange: 'transform',
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

                {/* Screen Overlay Container */}
                <div style={{
                    position: 'absolute',
                    top: '34.5%',
                    left: '34.5%',
                    width: '27.5%',
                    height: '30%',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                }}>
                    {/* Dynamic Screen Content Logic */}
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
                        <React.Fragment>
                            {/* Screen Content - Transitions */}
                            {/* Logo Text Only */}
                            <div style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#ffffff',
                                opacity: logoTextOpacity,
                                pointerEvents: logoTextOpacity > 0 ? 'auto' : 'none'
                            }}>
                                <div style={{
                                    background: '#ec4899',
                                    color: 'white',
                                    padding: '8px 24px',
                                    fontSize: 24,
                                    fontWeight: 900,
                                    letterSpacing: '0.1em',
                                    fontFamily: themeStyles.headingFont,
                                    transform: `scale(${interpolate(logoTextOpacity, [0, 1], [0.9, 1])})`
                                }}>
                                    FRONTER
                                </div>
                            </div>

                            {/* Logo with Icon */}
                            <div style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#ffffff',
                                opacity: logoIconOpacity,
                                pointerEvents: logoIconOpacity > 0 ? 'auto' : 'none'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    transform: `scale(${interpolate(logoIconOpacity, [0, 1], [0.9, 1])})`
                                }}>
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                                        borderRadius: 8
                                    }} />
                                    <span style={{
                                        fontSize: 28,
                                        fontWeight: 900,
                                        color: '#0f172a',
                                        letterSpacing: '-0.02em',
                                        fontFamily: themeStyles.headingFont
                                    }}>FRONTER</span>
                                </div>
                            </div>

                            {/* Greeting Screen */}
                            <div style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '10%',
                                backgroundColor: '#ffffff',
                                opacity: greetingOpacity,
                                pointerEvents: greetingOpacity > 0 ? 'auto' : 'none',
                                // Entrance (original), Exit (Slide Up)
                                transform: `translateY(${interpolate(frame, [105, 125, 140, 160], [10, 0, 0, -20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`
                            }}>
                                <div style={{ marginBottom: 'auto' }}>
                                    <div style={{
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        marginBottom: 4,
                                        fontFamily: themeStyles.headingFont
                                    }}>Hello, Lukaasz</div>
                                    <div style={{ fontSize: 7, color: '#64748b' }}>Welcome back to your workspace</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: '50%',
                                        background: '#ec4899'
                                    }} />
                                    <div style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: '50%',
                                        background: '#8b5cf6'
                                    }} />
                                </div>
                            </div>

                            {/* Dashboard - 3 Column Layout from Reference */}
                            <div style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                fontFamily: themeStyles.bodyFont,
                                backgroundColor: '#f8fafc',
                                // Dashboard container is visible, children animate inside
                                opacity: 1,
                                pointerEvents: frame > dashboardBaseStart ? 'auto' : 'none',
                            }}>
                                {/* Sidebar */}
                                <div style={{
                                    width: '20%',
                                    background: '#fff',
                                    borderRight: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    paddingTop: '12%',
                                    gap: '15%',
                                    opacity: sidebarOpacity,
                                    transform: `translateX(${sidebarX}px)`
                                }}>
                                    <div style={{
                                        width: 24, height: 24,
                                        background: '#4f46e5',
                                        borderRadius: 6,
                                        color: 'white',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontSize: 14,
                                        fontWeight: 700
                                    }}>+</div>
                                    <BrandIcons.Home width={16} color="#64748b" />
                                    <BrandIcons.Activity width={16} color="#64748b" />
                                    <BrandIcons.Settings width={16} color="#64748b" />
                                </div>

                                {/* Main Dashboard Area */}
                                <div style={{ flex: 1, padding: '8% 8%' }}>
                                    {/* Header */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6%',
                                        opacity: headerOpacity,
                                        transform: `translateY(${headerY}px)`
                                    }}>
                                        <div>
                                            <h2 style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>Hello, Lukaasz</h2>
                                            <p style={{ fontSize: 6, color: '#64748b', margin: '2px 0 0 0' }}>What are you working on today?</p>
                                        </div>
                                        <div style={{
                                            width: 20, height: 20,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            border: '2px solid #e2e8f0'
                                        }} />
                                    </div>

                                    {/* Project Cards Grid - 3 Columns */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, gridAutoRows: '55px' }}>
                                        {/* Card 1: Power the Curious */}
                                        <div style={{
                                            background: 'white',
                                            borderRadius: 6,
                                            border: '1px solid #e2e8f0',
                                            padding: 6,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            opacity: cards1Opacity,
                                            transform: `translateY(${cards1Y}px)`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ width: 12, height: 12, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%' }} />
                                                </div>
                                                <div style={{ fontSize: 3, color: '#94a3b8' }}>...</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 4.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>Power the<br />curious</div>
                                                <div style={{ fontSize: 3, color: '#64748b', marginTop: 2 }}>SurveyMonkey</div>
                                            </div>
                                        </div>

                                        {/* Card 2: ZONT */}
                                        <div style={{
                                            background: '#000000',
                                            borderRadius: 6,
                                            padding: 6,
                                            color: 'white',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            opacity: cards1Opacity,
                                            transform: `translateY(${cards1Y}px)`
                                        }}>
                                            <div style={{ fontSize: 3, color: '#94a3b8', marginBottom: 2 }}>ZONT</div>
                                            <div style={{ fontSize: 4, fontWeight: 700, lineHeight: 1.2 }}>Exceptional<br />sound design<br />in your pocket</div>
                                            <div style={{
                                                position: 'absolute', bottom: -5, right: -5, width: 25, height: 25,
                                                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                                borderRadius: '50%', opacity: 0.9
                                            }} />
                                            <div style={{
                                                position: 'absolute', bottom: 2, right: 2,
                                                fontSize: 3, fontWeight: 800,
                                                background: '#3b82f6', padding: '1px 3px', borderRadius: 2
                                            }}>OPEN PROJECT</div>
                                        </div>

                                        {/* Card 3: The Update */}
                                        <div style={{
                                            background: 'white',
                                            borderRadius: 6,
                                            border: '1px solid #e2e8f0',
                                            padding: 6,
                                            position: 'relative',
                                            overflow: 'hidden',
                                            opacity: cards1Opacity,
                                            transform: `translateY(${cards1Y}px)`
                                        }}>
                                            <div style={{ fontSize: 3, color: '#ef4444', fontWeight: 800, marginBottom: 2 }}>the.update</div>
                                            <div style={{ fontSize: 4, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>A Roundtable<br />for creative pros</div>
                                            <Img src={scene.mobileScreenshotUrl || staticFile('/fronter_intro_laptop.jpg')} style={{
                                                position: 'absolute', bottom: 0, left: 0,
                                                width: '100%', height: '40%', objectFit: 'cover', opacity: 0.8
                                            }} />
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: '40%', background: '#ef4444' }} />
                                        </div>

                                        {/* Card 4: Test Sprint (Black) */}
                                        <div style={{
                                            background: '#0f172a',
                                            borderRadius: 6,
                                            padding: 6,
                                            color: 'white',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            opacity: cards2Opacity,
                                            transform: `translateY(${cards2Y}px)`
                                        }}>
                                            <div style={{
                                                width: 12, height: 12, borderRadius: 2,
                                                background: '#1e293b', marginBottom: 4,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <div style={{ width: 6, height: 6, border: '1px solid #4ade80', borderRadius: 1 }} />
                                            </div>
                                            <div style={{ fontSize: 4.5, fontWeight: 700 }}>Test Sprint<br />overview</div>
                                        </div>

                                        {/* Card 5: Light for Freedom (Green) */}
                                        <div style={{
                                            background: '#064e3b',
                                            borderRadius: 6,
                                            padding: 6,
                                            color: 'white',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            opacity: cards2Opacity,
                                            transform: `translateY(${cards2Y}px)`
                                        }}>
                                            <div style={{ fontSize: 4, fontWeight: 600, opacity: 0.8 }}>Light for our</div>
                                            <div style={{ fontSize: 4.5, fontWeight: 800, fontFamily: 'serif', fontStyle: 'italic', color: '#6ee7b7' }}>freedom</div>
                                            <div style={{ marginTop: 4, width: 3, height: 3, borderRadius: '50%', background: '#34d399' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    )}
                </div>
            </div>

            {/* Floating Team Members Layer */}
            {TEAM_MEMBERS.map((member, i) => {
                if (frame < teamDelay + member.delay) return null;

                const progress = spring({
                    frame: frame - (teamDelay + member.delay),
                    fps,
                    config: { stiffness: 100, damping: 15 }
                });

                const scale = interpolate(progress, [0, 1], [0, 1]);
                const opacity = interpolate(progress, [0, 0.5], [0, 1]);

                // Refined Floating animation
                const floatY = Math.sin((frame - (teamDelay + member.delay)) / 35 + i) * 8;
                const floatX = Math.cos((frame - (teamDelay + member.delay)) / 45 + i) * 6;
                const lineDashOffset = (frame / 2) % 20;

                return (
                    <React.Fragment key={member.id}>
                        {/* Connecting Line - Animated Flow */}
                        <svg style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            opacity: opacity * 0.4,
                            zIndex: 5
                        }}>
                            {/* <line
                                x1={`${member.x * 100}%`}
                                y1={`${member.y * 100}%`}
                                x2="50%"
                                y2="50%"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeDasharray="4,4"
                                strokeDashoffset={-lineDashOffset}
                            /> */}
                            <circle cx={`${member.x * 100}%`} cy={`${member.y * 100}%`} r="3" fill="white" fillOpacity={0.5} />
                        </svg>

                        {/* Team Member Avatar */}
                        <div
                            style={{
                                position: 'absolute',
                                left: `${member.x * 100}%`,
                                top: `${member.y * 100}%`,
                                transform: `translate(-50%, -50%) translate(${floatX}px, ${floatY}px) scale(${scale})`,
                                opacity,
                                zIndex: 10 + i,
                                display: 'flex',
                                flexDirection: member.badgePos === 'right' ? 'row' : 'row-reverse',
                                alignItems: 'center',
                                gap: 12
                            }}
                        >
                            {/* Avatar Circle - Added Glow */}
                            <div style={{
                                width: member.size,
                                height: member.size,
                                borderRadius: '50%',
                                background: 'white',
                                boxShadow: `0 20px 50px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.05)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 12,
                                border: `4px solid ${member.borderColor}`,
                                position: 'relative'
                            }}>
                                <member.Avatar width="100%" height="100%" />
                            </div>

                            {/* Role Badge - Refined Typography */}
                            <div style={{
                                background: member.roleBg,
                                color: member.roleColor,
                                padding: '8px 20px',
                                borderRadius: 100,
                                fontSize: 18,
                                fontWeight: 800,
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                                border: '3px solid white',
                                fontFamily: themeStyles.bodyFont,
                                whiteSpace: 'nowrap',
                                letterSpacing: '0.05em'
                            }}>
                                {member.role}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </AbsoluteFill>
    );
};