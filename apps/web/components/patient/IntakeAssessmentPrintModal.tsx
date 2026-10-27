// apps/web/components/patient/IntakeAssessmentPrintModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  Printer,
  FileText,
  X,
  Loader2,
  Check,
} from 'lucide-react';

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

function PrintCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-3 text-[11px] leading-tight font-medium text-black">
      <span
        className={`inline-flex items-center justify-center w-3.5 h-3.5 border border-black rounded-[2px] text-[10px] font-bold leading-none ${
          checked ? 'bg-black text-white' : 'bg-white text-transparent'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
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
  const [fetchedForm, setFetchedForm] = useState<any | null>(null);
  const [fetchedPatient, setFetchedPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!sourceData && targetPatientId) {
      setLoading(true);
      api.patients
        .listIntakeForms({ patientId: targetPatientId })
        .then((forms) => {
          if (Array.isArray(forms) && forms.length > 0) {
            setFetchedForm(forms[0]);
          } else {
            setFetchedForm(null);
          }
        })
        .catch(() => setFetchedForm(null))
        .finally(() => setLoading(false));
    }

    if (!propPatient && !initialPatient && targetPatientId) {
      api.patients
        .getById(targetPatientId)
        .then((p) => setFetchedPatient(p))
        .catch(() => {});
    }
  }, [open, targetPatientId, data, intake, intakeForm, initialForm, propPatient, initialPatient]);

  if (!open) return null;

  const raw = data || intake || intakeForm || initialForm || fetchedForm || {};
  const pat = propPatient || initialPatient || fetchedPatient || raw.patient || {};

  const handlePrint = () => {
    window.print();
  };

  const patientName =
    raw.name ||
    raw.nameBn ||
    raw.nameEn ||
    pat.nameBn ||
    pat.nameEn ||
    '—';

  const mrn = raw.mrn || pat.mrn || 'HPC-26-XXXX';
  const age = raw.ageYears || pat.ageYears ? `${raw.ageYears || pat.ageYears} বছর` : '—';
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
  const weight = raw.weightKg ? `${raw.weightKg} কেজি` : '—';
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

  return (
    <Dialog open={open} onOpenChange={(op) => !op && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[96vh] overflow-y-auto p-0 gap-0 border-emerald-500/40 bg-zinc-950/90 text-foreground backdrop-blur-xl print:!bg-white print:!border-none print:!shadow-none print:!p-0 print:!m-0 print:!max-w-none print:!max-h-none print:!overflow-hidden print:!backdrop-blur-none">
        {/* Screen Toolbar (hidden during print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 bg-zinc-900 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম — A4 প্রিন্ট প্রিভিউ
              </DialogTitle>
              <p className="text-[11px] text-zinc-400">
                একক A4 সাইজ পেপারে নিখুঁত প্রিন্ট ফরম্যাট (Strict Single A4 Sheet Format)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-xs h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 cursor-pointer"
            >
              <X className="size-3.5 mr-1" />
              বন্ধ করুন
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20 gap-1.5 cursor-pointer"
            >
              <Printer className="size-3.5" />
              প্রিন্ট করুন (Print A4)
            </Button>
          </div>
        </div>

        {/* Paper Container Preview for screen */}
        <div className="sheet-report-wrapper p-4 sm:p-8 bg-zinc-900/60 flex justify-center print:!p-0 print:!m-0 print:!block print:!bg-transparent print:!w-full print:!h-full">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-zinc-400 print:hidden">
              <Loader2 className="size-7 animate-spin text-emerald-500" />
              <span className="text-xs">ইনটেক ফরম লোড হচ্ছে...</span>
            </div>
          ) : (
            /* Printable A4 Sheet: Guaranteed to fit 1 Single A4 page */
            <div
              id="hpc-intake-a4-sheet"
              className="sheet-report-a4 bg-white text-black shadow-2xl rounded-sm p-[6mm] w-[210mm] max-w-[210mm] text-[10px] leading-snug font-sans mx-auto flex flex-col justify-between print:!shadow-none print:!border-none print:!p-0 print:!m-0 print:!w-full print:!max-w-[194mm] print:!h-[284mm] print:!max-h-[284mm] print:!min-h-0"
              style={{
                fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', var(--font-poppins), sans-serif",
              }}
            >
              {/* Header matching official HPC Bengali Form */}
              <div className="border-b-2 border-emerald-700 pb-2 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 relative shrink-0">
                      <img
                        src="/hpclogo-transparent.png"
                        alt="HPC Logo"
                        className="w-12 h-12 object-contain shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h1 className="text-base font-black tracking-wide text-emerald-800 uppercase leading-tight">
                        HEALTH &amp; PAIN CARE (HPC)
                      </h1>
                      <h2 className="text-xs font-bold text-zinc-900 mt-0.5">
                        রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম
                      </h2>
                      <p className="text-[9px] text-zinc-600 mt-0.5">
                        চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] space-y-1 shrink-0">
                    <div className="px-2.5 py-0.5 bg-zinc-100 rounded border border-zinc-300 font-mono font-bold text-[11px]">
                      রোগীর আইডি: <span className="text-emerald-800">{mrn}</span>
                    </div>
                    <div className="text-zinc-600 font-mono">
                      তারিখ: <strong className="text-black">{formatDateDDMMYYYY(formDate)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Personal Information */}
              <div className="mb-1.5 border border-zinc-300 rounded p-2 bg-zinc-50/40">
                <div className="font-bold text-[10.5px] text-emerald-800 border-b border-zinc-200 pb-0.5 mb-1 uppercase">
                  ১. রোগীর ব্যক্তিগত তথ্য (Personal Information)
                </div>
                <div className="grid grid-cols-12 gap-y-1 gap-x-2 text-[10px]">
                  <div className="col-span-8">
                    <span className="text-zinc-600">রোগীর নাম:</span>{' '}
                    <strong className="text-black text-[11px]">{patientName}</strong>
                  </div>
                  <div className="col-span-4">
                    <span className="text-zinc-600">বয়স:</span>{' '}
                    <strong className="text-black">{age}</strong>
                  </div>

                  <div className="col-span-6">
                    <span className="text-zinc-600">মোবাইল নম্বর:</span>{' '}
                    <strong className="text-black font-mono">{phone}</strong>
                  </div>
                  <div className="col-span-6">
                    <span className="text-zinc-600 mr-2">লিঙ্গ:</span>
                    <PrintCheckbox checked={isMale} label="পুরুষ" />
                    <PrintCheckbox checked={isFemale} label="মহিলা" />
                  </div>

                  <div className="col-span-8">
                    <span className="text-zinc-600">ঠিকানা:</span>{' '}
                    <span className="text-black font-medium">{address}</span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-zinc-600">পেশা:</span>{' '}
                    <span className="text-black font-medium">{occupation}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Initial Health Information */}
              <div className="mb-1.5 border border-zinc-300 rounded p-2 bg-zinc-50/40">
                <div className="font-bold text-[10.5px] text-emerald-800 border-b border-zinc-200 pb-0.5 mb-1 uppercase">
                  ২. প্রাথমিক স্বাস্থ্য তথ্য (Initial Health Information)
                </div>
                <div className="grid grid-cols-12 gap-y-1 gap-x-2 text-[10px]">
                  <div className="col-span-4">
                    <span className="text-zinc-600">রক্তচাপ (BP):</span>{' '}
                    <strong className="text-black font-mono">{bp}</strong>
                  </div>
                  <div className="col-span-4">
                    <span className="text-zinc-600">Blood Sugar:</span>{' '}
                    <strong className="text-black font-mono">{bloodSugar}</strong>
                  </div>
                  <div className="col-span-4">
                    <span className="text-zinc-600 mr-2">ডায়াবেটিস:</span>
                    <PrintCheckbox checked={!hasDiabetes} label="নেই" />
                    <PrintCheckbox checked={hasDiabetes} label="আছে" />
                  </div>

                  <div className="col-span-4">
                    <span className="text-zinc-600">ওজন:</span>{' '}
                    <strong className="text-black font-mono">{weight}</strong>
                  </div>
                  <div className="col-span-8">
                    <span className="text-zinc-600">সমস্যা কতদিন ধরে:</span>{' '}
                    <span className="text-black font-medium">{duration}</span>
                  </div>

                  <div className="col-span-12 pt-1 border-t border-zinc-200">
                    <span className="text-zinc-600 block mb-0.5 font-semibold text-[9.5px]">
                      প্রধান সমস্যা / রোগের নাম (Chief Complaint):
                    </span>
                    <div className="p-1.5 bg-white border border-zinc-300 rounded text-black font-medium min-h-[22px] text-[10px]">
                      {chiefComplaint}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Past Medical History */}
              <div className="mb-1.5 border border-zinc-300 rounded p-2 bg-zinc-50/40">
                <div className="font-bold text-[10.5px] text-emerald-800 border-b border-zinc-200 pb-0.5 mb-1 uppercase">
                  ৩. পূর্বের চিকিৎসা সংক্রান্ত তথ্য (Past Medical History)
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-start justify-between">
                    <div className="w-1/2">
                      <span className="text-zinc-700">আগে কোনো ডাক্তার দেখিয়েছেন কি?</span>
                      <div className="mt-0.5">
                        <PrintCheckbox checked={!seenDoctor} label="না" />
                        <PrintCheckbox checked={seenDoctor} label="হ্যাঁ" />
                      </div>
                    </div>
                    <div className="w-1/2 pl-2">
                      <span className="text-zinc-500">কোথায় / কার কাছে:</span>{' '}
                      <span className="text-black font-medium">
                        {seenDoctor ? raw.previousDoctorDetails || '—' : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between border-t border-zinc-200 pt-0.5">
                    <div className="w-1/2">
                      <span className="text-zinc-700">আগে কোনো পরীক্ষা / রিপোর্ট আছে কি?</span>
                      <div className="mt-0.5">
                        <PrintCheckbox checked={!hasReports} label="না" />
                        <PrintCheckbox checked={hasReports} label="হ্যাঁ" />
                      </div>
                    </div>
                    <div className="w-1/2 pl-2">
                      <span className="text-zinc-500">পরীক্ষার নাম:</span>{' '}
                      <span className="text-black font-medium">
                        {hasReports ? raw.previousReportNames || '—' : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between border-t border-zinc-200 pt-0.5">
                    <div className="w-1/2">
                      <span className="text-zinc-700">বর্তমানে কোনো নিয়মিত ওষুধ খান কি?</span>
                      <div className="mt-0.5">
                        <PrintCheckbox checked={!regularMed} label="না" />
                        <PrintCheckbox checked={regularMed} label="হ্যাঁ" />
                      </div>
                    </div>
                    <div className="w-1/2 pl-2">
                      <span className="text-zinc-500">ওষুধের বিবরণ:</span>{' '}
                      <span className="text-black font-medium">
                        {regularMed ? raw.regularMedicationDetails || '—' : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between border-t border-zinc-200 pt-0.5">
                    <div className="w-1/2">
                      <span className="text-zinc-700 text-rose-800 font-semibold">
                        কোনো ওষুধে অ্যালার্জি আছে কি?
                      </span>
                      <div className="mt-0.5">
                        <PrintCheckbox checked={!hasAllergy} label="না" />
                        <PrintCheckbox checked={hasAllergy} label="হ্যাঁ" />
                      </div>
                    </div>
                    <div className="w-1/2 pl-2">
                      <span className="text-zinc-500">অ্যালার্জির ওষুধ:</span>{' '}
                      <span className="text-black font-medium text-rose-900">
                        {hasAllergy ? raw.drugAllergyDetails || '—' : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Discovery Source */}
              <div className="mb-1.5 border border-zinc-300 rounded p-2 bg-zinc-50/40">
                <div className="font-bold text-[10.5px] text-emerald-800 border-b border-zinc-200 pb-0.5 mb-1 uppercase">
                  ৪. আমাদের সেন্টারের কথা কীভাবে জেনেছেন? (Discovery Source)
                </div>
                <div className="flex flex-wrap items-center gap-y-0.5 text-[10px]">
                  <PrintCheckbox checked={isFacebook} label="Facebook" />
                  <PrintCheckbox checked={isGoogle} label="Google" />
                  <PrintCheckbox checked={isKnownPerson} label="পরিচিত ব্যক্তি" />
                  <PrintCheckbox checked={isPrevPatient} label="পূর্বের রোগী" />
                  <PrintCheckbox checked={isOther} label="অন্যান্য" />
                  {isOther && raw.referralOtherDetails && (
                    <span className="text-black font-medium ml-2 border-b border-dotted border-zinc-400">
                      ({raw.referralOtherDetails})
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 5: For Reception Use & Doctor Chamber Assignment */}
              <div className="mb-1.5 border border-zinc-300 rounded p-2 bg-zinc-50/40">
                <div className="font-bold text-[10.5px] text-emerald-800 border-b border-zinc-200 pb-0.5 mb-1 uppercase flex justify-between items-center">
                  <span>৫. রিসেপশন ও চেম্বার এসাইনমেন্ট (For Reception Use)</span>
                  {raw.doctorFee && (
                    <span className="font-mono text-emerald-900 font-bold text-[10px]">কনসালটেশন ফি: ৳{raw.doctorFee}</span>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-y-1 gap-x-2 text-[10px]">
                  <div className="col-span-6">
                    <span className="text-zinc-600">রিসেপশনিস্ট:</span>{' '}
                    <strong className="text-black">{raw.receptionistName || 'রিসেপশন ডেস্ক'}</strong>
                  </div>
                  <div className="col-span-6">
                    <span className="text-zinc-600">নির্ধারিত ডাক্তার:</span>{' '}
                    <strong className="text-emerald-800 font-bold">{raw.doctorName || 'ডাক্তার কনসালটেশন'}</strong>
                    {raw.chamberRoomNumber && (
                      <span className="ml-1 text-zinc-700 font-semibold">(রুম {raw.chamberRoomNumber})</span>
                    )}
                  </div>

                  <div className="col-span-8">
                    <span className="text-zinc-600">রেফারেন্স / বিশেষ নোট:</span>{' '}
                    <span className="text-black font-medium">{raw.specialNotes || '—'}</span>
                  </div>
                  <div className="col-span-4 text-right flex flex-col items-end justify-end">
                    <div className="border-b border-zinc-400 w-32 mb-0.5"></div>
                    <span className="text-[9px] text-zinc-500 w-32 text-center block">
                      রিসেপশন স্বাক্ষর
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 6: Doctor's Clinical Assessment & Impression Space */}
              <div className="border border-emerald-700/70 rounded p-2 mb-1.5 bg-emerald-50/20">
                <div className="font-bold text-emerald-900 text-[10px] mb-1 flex items-center justify-between border-b border-emerald-200 pb-0.5">
                  <span>৬. কনসালট্যান্ট ডাক্তারের প্রাথমিক মূল্যায়ন ও মন্তব্য (Doctor&apos;s Clinical Assessment Space)</span>
                  <span className="text-[9px] text-zinc-500 font-normal">চেম্বারে ব্যবহারের জন্য</span>
                </div>
                <div className="space-y-1.5 text-[9.5px]">
                  <div>
                    <span className="text-zinc-600 font-semibold block text-[9px] mb-0.5">
                      সাময়িক পর্যবেক্ষণ ও ডায়াগনোসিস (Provisional Diagnosis):
                    </span>
                    <div className="border-b border-dashed border-zinc-400 h-3.5"></div>
                    <div className="border-b border-dashed border-zinc-400 h-3.5"></div>
                  </div>
                  <div>
                    <span className="text-zinc-600 font-semibold block text-[9px] mb-0.5">
                      প্রস্তাবিত ফিজিওথেরাপি ও পরীক্ষা নির্দেশনা (Recommended Therapy / Advice):
                    </span>
                    <div className="border-b border-dashed border-zinc-400 h-3.5"></div>
                    <div className="border-b border-dashed border-zinc-400 h-3.5"></div>
                  </div>
                  <div className="flex justify-between items-end pt-1">
                    <div className="text-[9px] text-zinc-500 font-mono">
                      তারিখ: .......................................
                    </div>
                    <div className="text-right">
                      <div className="border-b border-zinc-500 w-36 mb-0.5"></div>
                      <span className="text-[9px] text-zinc-600 font-medium">ডাক্তারের স্বাক্ষর ও সিল</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with HPC branding & hotline */}
              <div className="mt-auto pt-1.5 border-t-2 border-emerald-700 flex flex-col sm:flex-row items-center justify-between text-[9px] text-zinc-600 gap-1">
                <div>
                  <strong>হেলথ অ্যান্ড পেইন কেয়ার সেন্টার (HPC)</strong> | চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর
                </div>
                <div className="font-semibold text-emerald-800">
                  হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Embedded print style to guarantee STRICT 1-PAGE A4 portrait mode */}
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          @media print {
            /* 1. Strict 1-page canvas bounds on html and body */
            html,
            body {
              width: 210mm !important;
              height: 297mm !important;
              max-width: 210mm !important;
              max-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* 2. Completely eliminate normal-flow page siblings (Next.js layout, header, tables) */
            body > *:not([data-radix-portal]) {
              display: none !important;
            }

            /* 3. Hide dialog backdrop, close button, and screen controls */
            [data-radix-dialog-overlay],
            [data-radix-dialog-close],
            .print\\:hidden,
            button {
              display: none !important;
            }

            /* 4. Hide all elements by default */
            body * {
              visibility: hidden;
            }

            /* 5. Make the A4 sheet and its children fully visible */
            #hpc-intake-a4-sheet,
            #hpc-intake-a4-sheet * {
              visibility: visible !important;
            }

            /* 6. Radix portal & dialog container reset */
            [data-radix-portal],
            [role="dialog"] {
              position: static !important;
              display: block !important;
              transform: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              max-width: none !important;
              max-height: none !important;
              overflow: hidden !important;
              width: 100% !important;
              height: 100% !important;
            }

            .sheet-report-wrapper {
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              display: block !important;
              width: 100% !important;
              height: 100% !important;
              overflow: hidden !important;
            }

            /* 7. Strict A4 Sheet: fits precisely in printable area (194mm × 284mm) */
            #hpc-intake-a4-sheet {
              position: static !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
              width: 100% !important;
              max-width: 194mm !important;
              height: 284mm !important;
              max-height: 284mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              color: #000000 !important;
              overflow: hidden !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
            }
          }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}

export default IntakeAssessmentPrintModal;
