// apps/web/components/ReceptionView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import ThermalSlipModal from './ThermalSlipModal';
import QrScannerModal from './QrScannerModal';

export default function ReceptionView() {
  const [patients, setPatients] = useState<any[]>([]);
  const [todayVisits, setTodayVisits] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Registration Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regData, setRegData] = useState({
    nameEn: '',
    nameBn: '',
    phone: '',
    ageYears: '',
    gender: 'male',
    bloodGroup: 'B+',
    address: 'Jashore',
    allergies: '',
  });

  // Check-In State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'package' | 'follow_up' | 'elderly'>('normal');

  // Thermal Slip Print State
  const [printedToken, setPrintedToken] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [v, p, s] = await Promise.all([
        api.visits.getToday(),
        api.patients.list(),
        api.staff.list(),
      ]);
      setTodayVisits(v || []);
      setPatients(p || []);
      setStaffList(s || []);
      const doctors = (s || []).filter((st: any) => st.role === 'head_doctor' || st.role === 'doctor');
      if (doctors.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(doctors[0].id);
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

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.nameEn || !regData.phone) {
      alert('Please fill Name and Phone');
      return;
    }
    try {
      const created = await api.patients.create({
        ...regData,
        ageYears: regData.ageYears ? parseInt(regData.ageYears) : undefined,
      });
      alert(`Patient Registered! MRN: ${created.mrn}`);
      setShowRegModal(false);
      setSelectedPatientId(created.id);
      loadData();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId) {
      alert('Please select both a Patient and a Doctor');
      return;
    }
    try {
      const res = await api.visits.checkIn({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        priority,
      });

      const pat = patients.find((p) => p.id === selectedPatientId);
      const doc = staffList.find((s) => s.id === selectedDoctorId);

      setPrintedToken({
        tokenNumber: res.tokenNumber || `A-${String(res.serialNumber).padStart(3, '0')}`,
        serialNumber: res.serialNumber,
        patientName: pat?.nameEn || 'Patient',
        patientNameBn: pat?.nameBn,
        mrn: pat?.mrn || 'N/A',
        doctorName: doc?.fullName || 'Physiotherapist',
        priority,
        issuedAt: new Date().toISOString(),
        clinicNameEn: 'HPC Health & Pain Care Center, Jashore',
        clinicNameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর',
      });

      loadData();
    } catch (err: any) {
      alert(`Check-in failed: ${err.message}`);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()),
  );

  const doctors = staffList.filter((s) => s.role === 'head_doctor' || s.role === 'doctor');

  return (
    <div className="grid-2">
      {/* Left Column: Check-in & Patient Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <span>📋</span> Check-in &amp; Token Issue
            </h2>
            <button className="btn btn-sm" onClick={() => setShowRegModal(true)}>
              + New Patient
            </button>
          </div>

          <form onSubmit={handleCheckIn}>
            <div className="form-group">
              <label className="form-label">Search / Select Patient:</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter by Name, Phone or MRN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={() => setShowScannerModal(true)}
                >
                  📷 Scan Card
                </button>
              </div>

              <select
                className="form-control"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
              >
                <option value="">-- Choose Patient ({filteredPatients.length} found) --</option>
                {filteredPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.nameEn} ({p.phone}) {p.bloodGroup ? `[${p.bloodGroup}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Assigning Doctor / Chamber:</label>
                <select
                  className="form-control"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  required
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.specialization || d.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Queue Priority:</label>
                <select
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="normal">Normal (সাধারণ)</option>
                  <option value="emergency">Emergency (জরুরি)</option>
                  <option value="package">Package Follow-up (প্যাকেজ)</option>
                  <option value="elderly">Elderly / Disabled (বয়োজ্যেষ্ঠ)</option>
                  <option value="follow_up">Follow Up (ফলোআপ)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-lg" style={{ width: '100%', marginTop: '0.5rem' }}>
              🎟️ Issue Serial &amp; Print 80mm Slip
            </button>
          </form>
        </div>

        {/* Quick Directory List */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">👥 Registered Patients ({patients.length})</h3>
          </div>
          <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>MRN</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Blood</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.slice(0, 15).map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.mrn}</strong></td>
                    <td>{p.nameEn}</td>
                    <td>{p.phone}</td>
                    <td><span className="badge badge-emerald">{p.bloodGroup || 'N/A'}</span></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedPatientId(p.id)}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Live Waiting Queue */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <span>⏱️</span> Today&apos;s Live Waiting Queue ({todayVisits.length})
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            🔄 Refresh
          </button>
        </div>

        {todayVisits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--hpc-muted)' }}>
            No visits registered yet today.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {todayVisits.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--hpc-accent)' }}>
                        #{v.tokenNumber}
                      </strong>
                    </td>
                    <td>
                      <div><strong>{v.patient?.nameEn}</strong></div>
                      <small style={{ color: 'var(--hpc-muted)' }}>{v.patient?.mrn}</small>
                    </td>
                    <td>{v.doctor?.fullName || 'Not assigned'}</td>
                    <td>
                      <span
                        className={`badge ${
                          v.status === 'in_consult'
                            ? 'badge-amber'
                            : v.status === 'in_therapy'
                            ? 'badge-blue'
                            : v.status === 'checked_out'
                            ? 'badge-emerald'
                            : 'badge-emerald'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td>{v.currentLocation || 'reception'}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          setPrintedToken({
                            tokenNumber: `A-${String(v.tokenNumber).padStart(3, '0')}`,
                            serialNumber: v.tokenNumber,
                            patientName: v.patient?.nameEn || 'Patient',
                            patientNameBn: v.patient?.nameBn,
                            mrn: v.patient?.mrn || 'N/A',
                            doctorName: v.doctor?.fullName || 'Doctor',
                            priority: v.priority || 'normal',
                            issuedAt: v.createdAt,
                            clinicNameEn: 'HPC Health & Pain Care Center',
                            clinicNameBn: 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার',
                          })
                        }
                      >
                        🖨️ Repr. Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Patient Registration Modal */}
      {showRegModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Register New Patient</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRegModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRegisterPatient}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name (English) *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={regData.nameEn}
                    onChange={(e) => setRegData({ ...regData, nameEn: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">নাম (বাংলা)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={regData.nameBn}
                    onChange={(e) => setRegData({ ...regData, nameBn: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    required
                    placeholder="01XXXXXXXXX"
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Age (Years)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={regData.ageYears}
                    onChange={(e) => setRegData({ ...regData, ageYears: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-control"
                    value={regData.gender}
                    onChange={(e) => setRegData({ ...regData, gender: e.target.value })}
                  >
                    <option value="male">Male (পুরুষ)</option>
                    <option value="female">Female (মহিলা)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group</label>
                  <select
                    className="form-control"
                    value={regData.bloodGroup}
                    onChange={(e) => setRegData({ ...regData, bloodGroup: e.target.value })}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="form-control"
                  value={regData.address}
                  onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Allergies / Warnings (If any)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Penicillin, NSAID allergy"
                  value={regData.allergies}
                  onChange={(e) => setRegData({ ...regData, allergies: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>
                  Save &amp; Generate MRN
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 80mm Token Slip Modal */}
      {printedToken && (
        <ThermalSlipModal tokenData={printedToken} onClose={() => setPrintedToken(null)} />
      )}

      {/* QR / Barcode Scanner Modal */}
      {showScannerModal && (
        <QrScannerModal
          onScan={(scanned) => {
            const hit = patients.find(
              (p) =>
                p.mrn.toLowerCase() === scanned.toLowerCase() ||
                p.phone === scanned ||
                p.id === scanned,
            );
            if (hit) {
              setSelectedPatientId(hit.id);
            } else {
              setSearch(scanned);
            }
            setShowScannerModal(false);
          }}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
}
