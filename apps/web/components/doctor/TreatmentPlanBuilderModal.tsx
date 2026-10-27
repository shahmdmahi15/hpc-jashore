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
import { Card, CardContent } from '../ui/card';
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
  CheckCircle2,
  Calendar,
  Sparkles,
  Search,
  RefreshCw,
  Clock,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PrescribedModalityItem {
  modalityCode: string;
  modalityName: string;
  modalityNameBn?: string;
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
  initialPlans?: PrescribedModalityItem[];
}

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
  const [selectedPlans, setSelectedPlans] = useState<PrescribedModalityItem[]>(initialPlans);
  const [existingPlans, setExistingPlans] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const patientId = patient?.id || patient?.patientId;

  // Load catalog & existing patient plans on open
  useEffect(() => {
    if (!open) return;

    if (initialPlans && initialPlans.length > 0) {
      setSelectedPlans(initialPlans);
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
    if (selectedPlans.some((p) => p.modalityCode === modality.code)) {
      toast.info(`${modality.nameEn} (${modality.code}) ইতিপূর্বে যুক্ত করা হয়েছে`);
      return;
    }

    const newItem: PrescribedModalityItem = {
      modalityCode: modality.code,
      modalityName: modality.nameEn,
      modalityNameBn: modality.nameBn,
      totalSessionsPrescribed: 10,
      frequency: 'daily',
      notes: '',
    };

    setSelectedPlans([...selectedPlans, newItem]);
    toast.success(`${modality.nameEn} প্ল্যানে যুক্ত করা হয়েছে`);
  };

  const handleRemoveModality = (code: string) => {
    setSelectedPlans(selectedPlans.filter((p) => p.modalityCode !== code));
  };

  const handleUpdateItem = (code: string, updates: Partial<PrescribedModalityItem>) => {
    setSelectedPlans((prev) =>
      prev.map((it) => (it.modalityCode === code ? { ...it, ...updates } : it))
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
      const res = await api.therapy.createPlans({
        patientId,
        visitId,
        consultationId,
        plans: selectedPlans.map((p) => ({
          modalityCode: p.modalityCode,
          totalSessionsPrescribed: Number(p.totalSessionsPrescribed) || 10,
          frequency: p.frequency || 'daily',
          notes: p.notes || undefined,
        })),
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
    window.print();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-background border-border">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Activity className="size-5" />
                  </span>
                  <span>থেরাপি ট্রিটমেন্ট প্ল্যান বিল্ডার (Therapy Plan Builder)</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  রোগীর জন্য নির্দিষ্ট ফিজিওথেরাপি ও রিহ্যাবিলিটেশন মডালিটি, সেশন সংখ্যা ও শিডিউল নির্ধারণ করুন
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
            {/* 1. ACTIVE / PAST PLANS FOR PATIENT */}
            {existingPlans.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                  <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-foreground">
                    <Clock className="size-4 text-primary" />
                    <span>রোগীর বর্তমান ও পূর্ববর্তী সক্রিয় প্ল্যানসমূহ (Active Treatment Plans)</span>
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {existingPlans.length} টি প্ল্যান
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {existingPlans.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">
                          {ep.modalityNameBn || ep.modalityNameEn || ep.modalityCode}
                        </span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                          সক্রিয়
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground mt-1">
                        <span>সেশন সম্পন্ন:</span>
                        <span className="font-mono font-bold text-foreground">
                          {ep.completedSessions || 0} / {ep.totalSessionsPrescribed} সেশন
                        </span>
                      </div>
                      {ep.frequency && (
                        <div className="text-[11px] text-muted-foreground">
                          ফ্রিকোয়েন্সি: <strong>{ep.frequency}</strong>
                        </div>
                      )}
                      {ep.notes && (
                        <div className="text-[11px] italic text-muted-foreground truncate">
                          নোট: {ep.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. MODALITIES CATALOG SELECTOR */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
                    <Sparkles className="size-4 text-amber-500" />
                    <span>মডালিটি নির্বাচন করুন (Select Modalities from Catalog)</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    নিচের ক্যাটালগ থেকে রোগীর প্রেসক্রিপশনে মডালিটি যুক্ত করুন
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
                <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="size-4 animate-spin text-primary" />
                  <span>ক্যাটালগ লোড হচ্ছে...</span>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                  কোনো মডালিটি পাওয়া যায়নি।
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-muted/20 border border-border/50">
                  {filteredCatalog.map((mod) => {
                    const isSelected = selectedPlans.some((p) => p.modalityCode === mod.code);
                    return (
                      <button
                        key={mod.code}
                        type="button"
                        onClick={() => handleAddModality(mod)}
                        disabled={isSelected}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer',
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-not-allowed opacity-80'
                            : 'bg-card hover:bg-muted border-border text-foreground hover:border-primary/50'
                        )}
                      >
                        {isSelected ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Plus className="size-3 text-muted-foreground" />
                        )}
                        <span>{mod.nameEn}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">({mod.code})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. SELECTED PLANS CONFIGURATION TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <FileText className="size-4 text-emerald-500" />
                  <span>নির্ধারিত ট্রিটমেন্ট প্ল্যান (Prescribed Treatment Schedule)</span>
                </Label>
                <Badge variant="outline" className="text-xs font-bold text-primary">
                  {selectedPlans.length} টি নির্বাচিত
                </Badge>
              </div>

              {selectedPlans.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border/80 bg-muted/10">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    এখনও কোনো থেরাপি মডালিটি যুক্ত করা হয়নি। উপরের তালিকা থেকে প্রয়োজনীয় মডালিটি নির্বাচন করুন।
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-bold">মডালিটি (Modality)</TableHead>
                        <TableHead className="w-36 font-bold">মোট সেশন (Sessions)</TableHead>
                        <TableHead className="w-40 font-bold">ফ্রিকোয়েন্সি (Frequency)</TableHead>
                        <TableHead className="font-bold">বিশেষ নির্দেশিকা / নোট (Instructions)</TableHead>
                        <TableHead className="w-16 text-right">মুছুন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlans.map((plan) => (
                        <TableRow key={plan.modalityCode}>
                          <TableCell className="font-bold text-foreground">
                            <div>{plan.modalityName}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {plan.modalityCode} {plan.modalityNameBn ? `• ${plan.modalityNameBn}` : ''}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={plan.totalSessionsPrescribed}
                                onChange={(e) =>
                                  handleUpdateItem(plan.modalityCode, {
                                    totalSessionsPrescribed: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="h-8 w-20 text-xs font-mono font-bold"
                              />
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItem(plan.modalityCode, {
                                      totalSessionsPrescribed: plan.totalSessionsPrescribed + 5,
                                    })
                                  }
                                  className="text-[9px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateItem(plan.modalityCode, {
                                      totalSessionsPrescribed: Math.max(1, plan.totalSessionsPrescribed - 5),
                                    })
                                  }
                                  className="text-[9px] px-1 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground"
                                >
                                  -5
                                </button>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Select
                              value={plan.frequency}
                              onValueChange={(val) =>
                                handleUpdateItem(plan.modalityCode, { frequency: val })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">প্রতিদিন (Daily)</SelectItem>
                                <SelectItem value="alternate_days">একদিন পরপর (Alt. Days)</SelectItem>
                                <SelectItem value="weekly">সাপ্তাহিক (Weekly)</SelectItem>
                                <SelectItem value="twice_weekly">সপ্তাহে ২ দিন (2x/Week)</SelectItem>
                                <SelectItem value="thrice_weekly">সপ্তাহে ৩ দিন (3x/Week)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            <Input
                              placeholder="প্যারামিটার / তীব্রতা / সময়সীমা (যেমন: 15 min, 1.2 W/cm²)..."
                              value={plan.notes || ''}
                              onChange={(e) =>
                                handleUpdateItem(plan.modalityCode, { notes: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveModality(plan.modalityCode)}
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
                <Printer className="size-3.5" />
                <span>প্রিন্ট প্রিভিউ (Print Plan)</span>
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
          <DialogContent className="max-w-[700px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 bg-white text-slate-900 border-border">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="size-4 text-emerald-600" />
                <span className="font-bold text-sm">থেরাপি ট্রিটমেন্ট প্ল্যান কপি (Print Copy)</span>
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

            {/* HPC OFFICIAL HEADER */}
            <div className="p-6 space-y-4 font-sans">
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  HPC HEALTH &amp; PAIN CARE CENTER
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  রেল রোড, যশোর | হেল্পলাইন: 01700-000000 | ইমেইল: hpc@toufiquzzaman.com
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mt-1">
                  OFFICIAL PHYSICAL THERAPY &amp; REHABILITATION TREATMENT PLAN
                </p>
              </div>

              {/* PATIENT INFO */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500">রোগীর নাম:</span>{' '}
                  <strong className="text-slate-900">{patient?.nameBn || patient?.nameEn || patient?.patientNameBn || patient?.patientNameEn}</strong>
                </div>
                <div>
                  <span className="text-slate-500">MRN:</span>{' '}
                  <strong className="text-slate-900 font-mono">{patient?.mrn}</strong>
                </div>
                <div>
                  <span className="text-slate-500">বয়স / লিঙ্গ:</span>{' '}
                  <strong className="text-slate-900">{patient?.ageYears || '—'} বছর / {patient?.gender || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">তারিখ:</span>{' '}
                  <strong className="text-slate-900">{new Date().toLocaleDateString('bn-BD')}</strong>
                </div>
              </div>

              {/* TREATMENT MODALITIES TABLE */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  প্রেসক্রাইবকৃত ফিজিওথেরাপি মডালিটি ও শিডিউল:
                </h4>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="border border-slate-300 p-2 text-left">মডালিটি</th>
                      <th className="border border-slate-300 p-2 text-center w-28">মোট সেশন</th>
                      <th className="border border-slate-300 p-2 text-center w-36">ফ্রিকোয়েন্সি</th>
                      <th className="border border-slate-300 p-2 text-left">ক্লিনিক্যাল নির্দেশিকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlans.map((p, idx) => (
                      <tr key={p.modalityCode} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="border border-slate-300 p-2 font-bold text-slate-900">
                          {p.modalityName} ({p.modalityCode})
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-bold">
                          {p.totalSessionsPrescribed} সেশন
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          {p.frequency === 'daily' ? 'প্রতিদিন' : p.frequency === 'alternate_days' ? 'একদিন পরপর' : p.frequency}
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-700 italic">
                          {p.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SIGNATURES */}
              <div className="pt-12 flex justify-between items-end text-xs text-slate-600">
                <div className="border-t border-slate-400 pt-1 w-48 text-center">
                  হ্যান্ডলার / থেরাপিস্ট স্বাক্ষর
                </div>
                <div className="border-t border-slate-400 pt-1 w-48 text-center">
                  কনসালট্যান্ট ফিজিওথেরাপিস্ট স্বাক্ষর
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
