import React from 'react';
import {
    AbsoluteFill,
    useVideoConfig,
    useCurrentFrame,
    spring,
    interpolate,
} from 'remotion';
import {
    Smartphone,
    BarChart2,
    Target,
    Settings,
} from 'lucide-react';
import { Scene } from '@/lib/types';
import { ShowcaseEngine } from '@/remotion/components/ShowcaseOS/ShowcaseEngine';

const THEME = {
    bg: '#8B237E',
    cardBg: '#F3E8FF',
    white: '#FFFFFF',
    textDark: '#1F2937',
    textGray: '#6B7280',
    primary: '#8B237E',
    red: '#DC2626',
    shadow: '0 30px 60px -12px rgba(0, 0, 0, 0.3)',
    font: 'Inter, sans-serif'
};

const SidebarIcon = ({ icon: Icon, active }: any) => (
    <div style={{
        width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? THEME.primary : '#9CA3AF',
        background: active ? '#FCE7F3' : 'transparent',
        borderRadius: 8, marginBottom: 20
    }}>
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    </div>
);

const MainDashboard = ({ children, style }: { children?: React.ReactNode, style?: React.CSSProperties }) => (
    <div style={{
        width: 1200, height: 750,
        background: THEME.cardBg,
        borderRadius: 24,
        boxShadow: THEME.shadow,
        display: 'flex',
        overflow: 'hidden',
        fontFamily: THEME.font,
        ...style
    }}>
        <div style={{ width: 80, background: 'white', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: THEME.primary, marginBottom: 40 }} />
            <SidebarIcon icon={Target} active />
            <SidebarIcon icon={BarChart2} />
            <SidebarIcon icon={Settings} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
            {children || (
                <div style={{ padding: 50, display: 'flex', flexDirection: 'column' }}>
                    <h1 style={{ margin: 0, fontSize: 42, fontWeight: 800, color: THEME.textDark }}>Product Insights</h1>
                    <div style={{ flex: 1, background: 'white', borderRadius: 20, marginTop: 40 }} />
                </div>
            )}
        </div>
    </div>
);

export const Showcase: React.FC<{ scene: Scene, brand?: any }> = ({ scene, brand }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();

    // --- NEW: AI HYBRID ROUTING ---
    if (scene.subscenes && scene.subscenes.length > 0) {
        return (
            <AbsoluteFill style={{ backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>
                <MainDashboard>
                    <ShowcaseEngine
                        subscenes={scene.subscenes}
                        theme={{ primary: THEME.primary, secondary: THEME.bg, accent: THEME.red, background: THEME.cardBg, text: THEME.textDark, headingFont: 'Inter', bodyFont: 'Inter', borderRadius: '24px' }}
                        containerWidth={1920}
                        containerHeight={1080}
                        headless={true}
                        smartZoom={true}
                        cursorColor={THEME.primary}
                    />
                </MainDashboard>
            </AbsoluteFill>
        );
    }

    // --- FALLBACK: ORIGINAL MOCK UI ---
    const dashboardY = spring({ frame, fps, config: { damping: 20 } });
    return (
        <AbsoluteFill style={{ backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
                transform: `translateY(${interpolate(dashboardY, [0, 1], [500, 0])}px)`,
                opacity: interpolate(dashboardY, [0, 1], [0, 1])
            }}>
                <MainDashboard />
            </div>
        </AbsoluteFill>
    );
};