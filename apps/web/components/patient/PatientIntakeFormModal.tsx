'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, getSession, UserSession, type PatientClinicalStatus } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  User,
  HeartPulse,
  History,
  Share2,
  Stethoscope,
  Send,
  Save,
  CheckCircle2,
  Loader2,
  Printer,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  IntakeAssessmentPrintModal,
  IntakeAssessmentData,
} from './IntakeAssessmentPrintModal';

interface PatientIntakeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
  currentUser?: UserSession | null;
  onSuccess?: (intakeForm: any) => void;
  isReIntake?: boolean;
  clinicalStatus?: PatientClinicalStatus | null;
  intakeFormId?: string;
  existingIntake?: any;
}

export function PatientIntakeFormModal({
  open,
  onOpenChange,
  patient,
  currentUser,
  onSuccess,
  isReIntake = false,
  clinicalStatus,
  intakeFormId,
  existingIntake,
}: PatientIntakeFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeIntakeId, setActiveIntakeId] = useState<string | null>(null);
  const [activeIntakeStatus, setActiveIntakeStatus] = useState<string | null>(null);
  const [loadingIntake, setLoadingIntake] = useState(false);

  // Determine effective re-intake mode
  const effectiveIsReIntake = Boolean(
    isReIntake ||
    clinicalStatus?.patientType === 'lapsed_reintake' ||
    clinicalStatus?.isLapsed
  );

  // Section 1: Personal Info
  const [name, setName] = useState('');
  const [ageYears, setAgeYears] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');

  // Section 2: Health Info
  const [bpSystolic, setBpSystolic] = useState<string>('');
  const [bpDiastolic, setBpDiastolic] = useState<string>('');
  const [bloodSugar, setBloodSugar] = useState<string>('');
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [weightKg, setWeightKg] = useState<string>('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [problemDuration, setProblemDuration] = useState('');

  // Section 3: Past Medical History
  const [seenDoctorBefore, setSeenDoctorBefore] = useState(false);
  const [previousDoctorDetails, setPreviousDoctorDetails] = useState('');
  const [hasPreviousReports, setHasPreviousReports] = useState(false);
  const [previousReportNames, setPreviousReportNames] = useState('');
  const [takesRegularMedication, setTakesRegularMedication] = useState(false);
  const [regularMedicationDetails, setRegularMedicationDetails] = useState('');
  const [hasDrugAllergies, setHasDrugAllergies] = useState(false);
  const [drugAllergyDetails, setDrugAllergyDetails] = useState('');

  // Section 4: Referral Source
  const [referralSource, setReferralSource] = useState('facebook');
  const [referralOtherDetails, setReferralOtherDetails] = useState('');

  // Section 5: Target Doctor & Reception Notes
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  const populateFromIntake = (f: any) => {
    if (!f) return;
    setActiveIntakeId(f.id);
    setActiveIntakeStatus(f.status || 'submitted');
    setName(f.name || patient?.nameBn || patient?.nameEn || '');
    setPhone(f.phone || patient?.phone || '');
    setAgeYears(f.ageYears ? String(f.ageYears) : patient?.ageYears ? String(patient.ageYears) : '');
    setGender(f.gender || patient?.gender || 'male');
    setOccupation(f.occupation || patient?.occupation || '');
    setAddress(f.address || patient?.address || '');

    setBpSystolic(f.bpSystolic !== null && f.bpSystolic !== undefined ? String(f.bpSystolic) : '');
    setBpDiastolic(f.bpDiastolic !== null && f.bpDiastolic !== undefined ? String(f.bpDiastolic) : '');
    setBloodSugar(f.bloodSugar !== null && f.bloodSugar !== undefined ? String(f.bloodSugar) : '');
    setHasDiabetes(Boolean(f.hasDiabetes));
    setWeightKg(f.weightKg !== null && f.weightKg !== undefined ? String(f.weightKg) : '');
    setChiefComplaint(f.chiefComplaint || '');
    setProblemDuration(f.problemDuration || '');

    setSeenDoctorBefore(Boolean(f.seenDoctorBefore));
    setPreviousDoctorDetails(f.previousDoctorDetails || '');
    setHasPreviousReports(Boolean(f.hasPreviousReports));
    setPreviousReportNames(f.previousReportNames || '');
    setTakesRegularMedication(Boolean(f.takesRegularMedication));
    setRegularMedicationDetails(f.regularMedicationDetails || '');
    setHasDrugAllergies(Boolean(f.hasDrugAllergies));
    setDrugAllergyDetails(f.drugAllergyDetails || '');

    if (f.referralSource) setReferralSource(f.referralSource);
    setReferralOtherDetails(f.referralOtherDetails || '');
    if (f.doctorId) setSelectedDoctorId(f.doctorId);
    setSpecialNotes(f.specialNotes || '');
  };

  const resetForNewIntake = () => {
    setActiveIntakeId(null);
    setActiveIntakeStatus(null);
    if (patient) {
      setName(patient.nameBn || patient.nameEn || '');
      setPhone(patient.phone || '');
      setAgeYears(patient.ageYears ? String(patient.ageYears) : '');
      setGender(patient.gender || 'male');
      setOccupation(patient.occupation || '');
      setAddress(patient.address || '');

      if (patient.allergies && patient.allergies.trim()) {
        setHasDrugAllergies(true);
        setDrugAllergyDetails(patient.allergies.trim());
      } else {
        setHasDrugAllergies(false);
        setDrugAllergyDetails('');
      }

      if (patient.chronicConditions && patient.chronicConditions.trim()) {
        const cond = patient.chronicConditions.toLowerCase();
        if (cond.includes('diabet') || cond.includes('ডায়াবেটিস')) {
          setHasDiabetes(true);
        }
        if (!takesRegularMedication) {
          setTakesRegularMedication(true);
          setRegularMedicationDetails(`পূর্বের রোগ: ${patient.chronicConditions.trim()}`);
        }
      }

      setBpSystolic('');
      setBpDiastolic('');
      setBloodSugar('');
      setWeightKg('');
      setChiefComplaint('');
      setProblemDuration('');
    } else {
      setName('');
      setPhone('');
      setAgeYears('');
      setGender('male');
      setOccupation('');
      setAddress('');
      setHasDrugAllergies(false);
      setDrugAllergyDetails('');
      setHasDiabetes(false);
      setTakesRegularMedication(false);
      setRegularMedicationDetails('');
      setBpSystolic('');
      setBpDiastolic('');
      setBloodSugar('');
      setWeightKg('');
      setChiefComplaint('');
      setProblemDuration('');
    }
  };

  // Sync when patient or intake form changes
  useEffect(() => {
    if (!open) {
      setActiveIntakeId(null);
      setActiveIntakeStatus(null);
      return;
    }

    if (existingIntake) {
      populateFromIntake(existingIntake);
      return;
    }

    const targetId = intakeFormId || clinicalStatus?.todayIntakeId;
    if (targetId) {
      setLoadingIntake(true);
      api.patients.getIntakeForm(targetId)
        .then((f) => {
          if (f && f.id) populateFromIntake(f);
        })
        .catch((err) => console.warn('Could not load intake by id:', err))
        .finally(() => setLoadingIntake(false));
      return;
    }

    if (patient?.id) {
      setLoadingIntake(true);
      api.patients.getLatestIntakeForm(patient.id)
        .then((f) => {
          if (f && f.id) {
            populateFromIntake(f);
          } else {
            resetForNewIntake();
          }
        })
        .catch(() => {
          resetForNewIntake();
        })
        .finally(() => setLoadingIntake(false));
    } else {
      resetForNewIntake();
    }
  }, [patient?.id, open, intakeFormId, clinicalStatus?.todayIntakeId, existingIntake]);

  // Load doctors for consultation selection
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingDoctors(true);
    const session = getSession();
    api.staff
      .listDoctors()
      .then((docs: any[]) => {
        if (!active) return;
        const validDocs = (docs || []).filter((u: any) => u.isActive !== false);
        setDoctors(validDocs);

        if (session?.role === 'doctor') {
          const myDoc = validDocs.find(
            (d: any) =>
              d.id === session.userId ||
              d.userId === session.userId ||
              d.staffId === session.staffId,
          );
          if (myDoc) {
            setSelectedDoctorId(myDoc.id);
            return;
          }
        }

        if (validDocs.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(validDocs[0].id);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load doctors:', err);
      })
      .finally(() => {
        if (active) setLoadingDoctors(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const handleSubmit = async (forwardToCashier: boolean) => {
    if (!name.trim()) {
      toast.error('রোগীর নাম আবশ্যক (Patient name is required)');
      return;
    }
    if (!phone.trim()) {
      toast.error('মোবাইল নম্বর আবশ্যক (Mobile phone number is required)');
      return;
    }

    try {
      setSubmitting(true);
      const safeChiefComplaint = chiefComplaint.trim() || 'সাধারণ স্বাস্থ্য ও ফিজিওথেরাপি পরামর্শ';
      const payload: any = {
        patientId: patient?.id,
        name,
        ageYears: ageYears ? parseInt(ageYears, 10) : undefined,
        phone,
        gender,
        occupation: occupation.trim() || undefined,
        address: address.trim() || undefined,

        bpSystolic: bpSystolic ? parseInt(bpSystolic, 10) : undefined,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : undefined,
        bloodSugar: bloodSugar.trim() || undefined,
        hasDiabetes: hasDiabetes ? 1 : 0,
        weightKg: weightKg.trim() || undefined,
        chiefComplaint: safeChiefComplaint,
        problemDuration: problemDuration.trim() || undefined,

        seenDoctorBefore: seenDoctorBefore ? 1 : 0,
        previousDoctorDetails: seenDoctorBefore ? previousDoctorDetails.trim() : undefined,
        hasPreviousReports: hasPreviousReports ? 1 : 0,
        previousReportNames: hasPreviousReports ? previousReportNames.trim() : undefined,
        takesRegularMedication: takesRegularMedication ? 1 : 0,
        regularMedicationDetails: takesRegularMedication ? regularMedicationDetails.trim() : undefined,
        hasDrugAllergies: hasDrugAllergies ? 1 : 0,
        drugAllergyDetails: hasDrugAllergies ? drugAllergyDetails.trim() : undefined,

        referralSource,
        referralOtherDetails: referralSource === 'other' ? referralOtherDetails.trim() : undefined,

        doctorId: selectedDoctorId || undefined,
        receptionistName: currentUser?.displayName || 'Reception Desk',
        specialNotes: specialNotes.trim() || undefined,
        forwardToCashier,
        isReIntake: effectiveIsReIntake,
      };

      let res: any;
      if (activeIntakeId) {
        payload.forwardToCashier = forwardToCashier;
        res = await api.patients.updateIntakeForm(activeIntakeId, payload);
        setActiveIntakeStatus(res.status);
        toast.success(
          forwardToCashier
            ? 'ইনটেক তথ্য সফলভাবে আপডেট ও ক্যাশিয়ারের কাছে পাঠানো হয়েছে!'
            : 'ইনটেক তথ্য সফলভাবে আপডেট ও সংরক্ষণ করা হয়েছে!'
        );
      } else {
        res = await api.patients.createIntakeForm(payload);
        setActiveIntakeId(res?.id || res?.intakeForm?.id);
        setActiveIntakeStatus(res?.status || (forwardToCashier ? 'forwarded_to_cashier' : 'submitted'));

        // Record Timeline Event if patient exists
        if (patient?.id) {
          try {
            const stepKey = forwardToCashier
              ? effectiveIsReIntake
                ? 're_intake_forwarded_to_cashier'
                : 'forwarded_to_cashier'
              : effectiveIsReIntake
              ? 're_intake_form_submitted'
              : 'intake_form_submitted';

            const titleEn = effectiveIsReIntake
              ? forwardToCashier
                ? 'Re-Intake Form Submitted & Forwarded to Cashier'
                : 'Re-Intake Clinical Evaluation Completed'
              : forwardToCashier
              ? 'Intake Form Submitted & Forwarded to Cashier'
              : 'Intake Form Recorded';

            const titleBn = effectiveIsReIntake
              ? forwardToCashier
                ? '৩+ মাস পর পুনর্বার মূল্যায়ন সম্পন্ন ও ক্যাশিয়ারে পাঠানো হয়েছে'
                : '৩+ মাস পর পুনর্বার মূল্যায়ন সংরক্ষিত হয়েছে'
              : forwardToCashier
              ? 'প্রাথমিক তথ্য পূরণ ও ক্যাশিয়ারের কাছে পাঠানো হয়েছে'
              : 'রোগীর প্রাথমিক তথ্য সংরক্ষিত হয়েছে';

            await api.patients.addTimelineEvent(patient.id, {
              step: stepKey,
              titleEn,
              titleBn,
              descriptionEn: `${
                effectiveIsReIntake ? '[Re-Intake >3 Months] ' : ''
              }Chief complaint: ${safeChiefComplaint}${
                selectedDoctorId ? '. Target doctor assigned' : ''
              }`,
              descriptionBn: `${
                effectiveIsReIntake ? '[৩+ মাস পর পুনর্বার মূল্যায়ন] ' : ''
              }প্রধান সমস্যা: ${safeChiefComplaint}${
                selectedDoctorId ? '. ডাক্তার নির্ধারিত করা হয়েছে' : ''
              }`,
              intakeFormId: res?.id || res?.intakeForm?.id,
            });
          } catch (timelineErr) {
            console.warn('Failed to record timeline event:', timelineErr);
          }
        }

        toast.success(
          effectiveIsReIntake
            ? forwardToCashier
              ? 'পুনর্বার মূল্যায়ন সফলভাবে সম্পন্ন ও ক্যাশিয়ারে পাঠানো হয়েছে!'
              : 'পুনর্বার মূল্যায়ন ফরম সফলভাবে সংরক্ষিত হয়েছে!'
            : forwardToCashier
            ? 'তথ্য সংরক্ষিত এবং ক্যাশিয়ারের কাছে সফলভাবে পাঠানো হয়েছে!'
            : 'রোগীর প্রাথমিক তথ্য সফলভাবে সংরক্ষিত হয়েছে!'
        );
      }

      if (onSuccess) onSuccess(res);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'ফরম সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const getPrintData = (): IntakeAssessmentData => {
    const docObj = doctors.find((d) => d.id === selectedDoctorId);
    return {
      mrn: patient?.mrn || 'N/A',
      date: new Date(),
      name: name.trim() || patient?.nameBn || patient?.nameEn || '',
      ageYears,
      phone,
      gender,
      occupation,
      address,
      bpSystolic,
      bpDiastolic,
      bloodSugar,
      hasDiabetes,
      weightKg,
      chiefComplaint,
      problemDuration,
      seenDoctorBefore,
      previousDoctorDetails,
      hasPreviousReports,
      previousReportNames,
      takesRegularMedication,
      regularMedicationDetails,
      hasDrugAllergies,
      drugAllergyDetails,
      referralSource,
      referralOtherDetails,
      receptionistName: currentUser?.displayName || 'Reception Desk',
      specialNotes: effectiveIsReIntake
        ? `[Re-Intake Assessment >3 Months] ${specialNotes || ''}`.trim()
        : specialNotes,
      doctorId: selectedDoctorId,
      doctorName: docObj?.displayName || docObj?.fullName || 'ডাক্তার কনসালটেশন',
    };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/80 bg-background/95 backdrop-blur-xl">
          {/* Header matching the paper form format */}
          <div
            className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between backdrop-blur-md ${
              effectiveIsReIntake
                ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/40'
                : 'bg-card/90 border-border/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-11 rounded-xl flex items-center justify-center text-white shadow-md ${
                  effectiveIsReIntake
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
                }`}
              >
                {effectiveIsReIntake ? (
                  <RefreshCw className="size-6 animate-spin-reverse" />
                ) : (
                  <FileText className="size-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold text-xs uppercase tracking-wider ${
                      effectiveIsReIntake
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-500'
                    }`}
                  >
                    HEALTH &amp; PAIN CARE (HPC)
                  </span>
                  {activeIntakeId ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                      <Sparkles className="size-3" />
                      <span>ভিউ ও এডিট মোড (View & Edit)</span>
                    </Badge>
                  ) : effectiveIsReIntake ? (
                    <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                      <AlertTriangle className="size-3" />
                      <span>৩+ মাস পর পুনর্বার মূল্যায়ন (Re-Intake)</span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                    >
                      রিসেপশন ফরম
                    </Badge>
                  )}

                  {activeIntakeStatus === 'forwarded_to_cashier' && (
                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px]">
                      ক্যাশিয়ারে প্রেরিত
                    </Badge>
                  )}
                  {(activeIntakeStatus === 'billed' || activeIntakeStatus === 'admitted_to_queue') && (
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px]">
                      বিল্ড ও সিরিয়ালে আছে
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                  {activeIntakeId
                    ? 'রোগীর প্রাথমিক তথ্য ও ইনটেক ফরম (ভিউ ও এডিট)'
                    : effectiveIsReIntake
                    ? '৩+ মাস পর পুনর্বার মূল্যায়ন ফরম (Re-Intake Assessment)'
                    : 'রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {activeIntakeId
                    ? 'সংরক্ষিত ইনটেক ফরম প্রদর্শন ও সম্পাদনা। প্রয়োজনমতো তথ্য পরিবর্তন করুন, ক্যাশিয়ারে পাঠান বা প্রিন্ট করুন।'
                    : effectiveIsReIntake
                    ? 'রোগী দীর্ঘ ৩+ মাস পর এসেছেন। পূর্ববর্তী তথ্য সংরক্ষিত আছে। বর্তমান ভাইটালস, বর্তমান প্রধান সমস্যা এবং বিগত ৩ মাসের চিকিৎসা ইতিহাস গ্রহণ করুন।'
                    : 'নতুন বা আগত রোগীর প্রাথমিক স্বাস্থ্য বিবরণী ও ডাক্তার পরামর্শ এন্ট্রি'}
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPrintModal(true)}
              className="text-xs h-8 gap-1.5 border-border hover:bg-muted/40"
            >
              <Printer className="size-3.5" />
              প্রিন্ট প্রিভিউ / A4
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Re-Intake Context Banner */}
            {effectiveIsReIntake && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>পুনর্বার মূল্যায়ন প্রোটোকল সক্রিয়</span>
                    {clinicalStatus?.daysSinceLastActivity && (
                      <span className="font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {clinicalStatus.daysSinceLastActivity} দিন নিষ্ক্রিয় ছিল
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed opacity-90">
                    পূর্ববর্তী ব্যক্তিগত তথ্য ও পুরনো রোগ নিচে স্বয়ংক্রিয়ভাবে লোড হয়েছে। অনুগ্রহ করে <strong>আজকের বর্তমান ভাইটালস (রক্তচাপ, সুগার, ওজন)</strong> এবং <strong>বিগত ৩ মাসের নতুন লক্ষণ ও ওষুধসমূহ</strong> যত্নসহকারে পূরণ করুন।
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 1: Personal Information */}
            <div className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                  <User className="size-4" />
                  <span>১. ব্যক্তিগত তথ্য (Personal Information)</span>
                </div>
                {effectiveIsReIntake && (
                  <Badge variant="secondary" className="text-[10px] font-mono text-muted-foreground">
                    পূর্ববর্তী রেকর্ড থেকে সংগৃহীত
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">রোগীর নাম (Patient Full Name) *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">মোবাইল নম্বর (Phone) *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">বয়স (Age in Years)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="125"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                    placeholder="যেমন: 45"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">লিঙ্গ (Gender) *</Label>
                  <Select value={gender} onValueChange={(val: any) => setGender(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">পুরুষ (Male)</SelectItem>
                      <SelectItem value="female">মহিলা (Female)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">পেশা (Occupation)</Label>
                  <Input
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="যেমন: শিক্ষক, ব্যবসায়ী, গৃহিণী"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-xs font-medium">ঠিকানা (Address)</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="গ্রাম/রোড, পোস্ট, থানা, জেলা (যেমন: চাঁচড়া ডালমিল, যশোর সদর)"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Primary Health Info (Today's Vitals - Primary Focus) */}
            <div
              className={`p-4 rounded-xl border space-y-4 transition-all ${
                effectiveIsReIntake
                  ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-border/70 bg-card/50'
              }`}
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2 text-rose-500 font-semibold text-sm">
                  <HeartPulse className="size-4" />
                  <span>
                    {effectiveIsReIntake
                      ? '২. আজকের ভাইটালস ও বর্তমান উপসর্গ (Today\'s Vitals & Presenting Complaints) *'
                      : '২. প্রাথমিক স্বাস্থ্য তথ্য (Initial Health Information)'}
                  </span>
                </div>
                {effectiveIsReIntake && (
                  <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[10px]">
                    আজকের জন্য পূরণ আবশ্যক
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center justify-between">
                    <span>রক্তচাপ সিস্টোলিক (BP Systolic)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">mmHg</span>
                  </Label>
                  <Input
                    type="number"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    placeholder="120"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center justify-between">
                    <span>রক্তচাপ ডায়াস্টোলিক (BP Diastolic)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">mmHg</span>
                  </Label>
                  <Input
                    type="number"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    placeholder="80"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center justify-between">
                    <span>রক্তে শর্করা (Blood Sugar)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">mmol/L</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    placeholder="যেমন: 6.8"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center justify-between">
                    <span>ওজন (Weight)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">KG</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="যেমন: 65.5"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium">ডায়াবেটিস আছে কি? (Has Diabetes?)</Label>
                    <p className="text-[11px] text-muted-foreground">
                      রোগী কি ডায়াবেটিসে আক্রান্ত বা সুগারের ওষুধ গ্রহণ করছেন?
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{hasDiabetes ? 'হ্যাঁ (Yes)' : 'না (No)'}</span>
                    <Switch checked={hasDiabetes} onCheckedChange={setHasDiabetes} />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs font-medium flex items-center justify-between">
                    <span>প্রধান শারীরিক সমস্যা / উপসর্গ (Chief Complaint) *</span>
                    {effectiveIsReIntake && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        বর্তমান নতুন/চলমান সমস্যা লিখুন
                      </span>
                    )}
                  </Label>
                  <Textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder={
                      effectiveIsReIntake
                        ? '৩+ মাস পর বর্তমানে কি কি শারীরিক সমস্যা দেখা দিয়েছে (যেমন: কোমর ব্যথা আবার শুরু হয়েছে, ডান পায়ে ঝিঁঝিঁ লাগে...)'
                        : 'যেমন: কোমর ব্যথা পায়ে নেমে যায়, ঘাড় শক্ত হয়ে আছে ও হাত অবশ লাগে...'
                    }
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label className="text-xs font-medium">কতদিন ধরে এই সমস্যা? (Duration)</Label>
                  <Input
                    value={problemDuration}
                    onChange={(e) => setProblemDuration(e.target.value)}
                    placeholder={effectiveIsReIntake ? 'যেমন: সাম্প্রতিক ১৫ দিন' : 'যেমন: ৩ মাস / ১৫ দিন'}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Past Medical History */}
            <div className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                  <History className="size-4" />
                  <span>
                    {effectiveIsReIntake
                      ? '৩. বিগত ৩ মাসের চিকিৎসা ও পরীক্ষা রিপোর্ট (Last 3 Months History)'
                      : '৩. পূর্বের চিকিৎসা সংক্রান্ত তথ্য (Past Medical History)'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Previous Doctor */}
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {effectiveIsReIntake
                        ? 'বিগত ৩ মাসে অন্য কোনো ডাক্তার দেখিয়েছেন কি?'
                        : 'আগে কোনো ডাক্তার দেখিয়েছেন কি?'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{seenDoctorBefore ? 'হ্যাঁ' : 'না'}</span>
                      <Switch checked={seenDoctorBefore} onCheckedChange={setSeenDoctorBefore} />
                    </div>
                  </div>
                  {seenDoctorBefore && (
                    <Input
                      value={previousDoctorDetails}
                      onChange={(e) => setPreviousDoctorDetails(e.target.value)}
                      placeholder="কোথায় / কোন বিশেষজ্ঞ ডাক্তারকে দেখিয়েছেন বিস্তারিত লিখুন"
                      className="h-8 text-xs bg-background"
                    />
                  )}
                </div>

                {/* Previous Reports */}
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {effectiveIsReIntake
                        ? 'বিগত ৩ মাসে নতুন কোনো পরীক্ষা / রিপোর্ট করিয়েছেন কি?'
                        : 'আগে কোনো পরীক্ষা / রিপোর্ট আছে কি?'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{hasPreviousReports ? 'হ্যাঁ' : 'না'}</span>
                      <Switch checked={hasPreviousReports} onCheckedChange={setHasPreviousReports} />
                    </div>
                  </div>
                  {hasPreviousReports && (
                    <Input
                      value={previousReportNames}
                      onChange={(e) => setPreviousReportNames(e.target.value)}
                      placeholder="পরীক্ষার নাম (যেমন: Lumbar MRI, X-Ray Cervical Spine, CBC)"
                      className="h-8 text-xs bg-background"
                    />
                  )}
                </div>

                {/* Regular Medication */}
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">বর্তমানে নিয়মিত কোনো ওষুধ গ্রহণ করছেন কি?</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{takesRegularMedication ? 'হ্যাঁ' : 'না'}</span>
                      <Switch checked={takesRegularMedication} onCheckedChange={setTakesRegularMedication} />
                    </div>
                  </div>
                  {takesRegularMedication && (
                    <Input
                      value={regularMedicationDetails}
                      onChange={(e) => setRegularMedicationDetails(e.target.value)}
                      placeholder="ওষুধের নাম ও বিবরণ লিখুন"
                      className="h-8 text-xs bg-background"
                    />
                  )}
                </div>

                {/* Drug Allergies */}
                <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-rose-500">কোনো ওষুধে অ্যালার্জি আছে কি?</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{hasDrugAllergies ? 'হ্যাঁ' : 'না'}</span>
                      <Switch checked={hasDrugAllergies} onCheckedChange={setHasDrugAllergies} />
                    </div>
                  </div>
                  {hasDrugAllergies && (
                    <Input
                      value={drugAllergyDetails}
                      onChange={(e) => setDrugAllergyDetails(e.target.value)}
                      placeholder="কোন কোন ওষুধে অ্যালার্জি (যেমন: Penicillin, Sulfa, Paracetamol)"
                      className="h-8 text-xs bg-background border-rose-500/40"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 4: Referral Source */}
            <div className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-3">
              <div className="flex items-center gap-2 text-cyan-500 font-semibold text-sm border-b border-border/50 pb-2">
                <Share2 className="size-4" />
                <span>৪. আমাদের সেন্টারের কথা কীভাবে জেনেছেন? (Discovery Source)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                {[
                  { id: 'facebook', label: 'ফেসবুক (Facebook)' },
                  { id: 'google', label: 'গুগল (Google)' },
                  { id: 'known_person', label: 'পরিচিত ব্যক্তি' },
                  { id: 'previous_patient', label: 'পূর্বের রোগী' },
                  { id: 'other', label: 'অন্যান্য (Other)' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setReferralSource(item.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all text-xs font-medium flex items-center justify-between ${
                      referralSource === item.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'border-border/50 hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <span>{item.label}</span>
                    {referralSource === item.id && (
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {referralSource === 'other' && (
                <Input
                  value={referralOtherDetails}
                  onChange={(e) => setReferralOtherDetails(e.target.value)}
                  placeholder="অন্যান্য সূত্র বিস্তারিত লিখুন..."
                  className="h-8 text-xs mt-2"
                />
              )}
            </div>

            {/* SECTION 5: Target Doctor & Reception Notes */}
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm border-emerald-500/20 pb-2">
                <Stethoscope className="size-4" />
                <span>৫. রিসেপশন ব্যবহারের জন্য (For Reception Use)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    পরামর্শের জন্য ডাক্তার নির্বাচন করুন (Target Doctor) *
                  </Label>
                  {loadingDoctors ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="size-3.5 animate-spin" /> ডাক্তারদের তালিকা লোড হচ্ছে...
                    </div>
                  ) : (
                    <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                      <SelectTrigger className="h-10 text-xs border-emerald-500/50 bg-background">
                        <SelectValue placeholder="ডাক্তার নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doc) => {
                          const roomDisplay = doc.chamberRoomNumber
                            ? `রুম: ${doc.chamberRoomNumber}${doc.chamberName ? ` (${doc.chamberName})` : ''}`
                            : doc.chamberName || 'চেম্বার নির্ধারিত';
                          const feeVal =
                            doc.consultationFeeTaka ||
                            (doc.consultationFeePaisa
                              ? Math.round(doc.consultationFeePaisa / 100)
                              : doc.consultationFee);
                          return (
                            <SelectItem key={doc.id} value={doc.id}>
                              <div className="flex items-center justify-between w-full gap-3">
                                <span className="font-semibold">
                                  {doc.displayName || doc.fullName || doc.email}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {roomDisplay}
                                  {feeVal ? ` • ফি: ৳${feeVal}` : ''}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    ক্যাশিয়ার এই ডাক্তারের নির্ধারিত ফি গ্রহণ করে সরাসরি কিউতে যুক্ত করবেন।
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">রেফারেন্স / বিশেষ মন্তব্য (Special Notes)</Label>
                  <Input
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="যেমন: দ্রুত সেবা প্রয়োজন, জরুরি ইত্যাদি"
                    className="h-10 text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="sticky bottom-0 z-10 bg-card/95 backdrop-blur-md px-6 py-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-3"
            style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }}
          >
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {effectiveIsReIntake
                  ? '৩+ মাস পর পুনর্বার মূল্যায়ন মোড সক্রিয়'
                  : 'সকল আবশ্যক ফিল্ড চিহ্নিত করা হয়েছে'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setShowPrintModal(true)}
                className="text-xs h-9 gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <Printer className="size-3.5" />
                প্রিন্ট প্রিভিউ (A4)
              </Button>

              {activeIntakeId ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                    className="text-xs h-9 gap-1.5"
                  >
                    <Save className="size-3.5" />
                    পরিবর্তন সংরক্ষণ করুন
                  </Button>

                  {activeIntakeStatus !== 'forwarded_to_cashier' &&
                    activeIntakeStatus !== 'billed' &&
                    activeIntakeStatus !== 'admitted_to_queue' && (
                      <Button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSubmit(true)}
                        className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> পাঠানো হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Send className="size-3.5" />
                            ক্যাশিয়ারের কাছে পাঠান
                          </>
                        )}
                      </Button>
                    )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                    className="text-xs h-9 gap-1.5"
                  >
                    <Save className="size-3.5" />
                    শুধু সংরক্ষণ করুন
                  </Button>

                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit(true)}
                    className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> সংরক্ষণ হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        সংরক্ষণ ও ক্যাশিয়ারের কাছে পাঠান
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* A4 Print Modal */}
      <IntakeAssessmentPrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        data={getPrintData()}
      />
    </>
  );
}
