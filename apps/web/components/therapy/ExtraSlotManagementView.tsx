// apps/web/components/therapy/ExtraSlotManagementView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  RotateCcw,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
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
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  deleteTherapyBookingAction,
  restoreTherapyBookingAction,
  getTherapySlotAvailabilityAction,
  listTherapyBookingsAction,
  type DayOfWeek,
  type SlotHour,
  type TherapyBookingStatus,
  type TherapySlotAvailabilityItem,
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

function getDayOfWeek(dateStr: string): DayOfWeek {
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayIndex = d.getUTCDay();
  const DAYS: DayOfWeek[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return DAYS[dayIndex] || 'Sunday';
}

function toBnNum(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
}

export function ExtraSlotManagementView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [subView, setSubView] = useState<'hourly' | 'patients'>('hourly');

  // Availability & Bookings state
  const [availabilitySlots, setAvailabilitySlots] = useState<TherapySlotAvailabilityItem[]>([]);
  const [extraBookings, setExtraBookings] = useState<TherapySlotBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Book Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [modalSlotHour, setModalSlotHour] = useState<SlotHour | undefined>(undefined);

  // Load Extra Slot Data
  const loadData = useCallback(async () => {
    if (!selectedDate) return;
    setIsLoading(true);

    try {
      const [availRes, bookingsRes] = await Promise.all([
        getTherapySlotAvailabilityAction(selectedDate),
        listTherapyBookingsAction({
          date: selectedDate,
          capacityType: 'extra',
          limit: 100,
        }),
      ]);

      if (availRes.success && availRes.data) {
        setAvailabilitySlots(availRes.data.slots || []);
      } else {
        toast.error(availRes.error || (isBn ? 'স্লটের প্রাপ্যতা লোড করতে ব্যর্থ' : 'Failed to load slot availability'));
      }

      if (bookingsRes.success && bookingsRes.data) {
        setExtraBookings(bookingsRes.data.items || []);
      } else {
        toast.error(bookingsRes.error || (isBn ? 'অতিরিক্ত বুকিং তালিকা লোড করতে ব্যর্থ' : 'Failed to load extra bookings'));
      }
    } catch (err: any) {
      toast.error(err?.message || (isBn ? 'তথ্য লোড করতে সমস্যা হয়েছে' : 'Failed to load extra slot data'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, isBn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Date Navigation
  const handleDateShift = (days: number) => {
    const parts = selectedDate.split('-');
    const cur = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    cur.setDate(cur.getDate() + days);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Handle Cancel Booking - ONE single button action
  const handleCancelBooking = (bookingId: string) => {
    if (!confirm(isBn ? 'আপনি কি নিশ্চিত যে এই অতিরিক্ত স্লট বুকিং বাতিল করতে চান?' : 'Are you sure you want to cancel this extra slot booking?')) {
      return;
    }

    setActionInProgressId(bookingId);
    startTransition(async () => {
      try {
        const res = await deleteTherapyBookingAction(bookingId);
        if (res.success) {
          toast.success(isBn ? 'অতিরিক্ত স্লট বুকিং বাতিল করা হয়েছে' : 'Extra slot booking cancelled');
          loadData();
        } else {
          toast.error(res.error || (isBn ? 'বাতিল করতে ব্যর্থ' : 'Failed to cancel'));
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error cancelling booking');
      } finally {
        setActionInProgressId(null);
      }
    });
  };

  // Handle Restore Booking
  const handleRestoreBooking = (bookingId: string) => {
    setActionInProgressId(bookingId);
    startTransition(async () => {
      try {
        const res = await restoreTherapyBookingAction(bookingId);
        if (res.success) {
          toast.success(isBn ? 'অতিরিক্ত স্লট বুকিং পুনরুদ্ধার করা হয়েছে' : 'Extra slot booking restored');
          loadData();
        } else {
          toast.error(res.error || (isBn ? 'পুনরুদ্ধার ব্যর্থ' : 'Failed to restore'));
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error restoring booking');
      } finally {
        setActionInProgressId(null);
      }
    });
  };

  // Aggregate Extra Capacity Metrics
  const activeSlots = availabilitySlots.filter((s) => s.isActive);
  const totalMaleExtraCapacity = activeSlots.reduce((acc, s) => acc + s.maleExtraCapacity, 0);
  const totalFemaleExtraCapacity = activeSlots.reduce((acc, s) => acc + s.femaleExtraCapacity, 0);
  const totalExtraCapacity = totalMaleExtraCapacity + totalFemaleExtraCapacity;

  const totalMaleExtraBooked = activeSlots.reduce((acc, s) => acc + s.maleExtraBooked, 0);
  const totalFemaleExtraBooked = activeSlots.reduce((acc, s) => acc + s.femaleExtraBooked, 0);
  const totalExtraBooked = totalMaleExtraBooked + totalFemaleExtraBooked;

  const remainingMaleExtra = Math.max(0, totalMaleExtraCapacity - totalMaleExtraBooked);
  const remainingFemaleExtra = Math.max(0, totalFemaleExtraCapacity - totalFemaleExtraBooked);
  const remainingTotalExtra = Math.max(0, totalExtraCapacity - totalExtraBooked);

  // Filtered Bookings for search & gender
  const filteredBookings = extraBookings.filter((b) => {
    if (genderFilter !== 'all' && b.patientGender !== genderFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchNameEn = b.patient.nameEn?.toLowerCase().includes(q);
      const matchNameBn = b.patient.nameBn?.toLowerCase().includes(q);
      const matchMrn = b.patient.mrn?.toLowerCase().includes(q);
      const matchPhone = b.patient.phone?.toLowerCase().includes(q);
      const matchNum = b.bookingNumber?.toLowerCase().includes(q);
      if (!matchNameEn && !matchNameBn && !matchMrn && !matchPhone && !matchNum) return false;
    }
    return true;
  });

  const currentDayOfWeek = selectedDate ? getDayOfWeek(selectedDate) : 'Sunday';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card border border-border/60 p-3.5 sm:p-5 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{isBn ? 'অতিরিক্ত স্লট ব্যবস্থাপনা' : 'Extra Slot Management'}</span>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] sm:text-xs"
                >
                  {isBn ? 'ওভারবুকিং কোটা' : 'Emergency & Overbooking'}
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? 'জরুরি ও বিশেষ রোগীদের জন্য অতিরিক্ত স্লট বরাদ্দ, কোটা পর্যবেক্ষণ এবং ওভারবুকিং শিডিউলিং।'
                  : 'Manage emergency extra quotas, overflow allocations, and dedicated extra slot scheduling.'}
              </p>
            </div>
          </div>
        </div>

        {/* Date Selector and Book Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Date Switcher */}
          <div className="flex items-center rounded-xl border border-border/80 bg-background p-1 shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDateShift(-1)}
              className="h-8 w-8 rounded-lg cursor-pointer hover:bg-muted"
              title={isBn ? 'আগের দিন' : 'Previous day'}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 border-none bg-transparent px-2 text-xs sm:text-sm font-semibold focus-visible:ring-0 shadow-none cursor-pointer"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDateShift(1)}
              className="h-8 w-8 rounded-lg cursor-pointer hover:bg-muted"
              title={isBn ? 'পরের দিন' : 'Next day'}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(todayStr)}
            className="h-9 px-2.5 text-xs rounded-xl cursor-pointer"
          >
            {isBn ? 'আজ' : 'Today'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={loadData}
            disabled={isLoading}
            className="h-9 w-9 rounded-xl cursor-pointer"
            title={isBn ? 'রিফ্রেশ' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </Button>

          {/* Primary Action: Book Extra Slot */}
          <Button
            type="button"
            onClick={() => {
              setModalSlotHour(undefined);
              setIsBookModalOpen(true);
            }}
            className="h-9 px-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? 'অতিরিক্ত স্লট বুক করুন' : 'Book Extra Slot'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Extra Capacity Quota Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Extra Capacity */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'মোট অতিরিক্ত কোটা' : 'Total Extra Quota'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isBn ? toBnNum(totalExtraCapacity) : totalExtraCapacity}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {isBn
                  ? `পুরুষ: ${toBnNum(totalMaleExtraCapacity)} • মহিলা: ${toBnNum(totalFemaleExtraCapacity)}`
                  : `M: ${totalMaleExtraCapacity} • F: ${totalFemaleExtraCapacity}`}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Booked Extra Slots */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'অতিরিক্ত বুকিং' : 'Extra Booked'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {isBn ? toBnNum(totalExtraBooked) : totalExtraBooked}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {isBn
                  ? `পুরুষ: ${toBnNum(totalMaleExtraBooked)} • মহিলা: ${toBnNum(totalFemaleExtraBooked)}`
                  : `M: ${totalMaleExtraBooked} • F: ${totalFemaleExtraBooked}`}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Remaining Male Extra */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <span className="text-blue-500">♂</span> {isBn ? 'পুরুষ খালি কোটা' : 'Male Extra Left'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {isBn ? toBnNum(remainingMaleExtra) : remainingMaleExtra}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {totalMaleExtraCapacity > 0
                  ? `${Math.round(((totalMaleExtraCapacity - remainingMaleExtra) / totalMaleExtraCapacity) * 100)}% ${isBn ? 'ব্যবহৃত' : 'booked'}`
                  : (isBn ? 'কোটা নেই' : 'No quota')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Remaining Female Extra */}
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <span className="text-rose-500">♀</span> {isBn ? 'মহিলা খালি কোটা' : 'Female Extra Left'}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {isBn ? toBnNum(remainingFemaleExtra) : remainingFemaleExtra}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {totalFemaleExtraCapacity > 0
                  ? `${Math.round(((totalFemaleExtraCapacity - remainingFemaleExtra) / totalFemaleExtraCapacity) * 100)}% ${isBn ? 'ব্যবহৃত' : 'booked'}`
                  : (isBn ? 'কোটা নেই' : 'No quota')}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Sub-View Switcher & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tabs value={subView} onValueChange={(v) => setSubView(v as 'hourly' | 'patients')} className="w-auto">
            <TabsList className="h-9 p-1 bg-muted/60 rounded-xl">
              <TabsTrigger
                value="hourly"
                className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-background cursor-pointer"
              >
                {isBn ? 'ঘণ্টাওয়ারী অতিরিক্ত কোটা' : 'Hourly Quotas'}
              </TabsTrigger>
              <TabsTrigger
                value="patients"
                className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-background cursor-pointer"
              >
                {isBn ? `বুকড রোগী (${toBnNum(filteredBookings.length)})` : `Booked Patients (${filteredBookings.length})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={genderFilter} onValueChange={(v: string) => setGenderFilter(v as 'all' | 'male' | 'female')}>
            <SelectTrigger className="h-9 w-28 sm:w-32 text-xs rounded-xl cursor-pointer">
              <SelectValue placeholder={isBn ? 'জেন্ডার' : 'Gender'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isBn ? 'সকল জেন্ডার' : 'All Genders'}</SelectItem>
              <SelectItem value="male">{isBn ? '♂ পুরুষ' : '♂ Male'}</SelectItem>
              <SelectItem value="female">{isBn ? '♀ মহিলা' : '♀ Female'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder={
              isBn
                ? 'রোগীর নাম, MRN, ফোন বা বুকিং নম্বর দিয়ে খুঁজুন...'
                : 'Search by patient name, MRN, phone, booking #...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>
      </div>

      {/* 4. Sub-View 1: Hourly Extra Quota Cards */}
      {subView === 'hourly' ? (
        <div className="space-y-4">
          {activeSlots.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-border/80">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
              <h3 className="font-bold text-sm text-foreground">
                {isBn ? 'এই দিনে কোনো সক্রিয় স্লট পাওয়া যায়নি' : 'No active therapy slots for this day'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {isBn
                  ? 'অ্যাডমিন প্যানেলের "Therapy Slot Config" ট্যাব থেকে এই দিনের স্লট কনফিগার করুন।'
                  : 'Configure slot hours for this day in the Admin "Therapy Slot Config" tab.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {activeSlots.map((slot) => {
                const malePct =
                  slot.maleExtraCapacity > 0
                    ? Math.round((slot.maleExtraBooked / slot.maleExtraCapacity) * 100)
                    : 0;
                const femalePct =
                  slot.femaleExtraCapacity > 0
                    ? Math.round((slot.femaleExtraBooked / slot.femaleExtraCapacity) * 100)
                    : 0;
                const totalExtraForSlot = slot.maleExtraCapacity + slot.femaleExtraCapacity;
                const totalBookedForSlot = slot.maleExtraBooked + slot.femaleExtraBooked;
                const slotHasExtra = slot.maleExtraRemaining > 0 || slot.femaleExtraRemaining > 0;

                return (
                  <Card
                    key={slot.slotHour}
                    className="border-border/60 hover:border-amber-500/40 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <CardHeader className="p-3.5 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {slot.slotHour}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            slotHasExtra
                              ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {slotHasExtra
                            ? (isBn ? 'কোটা খালি' : 'Quota Open')
                            : (isBn ? 'কোটা পূর্ণ' : 'Quota Full')}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 pt-1 space-y-3">
                      {/* Male Extra Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                            <span>♂</span> {isBn ? 'পুরুষ অতিরিক্ত' : 'Male Extra'}
                          </span>
                          <span className="font-mono text-muted-foreground text-[10px]">
                            {isBn
                              ? `${toBnNum(slot.maleExtraBooked)} / ${toBnNum(slot.maleExtraCapacity)}`
                              : `${slot.maleExtraBooked}/${slot.maleExtraCapacity}`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-blue-500/10 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, malePct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Female Extra Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <span>♀</span> {isBn ? 'মহিলা অতিরিক্ত' : 'Female Extra'}
                          </span>
                          <span className="font-mono text-muted-foreground text-[10px]">
                            {isBn
                              ? `${toBnNum(slot.femaleExtraBooked)} / ${toBnNum(slot.femaleExtraCapacity)}`
                              : `${slot.femaleExtraBooked}/${slot.femaleExtraCapacity}`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-rose-500/10 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, femalePct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Book Button for this Hour */}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {isBn
                            ? `খালি: ${toBnNum(slot.maleExtraRemaining + slot.femaleExtraRemaining)}`
                            : `Available: ${slot.maleExtraRemaining + slot.femaleExtraRemaining}`}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!slotHasExtra}
                          onClick={() => {
                            setModalSlotHour(slot.slotHour);
                            setIsBookModalOpen(true);
                          }}
                          className="h-7 px-2 text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {isBn ? 'বুক করুন' : '+ Book'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 5. Sub-View 2: Extra Booked Patients Table */
        <Card className="border-border/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'বুকিং নম্বর' : 'Booking #'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'রোগীর বিবরণ' : 'Patient & Contact'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'জেন্ডার' : 'Gender'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'স্লটের সময়' : 'Slot Hour'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'বলা সময় (Told)' : 'Told Time'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'টাইপ' : 'Capacity'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'স্ট্যাটাস' : 'Status'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider max-w-[200px]">
                    {isBn ? 'নোট' : 'Notes'}
                  </TableHead>
                  <TableHead className="w-[110px] text-right font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'একশন' : 'Action'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                      {isBn
                        ? 'এই তারিখে কোনো অতিরিক্ত স্লট বুকিং পাওয়া যায়নি'
                        : 'No extra slot bookings found for this date'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((b) => (
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
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                        >
                          <Sparkles className="w-2.5 h-2.5 mr-1" />
                          {isBn ? 'অতিরিক্ত' : 'Extra'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{b.status === 'attended' ? (isBn ? 'উপস্থিত' : 'Attended') : (isBn ? 'নিশ্চিত' : 'Confirmed')}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {b.notes || '—'}
                      </TableCell>
                      {/* ONE SINGLE BUTTON: Cancel Booking (or Restore if cancelled) */}
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end">
                          {b.status !== 'cancelled' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelBooking(b.id)}
                              disabled={actionInProgressId === b.id}
                              className="h-7 px-2.5 text-xs font-medium border-rose-500/30 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 hover:border-rose-500/50 rounded-lg cursor-pointer transition-all active:scale-95"
                              title={isBn ? 'বুকিং বাতিল করুন' : 'Cancel Booking'}
                            >
                              <Trash2 className="w-3 h-3 mr-1.5" />
                              <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreBooking(b.id)}
                              disabled={actionInProgressId === b.id}
                              className="h-7 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 hover:border-emerald-500/50 rounded-lg cursor-pointer transition-all active:scale-95"
                              title={isBn ? 'বুকিং পুনরুদ্ধার করুন' : 'Restore Booking'}
                            >
                              <RotateCcw className="w-3 h-3 mr-1.5" />
                              <span>{isBn ? 'পুনরুদ্ধার' : 'Restore'}</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Embedded Book Therapy Slot Modal configured for Extra Slot */}
      <BookTherapySlotDialog
        open={isBookModalOpen}
        onOpenChange={setIsBookModalOpen}
        initialDate={selectedDate}
        initialSlotHour={modalSlotHour}
        defaultCapacityType="extra"
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
