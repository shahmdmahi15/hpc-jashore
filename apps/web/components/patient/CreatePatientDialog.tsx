// apps/web/components/patient/CreatePatientDialog.tsx
'use client';

import React, { useState, useTransition } from 'react';
import {
  UserPlus,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertTriangle,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { createPatientAction, type PatientRecord } from '../../lib/actions/patients';

interface CreatePatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: (patient: PatientRecord) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export function CreatePatientDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onSuccess,
}: CreatePatientDialogProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    nameEn: '',
    nameBn: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    ageYears: '',
    gender: 'male' as 'male' | 'female',
    bloodGroup: '',
    address: '',
    occupation: '',
    emergencyContact: '',
    allergies: '',
    chronicConditions: '',
    contraindications: '',
    consentSigned: 1,
  });

  const resetForm = () => {
    setForm({
      nameEn: '',
      nameBn: '',
      phone: '',
      email: '',
      dateOfBirth: '',
      ageYears: '',
      gender: 'male',
      bloodGroup: '',
      address: '',
      occupation: '',
      emergencyContact: '',
      allergies: '',
      chronicConditions: '',
      contraindications: '',
      consentSigned: 1,
    });
    setErrorMsg(null);
  };

  // DOB <-> Age calculation sync
  const handleDobChange = (dobStr: string) => {
    setForm((prev) => {
      let computedAge = prev.ageYears;
      if (dobStr) {
        const birthDate = new Date(dobStr);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age >= 0 && age < 130) {
            computedAge = String(age);
          }
        }
      }
      return { ...prev, dateOfBirth: dobStr, ageYears: computedAge };
    });
  };

  const handleAgeChange = (ageStr: string) => {
    setForm((prev) => {
      const ageNum = parseInt(ageStr, 10);
      let estDob = prev.dateOfBirth;
      if (!isNaN(ageNum) && ageNum >= 0 && ageNum < 130 && !prev.dateOfBirth) {
        const estYear = new Date().getFullYear() - ageNum;
        estDob = `${estYear}-01-01`;
      }
      return { ...prev, ageYears: ageStr, dateOfBirth: estDob };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const nameEn = form.nameEn.trim();
    if (!nameEn) {
      setErrorMsg(isBn ? 'রোগীর নাম (ইংরেজিতে) অবশ্যই দিন' : 'Patient English Name is required');
      return;
    }

    const cleanPhone = form.phone.trim();
    const bdPhoneRegex = /^01[3-9]\d{8}$/;
    if (!bdPhoneRegex.test(cleanPhone)) {
      setErrorMsg(
        isBn
          ? 'সঠিক ১১-সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)'
          : 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)',
      );
      return;
    }

    if (form.gender !== 'male' && form.gender !== 'female') {
      setErrorMsg(isBn ? 'লিঙ্গ নির্বাচন করুন (পুরুষ বা মহিলা)' : 'Please select gender (male or female)');
      return;
    }

    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setErrorMsg(isBn ? 'সঠিক ইমেইল ঠিকানা দিন' : 'Please provide a valid email address');
        return;
      }
    }

    startTransition(async () => {
      const res = await createPatientAction({
        nameEn,
        nameBn: form.nameBn.trim() || undefined,
        phone: cleanPhone,
        email: form.email.trim() || undefined,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || undefined,
        ageYears: form.ageYears ? parseInt(form.ageYears, 10) : undefined,
        bloodGroup: form.bloodGroup || undefined,
        address: form.address.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        chronicConditions: form.chronicConditions.trim() || undefined,
        contraindications: form.contraindications.trim() || undefined,
        consentSigned: form.consentSigned ? 1 : 0,
      });

      if (res.success && res.data) {
        toast.success(
          isBn
            ? `রোগী সফলভাবে নিবন্ধিত! MRN: ${res.data.mrn}`
            : `Patient registered successfully! MRN: ${res.data.mrn}`,
        );
        resetForm();
        setIsOpen(false);
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setErrorMsg(res.error || (isBn ? 'নিবন্ধন ব্যর্থ হয়েছে' : 'Failed to register patient'));
      }
    });
  };

  return (
    <>
      {trigger && (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer inline-flex">
          {trigger}
        </span>
      )}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                  {isBn ? 'নতুন রোগী নিবন্ধন' : 'New Patient Registration'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {isBn
                  ? 'নাম, মোবাইল নম্বর এবং লিঙ্গ আবশ্যক। সংরক্ষিত হওয়ার পর স্বয়ংক্রিয় MRN তৈরি হবে।'
                  : 'Name, phone number, and gender are required. Monotonic MRN will be auto-assigned upon saving.'}
              </DialogDescription>
            </div>

            {/* Auto-generated MRN badge preview */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs font-mono">
                <span className="text-muted-foreground">{isBn ? 'MRN নম্বর: ' : 'MRN: '}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">HPC-2026-XXXXX</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 font-sans">
                  ({isBn ? 'স্বয়ংক্রিয়' : 'Auto'})
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm animate-in fade-in-50">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Required Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '১. আবশ্যক পরিচিতি তথ্য' : '1. Mandatory Patient Identity'}</span>
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 ml-auto">
                {isBn ? 'আবশ্যক' : 'Required'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Name En */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-nameEn" className="text-xs font-semibold flex items-center gap-1">
                  <span>{isBn ? 'রোগীর পূর্ণ নাম (ইংরেজিতে)' : 'Full Name (English)'}</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="create-nameEn"
                  placeholder={isBn ? 'যেমন: Md. Rafiqul Islam' : 'e.g. Md. Rafiqul Islam'}
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  required
                  className="h-10 text-sm font-medium"
                />
              </div>

              {/* Gender - Strictly Male or Female */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <span>{isBn ? 'লিঙ্গ' : 'Gender'}</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 h-10">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, gender: 'male' })}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.gender === 'male'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span>👨 {isBn ? 'পুরুষ' : 'Male'}</span>
                    {form.gender === 'male' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, gender: 'female' })}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      form.gender === 'female'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span>👩 {isBn ? 'মহিলা' : 'Female'}</span>
                    {form.gender === 'female' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Name Bn */}
              <div className="space-y-1.5">
                <Label htmlFor="create-nameBn" className="text-xs font-semibold text-muted-foreground">
                  {isBn ? 'রোগীর পূর্ণ নাম (বাংলায়)' : 'Full Name (Bengali)'}
                </Label>
                <Input
                  id="create-nameBn"
                  placeholder={isBn ? 'যেমন: মোঃ রফিকুল ইসলাম' : 'e.g. মোঃ রফিকুল ইসলাম'}
                  value={form.nameBn}
                  onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-phone" className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>{isBn ? 'মোবাইল নম্বর' : 'Phone Number'}</span>
                    <span className="text-destructive font-bold">*</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">01XXXXXXXXX (11 digits)</span>
                </Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="create-phone"
                    type="tel"
                    placeholder="01712345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    maxLength={11}
                    className="h-10 pl-9 font-mono text-sm tracking-wide"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Demographics & Contact */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '২. বয়স, রক্ত গ্রুপ ও যোগাযোগ' : '2. Age, Blood Group & Contact'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Age (Years) */}
              <div className="space-y-1.5">
                <Label htmlFor="create-age" className="text-xs font-semibold">
                  {isBn ? 'বয়স (বছর)' : 'Age (Years)'}
                </Label>
                <Input
                  id="create-age"
                  type="number"
                  min="0"
                  max="125"
                  placeholder="e.g. 38"
                  value={form.ageYears}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label htmlFor="create-dob" className="text-xs font-semibold">
                  {isBn ? 'জন্ম তারিখ' : 'Date of Birth'}
                </Label>
                <Input
                  id="create-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="h-10 text-sm font-mono"
                />
              </div>

              {/* Blood Group */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}
                </Label>
                <Select
                  value={form.bloodGroup}
                  onValueChange={(val: string) => setForm({ ...form, bloodGroup: val })}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder={isBn ? 'নির্বাচন করুন' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        <span className="font-bold text-rose-600 dark:text-rose-400 mr-1.5">🩸</span>
                        <span className="font-mono font-bold">{bg}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profession / Occupation */}
              <div className="space-y-1.5">
                <Label htmlFor="create-occupation" className="text-xs font-semibold flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'পেশা' : 'Profession / Occupation'}</span>
                </Label>
                <Input
                  id="create-occupation"
                  placeholder={isBn ? 'যেমন: শিক্ষক, ব্যবসায়ী' : 'e.g. Teacher, Business, Govt'}
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-email" className="text-xs font-semibold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}</span>
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="patient@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-emergency" className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isBn ? 'জরুরি যোগাযোগ (নাম ও নম্বর)' : 'Emergency Contact (Name & Phone)'}</span>
                </Label>
                <Input
                  id="create-emergency"
                  placeholder={isBn ? 'যেমন: ভাই - ০১৮১১২২৩৩৪৪' : 'e.g. Brother - 01811223344'}
                  value={form.emergencyContact}
                  onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Residential Address */}
              <div className="space-y-1.5 sm:col-span-4">
                <Label htmlFor="create-address" className="text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'বর্তমান ঠিকানা / বাসস্থান' : 'Residential Address'}</span>
                </Label>
                <Textarea
                  id="create-address"
                  rows={2}
                  placeholder={isBn ? 'গ্রাম/মহল্লা, থানা, জেলা (যেমন: চৌরাস্তা, কোতোয়ালি, যশোর)' : 'Area/Village, Thana, District (e.g. Chowrasta, Kotwali, Jashore)'}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Alerts & Medical History */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>{isBn ? '৩. ক্লিনিক্যাল তথ্য ও মেডিকেল ইতিহাস' : '3. Clinical History & Medical Alerts'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Allergies */}
              <div className="space-y-1.5">
                <Label htmlFor="create-allergies" className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ঔষধ/খাদ্য এলার্জি' : 'Known Allergies'}</span>
                </Label>
                <Input
                  id="create-allergies"
                  placeholder="e.g. Penicillin, NSAIDs, Dust"
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  className="h-10 text-sm border-amber-500/30 focus-visible:border-amber-500"
                />
              </div>

              {/* Chronic Conditions */}
              <div className="space-y-1.5">
                <Label htmlFor="create-chronic" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}
                </Label>
                <Input
                  id="create-chronic"
                  placeholder="e.g. Hypertension, Diabetes, Asthma"
                  value={form.chronicConditions}
                  onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Contraindications */}
              <div className="space-y-1.5">
                <Label htmlFor="create-contra" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {isBn ? 'থেরাপি বা চিকিৎসায় সতর্কতা' : 'Contraindications / Alerts'}
                </Label>
                <Input
                  id="create-contra"
                  placeholder="e.g. Pacemaker, Metal implant, Spine surgery"
                  value={form.contraindications}
                  onChange={(e) => setForm({ ...form, contraindications: e.target.value })}
                  className="h-10 text-sm border-rose-500/30 focus-visible:border-rose-500"
                />
              </div>
            </div>

            {/* Consent Signed */}
            <div className="pt-2 flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="space-y-0.5">
                <Label htmlFor="create-consent" className="text-xs font-semibold cursor-pointer">
                  {isBn ? 'চিকিৎসা ও তথ্য প্রক্রিয়াকরণ সম্মতি' : 'Treatment & Clinical Consent Signed'}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {isBn
                    ? 'রোগী কেন্দ্রে সেবা গ্রহণ ও মেডিকেল রেকর্ড সংরক্ষণে সম্মতি দিয়েছেন'
                    : 'Patient has agreed to clinical evaluation, therapy care, and record keeping.'}
                </p>
              </div>
              <Switch
                id="create-consent"
                checked={form.consentSigned === 1}
                onCheckedChange={(checked) => setForm({ ...form, consentSigned: checked ? 1 : 0 })}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-6 border-t border-border/60 bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="w-full sm:w-auto text-xs font-medium"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-10 px-5 shadow-xs transition-all active:scale-95"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>{isBn ? 'সংরক্ষণ করা হচ্ছে...' : 'Registering Patient...'}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                <span>{isBn ? 'রোগী নিবন্ধন সম্পন্ন করুন' : 'Register Patient'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
