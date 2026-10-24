// apps/web/components/admin/EditTherapySlotDialog.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Clock,
  Users,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Loader2,
  Check,
  Sparkles,
  Sliders,
  Plus,
  Minus,
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
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  updateTherapySlotAction,
  type TherapySlotRecord,
} from '../../lib/actions/therapy-slots';

interface EditTherapySlotDialogProps {
  slot: TherapySlotRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: TherapySlotRecord) => void;
}

export function EditTherapySlotDialog({
  slot,
  open,
  onOpenChange,
  onSuccess,
}: EditTherapySlotDialogProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    maleRegular: number;
    femaleRegular: number;
    maleExtra: number;
    femaleExtra: number;
    isActive: boolean;
    notes: string;
  }>({
    maleRegular: 0,
    femaleRegular: 0,
    maleExtra: 0,
    femaleExtra: 0,
    isActive: true,
    notes: '',
  });

  useEffect(() => {
    if (slot) {
      setForm({
        maleRegular: slot.slotMaleRegularCapacity ?? 0,
        femaleRegular: slot.slotFemaleRegularCapacity ?? 0,
        maleExtra: slot.slotMaleExtraCapacity ?? 0,
        femaleExtra: slot.slotFemaleExtraCapacity ?? 0,
        isActive: slot.isActive === 1,
        notes: slot.notes || '',
      });
      setErrorMsg(null);
    }
  }, [slot]);

  const regularTotal = form.maleRegular + form.femaleRegular;
  const extraTotal = form.maleExtra + form.femaleExtra;
  const grandTotal = regularTotal + extraTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot) return;

    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateTherapySlotAction(slot.id, {
        slotMaleRegularCapacity: form.maleRegular,
        slotFemaleRegularCapacity: form.femaleRegular,
        slotMaleExtraCapacity: form.maleExtra,
        slotFemaleExtraCapacity: form.femaleExtra,
        isActive: form.isActive ? 1 : 0,
        notes: form.notes,
      });

      if (!res.success || !res.data) {
        const err = res.error || (isBn ? 'স্লট আপডেট করতে সমস্যা হয়েছে' : 'Failed to update slot');
        setErrorMsg(err);
        toast.error(err);
        return;
      }

      toast.success(
        isBn
          ? `স্লট ${slot.slotHour} (${slot.day}) সফলভাবে আপডেট হয়েছে!`
          : `Therapy slot ${slot.slotHour} (${slot.day}) updated successfully!`,
      );

      onOpenChange(false);
      onSuccess?.(res.data);
    });
  };

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                {isBn ? 'থেরাপি স্লট কনফিগারেশন' : 'Configure Therapy Slot Capacity'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-foreground">{slot.day}</span>
                <span>•</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {slot.slotHour}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
          {/* Active Switch */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs sm:text-sm font-bold text-foreground">
                {isBn ? 'স্লট সক্রিয় রাখুন' : 'Slot Active / Operational'}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {isBn
                  ? 'এই সময়ে থেরাপি সেশন গ্রহণ করা হবে কি না নির্ধারণ করুন'
                  : 'Enable or disable therapy intake during this hour'}
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(val) => setForm((prev) => ({ ...prev, isActive: val }))}
            />
          </div>

          {/* Capacity Section */}
          <div className="space-y-3.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              {isBn ? 'স্লট ক্যাপাসিটি প্যারামিটার' : 'Slot Capacity Parameters'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Male Regular Capacity */}
              <div className="p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {isBn ? 'পুরুষ রেগুলার ক্যাপাসিটি' : 'Male Regular Capacity'}
                  </Label>
                  <span className="text-[10px] font-semibold text-blue-600 uppercase">Regular</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        maleRegular: Math.max(0, prev.maleRegular - 1),
                      }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={form.maleRegular}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maleRegular: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="h-9 text-center font-bold font-mono text-base bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, maleRegular: prev.maleRegular + 1 }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Female Regular Capacity */}
              <div className="p-3.5 rounded-xl border border-pink-200/60 dark:border-pink-900/40 bg-pink-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-pink-700 dark:text-pink-300">
                    {isBn ? 'মহিলা রেগুলার ক্যাপাসিটি' : 'Female Regular Capacity'}
                  </Label>
                  <span className="text-[10px] font-semibold text-pink-600 uppercase">Regular</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        femaleRegular: Math.max(0, prev.femaleRegular - 1),
                      }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={form.femaleRegular}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        femaleRegular: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="h-9 text-center font-bold font-mono text-base bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, femaleRegular: prev.femaleRegular + 1 }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Male Extra Capacity */}
              <div className="p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {isBn ? 'পুরুষ এক্সট্রা ক্যাপাসিটি' : 'Male Extra Capacity'}
                  </Label>
                  <span className="text-[10px] font-semibold text-amber-600 uppercase">Buffer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        maleExtra: Math.max(0, prev.maleExtra - 1),
                      }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={form.maleExtra}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        maleExtra: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="h-9 text-center font-bold font-mono text-base bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, maleExtra: prev.maleExtra + 1 }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Female Extra Capacity */}
              <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-rose-700 dark:text-rose-300">
                    {isBn ? 'মহিলা এক্সট্রা ক্যাপাসিটি' : 'Female Extra Capacity'}
                  </Label>
                  <span className="text-[10px] font-semibold text-rose-600 uppercase">Buffer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        femaleExtra: Math.max(0, prev.femaleExtra - 1),
                      }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={form.femaleExtra}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        femaleExtra: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="h-9 text-center font-bold font-mono text-base bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, femaleExtra: prev.femaleExtra + 1 }))
                    }
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Total Summary Ribbon */}
            <div className="p-3 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-around text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {isBn ? 'রেগুলার মোট' : 'Regular Total'}
                </p>
                <p className="text-base font-bold font-mono text-foreground">{regularTotal}</p>
              </div>
              <div className="h-6 w-px bg-border/80" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {isBn ? 'এক্সট্রা বাফার' : 'Extra Buffer'}
                </p>
                <p className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                  {extraTotal}
                </p>
              </div>
              <div className="h-6 w-px bg-border/80" />
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                  {isBn ? 'সর্বমোট ক্যাপাসিটি' : 'Max Capacity'}
                </p>
                <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {grandTotal}
                </p>
              </div>
            </div>
          </div>

          {/* Operational Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs sm:text-sm font-medium text-foreground">
              {isBn ? 'অপারেশনাল নোট বা নির্দেশনা (ঐচ্ছিক)' : 'Operational Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder={
                isBn
                  ? 'উদাঃ এই স্লটে সিনিয়র ফিজিওথেরাপিস্ট উপস্থিত থাকবেন...'
                  : 'e.g. Peak hour, two therapists on duty, electrotherapy priority...'
              }
              rows={2}
              className="resize-none rounded-xl text-xs sm:text-sm"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border/50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-xl text-xs sm:text-sm cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
