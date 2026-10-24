'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { api, UserSession } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  Activity,
  HeartPulse,
  User,
  Stethoscope,
  Printer,
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PainAssessmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
  doctorId?: string;
  doctorName?: string;
  visitId?: string;
  currentUser?: UserSession | null;
  existingFile?: any | null;
  onSuccess?: (savedFile: any) => void;
}

const PAIN_AREAS = ['Neck', 'Shoulder', 'Back', 'Knee', 'Heel', 'Others'];
const PAIN_TYPES = ['Sharp', 'Dull', 'Burning', 'Radiating'];
const PAIN_INCREASES_WITH = ['Movement', 'Sitting', 'Standing', 'Walking'];
const PAIN_REDUCES_WITH = ['Rest', 'Medicine', 'Heat'];
const PREVIOUS_TREATMENTS = ['Medicine', 'Physiotherapy'];
const FUNCTIONAL_LIMITATIONS = ['Bending', 'Sitting', 'Standing', 'Walking', 'Lifting'];
const TREATMENT_PLANS = [
  'Hot pack',
  'IFT / TENS',
  'Ultrasound',
  'Stretching',
  'Strengthening',
  'Posture correction',
];

export function PainAssessmentFormModal({
  open,
  onOpenChange,
  patient,
  doctorId,
  doctorName,
  visitId,
  currentUser,
  existingFile,
  onSuccess,
}: PainAssessmentFormModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Section 1: Demographics Snapshot
  const [assessmentDate, setAssessmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [idNo, setIdNo] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');

  // Section 2: Pain Details
  const [painAreas, setPainAreas] = useState<string[]>([]);
  const [painAreaOthers, setPainAreaOthers] = useState('');
  const [side, setSide] = useState<'Right' | 'Left' | 'Both' | ''>('');
  const [duration, setDuration] = useState('');
  const [painTypes, setPainTypes] = useState<string[]>([]);

  // Section 3: Pain Scale
  const [vasScore, setVasScore] = useState<number>(5);
  const [painIncreasesWith, setPainIncreasesWith] = useState<string[]>([]);
  const [painReducesWith, setPainReducesWith] = useState<string[]>([]);

  // Section 4: History
  const [injuryAccident, setInjuryAccident] = useState<'yes' | 'no'>('no');
  const [injuryDetails, setInjuryDetails] = useState('');
  const [postureAdvice, setPostureAdvice] = useState<'yes' | 'no'>('no');
  const [postureHabits, setPostureHabits] = useState('');
  const [surgeryHistory, setSurgeryHistory] = useState<'yes' | 'no'>('no');
  const [surgeryDetails, setSurgeryDetails] = useState('');
  const [previousTreatment, setPreviousTreatment] = useState<string[]>([]);
  const [previousTreatmentDetails, setPreviousTreatmentDetails] = useState('');

  // Section 5: Functional Limitation
  const [functionalLimitations, setFunctionalLimitations] = useState<string[]>([]);
  const [functionalNotes, setFunctionalNotes] = useState('');

  // Section 6: Physical Examination
  const [rom, setRom] = useState<'Normal' | 'Restricted'>('Normal');
  const [muscleSpasm, setMuscleSpasm] = useState<'yes' | 'no'>('no');
  const [tenderness, setTenderness] = useState<'yes' | 'no'>('no');
  const [swelling, setSwelling] = useState<'yes' | 'no'>('no');
  const [physicalExamNotes, setPhysicalExamNotes] = useState('');

  // Section 7: Physiotherapy Diagnosis
  const [diagnosis, setDiagnosis] = useState('');

  // Section 8: Treatment Plan
  const [treatmentPlans, setTreatmentPlans] = useState<string[]>([]);
  const [treatmentPlanNotes, setTreatmentPlanNotes] = useState('');
  const [prescribedSessions, setPrescribedSessions] = useState<string>('10');

  // Section 9: Home Advice (Blue Box)
  const [exerciseExplained, setExerciseExplained] = useState<'yes' | 'no'>('yes');
  const [homePostureAdvice, setHomePostureAdvice] = useState<'yes' | 'no'>('yes');
  const [homeAdviceNotes, setHomeAdviceNotes] = useState('');

  // Section 10: Follow-up & Progress
  const [painScaleAfterTreatment, setPainScaleAfterTreatment] = useState<string>('');
  const [improvement, setImprovement] = useState('');
  const [therapistSignature, setTherapistSignature] = useState('');

  // Prefill or Load Existing
  useEffect(() => {
    if (existingFile) {
      setAssessmentDate(existingFile.assessmentDate || new Date().toISOString().split('T')[0]);
      setName(existingFile.name || '');
      setAge(existingFile.age || '');
      setGender(existingFile.gender === 'female' ? 'female' : 'male');
      setIdNo(existingFile.idNo || '');
      setOccupation(existingFile.occupation || '');
      setAddress(existingFile.address || '');
      setMobile(existingFile.mobile || '');

      setPainAreas(Array.isArray(existingFile.painAreas) ? existingFile.painAreas : []);
      setPainAreaOthers(existingFile.painAreaOthers || '');
      setSide(existingFile.side || '');
      setDuration(existingFile.duration || '');
      setPainTypes(Array.isArray(existingFile.painTypes) ? existingFile.painTypes : []);

      setVasScore(typeof existingFile.vasScore === 'number' ? existingFile.vasScore : 5);
      setPainIncreasesWith(Array.isArray(existingFile.painIncreasesWith) ? existingFile.painIncreasesWith : []);
      setPainReducesWith(Array.isArray(existingFile.painReducesWith) ? existingFile.painReducesWith : []);

      setInjuryAccident(existingFile.injuryAccident === 'yes' ? 'yes' : 'no');
      setInjuryDetails(existingFile.injuryDetails || '');
      setPostureAdvice(existingFile.postureAdvice === 'yes' ? 'yes' : 'no');
      setPostureHabits(existingFile.postureHabits || '');
      setSurgeryHistory(existingFile.surgeryHistory === 'yes' ? 'yes' : 'no');
      setSurgeryDetails(existingFile.surgeryDetails || '');
      setPreviousTreatment(Array.isArray(existingFile.previousTreatment) ? existingFile.previousTreatment : []);
      setPreviousTreatmentDetails(existingFile.previousTreatmentDetails || '');

      setFunctionalLimitations(Array.isArray(existingFile.functionalLimitations) ? existingFile.functionalLimitations : []);
      setFunctionalNotes(existingFile.functionalNotes || '');

      setRom(existingFile.rom === 'Restricted' ? 'Restricted' : 'Normal');
      setMuscleSpasm(existingFile.muscleSpasm === 'yes' ? 'yes' : 'no');
      setTenderness(existingFile.tenderness === 'yes' ? 'yes' : 'no');
      setSwelling(existingFile.swelling === 'yes' ? 'yes' : 'no');
      setPhysicalExamNotes(existingFile.physicalExamNotes || '');

      setDiagnosis(existingFile.diagnosis || '');

      setTreatmentPlans(Array.isArray(existingFile.treatmentPlans) ? existingFile.treatmentPlans : []);
      setTreatmentPlanNotes(existingFile.treatmentPlanNotes || '');
      setPrescribedSessions(existingFile.prescribedSessions ? String(existingFile.prescribedSessions) : '10');

      setExerciseExplained(existingFile.exerciseExplained === 'no' ? 'no' : 'yes');
      setHomePostureAdvice(existingFile.homePostureAdvice === 'no' ? 'no' : 'yes');
      setHomeAdviceNotes(existingFile.homeAdviceNotes || '');

      setPainScaleAfterTreatment(
        existingFile.painScaleAfterTreatment !== null && existingFile.painScaleAfterTreatment !== undefined
          ? String(existingFile.painScaleAfterTreatment)
          : ''
      );
      setImprovement(existingFile.improvement || '');
      setTherapistSignature(existingFile.therapistSignature || '');
    } else if (patient) {
      setAssessmentDate(new Date().toISOString().split('T')[0]);
      setName(patient.nameEn || patient.name || '');
      setAge(patient.ageYears ? String(patient.ageYears) : '');
      setGender(patient.gender === 'female' ? 'female' : 'male');
      setIdNo(patient.mrn || '');
      setOccupation(patient.occupation || '');
      setAddress(patient.address || '');
      setMobile(patient.phone || '');

      setPainAreas([]);
      setPainAreaOthers('');
      setSide('');
      setDuration('');
      setPainTypes([]);
      setVasScore(5);
      setPainIncreasesWith([]);
      setPainReducesWith([]);

      setInjuryAccident('no');
      setInjuryDetails('');
      setPostureAdvice('no');
      setPostureHabits('');
      setSurgeryHistory('no');
      setSurgeryDetails('');
      setPreviousTreatment([]);
      setPreviousTreatmentDetails('');

      setFunctionalLimitations([]);
      setFunctionalNotes('');

      setRom('Normal');
      setMuscleSpasm('no');
      setTenderness('no');
      setSwelling('no');
      setPhysicalExamNotes('');

      setDiagnosis('');
      setTreatmentPlans(['Hot pack', 'IFT / TENS']);
      setTreatmentPlanNotes('');
      setPrescribedSessions('10');

      setExerciseExplained('yes');
      setHomePostureAdvice('yes');
      setHomeAdviceNotes('');

      setPainScaleAfterTreatment('');
      setImprovement('');
      setTherapistSignature(doctorName || currentUser?.displayName || 'Physiotherapist');
    }
  }, [existingFile, patient, doctorName, currentUser]);

  const toggleArrayItem = (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const getVasColor = (score: number) => {
    if (score === 0) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (score <= 3) return 'text-teal-500 bg-teal-500/10 border-teal-500/30';
    if (score <= 6) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (score <= 8) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
  };

  const getVasLabel = (score: number) => {
    if (score === 0) return 'No Pain (ব্যথাহীন)';
    if (score <= 3) return 'Mild Pain (হালকা ব্যথা)';
    if (score <= 6) return 'Moderate Pain (মাঝারি ব্যথা)';
    if (score <= 8) return 'Severe Pain (তীব্র ব্যথা)';
    return 'Worst Possible Pain (অসহ্য তীব্র ব্যথা)';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePatientId = patient?.id || existingFile?.patientId;
    if (!effectivePatientId) {
      toast.error('রোগীর আইডি পাওয়া যায়নি (Patient ID is required)');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        assessmentDate,
        name: name.trim() || patient?.nameEn || 'Patient',
        age: age ? parseInt(age, 10) : undefined,
        gender,
        idNo: idNo || patient?.mrn,
        occupation: occupation.trim() || undefined,
        address: address.trim() || undefined,
        mobile: mobile.trim() || undefined,

        painAreas,
        painAreaOthers: painAreas.includes('Others') ? painAreaOthers.trim() : undefined,
        side: side || undefined,
        duration: duration.trim() || undefined,
        painTypes,

        vasScore,
        painIncreasesWith,
        painReducesWith,

        injuryAccident,
        injuryDetails: injuryAccident === 'yes' ? injuryDetails.trim() : undefined,
        postureAdvice,
        postureHabits: postureAdvice === 'yes' ? postureHabits.trim() : undefined,
        surgeryHistory,
        surgeryDetails: surgeryHistory === 'yes' ? surgeryDetails.trim() : undefined,
        previousTreatment,
        previousTreatmentDetails: previousTreatmentDetails.trim() || undefined,

        functionalLimitations,
        functionalNotes: functionalNotes.trim() || undefined,

        rom,
        muscleSpasm,
        tenderness,
        swelling,
        physicalExamNotes: physicalExamNotes.trim() || undefined,

        diagnosis: diagnosis.trim() || undefined,

        treatmentPlans,
        treatmentPlanNotes: treatmentPlanNotes.trim() || undefined,
        prescribedSessions: prescribedSessions ? parseInt(prescribedSessions, 10) : undefined,

        exerciseExplained,
        homePostureAdvice,
        homeAdviceNotes: homeAdviceNotes.trim() || undefined,

        painScaleAfterTreatment: painScaleAfterTreatment ? parseInt(painScaleAfterTreatment, 10) : undefined,
        improvement: improvement.trim() || undefined,
        therapistSignature: therapistSignature.trim() || undefined,

        doctorId: doctorId || currentUser?.staffId || currentUser?.userId,
        doctorName: doctorName || currentUser?.displayName,
        visitId: visitId || existingFile?.visitId,
      };

      let result;
      if (existingFile?.id) {
        result = await api.patients.updateAssessmentFile(existingFile.id, payload);
        toast.success(`অ্যাসেসমেন্ট ফাইল #${existingFile.fileNumber} সফলভাবে আপডেট হয়েছে`);
      } else {
        result = await api.patients.createAssessmentFile(effectivePatientId, payload);
        toast.success(`নতুন অ্যাসেসমেন্ট ফাইল #${result.fileNumber} সফলভাবে প্রস্তুত হয়েছে`);
      }

      onSuccess?.(result);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'অ্যাসেসমেন্ট ফাইল সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[96vw] max-w-5xl max-h-[92vh] flex flex-col p-0 border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <FileText className="size-5 sm:size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-xl font-black text-foreground">
                  {existingFile ? 'পেইন ফিজিওথেরাপি অ্যাসেসমেন্ট ফাইল' : 'নতুন পেইন ফিজিওথেরাপি অ্যাসেসমেন্ট'}
                </DialogTitle>
                <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                  {existingFile?.fileNumber || 'NEW FILE'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                HEALTH AND PAIN CARE CENTER · PAIN PHYSIOTHERAPY CLINICAL RECORD SHEET
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 sm:h-9 text-xs gap-1.5 border-border/80 text-foreground hover:bg-muted"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">প্রিন্ট কপি (Print)</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
          {/* Paper Form Header Replica */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent text-center space-y-1 shadow-xs">
            <h1 className="text-base sm:text-xl font-black tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
              HEALTH AND PAIN CARE CENTER
            </h1>
            <h2 className="text-xs sm:text-sm font-extrabold tracking-wide text-foreground uppercase">
              PAIN PHYSIOTHERAPY ASSESSMENT
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Official Physical Therapy Evaluation &amp; Treatment Progression Document
            </p>
          </div>

          {/* Section 1: Demographics Header */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <User className="size-3.5" />
                <span>1. Patient Demographics (প্রাথমিক তথ্য)</span>
              </span>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">তারিখ / Date:</Label>
                <Input
                  type="date"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  className="h-8 text-xs w-36 bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-muted-foreground">রোগীর নাম / Name:</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Patient Name"
                  className="h-8 text-xs mt-1 bg-background"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">বয়স / Age:</Label>
                <Input
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 45"
                  className="h-8 text-xs mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">আইডি নং / ID No. (MRN):</Label>
                <Input
                  value={idNo}
                  onChange={(e) => setIdNo(e.target.value)}
                  placeholder="HPC-26-00001"
                  className="h-8 text-xs mt-1 bg-background font-mono"
                  readOnly
                />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">লিঙ্গ / Gender:</Label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === 'male'}
                      onChange={() => setGender('male')}
                      className="accent-emerald-600"
                    />
                    <span>Male (পুরুষ)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === 'female'}
                      onChange={() => setGender('female')}
                      className="accent-emerald-600"
                    />
                    <span>Female (মহিলা)</span>
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">পেশা / Occupation:</Label>
                <Input
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Service, Business, Teacher"
                  className="h-8 text-xs mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">মোবাইল / Mobile:</Label>
                <Input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="h-8 text-xs mt-1 bg-background font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">ঠিকানা / Address:</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Patient Residence / Area"
                  className="h-8 text-xs mt-1 bg-background"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pain Details */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Activity className="size-3.5" />
              <span>2. Pain Details (ব্যথার বিবরণী)</span>
            </span>

            {/* Pain Area */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Pain Area (ব্যথার স্থান):
              </Label>
              <div className="flex flex-wrap items-center gap-4">
                {PAIN_AREAS.map((area) => (
                  <label
                    key={area}
                    className="inline-flex items-center gap-2 text-xs bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 cursor-pointer select-none transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={painAreas.includes(area)}
                      onChange={() => toggleArrayItem(painAreas, area, setPainAreas)}
                      className="accent-emerald-600 size-4 rounded"
                    />
                    <span className="font-medium text-foreground">{area}</span>
                  </label>
                ))}
              </div>

              {painAreas.includes('Others') && (
                <div className="pt-1 max-w-sm">
                  <Input
                    value={painAreaOthers}
                    onChange={(e) => setPainAreaOthers(e.target.value)}
                    placeholder="Specify other pain area (অন্যান্য স্থানের নাম)..."
                    className="h-8 text-xs bg-background"
                  />
                </div>
              )}
            </div>

            {/* Side, Duration, Pain Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/40">
              {/* Side */}
              <div>
                <Label className="text-xs font-semibold text-foreground">Side (পাশ):</Label>
                <div className="flex items-center gap-4 mt-2">
                  {['Right', 'Left', 'Both'].map((s) => (
                    <label key={s} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="painSide"
                        checked={side === s}
                        onChange={() => setSide(s as any)}
                        className="accent-emerald-600"
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label className="text-xs font-semibold text-foreground">Duration (স্থায়িত্বকাল):</Label>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2 weeks / 6 months"
                  className="h-8 text-xs mt-1 bg-background"
                />
              </div>

              {/* Pain Type */}
              <div>
                <Label className="text-xs font-semibold text-foreground">Pain Type (ব্যথার ধরন):</Label>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                  {PAIN_TYPES.map((type) => (
                    <label
                      key={type}
                      className="inline-flex items-center gap-1.5 text-xs bg-muted/40 hover:bg-muted/70 px-2 py-1 rounded-md border border-border/60 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={painTypes.includes(type)}
                        onChange={() => toggleArrayItem(painTypes, type, setPainTypes)}
                        className="accent-emerald-600 size-3.5 rounded"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Pain Scale (VAS) */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border/50 pb-2">
              <HeartPulse className="size-3.5" />
              <span>3. Pain Scale (ব্যথা পরিমাপ স্কেল)</span>
            </span>

            {/* Interactive Visual Analog Scale Slider */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-xs font-bold text-foreground">
                  VAS (0-10): <span className="text-sm font-black font-mono">{vasScore}/10</span>
                </Label>
                <Badge variant="outline" className={cn('font-bold text-xs px-2.5 py-0.5 border', getVasColor(vasScore))}>
                  {getVasLabel(vasScore)}
                </Badge>
              </div>

              <Slider
                min={0}
                max={10}
                step={1}
                value={[vasScore]}
                onValueChange={(val: any) => setVasScore(Array.isArray(val) ? val[0] : val)}
                className="w-full py-2"
              />

              <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-1">
                <span>0 (ব্যথাহীন)</span>
                <span>2</span>
                <span>4</span>
                <span>6</span>
                <span>8</span>
                <span className="text-rose-500 font-bold">10 (সর্বোচ্চ অসহ্য)</span>
              </div>
            </div>

            {/* Pain Increases With / Reduces With */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Pain Increases With */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Pain increases with (ব্যথা বৃদ্ধি পায়):
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {PAIN_INCREASES_WITH.map((factor) => (
                    <label
                      key={factor}
                      className="inline-flex items-center gap-1.5 text-xs bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-md border border-border/60 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={painIncreasesWith.includes(factor)}
                        onChange={() => toggleArrayItem(painIncreasesWith, factor, setPainIncreasesWith)}
                        className="accent-rose-600 size-3.5 rounded"
                      />
                      <span>{factor}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pain Reduces With */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Pain reduces with (ব্যথা হ্রাস পায়):
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {PAIN_REDUCES_WITH.map((factor) => (
                    <label
                      key={factor}
                      className="inline-flex items-center gap-1.5 text-xs bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-md border border-border/60 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={painReducesWith.includes(factor)}
                        onChange={() => toggleArrayItem(painReducesWith, factor, setPainReducesWith)}
                        className="accent-emerald-600 size-3.5 rounded"
                      />
                      <span>{factor}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: History */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Info className="size-3.5" />
              <span>4. History (পূর্ববর্তী রোগের ইতিহাস)</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Injury / Accident */}
              <div className="space-y-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Injury / Accident (আঘাতের ইতিহাস):</Label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="injury"
                        checked={injuryAccident === 'yes'}
                        onChange={() => setInjuryAccident('yes')}
                        className="accent-emerald-600"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="injury"
                        checked={injuryAccident === 'no'}
                        onChange={() => setInjuryAccident('no')}
                        className="accent-emerald-600"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
                {injuryAccident === 'yes' && (
                  <Input
                    value={injuryDetails}
                    onChange={(e) => setInjuryDetails(e.target.value)}
                    placeholder="আঘাতের বিবরণ লিখুন..."
                    className="h-7 text-xs mt-1 bg-background"
                  />
                )}
              </div>

              {/* Posture Advice / Habits */}
              <div className="space-y-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Posture advice / habit (বসার ভঙ্গি):</Label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="posture"
                        checked={postureAdvice === 'yes'}
                        onChange={() => setPostureAdvice('yes')}
                        className="accent-emerald-600"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="posture"
                        checked={postureAdvice === 'no'}
                        onChange={() => setPostureAdvice('no')}
                        className="accent-emerald-600"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
                {postureAdvice === 'yes' && (
                  <Input
                    value={postureHabits}
                    onChange={(e) => setPostureHabits(e.target.value)}
                    placeholder="ভুল অঙ্গভঙ্গির বিবরণ..."
                    className="h-7 text-xs mt-1 bg-background"
                  />
                )}
              </div>

              {/* Surgery History */}
              <div className="space-y-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Surgery history (অস্ত্রোপচারের ইতিহাস):</Label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="surgery"
                        checked={surgeryHistory === 'yes'}
                        onChange={() => setSurgeryHistory('yes')}
                        className="accent-emerald-600"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="surgery"
                        checked={surgeryHistory === 'no'}
                        onChange={() => setSurgeryHistory('no')}
                        className="accent-emerald-600"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
                {surgeryHistory === 'yes' && (
                  <Input
                    value={surgeryDetails}
                    onChange={(e) => setSurgeryDetails(e.target.value)}
                    placeholder="অস্ত্রোপচারের নাম ও তারিখ..."
                    className="h-7 text-xs mt-1 bg-background"
                  />
                )}
              </div>

              {/* Previous Treatment */}
              <div className="space-y-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/10">
                <Label className="text-xs font-semibold text-foreground">
                  Previous treatment (পূর্বের চিকিৎসা):
                </Label>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {PREVIOUS_TREATMENTS.map((treat) => (
                    <label
                      key={treat}
                      className="inline-flex items-center gap-1.5 text-xs bg-muted/40 hover:bg-muted/70 px-2 py-0.5 rounded-md border border-border/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={previousTreatment.includes(treat)}
                        onChange={() => toggleArrayItem(previousTreatment, treat, setPreviousTreatment)}
                        className="accent-emerald-600 size-3.5 rounded"
                      />
                      <span>{treat}</span>
                    </label>
                  ))}
                </div>
                <Input
                  value={previousTreatmentDetails}
                  onChange={(e) => setPreviousTreatmentDetails(e.target.value)}
                  placeholder="পূর্ববর্তী চিকিৎসার বিবরণ (ওষুধ বা ফিজিওথেরাপি)..."
                  className="h-7 text-xs mt-1 bg-background"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Functional Limitation */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Activity className="size-3.5" />
              <span>5. Functional Limitation (দৈনন্দিন কাজে সীমাবদ্ধতা)</span>
            </span>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Difficulty in (যেসব কাজে সমস্যা হয়):
              </Label>
              <div className="flex flex-wrap items-center gap-2.5">
                {FUNCTIONAL_LIMITATIONS.map((limit) => (
                  <label
                    key={limit}
                    className="inline-flex items-center gap-2 text-xs bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={functionalLimitations.includes(limit)}
                      onChange={() => toggleArrayItem(functionalLimitations, limit, setFunctionalLimitations)}
                      className="accent-emerald-600 size-4 rounded"
                    />
                    <span className="font-medium text-foreground">{limit}</span>
                  </label>
                ))}
              </div>

              <Textarea
                value={functionalNotes}
                onChange={(e) => setFunctionalNotes(e.target.value)}
                placeholder="অতিরিক্ত কাজের সমস্যা বা নোট লিখুন..."
                rows={2}
                className="text-xs bg-background mt-2"
              />
            </div>
          </div>

          {/* Section 6: Physical Examination */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Stethoscope className="size-3.5" />
              <span>6. Physical Examination (শারীরিক পরীক্ষা)</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* ROM */}
              <div className="p-2.5 rounded-lg border border-border/50 bg-muted/10 space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">ROM (রেঞ্জ অব মোশন):</Label>
                <div className="flex flex-col gap-1 mt-1">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="rom"
                      checked={rom === 'Normal'}
                      onChange={() => setRom('Normal')}
                      className="accent-emerald-600"
                    />
                    <span>Normal</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="rom"
                      checked={rom === 'Restricted'}
                      onChange={() => setRom('Restricted')}
                      className="accent-rose-600"
                    />
                    <span className="text-rose-600 dark:text-rose-400 font-medium">Restricted</span>
                  </label>
                </div>
              </div>

              {/* Muscle Spasm */}
              <div className="p-2.5 rounded-lg border border-border/50 bg-muted/10 space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Muscle spasm (মাংসপেশির টান):</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="muscleSpasm"
                      checked={muscleSpasm === 'yes'}
                      onChange={() => setMuscleSpasm('yes')}
                      className="accent-emerald-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="muscleSpasm"
                      checked={muscleSpasm === 'no'}
                      onChange={() => setMuscleSpasm('no')}
                      className="accent-emerald-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Tenderness */}
              <div className="p-2.5 rounded-lg border border-border/50 bg-muted/10 space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Tenderness (স্পর্শে ব্যথা):</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tenderness"
                      checked={tenderness === 'yes'}
                      onChange={() => setTenderness('yes')}
                      className="accent-emerald-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tenderness"
                      checked={tenderness === 'no'}
                      onChange={() => setTenderness('no')}
                      className="accent-emerald-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Swelling */}
              <div className="p-2.5 rounded-lg border border-border/50 bg-muted/10 space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Swelling (ফোলাভাব):</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="swelling"
                      checked={swelling === 'yes'}
                      onChange={() => setSwelling('yes')}
                      className="accent-emerald-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="swelling"
                      checked={swelling === 'no'}
                      onChange={() => setSwelling('no')}
                      className="accent-emerald-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>

            <Textarea
              value={physicalExamNotes}
              onChange={(e) => setPhysicalExamNotes(e.target.value)}
              placeholder="শারীরিক পরীক্ষার অন্যান্য পর্যবেক্ষণ (Palpation, Special Tests, Gait, etc.)..."
              rows={2}
              className="text-xs bg-background mt-2"
            />
          </div>

          {/* Section 7: Physiotherapy Diagnosis */}
          <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>7. Physiotherapy Diagnosis (ফিজিওথেরাপি রোগ নির্ণয়)</span>
            </span>

            <Input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Cervical Spondylosis with Radiculopathy / Lumbar PIVD / Knee Osteoarthritis Grade-II"
              className="h-9 text-xs sm:text-sm font-semibold bg-background"
            />
          </div>

          {/* Section 8: Treatment Plan */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Activity className="size-3.5" />
              <span>8. Treatment Plan (চিকিৎসা পরিকল্পনা ও মডালিটি)</span>
            </span>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                {TREATMENT_PLANS.map((plan) => (
                  <label
                    key={plan}
                    className="inline-flex items-center gap-2 text-xs bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={treatmentPlans.includes(plan)}
                      onChange={() => toggleArrayItem(treatmentPlans, plan, setTreatmentPlans)}
                      className="accent-emerald-600 size-4 rounded"
                    />
                    <span className="font-semibold text-foreground">{plan}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Treatment notes / parameters:</Label>
                  <Input
                    value={treatmentPlanNotes}
                    onChange={(e) => setTreatmentPlanNotes(e.target.value)}
                    placeholder="e.g. Lumbar traction 25kg, UST 1.2W/cm2 for 8 mins, Quadriceps sets"
                    className="h-8 text-xs mt-1 bg-background"
                  />
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Prescribed Sessions (সেশন সংখ্যা):</Label>
                  <Input
                    type="number"
                    value={prescribedSessions}
                    onChange={(e) => setPrescribedSessions(e.target.value)}
                    placeholder="10"
                    className="h-8 text-xs mt-1 bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 9: Home Advice (Styled Blue/Cyan Box like the paper form) */}
          <div className="p-4 rounded-xl border-2 border-sky-500/60 bg-sky-500/10 dark:bg-sky-950/20 space-y-3 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5 border-b border-sky-500/30 pb-2">
              <Info className="size-3.5 text-sky-600" />
              <span>9. Home Advice (বাসায় করণীয় পরামর্শ)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-sky-500/20">
                <Label className="text-xs font-semibold text-foreground">Exercise explained (ব্যায়াম বুঝিয়ে দেওয়া হয়েছে):</Label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="exerciseExp"
                      checked={exerciseExplained === 'yes'}
                      onChange={() => setExerciseExplained('yes')}
                      className="accent-sky-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="exerciseExp"
                      checked={exerciseExplained === 'no'}
                      onChange={() => setExerciseExplained('no')}
                      className="accent-sky-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-sky-500/20">
                <Label className="text-xs font-semibold text-foreground">Posture advice (সঠিক ভঙ্গি মেনে চলার পরামর্শ):</Label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="homePosture"
                      checked={homePostureAdvice === 'yes'}
                      onChange={() => setHomePostureAdvice('yes')}
                      className="accent-sky-600"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="homePosture"
                      checked={homePostureAdvice === 'no'}
                      onChange={() => setHomePostureAdvice('no')}
                      className="accent-sky-600"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>

            <Textarea
              value={homeAdviceNotes}
              onChange={(e) => setHomeAdviceNotes(e.target.value)}
              placeholder="বাসায় নির্দিষ্ট ব্যায়াম বা বিশ্রামের নিয়মাবলী (e.g. নরম বালিশ ব্যবহার, সামনে ঝুঁকে ভারী কিছু না তোলা, দিনে ২ বার গরম সেঁক)..."
              rows={2}
              className="text-xs bg-background"
            />
          </div>

          {/* Section 10: Follow-up & Progress */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border/50 pb-2">
              <Calendar className="size-3.5" />
              <span>10. Follow-up &amp; Progress (অগ্রগতি ও পরবর্তী পর্যবেক্ষণ)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-muted-foreground">Pain Scale after treatment (VAS 0-10):</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={painScaleAfterTreatment}
                  onChange={(e) => setPainScaleAfterTreatment(e.target.value)}
                  placeholder="e.g. 2"
                  className="h-8 text-xs mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">Improvement (উন্নতি বা ফলাফল):</Label>
                <Input
                  value={improvement}
                  onChange={(e) => setImprovement(e.target.value)}
                  placeholder="e.g. 70% pain relief, improved mobility"
                  className="h-8 text-xs mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">Therapist signature / Doctor:</Label>
                <Input
                  value={therapistSignature}
                  onChange={(e) => setTherapistSignature(e.target.value)}
                  placeholder="Doctor Name"
                  className="h-8 text-xs mt-1 bg-background font-medium"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs"
            >
              বাতিল (Close)
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={submitting}
                className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                <span>{existingFile ? 'ফাইল আপডেট করুন (Update File)' : 'অ্যাসেসমেন্ট ফাইল সংরক্ষণ (Save File)'}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
