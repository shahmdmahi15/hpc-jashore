'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  PhoneCall,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Volume2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useRealtime } from '../../lib/use-realtime';
import { PatientTimelineModal } from '../patient/PatientTimelineModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface TherapyQueueItem {
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

interface RoomOption {
  id: string;
  name: string;
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
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [callingVisitId, setCallingVisitId] = useState<string | null>(null);

  // Timeline modal state
  const [timelinePatient, setTimelinePatient] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [queueRes, roomsRes] = await Promise.all([
        api.therapy.getQueue(),
        api.therapy.getRooms(),
      ]);

      setWaitingPatients(queueRes?.waiting || []);
      setNowServingPatients(queueRes?.nowServing || []);
      setActiveSessions(queueRes?.activeSessions || []);
      setRooms(roomsRes || []);

      // Pre-select first available room for patients if not selected
      const availableRooms = (roomsRes || []).filter((r: RoomOption) => !r.isOccupied);
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
  }, [fetchData]);

  // Realtime updates
  useRealtime((event) => {
    if (
      event.type.startsWith('therapy.') ||
      event.type.startsWith('visit.') ||
      event.type.startsWith('queue.')
    ) {
      fetchData(true);
    }
  });

  const handleCallPatient = async (patient: TherapyQueueItem) => {
    const roomId = selectedRooms[patient.visitId] || rooms[0]?.id || 'room-therapy-1';
    const roomObj = rooms.find((r) => r.id === roomId);
    const roomNumber = roomObj?.roomNumber || 1;
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
        `টোকেন #${String(patient.tokenNumber).padStart(2, '0')} কে ${roomName} এ ডাকা হয়েছে! টিভি স্ক্রিনে ঘোষণা পাঠানো হয়েছে।`,
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
      toast.success(`রোগী ${patient.patientNameBn || patient.patientNameEn} থেরাপি রুমে প্রবেশ করেছেন`);
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
      toast.success('টিভি ও স্পিকারে পুনরায় ঘোষণা পাঠানো হয়েছে');
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

  // Combine calling patients and waiting patients
  const allQueuePatients = useMemo(() => {
    const list = [...nowServingPatients, ...waitingPatients];
    return list.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.patientNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.patientNameBn && p.patientNameBn.includes(searchQuery)) ||
        p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.tokenNumber).includes(searchQuery);

      const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter;

      return matchSearch && matchPriority;
    });
  }, [nowServingPatients, waitingPatients, searchQuery, priorityFilter]);

  return (
    <div className="space-y-4">
      {/* Top Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4 bg-card/60 backdrop-blur-sm border-border/80 flex items-center gap-3">
          <div className="size-10 sm:size-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <Activity className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">অপেক্ষমাণ রোগী (Waiting)</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">
              {waitingPatients.length}
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-card/60 backdrop-blur-sm border-border/80 flex items-center gap-3">
          <div className="size-10 sm:size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold animate-pulse">
            <Volume2 className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">বর্তমানে ডাকা হচ্ছে (Calling)</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {nowServingPatients.length}
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-card/60 backdrop-blur-sm border-border/80 flex items-center gap-3">
          <div className="size-10 sm:size-11 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
            <Play className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">চলমান সেশন (In Session)</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400">
              {activeSessions.length}
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
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="রোগীর নাম, টোকেন # বা MRN দিয়ে খুঁজুন..."
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
          <h3 className="text-base font-bold text-foreground">থেরাপি কিউতে কোনো রোগী অপেক্ষমাণ নেই</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            চেক-ইন বা রিসেপশন থেকে রোগীকে থেরাপির জন্য ফরোয়ার্ড করা হলে এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {allQueuePatients.map((patient) => {
            const isCalling = patient.status === 'calling';
            const availableRooms = rooms.filter((r) => !r.isOccupied);

            return (
              <Card
                key={patient.visitId}
                className={`p-4 transition-all duration-300 relative overflow-hidden ${
                  isCalling
                    ? 'border-2 border-amber-500/80 bg-amber-500/5 shadow-lg shadow-amber-500/10'
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

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <span className="font-mono text-xl font-black text-emerald-400">
                        #{String(patient.tokenNumber).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base leading-snug line-clamp-1">
                        {patient.patientNameBn || patient.patientNameEn}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>{patient.mrn}</span>
                        {patient.gender && <span>• {patient.gender === 'male' ? 'পুরুষ' : 'নারী'}</span>}
                        {patient.ageYears && <span>• {patient.ageYears} বছর</span>}
                      </div>
                    </div>
                  </div>

                  {patient.priority === 'emergency' && (
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold animate-pulse">
                      🚨 জরুরি
                    </Badge>
                  )}
                  {patient.priority === 'package' && (
                    <Badge variant="outline" className="text-[10px] border-cyan-500/50 text-cyan-400">
                      প্যাকেজ
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground mb-4 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <Activity className="size-3.5 text-emerald-400" />
                      <span>{patient.modalityNameBn || patient.modalityName || 'ফিজিওথেরাপি ও পুনর্বাসন'}</span>
                    </span>
                    {patient.toldTime && (
                      <span className="font-mono text-[11px] text-amber-400">
                        সময়: {patient.toldTime}
                      </span>
                    )}
                  </div>

                  {isCalling && (
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium pt-1 border-t border-border/40">
                      <Building2 className="size-3.5" />
                      <span>নির্ধারিত স্থান: {patient.assignedRoomName || 'থেরাপি রুম'}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons based on status */}
                {isCalling ? (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      onClick={() => handleMarkInTherapy(patient)}
                      disabled={callingVisitId === patient.visitId}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-9 gap-1.5"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>থেরাপি শুরু করুন (Mark in Therapy)</span>
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRecallPatient(patient)}
                        disabled={callingVisitId === patient.visitId}
                        className="h-8 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1"
                      >
                        <Volume2 className="size-3.5" />
                        <span>পুনরায় ডাকুন</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelCall(patient)}
                        disabled={callingVisitId === patient.visitId}
                        className="h-8 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1"
                      >
                        <XCircle className="size-3.5" />
                        <span>কল বাতিল</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedRooms[patient.visitId] || availableRooms[0]?.id || ''}
                        onValueChange={(val: string) =>
                          setSelectedRooms((prev) => ({ ...prev, [patient.visitId]: val }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-9 text-xs bg-card/60">
                          <SelectValue placeholder="রুম/বেড নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem
                              key={room.id}
                              value={room.id}
                              disabled={room.isOccupied}
                              className="text-xs"
                            >
                              {room.displayName || (room.roomNumber ? `রুম ${room.roomNumber} (${room.name})` : room.name)} {room.isOccupied ? '(ব্যস্ত)' : '(ফাঁকা)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        onClick={() => handleCallPatient(patient)}
                        disabled={callingVisitId === patient.visitId}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 gap-1.5 whitespace-nowrap active:scale-95 shadow-sm shadow-emerald-600/20"
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
                      className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1"
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
    </div>
  );
}
