// apps/web/components/WaitingRoomTvView.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { api } from '../lib/api';

type Language = 'bn' | 'en';
type Theme = 'dark' | 'light';

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

export default function WaitingRoomTvView() {
  const [lang, setLang] = useState<Language>('bn');
  const [theme, setTheme] = useState<Theme>('dark');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

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
      'চিফ কনসালট্যান্ট: ডাঃ মোঃ তৌফিক উজ জামান (BPT, PGD, MDMR, MPH) · স্পেশালাইজড পেইন ম্যানেজমেন্ট',
      'জরুরি হটলাইন: 01711-000000 | অনুগ্রহ করে আপনার টোকেন নম্বর লক্ষ্য করুন',
      'থেরাপির সময় মোবাইল ফোন সাইলেন্ট রাখুন | নামাজের বিরতি: দুপুর ১:১৫ হতে ১:৪৫ পর্যন্ত',
      'Welcome to HPC Jashore | Please monitor the screen for your consultation & therapy tokens',
    ],
  });

  const lastCalledSerialRef = useRef<number | null>(null);

  // Play pleasant hospital announcement chime via Web Audio API
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Note 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.25);
      gain2.gain.setValueAtTime(0.3, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.2);
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
      utterance.rate = 0.95;
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
        setLastSyncTime(new Date().toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // Detect newly called consultation serial
        const latestCalled = data.consultationQueue?.nowServing?.[0];
        if (latestCalled && latestCalled.serialNumber !== lastCalledSerialRef.current) {
          lastCalledSerialRef.current = latestCalled.serialNumber;
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
        }
      }
    } catch (err) {
      console.warn('TV Snapshot fetch error:', err);
      setConnectionStatus('reconnecting');
    }
  };

  useEffect(() => {
    loadData();
    const pollTimer = setInterval(loadData, 4000);

    const clockTimer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      );
      setCurrentDateFormatted(
        now.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      );
    }, 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(clockTimer);
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

  const isDark = theme === 'dark';

  // Theme design tokens
  const colors = isDark
    ? {
        bg: '#030c08',
        cardBg: '#071b12',
        cardBorder: '#123e2c',
        cardSubtle: '#092419',
        textPrimary: '#f0fdf4',
        textSecondary: '#a7f3d0',
        textMuted: '#6ee7b7',
        accentEmerald: '#10b981',
        accentGlow: 'rgba(16, 185, 129, 0.25)',
        consultBadge: '#3b82f6',
        therapyBadge: '#8b5cf6',
        warningBadge: '#f59e0b',
        headerBorder: '#0b3524',
        marqueeBg: '#042719',
        marqueeText: '#ecfdf5',
      }
    : {
        bg: '#f8fafc',
        cardBg: '#ffffff',
        cardBorder: '#cbd5e1',
        cardSubtle: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#047857',
        textMuted: '#64748b',
        accentEmerald: '#059669',
        accentGlow: 'rgba(5, 150, 105, 0.15)',
        consultBadge: '#2563eb',
        therapyBadge: '#7c3aed',
        warningBadge: '#d97706',
        headerBorder: '#e2e8f0',
        marqueeBg: '#065f46',
        marqueeText: '#ffffff',
      };

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
        transition: 'background-color 0.3s ease, color 0.3s ease',
        overflowX: 'hidden',
      }}
    >
      {/* ============================================================== */}
      {/* TV TOP NAVIGATION & LIVE CLOCK BANNER                          */}
      {/* ============================================================== */}
      <header
        style={{
          borderBottom: `2px solid ${colors.headerBorder}`,
          backgroundColor: colors.cardBg,
          padding: '0.85rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.05)',
        }}
      >
        {/* Left: HPC Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              flexShrink: 0,
              padding: '4px',
            }}
          >
            <Image
              src="/hpclogo-transparent.png"
              alt="HPC Jashore Logo"
              width={64}
              height={64}
              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
              priority
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  margin: 0,
                  color: colors.accentEmerald,
                  letterSpacing: '-0.02em',
                }}
              >
                {lang === 'bn' ? snapshot.clinicNameBn : snapshot.clinicName}
              </h1>
              <span
                style={{
                  backgroundColor: colors.cardSubtle,
                  color: colors.accentEmerald,
                  border: `1px solid ${colors.cardBorder}`,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                {lang === 'bn' ? 'স্মার্ট টিভি কিউ' : 'Smart TV Queue'}
              </span>
            </div>

            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: colors.textMuted }}>
              {lang === 'bn'
                ? 'চিফ কনসালট্যান্ট: ডাঃ মোঃ তৌফিক উজ জামান (BPT, PGD, MDMR, MPH)'
                : 'Chief Consultant: Dr. Md. Toufiq Uz Zaman (BPT, PGD, MDMR, MPH)'}
            </p>
          </div>
        </div>

        {/* Center: Controls (Language, Theme, Audio, Fullscreen) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Realtime Live Connection Pulse Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: colors.cardSubtle,
              border: `1px solid ${colors.cardBorder}`,
              padding: '0.4rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: connectionStatus === 'connected' ? '#10b981' : '#f59e0b',
                boxShadow: connectionStatus === 'connected' ? '0 0 10px #10b981' : 'none',
                display: 'inline-block',
                animation: connectionStatus === 'connected' ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span style={{ color: connectionStatus === 'connected' ? colors.accentEmerald : colors.warningBadge }}>
              {connectionStatus === 'connected'
                ? lang === 'bn'
                  ? 'লাইভ সংযুক্ত'
                  : 'Live Connected'
                : lang === 'bn'
                ? 'পুনরায় সংযোগ...'
                : 'Reconnecting...'}
            </span>
          </div>

          {/* Dual Language Switcher */}
          <button
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            style={{
              backgroundColor: colors.cardSubtle,
              border: `1px solid ${colors.cardBorder}`,
              color: colors.textPrimary,
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Toggle Language"
          >
            🌐 {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>

          {/* Dual Theme Switcher */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            style={{
              backgroundColor: colors.cardSubtle,
              border: `1px solid ${colors.cardBorder}`,
              color: colors.textPrimary,
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Toggle Theme"
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => {
              const next = !audioEnabled;
              setAudioEnabled(next);
              if (next) playChime();
            }}
            style={{
              backgroundColor: audioEnabled ? colors.accentEmerald : colors.cardSubtle,
              border: `1px solid ${colors.cardBorder}`,
              color: audioEnabled ? '#ffffff' : colors.textPrimary,
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Audio Chime"
          >
            {audioEnabled ? '🔔 Sound ON' : '🔕 Sound OFF'}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            style={{
              backgroundColor: colors.cardSubtle,
              border: `1px solid ${colors.cardBorder}`,
              color: colors.textPrimary,
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? '↙ Standard' : '⛶ Fullscreen'}
          </button>
        </div>

        {/* Right: Digital Clock & Date */}
        <div style={{ textAlign: 'right', minWidth: '170px' }}>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: colors.accentEmerald,
              fontFamily: 'monospace',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {currentTime || '00:00:00'}
          </div>
          <div style={{ fontSize: '0.82rem', color: colors.textMuted, marginTop: '2px', fontWeight: 600 }}>
            {currentDateFormatted || 'Loading date...'}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN TWO-COLUMN QUEUE LAYOUT                                   */}
      {/* ============================================================== */}
      <main
        style={{
          flex: 1,
          padding: '1.25rem 1.75rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          alignItems: 'stretch',
        }}
      >
        {/* ============================================================ */}
        {/* COLUMN 1: CONSULTATION QUEUE (ডাক্তার কনসাল্টেশন কিউ)         */}
        {/* ============================================================ */}
        <section
          style={{
            backgroundColor: colors.cardBg,
            border: `2px solid ${colors.cardBorder}`,
            borderRadius: '1.25rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: `0 10px 30px ${colors.accentGlow}`,
          }}
        >
          {/* Column Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `2px solid ${colors.headerBorder}`,
              paddingBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🩺</span>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: colors.textPrimary }}>
                  {lang === 'bn' ? 'ডাক্তার কনসাল্টেশন কিউ' : 'Doctor Consultation Queue'}
                </h2>
                <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                  {lang === 'bn' ? 'চিফ কনসালট্যান্ট চেম্বার' : 'Chief Consultant Chamber'}
                </span>
              </div>
            </div>

            <span
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: colors.consultBadge,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '0.3rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              {lang === 'bn'
                ? `অপেক্ষারত: ${toBnNum(snapshot.consultationQueue.waiting.length)} জন`
                : `Waiting: ${snapshot.consultationQueue.waiting.length}`}
            </span>
          </div>

          {/* NOW SERVING CARD (বর্তমানে ডাক্তার চেম্বারে) */}
          <div
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #063824 0%, #082a1c 100%)'
                : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              border: `3px solid ${colors.accentEmerald}`,
              borderRadius: '1rem',
              padding: '1.25rem',
              textAlign: 'center',
              position: 'relative',
              boxShadow: `0 0 25px ${colors.accentGlow}`,
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: colors.accentEmerald,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                display: 'inline-block',
                backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
                padding: '0.25rem 0.85rem',
                borderRadius: '9999px',
                marginBottom: '0.5rem',
              }}
            >
              📢 {lang === 'bn' ? 'বর্তমান সিরিয়াল · ডাক পড়েছে' : 'NOW SERVING IN CHAMBER'}
            </div>

            {snapshot.consultationQueue.nowServing.length > 0 ? (
              <div>
                {/* Big Token Number */}
                <div
                  style={{
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    color: colors.accentEmerald,
                    fontFamily: 'monospace',
                    lineHeight: 1,
                    margin: '0.35rem 0',
                    textShadow: isDark ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
                  }}
                >
                  {toBnNum(
                    snapshot.consultationQueue.nowServing[0].tokenNumber ||
                      snapshot.consultationQueue.nowServing[0].serialNumber,
                  )}
                </div>

                <div style={{ fontSize: '1.55rem', fontWeight: 800, color: colors.textPrimary }}>
                  {lang === 'bn'
                    ? snapshot.consultationQueue.nowServing[0].patientNameBn ||
                      snapshot.consultationQueue.nowServing[0].patientNameEn
                    : snapshot.consultationQueue.nowServing[0].patientNameEn}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginTop: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: colors.accentEmerald,
                      color: '#ffffff',
                      padding: '0.35rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  >
                    {lang === 'bn' ? 'চেম্বার ১ (ডাঃ তৌফিক)' : 'Chamber 1 (Dr. Toufiq)'}
                  </span>

                  <span
                    style={{
                      backgroundColor: colors.cardSubtle,
                      color: colors.textMuted,
                      border: `1px solid ${colors.cardBorder}`,
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    {lang === 'bn'
                      ? `সিরিয়াল নম্বর #${toBnNum(snapshot.consultationQueue.nowServing[0].serialNumber)}`
                      : `Serial #${snapshot.consultationQueue.nowServing[0].serialNumber}`}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1.5rem 0' }}>
                <div style={{ fontSize: '1.8rem', color: colors.textMuted }}>🏥</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: colors.textSecondary, marginTop: '0.5rem' }}>
                  {lang === 'bn' ? 'চেম্বার প্রস্তুত · রোগী ডাকা হচ্ছে' : 'Chamber Ready · Next Patient Being Called'}
                </div>
                <div style={{ fontSize: '0.85rem', color: colors.textMuted, marginTop: '0.25rem' }}>
                  {lang === 'bn' ? 'অনুগ্রহ করে ওয়েটিং লাউঞ্জে অপেক্ষা করুন' : 'Please wait comfortably in the waiting lounge'}
                </div>
              </div>
            )}
          </div>

          {/* UPCOMING QUEUE LIST */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: colors.textMuted,
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{lang === 'bn' ? 'পরবর্তী অপেক্ষারত সিরিয়াল তালিকা' : 'Upcoming Consultation Queue'}</span>
              <span>{lang === 'bn' ? 'টোকেন / নাম' : 'Token / Patient'}</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                overflowY: 'auto',
                maxHeight: '360px',
              }}
            >
              {snapshot.consultationQueue.waiting.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: colors.textMuted,
                    backgroundColor: colors.cardSubtle,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                  }}
                >
                  {lang === 'bn'
                    ? 'ডাক্তার কনসাল্টেশনের জন্য কোনো সিরিয়াল অপেক্ষারত নেই'
                    : 'No patients currently waiting for doctor consultation'}
                </div>
              ) : (
                snapshot.consultationQueue.waiting.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: colors.cardSubtle,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: '10px',
                      padding: '0.65rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          backgroundColor: colors.cardBg,
                          border: `1px solid ${colors.cardBorder}`,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          color: colors.textMuted,
                        }}
                      >
                        #{toBnNum(idx + 1)}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: colors.textPrimary }}>
                          {lang === 'bn' ? item.patientNameBn || item.patientNameEn : item.patientNameEn}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                          {lang === 'bn'
                            ? `সিরিয়াল #${toBnNum(item.serialNumber)} · ${item.priority === 'emergency' ? '🚨 জরুরি' : 'সাধারণ'}`
                            : `Serial #${item.serialNumber} · ${item.priority === 'emergency' ? '🚨 Emergency' : 'Normal'}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '1.45rem',
                          fontWeight: 900,
                          color: colors.accentEmerald,
                          fontFamily: 'monospace',
                        }}
                      >
                        {toBnNum(item.tokenNumber || item.serialNumber)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* COLUMN 2: THERAPY QUEUE (ফিজিওথেরাপি কিউ)                     */}
        {/* ============================================================ */}
        <section
          style={{
            backgroundColor: colors.cardBg,
            border: `2px solid ${colors.cardBorder}`,
            borderRadius: '1.25rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: `0 10px 30px ${colors.accentGlow}`,
          }}
        >
          {/* Column Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: `2px solid ${colors.headerBorder}`,
              paddingBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: colors.textPrimary }}>
                  {lang === 'bn' ? 'ফিজিওথেরাপি ও পুনর্বাসন কিউ' : 'Physiotherapy & Rehab Queue'}
                </h2>
                <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                  {lang === 'bn' ? 'মডালিটি ও বেড এরিয়া' : 'Modality & Bed Matrix Area'}
                </span>
              </div>
            </div>

            <span
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                color: colors.therapyBadge,
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '0.3rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              {lang === 'bn'
                ? `চলমান: ${toBnNum(snapshot.therapyQueue.nowServing.length)} | অপেক্ষারত: ${toBnNum(snapshot.therapyQueue.waiting.length)}`
                : `Active: ${snapshot.therapyQueue.nowServing.length} | Waiting: ${snapshot.therapyQueue.waiting.length}`}
            </span>
          </div>

          {/* ACTIVE THERAPY SESSIONS DISPLAY */}
          <div
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #1c0e2d 0%, #150924 100%)'
                : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
              border: `3px solid ${colors.therapyBadge}`,
              borderRadius: '1rem',
              padding: '1.25rem',
              textAlign: 'center',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.2)',
            }}
          >
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: colors.therapyBadge,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                display: 'inline-block',
                backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
                padding: '0.25rem 0.85rem',
                borderRadius: '9999px',
                marginBottom: '0.5rem',
              }}
            >
              ⚡ {lang === 'bn' ? 'চলমান থেরাপি সেশন · সক্রিয় বেড' : 'ACTIVE THERAPY IN PROGRESS'}
            </div>

            {snapshot.therapyQueue.nowServing.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                {snapshot.therapyQueue.nowServing.slice(0, 4).map((th, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: isDark ? '#0d131f' : '#ffffff',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          backgroundColor: colors.therapyBadge,
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {th.bedName || (lang === 'bn' ? `বেড ${toBnNum(idx + 1)}` : `Bed ${idx + 1}`)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 700 }}>
                        {toBnNum(th.durationMinutes || 20)} {lang === 'bn' ? 'মিনিট' : 'min'}
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: '0.4rem', color: colors.textPrimary }}>
                      {lang === 'bn' ? th.patientNameBn || th.patientNameEn : th.patientNameEn}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: '0.2rem' }}>
                      {lang === 'bn' ? th.modalityNameBn || th.modalityCode || 'ফিজিওথেরাপি' : th.modalityNameEn || th.modalityCode || 'Physiotherapy'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem 0' }}>
                <div style={{ fontSize: '1.8rem', color: colors.textMuted }}>🛏️</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: colors.textSecondary, marginTop: '0.5rem' }}>
                  {lang === 'bn' ? 'থেরাপি বেড প্রস্তুত · রোগী আহবান করা হচ্ছে' : 'Therapy Beds Ready · Calling Next Patient'}
                </div>
                <div style={{ fontSize: '0.85rem', color: colors.textMuted, marginTop: '0.25rem' }}>
                  {lang === 'bn' ? 'নির্ধারিত মডালিটি অনুযায়ী প্রস্তুতি চলছে' : 'Modality prep underway for scheduled sessions'}
                </div>
              </div>
            )}
          </div>

          {/* UPCOMING THERAPY QUEUE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
            <div
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: colors.textMuted,
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{lang === 'bn' ? 'অপেক্ষারত থেরাপি রোগী তালিকা' : 'Waiting for Therapy Hall Entry'}</span>
              <span>{lang === 'bn' ? 'টোকেন / অবস্থান' : 'Token / Hall'}</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                overflowY: 'auto',
                maxHeight: '360px',
              }}
            >
              {snapshot.therapyQueue.waiting.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: colors.textMuted,
                    backgroundColor: colors.cardSubtle,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                  }}
                >
                  {lang === 'bn'
                    ? 'ফিজিওথেরাপির জন্য এই মুহূর্তে কোনো রোগী অপেক্ষারত নেই'
                    : 'No patients currently waiting for therapy'}
                </div>
              ) : (
                snapshot.therapyQueue.waiting.slice(0, 6).map((th, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: colors.cardSubtle,
                      border: `1px solid ${colors.cardBorder}`,
                      borderRadius: '10px',
                      padding: '0.65rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          backgroundColor: colors.cardBg,
                          border: `1px solid ${colors.cardBorder}`,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          color: colors.textMuted,
                        }}
                      >
                        #{toBnNum(idx + 1)}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: colors.textPrimary }}>
                          {lang === 'bn' ? th.patientNameBn || th.patientNameEn : th.patientNameEn}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                          {lang === 'bn' ? 'থেরাপি হল ওয়েটিং লাউঞ্জ' : 'Therapy Hall Waiting Area'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '1.45rem',
                          fontWeight: 900,
                          color: colors.therapyBadge,
                          fontFamily: 'monospace',
                        }}
                      >
                        {toBnNum(th.tokenNumber)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================== */}
      {/* BOTTOM BULLETIN NOTICE TICKER / MARQUEE                       */}
      {/* ============================================================== */}
      <footer
        style={{
          backgroundColor: colors.marqueeBg,
          color: colors.marqueeText,
          padding: '0.65rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderTop: `2px solid ${colors.headerBorder}`,
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <div
          style={{
            backgroundColor: colors.accentEmerald,
            color: '#ffffff',
            padding: '0.3rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          <span>📢</span>
          <span>{lang === 'bn' ? 'জরুরি নোটিশ' : 'BULLETIN NOTICE'}</span>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              animation: 'marquee 40s linear infinite',
              fontSize: '1.05rem',
              fontWeight: 600,
            }}
          >
            {snapshot.bulletinNotices.join('　•　')}
          </div>
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            color: colors.textMuted,
            flexShrink: 0,
            fontWeight: 600,
          }}
        >
          {lang === 'bn' ? 'সিঙ্ক: ' : 'Sync: '} {lastSyncTime || 'Active'}
        </div>
      </footer>

      {/* Inlined CSS keyframes for marquee and pulse */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.15);
          }
        }
      `}</style>
    </div>
  );
}
