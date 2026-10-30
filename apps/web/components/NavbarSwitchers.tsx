// apps/web/components/NavbarSwitchers.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle, useLanguage } from '../lib/i18n';
import { Button } from './ui/button';
import { Maximize2, Minimize2, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';
import { PwaInstallButton } from './PwaInstallPrompt';
import { isAudioAlertsEnabled, setAudioAlertsEnabled, playCheckinSound } from '../lib/audio-alerts';
import { toast } from 'sonner';

export function HardReloadButton({ className }: { className?: string }) {
  const [isReloading, setIsReloading] = useState(false);
  const { language } = useLanguage();
  const isBn = language === 'bn';

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
      title={isBn ? 'হার্ড রিলোড' : 'Hard Reload'}
      aria-label={isBn ? 'হার্ড রিলোড' : 'Hard Reload'}
      className={cn(
        'size-8 sm:size-9 rounded-lg sm:rounded-xl border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-emerald-500 shrink-0 cursor-pointer transition-all duration-200 active:scale-95',
        className
      )}
    >
      <RotateCw className={cn('size-3.5 sm:size-4 transition-transform duration-500', isReloading && 'animate-spin text-emerald-500')} />
    </Button>
  );
}

export function AudioToggle({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState(true);
  const { language } = useLanguage();
  const isBn = language === 'bn';

  useEffect(() => {
    setEnabled(isAudioAlertsEnabled());
    const handleToggle = () => setEnabled(isAudioAlertsEnabled());
    window.addEventListener('hpc-audio-toggle', handleToggle);
    return () => window.removeEventListener('hpc-audio-toggle', handleToggle);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setAudioAlertsEnabled(next);
    if (next) {
      playCheckinSound();
      toast.success(isBn ? 'অডিও নোটিফিকেশন চালু হয়েছে' : 'Audio alerts enabled');
    } else {
      toast.info(isBn ? 'অডিও নোটিফিকেশন বন্ধ (মিউট)' : 'Audio alerts muted');
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      title={
        enabled
          ? isBn
            ? 'শব্দ সতর্কবার্তা চালু আছে (মিউট করতে ক্লিক করুন)'
            : 'Audio alerts active (Click to mute)'
          : isBn
          ? 'শব্দ বন্ধ (চালু করতে ক্লিক করুন)'
          : 'Audio alerts muted (Click to unmute)'
      }
      aria-label={enabled ? 'Mute audio alerts' : 'Unmute audio alerts'}
      className={cn(
        'size-8 sm:size-9 rounded-lg sm:rounded-xl border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground shrink-0 cursor-pointer transition-all duration-200 active:scale-95',
        enabled ? 'hover:text-emerald-500' : 'hover:text-rose-500',
        className
      )}
    >
      {enabled ? (
        <Volume2 className="size-3.5 sm:size-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <VolumeX className="size-3.5 sm:size-4 text-muted-foreground/60" />
      )}
    </Button>
  );
}

export function FullscreenToggle({ className }: { className?: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { language } = useLanguage();
  const isBn = language === 'bn';

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleFullscreen}
      title={
        isFullscreen
          ? isBn
            ? 'ফুলস্ক্রিন বন্ধ করুন'
            : 'Exit Fullscreen'
          : isBn
          ? 'ফুলস্ক্রিন করুন'
          : 'Enter Fullscreen'
      }
      aria-label={
        isFullscreen
          ? isBn
            ? 'ফুলস্ক্রিন বন্ধ করুন'
            : 'Exit Fullscreen'
          : isBn
          ? 'ফুলস্ক্রিন করুন'
          : 'Enter Fullscreen'
      }
      className={cn(
        'hidden sm:inline-flex size-8 sm:size-9 rounded-lg sm:rounded-xl border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-all duration-200 active:scale-95',
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
  showAudio = true,
  showFullscreen = true,
  showReload = true,
  showInstall = true,
}: {
  className?: string;
  showAudio?: boolean;
  showFullscreen?: boolean;
  showReload?: boolean;
  showInstall?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 flex-nowrap', className)}>
      {showInstall && <PwaInstallButton />}
      <LanguageToggle />
      <ThemeToggle />
      {showAudio && <AudioToggle />}
      {showReload && <HardReloadButton />}
      {showFullscreen && <FullscreenToggle />}
    </div>
  );
}

export default NavbarSwitchers;
