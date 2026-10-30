// apps/web/components/admin/RoomManagementView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  DoorOpen,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building,
  ShieldCheck,
  Stethoscope,
  Clock,
  Users,
  Briefcase,
  CreditCard,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  SlidersHorizontal,
  X,
  LayoutGrid,
  Table as TableIcon,
  Check,
  ChevronRight,
  ShieldAlert,
  Hash,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { useRealtime } from '../../lib/use-realtime';
import {
  listRoomsAction,
  updateRoomStatusAction,
  deleteRoomAction,
  type RoomRecord,
  type RoomType,
  type RoomGender,
  type RoomStatus,
  type RoomStats,
} from '../../lib/actions/rooms';
import { CreateRoomDialog } from './CreateRoomDialog';
import { EditRoomDialog } from './EditRoomDialog';

// Configuration helpers
export const ROOM_TYPE_CONFIG: Record<
  RoomType,
  { labelEn: string; labelBn: string; icon: any; color: string; bg: string }
> = {
  waiting_room: {
    labelEn: 'Waiting Room',
    labelBn: 'অপেক্ষাগার',
    icon: Clock,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
  },
  public_room: {
    labelEn: 'Public Room',
    labelBn: 'পাবলিক রুম',
    icon: Users,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50',
  },
  private_room: {
    labelEn: 'Private Room',
    labelBn: 'প্রাইভেট রুম',
    icon: ShieldCheck,
    color: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/50',
  },
  doctor_consultation_room: {
    labelEn: 'Doctor Chamber',
    labelBn: 'ডাক্তার চেম্বার',
    icon: Stethoscope,
    color: 'text-sky-500 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/50',
  },
  therapy_room: {
    labelEn: 'Therapy Room',
    labelBn: 'থেরাপি রুম',
    icon: Sparkles,
    color: 'text-teal-500 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/50',
  },
  therapy_hall: {
    labelEn: 'Therapy Hall',
    labelBn: 'থেরাপি হল',
    icon: Layers,
    color: 'text-emerald-500 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50',
  },
  staff_room: {
    labelEn: 'Staff Room',
    labelBn: 'স্টাফ রুম',
    icon: Briefcase,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800',
  },
  cashier_room: {
    labelEn: 'Cashier Room',
    labelBn: 'ক্যাশিয়ার রুম',
    icon: CreditCard,
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50',
  },
};

export const GENDER_CONFIG: Record<
  RoomGender,
  { labelEn: string; labelBn: string; color: string; badgeClass: string }
> = {
  common: {
    labelEn: 'Common',
    labelBn: 'উভয়',
    color: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  },
  male: {
    labelEn: 'Male Only',
    labelBn: 'পুরুষ',
    color: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  },
  female: {
    labelEn: 'Female Only',
    labelBn: 'মহিলা',
    color: 'text-pink-600 dark:text-pink-400',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/60',
  },
};

export const STATUS_CONFIG: Record<
  RoomStatus,
  {
    labelEn: string;
    labelBn: string;
    badgeClass: string;
    dotColor: string;
    icon: any;
  }
> = {
  available: {
    labelEn: 'Available',
    labelBn: 'প্রস্তুত / খালি',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  occupied: {
    labelEn: 'Occupied',
    labelBn: 'ব্যস্ত / রোগী আছেন',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    dotColor: 'bg-blue-500',
    icon: Users,
  },
  maintenance: {
    labelEn: 'Maintenance',
    labelBn: 'রক্ষণাবেক্ষণ চলছে',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  not_allowed: {
    labelEn: 'Not Allowed',
    labelBn: 'অপ্রবেশ্য / বন্ধ',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    dotColor: 'bg-rose-500',
    icon: ShieldAlert,
  },
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toISOString().split('T')[0];
  } catch {
    return '—';
  }
}

export function RoomManagementView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Data state
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [stats, setStats] = useState<RoomStats>({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
    notAllowed: 0,
  });
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState<RoomRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<RoomRecord | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load rooms
  const fetchRooms = useCallback(() => {
    startTransition(async () => {
      const res = await listRoomsAction({
        query: debouncedQuery,
        type: typeFilter,
        gender: genderFilter,
        status: statusFilter,
        page: 1,
        limit: 100,
      });

      if (res.success && res.data) {
        setRooms(res.data.items || []);
        setStats(
          res.data.stats || {
            total: 0,
            available: 0,
            occupied: 0,
            maintenance: 0,
            notAllowed: 0,
          },
        );
      } else {
        toast.error(res.error || (isBn ? 'রুমের তথ্য লোড করতে সমস্যা হয়েছে' : 'Failed to load rooms'));
      }
    });
  }, [debouncedQuery, typeFilter, genderFilter, statusFilter, isBn]);

  useRealtime((event) => {
    if (event.type.startsWith('room.')) {
      fetchRooms();
    }
  });

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Handle Quick Status Change
  const handleQuickStatusChange = async (roomId: string, newStatus: RoomStatus) => {
    const res = await updateRoomStatusAction(roomId, newStatus);
    if (res.success && res.data) {
      toast.success(
        isBn
          ? `রুম স্ট্যাটাস আপডেট হয়েছে: ${STATUS_CONFIG[newStatus].labelBn}`
          : `Room status updated to ${STATUS_CONFIG[newStatus].labelEn}`,
      );
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r)),
      );
      // update stats locally
      setStats((prev) => {
        const oldRoom = rooms.find((r) => r.id === roomId);
        if (!oldRoom || oldRoom.status === newStatus) return prev;
        const copy = { ...prev };
        if (oldRoom.status === 'available') copy.available = Math.max(0, copy.available - 1);
        if (oldRoom.status === 'occupied') copy.occupied = Math.max(0, copy.occupied - 1);
        if (oldRoom.status === 'maintenance') copy.maintenance = Math.max(0, copy.maintenance - 1);
        if (oldRoom.status === 'not_allowed') copy.notAllowed = Math.max(0, copy.notAllowed - 1);

        if (newStatus === 'available') copy.available++;
        if (newStatus === 'occupied') copy.occupied++;
        if (newStatus === 'maintenance') copy.maintenance++;
        if (newStatus === 'not_allowed') copy.notAllowed++;
        return copy;
      });
    } else {
      toast.error(res.error || (isBn ? 'স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে' : 'Failed to update status'));
    }
  };

  // Handle Delete - Shadcn AlertDialog trigger
  const handleDeleteRoom = (room: RoomRecord) => {
    setRoomToDelete(room);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    const room = roomToDelete;
    setRoomToDelete(null);

    setDeletingId(room.id);
    const res = await deleteRoomAction(room.id);
    setDeletingId(null);

    if (res.success) {
      toast.success(isBn ? 'রুম সফলভাবে মুছে ফেলা হয়েছে' : 'Room deleted successfully');
      fetchRooms();
    } else {
      toast.error(res.error || (isBn ? 'রুম মুছতে ব্যর্থ হয়েছে' : 'Failed to delete room'));
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    genderFilter !== 'all' ||
    statusFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setTypeFilter('all');
    setGenderFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Launchpad */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border/60 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isBn ? 'রুম ও চেম্বার সেটিংস' : 'Room & Facility Configuration'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isBn
                  ? 'ডাক্তার চেম্বার, থেরাপি রুম ও হল, অপেক্ষাগার, ক্যাশিয়ার ও স্টাফ রুমের সার্বিক লাইভ কনফিগারেশন'
                  : 'Manage doctor chambers, therapy halls, private rooms, waiting zones, and facility access'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRooms}
            disabled={isPending}
            className="h-10 px-3.5 rounded-xl border-border/60 text-xs sm:text-sm font-medium hover:bg-muted/80 cursor-pointer touch-manipulation active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all cursor-pointer touch-manipulation active:scale-95"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {isBn ? 'নতুন রুম যোগ করুন' : 'Add New Room'}
          </Button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Rooms */}
        <Card className="border-border/60 shadow-xs hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isBn ? 'মোট রুম সংখ্যা' : 'Total Rooms'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {stats?.total ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
              <Building className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Capacity */}
        <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-card shadow-xs hover:border-emerald-500/40 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {isBn ? 'মোট ধারণক্ষমতা' : 'Total Capacity'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {stats?.totalCapacity ?? rooms.reduce((sum, r) => sum + (Number(r.capacity) || 1), 0)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Available */}
        <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-500/5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {isBn ? 'প্রস্তুত / খালি' : 'Available'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                {stats?.available ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Occupied */}
        <Card className="border-blue-200/60 dark:border-blue-900/40 bg-blue-500/5 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {isBn ? 'ব্যস্ত / রোগী আছেন' : 'Occupied'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
                {stats?.occupied ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card className="border-amber-200/60 dark:border-amber-900/40 bg-amber-500/5 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                {isBn ? 'রক্ষণাবেক্ষণ' : 'Maintenance'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
                {stats?.maintenance ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Not Allowed */}
        <Card className="border-rose-200/60 dark:border-rose-900/40 bg-rose-500/5 shadow-xs hover:border-rose-300 dark:hover:border-rose-800 transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] sm:text-xs font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                {isBn ? 'অপ্রবেশ্য / বন্ধ' : 'Not Allowed'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-700 dark:text-rose-300">
                {stats?.notAllowed ?? 0}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and View Control Bar */}
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isBn
                    ? 'রুম নম্বর, নাম বা বিবরণ দিয়ে সার্চ করুন...'
                    : 'Search by room number, name, or notes...'
                }
                className="pl-10 pr-9 h-10 rounded-xl bg-background border-border/70 text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters & View Switcher */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Room Type Filter */}
              <div className="w-[170px] sm:w-[190px]">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background border-border/70 text-xs sm:text-sm">
                    <SelectValue placeholder={isBn ? 'রুমের ধরন' : 'Room Type'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">
                      {isBn ? 'সব ধরনের রুম' : 'All Room Types'}
                    </SelectItem>
                    {Object.entries(ROOM_TYPE_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <SelectItem key={key} value={key} className="text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                            <span>{isBn ? cfg.labelBn : cfg.labelEn}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Filter */}
              <div className="w-[130px] sm:w-[145px]">
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background border-border/70 text-xs sm:text-sm">
                    <SelectValue placeholder={isBn ? 'জেন্ডার' : 'Gender'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {isBn ? 'সকল জেন্ডার' : 'All Genders'}
                    </SelectItem>
                    <SelectItem value="common">
                      {isBn ? 'উভয়' : 'Common'}
                    </SelectItem>
                    <SelectItem value="male">
                      {isBn ? 'পুরুষ' : 'Male Only'}
                    </SelectItem>
                    <SelectItem value="female">
                      {isBn ? 'মহিলা' : 'Female Only'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-[145px] sm:w-[160px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background border-border/70 text-xs sm:text-sm">
                    <SelectValue placeholder={isBn ? 'স্ট্যাটাস' : 'Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {isBn ? 'সকল স্ট্যাটাস' : 'All Statuses'}
                    </SelectItem>
                    <SelectItem value="available">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{isBn ? 'প্রস্তুত / খালি' : 'Available'}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="occupied">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{isBn ? 'ব্যস্ত / রোগী আছেন' : 'Occupied'}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="maintenance">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{isBn ? 'রক্ষণাবেক্ষণ' : 'Maintenance'}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="not_allowed">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>{isBn ? 'অপ্রবেশ্য / বন্ধ' : 'Not Allowed'}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={isBn ? 'কার্ড গ্রিড ভিউ' : 'Card Grid View'}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={isBn ? 'টেবিল ভিউ' : 'Table View'}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-10 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  {isBn ? 'রিসেট' : 'Clear'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area: Grid or Table */}
      {isPending && rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border/60 rounded-2xl min-h-[300px]">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {isBn ? 'রুমের তথ্য লোড হচ্ছে...' : 'Loading rooms...'}
          </p>
        </div>
      ) : rooms.length === 0 ? (
        <Card className="border-border/60 text-center py-12 px-4 shadow-xs">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto border border-border/60">
              <DoorOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">
                {isBn ? 'কোনো রুম পাওয়া যায়নি' : 'No Rooms Found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {hasActiveFilters
                  ? isBn
                    ? 'আপনার নির্বাচিত ফিল্টারের সাথে মিল রেখে কোনো রুম খুঁজে পাওয়া যায়নি।'
                    : 'No rooms match your current search and filter criteria.'
                  : isBn
                    ? 'এখনো কোনো রুম তৈরি করা হয়নি। নতুন রুম যোগ করে শুরু করুন।'
                    : 'No rooms configured yet. Add your clinic chambers and therapy rooms to get started.'}
              </p>
            </div>
            <div className="pt-2">
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="rounded-xl"
                >
                  {isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
                </Button>
              ) : (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {isBn ? 'প্রথম রুম যোগ করুন' : 'Add First Room'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const typeCfg = ROOM_TYPE_CONFIG[room.type] || ROOM_TYPE_CONFIG.doctor_consultation_room;
            const genderCfg = GENDER_CONFIG[room.gender] || GENDER_CONFIG.common;
            const statusCfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;
            const TypeIcon = typeCfg.icon;
            const StatusIcon = statusCfg.icon;

            return (
              <Card
                key={room.id}
                className="group border-border/70 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden bg-card"
              >
                <div>
                  {/* Card Header Banner */}
                  <div className="p-4 pb-3 border-b border-border/40 flex items-start justify-between gap-2 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${typeCfg.bg} border shrink-0`}>
                        <TypeIcon className={`w-4 h-4 ${typeCfg.color}`} />
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono tracking-tight bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900">
                          {room.roomNumber}
                        </span>
                        <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                          {isBn ? typeCfg.labelBn : typeCfg.labelEn}
                        </p>
                      </div>
                    </div>

                    {/* Capacity & Gender Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        <Users className="w-3 h-3" />
                        <span>{room.capacity ?? 1}</span>
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${genderCfg.badgeClass}`}
                      >
                        {isBn ? genderCfg.labelBn : genderCfg.labelEn}
                      </span>
                    </div>
                  </div>

                  {/* Room Name & Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {room.name}
                      </h4>
                      {room.notes ? (
                        <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
                          <p className="line-clamp-2 leading-relaxed">{room.notes}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60 italic mt-1">
                          {isBn ? 'কোনো নোট নেই' : 'No notes provided'}
                        </p>
                      )}
                    </div>

                    {/* Live Status Pill with 1-Click Dropdown */}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {isBn ? 'বর্তমান অবস্থা:' : 'Current Status:'}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer hover:opacity-90 active:scale-95 ${statusCfg.badgeClass}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${statusCfg.dotColor} ${
                                room.status === 'available' ? 'animate-pulse' : ''
                              }`}
                            />
                            <span>{isBn ? statusCfg.labelBn : statusCfg.labelEn}</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">
                            {isBn ? 'স্ট্যাটাস পরিবর্তন করুন' : 'Change Status'}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {(['available', 'occupied', 'maintenance', 'not_allowed'] as RoomStatus[]).map(
                            (st) => {
                              const s = STATUS_CONFIG[st];
                              const isCurrent = room.status === st;
                              return (
                                <DropdownMenuItem
                                  key={st}
                                  onClick={() => handleQuickStatusChange(room.id, st)}
                                  className="text-xs flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                                    <span>{isBn ? s.labelBn : s.labelEn}</span>
                                  </div>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </DropdownMenuItem>
                              );
                            },
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-4 py-3 bg-muted/30 border-t border-border/40 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(room.updatedAt || room.createdAt)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRoomForEdit(room);
                        setIsEditOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      {isBn ? 'এডিট' : 'Edit'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoom(room)}
                      disabled={deletingId === room.id}
                      className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Tabular View (Wide screens & Tablets) */
        <Card className="border-border/60 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[110px] font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'রুম নম্বর' : 'Room #'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'রুমের নাম' : 'Room Name'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'ক্যাটেগরি / ধরন' : 'Type / Category'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                    {isBn ? 'ধারণক্ষমতা' : 'Capacity'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'জেন্ডার অ্যাক্সেস' : 'Gender'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'বর্তমান অবস্থা' : 'Current Status'}
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider max-w-[200px]">
                    {isBn ? 'নোট' : 'Notes'}
                  </TableHead>
                  <TableHead className="w-[120px] text-right font-bold text-xs uppercase tracking-wider">
                    {isBn ? 'একশন' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => {
                  const typeCfg = ROOM_TYPE_CONFIG[room.type] || ROOM_TYPE_CONFIG.doctor_consultation_room;
                  const genderCfg = GENDER_CONFIG[room.gender] || GENDER_CONFIG.common;
                  const statusCfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;
                  const TypeIcon = typeCfg.icon;

                  return (
                    <TableRow key={room.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-muted border border-border/60">
                          {room.roomNumber}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-xs sm:text-sm text-foreground">
                        {room.name}
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-muted/30 border-border/50">
                          <TypeIcon className={`w-3.5 h-3.5 ${typeCfg.color}`} />
                          <span>{isBn ? typeCfg.labelBn : typeCfg.labelEn}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted border border-border/60">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span>{room.capacity ?? 1}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${genderCfg.badgeClass}`}
                        >
                          {isBn ? genderCfg.labelBn : genderCfg.labelEn}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer hover:opacity-90 active:scale-95 ${statusCfg.badgeClass}`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${statusCfg.dotColor} ${
                                  room.status === 'available' ? 'animate-pulse' : ''
                                }`}
                              />
                              <span>{isBn ? statusCfg.labelBn : statusCfg.labelEn}</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel className="text-xs">
                              {isBn ? 'স্ট্যাটাস পরিবর্তন করুন' : 'Change Status'}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(['available', 'occupied', 'maintenance', 'not_allowed'] as RoomStatus[]).map(
                              (st) => {
                                const s = STATUS_CONFIG[st];
                                const isCurrent = room.status === st;
                                return (
                                  <DropdownMenuItem
                                    key={st}
                                    onClick={() => handleQuickStatusChange(room.id, st)}
                                    className="text-xs flex items-center justify-between cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                                      <span>{isBn ? s.labelBn : s.labelEn}</span>
                                    </div>
                                    {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                  </DropdownMenuItem>
                                );
                              },
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {room.notes || <span className="text-muted-foreground/50 italic">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRoomForEdit(room);
                              setIsEditOpen(true);
                            }}
                            className="h-8 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRoom(room)}
                            disabled={deletingId === room.id}
                            className="h-8 px-2 text-xs rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <CreateRoomDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          fetchRooms();
        }}
      />

      <EditRoomDialog
        room={selectedRoomForEdit}
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedRoomForEdit(null);
        }}
        onSuccess={() => {
          fetchRooms();
        }}
      />

      {/* CONFIRM DELETE ROOM ALERT DIALOG */}
      <AlertDialog
        open={Boolean(roomToDelete)}
        onOpenChange={(open) => {
          if (!open) setRoomToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBn ? 'রুম মুছে ফেলা' : 'Delete Room'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBn
                ? `আপনি কি নিশ্চিতভাবে রুম '${roomToDelete?.roomNumber} - ${roomToDelete?.name}' মুছে ফেলতে চান? এটি মুছে ফেললে এই রুমে আর কোনো নতুন সেশন বা কিউ নির্ধারণ করা যাবে না।`
                : `Are you sure you want to delete room '${roomToDelete?.roomNumber} - ${roomToDelete?.name}'?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isBn ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRoom}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBn ? 'মুছে ফেলুন' : 'Delete Room'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
