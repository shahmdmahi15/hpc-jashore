// apps/web/components/patient/IntakeAssessmentPrintModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
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

export interface IntakeAssessmentData {
  mrn?: string;
  date?: string | Date;
  name?: string;
  nameEn?: string;
  nameBn?: string;
  ageYears?: number | string;
  phone?: string;
  gender?: 'male' | 'female' | string;
  address?: string;
  occupation?: string;

  bpSystolic?: number | string;
  bpDiastolic?: number | string;
  bloodSugar?: string;
  hasDiabetes?: boolean | number;
  weightKg?: string | number;
  chiefComplaint?: string;
  problemDuration?: string;

  seenDoctorBefore?: boolean | number;
  previousDoctorDetails?: string;
  hasPreviousReports?: boolean | number;
  previousReportNames?: string;
  takesRegularMedication?: boolean | number;
  regularMedicationDetails?: string;
  hasDrugAllergies?: boolean | number;
  drugAllergyDetails?: string;

  referralSource?: string;
  referralOtherDetails?: string;

  receptionistName?: string;
  specialNotes?: string;
  doctorId?: string;
  doctorName?: string;
  doctorFee?: number | string;
  chamberRoomNumber?: string | number;
  tokenNumber?: string | number;
}

export interface IntakeAssessmentPrintModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  data?: any | null;
  intake?: any | null;
  patientId?: string;
  visitId?: string;
  intakeForm?: any | null;
  initialForm?: any | null;
  patient?: any | null;
  initialPatient?: any | null;
}

function formatDateDDMMYYYY(d?: string | Date | null): string {
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
 * Robust print-resilient checkbox:
 * Works 100% reliably whether "Background graphics" is enabled or disabled in browser print dialog.
 */
function PrintCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-3.5 text-[10px] leading-tight font-medium text-black shrink-0">
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

export function IntakeAssessmentPrintModal({
  open,
  onOpenChange,
  onClose,
  data,
  intake,
  patientId,
  visitId,
  intakeForm,
  initialForm,
  patient: propPatient,
  initialPatient,
}: IntakeAssessmentPrintModalProps) {
  const { language } = useLanguage();
  const [printLang, setPrintLang] = useState<'en' | 'bn'>(language === 'bn' ? 'bn' : 'en');
  const [fetchedForm, setFetchedForm] = useState<any | null>(null);
  const [fetchedPatient, setFetchedPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (open) {
      setPrintLang(language === 'bn' ? 'bn' : 'en');
    }
  }, [open, language]);

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const targetPatientId =
    patientId ||
    data?.patientId ||
    intake?.patientId ||
    propPatient?.id ||
    initialPatient?.id ||
    initialPatient?.patientId;

  useEffect(() => {
    if (!open) return;

    const sourceData = data || intake || intakeForm || initialForm;
    const hasValidSourceData = Boolean(
      sourceData &&
      (sourceData.id || sourceData.chiefComplaint || sourceData.bpSystolic || sourceData.weightKg)
    );

    if (!hasValidSourceData && targetPatientId) {
      setLoading(true);
      api.patients
        .getLatestIntakeForm(targetPatientId)
        .then((form: any) => {
          if (form && (form.id || form.chiefComplaint || form.bpSystolic || form.weightKg)) {
            setFetchedForm(form);
            setLoading(false);
          } else {
            api.patients
              .listIntakeForms({ patientId: targetPatientId, date: 'all' })
              .then((forms: any) => {
                if (Array.isArray(forms) && forms.length > 0) {
                  setFetchedForm(forms[0]);
                } else {
                  setFetchedForm(null);
                }
              })
              .catch(() => setFetchedForm(null))
              .finally(() => setLoading(false));
          }
        })
        .catch(() => {
          api.patients
            .listIntakeForms({ patientId: targetPatientId, date: 'all' })
            .then((forms: any) => {
              if (Array.isArray(forms) && forms.length > 0) {
                setFetchedForm(forms[0]);
              } else {
                setFetchedForm(null);
              }
            })
            .catch(() => setFetchedForm(null))
              .finally(() => setLoading(false));
        });
    }

    if (!propPatient && !initialPatient && targetPatientId) {
      api.patients
        .getById(targetPatientId)
        .then((p: any) => setFetchedPatient(p))
        .catch(() => {});
    }
  }, [open, targetPatientId, data, intake, intakeForm, initialForm, propPatient, initialPatient]);

  // Manage printing body class for strict single-page print isolation
  useEffect(() => {
    if (!open) return;

    document.body.classList.add('printing-intake-a4');

    const handleBeforePrint = () => {
      document.body.classList.add('printing-intake-a4');
    };
    const handleAfterPrint = () => {
      // keep it while open
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      document.body.classList.remove('printing-intake-a4');
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [open]);

  if (!open) return null;

  const raw = data || intake || intakeForm || initialForm || fetchedForm || {};
  const pat = propPatient || initialPatient || fetchedPatient || raw.patient || {};
  const isBn = printLang === 'bn';

  const mrn = raw.mrn || pat.mrn || 'HPC-2026-XXXX';

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const isMobile =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      if (isMobile) {
        document.body.classList.add('printing-intake-a4');
        window.print();
      } else {
        await printElementViaIframe('hpc-intake-a4-sheet', {
          pageTitle: `HPC_Intake_${mrn}`,
          pageSize: 'A4 portrait',
          pageMargin: '6mm 8mm',
        });
      }
    } catch {
      document.body.classList.add('printing-intake-a4');
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const { url } = await generateElementPdf('hpc-intake-a4-sheet', {
        filename: `HPC_Intake_${mrn}_${new Date().toISOString().split('T')[0]}.pdf`,
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
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const patientName =
    raw.name ||
    (isBn ? raw.nameBn || raw.nameEn : raw.nameEn || raw.nameBn) ||
    (isBn ? pat.nameBn || pat.nameEn : pat.nameEn || pat.nameBn) ||
    '—';
  const age = raw.ageYears || pat.ageYears ? `${raw.ageYears || pat.ageYears} ${isBn ? 'বছর' : 'yrs'}` : '—';
  const phone = raw.phone || pat.phone || '—';
  const isMale = (raw.gender || pat.gender) === 'male';
  const isFemale = (raw.gender || pat.gender) === 'female';
  const address = raw.address || pat.address || '—';
  const occupation = raw.occupation || pat.occupation || '—';

  const bp =
    raw.bpSystolic || raw.bpDiastolic
      ? `${raw.bpSystolic || '—'} / ${raw.bpDiastolic || '—'} mmHg`
      : '—';
  const bloodSugar = raw.bloodSugar ? `${raw.bloodSugar} mmol/L` : '—';
  const hasDiabetes = Boolean(raw.hasDiabetes === 1 || raw.hasDiabetes === true);
  const weight = raw.weightKg ? `${raw.weightKg} ${isBn ? 'কেজি' : 'kg'}` : '—';
  const chiefComplaint = raw.chiefComplaint || '—';
  const duration = raw.problemDuration || '—';

  const seenDoctor = Boolean(raw.seenDoctorBefore === 1 || raw.seenDoctorBefore === true);
  const hasReports = Boolean(raw.hasPreviousReports === 1 || raw.hasPreviousReports === true);
  const regularMed = Boolean(raw.takesRegularMedication === 1 || raw.takesRegularMedication === true);
  const hasAllergy = Boolean(raw.hasDrugAllergies === 1 || raw.hasDrugAllergies === true);

  const refSource = (raw.referralSource || '').toLowerCase();
  const isFacebook = refSource === 'facebook';
  const isGoogle = refSource === 'google';
  const isKnownPerson = refSource === 'known_person' || refSource === 'friend';
  const isPrevPatient = refSource === 'previous_patient';
  const isOther =
    refSource === 'other' ||
    (!isFacebook && !isGoogle && !isKnownPerson && !isPrevPatient && Boolean(refSource));

  const formDate = raw.date || new Date().toISOString().split('T')[0];
  const tokenNumber = raw.tokenNumber || raw.serialNumber || null;

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
                    {isBn
                      ? 'রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম — A4 প্রিন্ট'
                      : 'Patient Intake & Reception Form — A4 Print'}
                  </DialogTitle>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden xs:block">
                    {isBn
                      ? 'একক A4 সাইজ পেপারে নিখুঁত প্রিন্ট ফরম্যাট'
                      : 'Guaranteed Single A4 Sheet Official Clinical Record'}
                  </p>
                </div>
              </div>

              {/* Close button visible on mobile */}
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
                title={isBn ? 'Switch to English Clinical Sheet' : 'বাংলায় পরিবর্তন করুন'}
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
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground print:hidden">
              <Loader2 className="size-7 animate-spin text-emerald-500" />
              <span className="text-xs">{isBn ? 'ইনটেক ফরম লোড হচ্ছে...' : 'Loading intake form...'}</span>
            </div>
          ) : (
            <div
              id="hpc-intake-a4-sheet"
              className="sheet-report-a4 bg-white text-black shadow-2xl rounded-sm p-[6mm_8mm] w-[210mm] max-w-[210mm] min-h-[297mm] text-[10px] leading-snug font-sans mx-auto flex flex-col justify-between border-[1.5px] border-emerald-800 print:!shadow-none print:!border-[1.5px] print:!border-emerald-800 print:!p-[5mm_6mm] print:!mx-auto print:!my-0 print:!w-[190mm] print:!max-w-[190mm] print:!h-[275mm] print:!max-h-[275mm] print:!overflow-hidden"
              style={{
                fontFamily: isBn
                  ? "'Hind Siliguri', 'Noto Sans Bengali', var(--font-poppins), system-ui, sans-serif"
                  : "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                boxSizing: 'border-box',
              }}
            >
              {/* TOP HEADER */}
              <div className="border-b-2 border-emerald-800 pb-2 mb-2 break-inside-avoid">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 relative shrink-0" style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', maxWidth: '48px', maxHeight: '48px' }}>
                      <img
                        src="/hpclogo-transparent.png"
                        alt="HPC Logo"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-contain shrink-0"
                        style={{ width: '48px', height: '48px', maxWidth: '48px', maxHeight: '48px', objectFit: 'contain' }}
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h1 className="text-[15px] font-black tracking-wide text-emerald-800 uppercase leading-none">
                        HEALTH &amp; PAIN CARE (HPC)
                      </h1>
                      <h2 className="text-[12px] font-bold text-zinc-950 mt-1 leading-tight">
                        {isBn ? 'রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম' : 'Patient Initial Intake & Reception Form'}
                      </h2>
                      <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight">
                        {isBn
                          ? 'চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০'
                          : 'Opposite to Chanchra Police Outpost, Chanchra Dalmill Mor, Jashore-7400'}
                      </p>
                      <p className="text-[8.5px] text-zinc-500 leading-tight">
                        {isBn
                          ? 'হটলাইন: ০১৫১৫-৬১৫১৮৮ · ইমেইল: hpc@toufiquzzaman.com'
                          : 'Hotline: +880 1515-615188 · Email: hpc@toufiquzzaman.com'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[9.5px] space-y-1 shrink-0">
                    <div className="px-3 py-1 bg-emerald-50 rounded border border-emerald-600 font-mono font-bold text-[11px] text-zinc-900 leading-tight">
                      {isBn ? 'রোগীর আইডি:' : 'Patient ID:'} <span className="text-emerald-800">{mrn}</span>
                    </div>
                    <div className="text-zinc-700 font-mono text-[9.5px] flex items-center justify-end gap-2">
                      <span>{isBn ? 'তারিখ:' : 'Date:'} <strong className="text-black">{formatDateDDMMYYYY(formDate)}</strong></span>
                      {tokenNumber && (
                        <span className="text-emerald-800 font-bold">{isBn ? `| টোকেন: #${tokenNumber}` : `| Token: #${tokenNumber}`}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Personal Information */}
              <div className="mb-2 border border-zinc-300 rounded-[3px] overflow-hidden break-inside-avoid">
                <div className="font-bold text-[10.5px] text-emerald-900 bg-emerald-50/80 border-b border-emerald-200 px-2 py-0.5 uppercase tracking-wide flex items-center justify-between">
                  <span>{isBn ? '১. রোগীর ব্যক্তিগত তথ্য' : '1. Patient Demographics'}</span>
                </div>
                <div className="p-2 bg-white">
                  <div className="grid grid-cols-12 gap-y-1 gap-x-3 text-[10px]">
                    <div className="col-span-8">
                      <span className="text-zinc-600">{isBn ? 'রোগীর নাম:' : 'Patient Name:'}</span>{' '}
                      <strong className="text-black text-[11px] font-bold">{patientName}</strong>
                    </div>
                    <div className="col-span-4">
                      <span className="text-zinc-600">{isBn ? 'বয়স:' : 'Age:'}</span>{' '}
                      <strong className="text-black font-bold">{age}</strong>
                    </div>

                    <div className="col-span-6">
                      <span className="text-zinc-600">{isBn ? 'মোবাইল নম্বর:' : 'Phone Number:'}</span>{' '}
                      <strong className="text-black font-mono font-bold">{phone}</strong>
                    </div>
                    <div className="col-span-6 flex items-center">
                      <span className="text-zinc-600 mr-2.5">{isBn ? 'লিঙ্গ:' : 'Gender:'}</span>
                      <PrintCheckbox checked={isMale} label={isBn ? 'পুরুষ' : 'Male'} />
                      <PrintCheckbox checked={isFemale} label={isBn ? 'মহিলা' : 'Female'} />
                    </div>

                    <div className="col-span-8">
                      <span className="text-zinc-600">{isBn ? 'ঠিকানা:' : 'Address:'}</span>{' '}
                      <span className="text-black font-medium">{address}</span>
                    </div>
                    <div className="col-span-4">
                      <span className="text-zinc-600">{isBn ? 'পেশা:' : 'Occupation:'}</span>{' '}
                      <span className="text-black font-medium">{occupation}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Initial Health Information */}
              <div className="mb-2 border border-zinc-300 rounded-[3px] overflow-hidden break-inside-avoid">
                <div className="font-bold text-[10.5px] text-emerald-900 bg-emerald-50/80 border-b border-emerald-200 px-2 py-0.5 uppercase tracking-wide">
                  {isBn ? '২. প্রাথমিক স্বাস্থ্য তথ্য' : '2. Initial Health Information'}
                </div>
                <div className="p-2 bg-white">
                  <div className="grid grid-cols-12 gap-y-1.5 gap-x-3 text-[10px]">
                    <div className="col-span-4">
                      <span className="text-zinc-600">{isBn ? 'রক্তচাপ:' : 'Blood Pressure:'}</span>{' '}
                      <strong className="text-black font-mono font-bold">{bp}</strong>
                    </div>
                    <div className="col-span-4">
                      <span className="text-zinc-600">{isBn ? 'ব্লাড সুগার:' : 'Blood Sugar:'}</span>{' '}
                      <strong className="text-black font-mono font-bold">{bloodSugar}</strong>
                    </div>
                    <div className="col-span-4 flex items-center">
                      <span className="text-zinc-600 mr-2">{isBn ? 'ডায়াবেটিস:' : 'Diabetes:'}</span>
                      <PrintCheckbox checked={!hasDiabetes} label={isBn ? 'নেই' : 'No'} />
                      <PrintCheckbox checked={hasDiabetes} label={isBn ? 'আছে' : 'Yes'} />
                    </div>

                    <div className="col-span-4">
                      <span className="text-zinc-600">{isBn ? 'ওজন:' : 'Weight:'}</span>{' '}
                      <strong className="text-black font-mono font-bold">{weight}</strong>
                    </div>
                    <div className="col-span-8">
                      <span className="text-zinc-600">{isBn ? 'সমস্যা কতদিন ধরে:' : 'Problem Duration:'}</span>{' '}
                      <span className="text-black font-medium">{duration}</span>
                    </div>

                    <div className="col-span-12 pt-1 border-t border-zinc-200">
                      <span className="text-zinc-700 block mb-1 font-semibold text-[9.5px]">
                        {isBn ? 'প্রধান সমস্যা ও রোগের বিবরণ:' : 'Chief Complaints & Clinical Presentation:'}
                      </span>
                      <div className="p-1.5 px-2.5 bg-zinc-50 border border-zinc-300 rounded text-black font-medium min-h-[30px] text-[10px] leading-snug">
                        {chiefComplaint}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Past Medical History */}
              <div className="mb-2 border border-zinc-300 rounded-[3px] overflow-hidden break-inside-avoid">
                <div className="font-bold text-[10.5px] text-emerald-900 bg-emerald-50/80 border-b border-emerald-200 px-2 py-0.5 uppercase tracking-wide">
                  {isBn ? '৩. পূর্বের চিকিৎসা সংক্রান্ত তথ্য' : '3. Past Medical & Treatment History'}
                </div>
                <div className="p-2 bg-white space-y-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <div className="w-1/2 flex items-center">
                      <span className="text-zinc-700 mr-2">{isBn ? 'আগে কোনো ডাক্তার দেখিয়েছেন কি?' : 'Consulted any doctor before?'}</span>
                      <PrintCheckbox checked={!seenDoctor} label={isBn ? 'না' : 'No'} />
                      <PrintCheckbox checked={seenDoctor} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                    </div>
                    <div className="w-1/2 pl-3">
                      <span className="text-zinc-500">{isBn ? 'কোথায় / কার কাছে:' : 'Where / Doctor details:'}</span>{' '}
                      <span className="text-black font-medium">
                        {seenDoctor ? raw.previousDoctorDetails || '—' : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200 pt-1">
                    <div className="w-1/2 flex items-center">
                      <span className="text-zinc-700 mr-2">{isBn ? 'আগে কোনো পরীক্ষা / রিপোর্ট আছে কি?' : 'Any prior diagnostic reports?'}</span>
                      <PrintCheckbox checked={!hasReports} label={isBn ? 'না' : 'No'} />
                      <PrintCheckbox checked={hasReports} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                    </div>
                    <div className="w-1/2 pl-3">
                      <span className="text-zinc-500">{isBn ? 'পরীক্ষার নাম:' : 'Investigation names:'}</span>{' '}
                      <span className="text-black font-medium">
                        {hasReports ? raw.previousReportNames || '—' : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200 pt-1">
                    <div className="w-1/2 flex items-center">
                      <span className="text-zinc-700 mr-2">{isBn ? 'বর্তমানে কোনো নিয়মিত ওষুধ খান কি?' : 'Taking regular medications?'}</span>
                      <PrintCheckbox checked={!regularMed} label={isBn ? 'না' : 'No'} />
                      <PrintCheckbox checked={regularMed} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                    </div>
                    <div className="w-1/2 pl-3">
                      <span className="text-zinc-500">{isBn ? 'ওষুধের বিবরণ:' : 'Medication details:'}</span>{' '}
                      <span className="text-black font-medium">
                        {regularMed ? raw.regularMedicationDetails || '—' : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200 pt-1">
                    <div className="w-1/2 flex items-center">
                      <span className="text-zinc-700 font-semibold mr-2">{isBn ? 'কোনো ওষুধে অ্যালার্জি আছে কি?' : 'Any drug allergies?'}</span>
                      <PrintCheckbox checked={!hasAllergy} label={isBn ? 'না' : 'No'} />
                      <PrintCheckbox checked={hasAllergy} label={isBn ? 'হ্যাঁ' : 'Yes'} />
                    </div>
                    <div className="w-1/2 pl-3">
                      <span className="text-zinc-500">{isBn ? 'অ্যালার্জির ওষুধ:' : 'Allergic drugs:'}</span>{' '}
                      <span className="text-black font-bold text-rose-800">
                        {hasAllergy ? raw.drugAllergyDetails || '—' : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Discovery Source */}
              <div className="mb-2 border border-zinc-300 rounded-[3px] overflow-hidden break-inside-avoid">
                <div className="font-bold text-[10.5px] text-emerald-900 bg-emerald-50/80 border-b border-emerald-200 px-2 py-0.5 uppercase tracking-wide">
                  {isBn ? '৪. আমাদের সেন্টারের কথা কীভাবে জেনেছেন?' : '4. How did you learn about our center?'}
                </div>
                <div className="p-1.5 px-2 bg-white flex flex-wrap items-center gap-y-1 text-[10px]">
                  <PrintCheckbox checked={isFacebook} label={isBn ? 'ফেসবুক' : 'Facebook'} />
                  <PrintCheckbox checked={isGoogle} label={isBn ? 'গুগল' : 'Google'} />
                  <PrintCheckbox checked={isKnownPerson} label={isBn ? 'পরিচিত ব্যক্তি' : 'Friend / Family'} />
                  <PrintCheckbox checked={isPrevPatient} label={isBn ? 'পূর্বের রোগী' : 'Previous Patient'} />
                  <PrintCheckbox checked={isOther} label={isBn ? 'অন্যান্য' : 'Other'} />
                  {isOther && raw.referralOtherDetails && (
                    <span className="text-black font-medium ml-1 border-b border-dotted border-zinc-400">
                      ({raw.referralOtherDetails})
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 5: Reception Desk & Chamber Assignment */}
              <div className="mb-2 border border-zinc-300 rounded-[3px] overflow-hidden break-inside-avoid">
                <div className="font-bold text-[10.5px] text-emerald-900 bg-emerald-50/80 border-b border-emerald-200 px-2 py-0.5 uppercase tracking-wide flex justify-between items-center">
                  <span>{isBn ? '৫. রিসেপশন ও চেম্বার এসাইনমেন্ট' : '5. Reception & Chamber Assignment'}</span>
                  {raw.doctorFee && (
                    <span className="font-mono text-emerald-900 font-bold text-[10px]">
                      {isBn ? `কনসালটেশন ফি: ৳${raw.doctorFee}` : `Consultation Fee: BDT ${raw.doctorFee}`}
                    </span>
                  )}
                </div>
                <div className="p-2 bg-white">
                  <div className="grid grid-cols-12 gap-y-1.5 gap-x-3 text-[10px] items-center">
                    <div className="col-span-6">
                      <span className="text-zinc-600">{isBn ? 'রিসেপশনিস্ট:' : 'Receptionist:'}</span>{' '}
                      <strong className="text-black font-semibold">{raw.receptionistName || (isBn ? 'রিসেপশন ডেস্ক' : 'Reception Desk')}</strong>
                    </div>
                    <div className="col-span-6">
                      <span className="text-zinc-600">{isBn ? 'নির্ধারিত ডাক্তার:' : 'Assigned Doctor:'}</span>{' '}
                      <strong className="text-emerald-900 font-bold">{raw.doctorName || (isBn ? 'ডাক্তার কনসালটেশন' : 'Doctor Consultation')}</strong>
                      {raw.chamberRoomNumber && (
                        <span className="ml-1 text-zinc-700 font-semibold">{isBn ? `(রুম ${raw.chamberRoomNumber})` : `(Room ${raw.chamberRoomNumber})`}</span>
                      )}
                    </div>

                    <div className="col-span-8">
                      <span className="text-zinc-600">{isBn ? 'রেফারেন্স / বিশেষ নোট:' : 'Reference / Special Notes:'}</span>{' '}
                      <span className="text-black font-medium">{raw.specialNotes || '—'}</span>
                    </div>
                    <div className="col-span-4 text-right flex flex-col items-end justify-end">
                      <div className="border-b border-zinc-500 w-32 mb-0.5"></div>
                      <span className="text-[9px] text-zinc-600 w-32 text-center block">
                        {isBn ? 'রিসেপশন স্বাক্ষর ও তারিখ' : 'Reception Signature & Date'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: Doctor's Clinical Assessment & Impression Space */}
              <div className="border-[1.5px] border-emerald-700/80 rounded-[3px] p-2 mb-1.5 bg-emerald-50/15 break-inside-avoid">
                <div className="font-bold text-emerald-950 text-[10.5px] mb-1.5 flex items-center justify-between border-b border-emerald-300 pb-1">
                  <span>{isBn ? '৬. কনসালট্যান্ট ডাক্তারের প্রাথমিক মূল্যায়ন ও চেম্বার নোট' : '6. Consultant Doctor\'s Initial Evaluation & Clinical Notes'}</span>
                  <span className="text-[9px] text-zinc-600 font-normal">{isBn ? '(চেম্বারে ডাক্তারের ব্যবহারের জন্য)' : '(For Doctor\'s Chamber Use Only)'}</span>
                </div>
                <div className="space-y-1.5 text-[9.5px]">
                  <div>
                    <span className="text-zinc-800 font-semibold block text-[9.5px] mb-0.5">
                      {isBn ? 'সাময়িক পর্যবেক্ষণ ও ডায়াগনোসিস:' : 'Provisional Diagnosis & Clinical Impression:'}
                    </span>
                    <div className="border-b border-dashed border-zinc-400 h-4"></div>
                    <div className="border-b border-dashed border-zinc-400 h-4"></div>
                    <div className="border-b border-dashed border-zinc-400 h-4"></div>
                  </div>
                  <div>
                    <span className="text-zinc-800 font-semibold block text-[9.5px] mb-0.5">
                      {isBn ? 'প্রস্তাবিত ফিজিওথেরাপি ও পরীক্ষা নির্দেশনা:' : 'Recommended Physiotherapy & Investigations:'}
                    </span>
                    <div className="border-b border-dashed border-zinc-400 h-4"></div>
                    <div className="border-b border-dashed border-zinc-400 h-4"></div>
                    <div className="border-b border-dashed border-zinc-400 h-4"></div>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <div className="text-[9px] text-zinc-600 font-mono">
                      {isBn ? 'তারিখ: .......................................' : 'Date: .......................................'}
                    </div>
                    <div className="text-right">
                      <div className="border-b border-zinc-700 w-44 mb-0.5 ml-auto"></div>
                      <span className="text-[9px] text-zinc-800 font-semibold text-center block w-44 ml-auto">
                        {isBn ? 'ডাক্তারের স্বাক্ষর ও সিল' : 'Doctor\'s Signature & Seal'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER with HPC branding & hotline */}
              <div className="pt-1.5 border-t-2 border-emerald-800 flex items-center justify-between text-[9px] text-zinc-600 gap-2 break-inside-avoid">
                <div>
                  <strong>{isBn ? 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার' : 'Health & Pain Care Center'}</strong> · {isBn ? 'চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর' : 'Opposite to Chanchra Police Outpost, Chanchra Dalmill Mor, Jashore'}
                </div>
                <div className="font-semibold text-emerald-900 text-right">
                  {isBn ? 'হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮ · ইমেইল: hpc@toufiquzzaman.com' : 'Hotline: +880 1515-615188 · Email: hpc@toufiquzzaman.com'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Embedded print stylesheet guaranteeing STRICT Centered 1-PAGE A4 portrait mode */}
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          @media print {
            :root,
            html,
            body,
            body.printing-intake-a4 {
              --background: #ffffff !important;
              --foreground: #000000 !important;
              --card: #ffffff !important;
              --card-foreground: #000000 !important;
              --popover: #ffffff !important;
              --popover-foreground: #000000 !important;
              --border: #d4d4d8 !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body > *:not([data-radix-portal]),
            body.printing-intake-a4 > *:not([data-radix-portal]),
            [data-radix-portal]:not(:has(#hpc-intake-a4-sheet)),
            body.printing-intake-a4 [data-radix-portal]:not(:has(#hpc-intake-a4-sheet)) {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              max-height: 0 !important;
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            nav,
            header,
            aside,
            footer,
            button,
            .print-hidden,
            .print\\:hidden,
            [data-radix-dialog-overlay],
            [data-radix-dialog-close],
            div[class*="backdrop-blur"],
            div[class*="bg-black/80"],
            .dialog-header-actions,
            [data-sonner-toaster],
            .toaster {
              display: none !important;
              visibility: hidden !important;
            }

            [data-radix-portal]:has(#hpc-intake-a4-sheet),
            [role="dialog"]:has(#hpc-intake-a4-sheet),
            [data-dialog-content]:has(#hpc-intake-a4-sheet),
            .sheet-report-wrapper {
              position: static !important;
              display: block !important;
              transform: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              background: transparent !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              overflow: visible !important;
            }

            #hpc-intake-a4-sheet {
              position: relative !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
              width: 190mm !important;
              max-width: 190mm !important;
              height: 275mm !important;
              max-height: 275mm !important;
              margin: 0 auto !important;
              margin-left: auto !important;
              margin-right: auto !important;
              padding: 5mm 6mm !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              border: 1.5px solid #047857 !important;
              border-radius: 4px !important;
              box-shadow: none !important;
              overflow: hidden !important;
              visibility: visible !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            #hpc-intake-a4-sheet * {
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}

export default IntakeAssessmentPrintModal;
