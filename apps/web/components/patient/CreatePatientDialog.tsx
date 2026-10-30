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
  FileText,
  FolderArchive,
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
import { formatLegacyNotes } from '../../lib/legacy-patient';

interface CreatePatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: (patient: PatientRecord, isOldPatient?: boolean) => void;
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

  // Legacy Paper Patient State
  const [isOldPatient, setIsOldPatient] = useState(false);
  const [legacyFileNo, setLegacyFileNo] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    ageYears: '',
    gender: 'male' as 'male' | 'female',
    bloodGroup: '',
    address: '',
    occupation: '',
    emergencyContact: '',
    allergies: '',
    chronicConditions: '',
    contraindications: '',
    notes: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      ageYears: '',
      gender: 'male',
      bloodGroup: '',
      address: '',
      occupation: '',
      emergencyContact: '',
      allergies: '',
      chronicConditions: '',
      contraindications: '',
      notes: '',
    });
    setIsOldPatient(false);
    setLegacyFileNo('');
    setErrorMsg(null);
  };

  const handleAgeChange = (ageStr: string) => {
    setForm((prev) => ({ ...prev, ageYears: ageStr }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const name = form.name.trim();
    if (!name) {
      setErrorMsg(isBn ? 'রোগীর পূর্ণ নাম অবশ্যই লিখুন' : 'Patient full name is required');
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

    const finalNotes = formatLegacyNotes(isOldPatient, legacyFileNo, form.notes);

    startTransition(async () => {
      const res = await createPatientAction({
        nameEn: name,
        nameBn: name,
        phone: cleanPhone,
        email: form.email.trim() || undefined,
        gender: form.gender,
        ageYears: form.ageYears ? parseInt(form.ageYears, 10) : undefined,
        bloodGroup: form.bloodGroup || undefined,
        address: form.address.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        chronicConditions: form.chronicConditions.trim() || undefined,
        contraindications: form.contraindications.trim() || undefined,
        notes: finalNotes || undefined,
        consentSigned: 1,
      });

      if (res.success && res.data) {
        if (isOldPatient) {
          toast.success(
            isBn
              ? `পুরাতন রোগী সফলভাবে নিবন্ধিত হয়েছে (ইনটেক ফরম পূরণ আবশ্যক নয়)! রেজি নম্বর: ${res.data.mrn}`
              : `Existing paper-file patient registered successfully (Intake form bypassed)! MRN: ${res.data.mrn}`,
            { duration: 5000 },
          );
        } else {
          toast.success(
            isBn
              ? `নতুন রোগী সফলভাবে নিবন্ধিত! রেজি নম্বর: ${res.data.mrn}`
              : `Patient registered successfully! MRN: ${res.data.mrn}`,
          );
        }
        resetForm();
        setIsOpen(false);
        if (onSuccess) {
          onSuccess(res.data, isOldPatient);
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
        <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl lg:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 border-b border-border/60 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isOldPatient
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isOldPatient ? <FolderArchive className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                    {isOldPatient
                      ? (isBn ? 'পুরাতন রোগী নিবন্ধন (পেপার ফাইল)' : 'Existing Patient Registration (Paper File)')
                      : (isBn ? 'নতুন রোগী নিবন্ধন' : 'New Patient Registration')}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {isBn
                    ? 'নাম, মোবাইল নম্বর এবং লিঙ্গ আবশ্যক। সংরক্ষিত হওয়ার পর স্বয়ংক্রিয় রেজি নম্বর তৈরি হবে।'
                    : 'Name, phone number, and gender are required. Monotonic MRN will be auto-assigned upon saving.'}
                </DialogDescription>
              </div>

              {/* Auto-generated MRN badge preview */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs font-mono">
                  <span className="text-muted-foreground">{isBn ? 'রেজি নম্বর: ' : 'MRN: '}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">HPC-2026-XXXXX</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5 font-sans">
                    ({isBn ? 'স্বয়ংক্রিয়' : 'Auto'})
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Form Body - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm animate-in fade-in-50">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ============================================================== */}
            {/* LEGACY / EXISTING PAPER PATIENT TOGGLE CARD                   */}
            {/* ============================================================== */}
            <div className={`p-4 rounded-xl border transition-all ${
              isOldPatient
                ? 'bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30'
                : 'bg-muted/30 border-border/60 hover:border-border'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                    isOldPatient
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <FolderArchive className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label
                        htmlFor="create-old-patient-toggle"
                        className="text-sm font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{isBn ? 'পুরাতন রোগী (হাতে লেখা ফাইল)' : 'Existing / Legacy Patient (Paper File)'}</span>
                      </Label>
                      {isOldPatient && (
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-semibold text-[10px] py-0 px-2">
                          {isBn ? 'ইনটেক ফরম বাদ (Bypass Intake)' : 'Intake Form Bypassed'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? 'ক্লিনিকের সফটওয়্যার চালুর পূর্বের পুরাতন বা কাগজের ফাইল থাকলে এটি টিক দিন। নতুন করে ইনটেক ফরম পূরণ করতে হবে না।'
                        : 'Check this if patient has a pre-existing paper file from before HPC system. Skips redundant intake assessment.'}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      id="create-old-patient-toggle"
                      type="checkbox"
                      checked={isOldPatient}
                      onChange={(e) => setIsOldPatient(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 dark:peer-checked:bg-amber-500"></div>
                    <span className="ml-2.5 text-xs font-semibold text-foreground">
                      {isOldPatient ? (isBn ? 'হ্যাঁ, পুরাতন ফাইল' : 'Yes, Paper File') : (isBn ? 'না (নতুন রোগী)' : 'No (New Patient)')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Expanded file number field when isOldPatient is checked */}
              {isOldPatient && (
                <div className="mt-3.5 pt-3.5 border-t border-amber-500/25 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                    <div className="space-y-1.5">
                      <Label htmlFor="create-legacy-file-no" className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isBn ? 'পুরাতন ফাইল নম্বর / Old Paper File No.' : 'Old Paper File No.'}</span>
                        <span className="text-[11px] font-normal text-muted-foreground font-mono">({isBn ? 'ঐচ্ছিক' : 'Optional'})</span>
                      </Label>
                      <Input
                        id="create-legacy-file-no"
                        type="text"
                        placeholder={isBn ? 'যেমন: F-1082 বা আলমারি ফাইল নং...' : 'e.g. F-1082 or Cabinet File #...'}
                        value={legacyFileNo}
                        onChange={(e) => setLegacyFileNo(e.target.value)}
                        className="h-10 font-mono text-sm border-amber-500/40 bg-background focus-visible:ring-amber-500"
                      />
                    </div>

                    <div className="text-xs text-muted-foreground bg-amber-500/10 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {isBn
                          ? 'সংরক্ষণের পর রোগী সরাসরি সিস্টেমের পুরাতন তালিকাভুক্ত হবেন। পুনরায় ইনটেক মূল্যায়ন পূরণ করা আবশ্যক হবে না।'
                          : 'Patient will be registered as an existing legacy file holder. Physical records remain valid; intake form is bypassed.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                {/* Universal Patient Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="create-name" className="text-xs font-semibold flex items-center gap-1">
                    <span>{isBn ? 'রোগীর পূর্ণ নাম' : 'Patient Full Name'}</span>
                    <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input
                    id="create-name"
                    placeholder={isBn ? 'রোগীর পূর্ণ নাম লিখুন (ইংরেজি বা বাংলা)' : 'Enter patient full name (English or Bengali)'}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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

                {/* Phone */}
                <div className="space-y-1.5 sm:col-span-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
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
                <div className="space-y-1.5">
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
                <div className="space-y-1.5 sm:col-span-3">
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

                {/* Notes / Special Remarks */}
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="create-notes" className="text-xs font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{isBn ? 'সাধারণ মন্তব্য ও নির্দেশনা' : 'Patient Notes & Remarks'}</span>
                  </Label>
                  <Textarea
                    id="create-notes"
                    rows={2}
                    placeholder={isBn ? 'রোগী সম্পর্কিত কোনো বিশেষ মন্তব্য, রেফারেল বা নির্দেশনা থাকলে লিখুন...' : 'Enter any operational notes, referral details, or clinical remarks...'}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
            className={`w-full sm:w-auto text-white font-semibold text-xs sm:text-sm h-10 px-5 shadow-xs transition-all active:scale-95 cursor-pointer ${
              isOldPatient
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>{isBn ? 'সংরক্ষণ করা হচ্ছে...' : 'Registering Patient...'}</span>
              </>
            ) : isOldPatient ? (
              <>
                <FolderArchive className="w-4 h-4 mr-2" />
                <span>{isBn ? 'পুরাতন রোগী সংরক্ষণ করুন (ইনটেক বাদ)' : 'Save Existing Patient (Bypass Intake)'}</span>
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
