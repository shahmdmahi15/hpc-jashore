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
    name: 'ল্যাম্বার স্পন্ডিলোসিস / কোমর ব্যথা (Lumbar Pack)',
    items: [
      { modalityCode: 'IFT', modalityName: 'Interferential Therapy (IFT)', modalityNameBn: 'ইন্টারফেরেনশিয়াল থেরাপি', durationMinutes: 10, totalSessionsPrescribed: 10, frequency: 'daily', notes: '4-pole sweep 80-120Hz' },
      { modalityCode: 'MANUAL', modalityName: 'Manual Therapy & Mobilization', modalityNameBn: 'ম্যানুয়াল থেরাপি', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Lumbar spine mobilization & stretching' },
      { modalityCode: 'SWD', modalityName: 'Shortwave Diathermy (SWD)', modalityNameBn: 'শর্টওয়েভ ডায়াথার্মি', durationMinutes: 20, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Continuous coplanar mode' },
    ],
  },
  {
    name: 'সারভাইকাল রেডিকুলোপ্যাথি / ঘাড় ব্যথা (Cervical Pack)',
    items: [
      { modalityCode: 'TRACTION', modalityName: 'Cervical Traction', modalityNameBn: 'সারভাইকাল ট্র্যাকশন', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Intermittent 8kg - 10kg' },
      { modalityCode: 'UST', modalityName: 'Ultrasound Therapy (UST)', modalityNameBn: 'আল্ট্রাসাউন্ড থেরাপি', durationMinutes: 10, totalSessionsPrescribed: 10, frequency: 'daily', notes: '1.2 W/cm² pulsed mode' },
      { modalityCode: 'MANUAL', modalityName: 'Manual Mobilization', modalityNameBn: 'ম্যানুয়াল মোবিলাইজেশন', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Upper cervical gentle traction & posture correction' },
    ],
  },
  {
    name: 'হাঁটু ব্যথা / অস্টিওআর্থ্রাইটিস (Knee OA Pack)',
    items: [
      { modalityCode: 'SWD', modalityName: 'Shortwave Diathermy (SWD)', modalityNameBn: 'শর্টওয়েভ ডায়াথার্মি', durationMinutes: 20, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Contra-planar knee placement' },
      { modalityCode: 'IFT', modalityName: 'IFT / TENS', modalityNameBn: 'আইএফটি / টেনস', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Pain gate modulation' },
      { modalityCode: 'EXERCISE', modalityName: 'Therapeutic Exercise', modalityNameBn: 'থেরাপিউটিক এক্সারসাইজ', durationMinutes: 15, totalSessionsPrescribed: 10, frequency: 'daily', notes: 'Quadriceps strengthening & VMO activation' },
    ],
  },
  {
    name: 'ফ্রোজেন শোল্ডার (Frozen Shoulder Pack)',
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
    toast.success(`${modality.nameEn} ধাপ ${nextSeq} হিসেবে যুক্ত করা হয়েছে`);
  };

  const handleApplyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    const newItems: PrescribedModalityItem[] = preset.items.map((it, idx) => ({
      ...it,
      sequenceOrder: idx + 1,
    }));
    setSelectedPlans(newItems);
    toast.success(`${preset.name} সফলভাবে প্রয়োগ করা হয়েছে!`);
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
                  <span>থেরাপি ট্রিটমেন্ট প্ল্যান বিল্ডার (Therapy Plan Builder)</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  মডালিটির সিকোয়েন্স (১ম, ২য়, ৩য়...), প্রতিটির সময়সীমা (মিনিট) ও মোট সেশন নির্ধারণ করুন
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
                  <span>ক্লিনিক্যাল ট্রিটমেন্ট প্রি-সেট প্যাকেজ (Quick Presets):</span>
                </span>
                <span className="text-[10px] text-muted-foreground">১-ক্লিকে রেডি প্ল্যান লোড করুন</span>
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
                    <span>{preset.name}</span>
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
                    <span>মডালিটি নির্বাচন করুন (Select Modalities)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    তালিকা থেকে যেকোনো মডালিটি ক্লিক করে প্ল্যানের সিকোয়েন্সে যোগ করুন
                  </p>
                </div>

                <div className="w-full sm:w-64 relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="মডালিটি খুঁজুন (Search)..."
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
                  <span>নির্ধারিত থেরাপি সিকোয়েন্স ও শিডিউল (Sequenced Plan)</span>
                </Label>
                <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedPlans.length} টি ধাপ নির্ধারিত
                </Badge>
              </div>

              {selectedPlans.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    এখনও কোনো থেরাপি মডালিটি যুক্ত করা হয়নি। উপরের প্রি-সেট অথবা ক্যাটালগ থেকে মডালিটি যোগ করুন।
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-16 font-bold text-center">ক্রম</TableHead>
                        <TableHead className="font-bold">মডালিটি (Modality)</TableHead>
                        <TableHead className="w-28 font-bold">সময়সীমা (Min)</TableHead>
                        <TableHead className="w-28 font-bold">মোট সেশন</TableHead>
                        <TableHead className="w-36 font-bold">ফ্রিকোয়েন্সি</TableHead>
                        <TableHead className="font-bold">ক্লিনিক্যাল নির্দেশিকা</TableHead>
                        <TableHead className="w-24 text-right">অ্যাকশন</TableHead>
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
                                <SelectItem value="daily">প্রতিদিন (Daily)</SelectItem>
                                <SelectItem value="alternate_days">একদিন পরপর</SelectItem>
                                <SelectItem value="weekly">সাপ্তাহিক</SelectItem>
                                <SelectItem value="twice_weekly">সপ্তাহে ২ দিন</SelectItem>
                                <SelectItem value="thrice_weekly">সপ্তাহে ৩ দিন</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Clinical Notes / Intensity */}
                          <TableCell>
                            <Input
                              placeholder="তীব্রতা / টেকনিক (যেমন: 15 min, coplanar)..."
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
                <span>A4 প্রিন্ট প্রিভিউ (Print A4 Plan)</span>
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
                বন্ধ করুন
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
                <span>ট্রিটমেন্ট প্ল্যান সংরক্ষণ করুন (Save Plan)</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* A4 PRINT PREVIEW MODAL FOR TREATMENT PLAN */}
      {showPrintPreview && (
        <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
          <DialogContent className="max-w-[760px] max-h-[96vh] overflow-y-auto p-4 sm:p-6 bg-white text-zinc-950 border-border">
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200">
              <div className="flex items-center gap-2">
                <Printer className="size-4 text-emerald-600" />
                <span className="font-bold text-sm">থেরাপি ট্রিটমেন্ট প্ল্যান A4 কপি</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                  <Printer className="size-3.5" />
                  <span>এখনই প্রিন্ট করুন</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPrintPreview(false)} className="text-xs">
                  বন্ধ করুন
                </Button>
              </div>
            </div>

            {/* Isolated A4 Stylesheet */}
            <style dangerouslySetInnerHTML={{ __html: `
              @page {
                size: A4 portrait;
                margin: 8mm 10mm;
              }
              @media print {
                body.printing-hpc-plan {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body.printing-hpc-plan > *:not([data-radix-portal]) {
                  display: none !important;
                }
                body.printing-hpc-plan [data-radix-portal] {
                  position: static !important;
                  display: block !important;
                }
                body.printing-hpc-plan [data-radix-portal] > * {
                  position: static !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                body.printing-hpc-plan [role="dialog"] {
                  position: static !important;
                  transform: none !important;
                  max-width: none !important;
                  width: 100% !important;
                  height: auto !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: #ffffff !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                body.printing-hpc-plan [role="dialog"] > *:not(#hpc-treatment-plan-sheet) {
                  display: none !important;
                }
                #hpc-treatment-plan-sheet {
                  display: block !important;
                  width: 100% !important;
                  max-width: 210mm !important;
                  margin: 0 auto !important;
                  padding: 6mm 8mm !important;
                  box-sizing: border-box !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                #hpc-treatment-plan-sheet * {
                  color-adjust: exact !important;
                  -webkit-print-color-adjust: exact !important;
                }
              }
            ` }} />

            {/* HPC OFFICIAL A4 SHEET */}
            <div id="hpc-treatment-plan-sheet" className="p-4 space-y-4 font-sans text-zinc-950">
              {/* Header */}
              <div className="border-b-2 border-emerald-600 pb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <img
                    src="/hpclogo-transparent.png"
                    alt="HPC Logo"
                    width={44}
                    height={44}
                    className="w-11 h-11 object-contain shrink-0 mt-0.5"
                    style={{ width: '42px', height: '42px', maxWidth: '44px', maxHeight: '44px', objectFit: 'contain' }}
                  />
                  <div>
                    <h1 className="text-base font-black text-emerald-800 leading-tight uppercase">
                      HEALTH AND PAIN CARE CENTER
                    </h1>
                    <h2 className="text-xs font-bold text-zinc-800 leading-tight">
                      এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                    </h2>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                    </p>
                    <p className="text-[9.5px] text-zinc-500 font-mono">
                      হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpc@toufiquzzaman.com
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-xs border border-emerald-300 uppercase">
                    THERAPY PLAN (A4)
                  </span>
                  <div className="text-[10.5px] text-zinc-700 font-medium mt-1">
                    তৈরির তারিখ ও সময়:
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-900">
                    {nowFormatted}
                  </div>
                </div>
              </div>

              {/* Patient Info Strip */}
              <div className="grid grid-cols-4 gap-2 text-xs bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                <div>
                  <span className="text-zinc-500">রোগীর নাম:</span>{' '}
                  <strong className="text-zinc-900">
                    {patient?.nameBn || patient?.nameEn || patient?.patientNameBn || patient?.patientNameEn}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">MRN:</span>{' '}
                  <strong className="text-emerald-800 font-mono">{patient?.mrn}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">বয়স / লিঙ্গ:</span>{' '}
                  <strong>
                    {patient?.ageYears || '—'} বছর / {patient?.gender || '—'}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">মোবাইল:</span>{' '}
                  <strong className="font-mono">{patient?.phone || '—'}</strong>
                </div>
              </div>

              {/* Treatment Sequence Table */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    প্রেসক্রাইবকৃত ফিজিওথেরাপি সিকোয়েন্স ও সময়সূচী:
                  </h4>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    মোট {selectedPlans.length} টি থেরাপি ধাপ
                  </span>
                </div>

                <table className="w-full text-xs border border-zinc-300 border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-800 font-bold">
                      <th className="border border-zinc-300 p-2 text-center w-16">ক্রম</th>
                      <th className="border border-zinc-300 p-2 text-left">থেরাপি মডালিটি (Modality)</th>
                      <th className="border border-zinc-300 p-2 text-center w-28">নির্ধারিত সময়</th>
                      <th className="border border-zinc-300 p-2 text-center w-28">মোট সেশন</th>
                      <th className="border border-zinc-300 p-2 text-center w-32">ফ্রিকোয়েন্সি</th>
                      <th className="border border-zinc-300 p-2 text-left">ক্লিনিক্যাল নির্দেশিকা ও প্যারামিটার</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlans.map((p, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                        <td className="border border-zinc-300 p-2 text-center font-mono font-bold text-emerald-800">
                          ধাপ {idx + 1}
                        </td>
                        <td className="border border-zinc-300 p-2 font-bold text-zinc-900">
                          {p.modalityName} ({p.modalityCode})
                          {p.modalityNameBn && <div className="text-[10px] text-zinc-500 font-normal">{p.modalityNameBn}</div>}
                        </td>
                        <td className="border border-zinc-300 p-2 text-center font-bold text-emerald-700">
                          {p.durationMinutes} মিনিট
                        </td>
                        <td className="border border-zinc-300 p-2 text-center font-bold">
                          {p.totalSessionsPrescribed} সেশন
                        </td>
                        <td className="border border-zinc-300 p-2 text-center">
                          {p.frequency === 'daily'
                            ? 'প্রতিদিন'
                            : p.frequency === 'alternate_days'
                            ? 'একদিন পরপর'
                            : p.frequency}
                        </td>
                        <td className="border border-zinc-300 p-2 text-zinc-700 italic">
                          {p.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Instructions Box */}
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-700 space-y-1">
                <div className="font-bold text-zinc-800">হ্যান্ডলার ও রোগীর জন্য সাধারণ নির্দেশনা:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
                  <li>উপরোল্লিখিত ক্রমানুসারে (১ম, ২য়, ৩য়...) থেরাপি মডালিটি প্রয়োগ করতে হবে।</li>
                  <li>প্রতিটি সেশনের নির্ধারিত সময়সীমা যথাযথভাবে বজায় রাখতে হবে।</li>
                  <li>থেরাপি চলাকালীন কোনো অস্বস্তি বা তীব্র ব্যথা অনুভূত হলে তাৎক্ষণিক থেরাপিস্টকে অবহিত করুন।</li>
                </ul>
              </div>

              {/* Signatures */}
              <div className="pt-16 flex justify-between items-end text-xs text-zinc-700">
                <div className="border-t border-zinc-400 pt-1 w-52 text-center">
                  <div className="font-bold">হ্যান্ডলার / থেরাপিস্ট স্বাক্ষর</div>
                  <div className="text-[9.5px] text-zinc-500">Therapy Hall Staff</div>
                </div>
                <div className="border-t border-zinc-400 pt-1 w-52 text-center">
                  <div className="font-bold">অনুমোদিত স্বাক্ষর</div>
                  <div className="text-[9.5px] text-zinc-500">Consultant Physiotherapist</div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
