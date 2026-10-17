// apps/web/app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import ReceptionView from '../components/ReceptionView';
import DoctorChamberView from '../components/DoctorChamberView';
import TherapyHallView from '../components/TherapyHallView';
import CashierView from '../components/CashierView';
import PharmacyView from '../components/PharmacyView';
import AdminDashboardView from '../components/AdminDashboardView';
import WaitingRoomTvView from '../components/WaitingRoomTvView';
import { getSession, quickLogin, UserSession } from '../lib/api';
import { useRealtime } from '../lib/use-realtime';
import { BrandLogo } from '../components/brand/logo';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>('reception');
  const [isInitializing, setIsInitializing] = useState(true);

  // Real-time SSE connection
  const { isConnected, lastEvent } = useRealtime((evt) => {
    // eslint-disable-next-line no-console
    console.log('Realtime event received on frontend:', evt);
  });

  useEffect(() => {
    // Restore existing session or default to Reception / Doctor demo login
    const saved = getSession();
    if (saved) {
      setSession(saved);
      if (saved.role === 'reception') setActiveTab('reception');
      else if (saved.role === 'therapist') setActiveTab('therapy');
      else if (saved.role === 'cashier') setActiveTab('cashier');
      else if (saved.role === 'admin') setActiveTab('admin');
      else setActiveTab('doctor');
      setIsInitializing(false);
    } else {
      quickLogin('reception')
        .then((s) => {
          setSession(s);
          setActiveTab('reception');
        })
        .catch((err) => {
          console.warn('Initial quickLogin skipped:', err);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    }
  }, []);

  if (isInitializing) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full blur-3xl bg-emerald-500/15 animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full blur-3xl bg-teal-500/15" />
        </div>

        <div className="glass-panel p-8 sm:p-12 rounded-3xl max-w-md w-full flex flex-col items-center text-center shadow-xl border border-border/80">
          <BrandLogo size="lg" variant="full" className="mb-6" />
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-2">
            <Loader2 className="size-5 animate-spin" />
            <span>Connecting Workstations...</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Synchronizing live clinical queues, prescriptions &amp; telemetry
          </p>
        </div>
      </main>
    );
  }

  // Full-screen TV mode when 'tv' tab is chosen
  if (activeTab === 'tv') {
    return (
      <div className="min-h-screen flex flex-col bg-[#021a12]">
        <div className="px-6 py-2.5 bg-[#021a12]/95 border-b border-emerald-900/60 flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="full" />
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              📺 Waiting Room Leanback TV
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/80 transition-colors cursor-pointer"
            onClick={() => setActiveTab('reception')}
          >
            <ArrowLeft className="size-3.5" />
            <span>Exit TV Mode</span>
          </button>
        </div>
        <div className="flex-1">
          <WaitingRoomTvView />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-emerald-500/20">
      {/* Background Animated Glow Meshes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl bg-emerald-500/10 dark:bg-emerald-500/15" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full blur-3xl bg-teal-500/10 dark:bg-teal-500/15" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full blur-3xl bg-emerald-600/10 dark:bg-emerald-600/15" />
      </div>

      <Header
        session={session}
        onSessionChange={setSession}
        isConnected={isConnected}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-5 md:p-6 transition-all duration-300">
        {activeTab === 'reception' && <ReceptionView />}
        {activeTab === 'doctor' && <DoctorChamberView session={session} />}
        {activeTab === 'therapy' && <TherapyHallView session={session} />}
        {activeTab === 'cashier' && <CashierView session={session} />}
        {activeTab === 'pharmacy' && <PharmacyView />}
        {activeTab === 'admin' && <AdminDashboardView />}
      </main>
    </div>
  );
}
