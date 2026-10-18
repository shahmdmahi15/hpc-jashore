// apps/web/components/QrScannerModal.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, QrCode, Search, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

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
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <QrCode className="size-5 text-emerald-500" />
            <span>Scan Patient Card / MRN</span>
          </DialogTitle>
          <DialogDescription>
            Point camera at the patient QR code, or scan with a USB barcode gun.
          </DialogDescription>
        </DialogHeader>

        {/* Camera Viewfinder */}
        <div className="relative w-full h-60 bg-black/90 dark:bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-emerald-500/50">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {!cameraActive && (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <Camera className="size-10 text-muted-foreground mb-3 animate-pulse" />
              <Button
                type="button"
                size="sm"
                onClick={startCamera}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Enable Camera Viewfinder
              </Button>
              {cameraError && (
                <Alert variant="destructive" className="mt-3 p-2 text-xs">
                  <AlertTriangle className="size-3.5" />
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {cameraActive && (
            <div className="absolute size-40 border-2 border-emerald-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none" />
          )}
        </div>

        {/* Manual Barcode / MRN Input */}
        <form onSubmit={handleManualSubmit} className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label htmlFor="manual-mrn-input" className="text-xs font-semibold">
              Or Enter / Scan MRN Manually:
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual-mrn-input"
                type="text"
                placeholder="e.g. HPC-26-00001"
                autoFocus
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="font-mono text-sm"
              />
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5">
                <Search className="size-3.5" />
                <span>Look up</span>
              </Button>
            </div>
          </div>
        </form>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
