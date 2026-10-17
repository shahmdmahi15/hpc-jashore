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

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>('doctor');
  const [isInitializing, setIsInitializing] = useState(true);

  // Real-time SSE connection
  const { isConnected, lastEvent } = useRealtime((evt) => {
    // eslint-disable-next-line no-console
    console.log('Realtime event received on frontend:', evt);
  });

  useEffect(() => {
    // Restore existing session or default to Head Doctor demo login
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
      quickLogin('head_doctor')
        .then((s) => {
          setSession(s);
          setActiveTab('doctor');
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
      <main className="page">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="dot" style={{ margin: '0 auto 1rem', width: '1rem', height: '1rem' }} />
          <h2>Connecting to HPC Jashore System...</h2>
          <p style={{ color: 'var(--hpc-muted)' }}>Initializing real-time physiotherapy workstations</p>
        </div>
      </main>
    );
  }

  // Full-screen TV mode when 'tv' tab is chosen
  if (activeTab === 'tv') {
    return (
      <div>
        <div style={{ background: '#021a12', padding: '0.4rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#a7f3d0', fontSize: '0.85rem' }}>📺 Waiting Room TV Fullscreen Mode</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('doctor')}>
            ✕ Exit TV Mode
          </button>
        </div>
        <WaitingRoomTvView />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        session={session}
        onSessionChange={setSession}
        isConnected={isConnected}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="main-content">
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
