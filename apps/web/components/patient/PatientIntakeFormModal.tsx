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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, UserSession } from '@/lib/api';
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
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PatientIntakeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: any;
  currentUser?: UserSession | null;
  onSuccess?: (intakeForm: any) => void;
}

export function PatientIntakeFormModal({
  open,
  onOpenChange,
  patient,
  currentUser,
  onSuccess,
}: PatientIntakeFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);

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

  // Sync when patient prop changes
  useEffect(() => {
    if (patient) {
      setName(patient.nameBn || patient.nameEn || '');
      setPhone(patient.phone || '');
      setAgeYears(patient.ageYears ? String(patient.ageYears) : '');
      setGender(patient.gender || 'male');
      setOccupation(patient.occupation || '');
      setAddress(patient.address || '');
    } else {
      setName('');
      setPhone('');
      setAgeYears('');
      setGender('male');
      setOccupation('');
      setAddress('');
    }
  }, [patient, open]);

  // Load doctors for consultation selection
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingDoctors(true);
    api.users
      .list()
      .then((users: any[]) => {
        if (!active) return;
        const docs = (users || []).filter((u: any) => u.role === 'doctor' && u.isActive !== false);
        setDoctors(docs);
        if (docs.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docs[0].id);
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
    if (!chiefComplaint.trim()) {
      toast.error('প্রধান শারীরিক সমস্যা / উপসর্গ উল্লেখ করুন (Chief complaint is required)');
      return;
    }

    try {
      setSubmitting(true);
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
        bloodSugar: bloodSugar ? parseFloat(bloodSugar) : undefined,
        hasDiabetes: hasDiabetes ? 1 : 0,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        chiefComplaint: chiefComplaint.trim(),
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
      };

      const res = await api.patients.createIntakeForm(payload);
      toast.success(
        forwardToCashier
          ? 'তথ্য সংরক্ষিত এবং ক্যাশিয়ারের কাছে সফলভাবে পাঠানো হয়েছে!'
          : 'রোগীর প্রাথমিক তথ্য সফলভাবে সংরক্ষিত হয়েছে!'
      );
      if (onSuccess) onSuccess(res);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'ফরম সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-emerald-500/30 bg-background/95 backdrop-blur-xl">
        {/* Header matching the paper form format */}
        <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-md px-6 py-4 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileText className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-500">
                  HEALTH & PAIN CARE (HPC)
                </span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                  রিসেপশন ফরম
                </Badge>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                নতুন বা আগত রোগীর প্রাথমিক স্বাস্থ্য বিবরণী ও ডাক্তার পরামর্শ এন্ট্রি
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* SECTION 1: Personal Information */}
          <div className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-4">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm border-b border-border/50 pb-2">
              <User className="size-4" />
              <span>১. ব্যাক্তিগত তথ্য (Personal Information)</span>
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

          {/* SECTION 2: Primary Health Info */}
          <div className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-4">
            <div className="flex items-center gap-2 text-rose-500 font-semibold text-sm border-b border-border/50 pb-2">
              <HeartPulse className="size-4" />
              <span>২. প্রাথমিক স্বাস্থ্য তথ্য (Primary Health Info)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">রক্তচাপ সিস্টোলিক (BP Systolic)</Label>
                <Input
                  type="number"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  placeholder="120 (mmHg)"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">রক্তচাপ ডায়াস্টোলিক (BP Diastolic)</Label>
                <Input
                  type="number"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  placeholder="80 (mmHg)"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">রক্তে শর্করা (Blood Sugar)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                  placeholder="যেমন: 6.8 (mmol/L)"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">ওজন (Weight in KG)</Label>
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
                    রোগী কি ডায়াবেটিসে আক্রান্ত বা ওষুধ নিচ্ছেন?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{hasDiabetes ? 'হ্যাঁ (Yes)' : 'না (No)'}</span>
                  <Switch checked={hasDiabetes} onCheckedChange={setHasDiabetes} />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label className="text-xs font-medium">প্রধান শারীরিক সমস্যা / উপসর্গ (Chief Complaint) *</Label>
                <Textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="যেমন: কোমর ব্যথা পায়ে নেমে যায়, ঘাড় শক্ত হয়ে আছে ও হাত অবশ লাগে..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label className="text-xs font-medium">কতদিন ধরে এই সমস্যা? (Duration)</Label>
                <Input
                  value={problemDuration}
                  onChange={(e) => setProblemDuration(e.target.value)}
                  placeholder="যেমন: ৩ মাস / ১৫ দিন"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Past Medical History */}
          <div className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-4">
            <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm border-b border-border/50 pb-2">
              <History className="size-4" />
              <span>৩. পূর্ববর্তী চিকিৎসার বিবরণ (Past Medical History)</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Previous Doctor */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">পূর্বে এই সমস্যার জন্য কোনো ডাক্তার দেখিয়েছেন কি?</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{seenDoctorBefore ? 'হ্যাঁ' : 'না'}</span>
                    <Switch checked={seenDoctorBefore} onCheckedChange={setSeenDoctorBefore} />
                  </div>
                </div>
                {seenDoctorBefore && (
                  <Input
                    value={previousDoctorDetails}
                    onChange={(e) => setPreviousDoctorDetails(e.target.value)}
                    placeholder="ডাক্তারের নাম ও ক্লিনিক/হাসপাতালের ঠিকানা"
                    className="h-8 text-xs bg-background"
                  />
                )}
              </div>

              {/* Previous Reports */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">পূর্বের কোনো টেস্ট রিপোর্ট সাথে আছে কি?</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{hasPreviousReports ? 'হ্যাঁ' : 'না'}</span>
                    <Switch checked={hasPreviousReports} onCheckedChange={setHasPreviousReports} />
                  </div>
                </div>
                {hasPreviousReports && (
                  <Input
                    value={previousReportNames}
                    onChange={(e) => setPreviousReportNames(e.target.value)}
                    placeholder="রিপোর্টের নাম (যেমন: Lumbar MRI, X-Ray Cervical Spine, CBC)"
                    className="h-8 text-xs bg-background"
                  />
                )}
              </div>

              {/* Regular Medication */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">বর্তমানে নিয়মিত কোনো ওষুধ সেবন করছেন কি?</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{takesRegularMedication ? 'হ্যাঁ' : 'না'}</span>
                    <Switch checked={takesRegularMedication} onCheckedChange={setTakesRegularMedication} />
                  </div>
                </div>
                {takesRegularMedication && (
                  <Input
                    value={regularMedicationDetails}
                    onChange={(e) => setRegularMedicationDetails(e.target.value)}
                    placeholder="ওষুধের নাম ও ডোজ (যেমন: প্রেসারের ওষুধ, ব্যথানাশক)"
                    className="h-8 text-xs bg-background"
                  />
                )}
              </div>

              {/* Drug Allergies */}
              <div className="p-3 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-400">কোনো ওষুধে এলার্জি বা পার্শ্বপ্রতিক্রিয়া আছে কি?</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{hasDrugAllergies ? 'হ্যাঁ' : 'না'}</span>
                    <Switch checked={hasDrugAllergies} onCheckedChange={setHasDrugAllergies} />
                  </div>
                </div>
                {hasDrugAllergies && (
                  <Input
                    value={drugAllergyDetails}
                    onChange={(e) => setDrugAllergyDetails(e.target.value)}
                    placeholder="কোন কোন ওষুধে এলার্জি (যেমন: Penicillin, Sulfa, Paracetamol)"
                    className="h-8 text-xs bg-background border-red-500/40"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Referral Source */}
          <div className="p-4 rounded-xl border border-border/70 bg-card/50 space-y-3">
            <div className="flex items-center gap-2 text-cyan-500 font-semibold text-sm border-b border-border/50 pb-2">
              <Share2 className="size-4" />
              <span>৪. আমাদের সেন্টার সম্পর্কে কীভাবে জেনেছেন? (Referral Source)</span>
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
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                      : 'border-border/50 hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <span>{item.label}</span>
                  {referralSource === item.id && <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />}
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
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm border-b border-emerald-500/20 pb-2">
              <Stethoscope className="size-4" />
              <span>৫. ডাক্তার নির্বাচন ও রিসেপশন নোট (Doctor Selection & Forwarding)</span>
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
                      {doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <span className="font-semibold">{doc.displayName || doc.email}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {doc.chamberRoomId ? `রুম: ${doc.chamberRoomId}` : 'চেম্বার নির্ধারিত'}
                              {doc.consultationFee ? ` • ফি: ৳${doc.consultationFee}` : ''}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[10px] text-muted-foreground">
                  ক্যাশিয়ার এই ডাক্তারের নির্ধারিত ফি গ্রহণ করে সরাসরি কিউতে যুক্ত করবেন।
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">রিসেপশনিস্টের বিশেষ মন্তব্য (Special Notes)</Label>
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
        <div className="sticky bottom-0 z-10 bg-card/90 backdrop-blur-md px-6 py-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs"
          >
            বাতিল করুন (Close)
          </Button>

          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
