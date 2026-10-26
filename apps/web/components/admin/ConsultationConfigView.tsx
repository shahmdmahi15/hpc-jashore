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
  DoorOpen,
  Banknote,
  Users,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  Mail,
  Check,
  X,
  UserCheck,
  UserPlus,
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

  // Form State for Editing Fee & Chamber directly on user
  const [editForm, setEditForm] = useState<{
    fullName: string;
    phone: string;
    consultationFeeTaka: number;
    followUpFeeTaka: number;
    reportFeeTaka: number;
    chamberRoomId: string;
    isActive: boolean;
  }>({
    fullName: '',
    phone: '',
    consultationFeeTaka: 500,
    followUpFeeTaka: 300,
    reportFeeTaka: 0,
    chamberRoomId: '',
    isActive: true,
  });

  // Form State for Adding Doctor
  const [newDoctorForm, setNewDoctorForm] = useState<{
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    consultationFeeTaka: number;
    followUpFeeTaka: number;
    reportFeeTaka: number;
    chamberRoomId: string;
  }>({
    userId: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    consultationFeeTaka: 500,
    followUpFeeTaka: 300,
    reportFeeTaka: 0,
    chamberRoomId: '',
  });

  // Load Data
  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [docRes, roomRes, userRes] = await Promise.all([
        listDoctorsAction(),
        listRoomsAction({ limit: 100 }),
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
      fullName: doc.fullName || doc.displayName,
      phone: doc.phone || '',
      consultationFeeTaka: doc.consultationFeeTaka || 500,
      followUpFeeTaka: doc.followUpFeeTaka || 0,
      reportFeeTaka: doc.reportFeeTaka || 0,
      chamberRoomId: doc.chamberRoomId || '',
      isActive: doc.isActive === 1 || doc.isActive === true,
    });
    setIsEditDialogOpen(true);
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
      toast.error(language === 'bn' ? 'ডাক্তারের নাম আবশ্যক' : 'Doctor name is required');
      return;
    }
    if (editForm.consultationFeeTaka < 0) {
      toast.error(language === 'bn' ? 'কনসালটেশন ফি ঋণাত্মক হতে পারে না' : 'Consultation fee cannot be negative');
      return;
    }

    startTransition(async () => {
      const payload: UpdateDoctorConfigInput = {
        fullName: editForm.fullName.trim(),
        displayName: editForm.fullName.trim(),
        phone: editForm.phone.trim() || undefined,
        consultationFeeTaka: Number(editForm.consultationFeeTaka),
        followUpFeeTaka: Number(editForm.followUpFeeTaka),
        reportFeeTaka: Number(editForm.reportFeeTaka),
        chamberRoomId: editForm.chamberRoomId || null,
        isActive: editForm.isActive,
      };

      const res = await updateDoctorConfigAction(editingDoctor.id, payload);
      if (res.success && res.data) {
        toast.success(
          language === 'bn'
            ? `${res.data.fullName || res.data.displayName}-এর ফি ও চেম্বার আপডেট সম্পন্ন হয়েছে!`
            : `Fee and chamber updated for ${res.data.fullName || res.data.displayName}!`
        );
        setIsEditDialogOpen(false);
        setEditingDoctor(null);
        await loadData(false);
      } else {
        toast.error(res.error || (language === 'bn' ? 'আপডেট করতে ব্যর্থ হয়েছে' : 'Failed to update doctor fee & chamber'));
      }
    });
  };

  // Handle Create Submit
  const handleCreateSubmit = () => {
    if (!newDoctorForm.fullName.trim()) {
      toast.error(language === 'bn' ? 'ডাক্তারের নাম আবশ্যক' : 'Doctor name is required');
      return;
    }

    startTransition(async () => {
      const payload: CreateDoctorInput = {
        userId: addMode === 'existing_user' && newDoctorForm.userId ? newDoctorForm.userId : undefined,
        fullName: newDoctorForm.fullName.trim(),
        displayName: newDoctorForm.fullName.trim(),
        email: addMode === 'new_user' ? (newDoctorForm.email.trim() || undefined) : (newDoctorForm.email || undefined),
        password: addMode === 'new_user' ? (newDoctorForm.password.trim() || undefined) : undefined,
        phone: newDoctorForm.phone.trim() || undefined,
        consultationFeeTaka: Number(newDoctorForm.consultationFeeTaka),
        followUpFeeTaka: Number(newDoctorForm.followUpFeeTaka),
        reportFeeTaka: Number(newDoctorForm.reportFeeTaka),
        chamberRoomId: newDoctorForm.chamberRoomId || null,
      };

      const res = await createDoctorAction(payload);
      if (res.success && res.data) {
        toast.success(
          language === 'bn'
            ? `ডাক্তার ${res.data.fullName || res.data.displayName} সফলভাবে যুক্ত হয়েছে!`
            : `Doctor ${res.data.fullName || res.data.displayName} added successfully!`
        );
        setIsAddDialogOpen(false);
        setNewDoctorForm({
          userId: '',
          fullName: '',
          email: '',
          phone: '',
          password: '',
          consultationFeeTaka: 500,
          followUpFeeTaka: 300,
          reportFeeTaka: 0,
          chamberRoomId: '',
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
      (doc.fullName && doc.fullName.toLowerCase().includes(q)) ||
      (doc.displayName && doc.displayName.toLowerCase().includes(q)) ||
      (doc.phone && doc.phone.toLowerCase().includes(q)) ||
      (doc.email && doc.email.toLowerCase().includes(q)) ||
      (doc.chamberName && doc.chamberName.toLowerCase().includes(q));

    const isActive = doc.isActive === 1 || doc.isActive === true;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchSearch && matchStatus;
  });

  // KPI Calculations
  const totalDoctors = doctors.length;
  const activeDoctors = doctors.filter((d) => d.isActive === 1 || d.isActive === true).length;
  const avgFee = totalDoctors > 0
    ? Math.round(doctors.reduce((acc, d) => acc + (d.consultationFeeTaka || 0), 0) / totalDoctors)
    : 0;
  const assignedChambersCount = doctors.filter((d) => Boolean(d.chamberRoomId)).length;

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Top Banner & KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Total Doctors */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs relative overflow-hidden">
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
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs relative overflow-hidden">
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

        {/* Metric 3: Assigned Chambers */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'বরাদ্দকৃত চেম্বার' : 'Assigned Chambers'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {assignedChambersCount}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  / {totalDoctors} {language === 'bn' ? 'ডাক্তার' : 'doctors'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <DoorOpen className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Direct User Accounts */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-xs relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'ইউজার মডেল অ্যাকাউন্ট' : 'Direct User Model'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {totalDoctors}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  ({language === 'bn' ? '১০০% ডিরেক্ট' : '100% direct'})
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
      <Card className="border-border/70 shadow-xs bg-card/80 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Stethoscope className="size-5 text-emerald-500" />
                {language === 'bn'
                  ? 'ডাক্তার কনসালটেশন ফি ও চেম্বার রুম'
                  : 'Doctor Consultation Fee & Chamber'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {language === 'bn'
                  ? 'ইউজার মডেলের ডাক্তার অ্যাকাউন্টে সরাসরি চেম্বার রুম এবং ভিজিট ফি নির্ধারণ করুন।'
                  : 'Directly manage consultation fees and assigned chamber rooms on doctor user accounts.'}
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
                className="h-9 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="size-4" />
                <span>{language === 'bn' ? 'নতুন ডাক্তার যুক্ত করুন' : 'Add Doctor'}</span>
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
                      ? 'ডাক্তারের নাম, ফোন বা চেম্বার খুঁজুন...'
                      : 'Search doctor, phone, email, chamber...'
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
                {language === 'bn' ? 'ডাক্তারদের ফি ও চেম্বার লোড হচ্ছে...' : 'Loading doctor fee schedules...'}
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
            /* Cards Grid View: Pure Doctor User + Room + Fees */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDoctors.map((doc) => {
                const isActive = doc.isActive === 1 || doc.isActive === true;
                const displayName = doc.displayName || doc.fullName;

                return (
                  <Card
                    key={doc.id}
                    className={`border transition-all duration-200 overflow-hidden relative flex flex-col justify-between ${
                      isActive
                        ? 'border-border/70 hover:border-emerald-500/50 hover:shadow-md'
                        : 'border-border/40 opacity-75 bg-muted/20'
                    }`}
                  >
                    <div>
                      {/* Card Header Profile */}
                      <div className="p-4 sm:p-5 border-b border-border/40 bg-gradient-to-br from-card to-muted/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-inner">
                              {displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                                  {displayName}
                                </h4>
                                {isActive ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0 font-medium">
                                    {language === 'bn' ? 'সক্রিয়' : 'Active'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0 font-medium">
                                    {language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                <Mail className="size-3 text-muted-foreground/70 shrink-0" />
                                <span className="truncate">{doc.email}</span>
                              </p>
                              {doc.phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                  <Phone className="size-3 text-sky-500 shrink-0" />
                                  <span>{doc.phone}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Assigned Chamber Room Badge */}
                        <div className="flex items-center gap-2 flex-wrap mt-3 pt-2.5 border-t border-border/30 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground bg-background/80 px-2.5 py-1 rounded-lg border border-border/40">
                            <DoorOpen className="size-3.5 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-xs text-foreground">
                              {doc.chamberName || (doc.chamberRoomNumber ? `Chamber ${doc.chamberRoomNumber}` : (language === 'bn' ? 'চেম্বার নির্ধারিত নেই' : 'No Chamber'))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Fee Structure Display Box */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                          <Banknote className="size-3.5 text-emerald-500" />
                          {language === 'bn' ? 'কনসালটেশন ফি কাঠামো' : 'Fee Structure'}
                        </span>

                        <div className="grid grid-cols-3 gap-2">
                          {/* 1. Main Consultation Fee */}
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block leading-tight">
                              {language === 'bn' ? 'মূল ভিজিট ফি' : 'New Visit'}
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
                              {language === 'bn' ? 'রিপোর্ট ফি' : 'Report'}
                            </span>
                            <span className="text-base sm:text-lg font-black text-violet-600 dark:text-violet-400 tracking-tight mt-0.5 block">
                              ৳{doc.reportFeeTaka}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-3 sm:p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        UID: {doc.id.slice(0, 8)}
                      </span>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => openEditModal(doc)}
                        className="h-8 px-3 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <Edit2 className="size-3" />
                        {language === 'bn' ? 'ফি ও চেম্বার পরিবর্তন' : 'Edit Fee & Chamber'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Table View: Pure Doctor User + Room + Fees */
            <div className="rounded-2xl border border-border/70 overflow-hidden bg-background">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'ডাক্তার' : 'Doctor'}</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'ফোন' : 'Phone'}</TableHead>
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
                    <TableHead className="font-bold text-xs text-center">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="font-bold text-xs text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.map((doc) => {
                    const isActive = doc.isActive === 1 || doc.isActive === true;
                    const displayName = doc.displayName || doc.fullName;

                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="space-y-0.5">
                            <span className="font-bold text-sm text-foreground block">{displayName}</span>
                            <span className="text-[11px] text-muted-foreground block font-mono">
                              {doc.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {doc.phone || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="inline-flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
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
                        <TableCell className="text-center">
                          {isActive ? (
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
                            {language === 'bn' ? 'ফি ও চেম্বার' : 'Edit'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Doctor Fee & Chamber Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Stethoscope className="size-5 text-emerald-500" />
              {language === 'bn' ? 'ডাক্তার ফি ও চেম্বার পরিবর্তন' : 'Edit Doctor Fee & Chamber'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'bn'
                ? `${editingDoctor?.displayName || editingDoctor?.fullName}-এর ভিজিট ফি ও চেম্বার রুম আপডেট করুন।`
                : `Update consultation fees and chamber room for ${editingDoctor?.displayName || editingDoctor?.fullName}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Doctor Info & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডাক্তারের নাম' : 'Doctor Name'} *
                </label>
                <Input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder={language === 'bn' ? 'যেমন: ডা. বিশেষজ্ঞ' : 'e.g. Dr. Name'}
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

            {/* Email info */}
            {editingDoctor?.email && (
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground/70" />
                  <span>{language === 'bn' ? 'ইউজার ইমেইল:' : 'User Email:'}</span>
                </span>
                <span className="font-mono font-medium text-foreground">{editingDoctor.email}</span>
              </div>
            )}

            {/* Chamber Room Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DoorOpen className="size-3.5 text-emerald-500" />
                {language === 'bn' ? 'চেম্বার রুম বরাদ্দ' : 'Assigned Chamber Room'}
              </label>
              <Select
                value={editForm.chamberRoomId || 'none'}
                onValueChange={(val: string) => setEditForm((p) => ({ ...p, chamberRoomId: val === 'none' ? '' : val }))}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'চেম্বার সিলেক্ট করুন' : 'Select Chamber'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground italic">
                      {language === 'bn' ? 'কোনো চেম্বার বরাদ্দ নেই' : 'No Chamber Assigned'}
                    </span>
                  </SelectItem>
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

            {/* Active Status Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  {language === 'bn' ? 'ডাক্তার স্ট্যাটাস (সক্রিয়)' : 'Doctor Active Status'}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {language === 'bn'
                    ? 'নিষ্ক্রিয় থাকলে অভ্যর্থনায় নতুন সিরিয়াল বুকিং বন্ধ থাকবে।'
                    : 'When inactive, serial booking will be disabled on reception.'}
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

      {/* Add / Assign Doctor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Plus className="size-5 text-emerald-500" />
              {language === 'bn' ? 'নতুন ডাক্তার যুক্ত করুন' : 'Add / Assign Doctor'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'bn'
                ? 'বিদ্যমান ইউজার অ্যাকাউন্টকে ডাক্তার হিসেবে নির্ধারণ করুন অথবা নতুন অ্যাকাউন্ট তৈরি করুন।'
                : 'Assign doctor role to an existing user or create a new doctor user account.'}
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
                {language === 'bn' ? 'বিদ্যমান ইউজার নির্বাচন' : '1. Existing User'}
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
                {language === 'bn' ? 'নতুন ইউজার তৈরি' : '2. Create User'}
              </button>
            </div>

            {/* Mode 1: Select Existing User Dropdown */}
            {addMode === 'existing_user' && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <UserCheck className="size-4 text-emerald-500" />
                  {language === 'bn' ? 'ইউজার সিলেক্ট করুন' : 'Select Registered User'} *
                </label>
                <Select
                  value={newDoctorForm.userId}
                  onValueChange={handleSelectExistingUser}
                >
                  <SelectTrigger className="h-10 text-xs sm:text-sm bg-background border-emerald-500/30">
                    <SelectValue placeholder={language === 'bn' ? 'ইউজার নির্বাচন করুন' : 'Choose a user'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {usersList.map((u) => {
                      const isDoc = u.role === 'doctor';
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
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80">
                  {language === 'bn'
                    ? 'ইউজার সিলেক্ট করলে তাদের নাম, ইমেইল ও ফোন সরাসরি লোড হবে।'
                    : 'Selecting a user loads their name, email, and phone.'}
                </p>
              </div>
            )}

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'ডাক্তারের নাম' : 'Doctor Name'} *
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
                    {language === 'bn' ? 'লগইন পাসওয়ার্ড (ঐচ্ছিক)' : 'Password (Optional)'}
                  </label>
                  <Input
                    type="password"
                    value={newDoctorForm.password}
                    onChange={(e) => setNewDoctorForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Default: Doctor1234#"
                    className="h-9 text-xs sm:text-sm font-mono"
                  />
                </div>
              ) : null}
            </div>

            {/* Chamber Room Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DoorOpen className="size-3.5 text-emerald-500" />
                {language === 'bn' ? 'চেম্বার রুম বরাদ্দ' : 'Assigned Chamber Room'}
              </label>
              <Select
                value={newDoctorForm.chamberRoomId || 'none'}
                onValueChange={(val: string) => setNewDoctorForm((p) => ({ ...p, chamberRoomId: val === 'none' ? '' : val }))}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'চেম্বার সিলেক্ট করুন' : 'Select Chamber Room'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground italic">
                      {language === 'bn' ? 'কোনো চেম্বার বরাদ্দ নেই' : 'No Chamber Assigned'}
                    </span>
                  </SelectItem>
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
