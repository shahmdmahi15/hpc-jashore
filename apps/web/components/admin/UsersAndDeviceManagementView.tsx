// apps/web/components/admin/UsersAndDeviceManagementView.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Users,
  Tv,
  MonitorSmartphone,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  ShieldCheck,
  Stethoscope,
  Activity,
  Receipt,
  Headphones,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Radio,
  Clock,
  MapPin,
  ExternalLink,
  Laptop,
  Smartphone,
  Lock,
  Sun,
  Moon,
  Globe,
  Zap,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  listUsersAction,
  listPendingUsersAction,
  approveUserAction,
  rejectUserAction,
  createUserAction,
  updateUserAction,
  toggleUserStatusAction,
  deleteUserAction,
  listUserSessionsAction,
  revokeSessionAction,
  type UserRecord,
  type UserSessionRecord,
} from '../../lib/actions/users';
import {
  listTvDevicesAction,
  pairTvDeviceAction,
  updateTvDeviceAction,
  revokeTvDeviceAction,
  deleteTvDeviceAction,
  forceUpdateTvDeviceAction,
  type TvDeviceRecord,
} from '../../lib/actions/devices';
import { useRealtime } from '../../lib/use-realtime';

const ROLE_CONFIG = {
  admin: {
    labelEn: 'Admin',
    labelBn: 'এডমিন',
    icon: ShieldCheck,
    color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  doctor: {
    labelEn: 'Doctor',
    labelBn: 'ডাক্তার',
    icon: Stethoscope,
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  handler: {
    labelEn: 'Handler',
    labelBn: 'হ্যান্ডলার',
    icon: Activity,
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  cashier: {
    labelEn: 'Cashier',
    labelBn: 'ক্যাশিয়ার',
    icon: Receipt,
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  receptionist: {
    labelEn: 'Receptionist',
    labelBn: 'রিসেপশনিস্ট',
    icon: Headphones,
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
} as const;

type PermittedRole = keyof typeof ROLE_CONFIG;

export default function UsersAndDeviceManagementView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [isPending, startTransition] = useTransition();

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'approvals' | 'tvs' | 'sessions'>('users');

  // Data states
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [tvDevices, setTvDevices] = useState<TvDeviceRecord[]>([]);
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isPairTvOpen, setIsPairTvOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<UserRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Selected for edit
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form states - Create User
  const [createForm, setCreateForm] = useState({
    displayName: '',
    email: '',
    role: 'receptionist' as PermittedRole,
    phone: '',
    password: '',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Form states - Edit User
  const [editForm, setEditForm] = useState({
    displayName: '',
    role: 'receptionist' as PermittedRole,
    phone: '',
    password: '',
    isActive: true,
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Form states - Pair TV
  const [pairForm, setPairForm] = useState({
    pairingCode: '',
    deviceName: '',
    location: '',
    department: 'ALL' as 'ALL' | 'CONSULTATION' | 'THERAPY',
    theme: 'dark' as 'dark' | 'light',
    language: 'bn' as 'bn' | 'en',
  });

  // State - Edit Paired / Pending TV
  const [editingTv, setEditingTv] = useState<TvDeviceRecord | null>(null);
  const [editTvForm, setEditTvForm] = useState({
    deviceName: '',
    location: '',
    department: 'ALL' as 'ALL' | 'CONSULTATION' | 'THERAPY',
    theme: 'dark' as 'dark' | 'light',
    language: 'bn' as 'bn' | 'en',
  });

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, tvRes, sRes] = await Promise.all([
        listUsersAction(),
        listTvDevicesAction(),
        listUserSessionsAction(),
      ]);

      if (uRes.success && uRes.data) setUsers(uRes.data);
      if (tvRes.success && tvRes.data) setTvDevices(tvRes.data);
      if (sRes.success && sRes.data) setSessions(sRes.data);
    } catch {
      toast.error(isBn ? 'তথ্য লোড করতে ব্যর্থ হয়েছে' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealtime((event) => {
    if (
      event.type.startsWith('tv:')
    ) {
      listTvDevicesAction().then((tvRes) => {
        if (tvRes.success && tvRes.data) setTvDevices(tvRes.data);
      });
    } else if (
      event.type.startsWith('user.') ||
      event.type.startsWith('user:') ||
      event.type.startsWith('session.') ||
      event.type.startsWith('doctor.') ||
      event.type.startsWith('auth:')
    ) {
      listUsersAction().then((uRes) => {
        if (uRes.success && uRes.data) setUsers(uRes.data);
      });
      listUserSessionsAction().then((sRes) => {
        if (sRes.success && sRes.data) setSessions(sRes.data);
      });
    }
  });

  // Computed Pending Approvals
  const pendingUsers = users.filter((u) => u.isApproved === 0 || u.approvalStatus === 'pending');

  // Handle Approve User
  const handleApproveUser = async (u: UserRecord) => {
    startTransition(async () => {
      const res = await approveUserAction(u.id);
      if (res.success) {
        toast.success(
          isBn
            ? `${u.displayName} এর অ্যাকাউন্ট সফলভাবে অনুমোদিত হয়েছে!`
            : `${u.displayName}'s account approved successfully!`,
        );
        const uRes = await listUsersAction();
        if (uRes.success && uRes.data) setUsers(uRes.data);
      } else {
        toast.error(res.error || (isBn ? 'অনুমোদন ব্যর্থ হয়েছে' : 'Failed to approve user'));
      }
    });
  };

  const handleOpenReject = (u: UserRecord) => {
    setRejectingUser(u);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    startTransition(async () => {
      const res = await rejectUserAction(rejectingUser.id, rejectionReason);
      if (res.success) {
        toast.success(
          isBn
            ? `${rejectingUser.displayName}-এর রেজিস্ট্রেশন প্রত্যাখ্যান করা হয়েছে`
            : `Registration for ${rejectingUser.displayName} rejected`,
        );
        setIsRejectDialogOpen(false);
        setRejectingUser(null);
        setRejectionReason('');
        const uRes = await listUsersAction();
        if (uRes.success && uRes.data) setUsers(uRes.data);
      } else {
        toast.error(res.error || (isBn ? 'প্রত্যাখ্যান ব্যর্থ হয়েছে' : 'Failed to reject user'));
      }
    });
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.displayName || !createForm.email || !createForm.password) {
      toast.error(isBn ? 'সকল প্রয়োজনীয় ঘর পূরণ করুন' : 'Please fill all required fields');
      return;
    }

    startTransition(async () => {
      const res = await createUserAction({
        displayName: createForm.displayName,
        email: createForm.email,
        role: createForm.role,
        password: createForm.password,
        phone: createForm.phone || undefined,
      });

      if (res.success && res.data) {
        toast.success(isBn ? 'ব্যবহারকারী সফলভাবে যুক্ত হয়েছে' : 'User created successfully');
        setUsers((prev) => [res.data!, ...prev]);
        setIsCreateUserOpen(false);
        setCreateForm({
          displayName: '',
          email: '',
          role: 'receptionist',
          phone: '',
          password: '',
        });
      } else {
        toast.error(res.error || (isBn ? 'ব্যবহারকারী তৈরি ব্যর্থ' : 'Failed to create user'));
      }
    });
  };

  // Open Edit User Modal
  const openEditModal = (u: UserRecord) => {
    setSelectedUser(u);
    setEditForm({
      displayName: u.displayName,
      role: u.role as PermittedRole,
      phone: u.phone || '',
      password: '',
      isActive: Boolean(u.isActive),
    });
    setIsEditUserOpen(true);
  };

  // Handle Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    startTransition(async () => {
      const res = await updateUserAction(selectedUser.id, {
        displayName: editForm.displayName,
        role: editForm.role,
        phone: editForm.phone || undefined,
        isActive: editForm.isActive,
        password: editForm.password ? editForm.password : undefined,
      });

      if (res.success && res.data) {
        toast.success(isBn ? 'তথ্য সফলভাবে হালনাগাদ হয়েছে' : 'User updated successfully');
        setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? res.data! : u)));
        setIsEditUserOpen(false);
        setSelectedUser(null);
      } else {
        toast.error(res.error || (isBn ? 'হালনাগাদ ব্যর্থ হয়েছে' : 'Failed to update user'));
      }
    });
  };

  // Toggle User Active Status
  const handleToggleActive = async (u: UserRecord) => {
    const newStatus = u.isActive === 1 ? false : true;
    startTransition(async () => {
      const res = await toggleUserStatusAction(u.id, newStatus);
      if (res.success && res.data) {
        toast.success(
          isBn
            ? `${u.displayName} ${newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`
            : `${u.displayName} set to ${newStatus ? 'Active' : 'Inactive'}`,
        );
        setUsers((prev) => prev.map((item) => (item.id === u.id ? res.data! : item)));
      } else {
        toast.error(res.error || (isBn ? 'স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে' : 'Failed to update status'));
      }
    });
  };

  // Handle Pair TV
  const handlePairTv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairForm.pairingCode || !pairForm.deviceName) {
      toast.error(isBn ? 'পেয়ারিং কোড ও ডিভাইসের নাম আবশ্যক' : 'Pairing code and device name required');
      return;
    }

    startTransition(async () => {
      const res = await pairTvDeviceAction({
        pairingCode: pairForm.pairingCode.trim().toUpperCase(),
        deviceName: pairForm.deviceName,
        location: pairForm.location || undefined,
        department: pairForm.department,
        theme: pairForm.theme,
        language: pairForm.language,
      });

      if (res.success && res.data) {
        toast.success(isBn ? 'টিভি স্ক্রিন সফলভাবে পেয়ার ও সক্রিয় হয়েছে!' : 'TV paired and activated successfully!');
        setTvDevices((prev) => [res.data!, ...prev.filter((d) => d.id !== res.data!.id)]);
        setIsPairTvOpen(false);
        setPairForm({
          pairingCode: '',
          deviceName: '',
          location: '',
          department: 'ALL',
          theme: 'dark',
          language: 'bn',
        });
      } else {
        toast.error(res.error || (isBn ? 'টিভি পেয়ারিং ব্যর্থ হয়েছে' : 'Failed to pair TV device'));
      }
    });
  };

  // Direct Pair for pending TV
  const handleDirectPairPendingTv = async (tv: TvDeviceRecord) => {
    startTransition(async () => {
      const res = await pairTvDeviceAction({
        pairingCode: tv.pairingCode.trim().toUpperCase(),
        deviceName: tv.deviceName || `TV Display ${tv.pairingCode}`,
        location: tv.location || undefined,
        department: tv.department || 'ALL',
        theme: tv.theme || 'dark',
        language: tv.language || 'bn',
      });
      if (res.success && res.data) {
        toast.success(isBn ? 'টিভি স্ক্রিন সফলভাবে পেয়ার ও সক্রিয় হয়েছে!' : 'TV display paired and activated!');
        setTvDevices((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
      } else {
        toast.error(res.error || (isBn ? 'টিভি পেয়ারিং ব্যর্থ হয়েছে' : 'Failed to pair TV device'));
      }
    });
  };

  // Open Edit TV modal
  const handleOpenEditTv = (tv: TvDeviceRecord) => {
    setEditingTv(tv);
    setEditTvForm({
      deviceName: tv.deviceName || '',
      location: tv.location || '',
      department: tv.department || 'ALL',
      theme: tv.theme || 'dark',
      language: tv.language || 'bn',
    });
  };

  // Save Edit TV
  const handleSaveEditTv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTv) return;
    if (!editTvForm.deviceName.trim()) {
      toast.error(isBn ? 'স্ক্রিনের নাম আবশ্যক' : 'Screen name is required');
      return;
    }
    startTransition(async () => {
      const res = await updateTvDeviceAction(editingTv.id, {
        deviceName: editTvForm.deviceName.trim(),
        location: editTvForm.location.trim() || undefined,
        department: editTvForm.department,
        theme: editTvForm.theme,
        language: editTvForm.language,
      });
      if (res.success && res.data) {
        toast.success(isBn ? 'টিভি স্ক্রিনের তথ্য সফলভাবে সংরক্ষিত হয়েছে' : 'TV screen updated successfully');
        setTvDevices((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
        setEditingTv(null);
      } else {
        toast.error(res.error || (isBn ? 'টিভি তথ্য আপডেট ব্যর্থ হয়েছে' : 'Failed to update TV device'));
      }
    });
  };

  // Handle TV Department Change
  const handleChangeTvDepartment = async (tv: TvDeviceRecord, department: 'ALL' | 'CONSULTATION' | 'THERAPY') => {
    startTransition(async () => {
      const res = await updateTvDeviceAction(tv.id, { department });
      if (res.success && res.data) {
        toast.success(isBn ? 'বিভাগ পরিবর্তন করা হয়েছে' : 'Department updated');
        setTvDevices((prev) => prev.map((d) => (d.id === tv.id ? res.data! : d)));
      } else {
        toast.error(res.error || (isBn ? 'পরিবর্তন ব্যর্থ হয়েছে' : 'Failed to update department'));
      }
    });
  };

  // Handle TV Theme Change
  const handleChangeTvTheme = async (tv: TvDeviceRecord, theme: 'dark' | 'light') => {
    startTransition(async () => {
      const res = await updateTvDeviceAction(tv.id, { theme });
      if (res.success && res.data) {
        toast.success(isBn ? 'থিম পরিবর্তন করা হয়েছে' : 'Theme updated');
        setTvDevices((prev) => prev.map((d) => (d.id === tv.id ? res.data! : d)));
      } else {
        toast.error(res.error || (isBn ? 'থিম পরিবর্তন ব্যর্থ হয়েছে' : 'Failed to update theme'));
      }
    });
  };

  // Handle TV Language Change
  const handleChangeTvLanguage = async (tv: TvDeviceRecord, language: 'bn' | 'en') => {
    startTransition(async () => {
      const res = await updateTvDeviceAction(tv.id, { language });
      if (res.success && res.data) {
        toast.success(isBn ? 'ভাষা পরিবর্তন করা হয়েছে' : 'Language updated');
        setTvDevices((prev) => prev.map((d) => (d.id === tv.id ? res.data! : d)));
      } else {
        toast.error(res.error || (isBn ? 'ভাষা পরিবর্তন ব্যর্থ হয়েছে' : 'Failed to update language'));
      }
    });
  };

  // Handle Force Update TV
  const handleForceUpdateTv = async (tv: TvDeviceRecord, force: boolean = true) => {
    startTransition(async () => {
      const res = await forceUpdateTvDeviceAction(tv.id, force);
      if (res.success) {
        toast.success(
          force
            ? isBn
              ? `"${tv.deviceName}" স্ক্রিনে ফোর্স আপডেট নির্দেশ পাঠানো হয়েছে`
              : `Force update signal dispatched to "${tv.deviceName}"`
            : isBn
            ? 'ফোর্স আপডেট বাতিল করা হয়েছে'
            : 'Force update cancelled',
        );
        setTvDevices((prev) =>
          prev.map((item) => (item.id === tv.id ? { ...item, forceUpdate: force ? 1 : 0 } : item)),
        );
      } else {
        toast.error(res.error || (isBn ? 'ফোর্স আপডেট নির্দেশ ব্যর্থ' : 'Failed to send force update'));
      }
    });
  };

  // Handle Revoke TV
  const handleRevokeTv = async (tv: TvDeviceRecord) => {
    if (!confirm(isBn ? 'আপনি কি নিশ্চিতভাবে এই টিভি সংযোগ বাতিল করতে চান?' : 'Are you sure you want to revoke this TV screen?')) {
      return;
    }

    startTransition(async () => {
      const res = await revokeTvDeviceAction(tv.id);
      if (res.success) {
        toast.success(isBn ? 'টিভি সংযোগ বিচ্ছিন্ন করা হয়েছে' : 'TV device revoked');
        setTvDevices((prev) =>
          prev.map((d) => (d.id === tv.id ? { ...d, status: 'revoked', secretToken: null, isOnline: false } : d)),
        );
      } else {
        toast.error(res.error || (isBn ? 'বাতিল করা যায়নি' : 'Failed to revoke TV'));
      }
    });
  };

  // Handle Delete TV
  const handleDeleteTv = async (tv: TvDeviceRecord) => {
    if (!confirm(isBn ? 'আপনি কি স্থায়ীভাবে এই ডিভাইসটি মুছে ফেলতে চান?' : 'Permanently remove this TV display?')) {
      return;
    }

    startTransition(async () => {
      const res = await deleteTvDeviceAction(tv.id);
      if (res.success) {
        toast.success(isBn ? 'টিভি মুছে ফেলা হয়েছে' : 'TV device deleted');
        setTvDevices((prev) => prev.filter((d) => d.id !== tv.id));
      } else {
        toast.error(res.error || (isBn ? 'মুছে ফেলা যায়নি' : 'Failed to delete TV'));
      }
    });
  };

  // Handle Revoke Session
  const handleRevokeSession = async (session: UserSessionRecord) => {
    if (!confirm(isBn ? 'এই সেশনটি কি বাতিল করবেন?' : 'Revoke this login session?')) {
      return;
    }

    startTransition(async () => {
      const res = await revokeSessionAction(session.id);
      if (res.success) {
        toast.success(isBn ? 'সেশন সফলভাবে বাতিল করা হয়েছে' : 'Session revoked');
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
      } else {
        toast.error(res.error || (isBn ? 'বাতিল করা যায়নি' : 'Failed to revoke session'));
      }
    });
  };

  return (
    <div className="space-y-6 w-full max-w-[1720px] mx-auto pb-12">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {isBn ? 'ব্যবহারকারী ও ডিভাইস ব্যবস্থাপনা' : 'Users & Device Management'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isBn
                  ? 'ব্যবহারকারী অ্যাকাউন্ট, ৫টি অনুমোদিত রোল, স্মার্ট টিভি স্ক্রিন পেয়ারিং ও সক্রিয় সেশন নিয়ন্ত্রণ।'
                  : 'Manage user accounts across the 5 permitted roles, pair Android TV screens, and monitor sessions.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading || isPending}
            className="h-9 px-3 rounded-xl border-border/80 hover:border-emerald-500/40 text-xs font-semibold gap-1.5 cursor-pointer touch-manipulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>

          {activeSubTab === 'users' && (
            <Button
              size="sm"
              onClick={() => setIsCreateUserOpen(true)}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-xs cursor-pointer touch-manipulation active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন ব্যবহারকারী' : 'Add New User'}</span>
            </Button>
          )}

          {activeSubTab === 'tvs' && (
            <Button
              size="sm"
              onClick={() => setIsPairTvOpen(true)}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-xs cursor-pointer touch-manipulation active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন টিভি সংযুক্ত করুন' : 'Pair New TV'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Workstation Sub-Tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="w-full space-y-5">
        <TabsList className="h-auto p-1.5 bg-muted/50 border border-border/60 rounded-xl flex flex-wrap items-center gap-1.5 w-full">
          <TabsTrigger
            value="users"
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all cursor-pointer touch-manipulation"
          >
            <Users className="w-4 h-4" />
            <span>{isBn ? 'ব্যবহারকারী তালিকা' : 'User Accounts'}</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
              {users.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="approvals"
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-xs transition-all cursor-pointer touch-manipulation"
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{isBn ? 'অপেক্ষমাণ অনুমোদন' : 'Pending Approvals'}</span>
            {pendingUsers.length > 0 ? (
              <Badge className="ml-1 text-[11px] px-1.5 py-0 h-5 bg-amber-500 text-black font-bold animate-pulse">
                {pendingUsers.length}
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
                0
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="tvs"
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all cursor-pointer touch-manipulation"
          >
            <Tv className="w-4 h-4" />
            <span>{isBn ? 'টিভি ও ডিসপ্লে স্ক্রিন পেয়ারিং' : 'TV & Display Screens'}</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
              {tvDevices.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="sessions"
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all cursor-pointer touch-manipulation"
          >
            <MonitorSmartphone className="w-4 h-4" />
            <span>{isBn ? 'সক্রিয় লগইন সেশন' : 'Active Login Sessions'}</span>
            <Badge variant="secondary" className="ml-1 text-[11px] px-1.5 py-0 h-5">
              {sessions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* SUB-TAB 1: USERS MANAGEMENT */}
        {/* ========================================================================= */}
        <TabsContent value="users" className="space-y-5 focus-visible:outline-none">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(['admin', 'doctor', 'handler', 'cashier', 'receptionist'] as PermittedRole[]).map((r) => {
              const cfg = ROLE_CONFIG[r];
              const Icon = cfg.icon;
              const count = users.filter((u) => u.role === r).length;
              return (
                <Card key={r} className="p-3 sm:p-4 rounded-xl border border-border/80 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {isBn ? cfg.labelBn : cfg.labelEn}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-foreground">{count}</span>
                    <span className="text-[11px] text-muted-foreground">{isBn ? 'সদস্য' : 'users'}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Search & Filter Toolbar */}
          <Card className="p-3 sm:p-4 rounded-xl border border-border/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={
                    isBn
                      ? 'নাম, ইমেইল অথবা ফোন নম্বর দিয়ে খুঁজুন...'
                      : 'Search users by name, email, or phone number...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-background border-border/80 text-xs sm:text-sm"
                />
              </div>

              <div className="w-full sm:w-56 shrink-0">
                <Select value={roleFilter} onValueChange={(val: string) => setRoleFilter(val)}>
                  <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl bg-background border-border/80">
                    <SelectValue placeholder={isBn ? 'পদবী ফিল্টার' : 'Filter by role'} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                    <SelectItem value="all">{isBn ? 'সকল পদবী (All Roles)' : 'All Roles'}</SelectItem>
                    <SelectItem value="admin">Admin · এডমিন</SelectItem>
                    <SelectItem value="doctor">Doctor · ডাক্তার</SelectItem>
                    <SelectItem value="handler">Handler · হ্যান্ডলার</SelectItem>
                    <SelectItem value="cashier">Cashier · ক্যাশিয়ার</SelectItem>
                    <SelectItem value="receptionist">Receptionist · রিসেপশনিস্ট</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Users Table / Grid */}
          <Card className="rounded-xl border border-border/80 overflow-hidden shadow-2xs">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold">{isBn ? 'কোনো ব্যবহারকারী পাওয়া যায়নি' : 'No users found'}</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {isBn ? 'আপনার সার্চ বা ফিল্টার পরিবর্তন করুন' : 'Try adjusting your search query or filter'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/80">
                      <TableHead className="w-[280px]">{isBn ? 'ব্যবহারকারী' : 'User'}</TableHead>
                      <TableHead>{isBn ? 'পদবী (Role)' : 'Role'}</TableHead>
                      <TableHead>{isBn ? 'ফোন / হোয়াটসঅ্যাপ' : 'Phone / WhatsApp'}</TableHead>
                      <TableHead>{isBn ? 'অনুমোদন' : 'Approval'}</TableHead>
                      <TableHead>{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                      <TableHead className="text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => {
                      const cfg = ROLE_CONFIG[u.role as PermittedRole] || ROLE_CONFIG.receptionist;
                      const Icon = cfg.icon;
                      const isActive = u.isActive === 1;
                      const isPendingApprove = u.isApproved === 0 || u.approvalStatus === 'pending';
                      const isRejectedApprove = u.approvalStatus === 'rejected';

                      return (
                        <TableRow key={u.id} className="hover:bg-muted/40 border-border/60">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
                                {u.displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-foreground truncate">{u.displayName}</div>
                                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-bold px-2 py-0.5 gap-1 border ${cfg.color}`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{isBn ? cfg.labelBn : cfg.labelEn}</span>
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {u.phone ? (
                              <span className="text-xs font-mono font-semibold text-foreground">{u.phone}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {isPendingApprove ? (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-bold px-2 py-0.5 gap-1 border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                              >
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>{isBn ? 'অপেক্ষমাণ' : 'Pending'}</span>
                              </Badge>
                            ) : isRejectedApprove ? (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-bold px-2 py-0.5 gap-1 border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                title={u.rejectionReason || ''}
                              >
                                <XCircle className="w-3 h-3 text-rose-500" />
                                <span>{isBn ? 'প্রত্যাখ্যাত' : 'Rejected'}</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-bold px-2 py-0.5 gap-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>{isBn ? 'অনুমোদিত' : 'Approved'}</span>
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isActive}
                                onCheckedChange={() => handleToggleActive(u)}
                                disabled={isPending}
                                className="cursor-pointer"
                              />
                              <span
                                className={`text-xs font-semibold ${
                                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                                }`}
                              >
                                {isActive ? (isBn ? 'সক্রিয়' : 'Active') : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isPendingApprove && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => handleApproveUser(u)}
                                  className="h-8 px-2.5 rounded-lg border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold gap-1 cursor-pointer"
                                  title={isBn ? 'অ্যাকাউন্ট অনুমোদন করুন' : 'Approve user account'}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{isBn ? 'অনুমোদন' : 'Approve'}</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(u)}
                                className="h-8 px-2.5 rounded-lg border-border/80 hover:border-emerald-500/40 text-xs font-semibold gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* SUB-TAB: PENDING APPROVALS */}
        {/* ========================================================================= */}
        <TabsContent value="approvals" className="space-y-5 focus-visible:outline-none">
          {/* Header Description */}
          <Card className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {isBn ? 'নতুন ব্যবহারকারী অনুমোদন নিয়ন্ত্রণ' : 'Pending User Approvals Control'}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                  {isBn
                    ? 'যেকোনো নতুন ব্যবহারকারী নিবন্ধন বা তৈরি হলে তা প্রথমে অ্যাডমিন অনুমোদনের অপেক্ষায় থাকবে। আপনি অনুমোদন প্রদান না করা পর্যন্ত সংশ্লিষ্ট ব্যক্তি কোনো ওয়ার্কস্টেশনে লগইন করতে পারবে না।'
                    : 'Whenever new users register or are created, their accounts remain in pending state. Users cannot log into workstations until approved by an administrator here.'}
                </p>
              </div>

              <Badge
                variant="outline"
                className="text-xs px-3 py-1 font-bold border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {isBn ? `${pendingUsers.length} টি অপেক্ষমাণ` : `${pendingUsers.length} Pending`}
                </span>
              </Badge>
            </div>
          </Card>

          {/* Pending Users Grid */}
          {pendingUsers.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border border-border/80 bg-card/60">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/60 mb-3" />
              <p className="text-base font-bold text-foreground">
                {isBn ? 'কোনো অপেক্ষমাণ অনুমোদন নেই' : 'No Pending Approvals'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {isBn
                  ? 'সকল ব্যবহারকারী সফলভাবে অনুমোদিত। নতুন কোনো ব্যবহারকারী নিবন্ধন করলে এই তালিকায় দেখা যাবে।'
                  : 'All user accounts have been processed. Any new registration will appear here for your review.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pendingUsers.map((u) => {
                const cfg = ROLE_CONFIG[u.role as PermittedRole] || ROLE_CONFIG.receptionist;
                const Icon = cfg.icon;

                return (
                  <Card
                    key={u.id}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-amber-500/30 bg-card/80 backdrop-blur-md shadow-md hover:border-amber-500/50 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-600 dark:text-amber-400 text-sm shrink-0">
                            {u.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">{u.displayName}</h4>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold px-2 py-0.5 gap-1 shrink-0 border ${cfg.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{isBn ? cfg.labelBn : cfg.labelEn}</span>
                        </Badge>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                        {u.phone && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>{isBn ? 'ফোন / হোয়াটসঅ্যাপ:' : 'Phone:'}</span>
                            <span className="font-mono font-bold text-foreground">{u.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>{isBn ? 'নিবন্ধনের সময়:' : 'Registered At:'}</span>
                          <span className="font-medium text-foreground">
                            {new Date(u.createdAt).toLocaleString(isBn ? 'bn-BD' : 'en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleOpenReject(u)}
                        variant="outline"
                        className="h-9 rounded-xl border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60 font-bold text-xs gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>{isBn ? 'প্রত্যাখ্যান' : 'Reject'}</span>
                      </Button>

                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleApproveUser(u)}
                        className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isBn ? 'অনুমোদন করুন' : 'Approve'}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* SUB-TAB 2: TV & DISPLAY DEVICES */}
        {/* ========================================================================= */}
        <TabsContent value="tvs" className="space-y-5 focus-visible:outline-none">
          {/* Pairing Instructions Banner */}
          <Card className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {isBn
                      ? 'অ্যান্ড্রয়েড টিভি ও ওয়েটিং রুম ডিসপ্লে পেয়ারিং'
                      : 'Android TV & Waiting Room Display Pairing'}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                  {isBn
                    ? 'যেকোনো অ্যান্ড্রয়েড টিভিতে HPC TV অ্যাপটি ইনস্টল করে ওপেন করলে স্ক্রিনে একটি ৪-সংখ্যার পেয়ারিং কোড (যেমন: HPC-7824) দেখাবে। "নতুন টিভি সংযুক্ত করুন" বাটনে ক্লিক করে কোডটি দিলেই সাথে সাথে টিভিটি লাইভ কিউ ডিসপ্লে শুরু করবে।'
                    : 'When the HPC TV Android app is launched on any waiting room TV, an activation screen displays a pairing code (e.g. HPC-7824). Click "Pair New TV" and submit the code to activate the live queue stream instantly.'}
                </p>
              </div>

              <Button
                onClick={() => setIsPairTvOpen(true)}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shrink-0 shadow-xs cursor-pointer touch-manipulation active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>{isBn ? 'নতুন টিভি সংযুক্ত করুন' : 'Pair New TV'}</span>
              </Button>
            </div>
          </Card>

          {/* TV Device Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tvDevices.length === 0 ? (
              <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-xl border border-border/80">
                <Tv className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold">{isBn ? 'কোনো টিভি স্ক্রিন সংযুক্ত নেই' : 'No TV screens paired'}</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {isBn
                    ? 'টিভি অ্যাপে প্রদর্শিত পেয়ারিং কোডটি দিয়ে নতুন স্ক্রিন যুক্ত করুন'
                    : 'Use the pairing code from your TV screen to pair your first display'}
                </p>
              </div>
            ) : (
              tvDevices.map((tv) => {
                const isPaired = tv.status === 'paired';
                const isOnline = Boolean(tv.isOnline);

                return (
                  <Card
                    key={tv.id}
                    className="p-4 sm:p-5 rounded-2xl border border-border/80 shadow-2xs hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Top Bar: Online status & Department */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isOnline && isPaired
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                                : tv.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-zinc-500'
                            }`}
                          />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isOnline && isPaired
                              ? isBn
                                ? 'অনলাইন'
                                : 'Online'
                              : tv.status === 'pending'
                              ? isBn
                                ? 'অপেক্ষমাণ'
                                : 'Pending'
                              : isBn
                              ? 'অফলাইন'
                              : 'Offline'}
                          </span>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono font-bold px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        >
                          {tv.pairingCode}
                        </Badge>
                      </div>

                      {/* Device Title & Location */}
                      <div className="mt-3">
                        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                          <Tv className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="truncate">{tv.deviceName}</span>
                        </h4>

                        {tv.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{tv.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Meta Information Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/60">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="font-semibold">{isBn ? 'বিভাগ:' : 'Dept:'}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-bold">
                            {tv.department}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="font-semibold">{isBn ? 'থিম:' : 'Theme:'}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-bold">
                            {tv.theme === 'light' ? '☀️ Light' : '🌙 Dark'}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <span className="font-semibold">{isBn ? 'ভাষা:' : 'Lang:'}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-bold">
                            {tv.language === 'en' ? '🇬🇧 English' : '🇧🇩 বাংলা'}
                          </Badge>
                        </div>

                        {tv.appVersion ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                              v{tv.appVersion}
                            </Badge>
                            {tv.appVersion !== '0.1.9' && (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0 h-4 font-semibold">
                                {isBn ? 'আপডেট আবশ্যক' : 'Outdated'}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono text-muted-foreground">
                            v0.1.0
                          </Badge>
                        )}

                        {tv.ipAddress && (
                          <span className="text-[10px] font-mono text-muted-foreground">IP: {tv.ipAddress}</span>
                        )}
                      </div>
                    </div>

                    {/* Remote Display Controls */}
                    <div className="pt-3 border-t border-border/60 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Department Selector */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            {isBn ? 'কিউ বিভাগ' : 'Department'}
                          </span>
                          <Select
                            value={tv.department}
                            onValueChange={(val: 'ALL' | 'CONSULTATION' | 'THERAPY') =>
                              handleChangeTvDepartment(tv, val)
                            }
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold rounded-lg bg-background/60 border-border/80 hover:border-emerald-500/50">
                              <SelectValue placeholder={isBn ? 'বিভাগ' : 'Dept'} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                              <SelectItem value="ALL">{isBn ? 'উভয় কিউ' : 'Both Queues'}</SelectItem>
                              <SelectItem value="CONSULTATION">{isBn ? 'ডাক্তার কিউ' : 'Consultation'}</SelectItem>
                              <SelectItem value="THERAPY">{isBn ? 'থেরাপি কিউ' : 'Therapy'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Theme Selector */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            {isBn ? 'ডিসপ্লে থিম' : 'Display Theme'}
                          </span>
                          <Select
                            value={tv.theme || 'dark'}
                            onValueChange={(val: 'dark' | 'light') =>
                              handleChangeTvTheme(tv, val)
                            }
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold rounded-lg bg-background/60 border-border/80 hover:border-emerald-500/50">
                              <SelectValue placeholder={isBn ? 'থিম' : 'Theme'} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                              <SelectItem value="dark">🌙 {isBn ? 'ডার্ক থিম' : 'Dark Theme'}</SelectItem>
                              <SelectItem value="light">☀️ {isBn ? 'লাইট থিম' : 'Light Theme'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Language Selector */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            {isBn ? 'ডিসপ্লে ভাষা' : 'Display Language'}
                          </span>
                          <Select
                            value={tv.language || 'bn'}
                            onValueChange={(val: 'bn' | 'en') =>
                              handleChangeTvLanguage(tv, val)
                            }
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold rounded-lg bg-background/60 border-border/80 hover:border-emerald-500/50">
                              <SelectValue placeholder={isBn ? 'ভাষা' : 'Language'} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                              <SelectItem value="bn">🇧🇩 {isBn ? 'বাংলা' : 'Bangla'}</SelectItem>
                              <SelectItem value="en">🇬🇧 {isBn ? 'English' : 'English'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                        {!isPaired && tv.status === 'pending' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDirectPairPendingTv(tv)}
                            disabled={isPending}
                            className="h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                            title={isBn ? 'এই স্ক্রিনটি পেয়ার ও সক্রিয় করুন' : 'Pair and activate this TV screen'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>{isBn ? 'পেয়ার করুন' : 'Pair Now'}</span>
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditTv(tv)}
                          disabled={isPending}
                          className="h-8 px-2.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                          title={isBn ? 'স্ক্রিনের নাম ও অবস্থান সম্পাদনা করুন' : 'Edit screen name and location'}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                        </Button>

                        {isPaired && (
                          <Button
                            variant={tv.forceUpdate === 1 ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleForceUpdateTv(tv, tv.forceUpdate !== 1)}
                            disabled={isPending}
                            className={`h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                              tv.forceUpdate === 1
                                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                                : 'text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
                            }`}
                            title={
                              isBn
                                ? 'এই টিভিতে তাৎক্ষণিক আপডেট বাধ্যতামূলক করুন'
                                : 'Force this TV to update immediately'
                            }
                          >
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            <span>
                              {tv.forceUpdate === 1
                                ? isBn
                                  ? 'ফোর্স আপডেট সক্রিয়'
                                  : 'Update Enforced'
                                : isBn
                                ? 'ফোর্স আপডেট'
                                : 'Force Update'}
                            </span>
                          </Button>
                        )}

                        {isPaired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeTv(tv)}
                            disabled={isPending}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                            title={isBn ? 'সংযোগ বিচ্ছিন্ন করুন' : 'Revoke pairing'}
                          >
                            {isBn ? 'আনপেয়ার' : 'Unpair'}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTv(tv)}
                          disabled={isPending}
                          className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          title={isBn ? 'মুছে ফেলুন' : 'Delete device'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* SUB-TAB 3: ACTIVE LOGIN SESSIONS */}
        {/* ========================================================================= */}
        <TabsContent value="sessions" className="space-y-5 focus-visible:outline-none">
          <Card className="rounded-xl border border-border/80 overflow-hidden shadow-2xs">
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <MonitorSmartphone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold">{isBn ? 'কোনো সক্রিয় সেশন নেই' : 'No active login sessions'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/80">
                      <TableHead>{isBn ? 'ব্যবহারকারী' : 'User'}</TableHead>
                      <TableHead>{isBn ? 'ডিভাইস ও ব্রাউজার' : 'Device & Client'}</TableHead>
                      <TableHead>{isBn ? 'আইপি অ্যাড্রেস' : 'IP Address'}</TableHead>
                      <TableHead>{isBn ? 'লগইন সময়' : 'Login Time'}</TableHead>
                      <TableHead className="text-right">{isBn ? 'অ্যাকশন' : 'Action'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/40 border-border/60">
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm font-bold text-foreground">{s.user.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {s.user.email} ·{' '}
                              <span className="font-semibold uppercase text-[10px] text-emerald-600 dark:text-emerald-400">
                                {s.user.role}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{s.deviceLabel || (isBn ? 'ওয়েব ওয়ার্কস্টেশন' : 'Web Workstation')}</span>
                          </div>
                          {s.userAgent && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">{s.userAgent}</div>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="text-xs font-mono font-semibold text-foreground">{s.ip || '—'}</span>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(s.createdAt).toLocaleString(isBn ? 'bn-BD' : 'en-US')}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeSession(s)}
                            disabled={isPending}
                            className="h-8 px-2.5 rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            <span>{isBn ? 'সেশন বাতিল' : 'Revoke'}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE USER */}
      {/* ========================================================================= */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <form onSubmit={handleCreateUser} autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isBn ? 'নতুন ব্যবহারকারী তৈরি করুন' : 'Create New User Account'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn
                  ? 'সিস্টেমের অনুমোদিত ৫টি রোলের যে কোনো একটিতে নতুন অ্যাকাউন্ট তৈরি করুন।'
                  : 'Assign credentials and strictly one of the 5 authorized clinic roles.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isBn ? 'পূর্ণ নাম' : 'Display Name'} *</Label>
                <Input
                  required
                  placeholder={isBn ? 'যেমন: ডা. বিশেষজ্ঞ' : 'e.g. Dr. Specialist'}
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isBn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'} *</Label>
                <Input
                  required
                  type="email"
                  placeholder="name@hpcjashore.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'অনুমোদিত পদবী (Role)' : 'Role'} *</Label>
                  <Select
                    value={createForm.role}
                    onValueChange={(val: PermittedRole) => setCreateForm({ ...createForm, role: val })}
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                      <SelectValue placeholder={isBn ? 'পদবী নির্বাচন' : 'Select role'} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="admin">Admin · এডমিন</SelectItem>
                      <SelectItem value="doctor">Doctor · ডাক্তার</SelectItem>
                      <SelectItem value="handler">Handler · হ্যান্ডলার</SelectItem>
                      <SelectItem value="cashier">Cashier · ক্যাশিয়ার</SelectItem>
                      <SelectItem value="receptionist">Receptionist · রিসেপশনিস্ট</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'ফোন / হোয়াটসঅ্যাপ' : 'Phone / WhatsApp'}</Label>
                  <Input
                    placeholder="017XXXXXXXX"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="rounded-xl h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isBn ? 'লগইন পাসওয়ার্ড' : 'Password'} *</Label>
                <div className="relative">
                  <Input
                    required
                    type={showCreatePassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="rounded-xl h-10 text-xs sm:text-sm pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground">{isBn ? 'কমপক্ষে ৮ অক্ষরের হতে হবে' : 'Minimum 8 characters required'}</span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateUserOpen(false)}
                className="rounded-xl h-9 text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {isPending ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Creating...') : isBn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER */}
      {/* ========================================================================= */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <form onSubmit={handleUpdateUser} autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isBn ? 'ব্যবহারকারীর তথ্য সম্পাদনা' : 'Edit User Account'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isBn ? 'পূর্ণ নাম' : 'Display Name'} *</Label>
                <Input
                  required
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'অনুমোদিত পদবী (Role)' : 'Role'} *</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(val: PermittedRole) => setEditForm({ ...editForm, role: val })}
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                      <SelectValue placeholder={isBn ? 'পদবী নির্বাচন' : 'Select role'} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="admin">Admin · এডমিন</SelectItem>
                      <SelectItem value="doctor">Doctor · ডাক্তার</SelectItem>
                      <SelectItem value="handler">Handler · হ্যান্ডলার</SelectItem>
                      <SelectItem value="cashier">Cashier · ক্যাশিয়ার</SelectItem>
                      <SelectItem value="receptionist">Receptionist · রিসেপশনিস্ট</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'ফোন / হোয়াটসঅ্যাপ' : 'Phone / WhatsApp'}</Label>
                  <Input
                    placeholder="017XXXXXXXX"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="rounded-xl h-10 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">{isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Active'}</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isBn ? 'নিষ্ক্রিয় করলে ব্যবহারকারী লগইন করতে পারবে না' : 'Disable to prevent this user from logging in'}
                  </p>
                </div>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(val) => setEditForm({ ...editForm, isActive: val })}
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <Label className="text-xs font-bold">
                  {isBn ? 'নতুন পাসওয়ার্ড (পরিবর্তন না করতে চাইলে খালি রাখুন)' : 'New Password (leave blank to keep unchanged)'}
                </Label>
                <div className="relative">
                  <Input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder={isBn ? 'পরিবর্তন না করতে চাইলে খালি রাখুন' : 'Leave blank if unchanged'}
                    minLength={8}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="rounded-xl h-10 text-xs sm:text-sm pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditUserOpen(false)}
                className="rounded-xl h-9 text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {isPending ? (isBn ? 'হালনাগাদ হচ্ছে...' : 'Saving...') : isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: PAIR NEW TV */}
      {/* ========================================================================= */}
      <Dialog open={isPairTvOpen} onOpenChange={setIsPairTvOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <form onSubmit={handlePairTv} autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Tv className="w-5 h-5 text-emerald-500" />
                <span>{isBn ? 'নতুন টিভি স্ক্রিন পেয়ার করুন' : 'Pair New TV Display Screen'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn
                  ? 'টিভির স্ক্রিনে প্রদর্শিত পেয়ারিং কোডটি এখানে লিখুন।'
                  : 'Enter the pairing code shown on your TV screen to pair and stream queues.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {isBn ? 'টিভি পেয়ারিং কোড (স্ক্রিন থেকে দেখুন)' : 'TV Pairing Code (shown on TV)'} *
                </Label>
                <Input
                  required
                  placeholder="e.g. HPC-7824"
                  value={pairForm.pairingCode}
                  onChange={(e) => setPairForm({ ...pairForm, pairingCode: e.target.value.toUpperCase() })}
                  className="rounded-xl h-12 text-center text-lg sm:text-xl font-mono font-black tracking-widest border-emerald-500/50 bg-emerald-500/5"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isBn ? 'ডিসপ্লে বা টিভির নাম' : 'Device Name'} *</Label>
                <Input
                  required
                  placeholder={isBn ? 'যেমন: মেইন ওয়েটিং লাউঞ্জ টিভি' : 'e.g. Main Waiting Lounge TV'}
                  value={pairForm.deviceName}
                  onChange={(e) => setPairForm({ ...pairForm, deviceName: e.target.value })}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'প্রদর্শিত কিউ বিভাগ' : 'Department Queue'}</Label>
                  <Select
                    value={pairForm.department}
                    onValueChange={(val: 'ALL' | 'CONSULTATION' | 'THERAPY') =>
                      setPairForm({ ...pairForm, department: val })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                      <SelectValue placeholder={isBn ? 'কিউ বিভাগ নির্বাচন করুন' : 'Select queue department'} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="ALL">{isBn ? 'উভয় কিউ (ডাক্তার + থেরাপি)' : 'Both (Doctor + Therapy)'}</SelectItem>
                      <SelectItem value="CONSULTATION">{isBn ? 'শুধুমাত্র ডাক্তার কিউ' : 'Doctor Consultation Only'}</SelectItem>
                      <SelectItem value="THERAPY">{isBn ? 'শুধুমাত্র থেরাপি কিউ' : 'Physiotherapy Only'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'অবস্থান / ফ্লোর' : 'Location / Room'}</Label>
                  <Input
                    placeholder={isBn ? 'যেমন: গ্রাউন্ড ফ্লোর ওয়েটিং হল' : 'e.g. Ground Floor Waiting Hall'}
                    value={pairForm.location}
                    onChange={(e) => setPairForm({ ...pairForm, location: e.target.value })}
                    className="rounded-xl h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'ডিসপ্লে থিম' : 'Display Theme'}</Label>
                  <Select
                    value={pairForm.theme}
                    onValueChange={(val: 'dark' | 'light') =>
                      setPairForm({ ...pairForm, theme: val })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                      <SelectValue placeholder={isBn ? 'থিম নির্বাচন করুন' : 'Select Theme'} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="dark">🌙 {isBn ? 'ডার্ক থিম (Dark)' : 'Dark Theme'}</SelectItem>
                      <SelectItem value="light">☀️ {isBn ? 'লাইট থিম (Light)' : 'Light Theme'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'ডিসপ্লে ভাষা' : 'Display Language'}</Label>
                  <Select
                    value={pairForm.language}
                    onValueChange={(val: 'bn' | 'en') =>
                      setPairForm({ ...pairForm, language: val })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl">
                      <SelectValue placeholder={isBn ? 'ভাষা নির্বাচন করুন' : 'Select Language'} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="bn">🇧🇩 {isBn ? 'বাংলা (Bangla)' : 'Bangla'}</SelectItem>
                      <SelectItem value="en">🇬🇧 {isBn ? 'ইংরেজি (English)' : 'English'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPairTvOpen(false)}
                className="rounded-xl h-9 text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {isPending ? (isBn ? 'পেয়ারিং হচ্ছে...' : 'Pairing...') : isBn ? 'টিভি সংযোগ করুন' : 'Pair & Activate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT TV SCREEN (NAME & LOCATION) */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(editingTv)} onOpenChange={(open) => !open && setEditingTv(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl">
          <form onSubmit={handleSaveEditTv} autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Tv className="w-5 h-5 text-emerald-500" />
                <span>{isBn ? 'টিভি স্ক্রিন তথ্য সম্পাদনা' : 'Edit TV Screen Details'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn
                  ? `স্ক্রিনের নাম ও অবস্থান পরিবর্তন করুন (পেয়ারিং কোড: ${editingTv?.pairingCode})`
                  : `Update display name and physical location (Pairing Code: ${editingTv?.pairingCode})`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  {isBn ? 'পেয়ারিং কোড' : 'Pairing Code'}
                </Label>
                <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border/60 font-mono font-bold text-sm text-foreground">
                  {editingTv?.pairingCode}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isBn ? 'ডিসপ্লে বা টিভির নাম' : 'Device Name'} *</Label>
                <Input
                  required
                  placeholder={isBn ? 'যেমন: মেইন ওয়েটিং লাউঞ্জ টিভি' : 'e.g. Main Waiting Lounge TV'}
                  value={editTvForm.deviceName}
                  onChange={(e) => setEditTvForm({ ...editTvForm, deviceName: e.target.value })}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{isBn ? 'শারীরিক অবস্থান / রুম' : 'Physical Location / Room'}</Label>
                <Input
                  placeholder={isBn ? 'যেমন: নিচতলা ওয়েটিং হল / রুম ১০১ এর সামনে' : 'e.g. Ground Floor Waiting Hall / Near Room 101'}
                  value={editTvForm.location}
                  onChange={(e) => setEditTvForm({ ...editTvForm, location: e.target.value })}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'কিউ বিভাগ' : 'Department'}</Label>
                  <Select
                    value={editTvForm.department}
                    onValueChange={(val: 'ALL' | 'CONSULTATION' | 'THERAPY') =>
                      setEditTvForm({ ...editTvForm, department: val })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="ALL">{isBn ? 'উভয় কিউ' : 'Both'}</SelectItem>
                      <SelectItem value="CONSULTATION">{isBn ? 'ডাক্তার' : 'Doctor'}</SelectItem>
                      <SelectItem value="THERAPY">{isBn ? 'থেরাপি' : 'Therapy'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'থিম' : 'Theme'}</Label>
                  <Select
                    value={editTvForm.theme}
                    onValueChange={(val: 'dark' | 'light') =>
                      setEditTvForm({ ...editTvForm, theme: val })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="dark">🌙 Dark</SelectItem>
                      <SelectItem value="light">☀️ Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{isBn ? 'ভাষা' : 'Language'}</Label>
                  <Select
                    value={editTvForm.language}
                    onValueChange={(val: 'bn' | 'en') =>
                      setEditTvForm({ ...editTvForm, language: val })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover/95 backdrop-blur-md border-border/80 shadow-xl">
                      <SelectItem value="bn">🇧🇩 বাংলা</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTv(null)}
                className="rounded-xl h-9 text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                {isPending ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject User Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500 font-bold">
              <UserX className="w-5 h-5" />
              <span>{isBn ? 'ব্যবহারকারীর রেজিস্ট্রেশন প্রত্যাখ্যান' : 'Reject User Registration'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isBn
                ? `আপনি কি নিশ্চিতভাবে "${rejectingUser?.displayName}" (${rejectingUser?.email})-এর অ্যাকাউন্ট আবেদন প্রত্যাখ্যান করতে চান?`
                : `Are you sure you want to reject the registration for "${rejectingUser?.displayName}" (${rejectingUser?.email})?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Label className="text-xs font-semibold">
              {isBn ? 'প্রত্যাখ্যানের কারণ (ঐচ্ছিক)' : 'Rejection Reason (Optional)'}
            </Label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={
                isBn
                  ? 'যেমন: অননুমোদিত ব্যক্তি / তথ্যের অমিল'
                  : 'e.g. Unverified identity / Not authorized'
              }
              className="h-10 text-xs sm:text-sm rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              className="rounded-xl h-9 text-xs"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleConfirmReject}
              className="rounded-xl h-9 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5 cursor-pointer touch-manipulation active:scale-95"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>
                {isPending
                  ? isBn
                    ? 'প্রত্যাখ্যান হচ্ছে...'
                    : 'Rejecting...'
                  : isBn
                  ? 'প্রত্যাখ্যান নিশ্চিত করুন'
                  : 'Confirm Rejection'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
