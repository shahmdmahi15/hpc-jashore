// apps/web/components/NavbarSwitchers.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from '../lib/i18n';
import { Button } from './ui/button';
import { Maximize2, Minimize2, RotateCw } from 'lucide-react';
import { cn } from '../lib/utils';

export function HardReloadButton({ className }: { className?: string }) {
  const [isReloading, setIsReloading] = useState(false);

  const handleHardReload = async () => {
    setIsReloading(true);
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleHardReload}
      title="Hard Reload / হার্ড রিলোড"
      aria-label="Hard Reload"
      className={cn(
        'size-8 sm:size-9 rounded-xl border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-emerald-500 shrink-0 cursor-pointer transition-all duration-200 active:scale-95',
        className
      )}
    >
      <RotateCw className={cn('size-3.5 sm:size-4 transition-transform duration-500', isReloading && 'animate-spin text-emerald-500')} />
    </Button>
  );
}

export function FullscreenToggle({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      className={cn(
        'size-8 sm:size-9 rounded-xl border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-all duration-200 active:scale-95',
        className
      )}
    >
      {isFullscreen ? (
        <Minimize2 className="size-3.5 sm:size-4 text-emerald-500" />
      ) : (
        <Maximize2 className="size-3.5 sm:size-4" />
      )}
    </Button>
  );
}

export function NavbarSwitchers({
  className,
  showFullscreen = true,
  showReload = true,
}: {
  className?: string;
  showFullscreen?: boolean;
  showReload?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-1.5 sm:gap-2 shrink-0', className)}>
      <LanguageToggle />
      <ThemeToggle />
      {showReload && <HardReloadButton />}
      {showFullscreen && <FullscreenToggle />}
    </div>
  );
}

export default NavbarSwitchers;
