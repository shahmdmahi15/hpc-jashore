// apps/web/components/WaitingRoomTvView.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api, getSession, clearSession, getRoleHomeRoute, UserSession } from '../lib/api';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  DoorOpen,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Radio,
  RotateCw,
  ShieldCheck,
  Stethoscope,
  Sun,
  Tv,
  Volume2,
  VolumeX,
} from 'lucide-react';

type Language = 'bn' | 'en';
type Theme = 'dark' | 'light';
type DepartmentFilter = 'ALL' | 'CONSULTATION' | 'THERAPY';

interface ConsultationItem {
  serialNumber: number;
  tokenNumber: number;
  patientNameEn: string;
  patientNameBn?: string | null;
  doctorId?: string;
  doctorNameEn?: string;
  doctorSpecialization?: string | null;
  calledAt?: string | null;
  status?: string;
  priority?: string;
}

interface TherapyItem {
  sessionId?: string;
  visitId?: string;
  tokenNumber?: number;
  patientNameEn: string;
  patientNameBn?: string | null;
  modalityCode?: string;
  modalityNameEn?: string | null;
  modalityNameBn?: string | null;
  bedName?: string | null;
  startedAt?: string | null;
  durationMinutes?: number;
  priority?: string;
  currentLocation?: string | null;
  checkedInAt?: string | null;
  toldTime?: string | null;
  punctualityStatus?: 'on_time' | 'moderate_delay' | 'critical_delay' | null;
  delayMinutes?: number | null;
}

interface TvSnapshotData {
  date: string;
  clinicName: string;
  clinicNameBn: string;
  chiefDoctor: string;
  timestamp: string;
  channels: any[];
  consultationQueue: {
    nowServing: ConsultationItem[];
    waiting: ConsultationItem[];
  };
  therapyQueue: {
    nowServing: TherapyItem[];
    waiting: TherapyItem[];
  };
  bulletinNotices: string[];
}

function getTvRoleIcon(role?: string) {
  switch (role) {
    case 'doctor':
      return Stethoscope;
    case 'handler':
      return Activity;
    case 'cashier':
      return CreditCard;
    case 'receptionist':
      return ClipboardList;
    case 'admin':
    default:
      return ShieldCheck;
  }
}

export default function WaitingRoomTvView() {
  const [lang, setLang] = useState<Language>('bn');
  const [theme, setTheme] = useState<Theme>('dark');
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('ALL');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [activeCallAlert, setActiveCallAlert] = useState<ConsultationItem | null>(null);
  const [callCountdown, setCallCountdown] = useState<number>(12);
  const [liveBulletins, setLiveBulletins] = useState<any[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  const [snapshot, setSnapshot] = useState<TvSnapshotData>({
    date: new Date().toISOString().slice(0, 10),
    clinicName: 'Health & Pain Care Center · Jashore',
    clinicNameBn: 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর',
    chiefDoctor: 'ডাঃ মোঃ তৌফিক উজ জামান (BPT, PGD, MDMR, MPH)',
    timestamp: new Date().toISOString(),
    channels: [],
    consultationQueue: { nowServing: [], waiting: [] },
    therapyQueue: { nowServing: [], waiting: [] },
    bulletinNotices: [
      'স্বাগতম: হেলথ অ্যান্ড পেইন কেয়ার সেন্টার (HPC) · যশোর | আধুনিক ফিজিওথেরাপি ও পুনর্বাসন কেন্দ্র',
      'চিফ কনসালট্যান্ট: ডাঃ মোঃ তৌফিক উজ জামান (BPT DU, PGD Acupuncture China, MDMR Pain Management DU, MPH)',
      'জরুরি হটলাইন: +880 1515-615188 | অনুগ্রহ করে আপনার টোকেন নম্বর ডিসপ্লেতে লক্ষ্য করুন',
      'চাচড়া পুলিশ ফাঁড়ির বিপরীতে, ডালমিল মোড়, যশোর ৭৪০০ | সিরিয়ালের জন্য অপেক্ষা করুন',
      'থেরাপির সময় মোবাইল ফোন সাইলেন্ট রাখুন | নামাজের বিরতি: দুপুর ১:১৫ হতে ১:৪৫ পর্যন্ত',
      'Welcome to HPC Jashore | Evidence-led pain management, stroke rehabilitation, and physical therapy',
    ],
  });

  const lastCalledSerialRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Synchronize available voices for Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
  }, []);

  // Screen Wake Lock API to prevent TV display from sleeping with automatic re-acquisition
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          setIsWakeLockActive(true);
          wakeLock.addEventListener('release', () => {
            setIsWakeLockActive(false);
          });
        }
      } catch (err) {
        // WakeLock not supported or denied
      }
    };
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Web Audio chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.22); // A5
      gain2.gain.setValueAtTime(0.3, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 1.1);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  const speakAnnouncement = (text: string, voiceLang: 'bn-BD' | 'en-US') => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceLang;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const toBnNum = (n: number | string | undefined | null): string => {
    if (n === undefined || n === null) return '';
    const s = String(n);
    if (lang === 'en') return s;
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return s.replace(/\d/g, (d) => bnDigits[Number(d)] || d);
  };

  const loadData = async () => {
    try {
      const data = await api.visits.getTvSnapshot();
      if (data) {
        setSnapshot((prev) => ({
          ...prev,
          ...data,
          consultationQueue: data.consultationQueue || prev.consultationQueue,
          therapyQueue: data.therapyQueue || prev.therapyQueue,
          bulletinNotices: data.bulletinNotices?.length ? data.bulletinNotices : prev.bulletinNotices,
        }));
        setConnectionStatus('connected');

        try {
          const bRes = await api.bulletins.listActive();
          if (Array.isArray(bRes) && bRes.length > 0) {
            setLiveBulletins(bRes);
          }
        } catch {
          // fallback to defaults
        }

        setLastSyncTime(
          new Date().toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        );

        // Detect newly called consultation serial
        const latestCalled = data.consultationQueue?.nowServing?.[0];
        if (latestCalled && latestCalled.serialNumber !== lastCalledSerialRef.current) {
          lastCalledSerialRef.current = latestCalled.serialNumber;
          setActiveCallAlert(latestCalled);
          setCallCountdown(12);

          if (audioEnabled) {
            playChime();
            setTimeout(() => {
              if (lang === 'bn') {
                speakAnnouncement(
                  `টোকেন নম্বর ${latestCalled.tokenNumber || latestCalled.serialNumber}, ${latestCalled.patientNameBn || latestCalled.patientNameEn}, ডাক্তার চেম্বারে আসুন।`,
                  'bn-BD',
                );
              } else {
                speakAnnouncement(
                  `Token number ${latestCalled.tokenNumber || latestCalled.serialNumber}, ${latestCalled.patientNameEn}, please enter doctor consultation chamber.`,
                  'en-US',
                );
              }
            }, 600);
          }

          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = setInterval(() => {
            setCallCountdown((prev) => {
              if (prev <= 1) {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                setActiveCallAlert(null);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch (err) {
      setConnectionStatus('reconnecting');
    }
  };

  // Clock ticker & polling loop
  useEffect(() => {
    loadData();
    const pollTimer = setInterval(loadData, 3000);

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      );
      setCurrentDateFormatted(
        now.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      );
    };

    updateClock();
    const clockTimer = setInterval(updateClock, 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(clockTimer);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [lang, audioEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Fullscreen change synchronization
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

  // TV Remote D-Pad / Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          setAudioEnabled((prev) => !prev);
          break;
        case 'l':
        case 'L':
          setLang((prev) => (prev === 'bn' ? 'en' : 'bn'));
          break;
        case 't':
        case 'T':
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
          break;
        case '1':
          setDepartmentFilter('ALL');
          break;
        case '2':
          setDepartmentFilter('CONSULTATION');
          break;
        case '3':
          setDepartmentFilter('THERAPY');
          break;
        case 'Escape':
        case ' ':
          if (activeCallAlert) {
            setActiveCallAlert(null);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCallAlert]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] h-screen max-h-screen w-[100dvw] max-w-[100dvw] w-screen max-w-screen overflow-hidden flex flex-col justify-between font-sans select-none transition-colors duration-200 ${
        isDark ? 'bg-black text-white' : 'bg-white text-zinc-950'
      }`}
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100dvw',
        maxWidth: '100dvw',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER: ADAPTIVE HEIGHT WITH SAFE AREA INSETS          */}
      {/* ============================================================== */}
      <header
        className={`min-h-12 sm:min-h-14 2xl:min-h-20 h-auto py-2 shrink-0 w-full px-3 sm:px-5 2xl:px-8 flex items-center justify-between border-b gap-2 sm:gap-4 transition-colors z-20 ${
          isDark
            ? 'bg-zinc-950/95 border-zinc-800 text-white'
            : 'bg-zinc-50 border-zinc-200 text-zinc-950 shadow-xs'
        }`}
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
      >
        {/* Left: HPC Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 2xl:w-14 2xl:h-14 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center shrink-0 border border-zinc-200">
            <Image
              src="/hpclogo-transparent.png"
              alt="HPC Logo"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-base 2xl:text-2xl font-black tracking-tight leading-none text-emerald-500">
                {lang === 'bn' ? snapshot.clinicNameBn : snapshot.clinicName}
              </h1>
              <span className="hidden md:inline-flex text-[9px] 2xl:text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 uppercase">
                {lang === 'bn' ? 'স্মার্ট টিভি কিউ' : 'Smart TV Queue'}
              </span>
            </div>
            <p
              className={`text-[9px] sm:text-xs 2xl:text-sm mt-0.5 font-medium leading-none truncate max-w-[200px] sm:max-w-md ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              {lang === 'bn'
                ? 'চিফ কনসালট্যান্ট: ডাঃ মোঃ তৌফিক উজ জামান (BPT, PGD, MDMR, MPH)'
                : 'Chief Consultant: Dr. Md. Toufiq Uz Zaman (BPT, PGD, MDMR, MPH)'}
            </p>
          </div>
        </div>

        {/* Center: Department Switcher + Control Tools */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Department Filter Toggle (Allows single or dual column TV mode) */}
          <div
            className={`hidden sm:inline-flex items-center rounded-lg p-0.5 border ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setDepartmentFilter('ALL')}
              className={`px-2 py-0.5 2xl:px-3 2xl:py-1 rounded-md text-[10px] 2xl:text-xs font-bold cursor-pointer transition-all ${
                departmentFilter === 'ALL'
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-700 hover:text-black'
              }`}
            >
              {lang === 'bn' ? 'সকল' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter('CONSULTATION')}
              className={`px-2 py-0.5 2xl:px-3 2xl:py-1 rounded-md text-[10px] 2xl:text-xs font-bold cursor-pointer transition-all ${
                departmentFilter === 'CONSULTATION'
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-700 hover:text-black'
              }`}
            >
              {lang === 'bn' ? 'চেম্বার' : 'Chambers'}
            </button>
            <button
              type="button"
              onClick={() => setDepartmentFilter('THERAPY')}
              className={`px-2 py-0.5 2xl:px-3 2xl:py-1 rounded-md text-[10px] 2xl:text-xs font-bold cursor-pointer transition-all ${
                departmentFilter === 'THERAPY'
                  ? 'bg-emerald-500 text-black shadow-xs font-black'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-700 hover:text-black'
              }`}
            >
              {lang === 'bn' ? 'থেরাপি' : 'Therapy'}
            </button>
          </div>

          {/* Wake Lock Status Badge */}
          <div
            className={`hidden xl:inline-flex items-center gap-1 px-2 py-0.5 2xl:px-3 2xl:py-1 rounded-md text-[10px] 2xl:text-xs font-bold border ${
              isWakeLockActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900/60 text-zinc-500 border-zinc-800'
            }`}
            title={
              isWakeLockActive
                ? 'Screen Wake Lock active (TV display will stay awake)'
                : 'Wake Lock inactive'
            }
          >
            <Tv className="size-3" />
            <span>{isWakeLockActive ? (lang === 'bn' ? 'সজাগ' : 'Awake') : 'TV'}</span>
          </div>

          {/* Live Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs 2xl:text-sm font-bold border ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-emerald-400'
                : 'bg-white border-zinc-200 text-emerald-600 shadow-2xs'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse'
                  : 'bg-amber-500 animate-ping'
              }`}
            />
            <span className="hidden sm:inline">
              {connectionStatus === 'connected'
                ? lang === 'bn'
                  ? 'লাইভ'
                  : 'Live'
                : lang === 'bn'
                ? 'সংযোগ...'
                : 'Connecting...'}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playChime();
            }}
            className={`h-7 sm:h-8 2xl:h-10 px-2 rounded-lg text-xs 2xl:text-sm font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              audioEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isDark
                ? 'bg-zinc-900 text-zinc-500 border-zinc-800'
                : 'bg-white text-zinc-400 border-zinc-200'
            }`}
            title="Toggle Chime Sound"
          >
            {audioEnabled ? <Volume2 className="size-3.5 2xl:size-4" /> : <VolumeX className="size-3.5 2xl:size-4" />}
          </button>

          {/* Hard Reload */}
          <button
            type="button"
            onClick={async () => {
              try {
                if (typeof window !== 'undefined' && 'caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
              } catch {}
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className={`h-7 w-7 sm:h-8 sm:w-8 2xl:h-10 2xl:w-10 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:text-emerald-400'
                : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200 hover:text-emerald-600'
            }`}
            title="Hard Reload / হার্ড রিলোড"
          >
            <RotateCw className="size-3.5 2xl:size-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`h-7 w-7 sm:h-8 sm:w-8 2xl:h-10 2xl:w-10 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center cursor-pointer ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200'
            }`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-3.5 2xl:size-4" /> : <Maximize2 className="size-3.5 2xl:size-4" />}
          </button>

          {/* Staff Login / Role Dashboard + Logout */}
          {session ? (
            <>
              <Link
                href={getRoleHomeRoute(session.role)}
                className={`h-7 sm:h-8 2xl:h-10 px-2 sm:px-2.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold active:scale-95 ${
                  isDark
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}
                title={session.displayName || (lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard')}
              >
                {(() => {
                  const RoleIcon = getTvRoleIcon(session.role);
                  return <RoleIcon className="size-3.5 2xl:size-4 text-emerald-500 shrink-0" />;
                })()}
                <span className="hidden xl:inline">
                  {session.role === 'admin'
                    ? lang === 'bn' ? 'অ্যাডমিন' : 'Admin'
                    : session.role === 'doctor'
                    ? lang === 'bn' ? 'ডাক্তার' : 'Doctor'
                    : session.role === 'handler'
                    ? lang === 'bn' ? 'হ্যান্ডলার' : 'Handler'
                    : session.role === 'cashier'
                    ? lang === 'bn' ? 'ক্যাশিয়ার' : 'Cashier'
                    : lang === 'bn' ? 'অভ্যর্থনা' : 'Reception'}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={`h-7 w-7 sm:h-8 sm:w-8 2xl:h-10 2xl:w-10 rounded-lg border transition-colors flex items-center justify-center cursor-pointer active:scale-95 ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border-zinc-800 hover:border-red-500/40'
                    : 'bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 border-zinc-200 hover:border-red-300'
                }`}
                title={lang === 'bn' ? 'লগআউট' : 'Logout'}
              >
                <LogOut className="size-3.5 2xl:size-4" />
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className={`h-7 w-7 sm:h-8 sm:w-8 2xl:h-10 2xl:w-10 rounded-lg border transition-colors flex items-center justify-center cursor-pointer active:scale-95 ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
                  : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-black border-zinc-200'
              }`}
              title="Staff Login Portal"
            >
              <LogIn className="size-3.5 2xl:size-4" />
            </Link>
          )}
        </div>

        {/* Right: Digital Clock & Date */}
        <div className="text-right shrink-0">
          <div className="text-sm sm:text-lg 2xl:text-3xl font-black font-mono text-emerald-500 leading-none tracking-tight">
            {currentTime || '00:00:00'}
          </div>
          <div
            className={`text-[8px] sm:text-[10px] 2xl:text-xs font-semibold mt-0.5 leading-none ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            {currentDateFormatted || 'Loading...'}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. CALLING POPUP OVERLAY (ACTIVE ANNOUNCEMENT)                */}
      {/* ============================================================== */}
      {activeCallAlert && (
        <aside
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 select-none overflow-hidden"
        >
          <div className="w-full max-w-3xl p-6 sm:p-10 rounded-3xl border-4 border-emerald-500 bg-zinc-950 shadow-[0_0_120px_rgba(16,185,129,0.4)] text-center text-white relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-black uppercase tracking-widest mb-4 animate-pulse">
              <Radio className="size-4 animate-ping text-emerald-400" />
              <span>{lang === 'bn' ? 'রোগীকে ডাকা হচ্ছে • NOW CALLING' : 'NOW CALLING PATIENT'}</span>
            </div>

            <div className="mb-2">
              <span className="px-5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-black text-2xl sm:text-4xl shadow-inner">
                {lang === 'bn'
                  ? `টোকেন #${toBnNum(activeCallAlert.tokenNumber || activeCallAlert.serialNumber)}`
                  : `TOKEN #${activeCallAlert.tokenNumber || activeCallAlert.serialNumber}`}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3 mb-2">
              {lang === 'bn'
                ? activeCallAlert.patientNameBn || activeCallAlert.patientNameEn
                : activeCallAlert.patientNameEn}
            </h2>

            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white border border-emerald-400/40 shadow-xl flex items-center justify-center gap-4 mt-6">
              <div className="p-3 rounded-xl bg-white/20 border border-white/30 shrink-0">
                <DoorOpen className="size-10 sm:size-12 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-widest text-emerald-100 font-bold">
                  {lang === 'bn' ? 'ডাক্তার কনসাল্টেশন চেম্বার' : 'Doctor Consultation Chamber'}
                </div>
                <div className="text-2xl sm:text-4xl font-black font-mono text-white">
                  {lang === 'bn' ? 'চেম্বার নং ১ (ডাঃ তৌফিক)' : 'CHAMBER 1 (Dr. Toufiq)'}
                </div>
              </div>
            </div>

            {/* Countdown dismissal */}
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
              <span>{lang === 'bn' ? `স্বয়ংক্রিয়ভাবে বন্ধ হবে: ${toBnNum(callCountdown)} সেকেন্ড` : `Auto dismiss in: ${callCountdown}s`}</span>
              <button
                type="button"
                onClick={() => setActiveCallAlert(null)}
                className="px-3 py-1 rounded-md text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 3. MAIN LIVE QUEUE DISPLAY (FITS 100% OF VIEWPORT, ZERO SCROLL) */}
      {/* ============================================================== */}
      <main
        className={`flex-1 min-h-0 w-full p-2 sm:p-3 2xl:p-5 grid gap-2 sm:gap-3 2xl:gap-5 overflow-hidden ${
          departmentFilter === 'ALL'
            ? 'grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1'
            : 'grid-cols-1 grid-rows-1'
        }`}
      >
        {/* ============================================================ */}
        {/* COLUMN 1: DOCTOR CONSULTATION QUEUE                          */}
        {/* ============================================================ */}
        {(departmentFilter === 'ALL' || departmentFilter === 'CONSULTATION') && (
          <section
            className={`flex flex-col h-full min-h-0 rounded-2xl border transition-colors shadow-sm overflow-hidden ${
              isDark
                ? 'bg-zinc-950/90 border-zinc-800'
                : 'bg-white border-zinc-200'
            }`}
          >
            {/* Header */}
            <div
              className={`h-10 sm:h-12 2xl:h-14 shrink-0 px-3 sm:px-4 flex items-center justify-between border-b ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Stethoscope className="size-3.5 sm:size-4 2xl:size-5" />
                </div>
                <h2 className="text-xs sm:text-sm 2xl:text-base font-black tracking-tight">
                  {lang === 'bn' ? 'ডাক্তার কনসাল্টেশন কিউ' : 'Doctor Consultation Queue'}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs 2xl:text-sm font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {lang === 'bn'
                  ? `অপেক্ষারত: ${toBnNum(snapshot.consultationQueue.waiting.length)}`
                  : `Waiting: ${snapshot.consultationQueue.waiting.length}`}
              </span>
            </div>

            {/* UNIFIED EXPANSIVE GRID VIEW OF QUEUE PATIENTS */}
            <div className="flex-1 min-h-0 p-2.5 sm:p-3 2xl:p-4 overflow-y-auto no-scrollbar">
              {snapshot.consultationQueue.waiting.length === 0 ? (
                <div
                  className={`text-center py-12 text-xs 2xl:text-sm rounded-2xl border border-dashed flex flex-col items-center justify-center h-full min-h-[220px] ${
                    isDark
                      ? 'border-zinc-800 text-zinc-500 bg-zinc-900/40'
                      : 'border-zinc-200 text-zinc-500 bg-zinc-50'
                  }`}
                >
                  <CheckCircle2 className="w-8 h-8 2xl:w-10 2xl:h-10 text-emerald-500 mb-2" />
                  <span className="font-bold text-sm 2xl:text-base text-foreground">
                    {lang === 'bn' ? 'বর্তমানে কোনো সিরিয়াল অপেক্ষারত নেই' : 'No Patients Currently Waiting'}
                  </span>
                  <span className="text-[11px] 2xl:text-xs mt-1 text-muted-foreground">
                    {lang === 'bn' ? 'সবাইকে সেবা দেওয়া হয়েছে অথবা চেম্বার অপেক্ষমাণ' : 'All consultation tokens have been completed'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3 2xl:gap-4">
                  {snapshot.consultationQueue.waiting.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 sm:p-3.5 2xl:p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                        isDark
                          ? 'bg-zinc-900/80 border-zinc-800/90 hover:border-emerald-500/50 hover:bg-zinc-900'
                          : 'bg-zinc-50/90 border-zinc-200 hover:border-emerald-500/50 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Top Row: Index Badge & Token Number */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] 2xl:text-xs font-mono font-bold bg-muted/80 text-muted-foreground border border-border/50">
                          #{toBnNum(idx + 1)}
                        </span>
                        <div className="text-right">
                          <span className="text-2xl sm:text-3xl 2xl:text-4xl font-black font-mono tracking-tight text-emerald-500 leading-none">
                            {toBnNum(item.tokenNumber || item.serialNumber)}
                          </span>
                        </div>
                      </div>

                      {/* Patient Name */}
                      <div className="min-w-0 my-1">
                        <div className="text-xs sm:text-sm 2xl:text-base font-black text-foreground truncate">
                          {lang === 'bn' ? item.patientNameBn || item.patientNameEn : item.patientNameEn}
                        </div>
                      </div>

                      {/* Bottom Row: Chamber & Priority */}
                      <div className="flex items-center justify-between text-[10px] 2xl:text-xs pt-2 border-t border-border/40 mt-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {lang === 'bn' ? 'চেম্বার ১' : 'Chamber 1'}
                        </span>
                        <span
                          className={`font-medium ${
                            item.priority === 'emergency'
                              ? 'text-red-500 font-bold animate-pulse'
                              : isDark
                              ? 'text-zinc-400'
                              : 'text-zinc-500'
                          }`}
                        >
                          {item.priority === 'emergency'
                            ? (lang === 'bn' ? '🚨 জরুরি' : '🚨 Urgent')
                            : (lang === 'bn' ? `সিরিয়াল #${toBnNum(item.serialNumber)}` : `Serial #${item.serialNumber}`)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* COLUMN 2: PHYSIOTHERAPY & REHAB QUEUE                        */}
        {/* ============================================================ */}
        {(departmentFilter === 'ALL' || departmentFilter === 'THERAPY') && (
          <section
            className={`flex flex-col h-full min-h-0 rounded-2xl border transition-colors shadow-sm overflow-hidden ${
              isDark
                ? 'bg-zinc-950/90 border-zinc-800'
                : 'bg-white border-zinc-200'
            }`}
          >
            {/* Header */}
            <div
              className={`h-10 sm:h-12 2xl:h-14 shrink-0 px-3 sm:px-4 flex items-center justify-between border-b ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="size-3.5 sm:size-4 2xl:size-5" />
                </div>
                <h2 className="text-xs sm:text-sm 2xl:text-base font-black tracking-tight">
                  {lang === 'bn' ? 'ফিজিওথেরাপি ও পুনর্বাসন কিউ' : 'Physiotherapy & Rehab Queue'}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs 2xl:text-sm font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {lang === 'bn'
                  ? `অপেক্ষারত: ${toBnNum(snapshot.therapyQueue.waiting.length)}`
                  : `Waiting: ${snapshot.therapyQueue.waiting.length}`}
              </span>
            </div>

            {/* UNIFIED EXPANSIVE GRID VIEW OF THERAPY QUEUE PATIENTS */}
            <div className="flex-1 min-h-0 p-2.5 sm:p-3 2xl:p-4 overflow-y-auto no-scrollbar">
              {snapshot.therapyQueue.waiting.length === 0 ? (
                <div
                  className={`text-center py-12 text-xs 2xl:text-sm rounded-2xl border border-dashed flex flex-col items-center justify-center h-full min-h-[220px] ${
                    isDark
                      ? 'border-zinc-800 text-zinc-500 bg-zinc-900/40'
                      : 'border-zinc-200 text-zinc-500 bg-zinc-50'
                  }`}
                >
                  <CheckCircle2 className="w-8 h-8 2xl:w-10 2xl:h-10 text-emerald-500 mb-2" />
                  <span className="font-bold text-sm 2xl:text-base text-foreground">
                    {lang === 'bn' ? 'থেরাপির জন্য কোনো সিরিয়াল অপেক্ষারত নেই' : 'No Therapy Patients Currently Waiting'}
                  </span>
                  <span className="text-[11px] 2xl:text-xs mt-1 text-muted-foreground">
                    {lang === 'bn' ? 'সকল থেরাপি টোকেন সম্পন্ন হয়েছে' : 'All therapy queue tokens have been attended to'}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-3 2xl:gap-4">
                  {snapshot.therapyQueue.waiting.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 sm:p-3.5 2xl:p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                        isDark
                          ? 'bg-zinc-900/80 border-zinc-800/90 hover:border-emerald-500/50 hover:bg-zinc-900'
                          : 'bg-zinc-50/90 border-zinc-200 hover:border-emerald-500/50 hover:bg-white shadow-2xs'
                      }`}
                    >
                      {/* Top Row: Index Badge & Token Number */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] 2xl:text-xs font-mono font-bold bg-muted/80 text-muted-foreground border border-border/50">
                          #{toBnNum(idx + 1)}
                        </span>
                        <div className="text-right">
                          <span className="text-2xl sm:text-3xl 2xl:text-4xl font-black font-mono tracking-tight text-emerald-500 leading-none">
                            {toBnNum(item.tokenNumber)}
                          </span>
                        </div>
                      </div>

                      {/* Patient Name */}
                      <div className="min-w-0 my-1">
                        <div className="text-xs sm:text-sm 2xl:text-base font-black text-foreground truncate">
                          {lang === 'bn' ? item.patientNameBn || item.patientNameEn : item.patientNameEn}
                        </div>
                      </div>

                      {/* Punctuality Marker & Told Time */}
                      {item.punctualityStatus && (
                        <div className="my-1 flex items-center gap-1.5 flex-wrap">
                          {item.punctualityStatus === 'on_time' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] 2xl:text-xs font-bold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {item.delayMinutes != null && item.delayMinutes <= 0
                                ? (lang === 'bn' ? `যথাসময়ে (${toBnNum(Math.abs(item.delayMinutes))} মি. আগে)` : `On Time (${Math.abs(item.delayMinutes)}m early)`)
                                : (lang === 'bn' ? `যথাসময়ে (+${toBnNum(item.delayMinutes || 0)} মি.)` : `On Time (+${item.delayMinutes || 0}m)`)}
                            </span>
                          )}
                          {item.punctualityStatus === 'moderate_delay' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] 2xl:text-xs font-bold font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              {lang === 'bn' ? `দেরি: +${toBnNum(item.delayMinutes || 0)} মি.` : `Late: +${item.delayMinutes || 0}m`}
                            </span>
                          )}
                          {item.punctualityStatus === 'critical_delay' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] 2xl:text-xs font-bold font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              {lang === 'bn' ? `বিলম্বিত: +${toBnNum(item.delayMinutes || 0)} মি.` : `Very Late: +${item.delayMinutes || 0}m`}
                            </span>
                          )}
                          {item.toldTime && (
                            <span className="text-[10px] 2xl:text-xs text-muted-foreground font-mono">
                              ⏰ {item.toldTime}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom Row: Hall/Modality & Duration/Status */}
                      <div className="flex items-center justify-between text-[10px] 2xl:text-xs pt-2 border-t border-border/40 mt-1">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[65%]">
                          {lang === 'bn' ? 'থেরাপি লাউঞ্জ' : 'Therapy Lounge'}
                        </span>
                        <span
                          className={`font-mono font-bold text-right shrink-0 ${
                            isDark ? 'text-zinc-400' : 'text-zinc-500'
                          }`}
                        >
                          {lang === 'bn' ? 'অপেক্ষমাণ' : 'Queued'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ============================================================== */}
      {/* 4. BOTTOM BULLETIN NOTICE TICKER: FIXED HEIGHT, NEVER OVERFLOWS */}
      {/* ============================================================== */}
      <footer
        className={`h-8 sm:h-9 2xl:h-12 shrink-0 w-full px-3 sm:px-4 2xl:px-8 flex items-center gap-2 sm:gap-3 border-t overflow-hidden ${
          isDark
            ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
            : 'bg-zinc-900 border-zinc-800 text-white shadow-inner'
        }`}
      >
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-black text-[9px] sm:text-[10px] 2xl:text-xs font-black uppercase tracking-wider shrink-0">
          <span>📢</span>
          <span>{lang === 'bn' ? 'জরুরি নোটিশ' : 'BULLETIN'}</span>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="inline-block whitespace-nowrap animate-marquee text-[11px] sm:text-xs 2xl:text-sm font-semibold text-emerald-400">
            {liveBulletins.length > 0
              ? liveBulletins.map((b, idx) => (
                  <span key={b.id || idx} className="inline-flex items-center gap-2 mx-4">
                    {b.isUrgent === 1 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-xs">
                        <span>🚨</span>
                        <span>{lang === 'bn' ? 'জরুরি ঘোষণা' : 'URGENT NOTICE'}</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        <span>📢</span>
                      </span>
                    )}
                    <span className={b.isUrgent === 1 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                      {lang === 'bn' ? b.contentBn : b.contentEn}
                    </span>
                    <span className="text-zinc-600">✦</span>
                  </span>
                ))
              : snapshot.bulletinNotices.join('　•　')}
          </div>
        </div>

        <div className="text-[9px] sm:text-[10px] 2xl:text-xs font-mono text-zinc-400 shrink-0 hidden sm:block">
          Sync: {lastSyncTime || 'Active'}
        </div>
      </footer>

      {/* CSS marquee animation */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
      `}</style>
    </div>
  );
}
