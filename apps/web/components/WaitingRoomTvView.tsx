// apps/web/components/WaitingRoomTvView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function WaitingRoomTvView() {
  const [snapshot, setSnapshot] = useState<any>({
    nowServing: null,
    waitingQueue: [],
    announcements: [],
  });
  const [currentTime, setCurrentTime] = useState('');

  const loadSnapshot = async () => {
    try {
      const data = await api.visits.getTvSnapshot();
      setSnapshot(data || { nowServing: null, waitingQueue: [], announcements: [] });
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSnapshot();
    const interval = setInterval(loadSnapshot, 5000);
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  const announceToken = () => {
    if (!snapshot.nowServing) return;
    const text = `টোকেন নম্বর ${snapshot.nowServing.tokenNumber}, ${snapshot.nowServing.doctorName}, কনসালটেশন রুমে আসুন।`;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      style={{
        background: '#03140e',
        color: '#f0fdf4',
        minHeight: '100vh',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
      }}
    >
      {/* TV Header */}
      <div
        style={{
          borderBottom: '2px solid #059669',
          paddingBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#10b981', fontWeight: 900 }}>
            এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
          </h1>
          <div style={{ fontSize: '1.1rem', color: '#a7f3d0' }}>
            HPC Health &amp; Pain Care Center · Head: Dr. Toufiq (Md. Toufiq Uz Zaman)
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
            {currentTime || '12:00:00'}
          </div>
          <div style={{ fontSize: '0.95rem', color: '#6ee7b7' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Main Screen Grid: Now Serving vs Upcoming */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '2rem',
          margin: '2rem 0',
          flex: 1,
        }}
      >
        {/* Left Column: Big Now Serving Box */}
        <div
          style={{
            background: 'linear-gradient(135deg, #052e22 0%, #064e3b 100%)',
            border: '3px solid #10b981',
            borderRadius: '1.5rem',
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 0 50px rgba(16, 185, 129, 0.25)',
          }}
        >
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '2px',
              color: '#a7f3d0',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            📢 NOW SERVING · বর্তমান টোকেন
          </div>

          <div
            style={{
              fontSize: '6.5rem',
              fontWeight: 900,
              color: '#34d399',
              fontFamily: 'monospace',
              lineHeight: 1,
              margin: '0.5rem 0',
              textShadow: '0 0 30px rgba(52, 211, 153, 0.5)',
            }}
          >
            {snapshot.nowServing?.tokenNumber || 'A-001'}
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '1rem' }}>
            {snapshot.nowServing?.patientName || 'Md. Abdul Karim'}
          </div>

          <div
            style={{
              background: '#047857',
              color: '#ffffff',
              padding: '0.6rem 1.8rem',
              borderRadius: '9999px',
              fontSize: '1.3rem',
              fontWeight: 700,
              marginTop: '1.5rem',
            }}
          >
            {snapshot.nowServing?.chamber || 'Chamber 1 (কনসালটেশন রুম ১)'}
          </div>

          <div style={{ fontSize: '1.15rem', color: '#d1fae5', marginTop: '0.75rem' }}>
            Doctor: <strong>{snapshot.nowServing?.doctorName || 'Dr. Toufiq (Md. Toufiq Uz Zaman)'}</strong>
          </div>

          <button
            onClick={announceToken}
            style={{
              marginTop: '1.5rem',
              background: 'transparent',
              border: '1px solid #10b981',
              color: '#a7f3d0',
              padding: '0.4rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            🔊 Voice Announcement (বাংলা)
          </button>
        </div>

        {/* Right Column: Upcoming Tokens List */}
        <div
          style={{
            background: '#05231a',
            border: '1px solid #134e3d',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2
            style={{
              margin: '0 0 1rem',
              fontSize: '1.35rem',
              color: '#a7f3d0',
              borderBottom: '1px solid #134e3d',
              paddingBottom: '0.75rem',
            }}
          >
            ⏳ NEXT IN QUEUE · পরবর্তী সিরিয়াল
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {snapshot.waitingQueue?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6ee7b7' }}>
                All waiting patients have been served.
              </div>
            ) : (
              snapshot.waitingQueue?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: '#06382a',
                    border: '1px solid #0f5c46',
                    borderRadius: '0.75rem',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '1.5rem', color: '#34d399', fontFamily: 'monospace' }}>
                      {item.tokenNumber}
                    </strong>
                    <div style={{ fontSize: '1rem', color: '#ecfdf5', fontWeight: 600 }}>
                      {item.patientName}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        background: '#047857',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '0.4rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      Wait #{idx + 1}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ticker / Announcement Bar */}
      <div
        style={{
          background: '#047857',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '0.75rem',
          fontSize: '1.1rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <span style={{ fontSize: '1.4rem' }}>📢</span>
        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর · ফিজিওথেরাপি ও পুনর্বাসন সেবায় সার্বক্ষণিক বিশ্বস্ত প্রতিষ্ঠান। হটলাইন: 01XXXXXXXXX
        </div>
      </div>
    </div>
  );
}
