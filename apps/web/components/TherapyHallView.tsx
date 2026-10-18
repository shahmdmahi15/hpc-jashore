// apps/web/components/TherapyHallView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api, UserSession } from '../lib/api';

interface TherapyHallProps {
  session: UserSession | null;
}

export default function TherapyHallView({ session }: TherapyHallProps) {
  const [beds, setBeds] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  // Start Session Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedModalityCode, setSelectedModalityCode] = useState('IFT');
  const [durationMinutes, setDurationMinutes] = useState(15);

  // Complete Session Modal
  const [completingSession, setCompletingSession] = useState<any>(null);
  const [therapistPin, setTherapistPin] = useState('3579');
  const [painScoreAfter, setPainScoreAfter] = useState(3);
  const [outcomeNote, setOutcomeNote] = useState('Good tolerance, muscle spasm relieved.');

  const loadData = async () => {
    try {
      const [b, m, s, p, pat] = await Promise.all([
        api.therapy.getBeds(),
        api.therapy.getMachines(),
        api.therapy.getActiveSessions(),
        api.therapy.getPackages(),
        api.patients.list(),
      ]);
      setBeds(b || []);
      setMachines(m || []);
      setActiveSessions(s || []);
      setPackages(p || []);
      setPatients(pat || []);

      if (b && b.length > 0 && !selectedBedId) setSelectedBedId(b[0].id);
      if (m && m.length > 0 && !selectedMachineId) setSelectedMachineId(m[0].id);
      if (pat && pat.length > 0 && !selectedPatientId) setSelectedPatientId(pat[0].id);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.therapy.startSession({
        patientId: selectedPatientId,
        bedId: selectedBedId,
        machineId: selectedMachineId || undefined,
        modalityCode: selectedModalityCode,
        durationMinutes,
      });
      alert('Therapy Session Started!');
      setShowStartModal(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to start session: ${err.message}`);
    }
  };

  const handleCompleteSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSession) return;
    try {
      await api.therapy.completeSession(completingSession.id, {
        pin: therapistPin,
        painScoreAfter,
        outcomeNote,
      });
      alert('Therapy Session Completed & Recorded!');
      setCompletingSession(null);
      loadData();
    } catch (err: any) {
      alert(`Completion failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">⚡ Therapy Hall &amp; Electrotherapy Matrix</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Hall A · Live Bed Allocation &amp; Session Timers</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button className="btn flex-1 sm:flex-initial" onClick={() => setShowStartModal(true)}>
            + Start Session
          </button>
          <button className="btn btn-secondary flex-1 sm:flex-initial" onClick={loadData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Bed Matrix Grid */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">🛏️ Hall A Bed Status ({beds.length} Beds)</h3>
        </div>
        <div className="grid-4">
          {beds.map((b) => {
            const activeSess = activeSessions.find((s) => s.bedId === b.id);
            const isOccupied = !!activeSess;

            return (
              <div
                key={b.id}
                style={{
                  border: `2px solid ${isOccupied ? 'var(--hpc-warning)' : 'var(--hpc-emerald-500)'}`,
                  background: isOccupied ? 'rgba(245, 158, 11, 0.08)' : 'var(--hpc-surface-elevated)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{b.name}</strong>
                  <span className={`badge ${isOccupied ? 'badge-amber' : 'badge-emerald'}`}>
                    {isOccupied ? 'In Session' : 'Available'}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--hpc-muted)' }}>
                  Code: {b.code}
                </div>

                {isOccupied ? (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.825rem' }}>
                    <div>Patient: <strong>{activeSess.patient?.nameEn || 'Patient'}</strong></div>
                    <div>Modality: <span className="badge badge-blue">{activeSess.modalityCode}</span></div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ width: '100%' }}
                        onClick={() => setCompletingSession(activeSess)}
                      >
                        ✓ Complete with PIN
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ marginTop: 'auto' }}
                    onClick={() => {
                      setSelectedBedId(b.id);
                      setShowStartModal(true);
                    }}
                  >
                    Assign Bed
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Sessions Live Countdown */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">⏱️ Active Therapy Sessions ({activeSessions.length})</h3>
        </div>

        {activeSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--hpc-muted)' }}>
            No therapy sessions actively running right now.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>MRN</th>
                  <th>Bed</th>
                  <th>Machine</th>
                  <th>Modality</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.patient?.nameEn || 'Patient'}</strong></td>
                    <td>{s.patient?.mrn || 'N/A'}</td>
                    <td>{s.bed?.name || s.bedId}</td>
                    <td>{s.machine?.name || 'N/A'}</td>
                    <td><span className="badge badge-emerald">{s.modalityCode}</span></td>
                    <td>{s.durationMinutes} mins</td>
                    <td>
                      <span className="badge badge-amber">
                        <span className="dot dot-amber" style={{ marginRight: '4px' }} />
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => setCompletingSession(s)}
                      >
                        PIN Complete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Therapy Packages Catalog */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">📦 Curated Rehab Packages</h3>
        </div>
        <div className="grid-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                border: '1px solid var(--hpc-border)',
                background: 'var(--hpc-surface-elevated)',
                padding: '1.25rem',
                borderRadius: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.25rem', color: 'var(--hpc-accent)' }}>
                  {pkg.nameEn}
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--hpc-muted)', marginBottom: '0.75rem' }}>
                  {pkg.nameBn}
                </div>
                <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>🩺 <strong>{pkg.totalConsultations}</strong> Doctor Consultations</div>
                  <div>⚡ <strong>{pkg.totalTherapySessions}</strong> Physical Therapy Sessions</div>
                  <div>📅 Validity: <strong>{pkg.validityDays}</strong> Days</div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.2rem', color: 'var(--hpc-emerald-600)' }}>
                  ৳{(pkg.pricePaisa / 100).toFixed(0)} BDT
                </strong>
                <button
                  className="btn btn-sm"
                  onClick={async () => {
                    if (!selectedPatientId) {
                      alert('Select a patient in reception first');
                      return;
                    }
                    try {
                      await api.therapy.purchasePackage({
                        patientId: selectedPatientId,
                        packageId: pkg.id,
                        billId: undefined,
                      });
                      alert(`Package ${pkg.nameEn} assigned to patient!`);
                    } catch (err: any) {
                      alert(`Purchase error: ${err.message}`);
                    }
                  }}
                >
                  Assign to Patient
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Session Modal */}
      {showStartModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Start Physical Therapy Session</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStartModal(false)}>✕</button>
            </div>
            <form onSubmit={handleStartSession}>
              <div className="form-group">
                <label className="form-label">Select Patient *</label>
                <select
                  className="form-control"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mrn} · {p.nameEn} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Assign Bed *</label>
                  <select
                    className="form-control"
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    required
                  >
                    {beds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Therapy Machine</label>
                  <select
                    className="form-control"
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                  >
                    <option value="">None / Manual Exercise</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Modality Code</label>
                  <select
                    className="form-control"
                    value={selectedModalityCode}
                    onChange={(e) => setSelectedModalityCode(e.target.value)}
                  >
                    <option value="IFT">IFT (Interferential Therapy)</option>
                    <option value="UST">UST (Ultrasound Therapy)</option>
                    <option value="SWD">SWD (Shortwave Diathermy)</option>
                    <option value="EXE">EXE (Therapeutic Exercise)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (Minutes)</label>
                  <select
                    className="form-control"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  >
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>
                  Start Session &amp; Run Timer
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowStartModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Session with PIN Modal */}
      {completingSession && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Complete Session with Therapist PIN</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setCompletingSession(null)}>✕</button>
            </div>
            <form onSubmit={handleCompleteSession}>
              <div style={{ background: 'var(--hpc-bg)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <div>Patient: <strong>{completingSession.patient?.nameEn || 'Patient'}</strong></div>
                <div>Modality: <strong>{completingSession.modalityCode}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Therapist 4-Digit Security PIN *</label>
                <input
                  type="password"
                  className="form-control"
                  maxLength={4}
                  required
                  placeholder="Enter your PIN (Demo: 3579)"
                  value={therapistPin}
                  onChange={(e) => setTherapistPin(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pain Score After Session (0-10): {painScoreAfter}/10</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScoreAfter}
                  onChange={(e) => setPainScoreAfter(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--hpc-accent)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Therapist Notes / Patient Tolerance</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>
                  Verify PIN &amp; Complete Session
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setCompletingSession(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
