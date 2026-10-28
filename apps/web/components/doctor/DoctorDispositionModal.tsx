// apps/web/components/doctor/DoctorDispositionModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  DoorOpen,
  HeartPulse,
  FilePlus,
  ArrowRight,
  Sparkles,
  Calendar,
  RotateCcw,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';

export interface DoctorDispositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  visitId: string;
  activeSerialId?: string;
  hasAssessmentFile?: boolean;
  hasTreatmentPlan?: boolean;
  onOpenFileModal: () => void;
  onOpenPlanSection: () => void;
  onRoutingSuccess: () => void;
}

export function DoctorDispositionModal({
  open,
  onOpenChange,
  patient,
  visitId,
  activeSerialId,
  hasAssessmentFile,
  hasTreatmentPlan,
  onOpenFileModal,
  onOpenPlanSection,
  onRoutingSuccess,
}: DoctorDispositionModalProps) {
  const [loading, setLoading] = useState(false);
  const [checkingDues, setCheckingDues] = useState(false);
  const [pendingDuePaisa, setPendingDuePaisa] = useState<number>(0);
  const [dueDetails, setDueDetails] = useState<any[]>([]);

  // Consultation Fee & Adjustment States
  const [consultationFeePaidPaisa, setConsultationFeePaidPaisa] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'refund' | 'payment_collection'>('refund');
  const [adjustmentAmountTaka, setAdjustmentAmountTaka] = useState<number>(500);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const patientId = patient?.id;

  // Check pending dues and consultation fee whenever modal opens
  useEffect(() => {
    if (open && patientId) {
      checkPatientDues();
    }
  }, [open, patientId]);

  const checkPatientDues = async () => {
    setCheckingDues(true);
    try {
      const [billingRes, visitsToday] = await Promise.all([
        api.billing.getPatientBilling(patientId).catch(() => null),
        api.visits.getToday().catch(() => []),
      ]);

      const currentVisit = (visitsToday || []).find(
        (v: any) => v.id === visitId || v.patientId === patientId
      );
      const paidPaisa =
        currentVisit?.consultationFeePaidPaisa ??
        (billingRes?.bills?.find((b: any) =>
          b.items?.some((it: any) => it.itemType === 'consultation')
        )?.paidPaisa || 0);

      setConsultationFeePaidPaisa(paidPaisa);

      const duesList = (billingRes?.dues || []).filter(
        (d: any) => d.status === 'pending' && (d.amountPaisa || 0) > 0
      );
      setDueDetails(duesList);
      const totalPaisa = duesList.reduce((acc: number, d: any) => acc + (d.amountPaisa || 0), 0);
      setPendingDuePaisa(totalPaisa);

      // Default adjustment values based on paid amount
      const paidTaka = Math.round(paidPaisa / 100);
      if (paidTaka > 0) {
        setAdjustmentType('refund');
        setAdjustmentAmountTaka(paidTaka);
        setAdjustmentReason('পরামর্শ ফি রিফান্ড/ছাড়');
      } else {
        setAdjustmentType('payment_collection');
        setAdjustmentAmountTaka(500);
        setAdjustmentReason('কনসালটেশন ফি গ্রহণ');
      }
    } catch (err: any) {
      console.error('Error checking patient dues:', err);
      setPendingDuePaisa(0);
    } finally {
      setCheckingDues(false);
    }
  };

  // Route to Cashier with Consultation Adjustment (Refund or Payment Collection)
  const handleRouteToCashierAdjustment = async () => {
    if (!visitId) {
      toast.error('ভিজিট আইডি পাওয়া যায়নি');
      return;
    }
    if (adjustmentAmountTaka <= 0) {
      toast.error('সঠিক টাকার পরিমাণ দিন');
      return;
    }
    if (!adjustmentReason.trim()) {
      toast.error('অনুরোধের কারণ উল্লেখ করুন');
      return;
    }

    setLoading(true);
    try {
      await api.visits.requestConsultationAdjustment(visitId, {
        adjustmentType,
        amountTaka: Number(adjustmentAmountTaka),
        reason: adjustmentReason.trim(),
      });
      if (activeSerialId) {
        try {
          await api.visits.completeSerial(activeSerialId);
        } catch {}
      }
      toast.success(
        adjustmentType === 'refund'
          ? `ক্যাশিয়ারের কাছে ৳${adjustmentAmountTaka} রিফান্ড অনুরোধ পাঠানো হয়েছে!`
          : `ক্যাশিয়ারের কাছে ৳${adjustmentAmountTaka} ফি আদায়ের অনুরোধ পাঠানো হয়েছে!`
      );
      onOpenChange(false);
      onRoutingSuccess();
    } catch (err: any) {
      toast.error(`ক্যাশিয়ারে পাঠাতে ব্যর্থ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Route: No Therapy Needed (Medication Only / Discharge)
  const handleRouteNoTherapy = async () => {
    if (!visitId) {
      toast.error('ভিজিট আইডি পাওয়া যায়নি');
      return;
    }

    setLoading(true);
    try {
      if (pendingDuePaisa > 0) {
        // Has previous dues -> Route to Cashier first
        await api.visits.routePatient(visitId, {
          location: 'cashier',
        });
        if (activeSerialId) {
          try {
            await api.visits.completeSerial(activeSerialId);
          } catch {}
        }
        toast.success(
          `পূর্বের বকেয়া (৳${(pendingDuePaisa / 100).toFixed(2)}) আদায়ের জন্য রোগীকে ক্যাশিয়ারে পাঠানো হয়েছে। এরপর রিসেপশন ও চেকআউটে পাঠানো হবে।`
        );
      } else {
        // No dues -> Route directly to Receptionist for Checkout
        await api.visits.routePatient(visitId, {
          location: 'reception',
        });
        if (activeSerialId) {
          try {
            await api.visits.completeSerial(activeSerialId);
          } catch {}
        }
        toast.success('কোনো বকেয়া নেই। রোগীকে সরাসরি রিসেপশন ও চেকআউটে পাঠানো হয়েছে।');
      }

      onOpenChange(false);
      onRoutingSuccess();
    } catch (err: any) {
      toast.error(`রোগী পাঠাতে ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Route: Therapy Needed -> Directly forward to Therapy Hall & Queue (NO advance payment needed!)
  const handleRouteTherapyToHall = async () => {
    if (!visitId) {
      toast.error('ভিজিট আইডি পাওয়া যায়নি');
      return;
    }

    setLoading(true);
    try {
      await api.visits.routePatient(visitId, {
        location: 'therapy_hall',
      });
      if (activeSerialId) {
        try {
          await api.visits.completeSerial(activeSerialId);
        } catch (e: any) {
          console.warn('Complete serial note:', e?.message);
        }
      }
      toast.success('রোগীকে সফলভাবে থেরাপিস্ট ও থেরাপি কিউতে পাঠানো হয়েছে (অগ্রিম পেমেন্টের প্রয়োজন নেই)।');
      onOpenChange(false);
      onRoutingSuccess();
    } catch (err: any) {
      toast.error(`রোগী পাঠাতে ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-background border-border">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Send className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>কনসালটেশন সমাপ্তি ও রোগী প্রেরণ (Patient Disposition)</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                রোগী: <strong className="text-foreground">{patient?.nameEn || patient?.nameBn || 'Patient'}</strong>{' '}
                {patient?.nameBn && patient?.nameEn && `(${patient.nameBn})`} · MRN:{' '}
                <strong className="text-foreground font-mono">{patient?.mrn || 'N/A'}</strong>
              </DialogDescription>
            </div>

            {/* Dues & Consultation Fee Live Status Badges */}
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Badge
                variant="outline"
                className={`text-xs font-mono font-bold ${
                  Math.round(consultationFeePaidPaisa / 100) >= 500
                    ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30'
                    : Math.round(consultationFeePaidPaisa / 100) === 0
                    ? 'text-blue-700 bg-blue-500/10 border-blue-500/30'
                    : 'text-amber-700 bg-amber-500/10 border-amber-500/30'
                }`}
              >
                {Math.round(consultationFeePaidPaisa / 100) >= 500
                  ? `✓ ফি পরিশোধিত: ৳${Math.round(consultationFeePaidPaisa / 100)}`
                  : Math.round(consultationFeePaidPaisa / 100) === 0
                  ? 'ফি: ফ্রি (৳০ পরিশোধিত)'
                  : `আংশিক ফি: ৳${Math.round(consultationFeePaidPaisa / 100)}`}
              </Badge>

              {checkingDues ? (
                <Badge variant="outline" className="text-xs font-mono animate-pulse">
                  বকেয়া যাচাই...
                </Badge>
              ) : pendingDuePaisa > 0 ? (
                <Badge variant="destructive" className="text-xs font-mono font-bold">
                  বকেয়া: ৳{(pendingDuePaisa / 100).toFixed(2)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  বকেয়া নেই
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* SECTION: DOCTOR -> CASHIER FEE ADJUSTMENT & REFUND ROUTING (Cases 1, 2, 3) */}
        <Card className="border-2 border-cyan-500/40 bg-cyan-500/5 dark:bg-cyan-950/20 shadow-xs my-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-cyan-600 dark:text-cyan-400" />
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  ক্যাশিয়ারে পাঠান — ফি ও রিফান্ড সমন্বয় (Doctor Chamber Fee Adjustment)
                </CardTitle>
              </div>
              <Badge className="bg-cyan-600 text-white font-mono text-[10px]">
                {Math.round(consultationFeePaidPaisa / 100) >= 500
                  ? 'কেস ১: সম্পূর্ণ পরিশোধিত'
                  : Math.round(consultationFeePaidPaisa / 100) === 0
                  ? 'কেস ২: ফ্রি কনসালটেশন'
                  : 'কেস ৩: আংশিক পরিশোধিত'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              ডাক্তারের সিদ্ধান্ত অনুযায়ী ক্যাশিয়ারে রিফান্ড বা ফি আদায়ের অনুরোধ পাঠানো হবে। ক্যাশিয়ার তা সম্পন্ন করে ইনভয়েস রিসিট প্রিন্ট দেবেন এবং রোগীকে রিসেপশনে পাঠিয়ে দেবেন।
            </p>
          </CardHeader>

          <CardContent className="space-y-3 pt-1">
            {/* Case 1: Full Paid -> Refund Request (Full or Partial) */}
            {Math.round(consultationFeePaidPaisa / 100) >= 500 && (
              <div className="space-y-3 p-3 rounded-xl border border-cyan-500/30 bg-background/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-200">
                    <ArrowDownLeft className="size-4 text-cyan-600" />
                    <span>কেস ১: সম্পূর্ণ পরিশোধিত (৳{Math.round(consultationFeePaidPaisa / 100)}) — রিফান্ড অনুরোধ</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-cyan-700 font-mono">
                    রিফান্ড প্রযোজ্য
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">রিফান্ডের ধরন</Label>
                    <Select
                      value={adjustmentAmountTaka === Math.round(consultationFeePaidPaisa / 100) ? 'full' : 'partial'}
                      onValueChange={(val) => {
                        setAdjustmentType('refund');
                        if (val === 'full') {
                          setAdjustmentAmountTaka(Math.round(consultationFeePaidPaisa / 100));
                        } else {
                          setAdjustmentAmountTaka(Math.max(100, Math.round(consultationFeePaidPaisa / 100) / 2));
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">সম্পূর্ণ রিফান্ড (৳{Math.round(consultationFeePaidPaisa / 100)})</SelectItem>
                        <SelectItem value="partial">আংশিক রিফান্ড (নির্দিষ্ট পরিমাণ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">রিফান্ডের পরিমাণ (টাকা) *</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        min={1}
                        max={Math.round(consultationFeePaidPaisa / 100)}
                        value={adjustmentAmountTaka}
                        onChange={(e) => setAdjustmentAmountTaka(Number(e.target.value) || 0)}
                        className="pl-6 h-8 text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">রিফান্ডের কারণ *</Label>
                  <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="-- কারণ নির্বাচন করুন --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="পরামর্শ ফি সম্পূর্ণ মওকুফ">পরামর্শ ফি সম্পূর্ণ মওকুফ (Fee Waived)</SelectItem>
                      <SelectItem value="রোগী পরামর্শে সন্তুষ্ট নন / চিকিৎসা না নিয়ে প্রস্থান">রোগী পরামর্শে সন্তুষ্ট নন / চিকিৎসা না নিয়ে প্রস্থান</SelectItem>
                      <SelectItem value="ডাক্তারের বিশেষ আংশিক ছাড়">ডাক্তারের বিশেষ আংশিক ছাড় (Special Discount)</SelectItem>
                      <SelectItem value="ভুলবশত সংগৃহীত অতিরিক্ত ফি ফেরত">ভুলবশত সংগৃহীত অতিরিক্ত ফি ফেরত (Excess Fee Return)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  onClick={handleRouteToCashierAdjustment}
                  disabled={loading || adjustmentAmountTaka <= 0 || !adjustmentReason}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-9 gap-1.5 shadow-sm active:scale-98 cursor-pointer"
                >
                  <ArrowDownLeft className="size-3.5" />
                  <span>ক্যাশিয়ারে রিফান্ড অনুরোধ পাঠান (৳{adjustmentAmountTaka})</span>
                  <ArrowRight className="size-3.5 ml-auto" />
                </Button>
              </div>
            )}

            {/* Case 2: Free / ৳0 Paid -> Payment Request */}
            {Math.round(consultationFeePaidPaisa / 100) === 0 && (
              <div className="space-y-3 p-3 rounded-xl border border-cyan-500/30 bg-background/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-200">
                    <ArrowUpRight className="size-4 text-cyan-600" />
                    <span>কেস ২: ফ্রি কনসালটেশন (৳০) — ফি আদায়ের অনুরোধ</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 font-mono">
                    ফি গ্রহণ
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">ধার্যকৃত ফি (টাকা) *</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        min={1}
                        value={adjustmentAmountTaka}
                        onChange={(e) => {
                          setAdjustmentType('payment_collection');
                          setAdjustmentAmountTaka(Number(e.target.value) || 0);
                        }}
                        className="pl-6 h-8 text-xs font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">ফি আদায়ের কারণ *</Label>
                    <Select value={adjustmentReason} onValueChange={(r) => { setAdjustmentType('payment_collection'); setAdjustmentReason(r); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="-- কারণ নির্বাচন করুন --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="নিয়মিত কনসালটেশন ফি গ্রহণ">নিয়মিত কনসালটেশন ফি গ্রহণ</SelectItem>
                        <SelectItem value="বিশেষজ্ঞ পরামর্শ ও মূল্যায়ন ফি">বিশেষজ্ঞ পরামর্শ ও মূল্যায়ন ফি</SelectItem>
                        <SelectItem value="ইনভেস্টিগেশন পর্যালোচনা ও দ্বিতীয় মতামত">ইনভেস্টিগেশন পর্যালোচনা ও দ্বিতীয় মতামত</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleRouteToCashierAdjustment}
                  disabled={loading || adjustmentAmountTaka <= 0 || !adjustmentReason}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 shadow-sm active:scale-98 cursor-pointer"
                >
                  <ArrowUpRight className="size-3.5" />
                  <span>ক্যাশিয়ারে ফি আদায় অনুরোধ পাঠান (৳{adjustmentAmountTaka})</span>
                  <ArrowRight className="size-3.5 ml-auto" />
                </Button>
              </div>
            )}

            {/* Case 3: Partial Paid -> Refund or Payment Choice */}
            {Math.round(consultationFeePaidPaisa / 100) > 0 && Math.round(consultationFeePaidPaisa / 100) < 500 && (
              <div className="space-y-3 p-3 rounded-xl border border-cyan-500/30 bg-background/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-200">
                    <Coins className="size-4 text-cyan-600" />
                    <span>কেস ৩: আংশিক পরিশোধিত (৳{Math.round(consultationFeePaidPaisa / 100)}) — রিফান্ড অথবা বাকি ফি আদায়</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-amber-600 font-mono">
                    সমন্বয়
                  </Badge>
                </div>

                {/* Choice Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('refund');
                      setAdjustmentAmountTaka(Math.round(consultationFeePaidPaisa / 100));
                      setAdjustmentReason('আংশিক পরিশোধিত ফি ফেরত');
                    }}
                    className={`p-2 rounded-lg border text-left text-xs font-bold transition-all ${
                      adjustmentType === 'refund'
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 shadow-2xs'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowDownLeft className="size-3.5 text-cyan-600" />
                      <span>টাকা রিফান্ড (পরিশোধিত ৳{Math.round(consultationFeePaidPaisa / 100)})</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('payment_collection');
                      setAdjustmentAmountTaka(Math.max(100, 500 - Math.round(consultationFeePaidPaisa / 100)));
                      setAdjustmentReason('বাকি কনসালটেশন ফি আদায়');
                    }}
                    className={`p-2 rounded-lg border text-left text-xs font-bold transition-all ${
                      adjustmentType === 'payment_collection'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 shadow-2xs'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight className="size-3.5 text-emerald-600" />
                      <span>বাকি ফি আদায় (৳{Math.max(100, 500 - Math.round(consultationFeePaidPaisa / 100))})</span>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">
                      {adjustmentType === 'refund' ? 'রিফান্ডের পরিমাণ (টাকা) *' : 'আদায়ের পরিমাণ (টাকা) *'}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        min={1}
                        max={adjustmentType === 'refund' ? Math.round(consultationFeePaidPaisa / 100) : 10000}
                        value={adjustmentAmountTaka}
                        onChange={(e) => setAdjustmentAmountTaka(Number(e.target.value) || 0)}
                        className="pl-6 h-8 text-xs font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-foreground">অনুরোধের কারণ *</Label>
                    <Input
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="কারণ উল্লেখ করুন..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleRouteToCashierAdjustment}
                  disabled={loading || adjustmentAmountTaka <= 0 || !adjustmentReason}
                  className={`w-full text-white font-bold text-xs h-9 gap-1.5 shadow-sm active:scale-98 cursor-pointer ${
                    adjustmentType === 'refund'
                      ? 'bg-cyan-600 hover:bg-cyan-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {adjustmentType === 'refund' ? (
                    <>
                      <ArrowDownLeft className="size-3.5" />
                      <span>ক্যাশিয়ারে রিফান্ড অনুরোধ পাঠান (৳{adjustmentAmountTaka})</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="size-3.5" />
                      <span>ক্যাশিয়ারে ফি আদায় অনুরোধ পাঠান (৳{adjustmentAmountTaka})</span>
                    </>
                  )}
                  <ArrowRight className="size-3.5 ml-auto" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2 Standard Routing Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          {/* OPTION 1: NO THERAPY NEEDED */}
          <Card className="border border-border/80 bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-bold text-blue-600 border-blue-500/30 bg-blue-500/10">
                  পাথ ১: প্রেসক্রিপশন / পরামর্শ
                </Badge>
                <DoorOpen className="size-5 text-blue-600" />
              </div>
              <CardTitle className="text-sm sm:text-base font-bold mt-1 text-foreground">
                থেরাপির প্রয়োজন নেই (No Therapy Needed)
              </CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed">
                রোগীকে কেবল ওষুধ ও ঘরোয়া ব্যায়ামের পরামর্শ দেওয়া হয়েছে। সেন্টারে থেরাপির প্রয়োজন নেই।
              </p>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              {/* Due Warning Box */}
              {pendingDuePaisa > 0 ? (
                <div className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span>রোগীর পূর্বের বকেয়া রয়েছে: ৳{(pendingDuePaisa / 100).toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    রোগী প্রথমে ক্যাশিয়ারে বকেয়া পরিশোধ করবেন, এরপর রিসেপশনে গিয়ে চেকআউট সম্পন্ন করবেন।
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>কোনো বকেয়া নেই। সরাসরি রিসেপশন ও চেকআউটে পাঠানো হবে।</span>
                </div>
              )}

              <Button
                type="button"
                onClick={handleRouteNoTherapy}
                disabled={loading || checkingDues}
                className={`w-full font-bold gap-1.5 text-xs sm:text-sm h-11 cursor-pointer shadow-sm ${
                  pendingDuePaisa > 0
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {pendingDuePaisa > 0 ? (
                  <>
                    <CreditCard className="size-4" />
                    <span>ক্যাশিয়ারে পাঠান (বকেয়া পরিশোধ)</span>
                  </>
                ) : (
                  <>
                    <DoorOpen className="size-4" />
                    <span>রিসেপশন ও চেকআউটে পাঠান</span>
                  </>
                )}
                <ArrowRight className="size-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          {/* OPTION 2: THERAPY NEEDED */}
          <Card className="border-2 border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col justify-between shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-500/15 border-emerald-500/30">
                  পাথ ২: রিহ্যাবিলিটেশন
                </Badge>
                <HeartPulse className="size-5 text-emerald-600" />
              </div>
              <CardTitle className="text-sm sm:text-base font-bold mt-1 text-foreground">
                ফিজিওথেরাপি প্রয়োজন (Therapy Needed)
              </CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed">
                রোগীর জন্য সেন্টারের থেরাপি হল / রিহ্যাব ফ্লোরে চিকিৎসা সেশন নির্ধারিত হয়েছে। থেরাপির পূর্বে কোনো পেমেন্ট লাগবে না—সকল বিলিং থেরাপির পরে সম্পন্ন হবে।
              </p>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="size-4 text-emerald-600 shrink-0" />
                  <span>অগ্রিম পেমেন্ট নেই (Pay After Therapy)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  নীতি অনুযায়ী থেরাপির পূর্বে কোনো বিল পরিশোধের প্রয়োজন নেই। রোগী সরাসরি থেরাপিস্টের কিউতে প্রবেশ করবেন এবং থেরাপি শেষে বিল পরিশোধ করবেন।
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-border bg-card text-xs space-y-2">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>পরামর্শ ও প্রস্তুতি:</span>
                </div>

                {/* Step 1: Assessment File */}
                <div className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-muted/40">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-600 font-mono">১.</span>
                    <span className="text-[11.5px]">ফিজিওথেরাপি ফাইল</span>
                    {hasAssessmentFile ? (
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-none text-[10px] py-0 px-1 font-bold">সম্পন্ন</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-[10px] py-0 px-1 font-medium">ঐচ্ছিক</Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenFileModal();
                    }}
                    className="h-7 text-[11px] font-bold border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <FilePlus className="size-3.5 mr-1" />
                    <span>ফাইল ওপেন</span>
                  </Button>
                </div>

                {/* Step 2: Treatment Plan */}
                <div className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-muted/40">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-cyan-600 font-mono">২.</span>
                    <span className="text-[11.5px]">ট্রিটমেন্ট প্ল্যান ও মডালিটি</span>
                    {hasTreatmentPlan ? (
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-none text-[10px] py-0 px-1 font-bold">নির্ধারিত</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-[10px] py-0 px-1 font-medium">চেক করুন</Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenPlanSection();
                    }}
                    className="h-7 text-[11px] font-bold border-cyan-500/40 text-cyan-700 hover:bg-cyan-500/10 cursor-pointer"
                  >
                    <Calendar className="size-3.5 mr-1" />
                    <span>প্ল্যান চেক</span>
                  </Button>
                </div>
              </div>

              {/* Direct Route to Therapy Hall Button */}
              <Button
                type="button"
                onClick={handleRouteTherapyToHall}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 text-xs sm:text-sm h-11 cursor-pointer shadow-sm active:scale-98"
              >
                <HeartPulse className="size-4" />
                <span>থেরাপিস্ট ও থেরাপি কিউতে পাঠান</span>
                <ArrowRight className="size-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            বাতিল করুন (Close)
          </Button>

          <span className="text-[11px] text-muted-foreground">
            HPC Intelligent Patient Flow Routing
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
