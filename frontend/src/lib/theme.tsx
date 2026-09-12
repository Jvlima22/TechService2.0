import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  logoSrc: string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  logoSrc: '/branding/tech-service-dark.png',
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('tech-service-theme') as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark'; // default theme is dark
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('tech-service-theme', t);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // tech-service-dark.png has light graphics (designed for dark theme)
  // tech-service-white.png has dark graphics (designed for light/white theme)
  const logoSrc =
    theme === 'dark'
      ? '/branding/tech-service-dark.png'
      : '/branding/tech-service-white.png';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, logoSrc }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
