import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({ theme: 'light', resolvedTheme: 'light', setTheme: () => {}, toggle: () => {} });

const STORAGE_KEY = 'edgeable-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function resolve(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolve(getInitialTheme()));

  useEffect(() => {
    const next = resolve(theme);
    setResolvedTheme(next);
    const root = document.documentElement;
    root.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = mq.matches ? 'dark' : 'light';
      setResolvedTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t) => setThemeState(t), []);
  const toggle = useCallback(() => {
    setThemeState((cur) => {
      const current = resolve(cur);
      return current === 'dark' ? 'light' : 'dark';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
