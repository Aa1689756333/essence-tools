'use client';

import { createContext, useContext, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export const themes = [
  {
    id: 'mint',
    name: '薄荷绿',
    accent: '#34d399',
    hover: '#10b981',
    subtle: '#ecfdf5',
    shadow: '52,211,153',
    light: '#6ee7b7',
  },
  {
    id: 'rose',
    name: '樱花粉',
    accent: '#fb7185',
    hover: '#f43f5e',
    subtle: '#fff1f2',
    shadow: '251,113,133',
    light: '#fda4af',
  },
  {
    id: 'amber',
    name: '柠檬黄',
    accent: '#fbbf24',
    hover: '#f59e0b',
    subtle: '#fffbeb',
    shadow: '251,191,36',
    light: '#fcd34d',
  },
  {
    id: 'sky',
    name: '天空蓝',
    accent: '#38bdf8',
    hover: '#0ea5e9',
    subtle: '#f0f9ff',
    shadow: '56,189,248',
    light: '#7dd3fc',
  },
  {
    id: 'violet',
    name: '薰衣紫',
    accent: '#c4b5fd',
    hover: '#a78bfa',
    subtle: '#f5f3ff',
    shadow: '196,181,253',
    light: '#ddd6fe',
  },
];

const darkColors = {
  mint: {
    accent: '#10b981',
    hover: '#34d399',
    subtle: '#064e3b',
    shadow: '16,185,129',
    light: '#047857',
  },
  rose: {
    accent: '#f43f5e',
    hover: '#fb7185',
    subtle: '#4c0519',
    shadow: '244,63,94',
    light: '#be123c',
  },
  amber: {
    accent: '#f59e0b',
    hover: '#fbbf24',
    subtle: '#451a03',
    shadow: '245,158,11',
    light: '#b45309',
  },
  sky: {
    accent: '#0ea5e9',
    hover: '#38bdf8',
    subtle: '#0c4a6e',
    shadow: '14,165,233',
    light: '#0369a1',
  },
  violet: {
    accent: '#a78bfa',
    hover: '#c4b5fd',
    subtle: '#2e1065',
    shadow: '167,139,250',
    light: '#6d28d9',
  },
};

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useLocalStorage('toolbox-theme', themes[0].id);
  const [isDark, setIsDark] = useLocalStorage('toolbox-dark', false, {
    serialize: (v) => String(v),
    deserialize: (raw) => raw === 'true',
  });

  const theme = themes.find(t => t.id === themeId) || themes[0];

  const setTheme = useCallback((t) => {
    setThemeId(t.id);
  }, [setThemeId]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const currentColors = isDark ? darkColors[theme.id] : theme;
    root.style.setProperty('--theme-accent', currentColors.accent);
    root.style.setProperty('--theme-hover', currentColors.hover);
    root.style.setProperty('--theme-subtle', currentColors.subtle);
    root.style.setProperty('--theme-shadow', currentColors.shadow);
    root.style.setProperty('--theme-light', currentColors.light);
    root.style.setProperty('--theme-accent-rgb', currentColors.shadow);
    root.style.setProperty('--theme-gradient', `linear-gradient(135deg, ${currentColors.accent}, ${currentColors.light})`);
  }, [theme, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, themes, setTheme, isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
