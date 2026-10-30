// apps/web/components/doctor/PrescriptionBuilderSection.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  History,
  Printer,
  Pill,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';

export interface PrescribedMedicineItem {
  id?: string;
  brandName: string;
  genericName?: string;
  form?: string;
  strength?: string;
  dosage: string;
  duration: string;
  instructions: string;
}

// Common Pain Care & Physical Rehabilitation Medicines Catalog for 1-Click Autocomplete
export const COMMON_PAIN_MEDICINES = [
  { brandName: 'Tab. Ace Plus', genericName: 'Paracetamol + Caffeine', form: 'Tab', strength: '500mg+65mg', defaultDosage: '1+0+1', defaultDuration: '৫ দিন', defaultInstructions: 'খাবারের পর' },
  { brandName: 'Tab. Napa Extra', genericName: 'Paracetamol + Caffeine', form: 'Tab', strength: '500mg+65mg', defaultDosage: '1+0+1', defaultDuration: '৫ দিন', defaultInstructions: 'খাবারের পর' },
  { brandName: 'Tab. Tolpa 50mg', genericName: 'Tolperisone Hydrochloride', form: 'Tab', strength: '50mg', defaultDosage: '1+0+1', defaultDuration: '৭ দিন', defaultInstructions: 'খাবারের পর' },
  { brandName: 'Tab. Mydocalm 50mg', genericName: 'Tolperisone Hydrochloride', form: 'Tab', strength: '50mg', defaultDosage: '1+0+1', defaultDuration: '৭ দিন', defaultInstructions: 'খাবারের পর' },
  { brandName: 'Tab. Baclomax 10mg', genericName: 'Baclofen', form: 'Tab', strength: '10mg', defaultDosage: '0+0+1', defaultDuration: '৭ দিন', defaultInstructions: 'ঘুমানোর আগে' },
  { brandName: 'Cap. Prestat 50mg', genericName: 'Pregabalin', form: 'Cap', strength: '50mg', defaultDosage: '0+0+1', defaultDuration: '১৪ দিন', defaultInstructions: 'ঘুমানোর আগে' },
  { brandName: 'Cap. Neurica 75mg', genericName: 'Pregabalin', form: 'Cap', strength: '75mg', defaultDosage: '0+0+1', defaultDuration: '১৪ দিন', defaultInstructions: 'ঘুমানোর আগে' },
  { brandName: 'Cap. Neuro-G 300mg', genericName: 'Gabapentin', form: 'Cap', strength: '300mg', defaultDosage: '0+0+1', defaultDuration: '১৪ দিন', defaultInstructions: 'ঘুমানোর আগে' },
  { brandName: 'Tab. Flexi 100mg', genericName: 'Aceclofenac', form: 'Tab', strength: '100mg', defaultDosage: '1+0+1', defaultDuration: '৫ দিন', defaultInstructions: 'খাবারের পর' },
  { brandName: 'Tab. Naprosyn 500mg', genericName: 'Naproxen', form: 'Tab', strength: '500mg', defaultDosage: '1+0+1', defaultDuration: '৫ দিন', defaultInstructions: 'ভরা পেটে' },
  { brandName: 'Cap. Maxpro 20mg', genericName: 'Esomeprazole', form: 'Cap', strength: '20mg', defaultDosage: '1+0+1', defaultDuration: '১০ দিন', defaultInstructions: 'খাবারের ২০ মিনিট আগে' },
  { brandName: 'Cap. Seclo 20mg', genericName: 'Omeprazole', form: 'Cap', strength: '20mg', defaultDosage: '1+0+1', defaultDuration: '১০ দিন', defaultInstructions: 'খাবারের ২০ মিনিট আগে' },
  { brandName: 'Tab. Calbo-D', genericName: 'Calcium Carbonate + Vitamin D3', form: 'Tab', strength: '500mg+200IU', defaultDosage: '0+1+0', defaultDuration: '১ মাস', defaultInstructions: 'খাবারের পর' },
  { brandName: 'Tab. Neuro-B', genericName: 'Vitamin B1 + B6 + B12', form: 'Tab', strength: '100mg+200mg+200mcg', defaultDosage: '1+0+1', defaultDuration: '১ মাস', defaultInstructions: 'খাবারের পর' },
  { brandName: 'Gel Clofenac 1%', genericName: 'Diclofenac Diethylamine', form: 'Gel', strength: '1% w/w', defaultDosage: '২-৩ বার', defaultDuration: '৭ দিন', defaultInstructions: 'আক্রান্ত স্থানে হালকা মালিশ' },
  { brandName: 'Gel Voltral 1%', genericName: 'Diclofenac Sodium', form: 'Gel', strength: '1%', defaultDosage: '২-৩ বার', defaultDuration: '৭ দিন', defaultInstructions: 'আক্রান্ত স্থানে মালিশ' },
];

export const DOSAGE_PRESETS = ['1+0+1', '1+1+1', '1+0+0', '0+0+1', '1+1+1+1', '0+1+0', '1/2+0+1/2', 'SOS'];
export const DURATION_PRESETS = ['৩ দিন', '৫ দিন', '৭ দিন', '১০ দিন', '১৪ দিন', '২১ দিন', '১ মাস', 'চলবে'];
export const INSTRUCTION_PRESETS = [
  'খাবারের পর',
  'খাবারের ২০ মিনিট আগে',
  'খাবারের সাথে',
  'ঘুমানোর আগে',
  'কুসুম গরম পানির সাথে',
  'ব্যথা বাড়লে',
];

export const ADVICE_PRESETS = [
  'ভারী ওজন তুলবেন না ও সামনে ঝুঁকে কাজ করবেন না।',
  'শক্ত ও সমান বিছানায় সোজা হয়ে চিত হয়ে ঘুমাবেন।',
  'নিয়মিত ১৫-২০ মিনিট কুসুম গরম পানির সেক দিন।',
  'একটানা ৩০ মিনিটের বেশি বসে বা দাঁড়িয়ে থাকবেন না।',
  'চিকিৎসকের পরামর্শ ব্যতীত হঠাৎ ওষুধ সেবন বন্ধ করবেন না।',
  'প্রতিদিন পর্যাপ্ত পরিমাণ বিশুদ্ধ পানি ও পুষ্টিকর খাবার গ্রহণ করুন।',
];

export const FOLLOWUP_PRESETS = [
  { label: '৩ দিন পর', days: 3 },
  { label: '৭ দিন পর', days: 7 },
  { label: '১০ দিন পর', days: 10 },
  { label: '১৪ দিন পর', days: 14 },
  { label: '১ মাস পর', days: 30 },
];

interface PrescriptionBuilderSectionProps {
  medicines: PrescribedMedicineItem[];
  onChangeMedicines: (meds: PrescribedMedicineItem[]) => void;
  advice: string;
  onChangeAdvice: (advice: string) => void;
  followUpDate: string;
  onChangeFollowUpDate: (date: string) => void;
  onSaveAndPrint: () => void;
  onOpenAllPrescriptions: () => void;
  onResetNewPrescription: () => void;
  saving?: boolean;
}

export function PrescriptionBuilderSection({
  medicines,
  onChangeMedicines,
  advice,
  onChangeAdvice,
  followUpDate,
  onChangeFollowUpDate,
  onSaveAndPrint,
  onOpenAllPrescriptions,
  onResetNewPrescription,
  saving = false,
}: PrescriptionBuilderSectionProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);

  const handleAddMedicine = () => {
    onChangeMedicines([
      ...medicines,
      {
        brandName: '',
        genericName: '',
        form: 'Tab',
        strength: '',
        dosage: '1+0+1',
        duration: '৭ দিন',
        instructions: 'খাবারের পর',
      },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    const updated = [...medicines];
    updated.splice(index, 1);
    onChangeMedicines(updated);
  };

  const handleUpdateMedicine = (index: number, patch: Partial<PrescribedMedicineItem>) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], ...patch };
    onChangeMedicines(updated);
  };

  const handleSelectAutocomplete = (index: number, med: typeof COMMON_PAIN_MEDICINES[0]) => {
    handleUpdateMedicine(index, {
      brandName: med.brandName,
      genericName: med.genericName,
      form: med.form,
      strength: med.strength,
      dosage: med.defaultDosage,
      duration: med.defaultDuration,
      instructions: med.defaultInstructions,
    });
    setActiveSuggestionIdx(null);
  };

  const handleAddAdvicePreset = (text: string) => {
    if (!advice.trim()) {
      onChangeAdvice(text);
    } else if (!advice.includes(text)) {
      onChangeAdvice(`${advice.trim()}\n• ${text}`);
    }
  };

  const handleSelectFollowUpPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    onChangeFollowUpDate(dateStr);
  };

  return (
    <Card id="prescription-section" className="border-border shadow-sm scroll-mt-20">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-serif font-black text-lg">
            ℞
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <span>{isBn ? 'ডিজিটাল প্রেসক্রিপশন বিল্ডার' : 'Digital Prescription Builder'}</span>
              <Badge variant="outline" className="text-[10.5px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                5.50" × 8.27" Paper
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isBn ? 'ঔষধ, মাত্রা, সেবনবিধি এবং ক্লিনিক্যাল নির্দেশিকা নির্ধারণ করুন' : 'Configure medicines, dosages, timing, and clinical instructions'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* New Prescription Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetNewPrescription}
            className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>নতুন প্রেসক্রিপশন</span>
          </Button>

          {/* All Prescriptions Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAllPrescriptions}
            className="h-8 text-xs font-semibold gap-1.5 border-border text-foreground hover:bg-muted cursor-pointer"
          >
            <History className="size-3.5 text-amber-500" />
            <span>পূর্বের প্রেসক্রিপশন</span>
          </Button>

          {/* Add Medicine Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleAddMedicine}
            className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>+ ওষুধ যোগ করুন</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {/* Medicine Rows */}
        {medicines.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20">
            <Pill className="size-9 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">এখনও কোনো ওষুধ যোগ করা হয়নি</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              ওষুধ প্রেসক্রাইব করতে উপরের '+ ওষুধ যোগ করুন' বোতাম চাপুন
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleAddMedicine}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              + প্রথম ওষুধ যোগ করুন
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {medicines.map((med, idx) => (
              <div
                key={idx}
                className="p-3 sm:p-4 rounded-xl border border-border/80 bg-card/60 hover:border-emerald-500/40 transition-all shadow-xs space-y-2.5 relative"
              >
                {/* Top Row: Index, Form, Brand Name, Generic, Strength, Remove */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-1 flex items-center gap-1.5">
                    <span className="size-6 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <Select
                      value={med.form || 'Tab'}
                      onValueChange={(val) => handleUpdateMedicine(idx, { form: val })}
                    >
                      <SelectTrigger className="h-8 w-20 text-xs px-2">
                        <SelectValue placeholder="Form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tab">Tab</SelectItem>
                        <SelectItem value="Cap">Cap</SelectItem>
                        <SelectItem value="Syr">Syr</SelectItem>
                        <SelectItem value="Inj">Inj</SelectItem>
                        <SelectItem value="Gel">Gel</SelectItem>
                        <SelectItem value="Patch">Patch</SelectItem>
                        <SelectItem value="Drop">Drop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Brand Name Input with Autocomplete Suggestion Dropdown */}
                  <div className="sm:col-span-5 relative">
                    <Input
                      placeholder={isBn ? 'ঔষধের নাম (যেমন: এইস প্লাস ৫০০ মিগ্রা)' : 'Brand Name (e.g. Ace Plus 500mg)'}
                      value={med.brandName}
                      onFocus={() => setActiveSuggestionIdx(idx)}
                      onChange={(e) => {
                        handleUpdateMedicine(idx, { brandName: e.target.value });
                        setActiveSuggestionIdx(idx);
                      }}
                      className="h-9 text-xs sm:text-sm font-semibold"
                    />

                    {/* Autocomplete Popup */}
                    {activeSuggestionIdx === idx && (
                      <div className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg backdrop-blur-md">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>প্রস্তাবিত পেইন কেয়ার ঔষধ</span>
                          <button
                            type="button"
                            onClick={() => setActiveSuggestionIdx(null)}
                            className="text-muted-foreground hover:text-foreground text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                        {COMMON_PAIN_MEDICINES.filter((m) =>
                          !med.brandName ||
                          m.brandName.toLowerCase().includes(med.brandName.toLowerCase()) ||
                          m.genericName.toLowerCase().includes(med.brandName.toLowerCase())
                        ).map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSelectAutocomplete(idx, sug)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <strong className="text-foreground">{sug.brandName}</strong>
                              <span className="text-muted-foreground text-[11px] ml-1.5">
                                ({sug.genericName})
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {sug.form}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Generic Name */}
                  <div className="sm:col-span-4">
                    <Input
                      placeholder={isBn ? 'জেনেরিক নাম (যেমন: প্যারাসিটামল + ক্যাফেইন)' : 'Generic Name (e.g. Paracetamol + Caffeine)'}
                      value={med.genericName || ''}
                      onChange={(e) => handleUpdateMedicine(idx, { genericName: e.target.value })}
                      className="h-9 text-xs font-mono text-muted-foreground"
                    />
                  </div>

                  {/* Strength & Delete Button */}
                  <div className="sm:col-span-2 flex items-center gap-1.5 justify-end">
                    <Input
                      placeholder="Strength"
                      value={med.strength || ''}
                      onChange={(e) => handleUpdateMedicine(idx, { strength: e.target.value })}
                      className="h-9 w-20 text-xs text-center"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMedicine(idx)}
                      className="size-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Bottom Row: Dosage Chips, Timing/Instructions Chips, Duration Chips */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-1 border-t border-border/40 text-xs">
                  {/* Dosage Input + Quick Chips (4 cols) */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{isBn ? 'মাত্রা:' : 'Dosage:'}</Label>
                      <span className="text-[10px] font-mono font-bold text-emerald-600">{med.dosage}</span>
                    </div>
                    <Input
                      value={med.dosage}
                      placeholder="1+0+1"
                      onChange={(e) => handleUpdateMedicine(idx, { dosage: e.target.value })}
                      className="h-8 text-xs font-bold"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {DOSAGE_PRESETS.map((dose) => (
                        <button
                          key={dose}
                          type="button"
                          onClick={() => handleUpdateMedicine(idx, { dosage: dose })}
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-all cursor-pointer',
                            med.dosage === dose
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {dose}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timing / Instructions + Quick Chips (5 cols) */}
                  <div className="md:col-span-5 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{isBn ? 'সেবনবিধি:' : 'Timing:'}</Label>
                      <span className="text-[10px] text-muted-foreground truncate">{med.instructions}</span>
                    </div>
                    <Input
                      value={med.instructions}
                      placeholder="খাবারের পর"
                      onChange={(e) => handleUpdateMedicine(idx, { instructions: e.target.value })}
                      className="h-8 text-xs"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {INSTRUCTION_PRESETS.map((inst) => (
                        <button
                          key={inst}
                          type="button"
                          onClick={() => handleUpdateMedicine(idx, { instructions: inst })}
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] font-medium rounded border transition-all cursor-pointer',
                            med.instructions === inst
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                              : 'bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {inst}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration + Quick Chips (3 cols) */}
                  <div className="md:col-span-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{isBn ? 'সময়কাল:' : 'Duration:'}</Label>
                      <span className="text-[10px] font-mono text-muted-foreground">{med.duration}</span>
                    </div>
                    <Input
                      value={med.duration}
                      placeholder="৭ দিন"
                      onChange={(e) => handleUpdateMedicine(idx, { duration: e.target.value })}
                      className="h-8 text-xs font-semibold"
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {DURATION_PRESETS.map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleUpdateMedicine(idx, { duration: dur })}
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-all cursor-pointer',
                            med.duration === dur
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Advice Section & Presets */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>{isBn ? 'বিশেষ পরামর্শ ও নির্দেশাবলী' : 'Special Advice & Instructions'}</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">
              ক্লিক করে দ্রুত পরামর্শ যুক্ত করুন
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {ADVICE_PRESETS.map((adv, aIdx) => (
              <button
                key={aIdx}
                type="button"
                onClick={() => handleAddAdvicePreset(adv)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-border/80 bg-muted/40 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/30 transition-all text-muted-foreground text-left cursor-pointer"
              >
                + {adv}
              </button>
            ))}
          </div>

          <Textarea
            rows={3}
            placeholder="রোগীর করণীয় ও প্রতিরোধমূলক নির্দেশাবলী লিখুন..."
            value={advice}
            onChange={(e) => onChangeAdvice(e.target.value)}
            className="text-xs sm:text-sm rounded-xl"
          />
        </div>

        {/* Next Follow-up Date */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2 border-t border-border/60">
          <div className="sm:col-span-4">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-emerald-600" />
              <span>{isBn ? 'পরবর্তী সাক্ষাতের সম্ভাব্য তারিখ:' : 'Next Follow-up Date:'}</span>
            </Label>
          </div>
          <div className="sm:col-span-8 flex flex-wrap items-center gap-1.5">
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => onChangeFollowUpDate(e.target.value)}
              className="h-8 w-40 text-xs font-mono"
            />
            {FOLLOWUP_PRESETS.map((fp) => (
              <button
                key={fp.label}
                type="button"
                onClick={() => handleSelectFollowUpPreset(fp.days)}
                className="px-2 py-1 text-[11px] font-medium rounded-md border border-border bg-muted/40 hover:bg-emerald-500/10 hover:text-emerald-700 transition-all cursor-pointer"
              >
                {fp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Save & Print 5.50in x 8.27in */}
        <div className="pt-2">
          <Button
            size="lg"
            type="button"
            disabled={saving}
            onClick={onSaveAndPrint}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 text-sm sm:text-base rounded-xl shadow-md shadow-emerald-500/20 gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Printer className="size-5" />
            <span>
              {saving ? (isBn ? 'প্রেসক্রিপশন সেভ হচ্ছে...' : 'Saving prescription...') : (isBn ? '📄 প্রেসক্রিপশন সংরক্ষণ ও প্রিন্ট করুন' : '📄 Save & Print Prescription (5.5" × 8.27"')}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
