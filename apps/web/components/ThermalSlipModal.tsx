// apps/web/components/ThermalSlipModal.tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, X } from 'lucide-react';

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
    phone?: string;
    ageYears?: number;
    gender?: string;
    totalFeeTaka?: number;
  } | null;
  onClose: () => void;
}

export default function ThermalSlipModal({ tokenData, onClose }: ThermalSlipModalProps) {
  const [paperFormat, setPaperFormat] = useState<'hpc' | 'thermal' | 'a4'>('hpc');

  if (!tokenData) return null;

  const handlePrint = () => {
    window.print();
  };

  const issuedTime = new Date(tokenData.issuedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const issuedDate = new Date(tokenData.issuedAt).toLocaleDateString('en-GB');

  return (
    <Dialog open={!!tokenData} onOpenChange={(op) => !op && onClose()}>
      <DialogContent
        className="max-w-[560px] max-h-[92vh] overflow-y-auto p-4 sm:p-5 bg-background border-border"
        onClose={onClose}
      >
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                টোকেন ও মানি স্লিপ প্রিভিউ
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                সিরিয়াল #{tokenData.serialNumber} · টোকেন {tokenData.tokenNumber}
              </p>
            </div>

            {/* Paper Size Selector */}
            <div className="flex items-center gap-1 p-0.5 bg-muted/70 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setPaperFormat('hpc')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  paperFormat === 'hpc'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📄 HPC Size (5.5&quot;×8.27&quot;)
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('thermal')}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  paperFormat === 'thermal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🧾 80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  paperFormat === 'a4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📑 A4
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* 1. HPC CUSTOM SIZE PAPER (5.5in x 8.27in / 140mm x 210mm) */}
        {paperFormat === 'hpc' && (
          <div
            className="sheet-invoice-hpc print-hpc-paper bg-white text-black p-4 rounded-xl border border-zinc-300 shadow-md mx-auto my-2 w-full font-sans"
            style={{
              maxWidth: '5.5in',
              minHeight: '8.27in',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: '11px',
            }}
          >
            <div>
              {/* HPC Header & Branding */}
              <div className="border-b-2 border-emerald-600 pb-2 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img
                    src="/hpclogo-transparent.png"
                    alt="HPC Logo"
                    className="w-9 h-9 object-contain"
                  />
                  <div className="text-left">
                    <h1 className="text-sm font-extrabold text-emerald-800 leading-tight">
                      {tokenData.clinicNameBn || 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর'}
                    </h1>
                    <h2 className="text-[11px] font-bold text-zinc-800 leading-tight">
                      {tokenData.clinicNameEn || 'HPC Health & Pain Care Center, Jashore'}
                    </h2>
                  </div>
                </div>
                <p className="text-[9.5px] text-zinc-600">
                  চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০ · মোবাইল: 01515-615188
                </p>
              </div>

              {/* Token Callout */}
              <div className="my-3 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
                  PATIENT CONSULTATION SERIAL TOKEN
                </div>
                <div className="text-4xl font-black font-mono text-zinc-900 my-1">
                  {tokenData.tokenNumber}
                </div>
                <div className="text-xs font-bold text-emerald-800">
                  সিরিয়াল #{tokenData.serialNumber} · {tokenData.priority.toUpperCase()}
                </div>
              </div>

              {/* Patient & Consultation Meta */}
              <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 space-y-1.5 text-[11px] mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-500">রোগীর নাম:</span>{' '}
                    <strong>{tokenData.patientName}</strong>
                    {tokenData.patientNameBn && ` (${tokenData.patientNameBn})`}
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">MRN:</span>{' '}
                    <strong className="font-mono">{tokenData.mrn}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200">
                  <div>
                    <span className="text-zinc-500">পরামর্শক ডাক্তার:</span>{' '}
                    <strong>{tokenData.doctorName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">সময় ও তারিখ:</span>{' '}
                    <span>{issuedDate} {issuedTime}</span>
                  </div>
                </div>
              </div>

              {tokenData.totalFeeTaka && (
                <div className="p-2 rounded bg-zinc-100 border border-zinc-300 text-right font-mono text-xs mb-3">
                  <strong>পরামর্শ ফি আদায়: ৳{tokenData.totalFeeTaka}</strong> (পরিশোধিত)
                </div>
              )}

              <div className="p-2 rounded border border-dashed border-emerald-300 bg-emerald-50/50 text-[10px] text-zinc-700 leading-relaxed">
                ℹ️ অনুগ্রহ করে ওয়েটিং রুম টিভি স্ক্রিনে আপনার টোকেন নম্বর প্রদর্শিত হওয়া পর্যন্ত অপেক্ষা করুন। ডাক শোনা মাত্র নির্ধারিত চেম্বারে প্রবেশ করুন।
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-4 border-t border-zinc-300 grid grid-cols-2 text-center text-[9px]">
              <div>
                <div className="border-t border-dashed border-zinc-400 mx-4 pt-1">
                  রোগীর স্বাক্ষর
                </div>
              </div>
              <div>
                <div className="border-t border-dashed border-zinc-400 mx-4 pt-1">
                  কাউন্টার / রসিদকারী
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. 80MM THERMAL PAPER RENDERING */}
        {paperFormat === 'thermal' && (
          <div
            className="sheet-thermal bg-white text-black p-3 rounded border border-dashed border-zinc-400 text-center mx-auto my-2 w-full max-w-[300px]"
          >
            <div className="font-bold text-xs">
              {tokenData.clinicNameBn || 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার'}
            </div>
            <div className="text-[10px] text-zinc-600">
              {tokenData.clinicNameEn || 'HPC Health & Pain Care Center, Jashore'}
            </div>
            <div className="text-[9px] text-zinc-500">Phone: 01515-615188 · Jashore</div>
            <div className="border-b border-dashed border-black my-2" />

            <div className="text-[10px] uppercase font-bold tracking-wider">
              PATIENT SERIAL TOKEN
            </div>
            <div className="text-3xl font-black font-mono my-1 leading-none">
              {tokenData.tokenNumber}
            </div>
            <div className="text-[11px] font-bold">
              Serial #{tokenData.serialNumber} · {tokenData.priority.toUpperCase()}
            </div>

            <div className="border-b border-dashed border-black my-2" />

            <table className="w-full text-left text-[10px]">
              <tbody>
                <tr>
                  <td className="text-zinc-600">MRN:</td>
                  <td className="font-bold">{tokenData.mrn}</td>
                </tr>
                <tr>
                  <td className="text-zinc-600">Patient:</td>
                  <td><strong>{tokenData.patientName}</strong></td>
                </tr>
                <tr>
                  <td className="text-zinc-600">Doctor:</td>
                  <td>{tokenData.doctorName}</td>
                </tr>
                <tr>
                  <td className="text-zinc-600">Time:</td>
                  <td>{issuedTime}</td>
                </tr>
              </tbody>
            </table>

            <div className="border-b border-dashed border-black my-2" />
            <div className="text-[9px] italic text-zinc-700">
              অনুগ্রহ করে আপনার টোকেন ডাকলে চিকিৎসকের কক্ষে প্রবেশ করুন।
            </div>
          </div>
        )}

        {/* 3. A4 PAPER RENDERING */}
        {paperFormat === 'a4' && (
          <div className="sheet-report-a4 print-a4-paper bg-white text-black p-6 rounded-lg border border-zinc-300 mx-auto my-2 w-full">
            <div className="border-b-2 border-emerald-600 pb-3 text-center">
              <h1 className="text-base font-bold text-emerald-800">
                {tokenData.clinicNameBn || 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর'}
              </h1>
              <h2 className="text-xs font-semibold text-zinc-800">
                {tokenData.clinicNameEn || 'HPC Health & Pain Care Center, Jashore'}
              </h2>
            </div>
            <div className="text-center my-6">
              <div className="text-sm font-bold text-zinc-600">TOKEN NUMBER</div>
              <div className="text-5xl font-black font-mono my-2">{tokenData.tokenNumber}</div>
              <div className="text-sm font-semibold">Serial #{tokenData.serialNumber}</div>
            </div>
            <div className="p-4 bg-zinc-50 rounded border text-xs max-w-md mx-auto space-y-1">
              <div><strong>রোগীর নাম:</strong> {tokenData.patientName}</div>
              <div><strong>MRN:</strong> {tokenData.mrn}</div>
              <div><strong>ডাক্তার:</strong> {tokenData.doctorName}</div>
              <div><strong>তারিখ ও সময়:</strong> {issuedDate} {issuedTime}</div>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            বন্ধ করুন (Close)
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Printer className="size-4" />
            <span>
              {paperFormat === 'hpc'
                ? 'প্রিন্ট HPC সাইজ টোকেন স্লিপ (5.5" × 8.27")'
                : paperFormat === 'thermal'
                ? 'প্রিন্ট ৮০মিমি স্লিপ'
                : 'প্রিন্ট A4'}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}