'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Filter,
  FolderOpen,
  Lock,
  PhoneCall,
  Play,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  User,
  Volume2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { useRealtime } from '../../lib/use-realtime';
import { PatientTimelineModal } from '../patient/PatientTimelineModal';
import { PatientFilesListModal } from '../patient/PatientFilesListModal';
import { TreatmentPlanBuilderModal } from '../doctor/TreatmentPlanBuilderModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export interface TherapyQueueItem {
  id: string;
  visitId: string;
  patientId: string;
  tokenNumber: number;
  patientNameEn: string;
  patientNameBn?: string;
  mrn: string;
  phone?: string;
  gender?: string;
  ageYears?: number;
  priority?: string;
  status: 'waiting' | 'calling' | 'in_therapy' | string;
  assignedRoomId?: string | null;
  assignedRoomName?: string | null;
  modalityCode?: string;
  modalityName?: string;
  modalityNameBn?: string;
  toldTime?: string | null;
  checkedInAt?: string;
  punctualityStatus?: string | null;
  delayMinutes?: number | null;
  calledAt?: string | null;
}

export interface RoomOption {
  id: string;
  name: string;
  displayName?: string;
  code: string;
  roomNumber: string | number;
  type: string;
  isOccupied: boolean;
  currentPatientName?: string | null;
}

export function TherapyQueueManagementTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingPatients, setWaitingPatients] = useState<TherapyQueueItem[]>([]);
  const [nowServingPatients, setNowServingPatients] = useState<TherapyQueueItem[]>([]);
  const [inTherapyPatients, setInTherapyPatients] = useState<TherapyQueueItem[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'calling' | 'in_therapy'>('all');
  const [callingVisitId, setCallingVisitId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modals state
  const [timelinePatient, setTimelinePatient] = useState<{ id: string; name: string } | null>(null);
  const [filesPatient, setFilesPatient] = useState<any | null>(null);
  const [plansPatient, setPlansPatient] = useState<TherapyQueueItem | null>(null);
  const [startSessionPatient, setStartSessionPatient] = useState<TherapyQueueItem | null>(null);
  const [sendToCashierPatient, setSendToCashierPatient] = useState<TherapyQueueItem | null>(null);
  const [switchRoomPatient, setSwitchRoomPatient] = useState<TherapyQueueItem | null>(null);
  const [builderPatient, setBuilderPatient] = useState<TherapyQueueItem | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [queueRes, roomsRes] = await Promise.all([
        api.therapy.getQueue(),
        api.therapy.getRooms(),
      ]);

      // Strictly filter to ONLY therapy rooms and therapy halls
      const isTherapyOnly = (r: RoomOption) => {
        const type = (r.type || '').toLowerCase();
        const name = (r.name || '').toLowerCase();
        const id = (r.id || '').toLowerCase();

        if (
          type === 'doctor_consultation_room' ||
          type === 'waiting_room' ||
          type === 'cashier_room' ||
          type === 'staff_room' ||
          type.includes('doctor') ||
          type.includes('consultation') ||
          type.includes('cashier') ||
          name.includes('consultation') ||
          name.includes('chamber') ||
          name.includes('চেম্বার') ||
          name.includes('cashier') ||
          name.includes('waiting') ||
          name.includes('reception')
        ) {
          return false;
        }

        return (
          type === 'therapy_room' ||
          type === 'therapy_hall' ||
          id.includes('th-') ||
          id.includes('tr-') ||
          name.includes('therapy') ||
          name.includes('hall') ||
          name.includes('rehab') ||
          name.includes('থেরাপি')
        );
      };

      const filteredRooms = (roomsRes || []).filter(isTherapyOnly);
      const finalRooms = filteredRooms.length > 0 ? filteredRooms : [
        {
          id: 'room-th-01',
          roomNumber: 'TH-01',
          code: 'TH-01',
          name: 'Male Physiotherapy & Rehab Hall (পুরুষ ফিজিওথেরাপি হল)',
          type: 'therapy_hall',
          capacity: 10,
          currentOccupancy: 0,
          isOccupied: false,
        },
        {
          id: 'room-th-02',
          roomNumber: 'TH-02',
          code: 'TH-02',
          name: 'Female Physiotherapy & Rehab Hall (মহিলা ফিজিওথেরাপি হল)',
          type: 'therapy_hall',
          capacity: 10,
          currentOccupancy: 0,
          isOccupied: false,
        },
      ];

      setWaitingPatients(queueRes?.waiting || []);
      setNowServingPatients(queueRes?.nowServing || []);
      setInTherapyPatients(queueRes?.inSession || queueRes?.inTherapy || []);
      setActiveSessions(queueRes?.activeSessions || []);
      setRooms(finalRooms);

      // Pre-select first available room for waiting patients if not selected
      const availableRooms = finalRooms.filter((r: RoomOption) => !r.isOccupied);
      if (availableRooms.length > 0) {
        setSelectedRooms((prev) => {
          const next = { ...prev };
          (queueRes?.waiting || []).forEach((p: TherapyQueueItem) => {
            if (!next[p.visitId]) {
              next[p.visitId] = availableRooms[0].id;
            }
          });
          return next;
        });
      }
    } catch (err: any) {
      console.error('Failed to load therapy queue:', err);
      if (!isSilent) {
        toast.error('থেরাপি কিউ লোড করতে ব্যর্থ হয়েছে (Failed to load therapy queue)');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Realtime updates
  useRealtime((event) => {
    if (
      event.type.startsWith('therapy.') ||
      event.type.startsWith('visit.') ||
      event.type.startsWith('queue.') ||
      event.type.startsWith('session.')
    ) {
      fetchData(true);
    }
  });

  const formatRoomLabel = (room: RoomOption) => {
    const roomNum = room.roomNumber || room.code || '1';
    const name = room.name || `Therapy Room ${roomNum}`;
    return `রুম ${roomNum} (${name})`;
  };

  const handleCallPatient = async (patient: TherapyQueueItem) => {
    const roomId = selectedRooms[patient.visitId] || rooms[0]?.id || 'room-therapy-1';
    const roomObj = rooms.find((r) => r.id === roomId);
    const roomNumber = roomObj?.roomNumber || roomObj?.code || 1;
    const roomName = roomObj?.name
      ? (roomObj.name.match(/\d/) ? roomObj.name : `${roomObj.name} ${roomNumber}`)
      : `Therapy Room ${roomNumber}`;

    try {
      setCallingVisitId(patient.visitId);
      await api.therapy.callPatient({
        visitId: patient.visitId,
        patientId: patient.patientId,
        roomId,
        roomName,
        roomNumber: Number(roomNumber),
        modalityCode: patient.modalityCode || 'PHYSIO',
      });
      toast.success(
        `রোগী ${patient.patientNameBn || patient.patientNameEn} কে রুম ${roomNumber} (${roomName}) এ ডাকা হয়েছে! টিভি স্ক্রিনে ঘোষণা পাঠানো হয়েছে।`,
      );
      await fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || 'রোগীকে ডাকতে ব্যর্থ হয়েছে');
    } finally {
      setCallingVisitId(null);
    }
  };

  const handleMarkInTherapy = async (patient: TherapyQueueItem) => {
    const roomId = patient.assignedRoomId || selectedRooms[patient.visitId] || rooms[0]?.id;
    const roomObj = rooms.find((r) => r.id === roomId);
    const roomName = roomObj?.name || patient.assignedRoomName || 'Therapy Room';

    try {
      setCallingVisitId(patient.visitId);
      await api.therapy.markInTherapy({
        visitId: patient.visitId,
        patientId: patient.patientId,
        roomId,
        roomName,
      });
      toast.success(`রোগী ${patient.patientNameBn || patient.patientNameEn} থেরাপিতে প্রবেশ করেছেন`);
      await fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || 'সেশন শুরু করতে ব্যর্থ হয়েছে');
    } finally {
      setCallingVisitId(null);
    }
  };

  const handleRecallPatient = async (patient: TherapyQueueItem) => {
    try {
      setCallingVisitId(patient.visitId);
      await api.therapy.recallPatient({
        visitId: patient.visitId,
        patientId: patient.patientId,
        roomId: patient.assignedRoomId || undefined,
        roomName: patient.assignedRoomName || undefined,
      });
      toast.success('টিভি ও স্পিকারে পুনরায় ঘোষণা পাঠানো হয়েছে (Re-announced)');
    } catch (err: any) {
      toast.error(err?.message || 'পুনরায় ডাকতে ব্যর্থ হয়েছে');
    } finally {
      setCallingVisitId(null);
    }
  };

  const handleCancelCall = async (patient: TherapyQueueItem) => {
    try {
      setCallingVisitId(patient.visitId);
      await api.therapy.cancelCall({
        visitId: patient.visitId,
        patientId: patient.patientId,
      });
      toast.info('কল বাতিল করা হয়েছে এবং রোগী কিউতে রাখা হয়েছে');
      await fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || 'কল বাতিল করতে ব্যর্থ হয়েছে');
    } finally {
      setCallingVisitId(null);
    }
  };

  const handleCompleteSession = async (patient: TherapyQueueItem) => {
    try {
      setCallingVisitId(patient.visitId);
      const activeSession = activeSessions.find(
        (as) => as.patientId === patient.patientId || as.visitId === patient.visitId,
      );
      const targetSessionId =
        activeSession?.sessionId || (patient as any).sessionId || activeSession?.id || patient.visitId;

      const durationMin = activeSession?.startedAt
        ? Math.max(1, Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 60000))
        : Number(activeSession?.durationMinutes || 15);

      await api.therapy.completeSession(targetSessionId, {
        durationMinutes: durationMin,
        outcomeNote: 'Session completed by therapist',
        notes: 'Session completed by therapist',
      });

      toast.success(
        `রোগী ${patient.patientNameBn || patient.patientNameEn} এর থেরাপি সেশন সফলভাবে সম্পন্ন হয়েছে!`,
      );
      await fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || 'সেশন সম্পন্ন করতে ব্যর্থ হয়েছে');
    } finally {
      setCallingVisitId(null);
    }
  };

  // Combine calling patients, waiting patients, and in-therapy patients
  const allQueuePatients = useMemo(() => {
    const list = [...nowServingPatients, ...waitingPatients, ...inTherapyPatients];
    return list.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.patientNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.patientNameBn && p.patientNameBn.includes(searchQuery)) ||
        p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.tokenNumber).includes(searchQuery);

      const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchSearch && matchPriority && matchStatus;
    });
  }, [nowServingPatients, waitingPatients, inTherapyPatients, searchQuery, priorityFilter, statusFilter]);

  const waitingOnlyCount = waitingPatients.length;
  const callingCount = nowServingPatients.length;
  const inTherapyCount = inTherapyPatients.length;

  return (
    <div className="space-y-4">
      {/* Top Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          onClick={() => setStatusFilter(statusFilter === 'waiting' ? 'all' : 'waiting')}
          className={`p-3 sm:p-4 backdrop-blur-sm border transition-all cursor-pointer ${
            statusFilter === 'waiting'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
              : 'border-border/80 bg-card/60 hover:bg-card/90'
          } flex items-center gap-3`}
        >
          <div className="size-10 sm:size-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Activity className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">অপেক্ষমাণ রোগী (Waiting)</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {waitingOnlyCount}
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setStatusFilter(statusFilter === 'calling' ? 'all' : 'calling')}
          className={`p-3 sm:p-4 backdrop-blur-sm border transition-all cursor-pointer ${
            statusFilter === 'calling'
              ? 'border-amber-500 bg-amber-500/10 shadow-sm'
              : 'border-border/80 bg-card/60 hover:bg-card/90'
          } flex items-center gap-3`}
        >
          <div className="size-10 sm:size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold animate-pulse">
            <Volume2 className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">বর্তমানে ডাকা হচ্ছে (Calling)</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {callingCount}
            </div>
          </div>
        </Card>

        <Card
          onClick={() => setStatusFilter(statusFilter === 'in_therapy' ? 'all' : 'in_therapy')}
          className={`p-3 sm:p-4 backdrop-blur-sm border transition-all cursor-pointer ${
            statusFilter === 'in_therapy'
              ? 'border-cyan-500 bg-cyan-500/10 shadow-sm'
              : 'border-border/80 bg-card/60 hover:bg-card/90'
          } flex items-center gap-3`}
        >
          <div className="size-10 sm:size-11 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <Play className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">থেরাপিতে আছেন (In Therapy)</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400">
              {inTherapyCount}
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-card/60 backdrop-blur-sm border-border/80 flex items-center gap-3">
          <div className="size-10 sm:size-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
            <Building2 className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">ফাঁকা রুম/বেড (Available)</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400">
              {rooms.filter((r) => !r.isOccupied).length} / {rooms.length}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Action Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="রোগীর নাম, ফোন বা MRN দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-card/60"
            />
          </div>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-card/60">
              <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="অগ্রাধিকার" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল অগ্রাধিকার</SelectItem>
              <SelectItem value="emergency">🚨 জরুরি (Emergency)</SelectItem>
              <SelectItem value="normal">সাধারণ (Normal)</SelectItem>
              <SelectItem value="package">প্যাকেজ (Package)</SelectItem>
              <SelectItem value="elderly">বয়োজ্যেষ্ঠ (Elderly)</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Quick Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              সকল
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('waiting')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'waiting'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              অপেক্ষমাণ ({waitingOnlyCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('calling')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'calling'
                  ? 'bg-amber-500/20 text-amber-400 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ডাকা হচ্ছে ({callingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in_therapy')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'in_therapy'
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              থেরাপিতে আছেন ({inTherapyCount})
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData()}
          disabled={refreshing}
          className="h-9 gap-2 text-xs"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>রিফ্রেশ</span>
        </Button>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="size-6 animate-spin text-emerald-500" />
          <span>থেরাপি কিউ লোড হচ্ছে...</span>
        </div>
      ) : allQueuePatients.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border/80 bg-card/40">
          <Activity className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            {statusFilter === 'in_therapy'
              ? 'বর্তমানে কোনো রোগী থেরাপিতে নেই'
              : statusFilter === 'calling'
                ? 'বর্তমানে কোনো রোগীকে ডাকা হচ্ছে না'
                : statusFilter === 'waiting'
                  ? 'কোনো অপেক্ষমাণ রোগী নেই'
                  : 'থেরাপি কিউতে কোনো রোগী নেই'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {statusFilter === 'in_therapy'
              ? 'অপেক্ষমাণ রোগীকে ডেকে "থেরাপি শুরু করুন" চাপলে সেশন এখানে প্রদর্শিত হবে।'
              : 'চেক-ইন বা রিসেপশন থেকে রোগীকে থেরাপির জন্য ফরোয়ার্ড করা হলে এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {allQueuePatients.map((patient) => {
            const isCalling = patient.status === 'calling';
            const isInTherapy = patient.status === 'in_therapy';
            const availableRooms = rooms.filter((r) => !r.isOccupied);

            const activeSession = activeSessions.find(
              (as) => as.patientId === patient.patientId || as.visitId === patient.visitId,
            );
            const modalityCode = activeSession?.modalityCode || patient.modalityCode || 'PHYSIO';
            const modalityName =
              activeSession?.modalityNameBn ||
              activeSession?.modalityNameEn ||
              patient.modalityNameBn ||
              patient.modalityName ||
              'ফিজিওথেরাপি ও পুনর্বাসন';
            const startedAt = activeSession?.startedAt || (patient as any).startedAt;
            const durationMinutes = Number(
              activeSession?.durationMinutes || (patient as any).durationMinutes || 20,
            );
            const roomName = activeSession?.bedName || patient.assignedRoomName || 'থেরাপি রুম';

            const elapsedSec = startedAt
              ? Math.max(0, Math.floor((nowTick - new Date(startedAt).getTime()) / 1000))
              : 0;
            const totalSec = durationMinutes * 60;
            const remainingSec = Math.max(0, totalSec - elapsedSec);
            const isOvertime = startedAt ? elapsedSec > totalSec : false;
            const progressPercent =
              totalSec > 0 ? Math.min(100, Math.round((elapsedSec / totalSec) * 100)) : 0;

            const formatSec = (sec: number) => {
              const m = Math.floor(sec / 60);
              const s = sec % 60;
              return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            };

            return (
              <Card
                key={patient.visitId}
                className={`p-4 transition-all duration-300 relative overflow-hidden ${
                  isCalling
                    ? 'border-2 border-amber-500/80 bg-amber-500/5 shadow-lg shadow-amber-500/10'
                    : isInTherapy
                      ? 'border-2 border-cyan-500/80 bg-cyan-500/5 shadow-lg shadow-cyan-500/10'
                      : 'border-border/80 bg-card/70 hover:border-emerald-500/40 hover:bg-card/90'
                }`}
              >
                {/* Calling indicator ribbon */}
                {isCalling && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-bl-lg flex items-center gap-1.5 shadow-sm">
                    <span className="size-2 rounded-full bg-black animate-ping" />
                    <span>টিভি স্ক্রিনে ডাকা হচ্ছে</span>
                  </div>
                )}

                {/* In-Therapy indicator ribbon */}
                {isInTherapy && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-500 to-emerald-500 text-black text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-bl-lg flex items-center gap-1.5 shadow-sm">
                    <span className="size-2 rounded-full bg-black animate-pulse" />
                    <span>⚡ থেরাপিতে আছেন</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`size-12 rounded-xl flex items-center justify-center border ${
                        isInTherapy
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : isCalling
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-emerald-500/10 border-emerald-500/30'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center text-center">
                        <Clock
                          className={`size-4 ${
                            isInTherapy
                              ? 'text-cyan-400'
                              : isCalling
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        />
                        <span className="font-mono text-[10px] font-bold text-muted-foreground mt-0.5">
                          {patient.toldTime ||
                            (patient.checkedInAt
                              ? new Date(patient.checkedInAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base leading-snug line-clamp-1">
                        {patient.patientNameBn || patient.patientNameEn}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>{patient.mrn}</span>
                        {patient.gender && (
                          <span>• {patient.gender === 'male' ? 'পুরুষ' : 'নারী'}</span>
                        )}
                        {patient.ageYears && <span>• {patient.ageYears} বছর</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {patient.priority === 'emergency' && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] uppercase font-bold animate-pulse"
                      >
                        🚨 জরুরি
                      </Badge>
                    )}
                    {patient.priority === 'package' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-cyan-500/50 text-cyan-400"
                      >
                        প্যাকেজ
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Running Therapy Live Status Card */}
                {isInTherapy ? (
                  <div className="space-y-2 mb-4 p-2.5 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-emerald-500/5 to-cyan-500/5 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <Badge className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[10px] tracking-wide shrink-0">
                          ⚡ [{modalityCode}]
                        </Badge>
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {modalityName}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-cyan-500/50 text-cyan-600 dark:text-cyan-400 shrink-0 font-bold"
                      >
                        <Building2 className="size-3 mr-1 inline" />
                        {roomName}
                      </Badge>
                    </div>

                    <div className="space-y-1 bg-background/80 p-2 rounded-lg border border-border/60">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                          <Activity className="size-3.5 animate-pulse text-emerald-500" />
                          <span>চলমান: {formatSec(elapsedSec)}</span>
                        </span>
                        {isOvertime ? (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-pulse font-extrabold">
                            <AlertCircle className="size-3" />
                            <span>+ {formatSec(elapsedSec - totalSec)} অতিরিক্ত</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium text-[11px]">
                            বাকি: {formatSec(remainingSec)} / {durationMinutes} মি:
                          </span>
                        )}
                      </div>

                      <div className="w-full bg-muted/80 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOvertime ? 'bg-rose-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs text-muted-foreground mb-4 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-foreground/80">
                        <Activity className="size-3.5 text-emerald-400" />
                        <span>
                          {patient.modalityNameBn ||
                            patient.modalityName ||
                            'ফিজিওথেরাপি ও পুনর্বাসন'}
                        </span>
                      </span>
                      {patient.toldTime && (
                        <span className="font-mono text-[11px] text-amber-400">
                          সময়: {patient.toldTime}
                        </span>
                      )}
                    </div>

                    {isCalling && (
                      <div className="flex items-center justify-between text-amber-500 font-medium pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="size-3.5" />
                          <span>স্থান: {patient.assignedRoomName || 'থেরাপি রুম'}</span>
                        </span>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                          ডাকা হচ্ছে
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons based on status */}
                {isCalling ? (
                  /* 1. Calling State Actions */
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      onClick={() => handleMarkInTherapy(patient)}
                      disabled={callingVisitId === patient.visitId}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-9 gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>থেরাপি শুরু করুন (Mark in Therapy)</span>
                    </Button>

                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSwitchRoomPatient(patient)}
                        className="h-8 text-xs border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1 font-semibold cursor-pointer active:scale-95"
                      >
                        <ArrowRightLeft className="size-3.5" />
                        <span>রুম বদল</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecallPatient(patient)}
                        disabled={callingVisitId === patient.visitId}
                        className="h-8 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1 font-semibold cursor-pointer active:scale-95"
                      >
                        <Volume2 className="size-3.5" />
                        <span>ডাকুন</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelCall(patient)}
                        disabled={callingVisitId === patient.visitId}
                        className="h-8 text-xs border-red-500/40 text-red-500 hover:bg-red-500/10 gap-1 font-semibold cursor-pointer active:scale-95"
                      >
                        <XCircle className="size-3.5" />
                        <span>বাতিল</span>
                      </Button>
                    </div>
                  </div>
                ) : isInTherapy ? (
                  /* 2. In Therapy State Actions */
                  <div className="space-y-2">
                    {/* Row 1: All Plans & All Files */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPlansPatient(patient)}
                        className="h-8 text-xs border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 gap-1.5 font-semibold cursor-pointer active:scale-95"
                      >
                        <ClipboardList className="size-3.5 text-cyan-400" />
                        <span>সকল প্ল্যান (Plans)</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setFilesPatient({
                            id: patient.patientId,
                            name: patient.patientNameBn || patient.patientNameEn,
                            nameEn: patient.patientNameEn,
                            nameBn: patient.patientNameBn,
                            mrn: patient.mrn,
                            phone: patient.phone,
                            visitId: patient.visitId,
                          })
                        }
                        className="h-8 text-xs border-purple-500/40 text-purple-500 hover:bg-purple-500/10 gap-1.5 font-semibold cursor-pointer active:scale-95"
                      >
                        <FolderOpen className="size-3.5 text-purple-400" />
                        <span>সকল ফাইল (Files)</span>
                      </Button>
                    </div>

                    {/* Row 2: Start Session & Switch Room & Send to Cashier */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStartSessionPatient(patient)}
                        className="h-9 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1 font-semibold cursor-pointer active:scale-95"
                      >
                        <Play className="size-3.5 text-amber-400" />
                        <span>সেশন শুরু</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSwitchRoomPatient(patient)}
                        className="h-9 text-xs border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1 font-semibold cursor-pointer active:scale-95"
                      >
                        <ArrowRightLeft className="size-3.5" />
                        <span>রুম বদল</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setSendToCashierPatient(patient)}
                        className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 font-bold shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
                      >
                        <CreditCard className="size-3.5" />
                        <span>ক্যাশিয়ার</span>
                      </Button>
                    </div>

                    {/* Row 3: Complete Session Button */}
                    <Button
                      size="sm"
                      onClick={() => handleCompleteSession(patient)}
                      disabled={callingVisitId === patient.visitId}
                      className="w-full h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 font-bold shadow-xs cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>সেশন সমাপ্ত করুন (Complete Session)</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setTimelinePatient({
                          id: patient.patientId,
                          name: patient.patientNameBn || patient.patientNameEn,
                        })
                      }
                      className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    >
                      <Clock className="size-3" />
                      <span>টাইমলাইন ও হিস্ট্রি দেখুন</span>
                    </Button>
                  </div>
                ) : (
                  /* 3. Waiting State Actions */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedRooms[patient.visitId] || availableRooms[0]?.id || rooms[0]?.id || ''}
                        onValueChange={(val: string) =>
                          setSelectedRooms((prev) => ({ ...prev, [patient.visitId]: val }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-9 text-xs bg-card/60 border-emerald-500/30">
                          <SelectValue placeholder="রুম নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="max-h-56 overflow-y-auto z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl"
                    >
                          {rooms.map((room) => (
                            <SelectItem
                              key={room.id}
                              value={room.id}
                              disabled={room.isOccupied}
                              className="text-xs"
                            >
                              {formatRoomLabel(room)} {room.isOccupied ? '(ব্যস্ত)' : '(ফাঁকা)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        onClick={() => handleCallPatient(patient)}
                        disabled={callingVisitId === patient.visitId}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 gap-1.5 whitespace-nowrap active:scale-95 shadow-sm shadow-emerald-600/20 cursor-pointer"
                      >
                        <Volume2 className="size-4 text-white" />
                        <span>ডাকুন (Call)</span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setTimelinePatient({
                          id: patient.patientId,
                          name: patient.patientNameBn || patient.patientNameEn,
                        })
                      }
                      className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    >
                      <Clock className="size-3" />
                      <span>টাইমলাইন ও হিস্ট্রি দেখুন</span>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Patient Timeline Modal */}
      {timelinePatient && (
        <PatientTimelineModal
          open={!!timelinePatient}
          onOpenChange={(open) => {
            if (!open) setTimelinePatient(null);
          }}
          patientId={timelinePatient.id}
          patientName={timelinePatient.name}
        />
      )}

      {/* Patient Files List Modal */}
      {filesPatient && (
        <PatientFilesListModal
          open={!!filesPatient}
          onOpenChange={(open) => {
            if (!open) setFilesPatient(null);
          }}
          patient={filesPatient}
          visitId={filesPatient.visitId}
        />
      )}

      {/* All Plans Modal */}
      <AllPlansModal
        open={!!plansPatient}
        onOpenChange={(open) => {
          if (!open) setPlansPatient(null);
        }}
        patient={plansPatient}
        onOpenPlanBuilder={(p) => {
          setPlansPatient(null);
          setBuilderPatient(p);
        }}
      />

      {/* Treatment Plan Builder Modal (Handler & Doctor A4 Sequenced Plans) */}
      {builderPatient && (
        <TreatmentPlanBuilderModal
          open={Boolean(builderPatient)}
          onOpenChange={(op) => !op && setBuilderPatient(null)}
          patient={{
            id: builderPatient.patientId,
            nameEn: builderPatient.patientNameEn,
            nameBn: builderPatient.patientNameBn,
            mrn: builderPatient.mrn,
            phone: builderPatient.phone,
            gender: builderPatient.gender,
            ageYears: builderPatient.ageYears,
          }}
          visitId={builderPatient.visitId}
          onPlansSaved={() => {
            fetchData(true);
          }}
        />
      )}

      {/* Start Therapy Session Modal */}
      <StartTherapySessionModal
        open={!!startSessionPatient}
        onOpenChange={(open) => {
          if (!open) setStartSessionPatient(null);
        }}
        patient={startSessionPatient}
        onOpenPlanBuilder={(p) => {
          setStartSessionPatient(null);
          setBuilderPatient(p);
        }}
        onSuccess={() => fetchData(true)}
      />

      {/* Send to Cashier Modal */}
      <SendToCashierModal
        open={!!sendToCashierPatient}
        onOpenChange={(open) => {
          if (!open) setSendToCashierPatient(null);
        }}
        patient={sendToCashierPatient}
        onSuccess={() => fetchData(true)}
      />

      {/* Switch Therapy Room Modal */}
      <SwitchTherapyRoomModal
        open={!!switchRoomPatient}
        onOpenChange={(open) => {
          if (!open) setSwitchRoomPatient(null);
        }}
        patient={switchRoomPatient}
        rooms={rooms}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Send to Cashier Modal Component
// -----------------------------------------------------------------------------
interface SendToCashierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: TherapyQueueItem | null;
  onSuccess: () => void;
}

export function SendToCashierModal({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: SendToCashierModalProps) {
  const [feeTaka, setFeeTaka] = useState<number>(300);
  const [modalityCode, setModalityCode] = useState<string>('IFT + Ultrasound Therapy');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (patient) {
      setFeeTaka(300);
      setModalityCode(
        patient.modalityNameBn || patient.modalityName || patient.modalityCode || 'IFT + Ultrasound Therapy',
      );
      setNotes('');
    }
  }, [patient]);

  if (!patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeTaka || feeTaka < 0) {
      toast.error('অনুগ্রহ করে একটি সঠিক ফি লিখুন (Please enter a valid fee)');
      return;
    }

    try {
      setSubmitting(true);
      await api.therapy.sendToCashier({
        visitId: patient.visitId,
        patientId: patient.patientId,
        feeTaka: Number(feeTaka),
        modalityCode: modalityCode.trim(),
        notes: notes.trim() || undefined,
      });

      toast.success(
        `ফিক্সড বিল ৳${feeTaka} সহ রোগীকে সফলভাবে ক্যাশিয়ারে পাঠানো হয়েছে।`,
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'ক্যাশিয়ারে পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CreditCard className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                ক্যাশিয়ারে পাঠান ও ফি লক করুন (Send to Cashier)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                হ্যান্ডলার কর্তৃক নির্ধারিত ফিক্সড ফি সরাসরি ক্যাশিয়ারে ফরোয়ার্ড করা হবে
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Patient Quick Info Card */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Clock className="size-5" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-foreground">
                  {patient.patientNameBn || patient.patientNameEn}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  MRN: {patient.mrn} {patient.phone ? `· ${patient.phone}` : ''}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 text-xs">
              {patient.assignedRoomName || 'Therapy Room'}
            </Badge>
          </div>

          {/* Fixed Therapy Fee Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>ফিক্সড থেরাপি ফি (Fixed Fee ৳) *</span>
              <span className="text-[11px] font-normal text-muted-foreground">ডিফল্ট: ৳৩০০</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-500">৳</span>
              <Input
                type="number"
                min="0"
                step="50"
                required
                value={feeTaka}
                onChange={(e) => setFeeTaka(Number(e.target.value))}
                className="pl-8 h-10 font-mono text-base font-bold bg-card"
                placeholder="300"
              />
            </div>
            {/* Quick Fee Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              {[200, 300, 400, 500, 600, 800].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFeeTaka(preset)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                    feeTaka === preset
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ৳{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Modality Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              মডালিটি বিবরণ (Modality Description) *
            </Label>
            <Input
              type="text"
              required
              value={modalityCode}
              onChange={(e) => setModalityCode(e.target.value)}
              className="h-10 text-xs sm:text-sm bg-card"
              placeholder="e.g. IFT + Ultrasound Therapy + Traction"
            />
          </div>

          {/* Handler Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              হ্যান্ডলার নোট (Notes) - ঐচ্ছিক
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs sm:text-sm bg-card resize-none"
              placeholder="সেশন সংক্রান্ত কোনো মন্তব্য বা বিশেষ নির্দেশনা..."
            />
          </div>

          {/* Locked Notice Alert */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2.5">
            <Lock className="size-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>🔒 এই ফি অপরিবর্তনযোগ্য (Locked) থাকবে:</strong>
              <p className="text-[11px] text-amber-500/90 mt-0.5">
                ক্যাশিয়ার এই ফি পরিবর্তন করতে পারবেন না। ক্যাশিয়ার কেবল এই নির্ধারিত ফি গ্রহণ করে রিসেপশনে চেক-আউটের জন্য পাঠাবেন।
              </p>
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9 text-xs"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-md shadow-emerald-600/20"
            >
              {submitting ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>ক্যাশিয়ারে পাঠান ও ফি লক করুন</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// All Plans Modal Component
// -----------------------------------------------------------------------------
interface AllPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: TherapyQueueItem | null;
  onOpenPlanBuilder?: (patient: TherapyQueueItem) => void;
}

export function AllPlansModal({
  open,
  onOpenChange,
  patient,
  onOpenPlanBuilder,
}: AllPlansModalProps) {
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    if (open && patient?.patientId) {
      setLoading(true);
      Promise.all([
        api.prescriptions.getByPatientId(patient.patientId).catch(() => []),
        api.therapy.getCredits(patient.patientId).catch(() => []),
        api.clinical.getConsultation(patient.visitId).catch(() => null),
      ])
        .then(([rxList, credits, consult]) => {
          setPrescriptions(Array.isArray(rxList) ? rxList : []);
          setPackages(Array.isArray(credits) ? credits : []);
          if (consult?.therapyPlans && Array.isArray(consult.therapyPlans)) {
            setPlans(consult.therapyPlans);
          } else {
            setPlans([]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, patient?.patientId, patient?.visitId]);

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  সকল থেরাপি প্ল্যান ও প্রেসক্রিপশন (All Plans)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  রোগী: <strong className="text-foreground">{patient.patientNameBn || patient.patientNameEn}</strong> · MRN:{' '}
                  <strong className="text-foreground">{patient.mrn}</strong>
                </DialogDescription>
              </div>
            </div>
            {onOpenPlanBuilder && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenPlanBuilder(patient)}
                className="h-8 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1.5 shrink-0"
              >
                <Sparkles className="size-3.5 text-emerald-500" />
                <span>প্ল্যান তৈরি / প্রিন্ট (A4)</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="size-6 animate-spin text-cyan-500" />
              <span>প্ল্যান ও প্রেসক্রিপশন লোড হচ্ছে...</span>
            </div>
          ) : (
            <>
              {/* Prescribed Modalities / Therapy Plans */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity className="size-3.5 text-emerald-400" />
                  <span>নির্দেশিত মডালিটি ও থেরাপি তালিকা (Prescribed Modalities)</span>
                </h4>

                {plans.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {plans.map((pl: any, idx: number) => (
                      <div
                        key={pl.id || idx}
                        className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">{pl.modalityCode}</span>
                          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-[10px]">
                            {pl.status || 'Active'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center justify-between font-mono">
                          <span>সেশন: {pl.completedSessions || 0} / {pl.totalSessionsPrescribed || 10}</span>
                          <span>ফ্রিকোয়েন্সি: {pl.frequency || 'Daily'}</span>
                        </div>
                        {pl.notes && (
                          <div className="text-[11px] text-foreground/80 bg-background/60 p-1.5 rounded border border-border/40 mt-1">
                            {pl.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2.5">
                    <Sparkles className="size-4 text-cyan-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {patient.modalityNameBn || patient.modalityName || 'কম্প্রিহেনসিভ ফিজিওথেরাপি রিহ্যাব (IFT + UST)'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">স্ট্যান্ডার্ড ফিজিওথেরাপি ও ইলেকট্রোথেরাপি প্রোটোকল প্রযোজ্য</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Package Credits / Active Subscriptions */}
              {packages.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-border/60">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="size-3.5 text-cyan-400" />
                    <span>রোগীর সক্রিয় প্যাকেজ ও ব্যালেন্স (Active Package Credits)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {packages.map((pkg: any) => (
                      <div
                        key={pkg.id}
                        className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold text-sm text-foreground">
                          <span>{pkg.packageNameBn || pkg.packageNameEn || 'থেরাপি প্যাকেজ'}</span>
                          <Badge className="bg-cyan-500 text-black text-[10px] font-bold">
                            {pkg.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono flex items-center justify-between">
                          {pkg.packageType === 'per_day' ? (
                            <span>অবশিষ্ট দিন: <strong>{pkg.remainingDays}</strong> দিন</span>
                          ) : (
                            <span>অবশিষ্ট সেশন: <strong>{pkg.remainingSessions}</strong> টি</span>
                          )}
                          <span>মেয়াদ: {pkg.expiresAt?.slice(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prescriptions History */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="size-3.5 text-purple-400" />
                  <span>ডাক্তারের প্রেসক্রিপশন ও পরামর্শ (Doctor Prescriptions)</span>
                </h4>

                {prescriptions.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">
                    কোনো পূর্ববর্তী প্রেসক্রিপশন পাওয়া যায়নি।
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.map((rx: any) => (
                      <div
                        key={rx.id}
                        className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            ডাঃ {rx.doctor?.displayName || rx.doctorName || 'কনসালটেন্ট'}
                          </span>
                          <span className="text-muted-foreground font-mono text-[11px]">
                            {rx.createdAt?.slice(0, 10)}
                          </span>
                        </div>

                        {rx.diagnosis && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">রোগনির্ণয় (Diagnosis): </span>
                            <strong className="text-foreground">{rx.diagnosis}</strong>
                          </div>
                        )}

                        {rx.advice && (
                          <div className="text-xs bg-muted/30 p-2 rounded-lg text-muted-foreground">
                            <strong className="text-foreground">পরামর্শ: </strong>
                            {rx.advice}
                          </div>
                        )}

                        {rx.items && rx.items.length > 0 && (
                          <div className="pt-1">
                            <div className="text-[11px] font-semibold text-muted-foreground mb-1">ওষুধের তালিকা:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {rx.items.map((it: any, i: number) => (
                                <span
                                  key={i}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted/50 border border-border/60 text-foreground/90 font-mono"
                                >
                                  {it.brandName || it.genericName} ({it.dosageForm || 'Tab'}) - {it.frequency || '1+0+1'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/30 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-8 text-xs cursor-pointer"
          >
            বন্ধ করুন (Close)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Start Therapy Session Modal Component (Flexible Doctor Plan & Catalog)
// -----------------------------------------------------------------------------
interface StartTherapySessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: TherapyQueueItem | null;
  onOpenPlanBuilder?: (patient: TherapyQueueItem) => void;
  onSuccess: () => void;
}

export function StartTherapySessionModal({
  open,
  onOpenChange,
  patient,
  onOpenPlanBuilder,
  onSuccess,
}: StartTherapySessionModalProps) {
  const [loadingData, setLoadingData] = useState(false);
  const [doctorPlans, setDoctorPlans] = useState<any[]>([]);
  const [modalitiesCatalog, setModalitiesCatalog] = useState<any[]>([]);
  const [modalitySourceTab, setModalitySourceTab] = useState<'plan' | 'catalog'>('plan');
  const [selectedModalityCode, setSelectedModalityCode] = useState('IFT');
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !patient) return;

    setDurationMinutes(15);
    setNotes('');

    const loadData = async () => {
      try {
        setLoadingData(true);
        const [plansRes, catalogRes] = await Promise.all([
          api.therapy.getPlans(patient.patientId).catch(() => []),
          api.catalog.getModalities().catch(() => []),
        ]);

        const activeDoctorPlans = (plansRes || [])
          .filter((p: any) => p.status === 'active')
          .map((p: any, idx: number) => {
            let seq = idx + 1;
            let dur = p.defaultDurationMin || 15;
            let noteText = p.notes;
            if (p.notes) {
              try {
                const parsed =
                  typeof p.notes === 'string' && p.notes.startsWith('{')
                    ? JSON.parse(p.notes)
                    : null;
                if (parsed) {
                  if (parsed.sequence) seq = Number(parsed.sequence);
                  if (parsed.durationMin) dur = Number(parsed.durationMin);
                  if (parsed.clinicalNote) noteText = parsed.clinicalNote;
                }
              } catch {
                // ignore
              }
            }
            return {
              ...p,
              sequenceOrder: seq,
              calculatedDuration: dur,
              clinicalNoteText: noteText,
            };
          })
          .sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);

        const activeCatalog = (catalogRes || []).filter(
          (m: any) => m.isActive !== 0 && m.isActive !== false,
        );

        setDoctorPlans(activeDoctorPlans);
        setModalitiesCatalog(activeCatalog);

        if (activeDoctorPlans.length > 0) {
          setModalitySourceTab('plan');
          setSelectedModalityCode(activeDoctorPlans[0].modalityCode);
          setSelectedPlanId(activeDoctorPlans[0].id);
          setDurationMinutes(activeDoctorPlans[0].calculatedDuration || 15);
        } else {
          setModalitySourceTab('catalog');
          setSelectedPlanId(undefined);
          if (activeCatalog.length > 0) {
            setSelectedModalityCode(activeCatalog[0].code);
            setDurationMinutes(activeCatalog[0].defaultDurationMin || 15);
          } else {
            setSelectedModalityCode(patient.modalityCode || 'IFT');
            setDurationMinutes(15);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load doctor plans or modalities catalog:', err?.message);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [open, patient]);

  if (!patient) return null;

  const hasDoctorPlans = doctorPlans.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.therapy.startSession({
        patientId: patient.patientId,
        modalityCode: selectedModalityCode,
        durationMinutes: Number(durationMinutes) || 15,
        roomId: patient.assignedRoomId || undefined,
        visitId: patient.visitId,
        planId: selectedPlanId || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `রোগী ${patient.patientNameBn || patient.patientNameEn} এর ${selectedModalityCode} সেশন (${durationMinutes} মিনিট) সফলভাবে শুরু হয়েছে! কিউ থেকে সরানো হয়েছে।`,
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'সেশন শুরু করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Play className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                থেরাপি সেশন শুরু করুন (Start Therapy Session)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                রোগী: <strong className="text-foreground">{patient.patientNameBn || patient.patientNameEn}</strong> (MRN: {patient.mrn})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {loadingData ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="size-4 animate-spin text-amber-500" />
              <span>ট্রিটমেন্ট প্ল্যান ও ক্যাটালগ যাচাই করা হচ্ছে...</span>
            </div>
          ) : (
            <>
              {/* Doctor Plan Rule Status Banner */}
              {hasDoctorPlans ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="size-3.5" />
                      <span>ডাক্তার কর্তৃক নির্ধারিত সিকোয়েন্সড প্ল্যান প্রযোজ্য</span>
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                      {doctorPlans.length} টি নির্ধারিত ধাপ
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-500/20 text-[11px]">
                    <span className="text-muted-foreground">হ্যান্ডলার প্রয়োজন অনুযায়ী সময় বা মডালিটি পরিবর্তন করতে পারবেন</span>
                    {onOpenPlanBuilder && (
                      <button
                        type="button"
                        onClick={() => onOpenPlanBuilder(patient)}
                        className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer shrink-0"
                      >
                        ✏️ প্ল্যান এডিট
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                    <div className="leading-relaxed">
                      <strong>আজকের জন্য ডাক্তারের কোনো নির্দিষ্ট প্ল্যান নেই:</strong>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        ক্যাটালগ থেকে যেকোনো মডালিটি সিলেক্ট করে সেশন শুরু করুন অথবা নতুন প্ল্যান সাজান।
                      </p>
                    </div>
                  </div>
                  {onOpenPlanBuilder && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenPlanBuilder(patient)}
                      className="h-7 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
                    >
                      ➕ প্ল্যান তৈরি
                    </Button>
                  )}
                </div>
              )}

              {/* Modality Selector with Source Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    মডালিটি নির্বাচন (Select Modality) *
                  </Label>
                  {hasDoctorPlans && (
                    <div className="flex rounded-lg bg-muted p-0.5 text-[10px] font-semibold border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setModalitySourceTab('plan');
                          if (doctorPlans.length > 0) {
                            setSelectedModalityCode(doctorPlans[0].modalityCode);
                            setSelectedPlanId(doctorPlans[0].id);
                            setDurationMinutes(doctorPlans[0].calculatedDuration || 15);
                          }
                        }}
                        className={cn(
                          'py-1 px-2 rounded transition-all cursor-pointer',
                          modalitySourceTab === 'plan'
                            ? 'bg-card text-foreground shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        📋 প্ল্যান ({doctorPlans.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalitySourceTab('catalog');
                          setSelectedPlanId(undefined);
                        }}
                        className={cn(
                          'py-1 px-2 rounded transition-all cursor-pointer',
                          modalitySourceTab === 'catalog'
                            ? 'bg-card text-foreground shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        ➕ ক্যাটালগ
                      </button>
                    </div>
                  )}
                </div>

                {hasDoctorPlans && modalitySourceTab === 'plan' ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-1">
                    {doctorPlans.map((plan, idx) => {
                      const isSelected = selectedModalityCode === plan.modalityCode && selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => {
                            setSelectedModalityCode(plan.modalityCode);
                            setSelectedPlanId(plan.id);
                            if (plan.calculatedDuration) {
                              setDurationMinutes(plan.calculatedDuration);
                            }
                          }}
                          className={cn(
                            'w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs cursor-pointer',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 text-foreground font-bold shadow-xs'
                              : 'border-border bg-card hover:bg-muted/50 text-foreground'
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <Badge className="bg-emerald-600 text-white font-mono text-[10px] shrink-0 mt-0.5">
                              ধাপ {plan.sequenceOrder || idx + 1}
                            </Badge>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">
                                  {plan.modalityNameBn || plan.modalityNameEn || plan.modalityCode}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  ({plan.modalityCode})
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                নির্ধারিত সময়: <strong>{plan.calculatedDuration || 15} মিনিট</strong> • সেশন:{' '}
                                <strong>
                                  {plan.completedSessions || 0} / {plan.totalSessionsPrescribed}
                                </strong>
                                {plan.clinicalNoteText ? ` • নোট: ${plan.clinicalNoteText}` : ''}
                              </div>
                            </div>
                          </div>

                          <Badge
                            className={cn(
                              'text-[10px]',
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-muted text-muted-foreground border border-border'
                            )}
                          >
                            {isSelected ? 'নির্বাচিত' : 'বাছাই'}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Select
                    value={selectedModalityCode}
                    onValueChange={(val) => {
                      setSelectedModalityCode(val);
                      setSelectedPlanId(undefined);
                      const mod = modalitiesCatalog.find((m) => m.code === val);
                      if (mod?.defaultDurationMin) {
                        setDurationMinutes(mod.defaultDurationMin);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm bg-card">
                      <SelectValue placeholder="ক্যাটালগ থেকে মডালিটি বেছে নিন" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="max-h-56 overflow-y-auto z-50 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl"
                    >
                      {modalitiesCatalog.length > 0 ? (
                        modalitiesCatalog.map((mod) => (
                          <SelectItem key={mod.code} value={mod.code} className="text-xs">
                            {mod.nameEn} ({mod.code}) {mod.nameBn ? `• ${mod.nameBn}` : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="IFT">IFT (Interferential Therapy)</SelectItem>
                          <SelectItem value="UST">UST (Ultrasound Therapy)</SelectItem>
                          <SelectItem value="TRACTION">Traction (Cervical / Lumbar)</SelectItem>
                          <SelectItem value="SWD">SWD (Shortwave Diathermy)</SelectItem>
                          <SelectItem value="TENS">TENS (Electrical Stimulation)</SelectItem>
                          <SelectItem value="EXERCISE">Therapeutic Exercise</SelectItem>
                          <SelectItem value="IRR">IRR (Infrared Radiation)</SelectItem>
                          <SelectItem value="WAX">Wax Bath Therapy</SelectItem>
                          <SelectItem value="PHYSIO">Physiotherapy & Rehab</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Duration Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>সেশন সময়কাল (Duration in Minutes)</span>
                  <span className="font-mono font-bold text-amber-500 dark:text-amber-400">
                    {durationMinutes} মিনিট
                  </span>
                </Label>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[10, 15, 20, 25, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={cn(
                        'h-9 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer',
                        durationMinutes === mins
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500 dark:text-amber-400 shadow-xs'
                          : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {mins}মি
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  সেশন নোট / মন্তব্য (ঐচ্ছিক)
                </Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: রোগীর সহ্যক্ষমতা ভালো, মৃদু ব্যথা..."
                  className="h-8 text-xs bg-card"
                />
              </div>
            </>
          )}

          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9 text-xs"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingData}
              className="h-9 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
            >
              {submitting ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              <span>সেশন টাইমার চালু করুন</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Switch Therapy Room Modal Component (Empty Room Verification)
// -----------------------------------------------------------------------------
interface SwitchTherapyRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: TherapyQueueItem | null;
  rooms: RoomOption[];
  onSuccess: () => void;
}

export function SwitchTherapyRoomModal({
  open,
  onOpenChange,
  patient,
  rooms,
  onSuccess,
}: SwitchTherapyRoomModalProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (patient) {
      // Pick first unoccupied room that is not current room
      const empty = rooms.find((r) => !r.isOccupied && r.id !== patient.assignedRoomId);
      if (empty) {
        setSelectedRoomId(empty.id);
      } else {
        setSelectedRoomId('');
      }
    }
  }, [patient, rooms]);

  if (!patient) return null;

  const handleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.visitId) {
      toast.error('রোগীর ভিজিট আইডি পাওয়া যায়নি (Visit ID missing)');
      return;
    }
    if (!selectedRoomId) {
      toast.error('দয়া করে একটি ফাঁকা থেরাপি রুম নির্বাচন করুন');
      return;
    }

    const targetRoom = rooms.find((r) => r.id === selectedRoomId);
    if (targetRoom?.isOccupied) {
      toast.error('নির্বাচিত রুমটি বর্তমানে ব্যস্ত। অনুগ্রহ করে একটি ফাঁকা রুম বেছে নিন।');
      return;
    }

    try {
      setSubmitting(true);
      await api.therapy.switchRoom({
        visitId: patient.visitId,
        targetRoomId: selectedRoomId,
      });

      toast.success(
        `রোগী ${patient.patientNameBn || patient.patientNameEn} কে সফলভাবে ${targetRoom?.name || 'নতুন রুমে'} স্থানান্তর করা হয়েছে!`
      );
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'রুম স্থানান্তর করতে ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const currentRoomName = patient.assignedRoomName || 'Therapy Room';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <ArrowRightLeft className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                থেরাপি রুম পরিবর্তন (Switch Therapy Room)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                রোগীকে অন্য একটি ফাঁকা থেরাপি রুম বা হলে স্থানান্তর করুন
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSwitch} className="p-4 sm:p-5 space-y-4">
          {/* Patient Details */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-foreground sm:text-sm">
                {patient.patientNameBn || patient.patientNameEn}
              </div>
              <div className="text-muted-foreground font-mono">MRN: {patient.mrn}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">বর্তমান রুম:</div>
              <Badge variant="outline" className="font-bold text-foreground">
                {currentRoomName}
              </Badge>
            </div>
          </div>

          {/* Room Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">
              নতুন ফাঁকা থেরাপি রুম নির্বাচন করুন (Target Empty Room) *
            </Label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto p-1">
              {rooms.map((room) => {
                const isCurrent = room.id === patient.assignedRoomId;
                const isOccupied = room.isOccupied;
                const isSelected = selectedRoomId === room.id;
                const disabled = isCurrent || isOccupied;

                return (
                  <button
                    key={room.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      'w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs',
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-foreground font-bold shadow-xs'
                        : disabled
                        ? 'border-border/40 bg-muted/20 opacity-60 cursor-not-allowed text-muted-foreground'
                        : 'border-border bg-card hover:bg-muted/50 text-foreground cursor-pointer'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className={cn('size-4', isSelected ? 'text-indigo-500' : 'text-muted-foreground')} />
                      <div>
                        <div>{room.name || `Therapy Room ${room.roomNumber}`}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          কোড: {room.roomNumber || room.code} • টাইপ: {room.type}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          বর্তমান রুম
                        </Badge>
                      ) : isOccupied ? (
                        <Badge variant="destructive" className="text-[10px]">
                          ব্যস্ত (Occupied)
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                          ফাঁকা (Empty)
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9 text-xs"
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedRoomId}
              className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
            >
              {submitting ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <ArrowRightLeft className="size-3.5" />
              )}
              <span>রুম স্থানান্তর নিশ্চিত করুন</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
