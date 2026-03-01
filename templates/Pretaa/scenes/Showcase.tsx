import React from 'react';
import {
    AbsoluteFill,
    useVideoConfig,
} from 'remotion';
import { Scene } from '@/lib/types';
import { GradientBlob } from '../components/GradientBlob';
import { ShowcaseEngine } from '@/remotion/components/ShowcaseOS/ShowcaseEngine';

// --- 1. Studio Design Tokens ---
const THEME = {
    bg: '#F8FAFC',
    primary: '#3B82F6',
    textMain: '#0F172A',
    textSub: '#64748B',
    success: '#10B981',
    navy: '#1E1B4B',
    phoneShadow: '0 50px 100px -20px rgba(0,0,0,0.2), 0 30px 60px -30px rgba(0,0,0,0.1)',
};

const Tag = ({ text, color, bg }: { text: string; color: string; bg: string }) => (
    <span style={{
        fontSize: 9, fontWeight: 700, color: color,
        background: bg, padding: '3px 8px', borderRadius: 4,
        textTransform: 'uppercase', display: 'inline-block', letterSpacing: '0.02em'
    }}>
        {text}
    </span>
);

const ListCard = ({ title, sub, tag, time, type = 'default' }: any) => (
    <div style={{
        background: 'white', padding: 14, borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9',
        display: 'flex', flexDirection: 'column', gap: 4
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            {tag && <Tag
                text={tag}
                color={type === 'red' ? '#DC2626' : '#64748B'}
                bg={type === 'red' ? '#FEE2E2' : '#F1F5F9'}
            />}
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{time}</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.textMain }}>{title}</div>
        <div style={{ fontSize: 11, color: THEME.textSub, lineHeight: 1.4 }}>{sub}</div>
    </div>
);

const ProfileHeader = () => (
    <div style={{
        background: 'white', padding: 20, borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9',
        textAlign: 'center'
    }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, margin: '0 0 12px 0' }}>Cadman Inc.</h2>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <div style={{ background: THEME.navy, color: 'white', fontSize: 10, fontWeight: 700, padding: '5px 14px', borderRadius: 100 }}>CUSTOMER</div>
            <div style={{ background: THEME.success, color: 'white', fontSize: 10, fontWeight: 700, padding: '5px 14px', borderRadius: 100 }}>REFERENCE</div>
        </div>
    </div>
);

const HustleHint = () => (
    <div style={{
        background: 'white', padding: 16, borderRadius: 16,
        boxShadow: '0 10px 20px -5px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.textMain, marginBottom: 6 }}>Hustle Hint</div>
        <p style={{ fontSize: 11, color: THEME.textSub, margin: '0 0 10px 0', lineHeight: 1.5 }}>
            Send email to customer service to find out what is going on using CS template.
        </p>
        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.primary, cursor: 'pointer' }}>Send email &rarr;</div>
    </div>
);

const PhoneFrame = ({ children, x, y, delay, isCenter }: any) => {
    return (
        <div style={{
            position: 'absolute',
            left: x, top: y,
            width: 280,
            height: 580,
            zIndex: isCenter ? 20 : 10,
        }}>
            <div style={{
                width: '100%', height: '100%',
                background: '#F8FAFC',
                borderRadius: 44,
                boxShadow: THEME.phoneShadow,
                border: `8px solid white`,
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 40, background: 'white', zIndex: 30, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 100, height: 24, background: 'black', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }} />
                </div>
                <div style={{ padding: '50px 18px 20px 18px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'hidden' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export const Showcase: React.FC<{ scene: Scene, brand?: any }> = ({ scene, brand }) => {
    const { width, height } = useVideoConfig();

    // --- NEW: AI HYBRID ROUTING ---
    if (scene.subscenes && scene.subscenes.length > 0) {
        return (
            <AbsoluteFill style={{ backgroundColor: '#f8fafc', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <GradientBlob color="#E0E7FF" x={width * 0.1} y={height * 0.4} size={1200} opacity={0.4} />
                <GradientBlob color="#DBEAFE" x={width * 0.9} y={height * 0.6} size={1200} opacity={0.4} />

                <ShowcaseEngine
                    subscenes={scene.subscenes}
                    theme={{ primary: THEME.primary, secondary: THEME.navy, accent: THEME.success, background: '#f8fafc', text: THEME.textMain, headingFont: 'Inter', bodyFont: 'Inter', borderRadius: '24px' }}
                    containerWidth={1920}
                    containerHeight={1080}
                    smartZoom={true}
                    cursorColor={THEME.primary}
                />
            </AbsoluteFill>
        );
    }

    // --- FALLBACK: ORIGINAL MOCK UI ---
    const features = scene.features || [];
    const getFeature = (idx: number, fallback: any) => {
        if (features[idx]) return {
            title: typeof features[idx] === 'string' ? features[idx] : (features[idx] as any).title,
            sub: (features[idx] as any).description || "Optimized for performance",
            tag: "FEATURE", time: "Now"
        };
        return fallback;
    };

    const phoneW = 280;
    const gap = 50;
    const totalW = phoneW * 3 + gap * 2;
    const startX = (width - totalW) / 2;
    const centerY = height / 2 - 300;

    return (
        <AbsoluteFill style={{ backgroundColor: '#F8FAFC', overflow: 'hidden' }}>
            <GradientBlob color="#E0E7FF" x={width * 0.1} y={height * 0.4} size={1200} opacity={0.4} />
            <GradientBlob color="#DBEAFE" x={width * 0.9} y={height * 0.6} size={1200} opacity={0.4} />

            <PhoneFrame x={startX} y={centerY + 30} delay={0} isCenter={false}>
                <div style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, marginBottom: 4 }}>{scene.mainText || 'Events'}</div>
                <ListCard {...getFeature(0, { title: "Champlin-Douglas", sub: "is now below average product use", tag: "PRODUCT", time: "2h ago" })} />
                <ListCard {...getFeature(1, { title: "Braun Inc.", sub: "is not yet operational. Avg is 15d.", tag: "ONBOARDING", time: "5m ago" })} />
                <ListCard {...getFeature(2, { title: "Dynamite", sub: "has just been acquired by Long Game Capital.", tag: "IN THE NEWS", time: "Now" })} />
            </PhoneFrame>

            <PhoneFrame x={startX + phoneW + gap} y={centerY - 20} delay={10} isCenter={true}>
                <div style={{ height: 10 }} />
                <ProfileHeader />
                <HustleHint />
                <ListCard {...getFeature(3, { title: "Dynamite", sub: "Acquired by Long Game Capital", tag: "IN THE NEWS", time: "Now" })} />
            </PhoneFrame>

            <PhoneFrame x={startX + (phoneW + gap) * 2} y={centerY + 30} delay={20} isCenter={false}>
                <div style={{ fontSize: 22, fontWeight: 800, color: THEME.textMain, marginBottom: 4 }}>Timeline</div>
                <ListCard {...getFeature(4, { title: "'Happy' rating submitted", sub: "by Emily Wastervaunt, Customer Support.", tag: "RATING", time: "Now" })} />
                <ListCard {...getFeature(5, { title: "Rating Follow up", sub: "@Nick Zaccheo good time for upsell.", tag: "LAUNCH", time: "3m ago" })} />
                <ListCard {...getFeature(6, { title: "Cadman Inc.", sub: "Reported as reference company.", tag: "POTENTIAL REFERENCE", time: "5m ago" })} />
            </PhoneFrame>
        </AbsoluteFill>
    );
};
