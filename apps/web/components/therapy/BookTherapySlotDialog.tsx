// apps/web/components/therapy/BookTherapySlotDialog.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Calendar,
  Clock,
  User,
  Search,
  Plus,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
  Phone,
  FileText,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  createTherapyBookingAction,
  getTherapySlotAvailabilityAction,
  type DayOfWeek,
  type SlotHour,
  type TherapySlotAvailabilityItem,
  type TherapySlotBookingRecord,
} from '../../lib/actions/therapy-slots';
import {
  searchPatientsAction,
  type PatientRecord,
} from '../../lib/actions/patients';
import { CreatePatientDialog } from '../patient/CreatePatientDialog';

interface BookTherapySlotDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  initialDate?: string;
  initialSlotHour?: SlotHour;
  defaultCapacityType?: 'regular' | 'extra';
  onSuccess?: (booking: TherapySlotBookingRecord) => void;
}

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

export function BookTherapySlotDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  initialDate,
  initialSlotHour,
  defaultCapacityType,
  onSuccess,
}: BookTherapySlotDialogProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  // Patient search state
  const [patientQuery, setPatientQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientRecord[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);

  // Booking form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [bookingDate, setBookingDate] = useState<string>(initialDate || todayStr);
  const [slotHour, setSlotHour] = useState<SlotHour | ''>(initialSlotHour || '');
  const [toldTime, setToldTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Availability state
  const [availableSlots, setAvailableSlots] = useState<TherapySlotAvailabilityItem[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      if (initialDate) setBookingDate(initialDate);
      if (initialSlotHour) setSlotHour(initialSlotHour);
    }
  }, [isOpen, initialDate, initialSlotHour]);

  // Debounce patient search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(patientQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [patientQuery]);

  // Search patients
  useEffect(() => {
    if (!debouncedQuery.trim() || selectedPatient) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;
    setIsSearchingPatient(true);
    searchPatientsAction({ query: debouncedQuery.trim(), page: 1, limit: 10 })
      .then((res) => {
        if (isMounted) {
          if (res.success && res.data) {
            setSearchResults(res.data.items || []);
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsSearchingPatient(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, selectedPatient]);

  // Fetch slot availability whenever bookingDate changes
  const fetchAvailability = useCallback((date: string) => {
    if (!date) return;
    setIsLoadingAvailability(true);
    getTherapySlotAvailabilityAction(date)
      .then((res) => {
        if (res.success && res.data) {
          setAvailableSlots(res.data.slots || []);
        } else {
          toast.error(res.error || (isBn ? 'স্লটের তথ্য লোড করতে ব্যর্থ' : 'Failed to load slot availability'));
        }
      })
      .finally(() => {
        setIsLoadingAvailability(false);
      });
  }, [isBn]);

  useEffect(() => {
    if (isOpen && bookingDate) {
      fetchAvailability(bookingDate);
    }
  }, [isOpen, bookingDate, fetchAvailability]);

  const currentDayOfWeek = bookingDate ? getDayOfWeek(bookingDate) : 'Sunday';
  const selectedSlotAvailability = availableSlots.find((s) => s.slotHour === slotHour);

  // Patient gender capacity calculation
  const patientGender = selectedPatient?.gender || 'male';
  const remainingForPatient = selectedSlotAvailability
    ? patientGender === 'male'
      ? selectedSlotAvailability.maleTotalAvailable
      : selectedSlotAvailability.femaleTotalAvailable
    : 0;

  const isExtraBufferForPatient = selectedSlotAvailability
    ? patientGender === 'male'
      ? selectedSlotAvailability.maleRegularRemaining === 0 && selectedSlotAvailability.maleExtraRemaining > 0
      : selectedSlotAvailability.femaleRegularRemaining === 0 && selectedSlotAvailability.femaleExtraRemaining > 0
    : false;

  // Preset told time handlers
  const handleQuickTimePreset = (offsetMinutes: number) => {
    if (!slotHour) return;
    // slotHour format: e.g. "8:00 AM - 9:00 AM" or "12:00 PM - 1:00 PM"
    const startPart = slotHour.split('-')[0].trim(); // "8:00 AM"
    const [time, meridiem] = startPart.split(' ');
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const totalMinutes = hours * 60 + minutes + offsetMinutes;
    const finalHours24 = Math.floor(totalMinutes / 60) % 24;
    const finalMinutes = totalMinutes % 60;

    const finalMeridiem = finalHours24 >= 12 ? 'PM' : 'AM';
    let finalHours12 = finalHours24 % 12;
    if (finalHours12 === 0) finalHours12 = 12;

    const formatted = `${finalHours12}:${finalMinutes.toString().padStart(2, '0')} ${finalMeridiem}`;
    setToldTime(formatted);
  };

  // Submit booking
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error(isBn ? 'অনুগ্রহ করে রোগী নির্বাচন করুন' : 'Please select a patient');
      return;
    }

    if (!bookingDate) {
      toast.error(isBn ? 'বুকিংয়ের তারিখ দিন' : 'Please select a booking date');
      return;
    }

    if (!slotHour) {
      toast.error(isBn ? 'থেরাপি স্লট নির্বাচন করুন' : 'Please select a therapy slot');
      return;
    }

    if (selectedSlotAvailability && remainingForPatient <= 0) {
      toast.error(
        isBn
          ? `এই স্লটে ${patientGender === 'male' ? 'পুরুষ' : 'মহিলা'} রোগীর কোনো খালি আসন নেই`
          : `No remaining capacity for ${patientGender} patients in this slot`,
      );
      return;
    }

    startTransition(async () => {
      const res = await createTherapyBookingAction({
        patientId: selectedPatient.id,
        bookingDate,
        slotHour,
        toldTime: toldTime.trim() || undefined,
        notes: notes.trim() || undefined,
        capacityType: defaultCapacityType || (isExtraBufferForPatient ? 'extra' : undefined),
      });

      if (res.success && res.data) {
        toast.success(
          isBn
            ? `থেরাপি স্লট সফলভাবে বুক করা হয়েছে (#${res.data.bookingNumber})`
            : `Therapy slot booked successfully (#${res.data.bookingNumber})`,
        );
        onSuccess?.(res.data);
        // Reset state
        setSelectedPatient(null);
        setPatientQuery('');
        setSlotHour('');
        setToldTime('');
        setNotes('');
        setIsOpen(false);
      } else {
        toast.error(res.error || (isBn ? 'স্লট বুক করতে ব্যর্থ হয়েছে' : 'Failed to book therapy slot'));
      }
    });
  };

  return (
    <>
      {trigger && (
        <span onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </span>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl rounded-2xl sm:rounded-3xl">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-0.5 text-left">
                <DialogTitle className="text-base sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>{isBn ? 'থেরাপি স্লট বুক করুন' : 'Book Therapy Slot'}</span>
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    {isBn ? 'লাইভ ক্যাপাসিটি' : 'Live Capacity'}
                  </Badge>
                  {defaultCapacityType === 'extra' && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {isBn ? 'অতিরিক্ত স্লট' : 'Extra Slot'}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {isBn
                    ? 'রোগী নির্বাচন করুন, তারিখের ক্যাপাসিটি যাচাই করুন এবং সময় নির্ধারণ করুন।'
                    : 'Select a patient, inspect day capacity limits, and schedule arrival time.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {/* 1. Patient Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'রোগী নির্বাচন করুন *' : 'Select Patient *'}</span>
                </Label>

                {/* Quick Patient Creating Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatePatientOpen(true)}
                  className="h-7 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{isBn ? 'নতুন রোগী নিবন্ধন' : '+ New Patient'}</span>
                </Button>
              </div>

              {selectedPatient ? (
                /* Selected Patient Pill Card */
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {selectedPatient.nameEn.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {isBn && selectedPatient.nameBn ? selectedPatient.nameBn : selectedPatient.nameEn}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold ${
                            selectedPatient.gender === 'male'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {selectedPatient.gender === 'male' ? (isBn ? 'পুরুষ' : 'Male') : (isBn ? 'মহিলা' : 'Female')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                          {selectedPatient.mrn}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedPatient.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientQuery('');
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                /* Patient Search Input & Live Results */
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder={
                        isBn
                          ? 'রোগীর নাম, মোবাইল নম্বর অথবা MRN দিয়ে সার্চ করুন...'
                          : 'Search by patient name, phone number, or MRN...'
                      }
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      className="pl-9 pr-9 h-10 text-xs sm:text-sm"
                    />
                    {isSearchingPatient && (
                      <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-11 mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-border/50">
                      {searchResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setSearchResults([]);
                          }}
                          className="p-2.5 hover:bg-accent cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-foreground">
                                {isBn && p.nameBn ? p.nameBn : p.nameEn}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  p.gender === 'male'
                                    ? 'text-blue-600 border-blue-500/30'
                                    : 'text-rose-600 border-rose-500/30'
                                }`}
                              >
                                {p.gender === 'male' ? (isBn ? 'পুরুষ' : 'Male') : (isBn ? 'মহিলা' : 'Female')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">{p.mrn}</span>
                              <span>•</span>
                              <span>{p.phone}</span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-emerald-600"
                          >
                            {isBn ? 'বাছাই' : 'Select'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Date Selection & Day Validation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bookingDate" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'বুকিংয়ের তারিখ *' : 'Booking Date *'}</span>
                </Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={bookingDate}
                  min={todayStr}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="h-10 text-xs sm:text-sm font-mono cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-muted-foreground">
                  {isBn ? 'সপ্তাহের দিন ও স্ট্যাটাস' : 'Day of Week & Status'}
                </Label>
                <div className="h-10 px-3.5 rounded-xl border border-border/80 bg-muted/40 flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-foreground">
                    {isBn ? DAYS_BN[currentDayOfWeek] : currentDayOfWeek}
                  </span>
                  <Badge variant="outline" className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    {isLoadingAvailability ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
                    ) : (
                      <span>{availableSlots.filter((s) => s.isOpen).length} {isBn ? 'স্লট উন্মুক্ত' : 'Slots Open'}</span>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 3. Slot Hour Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="slotHour" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'থেরাপি স্লট নির্বাচন *' : 'Select Therapy Slot *'}</span>
                </Label>

                {selectedPatient && selectedSlotAvailability && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {isBn ? 'খালি আসন:' : 'Available:'}{' '}
                    <span
                      className={`font-mono font-bold ${
                        remainingForPatient > 0
                          ? isExtraBufferForPatient
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600'
                      }`}
                    >
                      {remainingForPatient}{' '}
                      {isExtraBufferForPatient
                        ? isBn
                          ? '(জরুরি বাফার)'
                          : '(Extra Buffer)'
                        : isBn
                        ? '(নিয়মিত)'
                        : '(Regular)'}
                    </span>
                  </span>
                )}
              </div>

              <Select
                value={slotHour}
                onValueChange={(val: string) => {
                  setSlotHour(val as SlotHour);
                  if (!toldTime) {
                    const startPart = val.split('-')[0].trim();
                    setToldTime(startPart);
                  }
                }}
              >
                <SelectTrigger id="slotHour" className="h-11 text-xs sm:text-sm cursor-pointer">
                  <SelectValue
                    placeholder={
                      isLoadingAvailability
                        ? isBn
                          ? 'স্লট লোড হচ্ছে...'
                          : 'Loading slots...'
                        : isBn
                        ? 'স্লটের সময় নির্বাচন করুন'
                        : 'Choose a slot hour'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableSlots.map((slot) => {
                    const maleAvailable = slot.maleTotalAvailable;
                    const femaleAvailable = slot.femaleTotalAvailable;
                    const isPatientGenderFull =
                      patientGender === 'male' ? maleAvailable === 0 : femaleAvailable === 0;
                    const isDisabled = slot.isActive === 0 || isPatientGenderFull;

                    return (
                      <SelectItem
                        key={slot.id}
                        value={slot.slotHour}
                        disabled={isDisabled}
                        className="cursor-pointer py-2"
                      >
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-mono font-semibold">{slot.slotHour}</span>
                          <div className="flex items-center gap-2">
                            {slot.isActive === 0 ? (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {isBn ? 'বন্ধ' : 'Closed'}
                              </Badge>
                            ) : (
                              <>
                                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                  ♂ {maleAvailable}
                                </span>
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                                  ♀ {femaleAvailable}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Buffer Warning if regular is filled */}
              {isExtraBufferForPatient && (
                <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {isBn
                      ? 'সতর্কতা: এই স্লটে নিয়মিত আসন পূর্ণ হয়েছে। এই বুকিংটি অতিরিক্ত বাফার কোটায় সংরক্ষিত হবে।'
                      : 'Notice: Regular capacity is full. This booking will be assigned from the emergency extra buffer.'}
                  </span>
                </div>
              )}
            </div>

            {/* 4. Told Time & Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="toldTime" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'রোগীকে বলা সময় (Told Time)' : 'Told Arrival Time'}</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {isBn ? 'রোগীকে ক্লিনিকে আসার যে সময় বলা হয়েছে' : 'Instructed arrival timestamp'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="toldTime"
                  placeholder="e.g. 08:30 AM"
                  value={toldTime}
                  onChange={(e) => setToldTime(e.target.value)}
                  className="h-10 text-xs sm:text-sm font-mono flex-1"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickTimePreset(0)}
                    disabled={!slotHour}
                    className="h-10 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isBn ? 'শুরু' : 'Start'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickTimePreset(15)}
                    disabled={!slotHour}
                    className="h-10 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    +15m
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickTimePreset(30)}
                    disabled={!slotHour}
                    className="h-10 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    +30m
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickTimePreset(45)}
                    disabled={!slotHour}
                    className="h-10 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    +45m
                  </Button>
                </div>
              </div>
            </div>

            {/* 5. Clinical / Operational Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'নোট / নির্দেশনাবলী' : 'Notes / Instructions'}</span>
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  isBn
                    ? 'থেরাপির মডালিটি, বিশেষ ব্যথা বা অন্য কোনো নির্দেশনা থাকলে লিখুন...'
                    : 'Specific therapy modality (UST, Traction, SWD), pain region, or session notes...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs sm:text-sm min-h-[70px] resize-none"
              />
            </div>

            {/* Modal Actions Footer */}
            <DialogFooter className="pt-4 border-t border-border/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-full sm:w-auto text-xs font-medium cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>

              <Button
                type="submit"
                disabled={isPending || !selectedPatient || !slotHour || remainingForPatient <= 0}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-10 px-5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>{isBn ? 'বুকিং করা হচ্ছে...' : 'Booking Slot...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    <span>{isBn ? 'স্লট বুকিং নিশ্চিত করুন' : 'Confirm Slot Booking'}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Embedded Create Patient Dialog for quick registration */}
      <CreatePatientDialog
        open={isCreatePatientOpen}
        onOpenChange={setIsCreatePatientOpen}
        onSuccess={(newPatient) => {
          setSelectedPatient(newPatient);
          setIsCreatePatientOpen(false);
          toast.success(
            isBn
              ? `রোগী ${newPatient.nameEn} নিবন্ধিত ও সিলেক্ট করা হয়েছে!`
              : `Patient ${newPatient.nameEn} registered and selected!`,
          );
        }}
      />
    </>
  );
}
