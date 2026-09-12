import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';

export function ThemeToggle({
  className = '',
  testId = 'theme-toggle-btn',
}: {
  className?: string;
  testId?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      data-testid={testId}
      title={
        isDark
          ? 'Mudar para modo claro (White mode)'
          : 'Mudar para modo escuro (Dark mode)'
      }
      aria-label="Alternar tema"
    >
      {isDark ? (
        <Sun size={17} className="theme-toggle-icon sun" />
      ) : (
        <Moon size={17} className="theme-toggle-icon moon" />
      )}
    </button>
  );
}
