// apps/web/components/Header.tsx
'use client';

import React from 'react';
import { DEMO_ACCOUNTS, quickLogin, setSession, UserSession } from '../lib/api';
import ThemeToggle from '../app/theme-toggle';

interface HeaderProps {
  session: UserSession | null;
  onSessionChange: (session: UserSession | null) => void;
  isConnected: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Header({
  session,
  onSessionChange,
  isConnected,
  activeTab,
  onTabChange,
}: HeaderProps) {
  const [switching, setSwitching] = React.useState(false);

  const handleQuickSwitch = async (role: keyof typeof DEMO_ACCOUNTS) => {
    try {
      setSwitching(true);
      const newSession = await quickLogin(role);
      onSessionChange(newSession);
      // Auto switch relevant tab
      if (role === 'reception') onTabChange('reception');
      else if (role === 'head_doctor' || role === 'doctor') onTabChange('doctor');
      else if (role === 'therapist') onTabChange('therapy');
      else if (role === 'cashier') onTabChange('cashier');
      else if (role === 'admin') onTabChange('admin');
    } catch (e: any) {
      alert(`Login failed: ${e.message}`);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="hpc-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <div className="brand-title">
            <span style={{ fontSize: '1.4rem' }}>🌿</span>
            <span>HPC Jashore</span>
          </div>
          <div className="brand-subtitle">
            Health &amp; Pain Care Center · ডাঃ মোঃ তৌফিক উজ জামান
          </div>
        </div>

        {/* Realtime Live Status Dot */}
        <span
          className="badge"
          style={{
            background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: isConnected ? 'var(--hpc-emerald-600)' : 'var(--hpc-danger)',
            gap: '0.4rem',
            padding: '0.35rem 0.65rem',
          }}
          title={isConnected ? 'SSE Live Stream Active' : 'Disconnected, reconnecting...'}
        >
          <span className={`dot ${!isConnected ? 'dot-red' : ''}`} />
          {isConnected ? 'Realtime Live' : 'Reconnecting'}
        </span>
      </div>

      {/* Navigation Workstation Tabs */}
      <nav className="nav-tabs" aria-label="Workstations">
        <button
          className={`nav-tab ${activeTab === 'reception' ? 'active' : ''}`}
          onClick={() => onTabChange('reception')}
        >
          📋 Reception
        </button>
        <button
          className={`nav-tab ${activeTab === 'doctor' ? 'active' : ''}`}
          onClick={() => onTabChange('doctor')}
        >
          🩺 Doctor Chamber
        </button>
        <button
          className={`nav-tab ${activeTab === 'therapy' ? 'active' : ''}`}
          onClick={() => onTabChange('therapy')}
        >
          ⚡ Therapy Hall
        </button>
        <button
          className={`nav-tab ${activeTab === 'cashier' ? 'active' : ''}`}
          onClick={() => onTabChange('cashier')}
        >
          💳 Billing &amp; Cashier
        </button>
        <button
          className={`nav-tab ${activeTab === 'pharmacy' ? 'active' : ''}`}
          onClick={() => onTabChange('pharmacy')}
        >
          💊 Pharmacy FIFO
        </button>
        <button
          className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => onTabChange('admin')}
        >
          📊 Executive Admin
        </button>
        <button
          className={`nav-tab ${activeTab === 'tv' ? 'active' : ''}`}
          onClick={() => onTabChange('tv')}
          style={{ color: 'var(--hpc-accent)' }}
        >
          📺 Waiting TV
        </button>
      </nav>

      {/* Controls & Quick Role Switcher */}
      <div className="header-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--hpc-muted)' }}>Role:</label>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.825rem' }}
            value={session?.role || 'head_doctor'}
            onChange={(e) => handleQuickSwitch(e.target.value as any)}
            disabled={switching}
          >
            <option value="head_doctor">Dr. Toufiq (Head Doctor)</option>
            <option value="doctor">Dr. Demo (Physio Doctor)</option>
            <option value="reception">Reception Desk</option>
            <option value="therapist">Therapy Staff</option>
            <option value="cashier">Cashier Desk</option>
            <option value="admin">Clinic Administrator</option>
          </select>
        </div>

        <ThemeToggle />
      </div>
    </header>
  );
}
