// apps/web/components/PrescriptionPrintModal.tsx
'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, FileText } from 'lucide-react';

export interface PrescriptionData {
  id: string;
  rxNumber?: string;
  patient: {
    id?: string;
    mrn: string;
    nameEn: string;
    nameBn?: string;
    ageYears?: number;
    gender: string;
    bloodGroup?: string;
    phone?: string;
    address?: string;
  };
  doctor?: {
    id?: string;
    name?: string;
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
    pulse?: string;
  };
  medicines: Array<{
    brandName: string;
    genericName?: string;
    dosage: string;
    duration: string;
    instructions?: string;
  }>;
  modalities?: Array<{
    modalityName: string;
    sessionsPrescribed?: number;
    frequency?: string;
    notes?: string;
  }>;
  advice?: string;
  nextVisitDate?: string;
  createdAt: string;
}

interface PrescriptionPrintModalProps {
  prescription: PrescriptionData | null;
  onClose: () => void;
}

export default function PrescriptionPrintModal({
  prescription,
  onClose,
}: PrescriptionPrintModalProps) {
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-hpc-prescription');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-hpc-prescription');
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-hpc-prescription');
    };
  }, []);

  if (!prescription) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-hpc-prescription');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const rxDate = new Date(prescription.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const rxNumber = prescription.rxNumber || `RX-${prescription.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={!!prescription} onOpenChange={(op) => !op && onClose()}>
      <DialogContent
        className="max-w-[620px] max-h-[96vh] overflow-y-auto p-3 sm:p-5 bg-background border-border"
        onClose={onClose}
      >
        <DialogHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>ওষুধ প্রেসক্রিপশন প্রিন্ট প্রিভিউ (5.50" × 8.27")</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">
                Rx No: <strong className="text-foreground">{rxNumber}</strong> · Patient MRN: <strong className="text-foreground">{prescription.patient.mrn}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                HPC Custom Paper: 5.50" × 8.27"
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scoped CSS for strict 5.50in x 8.27in paper isolation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: 5.50in 8.27in;
            margin: 4mm 5mm;
          }
          @media print {
            body.printing-hpc-prescription {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body.printing-hpc-prescription > *:not([data-radix-portal]) {
              display: none !important;
            }
            body.printing-hpc-prescription [data-radix-portal] {
              position: static !important;
              display: block !important;
            }
            body.printing-hpc-prescription [data-radix-portal] > * {
              position: static !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            body.printing-hpc-prescription [role="dialog"] {
              position: static !important;
              transform: none !important;
              max-width: none !important;
              width: 100% !important;
              height: auto !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            body.printing-hpc-prescription [role="dialog"] > *:not(#hpc-prescription-custom-sheet) {
              display: none !important;
            }
            #hpc-prescription-custom-sheet {
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              width: 5.50in !important;
              max-width: 5.50in !important;
              min-height: calc(8.27in - 8mm) !important;
              height: calc(8.27in - 8mm) !important;
              margin: 0 auto !important;
              padding: 3mm 4mm !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              border: 1px solid #d4d4d8 !important;
              border-radius: 4px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
            }
            #hpc-prescription-custom-sheet * {
              color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
        ` }} />

        {/* Printable Prescription Body: Exactly 5.50in x 8.27in ratio */}
        <div
          id="hpc-prescription-custom-sheet"
          className="prescription-sheet-container bg-white text-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-300 shadow-md mx-auto my-1 w-full font-sans flex flex-col justify-between"
          style={{
            maxWidth: '5.5in',
            minHeight: '8.27in',
          }}
        >
          {/* TOP SECTION: Header, Demographics, Diagnosis */}
          <div>
            {/* Header / Brand Banner (Strictly HPC Branding, NO Doctor Name) */}
            <div className="border-b-2 border-emerald-600 pb-2 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <img
                  src="/hpclogo-transparent.png"
                  alt="HPC Logo"
                  width={38}
                  height={38}
                  className="w-9 h-9 object-contain shrink-0 mt-0.5"
                  style={{ width: '36px', height: '36px', maxWidth: '38px', maxHeight: '38px', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="text-sm font-black text-emerald-800 leading-tight tracking-tight uppercase">
                    HEALTH AND PAIN CARE CENTER
                  </h1>
                  <h2 className="text-[11px] font-bold text-zinc-800 leading-tight">
                    এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                  </h2>
                  <p className="text-[8.5px] text-zinc-600 mt-0.5 leading-snug">
                    চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                  </p>
                  <p className="text-[8px] text-zinc-500 font-mono">
                    হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpc@toufiquzzaman.com
                  </p>
                </div>
              </div>

              {/* Rx Badge & Meta */}
              <div className="text-right text-[10px] shrink-0">
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[9px] border border-emerald-300">
                  PRESCRIPTION
                </span>
                <div className="text-[9px] font-mono font-bold text-zinc-800 mt-1">
                  {rxNumber}
                </div>
                <div className="text-[8.5px] text-zinc-600 font-mono mt-0.5">
                  তারিখ: {rxDate}
                </div>
              </div>
            </div>

            {/* Patient Demographics Strip */}
            <div className="my-2 p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 grid grid-cols-4 gap-1.5 text-[9px]">
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
                <strong className="font-mono text-emerald-800">{prescription.patient.mrn}</strong>
              </div>
              <div className="text-right">
                <span className="text-zinc-500">Mobile:</span>{' '}
                <strong className="font-mono">{prescription.patient.phone || '—'}</strong>
              </div>
            </div>

            {/* Vitals & Provisional Diagnosis Banner */}
            <div className="mb-2 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-between text-[9.5px]">
              <div>
                <span className="text-zinc-600 font-medium">রোগের বিবরণ / Diagnosis:</span>{' '}
                <strong className="text-emerald-800 font-bold">
                  {prescription.clinicalNotes?.diagnosis || 'Musculoskeletal Pain Disorder / ব্যথাজনিত সমস্যা'}
                </strong>
              </div>
              <div className="flex items-center gap-2 font-mono text-[8.5px]">
                {prescription.clinicalNotes?.bp && (
                  <span>BP: <strong>{prescription.clinicalNotes.bp}</strong></span>
                )}
                {prescription.clinicalNotes?.weight && (
                  <span>Wt: <strong>{prescription.clinicalNotes.weight}kg</strong></span>
                )}
                {prescription.clinicalNotes?.painScore !== undefined && (
                  <span className="font-bold text-amber-700">
                    VAS: {prescription.clinicalNotes.painScore}/10
                  </span>
                )}
              </div>
            </div>

            {/* Main Clinical Body: Left (Complaints & Advice) & Right (Strictly Medicines) */}
            <div className="grid grid-cols-12 gap-2.5 min-h-[380px] pt-1 border-t border-zinc-200 text-[9.5px]">
              {/* Left Column: Complaints, Advice & Follow-up (4 / 12) */}
              <div className="col-span-4 border-r border-zinc-200 pr-2 space-y-2.5">
                {prescription.clinicalNotes?.chiefComplaints && (
                  <div>
                    <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-[8.5px] mb-0.5">
                      Chief Complaints / উপসর্গ:
                    </h3>
                    <p className="text-zinc-800 leading-snug text-[9px]">
                      {prescription.clinicalNotes.chiefComplaints}
                    </p>
                  </div>
                )}

                {/* Clinical Advice */}
                {prescription.advice && (
                  <div className="pt-1.5 border-t border-zinc-200">
                    <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-[8.5px] mb-0.5">
                      Advice / সাধারণ উপদেশ:
                    </h3>
                    <p className="text-zinc-800 whitespace-pre-line leading-relaxed text-[8.5px]">
                      {prescription.advice}
                    </p>
                  </div>
                )}

                {/* Follow-up Date */}
                {prescription.nextVisitDate && (
                  <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[8.5px]">
                    <strong>পরবর্তী সাক্ষাত:</strong> {prescription.nextVisitDate}
                  </div>
                )}
              </div>

              {/* Right Column: ℞ Medicines Only (8 / 12) */}
              <div className="col-span-8 pl-1">
                <div className="text-xl font-serif font-black text-emerald-700 leading-none mb-1">
                  ℞
                </div>

                <div className="space-y-2">
                  {prescription.medicines && prescription.medicines.length > 0 ? (
                    prescription.medicines.map((med, idx) => (
                      <div key={idx} className="pb-1.5 border-b border-zinc-100 last:border-0">
                        <div className="flex items-baseline justify-between">
                          <span className="font-extrabold text-zinc-900 text-[10px]">
                            {idx + 1}. {med.brandName}
                          </span>
                          <span className="text-[8.5px] font-mono text-zinc-500 font-semibold">
                            {med.duration}
                          </span>
                        </div>
                        {med.genericName && (
                          <div className="text-[8px] text-zinc-500 font-mono">
                            ({med.genericName})
                          </div>
                        )}
                        <div className="text-emerald-700 font-bold text-[9.5px] mt-0.5 flex items-center gap-1.5">
                          <span>{med.dosage}</span>
                          {med.instructions && (
                            <>
                              <span className="text-zinc-400 font-normal">|</span>
                              <span className="text-zinc-700 font-medium text-[9px]">
                                {med.instructions}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 italic py-4 text-center">
                      কোনো ওষুধ প্রেসক্রাইব করা হয়নি। শুধুমাত্র ফিজিক্যাল রিহ্যাবিলিটেশন ও থেরাপিউটিক গাইডলাইন অনুসরণ করুন।
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Footer, Notice & Signature Space (NO Doctor Name) */}
          <div className="pt-2 border-t border-zinc-300 flex items-end justify-between text-[8px] mt-auto">
            <div>
              <div className="font-mono text-[7.5px] text-zinc-600">
                Rx ID: {rxNumber} · MRN: {prescription.patient.mrn}
              </div>
              <div className="text-zinc-500 text-[7.5px] mt-0.5">
                সেন্টারের হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpc@toufiquzzaman.com
              </div>
            </div>

            <div className="text-center w-40">
              <div className="h-7"></div>
              <div className="border-t border-dashed border-zinc-800 pt-0.5 font-bold text-zinc-800 text-[8.5px]">
                অনুমোদিত স্বাক্ষর / Authorized Signature
              </div>
              <div className="text-[7px] text-zinc-500">Health &amp; Pain Care Center, Jashore</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
            বন্ধ করুন (Close)
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-500/20 text-xs"
          >
            <Printer className="size-4" />
            <span>প্রিন্ট প্রেসক্রিপশন (5.50" × 8.27")</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
