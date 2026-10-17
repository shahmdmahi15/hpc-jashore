// apps/web/components/ThermalSlipModal.tsx
'use client';

import React from 'react';

interface ThermalSlipModalProps {
  tokenData: {
    tokenNumber: string | number;
    serialNumber: number;
    patientName: string;
    patientNameBn?: string;
    mrn: string;
    doctorName: string;
    priority: string;
    issuedAt: string;
    clinicNameEn: string;
    clinicNameBn: string;
  } | null;
  onClose: () => void;
}

export default function ThermalSlipModal({ tokenData, onClose }: ThermalSlipModalProps) {
  if (!tokenData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '380px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>80mm Token Slip Preview</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* 80mm Thermal Paper Rendering */}
        <div
          className="sheet-thermal"
          style={{
            background: '#fff',
            color: '#000',
            border: '1px dashed #999',
            padding: '12px',
            borderRadius: '4px',
            textAlign: 'center',
            margin: '0 auto',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
            <img
              src="/logo.jpg"
              alt="HPC Logo"
              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
            />
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
            {tokenData.clinicNameBn || 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার'}
          </div>
          <div style={{ fontSize: '11px', color: '#444' }}>
            {tokenData.clinicNameEn || 'HPC Health & Pain Care Center, Jashore'}
          </div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            Phone: 01XXXXXXXXX · Jashore
          </div>
          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            PATIENT SERIAL TOKEN
          </div>
          <div
            style={{
              fontSize: '38px',
              fontWeight: 900,
              lineHeight: 1.1,
              margin: '6px 0',
              fontFamily: 'monospace',
            }}
          >
            {tokenData.tokenNumber}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
            Serial #{tokenData.serialNumber} · {tokenData.priority.toUpperCase()}
          </div>

          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

          <table style={{ width: '100%', textAlign: 'left', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ color: '#555' }}>MRN:</td>
                <td style={{ fontWeight: 'bold' }}>{tokenData.mrn}</td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Patient:</td>
                <td>
                  <strong>{tokenData.patientName}</strong>
                  {tokenData.patientNameBn && ` (${tokenData.patientNameBn})`}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Doctor:</td>
                <td>{tokenData.doctorName}</td>
              </tr>
              <tr>
                <td style={{ color: '#555' }}>Time:</td>
                <td>{new Date(tokenData.issuedAt).toLocaleTimeString()}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
          <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#333' }}>
            অনুগ্রহ করে আপনার টোকেন ডাকলে চিকিৎসকের কক্ষে প্রবেশ করুন।
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="btn" style={{ flex: 1 }} onClick={handlePrint}>
            🖨️ Print 80mm Slip
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
