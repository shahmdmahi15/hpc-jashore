'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(
      (document.documentElement.dataset.theme as Theme) === 'dark'
        ? 'dark'
        : 'light',
    );
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('hpc-theme', next);
    setTheme(next);
  }

  return (
    <button type="button" className="btn" onClick={toggle}>
      Switch to {theme === 'dark' ? 'light' : 'dark'} theme
    </button>
  );
}
