'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

function getStoredTheme() {
  if (typeof window === 'undefined') return themes[0];
  try {
    const id = localStorage.getItem('toolbox-theme');
    return themes.find(t => t.id === id) || themes[0];
  } catch {
    return themes[0];
  }
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(themes[0]);

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const setThemeAndPersist = useCallback((t) => {
    setTheme(t);
    try { localStorage.setItem('toolbox-theme', t.id); } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-hover', theme.hover);
    root.style.setProperty('--theme-subtle', theme.subtle);
    root.style.setProperty('--theme-shadow', theme.shadow);
    root.style.setProperty('--theme-light', theme.light);
    root.style.setProperty('--theme-accent-rgb', theme.shadow);
    root.style.setProperty('--theme-gradient', `linear-gradient(135deg, ${theme.accent}, ${theme.light})`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themes, setTheme: setThemeAndPersist }}>
      {children}
    </ThemeContext.Provider>
  );
}
