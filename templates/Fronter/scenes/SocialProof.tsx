import React, { useMemo } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate, random } from 'remotion';
import { Scene, ThemeStyles } from '@/lib/types';
import { BrandIcons } from '../components/BrandIcons';

export const SocialProof: React.FC<{ scene: Scene, themeStyles: ThemeStyles }> = ({ scene, themeStyles }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // --- TIMELINE CONSTANTS ---
    const laptopEnterStart = 0;
    const iconsStart = 20;

    // --- ANIMATION VALUES ---

    // 1. Laptop & Background "Zoom/Pan" Effect
    // Simulating a camera move into the scene
    const sceneScale = interpolate(frame, [0, 300], [1, 1.1]);
    const sceneY = interpolate(frame, [0, 300], [0, -20]);

    // 2. Interface Pop-In (on the screen)
    const interfaceRecoil = spring({
        frame: frame - 15,
        fps,
        config: { damping: 12, stiffness: 100 }
    });

    // 3. Floating Icons Configuration
    // We want a cloud of logos orbiting the laptop
    const iconList = [
        { Icon: BrandIcons.Slack, color: '#E01E5A', x: 0.75, y: 0.35, size: 90, delay: 0 },
        { Icon: BrandIcons.GitHub, color: '#333', x: 0.82, y: 0.55, size: 96, delay: 4 },
        { Icon: BrandIcons.Trello, color: '#0079BF', x: 0.65, y: 0.45, size: 84, delay: 8 },
        { Icon: BrandIcons.Asana, color: '#F06A6A', x: 0.72, y: 0.85, size: 78, delay: 12 },
        { Icon: BrandIcons.Notion, color: '#000', x: 0.22, y: 0.25, size: 80, delay: 16 },
        { Icon: BrandIcons.Monday, color: '#FF3D57', x: 0.28, y: 0.60, size: 88, delay: 20 },
        { Icon: BrandIcons.Dropbox, color: '#0061FE', x: 0.18, y: 0.50, size: 70, delay: 24 },
    ];

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>

            {/* CONTAINER FOR ZOOM EFFECT */}
            <AbsoluteFill style={{ transform: `scale(${sceneScale}) translateY(${sceneY}px)` }}>

                {/* 1. REAL CONTEXT BACKGROUND */}
                <Img
                    src={staticFile('/fronter_intro_laptop.jpg')}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        // Small blur to keep focus on floating elements if desired, or keep sharp
                        // filter: 'contrast(1.1) brightness(0.9)', 
                    }}
                />

                {/* 2. PERSPECTIVE SCREEN REPLACEMENT */}
                {/* 
                   Coordinates estimated for 'fronter_intro_laptop.jpg':
                   The laptop screen is roughly centered but tilted.
                   We'll simply overlay a slightly opaque dark layer + the app screenshot
                   positioned cleanly over the screen area.
                */}
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
                    <Img
                        src={scene.screenshotUrl || "https://placehold.co/1920x1080/0f172a/FFFFFF?text=Interface+Preview"}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: interfaceRecoil,
                            transform: `scale(${interpolate(interfaceRecoil, [0, 1], [1.1, 1])})`
                        }}
                    />

                    {/* Screen Glare/Reflection Overlay */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(120deg, rgba(255,255,255,0.1) 0%, transparent 40%)',
                        pointerEvents: 'none'
                    }} />
                </div>

            </AbsoluteFill>

            {/* 3. FLOATING GLASS CARDS (Notification Bubbles) */}
            {/* Left side bubble */}
            <div style={{
                position: 'absolute',
                left: '15%',
                top: '40%',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '16px 24px',
                borderRadius: 16,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transform: `
                    translateY(${Math.sin(frame / 40) * 10}px)
                    scale(${spring({ frame: frame - 10, fps, config: { damping: 12 } })})
                `
            }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BrandIcons.CheckCircle color="white" width={24} />
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a' }}>Task Completed</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Just now</div>
                </div>
            </div>

            {/* Right side bubble */}
            <div style={{
                position: 'absolute',
                right: '18%',
                top: '65%',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                padding: '16px 24px',
                borderRadius: 16,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transform: `
                    translateY(${Math.sin(frame / 35 + 2) * 10}px)
                    scale(${spring({ frame: frame - 25, fps, config: { damping: 12 } })})
                `
            }}>
                <div style={{ display: 'flex', paddingLeft: 10 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: i === 1 ? '#ef4444' : i === 2 ? '#f59e0b' : '#3b82f6',
                            marginLeft: -10,
                            border: '2px solid white'
                        }} />
                    ))}
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a' }}>3 Collaborators</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Active now</div>
                </div>
            </div>

            {/* 4. ORBITING APP ICONS */}
            {iconList.map((icon, i) => {
                const introSpring = spring({ frame: frame - (iconsStart + icon.delay), fps, config: { damping: 12 } });
                const floatY = Math.sin((frame + i * 100) / 40) * 15;

                return (
                    <div key={i} style={{
                        position: 'absolute',
                        left: `${icon.x * 100}%`,
                        top: `${icon.y * 100}%`,
                        transform: `translate(-50%, -50%) scale(${introSpring}) translateY(${floatY}px)`,
                        zIndex: 100
                    }}>
                        <div style={{
                            width: icon.size,
                            height: icon.size,
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <icon.Icon width={icon.size * 0.6} style={{ color: icon.color }} />
                        </div>
                    </div>
                );
            })}

        </AbsoluteFill>
    );
};
