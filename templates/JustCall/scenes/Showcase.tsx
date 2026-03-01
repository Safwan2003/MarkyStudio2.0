import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { Scene } from '@/lib/types';
import { ShowcaseEngine } from '@/remotion/components/ShowcaseOS/ShowcaseEngine';
import React from 'react';

export const Showcase = ({ scene, themeStyles, brand }: { scene: Scene, themeStyles: any, brand: any }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // --- 1. NEW: AI HYBRID ROUTING ---
    if (scene.subscenes && scene.subscenes.length > 0) {
        return (
            <AbsoluteFill className="bg-[#f8fafc] flex items-center justify-center overflow-hidden">
                {/* Background Pattern: Subtle Dots */}
                <div className="absolute inset-0 opacity-[0.3]" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                <ShowcaseEngine
                    subscenes={scene.subscenes}
                    theme={{ primary: '#ec4899', secondary: '#8b5cf6', accent: '#f43f5e', background: '#ffffff', text: '#0f172a', headingFont: 'Inter', bodyFont: 'Inter', borderRadius: '24px' }}
                    containerWidth={1920}
                    containerHeight={1080}
                    smartZoom={true}
                    cursorColor="#ec4899"
                />
            </AbsoluteFill>
        );
    }

    // --- 2. FALLBACK: ORIGINAL MOCK UI ---
    const slideUp = spring({ frame, fps, config: { damping: 20 } });
    const y = interpolate(slideUp, [0, 1], [100, 0]);
    const floatY = Math.sin(frame * 0.05) * 10;

    return (
        <AbsoluteFill className="bg-[#f8fafc] flex items-center justify-center pt-20 overflow-hidden">
            {/* Background Mesh Orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-30%] left-[10%] w-[900px] h-[900px] bg-[#64748b] rounded-full blur-[150px] opacity-10 mix-blend-multiply" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#3b82f6] rounded-full blur-[140px] opacity-15 mix-blend-multiply" />
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.3]" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            {/* Browser Window Frame */}
            <div className="w-[85%] h-[85%] bg-white rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden relative z-10" style={{ transform: `translateY(${y + floatY}px)` }}>
                {/* Toolbar */}
                <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-2">
                    <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
                </div>

                {/* Dashboard Mockup */}
                <div className="flex-1 bg-[#f8fafc] flex p-6 gap-6 font-sans">
                    <div className="w-16 flex flex-col items-center gap-6 pt-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white" />
                        {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-lg bg-white shadow-sm" />)}
                    </div>
                    <div className="flex-1 flex gap-6">
                        <div className="w-1/3 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center h-48 relative">
                            <span className="text-slate-400 text-xs font-bold uppercase">{scene.mainText || "Live Calls"}</span>
                            <div className="text-7xl font-bold text-slate-800">13</div>
                        </div>
                        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="w-full h-4 bg-slate-100 rounded-full mb-4" />
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-8 bg-slate-50 rounded-lg" />)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};