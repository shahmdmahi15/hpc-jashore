// apps/web/components/therapy/TherapySlotBookingView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Trash2,
  Edit2,
  Activity,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  getTherapySlotAvailabilityAction,
  listTherapyBookingsAction,
  updateTherapyBookingAction,
  deleteTherapyBookingAction,
  type DayOfWeek,
  type SlotHour,
  type TherapyBookingStatus,
  type TherapySlotAvailabilityItem,
  type TherapySlotAvailabilityResult,
  type TherapySlotBookingRecord,
} from '../../lib/actions/therapy-slots';
import { BookTherapySlotDialog } from './BookTherapySlotDialog';

const DAYS_BN: Record<DayOfWeek, string> = {
  Saturday: 'শনিবার',
  Sunday: 'রবিবার',
  Monday: 'সোমবার',
  Tuesday: 'মঙ্গলবার',
  Wednesday: 'বুধবার',
  Thursday: 'বৃহস্পতিবার',
  Friday: 'শুক্রবার',
};

const STATUS_CONFIG: Record<
  TherapyBookingStatus,
  { labelEn: string; labelBn: string; badgeClass: string; dotColor: string }
> = {
  booked: {
    labelEn: 'Booked',
    labelBn: 'বুক করা',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dotColor: 'bg-blue-500',
  },
  confirmed: {
    labelEn: 'Confirmed',
    labelBn: 'নিশ্চিত',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dotColor: 'bg-emerald-500',
  },
  attended: {
    labelEn: 'Attended',
    labelBn: 'উপস্থিত / চলমান',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    dotColor: 'bg-purple-500',
  },
  completed: {
    labelEn: 'Completed',
    labelBn: 'সম্পন্ন',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
    dotColor: 'bg-slate-500',
  },
  cancelled: {
    labelEn: 'Cancelled',
    labelBn: 'বাতিল',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    dotColor: 'bg-rose-500',
  },
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toISOString().split('T')[0];
  } catch {
    return '—';
  }
}

export function TherapySlotBookingView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Data states
  const [availabilityData, setAvailabilityData] = useState<TherapySlotAvailabilityResult | null>(null);
  const [bookings, setBookings] = useState<TherapySlotBookingRecord[]>([]);
  const [bookingStats, setBookingStats] = useState({
    total: 0,
    booked: 0,
    confirmed: 0,
    attended: 0,
    completed: 0,
    cancelled: 0,
  });

  const [isPending, startTransition] = useTransition();
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [modalSlotHour, setModalSlotHour] = useState<SlotHour | undefined>(undefined);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load availability and bookings
  const loadData = useCallback(() => {
    startTransition(async () => {
      // 1. Fetch Availability
      const availRes = await getTherapySlotAvailabilityAction(selectedDate);
      if (availRes.success && availRes.data) {
        setAvailabilityData(availRes.data);
      }

      // 2. Fetch Bookings
      const bookRes = await listTherapyBookingsAction({
        date: selectedDate,
        status: statusFilter,
        slotHour: slotFilter,
        query: debouncedQuery,
        page: 1,
        limit: 100,
      });

      if (bookRes.success && bookRes.data) {
        setBookings(bookRes.data.items || []);
        setBookingStats(
          bookRes.data.stats || {
            total: 0,
            booked: 0,
            confirmed: 0,
            attended: 0,
            completed: 0,
            cancelled: 0,
          },
        );
      }
    });
  }, [selectedDate, statusFilter, slotFilter, debouncedQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick status update handler
  const handleStatusChange = async (id: string, newStatus: TherapyBookingStatus) => {
    setActionInProgressId(id);
    try {
      const res = await updateTherapyBookingAction(id, { status: newStatus });
      if (res.success) {
        toast.success(
          isBn
            ? `বুকিং স্ট্যাটাস পরিবর্তন করা হয়েছে: ${STATUS_CONFIG[newStatus].labelBn}`
            : `Booking marked as ${STATUS_CONFIG[newStatus].labelEn}`,
        );
        loadData();
      } else {
        toast.error(res.error || (isBn ? 'স্ট্যাটাস আপডেট ব্যর্থ' : 'Failed to update status'));
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  // Quick cancel handler
  const handleCancelBooking = async (id: string) => {
    if (!confirm(isBn ? 'আপনি কি নিশ্চিত যে এই থেরাপি বুকিংটি বাতিল করতে চান?' : 'Are you sure you want to cancel this booking?')) {
      return;
    }

    setActionInProgressId(id);
    try {
      const res = await deleteTherapyBookingAction(id);
      if (res.success) {
        toast.success(isBn ? 'বুকিং বাতিল করা হয়েছে' : 'Booking cancelled successfully');
        loadData();
      } else {
        toast.error(res.error || (isBn ? 'বাতিল করতে ব্যর্থ' : 'Failed to cancel'));
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  // Generate date chips for quick navigation (Today, Tomorrow, +2d, +3d, +4d, +5d)
  const dateChips = React.useMemo(() => {
    const list: Array<{ date: string; label: string; isToday: boolean }> = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      let label = '';
      if (i === 0) label = isBn ? 'আজ' : 'Today';
      else if (i === 1) label = isBn ? 'আগামীকাল' : 'Tomorrow';
      else {
        const dayName = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ][d.getDay()] as DayOfWeek;
        label = isBn ? DAYS_BN[dayName] : dayName.slice(0, 3);
      }
      list.push({ date: iso, label, isToday: i === 0 });
    }
    return list;
  }, [isBn]);

  const activeSlots = availabilityData?.slots.filter((s) => s.isActive === 1) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{isBn ? 'থেরাপি স্লট ও শিডিউলিং' : 'Therapy Slot Booking'}</span>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {isBn
                    ? availabilityData?.dayOfWeek
                      ? DAYS_BN[availabilityData.dayOfWeek]
                      : ''
                    : availabilityData?.dayOfWeek || ''}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? 'লাইভ থেরাপি হলের ক্যাপাসিটি, জেন্ডার-ওয়াইজ কোটা ও রোগীর বুকিং ব্যবস্থাপনা।'
                  : 'Live hall capacity, gender quotas, and patient therapy booking operations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="p-1 rounded-xl bg-muted/60 border border-border/60 flex items-center">
            <Button
              type="button"
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className={`h-8 px-2.5 text-xs rounded-lg ${
                viewMode === 'timeline'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1" />
              <span>{isBn ? 'স্লট গ্রিড' : 'Slots'}</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-8 px-2.5 text-xs rounded-lg ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 mr-1" />
              <span>{isBn ? 'তালিকা' : 'List'}</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isPending}
            className="h-10 px-3 text-xs rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>

          <Button
            type="button"
            onClick={() => {
              setModalSlotHour(undefined);
              setIsBookModalOpen(true);
            }}
            className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {isBn ? 'নতুন স্লট বুক করুন' : 'Book Therapy Slot'}
          </Button>
        </div>
      </div>

      {/* 2. Date Navigation Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {dateChips.map((chip) => {
            const isSelected = selectedDate === chip.date;
            return (
              <Button
                key={chip.date}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDate(chip.date)}
                className={`h-9 px-3 text-xs rounded-xl font-medium whitespace-nowrap cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{chip.label}</span>
                <span className="text-[10px] opacity-80 font-mono ml-1">
                  ({chip.date.slice(5)})
                </span>
              </Button>
            );
          })}
        </div>

        {/* Date Picker Input */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 w-40 text-xs font-mono cursor-pointer"
          />
        </div>
      </div>

      {/* 3. KPI / Capacity Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Booked */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'মোট বুকিং' : 'Total Booked'}
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {bookingStats.total}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Confirmed */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {isBn ? 'নিশ্চিত' : 'Confirmed'}
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                {bookingStats.confirmed}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Attended / Running */}
        <Card className="border-purple-500/30 bg-purple-500/5 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                {isBn ? 'উপস্থিত / চলমান' : 'Attended'}
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-300">
                {bookingStats.attended}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'সম্পন্ন' : 'Completed'}
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {bookingStats.completed}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600">
              <Check className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Day Capacity */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'হলের মোট আসন' : 'Hall Capacity'}
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {availabilityData?.stats.totalDayCapacity ?? 0}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Layers className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Hall Utilization */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'ব্যবহার হার' : 'Utilization'}
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {availabilityData?.stats.utilizationPercent ?? 0}%
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder={
              isBn
                ? 'রোগীর নাম, MRN, ফোন অথবা বুকিং নম্বর দিয়ে সার্চ করুন...'
                : 'Search by patient name, MRN, phone, or booking number...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-36 text-xs cursor-pointer">
              <SelectValue placeholder={isBn ? 'স্ট্যাটাস ফিল্টার' : 'Status Filter'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isBn ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
              <SelectItem value="booked">{isBn ? 'বুক করা' : 'Booked'}</SelectItem>
              <SelectItem value="confirmed">{isBn ? 'নিশ্চিত' : 'Confirmed'}</SelectItem>
              <SelectItem value="attended">{isBn ? 'উপস্থিত' : 'Attended'}</SelectItem>
              <SelectItem value="completed">{isBn ? 'সম্পন্ন' : 'Completed'}</SelectItem>
              <SelectItem value="cancelled">{isBn ? 'বাতিল' : 'Cancelled'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. Main Content: Timeline View or Table View */}
      {viewMode === 'timeline' ? (
        /* Timeline / Slot Cards View */
        <div className="space-y-4">
          {activeSlots.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-sm text-foreground">
                {isBn ? 'এই দিনে কোনো সক্রিয় স্লট পাওয়া যায়নি' : 'No active therapy slots for this day'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {isBn
                  ? 'অ্যাডমিন প্যানেলের "Therapy Slot Config" ট্যাব থেকে এই দিনের স্লট চালু করুন।'
                  : 'Activate slot hours for this day in the Admin "Therapy Slot Config" tab.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeSlots.map((slot) => {
                const slotBookings = bookings.filter((b) => b.slotHour === slot.slotHour);
                const maleBookings = slotBookings.filter((b) => b.patientGender === 'male');
                const femaleBookings = slotBookings.filter((b) => b.patientGender === 'female');

                const maleTotalCap = slot.maleRegularCapacity + slot.maleExtraCapacity;
                const femaleTotalCap = slot.femaleRegularCapacity + slot.femaleExtraCapacity;

                const malePercent =
                  maleTotalCap > 0 ? Math.round((slot.maleRegularBooked + slot.maleExtraBooked) / maleTotalCap * 100) : 0;
                const femalePercent =
                  femaleTotalCap > 0 ? Math.round((slot.femaleRegularBooked + slot.femaleExtraBooked) / femaleTotalCap * 100) : 0;

                return (
                  <Card
                    key={slot.id}
                    className={`border transition-all overflow-hidden shadow-xs hover:border-border/90 ${
                      slot.isSlotFull
                        ? 'border-rose-500/30 bg-rose-500/[0.02]'
                        : 'border-border/70 hover:shadow-md'
                    }`}
                  >
                    {/* Slot Header */}
                    <CardHeader className="p-3.5 pb-2.5 bg-muted/30 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-xs sm:text-sm text-foreground">
                              {slot.slotHour}
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant={slot.isSlotFull ? 'destructive' : 'outline'}
                          className={`text-[10px] font-semibold ${
                            slot.isSlotFull
                              ? ''
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {slot.isSlotFull
                            ? isBn
                              ? 'পূর্ণ'
                              : 'Full'
                            : `${slot.totalSlotBooked}/${slot.totalSlotCapacity}`}
                        </Badge>
                      </div>

                      {/* Male / Female Capacity Progress Bars */}
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40">
                        {/* Male Capacity */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                              <span>♂</span> {isBn ? 'পুরুষ' : 'Male'}
                            </span>
                            <span className="font-mono text-muted-foreground text-[10px]">
                              {slot.maleRegularBooked + slot.maleExtraBooked}/{maleTotalCap}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-blue-500/10 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, malePercent)}%` }}
                            />
                          </div>
                        </div>

                        {/* Female Capacity */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                              <span>♀</span> {isBn ? 'মহিলা' : 'Female'}
                            </span>
                            <span className="font-mono text-muted-foreground text-[10px]">
                              {slot.femaleRegularBooked + slot.femaleExtraBooked}/{femaleTotalCap}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-rose-500/10 overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, femalePercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Slot Body: Booked Patients */}
                    <CardContent className="p-3 space-y-2 max-h-64 overflow-y-auto">
                      {slotBookings.length === 0 ? (
                        <div className="py-6 text-center text-muted-foreground">
                          <p className="text-xs">{isBn ? 'এখনও কোনো বুকিং নেই' : 'No patients booked yet'}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setModalSlotHour(slot.slotHour);
                              setIsBookModalOpen(true);
                            }}
                            className="mt-1 h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {isBn ? 'রোগী বুক করুন' : 'Book Patient'}
                          </Button>
                        </div>
                      ) : (
                        slotBookings.map((b) => {
                          const stCfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.booked;
                          return (
                            <div
                              key={b.id}
                              className="p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                    {isBn && b.patient.nameBn ? b.patient.nameBn : b.patient.nameEn}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      b.patientGender === 'male'
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {b.patientGender === 'male' ? '♂' : '♀'}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {b.patient.mrn}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  {b.toldTime && (
                                    <span className="inline-flex items-center gap-0.5 font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                      <Clock className="w-2.5 h-2.5" />
                                      {b.toldTime}
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${stCfg.badgeClass}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />
                                    <span>{isBn ? stCfg.labelBn : stCfg.labelEn}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Quick Actions Dropdown */}
                              <div className="flex items-center gap-1 shrink-0">
                                {b.status === 'booked' && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(b.id, 'confirmed')}
                                    disabled={actionInProgressId === b.id}
                                    className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg cursor-pointer"
                                    title={isBn ? 'নিশ্চিত করুন' : 'Confirm'}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                )}

                                {b.status !== 'attended' && b.status !== 'completed' && b.status !== 'cancelled' && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStatusChange(b.id, 'attended')}
                                    disabled={actionInProgressId === b.id}
                                    className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg cursor-pointer"
                                    title={isBn ? 'উপস্থিত চিহ্নিত করুন' : 'Mark Attended'}
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-muted-foreground rounded-lg cursor-pointer"
                                    >
                                      •••
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuLabel className="text-xs">
                                      {isBn ? 'স্ট্যাটাস পরিবর্তন' : 'Change Status'}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {(['booked', 'confirmed', 'attended', 'completed'] as TherapyBookingStatus[]).map(
                                      (st) => (
                                        <DropdownMenuItem
                                          key={st}
                                          onClick={() => handleStatusChange(b.id, st)}
                                          className="text-xs cursor-pointer"
                                        >
                                          <span className={`w-2 h-2 rounded-full mr-2 ${STATUS_CONFIG[st].dotColor}`} />
                                          <span>{isBn ? STATUS_CONFIG[st].labelBn : STATUS_CONFIG[st].labelEn}</span>
                                        </DropdownMenuItem>
                                      ),
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleCancelBooking(b.id)}
                                      className="text-xs text-rose-600 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      <span>{isBn ? 'বুকিং বাতিল করুন' : 'Cancel Booking'}</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>

                    {/* Slot Card Footer: Quick + Book Patient */}
                    {!slot.isSlotFull && (
                      <div className="px-3.5 py-2 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {isBn ? 'খালি:' : 'Left:'}{' '}
                          <span className="font-semibold text-emerald-600">
                            {slot.totalSlotAvailable}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setModalSlotHour(slot.slotHour);
                            setIsBookModalOpen(true);
                          }}
                          className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {isBn ? 'বুক করুন' : '+ Book'}
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tabular View */
        <Card className="border-border/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'বুকিং নম্বর' : 'Booking #'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'রোগীর নাম ও MRN' : 'Patient & MRN'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'জেন্ডার' : 'Gender'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'স্লটের সময়' : 'Slot Hour'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'রোগীকে বলা সময়' : 'Told Time'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'বর্তমান অবস্থা' : 'Status'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider max-w-[200px]">
                    {isBn ? 'নোট' : 'Notes'}
                  </TableHead>
                  <TableHead className="w-[110px] text-right font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'একশন' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                      {isBn ? 'এই তারিখে কোনো বুকিং নেই' : 'No therapy bookings found for this date'}
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => {
                    const stCfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.booked;
                    return (
                      <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-bold text-xs text-foreground">
                          {b.bookingNumber}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-xs sm:text-sm text-foreground block">
                              {isBn && b.patient.nameBn ? b.patient.nameBn : b.patient.nameEn}
                            </span>
                            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                              {b.patient.mrn} • {b.patient.phone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold ${
                              b.patientGender === 'male'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {b.patientGender === 'male' ? (isBn ? 'পুরুষ' : 'Male') : (isBn ? 'মহিলা' : 'Female')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {b.slotHour}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {b.toldTime || '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${stCfg.badgeClass}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${stCfg.dotColor}`} />
                            <span>{isBn ? stCfg.labelBn : stCfg.labelEn}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {b.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs rounded-lg cursor-pointer"
                                >
                                  •••
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuLabel className="text-xs">
                                  {isBn ? 'স্ট্যাটাস পরিবর্তন' : 'Change Status'}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(
                                  [
                                    'booked',
                                    'confirmed',
                                    'attended',
                                    'completed',
                                  ] as TherapyBookingStatus[]
                                ).map((st) => (
                                  <DropdownMenuItem
                                    key={st}
                                    onClick={() => handleStatusChange(b.id, st)}
                                    className="text-xs cursor-pointer"
                                  >
                                    <span className={`w-2 h-2 rounded-full mr-2 ${STATUS_CONFIG[st].dotColor}`} />
                                    <span>{isBn ? STATUS_CONFIG[st].labelBn : STATUS_CONFIG[st].labelEn}</span>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="text-xs text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  <span>{isBn ? 'বাতিল করুন' : 'Cancel Booking'}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Embedded Book Therapy Slot Modal */}
      <BookTherapySlotDialog
        open={isBookModalOpen}
        onOpenChange={setIsBookModalOpen}
        initialDate={selectedDate}
        initialSlotHour={modalSlotHour}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
