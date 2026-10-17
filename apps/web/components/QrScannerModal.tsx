// apps/web/components/QrScannerModal.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';

interface QrScannerModalProps {
  onScan: (mrn: string) => void;
  onClose: () => void;
}

export default function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
  const [manualInput, setManualInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // USB Barcode gun listener (acts as fast keyboard wedge ending in Enter)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      // Barcode scanners type very rapidly (< 50ms per key)
      if (now - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 4) {
          onScan(barcodeBuffer.trim());
          onClose();
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, onClose]);

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>📷 Scan Patient Card / MRN</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--hpc-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Point camera at the patient QR code, or scan with a USB barcode gun.
        </p>

        {/* Camera Viewfinder */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            background: '#04120d',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed var(--hpc-emerald-500)',
          }}
        >
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
          />

          {!cameraActive && (
            <div style={{ padding: '1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
              <button type="button" className="btn btn-sm" onClick={startCamera}>
                Enable Camera Viewfinder
              </button>
              {cameraError && (
                <div style={{ color: 'var(--hpc-danger)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {cameraError}
                </div>
              )}
            </div>
          )}

          {cameraActive && (
            <div
              style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                border: '2px solid #10b981',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                borderRadius: '8px',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Manual Barcode / MRN Input */}
        <form onSubmit={handleManualSubmit} style={{ marginTop: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ textAlign: 'left' }}>Or Enter / Scan MRN Manually:</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. HPC-26-00001"
                autoFocus
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
              <button type="submit" className="btn">
                Look up
              </button>
            </div>
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
