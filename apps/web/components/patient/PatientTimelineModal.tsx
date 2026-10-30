'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Clock,
  UserCheck,
  FileText,
  CreditCard,
  UserPlus,
  Stethoscope,
  Volume2,
  PhoneCall,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Calendar,
  Activity,
  Search,
  Filter,
  Sparkles,
  HeartPulse,
  User,
  Phone,
  Hash,
  Globe,
  Tag,
} from 'lucide-react';

interface PatientTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  patientName?: string;
  mrn?: string;
  phone?: string;
}

type TimelineCategory = 'all' | 'today' | 'checkin' | 'intake' | 'cashier' | 'consultation' | 'therapy';

const toBnNum = (n: number | string | undefined | null): string => {
  if (n == null || n === '') return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(n).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
};

const getRelativeTime = (isoString?: string, isBn: boolean = true): string => {
  if (!isoString) return '';
  try {
    const eventTime = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = now - eventTime;

    if (diffMs < 0) return isBn ? 'এইমাত্র' : 'just now';

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) {
      return isBn ? 'এইমাত্র' : 'just now';
    }
    if (diffMin < 60) {
      return isBn ? `${toBnNum(diffMin)} মিনিট আগে` : `${diffMin}m ago`;
    }
    if (diffHours < 24) {
      return isBn ? `${toBnNum(diffHours)} ঘণ্টা আগে` : `${diffHours}h ago`;
    }
    if (diffDays === 1) {
      return isBn ? 'গতকাল' : 'yesterday';
    }
    if (diffDays < 30) {
      return isBn ? `${toBnNum(diffDays)} দিন আগে` : `${diffDays}d ago`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    return isBn ? `${toBnNum(diffMonths)} মাস আগে` : `${diffMonths}mo ago`;
  } catch {
    return '';
  }
};

export function PatientTimelineModal({
  open,
  onOpenChange,
  patientId,
  patientName: initialPatientName,
  mrn: initialMrn,
  phone: initialPhone,
}: PatientTimelineModalProps) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState<TimelineCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBn, setIsBn] = useState(true);

  const loadTimeline = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const [timelineRes, patRes] = await Promise.allSettled([
        api.patients.getTimeline(patientId),
        api.patients.getById(patientId),
      ]);

      if (timelineRes.status === 'fulfilled') {
        setEvents(timelineRes.value || []);
      } else {
        console.error('Failed to load timeline events:', timelineRes.reason);
        toast.error('টাইমলাইন লোড করতে ব্যর্থ হয়েছে');
      }

      if (patRes.status === 'fulfilled') {
        setPatientDetails(patRes.value);
      }
    } catch (err: any) {
      console.error('Failed to load timeline:', err);
      toast.error('টাইমলাইন লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && patientId) {
      loadTimeline();
      setCategoryFilter('all');
      setSearchQuery('');
    } else {
      setEvents([]);
      setPatientDetails(null);
    }
  }, [open, patientId]);

  const patientName =
    (isBn
      ? patientDetails?.nameBn || patientDetails?.nameEn || initialPatientName
      : patientDetails?.nameEn || patientDetails?.nameBn || initialPatientName) || 'Unknown Patient';

  const patientMrn = patientDetails?.mrn || initialMrn || '';
  const patientPhone = patientDetails?.phone || initialPhone || '';
  const isBrandNew = patientDetails?.isBrandNew ?? patientDetails?.isNewPatient;

  // Filter categorization logic
  const getEventCategory = (step: string): 'checkin' | 'intake' | 'cashier' | 'consultation' | 'therapy' | 'other' => {
    const s = (step || '').toLowerCase();
    if (s.includes('registered') || s.includes('check_in') || s.includes('checked_in')) {
      return 'checkin';
    }
    if (s.includes('intake') || s.includes('vital')) {
      return 'intake';
    }
    if (s.includes('cashier') || s.includes('bill') || s.includes('fee') || s.includes('payment')) {
      return 'cashier';
    }
    if (s.includes('consultation') || s.includes('chamber') || s.includes('doctor') || s.includes('called')) {
      return 'consultation';
    }
    if (s.includes('therapy')) {
      return 'therapy';
    }
    return 'other';
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Category filter
      if (categoryFilter === 'today') {
        const evDate = (ev.date || ev.occurredAt || '').slice(0, 10);
        if (evDate !== todayStr) return false;
      } else if (categoryFilter !== 'all') {
        const cat = getEventCategory(ev.step);
        if (cat !== categoryFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const text = `${ev.titleBn || ''} ${ev.titleEn || ''} ${ev.descriptionBn || ''} ${ev.descriptionEn || ''} ${ev.actorName || ''} ${ev.step || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [events, categoryFilter, searchQuery, todayStr]);

  // Counts for tabs
  const counts = useMemo(() => {
    const res = {
      all: events.length,
      today: 0,
      checkin: 0,
      intake: 0,
      cashier: 0,
      consultation: 0,
      therapy: 0,
    };
    events.forEach((ev) => {
      const evDate = (ev.date || ev.occurredAt || '').slice(0, 10);
      if (evDate === todayStr) res.today += 1;
      const cat = getEventCategory(ev.step);
      if (cat in res) {
        res[cat as keyof typeof res] += 1;
      }
    });
    return res;
  }, [events, todayStr]);

  const getStepIcon = (step: string) => {
    const s = (step || '').toLowerCase();
    switch (s) {
      case 'registered':
        return <UserPlus className="size-4 text-blue-500" />;
      case 'checked_in':
        return <UserCheck className="size-4 text-emerald-500" />;
      case 'intake_form_submitted':
      case 'intake_form_created':
      case 'intake_form_updated':
        return <FileText className="size-4 text-teal-500" />;
      case 'forwarded_to_cashier':
        return <CreditCard className="size-4 text-purple-500" />;
      case 'fee_paid':
      case 'billed':
        return <CheckCircle className="size-4 text-emerald-500" />;
      case 'admitted_to_consultation_queue':
        return <Stethoscope className="size-4 text-amber-500" />;
      case 'called_chamber':
        return <Volume2 className="size-4 text-rose-500 animate-pulse" />;
      case 'recalled':
        return <PhoneCall className="size-4 text-orange-500" />;
      case 'in_consultation':
        return <Activity className="size-4 text-emerald-500" />;
      case 'call_cancelled':
        return <XCircle className="size-4 text-slate-400" />;
      case 'completed':
        return <CheckCircle className="size-4 text-blue-500" />;
      case 'therapy_scheduled':
      case 'therapy_started':
      case 'therapy_completed':
        return <Activity className="size-4 text-indigo-500" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const getStepBadge = (step: string) => {
    const s = (step || '').toLowerCase();
    switch (s) {
      case 'registered':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[10px]">{isBn ? 'নিবন্ধন' : 'Registered'}</Badge>;
      case 'checked_in':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">{isBn ? 'চেক-ইন' : 'Checked In'}</Badge>;
      case 'intake_form_created':
      case 'intake_form_submitted':
        return <Badge className="bg-teal-500/10 text-teal-500 border-teal-500/30 text-[10px]">{isBn ? 'ইনটেক ফরম' : 'Intake Form'}</Badge>;
      case 'intake_form_updated':
        return <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/30 text-[10px]">{isBn ? 'ইনটেক পরিমার্জন' : 'Intake Updated'}</Badge>;
      case 'forwarded_to_cashier':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-[10px]">{isBn ? 'ক্যাশিয়ারে প্রেরিত' : 'Cashier'}</Badge>;
      case 'fee_paid':
      case 'billed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">{isBn ? 'বিল পরিশোধিত' : 'Paid'}</Badge>;
      case 'admitted_to_consultation_queue':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]">{isBn ? 'সিরিয়াল কিউ' : 'Doctor Queue'}</Badge>;
      case 'called_chamber':
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/30 text-[10px]">{isBn ? 'চেম্বারে ডাক' : 'Called'}</Badge>;
      case 'recalled':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-[10px]">{isBn ? 'পুনরায় ডাক' : 'Recalled'}</Badge>;
      case 'in_consultation':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">{isBn ? 'পরামর্শকক্ষ' : 'Consultation'}</Badge>;
      case 'call_cancelled':
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30 text-[10px]">{isBn ? 'বাতিল' : 'Cancelled'}</Badge>;
      case 'therapy_started':
        return <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/30 text-[10px]">{isBn ? 'থেরাপি শুরু' : 'Therapy Started'}</Badge>;
      case 'therapy_completed':
        return <Badge className="bg-teal-500/10 text-teal-500 border-teal-500/30 text-[10px]">{isBn ? 'থেরাপি সম্পন্ন' : 'Therapy Done'}</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{step}</Badge>;
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const str = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return isBn ? toBnNum(str) : str;
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const str = d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return str;
    } catch {
      return isoString;
    }
  };

  const parseMetadata = (ev: any) => {
    if (!ev?.metadataJson) return null;
    try {
      if (typeof ev.metadataJson === 'object') return ev.metadataJson;
      return JSON.parse(ev.metadataJson);
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0 border-emerald-500/30 bg-background/95 backdrop-blur-xl flex flex-col shadow-2xl rounded-2xl">
        {/* TOP MODAL HEADER */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border/70 bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                <Clock className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{isBn ? 'রোগীর পূর্ণাঙ্গ অ্যাক্টিভিটি টাইমলাইন' : 'Patient Activity Timeline'}</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                    {isBn ? `${toBnNum(events.length)} টি ইভেন্ট` : `${events.length} Events`}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isBn
                    ? 'হাসপাতালে রোগীর আগমন, ইনটেক, বিলিং ও পরামর্শের রিয়েল-টাইম ট্র্যাক'
                    : 'Real-time timeline tracking admission, intake, payments, and chamber visits'}
                </DialogDescription>
              </div>
            </div>

            {/* Language Toggle & Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBn(!isBn)}
                className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-border/80"
              >
                <Globe className="size-3.5 text-emerald-500" />
                <span>{isBn ? 'English' : 'বাংলা'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadTimeline}
                disabled={loading}
                className="h-8 px-2.5 text-xs gap-1.5"
              >
                <RotateCcw className={`size-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
                <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
              </Button>
            </div>
          </div>

          {/* PATIENT PROFILE SUMMARY BAR */}
          <div className="mt-3.5 p-3 rounded-xl border border-border/70 bg-card/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                <User className="size-3.5" />
              </div>
              <span className="font-bold text-foreground text-sm">{patientName}</span>

              {patientMrn && (
                <div className="flex items-center gap-1 font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md text-[11px]">
                  <Hash className="size-3" />
                  <span>{patientMrn}</span>
                </div>
              )}

              {patientPhone && (
                <div className="flex items-center gap-1 font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md text-[11px]">
                  <Phone className="size-3" />
                  <span>{patientPhone}</span>
                </div>
              )}

              {isBrandNew !== undefined && (
                <Badge
                  className={`text-[10px] ${
                    isBrandNew
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                  }`}
                >
                  {isBrandNew
                    ? (isBn ? 'নতুন রোগী' : 'Brand New Patient')
                    : (isBn ? 'পুরাতন রোগী' : 'Follow-up Patient')}
                </Badge>
              )}
            </div>

            {events.length > 0 && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                <Sparkles className="size-3 text-amber-500 shrink-0" />
                <span>{isBn ? 'সর্বশেষ:' : 'Latest:'}</span>
                <span className="font-semibold text-foreground">
                  {getRelativeTime(events[0].occurredAt, isBn)}
                </span>
              </div>
            )}
          </div>

          {/* FILTER CONTROLS & CATEGORY TABS */}
          <div className="mt-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={isBn ? 'টাইমলাইন ইভেন্ট, ডাক্তার বা বিবরণ খুঁজুন...' : 'Search events, doctors, or notes...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background/80"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <Button
                  size="sm"
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('all')}
                  className={`h-7 px-2 text-[11px] rounded-lg shrink-0 ${
                    categoryFilter === 'all' ? 'bg-emerald-600 text-white font-bold' : ''
                  }`}
                >
                  {isBn ? 'সকল' : 'All'} ({counts.all})
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'today' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('today')}
                  className={`h-7 px-2 text-[11px] rounded-lg shrink-0 ${
                    categoryFilter === 'today' ? 'bg-emerald-600 text-white font-bold' : ''
                  }`}
                >
                  {isBn ? 'আজকের' : 'Today'} ({counts.today})
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'intake' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('intake')}
                  className={`h-7 px-2 text-[11px] rounded-lg shrink-0 ${
                    categoryFilter === 'intake' ? 'bg-emerald-600 text-white font-bold' : ''
                  }`}
                >
                  {isBn ? 'ইনটেক' : 'Intake'} ({counts.intake})
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'consultation' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('consultation')}
                  className={`h-7 px-2 text-[11px] rounded-lg shrink-0 ${
                    categoryFilter === 'consultation' ? 'bg-emerald-600 text-white font-bold' : ''
                  }`}
                >
                  {isBn ? 'কনসালটেশন' : 'Consultation'} ({counts.consultation})
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'cashier' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('cashier')}
                  className={`h-7 px-2 text-[11px] rounded-lg shrink-0 ${
                    categoryFilter === 'cashier' ? 'bg-emerald-600 text-white font-bold' : ''
                  }`}
                >
                  {isBn ? 'ক্যাশিয়ার' : 'Cashier'} ({counts.cashier})
                </Button>
                <Button
                  size="sm"
                  variant={categoryFilter === 'therapy' ? 'default' : 'outline'}
                  onClick={() => setCategoryFilter('therapy')}
                  className={`h-7 px-2 text-[11px] rounded-lg shrink-0 ${
                    categoryFilter === 'therapy' ? 'bg-emerald-600 text-white font-bold' : ''
                  }`}
                >
                  {isBn ? 'থেরাপি' : 'Therapy'} ({counts.therapy})
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* TIMELINE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && events.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-7 animate-spin text-emerald-500" />
              <span className="text-xs">{isBn ? 'টাইমলাইন লোড হচ্ছে...' : 'Loading timeline...'}</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Clock className="size-9 mx-auto opacity-30 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">
                {isBn ? 'কোনো টাইমলাইন রেকর্ড পাওয়া যায়নি' : 'No timeline records found'}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchQuery || categoryFilter !== 'all'
                  ? (isBn ? 'ফিল্টার বা সার্চ কিওয়ার্ড পরিবর্তন করে পুনরায় চেষ্টা করুন।' : 'Try resetting your filter or search query.')
                  : (isBn ? 'এই রোগীর জন্য এখনো কোনো কার্যক্রম সম্পন্ন হয়নি।' : 'No recorded activity for this patient yet.')}
              </p>
              {(searchQuery || categoryFilter !== 'all') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCategoryFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs"
                >
                  {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
                </Button>
              )}
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-emerald-500/80 before:via-teal-500/40 before:to-border/60">
              {filteredEvents.map((ev, idx) => {
                const meta = parseMetadata(ev);
                const title = isBn ? ev.titleBn || ev.titleEn : ev.titleEn || ev.titleBn;
                const description = isBn ? ev.descriptionBn || ev.descriptionEn : ev.descriptionEn || ev.descriptionBn;
                const relativeTime = getRelativeTime(ev.occurredAt, isBn);

                return (
                  <div key={ev.id || idx} className="relative group">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-6 top-1.5 size-6 rounded-full bg-card border-2 border-border/80 flex items-center justify-center shadow-xs group-hover:border-emerald-500 group-hover:scale-110 transition-all">
                      {getStepIcon(ev.step)}
                    </div>

                    {/* Timeline Event Card */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-emerald-500/40 hover:bg-card/90 transition-all shadow-2xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {title}
                          </span>
                          {getStepBadge(ev.step)}
                        </div>

                        {/* Timestamp & Relative elapsed time */}
                        <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-semibold text-[10px]">
                            {relativeTime}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(ev.occurredAt)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Clock className="size-3 text-emerald-500" />
                            {formatTime(ev.occurredAt)}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {description && (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {description}
                        </p>
                      )}

                      {/* Extra Metadata Chips (Vitals, Doctor, Chamber, Modality, Cashier) */}
                      {meta && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {meta.doctorName && (
                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                              👨‍⚕️ {meta.doctorName}
                            </Badge>
                          )}
                          {meta.chamberNumber && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              🚪 {isBn ? `রুম #${toBnNum(meta.chamberNumber)}` : `Room #${meta.chamberNumber}`}
                            </Badge>
                          )}
                          {meta.bp && (
                            <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-mono">
                              ❤️ BP: {meta.bp}
                            </Badge>
                          )}
                          {meta.pulse && (
                            <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-mono">
                              ⚡ Pulse: {meta.pulse}
                            </Badge>
                          )}
                          {meta.spo2 && (
                            <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 font-mono">
                              🫁 SpO2: {meta.spo2}%
                            </Badge>
                          )}
                          {meta.amount && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono font-bold">
                              ৳ {toBnNum(meta.amount)}
                            </Badge>
                          )}
                          {meta.modalityCode && (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                              💆 {meta.modalityCode}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Actor Attribution */}
                      {ev.actorName && (
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/80 border-t border-border/40">
                          <span className="font-medium">{isBn ? 'সম্পাদনকারী:' : 'Logged by:'}</span>
                          <span className="text-foreground font-semibold">{ev.actorName}</span>
                          {ev.actorRole && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/40">
                              {ev.actorRole}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
