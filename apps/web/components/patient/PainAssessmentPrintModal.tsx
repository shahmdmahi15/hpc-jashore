// apps/web/components/patient/PainAssessmentPrintModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Printer,
  FileText,
  X,
  Loader2,
  Download,
  Languages,
} from 'lucide-react';
import { printElementViaIframe, generateElementPdf } from '@/lib/print-pdf';
import { useLanguage } from '@/lib/i18n';

export interface PainAssessmentData {
  id?: string;
  fileNumber?: string;
  assessmentFileNumber?: string;
  mrn?: string;
  patientId?: string;
  assessmentDate?: string;
  date?: string;
  name?: string;
  nameEn?: string;
  nameBn?: string;
  age?: string | number;
  gender?: 'male' | 'female' | string;
  idNo?: string;
  occupation?: string;
  address?: string;
  mobile?: string;

  // Section 2: Pain Details
  painAreas?: string[];
  painAreaOthers?: string;
  side?: 'Right' | 'Left' | 'Both' | string;
  duration?: string;
  painTypes?: string[];

  // Section 3: Pain Scale
  vasScore?: number;
  painIncreasesWith?: string[];
  painReducesWith?: string[];

  // Section 4: History
  injuryAccident?: 'yes' | 'no' | string;
  injuryDetails?: string;
  postureAdvice?: 'yes' | 'no' | string;
  postureHabits?: string;
  surgeryHistory?: 'yes' | 'no' | string;
  surgeryDetails?: string;
  previousTreatment?: string[];
  previousTreatmentDetails?: string;

  // Section 5: Functional Limitation
  functionalLimitations?: string[];
  functionalNotes?: string;

  // Section 6: Physical Examination
  rom?: 'Normal' | 'Restricted' | string;
  muscleSpasm?: 'yes' | 'no' | string;
  tenderness?: 'yes' | 'no' | string;
  swelling?: 'yes' | 'no' | string;
  physicalExamNotes?: string;

  // Section 7: Physiotherapy Diagnosis
  diagnosis?: string;

  // Section 8: Treatment Plan
  treatmentPlans?: string[];
  treatmentPlanNotes?: string;
  prescribedSessions?: string;

  // Section 9: Home Advice
  exerciseExplained?: 'yes' | 'no' | string;
  homePostureAdvice?: 'yes' | 'no' | string;
  homeAdviceNotes?: string;

  // Section 10: Follow-up & Progress
  painScaleAfterTreatment?: string | number;
  improvement?: string;
  therapistSignature?: string;
  doctorName?: string;
}

export interface PainAssessmentPrintModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  data?: any | null;
  patient?: any | null;
  file?: any | null;
}

function formatDate(d?: string | Date | null): string {
  if (!d) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) {
    const match = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return String(d);
  }
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Print-resilient checkbox: Works 100% reliably whether "Background graphics"
 * is checked or unchecked in browser print settings.
 */
function PrintCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-2.5 my-0.5 text-[10.5px] leading-tight font-medium text-black shrink-0">
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 border border-zinc-900 rounded-[2px] text-[10px] font-black leading-none bg-white text-black shrink-0"
        style={{ borderWidth: '1.2px' }}
      >
        {checked ? '✓' : ''}
      </span>
      <span className="select-none text-zinc-900 font-medium">{label}</span>
    </span>
  );
}

export function PainAssessmentPrintModal({
  open,
  onOpenChange,
  onClose,
  data,
  patient: propPatient,
  file,
}: PainAssessmentPrintModalProps) {
  const { language } = useLanguage();
  const [printLang, setPrintLang] = useState<'en' | 'bn'>('en'); // Default to clinical English standard matching official form, with instant toggle
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (open) {
      // Respect default clinical sheet preference (or switchable)
      setPrintLang(language === 'bn' ? 'bn' : 'en');
    }
  }, [open, language]);

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  if (!open) return null;

  const raw = data || file || {};
  const pat = propPatient || raw.patient || {};

  const fileNo = raw.fileNumber || raw.assessmentFileNumber || 'PAF-2026-XXXX';
  const mrn = raw.mrn || raw.idNo || pat.mrn || 'HPC-2026-XXXX';
  const patientName = raw.name || raw.nameEn || pat.nameEn || pat.name || '—';
  const patientNameBn = raw.nameBn || pat.nameBn || patientName;
  const displayName = printLang === 'bn' ? patientNameBn : patientName;

  const age = raw.age || pat.ageYears || pat.age || '—';
  const gender = (raw.gender || pat.gender || 'male').toLowerCase();
  const occupation = raw.occupation || pat.occupation || '—';
  const address = raw.address || pat.address || '—';
  const mobile = raw.mobile || raw.phone || pat.phone || '—';
  const assessmentDate = raw.assessmentDate || raw.date || new Date().toISOString().split('T')[0];

  const painAreas: string[] = Array.isArray(raw.painAreas) ? raw.painAreas : [];
  const painAreaOthers = raw.painAreaOthers || '';
  const side = raw.side || '';
  const duration = raw.duration || '';
  const painTypes: string[] = Array.isArray(raw.painTypes) ? raw.painTypes : [];

  const vasScore = typeof raw.vasScore === 'number' ? raw.vasScore : (Number(raw.vasScore) || 0);
  const painIncreasesWith: string[] = Array.isArray(raw.painIncreasesWith) ? raw.painIncreasesWith : [];
  const painReducesWith: string[] = Array.isArray(raw.painReducesWith) ? raw.painReducesWith : [];

  const injuryAccident = raw.injuryAccident || 'no';
  const postureAdvice = raw.postureAdvice || 'no';
  const surgeryHistory = raw.surgeryHistory || 'no';
  const previousTreatment: string[] = Array.isArray(raw.previousTreatment) ? raw.previousTreatment : [];

  const functionalLimitations: string[] = Array.isArray(raw.functionalLimitations) ? raw.functionalLimitations : [];

  const rom = raw.rom || 'Normal';
  const muscleSpasm = raw.muscleSpasm || 'no';
  const tenderness = raw.tenderness || 'no';
  const swelling = raw.swelling || 'no';

  const diagnosis = raw.diagnosis || '—';
  const treatmentPlans: string[] = Array.isArray(raw.treatmentPlans) ? raw.treatmentPlans : [];
  const prescribedSessions = raw.prescribedSessions || '';

  const exerciseExplained = raw.exerciseExplained || 'yes';
  const homePostureAdvice = raw.homePostureAdvice || 'yes';
  const homeAdviceNotes = raw.homeAdviceNotes || '';

  const painScaleAfterTreatment = raw.painScaleAfterTreatment !== undefined && raw.painScaleAfterTreatment !== null && raw.painScaleAfterTreatment !== ''
    ? String(raw.painScaleAfterTreatment)
    : '—';
  const improvement = raw.improvement || '';
  const therapistSignature = raw.therapistSignature || raw.doctorName || '';

  const isBn = printLang === 'bn';

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const isMobile =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      if (isMobile) {
        document.body.classList.add('printing-pain-assessment-a4');
        window.print();
      } else {
        await printElementViaIframe('hpc-pain-assessment-a4-sheet', {
          pageTitle: `HPC_Assessment_${fileNo}_${mrn}`,
          pageSize: 'A4 portrait',
          pageMargin: '5mm 6mm',
        });
      }
    } catch {
      document.body.classList.add('printing-pain-assessment-a4');
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { url } = await generateElementPdf('hpc-pain-assessment-a4-sheet', {
        filename: `HPC_Assessment_${fileNo}_${mrn}.pdf`,
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
      console.error('Failed to export Assessment PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(op: boolean) => !op && handleClose()}>
      <DialogContent
        className="max-w-4xl max-h-[96vh] overflow-y-auto p-0 gap-0 border-border bg-card text-foreground shadow-2xl backdrop-blur-xl print:!bg-transparent print:!border-none print:!shadow-none print:!p-0 print:!m-0 print:!max-w-none print:!max-h-none print:!overflow-visible print:!backdrop-blur-none"
      >
        {/* Screen Toolbar (strictly hidden during print) */}
        <div className="sticky top-0 z-20 px-3 sm:px-6 py-2.5 sm:py-3 bg-card/95 backdrop-blur-md border-b border-border print:hidden space-y-2 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {isBn ? 'পেইন ফিজিওথেরাপি অ্যাসেসমেন্ট ফাইল — A4 প্রিন্ট' : 'Pain Physiotherapy Assessment File — A4 Print'}
                  </DialogTitle>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden xs:block">
                    {isBn ? 'একক A4 সাইজ পেপারে নিখুঁত অফিশিয়াল প্রিন্ট' : 'Guaranteed Single A4 Sheet Official Clinical Record'}
                  </p>
                </div>
              </div>

              {/* Mobile Close Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="sm:hidden text-xs h-7 px-2 border border-border/60 text-foreground hover:bg-muted cursor-pointer shrink-0"
              >
                <X className="size-3.5 mr-1" />
                {isBn ? 'বন্ধ' : 'Close'}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Language Switcher */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrintLang(printLang === 'bn' ? 'en' : 'bn')}
                className="text-[11px] sm:text-xs h-8 border-border text-foreground hover:bg-muted cursor-pointer gap-1 px-2.5 font-medium"
                title={isBn ? 'Switch to English Clinical Sheet' : 'বাংলায় পরিবর্তন করুন'}
              >
                <Languages className="size-3.5 text-emerald-600" />
                <span>{printLang === 'bn' ? 'English Sheet' : 'বাংলা শিট'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="hidden sm:inline-flex text-xs h-8 border-border text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-3.5 mr-1" />
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex-1 sm:flex-initial text-[11px] sm:text-xs h-8 border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold gap-1.5 cursor-pointer shadow-2xs"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                    <span>{isBn ? 'পিডিএফ হচ্ছে...' : 'Exporting...'}</span>
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
                    <span>{isBn ? 'প্রিন্টার লোড...' : 'Printing...'}</span>
                  </>
                ) : (
                  <>
                    <Printer className="size-3.5" />
                    <span>{isBn ? 'প্রিন্ট করুন' : 'Print Sheet'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Paper Container Preview */}
        <div className="sheet-report-wrapper p-2 sm:p-6 bg-muted/40 flex justify-start sm:justify-center overflow-x-auto print:!p-0 print:!m-0 print:!block print:!bg-transparent print:!w-full print:!h-auto">
          {/* Printable A4 Sheet: Guaranteed to fit exactly 1 Single A4 page centered */}
          <div
            id="hpc-pain-assessment-a4-sheet"
            className="sheet-report-a4 bg-white text-black shadow-2xl rounded-sm p-[6mm_8mm] w-[210mm] max-w-[210mm] min-h-[297mm] text-[10px] leading-snug font-sans mx-auto flex flex-col justify-between border-[1.5px] border-zinc-900 relative print:!shadow-none print:!border-[1.5px] print:!border-zinc-900 print:!p-[4mm_5mm] print:!mx-auto print:!my-0 print:!w-[195mm] print:!max-w-[195mm] print:!h-[285mm] print:!max-h-[285mm] print:!overflow-hidden"
            style={{
              fontFamily: isBn
                ? "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif"
                : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              boxSizing: 'border-box',
            }}
          >
            {/* Background Watermark Logo (identical to provided clinical sheet) */}
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.06] select-none"
              style={{ zIndex: 0 }}
            >
              <img
                src="/hpclogo-transparent.png"
                alt="HPC Watermark"
                className="w-72 h-72 object-contain"
                style={{ width: '280px', height: '280px' }}
              />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                {/* 1. TOP HEADER */}
                <div className="text-center pb-2 mb-2 border-b-2 border-emerald-800">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 relative shrink-0">
                      <img
                        src="/hpclogo-transparent.png"
                        alt="HPC Logo"
                        className="w-12 h-12 object-contain"
                        style={{ width: '46px', height: '46px', objectFit: 'contain' }}
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 text-center px-2">
                      <h1 className="text-[19px] leading-tight font-black tracking-wide text-emerald-800 uppercase">
                        HEALTH AND PAIN CARE CENTER
                      </h1>
                      <div className="inline-flex items-center gap-1.5 mt-0.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-700/40">
                        <span className="text-[12px] font-black tracking-wider text-zinc-900 uppercase">
                          📋 {isBn ? 'পেইন ফিজিওথেরাপি অ্যাসেসমেন্ট' : 'PAIN PHYSIOTHERAPY ASSESSMENT'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-[9px] leading-tight text-zinc-700 font-mono">
                      <div className="font-bold text-zinc-900">{fileNo}</div>
                      <div>{mrn}</div>
                    </div>
                  </div>
                </div>

                {/* 2. DEMOGRAPHICS GRID TABLE (Section 1) */}
                <div className="border border-zinc-900 text-[10.5px] leading-snug mb-2 bg-white/90">
                  {/* Row 1 */}
                  <div className="grid grid-cols-12 border-b border-zinc-900 divide-x divide-zinc-900">
                    <div className="col-span-5 px-2 py-1 flex items-baseline gap-1">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'নাম:' : 'Name:'}</span>
                      <span className="font-semibold text-zinc-900 truncate">{displayName}</span>
                    </div>
                    <div className="col-span-3 px-2 py-1 flex items-baseline gap-1">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'বয়স:' : 'Age:'}</span>
                      <span className="font-semibold text-zinc-900">{age} {isBn && age !== '—' ? 'বছর' : ''}</span>
                    </div>
                    <div className="col-span-4 px-2 py-1 flex items-baseline gap-1">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'তারিখ:' : 'Date:'}</span>
                      <span className="font-semibold text-zinc-900">{formatDate(assessmentDate)}</span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="grid grid-cols-12 border-b border-zinc-900 divide-x divide-zinc-900">
                    <div className="col-span-5 px-2 py-1 flex items-baseline gap-1">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'আইডি নং:' : 'ID No:'}</span>
                      <span className="font-mono font-bold text-zinc-900">{mrn}</span>
                    </div>
                    <div className="col-span-4 px-2 py-1 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'লিঙ্গ:' : 'Gender:'}</span>
                      <PrintCheckbox checked={gender === 'male'} label={isBn ? 'পুরুষ' : 'Male'} />
                      <PrintCheckbox checked={gender === 'female'} label={isBn ? 'মহিলা' : 'Female'} />
                      {gender !== 'male' && gender !== 'female' && (
                        <PrintCheckbox checked={true} label={isBn ? 'অন্যান্য' : 'Other'} />
                      )}
                    </div>
                    <div className="col-span-3 px-2 py-1 flex items-baseline gap-1">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'পেশা:' : 'Occupation:'}</span>
                      <span className="font-semibold text-zinc-900 truncate">{occupation}</span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="grid grid-cols-12 divide-x divide-zinc-900">
                    <div className="col-span-7 px-2 py-1 flex items-baseline gap-1">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'ঠিকানা:' : 'Address:'}</span>
                      <span className="font-semibold text-zinc-900 truncate">{address}</span>
                    </div>
                    <div className="col-span-5 px-2 py-1 flex items-baseline gap-1">
                      <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'মোবাইল:' : 'Mobile:'}</span>
                      <span className="font-mono font-semibold text-zinc-900">{mobile}</span>
                    </div>
                  </div>
                </div>

                {/* 3. TWO-COLUMN CLINICAL BODY (Sections 2 to 9) */}
                <div className="grid grid-cols-12 border border-zinc-900 divide-x divide-zinc-900 mb-2 bg-white/90">
                  {/* LEFT COLUMN: Sections 2, 3, 4, 5, 6 */}
                  <div className="col-span-7 p-2 space-y-2">
                    {/* ## 2 Pain Details */}
                    <div>
                      <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                        ## 2 {isBn ? 'ব্যথার বিবরণ:' : 'Pain Details:'}
                      </h2>
                      <div className="mt-0.5 text-[10px] space-y-1">
                        <div>
                          <span className="font-bold text-zinc-900">* {isBn ? 'ব্যথার স্থান:' : 'Pain area:'} </span>
                          <PrintCheckbox checked={painAreas.includes('Neck')} label={isBn ? 'ঘাড়' : 'Neck'} />
                          <PrintCheckbox checked={painAreas.includes('Shoulder')} label={isBn ? 'কাঁধ' : 'Shoulder'} />
                          <PrintCheckbox checked={painAreas.includes('Back')} label={isBn ? 'কোমর/পিঠ' : 'Back'} />
                          <PrintCheckbox checked={painAreas.includes('Knee')} label={isBn ? 'হাঁটু' : 'Knee'} />
                          <PrintCheckbox checked={painAreas.includes('Heel')} label={isBn ? 'গোড়ালি' : 'Heel'} />
                          <PrintCheckbox
                            checked={painAreas.includes('Others')}
                            label={painAreaOthers ? `${isBn ? 'অন্যান্য:' : 'Others:'} ${painAreaOthers}` : (isBn ? 'অন্যান্য' : 'Others')}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <div>
                            <span className="font-bold text-zinc-900">* {isBn ? 'পাশ:' : 'Side:'} </span>
                            <PrintCheckbox checked={side === 'Right'} label={isBn ? 'ডান' : 'Right'} />
                            <PrintCheckbox checked={side === 'Left'} label={isBn ? 'বাম' : 'Left'} />
                            <PrintCheckbox checked={side === 'Both'} label={isBn ? 'উভয়' : 'Both'} />
                          </div>
                          <div className="flex-1 flex items-baseline gap-1">
                            <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'স্থায়িত্বকাল:' : 'Duration:'} </span>
                            <span className="border-b border-zinc-800 px-1 font-semibold flex-1 min-w-[50px]">{duration || '—'}</span>
                          </div>
                        </div>

                        <div>
                          <span className="font-bold text-zinc-900">* {isBn ? 'ব্যথার ধরন:' : 'Pain type:'} </span>
                          <PrintCheckbox checked={painTypes.includes('Sharp')} label={isBn ? 'তীক্ষ্ণ' : 'Sharp'} />
                          <PrintCheckbox checked={painTypes.includes('Dull')} label={isBn ? 'ভোঁতা/ধীর' : 'Dull'} />
                          <PrintCheckbox checked={painTypes.includes('Burning')} label={isBn ? 'জ্বালাপোড়া' : 'Burning'} />
                          <PrintCheckbox checked={painTypes.includes('Radiating')} label={isBn ? 'ছড়ানো' : 'Radiating'} />
                        </div>
                      </div>
                    </div>

                    {/* ## 3 Pain Scale */}
                    <div className="pt-1.5 border-t border-zinc-300">
                      <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                        ## 3 {isBn ? 'পেইন স্কেল (ভিএএস):' : 'Pain Scale:'}
                      </h2>
                      <div className="mt-0.5 text-[10px] space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">* {isBn ? 'ভিএএস স্কেল (০-১০):' : 'VAS (0–10):'} </span>
                          <span className="px-2 py-0.5 bg-rose-50 border border-rose-400 text-rose-900 font-black text-[12px] font-mono rounded-sm">
                            {vasScore}/10
                          </span>
                          <div className="flex items-center gap-0.5 ml-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                              <span
                                key={v}
                                className={`w-3.5 h-3.5 text-[8.5px] font-mono flex items-center justify-center border ${
                                  v === vasScore
                                    ? 'bg-rose-600 text-white font-black border-rose-700'
                                    : 'bg-white text-zinc-700 border-zinc-300'
                                }`}
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="font-bold text-zinc-900">* {isBn ? 'ব্যথা বৃদ্ধি পায়:' : 'Pain increases with:'} </span>
                          <PrintCheckbox checked={painIncreasesWith.includes('Movement')} label={isBn ? 'নড়াচড়া' : 'Movement'} />
                          <PrintCheckbox checked={painIncreasesWith.includes('Sitting')} label={isBn ? 'বসা' : 'Sitting'} />
                          <PrintCheckbox checked={painIncreasesWith.includes('Standing')} label={isBn ? 'দাঁড়ানো' : 'Standing'} />
                          <PrintCheckbox checked={painIncreasesWith.includes('Walking')} label={isBn ? 'হাঁটা' : 'Walking'} />
                        </div>

                        <div>
                          <span className="font-bold text-zinc-900">* {isBn ? 'ব্যথা কমে:' : 'Pain reduces with:'} </span>
                          <PrintCheckbox checked={painReducesWith.includes('Rest')} label={isBn ? 'বিশ্রাম' : 'Rest'} />
                          <PrintCheckbox checked={painReducesWith.includes('Medicine')} label={isBn ? 'ওষুধ' : 'Medicine'} />
                          <PrintCheckbox checked={painReducesWith.includes('Heat')} label={isBn ? 'গরম সেক' : 'Heat'} />
                        </div>
                      </div>
                    </div>

                    {/* ## 4 History */}
                    <div className="pt-1.5 border-t border-zinc-300">
                      <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                        ## 4 {isBn ? 'পূর্বের ইতিহাস:' : 'History:'}
                      </h2>
                      <div className="mt-0.5 text-[10px] space-y-1">
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <span className="font-bold text-zinc-900">* {isBn ? 'আঘাত/দুর্ঘটনা:' : 'Injury / Accident:'} </span>
                            <PrintCheckbox checked={injuryAccident === 'yes'} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                            <PrintCheckbox checked={injuryAccident === 'no'} label={isBn ? 'না' : 'No'} />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900">* {isBn ? 'পেশাগত ভঙ্গিমা:' : 'Posture advice:'} </span>
                            <PrintCheckbox checked={postureAdvice === 'yes'} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                            <PrintCheckbox checked={postureAdvice === 'no'} label={isBn ? 'না' : 'No'} />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900">* {isBn ? 'অপারেশন ইতিহাস:' : 'Surgery history:'} </span>
                            <PrintCheckbox checked={surgeryHistory === 'yes'} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                            <PrintCheckbox checked={surgeryHistory === 'no'} label={isBn ? 'না' : 'No'} />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900">* {isBn ? 'পূর্বের চিকিৎসা:' : 'Previous treatment:'} </span>
                            <PrintCheckbox checked={previousTreatment.includes('Medicine')} label={isBn ? 'ওষুধ' : 'Medicine'} />
                            <PrintCheckbox checked={previousTreatment.includes('Physiotherapy')} label={isBn ? 'ফিজিওথেরাপি' : 'Physiotherapy'} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ## 5 Functional Limitation */}
                    <div className="pt-1.5 border-t border-zinc-300">
                      <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                        ## 5 {isBn ? 'দৈনন্দিন কাজে সীমাবদ্ধতা:' : 'Functional Limitation* Difficulty in:'}
                      </h2>
                      <div className="mt-0.5 text-[10px]">
                        <PrintCheckbox checked={functionalLimitations.includes('Bending')} label={isBn ? 'ঝুঁকা' : 'Bending'} />
                        <PrintCheckbox checked={functionalLimitations.includes('Sitting')} label={isBn ? 'বসা' : 'Sitting'} />
                        <PrintCheckbox checked={functionalLimitations.includes('Standing')} label={isBn ? 'দাঁড়ানো' : 'Standing'} />
                        <PrintCheckbox checked={functionalLimitations.includes('Walking')} label={isBn ? 'হাঁটা' : 'Walking'} />
                        <PrintCheckbox checked={functionalLimitations.includes('Lifting')} label={isBn ? 'ভারী জিনিস তোলা' : 'Lifting'} />
                      </div>
                    </div>

                    {/* ## 6 Physical Examination */}
                    <div className="pt-1.5 border-t border-zinc-300">
                      <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                        ## 6 {isBn ? 'শারীরিক পরীক্ষা:' : 'Physical Examination:'}
                      </h2>
                      <div className="mt-0.5 text-[10px] space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <span className="font-bold text-zinc-900">{isBn ? 'নড়াচড়ার সীমা:' : 'ROM:'} </span>
                            <PrintCheckbox checked={rom === 'Normal'} label={isBn ? 'স্বাভাবিক' : 'Normal'} />
                            <PrintCheckbox checked={rom === 'Restricted'} label={isBn ? 'সীমিত' : 'Restricted'} />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900">{isBn ? 'মাংসপেশীর টান:' : 'Muscle spasm:'} </span>
                            <PrintCheckbox checked={muscleSpasm === 'yes'} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                            <PrintCheckbox checked={muscleSpasm === 'no'} label={isBn ? 'না' : 'No'} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div>
                            <span className="font-bold text-zinc-900">{isBn ? 'স্পর্শ সংবেদনশীলতা:' : 'Tenderness:'} </span>
                            <PrintCheckbox checked={tenderness === 'yes'} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                            <PrintCheckbox checked={tenderness === 'no'} label={isBn ? 'না' : 'No'} />
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900">{isBn ? 'ফোলাভাব:' : 'Swelling:'} </span>
                            <PrintCheckbox checked={swelling === 'yes'} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                            <PrintCheckbox checked={swelling === 'no'} label={isBn ? 'না' : 'No'} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Sections 7, 8, 9 */}
                  <div className="col-span-5 p-2 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      {/* ## 7 Physiotherapy Diagnosis */}
                      <div>
                        <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                          ## 7 {isBn ? 'ফিজিওথেরাপি ডায়াগনোসিস:' : 'Physiotherapy Diagnosis:'}
                        </h2>
                        <div className="mt-1 p-2 bg-emerald-50/60 border border-emerald-700/40 rounded-sm">
                          <div className="text-[11px] font-black text-emerald-950 font-sans leading-snug min-h-[32px]">
                            {diagnosis}
                          </div>
                        </div>
                      </div>

                      {/* ## 8 Treatment Plan */}
                      <div className="pt-1.5 border-t border-zinc-300">
                        <div className="flex items-center justify-between">
                          <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                            ## 8 {isBn ? 'চিকিৎসা পরিকল্পনা:' : 'Treatment Plan:'}
                          </h2>
                          {prescribedSessions && (
                            <span className="text-[9.5px] font-bold text-zinc-900 font-mono">
                              [{prescribedSessions} {isBn ? 'সেশন' : 'Sessions'}]
                            </span>
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
                          <div>
                            <PrintCheckbox checked={treatmentPlans.includes('Hot pack')} label={isBn ? '* হট প্যাক' : '* Hot pack'} />
                          </div>
                          <div>
                            <PrintCheckbox checked={treatmentPlans.includes('IFT / TENS')} label={isBn ? '* আইএফটি / টেনস' : '* IFT / TENS'} />
                          </div>
                          <div>
                            <PrintCheckbox checked={treatmentPlans.includes('Ultrasound')} label={isBn ? '* আল্ট্রাসাউন্ড' : '* Ultrasound'} />
                          </div>
                          <div>
                            <PrintCheckbox checked={treatmentPlans.includes('Stretching')} label={isBn ? '* স্ট্রেচিং' : '* Stretching'} />
                          </div>
                          <div>
                            <PrintCheckbox checked={treatmentPlans.includes('Strengthening')} label={isBn ? '* স্ট্রেনদেনিং' : '* Strengthening'} />
                          </div>
                          <div>
                            <PrintCheckbox checked={treatmentPlans.includes('Posture correction')} label={isBn ? '* অঙ্গবিন্যাস সংশোধন' : '* Posture correction'} />
                          </div>
                        </div>
                      </div>

                      {/* ## 9 Home Advice (Official Distinct Blue Callout Box matching PDF) */}
                      <div
                        className="rounded-sm p-2 text-white border border-blue-900"
                        style={{
                          backgroundColor: '#0f3875',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        <h2 className="text-[11px] font-black text-amber-300 uppercase tracking-wider border-b border-blue-400/40 pb-1 mb-1.5">
                          ## 9 {isBn ? 'গৃহকালীন পরামর্শ:' : 'Home Advice:'}
                        </h2>
                        <div className="text-[10px] space-y-1.5 text-blue-50">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">* {isBn ? 'ব্যায়াম বুঝিয়ে দেওয়া হয়েছে:' : 'Exercise explained:'} </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-3 h-3 bg-white text-black text-[9px] font-black flex items-center justify-center rounded-[2px]">
                                {exerciseExplained === 'yes' ? '✓' : ''}
                              </span>
                              <span>{isBn ? 'হ্যাঁ' : 'Yes'}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 ml-2">
                              <span className="w-3 h-3 bg-white text-black text-[9px] font-black flex items-center justify-center rounded-[2px]">
                                {exerciseExplained === 'no' ? '✓' : ''}
                              </span>
                              <span>{isBn ? 'না' : 'No'}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">* {isBn ? 'ভঙ্গিমা বিষয়ক পরামর্শ:' : 'Posture advice:'} </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-3 h-3 bg-white text-black text-[9px] font-black flex items-center justify-center rounded-[2px]">
                                {homePostureAdvice === 'yes' ? '✓' : ''}
                              </span>
                              <span>{isBn ? 'হ্যাঁ' : 'Yes'}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 ml-2">
                              <span className="w-3 h-3 bg-white text-black text-[9px] font-black flex items-center justify-center rounded-[2px]">
                                {homePostureAdvice === 'no' ? '✓' : ''}
                              </span>
                              <span>{isBn ? 'না' : 'No'}</span>
                            </span>
                          </div>

                          {homeAdviceNotes && (
                            <div className="text-[9.5px] italic text-blue-100 pt-0.5 border-t border-blue-400/30">
                              {homeAdviceNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 text-[9px] text-zinc-500 font-mono text-right">
                      {isBn ? 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর' : 'Health & Pain Care Center · Jashore'}
                    </div>
                  </div>
                </div>

                {/* 4. SECTION 10: FOLLOW-UP & PROGRESS (Full-Width Bottom Box) */}
                <div className="border border-zinc-900 p-2 mb-2 bg-white/90">
                  <div className="flex items-center justify-between border-b border-zinc-300 pb-1 mb-1">
                    <h2 className="text-[11px] font-black text-rose-800 uppercase tracking-wide">
                      ## {isBn ? 'ফলো-আপ ও অগ্রগতি:' : 'Follow-up & Progress:'}
                    </h2>
                    <div className="text-[10px]">
                      <span className="font-bold text-zinc-900">* {isBn ? 'চিকিৎসা পরবর্তী পেইন স্কেল:' : 'Pain scale after treatment:'} </span>
                      <span className="font-black font-mono text-[11px] px-1.5 py-0.5 bg-zinc-100 border border-zinc-400 rounded-xs">
                        {painScaleAfterTreatment}/10
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] flex items-baseline gap-1.5 pt-0.5">
                    <span className="font-bold text-zinc-900 whitespace-nowrap">* {isBn ? 'উন্নতি/পর্যবেক্ষণ:' : 'Improvement:'} </span>
                    <span className="border-b border-zinc-800 px-1 font-semibold flex-1 min-h-[18px]">
                      {improvement || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. FOOTER: SIGNATURE & CLINIC HOTLINE */}
              <div className="pt-1 border-t border-zinc-900 text-[9.5px] leading-tight">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-bold text-zinc-900">
                      {isBn ? 'জরুরি প্রয়োজনে বা সিরিয়ালে:' : 'Hotline & Appointments:'}{' '}
                      <span className="font-mono font-bold">+880 1515-615188</span>
                    </div>
                    <div className="text-zinc-600 text-[8.5px]">
                      {isBn ? 'ঠিকানা: আর.এন. রোড, যশোর' : 'R.N. Road, Jashore · Bangladesh'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="border-t border-zinc-900 pt-1 w-52 inline-block text-center">
                      <span className="font-bold text-zinc-900 block text-[10px]">
                        * {isBn ? 'থেরাপিস্টের স্বাক্ষর:' : 'Therapist signature:'}
                      </span>
                      {therapistSignature && (
                        <span className="font-mono text-[9px] text-zinc-700 block">
                          {therapistSignature}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
