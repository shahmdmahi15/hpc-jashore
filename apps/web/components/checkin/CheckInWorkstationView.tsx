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
  AlertTriangle,
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
  Trash2,
  MapPin,
  Building2,
  Radio,
  Eye,
  PhoneCall,
  FolderArchive,
} from 'lucide-react';
import { getLegacyFileInfo } from '../../lib/legacy-patient';
import { TherapyQueueManagementTab } from '../therapy/TherapyQueueManagementTab';
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
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
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
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { useRealtime } from '../../lib/use-realtime';
import {
  getCheckInOverviewAction,
  checkInPatientAction,
  type CheckInOverviewResult,
  type TherapyBookingItem,
  type TodayConsultationBookingItem,
  type LiveQueuePatient,
  type RecentCheckInVisit,
  type PunctualityStatus,
} from '../../lib/actions/checkin';
import {
  searchPatientsAction,
  getPatientClinicalStatusAction,
  type PatientRecord,
  type PatientClinicalStatus,
} from '../../lib/actions/patients';
import { deleteTherapyBookingAction } from '../../lib/actions/therapy-slots';
import { CreatePatientDialog } from '../patient/CreatePatientDialog';
import { PatientIntakeFormModal } from '../patient/PatientIntakeFormModal';
import { PatientTimelineModal } from '../patient/PatientTimelineModal';
import { InstantConsultationCheckInModal } from './InstantConsultationCheckInModal';
import { InstantTherapySlotCheckInModal } from './InstantTherapySlotCheckInModal';

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
  const [activeTab, setActiveTab] = useState<'checkin_form' | 'today_bookings' | 'live_queue' | 'recent_checkins' | 'therapy_queue'>('checkin_form');
  const [todayBookingFilter, setTodayBookingFilter] = useState<'pending' | 'attended' | 'all'>('pending');

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  // Form inputs
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'vip'>('normal');
  const [customToldTime, setCustomToldTime] = useState('');
  const [notes, setNotes] = useState('');

  // Dialogs
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [isIntakeFormOpen, setIsIntakeFormOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isInstantConsultationOpen, setIsInstantConsultationOpen] = useState(false);
  const [isInstantTherapyOpen, setIsInstantTherapyOpen] = useState(false);
  const [selectedClinicalStatus, setSelectedClinicalStatus] = useState<PatientClinicalStatus | null>(null);
  const [savedIntakePatientIds, setSavedIntakePatientIds] = useState<Set<string>>(new Set());
  const [bookingToCancel, setBookingToCancel] = useState<{ id: string; slotTime?: string } | null>(null);
  const [loadingClinicalStatus, setLoadingClinicalStatus] = useState(false);
  const [isIntakeWarningOpen, setIsIntakeWarningOpen] = useState(false);
  const [pendingCheckInParams, setPendingCheckInParams] = useState<{
    targetPatientId?: string;
    bookingId?: string;
    toldTimeOverride?: string;
  } | null>(null);
  const [timelinePatient, setTimelinePatient] = useState<{
    id: string;
    name?: string;
    mrn?: string;
    phone?: string;
  } | null>(null);
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

  // Live checked-in patients list filters
  const [liveSearchQuery, setLiveSearchQuery] = useState('');
  const [liveLocationFilter, setLiveLocationFilter] = useState<
    'all' | 'waiting' | 'reception' | 'cashier' | 'doctor' | 'therapy' | 'completed'
  >('all');

  const getLocationDisplay = (locationRaw?: string | null, status?: string) => {
    const loc = (locationRaw || '').toLowerCase();
    const st = (status || '').toLowerCase();

    if (st === 'completed' || st === 'checked_out') {
      return {
        label: isBn ? 'সেবা সম্পন্ন / প্রস্থান' : 'Service Completed / Departed',
        category: 'completed' as const,
        color: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
        dotColor: 'bg-zinc-400',
        icon: CheckCircle2,
      };
    }
    if (loc.includes('reception')) {
      return {
        label: isBn ? 'রিসেপশন ডেস্ক' : 'Reception Desk',
        category: 'reception' as const,
        color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40',
        dotColor: 'bg-sky-500',
        icon: Building2,
      };
    }
    if (loc.includes('cashier') || loc.includes('cash') || loc.includes('billing')) {
      return {
        label: isBn ? 'ক্যাশ ও বিলিং কাউন্টার' : 'Cashier Counter',
        category: 'cashier' as const,
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
        dotColor: 'bg-amber-500',
        icon: Sparkles,
      };
    }
    if (loc.includes('doctor') || loc.includes('chamber') || loc.includes('consultation') || st === 'in_consultation') {
      return {
        label: isBn ? 'ডাক্তার চেম্বার' : 'Doctor Chamber',
        category: 'doctor' as const,
        color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
        dotColor: 'bg-emerald-500',
        icon: Stethoscope,
      };
    }
    if (loc.includes('therapy') || loc.includes('hall') || st === 'in_therapy') {
      return {
        label: isBn ? 'ফিজিওথেরাপী ও রিহ্যাব হল' : 'Therapy & Rehab Hall',
        category: 'therapy' as const,
        color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40',
        dotColor: 'bg-teal-500',
        icon: Activity,
      };
    }
    return {
      label: isBn ? 'ওয়েটিং রুম / লবি' : 'Waiting Room / Lobby',
      category: 'waiting' as const,
      color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40',
      dotColor: 'bg-purple-500',
      icon: Clock,
    };
  };

  const filteredCheckedInPatients = useMemo(() => {
    const list = data?.recentCheckIns || [];
    const filtered = list.filter((v) => {
      const pName = (
        isBn ? v.patient?.nameBn || v.patient?.nameEn : v.patient?.nameEn || v.patient?.nameBn || ''
      ).toLowerCase();
      const mrn = (v.patient?.mrn || '').toLowerCase();
      const phone = (v.patient?.phone || '').toLowerCase();
      const searchMatch =
        !liveSearchQuery.trim() ||
        pName.includes(liveSearchQuery.toLowerCase().trim()) ||
        mrn.includes(liveSearchQuery.toLowerCase().trim()) ||
        phone.includes(liveSearchQuery.toLowerCase().trim());

      if (!searchMatch) return false;

      if (liveLocationFilter === 'all') return true;
      const locInfo = getLocationDisplay(v.currentLocation, v.status);
      return locInfo.category === liveLocationFilter;
    });

    // Sort strictly by arrival time
    return [...filtered].sort((a, b) => {
      const tA = new Date(a.checkedInAt || 0).getTime();
      const tB = new Date(b.checkedInAt || 0).getTime();
      return tA - tB;
    });
  }, [data?.recentCheckIns, liveSearchQuery, liveLocationFilter, isBn]);

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

  // Listen to realtime events across all active workstations and TV app
  useRealtime((event) => {
    if (
      event.type === 'therapy.slot.updated' ||
      event.type === 'therapy.booking.cancelled' ||
      event.type === 'therapy.booking.created' ||
      event.type === 'therapy.booking.approved' ||
      event.type === 'therapy.booking.rejected' ||
      event.type === 'visit.checked_in' ||
      event.type === 'visit.updated' ||
      event.type === 'therapy.queue.updated' ||
      event.type === 'consultation.booking.cancelled' ||
      event.type === 'consultation.booking.created' ||
      event.type === 'consultation.queue.updated' ||
      event.type === 'consultation.called' ||
      event.type === 'consultation.completed' ||
      event.type === 'intake.created'
    ) {
      loadData();
    }
  });

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

  // Load 3-Tier Clinical Recognition Status when patient is selected
  useEffect(() => {
    if (!selectedPatient?.id) {
      setSelectedClinicalStatus(null);
      return;
    }
    let active = true;
    setLoadingClinicalStatus(true);

    // Direct check for today's / latest intake form
    api.patients
      .getLatestIntakeForm(selectedPatient.id)
      .then((form: any) => {
        if (!active || !form) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        const formDate = (form.date || form.createdAt || '').slice(0, 10);
        if (
          formDate === todayStr ||
          form.status === 'in_queue' ||
          form.status === 'forwarded_to_cashier' ||
          form.status === 'submitted' ||
          Boolean(form.chiefComplaint || form.bpSystolic)
        ) {
          setSavedIntakePatientIds((prev) => new Set([...Array.from(prev), selectedPatient.id]));
          setSelectedClinicalStatus((prev) =>
            prev ? { ...prev, intakeCompletedToday: true, todayIntakeId: form.id } : prev
          );
        }
      })
      .catch(() => {
        api.patients
          .listIntakeForms({ patientId: selectedPatient.id, date: 'all' })
          .then((forms: any) => {
            if (!active) return;
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayForm = (forms || []).find(
              (f: any) =>
                (f.date && f.date.slice(0, 10) === todayStr) ||
                (f.createdAt && f.createdAt.slice(0, 10) === todayStr) ||
                f.status === 'in_queue' ||
                f.status === 'forwarded_to_cashier'
            );
            if (todayForm) {
              setSavedIntakePatientIds((prev) => new Set([...Array.from(prev), selectedPatient.id]));
              setSelectedClinicalStatus((prev) =>
                prev ? { ...prev, intakeCompletedToday: true, todayIntakeId: todayForm.id } : prev
              );
            }
          })
          .catch(() => {});
      });

    getPatientClinicalStatusAction(selectedPatient.id)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          const clinicalData = res.data;
          setSelectedClinicalStatus((prev) => {
            const isDone = clinicalData.intakeCompletedToday || prev?.intakeCompletedToday;
            return {
              ...clinicalData,
              intakeCompletedToday: Boolean(isDone),
              todayIntakeId: clinicalData.todayIntakeId || prev?.todayIntakeId || null,
            };
          });
          if (clinicalData.intakeCompletedToday) {
            setSavedIntakePatientIds((prev) => new Set([...Array.from(prev), selectedPatient.id]));
          }
        } else {
          setSelectedClinicalStatus(null);
        }
      })
      .catch(() => {
        if (active) setSelectedClinicalStatus(null);
      })
      .finally(() => {
        if (active) setLoadingClinicalStatus(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPatient?.id]);

  const legacyFileInfo = useMemo(() => {
    return getLegacyFileInfo(selectedPatient?.notes);
  }, [selectedPatient?.notes]);
  const isLegacyPatient = legacyFileInfo.isLegacy;

  // Filter out any cancelled or deleted bookings from todayBookings
  const validTodayBookings = useMemo(() => {
    return (data?.todayBookings || []).filter(
      (b) => b.status !== 'cancelled' && !(b as any).deletedAt,
    );
  }, [data?.todayBookings]);

  // Filtered list according to tab pill (Pending, Attended, All)
  const displayedTodayBookings = useMemo(() => {
    if (todayBookingFilter === 'pending') {
      return validTodayBookings.filter((b) => b.status !== 'attended' && (b.status as any) !== 'completed');
    }
    if (todayBookingFilter === 'attended') {
      return validTodayBookings.filter((b) => b.status === 'attended' || (b.status as any) === 'completed');
    }
    return validTodayBookings;
  }, [validTodayBookings, todayBookingFilter]);

  // Detected active therapy slot booking for selected patient
  const matchedBooking = useMemo<TherapyBookingItem | null>(() => {
    if (!selectedPatient || !data) return null;
    return (
      validTodayBookings.find(
        (b) =>
          b.patientId === selectedPatient.id &&
          b.status !== 'attended' &&
          (b.status as any) !== 'completed' &&
          b.status !== 'cancelled',
      ) || null
    );
  }, [selectedPatient, validTodayBookings]);

  // Detected active consultation booking for selected patient
  const matchedConsultationBooking = useMemo<TodayConsultationBookingItem | null>(() => {
    if (!selectedPatient || !data?.todayConsultationBookings) return null;
    return (
      data.todayConsultationBookings.find(
        (b) =>
          b.patientId === selectedPatient.id &&
          b.status !== 'completed' &&
          b.status !== 'cancelled',
      ) || null
    );
  }, [selectedPatient, data?.todayConsultationBookings]);

  // Live forecast punctuality for selected patient
  const forecastPunctuality = useMemo(() => {
    const timeToEvaluate = customToldTime.trim() || matchedBooking?.toldTime;
    if (!timeToEvaluate) return null;
    return calculatePunctuality(timeToEvaluate, new Date());
  }, [customToldTime, matchedBooking]);

  // Check if the selected patient already has an active visit today (cannot re-check in until checkout!)
  const activeExistingVisit = useMemo(() => {
    if (!selectedPatient || !data?.recentCheckIns) return null;
    return (
      data.recentCheckIns.find(
        (v) =>
          (v.patientId === selectedPatient.id || v.patient?.id === selectedPatient.id) &&
          v.status !== 'checked_out' &&
          v.status !== 'completed' &&
          v.status !== 'cancelled',
      ) || null
    );
  }, [selectedPatient, data?.recentCheckIns]);

  // Handle Cancel Booking directly from Check-In view with Shadcn AlertDialog confirmation
  const handleCancelBooking = (bookingId: string) => {
    setBookingToCancel({ id: bookingId });
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    const bookingId = bookingToCancel.id;
    setBookingToCancel(null);

    // Optimistically remove from state so matchedBooking disappears instantly
    setData((prev) =>
      prev
        ? {
            ...prev,
            todayBookings: prev.todayBookings.filter((b) => b.id !== bookingId),
          }
        : prev,
    );
    try {
      const res = await deleteTherapyBookingAction(bookingId);
      if (res.success) {
        toast.success(
          isBn
            ? 'থেরাপি বুকিং সফলভাবে বাতিল করা হয়েছে'
            : 'Therapy booking cancelled successfully',
        );
        loadData();
      } else {
        toast.error(res.error || (isBn ? 'বুকিং বাতিল ব্যর্থ' : 'Failed to cancel booking'));
        loadData();
      }
    } catch (err: any) {
      toast.error(err?.message || (isBn ? 'বুকিং বাতিল ব্যর্থ' : 'Failed to cancel booking'));
      loadData();
    }
  };

  // Handle Check-In Submission
  const handlePerformCheckIn = (targetPatientId?: string, bookingId?: string, toldTimeOverride?: string) => {
    const pId = targetPatientId || selectedPatient?.id;
    if (!pId) {
      toast.error(isBn ? 'অনুগ্রহ করে রোগী নির্বাচন করুন' : 'Please select a patient first');
      return;
    }

    // Guard: Prevent re-checkin until previous visit is checked out
    const existingActive = (data?.recentCheckIns || []).find(
      (v) =>
        (v.patientId === pId || v.patient?.id === pId) &&
        v.status !== 'checked_out' &&
        v.status !== 'completed' &&
        v.status !== 'cancelled',
    );
    if (existingActive) {
      toast.error(
        isBn
          ? `এই রোগী ইতিমধ্যে আজ চেক-ইন আছেন (আগমনের সময়: ${new Date(existingActive.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})। পুনরায় চেক-ইন করার পূর্বে আগের ভিজিট চেক-আউট সম্পন্ন করতে হবে।`
          : `Patient is already checked in (Arrival: ${new Date(existingActive.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Must checkout previous visit before re-checking in.`,
      );
      return;
    }

    const effectiveBooking = bookingId
      ? validTodayBookings.find((b) => b.id === bookingId)
      : matchedBooking;
    const hasTherapySlot = Boolean(effectiveBooking);
    const effectiveTold = toldTimeOverride || customToldTime.trim() || effectiveBooking?.toldTime || undefined;

    startTransition(async () => {
      try {
        const res = await checkInPatientAction({
          patientId: pId,
          destination: hasTherapySlot ? 'therapy' : 'waiting_room',
          priority,
          toldTime: effectiveTold,
          therapyBookingId: effectiveBooking?.id || undefined,
          notes: notes.trim() || undefined,
        });

        toast.success(
          hasTherapySlot
            ? (isBn
                ? `চেক-ইন সম্পন্ন! (${res.tokenSlip?.time ? new Date(res.tokenSlip.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}) থেরাপি কিউ-তে যুক্ত করা হয়েছে।`
                : `Checked in & queued for therapy!`)
            : (isBn
                ? `চেক-ইন সম্পন্ন! (${res.tokenSlip?.time ? new Date(res.tokenSlip.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}) রোগীকে ওয়েটিং রুমে পাঠানো হয়েছে।`
                : `Checked in to waiting room!`),
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

  // Format minutes into human-readable hours and minutes (e.g. 4h 32m instead of 272m)
  const formatMinutes = (mins: number) => {
    const abs = Math.abs(mins);
    if (abs < 60) {
      return isBn ? `${toBnNum(abs)} মি.` : `${abs}m`;
    }
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    if (m === 0) {
      return isBn ? `${toBnNum(h)} ঘণ্টা` : `${h}h`;
    }
    return isBn ? `${toBnNum(h)} ঘণ্টা ${toBnNum(m)} মি.` : `${h}h ${m}m`;
  };

  // Helper renderer for priority badge with high-contrast colors for internal dashboard
  const renderPriorityBadge = (p?: string | null) => {
    if (p === 'emergency') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40 animate-pulse shadow-xs">
          <Flame className="w-3 h-3 text-rose-500 shrink-0" />
          <span>{isBn ? 'জরুরি' : 'Emergency'}</span>
        </span>
      );
    }
    if (p === 'vip') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 shadow-xs">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span>{isBn ? 'ভিআইপি' : 'VIP'}</span>
        </span>
      );
    }
    return null;
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
      let text = isBn ? '🟢 যথাসময়ে' : '🟢 On Time';
      if (delay < -5) {
        text = isBn
          ? `🟢 যথাসময়ে (${formatMinutes(delay)} আগে)`
          : `🟢 On Time (${formatMinutes(delay)} early)`;
      } else if (delay > 0) {
        text = isBn
          ? `🟢 যথাসময়ে (+${formatMinutes(delay)})`
          : `🟢 On Time (+${formatMinutes(delay)})`;
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {text}
        </span>
      );
    }

    if (status === 'moderate_delay') {
      const delay = delayMinutes ?? 0;
      const text = isBn ? `🟡 মাঝারি দেরি (+${formatMinutes(delay)})` : `🟡 Late (+${formatMinutes(delay)})`;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          {text}
        </span>
      );
    }

    if (status === 'critical_delay') {
      const delay = delayMinutes ?? 0;
      const text = isBn ? `🔴 অতিরিক্ত বিলম্ব (+${formatMinutes(delay)})` : `🔴 Severe Delay (+${formatMinutes(delay)})`;
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
                {toBnNum(validTodayBookings.filter((b) => b.status !== 'attended').length)}
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
            <TabsTrigger
              value="therapy_queue"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isBn ? 'থেরাপি কিউ ও ডাকুন' : 'Therapy Queue & Call'}</span>
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
                  {isBn ? '১. রোগী অনুসন্ধান (নাম, ফোন বা রেজি নম্বর)' : '1. Search Patient (Name, Phone or MRN)'}
                </Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isBn ? 'রোগীর নাম, ফোন নম্বর বা রেজি নম্বর লিখুন...' : 'Search Name, Phone, or MRN...'
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

              {/* Selected Patient Banner with 3-Tier Recognition */}
              {selectedPatient ? (
                <div
                  className={`p-3.5 rounded-xl border space-y-3 transition-all ${
                    selectedClinicalStatus?.patientType === 'lapsed_reintake'
                      ? 'border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/30'
                      : selectedClinicalStatus?.patientType === 'brand_new'
                      ? 'border-blue-500/50 bg-blue-500/10 dark:bg-blue-950/30'
                      : 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-foreground">{isBn ? 'নির্বাচিত রোগী' : 'Selected Patient'}</span>
                      </span>

                      {/* 3-Tier Patient Recognition Badge */}
                      {loadingClinicalStatus ? (
                        <Badge variant="outline" className="text-[10px] animate-pulse">
                          {isBn ? 'স্ট্যাটাস যাচাই...' : 'Checking status...'}
                        </Badge>
                      ) : isLegacyPatient ? (
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[10px] shadow-2xs gap-1">
                          <FolderArchive className="size-3" />
                          <span>
                            {isBn ? 'পুরাতন ফাইল রোগী' : 'Legacy Paper Patient'}
                            {legacyFileInfo.fileNo ? ` (#${legacyFileInfo.fileNo})` : ''}
                          </span>
                        </Badge>
                      ) : selectedClinicalStatus?.patientType === 'brand_new' ? (
                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-bold text-[10px] shadow-2xs gap-1">
                          <span className="size-1.5 rounded-full bg-white animate-ping" />
                          <span>{isBn ? 'নতুন রোগী' : 'Brand New Patient'}</span>
                        </Badge>
                      ) : selectedClinicalStatus?.patientType === 'lapsed_reintake' ? (
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-[10px] shadow-2xs gap-1">
                          <AlertTriangle className="size-3" />
                          <span>{isBn ? '৩+ মাস নিষ্ক্রিয় (রি-ইনটেক)' : 'Lapsed (>3m Re-Intake)'}</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[10px] shadow-2xs gap-1">
                          <Check className="size-3" />
                          <span>
                            {selectedClinicalStatus?.daysSinceLastActivity
                              ? (isBn ? `পুরাতন রোগী (${selectedClinicalStatus.daysSinceLastActivity} দিন পূর্বে)` : `Active (${selectedClinicalStatus.daysSinceLastActivity}d ago)`)
                              : (isBn ? 'পুরাতন রোগী (নিয়মিত)' : 'Active Patient')}
                          </span>
                        </Badge>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSelectedClinicalStatus(null);
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

                  {/* Recognition Advisory Alerts */}
                  {isLegacyPatient ? (
                    <Alert variant="warning" className="p-2.5 text-xs border-amber-500/40 bg-amber-500/10">
                      <FolderArchive className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <AlertTitle className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <span>{isBn ? 'পুরাতন পেপার ফাইল বিদ্যমান (ইনটেক পূরণ আবশ্যক নয়)' : 'Legacy Paper File on Record (Intake Bypassed)'}</span>
                          {legacyFileInfo.fileNo && (
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-900 dark:text-amber-100 font-bold">
                              #{legacyFileInfo.fileNo}
                            </span>
                          )}
                        </AlertTitle>
                        <AlertDescription className="text-[11px] text-amber-700/90 dark:text-amber-300/90">
                          {isBn
                            ? 'এই রোগীর পূর্ববর্তী চিকিৎসার ইতিহাস ক্লিনিকের পেপার ফাইলে সংরক্ষিত আছে। ডিজিটাল ইনটেক ফরম পূরণ করা বাধ্যতামূলক নয়—আপনি সরাসরি ডাক্তার সিরিয়াল বা থেরাপিতে চেক-ইন করাতে পারেন।'
                            : 'Medical history is already documented in physical clinic files. Digital intake form is optional; proceed directly to consultation or therapy.'}
                        </AlertDescription>
                      </div>
                    </Alert>
                  ) : selectedClinicalStatus?.patientType === 'brand_new' ? (
                    <Alert variant="info" className="p-2.5 text-xs">
                      <Sparkles className="size-3.5 text-sky-500 shrink-0" />
                      <div className="space-y-0.5">
                        <AlertTitle className="text-xs font-semibold">
                          {isBn ? 'নতুন রোগীর প্রাথমিক তথ্য পূরণ আবশ্যক' : 'New Patient Intake Form Required'}
                        </AlertTitle>
                        <AlertDescription className="text-[11px] opacity-90">
                          {isBn
                            ? 'এই রোগীর কোনো পূর্ববর্তী ইনটেক বা কনসালটেশন রেকর্ড নেই। ডাক্তার দেখানোর পূর্বে রিসেপশন ইনটেক ফরম পূরণ করুন।'
                            : 'Patient has no previous intake or consultation history. Please fill initial intake form.'}
                        </AlertDescription>
                      </div>
                    </Alert>
                  ) : null}

                  {selectedClinicalStatus?.patientType === 'lapsed_reintake' && (
                    <Alert variant="warning" className="p-2.5 text-xs">
                      <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="space-y-0.5">
                        <AlertTitle className="text-xs font-bold flex items-center gap-1.5">
                          <span>{isBn ? '৩+ মাস বিরতি — পুনর্বার মূল্যায়ন প্রয়োজন' : '3+ Months Inactivity — Re-Intake Required'}</span>
                          {selectedClinicalStatus.daysSinceLastActivity && (
                            <span className="font-mono text-[10px] px-1 rounded bg-amber-500/20">
                              {selectedClinicalStatus.daysSinceLastActivity} {isBn ? 'দিন' : 'days'}
                            </span>
                          )}
                        </AlertTitle>
                        <AlertDescription className="text-[11px] opacity-90">
                          {isBn
                            ? 'রোগী ৩ মাসের অধিক সময় পর সেন্টারে এসেছেন। পূর্বের তথ্য সিস্টেমে সংরক্ষিত আছে—অনুগ্রহ করে আজকের নতুন ভাইটালস ও বর্তমান সমস্যার জন্য পুনর্বার মূল্যায়ন ফরম পূরণ করুন।'
                            : 'Patient returned after >90 days gap. System demographic data exists; please complete re-intake with today’s vitals.'}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}

                  {/* Quick Patient Actions: Intake Form & Timeline */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-border/40">
                    {Boolean(
                      selectedClinicalStatus?.intakeCompletedToday ||
                      (selectedPatient && savedIntakePatientIds.has(selectedPatient.id))
                    ) ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsIntakeFormOpen(true)}
                        className="h-7 px-2.5 text-xs font-semibold text-white gap-1.5 rounded-lg shadow-2xs bg-emerald-600 hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isBn ? '✓ ইনটেক ফরম সম্পন্ন (দেখুন/এডিট)' : '✓ Intake Completed (View/Edit)'}</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsIntakeFormOpen(true)}
                        className={`h-7 px-2.5 text-xs font-semibold text-white gap-1.5 rounded-lg shadow-2xs ${
                          selectedClinicalStatus?.patientType === 'lapsed_reintake'
                            ? 'bg-amber-600 hover:bg-amber-500'
                            : selectedClinicalStatus?.patientType === 'brand_new'
                            ? 'bg-blue-600 hover:bg-blue-500'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {selectedClinicalStatus?.patientType === 'lapsed_reintake'
                            ? (isBn ? '৩+ মাস পর পুনর্বার মূল্যায়ন ফরম' : 'Re-Intake Assessment Form')
                            : selectedClinicalStatus?.patientType === 'brand_new'
                            ? (isBn ? 'প্রাথমিক তথ্য ফরম পূরণ করুন' : 'Fill Initial Intake Form')
                            : (isBn ? 'রোগীর তথ্য ফরম' : 'Patient Intake Form')}
                        </span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTimelinePatient({ id: selectedPatient.id, name: selectedPatient.nameBn || selectedPatient.nameEn });
                        setIsTimelineOpen(true);
                      }}
                      className="h-7 px-2.5 text-xs font-medium border-border/80 gap-1.5 rounded-lg text-foreground hover:bg-muted/40"
                    >
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{isBn ? 'টাইমলাইন' : 'Timeline'}</span>
                    </Button>
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
              {/* Section 2: Destination & Queue Auto-Routing Protocol */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    {isBn ? '২. চেক-ইন গন্তব্য ও কিউ প্রোটোকল' : '2. Destination & Queue Protocol'}
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {matchedBooking
                      ? (isBn ? '🟢 থেরাপি কিউ নির্ধারিত' : '🟢 Therapy Queue')
                      : matchedConsultationBooking
                      ? (isBn ? '🔵 অপেক্ষাগার (কনসালটেশন বুকড)' : '🔵 Waiting Room (Consultation Booked)')
                      : (isBn ? '⚪ ওয়েটিং রুম চেক-ইন' : '⚪ Waiting Room')}
                  </span>
                </div>

                {!selectedPatient ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {isBn
                        ? 'রোগীর কিউ ও আগমন গন্তব্য দেখতে বাম পাশ থেকে রোগী নির্বাচন করুন।'
                        : 'Select a patient from the search panel on the left to see their check-in route.'}
                    </p>
                  </div>
                ) : matchedBooking ? (
                  /* Case 1: Active Today's Therapy Slot Found -> Auto Therapy Queue */
                  <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/15 space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            {isBn ? 'স্বয়ংক্রিয় থেরাপি কিউ' : 'Automatic Therapy Queue Entry'}
                            <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white font-mono px-1.5 py-0">
                              {isBn ? 'স্লট নিশ্চিত' : 'Active Slot'}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                            {isBn
                              ? `নির্ধারিত স্লট সময়: ${matchedBooking.slotHour}`
                              : `Booked Slot: ${matchedBooking.slotHour}`}
                          </div>
                        </div>
                      </div>

                      {/* Instant Cancel Booking Button directly on the card */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelBooking(matchedBooking.id)}
                        disabled={isPending}
                        className="h-7 px-2.5 text-xs font-medium border-rose-500/40 text-rose-600 hover:text-rose-700 hover:bg-rose-500/15 dark:hover:bg-rose-500/20 rounded-lg cursor-pointer transition-all active:scale-95 shadow-2xs gap-1"
                        title={isBn ? 'এই থেরাপি স্লট বুকিং বাতিল করুন' : 'Cancel this therapy slot booking'}
                      >
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>{isBn ? 'বুকিং বাতিল করুন' : 'Cancel Slot'}</span>
                      </Button>
                    </div>

                    <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-[11px]">
                          {isBn ? 'নির্ধারিত সময়:' : 'Told Time:'}
                        </span>
                        <strong className="font-mono text-foreground font-bold">
                          {matchedBooking.toldTime || (isBn ? 'নির্দিষ্ট নয়' : 'Not set')}
                        </strong>
                      </div>
                      {forecastPunctuality && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-[11px]">
                            {isBn ? 'সম্ভাব্য সময়ানুবর্তিতা:' : 'Punctuality:'}
                          </span>
                          {renderPunctualityBadge(forecastPunctuality.status, forecastPunctuality.delayMinutes)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : matchedConsultationBooking ? (
                  /* Case 2: Consultation Serial Found (No Therapy Slot) -> Waiting Room Check-in */
                  <div className="p-3.5 sm:p-4 rounded-xl border border-sky-500/40 bg-sky-500/10 dark:bg-sky-500/15 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                            {isBn ? 'অপেক্ষাগার চেক-ইন' : 'Waiting Room Arrival (Consultation)'}
                            <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-300 font-mono">
                              {matchedConsultationBooking.slotTime}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-sky-700/80 dark:text-sky-300/80">
                            {matchedConsultationBooking.doctor?.fullName || (isBn ? 'ডাক্তার চেম্বার' : 'Doctor Chamber')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-sky-500/20">
                      {isBn
                        ? 'রোগীর আজকের ডাক্তার কনসালটেশন স্লট বুক করা রয়েছে। ক্লিনিক প্রোটোকল অনুযায়ী চেক-ইনের পর রোগী ওয়েটিং রুমে অবস্থান করবেন। ক্যাশ কাউন্টার/অভ্যর্থনা থেকে পেমেন্ট গ্রহণের পর তাকে ডাক্তার কিউ-তে পাঠানো হবে (চেক-ইন থেকে সরাসরি ডাক্তার কিউতে পাঠানো নিষিদ্ধ)।'
                        : 'Patient has a booked consultation slot. Upon check-in, patient waits in the waiting room. Reception/cashier will dispatch them to the doctor queue after fee collection.'}
                    </p>
                  </div>
                ) : (
                  /* Case 3: Walk-in Patient (No Therapy Slot, No Consultation Booking) */
                  <div className="p-3.5 sm:p-4 rounded-xl border border-slate-500/30 bg-muted/30 dark:bg-muted/20 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          {isBn ? 'সাধারণ ক্লিনিক চেক-ইন' : 'General Walk-In Check-In'}
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {isBn ? 'ওয়েটিং রুম' : 'Waiting Room'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {isBn
                            ? 'রোগীর কোনো থেরাপি স্লট নেই। আগমন স্লিপ ইস্যু করে রোগীকে ওয়েটিং রুমে পাঠানো হবে। কোনো কিউ-তে অটো-এন্ট্রি হবে না।'
                            : 'Patient has no active therapy slot. Arrival slip will be issued to the waiting room. No queue auto-entry.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Told Time & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {isBn ? 'নির্ধারিত সময় (ঐচ্ছিক)' : 'Told Time (Optional)'}
                  </Label>
                  <Input
                    type="text"
                    placeholder={matchedBooking?.toldTime ? matchedBooking.toldTime : "e.g. 10:30 AM or 14:15"}
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
                    {isBn ? 'অগ্রাধিকার' : 'Priority'}
                  </Label>
                  <Select value={priority} onValueChange={(v: string) => setPriority(v as any)}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">{isBn ? 'সাধারণ' : 'Normal'}</SelectItem>
                      <SelectItem value="emergency">{isBn ? '🚨 জরুরি' : '🚨 Emergency'}</SelectItem>
                      <SelectItem value="vip">{isBn ? '⭐ ভিআইপি' : '⭐ VIP'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live Forecast Preview if custom told time entered without matched booking */}
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
                {activeExistingVisit && (
                  <div className="mb-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{isBn ? 'এই রোগী ইতিমধ্যে চেক-ইন আছেন' : 'Patient Already Checked In'}</span>
                        <span className="font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(activeExistingVisit.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                      <div className="text-[11px] leading-relaxed">
                        {isBn
                          ? `বর্তমান অবস্থান: ${getLocationDisplay(activeExistingVisit.currentLocation, activeExistingVisit.status).label} • বর্তমান ভিজিট সম্পন্ন বা চেক-আউট না করা পর্যন্ত পুনরায় চেক-ইন করা যাবে না।`
                          : `Current Location: ${getLocationDisplay(activeExistingVisit.currentLocation, activeExistingVisit.status).label} • Must checkout or complete active visit before re-checking in.`}
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Button 1: General / Detected Check-In */}
                  <Button
                    type="button"
                    onClick={() => handlePerformCheckIn()}
                    disabled={!selectedPatient || isPending || Boolean(activeExistingVisit)}
                    className={`h-11 sm:h-12 text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all rounded-xl ${
                      activeExistingVisit
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-75'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-emerald-500/15'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span className="truncate">{isBn ? 'প্রক্রিয়াধীন...' : 'Processing...'}</span>
                      </>
                    ) : activeExistingVisit ? (
                      <>
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="truncate">{isBn ? 'ইতিমধ্যে চেক-ইন' : 'Already In'}</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {matchedBooking
                            ? (isBn ? 'চেক-ইন ও থেরাপি কিউ' : 'Check-In & Therapy')
                            : (isBn ? 'ওয়েটিং রুমে চেক-ইন' : 'Waiting Room Check-In')}
                        </span>
                      </>
                    )}
                  </Button>

                  {/* Button 2: Instant Doctor Consultation Serial & Check-In */}
                  <Button
                    type="button"
                    onClick={() => {
                      if (!selectedPatient) {
                        toast.error(isBn ? 'অনুগ্রহ করে প্রথমে একজন রোগী নির্বাচন করুন' : 'Please select a patient first');
                        return;
                      }
                      if (activeExistingVisit) {
                        toast.error(isBn ? 'এই রোগী ইতিমধ্যে আজ চেক-ইন আছেন' : 'Patient already checked in today');
                        return;
                      }
                      setIsInstantConsultationOpen(true);
                    }}
                    disabled={!selectedPatient || Boolean(activeExistingVisit)}
                    className={`h-11 sm:h-12 text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all rounded-xl ${
                      activeExistingVisit || !selectedPatient
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 shadow-blue-500/15'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 shrink-0 text-blue-200" />
                    <span className="truncate">
                      {isBn ? 'ডাক্তার সিরিয়াল ও চেক-ইন' : 'Consultation & Check-In'}
                    </span>
                  </Button>

                  {/* Button 3: Instant Therapy Slot & Check-In */}
                  <Button
                    type="button"
                    onClick={() => {
                      if (!selectedPatient) {
                        toast.error(isBn ? 'অনুগ্রহ করে প্রথমে একজন রোগী নির্বাচন করুন' : 'Please select a patient first');
                        return;
                      }
                      if (activeExistingVisit) {
                        toast.error(isBn ? 'এই রোগী ইতিমধ্যে আজ চেক-ইন আছেন' : 'Patient already checked in today');
                        return;
                      }
                      setIsInstantTherapyOpen(true);
                    }}
                    disabled={!selectedPatient || Boolean(activeExistingVisit)}
                    className={`h-11 sm:h-12 text-xs sm:text-sm font-bold gap-2 shadow-sm transition-all rounded-xl ${
                      activeExistingVisit || !selectedPatient
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                        : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer active:scale-95 shadow-teal-500/15'
                    }`}
                  >
                    <Activity className="w-4 h-4 shrink-0 text-teal-200" />
                    <span className="truncate">
                      {isBn ? 'থেরাপি স্লট ও চেক-ইন' : 'Therapy Slot & Check-In'}
                    </span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 2: TODAY'S BOOKED THERAPY SLOTS                           */}
        {/* ============================================================== */}
        <TabsContent value="today_bookings" className="mt-4 focus-visible:outline-none space-y-3">
          <Card className="p-4 rounded-2xl border border-border/50 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60 self-start sm:self-auto">
                <Button
                  type="button"
                  variant={todayBookingFilter === 'pending' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTodayBookingFilter('pending')}
                  className={`h-7 px-2.5 text-xs rounded-lg transition-all ${
                    todayBookingFilter === 'pending'
                      ? 'bg-background text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{isBn ? 'অপেক্ষমাণ' : 'Pending'}</span>
                  <span className="ml-1 text-[10px] font-mono opacity-80">
                    ({toBnNum(validTodayBookings.filter((b) => b.status !== 'attended').length)})
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={todayBookingFilter === 'attended' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTodayBookingFilter('attended')}
                  className={`h-7 px-2.5 text-xs rounded-lg transition-all ${
                    todayBookingFilter === 'attended'
                      ? 'bg-background text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{isBn ? 'উপস্থিত' : 'Attended'}</span>
                  <span className="ml-1 text-[10px] font-mono opacity-80">
                    ({toBnNum(validTodayBookings.filter((b) => b.status === 'attended').length)})
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={todayBookingFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTodayBookingFilter('all')}
                  className={`h-7 px-2.5 text-xs rounded-lg transition-all ${
                    todayBookingFilter === 'all'
                      ? 'bg-background text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{isBn ? 'সকল' : 'All'}</span>
                  <span className="ml-1 text-[10px] font-mono opacity-80">
                    ({toBnNum(validTodayBookings.length)})
                  </span>
                </Button>
              </div>
            </div>

            {displayedTodayBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <div>
                  {todayBookingFilter === 'pending'
                    ? isBn
                      ? 'আজকের জন্য কোনো অপেক্ষমাণ বুকিং নেই'
                      : 'No pending bookings remaining for today'
                    : todayBookingFilter === 'attended'
                    ? isBn
                      ? 'আজকে এখনও কোনো বুকিং উপস্থিত হয়নি'
                      : 'No bookings marked attended yet today'
                    : isBn
                    ? 'আজকের জন্য কোনো থেরাপি স্লট বুকিং নেই'
                    : 'No therapy bookings scheduled for today'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {displayedTodayBookings.map((b) => {
                  const isAttended = b.status === 'attended';
                  const liveForecast = !isAttended && b.toldTime ? calculatePunctuality(b.toldTime, new Date()) : null;
                  const existingActiveVisit = (data?.recentCheckIns || []).find(
                    (v) =>
                      (v.patientId === b.patientId || v.patient?.id === b.patientId) &&
                      v.status !== 'checked_out' &&
                      v.status !== 'completed' &&
                      v.status !== 'cancelled',
                  );
                  const isPatientCheckedIn = Boolean(existingActiveVisit);

                  return (
                    <div
                      key={b.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                        isAttended
                          ? 'border-border/40 bg-muted/20 opacity-80'
                          : isPatientCheckedIn
                          ? 'border-amber-500/40 bg-amber-500/5 shadow-2xs'
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
                          ) : isPatientCheckedIn ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                              {isBn ? 'ইতিমধ্যে চেক-ইন' : 'Checked In'}
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

                      {/* 1-click Check-In Button + Cancel Button */}
                      {!isAttended && (
                        <div className="flex items-center gap-2 pt-1">
                          {isPatientCheckedIn ? (
                            <div className="flex-1 h-8 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 px-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">
                                {isBn ? 'ইতিমধ্যে চেক-ইন আছেন' : 'Already Checked In'}
                              </span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handlePerformCheckIn(b.patientId, b.id, b.toldTime || undefined)}
                              disabled={isPending}
                              className="flex-1 h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer active:scale-95"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{isBn ? 'এখনই চেক-ইন করুন' : 'Check In Now'}</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={isPending}
                            className="h-8 px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 gap-1 cursor-pointer active:scale-95"
                            title={isBn ? 'বুকিং বাতিল করুন' : 'Cancel Booking'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isBn ? 'বাতিল' : 'Cancel'}</span>
                          </Button>
                        </div>
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
                <div>{isBn ? 'সকল রোগীকে সেবা প্রদান করা হয়েছে' : 'All checked-in therapy patients have been attended'}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[...(data?.liveTherapyQueue || [])]
                  .sort((a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime())
                  .map((item, idx) => (
                  <div
                    key={item.visitId}
                    className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-emerald-500/50 shadow-2xs flex flex-col justify-between space-y-2.5 transition-all"
                  >
                    <div>
                      {/* Top Header: Index & Arrival Time */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                          {isBn ? 'রোগী' : 'Patient'} #{toBnNum(idx + 1)}
                        </span>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
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
                            serialNumber: item.tokenNumber,
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
                        <span>{isBn ? 'স্লিপ প্রিন্ট' : 'Print Slip'}</span>
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
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'আগমনের সময়' : 'Arrival Time'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'রোগীর বিবরণ' : 'Patient Info'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'গন্তব্য' : 'Destination'}</th>
                      <th className="py-2.5 px-3 font-semibold">{isBn ? 'সময়ানুবর্তিতা মার্কার' : 'Punctuality Marker'}</th>
                      <th className="py-2.5 px-3 font-semibold text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[...(data?.recentCheckIns || [])]
                      .sort((a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime())
                      .map((v) => (
                      <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(v.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {renderPriorityBadge(v.priority)}
                          </div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setTimelinePatient({
                                  id: v.patientId || v.patient?.id,
                                  name: isBn ? v.patient?.nameBn || v.patient?.nameEn : v.patient?.nameEn,
                                  mrn: v.patient?.mrn,
                                  phone: v.patient?.phone,
                                });
                                setIsTimelineOpen(true);
                              }}
                              className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                              title={isBn ? 'রোগীর টাইমলাইন দেখুন' : 'View Patient Timeline'}
                            >
                              <Clock className="w-3 h-3 text-emerald-500" />
                              <span>{isBn ? 'টাইমলাইন' : 'Timeline'}</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSlipModalData({
                                  tokenNumber: v.tokenNumber,
                                  serialNumber: v.serialNumber || v.tokenNumber,
                                  patientName: isBn ? v.patient?.nameBn || v.patient?.nameEn : v.patient?.nameEn,
                                  mrn: v.patient?.mrn || '',
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* TAB 5: THERAPY QUEUE & CALLING                                 */}
        {/* ============================================================== */}
        <TabsContent value="therapy_queue" className="mt-4 focus-visible:outline-none space-y-3">
          <TherapyQueueManagementTab />
        </TabsContent>
      </Tabs>

      {/* ============================================================== */}
      {/* LIVE CHECKED-IN PATIENTS & REALTIME LOCATIONS SECTION          */}
      {/* ============================================================== */}
      <div className="mt-8 space-y-4">
        <Card className="p-4 sm:p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-card to-card/90 shadow-md">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>
                    {isBn
                      ? 'আজকের সকল উপস্থিত রোগী ও রিয়েলটাইম অবস্থান'
                      : 'Live Checked-in Patients & Current Locations'}
                  </span>
                </h2>
                <Badge
                  variant="outline"
                  className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/5"
                >
                  {toBnNum(data?.recentCheckIns?.length || 0)} {isBn ? 'জন উপস্থিত' : 'Checked In'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'রিয়েলটাইম সিঙ্ক চালু • হাসপাতালে সেবা নিতে আগত প্রতিটি রোগীর বর্তমান অবস্থান ও অগ্রগতি'
                  : 'Realtime Sync Active • Current patient locations and live workflow progress across clinic'}
              </p>
            </div>

            {/* Search Input */}
            <div className="w-full md:w-72">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={
                    isBn
                      ? 'নাম, ফোন বা রেজি নম্বর...'
                      : 'Search by name, phone or MRN...'
                  }
                  value={liveSearchQuery}
                  onChange={(e) => setLiveSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 bg-background/80"
                />
                {liveSearchQuery && (
                  <button
                    onClick={() => setLiveSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Location Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Button
              type="button"
              variant={liveLocationFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiveLocationFilter('all')}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              <span>{isBn ? 'সকল' : 'All'}</span>
              <span className="ml-1 opacity-80 font-mono text-[10px]">
                ({toBnNum(data?.recentCheckIns?.length || 0)})
              </span>
            </Button>
            <Button
              type="button"
              variant={liveLocationFilter === 'waiting' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiveLocationFilter('waiting')}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              <Clock className="w-3 h-3 mr-1 text-purple-500" />
              <span>{isBn ? 'ওয়েটিং রুম' : 'Waiting Room'}</span>
              <span className="ml-1 opacity-80 font-mono text-[10px]">
                (
                {toBnNum(
                  (data?.recentCheckIns || []).filter(
                    (v) => getLocationDisplay(v.currentLocation, v.status).category === 'waiting',
                  ).length,
                )}
                )
              </span>
            </Button>
            <Button
              type="button"
              variant={liveLocationFilter === 'doctor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiveLocationFilter('doctor')}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              <Stethoscope className="w-3 h-3 mr-1 text-emerald-500" />
              <span>{isBn ? 'ডাক্তার চেম্বার' : 'Doctor Chamber'}</span>
              <span className="ml-1 opacity-80 font-mono text-[10px]">
                (
                {toBnNum(
                  (data?.recentCheckIns || []).filter(
                    (v) => getLocationDisplay(v.currentLocation, v.status).category === 'doctor',
                  ).length,
                )}
                )
              </span>
            </Button>
            <Button
              type="button"
              variant={liveLocationFilter === 'therapy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiveLocationFilter('therapy')}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              <Activity className="w-3 h-3 mr-1 text-teal-500" />
              <span>{isBn ? 'থেরাপি হল' : 'Therapy Hall'}</span>
              <span className="ml-1 opacity-80 font-mono text-[10px]">
                (
                {toBnNum(
                  (data?.recentCheckIns || []).filter(
                    (v) => getLocationDisplay(v.currentLocation, v.status).category === 'therapy',
                  ).length,
                )}
                )
              </span>
            </Button>
            <Button
              type="button"
              variant={liveLocationFilter === 'cashier' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiveLocationFilter('cashier')}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
              <span>{isBn ? 'ক্যাশ কাউন্টার' : 'Cashier'}</span>
              <span className="ml-1 opacity-80 font-mono text-[10px]">
                (
                {toBnNum(
                  (data?.recentCheckIns || []).filter(
                    (v) => getLocationDisplay(v.currentLocation, v.status).category === 'cashier',
                  ).length,
                )}
                )
              </span>
            </Button>
            <Button
              type="button"
              variant={liveLocationFilter === 'reception' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiveLocationFilter('reception')}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              <Building2 className="w-3 h-3 mr-1 text-sky-500" />
              <span>{isBn ? 'রিসেপশন' : 'Reception'}</span>
              <span className="ml-1 opacity-80 font-mono text-[10px]">
                (
                {toBnNum(
                  (data?.recentCheckIns || []).filter(
                    (v) => getLocationDisplay(v.currentLocation, v.status).category === 'reception',
                  ).length,
                )}
                )
              </span>
            </Button>
            <Button
              type="button"
              variant={liveLocationFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLiveLocationFilter('completed')}
              className="h-7 text-xs rounded-lg px-2.5"
            >
              <CheckCircle2 className="w-3 h-3 mr-1 text-zinc-500" />
              <span>{isBn ? 'সেবা সম্পন্ন' : 'Completed'}</span>
              <span className="ml-1 opacity-80 font-mono text-[10px]">
                (
                {toBnNum(
                  (data?.recentCheckIns || []).filter(
                    (v) => getLocationDisplay(v.currentLocation, v.status).category === 'completed',
                  ).length,
                )}
                )
              </span>
            </Button>
          </div>

          {/* Cards Grid */}
          {filteredCheckedInPatients.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/80 bg-background/50">
              <UserCheck className="size-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                {liveSearchQuery || liveLocationFilter !== 'all'
                  ? isBn
                    ? 'ফিল্টারের সাথে মেলে এমন কোনো রোগী পাওয়া যায়নি'
                    : 'No patients match the selected filter'
                  : isBn
                  ? 'আজকে এখনো কোনো রোগী উপস্থিত বা চেক-ইন হননি'
                  : 'No patients checked in yet today'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isBn
                  ? 'রোগী আগমন করলে উপরে ১-ক্লিকে চেক-ইন সম্পন্ন করুন'
                  : 'Use the check-in form above to check in arriving patients'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredCheckedInPatients.map((v) => {
                const locInfo = getLocationDisplay(v.currentLocation, v.status);
                const LocIcon = locInfo.icon;
                const patientName =
                  (isBn
                    ? v.patient?.nameBn || v.patient?.nameEn
                    : v.patient?.nameEn || v.patient?.nameBn) || 'Patient';

                return (
                  <div
                    key={v.id}
                    className="group rounded-xl border border-border/80 hover:border-emerald-500/50 bg-background/90 hover:bg-card/90 transition-all p-3.5 flex flex-col justify-between shadow-xs gap-3"
                  >
                    {/* Top Row: Arrival Time & Current Location Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(v.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        {renderPriorityBadge(v.priority)}
                      </div>

                      <div
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${locInfo.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${locInfo.dotColor} animate-pulse`} />
                        <LocIcon className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{locInfo.label}</span>
                      </div>
                    </div>

                    {/* Middle: Patient Info */}
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground truncate group-hover:text-emerald-500 transition-colors">
                        {patientName}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                        <span>{v.patient?.mrn}</span>
                        <span>•</span>
                        <span>{v.patient?.phone}</span>
                      </div>

                      {v.doctor && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                          <Stethoscope className="w-3 h-3 shrink-0" />
                          <span className="truncate">{v.doctor.fullName}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        {renderPunctualityBadge(v.punctualityStatus, v.delayMinutes, v.toldTime)}
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(v.checkedInAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTimelinePatient({
                            id: v.patientId || v.patient?.id,
                            name: patientName,
                            mrn: v.patient?.mrn,
                            phone: v.patient?.phone,
                          });
                          setIsTimelineOpen(true);
                        }}
                        className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Clock className="w-3 h-3 text-emerald-500" />
                        <span>{isBn ? 'টাইমলাইন' : 'Timeline'}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSlipModalData({
                            tokenNumber: v.tokenNumber,
                            serialNumber: v.serialNumber || v.tokenNumber,
                            patientName: patientName,
                            mrn: v.patient?.mrn || '',
                            destination: v.currentLocation,
                            toldTime: v.toldTime,
                            punctualityStatus: v.punctualityStatus,
                            delayMinutes: v.delayMinutes,
                            date: v.visitDate,
                            time: v.checkedInAt,
                          })
                        }
                        className="h-7 px-2 text-[11px] gap-1 hover:border-emerald-500/50"
                      >
                        <Printer className="w-3 h-3" />
                        <span>{isBn ? 'স্লিপ' : 'Slip'}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* QUICK PATIENT CREATION DIALOG */}
      <CreatePatientDialog
        open={isCreatePatientOpen}
        onOpenChange={setIsCreatePatientOpen}
        onSuccess={(newPatient, isOldPatient) => {
          setSelectedPatient(newPatient);
          setSearchQuery(`${newPatient.nameEn} (${newPatient.mrn})`);
          setIsCreatePatientOpen(false);
          if (isOldPatient) {
            toast.success(
              isBn
                ? `পুরাতন রোগী ${newPatient.nameEn} (${newPatient.mrn}) নিবন্ধিত (ইনটেক ফরম বাদ)!`
                : `Legacy patient ${newPatient.nameEn} (${newPatient.mrn}) registered (Intake bypassed)!`,
            );
          } else {
            toast.success(
              isBn
                ? `রোগী ${newPatient.nameEn} (${newPatient.mrn}) সফলভাবে নিবন্ধিত হয়েছে!`
                : `Patient ${newPatient.nameEn} (${newPatient.mrn}) registered successfully!`,
            );
          }
        }}
      />

      {/* THERMAL 80MM SLIP PREVIEW MODAL */}
      {slipModalData && (
        <Dialog open={!!slipModalData} onOpenChange={(open: boolean) => { if (!open) setSlipModalData(null); }}>
          <DialogContent className="max-w-[340px] sm:max-w-[360px] p-4 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            {/* Embedded 80mm thermal print styles to guarantee STRICT 1-PAGE continuous receipt */}
            <style dangerouslySetInnerHTML={{ __html: `
              @page {
                size: 80mm auto;
                margin: 0mm;
              }
              @media print {
                html,
                body {
                  width: 80mm !important;
                  max-width: 80mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                .dialog-header-actions,
                .print-hidden,
                .print\\:hidden,
                button,
                header,
                nav,
                footer {
                  display: none !important;
                }

                body * {
                  visibility: hidden;
                }

                #hpc-thermal-80mm-slip,
                #hpc-thermal-80mm-slip * {
                  visibility: visible !important;
                }

                [role="dialog"],
                div[class*="fixed inset-0"],
                div[class*="items-center"],
                div[class*="justify-center"] {
                  position: static !important;
                  display: block !important;
                  transform: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                  max-width: none !important;
                  max-height: none !important;
                  width: 80mm !important;
                }

                #hpc-thermal-80mm-slip {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 74mm !important;
                  max-width: 74mm !important;
                  margin: 0 auto !important;
                  padding: 3mm 2mm !important;
                  box-sizing: border-box !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  border: 1px dashed #71717a !important;
                  border-radius: 0 !important;
                  overflow: hidden !important;
                  page-break-after: avoid !important;
                  break-after: avoid !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            ` }} />

            <DialogHeader className="print:hidden print-hidden">
              <DialogTitle className="text-center text-sm font-bold">
                {isBn ? '৮০মিমি আগমন স্লিপ প্রিভিউ' : '80mm Arrival Slip Preview'}
              </DialogTitle>
            </DialogHeader>

            <div
              id="hpc-thermal-80mm-slip"
              className="sheet-thermal-80mm bg-white text-black p-4 rounded-md border border-dashed border-zinc-400 font-mono text-center space-y-2"
            >
              <div className="font-bold text-xs text-zinc-900 leading-tight">
                {isBn ? 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার' : 'HPC Health & Pain Care Center'}
              </div>
              <div className="text-[10px] text-zinc-600">{isBn ? 'চাঁচড়া ডালমিল মোড়, যশোর' : 'Chanchra Dalmill More, Jashore · hpc@toufiquzzaman.com'}</div>
              <div className="border-t border-b border-dashed border-zinc-400 py-2 my-1">
                {slipModalData.serialNumber != null && (
                  <div className="mb-1.5 pb-1 border-b border-dashed border-zinc-300">
                    <div className="text-[10px] uppercase font-bold text-zinc-600">
                      {isBn ? 'ডাক্তার কনসালটেশন সিরিয়াল' : 'DOCTOR SERIAL NO.'}
                    </div>
                    <div className="text-3xl font-black text-black">
                      #{slipModalData.serialNumber}
                    </div>
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                  {isBn ? 'আগমনের সময়' : 'ARRIVAL TIME'}
                </div>
                <div className="text-2xl font-black text-black">
                  {slipModalData.time ? new Date(slipModalData.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="text-left text-[11px] space-y-0.5 pt-1">
                <div><strong>রোগী:</strong> {slipModalData.patientName}</div>
                <div><strong>MRN:</strong> {slipModalData.mrn}</div>
                {slipModalData.destination && (
                  <div><strong>গন্তব্য / রুম:</strong> {slipModalData.destination}</div>
                )}
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
                {isBn
                  ? 'অনুগ্রহ করে আপনার নির্ধারিত সময় অনুযায়ী অপেক্ষা করুন।'
                  : 'Please wait according to your scheduled arrival time.'}
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 pt-2 print:hidden print-hidden">
              <Button variant="outline" size="sm" onClick={() => setSlipModalData(null)} className="flex-1 text-xs cursor-pointer">
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => window.print()}
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* INTAKE ASSESSMENT REQUIRED GUARDRAIL WARNING DIALOG */}
      <Dialog open={isIntakeWarningOpen} onOpenChange={setIsIntakeWarningOpen}>
        <DialogContent className="max-w-md border-amber-500/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold">
              {isBn ? 'ইনটেক মূল্যায়ন পূরণ করা আবশ্যক' : 'Clinical Intake Assessment Required'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedClinicalStatus?.patientType === 'lapsed_reintake'
                ? (isBn
                    ? 'রোগী দীর্ঘ ৩+ মাস পর এসেছেন। সেন্টারের চিকিৎসা প্রোটোকল অনুযায়ী আজকের বর্তমান শারীরিক অবস্থা ও ভাইটালস মূল্যায়নের জন্য পুনর্বার ইনটেক ফরম পূরণ করা আবশ্যক।'
                    : 'Patient returned after >90 days gap. Re-intake clinical assessment is required per HPC protocol.')
                : (isBn
                    ? 'এই রোগী সম্পূর্ণ নতুন এবং কোনো পূর্ববর্তী ইনটেক রেকর্ড নেই। ডাক্তার দেখানোর পূর্বে রিসেপশন ইনটেক ফরম পূরণ করা আবশ্যক।'
                    : 'This is a brand new patient with no recorded intake. Please fill the intake assessment before routing to doctor.')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsIntakeWarningOpen(false);
                if (pendingCheckInParams) {
                  // Direct bypass
                  const p = pendingCheckInParams;
                  setPendingCheckInParams(null);
                  handlePerformCheckIn(p.targetPatientId, p.bookingId, p.toldTimeOverride);
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {isBn ? 'জরুরি কারণে এখনই চেক-ইন করুন' : 'Emergency Bypass & Check-in'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsIntakeWarningOpen(false);
                setPendingCheckInParams(null);
                setIsIntakeFormOpen(true);
              }}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm shadow-emerald-500/20"
            >
              <Plus className="size-3.5" />
              <span>
                {selectedClinicalStatus?.patientType === 'lapsed_reintake'
                  ? (isBn ? 'পুনর্বার মূল্যায়ন ফরম পূরণ করুন' : 'Fill Re-Intake Form')
                  : (isBn ? 'ইনটেক ফরম পূরণ করুন' : 'Fill Intake Form')}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PATIENT INTAKE FORM MODAL */}
      <PatientIntakeFormModal
        open={isIntakeFormOpen}
        onOpenChange={setIsIntakeFormOpen}
        patient={selectedPatient}
        clinicalStatus={selectedClinicalStatus}
        intakeFormId={selectedClinicalStatus?.todayIntakeId || undefined}
        isReIntake={selectedClinicalStatus?.patientType === 'lapsed_reintake'}
        onSuccess={() => {
          loadData();
          if (selectedPatient?.id) {
            const patId = selectedPatient.id;
            setSavedIntakePatientIds((prev) => new Set([...Array.from(prev), patId]));
            setSelectedClinicalStatus((prev) =>
              prev ? { ...prev, intakeCompletedToday: true } : prev
            );
            getPatientClinicalStatusAction(patId).then((r) => {
              if (r.success && r.data) {
                setSelectedClinicalStatus(r.data);
                if (r.data.intakeCompletedToday) {
                  setSavedIntakePatientIds((prev) => new Set([...Array.from(prev), patId]));
                }
              }
            });
          }
        }}
      />

      {/* PATIENT TIMELINE MODAL */}
      <PatientTimelineModal
        open={isTimelineOpen}
        onOpenChange={setIsTimelineOpen}
        patientId={timelinePatient?.id}
        patientName={timelinePatient?.name}
        mrn={timelinePatient?.mrn}
        phone={timelinePatient?.phone}
      />

      {/* INSTANT CONSULTATION SERIAL & CHECK-IN MODAL */}
      <InstantConsultationCheckInModal
        open={isInstantConsultationOpen}
        onOpenChange={setIsInstantConsultationOpen}
        patient={selectedPatient}
        onSuccess={(res) => {
          setSlipModalData({
            tokenNumber: res.tokenNumber,
            serialNumber: res.serialNumber,
            patientName: selectedPatient
              ? (isBn ? selectedPatient.nameBn || selectedPatient.nameEn : selectedPatient.nameEn)
              : 'Patient',
            mrn: selectedPatient?.mrn || '',
            destination: `ডাক্তার: ${res.doctorName} (সিরিয়াল #${res.serialNumber || 'N/A'})`,
            toldTime: res.slotTime || null,
            punctualityStatus: 'on_time',
            delayMinutes: 0,
            date: res.date,
            time: new Date().toISOString(),
          });
          setSelectedPatient(null);
          setSearchQuery('');
          setCustomToldTime('');
          setNotes('');
          loadData();
        }}
      />

      {/* INSTANT THERAPY SLOT & CHECK-IN MODAL */}
      <InstantTherapySlotCheckInModal
        open={isInstantTherapyOpen}
        onOpenChange={setIsInstantTherapyOpen}
        patient={selectedPatient}
        onSuccess={(res) => {
          setSlipModalData({
            tokenNumber: res.tokenNumber,
            serialNumber: null,
            patientName: selectedPatient
              ? (isBn ? selectedPatient.nameBn || selectedPatient.nameEn : selectedPatient.nameEn)
              : 'Patient',
            mrn: selectedPatient?.mrn || '',
            destination: `থেরাপি রুম: ${res.roomName} (${res.slotHour})`,
            toldTime: res.slotHour || null,
            punctualityStatus: 'on_time',
            delayMinutes: 0,
            date: res.date,
            time: new Date().toISOString(),
          });
          setSelectedPatient(null);
          setSearchQuery('');
          setCustomToldTime('');
          setNotes('');
          loadData();
        }}
      />

      {/* CONFIRM CANCEL BOOKING ALERT DIALOG */}
      <AlertDialog
        open={Boolean(bookingToCancel)}
        onOpenChange={(open) => {
          if (!open) setBookingToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBn ? 'থেরাপি বুকিং বাতিল' : 'Cancel Therapy Booking'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBn
                ? 'আপনি কি নিশ্চিত যে এই থেরাপি বুকিংটি বাতিল করতে চান? এটি বাতিল করলে নির্ধারিত স্লটটি পুনরায় খালি হবে।'
                : 'Are you sure you want to cancel this therapy booking? The slot will become available for other patients.'}
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
