import React from 'react';
import {
    AbsoluteFill,
    useVideoConfig,
    useCurrentFrame,
    spring,
    interpolate,
    Sequence,
    Easing
} from 'remotion';
import { 
    MessageCircle, 
    Zap, 
    ShoppingBag, 
    MessageSquare, 
    Smile,
    MousePointer2,
    Command,
    Play,
    Phone,
    Share2,
    Layout,
    Star
} from 'lucide-react';

// --- 1. Theme & Design Tokens (Matched to Images) ---

const THEME = {
    bgBrand: '#8B237E',     // Deep Viable Purple
    bgApp: '#F8F5FA',       // Pale lavender background
    cardBg: '#FFFFFF',
    textDark: '#111827',
    textGray: '#6B7280',
    // Exact badge styles from
    badgeSevere: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }, 
    badgeHigh:   { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' }, 
    badgeMedium: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    badgeLow:    { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' }, 
    chart: {
        purple: '#9333EA',
        orange: '#F97316',
        blue: '#3B82F6'
    },
    shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
};

// --- 2. Sub-Components ---

// Integration Icons
const AppTile = ({ icon: Icon, label, color, x, y, index }: any) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const delay = index * 4;
    // Elastic pop-in effect
    const scale = spring({
        frame: frame - delay,
        fps,
        config: { stiffness: 260, damping: 20 }
    });

    // Subtle floating animation
    const floatY = Math.sin((frame + index * 10) / 50) * 6;

    return (
        <div style={{
            position: 'absolute',
            left: x, top: y,
            transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
        }}>
            <div style={{
                width: 100, height: 100,
                backgroundColor: 'white',
                borderRadius: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
                <Icon size={48} color={color} strokeWidth={2.5} />
            </div>
            <span style={{ 
                fontFamily: 'sans-serif', fontWeight: 600, color: 'white', fontSize: 16,
                opacity: 0.95, letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                {label}
            </span>
        </div>
    );
};

// Urgency Badge Component
const Badge = ({ level }: { level: 'Severe' | 'High' | 'Low' | 'Medium' }) => {
    let style = THEME.badgeLow;
    if (level === 'Severe') style = THEME.badgeSevere;
    if (level === 'High') style = THEME.badgeHigh;
    if (level === 'Medium') style = THEME.badgeMedium;

    return (
        <span style={{
            fontSize: 11, fontWeight: 700, color: style.text,
            backgroundColor: style.bg, border: `1px solid ${style.border}`,
            padding: '3px 10px', borderRadius: 12,
            textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
            {level}
        </span>
    );
};

// The Wavy Stream Graph
const StreamGraph = () => {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: '0 0 20px 20px' }}>
            <svg viewBox="0 0 400 200" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <defs>
                    {/* Gradients matching the reference image waves */}
                    <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={THEME.chart.purple} stopOpacity={0.8}/>
                        <stop offset="100%" stopColor={THEME.chart.purple} stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={THEME.chart.orange} stopOpacity={0.9}/>
                        <stop offset="100%" stopColor={THEME.chart.orange} stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={THEME.chart.blue} stopOpacity={0.8}/>
                        <stop offset="100%" stopColor={THEME.chart.blue} stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                
                {/* Layered organic waves */}
                <path d="M0,120 C60,100 140,160 240,110 C340,60 400,100 400,100 V200 H0 Z" fill="url(#gradPurple)" />
                <path d="M0,160 C80,170 180,110 280,150 C350,170 400,140 400,140 V200 H0 Z" fill="url(#gradBlue)" opacity={0.8} />
                <path d="M0,190 C40,170 120,180 180,140 C260,90 320,150 400,140 V200 H0 Z" fill="url(#gradOrange)" />
                
                {/* Dashed Vertical Indicator Line & Dots */}
                <line x1="285" y1="20" x2="285" y2="200" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 4" />
                <circle cx="285" cy="110" r="4" fill="white" stroke={THEME.chart.purple} strokeWidth="2.5" />
                <circle cx="285" cy="150" r="4" fill="white" stroke={THEME.chart.blue} strokeWidth="2.5" />
            </svg>
        </div>
    );
}

// Sidebar Item with Drill-down
const SidebarItem = ({ icon: Icon, title, badge, expanded, active }: any) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Smooth expansion animation
    const height = spring({
        frame: expanded ? frame - 85 : 0, 
        fps,
        config: { stiffness: 150, damping: 18 },
        from: 0,
        to: expanded ? 150 : 0 // Height for 2 insights
    });

    return (
        <div style={{ marginBottom: 6 }}>
            <div style={{ 
                padding: '12px 14px', 
                borderRadius: 12, 
                backgroundColor: active ? '#F3F4F6' : 'transparent',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: active ? THEME.textDark : THEME.textGray
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {Icon && <Icon size={18} />}
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
                </div>
                {badge && <Badge level={badge} />}
            </div>

            {/* Expanded Content Area showing exact insights from images */}
            <div style={{ height, overflow: 'hidden', paddingLeft: 42, paddingRight: 10 }}>
                <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    
                    {/* Insight 1 */}
                    <div style={{ 
                        padding: 12, background: 'white', borderRadius: 10, 
                        border: '1px solid #E5E7EB', boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                    }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                             <MessageSquare size={16} color={THEME.badgeSevere.text} style={{ marginTop: 2 }} />
                             <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textDark }}>Inaccurate & delayed notifications</span>
                        </div>
                        <Badge level="Severe" />
                    </div>
                    
                    {/* Insight 2 */}
                    <div style={{ 
                        padding: 12, background: 'white', borderRadius: 10, 
                        border: '1px solid #E5E7EB', boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                    }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                             <MessageSquare size={16} color={THEME.badgeHigh.text} style={{ marginTop: 2 }} />
                             <span style={{ fontSize: 13, fontWeight: 600, color: THEME.textDark, width: '85%' }}>
                                Premium subscription is too expensive
                            </span>
                        </div>
                        <Badge level="High" />
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- 3. Main Scene Composition ---

export const Solution: React.FC = () => {
    const { width, height, fps } = useVideoConfig();
    const frame = useCurrentFrame();

    // --- Timing Constants ---
    const DASHBOARD_START = 50;
    const TOOLTIP_START = 70;
    const CURSOR_START = 70;
    const CLICK_FRAME = 95;

    // 1. Dashboard Entrance (Slide Up from bottom)
    const dashboardY = spring({
        frame: frame - DASHBOARD_START, fps,
        from: 400, to: 0,
        config: { damping: 22 }
    });
    const dashboardOpacity = interpolate(frame, [DASHBOARD_START, DASHBOARD_START + 20], [0, 1]);

    // 2. Cursor Animation Path
    // Natural movement: Start off-screen -> Hover Sidebar -> Click -> Hover Insight
    const cursorX = interpolate(
        frame, 
        [CURSOR_START, CURSOR_START + 20, CLICK_FRAME, CLICK_FRAME + 20], 
        [width*0.6, 280, 280, 320], 
        { easing: Easing.bezier(0.25, 0.1, 0.25, 1), extrapolateRight: 'clamp' }
    );
    const cursorY = interpolate(
        frame, 
        [CURSOR_START, CURSOR_START + 20, CLICK_FRAME, CLICK_FRAME + 20], 
        [height*0.8, 290, 290, 420], 
        { easing: Easing.bezier(0.25, 0.1, 0.25, 1), extrapolateRight: 'clamp' }
    );
    
    // Click effect
    const isClicked = frame > CLICK_FRAME;
    const clickPulse = spring({ frame: frame - CLICK_FRAME, fps, config: { damping: 12, stiffness: 200 } });
    const cursorScale = interpolate(clickPulse, [0, 0.3, 1], [1, 0.85, 1]);

    // 3. Tooltip Entrance
    const tooltipScale = spring({
        frame: frame - TOOLTIP_START, fps,
        config: { stiffness: 180, damping: 15 }
    });

    return (
        <AbsoluteFill style={{ backgroundColor: THEME.bgApp }}>

            {/* SEQUENCE 1: INTEGRATION CLOUD (Frames 0 - 70) */}
            <Sequence durationInFrames={75}>
                <AbsoluteFill style={{ background: THEME.bgBrand, alignItems: 'center', justifyContent: 'center' }}>
                    {/* Subtle background text */}
                    <div style={{ 
                        position: 'absolute', top: '40%',
                        fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 180, 
                        color: 'rgba(255,255,255,0.04)', letterSpacing: '-0.04em'
                    }}>
                        CONNECT
                    </div>

                    {/* Layout matching solution_01.png */}
                    <AppTile index={0} icon={Zap} label="Zapier" color="#FF4F00" x={width * 0.5} y={height * 0.22} />
                    <AppTile index={1} icon={MessageCircle} label="Gong" color="#8B5CF6" x={width * 0.28} y={height * 0.35} />
                    <AppTile index={2} icon={Play} label="Google Play" color="#34A853" x={width * 0.72} y={height * 0.35} />
                    <AppTile index={3} icon={MessageSquare} label="Intercom" color="#2563EB" x={width * 0.2} y={height * 0.62} />
                    <AppTile index={4} icon={Command} label="Zendesk" color="#03363D" x={width * 0.5} y={height * 0.78} />
                    <AppTile index={5} icon={Smile} label="Reddit" color="#FF4500" x={width * 0.8} y={height * 0.62} />
                    <AppTile index={6} icon={ShoppingBag} label="App Store" color="#3B82F6" x={width * 0.5} y={height * 0.5} />
                </AbsoluteFill>
            </Sequence>

            {/* SEQUENCE 2: DASHBOARD UI (Frames 50 - End) */}
            <Sequence from={DASHBOARD_START}>
                <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: 1000 }}>
                    
                    {/* Main Dashboard Card */}
                    <div style={{
                        width: 1200, height: 750,
                        backgroundColor: THEME.cardBg,
                        borderRadius: 24,
                        boxShadow: THEME.shadow,
                        display: 'flex',
                        overflow: 'hidden',
                        opacity: dashboardOpacity,
                        transform: `translateY(${dashboardY}px)`
                    }}>
                        
                        {/* SIDEBAR */}
                        <div style={{ width: 340, borderRight: '1px solid #E5E7EB', padding: 28, display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textGray, marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reports</div>
                            
                            {/* The interactive item */}
                            <SidebarItem 
                                icon={Layout}
                                title="Helpdesk & Chat Analysis" 
                                badge="Severe" 
                                expanded={isClicked} 
                                active={true}
                            />
                            
                            {/* Static items from reference images */}
                            <SidebarItem icon={Smile} title="Employee Experience" badge="Medium" />
                            <SidebarItem icon={Star} title="Review Analysis" badge="Medium" />
                            <SidebarItem icon={Share2} title="Social Media Analysis" badge="High" />
                            <SidebarItem icon={Phone} title="Call Transcript Analysis" badge="Medium" />
                        </div>

                        {/* MAIN CONTENT AREA */}
                        <div style={{ flex: 1, padding: 48, display: 'flex', flexDirection: 'column' }}>
                            {/* Header Stats */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
                                <div>
                                    <h1 style={{ margin: 0, fontSize: 36, fontWeight: 800, color: THEME.textDark, letterSpacing: '-0.02em' }}>Helpdesk & Chat Analysis</h1>
                                    <div style={{ display: 'flex', gap: 48, marginTop: 28 }}>
                                        <div>
                                            <div style={{ fontSize: 36, fontWeight: 800, color: THEME.textDark }}>552</div>
                                            <div style={{ fontSize: 14, color: THEME.textGray, fontWeight: 600 }}>Datapoints Analyzed</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 36, fontWeight: 800, color: THEME.textDark }}>16.7%</div>
                                            <div style={{ fontSize: 14, color: THEME.textGray, fontWeight: 600 }}>Above Average</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: THEME.badgeSevere.text }}>Severe</div>
                                    <div style={{ fontSize: 14, color: THEME.textGray, fontWeight: 600 }}>Urgency</div>
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, position: 'relative', border: '1px solid #F3F4F6' }}>
                                <div style={{ padding: '24px 24px 0', fontSize: 15, fontWeight: 700, color: THEME.textGray }}>Weekly Volume</div>
                                <StreamGraph />

                                {/* Tooltip Popup */}
                                <div style={{
                                    position: 'absolute', top: 70, right: 130,
                                    backgroundColor: 'white', padding: 24, borderRadius: 16,
                                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
                                    transform: `scale(${tooltipScale})`,
                                    transformOrigin: 'bottom center',
                                    zIndex: 20, border: '1px solid #E5E7EB'
                                }}>
                                    <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 16, color: THEME.textDark }}>Jul 23</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: 140, fontSize: 15, fontWeight: 700, color: THEME.chart.purple }}><span>Requests:</span> <span>14</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: 140, fontSize: 15, fontWeight: 700, color: THEME.badgeSevere.text }}><span>Questions:</span> <span>25</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: 140, fontSize: 15, fontWeight: 700, color: THEME.chart.blue }}><span>Complaints:</span> <span>13</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: 140, fontSize: 15, fontWeight: 700, color: THEME.badgeHigh.text }}><span>Compliments:</span> <span>18</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mouse Cursor */}
                    <div style={{
                        position: 'absolute', left: 0, top: 0,
                        transform: `translate(${cursorX}px, ${cursorY}px) scale(${cursorScale})`,
                        pointerEvents: 'none', zIndex: 100, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                    }}>
                        {/* Using a slightly larger, more detailed cursor icon */}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
                            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                        </svg>
                    </div>

                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};