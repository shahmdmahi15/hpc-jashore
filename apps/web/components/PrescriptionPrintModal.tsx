// apps/web/components/PrescriptionPrintModal.tsx
'use client';

import React from 'react';

interface PrescriptionPrintModalProps {
  prescription: {
    id: string;
    patient: {
      mrn: string;
      nameEn: string;
      nameBn?: string;
      ageYears?: number;
      gender: string;
      bloodGroup?: string;
    };
    doctor: {
      name: string;
      specialization?: string;
    };
    clinicalNotes?: {
      chiefComplaints?: string;
      diagnosis?: string;
      painScore?: number;
      bp?: string;
    };
    medicines: Array<{
      brandName: string;
      genericName: string;
      dosage: string;
      duration: string;
      instructions: string;
    }>;
    modalities: Array<{
      modalityName: string;
      sessionsPrescribed: number;
      frequency: string;
    }>;
    advice?: string;
    createdAt: string;
  } | null;
  onClose: () => void;
}

export default function PrescriptionPrintModal({
  prescription,
  onClose,
}: PrescriptionPrintModalProps) {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>5.5in × 8.27in Prescription Sheet Preview</h3>
            <small style={{ color: 'var(--hpc-muted)' }}>Custom Medical Pad Format (140mm × 210mm)</small>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* 5.5in x 8.27in Printable Sheet */}
        <div
          className="sheet-prescription"
          style={{
            background: '#ffffff',
            color: '#000000',
            border: '1px solid #ccc',
            padding: '16px 20px',
            fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
            width: '100%',
            maxWidth: '5.5in',
            minHeight: '8.27in',
            margin: '0 auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #059669', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src="/logo.jpg"
                  alt="HPC Logo"
                  style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #10b981' }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: '15px', color: '#047857', fontWeight: 800 }}>
                    এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার
                  </h2>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#333' }}>
                    HPC Health &amp; Pain Care Center, Jashore
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    Mujib Sarak, Jashore · Cell: 01XXXXXXXXX
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                  {prescription.doctor.name}
                </div>
                <div style={{ fontSize: '10px', color: '#444' }}>
                  {prescription.doctor.specialization || 'Consultant Physiotherapist'}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  Reg. No: HPC-{prescription.doctor.name.slice(0, 3).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Patient Demographics Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
                gap: '8px',
                fontSize: '11px',
                background: '#f4fbf7',
                padding: '6px 10px',
                margin: '8px 0',
                border: '1px solid #d1fae5',
                borderRadius: '4px',
              }}
            >
              <div><strong>Patient:</strong> {prescription.patient.nameEn} {prescription.patient.nameBn && `(${prescription.patient.nameBn})`}</div>
              <div><strong>Age:</strong> {prescription.patient.ageYears ? `${prescription.patient.ageYears} Y` : 'N/A'}</div>
              <div><strong>Sex:</strong> {prescription.patient.gender}</div>
              <div style={{ textAlign: 'right' }}><strong>MRN:</strong> {prescription.patient.mrn}</div>
            </div>

            {/* Diagnosis / Complaints */}
            {prescription.clinicalNotes?.diagnosis && (
              <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                <strong>Provisional Diagnosis:</strong> <span style={{ color: '#047857', fontWeight: 'bold' }}>{prescription.clinicalNotes.diagnosis}</span>
                {prescription.clinicalNotes.painScore !== undefined && (
                  <span style={{ marginLeft: '12px' }}>[Pain Score: {prescription.clinicalNotes.painScore}/10]</span>
                )}
              </div>
            )}

            <div style={{ borderBottom: '1px solid #eee', margin: '6px 0' }} />

            {/* Rx Body */}
            <div style={{ display: 'flex', gap: '16px', minHeight: '3.8in' }}>
              {/* Left Column: Modalities & Clinical Notes */}
              <div style={{ width: '38%', borderRight: '1px solid #e5e7eb', paddingRight: '10px', fontSize: '10px' }}>
                {prescription.clinicalNotes?.chiefComplaints && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>Chief Complaints:</div>
                    <div>{prescription.clinicalNotes.chiefComplaints}</div>
                  </div>
                )}

                <div style={{ fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Physiotherapy Plan:
                </div>
                {prescription.modalities.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '14px' }}>
                    {prescription.modalities.map((m, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <strong>{m.modalityName}</strong>
                        <div>{m.sessionsPrescribed} sessions ({m.frequency})</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#888' }}>Routine exercise therapy</div>
                )}

                {prescription.advice && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase' }}>Advice / উপদেশ:</div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>{prescription.advice}</div>
                  </div>
                )}
              </div>

              {/* Right Column: Rx Medicines */}
              <div style={{ flex: 1, paddingLeft: '6px' }}>
                <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'serif', color: '#047857', marginBottom: '4px' }}>
                  ℞
                </div>

                {prescription.medicines.map((med, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{idx + 1}. {med.brandName}</strong>
                      <span style={{ color: '#666', fontSize: '10px' }}>({med.duration})</span>
                    </div>
                    <div style={{ color: '#555', fontSize: '10px' }}>{med.genericName}</div>
                    <div style={{ color: '#047857', fontWeight: 'bold', marginTop: '1px' }}>
                      {med.dosage} &nbsp;&mdash;&nbsp; <span>{med.instructions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer & Signature */}
          <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '10px' }}>
            <div>
              Date: {new Date(prescription.createdAt).toLocaleDateString()}
              <div style={{ color: '#666', fontSize: '9px' }}>Valid for 30 days from date of issue</div>
            </div>
            <div style={{ textAlign: 'center', width: '120px' }}>
              <div style={{ height: '24px' }}></div>
              <div style={{ borderTop: '1px dashed #333', paddingTop: '2px', fontWeight: 'bold' }}>
                Doctor&apos;s Signature
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="btn" style={{ flex: 1 }} onClick={handlePrint}>
            🖨️ Print 5.5in × 8.27in Prescription
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
