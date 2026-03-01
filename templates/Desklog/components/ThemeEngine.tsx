import { CSSProperties } from 'react';

export interface ThemeStyles {
    card: CSSProperties;
    heading: CSSProperties;
    text: CSSProperties;
    accent: string;
    background: string;
    borderRadius: number;
    springConfig: { damping: number; stiffness: number; mass: number };
    colors: {
        primary: string;
        secondary: string;
        problem: string;
        warning: string;
        success: string;
        surface: string;
    }
}

export type ThemeType = 'modern_clean' | 'dark_mode';

export const getThemeStyles = (theme: ThemeType = 'modern_clean', brandColor: string = '#00FF85'): ThemeStyles => {
    // "The Neon Precision" Style
    // Primary Dark: #121212
    // Action Green: #00FF85

    return {
        card: {
            background: '#1A1D1A', // Secondary dark
            border: '1px solid rgba(0, 255, 133, 0.2)', // Subtle green border
            boxShadow: '0 0 20px -5px rgba(0, 255, 133, 0.1)',
            borderRadius: 16,
            backdropFilter: 'blur(12px)',
        },
        heading: {
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#FFFFFF'
        },
        text: {
            color: '#A0A0A0', // Secondary labels
            lineHeight: 1.6,
            fontWeight: 500
        },
        accent: '#00FF85', // Action Green
        background: '#121212', // Primary Dark
        borderRadius: 16,
        springConfig: { damping: 20, stiffness: 100, mass: 1 },
        colors: {
            primary: '#00FF85', // Neon Green
            secondary: '#1A1D1A', // Dark Grey/Green
            problem: '#FF4D4D', // Bright Red
            warning: '#FFD700', // Bright Yellow
            success: '#00FF85', // Action Green
            surface: '#1A1D1A',
        }
    };
};
