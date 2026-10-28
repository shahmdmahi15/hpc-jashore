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
  Check,
  X,
  ShieldCheck,
  Clock3,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  approveExtraSlotBookingAction,
  deleteTherapyBookingAction,
  getTherapySlotAvailabilityAction,
  listTherapyBookingsAction,
  rejectExtraSlotBookingAction,
  restoreTherapyBookingAction,
  type DayOfWeek,
  type ExtraSlotApprovalStatus,
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
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [subView, setSubView] = useState<'hourly' | 'patients'>('hourly');

  // Availability & Bookings state
  const [availabilitySlots, setAvailabilitySlots] = useState<TherapySlotAvailabilityItem[]>([]);
  const [extraBookings, setExtraBookings] = useState<TherapySlotBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Reject Modal state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetBooking, setRejectTargetBooking] = useState<TherapySlotBookingRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Book Modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [modalSlotHour, setModalSlotHour] = useState<SlotHour | undefined>(undefined);
  const [bookingToCancelId, setBookingToCancelId] = useState<string | null>(null);

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

  // Handle Approve Extra Slot Booking
  const handleApproveBooking = (bookingId: string) => {
    setActionInProgressId(bookingId);
    startTransition(async () => {
      try {
        const res = await approveExtraSlotBookingAction(bookingId);
        if (res.success) {
          toast.success(isBn ? 'অতিরিক্ত স্লট সফলভাবে অনুমোদিত হয়েছে' : 'Extra slot booking approved successfully');
          loadData();
        } else {
          toast.error(res.error || (isBn ? 'অনুমোদন করতে ব্যর্থ' : 'Failed to approve booking'));
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error approving booking');
      } finally {
        setActionInProgressId(null);
      }
    });
  };

  // Open Reject Dialog
  const handleOpenRejectDialog = (booking: TherapySlotBookingRecord) => {
    setRejectTargetBooking(booking);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  // Confirm Rejection
  const handleConfirmReject = () => {
    if (!rejectTargetBooking) return;
    if (!rejectionReason.trim()) {
      toast.error(isBn ? 'অনুগ্রহ করে প্রত্যাখ্যানের কারণ লিখুন' : 'Please provide a rejection reason');
      return;
    }

    const bookingId = rejectTargetBooking.id;
    setActionInProgressId(bookingId);
    startTransition(async () => {
      try {
        const res = await rejectExtraSlotBookingAction(bookingId, rejectionReason.trim());
        if (res.success) {
          toast.success(isBn ? 'অতিরিক্ত স্লট প্রত্যাখ্যান করা হয়েছে' : 'Extra slot request rejected');
          setRejectDialogOpen(false);
          setRejectTargetBooking(null);
          setRejectionReason('');
          loadData();
        } else {
          toast.error(res.error || (isBn ? 'প্রত্যাখ্যান ব্যর্থ হয়েছে' : 'Failed to reject booking'));
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error rejecting booking');
      } finally {
        setActionInProgressId(null);
      }
    });
  };

  // Handle Cancel Booking - Shadcn AlertDialog trigger
  const handleCancelBooking = (bookingId: string) => {
    setBookingToCancelId(bookingId);
  };

  const handleConfirmCancelBooking = () => {
    if (!bookingToCancelId) return;
    const bookingId = bookingToCancelId;
    setBookingToCancelId(null);

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

  // Count Pending Approvals
  const pendingApprovalsCount = extraBookings.filter(
    (b) => b.capacityType === 'extra' && b.approvalStatus === 'pending' && b.status !== 'cancelled',
  ).length;

  // Filtered Bookings for search & gender & approval
  const filteredBookings = extraBookings.filter((b) => {
    if (genderFilter !== 'all' && b.patientGender !== genderFilter) return false;
    if (approvalFilter !== 'all') {
      const currentApproval = b.approvalStatus || (b.capacityType === 'extra' ? 'pending' : 'approved');
      if (currentApproval !== approvalFilter) return false;
    }
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

      {/* Pending Approvals Attention Banner */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <Clock3 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>
                  {isBn
                    ? `${toBnNum(pendingApprovalsCount)}টি অতিরিক্ত স্লট অনুমোদনের অপেক্ষায় রয়েছে`
                    : `${pendingApprovalsCount} Extra Slot Booking${pendingApprovalsCount > 1 ? 's' : ''} Pending Approval`}
                </span>
                <Badge className="bg-amber-500 text-black font-bold text-[10px] px-1.5 py-0 h-4">
                  {isBn ? 'জরুরি দৃষ্টি আকর্ষণ' : 'Requires Action'}
                </Badge>
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                {isBn
                  ? 'রেগুলার স্লট পূর্ণ থাকায় রোগীদের অতিরিক্ত স্ট্যান্ডবাই স্লট বুক করা হয়েছে যা ডাক্তার বা অ্যাডমিনের অনুমোদন ব্যতীত চেক-ইন হতে পারবে না।'
                  : 'Regular slots were full; these standby extra slots require doctor or admin approval before check-in can proceed.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setSubView('patients');
              setApprovalFilter('pending');
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-8 px-3 rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            {isBn ? 'অনুরোধগুলো পর্যালোচনা করুন' : 'Review Requests'}
          </Button>
        </div>
      )}

      {/* 3. Sub-View Switcher & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
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
                className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-background cursor-pointer flex items-center gap-1.5"
              >
                <span>{isBn ? 'বুকড রোগী' : 'Booked Patients'}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-bold">
                  {isBn ? toBnNum(filteredBookings.length) : filteredBookings.length}
                </span>
                {pendingApprovalsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Gender Filter */}
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

          {/* Approval Filter */}
          <Select value={approvalFilter} onValueChange={(v: string) => setApprovalFilter(v as any)}>
            <SelectTrigger className="h-9 w-32 sm:w-36 text-xs rounded-xl cursor-pointer">
              <SelectValue placeholder={isBn ? 'অনুমোদন' : 'Approval'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isBn ? 'সকল অনুমোদন' : 'All Approvals'}</SelectItem>
              <SelectItem value="pending">
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <span>⏳</span> {isBn ? 'অপেক্ষমাণ' : 'Pending'}
                </span>
              </SelectItem>
              <SelectItem value="approved">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>✓</span> {isBn ? 'অনুমোদিত' : 'Approved'}
                </span>
              </SelectItem>
              <SelectItem value="rejected">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                  <span>✕</span> {isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}
                </span>
              </SelectItem>
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
                  <TableHead className="w-[110px] font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'বুকিং #' : 'Booking #'}
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
                    {isBn ? 'বলা সময়' : 'Told Time'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'অনুমোদন অবস্থা' : 'Approval'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider max-w-[220px]">
                    {isBn ? 'নোট ও বিবরণ' : 'Notes & Reason'}
                  </TableHead>
                  <TableHead className="w-[180px] text-right font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'একশন' : 'Action'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                      {isBn
                        ? 'এই ফিল্টারে কোনো অতিরিক্ত স্লট বুকিং পাওয়া যায়নি'
                        : 'No extra slot bookings found matching filter'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((b) => {
                    const approval = b.approvalStatus || (b.capacityType === 'extra' ? 'pending' : 'approved');
                    const isPendingApproval = approval === 'pending' && b.status !== 'cancelled';
                    const isApproved = approval === 'approved';
                    const isRejected = approval === 'rejected';

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

                        {/* Approval Status Badge */}
                        <TableCell>
                          {isPendingApproval ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1 w-fit"
                            >
                              <Clock3 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                              <span>{isBn ? '⏳ অপেক্ষমাণ (অনুমোদন প্রয়োজন)' : '⏳ Pending Approval'}</span>
                            </Badge>
                          ) : isApproved ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 w-fit"
                            >
                              <Check className="w-2.5 h-2.5" />
                              <span>{isBn ? '✓ অনুমোদিত' : '✓ Approved'}</span>
                            </Badge>
                          ) : isRejected ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1 w-fit"
                            >
                              <X className="w-2.5 h-2.5" />
                              <span>{isBn ? '✕ প্রত্যাখ্যাত' : '✕ Rejected'}</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {b.status}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Notes and Rejection Reason */}
                        <TableCell className="text-xs max-w-[220px]">
                          {isRejected && b.rejectionReason ? (
                            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-medium space-y-0.5">
                              <span className="font-bold block text-rose-800 dark:text-rose-200">
                                {isBn ? 'প্রত্যাখ্যানের কারণ:' : 'Rejection Reason:'}
                              </span>
                              <span className="line-clamp-2">{b.rejectionReason}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground truncate block">
                              {b.notes || '—'}
                            </span>
                          )}
                        </TableCell>

                        {/* Actions Column: Approve / Reject for Pending; Cancel for others */}
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            {isPendingApproval && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleApproveBooking(b.id)}
                                  disabled={actionInProgressId === b.id}
                                  className="h-7 px-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs rounded-lg cursor-pointer transition-all active:scale-95"
                                  title={isBn ? 'অনুমোদন করুন' : 'Approve'}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  <span>{isBn ? 'অনুমোদন' : 'Approve'}</span>
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenRejectDialog(b)}
                                  disabled={actionInProgressId === b.id}
                                  className="h-7 px-2 text-xs font-semibold border-rose-500/30 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all active:scale-95"
                                  title={isBn ? 'প্রত্যাখ্যান করুন' : 'Reject'}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  <span>{isBn ? 'প্রত্যাখ্যান' : 'Reject'}</span>
                                </Button>
                              </>
                            )}

                            {b.status !== 'cancelled' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelBooking(b.id)}
                                disabled={actionInProgressId === b.id}
                                className="h-7 px-2 text-xs font-medium border-border/80 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-lg cursor-pointer transition-all active:scale-95"
                                title={isBn ? 'বুকিং বাতিল করুন' : 'Cancel Booking'}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                <span>{isBn ? 'বাতিল' : 'Cancel'}</span>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreBooking(b.id)}
                                disabled={actionInProgressId === b.id}
                                className="h-7 px-2 text-xs font-medium border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 hover:border-emerald-500/50 rounded-lg cursor-pointer transition-all active:scale-95"
                                title={isBn ? 'বুকিং পুনরুদ্ধার করুন' : 'Restore Booking'}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                <span>{isBn ? 'পুনরুদ্ধার' : 'Restore'}</span>
                              </Button>
                            )}
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

      {/* Rejection Modal Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <X className="w-5 h-5" />
              <span>{isBn ? 'অতিরিক্ত স্লট প্রত্যাখ্যান করুন' : 'Reject Extra Slot Request'}</span>
            </DialogTitle>
            <DialogDescription>
              {isBn
                ? 'এই অতিরিক্ত স্লটের অনুরোধ প্রত্যাখ্যান করার কারণ উল্লেখ করুন। এটি সিস্টেমে ও রোগীর বুকিং রেকর্ডে সংরক্ষিত থাকবে।'
                : 'Please specify the reason for rejecting this extra standby slot. It will be recorded on the booking.'}
            </DialogDescription>
          </DialogHeader>

          {rejectTargetBooking && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isBn ? 'রোগী:' : 'Patient:'}</span>
                <span className="font-semibold text-foreground">
                  {isBn && rejectTargetBooking.patient.nameBn
                    ? rejectTargetBooking.patient.nameBn
                    : rejectTargetBooking.patient.nameEn}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isBn ? 'স্লটের সময়:' : 'Slot Hour:'}</span>
                <span className="font-mono font-semibold text-foreground">
                  {rejectTargetBooking.slotHour}
                </span>
              </div>
            </div>
          )}

          <div className="py-2 space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {isBn ? 'প্রত্যাখ্যানের কারণ (বাধ্যতামূলক):' : 'Rejection Reason (Required):'}
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={
                isBn
                  ? 'যেমন: চিকিৎসকের আজকের কোটা সম্পূর্ণ, থেরাপিস্ট অনুপলব্ধ, ইত্যাদি...'
                  : 'e.g. Doctor capacity exceeded, therapist unavailable, etc...'
              }
              className="min-h-[90px] text-xs sm:text-sm rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="text-xs rounded-xl cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectionReason.trim() || isPending}
              onClick={handleConfirmReject}
              className="text-xs rounded-xl font-bold cursor-pointer"
            >
              {isBn ? 'প্রত্যাখ্যান নিশ্চিত করুন' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* CONFIRM CANCEL EXTRA SLOT BOOKING ALERT DIALOG */}
      <AlertDialog
        open={Boolean(bookingToCancelId)}
        onOpenChange={(open) => {
          if (!open) setBookingToCancelId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBn ? 'অতিরিক্ত স্লট বুকিং বাতিল' : 'Cancel Extra Slot Booking'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBn
                ? 'আপনি কি নিশ্চিত যে এই অতিরিক্ত স্লট বুকিং বাতিল করতে চান? এটি বাতিল করলে নির্ধারিত অতিরিক্ত স্লটটি খালি হবে।'
                : 'Are you sure you want to cancel this extra slot booking?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isBn ? 'না, রাখুন' : 'Keep Booking'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBn ? 'হ্যাঁ, বাতিল করুন' : 'Yes, Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
