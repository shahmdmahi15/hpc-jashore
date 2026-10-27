// apps/web/components/checkin/InstantConsultationCheckInModal.tsx
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
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Stethoscope,
  UserPlus,
  RefreshCw,
  FileText,
  Clock,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Calendar,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { listUsersAction, type UserRecord } from '../../lib/actions/users';
import {
  getDoctorSlotsAction,
  createConsultationBookingAction,
  sendBookingToDoctorQueueAction,
  type DoctorSlotsResult,
} from '../../lib/actions/consultation-bookings';
import type { PatientRecord } from '../../lib/actions/patients';

export type ConsultationVisitType = 'new_consultation' | 'follow_up' | 'report_review';

export interface InstantConsultationCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientRecord | null;
  onSuccess: (data: {
    tokenNumber: number;
    serialNumber?: number | null;
    doctorName: string;
    visitType: ConsultationVisitType;
    slotTime?: string;
    feeTaka?: number;
    date: string;
  }) => void;
}

export function InstantConsultationCheckInModal({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: InstantConsultationCheckInModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [doctors, setDoctors] = useState<UserRecord[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [visitType, setVisitType] = useState<ConsultationVisitType>('new_consultation');
  const [slotsData, setSlotsData] = useState<DoctorSlotsResult | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'emergency' | 'vip'>('normal');
  const [notes, setNotes] = useState<string>('');

  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Load active consulting doctors on open
  useEffect(() => {
    if (!open) return;

    setLoadingDoctors(true);
    listUsersAction()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const activeDocs = res.data.filter(
            (u) => u.role === 'doctor' && Boolean(u.isActive),
          );
          setDoctors(activeDocs);
          if (activeDocs.length > 0 && !selectedDoctorId) {
            setSelectedDoctorId(activeDocs[0].id);
          }
        }
      })
      .catch((err) => {
        toast.error(err?.message || 'ডাক্তার তালিকা লোড করা যায়নি');
      })
      .finally(() => setLoadingDoctors(false));
  }, [open]);

  // 2. Fetch doctor available slots when doctor changes
  useEffect(() => {
    if (!open || !selectedDoctorId) return;

    setLoadingSlots(true);
    getDoctorSlotsAction(selectedDoctorId, todayStr)
      .then((res) => {
        if (res.success && res.data) {
          setSlotsData(res.data);
          // Auto-select earliest available slot
          const firstAvailable = res.data.slots.find((s) => s.isAvailable);
          if (firstAvailable) {
            setSelectedSlotTime(firstAvailable.slotTime);
          } else if (res.data.slots.length > 0) {
            setSelectedSlotTime(res.data.slots[0].slotTime);
          }
        } else {
          setSlotsData(null);
        }
      })
      .catch(() => setSlotsData(null))
      .finally(() => setLoadingSlots(false));
  }, [open, selectedDoctorId, todayStr]);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Fee calculation helper
  const getFeeTaka = (): number => {
    if (!selectedDoctor) return 500;
    if (visitType === 'follow_up') return selectedDoctor.followUpFeeTaka ?? 300;
    if (visitType === 'report_review') return selectedDoctor.reportFeeTaka ?? 0;
    return selectedDoctor.consultationFeeTaka ?? 500;
  };

  const currentFee = getFeeTaka();

  // Next predicted serial number
  const nextSerial = (slotsData?.bookedCount ?? 0) + 1;

  // Handle Submit: Book Consultation + Instant Check-In & Queue
  const handleSubmit = async () => {
    if (!patient?.id) {
      toast.error(isBn ? 'অনুগ্রহ করে রোগী নির্বাচন করুন' : 'Please select a patient');
      return;
    }
    if (!selectedDoctorId) {
      toast.error(isBn ? 'অনুগ্রহ করে ডাক্তার নির্বাচন করুন' : 'Please select a doctor');
      return;
    }
    if (!selectedSlotTime) {
      toast.error(isBn ? 'অনুগ্রহ করে সিরিয়াল স্লট নির্বাচন করুন' : 'Please select a serial slot');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Consultation Booking
      const bookRes = await createConsultationBookingAction({
        patientId: patient.id,
        doctorId: selectedDoctorId,
        bookingDate: todayStr,
        slotTime: selectedSlotTime,
        toldTime: selectedSlotTime,
        visitType,
        notes: notes.trim() || undefined,
      });

      if (!bookRes.success || !bookRes.data?.id) {
        throw new Error(bookRes.error || (isBn ? 'সিরিয়াল তৈরি ব্যর্থ হয়েছে' : 'Booking failed'));
      }

      const bookingId = bookRes.data.id;

      // 2. Queue & Auto Check-In into Doctor Chamber Queue
      const queueRes = await sendBookingToDoctorQueueAction(bookingId, {
        chamberRoomId: selectedDoctor?.chamberRoomId || undefined,
        notes: notes.trim() || undefined,
      });

      const assignedSerial = queueRes.data?.serialNumber || nextSerial;
      const assignedToken = queueRes.data?.tokenNumber || 1;

      toast.success(
        isBn
          ? `ডাক্তার সিরিয়াল #${assignedSerial} বুক ও সরাসরি চেক-ইন সম্পন্ন হয়েছে!`
          : `Doctor serial #${assignedSerial} booked & checked in successfully!`,
      );

      // 3. Callback to parent workstation to refresh and open slip preview
      onSuccess({
        tokenNumber: assignedToken,
        serialNumber: assignedSerial,
        doctorName: selectedDoctor?.displayName || 'Dr. Consultant',
        visitType,
        slotTime: selectedSlotTime,
        feeTaka: currentFee,
        date: todayStr,
      });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || (isBn ? 'সিরিয়াল বুকিং ব্যর্থ হয়েছে' : 'Booking failed'));
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
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>{isBn ? 'তাৎক্ষণিক ডাক্তার কনসালটেশন সিরিয়াল ও চেক-ইন' : 'Instant Doctor Consultation Serial & Check-In'}</span>
                <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-mono text-[10px]">
                  {isBn ? 'ইনস্ট্যান্ট সিরিয়াল' : 'Instant Serial'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isBn
                  ? 'ডাক্তার ও কনসালটেশন টাইপ সিলেক্ট করে তৎক্ষণাৎ সিরিয়াল দিন এবং ওয়েটিং রুমে চেক-ইন করুন'
                  : 'Select doctor & consultation type to immediately book next available serial'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Patient Quick Context Card */}
          {patient && (
            <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(patient.nameBn || patient.nameEn || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm leading-tight">
                    {isBn ? patient.nameBn || patient.nameEn : patient.nameEn || patient.nameBn}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    MRN: <strong className="text-foreground">{patient.mrn}</strong> · {isBn ? `${patient.ageYears || '—'} বছর` : `${patient.ageYears || '—'}y`} · {patient.phone}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10">
                  {isBn ? 'তারিখ:' : 'Date:'} {todayStr}
                </Badge>
              </div>
            </div>
          )}

          {/* 1. CONSULTATION TYPE SELECTOR (New, Follow Up, Report Show) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>{isBn ? '১. কনসালটেশনের ধরন (Consultation Type) *' : '1. Consultation Type *'}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {isBn ? 'নির্ধারিত কনসালটেশন ফি প্রযোজ্য' : 'Applicable doctor fee'}
              </span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Type 1: New Patient */}
              <button
                type="button"
                onClick={() => setVisitType('new_consultation')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  visitType === 'new_consultation'
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 text-foreground font-semibold shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="p-1 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <UserPlus className="size-3.5" />
                  </span>
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-mono text-[10px] px-1.5">
                    ৳{selectedDoctor?.consultationFeeTaka ?? 500}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {isBn ? 'নতুন রোগী' : 'New Patient'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {isBn ? 'প্রথমবারের মতো ডাক্তার পরামর্শ' : 'First-time consultation'}
                  </div>
                </div>
              </button>

              {/* Type 2: Follow Up */}
              <button
                type="button"
                onClick={() => setVisitType('follow_up')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  visitType === 'follow_up'
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 text-foreground font-semibold shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="p-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <RefreshCw className="size-3.5" />
                  </span>
                  <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-mono text-[10px] px-1.5">
                    ৳{selectedDoctor?.followUpFeeTaka ?? 300}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {isBn ? 'ফলো আপ' : 'Follow Up'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {isBn ? 'আগের প্রেসক্রিপশন রিভিউ' : 'Follow up existing treatment'}
                  </div>
                </div>
              </button>

              {/* Type 3: Report Show */}
              <button
                type="button"
                onClick={() => setVisitType('report_review')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  visitType === 'report_review'
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20 text-foreground font-semibold shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <FileText className="size-3.5" />
                  </span>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-[10px] px-1.5">
                    ৳{selectedDoctor?.reportFeeTaka ?? 0}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">
                    {isBn ? 'রিপোর্ট দেখানো' : 'Report Show'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {isBn ? 'ল্যাব বা এক্স-রে রিপোর্ট প্রদর্শন' : 'Investigation report review'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. DOCTOR & CHAMBER SELECTOR */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>{isBn ? '২. কনসালট্যান্ট ডাক্তার ও চেম্বার রুম *' : '2. Doctor & Chamber *'}</span>
              {selectedDoctor && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {selectedDoctor.chamberName || (selectedDoctor.chamberRoomNumber ? `রুম ${selectedDoctor.chamberRoomNumber}` : 'চেম্বার ১')}
                </span>
              )}
            </Label>
            {loadingDoctors ? (
              <div className="p-3 border rounded-xl flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-blue-500" />
                <span>{isBn ? 'ডাক্তার তালিকা লোড হচ্ছে...' : 'Loading doctors...'}</span>
              </div>
            ) : doctors.length === 0 ? (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                {isBn ? 'কোনো সক্রিয় ডাক্তার পাওয়া যায়নি' : 'No active doctors found'}
              </div>
            ) : (
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="w-full text-xs h-10 border-border bg-card">
                  <SelectValue placeholder={isBn ? 'ডাক্তার নির্বাচন করুন' : 'Select a doctor'} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-semibold text-foreground">{doc.displayName}</span>
                        <span className="text-muted-foreground text-[11px]">
                          ({doc.chamberName || (doc.chamberRoomNumber ? `রুম ${doc.chamberRoomNumber}` : 'চেম্বার')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 3. SERIAL & SLOT AVAILABILITY */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-foreground text-xs">
                  {isBn ? '৩. উপলব্ধ সময় ও সিরিয়াল নির্বাচন' : '3. Available Time & Serial Slot'}
                </span>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-[11px] px-2 py-0.5">
                {isBn ? `পরবর্তী সিরিয়াল: #${nextSerial}` : `Next Serial: #${nextSerial}`}
              </Badge>
            </div>

            {loadingSlots ? (
              <div className="py-6 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-blue-500" />
                <span className="text-[11px]">{isBn ? 'স্লট হিসাব করা হচ্ছে...' : 'Calculating available slots...'}</span>
              </div>
            ) : slotsData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {isBn
                      ? `আজকের মোট বুকিং: ${slotsData.bookedCount} জন · অবশিষ্ট কোটা: ${slotsData.availableCount} জন`
                      : `Booked today: ${slotsData.bookedCount} · Remaining quota: ${slotsData.availableCount}`}
                  </span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {slotsData.dutyStartTime} - {slotsData.dutyEndTime}
                  </span>
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-background/50 rounded-lg border border-border/60">
                  {slotsData.slots.map((slot, idx) => {
                    const isSelected = selectedSlotTime === slot.slotTime;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlotTime(slot.slotTime)}
                        className={`p-1.5 rounded text-center transition-all cursor-pointer text-[10px] font-mono flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-xs ring-2 ring-blue-500/40'
                            : slot.isAvailable
                              ? 'bg-card border border-emerald-500/40 text-foreground hover:bg-emerald-500/10'
                              : 'bg-muted/60 text-muted-foreground/50 border border-transparent line-through cursor-not-allowed opacity-60'
                        }`}
                      >
                        <span>{slot.slotTime}</span>
                        <span className="text-[8.5px] font-sans">
                          {slot.isAvailable ? (isBn ? 'খালি' : 'Open') : (isBn ? 'বুকড' : 'Booked')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-muted-foreground text-[11px]">
                {isBn ? 'ডাক্তারের কোনো সময়সূচি পাওয়া যায়নি' : 'No slot schedule found'}
              </div>
            )}
          </div>

          {/* 4. PRIORITY & NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1 block">
                {isBn ? 'রোগীর অগ্রাধিকার (Priority)' : 'Patient Priority'}
              </Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="h-9 text-xs border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-xs">
                    {isBn ? 'সাধারণ (Normal)' : 'Normal'}
                  </SelectItem>
                  <SelectItem value="emergency" className="text-xs text-rose-600 font-bold">
                    {isBn ? 'জরুরি (Emergency)' : 'Emergency'}
                  </SelectItem>
                  <SelectItem value="vip" className="text-xs text-amber-600 font-bold">
                    {isBn ? 'বীর মুক্তিযোদ্ধা / ভিআইপি (VIP)' : 'VIP / Senior'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground mb-1 block">
                {isBn ? 'বিশেষ নোট (ঐচ্ছিক)' : 'Notes (Optional)'}
              </Label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isBn ? 'রেফারেন্স বা প্রধান উপসর্গ...' : 'Complaint or note...'}
                className="w-full h-9 px-3 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t border-border bg-muted/20 flex flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[11px] text-muted-foreground block">{isBn ? 'মোট প্রদেয় ফি:' : 'Total Fee:'}</span>
            <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
              ৳{currentFee}
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
              disabled={submitting || !selectedDoctorId || !selectedSlotTime}
              onClick={handleSubmit}
              className="text-xs h-9 font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{isBn ? 'সিরিয়াল তৈরি হচ্ছে...' : 'Booking...'}</span>
                </>
              ) : (
                <>
                  <Stethoscope className="size-3.5" />
                  <span>
                    {isBn ? `সিরিয়াল #${nextSerial} নিশ্চিত ও চেক-ইন` : `Confirm Serial #${nextSerial} & Check-In`}
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

export default InstantConsultationCheckInModal;
