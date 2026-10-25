// apps/web/components/PrescriptionPrintModal.tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, X, FileText } from 'lucide-react';

interface PrescriptionPrintModalProps {
  prescription: {
    id: string;
    rxNumber?: string;
    patient: {
      mrn: string;
      nameEn: string;
      nameBn?: string;
      ageYears?: number;
      gender: string;
      bloodGroup?: string;
      phone?: string;
    };
    doctor: {
      name: string;
      specialization?: string;
      degrees?: string;
      chamberRoom?: string;
    };
    clinicalNotes?: {
      chiefComplaints?: string;
      diagnosis?: string;
      painScore?: number;
      bp?: string;
      weight?: string;
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
    nextVisitDate?: string;
    createdAt: string;
  } | null;
  onClose: () => void;
}

export default function PrescriptionPrintModal({
  prescription,
  onClose,
}: PrescriptionPrintModalProps) {
  // Reports default to A4 portrait as mandated by user directives!
  const [paperFormat, setPaperFormat] = useState<'a4' | 'hpc'>('a4');

  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  const rxDate = new Date(prescription.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Dialog open={!!prescription} onOpenChange={(op) => !op && onClose()}>
      <DialogContent
        className="max-w-[780px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 bg-background border-border"
        onClose={onClose}
      >
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <FileText className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>ডাক্তার প্রেসক্রিপশন ও ক্লিনিক্যাল রিপোর্ট</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                প্রেসক্রিপশন নং: <strong className="text-foreground">{prescription.rxNumber || prescription.id}</strong>
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  paperFormat === 'a4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="A4 Standard Clinical Report"
              >
                📑 A4 Report (210mm × 297mm)
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('hpc')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  paperFormat === 'hpc'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="HPC Custom Paper (140mm × 210mm)"
              >
                📄 HPC Pad (5.5&quot;×8.27&quot;)
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Prescription Body */}
        <div
          className={`sheet-prescription ${
            paperFormat === 'hpc' ? 'print-hpc-paper' : 'print-a4-paper sheet-report-a4'
          } bg-white text-black p-5 sm:p-7 rounded-xl border border-zinc-300 shadow-md mx-auto my-2 w-full font-sans`}
          style={{
            minHeight: paperFormat === 'hpc' ? '8.27in' : '297mm',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {/* HPC Official Clinical Letterhead Banner */}
            <div className="border-b-2 border-emerald-600 pb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <img
                  src="/hpclogo-transparent.png"
                  alt="HPC Logo"
                  className="w-12 h-12 object-contain shrink-0 mt-0.5"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="text-base sm:text-lg font-black text-emerald-800 leading-tight">
                    এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                  </h1>
                  <h2 className="text-xs sm:text-sm font-extrabold text-zinc-800 leading-tight">
                    HPC Health &amp; Pain Care Center, Jashore
                  </h2>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                  </p>
                  <p className="text-[9.5px] text-zinc-500 font-mono">
                    হটলাইন / মোবাইল: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpcjashore@gmail.com
                  </p>
                </div>
              </div>

              {/* Doctor Credentials */}
              <div className="text-right text-[11px] shrink-0 max-w-[240px]">
                <div className="font-extrabold text-sm text-zinc-900">
                  {prescription.doctor.name || 'ডাঃ মোঃ তৌফিক উজ জামান'}
                </div>
                <div className="text-[10px] text-zinc-700 font-semibold leading-tight">
                  {prescription.doctor.degrees ||
                    'BPT (DU), PGD (Acupuncture, China), MDMR (Pain Management, DU), MPH'}
                </div>
                <div className="text-[9.5px] text-emerald-700 font-bold mt-0.5">
                  Founder, CEO &amp; Head Doctor
                </div>
                <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                  Reg. No: HPC-DOC-01
                </div>
              </div>
            </div>

            {/* Patient Demographics Strip */}
            <div className="my-2.5 p-2 rounded-lg bg-zinc-100 border border-zinc-200 grid grid-cols-4 gap-2 text-[10.5px]">
              <div>
                <span className="text-zinc-500">Patient:</span>{' '}
                <strong className="text-zinc-900">{prescription.patient.nameEn}</strong>
                {prescription.patient.nameBn && ` (${prescription.patient.nameBn})`}
              </div>
              <div>
                <span className="text-zinc-500">Age/Sex:</span>{' '}
                <strong>
                  {prescription.patient.ageYears ? `${prescription.patient.ageYears}Y` : '-'}{' '}
                  / {prescription.patient.gender}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500">MRN:</span>{' '}
                <strong className="font-mono">{prescription.patient.mrn}</strong>
              </div>
              <div className="text-right">
                <span className="text-zinc-500">Date:</span>{' '}
                <strong className="font-mono">{rxDate}</strong>
              </div>
            </div>

            {/* Diagnosis & Vitals Banner */}
            {(prescription.clinicalNotes?.diagnosis || prescription.clinicalNotes?.painScore !== undefined) && (
              <div className="mb-3 px-2.5 py-1.5 rounded bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-600 font-semibold">Provisional Diagnosis:</span>{' '}
                  <strong className="text-emerald-800 font-bold">
                    {prescription.clinicalNotes?.diagnosis || 'Musculoskeletal Pain Disorder'}
                  </strong>
                </div>
                {prescription.clinicalNotes?.painScore !== undefined && (
                  <div className="font-mono text-[11px] font-bold text-amber-700">
                    VAS Pain Score: {prescription.clinicalNotes.painScore}/10
                  </div>
                )}
              </div>
            )}

            {/* 2-Column Clinical Body: Modalities on Left, Medicines on Right */}
            <div className="grid grid-cols-12 gap-4 min-h-[380px] pt-1 border-t border-zinc-200">
              {/* Left Column: Complaints, Therapy Plan & Advice (4.5 Cols) */}
              <div className="col-span-5 border-r border-zinc-200 pr-3 space-y-3 text-[10.5px]">
                {prescription.clinicalNotes?.chiefComplaints && (
                  <div>
                    <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] mb-1">
                      Chief Complaints:
                    </h3>
                    <p className="text-zinc-800 leading-snug">
                      {prescription.clinicalNotes.chiefComplaints}
                    </p>
                  </div>
                )}

                {/* Physiotherapy Modality Plan */}
                <div>
                  <h3 className="font-extrabold text-emerald-800 uppercase tracking-wider text-[10.5px] mb-1.5 flex items-center gap-1">
                    <span>⚡ Physiotherapy Plan:</span>
                  </h3>
                  {prescription.modalities.length > 0 ? (
                    <ul className="space-y-1.5 pl-3 list-disc">
                      {prescription.modalities.map((m, idx) => (
                        <li key={idx} className="leading-tight">
                          <strong className="text-zinc-900">{m.modalityName}</strong>
                          <div className="text-zinc-600 font-mono text-[10px]">
                            {m.sessionsPrescribed} sessions ({m.frequency})
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-500 italic">Therapeutic active exercise &amp; mobilization</p>
                  )}
                </div>

                {/* Clinical Advice */}
                {prescription.advice && (
                  <div className="pt-2 border-t border-zinc-200">
                    <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-[10px] mb-1">
                      Advice / উপদেশ:
                    </h3>
                    <p className="text-zinc-800 whitespace-pre-line leading-relaxed text-[10px]">
                      {prescription.advice}
                    </p>
                  </div>
                )}

                {/* Follow-up */}
                {prescription.nextVisitDate && (
                  <div className="p-2 rounded bg-sky-50 border border-sky-200 text-sky-900 text-[10px]">
                    <strong>Next Follow-up:</strong> {prescription.nextVisitDate}
                  </div>
                )}
              </div>

              {/* Right Column: ℞ Medicines (7 Cols) */}
              <div className="col-span-7 pl-1">
                <div className="text-3xl font-serif font-black text-emerald-700 leading-none mb-2">
                  ℞
                </div>

                <div className="space-y-3">
                  {prescription.medicines.map((med, idx) => (
                    <div key={idx} className="pb-2 border-b border-zinc-100 last:border-0 text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="font-extrabold text-zinc-900">
                          {idx + 1}. {med.brandName}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          ({med.duration})
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono">
                        {med.genericName}
                      </div>
                      <div className="text-emerald-700 font-bold text-xs mt-0.5 flex items-center gap-2">
                        <span>{med.dosage}</span>
                        <span className="text-zinc-400 font-normal">|</span>
                        <span className="text-zinc-700 font-medium text-[11px]">{med.instructions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer & Doctor Signature */}
          <div className="pt-4 border-t border-zinc-300 flex items-end justify-between text-[9.5px]">
            <div>
              <div>Valid for 30 days from date of issue</div>
              <div className="text-zinc-500 text-[8.5px]">
                জরুরি প্রয়োজনে সেন্টারের হটলাইনে যোগাযোগ করুন: +৮৮০ ১৫১৫-৬১৫১৮৮
              </div>
            </div>

            <div className="text-center w-40">
              <div className="h-8"></div>
              <div className="border-t border-dashed border-zinc-800 pt-1 font-bold text-zinc-800">
                {prescription.doctor.name || "Doctor's Signature"}
              </div>
              <div className="text-[8.5px] text-zinc-500">HPC Health &amp; Pain Care Center</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
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
              {paperFormat === 'a4'
                ? 'প্রিন্ট A4 প্রেসক্রিপশন (210mm × 297mm)'
                : 'প্রিন্ট HPC সাইজ প্রেসক্রিপশন (5.5" × 8.27")'}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}