// apps/web/components/PrescriptionPrintModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, FileText, Download, X, Loader2 } from 'lucide-react';
import { printElementViaIframe, generateElementPdf } from '../lib/print-pdf';

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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PrescriptionPrintModal({
  prescription,
  onClose,
  open,
  onOpenChange,
}: PrescriptionPrintModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const isOpen = open !== undefined ? open : !!prescription;

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('printing-hpc-prescription');
    return () => {
      document.body.classList.remove('printing-hpc-prescription');
    };
  }, [isOpen]);

  if (!isOpen || !prescription) return null;

  const rxDate = new Date(prescription.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const rxNumber = prescription.rxNumber || `RX-${prescription.id.slice(0, 8).toUpperCase()}`;
  const mrn = prescription.patient.mrn || 'HPC-2026-XXXX';

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const isMobile =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      if (isMobile) {
        document.body.classList.add('printing-hpc-prescription');
        window.print();
      } else {
        await printElementViaIframe('hpc-prescription-custom-sheet', {
          pageTitle: `HPC_Prescription_${rxNumber}`,
          pageSize: '5.5in 8.27in',
          pageMargin: '4mm 5mm',
          extraCss: `
            @page {
              size: 5.5in 8.27in;
              margin: 4mm 5mm;
            }
            #hpc-prescription-custom-sheet {
              width: 100% !important;
              max-width: 5.5in !important;
              height: calc(8.27in - 8mm) !important;
              max-height: calc(8.27in - 8mm) !important;
              margin: 0 auto !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
              border: 1.5px solid #065f46 !important;
              border-radius: 4px !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            #hpc-prescription-custom-sheet img {
              max-width: 38px !important;
              max-height: 38px !important;
              width: 34px !important;
              height: 34px !important;
              object-fit: contain !important;
              display: block !important;
            }
          `,
        });
      }
    } catch {
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { url } = await generateElementPdf('hpc-prescription-custom-sheet', {
        filename: `HPC_Prescription_${rxNumber}.pdf`,
        orientation: 'portrait',
        format: [140, 210],
        scale: 2.5,
      });

      const isMobile =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      if (isMobile && url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const patientName =
    prescription.patient.nameBn ||
    prescription.patient.nameEn ||
    '—';

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent
        className="w-screen max-w-full h-screen max-h-screen p-0 m-0 border-0 bg-background/95 backdrop-blur-md rounded-none flex flex-col overflow-hidden z-[200]"
        onClose={handleClose}
      >
        <DialogTitle className="sr-only">ওষুধ প্রেসক্রিপশন প্রিন্ট প্রিভিউ (5.50" × 8.27")</DialogTitle>

        {/* Top Sticky Toolbar */}
        <div className="shrink-0 bg-background/95 backdrop-blur-md border-b border-border/80 px-3 sm:px-6 py-2.5 z-20">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                    ওষুধ প্রেসক্রিপশন (Medicine Prescription)
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Rx No: <strong className="text-foreground">{rxNumber}</strong> · MRN:{' '}
                    <strong className="text-foreground">{mrn}</strong> · রোগী:{' '}
                    <strong className="text-foreground">{patientName}</strong>
                  </p>
                </div>
              </div>

              {/* Close Button on Mobile */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="sm:hidden text-xs h-8 px-2 border border-border/60 text-foreground hover:bg-muted cursor-pointer shrink-0"
              >
                <X className="size-3.5 mr-1" />
                বন্ধ
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="hidden sm:inline-flex text-xs h-8 border-border text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-3.5 mr-1" />
                বন্ধ করুন
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex-1 sm:flex-initial text-[11px] sm:text-xs h-8 border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold gap-1.5 cursor-pointer"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                    <span>পিডিএফ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>HPC সাইজ পিডিএফ</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex-1 sm:flex-initial text-[11px] sm:text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20 gap-1.5 cursor-pointer"
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>প্রিন্টার লোড...</span>
                  </>
                ) : (
                  <>
                    <Printer className="size-3.5" />
                    <span>প্রিন্ট প্রেসক্রিপশন (5.50" × 8.27")</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Paper Container Preview for screen: Realistic viewer container */}
        <div className="sheet-report-wrapper flex-1 overflow-y-auto p-3 sm:p-8 bg-zinc-900/10 dark:bg-zinc-950/60 flex justify-start sm:justify-center overflow-x-auto print:!p-0 print:!m-0 print:!block print:!bg-transparent print:!w-full print:!h-auto">
          {/* Printable HPC Custom Sheet: Guaranteed strict dimensions 140mm x 210mm (5.50" x 8.27") */}
          <div
            id="hpc-prescription-custom-sheet"
            className="sheet-prescription-hpc w-[140mm] min-w-[140mm] max-w-[140mm] min-h-[210mm] h-[210mm] bg-white text-zinc-950 shadow-2xl rounded-sm border-[1.5px] border-emerald-800 p-[4mm_5mm] flex flex-col justify-between mx-auto box-border text-[9.5px] leading-snug font-sans print:!shadow-none print:!border-[1.5px] print:!border-emerald-800 print:!p-[4mm_5mm] print:!mx-auto print:!my-0 print:!w-[140mm] print:!min-w-[140mm] print:!max-w-[140mm] print:!h-[210mm] print:!max-h-[210mm] print:!overflow-hidden"
            style={{
              fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', var(--font-poppins), system-ui, sans-serif",
              boxSizing: 'border-box',
            }}
          >
            {/* TOP SECTION: Header, Demographics, Diagnosis, Medicines */}
            <div>
              {/* Header / Official HPC Branding (Strictly Center Branding, NO Doctor Name) */}
              <div className="border-b-2 border-emerald-800 pb-1.5 flex items-start justify-between gap-2">
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
              <div className="my-1.5 p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 grid grid-cols-4 gap-1.5 text-[9px]">
                <div>
                  <span className="text-zinc-500">Patient:</span>{' '}
                  <strong className="text-zinc-900">{prescription.patient.nameEn}</strong>
                  {prescription.patient.nameBn && ` (${prescription.patient.nameBn})`}
                </div>
                <div>
                  <span className="text-zinc-500">Age/Sex:</span>{' '}
                  <strong className="text-zinc-900">
                    {prescription.patient.ageYears ? `${prescription.patient.ageYears}Y` : '-'}{' '}
                    / {prescription.patient.gender === 'female' ? 'Female' : 'Male'}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">MRN:</span>{' '}
                  <strong className="font-mono text-emerald-800">{mrn}</strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">Mobile:</span>{' '}
                  <strong className="font-mono text-zinc-900">{prescription.patient.phone || '—'}</strong>
                </div>
              </div>

              {/* Vitals & Provisional Diagnosis Banner */}
              <div className="mb-2 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-between text-[9px]">
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

              {/* Main Clinical Body: Left (Complaints & Advice) & Right (Strictly ℞ Medicines) */}
              <div className="grid grid-cols-12 gap-2.5 min-h-[360px] pt-1 border-t border-zinc-200 text-[9.5px]">
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

            {/* BOTTOM SECTION: Footer, Notice & Signature Space (Strictly HPC Branding, NO Doctor Name) */}
            <div className="pt-2 border-t border-zinc-300 flex items-end justify-between text-[8px] mt-auto">
              <div>
                <div className="font-mono text-[7.5px] text-zinc-600">
                  Rx ID: {rxNumber} · MRN: {mrn}
                </div>
                <div className="text-zinc-500 text-[7.5px] mt-0.5">
                  সেন্টারের হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpc@toufiquzzaman.com
                </div>
                <div className="text-emerald-800 font-semibold text-[7.5px] mt-0.5">
                  এইচপিসি - সুস্থ ও ব্যথামুক্ত জীবনের অঙ্গীকার
                </div>
              </div>

              <div className="text-center w-44">
                <div className="h-6"></div>
                <div className="border-t border-dashed border-zinc-800 pt-0.5 font-bold text-zinc-800 text-[8.5px]">
                  অনুমোদিত স্বাক্ষর / Authorized Signature
                </div>
                <div className="text-[7px] text-zinc-500">Health &amp; Pain Care Center, Jashore</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
