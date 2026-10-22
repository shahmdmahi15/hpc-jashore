// apps/web/components/consultation/ConsultationBookingView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Stethoscope,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  DoorOpen,
  Banknote,
  CheckCircle2,
  AlertCircle,
  X,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  User,
  Users,
  Check,
  ChevronRight,
  ArrowRight,
  Ban,
  UserCheck,
  Send,
  Timer,
  Tag,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  listConsultationBookingsAction,
  getDoctorSlotsAction,
  createConsultationBookingAction,
  checkInConsultationBookingAction,
  sendBookingToDoctorQueueAction,
  cancelConsultationBookingAction,
  ConsultationBookingRecord,
  ConsultationBookingsStats,
  DoctorSlotsResult,
} from '../../lib/actions/consultation-bookings';
import { listDoctorsAction, DoctorConfigRecord } from '../../lib/actions/consultation-config';
import { searchPatientsAction, PatientRecord } from '../../lib/actions/patients';
import { CreatePatientDialog } from '../patient/CreatePatientDialog';

const todayDateString = () => new Date().toISOString().slice(0, 10);

interface ConsultationBookingViewProps {
  defaultDoctorId?: string;
}

export function ConsultationBookingView({ defaultDoctorId }: ConsultationBookingViewProps) {
  const { language } = useLanguage();
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(todayDateString());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(defaultDoctorId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Data States
  const [bookings, setBookings] = useState<ConsultationBookingRecord[]>([]);
  const [stats, setStats] = useState<ConsultationBookingsStats>({
    totalBooked: 0,
    checkedIn: 0,
    inQueue: 0,
    completed: 0,
    cancelled: 0,
  });
  const [doctors, setDoctors] = useState<DoctorConfigRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Booking Modal States
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState<boolean>(false);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [patientResults, setPatientResults] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  const [bookingDocId, setBookingDocId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(todayDateString());
  const [doctorSlotsData, setDoctorSlotsData] = useState<DoctorSlotsResult | null>(null);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [toldTime, setToldTime] = useState<string>('');
  const [visitType, setVisitType] = useState<'new_consultation' | 'follow_up' | 'report_review'>('new_consultation');
  const [bookingNotes, setBookingNotes] = useState<string>('');

  // Cancel Confirmation Modal State
  const [cancellingBooking, setCancellingBooking] = useState<ConsultationBookingRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  // Load Initial Doctors
  useEffect(() => {
    (async () => {
      const docRes = await listDoctorsAction();
      if (docRes.success && docRes.data) {
        setDoctors(docRes.data);
        if (!bookingDocId && docRes.data.length > 0) {
          setBookingDocId(defaultDoctorId || docRes.data[0].id);
        }
      }
    })();
  }, [defaultDoctorId]);

  // Load Bookings Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listConsultationBookingsAction({
        date: selectedDate,
        doctorId: selectedDoctorId,
        status: statusFilter,
        search: searchQuery,
      });

      if (res.success && res.data) {
        setBookings(res.data.items);
        setStats(res.data.stats);
      } else {
        toast.error(res.error || (language === 'bn' ? 'সিরিয়াল তালিকা লোড করা যায়নি' : 'Failed to load bookings'));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error loading bookings');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedDoctorId, statusFilter, searchQuery, language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Patient Search Effect inside Booking Modal
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await searchPatientsAction({ query: patientSearch.trim(), limit: 5 });
      if (res.success && res.data?.items) {
        setPatientResults(res.data.items);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Load Doctor Slots when Doctor or Date changes in Booking Modal
  useEffect(() => {
    if (!bookingDocId || !bookingDate || !isBookModalOpen) return;
    (async () => {
      setSlotsLoading(true);
      try {
        const res = await getDoctorSlotsAction(bookingDocId, bookingDate);
        if (res.success && res.data) {
          setDoctorSlotsData(res.data);
          // Pick first available slot if not selected
          const firstAvail = res.data.slots.find((s) => s.isAvailable);
          if (firstAvail) {
            setSelectedSlotTime(firstAvail.slotTime);
            setToldTime(firstAvail.slotTime);
          }
        }
      } catch {}
      finally {
        setSlotsLoading(false);
      }
    })();
  }, [bookingDocId, bookingDate, isBookModalOpen]);

  // Handle Create Booking Submit
  const handleBookingSubmit = () => {
    if (!selectedPatient) {
      toast.error(language === 'bn' ? 'রোগী নির্বাচন করুন' : 'Please select a patient');
      return;
    }
    if (!bookingDocId) {
      toast.error(language === 'bn' ? 'ডাক্তার নির্বাচন করুন' : 'Please select a doctor');
      return;
    }
    if (!selectedSlotTime) {
      toast.error(language === 'bn' ? 'স্লটের সময় নির্বাচন করুন' : 'Please select a slot time');
      return;
    }

    startTransition(async () => {
      const res = await createConsultationBookingAction({
        patientId: selectedPatient.id,
        doctorId: bookingDocId,
        bookingDate,
        slotTime: selectedSlotTime,
        toldTime: toldTime || selectedSlotTime,
        visitType,
        notes: bookingNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(
          language === 'bn'
            ? `ডাক্তার সিরিয়াল বুকিং সম্পন্ন! বুকিং নং: ${res.data.bookingNumber}`
            : `Doctor serial booked! Booking #: ${res.data.bookingNumber}`,
        );
        setIsBookModalOpen(false);
        setSelectedPatient(null);
        setPatientSearch('');
        setBookingNotes('');
        await loadData();
      } else {
        toast.error(res.error || (language === 'bn' ? 'বুকিং তৈরি করা যায়নি' : 'Failed to book serial'));
      }
    });
  };

  // Quick Check-in
  const handleCheckIn = (b: ConsultationBookingRecord) => {
    startTransition(async () => {
      const res = await checkInConsultationBookingAction(b.id, b.toldTime || b.slotTime);
      if (res.success) {
        toast.success(
          language === 'bn'
            ? `${b.patient.nameEn}-এর চেক-ইন সম্পন্ন হয়েছে!`
            : `Check-in recorded for ${b.patient.nameEn}!`,
        );
        await loadData();
      } else {
        toast.error(res.error || (language === 'bn' ? 'চেক-ইন ব্যর্থ হয়েছে' : 'Failed to check-in'));
      }
    });
  };

  // Manual Send to Doctor Queue
  const handleSendToQueue = (b: ConsultationBookingRecord) => {
    startTransition(async () => {
      const res = await sendBookingToDoctorQueueAction(b.id);
      if (res.success && res.data) {
        toast.success(
          language === 'bn'
            ? `${b.patient.nameEn}-কে ডাক্তারের সিরিয়াল কিউতে পাঠানো হয়েছে (সিরিয়াল #${res.data.serialNumber})!`
            : `Patient sent to doctor queue (Serial #${res.data.serialNumber})!`,
        );
        await loadData();
      } else {
        toast.error(res.error || (language === 'bn' ? 'কিউতে পাঠানো যায়নি' : 'Failed to send to queue'));
      }
    });
  };

  // Cancel Booking
  const openCancelModal = (b: ConsultationBookingRecord) => {
    setCancellingBooking(b);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = () => {
    if (!cancellingBooking) return;
    startTransition(async () => {
      const res = await cancelConsultationBookingAction(cancellingBooking.id, cancelReason);
      if (res.success) {
        toast.success(
          language === 'bn'
            ? `সিরিয়াল বুকিং ${cancellingBooking.bookingNumber} বাতিল করা হয়েছে!`
            : `Booking ${cancellingBooking.bookingNumber} cancelled!`,
        );
        setIsCancelModalOpen(false);
        setCancellingBooking(null);
        await loadData();
      } else {
        toast.error(res.error || (language === 'bn' ? 'বাতিল করতে ব্যর্থ হয়েছে' : 'Failed to cancel booking'));
      }
    });
  };

  // Selected Doctor Fee Preview
  const activeBookingDoc = doctors.find((d) => d.id === bookingDocId);
  const currentFeeTaka = activeBookingDoc
    ? (visitType === 'follow_up'
        ? activeBookingDoc.followUpFeeTaka
        : visitType === 'report_review'
        ? activeBookingDoc.reportFeeTaka
        : activeBookingDoc.consultationFeeTaka)
    : 500;

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Top Banner & KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Total Booked Today */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'মোট বুকিং' : 'Total Booked'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {stats.totalBooked}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {selectedDate === todayDateString() ? (language === 'bn' ? 'আজ' : 'today') : selectedDate}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Checked In (Awaiting Doctor Queue) */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'চেক-ইন (কিউ অপেক্ষমাণ)' : 'Checked In (Wait)'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-amber-500">
                  {stats.checkedIn}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {language === 'bn' ? 'রোগী' : 'pts'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <UserCheck className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: In Doctor Queue */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'ডাক্তারের কিউতে' : 'In Chamber Queue'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {stats.inQueue}
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {language === 'bn' ? 'চলমান' : 'active'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Stethoscope className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Completed */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'পরামর্শ সম্পন্ন' : 'Completed'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {stats.completed}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {language === 'bn' ? 'রোগী' : 'pts'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Container Card */}
      <Card className="border-border/60 shadow-md">
        <CardHeader className="p-4 sm:p-6 border-b border-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Stethoscope className="size-5 text-emerald-500" />
                {language === 'bn'
                  ? 'ডাক্তার কনসালটেশন সিরিয়াল বুকিং ও পরিচালনা'
                  : 'Doctor Consultation Serial Booking & Queue'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {language === 'bn'
                  ? 'রোগী অনুসন্ধান, ডাক্তার ভিজিট সিরিয়াল বুকিং, চেক-ইন সময়ানুবর্তিতা এবং চেম্বার কিউতে প্রেরণ।'
                  : 'Search patient, book doctor serial slot, track check-in punctuality, and route to doctor queue.'}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-9 px-3 rounded-xl border-border/70 hover:bg-muted/80 text-xs font-medium"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                {language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsBookModalOpen(true)}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-transform"
              >
                <Plus className="size-3.5 mr-1.5" />
                {language === 'bn' ? 'সিরিয়াল বুক করুন' : 'Book Serial'}
              </Button>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Date Input */}
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-36 sm:w-40 h-9 rounded-xl text-xs sm:text-sm font-mono bg-background/80"
              />

              {/* Doctor Selector */}
              <Select
                value={selectedDoctorId}
                onValueChange={(val: string) => setSelectedDoctorId(val)}
              >
                <SelectTrigger className="w-40 sm:w-52 h-9 rounded-xl text-xs bg-background/80">
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'bn' ? 'সকল ডাক্তার' : 'All Doctors'}</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(val: string) => setStatusFilter(val)}
              >
                <SelectTrigger className="w-28 sm:w-32 h-9 rounded-xl text-xs bg-background/80">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                  <SelectItem value="booked">{language === 'bn' ? 'বুক করা' : 'Booked'}</SelectItem>
                  <SelectItem value="checked_in">{language === 'bn' ? 'চেক-ইন' : 'Checked In'}</SelectItem>
                  <SelectItem value="in_queue">{language === 'bn' ? 'কিউতে অপেক্ষমাণ' : 'In Queue'}</SelectItem>
                  <SelectItem value="completed">{language === 'bn' ? 'সম্পন্ন' : 'Completed'}</SelectItem>
                  <SelectItem value="cancelled">{language === 'bn' ? 'বাতিল' : 'Cancelled'}</SelectItem>
                </SelectContent>
              </Select>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    language === 'bn'
                      ? 'রোগীর নাম, ফোন, MRN বা সিরিয়াল খুঁজুন...'
                      : 'Search patient name, MRN, phone...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 rounded-xl text-xs sm:text-sm bg-background/80"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 self-end lg:self-auto bg-muted/60 p-0.5 rounded-xl border border-border/40">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-2.5 rounded-lg text-xs font-medium"
              >
                <LayoutGrid className="size-3.5 mr-1.5" />
                {language === 'bn' ? 'কার্ড' : 'Grid'}
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-2.5 rounded-lg text-xs font-medium"
              >
                <TableIcon className="size-3.5 mr-1.5" />
                {language === 'bn' ? 'টেবিল' : 'Table'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="size-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground font-medium">
                {language === 'bn' ? 'ডাক্তার সিরিয়াল তালিকা লোড হচ্ছে...' : 'Loading consultation serials...'}
              </p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-border/60 rounded-2xl bg-muted/20">
              <Stethoscope className="size-10 text-muted-foreground/60 mx-auto" />
              <h3 className="text-base font-semibold text-foreground">
                {language === 'bn' ? 'কোনো সিরিয়াল পাওয়া যায়নি' : 'No consultation serials found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? (language === 'bn'
                    ? 'আপনার সার্চ ফিল্টারের সাথে কোনো সিরিয়াল মেলেনি।'
                    : 'No bookings matched your search filter.')
                  : (language === 'bn'
                    ? 'এই তারিখে এখনও কোনো সিরিয়াল বুক করা হয়নি। উপরে "সিরিয়াল বুক করুন" বাটনে চাপুন।'
                    : 'No serials booked for this date. Click "Book Serial" to add an appointment.')}
              </p>
              <Button
                size="sm"
                onClick={() => setIsBookModalOpen(true)}
                className="rounded-xl text-xs mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <Plus className="size-3.5 mr-1.5" />
                {language === 'bn' ? 'নতুন সিরিয়াল বুক করুন' : 'Book New Serial'}
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Cards Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {bookings.map((b) => {
                const isCancelled = b.status === 'cancelled';
                const isCompleted = b.status === 'completed';
                const isInQueue = b.status === 'in_queue' || b.status === 'in_chamber';
                const isCheckedIn = b.status === 'checked_in';

                // Punctuality Badge Styling
                let punctualityColor = 'bg-muted text-muted-foreground border-border/40';
                let punctualityText = '';
                if (b.punctualityStatus === 'on_time') {
                  punctualityColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
                  punctualityText = language === 'bn' ? 'সময়মতো (Green)' : 'On Time';
                } else if (b.punctualityStatus === 'moderate_delay') {
                  punctualityColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
                  punctualityText = language === 'bn' ? `${b.delayMinutes}মি. বিলম্ব (Yellow)` : `${b.delayMinutes}m Late`;
                } else if (b.punctualityStatus === 'critical_delay') {
                  punctualityColor = 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
                  punctualityText = language === 'bn' ? `${b.delayMinutes}মি. অতিরিক্ত বিলম্ব (Red)` : `${b.delayMinutes}m Late`;
                }

                return (
                  <Card
                    key={b.id}
                    className={`border transition-all duration-200 overflow-hidden relative flex flex-col justify-between ${
                      isCancelled
                        ? 'border-border/40 bg-muted/20 opacity-70'
                        : isCompleted
                        ? 'border-border/60 bg-muted/10'
                        : isInQueue
                        ? 'border-emerald-500/40 hover:border-emerald-500/70 bg-gradient-to-br from-card to-emerald-500/5 shadow-sm'
                        : isCheckedIn
                        ? 'border-amber-500/40 hover:border-amber-500/70 bg-gradient-to-br from-card to-amber-500/5'
                        : 'border-border/60 hover:border-border'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="p-3.5 sm:p-4 border-b border-border/40 flex items-start justify-between gap-2 bg-muted/20">
                        <div className="flex items-center gap-2.5">
                          <div className={`size-9 sm:size-10 rounded-xl flex items-center justify-center font-black text-sm sm:text-base font-mono ${
                            isInQueue
                              ? 'bg-emerald-500 text-black shadow-sm'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {b.serialNumber ? `#${b.serialNumber.toString().padStart(2, '0')}` : 'SL'}
                          </div>
                          <div>
                            <span className="font-bold text-sm sm:text-base text-foreground leading-snug block">
                              {b.patient.nameEn}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground block">
                              {b.patient.mrn} • {b.patient.phone || '-'}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isCancelled ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted">
                            Cancelled
                          </Badge>
                        ) : isCompleted ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                            ✓ Done
                          </Badge>
                        ) : isInQueue ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                            In Queue #{b.serialNumber}
                          </Badge>
                        ) : isCheckedIn ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                            Checked In
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-border/60">
                            Booked
                          </Badge>
                        )}
                      </div>

                      {/* Content Body */}
                      <div className="p-3.5 sm:p-4 space-y-3 text-xs">
                        {/* Doctor & Chamber */}
                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <Stethoscope className="size-3.5 text-emerald-500" />
                              {b.doctor.fullName}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border/30">
                              {b.doctor.chamberName || (b.doctor.chamberRoomNumber ? `Chamber ${b.doctor.chamberRoomNumber}` : 'Chamber')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="capitalize">
                              {b.visitType === 'new_consultation'
                                ? (language === 'bn' ? 'মূল ভিজিট' : 'New Visit')
                                : b.visitType === 'follow_up'
                                ? (language === 'bn' ? 'ফলো-আপ' : 'Follow-Up')
                                : (language === 'bn' ? 'রিপোর্ট দেখানো' : 'Report Review')}
                            </span>
                            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              ৳{b.feeTaka}
                            </span>
                          </div>
                        </div>

                        {/* Timing & Told Time */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-muted/20 border border-border/30">
                            <span className="text-[10px] text-muted-foreground block">{language === 'bn' ? 'স্লট সময়' : 'Slot Time'}</span>
                            <span className="font-bold text-foreground font-mono">{b.slotTime}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/20 border border-border/30 text-right">
                            <span className="text-[10px] text-muted-foreground block">{language === 'bn' ? 'জানানো সময়' : 'Told Time'}</span>
                            <span className="font-bold text-foreground font-mono">{b.toldTime || b.slotTime}</span>
                          </div>
                        </div>

                        {/* Punctuality Indicator */}
                        {b.punctualityStatus && (
                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-muted-foreground text-[10px]">Punctuality:</span>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${punctualityColor}`}>
                              <Timer className="size-3 mr-1" />
                              {punctualityText}
                            </Badge>
                          </div>
                        )}

                        {/* Booking Number & Notes */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                          <span className="font-mono">{b.bookingNumber}</span>
                          {b.checkedInAt && (
                            <span>
                              In: {new Date(b.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                      {isCancelled ? (
                        <span className="text-[11px] text-muted-foreground italic w-full text-center">
                          {b.cancellationReason || 'Cancelled'}
                        </span>
                      ) : isCompleted ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium w-full text-center flex items-center justify-center gap-1">
                          <Check className="size-3.5" /> {language === 'bn' ? 'পরামর্শ সম্পন্ন' : 'Completed'}
                        </span>
                      ) : (
                        <>
                          {/* 1. If Booked: Check-in button */}
                          {b.status === 'booked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckIn(b)}
                              className="h-8 px-2.5 rounded-xl text-xs font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 flex-1"
                            >
                              <UserCheck className="size-3 mr-1" />
                              {language === 'bn' ? 'চেক-ইন' : 'Check In'}
                            </Button>
                          )}

                          {/* 2. If Checked-in (Awaiting Queue): Send to Doctor Queue button */}
                          {isCheckedIn && (
                            <Button
                              size="sm"
                              onClick={() => handleSendToQueue(b)}
                              className="h-8 px-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 flex-1"
                            >
                              <Send className="size-3 mr-1" />
                              {language === 'bn' ? 'কিউতে পাঠান' : 'Send to Queue'}
                            </Button>
                          )}

                          {/* 3. If In Queue: Status info */}
                          {isInQueue && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 flex-1">
                              <CheckCircle2 className="size-3.5" />
                              {language === 'bn' ? `কিউ #${b.serialNumber}` : `In Queue #${b.serialNumber}`}
                            </span>
                          )}

                          {/* 4. Single Cancel Button (Strict User Requirement: "can also cancel no extra button simple like we have book and cancel in therapy slot") */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openCancelModal(b)}
                            className="h-8 px-2.5 rounded-xl text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 active:scale-95"
                          >
                            <Ban className="size-3 mr-1" />
                            {language === 'bn' ? 'বাতিল' : 'Cancel'}
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-border/60 overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-xs">SL & Booking</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'রোগী' : 'Patient'}</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'ডাক্তার ও চেম্বার' : 'Doctor & Chamber'}</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'সময়' : 'Time'}</TableHead>
                    <TableHead className="font-bold text-xs text-right">{language === 'bn' ? 'ফি' : 'Fee'}</TableHead>
                    <TableHead className="font-bold text-xs text-center">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="font-bold text-xs text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="space-y-0.5">
                          <span className="font-mono font-black text-xs text-primary">
                            {b.serialNumber ? `#${b.serialNumber}` : 'SL'}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground block truncate max-w-[120px]">
                            {b.bookingNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">{b.patient.nameEn}</span>
                          <span className="text-[11px] font-mono text-muted-foreground block">
                            {b.patient.mrn} • {b.patient.phone || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-foreground block">{b.doctor.fullName}</span>
                        <span className="text-[11px] text-muted-foreground block">{b.doctor.chamberName || 'Chamber'}</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <div>{b.slotTime}</div>
                        {b.toldTime && b.toldTime !== b.slotTime && (
                          <div className="text-[10px] text-muted-foreground">Told: {b.toldTime}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        ৳{b.feeTaka}
                      </TableCell>
                      <TableCell className="text-center">
                        {b.status === 'cancelled' ? (
                          <Badge variant="outline" className="text-[10px]">Cancelled</Badge>
                        ) : b.status === 'in_queue' ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Queue #{b.serialNumber}</Badge>
                        ) : b.status === 'checked_in' ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">Checked In</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Booked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status === 'booked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckIn(b)}
                              className="h-7 px-2 text-[11px] text-emerald-600 border-emerald-500/40"
                            >
                              Check In
                            </Button>
                          )}
                          {b.status === 'checked_in' && (
                            <Button
                              size="sm"
                              onClick={() => handleSendToQueue(b)}
                              className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              Send Queue
                            </Button>
                          )}
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openCancelModal(b)}
                              className="h-7 px-2 text-[11px] text-red-500 hover:text-red-600"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Consultation Modal */}
      <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Stethoscope className="size-5 text-emerald-500" />
              {language === 'bn' ? 'ডাক্তার কনসালটেশন সিরিয়াল বুকিং' : 'Book Doctor Consultation Serial'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'bn'
                ? 'রোগী নির্বাচন করুন, ডাক্তার ও উপলব্ধ স্লটের সময় নির্ধারণ করে সিরিয়াল নিশ্চিত করুন।'
                : 'Select patient, attending doctor, date, and available time slot.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Patient Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" />
                  {language === 'bn' ? 'রোগী নির্বাচন' : 'Select Patient'} *
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatePatientOpen(true)}
                  className="h-7 px-2 text-[11px] rounded-lg border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Plus className="size-3 mr-1" />
                  {language === 'bn' ? '+ নতুন রোগী নিবন্ধন' : '+ New Patient'}
                </Button>
              </div>

              {selectedPatient ? (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-sm text-foreground block">{selectedPatient.nameEn}</span>
                    <span className="text-xs text-muted-foreground font-mono block">
                      {selectedPatient.mrn} • {selectedPatient.phone || '-'} • {selectedPatient.gender}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1 relative">
                  <div className="relative">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={
                        language === 'bn'
                          ? 'রোগীর নাম, ফোন নম্বর বা MRN লিখুন...'
                          : 'Search patient by name, phone or MRN...'
                      }
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9 h-9 text-xs sm:text-sm"
                    />
                  </div>

                  {patientResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-popover border border-border/80 rounded-xl shadow-lg max-h-48 overflow-y-auto p-1">
                      {patientResults.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch('');
                            setPatientResults([]);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted/70 text-xs flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-bold text-foreground block">{p.nameEn}</span>
                            <span className="text-[11px] text-muted-foreground font-mono">{p.mrn} • {p.phone || '-'}</span>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Attending Doctor Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Stethoscope className="size-3.5 text-emerald-500" />
                {language === 'bn' ? 'পরামর্শক ডাক্তার' : 'Attending Doctor'} *
              </label>
              <Select
                value={bookingDocId}
                onValueChange={(val: string) => setBookingDocId(val)}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.fullName} ({d.chamberName || 'Chamber'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Booking Date & Visit Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-sky-500" />
                  {language === 'bn' ? 'বুকিং তারিখ' : 'Booking Date'} *
                </label>
                <Input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="size-3.5 text-violet-500" />
                  {language === 'bn' ? 'ভিজিট ধরন' : 'Visit Type'}
                </label>
                <Select
                  value={visitType}
                  onValueChange={(val: any) => setVisitType(val)}
                >
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_consultation">
                      {language === 'bn' ? 'মূল ভিজিট' : 'New Consultation'} (৳{activeBookingDoc?.consultationFeeTaka ?? 500})
                    </SelectItem>
                    <SelectItem value="follow_up">
                      {language === 'bn' ? 'ফলো-আপ' : 'Follow-Up'} (৳{activeBookingDoc?.followUpFeeTaka ?? 300})
                    </SelectItem>
                    <SelectItem value="report_review">
                      {language === 'bn' ? 'রিপোর্ট দেখানো' : 'Report Review'} (৳{activeBookingDoc?.reportFeeTaka ?? 0})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 4. Slot Selection Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-emerald-500" />
                  {language === 'bn' ? 'উপলব্ধ সিরিয়াল স্লট' : 'Available Time Slots'} *
                </span>
                {doctorSlotsData && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {doctorSlotsData.bookedCount}/{doctorSlotsData.dailyQuota} {language === 'bn' ? 'বুকড' : 'booked'}
                  </span>
                )}
              </label>

              {slotsLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  <RefreshCw className="size-4 animate-spin inline-block mr-1 text-emerald-500" />
                  Loading doctor schedule...
                </div>
              ) : doctorSlotsData && doctorSlotsData.slots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-40 overflow-y-auto p-1 border border-border/50 rounded-xl bg-muted/20">
                  {doctorSlotsData.slots.map((s) => {
                    const isSelected = selectedSlotTime === s.slotTime;
                    return (
                      <button
                        type="button"
                        key={s.slotTime}
                        disabled={!s.isAvailable}
                        onClick={() => {
                          setSelectedSlotTime(s.slotTime);
                          setToldTime(s.slotTime);
                        }}
                        className={`p-2 rounded-lg text-xs font-mono font-semibold transition-all text-center ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500'
                            : s.isAvailable
                            ? 'bg-card hover:bg-muted text-foreground border border-border/60'
                            : 'bg-muted/40 text-muted-foreground/40 border border-border/20 cursor-not-allowed line-through'
                        }`}
                      >
                        {s.slotTime}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  {language === 'bn' ? 'এই দিনে ডাক্তারের কোনো শিডিউল নেই।' : 'No slots scheduled on this date.'}
                </div>
              )}
            </div>

            {/* 5. Told Time Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'রোগীকে জানানো সময় (Told Time)' : 'Instructed Told Time'}
                </label>
                <Input
                  value={toldTime}
                  onChange={(e) => setToldTime(e.target.value)}
                  placeholder="09:15 AM"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ফি পরিমাণ' : 'Consultation Fee'}
                </label>
                <div className="h-9 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  <span>৳{currentFeeTaka}</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 uppercase">BDT</Badge>
                </div>
              </div>
            </div>

            {/* 6. Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {language === 'bn' ? 'বুকিং নোট (ঐচ্ছিক)' : 'Booking Notes (Optional)'}
              </label>
              <Textarea
                rows={2}
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'রোগীর সমস্যা বা ফ্রন্ট ডেস্কের কোনো বিশেষ বার্তা...'
                    : 'Chief complaint or special clinical note...'
                }
                className="text-xs sm:text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBookModalOpen(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              onClick={handleBookingSubmit}
              disabled={isPending || !selectedPatient || !selectedSlotTime}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
            >
              {isPending ? (
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="size-3.5 mr-1.5" />
              )}
              {language === 'bn' ? 'সিরিয়াল নিশ্চিত করুন' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation Dialog */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-red-600">
              <Ban className="size-5 text-red-500" />
              {language === 'bn' ? 'সিরিয়াল বুকিং বাতিল করুন' : 'Cancel Consultation Booking'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'bn'
                ? `আপনি কি নিশ্চিত যে ${cancellingBooking?.patient.nameEn}-এর বুকিং (${cancellingBooking?.bookingNumber}) বাতিল করতে চান?`
                : `Are you sure you want to cancel booking ${cancellingBooking?.bookingNumber} for ${cancellingBooking?.patient.nameEn}?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {language === 'bn' ? 'বাতিল করার কারণ (ঐচ্ছিক)' : 'Cancellation Reason (Optional)'}
              </label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'উদাঃ রোগী আসতে পারবেন না / অন্য দিনে পুনর্নির্ধারিত...'
                    : 'e.g. Patient requested cancellation / rescheduled...'
                }
                className="h-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              {language === 'bn' ? 'ফিরে যান' : 'Keep Booking'}
            </Button>
            <Button
              size="sm"
              onClick={handleCancelSubmit}
              disabled={isPending}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              {isPending ? (
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Ban className="size-3.5 mr-1.5" />
              )}
              {language === 'bn' ? 'হ্যাঁ, বাতিল করুন' : 'Yes, Cancel Serial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Patient Registration Modal */}
      <CreatePatientDialog
        open={isCreatePatientOpen}
        onOpenChange={setIsCreatePatientOpen}
        onSuccess={(created) => {
          setSelectedPatient(created);
          setIsCreatePatientOpen(false);
          toast.success(
            language === 'bn'
              ? `রোগী ${created.nameEn} নিবন্ধিত ও নির্বাচিত হয়েছে!`
              : `Patient ${created.nameEn} registered and selected!`,
          );
        }}
      />
    </div>
  );
}
