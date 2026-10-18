// apps/web/components/DoctorChamberView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, UserSession } from '../lib/api';
import { cn } from '../lib/utils';
import PrescriptionPrintModal from './PrescriptionPrintModal';

interface DoctorChamberProps {
  session: UserSession | null;
}

export default function DoctorChamberView({ session }: DoctorChamberProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [activeSerial, setActiveSerial] = useState<any>(null);
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [modalitiesList, setModalitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Consultation & Prescription State
  const [chiefComplaints, setChiefComplaints] = useState('Severe lower back pain radiating down left leg for 3 months');
  const [painScore, setPainScore] = useState(7);
  const [diagnosis, setDiagnosis] = useState('Lumbar Radiculopathy / Sciatica (L4-L5 disc protrusion)');
  const [objectiveNotes, setObjectiveNotes] = useState('SLR test positive on left side at 45°. Tenderness on lumbar paravertebral muscles.');
  const [advice, setAdvice] = useState('Avoid bending forward and lifting heavy weights. Use hard mattress. Apply warm moist compress for 15 mins twice daily.');

  // Prescribed Medicines State
  const [prescribedMeds, setPrescribedMeds] = useState<any[]>([
    {
      brandName: 'Naprosyn 500',
      genericName: 'Naproxen 500mg',
      dosage: '1+0+1',
      duration: '7 days',
      instructions: 'খাবারের পর (After meals)',
    },
    {
      brandName: 'Myolax 50',
      genericName: 'Tolperisone HCl 50mg',
      dosage: '1+0+1',
      duration: '7 days',
      instructions: 'খাবারের পর (After meals)',
    },
    {
      brandName: 'Maxpro 20',
      genericName: 'Esomeprazole 20mg',
      dosage: '1+0+0',
      duration: '14 days',
      instructions: 'খাবারের ২০ মিনিট আগে (Before meal)',
    },
  ]);

  // Prescribed Modalities State
  const [prescribedMods, setPrescribedMods] = useState<any[]>([
    { modalityCode: 'IFT', modalityName: 'Interferential Therapy (IFT)', sessionsPrescribed: 10, frequency: 'daily' },
    { modalityCode: 'UST', modalityName: 'Ultrasound Therapy (UST)', sessionsPrescribed: 10, frequency: 'daily' },
  ]);

  // Print modal state
  const [printData, setPrintData] = useState<any>(null);
  // Adaptive Mobile Tab: switch between Queue and Consultation
  const [mobileTab, setMobileTab] = useState<'queue' | 'consultation'>('queue');

  const doctorId = session?.staffId || '';

  const loadQueue = async () => {
    try {
      setLoading(true);
      const staffList = await api.staff.list();
      let targetDoctor = staffList.find((s: any) => s.userId === session?.userId || s.role === 'head_doctor' || s.role === 'doctor');
      const docId = targetDoctor ? targetDoctor.id : doctorId;

      if (docId) {
        const q = await api.visits.getDoctorQueue(docId);
        setQueue(q || []);
        if (q && q.length > 0 && !activeSerial) {
          const inProgress = q.find((s: any) => s.status === 'called' || s.status === 'in_chamber') || q[0];
          setActiveSerial(inProgress);
        }
      }

      const [meds, mods] = await Promise.all([
        api.inventory.getMedicines(),
        api.therapy.getMachines(),
      ]);
      setMedicinesList(meds || []);
      setModalitiesList(mods || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [doctorId, session]);

  const handleCallNext = async () => {
    try {
      const staffList = await api.staff.list();
      const doc = staffList.find((s: any) => s.userId === session?.userId || s.role === 'head_doctor');
      const targetDocId = doc?.id || doctorId;

      const called = await api.visits.callNext(targetDocId);
      const active = called.serial || called;
      setActiveSerial(active);
      setMobileTab('consultation');
      toast.success(`Called Serial #${active.serialNumber || 'Next'}`);
      loadQueue();
    } catch (err: any) {
      toast.error(`Call next error: ${err.message}`);
    }
  };

  const handleSelectSerial = (s: any) => {
    setActiveSerial(s);
    setMobileTab('consultation');
  };

  const handleAddMedicine = () => {
    setPrescribedMeds([
      ...prescribedMeds,
      {
        brandName: medicinesList[0]?.brandName || 'Tab. Paracetamol 500mg',
        genericName: medicinesList[0]?.genericName || 'Paracetamol',
        dosage: '1+0+1',
        duration: '7 days',
        instructions: 'খাবারের পর (After meals)',
      },
    ]);
  };

  const handleRemoveMedicine = (idx: number) => {
    setPrescribedMeds(prescribedMeds.filter((_, i) => i !== idx));
  };

  const handleAddModality = (code: string, name: string) => {
    if (prescribedMods.some((m) => m.modalityCode === code)) return;
    setPrescribedMods([
      ...prescribedMods,
      {
        modalityCode: code,
        modalityName: name,
        sessionsPrescribed: 10,
        frequency: 'daily',
      },
    ]);
  };

  const handleRemoveModality = (code: string) => {
    setPrescribedMods(prescribedMods.filter((m) => m.modalityCode !== code));
  };

  const handleSaveAndPrint = async () => {
    if (!activeSerial) {
      toast.error('No active patient selected');
      return;
    }

    try {
      // 1. Save Consultation record
      await api.clinical.saveConsultation({
        visitId: activeSerial.visitId,
        patientId: activeSerial.patientId,
        doctorId: activeSerial.doctorId || doctorId,
        chiefComplaints,
        painScore,
        objectiveNotes,
        provisionalDiagnosis: diagnosis,
        planNotes: advice,
      });

      // 2. Save Prescription record
      const rx = await api.clinical.createPrescription({
        visitId: activeSerial.visitId,
        patientId: activeSerial.patientId,
        doctorId: activeSerial.doctorId || doctorId,
        medicines: prescribedMeds,
        modalities: prescribedMods,
        advice,
      });

      // 3. Mark serial as completed
      if (activeSerial.id) {
        await api.visits.completeSerial(activeSerial.id);
      }

      toast.success('Prescription & Consultation saved successfully!');

      // 4. Open 5.5in x 8.27in Print Modal
      setPrintData({
        id: rx?.id || 'RX-001',
        patient: {
          mrn: activeSerial.patient?.mrn || 'HPC-26-00001',
          nameEn: activeSerial.patient?.nameEn || 'Patient',
          nameBn: activeSerial.patient?.nameBn,
          ageYears: activeSerial.patient?.ageYears || 52,
          gender: activeSerial.patient?.gender || 'male',
          bloodGroup: activeSerial.patient?.bloodGroup,
        },
        doctor: {
          name: session?.displayName || 'Dr. Toufiq (Md. Toufiq Uz Zaman)',
          specialization: 'Physiotherapist & Pain Specialist',
        },
        clinicalNotes: {
          chiefComplaints,
          diagnosis,
          painScore,
        },
        medicines: prescribedMeds,
        modalities: prescribedMods,
        advice,
        createdAt: new Date().toISOString(),
      });

      loadQueue();
    } catch (err: any) {
      toast.error(`Error saving prescription: ${err.message}`);
    }
  };

  return (
    <div className="w-full">
      {/* Mobile & Small Tablet Adaptive Segmented Control */}
      <div className="flex lg:hidden items-center gap-2 mb-4 p-1 rounded-xl bg-card border border-border shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab('queue')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            mobileTab === 'queue'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          🚪 Queue ({queue.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('consultation')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            mobileTab === 'consultation'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          📝 Consultation &amp; Rx {activeSerial ? `(#${activeSerial.serialNumber})` : ''}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 sm:gap-6 w-full items-start">
        {/* Left Column: Chamber Patient Queue */}
        <div className={cn('panel h-fit transition-all', mobileTab !== 'queue' && 'hidden lg:block')}>
          <div className="panel-header">
            <h3 className="panel-title">
              <span>🚪</span> Chamber Queue ({queue.length})
            </h3>
            <button className="btn btn-sm" onClick={handleCallNext}>
              📢 Call Next
            </button>
          </div>

        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--hpc-muted)' }}>
            No patients waiting in queue.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {queue.map((s) => {
              const isCurrent = activeSerial?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSerial(s)}
                  style={{
                    border: `1.5px solid ${isCurrent ? 'var(--hpc-accent)' : 'var(--hpc-border)'}`,
                    background: isCurrent ? 'var(--hpc-emerald-50)' : 'var(--hpc-surface)',
                    borderRadius: '0.6rem',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--hpc-accent)' }}>
                      #{s.serialNumber} · {s.tokenNumber || `T-${s.serialNumber}`}
                    </strong>
                    <span className="badge badge-emerald">{s.status}</span>
                  </div>
                  <div style={{ fontWeight: 600, marginTop: '0.3rem' }}>
                    {s.patient?.nameEn}
                  </div>
                  <div style={{ fontSize: '0.785rem', color: 'var(--hpc-muted)' }}>
                    MRN: {s.patient?.mrn} · {s.patient?.gender}, {s.patient?.ageYears}y
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: SOAP Consultation & 5.5in x 8.27in Prescription Writer */}
      <div className={cn('flex flex-col gap-4 sm:gap-5 transition-all w-full', mobileTab !== 'consultation' && 'hidden lg:flex')}>
        {/* Active Patient Demographics Bar */}
        <div className="panel" style={{ background: 'var(--hpc-surface-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="eyebrow">NOW IN CHAMBER</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>
                {activeSerial?.patient?.nameEn || 'Abdul Karim'}{' '}
                {activeSerial?.patient?.nameBn && <small>({activeSerial.patient.nameBn})</small>}
              </h2>
              <div style={{ color: 'var(--hpc-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                MRN: <strong>{activeSerial?.patient?.mrn || 'HPC-26-00001'}</strong> · Age: {activeSerial?.patient?.ageYears || 52} Y · Gender: {activeSerial?.patient?.gender || 'male'} · Phone: {activeSerial?.patient?.phone || '01712345678'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-emerald">
                Blood: {activeSerial?.patient?.bloodGroup || 'B+'}
              </span>
              {activeSerial?.patient?.allergies && (
                <span className="badge badge-red">
                  ⚠️ {activeSerial.patient.allergies}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Assessment Card */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">🩺 Clinical Physio Assessment (SOAP)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                VAS Pain Score: <strong style={{ color: 'var(--hpc-accent)', fontSize: '1.1rem' }}>{painScore}/10</strong>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={painScore}
                onChange={(e) => setPainScore(parseInt(e.target.value))}
                style={{ accentColor: 'var(--hpc-accent)', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Chief Complaints &amp; History</label>
              <textarea
                className="form-control"
                rows={3}
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Provisional Diagnosis</label>
              <input
                type="text"
                className="form-control"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Objective Examination (ROM, Gait, Palpation, Special Tests)</label>
            <textarea
              className="form-control"
              rows={2}
              value={objectiveNotes}
              onChange={(e) => setObjectiveNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Therapy Modalities Prescribing */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">⚡ Prescribed Therapy Modalities</h3>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddModality('IFT', 'Interferential Therapy (IFT)')}
              >
                + IFT
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddModality('UST', 'Ultrasound Therapy (UST)')}
              >
                + Ultrasound
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddModality('SWD', 'Shortwave Diathermy (SWD)')}
              >
                + Shortwave
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddModality('EXE', 'Therapeutic Exercise')}
              >
                + Exercise
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Modality</th>
                  <th>Prescribed Sessions</th>
                  <th>Frequency</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {prescribedMods.map((m) => (
                  <tr key={m.modalityCode}>
                    <td><strong>{m.modalityName}</strong></td>
                    <td>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: '80px', padding: '0.3rem' }}
                        value={m.sessionsPrescribed}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setPrescribedMods(
                            prescribedMods.map((it) =>
                              it.modalityCode === m.modalityCode ? { ...it, sessionsPrescribed: val } : it,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ width: '110px', padding: '0.3rem' }}
                        value={m.frequency}
                        onChange={(e) => {
                          setPrescribedMods(
                            prescribedMods.map((it) =>
                              it.modalityCode === m.modalityCode ? { ...it, frequency: e.target.value } : it,
                            ),
                          );
                        }}
                      >
                        <option value="daily">Daily</option>
                        <option value="alternate_days">Alt. Days</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveModality(m.modalityCode)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Medicines (Rx) Writer */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">℞ Prescribed Medicines</h3>
            <button className="btn btn-sm" onClick={handleAddMedicine}>
              + Add Medicine
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {prescribedMeds.map((med, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1fr 1fr 2fr auto',
                  gap: '0.65rem',
                  alignItems: 'center',
                  background: 'var(--hpc-bg)',
                  padding: '0.65rem',
                  borderRadius: '0.5rem',
                }}
              >
                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Brand Name"
                    value={med.brandName}
                    onChange={(e) => {
                      const updated = [...prescribedMeds];
                      updated[idx].brandName = e.target.value;
                      setPrescribedMeds(updated);
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Generic"
                    value={med.genericName}
                    onChange={(e) => {
                      const updated = [...prescribedMeds];
                      updated[idx].genericName = e.target.value;
                      setPrescribedMeds(updated);
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="1+0+1"
                    value={med.dosage}
                    onChange={(e) => {
                      const updated = [...prescribedMeds];
                      updated[idx].dosage = e.target.value;
                      setPrescribedMeds(updated);
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="7 days"
                    value={med.duration}
                    onChange={(e) => {
                      const updated = [...prescribedMeds];
                      updated[idx].duration = e.target.value;
                      setPrescribedMeds(updated);
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="খাবারের পর"
                    value={med.instructions}
                    onChange={(e) => {
                      const updated = [...prescribedMeds];
                      updated[idx].instructions = e.target.value;
                      setPrescribedMeds(updated);
                    }}
                  />
                </div>
                <div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveMedicine(idx)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Special Advice / নির্দেশাবলী</label>
            <textarea
              className="form-control"
              rows={2}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
            <button
              className="btn btn-lg"
              style={{ flex: 1 }}
              onClick={handleSaveAndPrint}
            >
              📄 Save &amp; Print 5.5in × 8.27in Prescription
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* 5.5in x 8.27in Prescription Modal */}
      {printData && (
        <PrescriptionPrintModal
          prescription={printData}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
}
