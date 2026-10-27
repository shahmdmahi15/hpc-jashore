// apps/web/components/doctor/PrescriptionBuilderModal.tsx
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Plus,
  Trash2,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  Calendar,
  Pill,
  Clock,
  RefreshCw,
  FileText,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import {
  COMMON_PAIN_MEDICINES,
  PrescribedMedicineItem,
} from './PrescriptionBuilderSection';
import { cn } from '../../lib/utils';

export interface PrescriptionBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  visitId: string;
  doctorId?: string;
  consultationId?: string;
  medicines: PrescribedMedicineItem[];
  onChangeMedicines: (meds: PrescribedMedicineItem[]) => void;
  advice: string;
  onChangeAdvice: (adv: string) => void;
  followUpDate: string;
  onChangeFollowUpDate: (date: string) => void;
  chiefComplaints?: string;
  diagnosis?: string;
  painScore?: number;
  objectiveNotes?: string;
  onSaveSuccess?: (rxData: any) => void;
  onSaveAndPrint?: (rxData: any) => void;
  onOpenAllPrescriptions?: () => void;
}

export function PrescriptionBuilderModal({
  open,
  onOpenChange,
  patient,
  visitId,
  doctorId,
  consultationId,
  medicines,
  onChangeMedicines,
  advice,
  onChangeAdvice,
  followUpDate,
  onChangeFollowUpDate,
  chiefComplaints,
  diagnosis,
  painScore,
  objectiveNotes,
  onSaveSuccess,
  onSaveAndPrint,
  onOpenAllPrescriptions,
}: PrescriptionBuilderModalProps) {
  const [saving, setSaving] = useState(false);

  const patientId = patient?.id || patient?.patientId;

  const handleAddMedicine = () => {
    onChangeMedicines([
      ...medicines,
      {
        brandName: '',
        genericName: '',
        form: 'Tab',
        strength: '',
        dosage: '1+0+1',
        duration: '৫ দিন',
        instructions: 'খাবারের পর (After meals)',
      },
    ]);
  };

  const handleAddQuickMedicine = (med: typeof COMMON_PAIN_MEDICINES[0]) => {
    onChangeMedicines([
      ...medicines.filter((m) => m.brandName.trim() !== ''),
      {
        brandName: med.brandName,
        genericName: med.genericName,
        form: med.form,
        strength: med.strength,
        dosage: med.defaultDosage,
        duration: med.defaultDuration,
        instructions: med.defaultInstructions,
      },
    ]);
    toast.success(`${med.brandName} যুক্ত হয়েছে`);
  };

  const handleRemoveMedicine = (idx: number) => {
    onChangeMedicines(medicines.filter((_, i) => i !== idx));
  };

  const handleUpdateMedicine = (idx: number, updates: Partial<PrescribedMedicineItem>) => {
    const updated = [...medicines];
    updated[idx] = { ...updated[idx], ...updates };
    onChangeMedicines(updated);
  };

  const handleReset = () => {
    onChangeMedicines([
      {
        brandName: '',
        genericName: '',
        form: 'Tab',
        strength: '',
        dosage: '1+0+1',
        duration: '৫ দিন',
        instructions: 'খাবারের পর',
      },
    ]);
    onChangeAdvice('');
    onChangeFollowUpDate('');
    toast.info('প্রেসক্রিপশন ফরম নতুন করে রিসেট করা হয়েছে');
  };

  const handleSave = async (andPrint = false) => {
    if (!patientId || !visitId) {
      toast.error('রোগীর তথ্য বা ভিজিট আইডি পাওয়া যায়নি');
      return;
    }

    const validMeds = medicines.filter((m) => m.brandName.trim().length > 0);
    if (validMeds.length === 0 && !advice.trim()) {
      toast.error('দয়া করে অন্তত একটি ঔষধ অথবা পরামর্শ (Advice) প্রদান করুন');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        patientId,
        visitId,
        doctorId,
        consultationId,
        advice: advice.trim() || undefined,
        followUpDate: followUpDate || undefined,
        chiefComplaints: chiefComplaints || undefined,
        diagnosis: diagnosis || undefined,
        painScore: painScore !== undefined ? painScore : undefined,
        objectiveNotes: objectiveNotes || undefined,
        medicines: validMeds.map((m) => ({
          medicineName: m.brandName.trim(),
          dosage: m.dosage || '1+0+1',
          durationDays: parseInt(m.duration) || 7,
          instructionsBn: m.instructions || undefined,
        })),
      };

      const res = await api.prescriptions.create(payload);
      toast.success('প্রেসক্রিপশন সফলভাবে সংরক্ষিত হয়েছে!');

      if (andPrint && onSaveAndPrint) {
        onSaveAndPrint(res);
      } else if (onSaveSuccess) {
        onSaveSuccess(res);
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'প্রেসক্রিপশন সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const setFollowUpDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    onChangeFollowUpDate(dateStr);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-background border-border">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-serif font-black text-base">
                  ℞
                </span>
                <span>মেডিসিন প্রেসক্রিপশন বিল্ডার (Medicine Prescription Builder)</span>
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  5.50" × 8.27" Paper
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                ঔষধ, মাত্রা (ডোজ), সেবনবিধি এবং ক্লিনিক্যাল নির্দেশিকা নির্ধারণ ও প্রিন্ট করুন
              </DialogDescription>
            </div>

            {patient && (
              <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-xl border border-border/50 text-xs">
                <span className="font-semibold text-foreground">
                  {patient.nameBn || patient.nameEn || patient.patientNameBn || patient.patientNameEn}
                </span>
                <span className="text-muted-foreground font-mono">
                  MRN: <strong>{patient.mrn}</strong>
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* 1. AUTOCOMPLETE MEDICINES CHIPS */}
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>বহুল ব্যবহৃত রিহ্যাব ও পেইন কেয়ার ঔষধ (১-ক্লিক দ্রুত সংযোজন):</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PAIN_MEDICINES.map((med) => (
                <button
                  key={med.brandName}
                  type="button"
                  onClick={() => handleAddQuickMedicine(med)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Plus className="size-3 text-muted-foreground" />
                  <span>{med.brandName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. MEDICINES TABLE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Pill className="size-4 text-emerald-500" />
                <span>প্রেসক্রিপশনের ঔষধসমূহ (Prescribed Medicines)</span>
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddMedicine}
                className="h-8 text-xs font-semibold gap-1 text-primary border-primary/40 hover:bg-primary/10"
              >
                <Plus className="size-3.5" />
                <span>+ ঔষধ যোগ করুন</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-20 font-bold">প্রকার</TableHead>
                    <TableHead className="font-bold">ঔষধের নাম (Brand Name)</TableHead>
                    <TableHead className="w-28 font-bold">ডোজ / মাত্রা</TableHead>
                    <TableHead className="w-24 font-bold">দিন / মেয়াদ</TableHead>
                    <TableHead className="font-bold">সেবনবিধি (Instructions)</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicines.map((med, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={med.form || 'Tab'}
                          onValueChange={(val) => handleUpdateMedicine(idx, { form: val })}
                        >
                          <SelectTrigger className="h-8 text-xs w-20">
                            <SelectValue placeholder="Form" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tab">Tab</SelectItem>
                            <SelectItem value="Cap">Cap</SelectItem>
                            <SelectItem value="Syr">Syr</SelectItem>
                            <SelectItem value="Gel">Gel</SelectItem>
                            <SelectItem value="Inj">Inj</SelectItem>
                            <SelectItem value="Spray">Spray</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Input
                          placeholder="ঔষধের নাম (যেমন: Ace Plus 500mg)..."
                          value={med.brandName}
                          onChange={(e) => handleUpdateMedicine(idx, { brandName: e.target.value })}
                          className="h-8 text-xs font-bold"
                        />
                      </TableCell>

                      <TableCell>
                        <Select
                          value={med.dosage || '1+0+1'}
                          onValueChange={(val) => handleUpdateMedicine(idx, { dosage: val })}
                        >
                          <SelectTrigger className="h-8 text-xs w-28 font-mono">
                            <SelectValue placeholder="ডোজ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1+0+1">1+0+1 (সকাল-রাত)</SelectItem>
                            <SelectItem value="1+1+1">1+1+1 (সকাল-দুপুর-রাত)</SelectItem>
                            <SelectItem value="1+0+0">1+0+0 (শুধু সকাল)</SelectItem>
                            <SelectItem value="0+0+1">0+0+1 (শুধু রাত)</SelectItem>
                            <SelectItem value="0+1+0">0+1+0 (শুধু দুপুর)</SelectItem>
                            <SelectItem value="প্রয়োজনে">প্রয়োজনে (SOS)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Input
                          placeholder="৫ দিন"
                          value={med.duration || ''}
                          onChange={(e) => handleUpdateMedicine(idx, { duration: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          placeholder="খাবারের পর / ভরা পেটে..."
                          value={med.instructions || ''}
                          onChange={(e) => handleUpdateMedicine(idx, { instructions: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMedicine(idx)}
                          className="size-7 p-0 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 3. ADVICE & FOLLOW-UP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <FileText className="size-3.5 text-primary" />
                <span>বিশেষ উপদেশ ও নিয়মাবলী (Advice &amp; Instructions)</span>
              </Label>
              <Textarea
                placeholder="রোগীর করণীয় / বর্জনীয় পরামর্শ (যেমন: নরম বিছানায় শোবেন না, ভারী ওজন তুলবেন না, নিয়মিত গরম সেক দিন)..."
                rows={3}
                value={advice}
                onChange={(e) => onChangeAdvice(e.target.value)}
                className="text-xs resize-none"
              />
              <div className="flex flex-wrap gap-1">
                {[
                  'ভারী ওজন বহন নিষেধ',
                  'নরম বিছানায় শোবেন না',
                  'প্রতিদিন ১৫ মিনিট গরম সেক দিন',
                  'ব্যথা বাড়লে ব্যায়াম সাময়িক বন্ধ রাখুন',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => onChangeAdvice(advice ? `${advice}\n• ${sug}` : `• ${sug}`)}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Calendar className="size-3.5 text-emerald-500" />
                <span>পরবর্তী সাক্ষাতের সম্ভাব্য তারিখ (Follow-up Date)</span>
              </Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => onChangeFollowUpDate(e.target.value)}
                className="h-9 text-xs"
              />
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">দ্রুত নির্বাচন:</span>
                <button
                  type="button"
                  onClick={() => setFollowUpDays(7)}
                  className="text-[11px] px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground border border-border/50 cursor-pointer"
                >
                  +৭ দিন
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpDays(15)}
                  className="text-[11px] px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground border border-border/50 cursor-pointer"
                >
                  +১৫ দিন
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUpDays(30)}
                  className="text-[11px] px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground border border-border/50 cursor-pointer"
                >
                  +১ মাস
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              <span>রিসেট (Reset)</span>
            </Button>
            {onOpenAllPrescriptions && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOpenAllPrescriptions}
                className="h-9 text-xs font-semibold gap-1 text-primary"
              >
                পূর্ববর্তী প্রেসক্রিপশন হিস্ট্রি
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs"
            >
              বাতিল
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="h-9 text-xs font-semibold gap-1.5"
            >
              {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>সংরক্ষণ করুন (Save)</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm active:scale-95"
            >
              {saving ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Printer className="size-3.5" />
              )}
              <span>Save &amp; Print (প্রিন্ট করুন)</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
