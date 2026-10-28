// apps/web/components/TherapyHallView.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api, UserSession, getSession } from '../lib/api';
import { useRealtime } from '../lib/use-realtime';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { cn } from '../lib/utils';
import { TherapyQueueManagementTab } from './therapy/TherapyQueueManagementTab';
import { toast } from 'sonner';
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

export interface TherapyHallProps {
  session?: UserSession | null;
}

export default function TherapyHallView({ session: propSession }: TherapyHallProps = {}) {
  const session = propSession || getSession();
  const [mobileTab, setMobileTab] = useState<'queue' | 'sessions' | 'packages'>('queue');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Package Lookup State
  const [packageSearchPatientId, setPackageSearchPatientId] = useState<string>('');
  const [patientCredits, setPatientCredits] = useState<any[]>([]);
  const [loadingCredits, setLoadingCredits] = useState<boolean>(false);

  // Sessions Tab Filter
  const [sessionSearch, setSessionSearch] = useState<string>('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Start Session Modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedModalityCode, setSelectedModalityCode] = useState('IFT');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [startNotes, setStartNotes] = useState('');

  // Complete Session Modal
  const [completingSession, setCompletingSession] = useState<any>(null);
  const [painScoreAfter, setPainScoreAfter] = useState(3);
  const [outcomeNote, setOutcomeNote] = useState('Good tolerance, muscle spasm relieved.');

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, todayList, p, pat] = await Promise.all([
        api.therapy.getActiveSessions().catch(() => []),
        api.therapy.getTodaySessions().catch(() => []),
        api.therapy.getPackages().catch(() => []),
        api.patients.list().catch(() => []),
      ]);
      setActiveSessions(Array.isArray(s) ? s : []);
      setTodaySessions(Array.isArray(todayList) ? todayList : []);
      setPackages(Array.isArray(p) ? p : []);
      setPatients(Array.isArray(pat) ? pat : []);

      if (pat && pat.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pat[0].id);
      }
      if (pat && pat.length > 0 && !packageSearchPatientId) {
        setPackageSearchPatientId(pat[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load therapy hall data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sub-second Realtime sync for therapy and active sessions
  useRealtime((event) => {
    if (
      event.type.startsWith('therapy.') ||
      event.type.startsWith('session.') ||
      event.type.startsWith('visit.') ||
      event.type.startsWith('queue.')
    ) {
      loadData();
    }
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch patient credits when packageSearchPatientId changes
  useEffect(() => {
    if (!packageSearchPatientId) return;
    setLoadingCredits(true);
    api.therapy
      .getCredits(packageSearchPatientId)
      .then((data) => setPatientCredits(Array.isArray(data) ? data : []))
      .catch(() => setPatientCredits([]))
      .finally(() => setLoadingCredits(false));
  }, [packageSearchPatientId]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.therapy.startSession({
        patientId: selectedPatientId,
        modalityCode: selectedModalityCode,
        durationMinutes,
        notes: startNotes.trim() || undefined,
      });
      toast.success('থেরাপি সেশন শুরু হয়েছে! (Therapy Session Started)');
      setShowStartModal(false);
      setStartNotes('');
      loadData();
    } catch (err: any) {
      toast.error(`সেশন শুরু করতে ব্যর্থ: ${err.message}`);
    }
  };

  const handleCompleteSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSession) return;
    try {
      await api.therapy.completeSession(completingSession.id, {
        durationMinutes: completingSession.durationMinutes || 15,
        painScoreAfter,
        outcomeNote,
      });
      toast.success('থেরাপি সেশন সম্পন্ন ও সংরক্ষিত হয়েছে! (Therapy Session Completed)');
      setCompletingSession(null);
      loadData();
    } catch (err: any) {
      toast.error(`সেশন সমাপ্ত করতে ব্যর্থ: ${err.message}`);
    }
  };

  const completedSessionsList = useMemo(() => {
    return todaySessions.filter((s) => s.status === 'completed');
  }, [todaySessions]);

  const filteredSessions = useMemo(() => {
    const list = sessionStatusFilter === 'completed'
      ? completedSessionsList
      : sessionStatusFilter === 'in_progress'
      ? activeSessions
      : todaySessions;

    if (!sessionSearch.trim()) return list;
    const q = sessionSearch.toLowerCase();
    return list.filter((s) => {
      const pName = (s.patientName || s.patient?.nameEn || s.patientNameEn || '').toLowerCase();
      const pNameBn = (s.patientNameBn || s.patient?.nameBn || '').toLowerCase();
      const mrn = (s.patientMrn || s.patient?.mrn || s.mrn || '').toLowerCase();
      const mod = (s.modalityCode || '').toLowerCase();
      const room = (s.roomName || s.bedName || '').toLowerCase();
      return pName.includes(q) || pNameBn.includes(q) || mrn.includes(q) || mod.includes(q) || room.includes(q);
    });
  }, [todaySessions, activeSessions, completedSessionsList, sessionStatusFilter, sessionSearch]);

  const selectedPatientObj = useMemo(() => {
    return patients.find((p) => p.id === packageSearchPatientId);
  }, [patients, packageSearchPatientId]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">⚡ Therapy Hall &amp; Electrotherapy Matrix</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Hall A · Live Bed Allocation &amp; Modality Timers</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            onClick={() => setShowStartModal(true)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-sm"
          >
            <Play className="size-4 mr-1.5 fill-current" />
            + Start Session
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-xs max-w-2xl">
        <button
          type="button"
          onClick={() => setMobileTab('queue')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'queue'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Activity className="size-4" />
          <span>⚡ থেরাপি কিউ ও কল</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('sessions')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'sessions'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Clock className="size-4" />
          <span>⏱️ সেশন ট্র্যাকার ({activeSessions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('packages')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'packages'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Package className="size-4" />
          <span>📦 প্যাকেজ ও ব্যালেন্স ({packages.length})</span>
        </button>
      </div>

      {/* TAB 1: Queue & Calling Workstation */}
      {mobileTab === 'queue' && <TherapyQueueManagementTab />}

      {/* TAB 2: Dedicated Sessions Tracker & History View */}
      {mobileTab === 'sessions' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-background to-background p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">চলমান সেশন (In Progress)</span>
                <span className="flex size-2 rounded-full bg-cyan-500 animate-ping" />
              </div>
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-2 font-mono">
                {activeSessions.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">বর্তমানে থেরাপি হলে মডালিটি চলছে</p>
            </Card>

            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">আজকের সম্পন্ন সেশন (Completed)</span>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                {completedSessionsList.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">আজ সফলভাবে শেষ হওয়া মোট সেশন</p>
            </Card>

            <Card className="border-border bg-card p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">মোট রেকর্ডকৃত সেশন (Today)</span>
                <Clock className="size-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-black text-foreground mt-2 font-mono">
                {todaySessions.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">আজকের মোট সেশন ভলিউম</p>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="রোগীর নাম, MRN বা মডালিটি খুঁজুন..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'in_progress', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSessionStatusFilter(st)}
                  className={cn(
                    'flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer',
                    sessionStatusFilter === st
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                      : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {st === 'all' ? 'সকল সেশন' : st === 'in_progress' ? 'চলমান (Active)' : 'সম্পন্ন (Done)'}
                </button>
              ))}
            </div>
          </div>

          {/* Active Sessions Live Cards (When in 'all' or 'in_progress') */}
          {sessionStatusFilter !== 'completed' && activeSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-cyan-500 animate-ping" />
                <span>লাইভ চলমান থেরাপি সেশন ({activeSessions.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeSessions.map((s, idx) => {
                  const durMin = Number(s.durationMinutes) || 15;
                  const startMs = s.startedAt ? new Date(s.startedAt).getTime() : nowTick;
                  const elapsedSec = Math.max(0, Math.floor((nowTick - startMs) / 1000));
                  const totalSec = Math.max(1, durMin * 60);
                  const remainingSec = Math.max(0, totalSec - elapsedSec);
                  const isOvertime = elapsedSec > totalSec;
                  const progressPct = Math.min(100, Math.round((elapsedSec / totalSec) * 100));

                  const elMin = Math.floor(elapsedSec / 60);
                  const elS = elapsedSec % 60;
                  const remMin = Math.floor(remainingSec / 60);
                  const remS = remainingSec % 60;
                  const elapsedFormatted = `${elMin.toString().padStart(2, '0')}:${elS.toString().padStart(2, '0')}`;
                  const remainingFormatted = `${remMin.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;

                  return (
                    <Card
                      key={s.sessionId || s.id || idx}
                      className="p-4 rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-500/5 via-card to-card shadow-md space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {s.patientNameBn || s.patientNameEn || s.patient?.nameEn || 'Patient'}
                          </h4>
                          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            MRN: {s.patientMrn || s.patient?.mrn || s.mrn || 'N/A'}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10.5px] border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shrink-0">
                          <Building2 className="size-3 mr-1 inline" />
                          {s.roomName || s.bedName || 'থেরাপি হল'}
                        </Badge>
                      </div>

                      {/* Live Modality Countdown Banner */}
                      <div className="p-2.5 rounded-xl bg-background/90 border border-border/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-cyan-600 text-white font-mono text-[10px] font-black">
                              ⚡ [{s.modalityCode}]
                            </Badge>
                            <span className="font-bold text-foreground">
                              {s.modalityNameBn || s.modalityNameEn || s.modalityCode}
                            </span>
                          </div>
                          <span className="font-mono text-muted-foreground text-[10px]">
                            {durMin} মি:
                          </span>
                        </div>

                        <div className="flex items-center justify-between font-mono font-bold text-xs">
                          <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                            <Activity className="size-3 animate-pulse text-emerald-500" />
                            <span>চলমান: {elapsedFormatted}</span>
                          </span>
                          {isOvertime ? (
                            <Badge className="bg-rose-500 text-white text-[10px] animate-pulse">
                              + {Math.floor((elapsedSec - totalSec) / 60)}m অতিরিক্ত
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-medium text-[11px]">
                              বাকি: {remainingFormatted}
                            </span>
                          )}
                        </div>

                        <div className="w-full bg-muted/80 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full transition-all duration-500', isOvertime ? 'bg-rose-500' : 'bg-cyan-500')}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setCompletingSession(s)}
                        className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" />
                        <span>সেশন সমাপ্ত ও নোট দিন</span>
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Completed Sessions Table */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-3.5 px-4 sm:px-6 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>📋 আজকের সকল সেশন হিস্ট্রি (History &amp; Logs)</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredSessions.length} টি রেকর্ড
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-12 text-xs sm:text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <Clock className="size-8 opacity-40" />
                  <span>কোনো সেশন রেকর্ড পাওয়া যায়নি।</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3">রোগী (Patient)</th>
                        <th className="p-3">MRN / ফোন</th>
                        <th className="p-3">মডালিটি</th>
                        <th className="p-3">সময়কাল</th>
                        <th className="p-3">ব্যথা স্কোর</th>
                        <th className="p-3">স্ট্যাটাস</th>
                        <th className="p-3">হ্যান্ডলার নোট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-normal">
                      {filteredSessions.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-bold text-foreground">
                            {s.patientNameBn || s.patientName || s.patient?.nameEn || '—'}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {s.patientMrn || s.patient?.mrn || s.mrn || '—'}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="border-cyan-500/40 text-cyan-600 dark:text-cyan-400 font-mono text-[11px] font-bold">
                              {s.modalityCode}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono">
                            {s.durationMinutes} মিনিট
                          </td>
                          <td className="p-3 font-mono">
                            {s.painScoreAfter !== null && s.painScoreAfter !== undefined ? (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                                {s.painScoreAfter}/10
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={cn(
                                'text-[10px] font-bold',
                                s.status === 'in_progress'
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              )}
                            >
                              {s.status === 'in_progress' ? 'চলমান (Active)' : 'সম্পন্ন (Completed)'}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                            {s.outcomeNote || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Dedicated Packages & Credits View */}
      {mobileTab === 'packages' && (
        <div className="space-y-6">
          {/* Patient Package Credits Lookup Card */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-3.5 px-4 sm:px-6 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <CreditCard className="size-5 text-emerald-500" />
                  <span>রোগীর প্যাকেজ ব্যালেন্স ও সক্রিয় সাবস্ক্রিপশন (Package Credits)</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  রোগী নির্বাচন করে তার সক্রিয় থেরাপি প্যাকেজ ও অবশিষ্ট সেশন সংখ্যা যাচাই করুন
                </CardDescription>
              </div>

              {/* Patient Selector */}
              <div className="w-full sm:w-80">
                <Select
                  value={packageSearchPatientId}
                  onValueChange={setPackageSearchPatientId}
                >
                  <SelectTrigger className="w-full h-9 text-xs bg-background">
                    <SelectValue placeholder="-- রোগী নির্বাচন করুন --" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    className="max-h-56 overflow-y-auto z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl"
                  >
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.mrn} · {p.nameEn} ({p.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {loadingCredits ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="size-4 animate-spin text-emerald-500" />
                  <span>প্যাকেজ ব্যালেন্স লোড হচ্ছে...</span>
                </div>
              ) : patientCredits.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border/80 rounded-xl bg-muted/20">
                  <Package className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {selectedPatientObj
                      ? `${selectedPatientObj.nameEn} এর কোনো সক্রিয় প্যাকেজ বা ক্রেডিট নেই`
                      : 'অনুগ্রহ করে উপরের ড্রপডাউন থেকে একজন রোগী নির্বাচন করুন'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    নিচের ক্যাটালগ থেকে রোগীকে প্যাকেজ বরাদ্দ করতে পারেন।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {patientCredits.map((cred) => (
                    <div
                      key={cred.id}
                      className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-2.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          {cred.package?.nameEn || cred.packageName || 'Rehab Package'}
                        </span>
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          {cred.status || 'Active'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 p-2 rounded-lg bg-background/80 border border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">অবশিষ্ট থেরাপি সেশন:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                            {cred.remainingTherapySessions ?? cred.sessionsRemaining ?? 0} টি
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">অবশিষ্ট ডাক্তার কনসালটেশন:</span>
                          <strong className="text-foreground font-mono">
                            {cred.remainingConsultations ?? 0} টি
                          </strong>
                        </div>
                        {cred.expiresAt && (
                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                            <span className="text-muted-foreground">মেয়াদ শেষ:</span>
                            <span className="font-mono text-foreground font-semibold">
                              {cred.expiresAt.slice(0, 10)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Curated Rehab Packages Catalog */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="py-3.5 px-4 sm:px-6 border-b border-border bg-muted/30">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>📦 অফিশিয়াল রিহ্যাবিলিটেশন প্যাকেজ ক্যাটালগ (Rehab Packages)</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {packages.length} টি প্যাকেজ
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-bold text-foreground">{pkg.nameEn}</h4>
                          <div className="text-xs text-muted-foreground mt-0.5">{pkg.nameBn}</div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold shrink-0">
                          ৳{(pkg.pricePaisa / 100).toFixed(0)}
                        </Badge>
                      </div>

                      <div className="text-xs flex flex-col gap-2 mt-4 text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                        <div className="flex items-center justify-between">
                          <span>🩺 ডাক্তার কনসালটেশন:</span>
                          <strong className="text-foreground font-mono">{pkg.totalConsultations} বার</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>⚡ ফিজিক্যাল থেরাপি সেশন:</span>
                          <strong className="text-foreground font-mono">{pkg.totalTherapySessions} টি</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>📅 মেয়াদ (Validity):</span>
                          <strong className="text-foreground font-mono">{pkg.validityDays} দিন</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <strong className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        ৳{(pkg.pricePaisa / 100).toFixed(0)} BDT
                      </strong>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!packageSearchPatientId) {
                            toast.error('অনুগ্রহ করে আগে একজন রোগী নির্বাচন করুন (Select a patient first)');
                            return;
                          }
                          try {
                            await api.therapy.purchasePackage({
                              patientId: packageSearchPatientId,
                              packageId: pkg.id,
                              billId: undefined,
                            });
                            toast.success(`প্যাকেজ "${pkg.nameEn}" রোগীকে সফলভাবে বরাদ্দ করা হয়েছে!`);
                            // Refresh patient credits
                            const updated = await api.therapy.getCredits(packageSearchPatientId).catch(() => []);
                            setPatientCredits(Array.isArray(updated) ? updated : []);
                          } catch (err: any) {
                            toast.error(`প্যাকেজ বরাদ্দ ত্রুটি: ${err.message}`);
                          }
                        }}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer active:scale-95 shadow-2xs"
                      >
                        বরাদ্দ করুন (Assign)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Start Session Dialog (Modal with Fixed Header & Scrollable Body) */}
      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent
          className="w-[95vw] max-w-lg max-h-[88vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
          onClose={() => setShowStartModal(false)}
        >
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Play className="size-5 fill-current" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  নতুন থেরাপি সেশন শুরু করুন (Start Therapy Session)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  রোগী নির্বাচন ও মডালিটি টাইম সিলেক্ট করে টাইমার চালু করুন
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleStartSession} className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="p-4 sm:p-5 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  রোগী নির্বাচন করুন (Select Patient) *
                </Label>
                <Select
                  value={selectedPatientId}
                  onValueChange={setSelectedPatientId}
                >
                  <SelectTrigger className="w-full h-10 text-xs sm:text-sm bg-card">
                    <SelectValue placeholder="-- রোগী নির্বাচন করুন --" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    className="max-h-56 overflow-y-auto z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl"
                  >
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.mrn} · {p.nameEn} ({p.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    মডালিটি নির্বাচন (Modality) *
                  </Label>
                  <Select
                    value={selectedModalityCode}
                    onValueChange={setSelectedModalityCode}
                  >
                    <SelectTrigger className="w-full h-10 text-xs sm:text-sm bg-card">
                      <SelectValue placeholder="Select Modality" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="max-h-56 overflow-y-auto z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl"
                    >
                      <SelectItem value="IFT">IFT (Interferential Therapy)</SelectItem>
                      <SelectItem value="UST">UST (Ultrasound Therapy)</SelectItem>
                      <SelectItem value="SWD">SWD (Shortwave Diathermy)</SelectItem>
                      <SelectItem value="IRR">IRR (Infrared Radiation)</SelectItem>
                      <SelectItem value="TRACTION">Traction (Cervical / Lumbar)</SelectItem>
                      <SelectItem value="TENS">TENS (Electrical Stimulation)</SelectItem>
                      <SelectItem value="EXE">EXE (Therapeutic Exercise)</SelectItem>
                      <SelectItem value="WAX">Wax Bath Therapy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    সময়কাল (Duration in Minutes) *
                  </Label>
                  <Select
                    value={String(durationMinutes)}
                    onValueChange={(val) => setDurationMinutes(parseInt(val, 10))}
                  >
                    <SelectTrigger className="w-full h-10 text-xs sm:text-sm bg-card">
                      <SelectValue placeholder="Select Duration" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="max-h-56 overflow-y-auto z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl"
                    >
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="25">25 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  হ্যান্ডলার নোট / নির্দেশনা (ঐচ্ছিক)
                </Label>
                <Input
                  value={startNotes}
                  onChange={(e) => setStartNotes(e.target.value)}
                  placeholder="যেমন: রোগীর কাঁধের ক্যাপসুল গরম করতে হবে..."
                  className="h-9 text-xs bg-card"
                />
              </div>
            </div>

            <DialogFooter className="p-3 sm:p-4 border-t border-border/50 bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowStartModal(false)} className="h-9 text-xs">
                বাতিল
              </Button>
              <Button type="submit" className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-md shadow-emerald-600/20">
                <Play className="size-3.5 mr-1 fill-current" />
                সেশন টাইমার চালু করুন
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Session Dialog (Modal with Fixed Header & Scrollable Body) */}
      {completingSession && (
        <Dialog open={!!completingSession} onOpenChange={() => setCompletingSession(null)}>
          <DialogContent
            className="w-[95vw] max-w-md max-h-[88vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
            onClose={() => setCompletingSession(null)}
          >
            <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    থেরাপি সেশন সমাপ্ত করুন (Complete Session)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    সেশনের ফলাফল ও ব্যথা মূল্যায়ন সংরক্ষণ করুন
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleCompleteSession} className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-4 sm:p-5 space-y-4 flex-1">
                <div className="rounded-xl bg-muted/40 p-3 text-xs flex flex-col gap-1.5 border border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">রোগীর নাম:</span>
                    <strong className="text-foreground">
                      {completingSession.patientNameBn || completingSession.patientName || completingSession.patient?.nameEn || 'Patient'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">মডালিটি:</span>
                    <Badge variant="outline" className="border-cyan-500/40 text-cyan-600 dark:text-cyan-400 font-mono text-[10.5px]">
                      {completingSession.modalityCode}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>সেশন পরবর্তী ব্যথা স্কোর (Pain Score 0-10):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">
                      {painScoreAfter}/10
                    </span>
                  </Label>
                  <div className="py-2">
                    <Slider
                      min={0}
                      max={10}
                      step={1}
                      value={painScoreAfter}
                      onValueChange={(val: any) => setPainScoreAfter(Array.isArray(val) ? val[0] : val)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    থেরাপিস্ট মন্তব্য / রোগীর প্রতিক্রিয়া (Notes)
                  </Label>
                  <Textarea
                    rows={2}
                    value={outcomeNote}
                    onChange={(e) => setOutcomeNote(e.target.value)}
                    className="text-xs bg-card resize-none"
                    placeholder="যেমন: রোগীর সহ্যক্ষমতা ভালো ছিল, পেশীর টান কমেছে..."
                  />
                </div>
              </div>

              <DialogFooter className="p-3 sm:p-4 border-t border-border/50 bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCompletingSession(null)} className="h-9 text-xs">
                  বাতিল
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="size-3.5 mr-1" />
                  সেশন সংরক্ষণ ও সমাপ্ত করুন
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
