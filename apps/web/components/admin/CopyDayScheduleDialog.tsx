// apps/web/components/admin/CopyDayScheduleDialog.tsx
'use client';

import React, { useState, useTransition } from 'react';
import {
  Copy,
  Calendar,
  Check,
  AlertTriangle,
  Loader2,
  Sparkles,
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
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  copyDayScheduleAction,
  type DayOfWeek,
} from '../../lib/actions/therapy-slots';

interface CopyDayScheduleDialogProps {
  fromDay: DayOfWeek;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ALL_DAYS: Array<{ id: DayOfWeek; labelEn: string; labelBn: string }> = [
  { id: 'Saturday', labelEn: 'Saturday', labelBn: 'শনিবার' },
  { id: 'Sunday', labelEn: 'Sunday', labelBn: 'রবিবার' },
  { id: 'Monday', labelEn: 'Monday', labelBn: 'সোমবার' },
  { id: 'Tuesday', labelEn: 'Tuesday', labelBn: 'মঙ্গলবার' },
  { id: 'Wednesday', labelEn: 'Wednesday', labelBn: 'বুধবার' },
  { id: 'Thursday', labelEn: 'Thursday', labelBn: 'বৃহস্পতিবার' },
  { id: 'Friday', labelEn: 'Friday', labelBn: 'শুক্রবার' },
];

export function CopyDayScheduleDialog({
  fromDay,
  open,
  onOpenChange,
  onSuccess,
}: CopyDayScheduleDialogProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isPending, startTransition] = useTransition();
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);

  const availableDays = ALL_DAYS.filter((d) => d.id !== fromDay);

  const toggleDay = (dayId: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    );
  };

  const selectAll = () => {
    setSelectedDays(availableDays.map((d) => d.id));
  };

  const selectWeekdays = () => {
    setSelectedDays(
      availableDays
        .filter((d) => d.id !== 'Friday')
        .map((d) => d.id),
    );
  };

  const clearAll = () => {
    setSelectedDays([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      toast.error(
        isBn
          ? 'অনুগ্রহ করে অন্তত একটি দিন নির্বাচন করুন'
          : 'Please select at least one target day',
      );
      return;
    }

    startTransition(async () => {
      const res = await copyDayScheduleAction(fromDay, selectedDays);

      if (!res.success) {
        toast.error(res.error || (isBn ? 'শিডিউল কপি ব্যর্থ হয়েছে' : 'Failed to copy schedule'));
        return;
      }

      toast.success(
        isBn
          ? `${fromDay}-এর শিডিউল সফলভাবে ${selectedDays.length}টি দিনে কপি করা হয়েছে!`
          : `Schedule from ${fromDay} copied to ${selectedDays.length} days successfully!`,
      );

      setSelectedDays([]);
      onOpenChange(false);
      onSuccess?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                {isBn ? 'শিডিউল অন্য দিনে কপি করুন' : 'Copy Day Schedule'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                {isBn
                  ? `${fromDay}-এর সব ২৪ ঘণ্টার ক্যাপাসিটি অন্য দিনে এক ক্লিকে প্রয়োগ করুন`
                  : `Apply ${fromDay}'s 24-hour capacity settings to selected days`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
            >
              {isBn ? 'সব দিন নির্বাচন' : 'Select All Days'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectWeekdays}
              className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
            >
              {isBn ? 'শুক্রবার বাদে বাকি দিন' : 'All Except Friday'}
            </Button>
            {selectedDays.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                {isBn ? 'মুছে ফেলুন' : 'Clear'}
              </Button>
            )}
          </div>

          {/* Days Checkbox Grid */}
          <div className="space-y-2 max-h-[220px] overflow-y-auto p-1">
            {availableDays.map((d) => {
              const isChecked = selectedDays.includes(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => toggleDay(d.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'border-emerald-500/60 bg-emerald-500/5 text-foreground'
                      : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={isChecked}
                      onChange={() => toggleDay(d.id)}
                    />
                    <Label className="text-xs sm:text-sm font-semibold cursor-pointer">
                      {isBn ? d.labelBn : d.labelEn}
                    </Label>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {d.id === 'Friday' ? (isBn ? 'ছুটির দিন' : 'Weekend') : (isBn ? 'কর্মদিবস' : 'Weekday')}
                  </span>
                </div>
              );
            })}
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
              disabled={isPending || selectedDays.length === 0}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isBn ? `কপি করুন (${selectedDays.length})` : `Copy to ${selectedDays.length} Days`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
