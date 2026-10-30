// apps/web/components/patient/EditPatientDialog.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Edit3,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  AlertTriangle,
  HeartPulse,
  ShieldCheck,
  Loader2,
  Check,
  FileText,
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
import { updatePatientAction, type PatientRecord, type PatientDetailRecord } from '../../lib/actions/patients';

interface EditPatientDialogProps {
  patient: PatientRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: PatientDetailRecord) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export function EditPatientDialog({
  patient,
  open,
  onOpenChange,
  onSuccess,
}: EditPatientDialogProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.nameEn || patient.nameBn || '',
        phone: patient.phone || '',
        email: patient.email || '',
        ageYears: patient.ageYears !== null && patient.ageYears !== undefined ? String(patient.ageYears) : '',
        gender: patient.gender === 'female' ? 'female' : 'male',
        bloodGroup: patient.bloodGroup || '',
        address: patient.address || '',
        occupation: patient.occupation || '',
        emergencyContact: patient.emergencyContact || '',
        allergies: patient.allergies || '',
        chronicConditions: patient.chronicConditions || '',
        contraindications: patient.contraindications || '',
        notes: patient.notes || '',
      });
      setErrorMsg(null);
    }
  }, [patient]);

  const handleAgeChange = (ageStr: string) => {
    setForm((prev) => ({ ...prev, ageYears: ageStr }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setErrorMsg(null);

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
          : 'Please enter a valid 11-digit Bangladeshi mobile number',
      );
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
      const res = await updatePatientAction(patient.id, {
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
        notes: form.notes.trim() || undefined,
        consentSigned: 1,
      });

      if (res.success && res.data) {
        toast.success(
          isBn
            ? 'রোগীর তথ্য সফলভাবে আপডেট করা হয়েছে'
            : 'Patient record updated successfully',
        );
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setErrorMsg(res.error || (isBn ? 'আপডেট ব্যর্থ হয়েছে' : 'Failed to update patient'));
      }
    });
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl md:max-w-5xl lg:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                  {isBn ? 'রোগীর তথ্য সম্পাদনা' : 'Edit Patient Record'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {isBn
                  ? 'রোগীর বিবরণ, ফোন নম্বর ও ক্লিনিক্যাল তথ্য হালনাগাদ করুন।'
                  : 'Update patient demographics, contact records, and clinical alerts.'}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 border border-border/60 px-3 py-1.5 rounded-xl">
              <div className="text-xs font-mono">
                <span className="text-muted-foreground">MRN: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{patient.mrn}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Required Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '১. আবশ্যক পরিচিতি তথ্য' : '1. Mandatory Patient Identity'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Universal Patient Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-name" className="text-xs font-semibold flex items-center gap-1">
                  <span>{isBn ? 'রোগীর পূর্ণ নাম' : 'Patient Full Name'}</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder={isBn ? 'রোগীর পূর্ণ নাম লিখুন (ইংরেজি বা বাংলা)' : 'Enter patient full name (English or Bengali)'}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-10 text-sm font-medium"
                />
              </div>

              {/* Gender */}
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
                <Label htmlFor="edit-phone" className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>{isBn ? 'মোবাইল নম্বর' : 'Phone Number'}</span>
                    <span className="text-destructive font-bold">*</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">01XXXXXXXXX (11 digits)</span>
                </Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    type="tel"
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
                <Label htmlFor="edit-age" className="text-xs font-semibold">
                  {isBn ? 'বয়স (বছর)' : 'Age (Years)'}
                </Label>
                <Input
                  id="edit-age"
                  type="number"
                  min="0"
                  max="125"
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
                <Label htmlFor="edit-occupation" className="text-xs font-semibold flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'পেশা' : 'Profession'}</span>
                </Label>
                <Input
                  id="edit-occupation"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs font-semibold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-emergency" className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}</span>
                </Label>
                <Input
                  id="edit-emergency"
                  value={form.emergencyContact}
                  onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Residential Address */}
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="edit-address" className="text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'বর্তমান ঠিকানা' : 'Residential Address'}</span>
                </Label>
                <Textarea
                  id="edit-address"
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="text-sm resize-none"
                />
              </div>

              {/* Notes / Special Remarks */}
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="edit-notes" className="text-xs font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'সাধারণ মন্তব্য ও নির্দেশনা' : 'Patient Notes & Remarks'}</span>
                </Label>
                <Textarea
                  id="edit-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Alerts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span>{isBn ? '৩. ক্লিনিক্যাল তথ্য ও মেডিকেল ইতিহাস' : '3. Clinical History & Medical Alerts'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Allergies */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-allergies" className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {isBn ? 'ঔষধ/খাদ্য এলার্জি' : 'Known Allergies'}
                </Label>
                <Input
                  id="edit-allergies"
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  className="h-10 text-sm border-amber-500/30"
                />
              </div>

              {/* Chronic Conditions */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-chronic" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}
                </Label>
                <Input
                  id="edit-chronic"
                  value={form.chronicConditions}
                  onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                  className="h-10 text-sm"
                />
              </div>

              {/* Contraindications */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-contra" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {isBn ? 'থেরাপি বা চিকিৎসায় সতর্কতা' : 'Contraindications'}
                </Label>
                <Input
                  id="edit-contra"
                  value={form.contraindications}
                  onChange={(e) => setForm({ ...form, contraindications: e.target.value })}
                  className="h-10 text-sm border-rose-500/30"
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="w-full sm:w-auto text-xs font-medium"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-10 px-5 shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>{isBn ? 'আপডেট করা হচ্ছে...' : 'Saving Changes...'}</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 mr-2" />
                <span>{isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
