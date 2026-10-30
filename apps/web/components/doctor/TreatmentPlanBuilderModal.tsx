// apps/web/components/doctor/TreatmentPlanBuilderModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
import { api } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { toast } from 'sonner';
import {
  Activity,
  Plus,
  Trash2,
  Printer,
  Save,
  Clock,
  Check,
  Search,
  RefreshCw,
  FileText,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { TreatmentPlanPrintModal } from './TreatmentPlanPrintModal';

export interface PrescribedModalityItem {
  modalityCode: string;
  modalityName: string;
  modalityNameBn?: string;
  durationMinutes: number;
  sequenceOrder: number;
  totalSessionsPrescribed: number;
  frequency: string;
  notes?: string;
}

export interface TreatmentPlanBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  visitId?: string;
  consultationId?: string;
  onPlansSaved?: (plans: any[]) => void;
  initialPlans?: any[];
}

const COMMON_PRESETS = [
  {
    nameBn: 'ল্যাম্বার প্যাক (কোমর ব্যথা)',
    nameEn: 'Lumbar Pack (Low Back Pain)',
    items: [
      { modalityCode: 'IFT', modalityName: 'Interferential Therapy (IFT)', modalityNameBn: 'ইন্টারফেরেনশিয়াল থেরাপি', durationMinutes: 10, totalSessionsPrescribed: 10, frequency: 'daily', notes: '4-pole sweep 80-120Hz' },
      { modalityCode: 'MANUAL', modalityName: 'Manual Therapy & Mobilization', modalityNameBn: 'ম্যানুয়াল থেরাপি', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Lumbar spine mobilization & stretching' },
      { modalityCode: 'SWD', modalityName: 'Shortwave Diathermy (SWD)', modalityNameBn: 'শর্টওয়েভ ডায়াথার্মি', durationMinutes: 20, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Continuous coplanar mode' },
    ],
  },
  {
    nameBn: 'সারভাইকাল প্যাক (ঘাড় ব্যথা)',
    nameEn: 'Cervical Pack (Neck Pain)',
    items: [
      { modalityCode: 'TRACTION', modalityName: 'Cervical Traction', modalityNameBn: 'সারভাইকাল ট্র্যাকশন', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Intermittent 8kg - 10kg' },
      { modalityCode: 'UST', modalityName: 'Ultrasound Therapy (UST)', modalityNameBn: 'আল্ট্রাসাউন্ড থেরাপি', durationMinutes: 10, totalSessionsPrescribed: 10, frequency: 'daily', notes: '1.2 W/cm² pulsed mode' },
      { modalityCode: 'MANUAL', modalityName: 'Manual Mobilization', modalityNameBn: 'ম্যানুয়াল মোবিলাইজেশন', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Upper cervical gentle traction & posture correction' },
    ],
  },
  {
    nameBn: 'হাঁটু ব্যথা প্যাক (অস্টিওআর্থ্রাইটিস)',
    nameEn: 'Knee OA Pack (Osteoarthritis)',
    items: [
      { modalityCode: 'SWD', modalityName: 'Shortwave Diathermy (SWD)', modalityNameBn: 'শর্টওয়েভ ডায়াথার্মি', durationMinutes: 20, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Contra-planar knee placement' },
      { modalityCode: 'IFT', modalityName: 'IFT / TENS', modalityNameBn: 'আইএফটি / টেনস', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Pain gate modulation' },
      { modalityCode: 'EXERCISE', modalityName: 'Therapeutic Exercise', modalityNameBn: 'থেরাপিউটিক এক্সারসাইজ', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Quadriceps strengthening & VMO activation' },
    ],
  },
  {
    nameBn: 'ফ্রোজেন শোল্ডার প্যাক',
    nameEn: 'Frozen Shoulder Pack',
    items: [
      { modalityCode: 'IRR', modalityName: 'Infrared Radiation (IRR)', modalityNameBn: 'ইনফ্রারেড রেডিয়েশন', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Pre-heating shoulder capsule' },
      { modalityCode: 'UST', modalityName: 'Ultrasound Therapy (UST)', modalityNameBn: 'আল্ট্রাসাউন্ড থেরাপি', durationMinutes: 10, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Deep thermal on anterior/posterior capsule' },
      { modalityCode: 'MANUAL', modalityName: 'Glenohumeral Mobilization', modalityNameBn: 'ম্যানুয়াল জয়েন্ট মোবিলাইজেশন', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Maitland grade II-III glides' },
    ],
  },
];

export function TreatmentPlanBuilderModal({
  open,
  onOpenChange,
  patient,
  visitId,
  consultationId,
  onPlansSaved,
  initialPlans = [],
}: TreatmentPlanBuilderModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [modalitiesCatalog, setModalitiesCatalog] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [searchModality, setSearchModality] = useState('');
  const [selectedPlans, setSelectedPlans] = useState<PrescribedModalityItem[]>([]);
  const [existingPlans, setExistingPlans] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const patientId = patient?.id || patient?.patientId;

  // Initialize or transform initial plans
  useEffect(() => {
    if (!open) return;

    if (Array.isArray(initialPlans) && initialPlans.length > 0) {
      setSelectedPlans(
        initialPlans.map((p, idx) => ({
          modalityCode: p.modalityCode || p.code || 'IFT',
          modalityName: p.modalityName || p.nameEn || p.modalityCode || 'Therapy',
          modalityNameBn: p.modalityNameBn || p.nameBn || '',
          durationMinutes: Number(p.durationMinutes) || 15,
          sequenceOrder: p.sequenceOrder !== undefined ? p.sequenceOrder : idx + 1,
          totalSessionsPrescribed: Number(p.totalSessionsPrescribed) || 10,
          frequency: p.frequency || 'daily',
          notes: p.notes || '',
        }))
      );
    }

    // 1. Fetch Modalities Catalog
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const data = await api.catalog.getModalities();
        const activeOnly = (data || []).filter((m: any) => m.isActive !== 0 && m.isActive !== false);
        setModalitiesCatalog(activeOnly);
      } catch (err: any) {
        console.warn('Failed to load modalities catalog:', err?.message);
      } finally {
        setLoadingCatalog(false);
      }
    };

    // 2. Fetch Existing Plans for this patient
    const fetchExisting = async () => {
      if (!patientId) return;
      try {
        setLoadingExisting(true);
        const plans = await api.therapy.getPlans(patientId);
        setExistingPlans(plans || []);

        // If initialPlans was not provided or empty, auto-load active plans from DB
        if ((!initialPlans || initialPlans.length === 0) && Array.isArray(plans) && plans.length > 0) {
          const activeOnes = plans.filter((p: any) => p.status === 'active');
          if (activeOnes.length > 0) {
            setSelectedPlans(
              activeOnes
                .map((p: any, idx: number) => {
                  let seq = idx + 1;
                  let dur = p.defaultDurationMin || 15;
                  let noteText = p.notes;
                  if (p.notes) {
                    try {
                      const parsed =
                        typeof p.notes === 'string' && p.notes.startsWith('{')
                          ? JSON.parse(p.notes)
                          : null;
                      if (parsed) {
                        if (parsed.sequence) seq = Number(parsed.sequence);
                        if (parsed.durationMin) dur = Number(parsed.durationMin);
                        noteText = (parsed.clinicalNote || parsed.note || '').trim();
                      }
                    } catch {}
                  }
                  return {
                    modalityCode: p.modalityCode,
                    modalityName: p.modalityNameEn || p.modalityCode,
                    modalityNameBn: p.modalityNameBn || '',
                    durationMinutes: dur,
                    sequenceOrder: seq,
                    totalSessionsPrescribed: p.totalSessionsPrescribed || 10,
                    frequency: p.frequency || 'daily',
                    notes: noteText || '',
                  };
                })
                .sort((a, b) => a.sequenceOrder - b.sequenceOrder),
            );
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch existing therapy plans:', err?.message);
      } finally {
        setLoadingExisting(false);
      }
    };

    fetchCatalog();
    fetchExisting();
  }, [open, patientId]);

  const filteredCatalog = modalitiesCatalog.filter((m) => {
    const q = searchModality.toLowerCase().trim();
    if (!q) return true;
    return (
      (m.code || '').toLowerCase().includes(q) ||
      (m.nameEn || '').toLowerCase().includes(q) ||
      (m.nameBn || '').toLowerCase().includes(q)
    );
  });

  const handleAddModality = (modality: any) => {
    const nextSeq = selectedPlans.length + 1;
    const newItem: PrescribedModalityItem = {
      modalityCode: modality.code,
      modalityName: modality.nameEn,
      modalityNameBn: modality.nameBn,
      durationMinutes: modality.defaultDurationMin || 15,
      sequenceOrder: nextSeq,
      totalSessionsPrescribed: 10,
      frequency: 'daily',
      notes: '',
    };

    setSelectedPlans([...selectedPlans, newItem]);
    toast.success(isBn ? `${modality.nameBn || modality.nameEn} ধাপ ${nextSeq} হিসেবে যুক্ত করা হয়েছে` : `${modality.nameEn || modality.nameBn} added as step ${nextSeq}`);
  };

  const handleApplyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    const newItems: PrescribedModalityItem[] = preset.items.map((it, idx) => ({
      ...it,
      sequenceOrder: idx + 1,
    }));
    setSelectedPlans(newItems);
    toast.success(isBn ? `${preset.nameBn} সফলভাবে প্রয়োগ করা হয়েছে!` : `${preset.nameEn} applied successfully!`);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const items = [...selectedPlans];
    const temp = items[index - 1];
    items[index - 1] = items[index];
    items[index] = temp;
    // Update sequence numbers
    const reindexed = items.map((it, idx) => ({ ...it, sequenceOrder: idx + 1 }));
    setSelectedPlans(reindexed);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedPlans.length - 1) return;
    const items = [...selectedPlans];
    const temp = items[index + 1];
    items[index + 1] = items[index];
    items[index] = temp;
    // Update sequence numbers
    const reindexed = items.map((it, idx) => ({ ...it, sequenceOrder: idx + 1 }));
    setSelectedPlans(reindexed);
  };

  const handleRemoveModality = (index: number) => {
    const updated = selectedPlans.filter((_, idx) => idx !== index);
    const reindexed = updated.map((it, idx) => ({ ...it, sequenceOrder: idx + 1 }));
    setSelectedPlans(reindexed);
  };

  const handleUpdateItem = (index: number, updates: Partial<PrescribedModalityItem>) => {
    setSelectedPlans((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, ...updates } : it))
    );
  };

  const handleSaveTreatmentPlan = async () => {
    if (!patientId) {
      toast.error('রোগীর তথ্য পাওয়া যায়নি');
      return;
    }

    if (selectedPlans.length === 0) {
      toast.error('দয়া করে অন্তত একটি থেরাপি মডালিটি নির্বাচন করুন');
      return;
    }

    try {
      setSaving(true);
      // Format notes to cleanly embed duration and sequence order
      const plansPayload = selectedPlans.map((p, idx) => ({
        modalityCode: p.modalityCode,
        totalSessionsPrescribed: Number(p.totalSessionsPrescribed) || 10,
        frequency: p.frequency || 'daily',
        notes: JSON.stringify({
          sequence: idx + 1,
          durationMin: p.durationMinutes || 15,
          clinicalNote: p.notes || '',
        }),
      }));

      await api.therapy.createPlans({
        patientId,
        visitId,
        consultationId,
        plans: plansPayload,
      });

      toast.success('থেরাপি ট্রিটমেন্ট প্ল্যান সফলভাবে সংরক্ষিত হয়েছে!');
      if (onPlansSaved) {
        onPlansSaved(selectedPlans);
      }

      // Refresh existing list
      const updated = await api.therapy.getPlans(patientId);
      setExistingPlans(updated || []);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'ট্রিটমেন্ট প্ল্যান সংরক্ষণ করতে ব্যর্থ হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-hpc-plan');
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const nowFormatted = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 bg-background border-border">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Activity className="size-5" />
                  </span>
                  <span>{isBn ? 'থেরাপি ট্রিটমেন্ট প্ল্যান বিল্ডার' : 'Therapy Plan Builder'}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isBn
                    ? 'মডালিটির সিকোয়েন্স (১ম, ২য়, ৩য়...), প্রতিটির সময়সীমা (মিনিট) ও মোট সেশন নির্ধারণ করুন'
                    : 'Set modality sequence, duration per modality (minutes), and total sessions'}
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

          <div className="space-y-5 pt-2">
            {/* QUICK PRESETS BAR */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>{isBn ? 'ক্লিনিক্যাল ট্রিটমেন্ট প্রি-সেট প্যাকেজ:' : 'Clinical Treatment Presets:'}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">{isBn ? '১-ক্লিকে রেডি প্ল্যান লোড করুন' : '1-click load ready plan'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PRESETS.map((preset, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset(preset)}
                    className="h-7 text-[11px] rounded-lg border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 font-medium"
                  >
                    <span>{isBn ? preset.nameBn : preset.nameEn}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* MODALITIES CATALOG SELECTOR */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
                    <Layers className="size-4 text-emerald-500" />
                    <span>{isBn ? 'মডালিটি নির্বাচন করুন' : 'Select Modalities'}</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isBn ? 'তালিকা থেকে যেকোনো মডালিটি ক্লিক করে প্ল্যানের সিকোয়েন্সে যোগ করুন' : 'Click any modality to append into your sequenced plan'}
                  </p>
                </div>

                <div className="w-full sm:w-64 relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={isBn ? 'মডালিটি খুঁজুন...' : 'Search modalities...'}
                    value={searchModality}
                    onChange={(e) => setSearchModality(e.target.value)}
                    className="h-8 text-xs pl-8 bg-muted/30"
                  />
                </div>
              </div>

              {loadingCatalog ? (
                <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="size-4 animate-spin text-primary" />
                  <span>ক্যাটালগ লোড হচ্ছে...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-muted/20 border border-border/50">
                  {filteredCatalog.map((mod) => (
                    <button
                      key={mod.code}
                      type="button"
                      onClick={() => handleAddModality(mod)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-card hover:bg-muted border-border text-foreground hover:border-emerald-500/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="size-3 text-emerald-500" />
                      <span>{mod.nameEn}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">({mod.code})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SEQUENCED TREATMENT PLAN TABLE */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <FileText className="size-4 text-emerald-500" />
                  <span>{isBn ? 'নির্ধারিত থেরাপি সিকোয়েন্স ও শিডিউল' : 'Sequenced Therapy Plan'}</span>
                </Label>
                <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedPlans.length} {isBn ? 'টি ধাপ নির্ধারিত' : 'Steps Configured'}
                </Badge>
              </div>

              {selectedPlans.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {isBn
                      ? 'এখনও কোনো থেরাপি মডালিটি যুক্ত করা হয়নি। উপরের প্রি-সেট অথবা ক্যাটালগ থেকে মডালিটি যোগ করুন।'
                      : 'No modalities added yet. Click presets above or choose from catalog.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-16 font-bold text-center">{isBn ? 'ক্রম' : 'Seq'}</TableHead>
                        <TableHead className="font-bold">{isBn ? 'মডালিটি' : 'Modality'}</TableHead>
                        <TableHead className="w-28 font-bold">{isBn ? 'সময়সীমা (মি.)' : 'Duration (Min)'}</TableHead>
                        <TableHead className="w-28 font-bold">{isBn ? 'মোট সেশন' : 'Total Sessions'}</TableHead>
                        <TableHead className="w-36 font-bold">{isBn ? 'ফ্রিকোয়েন্সি' : 'Frequency'}</TableHead>
                        <TableHead className="font-bold">{isBn ? 'ক্লিনিক্যাল নির্দেশিকা' : 'Clinical Instructions'}</TableHead>
                        <TableHead className="w-24 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlans.map((plan, idx) => (
                        <TableRow key={`${plan.modalityCode}-${idx}`}>
                          {/* Sequence Badge */}
                          <TableCell className="text-center font-bold">
                            <span className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-xs border border-emerald-500/30">
                              {idx + 1}
                            </span>
                          </TableCell>

                          {/* Modality Details */}
                          <TableCell className="font-bold text-foreground">
                            <div>{plan.modalityName}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {plan.modalityCode} {plan.modalityNameBn ? `• ${plan.modalityNameBn}` : ''}
                            </div>
                          </TableCell>

                          {/* Duration Minutes Input */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={1}
                                max={120}
                                value={plan.durationMinutes}
                                onChange={(e) =>
                                  handleUpdateItem(idx, {
                                    durationMinutes: parseInt(e.target.value) || 15,
                                  })
                                }
                                className="h-8 w-16 text-xs font-mono font-bold text-center"
                              />
                              <span className="text-[11px] text-muted-foreground">মি.</span>
                            </div>
                          </TableCell>

                          {/* Total Sessions */}
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={plan.totalSessionsPrescribed}
                              onChange={(e) =>
                                handleUpdateItem(idx, {
                                  totalSessionsPrescribed: parseInt(e.target.value) || 1,
                                })
                              }
                              className="h-8 w-16 text-xs font-mono font-bold text-center"
                            />
                          </TableCell>

                          {/* Frequency */}
                          <TableCell>
                            <Select
                              value={plan.frequency}
                              onValueChange={(val) =>
                                handleUpdateItem(idx, { frequency: val })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">{isBn ? 'প্রতিদিন' : 'Daily'}</SelectItem>
                                <SelectItem value="alternate_days">{isBn ? 'একদিন পরপর' : 'Alternate Days'}</SelectItem>
                                <SelectItem value="weekly">{isBn ? 'সাপ্তাহিক' : 'Weekly'}</SelectItem>
                                <SelectItem value="twice_weekly">{isBn ? 'সপ্তাহে ২ দিন' : 'Twice Weekly'}</SelectItem>
                                <SelectItem value="thrice_weekly">{isBn ? 'সপ্তাহে ৩ দিন' : 'Thrice Weekly'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Clinical Notes / Intensity */}
                          <TableCell>
                            <Input
                              placeholder={isBn ? 'তীব্রতা / টেকনিক (যেমন: ১৫ মিনিট, কোপ্ল্যানার)...' : 'Intensity / technique (e.g., 15 min, coplanar)...'}
                              value={plan.notes || ''}
                              onChange={(e) =>
                                handleUpdateItem(idx, { notes: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>

                          {/* Actions: Move Up, Move Down, Delete */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={idx === 0}
                                onClick={() => handleMoveUp(idx)}
                                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                                title="উপরে তুলুন"
                              >
                                <ArrowUp className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={idx === selectedPlans.length - 1}
                                onClick={() => handleMoveDown(idx)}
                                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                                title="নিচে নামান"
                              >
                                <ArrowDown className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveModality(idx)}
                                className="size-7 p-0 text-muted-foreground hover:text-rose-500"
                                title="মুছুন"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPrintPreview(true)}
                disabled={selectedPlans.length === 0}
                className="h-9 text-xs font-semibold gap-1.5 w-full sm:w-auto"
              >
                <Printer className="size-3.5 text-emerald-600" />
                <span>{isBn ? 'প্রিন্ট প্রিভিউ' : 'Print A4 Plan'}</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveTreatmentPlan}
                disabled={saving || selectedPlans.length === 0}
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm active:scale-95 w-full sm:w-auto"
              >
                {saving ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                <span>{isBn ? 'ট্রিটমেন্ট প্ল্যান সংরক্ষণ করুন' : 'Save Treatment Plan'}</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OFFICIAL HPC A4 PRINT PREVIEW MODAL FOR TREATMENT PLAN */}
      <TreatmentPlanPrintModal
        open={showPrintPreview}
        onOpenChange={setShowPrintPreview}
        patient={patient}
        plans={selectedPlans}
        createdAt={new Date()}
      />
    </>
  );
}
