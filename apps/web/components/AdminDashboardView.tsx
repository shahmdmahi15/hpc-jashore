// apps/web/components/AdminDashboardView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminDashboardView() {
  const [summary, setSummary] = useState<any>(null);
  const [modalities, setModalities] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Attendance Punch State
  const [punchStaffId, setPunchStaffId] = useState('');
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [punchPin, setPunchPin] = useState('2468');

  const loadData = async () => {
    try {
      setLoading(true);
      const [sum, mod, doc, staff] = await Promise.all([
        api.reports.getTodaySummary(),
        api.reports.getModalityStats(),
        api.reports.getDoctorStats(),
        api.staff.list(),
      ]);
      setSummary(sum);
      setModalities(mod || []);
      setDoctors(doc || []);
      setStaffList(staff || []);

      if (staff && staff.length > 0 && !punchStaffId) {
        setPunchStaffId(staff[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePunchAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchStaffId) return;
    try {
      await api.staff.punch({
        staffId: punchStaffId,
        punchType,
        deskId: 'reception-1',
        pin: punchPin,
      });
      alert(`Staff punch ${punchType.toUpperCase()} recorded successfully!`);
    } catch (err: any) {
      alert(`Attendance punch error: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📊 Executive Center Analytics &amp; P&amp;L</h2>
          <small style={{ color: 'var(--hpc-muted)' }}>Daily Clinical &amp; Financial KPIs · Dr. Toufiq Management</small>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          🔄 Refresh Metrics
        </button>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid-4">
        <div className="panel" style={{ background: 'var(--hpc-surface-elevated)' }}>
          <div style={{ color: 'var(--hpc-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TODAY&apos;S FOOTFALL</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--hpc-accent)', margin: '0.35rem 0' }}>
            {summary?.footfall || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--hpc-muted)' }}>Registered check-ins</div>
        </div>

        <div className="panel" style={{ background: 'var(--hpc-surface-elevated)' }}>
          <div style={{ color: 'var(--hpc-muted)', fontSize: '0.8rem', fontWeight: 600 }}>GROSS COLLECTIONS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--hpc-emerald-600)', margin: '0.35rem 0' }}>
            ৳{((summary?.grossCollectionsPaisa || 0) / 100).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--hpc-muted)' }}>Cash &amp; Digital receipts</div>
        </div>

        <div className="panel" style={{ background: 'var(--hpc-surface-elevated)' }}>
          <div style={{ color: 'var(--hpc-muted)', fontSize: '0.8rem', fontWeight: 600 }}>BED OCCUPANCY RATE</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--hpc-warning)', margin: '0.35rem 0' }}>
            {summary?.bedOccupancyPercent || 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--hpc-muted)' }}>Hall A active therapy beds</div>
        </div>

        <div className="panel" style={{ background: 'var(--hpc-surface-elevated)' }}>
          <div style={{ color: 'var(--hpc-muted)', fontSize: '0.8rem', fontWeight: 600 }}>PENDING PATIENT DUES</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--hpc-danger)', margin: '0.35rem 0' }}>
            ৳{((summary?.totalDuesPaisa || 0) / 100).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--hpc-muted)' }}>Awaiting settlement</div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid-2">
        {/* Modality Utilization */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">⚡ Modality Utilization Breakdown</h3>
          </div>
          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Modality</th>
                  <th>Sessions Delivered</th>
                  <th>Revenue (৳)</th>
                </tr>
              </thead>
              <tbody>
                {modalities.map((m) => (
                  <tr key={m.code}>
                    <td><strong>{m.nameEn}</strong> ({m.code})</td>
                    <td>{m.sessionCount} sessions</td>
                    <td><strong>৳{((m.revenuePaisa || 0) / 100).toFixed(0)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Doctor Consultations Summary */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">🩺 Doctor Chamber Consultations</h3>
          </div>
          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Patients Seen</th>
                  <th>Prescriptions Issued</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.patientsSeen}</td>
                    <td>{d.prescriptionsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Attendance Punch Terminal */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">🕒 Staff Time &amp; Attendance Kiosk</h3>
        </div>
        <form onSubmit={handlePunchAttendance} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
            <label className="form-label">Staff Member</label>
            <select
              className="form-control"
              value={punchStaffId}
              onChange={(e) => setPunchStaffId(e.target.value)}
              required
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ width: '130px', margin: 0 }}>
            <label className="form-label">Punch Type</label>
            <select
              className="form-control"
              value={punchType}
              onChange={(e) => setPunchType(e.target.value as any)}
            >
              <option value="in">Punch IN</option>
              <option value="out">Punch OUT</option>
            </select>
          </div>

          <div className="form-group" style={{ width: '130px', margin: 0 }}>
            <label className="form-label">Staff PIN</label>
            <input
              type="password"
              className="form-control"
              placeholder="PIN"
              value={punchPin}
              onChange={(e) => setPunchPin(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn">
            Submit Punch
          </button>
        </form>
      </div>
    </div>
  );
}
