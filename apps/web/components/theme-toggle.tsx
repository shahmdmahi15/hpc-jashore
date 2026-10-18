'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'size-9 rounded-xl border border-border/80 bg-card/80 animate-pulse shrink-0',
          className,
        )}
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'size-9 rounded-xl border border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 shadow-xs backdrop-blur-md active:scale-95 group',
        className,
      )}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        <Sun className="size-4 text-emerald-400 group-hover:rotate-45 transition-transform duration-200" />
      ) : (
        <Moon className="size-4 text-emerald-600 group-hover:-rotate-12 transition-transform duration-200" />
      )}
    </Button>
  );
}

export default ThemeToggle;
