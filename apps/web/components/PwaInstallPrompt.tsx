// apps/web/components/PwaInstallPrompt.tsx
'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
  Download,
  Smartphone,
  Wifi,
  WifiOff,
  X,
  Share,
  PlusSquare,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

// W3C BeforeInstallPromptEvent Specification Interface
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global PWA State Store for seamless cross-component synchronization
interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isStandalone: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isIos: boolean;
  isDismissed: boolean;
  showIosGuide: boolean;
}

let pwaState: PwaState = {
  deferredPrompt: null,
  isStandalone: false,
  isInstalled: false,
  isOnline: true,
  isIos: false,
  isDismissed: false,
  showIosGuide: false,
};

const listeners = new Set<() => void>();

function notifyPwaStore() {
  listeners.forEach((listener) => listener());
}

function getPwaSnapshot(): PwaState {
  return pwaState;
}

function subscribePwaStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updatePwaState(partial: Partial<PwaState>) {
  pwaState = { ...pwaState, ...partial };
  notifyPwaStore();
}

// Client initialization helper (executed once in browser environment)
let hasInitializedListeners = false;
function initPwaListeners() {
  if (typeof window === 'undefined' || hasInitializedListeners) return;
  hasInitializedListeners = true;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  let isDismissed = false;
  try {
    const stored = localStorage.getItem('hpc_pwa_dismissed_until');
    if (stored && Number(stored) > Date.now()) {
      isDismissed = true;
    }
  } catch {}

  updatePwaState({
    isStandalone,
    isIos,
    isOnline: navigator.onLine,
    isDismissed,
  });

  // 1. Capture beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    updatePwaState({
      deferredPrompt: e as BeforeInstallPromptEvent,
      isInstalled: false,
    });
  });

  // 2. Capture appinstalled event
  window.addEventListener('appinstalled', () => {
    updatePwaState({
      deferredPrompt: null,
      isInstalled: true,
      isStandalone: true,
    });
    try {
      localStorage.removeItem('hpc_pwa_dismissed_until');
    } catch {}
  });

  // 3. Network online / offline events
  window.addEventListener('online', () => {
    updatePwaState({ isOnline: true });
  });

  window.addEventListener('offline', () => {
    updatePwaState({ isOnline: false });
  });
}

/**
 * Custom Hook to access global PWA installation and connectivity state
 */
export function usePwa() {
  useEffect(() => {
    initPwaListeners();
  }, []);

  const state = useSyncExternalStore(subscribePwaStore, getPwaSnapshot, () => pwaState);

  const promptInstall = useCallback(async () => {
    if (state.deferredPrompt) {
      try {
        await state.deferredPrompt.prompt();
        const choice = await state.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          updatePwaState({ deferredPrompt: null, isInstalled: true });
        }
      } catch (err) {
        console.error('[PWA] Installation prompt failed:', err);
      }
    } else if (state.isIos) {
      updatePwaState({ showIosGuide: true });
    }
  }, [state.deferredPrompt, state.isIos]);

  const dismissMobileBanner = useCallback(() => {
    try {
      // Dismiss for 7 days
      const expire = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem('hpc_pwa_dismissed_until', String(expire));
    } catch {}
    updatePwaState({ isDismissed: true });
  }, []);

  const closeIosGuide = useCallback(() => {
    updatePwaState({ showIosGuide: false });
  }, []);

  return {
    ...state,
    isInstallable: !state.isStandalone && (!!state.deferredPrompt || (state.isIos && !state.isInstalled)),
    promptInstall,
    dismissMobileBanner,
    closeIosGuide,
  };
}

/**
 * Compact PWA Install Button for Navbar, Headers, and Action Bars
 */
export function PwaInstallButton({ className }: { className?: string }) {
  const { language } = useLanguage();
  const { isInstallable, isStandalone, promptInstall } = usePwa();
  const isBn = language === 'bn';

  // If already installed and running standalone, render nothing to maintain minimal clean layout
  if (isStandalone || !isInstallable) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={promptInstall}
      title={isBn ? 'অ্যাপ ইনস্টল করুন' : 'Install App'}
      aria-label={isBn ? 'অ্যাপ ইনস্টল করুন' : 'Install App'}
      className={cn(
        'h-8 sm:h-9 min-h-[36px] sm:min-h-[36px] px-2 sm:px-2.5 rounded-lg sm:rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs gap-1 sm:gap-1.5 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 shrink-0 touch-manipulation',
        className
      )}
    >
      <Download className="size-3.5 sm:size-4 text-emerald-500 animate-bounce shrink-0" />
      <span className="hidden xs:inline">
        {isBn ? 'অ্যাপ ইনস্টল' : 'Install App'}
      </span>
    </Button>
  );
}

/**
 * Global PWA Offline Resilience Banner & Mobile Install Sheet
 */
export function PwaInstallPrompt() {
  const { language } = useLanguage();
  const {
    isOnline,
    isInstallable,
    isStandalone,
    isDismissed,
    showIosGuide,
    promptInstall,
    dismissMobileBanner,
    closeIosGuide,
  } = usePwa();
  const isBn = language === 'bn';

  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnectedPill, setShowReconnectedPill] = useState(false);

  // Monitor network state transitions
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      setShowReconnectedPill(true);
      const timer = setTimeout(() => {
        setShowReconnectedPill(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      {/* 1. Offline Mode Warning Pill */}
      {!isOnline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-[100] px-3.5 py-1.5 rounded-full bg-amber-500/95 dark:bg-amber-600/95 text-black font-semibold text-xs sm:text-sm shadow-lg shadow-amber-500/20 backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300 pointer-events-auto border border-amber-300/40"
        >
          <WifiOff className="size-4 animate-pulse shrink-0" />
          <span>
            {isBn
              ? 'অফলাইন মোড — ক্যাশ করা লোকাল ডাটা প্রদর্শিত হচ্ছে'
              : 'Offline Mode — Displaying cached clinic data'}
          </span>
        </aside>
      )}

      {/* 2. Reconnection Success Notification */}
      {showReconnectedPill && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-[100] px-3.5 py-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300 pointer-events-auto border border-emerald-400/40"
        >
          <Wifi className="size-4 shrink-0" />
          <span>
            {isBn
              ? 'ইন্টারনেট পুনঃসংযুক্ত — লাইভ সিঙ্ক সক্রিয়'
              : 'Internet restored — Realtime sync active'}
          </span>
        </aside>
      )}

      {/* 3. Mobile Dismissable PWA Installation Banner */}
      {isInstallable && !isStandalone && !isDismissed && (
        <aside
          role="dialog"
          aria-label={isBn ? 'অ্যাপ ইনস্টলেশন' : 'App Installation'}
          className="md:hidden fixed bottom-16 sm:bottom-20 left-2 right-2 z-40 p-3 sm:p-4 rounded-2xl bg-card/95 border border-emerald-500/30 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom duration-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="size-11 sm:size-12 rounded-xl bg-white p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center shrink-0">
              <Image
                src="/hpclogo-transparent.png"
                alt="HPC Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                  {isBn ? 'এইচপিসি যশোর ক্লিনিক অ্যাপ' : 'HPC Jashore Clinic App'}
                </h4>
                <Sparkles className="size-3 text-emerald-500 shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {isBn
                  ? 'দ্রুত অ্যাক্সেস, অফলাইন রেকর্ড ও সরাসরি নোটিফিকেশন'
                  : 'Fast access, offline records & instant notifications'}
              </p>
            </div>

            <button
              type="button"
              onClick={dismissMobileBanner}
              aria-label={isBn ? 'বন্ধ করুন' : 'Dismiss'}
              className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-90 transition-all shrink-0 cursor-pointer min-h-[36px] min-w-[36px]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={promptInstall}
              className="flex-1 h-10 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all gap-1.5 touch-manipulation cursor-pointer"
            >
              <Smartphone className="size-4 shrink-0" />
              <span>{isBn ? 'ইনস্টল করুন' : 'Install'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={dismissMobileBanner}
              className="h-10 min-h-[44px] px-3.5 rounded-xl border-border/80 text-muted-foreground text-xs font-semibold hover:bg-muted/80 active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              {isBn ? 'পরে' : 'Later'}
            </Button>
          </div>
        </aside>
      )}

      {/* 4. iOS Safari Installation Instruction Modal */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 shadow-2xl text-card-foreground animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Smartphone className="size-5 text-emerald-500" />
                <h3 className="text-sm sm:text-base font-bold">
                  {isBn ? 'আইওএস-এ ইনস্টল করুন' : 'Install on iOS Safari'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeIosGuide}
                aria-label="Close"
                className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                  1
                </span>
                <span>
                  {isBn ? (
                    <>
                      সাফারি ব্রাউজারের নিচের বারে{' '}
                      <Share className="size-3.5 inline mx-1 text-emerald-500" />{' '}
                      <strong>শেয়ার (Share)</strong> আইকনে ট্যাপ করুন।
                    </>
                  ) : (
                    <>
                      Tap the{' '}
                      <Share className="size-3.5 inline mx-1 text-emerald-500" />{' '}
                      <strong>Share</strong> button at the bottom of Safari.
                    </>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                  2
                </span>
                <span>
                  {isBn ? (
                    <>
                      নিচের মেনু স্ক্রোল করে{' '}
                      <PlusSquare className="size-3.5 inline mx-1 text-emerald-500" />{' '}
                      <strong>'Add to Home Screen'</strong> নির্বাচন করুন।
                    </>
                  ) : (
                    <>
                      Scroll down and select{' '}
                      <PlusSquare className="size-3.5 inline mx-1 text-emerald-500" />{' '}
                      <strong>'Add to Home Screen'</strong>.
                    </>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20 mt-0.5">
                  3
                </span>
                <span>
                  {isBn ? (
                    <>
                      উপরে ডান কোনায় <strong>'Add'</strong> চাপুন। অ্যাপটি সরাসরি
                      হোমস্ক্রিনে যুক্ত হবে।
                    </>
                  ) : (
                    <>
                      Tap <strong>'Add'</strong> in the top-right corner to
                      launch directly from your home screen.
                    </>
                  )}
                </span>
              </li>
            </ol>

            <div className="mt-5 pt-3 border-t border-border/60">
              <Button
                type="button"
                onClick={closeIosGuide}
                className="w-full h-10 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm cursor-pointer"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{isBn ? 'বুঝেছি' : 'Got it'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PwaInstallPrompt;
