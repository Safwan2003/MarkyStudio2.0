import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Scene, ThemeStyles } from '@/lib/types';
import { BrandIcons } from '../components/BrandIcons';

export const Solution: React.FC<{ scene: Scene, themeStyles: ThemeStyles }> = ({ scene, themeStyles }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    // CONTINUITY CAMERA: Start at 2.2 (where Problem ends) and continue push to 2.8
    const cameraScale = interpolate(frame, [0, 150], [2.2, 2.8], { extrapolateRight: 'clamp' });
    const cameraY = interpolate(frame, [0, 150], [1, 2], { extrapolateRight: 'clamp' });

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
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            fontFamily: themeStyles.bodyFont,
                            backgroundColor: '#f8fafc',
                        }}>
                            {/* Sidebar (Static) */}
                            <div style={{
                                width: '20%',
                                background: '#fff',
                                borderRight: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingTop: '12%',
                                gap: '15%',
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

                            {/* Main Dashboard Area (Static) */}
                            <div style={{ flex: 1, padding: '8% 8%' }}>
                                {/* Header */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6%',
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

                                {/* Project Cards Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, gridAutoRows: '55px' }}>
                                    {/* Card 1 */}
                                    <div style={{
                                        background: 'white',
                                        borderRadius: 6,
                                        border: '1px solid #e2e8f0',
                                        padding: 6,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
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

                                    {/* Card 2 */}
                                    <div style={{
                                        background: '#000000',
                                        borderRadius: 6,
                                        padding: 6,
                                        color: 'white',
                                        position: 'relative',
                                        overflow: 'hidden',
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

                                    {/* Card 3 */}
                                    <div style={{
                                        background: 'white',
                                        borderRadius: 6,
                                        border: '1px solid #e2e8f0',
                                        padding: 6,
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{ fontSize: 3, color: '#ef4444', fontWeight: 800, marginBottom: 2 }}>the.update</div>
                                        <div style={{ fontSize: 4, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>A Roundtable<br />for creative pros</div>
                                        <Img src={scene.mobileScreenshotUrl || staticFile('/fronter_intro_laptop.jpg')} style={{
                                            position: 'absolute', bottom: 0, left: 0,
                                            width: '100%', height: '40%', objectFit: 'cover', opacity: 0.8
                                        }} />
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 3, height: '40%', background: '#ef4444' }} />
                                    </div>

                                    {/* Card 4 */}
                                    <div style={{
                                        background: '#0f172a',
                                        borderRadius: 6,
                                        padding: 6,
                                        color: 'white',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
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

                                    {/* Card 5 */}
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
                                    }}>
                                        <div style={{ fontSize: 4, fontWeight: 600, opacity: 0.8 }}>Light for our</div>
                                        <div style={{ fontSize: 4.5, fontWeight: 800, fontFamily: 'serif', fontStyle: 'italic', color: '#6ee7b7' }}>freedom</div>
                                        <div style={{ marginTop: 4, width: 3, height: 3, borderRadius: '50%', background: '#34d399' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AbsoluteFill>
    );
};