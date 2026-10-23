// apps/web/components/admin/ConsultationConfigView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Stethoscope,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Calendar,
  Banknote,
  DollarSign,
  Users,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  Mail,
  GraduationCap,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  SlidersHorizontal,
  X,
  FileText,
  BadgeAlert,
  Percent,
  UserCheck,
  UserPlus,
  Link2,
  Unlink,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { useRealtime } from '../../lib/use-realtime';
import {
  listDoctorsAction,
  updateDoctorConfigAction,
  createDoctorAction,
  DoctorConfigRecord,
  CreateDoctorInput,
  UpdateDoctorConfigInput,
} from '../../lib/actions/consultation-config';
import { listRoomsAction, RoomRecord } from '../../lib/actions/rooms';
import { listUsersAction, UserRecord } from '../../lib/actions/users';

const DAYS_OF_WEEK = [
  { id: 'Saturday', en: 'Saturday', bn: 'শনিবার' },
  { id: 'Sunday', en: 'Sunday', bn: 'রবিবার' },
  { id: 'Monday', en: 'Monday', bn: 'সোমবার' },
  { id: 'Tuesday', en: 'Tuesday', bn: 'মঙ্গলবার' },
  { id: 'Wednesday', en: 'Wednesday', bn: 'বুধবার' },
  { id: 'Thursday', en: 'Thursday', bn: 'বৃহস্পতিবার' },
  { id: 'Friday', en: 'Friday', bn: 'শুক্রবার' },
];

export function ConsultationConfigView() {
  const { language } = useLanguage();
  const [isPending, startTransition] = useTransition();

  // State
  const [doctors, setDoctors] = useState<DoctorConfigRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [editingDoctor, setEditingDoctor] = useState<DoctorConfigRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'existing_user' | 'new_user'>('existing_user');

  // Form State for Editing
  const [editForm, setEditForm] = useState<{
    userId: string;
    fullName: string;
    phone: string;
    specialization: string;
    qualifications: string;
    consultationFeeTaka: number;
    followUpFeeTaka: number;
    reportFeeTaka: number;
    chamberRoomId: string;
    dailyQuota: number;
    slotDurationMinutes: number;
    dutyStartTime: string;
    dutyEndTime: string;
    availableDays: string[];
    notes: string;
    isActive: boolean;
  }>({
    userId: '',
    fullName: '',
    phone: '',
    specialization: '',
    qualifications: '',
    consultationFeeTaka: 500,
    followUpFeeTaka: 300,
    reportFeeTaka: 0,
    chamberRoomId: '',
    dailyQuota: 40,
    slotDurationMinutes: 15,
    dutyStartTime: '09:00 AM',
    dutyEndTime: '05:00 PM',
    availableDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    notes: '',
    isActive: true,
  });

  // Form State for Adding
  const [newDoctorForm, setNewDoctorForm] = useState<{
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    specialization: string;
    qualifications: string;
    consultationFeeTaka: number;
    followUpFeeTaka: number;
    reportFeeTaka: number;
    chamberRoomId: string;
    dailyQuota: number;
    slotDurationMinutes: number;
    dutyStartTime: string;
    dutyEndTime: string;
    availableDays: string[];
    notes: string;
  }>({
    userId: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    specialization: 'Physiotherapy & Rehabilitation Specialist',
    qualifications: 'BPT, PGD, MDMR, MPH',
    consultationFeeTaka: 500,
    followUpFeeTaka: 300,
    reportFeeTaka: 0,
    chamberRoomId: '',
    dailyQuota: 40,
    slotDurationMinutes: 15,
    dutyStartTime: '09:00 AM',
    dutyEndTime: '05:00 PM',
    availableDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    notes: '',
  });

  // Load Data
  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [docRes, roomRes, userRes] = await Promise.all([
        listDoctorsAction(),
        listRoomsAction({ type: 'doctor_consultation_room', limit: 100 }),
        listUsersAction(),
      ]);

      if (docRes.success && docRes.data) {
        setDoctors(docRes.data);
      } else {
        toast.error(docRes.error || (language === 'bn' ? 'ডাক্তার তালিকা লোড করতে ব্যর্থ' : 'Failed to load doctors'));
      }

      if (roomRes.success && roomRes.data) {
        setRooms(roomRes.data.items);
      }

      if (userRes.success && userRes.data) {
        setUsersList(userRes.data);
      }
    } catch (err: any) {
      toast.error(err?.message || (language === 'bn' ? 'ডেটা লোড করতে সমস্যা হয়েছে' : 'Failed to load data'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-Time SSE Subscription for Instant Synchronization
  useRealtime((event) => {
    if (
      event.type === 'doctor.created' ||
      event.type === 'doctor.updated' ||
      event.type === 'user.created' ||
      event.type === 'user.updated' ||
      event.type === 'user.disabled' ||
      event.type === 'room.created' ||
      event.type === 'room.updated'
    ) {
      loadData(false);
    }
  });

  // Open Edit Modal
  const openEditModal = (doc: DoctorConfigRecord) => {
    setEditingDoctor(doc);
    setEditForm({
      userId: doc.userId || 'none',
      fullName: doc.fullName,
      phone: doc.phone || '',
      specialization: doc.specialization || '',
      qualifications: doc.qualifications || '',
      consultationFeeTaka: doc.consultationFeeTaka || 500,
      followUpFeeTaka: doc.followUpFeeTaka || 300,
      reportFeeTaka: doc.reportFeeTaka || 0,
      chamberRoomId: doc.chamberRoomId || (rooms[0]?.id ?? ''),
      dailyQuota: doc.dailyQuota || 40,
      slotDurationMinutes: doc.slotDurationMinutes || 15,
      dutyStartTime: doc.dutyStartTime || '09:00 AM',
      dutyEndTime: doc.dutyEndTime || '05:00 PM',
      availableDays: Array.isArray(doc.availableDays) ? doc.availableDays : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      notes: doc.notes || '',
      isActive: doc.isActive === 1,
    });
    setIsEditDialogOpen(true);
  };

  // Toggle Day in Edit Form
  const toggleEditDay = (day: string) => {
    setEditForm((prev) => {
      const exists = prev.availableDays.includes(day);
      return {
        ...prev,
        availableDays: exists
          ? prev.availableDays.filter((d) => d !== day)
          : [...prev.availableDays, day],
      };
    });
  };

  // Toggle Day in New Doctor Form
  const toggleNewDay = (day: string) => {
    setNewDoctorForm((prev) => {
      const exists = prev.availableDays.includes(day);
      return {
        ...prev,
        availableDays: exists
          ? prev.availableDays.filter((d) => d !== day)
          : [...prev.availableDays, day],
      };
    });
  };

  // Handle Existing User Selection in Add Form
  const handleSelectExistingUser = (userId: string) => {
    const selected = usersList.find((u) => u.id === userId);
    if (!selected) return;
    setNewDoctorForm((prev) => ({
      ...prev,
      userId: selected.id,
      fullName: selected.displayName,
      email: selected.email,
      phone: selected.phone || prev.phone,
    }));
  };

  // Handle Edit Submit
  const handleEditSubmit = () => {
    if (!editingDoctor) return;
    if (!editForm.fullName.trim()) {
      toast.error(language === 'bn' ? 'ডাক্তারের নাম বাধ্যতামূলক' : 'Doctor name is required');
      return;
    }
    if (editForm.consultationFeeTaka < 0) {
      toast.error(language === 'bn' ? 'কনসালটেশন ফি ঋণাত্মক হতে পারে না' : 'Consultation fee cannot be negative');
      return;
    }

    startTransition(async () => {
      const payload: UpdateDoctorConfigInput = {
        userId: editForm.userId === 'none' ? null : (editForm.userId || undefined),
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || undefined,
        specialization: editForm.specialization.trim() || undefined,
        qualifications: editForm.qualifications.trim() || undefined,
        consultationFeeTaka: Number(editForm.consultationFeeTaka),
        followUpFeeTaka: Number(editForm.followUpFeeTaka),
        reportFeeTaka: Number(editForm.reportFeeTaka),
        chamberRoomId: editForm.chamberRoomId || undefined,
        dailyQuota: Number(editForm.dailyQuota),
        slotDurationMinutes: Number(editForm.slotDurationMinutes),
        dutyStartTime: editForm.dutyStartTime.trim(),
        dutyEndTime: editForm.dutyEndTime.trim(),
        availableDays: editForm.availableDays,
        notes: editForm.notes.trim() || undefined,
        isActive: editForm.isActive,
      };

      const res = await updateDoctorConfigAction(editingDoctor.id, payload);
      if (res.success && res.data) {
        toast.success(
          language === 'bn'
            ? `${res.data.fullName}-এর কনসালটেশন ফি, চেম্বার ও ইউজার অ্যাকাউন্ট আপডেট হয়েছে!`
            : `Consultation fee, chamber & user account updated for ${res.data.fullName}!`
        );
        setIsEditDialogOpen(false);
        setEditingDoctor(null);
        await loadData(false);
      } else {
        toast.error(res.error || (language === 'bn' ? 'আপডেট করতে ব্যর্থ হয়েছে' : 'Failed to update doctor config'));
      }
    });
  };

  // Handle Create Submit
  const handleCreateSubmit = () => {
    if (!newDoctorForm.fullName.trim()) {
      toast.error(language === 'bn' ? 'ডাক্তারের নাম বাধ্যতামূলক' : 'Doctor name is required');
      return;
    }

    startTransition(async () => {
      const payload: CreateDoctorInput = {
        userId: addMode === 'existing_user' && newDoctorForm.userId ? newDoctorForm.userId : undefined,
        fullName: newDoctorForm.fullName.trim(),
        email: addMode === 'new_user' ? (newDoctorForm.email.trim() || undefined) : (newDoctorForm.email || undefined),
        password: addMode === 'new_user' ? (newDoctorForm.password.trim() || undefined) : undefined,
        phone: newDoctorForm.phone.trim() || undefined,
        specialization: newDoctorForm.specialization.trim() || undefined,
        qualifications: newDoctorForm.qualifications.trim() || undefined,
        consultationFeeTaka: Number(newDoctorForm.consultationFeeTaka),
        followUpFeeTaka: Number(newDoctorForm.followUpFeeTaka),
        reportFeeTaka: Number(newDoctorForm.reportFeeTaka),
        chamberRoomId: newDoctorForm.chamberRoomId || undefined,
        dailyQuota: Number(newDoctorForm.dailyQuota),
        slotDurationMinutes: Number(newDoctorForm.slotDurationMinutes),
        dutyStartTime: newDoctorForm.dutyStartTime.trim(),
        dutyEndTime: newDoctorForm.dutyEndTime.trim(),
        availableDays: newDoctorForm.availableDays,
        notes: newDoctorForm.notes.trim() || undefined,
      };

      const res = await createDoctorAction(payload);
      if (res.success && res.data) {
        toast.success(
          language === 'bn'
            ? `নতুন ডাক্তার ${res.data.fullName} সফলভাবে যুক্ত হয়েছে!`
            : `Doctor ${res.data.fullName} added successfully!`
        );
        setIsAddDialogOpen(false);
        setNewDoctorForm({
          userId: '',
          fullName: '',
          email: '',
          phone: '',
          password: '',
          specialization: 'Physiotherapy & Rehabilitation Specialist',
          qualifications: 'BPT, PGD, MDMR, MPH',
          consultationFeeTaka: 500,
          followUpFeeTaka: 300,
          reportFeeTaka: 0,
          chamberRoomId: '',
          dailyQuota: 40,
          slotDurationMinutes: 15,
          dutyStartTime: '09:00 AM',
          dutyEndTime: '05:00 PM',
          availableDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
          notes: '',
        });
        await loadData(false);
      } else {
        toast.error(res.error || (language === 'bn' ? 'ডাক্তার যুক্ত করতে ব্যর্থ হয়েছে' : 'Failed to add doctor'));
      }
    });
  };

  // Filtered Doctors
  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      doc.fullName.toLowerCase().includes(q) ||
      (doc.phone && doc.phone.toLowerCase().includes(q)) ||
      (doc.email && doc.email.toLowerCase().includes(q)) ||
      (doc.specialization && doc.specialization.toLowerCase().includes(q)) ||
      (doc.qualifications && doc.qualifications.toLowerCase().includes(q)) ||
      (doc.chamberName && doc.chamberName.toLowerCase().includes(q)) ||
      (doc.linkedUser?.email && doc.linkedUser.email.toLowerCase().includes(q));

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && doc.isActive === 1) ||
      (statusFilter === 'inactive' && doc.isActive === 0);

    return matchSearch && matchStatus;
  });

  // KPI Calculations
  const totalDoctors = doctors.length;
  const activeDoctors = doctors.filter((d) => d.isActive === 1).length;
  const avgFee = totalDoctors > 0
    ? Math.round(doctors.reduce((acc, d) => acc + (d.consultationFeeTaka || 0), 0) / totalDoctors)
    : 0;
  const totalDailyQuota = doctors.reduce((acc, d) => acc + (d.dailyQuota || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Top Banner & KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Total Doctors */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'মোট ডাক্তার' : 'Total Doctors'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {totalDoctors}
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ({activeDoctors} {language === 'bn' ? 'সক্রিয়' : 'active'})
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Stethoscope className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Avg Consultation Fee */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'গড় ভিজিট ফি' : 'Avg Visit Fee'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  ৳{avgFee}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  / {language === 'bn' ? 'সেশন' : 'visit'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Banknote className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Total Daily Capacity */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'দৈনিক মোট কোটা' : 'Daily Quota'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {totalDailyQuota}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {language === 'bn' ? 'রোগী / দিন' : 'pts / day'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Users className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Connected System Users */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'সংযুক্ত ইউজার' : 'Linked Logins'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {doctors.filter((d) => d.userId || d.linkedUser).length}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  / {totalDoctors} {language === 'bn' ? 'ডাক্তার' : 'doctors'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Card */}
      <Card className="border-border/70 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Stethoscope className="size-5 text-emerald-500" />
                {language === 'bn'
                  ? 'ডাক্তার কনসালটেশন ফি ও চেম্বার শিডিউল কনফিগারেশন'
                  : 'Doctor Consultation Fee & Chamber Schedule'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {language === 'bn'
                  ? 'প্রতিটি ডাক্তারের মূল ভিজিট ফি, ফলো-আপ ফি, রিপোর্ট ফি, চেম্বার রুম ও সাপ্তাহিক শিডিউল পরিচালনা করুন।'
                  : 'Manage per-doctor consultation fees (main visit, follow-up, report), assigned chamber rooms, daily quotas, and weekly schedules.'}
              </CardDescription>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
                disabled={loading}
                className="h-9 rounded-xl text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAddMode('existing_user');
                  setIsAddDialogOpen(true);
                }}
                className="h-9 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="size-4" />
                <span>{language === 'bn' ? 'নতুন ডাক্তার যুক্ত করুন' : 'Add New Doctor'}</span>
              </Button>
            </div>
          </div>

          {/* Filters & Controls Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    language === 'bn'
                      ? 'ডাক্তারের নাম, ফোন, পদবী বা চেম্বার খুঁজুন...'
                      : 'Search doctor, phone, specialization, chamber...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 rounded-xl text-xs sm:text-sm bg-background/80"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="w-28 sm:w-32 h-9 rounded-xl text-xs bg-background/80">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                  <SelectItem value="active">{language === 'bn' ? 'সক্রিয়' : 'Active'}</SelectItem>
                  <SelectItem value="inactive">{language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 self-end sm:self-auto bg-muted/60 p-0.5 rounded-xl border border-border/40">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-2.5 rounded-lg text-xs font-medium"
              >
                <LayoutGrid className="size-3.5 mr-1.5" />
                {language === 'bn' ? 'কার্ড ভিউ' : 'Grid'}
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-2.5 rounded-lg text-xs font-medium"
              >
                <TableIcon className="size-3.5 mr-1.5" />
                {language === 'bn' ? 'টেবিল ভিউ' : 'Table'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="size-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground font-medium">
                {language === 'bn' ? 'ডাক্তারদের তথ্য ও ফি শিডিউল লোড হচ্ছে...' : 'Loading doctor fee schedules...'}
              </p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-border/60 rounded-2xl bg-muted/20">
              <Stethoscope className="size-10 text-muted-foreground/60 mx-auto" />
              <h3 className="text-base font-semibold text-foreground">
                {language === 'bn' ? 'কোনো ডাক্তার পাওয়া যায়নি' : 'No doctors found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? (language === 'bn'
                    ? 'আপনার সার্চ ফিল্টারের সাথে কোনো ডাক্তারের তথ্য মেলেনি।'
                    : 'No doctors matched your search query.')
                  : (language === 'bn'
                    ? 'এখনও কোনো ডাক্তার কনফিগার করা হয়নি। নতুন ডাক্তার যুক্ত করুন।'
                    : 'No doctors have been configured yet. Add a new doctor to get started.')}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="rounded-xl text-xs mt-2"
                >
                  {language === 'bn' ? 'সার্চ মুছুন' : 'Clear Search'}
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Cards Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDoctors.map((doc) => {
                const daysList = Array.isArray(doc.availableDays) ? doc.availableDays : [];
                const isLinked = Boolean(doc.userId || doc.linkedUser);
                return (
                  <Card
                    key={doc.id}
                    className={`border transition-all duration-200 overflow-hidden relative flex flex-col justify-between ${
                      doc.isActive === 1
                        ? 'border-border/70 hover:border-emerald-500/50 hover:shadow-md'
                        : 'border-border/40 opacity-75 bg-muted/20'
                    }`}
                  >
                    <div>
                      {/* Card Header Profile */}
                      <div className="p-4 sm:p-5 border-b border-border/40 bg-gradient-to-br from-card to-muted/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-11 sm:size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-inner">
                              {doc.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                                  {doc.fullName}
                                </h4>
                                {doc.isActive === 1 ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0 font-medium">
                                    {language === 'bn' ? 'সক্রিয়' : 'Active'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0 font-medium">
                                    {language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-primary font-medium">
                                {doc.specialization || (language === 'bn' ? 'বিশেষজ্ঞ ডাক্তার' : 'Specialist')}
                              </p>
                              {doc.qualifications && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <GraduationCap className="size-3 text-muted-foreground/80 shrink-0" />
                                  <span className="truncate">{doc.qualifications}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chamber & Contact Badges */}
                        <div className="flex items-center gap-2 flex-wrap mt-3 pt-2.5 border-t border-border/30 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground bg-background/80 px-2.5 py-1 rounded-lg border border-border/40">
                            <DoorOpen className="size-3 text-emerald-500 shrink-0" />
                            <span className="font-medium text-[11px] text-foreground">
                              {doc.chamberName || (doc.chamberRoomNumber ? `Chamber ${doc.chamberRoomNumber}` : (language === 'bn' ? 'চেম্বার নির্ধারিত নেই' : 'No Chamber'))}
                            </span>
                          </div>

                          {doc.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground bg-background/80 px-2 py-1 rounded-lg border border-border/40">
                              <Phone className="size-3 text-sky-500 shrink-0" />
                              <span className="text-[11px] font-mono">{doc.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Connected User Account System Badge */}
                        <div className="mt-2.5 pt-2 border-t border-border/30">
                          {isLinked ? (
                            <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] truncate">
                                <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                                <span className="font-semibold">{language === 'bn' ? 'সংযুক্ত ইউজার:' : 'Linked User:'}</span>
                                <span className="truncate font-mono">{doc.linkedUser?.email || doc.email || doc.userId}</span>
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditModal(doc)}
                                className="h-6 px-1.5 text-[10px] text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                              >
                                {language === 'bn' ? 'পরিবর্তন' : 'Change'}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs">
                              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                                <AlertCircle className="size-3.5 text-amber-500 shrink-0" />
                                {language === 'bn' ? 'ইউজার অ্যাকাউন্ট নেই' : 'No Login Account'}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(doc)}
                                className="h-6 px-2 text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                              >
                                <Link2 className="size-2.5 mr-1" />
                                {language === 'bn' ? 'সংযুক্ত করুন' : 'Connect'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fee Structure Display Box (Highlight) */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                          <Banknote className="size-3 text-emerald-500" />
                          {language === 'bn' ? 'ভিজিট ফি কাঠামো' : 'Fee Structure'}
                        </span>

                        <div className="grid grid-cols-3 gap-2">
                          {/* 1. Main Consultation Fee */}
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block leading-tight">
                              {language === 'bn' ? 'মূল কনসালটেশন' : 'New Visit'}
                            </span>
                            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5 block">
                              ৳{doc.consultationFeeTaka}
                            </span>
                          </div>

                          {/* 2. Follow-up Visit Fee */}
                          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-center">
                            <span className="text-[10px] text-sky-700 dark:text-sky-300 font-semibold block leading-tight">
                              {language === 'bn' ? 'ফলো-আপ' : 'Follow-up'}
                            </span>
                            <span className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 tracking-tight mt-0.5 block">
                              ৳{doc.followUpFeeTaka}
                            </span>
                          </div>

                          {/* 3. Report Review Fee */}
                          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25 text-center">
                            <span className="text-[10px] text-violet-700 dark:text-violet-300 font-semibold block leading-tight">
                              {language === 'bn' ? 'রিপোর্ট দেখানো' : 'Report'}
                            </span>
                            <span className="text-base sm:text-lg font-black text-violet-600 dark:text-violet-400 tracking-tight mt-0.5 block">
                              ৳{doc.reportFeeTaka}
                            </span>
                          </div>
                        </div>

                        {/* Schedule & Operational Details */}
                        <div className="space-y-2 pt-2 border-t border-border/30 text-xs">
                          {/* Duty Time & Daily Quota */}
                          <div className="flex items-center justify-between text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="size-3.5 text-muted-foreground/70" />
                              <span className="font-mono text-[11px] text-foreground">
                                {doc.dutyStartTime} - {doc.dutyEndTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 font-semibold text-foreground">
                              <span>{language === 'bn' ? 'কোটা:' : 'Quota:'}</span>
                              <span className="text-primary">{doc.dailyQuota} {language === 'bn' ? 'জন' : 'pts'}</span>
                            </div>
                          </div>

                          {/* Available Days */}
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            <Calendar className="size-3 text-muted-foreground/60 shrink-0 mr-0.5" />
                            {DAYS_OF_WEEK.map((day) => {
                              const isAvail = daysList.includes(day.id);
                              return (
                                <span
                                  key={day.id}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    isAvail
                                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                      : 'bg-muted/40 text-muted-foreground/40 line-through'
                                  }`}
                                >
                                  {language === 'bn' ? day.bn.slice(0, 3) : day.en.slice(0, 3)}
                                </span>
                              );
                            })}
                          </div>

                          {doc.notes && (
                            <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-border/30 line-clamp-2 mt-1">
                              "{doc.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-3 sm:p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ID: {doc.id.slice(0, 8)}...
                      </span>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openEditModal(doc)}
                        className="h-8 px-3 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit2 className="size-3" />
                        {language === 'bn' ? 'ফি ও শিডিউল এডিট' : 'Edit Fee & Config'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl border border-border/70 overflow-hidden bg-background">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'ডাক্তার' : 'Doctor'}</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'সংযুক্ত ইউজার' : 'Linked User'}</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'চেম্বার' : 'Chamber'}</TableHead>
                    <TableHead className="font-bold text-xs text-right text-emerald-600 dark:text-emerald-400">
                      {language === 'bn' ? 'মূল ভিজিট ফি' : 'Visit Fee'}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-right text-sky-600 dark:text-sky-400">
                      {language === 'bn' ? 'ফলো-আপ ফি' : 'Follow-up'}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-right text-violet-600 dark:text-violet-400">
                      {language === 'bn' ? 'রিপোর্ট ফি' : 'Report Fee'}
                    </TableHead>
                    <TableHead className="font-bold text-xs text-center">{language === 'bn' ? 'দৈনিক কোটা' : 'Quota'}</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'ডিউটি সময়' : 'Duty Time'}</TableHead>
                    <TableHead className="font-bold text-xs text-center">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="font-bold text-xs text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="space-y-0.5">
                          <span className="font-bold text-sm text-foreground block">{doc.fullName}</span>
                          <span className="text-[11px] text-muted-foreground block truncate max-w-[200px]">
                            {doc.qualifications || doc.specialization}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {doc.userId || doc.linkedUser ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <UserCheck className="size-3" />
                            {doc.linkedUser?.email || doc.email || 'Linked'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <AlertCircle className="size-3" />
                            {language === 'bn' ? 'সংযুক্ত নেই' : 'Unlinked'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded border border-border/40">
                          <DoorOpen className="size-3 text-emerald-500" />
                          {doc.chamberName || (doc.chamberRoomNumber ? `Chamber ${doc.chamberRoomNumber}` : '-')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                        ৳{doc.consultationFeeTaka}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs text-sky-600 dark:text-sky-400">
                        ৳{doc.followUpFeeTaka}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs text-violet-600 dark:text-violet-400">
                        ৳{doc.reportFeeTaka}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">
                        {doc.dailyQuota} {language === 'bn' ? 'জন' : 'pts'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {doc.dutyStartTime} - {doc.dutyEndTime}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.isActive === 1 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-2 py-0.5">
                            {language === 'bn' ? 'সক্রিয়' : 'Active'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0.5">
                            {language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(doc)}
                          className="h-8 px-2.5 rounded-lg text-xs"
                        >
                          <Edit2 className="size-3 mr-1" />
                          {language === 'bn' ? 'এডিট' : 'Edit'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Doctor Fee & Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Stethoscope className="size-5 text-emerald-500" />
              {language === 'bn' ? 'ডাক্তার কনসালটেশন ফি ও শিডিউল পরিবর্তন' : 'Edit Doctor Fee & Schedule'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'bn'
                ? `${editingDoctor?.fullName}-এর ভিজিট ফি, চেম্বার, সংযুক্ত ইউজার এবং দৈনিক রোগী কোটা আপডেট করুন।`
                : `Update fee structure, chamber assignment, linked user account, and daily schedule for ${editingDoctor?.fullName}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Connected User Account Selector */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  {language === 'bn' ? 'সংযুক্ত ইউজার লগইন অ্যাকাউন্ট' : 'Connected User Login Account'}
                </label>
                {editForm.userId && editForm.userId !== 'none' && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                    {language === 'bn' ? 'লগইন সক্রিয়' : 'Login Active'}
                  </Badge>
                )}
              </div>

              <Select
                value={editForm.userId || 'none'}
                onValueChange={(val: string) => setEditForm((p) => ({ ...p, userId: val }))}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm bg-background">
                  <SelectValue placeholder={language === 'bn' ? 'ইউজার নির্বাচন করুন' : 'Select User'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">
                    <span className="text-muted-foreground italic">
                      {language === 'bn' ? 'কোনো ইউজার লগইন সংযুক্ত নেই (অফলাইন ডাক্তার)' : 'None (Offline Doctor / No User Account)'}
                    </span>
                  </SelectItem>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">{u.displayName}</span>
                        <span className="text-muted-foreground font-mono">({u.email})</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-muted font-bold text-muted-foreground">
                          {u.role.toUpperCase()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডাক্তারের নাম' : 'Doctor Name'} *
                </label>
                <Input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g. Dr. Md. Toufiquzzaman"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}
                </label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="e.g. 01712345678"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            {/* Specialization & Qualifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'বিশেষজ্ঞ পদবী' : 'Specialization'}
                </label>
                <Input
                  value={editForm.specialization}
                  onChange={(e) => setEditForm((p) => ({ ...p, specialization: e.target.value }))}
                  placeholder="Physiotherapy & Rehabilitation Specialist"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডিগ্রি ও যোগ্যতা' : 'Qualifications'}
                </label>
                <Input
                  value={editForm.qualifications}
                  onChange={(e) => setEditForm((p) => ({ ...p, qualifications: e.target.value }))}
                  placeholder="MBBS, BPT, PGD, MDMR, MPH"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Chamber Room Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DoorOpen className="size-3.5 text-emerald-500" />
                {language === 'bn' ? 'চেম্বার রুম বরাদ্দ' : 'Assigned Chamber Room'}
              </label>
              <Select
                value={editForm.chamberRoomId}
                onValueChange={(val: string) => setEditForm((p) => ({ ...p, chamberRoomId: val }))}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'চেম্বার সিলেক্ট করুন' : 'Select Chamber'} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.roomNumber ? `[Room ${r.roomNumber}] ` : ''}{r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fee Structure Inputs (Highlight) */}
            <div className="p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Banknote className="size-4 text-emerald-500" />
                {language === 'bn' ? 'ভিজিট ফি সেটিংস (টাকা)' : 'Fee Structure Configuration (BDT ৳)'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Main Consultation Fee */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {language === 'bn' ? '১. মূল ভিজিট ফি (৳)' : '1. Main Visit Fee (৳)'} *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={editForm.consultationFeeTaka}
                    onChange={(e) => setEditForm((p) => ({ ...p, consultationFeeTaka: Number(e.target.value) }))}
                    className="h-9 font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono"
                  />
                </div>

                {/* 2. Follow-Up Fee */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                    {language === 'bn' ? '২. ফলো-আপ ফি (৳)' : '2. Follow-up Fee (৳)'} *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={editForm.followUpFeeTaka}
                    onChange={(e) => setEditForm((p) => ({ ...p, followUpFeeTaka: Number(e.target.value) }))}
                    className="h-9 font-bold text-sky-600 dark:text-sky-400 text-sm font-mono"
                  />
                </div>

                {/* 3. Report Review Fee */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    {language === 'bn' ? '৩. রিপোর্ট ফি (৳)' : '3. Report Fee (৳)'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={editForm.reportFeeTaka}
                    onChange={(e) => setEditForm((p) => ({ ...p, reportFeeTaka: Number(e.target.value) }))}
                    className="h-9 font-bold text-violet-600 dark:text-violet-400 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Daily Quota & Slot Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'দৈনিক রোগী দেখার সর্বোচ্চ কোটা' : 'Daily Patient Quota'}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={editForm.dailyQuota}
                  onChange={(e) => setEditForm((p) => ({ ...p, dailyQuota: Number(e.target.value) }))}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'গড় কনসালটেশন সময় (মিনিট)' : 'Avg Slot Duration (mins)'}
                </label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  step={5}
                  value={editForm.slotDurationMinutes}
                  onChange={(e) => setEditForm((p) => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            {/* Duty Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডিউটি শুরু' : 'Duty Start Time'}
                </label>
                <Input
                  value={editForm.dutyStartTime}
                  onChange={(e) => setEditForm((p) => ({ ...p, dutyStartTime: e.target.value }))}
                  placeholder="09:00 AM"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডিউটি সমাপ্তি' : 'Duty End Time'}
                </label>
                <Input
                  value={editForm.dutyEndTime}
                  onChange={(e) => setEditForm((p) => ({ ...p, dutyEndTime: e.target.value }))}
                  placeholder="05:00 PM"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            {/* Available Days Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                {language === 'bn' ? 'সাপ্তাহিক চেম্বার উপস্থিতির দিনসমূহ' : 'Available Days in Clinic'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = editForm.availableDays.includes(day.id);
                  return (
                    <Button
                      type="button"
                      key={day.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleEditDay(day.id)}
                      className={`h-8 px-2.5 rounded-lg text-xs font-medium ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'border-border/60 hover:bg-muted'
                      }`}
                    >
                      {isSelected && <Check className="size-3 mr-1" />}
                      {language === 'bn' ? day.bn : day.en}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Doctor Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {language === 'bn' ? 'চেম্বার ও ভিজিট সংক্রান্ত নোট' : 'Consultation Instructions / Notes'}
              </label>
              <Textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder={
                  language === 'bn'
                    ? 'সিরিয়াল বুকিং বা পরামর্শ সংক্রান্ত জরুরি বার্তা...'
                    : 'Special clinical notes or serial guidance...'
                }
                className="text-xs sm:text-sm resize-none"
              />
            </div>

            {/* Active Status Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  {language === 'bn' ? 'ডাক্তার স্ট্যাটাস (সক্রিয়)' : 'Doctor Active Status'}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {language === 'bn'
                    ? 'নিষ্ক্রিয় থাকলে ফ্রন্ট ডেস্কে নতুন সিরিয়াল বুকিং বন্ধ থাকবে।'
                    : 'When inactive, serial booking will be disabled on front desks.'}
                </span>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm((p) => ({ ...p, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              onClick={handleEditSubmit}
              disabled={isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {isPending ? (
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="size-3.5 mr-1.5" />
              )}
              {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Doctor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Plus className="size-5 text-emerald-500" />
              {language === 'bn' ? 'নতুন ডাক্তার যুক্ত করুন' : 'Add New Doctor Profile'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'bn'
                ? 'বিদ্যমান ইউজার অ্যাকাউন্ট নির্বাচন করুন অথবা নতুন ইউজার ও ডাক্তার একসাথে তৈরি করুন।'
                : 'Select an existing user account or create a new user & doctor profile together.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/60 gap-1">
              <button
                type="button"
                onClick={() => setAddMode('existing_user')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  addMode === 'existing_user'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserCheck className="size-3.5" />
                {language === 'bn' ? 'বিদ্যমান ইউজার সিলেক্ট' : '1. Link Existing User'}
              </button>
              <button
                type="button"
                onClick={() => setAddMode('new_user')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  addMode === 'new_user'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="size-3.5" />
                {language === 'bn' ? 'নতুন ইউজার ও ডাক্তার তৈরি' : '2. Create Brand New User'}
              </button>
            </div>

            {/* Mode 1: Select Existing User Dropdown */}
            {addMode === 'existing_user' && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <UserCheck className="size-4 text-emerald-500" />
                  {language === 'bn' ? 'সিস্টেম ইউজার সিলেক্ট করুন' : 'Select Registered System User'} *
                </label>
                <Select
                  value={newDoctorForm.userId}
                  onValueChange={handleSelectExistingUser}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-background border-emerald-500/30">
                    <SelectValue placeholder={language === 'bn' ? 'ইউজার বেছে নিন (ডাক্তার / স্টাফ)' : 'Choose a registered user'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {usersList.map((u) => {
                      const isDoc = u.role === 'doctor';
                      const alreadyLinked = doctors.some((d) => d.userId === u.id);
                      return (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-semibold text-foreground">{u.displayName}</span>
                            <span className="text-muted-foreground font-mono">({u.email})</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isDoc ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                            {alreadyLinked && (
                              <span className="text-[10px] text-amber-600 font-semibold">[Already Linked]</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                  {language === 'bn'
                    ? 'ইউজার সিলেক্ট করলে তাদের নাম, ইমেইল এবং ফোন স্বয়ংক্রিয়ভাবে যুক্ত হবে।'
                    : 'Selecting a user auto-populates their name, email, and phone.'}
                </p>
              </div>
            )}

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডাক্তারের পুরো নাম' : 'Doctor Full Name'} *
                </label>
                <Input
                  value={newDoctorForm.fullName}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g. Dr. Sabrina Sultana"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <Input
                  type="email"
                  value={newDoctorForm.email}
                  disabled={addMode === 'existing_user' && Boolean(newDoctorForm.userId)}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="doctor@example.com"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            {/* Phone & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}
                </label>
                <Input
                  value={newDoctorForm.phone}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="017xxxxxxxx"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              {addMode === 'new_user' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {language === 'bn' ? 'লগইন পাসওয়ার্ড (ঐচ্ছিক)' : 'Login Password (Optional)'}
                  </label>
                  <Input
                    type="password"
                    value={newDoctorForm.password}
                    onChange={(e) => setNewDoctorForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Default: Doctor1234#"
                    className="h-9 text-xs sm:text-sm font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {language === 'bn' ? 'সংযুক্ত ইউজার আইডি' : 'Linked User ID'}
                  </label>
                  <Input
                    value={newDoctorForm.userId || 'None selected'}
                    disabled
                    className="h-9 text-xs sm:text-sm font-mono bg-muted/40"
                  />
                </div>
              )}
            </div>

            {/* Specialization & Qualifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'বিশেষজ্ঞ পদবী' : 'Specialization'}
                </label>
                <Input
                  value={newDoctorForm.specialization}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, specialization: e.target.value }))}
                  placeholder="Consultant - Physical Therapy"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডিগ্রি ও যোগ্যতা' : 'Qualifications'}
                </label>
                <Input
                  value={newDoctorForm.qualifications}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, qualifications: e.target.value }))}
                  placeholder="BPT, PGD, MDMR, MPH"
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Chamber Room Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DoorOpen className="size-3.5 text-emerald-500" />
                {language === 'bn' ? 'চেম্বার রুম বরাদ্দ' : 'Assigned Chamber Room'}
              </label>
              <Select
                value={newDoctorForm.chamberRoomId}
                onValueChange={(val: string) => setNewDoctorForm((p) => ({ ...p, chamberRoomId: val }))}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'চেম্বার সিলেক্ট করুন' : 'Select Chamber Room'} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.roomNumber ? `[Room ${r.roomNumber}] ` : ''}{r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fee Structure (Highlight) */}
            <div className="p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Banknote className="size-4 text-emerald-500" />
                {language === 'bn' ? 'ভিজিট ফি সেটিংস (টাকা)' : 'Fee Structure Configuration (BDT ৳)'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {language === 'bn' ? '১. মূল ভিজিট ফি (৳)' : '1. Main Visit Fee (৳)'} *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={newDoctorForm.consultationFeeTaka}
                    onChange={(e) => setNewDoctorForm((p) => ({ ...p, consultationFeeTaka: Number(e.target.value) }))}
                    className="h-9 font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                    {language === 'bn' ? '২. ফলো-আপ ফি (৳)' : '2. Follow-up Fee (৳)'} *
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={newDoctorForm.followUpFeeTaka}
                    onChange={(e) => setNewDoctorForm((p) => ({ ...p, followUpFeeTaka: Number(e.target.value) }))}
                    className="h-9 font-bold text-sky-600 dark:text-sky-400 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    {language === 'bn' ? '৩. রিপোর্ট ফি (৳)' : '3. Report Fee (৳)'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={newDoctorForm.reportFeeTaka}
                    onChange={(e) => setNewDoctorForm((p) => ({ ...p, reportFeeTaka: Number(e.target.value) }))}
                    className="h-9 font-bold text-violet-600 dark:text-violet-400 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Daily Quota & Slot Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'দৈনিক রোগী দেখার সর্বোচ্চ কোটা' : 'Daily Patient Quota'}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={newDoctorForm.dailyQuota}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, dailyQuota: Number(e.target.value) }))}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'গড় কনসালটেশন সময় (মিনিট)' : 'Avg Slot Duration (mins)'}
                </label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  step={5}
                  value={newDoctorForm.slotDurationMinutes}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            {/* Duty Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডিউটি শুরু' : 'Duty Start Time'}
                </label>
                <Input
                  value={newDoctorForm.dutyStartTime}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, dutyStartTime: e.target.value }))}
                  placeholder="09:00 AM"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডিউটি সমাপ্তি' : 'Duty End Time'}
                </label>
                <Input
                  value={newDoctorForm.dutyEndTime}
                  onChange={(e) => setNewDoctorForm((p) => ({ ...p, dutyEndTime: e.target.value }))}
                  placeholder="05:00 PM"
                  className="h-9 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            {/* Available Days Checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                {language === 'bn' ? 'সাপ্তাহিক চেম্বার উপস্থিতির দিনসমূহ' : 'Available Days in Clinic'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = newDoctorForm.availableDays.includes(day.id);
                  return (
                    <Button
                      type="button"
                      key={day.id}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleNewDay(day.id)}
                      className={`h-8 px-2.5 rounded-lg text-xs font-medium ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'border-border/60 hover:bg-muted'
                      }`}
                    >
                      {isSelected && <Check className="size-3 mr-1" />}
                      {language === 'bn' ? day.bn : day.en}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Doctor Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {language === 'bn' ? 'চেম্বার ও ভিজিট সংক্রান্ত নোট' : 'Consultation Instructions / Notes'}
              </label>
              <Textarea
                rows={2}
                value={newDoctorForm.notes}
                onChange={(e) => setNewDoctorForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder={
                  language === 'bn'
                    ? 'সিরিয়াল বুকিং বা পরামর্শ সংক্রান্ত জরুরি বার্তা...'
                    : 'Special clinical notes or serial guidance...'
                }
                className="text-xs sm:text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSubmit}
              disabled={isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {isPending ? (
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="size-3.5 mr-1.5" />
              )}
              {language === 'bn' ? 'ডাক্তার যোগ করুন' : 'Add Doctor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
