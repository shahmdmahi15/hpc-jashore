// apps/web/components/admin/TherapySlotConfigView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Sliders,
  Clock,
  Users,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Edit2,
  Calendar,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  Check,
  Zap,
  ShieldAlert,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Switch } from '../ui/switch';
import { useRealtime } from '../../lib/use-realtime';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  listTherapySlotsAction,
  updateTherapySlotAction,
  type DayOfWeek,
  type TherapySlotRecord,
  type TherapySlotStats,
} from '../../lib/actions/therapy-slots';
import { EditTherapySlotDialog } from './EditTherapySlotDialog';
import { CopyDayScheduleDialog } from './CopyDayScheduleDialog';

const DAYS_LIST: Array<{ id: DayOfWeek; labelEn: string; labelBn: string; shortEn: string; shortBn: string }> = [
  { id: 'Saturday', labelEn: 'Saturday', labelBn: 'শনিবার', shortEn: 'SAT', shortBn: 'শনি' },
  { id: 'Sunday', labelEn: 'Sunday', labelBn: 'রবিবার', shortEn: 'SUN', shortBn: 'রবি' },
  { id: 'Monday', labelEn: 'Monday', labelBn: 'সোমবার', shortEn: 'MON', shortBn: 'সোম' },
  { id: 'Tuesday', labelEn: 'Tuesday', labelBn: 'মঙ্গলবার', shortEn: 'TUE', shortBn: 'মঙ্গল' },
  { id: 'Wednesday', labelEn: 'Wednesday', labelBn: 'বুধবার', shortEn: 'WED', shortBn: 'বুধ' },
  { id: 'Thursday', labelEn: 'Thursday', labelBn: 'বৃহস্পতিবার', shortEn: 'THU', shortBn: 'বৃহঃ' },
  { id: 'Friday', labelEn: 'Friday', labelBn: 'শুক্রবার', shortEn: 'FRI', shortBn: 'শুক্র' },
];

export function TherapySlotConfigView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Saturday');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [slots, setSlots] = useState<TherapySlotRecord[]>([]);
  const [stats, setStats] = useState<TherapySlotStats>({
    totalSlots: 0,
    activeSlots: 0,
    totalMaleRegularCapacity: 0,
    totalFemaleRegularCapacity: 0,
    totalMaleExtraCapacity: 0,
    totalFemaleExtraCapacity: 0,
    totalRegularCapacity: 0,
    totalExtraCapacity: 0,
    grandTotalCapacity: 0,
  });
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [editingSlot, setEditingSlot] = useState<TherapySlotRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);

  const fetchSlots = useCallback(() => {
    startTransition(async () => {
      const res = await listTherapySlotsAction({ day: selectedDay });
      if (res.success && res.data) {
        setSlots(res.data.items);
        setStats(res.data.stats);
      } else {
        toast.error(res.error || (isBn ? 'স্লট লোড করতে সমস্যা হয়েছে' : 'Failed to load slots'));
      }
    });
  }, [selectedDay, isBn]);

  useRealtime((event) => {
    if (event.type.startsWith('therapy.')) {
      fetchSlots();
    }
  });

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Quick 1-click active/inactive toggle
  const handleToggleActive = async (slot: TherapySlotRecord) => {
    const newActive = slot.isActive === 1 ? 0 : 1;
    const res = await updateTherapySlotAction(slot.id, { isActive: newActive });
    if (res.success && res.data) {
      toast.success(
        isBn
          ? `স্লট ${slot.slotHour} ${newActive === 1 ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`
          : `Slot ${slot.slotHour} set to ${newActive === 1 ? 'Active' : 'Closed'}`,
      );
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, isActive: newActive } : s)),
      );
      fetchSlots();
    } else {
      toast.error(res.error || (isBn ? 'স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে' : 'Failed to toggle status'));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Launchpad */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border/60 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Sliders className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isBn ? 'থেরাপি স্লট ও ক্যাপাসিটি সেটিংস' : 'Therapy Slot Capacity & Timetable'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isBn
                  ? '২৪ ঘণ্টার প্রতিটি স্লটে পুরুষ ও মহিলা রোগীর রেগুলার ও এক্সট্রা বাফার ক্যাপাসিটি নির্ধারণ'
                  : 'Configure 24-hour hourly slot capacities for male and female patients, regular quotas, and buffer limits'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSlots}
            disabled={isPending}
            className="h-10 px-3.5 rounded-xl border-border/60 text-xs sm:text-sm font-medium hover:bg-muted/80 cursor-pointer touch-manipulation active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>

          <Button
            onClick={() => setIsCopyOpen(true)}
            size="sm"
            className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all cursor-pointer touch-manipulation active:scale-95"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            {isBn ? 'অন্য দিনে কপি করুন' : 'Copy Schedule to Other Days'}
          </Button>
        </div>
      </div>

      {/* Day Selector Ribbon */}
      <div className="bg-card border border-border/60 rounded-2xl p-2 sm:p-3 shadow-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {DAYS_LIST.map((day) => {
            const isSelected = selectedDay === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                className={`flex-1 min-w-[90px] sm:min-w-[120px] py-2.5 sm:py-3 px-3 rounded-xl text-center transition-all cursor-pointer touch-manipulation ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm font-bold'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-medium border border-border/40'
                }`}
              >
                <p className="text-xs sm:text-sm tracking-tight">
                  {isBn ? day.labelBn : day.labelEn}
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? 'bg-teal-700/80 text-teal-100'
                      : 'bg-muted text-muted-foreground/80'
                  }`}
                >
                  {day.id === 'Friday' ? (isBn ? 'ছুটি' : 'Weekend') : (isBn ? 'খোলা' : 'Open')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Ribbon for Selected Day */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Active Operational Slots */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'সক্রিয় স্লট সংখ্যা' : 'Active Slots'}
              </p>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {stats.activeSlots}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">/ 24</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Male Regular Capacity */}
        <Card className="border-blue-200/60 dark:border-blue-900/40 bg-blue-500/5 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {isBn ? 'পুরুষ রেগুলার' : 'Male Regular'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
                {stats.totalMaleRegularCapacity}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Female Regular Capacity */}
        <Card className="border-pink-200/60 dark:border-pink-900/40 bg-pink-500/5 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-pink-700 dark:text-pink-400 uppercase tracking-wider">
                {isBn ? 'মহিলা রেগুলার' : 'Female Regular'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-pink-700 dark:text-pink-300">
                {stats.totalFemaleRegularCapacity}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Extra Emergency Buffer */}
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-amber-500/5 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                {isBn ? 'জরুরি এক্সট্রা বাফার' : 'Extra Buffer'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
                {stats.totalExtraCapacity}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Max Daily Footfall */}
        <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-500/5 shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {isBn ? 'সর্বমোট দৈনিক ধারণক্ষমতা' : 'Max Daily Capacity'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                {stats.grandTotalCapacity}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Switcher Bar */}
      <div className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {isBn ? `${selectedDay}-এর ২৪ ঘণ্টার স্লট তালিকা` : `24-Hour Slots for ${selectedDay}`}
          </span>
          <Badge variant="outline" className="text-[10px] font-mono">
            {slots.length} {isBn ? 'টি স্লট' : 'Slots'}
          </Badge>
        </div>

        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-background text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={isBn ? 'কার্ড গ্রিড ভিউ' : 'Card Grid View'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-background text-teal-600 dark:text-teal-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={isBn ? 'টেবিল ভিউ' : 'Table View'}
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content: Grid or Table */}
      {isPending && slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border/60 rounded-2xl min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {isBn ? 'থেরাপি স্লট লোড হচ্ছে...' : 'Loading therapy slots...'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {slots.map((slot) => {
            const isActive = slot.isActive === 1;
            const regTotal = slot.slotMaleRegularCapacity + slot.slotFemaleRegularCapacity;
            const extraTotal = slot.slotMaleExtraCapacity + slot.slotFemaleExtraCapacity;
            const maxTotal = regTotal + extraTotal;

            return (
              <Card
                key={slot.id}
                className={`group border transition-all duration-200 flex flex-col justify-between overflow-hidden bg-card ${
                  isActive
                    ? 'border-border/70 hover:border-teal-500/50 hover:shadow-md'
                    : 'border-border/40 opacity-70 bg-muted/20'
                }`}
              >
                <div>
                  {/* Slot Header Banner */}
                  <div className="p-3.5 pb-2.5 border-b border-border/40 flex items-center justify-between gap-2 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span className="font-mono font-bold text-xs sm:text-sm tracking-tight text-foreground">
                        {slot.slotHour}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800'
                      }`}
                    >
                      {isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'বন্ধ' : 'Closed')}
                    </span>
                  </div>

                  {/* Slot Capacities */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Male Regular */}
                      <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-200/50 dark:border-blue-900/30">
                        <span className="text-[10px] font-semibold text-blue-600 block">
                          {isBn ? '👨 পুরুষ রেগুলার' : '👨 Male Reg'}
                        </span>
                        <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
                          {slot.slotMaleRegularCapacity}
                        </span>
                      </div>

                      {/* Female Regular */}
                      <div className="p-2 rounded-lg bg-pink-500/5 border border-pink-200/50 dark:border-pink-900/30">
                        <span className="text-[10px] font-semibold text-pink-600 block">
                          {isBn ? '👩 মহিলা রেগুলার' : '👩 Female Reg'}
                        </span>
                        <span className="text-base font-bold font-mono text-pink-700 dark:text-pink-300">
                          {slot.slotFemaleRegularCapacity}
                        </span>
                      </div>

                      {/* Male Extra */}
                      <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-200/50 dark:border-amber-900/30">
                        <span className="text-[10px] font-semibold text-amber-600 block">
                          {isBn ? '⚡ পুরুষ এক্সট্রা' : '⚡ Male Buffer'}
                        </span>
                        <span className="text-base font-bold font-mono text-amber-700 dark:text-amber-300">
                          {slot.slotMaleExtraCapacity}
                        </span>
                      </div>

                      {/* Female Extra */}
                      <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-200/50 dark:border-rose-900/30">
                        <span className="text-[10px] font-semibold text-rose-600 block">
                          {isBn ? '⚡ মহিলা এক্সট্রা' : '⚡ Female Buffer'}
                        </span>
                        <span className="text-base font-bold font-mono text-rose-700 dark:text-rose-300">
                          {slot.slotFemaleExtraCapacity}
                        </span>
                      </div>
                    </div>

                    {/* Total capacity bar */}
                    <div className="pt-1 flex items-center justify-between text-xs border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {isBn ? 'মোট ধারণক্ষমতা:' : 'Max Total Capacity:'}
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {maxTotal} {isBn ? 'জন' : 'pts'}
                      </span>
                    </div>

                    {slot.notes && (
                      <p className="text-[11px] text-muted-foreground italic truncate">
                        {slot.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-3.5 py-2.5 bg-muted/30 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleActive(slot)}
                      className="scale-75 origin-left"
                    />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {isActive ? (isBn ? 'চালু' : 'On') : (isBn ? 'বন্ধ' : 'Off')}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingSlot(slot);
                      setIsEditOpen(true);
                    }}
                    className="h-8 px-2.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1 text-teal-600" />
                    {isBn ? 'কনফিগার' : 'Configure'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Tabular View */
        <Card className="border-border/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[180px] font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'স্লট সময়' : 'Slot Hour'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'অবস্থা' : 'Status'}
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'পুরুষ রেগুলার' : 'Male Reg'}
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'মহিলা রেগুলার' : 'Female Reg'}
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'পুরুষ এক্সট্রা' : 'Male Extra'}
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'মহিলা এক্সট্রা' : 'Female Extra'}
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'সর্বমোট' : 'Grand Total'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider max-w-[180px]">
                    {isBn ? 'নোট' : 'Notes'}
                  </TableHead>
                  <TableHead className="w-[100px] text-right font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'একশন' : 'Action'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => {
                  const isActive = slot.isActive === 1;
                  const regTotal = slot.slotMaleRegularCapacity + slot.slotFemaleRegularCapacity;
                  const extraTotal = slot.slotMaleExtraCapacity + slot.slotFemaleExtraCapacity;
                  const grandTotal = regTotal + extraTotal;

                  return (
                    <TableRow key={slot.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-foreground">
                        {slot.slotHour}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(slot)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{isActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'বন্ধ' : 'Closed')}</span>
                        </button>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-blue-600">
                        {slot.slotMaleRegularCapacity}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-pink-600">
                        {slot.slotFemaleRegularCapacity}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-amber-600">
                        {slot.slotMaleExtraCapacity}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-rose-600">
                        {slot.slotFemaleExtraCapacity}
                      </TableCell>
                      <TableCell className="text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {grandTotal}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {slot.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSlot(slot);
                            setIsEditOpen(true);
                          }}
                          className="h-8 px-2 text-xs rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <EditTherapySlotDialog
        slot={editingSlot}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingSlot(null);
        }}
        onSuccess={() => {
          fetchSlots();
        }}
      />

      <CopyDayScheduleDialog
        fromDay={selectedDay}
        open={isCopyOpen}
        onOpenChange={setIsCopyOpen}
        onSuccess={() => {
          fetchSlots();
        }}
      />
    </div>
  );
}
