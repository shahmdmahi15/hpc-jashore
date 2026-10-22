// apps/web/components/checkin/CheckInWorkstationView.tsx
'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import {
  UserCheck,
  Search,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Printer,
  User,
  Phone,
  Sparkles,
  Flame,
  ArrowRight,
  Stethoscope,
  Activity,
  ShieldAlert,
  Loader2,
  Check,
  ChevronRight,
  HelpCircle,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  getCheckInOverviewAction,
  checkInPatientAction,
  type CheckInOverviewResult,
  type TherapyBookingItem,
  type LiveQueuePatient,
  type RecentCheckInVisit,
  type PunctualityStatus,
} from '../../lib/actions/checkin';
import { searchPatientsAction, type PatientRecord } from '../../lib/actions/patients';
import { CreatePatientDialog } from '../patient/CreatePatientDialog';

// Bengali digit formatter helper
function toBnNum(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
}

/**
 * Parse told time string (e.g. "09:30 AM", "14:15", "10:00", "2:30 PM") into minutes from midnight
 */
function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Compute punctuality status & delay in minutes:
 * - Up to 5 min late (<= 5): Green ('on_time')
 * - 5 min to 15 min late (5 < delay <= 15): Yellow ('moderate_delay')
 * - Over 15 min late (> 15): Red ('critical_delay')
 */
function calculatePunctuality(
  toldTimeStr?: string | null,
  targetDate: Date = new Date(),
): { status: PunctualityStatus; delayMinutes: number } | null {
  const toldMinutes = parseTimeToMinutes(toldTimeStr);
  if (toldMinutes === null) return null;

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const delayMinutes = currentMinutes - toldMinutes;

  if (delayMinutes <= 5) {
    return { status: 'on_time', delayMinutes };
  } else if (delayMinutes <= 15) {
    return { status: 'moderate_delay', delayMinutes };
  } else {
    return { status: 'critical_delay', delayMinutes };
  }
}

export function CheckInWorkstationView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [data, setData] = useState<CheckInOverviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checkin_form' | 'today_bookings' | 'live_queue' | 'recent_checkins'>('checkin_form');

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  // Form inputs
  const [destination, setDestination] = useState<'therapy' | 'consultation'>('therapy');
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'vip'>('normal');
  const [customToldTime, setCustomToldTime] = useState('');
  const [notes, setNotes] = useState('');

  // Dialogs
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [slipModalData, setSlipModalData] = useState<{
    tokenNumber: number;
    serialNumber?: number | null;
    patientName: string;
    mrn: string;
    destination?: string;
    toldTime?: string | null;
    punctualityStatus?: PunctualityStatus | null;
    delayMinutes?: number | null;
    date: string;
    time: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load initial data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await getCheckInOverviewAction();
      setData(res);
    } catch (err: any) {
      toast.error(err?.message || (isBn ? 'ডাটা লোড করতে ব্যর্থ হয়েছে' : 'Failed to load check-in overview'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Search patient debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await searchPatientsAction({ query: searchQuery.trim(), limit: 10 });
        if (res.success && res.data?.items) {
          setSearchResults(res.data.items);
        } else {
          setSearchResults([]);
        }
      } catch {
        // silent search fail
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Detected active booking for selected patient
  const matchedBooking = useMemo<TherapyBookingItem | null>(() => {
    if (!selectedPatient || !data) return null;
    return (
      data.todayBookings.find(
        (b) => b.patientId === selectedPatient.id && b.status === 'booked',
      ) || null
    );
  }, [selectedPatient, data]);

  // Live forecast punctuality for selected patient
  const forecastPunctuality = useMemo(() => {
    const timeToEvaluate = customToldTime.trim() || matchedBooking?.toldTime;
    if (!timeToEvaluate) return null;
    return calculatePunctuality(timeToEvaluate, new Date());
  }, [customToldTime, matchedBooking]);

  // Handle Check-In Submission
  const handlePerformCheckIn = (targetPatientId?: string, bookingId?: string, toldTimeOverride?: string) => {
    const pId = targetPatientId || selectedPatient?.id;
    if (!pId) {
      toast.error(isBn ? 'অনুগ্রহ করে রোগী নির্বাচন করুন' : 'Please select a patient first');
      return;
    }

    const effectiveTold = toldTimeOverride || customToldTime.trim() || matchedBooking?.toldTime || undefined;

    startTransition(async () => {
      try {
        const res = await checkInPatientAction({
          patientId: pId,
          destination,
          priority,
          toldTime: effectiveTold,
          therapyBookingId: bookingId || matchedBooking?.id || undefined,
          notes: notes.trim() || undefined,
        });

        toast.success(
          isBn
            ? `টোকেন #${toBnNum(res.tokenSlip.tokenNumber)} চেক-ইন সম্পন্ন হয়েছে!`
            : `Token #${res.tokenSlip.tokenNumber} checked in successfully!`,
        );

        // Open slip preview
        setSlipModalData({
          tokenNumber: res.tokenSlip.tokenNumber,
          serialNumber: res.tokenSlip.serialNumber,
          patientName: isBn ? res.patient.nameBn || res.patient.nameEn : res.patient.nameEn,
          mrn: res.patient.mrn,
          destination: res.tokenSlip.destination,
          toldTime: res.tokenSlip.toldTime,
          punctualityStatus: res.tokenSlip.punctualityStatus,
          delayMinutes: res.tokenSlip.delayMinutes,
          date: res.tokenSlip.date,
          time: res.tokenSlip.time,
        });

        // Reset form
        setSelectedPatient(null);
        setSearchQuery('');
        setCustomToldTime('');
        setNotes('');
        loadData();
      } catch (err: any) {
        toast.error(err?.message || (isBn ? 'চেক-ইন ব্যর্থ হয়েছে' : 'Check-in failed'));
      }
    });
  };

  // Helper renderer for punctuality badge
  const renderPunctualityBadge = (
    status?: PunctualityStatus | null,
    delayMinutes?: number | null,
    toldTime?: string | null,
  ) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-medium bg-muted/60 text-muted-foreground border border-border/50">
          <HelpCircle className="w-3 h-3" />
          {toldTime ? `⏰ ${toldTime}` : isBn ? 'স্লট নেই' : 'Unscheduled'}
        </span>
      );
    }

    if (status === 'on_time') {
      const delay = delayMinutes ?? 0;
      const text =
        delay <= 0
          ? isBn
            ? `🟢 যথাসময়ে (${toBnNum(Math.abs(delay))} মি. আগে)`
            : `🟢 On Time (${Math.abs(delay)}m early)`
          : isBn
          ? `🟢 যথাসময়ে (+${toBnNum(delay)} মি.)`
          : `🟢 On Time (+${delay}m)`;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {text}
        </span>
      );
    }

    if (status === 'moderate_delay') {
      const delay = delayMinutes ?? 0;
      const text = isBn ? `🟡 মাঝারি দেরি (+${toBnNum(delay)} মি.)` : `🟡 Late (+${delay}m)`;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          {text}
        </span>
      );
    }

    if (status === 'critical_delay') {
      const delay = delayMinutes ?? 0;
      const text = isBn ? `🔴 অতিরিক্ত বিলম্ব (+${toBnNum(delay)} মি.)` : `🔴 Severe Delay (+${delay}m)`;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          {text}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* 1. TOP HEADER & KPI METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Total Checked-In */}
        <Card className="p-3 sm:p-4 rounded-xl border border-border/50 bg-card shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isBn ? 'আজকের চেক-ইন' : 'Total Check-ins'}</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-foreground">
            {toBnNum(data?.stats.totalCheckedIn ?? 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {isBn ? 'আজকের সর্বমোট আগমন' : 'Total arrivals today'}
          </div>
        </Card>

        {/* Attended Bookings */}
        <Card className="p-3 sm:p-4 rounded-xl border border-border/50 bg-card shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isBn ? 'স্লট উপস্থিত' : 'Attended Slots'}</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-foreground">
            {toBnNum(data?.stats.attendedBooked ?? 0)} / {toBnNum(data?.stats.totalBooked ?? 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {isBn ? 'বুকিং থেকে উপস্থিত' : 'Bookings attended'}
          </div>
        </Card>

        {/* On Time (Green <= 5m) */}
        <Card className="p-3 sm:p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span>{isBn ? 'যথাসময়ে (≤৫ মি.)' : 'On Time (≤5m)'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {toBnNum(data?.stats.onTimeCount ?? 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            {isBn ? 'গ্রীন মার্কার রোগী' : 'Green punctuality'}
          </div>
        </Card>

        {/* Moderate Delay (Yellow 5-15m) */}
        <Card className="p-3 sm:p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span>{isBn ? 'মাঝারি দেরি (৫-১৫)' : 'Late (5-15m)'}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {toBnNum(data?.stats.moderateDelayCount ?? 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            {isBn ? 'ইয়োলো মার্কার রোগী' : 'Yellow punctuality'}
          </div>
        </Card>

        {/* Critical Delay (Red > 15m) */}
        <Card className="p-3 sm:p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <span>{isBn ? 'বেশি দেরি (>১৫ মি.)' : 'Severe (>15m)'}</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {toBnNum(data?.stats.criticalDelayCount ?? 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
            {isBn ? 'রেড মার্কার রোগী' : 'Red punctuality'}
          </div>
        </Card>

        {/* Live Therapy Queue Count */}
        <Card className="p-3 sm:p-4 rounded-xl border border-border/50 bg-card shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isBn ? 'থেরাপি কিউয়ে অপেক্ষমাণ' : 'Therapy Queue'}</span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
            {toBnNum(data?.liveTherapyQueue.length ?? 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {isBn ? 'টিভি ও হলে প্রদর্শিত' : 'Shown on TV & Hall'}
          </div>
        </Card>
      </div>

      {/* 2. MAIN SUB-TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-2">
          <TabsList className="h-auto p-1 bg-muted/40 border border-border/40 rounded-xl flex flex-wrap gap-1">
            <TabsTrigger
              value="checkin_form"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isBn ? 'রোগী চেক-ইন ফর্ম' : 'Check-In Form'}</span>
            </TabsTrigger>
            <TabsTrigger
              value="today_bookings"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isBn ? 'আজকের থেরাপি বুকিং' : "Today's Bookings"}</span>
              <span className="ml-1 px-1.5 py-0.2 bg-muted text-[10px] font-mono rounded-full font-bold">
                {toBnNum(data?.todayBookings.length ?? 0)}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="live_queue"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isBn ? 'লাইভ থেরাপি কিউ (টিভি)' : 'Live Therapy Queue (TV)'}</span>
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono rounded-full font-bold">
                {toBnNum(data?.liveTherapyQueue.length ?? 0)}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="recent_checkins"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isBn ? 'সাম্প্রতিক চেক-ইন' : 'Recent Check-ins'}</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreatePatientOpen(true)}
              className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isBn ? 'নতুন রোগী তৈরি' : 'Quick Create Patient'}</span>
            </Button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: CHECK-IN FORM & PATIENT SEARCH                          */}
        {/* ============================================================== */}
        <TabsContent value="checkin_form" className="mt-4 focus-visible:outline-none space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Search & Patient Selection (5 Cols) */}
            <Card className="lg:col-span-5 p-4 rounded-2xl border border-border/50 shadow-2xs space-y-4">
              <div>
                <Label className="text-xs font-bold text-foreground">
                  {isBn ? '১. রোগী অনুসন্ধান (নাম, ফোন বা MRN)' : '1. Search Patient (Name, Phone or MRN)'}
                </Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isBn ? 'রোগীর নাম, ফোন নম্বর বা HPC-2026-XXXXX লিখুন...' : 'Search Name, Phone, or MRN...'
                    }
                    className="pl-9 text-xs sm:text-sm h-10"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Search Results Dropdown/List */}
              {searchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1.5 border border-border/60 rounded-xl p-2 bg-muted/20">
                  <span className="text-[11px] font-semibold text-muted-foreground px-1">
                    {isBn ? `পাওয়া গেছে (${toBnNum(searchResults.length)} জন)` : `Found (${searchResults.length} patients)`}
                  </span>
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearchResults([]);
                        setSearchQuery(`${p.nameEn} (${p.mrn})`);
                      }}
                      className="p-2.5 rounded-lg border border-border/40 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">
                          {isBn ? p.nameBn || p.nameEn : p.nameEn}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{p.mrn}</span>
                          <span>•</span>
                          <span>{p.phone}</span>
                          <span>•</span>
                          <span className="capitalize">{p.gender}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-600">
                        {isBn ? 'নির্বাচন' : 'Select'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Patient Banner */}
              {selectedPatient ? (
                <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {isBn ? 'নির্বাচিত রোগী' : 'Selected Patient'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSearchQuery('');
                      }}
                      className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {isBn ? 'পরিবর্তন' : 'Clear'}
                    </Button>
                  </div>
                  <div className="text-sm font-black text-foreground">
                    {isBn ? selectedPatient.nameBn || selectedPatient.nameEn : selectedPatient.nameEn}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>MRN: <strong className="text-foreground">{selectedPatient.mrn}</strong></span>
                    <span>ফোন: <strong className="text-foreground">{selectedPatient.phone}</strong></span>
                    <span>লিঙ্গ: <strong className="text-foreground capitalize">{selectedPatient.gender}</strong></span>
                    {selectedPatient.ageYears && <span>বয়স: <strong className="text-foreground">{toBnNum(selectedPatient.ageYears)}</strong></span>}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center rounded-xl border border-dashed border-border/60 text-muted-foreground text-xs space-y-2">
                  <User className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <div>{isBn ? 'উপরে রোগীর নাম বা ফোন দিয়ে খুঁজুন অথবা নতুন রোগী তৈরি করুন' : 'Search above or click Create New Patient'}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatePatientOpen(true)}
                    className="text-xs mt-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {isBn ? 'নতুন রোগী তৈরি' : 'Create Patient'}
                  </Button>
                </div>
              )}
            </Card>

            {/* Right Column: Check-in Destination, Punctuality & Submit (7 Cols) */}
            <Card className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border border-border/50 shadow-2xs space-y-4">
              <div>
                <Label className="text-xs font-bold text-foreground">
                  {isBn ? '২. গন্তব্য ও কিউ নির্বাচন' : '2. Destination & Queue Selection'}
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div
                    onClick={() => setDestination('therapy')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      destination === 'therapy'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-border/60 bg-muted/10 hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <Activity className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {isBn ? 'থেরাপি কিউ (হল)' : 'Therapy Queue (Hall)'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {isBn ? 'সরাসরি থেরাপি হলে পাঠান' : 'Directly to therapy hall'}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setDestination('consultation')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      destination === 'consultation'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-border/60 bg-muted/10 hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <Stethoscope className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {isBn ? 'ডাক্তার কনসালটেশন' : 'Doctor Consultation'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {isBn ? 'ডাক্তার সিরিয়াল তৈরি হবে' : 'Consultation serial queue'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched Booking Alert Banner */}
              {matchedBooking ? (
                <div className="p-3.5 rounded-xl border border-blue-500/40 bg-blue-500/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      {isBn ? 'আজকের নির্ধারিত থেরাপি স্লট পাওয়া গেছে!' : 'Active Today Booking Found!'}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-blue-500/40 text-blue-600 dark:text-blue-400">
                      {matchedBooking.slotHour}
                    </Badge>
                  </div>
                  <div className="text-xs text-foreground flex flex-wrap items-center gap-3">
                    <span>
                      {isBn ? 'নির্ধারিত সময় (Told Time):' : 'Told Time:'}{' '}
                      <strong className="font-mono text-foreground text-sm">
                        {matchedBooking.toldTime || (isBn ? 'নির্দিষ্ট নয়' : 'Not set')}
                      </strong>
                    </span>
                    {forecastPunctuality && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-[11px]">{isBn ? 'সময়ানুবর্তিতা:' : 'Punctuality:'}</span>
                        {renderPunctualityBadge(forecastPunctuality.status, forecastPunctuality.delayMinutes)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">
                      {isBn ? 'নির্ধারিত সময় (Told Time - ঐচ্ছিক)' : 'Told Time (Optional)'}
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. 10:30 AM or 14:15"
                      value={customToldTime}
                      onChange={(e) => setCustomToldTime(e.target.value)}
                      className="mt-1 text-xs h-9 font-mono"
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {isBn ? 'দেরি বা সময়মত পৌঁছানোর হিসাবের জন্য' : 'Used to compute punctuality delay'}
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">
                      {isBn ? 'অগ্রাধিকার (Priority)' : 'Priority'}
                    </Label>
                    <Select value={priority} onValueChange={(v: string) => setPriority(v as any)}>
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">{isBn ? 'সাধারণ (Normal)' : 'Normal'}</SelectItem>
                        <SelectItem value="emergency">{isBn ? '🚨 জরুরি (Emergency)' : '🚨 Emergency'}</SelectItem>
                        <SelectItem value="vip">{isBn ? '⭐ ভিআইপি (VIP)' : '⭐ VIP'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Live Forecast Preview if custom told time entered */}
              {!matchedBooking && forecastPunctuality && (
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{isBn ? 'সম্ভাব্য সময়ানুবর্তিতা মার্ক:' : 'Forecast Punctuality Marker:'}</span>
                  {renderPunctualityBadge(forecastPunctuality.status, forecastPunctuality.delayMinutes)}
                </div>
              )}

              {/* Notes field */}
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  {isBn ? 'চেক-ইন নোট (ঐচ্ছিক)' : 'Notes (Optional)'}
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isBn ? 'রোগীর আগমন সংক্রান্ত বিশেষ কোনো তথ্য...' : 'Special instructions or arrival notes...'}
                  className="mt-1 text-xs h-16 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  onClick={() => handlePerformCheckIn()}
                  disabled={!selectedPatient || isPending}
                  className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isBn ? 'চেক-ইন প্রক্রিয়াধীন...' : 'Processing Check-in...'}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>
                        {isBn
                          ? 'চেক-ইন সম্পন্ন করুন ও টোকেন ইস্যু করুন'
                          : 'Complete Check-In & Issue Token'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: TODAY'S BOOKED THERAPY SLOTS                           */}
        {/* ============================================================== */}
        <TabsContent value="today_bookings" className="mt-4 focus-visible:outline-none space-y-3">
          <Card className="p-4 rounded-2xl border border-border/50 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {isBn ? 'আজকের সকল থেরাপি স্লট বুকিং' : "Today's Therapy Slot Bookings"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? '১-ক্লিকে চেক-ইন করুন এবং অটোমেটিক সময়ানুবর্তিতা মার্কার যুক্ত করুন'
                    : '1-click check-in with automatic punctuality comparison'}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {isBn ? `মোট: ${toBnNum(data?.todayBookings.length ?? 0)} টি` : `Total: ${data?.todayBookings.length ?? 0}`}
              </Badge>
            </div>

            {data?.todayBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <div>{isBn ? 'আজকের জন্য কোনো থেরাপি স্লট বুকিং নেই' : 'No therapy bookings scheduled for today'}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {data?.todayBookings.map((b) => {
                  const isAttended = b.status === 'attended';
                  const liveForecast = !isAttended && b.toldTime ? calculatePunctuality(b.toldTime, new Date()) : null;

                  return (
                    <div
                      key={b.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                        isAttended
                          ? 'border-border/40 bg-muted/20 opacity-80'
                          : 'border-border/60 bg-card hover:border-emerald-500/50 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-foreground">
                            {b.slotHour}
                          </span>
                          {isAttended ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                              {isBn ? 'উপস্থিত' : 'Attended'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
                              {isBn ? 'বুকড / অপেক্ষমাণ' : 'Booked'}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm font-bold text-foreground">
                          {isBn ? b.patient?.nameBn || b.patient?.nameEn : b.patient?.nameEn}
                        </div>

                        <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                          <span>{b.patient?.mrn}</span>
                          <span>•</span>
                          <span>{b.patient?.phone}</span>
                        </div>

                        {/* Punctuality Badge */}
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          {isAttended ? (
                            renderPunctualityBadge(b.punctualityStatus, b.delayMinutes, b.toldTime)
                          ) : liveForecast ? (
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">
                                {isBn ? 'এখন চেক-ইন করলে:' : 'If checked in now:'}
                              </span>
                              {renderPunctualityBadge(liveForecast.status, liveForecast.delayMinutes, b.toldTime)}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ⏰ {b.toldTime || (isBn ? 'নির্দিষ্ট সময় নেই' : 'No told time')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1-click Check-In Button */}
                      {!isAttended && (
                        <Button
                          size="sm"
                          onClick={() => handlePerformCheckIn(b.patientId, b.id, b.toldTime || undefined)}
                          disabled={isPending}
                          className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isBn ? 'এখনই চেক-ইন করুন' : 'Check In Now'}</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 3: LIVE THERAPY QUEUE (SYNCED WITH TV DISPLAY)            */}
        {/* ============================================================== */}
        <TabsContent value="live_queue" className="mt-4 focus-visible:outline-none space-y-3">
          <Card className="p-4 rounded-2xl border border-border/50 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  {isBn ? 'লাইভ থেরাপি কিউ (টিভি স্ক্রিন ও হল ভিউ)' : 'Live Therapy Queue (TV & Hall View)'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isBn
                    ? 'টিভি ডিসপ্লে ও থেরাপি হলের সাথে রিয়েল-টাইমে সিঙ্ক করা কিউ'
                    : 'Synchronized in real-time with waiting room TV and therapy workstations'}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                {isBn ? `অপেক্ষারত: ${toBnNum(data?.liveTherapyQueue.length ?? 0)} জন` : `Waiting: ${data?.liveTherapyQueue.length ?? 0}`}
              </Badge>
            </div>

            {data?.liveTherapyQueue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                <div className="font-bold text-foreground">
                  {isBn ? 'থেরাপি কিউয়ে কোনো রোগী অপেক্ষমাণ নেই' : 'No therapy patients currently queued'}
                </div>
                <div>{isBn ? 'সকল রোগীকে সেবা প্রদান করা হয়েছে' : 'All checked-in therapy tokens have been attended'}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {data?.liveTherapyQueue.map((item, idx) => (
                  <div
                    key={item.visitId}
                    className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-emerald-500/50 shadow-2xs flex flex-col justify-between space-y-2.5 transition-all"
                  >
                    <div>
                      {/* Top Header: Index & Large Token */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                          #{toBnNum(idx + 1)}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-500">
                          {toBnNum(item.tokenNumber)}
                        </span>
                      </div>

                      {/* Patient Name */}
                      <div className="mt-1 text-sm font-bold text-foreground truncate">
                        {isBn ? item.patientNameBn || item.patientNameEn : item.patientNameEn}
                      </div>

                      {/* MRN & Contact */}
                      <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{item.mrn}</span>
                        <span>•</span>
                        <span>{item.phone}</span>
                      </div>

                      {/* Punctuality Marker Badge */}
                      <div className="mt-2">
                        {renderPunctualityBadge(item.punctualityStatus, item.delayMinutes, item.toldTime)}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setSlipModalData({
                            tokenNumber: item.tokenNumber,
                            patientName: isBn ? item.patientNameBn || item.patientNameEn : item.patientNameEn,
                            mrn: item.mrn,
                            destination: 'therapy',
                            toldTime: item.toldTime,
                            punctualityStatus: item.punctualityStatus,
                            delayMinutes: item.delayMinutes,
                            date: new Date().toISOString().slice(0, 10),
                            time: item.checkedInAt,
                          })
                        }
                        className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Printer className="w-3 h-3" />
                        <span>{isBn ? 'টোকেন প্রিন্ট' : 'Print Token'}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 4: RECENT CHECK-INS TODAY                                 */}
        {/* ============================================================== */}
        <TabsContent value="recent_checkins" className="mt-4 focus-visible:outline-none space-y-3">
          <Card className="p-4 rounded-2xl border border-border/50 shadow-2xs">
            <h3 className="text-sm font-bold text-foreground mb-3">
              {isBn ? 'আজকের সাম্প্রতিক চেক-ইন তালিকা' : 'Recent Check-ins Today'}
            </h3>

            {data?.recentCheckIns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                {isBn ? 'আজকে এখনো কোনো চেক-ইন সম্পন্ন হয়নি' : 'No check-ins recorded yet today'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'টোকেন' : 'Token'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'রোগীর বিবরণ' : 'Patient Info'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'গন্তব্য' : 'Destination'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'সময়ানুবর্তিতা মার্কার' : 'Punctuality Marker'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'আগমনের সময়' : 'Arrival Time'}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data?.recentCheckIns.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          #{toBnNum(v.tokenNumber)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-foreground">
                            {isBn ? v.patient?.nameBn || v.patient?.nameEn : v.patient?.nameEn}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {v.patient?.mrn} • {v.patient?.phone}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-muted/80 text-foreground">
                            {v.currentLocation === 'therapy_hall'
                              ? isBn
                                ? 'থেরাপি হল'
                                : 'Therapy Hall'
                              : isBn
                              ? 'রিসেপশন / ডাক্তার'
                              : 'Consultation'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {renderPunctualityBadge(v.punctualityStatus, v.delayMinutes, v.toldTime)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                          {new Date(v.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSlipModalData({
                                tokenNumber: v.tokenNumber,
                                patientName: isBn ? v.patient?.nameBn || v.patient?.nameEn : v.patient?.nameEn,
                                mrn: v.patient?.mrn,
                                destination: v.currentLocation,
                                toldTime: v.toldTime,
                                punctualityStatus: v.punctualityStatus,
                                delayMinutes: v.delayMinutes,
                                date: v.visitDate,
                                time: v.checkedInAt,
                              })
                            }
                            className="h-7 px-2 text-[10px] gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>{isBn ? 'স্লিপ' : 'Slip'}</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* QUICK PATIENT CREATION DIALOG */}
      <CreatePatientDialog
        open={isCreatePatientOpen}
        onOpenChange={setIsCreatePatientOpen}
        onSuccess={(newPatient) => {
          setSelectedPatient(newPatient);
          setSearchQuery(`${newPatient.nameEn} (${newPatient.mrn})`);
          setIsCreatePatientOpen(false);
          toast.success(
            isBn
              ? `রোগী ${newPatient.nameEn} (${newPatient.mrn}) সফলভাবে নিবন্ধিত হয়েছে!`
              : `Patient ${newPatient.nameEn} (${newPatient.mrn}) registered successfully!`,
          );
        }}
      />

      {/* THERMAL 80MM SLIP PREVIEW MODAL */}
      {slipModalData && (
        <Dialog open={!!slipModalData} onOpenChange={(open: boolean) => { if (!open) setSlipModalData(null); }}>
          <DialogContent className="max-w-[340px] sm:max-w-[360px] p-4">
            <DialogHeader>
              <DialogTitle className="text-center text-sm font-bold">
                {isBn ? '৮০মিমি টোকেন স্লিপ প্রিভিউ' : '80mm Token Slip Preview'}
              </DialogTitle>
            </DialogHeader>

            <div className="bg-white text-black p-4 rounded-md border border-dashed border-zinc-400 font-mono text-center space-y-2">
              <div className="font-bold text-xs text-zinc-900 leading-tight">
                {isBn ? 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার' : 'HPC Health & Pain Care Center'}
              </div>
              <div className="text-[10px] text-zinc-600">Jashore, Bangladesh</div>
              <div className="border-t border-b border-dashed border-zinc-400 py-1.5 my-1">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {isBn ? 'টোকেন নম্বর' : 'TOKEN NUMBER'}
                </div>
                <div className="text-3xl font-black text-black">
                  #{toBnNum(slipModalData.tokenNumber)}
                </div>
              </div>

              <div className="text-left text-[11px] space-y-0.5 pt-1">
                <div><strong>রোগী:</strong> {slipModalData.patientName}</div>
                <div><strong>MRN:</strong> {slipModalData.mrn}</div>
                {slipModalData.toldTime && <div><strong>Told Time:</strong> {slipModalData.toldTime}</div>}
                {slipModalData.punctualityStatus && (
                  <div>
                    <strong>Punctuality:</strong>{' '}
                    <span className="capitalize">{slipModalData.punctualityStatus.replace('_', ' ')}</span>
                    {slipModalData.delayMinutes != null && ` (${slipModalData.delayMinutes > 0 ? `+${slipModalData.delayMinutes}m` : `${slipModalData.delayMinutes}m`})`}
                  </div>
                )}
                <div><strong>তারিখ:</strong> {slipModalData.date}</div>
              </div>

              <div className="text-[9px] text-zinc-500 pt-2 border-t border-dashed border-zinc-300">
                Please wait until your token is displayed on the TV screen.
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSlipModalData(null)} className="flex-1 text-xs">
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  window.print();
                  setSlipModalData(null);
                }}
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
