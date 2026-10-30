// apps/web/components/admin/EditRoomDialog.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  DoorOpen,
  Hash,
  Layers,
  FileText,
  AlertTriangle,
  Loader2,
  Check,
  Building,
  ShieldCheck,
  Stethoscope,
  Clock,
  Users,
  Briefcase,
  CreditCard,
  Sparkles,
  Edit3,
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
  updateRoomAction,
  type RoomRecord,
  type RoomType,
  type RoomGender,
  type RoomStatus,
} from '../../lib/actions/rooms';

interface EditRoomDialogProps {
  room: RoomRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updated: RoomRecord) => void;
}

const ROOM_TYPES: Array<{
  value: RoomType;
  labelEn: string;
  labelBn: string;
  icon: any;
}> = [
  { value: 'waiting_room', labelEn: 'Waiting Room', labelBn: 'অপেক্ষাগার', icon: Clock },
  { value: 'public_room', labelEn: 'Public Room', labelBn: 'পাবলিক রুম', icon: Users },
  { value: 'private_room', labelEn: 'Private Room', labelBn: 'প্রাইভেট রুম', icon: ShieldCheck },
  { value: 'doctor_consultation_room', labelEn: 'Doctor Consultation Room', labelBn: 'ডাক্তার চেম্বার', icon: Stethoscope },
  { value: 'therapy_room', labelEn: 'Therapy Room', labelBn: 'থেরাপি রুম', icon: Sparkles },
  { value: 'therapy_hall', labelEn: 'Therapy Hall', labelBn: 'থেরাপি হল', icon: Layers },
  { value: 'staff_room', labelEn: 'Staff Room', labelBn: 'স্টাফ রুম', icon: Briefcase },
  { value: 'cashier_room', labelEn: 'Cashier Room', labelBn: 'ক্যাশিয়ার রুম', icon: CreditCard },
];

export function EditRoomDialog({ room, open, onOpenChange, onSuccess }: EditRoomDialogProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<{
    roomNumber: string;
    name: string;
    type: RoomType;
    gender: RoomGender;
    status: RoomStatus;
    capacity: number;
    notes: string;
  }>({
    roomNumber: '',
    name: '',
    type: 'doctor_consultation_room',
    gender: 'common',
    status: 'available',
    capacity: 1,
    notes: '',
  });

  useEffect(() => {
    if (room) {
      setForm({
        roomNumber: room.roomNumber,
        name: room.name,
        type: room.type,
        gender: room.gender,
        status: room.status,
        capacity: room.capacity ?? 1,
        notes: room.notes || '',
      });
      setErrorMsg(null);
    }
  }, [room]);

  if (!room) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const roomNumber = form.roomNumber.trim().toUpperCase();
    if (!roomNumber) {
      setErrorMsg(isBn ? 'রুম নম্বর অবশ্যই লিখুন' : 'Room number is required');
      return;
    }

    const name = form.name.trim();
    if (!name) {
      setErrorMsg(isBn ? 'রুমের নাম অবশ্যই লিখুন' : 'Room name is required');
      return;
    }

    startTransition(async () => {
      const res = await updateRoomAction(room.id, {
        roomNumber,
        name,
        type: form.type,
        gender: form.gender,
        status: form.status,
        capacity: Number(form.capacity) > 0 ? Number(form.capacity) : 1,
        notes: form.notes.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(
          isBn
            ? `রুম ${res.data.roomNumber} সফলভাবে আপডেট করা হয়েছে`
            : `Room ${res.data.roomNumber} updated successfully`,
        );
        onOpenChange(false);
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setErrorMsg(res.error || (isBn ? 'আপডেট ব্যর্থ হয়েছে' : 'Failed to update room'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  {isBn ? 'রুম কনফিগারেশন সম্পাদনা' : 'Edit Room Configuration'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {isBn
                    ? 'রুমের নাম, ধরন, অবস্থান, লিঙ্গ অনুমতি বা স্ট্যাটাস পরিবর্তন করুন।'
                    : 'Modify room designation, category, gender access, status, and remarks.'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 border border-border/60 px-3 py-1.5 rounded-xl font-mono text-xs">
              <span className="text-muted-foreground">Code: </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{room.roomNumber}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Room Identification & Category */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '১. রুম পরিচিতি ও ধরন' : '1. Room Identification & Classification'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Room Number */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="edit-room-number" className="text-xs font-semibold flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'রুম নম্বর / কোড' : 'Room Number / Code'}</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="edit-room-number"
                  value={form.roomNumber}
                  onChange={(e) => setForm({ ...form, roomNumber: e.target.value.toUpperCase() })}
                  required
                  className="h-10 text-sm font-mono tracking-wider font-bold"
                />
              </div>

              {/* Room Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-room-name" className="text-xs font-semibold flex items-center gap-1">
                  <DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'রুমের নাম' : 'Room Name'}</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="edit-room-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-10 text-sm font-medium"
                />
              </div>

              {/* Room Capacity */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="edit-room-capacity" className="text-xs font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'ধারণক্ষমতা' : 'Capacity'}</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Input
                  id="edit-room-capacity"
                  type="number"
                  min={1}
                  max={200}
                  value={form.capacity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setForm({ ...form, capacity: isNaN(val) ? 1 : Math.max(1, val) });
                  }}
                  required
                  className="h-10 text-sm font-mono font-bold"
                />
              </div>

              {/* Room Type */}
              <div className="space-y-1.5 sm:col-span-2 md:col-span-4">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{isBn ? 'রুমের ধরন' : 'Room Type'}</span>
                  <span className="text-destructive font-bold">*</span>
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(val: RoomType) => setForm({ ...form, type: val })}
                >
                  <SelectTrigger className="h-11 text-sm bg-background">
                    <SelectValue placeholder={isBn ? 'রুমের ধরন নির্বাচন করুন' : 'Select room type'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {ROOM_TYPES.map((rt) => {
                      const Icon = rt.icon;
                      return (
                        <SelectItem key={rt.value} value={rt.value}>
                          <div className="flex items-center gap-2 py-0.5">
                            <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="font-semibold text-sm">{isBn ? rt.labelBn : rt.labelEn}</span>
                            <span className="text-2xs text-muted-foreground font-mono">({rt.value})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Gender & Operational Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? '২. লিঙ্গ অনুমতি ও পরিচালনা স্ট্যাটাস' : '2. Gender Access & Operational Status'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gender Access */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{isBn ? 'লিঙ্গ অনুমতি' : 'Gender Access'}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'common', labelEn: 'Common', labelBn: 'সাধারণ', emoji: '👥' },
                    { value: 'male', labelEn: 'Male', labelBn: 'পুরুষ', emoji: '👨' },
                    { value: 'female', labelEn: 'Female', labelBn: 'মহিলা', emoji: '👩' },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g.value as RoomGender })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        form.gender === g.value
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/50'
                          : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className="text-base sm:text-lg mb-0.5">{g.emoji}</span>
                      <span>{isBn ? g.labelBn : g.labelEn}</span>
                      {form.gender === g.value && <Check className="w-3 h-3 text-emerald-600 mt-0.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{isBn ? 'রুমের অবস্থা' : 'Operational Status'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'available', labelEn: 'Available', labelBn: 'উপলব্ধ / খালি', color: 'bg-emerald-500' },
                    { value: 'occupied', labelEn: 'Occupied', labelBn: 'ব্যবহৃত / রোগী আছে', color: 'bg-blue-500' },
                    { value: 'maintenance', labelEn: 'Maintenance', labelBn: 'রক্ষণাবেক্ষণ', color: 'bg-amber-500' },
                    { value: 'not_allowed', labelEn: 'Not Allowed', labelBn: 'অননুমোদিত', color: 'bg-rose-500' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, status: s.value as RoomStatus })}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        form.status === s.value
                          ? 'bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/40'
                          : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                      <span className="truncate">{isBn ? s.labelBn : s.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Notes & Equipment Details */}
          <div className="space-y-2">
            <Label htmlFor="edit-room-notes" className="text-xs font-semibold flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{isBn ? 'রুম সম্পর্কিত নোট বা নির্দেশনা' : 'Operational Notes & Equipment Details'}</span>
            </Label>
            <Textarea
              id="edit-room-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="text-sm resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-6 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-10 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </Button>

          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending}
            className="h-10 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 cursor-pointer shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving Changes...'}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Update Room'}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
