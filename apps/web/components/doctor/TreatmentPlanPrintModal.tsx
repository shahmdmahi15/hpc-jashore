// apps/web/components/doctor/TreatmentPlanPrintModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, Download, X, Loader2, HeartPulse } from 'lucide-react';
import { printElementViaIframe, generateElementPdf } from '../../lib/print-pdf';
import { useLanguage } from '../../lib/i18n';

export interface TreatmentPlanItem {
  modalityCode: string;
  modalityName?: string;
  modalityNameBn?: string;
  modalityNameEn?: string;
  durationMinutes?: number;
  sequenceOrder?: number;
  totalSessionsPrescribed?: number;
  completedSessions?: number;
  frequency?: string;
  notes?: string;
  clinicalNote?: string;
  status?: string;
}

export interface TreatmentPlanPrintModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  patient: any;
  plans: TreatmentPlanItem[];
  createdAt?: string | Date;
}

export function parsePlanNotes(notes?: string | null): { sequence?: number; durationMin?: number; clinicalNote?: string } {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        sequence: parsed.sequence,
        durationMin: parsed.durationMin,
        clinicalNote: parsed.clinicalNote || parsed.note || '',
      };
    }
  } catch {
    // not JSON
  }
  return { clinicalNote: notes };
}

export function TreatmentPlanPrintModal({
  open,
  onOpenChange,
  onClose,
  patient,
  plans = [],
  createdAt,
}: TreatmentPlanPrintModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('printing-hpc-plan-a4');
    return () => {
      document.body.classList.remove('printing-hpc-plan-a4');
    };
  }, [open]);

  if (!open) return null;

  const patientName =
    patient?.nameBn ||
    patient?.nameEn ||
    patient?.patientNameBn ||
    patient?.patientNameEn ||
    patient?.name ||
    '—';

  const mrn = patient?.mrn || 'HPC-2026-XXXX';
  const age = patient?.ageYears ? `${patient.ageYears} বছর` : '—';
  const gender = patient?.gender === 'female' ? 'মহিলা' : patient?.gender === 'male' ? 'পুরুষ' : (patient?.gender || '—');
  const phone = patient?.phone || '—';

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const isMobile =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      if (isMobile) {
        document.body.classList.add('printing-hpc-plan-a4');
        window.print();
      } else {
        await printElementViaIframe('hpc-treatment-plan-a4-sheet', {
          pageTitle: `HPC_Therapy_Plan_${mrn}`,
          pageSize: 'A4 portrait',
          pageMargin: '6mm 8mm',
          extraCss: `
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            #hpc-treatment-plan-a4-sheet {
              width: 100% !important;
              max-width: 210mm !important;
              height: calc(297mm - 14mm) !important;
              max-height: calc(297mm - 14mm) !important;
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
            #hpc-treatment-plan-a4-sheet img {
              max-width: 44px !important;
              max-height: 44px !important;
              width: 42px !important;
              height: 42px !important;
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
      const { url } = await generateElementPdf('hpc-treatment-plan-a4-sheet', {
        filename: `HPC_Therapy_Plan_${mrn}_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'portrait',
        format: 'a4',
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
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent
        className="w-screen max-w-full h-screen max-h-screen p-0 m-0 border-0 bg-background/95 backdrop-blur-md rounded-none flex flex-col overflow-hidden z-[200]"
        onClose={handleClose}
      >
        <DialogTitle className="sr-only">{isBn ? 'থেরাপি ট্রিটমেন্ট প্ল্যান' : 'Therapy Treatment Plan'}</DialogTitle>

        {/* Top Sticky Toolbar */}
        <div className="shrink-0 bg-background/95 backdrop-blur-md border-b border-border/80 px-3 sm:px-6 py-2.5 z-20">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <HeartPulse className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight">
                    {isBn ? 'থেরাপি ট্রিটমেন্ট প্ল্যান' : 'Therapy Treatment Plan'}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    MRN: <strong className="text-foreground">{mrn}</strong> · {isBn ? 'রোগী:' : 'Patient:'}{' '}
                    <strong className="text-foreground">{patientName}</strong> ·{' '}
                    {isBn ? `মোট ${plans.length} টি ধাপ` : `Total ${plans.length} items`}
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
                {isBn ? 'বন্ধ' : 'Close'}
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
                    <span>{isBn ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
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
                    <span>{isBn ? 'প্রিন্ট প্ল্যান' : 'Print Plan'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Paper Container Preview for screen: Realistic viewer container */}
        <div className="sheet-report-wrapper flex-1 overflow-y-auto p-3 sm:p-8 bg-zinc-900/10 dark:bg-zinc-950/60 flex justify-start sm:justify-center overflow-x-auto print:!p-0 print:!m-0 print:!block print:!bg-transparent print:!w-full print:!h-auto">
          {/* Printable HPC Custom Sheet: Guaranteed strict A4 dimensions 210mm x 297mm */}
          <div
            id="hpc-treatment-plan-a4-sheet"
            className="sheet-treatment-plan-a4 w-[210mm] min-w-[210mm] max-w-[210mm] min-h-[297mm] h-[297mm] bg-white text-zinc-950 shadow-2xl rounded-sm border-[1.5px] border-emerald-800 p-[8mm_10mm] flex flex-col justify-between mx-auto box-border text-[11px] leading-snug font-sans print:!shadow-none print:!border-[1.5px] print:!border-emerald-800 print:!p-[6mm_8mm] print:!mx-auto print:!my-0 print:!w-[210mm] print:!min-w-[210mm] print:!max-w-[210mm] print:!h-[297mm] print:!max-h-[297mm] print:!overflow-hidden"
            style={{
              fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', var(--font-poppins), system-ui, sans-serif",
              boxSizing: 'border-box',
            }}
          >
            {/* TOP SECTION: Header, Demographics, Sequences */}
            <div>
              {/* Header / Brand Banner (Strictly HPC Branding, Official Center Details) */}
              <div className="border-b-2 border-emerald-800 pb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src="/hpclogo-transparent.png"
                    alt="HPC Logo"
                    width={52}
                    height={52}
                    className="w-13 h-13 object-contain shrink-0 mt-0.5"
                    style={{ width: '48px', height: '48px', maxWidth: '52px', maxHeight: '52px', objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <h1 className="text-lg font-black text-emerald-800 leading-tight tracking-tight uppercase">
                      HEALTH AND PAIN CARE CENTER
                    </h1>
                    <h2 className="text-sm font-bold text-zinc-800 leading-tight">
                      এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                    </h2>
                    <p className="text-[10px] text-zinc-600 mt-1 leading-snug">
                      চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                    </p>
                    <p className="text-[9.5px] text-zinc-500 font-mono">
                      হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpc@toufiquzzaman.com
                    </p>
                  </div>
                </div>

                {/* Right Badge & Meta */}
                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-xs border border-emerald-300 uppercase">
                    THERAPY PLAN (A4)
                  </span>
                  <div className="text-[10.5px] text-zinc-700 font-medium mt-1.5">
                    তৈরির তারিখ ও সময়:
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-900">
                    {dateStr}
                  </div>
                </div>
              </div>

              {/* Patient Info Strip */}
              <div className="my-3 grid grid-cols-4 gap-2 text-xs bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                <div>
                  <span className="text-zinc-500">{isBn ? 'রোগীর নাম:' : 'Patient Name:'}</span>{' '}
                  <strong className="text-zinc-900">{patientName}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">{isBn ? 'এমআরএন:' : 'MRN:'}</span>{' '}
                  <strong className="text-emerald-800 font-mono">{mrn}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">{isBn ? 'বয়স ও লিঙ্গ:' : 'Age & Gender:'}</span>{' '}
                  <strong className="text-zinc-900">
                    {age} · {gender}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">{isBn ? 'মোবাইল নম্বর:' : 'Mobile:'}</span>{' '}
                  <strong className="font-mono text-zinc-900">{phone}</strong>
                </div>
              </div>

              {/* Sequenced Modalities Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <HeartPulse className="size-4 text-emerald-700" />
                    <span>প্রেসক্রাইবকৃত ফিজিওথেরাপি সিকোয়েন্স ও সময়সূচী:</span>
                  </h4>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    মোট {plans.length} টি থেরাপি ধাপ নির্ধারিত
                  </span>
                </div>

                <table className="w-full text-xs border border-zinc-300 border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 text-zinc-900 font-bold">
                      <th className="border border-zinc-300 p-2 text-center w-16">ক্রম</th>
                      <th className="border border-zinc-300 p-2 text-left">{isBn ? 'থেরাপি মডালিটি' : 'Therapy Modality'}</th>
                      <th className="border border-zinc-300 p-2 text-center w-28">নির্ধারিত সময়</th>
                      <th className="border border-zinc-300 p-2 text-center w-28">মোট সেশন</th>
                      <th className="border border-zinc-300 p-2 text-center w-32">ফ্রিকোয়েন্সি</th>
                      <th className="border border-zinc-300 p-2 text-left">ক্লিনিক্যাল নির্দেশিকা ও প্যারামিটার</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans && plans.length > 0 ? (
                      plans.map((p, idx) => {
                        const parsedNotes = parsePlanNotes(p.notes || p.clinicalNote);
                        const duration = p.durationMinutes || parsedNotes.durationMin || 15;
                        const noteText = parsedNotes.clinicalNote || p.clinicalNote || (p.notes && !p.notes.startsWith('{') ? p.notes : '') || '—';
                        const seqNumber = p.sequenceOrder || parsedNotes.sequence || idx + 1;
                        const modalityDisplay = p.modalityName || p.modalityNameEn || p.modalityCode;
                        const modalityBn = p.modalityNameBn || '';

                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/70'}>
                            <td className="border border-zinc-300 p-2 text-center font-mono font-bold text-emerald-800">
                              ধাপ {seqNumber}
                            </td>
                            <td className="border border-zinc-300 p-2 font-bold text-zinc-900">
                              <div>{modalityDisplay} ({p.modalityCode})</div>
                              {modalityBn && <div className="text-[10px] text-zinc-500 font-normal">{modalityBn}</div>}
                            </td>
                            <td className="border border-zinc-300 p-2 text-center font-bold text-emerald-700">
                              {duration} মিনিট
                            </td>
                            <td className="border border-zinc-300 p-2 text-center font-bold">
                              {p.totalSessionsPrescribed || 10} সেশন
                            </td>
                            <td className="border border-zinc-300 p-2 text-center">
                              {p.frequency === 'daily'
                                ? 'প্রতিদিন'
                                : p.frequency === 'alternate_days'
                                ? 'একদিন পরপর'
                                : p.frequency === 'weekly'
                                ? 'সাপ্তাহিক'
                                : p.frequency === 'twice_weekly'
                                ? 'সপ্তাহে ২ দিন'
                                : p.frequency === 'thrice_weekly'
                                ? 'সপ্তাহে ৩ দিন'
                                : (p.frequency || 'প্রতিদিন')}
                            </td>
                            <td className="border border-zinc-300 p-2 text-zinc-700">
                              {noteText}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-zinc-300 p-4 text-center text-zinc-500 italic">
                          কোনো থেরাপি মডালিটি পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* General Instructions Box */}
              <div className="mt-4 p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1.5">
                <div className="font-bold text-zinc-800 text-[11.5px]">হ্যান্ডলার ও রোগীর জন্য সাধারণ নির্দেশনা:</div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-zinc-700">
                  <li>উপরোল্লিখিত ক্রমানুসারে (১ম, ২য়, ৩য়...) থেরাপি মডালিটি প্রয়োগ করতে হবে।</li>
                  <li>প্রতিটি সেশনের নির্ধারিত সময়সীমা যথাযথভাবে বজায় রাখতে হবে।</li>
                  <li>রোগীর কোনো প্রকার অস্বস্তি, অতিরিক্ত উত্তাপ বা তীব্র ব্যথা অনুভূত হলে তাৎক্ষণিক মেশিন বন্ধ করে থেরাপিস্টকে অবহিত করুন।</li>
                  <li>চিকিৎসকের পরামর্শ ছাড়া কোনো মডালিটি পরিবর্তন বা সময়সীমা হ্রাস-বৃদ্ধি করা যাবে না।</li>
                </ul>
              </div>
            </div>

            {/* BOTTOM SECTION: Signatures & Clinic Motto */}
            <div className="pt-8 border-t border-zinc-300 mt-auto">
              <div className="flex justify-between items-end text-xs text-zinc-700 pb-3">
                <div className="border-t border-dashed border-zinc-600 pt-1.5 w-56 text-center">
                  <div className="font-bold text-zinc-900">হ্যান্ডলার / থেরাপিস্ট স্বাক্ষর</div>
                  <div className="text-[10px] text-zinc-500">Therapy Hall Staff Signature</div>
                </div>

                <div className="border-t border-dashed border-zinc-600 pt-1.5 w-56 text-center">
                  <div className="font-bold text-zinc-900">অনুমোদিত স্বাক্ষর</div>
                  <div className="text-[10px] text-zinc-500">Authorized Physiotherapist Signature</div>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-2 flex items-center justify-between text-[9.5px] text-zinc-500 font-mono">
                <div>Health and Pain Care Center · Chachra Dalmill More, Jashore</div>
                <div className="font-semibold text-emerald-800">এইচপিসি - সুস্থ ও ব্যথামুক্ত জীবনের অঙ্গীকার</div>
                <div>Hotline: +880 1515-615188</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export default TreatmentPlanPrintModal;
