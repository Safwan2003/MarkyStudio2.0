import React, { useMemo } from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Scene, ThemeStyles } from '@/lib/types';
import { ShowcaseEngine } from '@/remotion/components/ShowcaseOS/ShowcaseEngine';

/**
 * Fronter Showcase v2
 * 
 * Implements a narrative "Hero Zoom":
 * 1. Starts with a cinematic laptop mockup view.
 * 2. Over the first subscene, zooms into the laptop screen until it fills the video frame.
 * 3. Transitions to subsequent frames (subscenes) in full-screen for maximum impact and clarity.
 */
export const Showcase: React.FC<{ scene: Scene; themeStyles: ThemeStyles }> = ({ scene, themeStyles }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // ─── NARRATIVE ZOOM LOGIC ───
    // Mature Pacing: Hold context, then zoom in slowly.
    const zoomProgress = spring({
        frame: frame - 45, // Wait 1.5s before zooming in to show the desk/laptop
        fps,
        config: { damping: 26, stiffness: 35, mass: 1.5 } // Heavier, slower zoom
    });

    // Starting Coordinates (Mockup Display Area - Optimized for fronter_intro_laptop.jpg)
    const startTop = 33.6;
    const startLeft = 33.6;
    const startWidth = 29;
    const startHeight = 32;

    // Interpolated Properties
    const top = interpolate(zoomProgress, [0, 1], [startTop, 0]);
    const left = interpolate(zoomProgress, [0, 1], [startLeft, 0]);
    const width = interpolate(zoomProgress, [0, 1], [startWidth, 100]);
    const height = interpolate(zoomProgress, [0, 1], [startHeight, 100]);
    
    const borderRadius = interpolate(zoomProgress, [0, 1], [1, 0]);
    const mockupOpacity = interpolate(zoomProgress, [0.9, 1], [1, 0]);
    const mockupScale = interpolate(zoomProgress, [0, 1], [1.05, 1.2]);

    // DYNAMIC RESOLUTION: Optimized for mockup vs full-screen clarity
    // Switch to 1920 slightly before the zoom is 100% complete for a smoother transition
    const isFullScale = zoomProgress > 0.9;
    const currentContainerWidth = isFullScale ? 1920 : 600;
    const currentContainerHeight = isFullScale ? 1080 : 338;

    return (
        <AbsoluteFill style={{ backgroundColor: '#050505' }}>
            {/* 1. MOCKUP LAYER (Cinematic Background) */}
            {mockupOpacity > 0 && (
                <AbsoluteFill style={{ opacity: mockupOpacity }}>
                    <Img
                        src={staticFile('/fronter_intro_laptop.jpg')}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: `scale(${mockupScale})`,
                        }}
                    />
                </AbsoluteFill>
            )}

            {/* 2. CONTENT LAYER (The Interactive Product Demo) */}
            <div style={{
                position: 'absolute',
                top: `${top}%`,
                left: `${left}%`,
                width: `${width}%`,
                height: `${height}%`,
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                zIndex: 10,
            }}>
                <ShowcaseEngine
                    subscenes={scene.subscenes || []}
                    theme={themeStyles}
                    containerWidth={currentContainerWidth}
                    containerHeight={currentContainerHeight}
                    smartZoom={false} // Locked for stable narrative as requested
                    cursorColor={themeStyles.primary || "#3b82f6"}
                    headless={true}
                    scene={scene}
                />
            </div>
        </AbsoluteFill>
    );
};
