// apps/web/components/checkin/InstantTherapySlotCheckInModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Activity,
  Clock,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Building2,
  Calendar,
  Check,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  getTherapySlotAvailabilityAction,
  createTherapyBookingAction,
  type TherapySlotAvailabilityItem,
} from '../../lib/actions/therapy-slots';
import { checkInPatientAction } from '../../lib/actions/checkin';
import { listRoomsAction, type RoomRecord } from '../../lib/actions/rooms';
import type { PatientRecord } from '../../lib/actions/patients';

export interface InstantTherapySlotCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientRecord | null;
  onSuccess: (data: {
    tokenNumber: number;
    slotHour: string;
    roomName: string;
    destination: string;
    date: string;
  }) => void;
}

const COMMON_MODALITIES = [
  { id: 'Traction', bn: 'ট্র্যাকশন', en: 'Traction' },
  { id: 'UST', bn: 'আল্ট্রাসাউন্ড', en: 'UST' },
  { id: 'TENS', bn: 'টেনস', en: 'TENS' },
  { id: 'IRR', bn: 'ইনফ্রারেড', en: 'IRR' },
  { id: 'Exercise Therapy', bn: 'ব্যায়াম থেরাপি', en: 'Exercise Therapy' },
  { id: 'Wax Bath', bn: 'প্যারাফিন ওয়াক্স', en: 'Wax Bath' },
  { id: 'Manual Therapy', bn: 'ম্যানুয়াল থেরাপি', en: 'Manual Therapy' },
];

export function InstantTherapySlotCheckInModal({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: InstantTherapySlotCheckInModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [slots, setSlots] = useState<TherapySlotAvailabilityItem[]>([]);
  const [selectedSlotHour, setSelectedSlotHour] = useState<string>('');
  const [selectedSlotConfigId, setSelectedSlotConfigId] = useState<string>('');
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'vip'>('normal');
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const patientGender = patient?.gender || 'male';

  // 1. Fetch available therapy slots for today
  useEffect(() => {
    if (!open) return;

    setLoadingSlots(true);
    getTherapySlotAvailabilityAction(todayStr)
      .then((res) => {
        if (res.success && res.data) {
          const slotList = res.data.slots || [];
          setSlots(slotList);

          // Find first slot with available seats for patient's gender
          const openSlot = slotList.find((s) => {
            const avail = patientGender === 'female' ? s.femaleTotalAvailable : s.maleTotalAvailable;
            return avail > 0;
          });

          if (openSlot) {
            setSelectedSlotHour(openSlot.slotHour);
            setSelectedSlotConfigId(openSlot.id);
          } else if (slotList.length > 0) {
            setSelectedSlotHour(slotList[0].slotHour);
            setSelectedSlotConfigId(slotList[0].id);
          }
        } else {
          setSlots([]);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));

    // 2. Fetch therapy rooms (strictly limited to therapy_room & therapy_hall per user directive)
    setLoadingRooms(true);
    listRoomsAction()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const therapyRooms = res.data.filter(
            (r) =>
              (r.type === 'therapy_room' || r.type === 'therapy_hall') &&
              Boolean(r.isActive),
          );
          setRooms(therapyRooms);
          if (therapyRooms.length > 0 && !selectedRoomId) {
            setSelectedRoomId(therapyRooms[0].id);
          }
        }
      })
      .catch(() => setRooms([]))
      .finally(() => setLoadingRooms(false));
  }, [open, todayStr, patientGender]);

  const toggleModality = (mod: string) => {
    setSelectedModalities((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    );
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Handle Submit: Book Therapy Slot + Check-In into Therapy Queue
  const handleSubmit = async () => {
    if (!patient?.id) {
      toast.error(isBn ? 'অনুগ্রহ করে রোগী নির্বাচন করুন' : 'Please select a patient');
      return;
    }
    if (!selectedSlotHour) {
      toast.error(isBn ? 'অনুগ্রহ করে থেরাপি স্লট নির্বাচন করুন' : 'Please select a therapy slot');
      return;
    }

    setSubmitting(true);
    try {
      const combinedNotes = [
        selectedModalities.length > 0 ? `মোডালিটি: ${selectedModalities.join(', ')}` : '',
        notes.trim(),
      ]
        .filter(Boolean)
        .join(' • ');

      // 1. Book the therapy slot
      const bookRes = await createTherapyBookingAction({
        patientId: patient.id,
        bookingDate: todayStr,
        slotHour: selectedSlotHour,
        toldTime: selectedSlotHour,
        notes: combinedNotes || undefined,
      });

      if (!bookRes.success || !bookRes.data?.id) {
        throw new Error(bookRes.error || (isBn ? 'থেরাপি স্লট বুকিং ব্যর্থ হয়েছে' : 'Failed to book slot'));
      }

      const bookingId = bookRes.data.id;

      // 2. Complete Check-In directly to Therapy Queue
      const checkInRes = await checkInPatientAction({
        patientId: patient.id,
        destination: 'therapy',
        therapyBookingId: bookingId,
        priority,
        toldTime: selectedSlotHour,
        notes: combinedNotes || undefined,
      });

      toast.success(
        isBn
          ? `থেরাপি স্লট (${selectedSlotHour}) বুক সম্পন্ন ও সরাসরি থেরাপি কিউতে যুক্ত করা হয়েছে!`
          : `Therapy slot (${selectedSlotHour}) booked and queued successfully!`,
      );

      // 3. Callback to parent workstation to open slip modal & reload
      onSuccess({
        tokenNumber: checkInRes.tokenSlip.tokenNumber,
        slotHour: selectedSlotHour,
        roomName: selectedRoom?.name || (isBn ? 'থেরাপি হল' : 'Therapy Hall'),
        destination: 'therapy',
        date: todayStr,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || (isBn ? 'থেরাপি চেক-ইন ব্যর্থ হয়েছে' : 'Therapy check-in failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Activity className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{isBn ? 'তাৎক্ষণিক থেরাপি স্লট বুকিং ও চেক-ইন' : 'Instant Therapy Slot Booking & Check-In'}</span>
                <Badge className="bg-teal-600 hover:bg-teal-600 text-white font-mono text-[10px]">
                  {isBn ? 'তাৎক্ষণিক থেরাপি' : 'Instant Therapy'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isBn
                  ? 'আজকের উপলব্ধ স্লট নির্বাচন করে রোগীকে সরাসরি থেরাপি কিউতে যুক্ত করুন'
                  : 'Select an available slot today to book and queue patient for therapy'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Patient Quick Context Card */}
          {patient && (
            <div className="p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(patient.nameBn || patient.nameEn || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm leading-tight">
                    {isBn ? patient.nameBn || patient.nameEn : patient.nameEn || patient.nameBn}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    MRN: <strong className="text-foreground">{patient.mrn}</strong> · {isBn ? `${patient.ageYears || '—'} বছর` : `${patient.ageYears || '—'}y`} · {isBn ? (patient.gender === 'female' ? 'মহিলা' : 'পুরুষ') : patient.gender}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <Badge variant="outline" className="text-[10px] font-mono border-teal-500/30 text-teal-700 dark:text-teal-300 bg-teal-500/10">
                  {isBn ? 'আজকের তারিখ:' : "Today's Date:"} {todayStr}
                </Badge>
              </div>
            </div>
          )}

          {/* 1. TODAY'S AVAILABLE THERAPY SLOTS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-teal-600 dark:text-teal-400" />
                <span>{isBn ? '১. আজকের উপলব্ধ থেরাপি স্লট নির্বাচন *' : '1. Available Therapy Slots Today *'}</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {isBn ? 'সবুজ = আসন খালি' : 'Green = Available seats'}
              </span>
            </div>

            {loadingSlots ? (
              <div className="py-8 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-teal-500" />
                <span className="text-[11px]">{isBn ? 'থেরাপি স্লট লোড হচ্ছে...' : 'Loading slots...'}</span>
              </div>
            ) : slots.length === 0 ? (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-center text-xs">
                {isBn ? 'আজকের জন্য কোনো থেরাপি স্লট কনফিগারেশন পাওয়া যায়নি' : 'No therapy slot configs found for today'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-muted/20 rounded-xl border border-border">
                {slots.map((s) => {
                  const availableCount =
                    patientGender === 'female'
                      ? s.femaleTotalAvailable
                      : s.maleTotalAvailable;
                  const isAvailable = availableCount > 0;
                  const isSelected = selectedSlotHour === s.slotHour;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedSlotHour(s.slotHour);
                        setSelectedSlotConfigId(s.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/20 text-foreground shadow-xs'
                          : isAvailable
                            ? 'border-border bg-card hover:bg-muted/50 text-foreground'
                            : 'border-transparent bg-muted/40 text-muted-foreground/50 line-through cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-xs">{s.slotHour}</span>
                        {isAvailable ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-[9px] px-1 py-0">
                            {availableCount} {isBn ? 'খালি' : 'open'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] border-muted text-muted-foreground px-1 py-0">
                            {isBn ? 'ফুল' : 'Full'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[9.5px] text-muted-foreground flex items-center justify-between">
                        <span>{isBn ? 'বুকড:' : 'Booked:'} {s.totalSlotBooked}/{s.totalSlotCapacity}</span>
                        {isSelected && <Check className="size-3 text-teal-600 dark:text-teal-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. ROOM & STATION SELECTOR (Strictly therapy_room & therapy_hall per user directive) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>{isBn ? '২. নির্ধারিত থেরাপি রুম / হল *' : '2. Therapy Room / Hall *'}</span>
              <span className="text-[11px] text-muted-foreground">
                {isBn ? 'শুধুমাত্র অনুমোদিত থেরাপি জোন' : 'Authorized therapy zones only'}
              </span>
            </Label>
            {loadingRooms ? (
              <div className="p-2.5 border rounded-xl flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-teal-500" />
                <span>{isBn ? 'রুম লোড হচ্ছে...' : 'Loading rooms...'}</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                {isBn ? 'কোনো থেরাপি রুম পাওয়া যায়নি' : 'No therapy rooms found'}
              </div>
            ) : (
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger className="w-full text-xs h-10 border-border bg-card">
                  <SelectValue placeholder={isBn ? 'থেরাপি রুম নির্বাচন করুন' : 'Select a room'} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-semibold text-foreground">{r.name}</span>
                        <span className="text-muted-foreground text-[11px]">
                          ({r.type === 'therapy_hall' ? (isBn ? 'থেরাপি হল' : 'Hall') : (isBn ? 'রুম' : 'Room')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 3. QUICK MODALITY CHIPS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>{isBn ? '৩. সাধারণ থেরাপিউটিক মোডালিটি (ঐচ্ছিক)' : '3. Modalities (Optional)'}</span>
              <span className="text-[10px] text-muted-foreground">
                {isBn ? 'প্রয়োজনে ক্লিক করে সিলেক্ট করুন' : 'Click to select multiple'}
              </span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MODALITIES.map((mod) => {
                const isSelected = selectedModalities.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModality(mod.id)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500/15 text-teal-800 dark:text-teal-200 font-semibold'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {isSelected && <Check className="size-3 text-teal-600 dark:text-teal-400" />}
                    <span>{isBn ? mod.bn : mod.en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. PRIORITY & NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1 block">
                {isBn ? 'অগ্রাধিকার' : 'Priority'}
              </Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="h-9 text-xs border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-xs">
                    {isBn ? 'সাধারণ' : 'Normal'}
                  </SelectItem>
                  <SelectItem value="emergency" className="text-xs text-rose-600 font-bold">
                    {isBn ? '🚨 জরুরি' : '🚨 Emergency'}
                  </SelectItem>
                  <SelectItem value="vip" className="text-xs text-amber-600 font-bold">
                    {isBn ? '⭐ বীর মুক্তিযোদ্ধা / ভিআইপি' : '⭐ VIP'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground mb-1 block">
                {isBn ? 'হ্যান্ডলারের জন্য বিশেষ নোট (ঐচ্ছিক)' : 'Handler Notes (Optional)'}
              </Label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isBn ? 'যেমন: পিঠের তীব্র ব্যথা, হটপ্যাক...' : 'e.g. Lower back pain, hotpack...'}
                className="w-full h-9 px-3 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t border-border bg-muted/20 flex flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[11px] text-muted-foreground block">{isBn ? 'নির্বাচিত স্লট:' : 'Selected Slot:'}</span>
            <span className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
              {selectedSlotHour || (isBn ? 'কোনোটি নির্বাচিত নয়' : 'None selected')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting || !selectedSlotHour}
              onClick={handleSubmit}
              className="text-xs h-9 font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{isBn ? 'স্লট বুক হচ্ছে...' : 'Booking...'}</span>
                </>
              ) : (
                <>
                  <Zap className="size-3.5" />
                  <span>
                    {isBn ? 'থেরাপি স্লট নিশ্চিত ও চেক-ইন' : 'Confirm Slot & Check-In'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InstantTherapySlotCheckInModal;
