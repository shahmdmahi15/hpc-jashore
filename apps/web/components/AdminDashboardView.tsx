// apps/web/components/AdminDashboardView.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api, UserSession, getSession } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { toast } from 'sonner';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  Layers,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
  Phone,
  Mail,
  UserPlus,
  Tv,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb';
import Link from 'next/link';

export interface AdminDashboardViewProps {
  session?: UserSession | null;
}

export default function AdminDashboardView({ session: propSession }: AdminDashboardViewProps = {}) {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  const [session, setSession] = useState<UserSession | null>(propSession || null);

  useEffect(() => {
    if (!session) {
      setSession(getSession());
    }
  }, [session]);

  const [activeTab, setActiveTab] = useState<'overview' | 'staffs'>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [modalities, setModalities] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Staff Search & Filter State
  const [staffSearch, setStaffSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Attendance Punch State
  const [punchStaffId, setPunchStaffId] = useState('');
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [punchPin, setPunchPin] = useState('2468');
  const [punching, setPunching] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, modRes, docRes, staffRes] = await Promise.allSettled([
        api.reports.getTodaySummary(),
        api.reports.getModalityStats(),
        api.reports.getDoctorStats(),
        api.staff.list(),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setSummary(sumRes.value);
      } else {
        setSummary({
          footfall: 0,
          grossCollectionsPaisa: 0,
          bedOccupancyPercent: 0,
          totalDuesPaisa: 0,
        });
      }

      if (modRes.status === 'fulfilled' && Array.isArray(modRes.value)) {
        setModalities(modRes.value);
      } else {
        setModalities([]);
      }

      if (docRes.status === 'fulfilled' && Array.isArray(docRes.value)) {
        setDoctors(docRes.value);
      } else {
        setDoctors([]);
      }

      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        setStaffList(staffRes.value);
        if (staffRes.value.length > 0 && !punchStaffId) {
          setPunchStaffId(staffRes.value[0].id);
        }
      } else {
        setStaffList([]);
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard navigation for TV / Power-Users (1: Overview, 2: Staffs, R: Refresh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') setActiveTab('overview');
      if (e.key === '2') setActiveTab('staffs');
      if (e.key === 'r' || e.key === 'R') loadData();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePunchAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchStaffId) {
      toast.error(isBn ? 'অনুগ্রহ করে কর্মী নির্বাচন করুন' : 'Please select a staff member');
      return;
    }
    setPunching(true);
    try {
      await api.staff.punch({
        staffId: punchStaffId,
        punchType,
        deskId: 'reception-1',
        pin: punchPin,
      });
      toast.success(
        isBn
          ? `উপস্থিতি (${punchType.toUpperCase()}) সফলভাবে রেকর্ড হয়েছে!`
          : `Staff punch ${punchType.toUpperCase()} recorded successfully!`,
      );
    } catch (err: any) {
      toast.error(err.message || 'Attendance punch error');
    } finally {
      setPunching(false);
    }
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        !staffSearch.trim() ||
        s.fullName?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.phone?.includes(staffSearch) ||
        s.role?.toLowerCase().includes(staffSearch.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [staffList, staffSearch, roleFilter]);

  // Role distribution counts
  const roleCounts = useMemo(() => {
    const counts = {
      head_doctor: 0,
      doctor: 0,
      therapist: 0,
      reception: 0,
      cashier: 0,
      admin: 0,
    };
    staffList.forEach((s) => {
      if (s.role in counts) {
        counts[s.role as keyof typeof counts]++;
      }
    });
    return counts;
  }, [staffList]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'head_doctor':
        return <Badge variant="emerald" className="font-semibold">{isBn ? 'প্রধান চিকিৎসক' : 'Head Doctor'}</Badge>;
      case 'doctor':
        return <Badge variant="default" className="bg-blue-600 text-white font-semibold">{isBn ? 'ফিজিওথেরাপি চিকিৎসক' : 'Physio Doctor'}</Badge>;
      case 'therapist':
        return <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold">{isBn ? 'থেরাপিস্ট' : 'Therapist'}</Badge>;
      case 'reception':
        return <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 font-semibold">{isBn ? 'রিসেপশনিস্ট' : 'Receptionist'}</Badge>;
      case 'cashier':
        return <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">{isBn ? 'ক্যাশিয়ার' : 'Cashier'}</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 font-semibold">{isBn ? 'অ্যাডমিন' : 'Admin'}</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-full overflow-x-hidden pb-10">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <Breadcrumb className="mb-1.5">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">{isBn ? 'হোম' : 'Home'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{isBn ? 'অ্যাডমিন ওয়ার্কস্টেশন' : 'Admin Hub'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {isBn ? 'এইচপিসি যশোর — প্রশাসনিক ড্যাশবোর্ড' : 'HPC Jashore — Admin Dashboard'}
            </h1>
            <Badge variant="emerald" className="hidden sm:inline-flex gap-1 text-[11px] font-bold">
              <ShieldCheck className="size-3" />
              Live
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isBn
              ? 'ক্লিনিক্যাল সামগ্রিক তথ্য, রাজস্ব আয়, থেরাপি বেড মেট্রিক্স ও কর্মী ব্যবস্থাপনা।'
              : 'Executive clinical KPIs, collections, bed management & staff operations.'}
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>

          <Link href="/tv" target="_blank">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs font-bold hidden md:inline-flex">
              <Tv className="size-3.5 text-emerald-500" />
              <span>{isBn ? 'টিভি কিউ ডিসপ্লে' : 'TV Queue'}</span>
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="rounded-xl gap-1.5 text-xs font-bold">
                <FileSpreadsheet className="size-3.5" />
                <span>{isBn ? 'রিপোর্ট' : 'Reports'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{isBn ? 'এক্সপোর্ট রিপোর্ট' : 'Export Reports'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
                <Printer className="size-3.5 text-emerald-500" />
                <span>{isBn ? 'প্রিন্ট সামারি' : 'Print Summary'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Exporting report...')} className="gap-2 cursor-pointer">
                <Download className="size-3.5 text-teal-500" />
                <span>{isBn ? 'CSV ডাউনলোড' : 'Download CSV'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Tabs: Overview and Staffs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'overview' | 'staffs')} className="w-full">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="h-11 sm:h-12 p-1 bg-muted/80 backdrop-blur-md rounded-2xl border border-border inline-flex w-full sm:w-auto min-w-[280px] justify-start gap-1">
            <TabsTrigger
              value="overview"
              className="flex-1 sm:flex-initial rounded-xl px-4 py-2 gap-2 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <BarChart3 className="size-4" />
              <span>{isBn ? 'সারসংক্ষেপ (Overview)' : 'Overview'}</span>
            </TabsTrigger>
            <TabsTrigger
              value="staffs"
              className="flex-1 sm:flex-initial rounded-xl px-4 py-2 gap-2 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all cursor-pointer"
            >
              <Users className="size-4" />
              <span>{isBn ? 'কর্মী ও হাজিরা (Staffs)' : 'Staffs'}</span>
              <span className="ml-1 text-2xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                {staffList.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW                                                           */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Executive Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Footfall */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {isBn ? 'আজকের মোট রোগী' : "Today's Footfall"}
                </CardTitle>
                <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Users className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-black text-foreground">
                  {typeof summary?.footfall === 'object' ? (summary?.footfall?.total ?? 0) : (summary?.footfall ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3 text-emerald-500" />
                  <span>{isBn ? 'রেজিস্টার্ড রোগী চেক-ইন' : 'Registered patient check-ins'}</span>
                </p>
              </CardContent>
            </Card>

            {/* 2. Gross Collections */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {isBn ? 'মোট আদায়' : 'Gross Collections'}
                </CardTitle>
                <div className="size-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                  <DollarSign className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  ৳{(((summary?.grossCollectionsPaisa ?? summary?.collections?.totalPaisa) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBn ? 'নগদ ও ডিজিটাল পেমেন্ট' : 'Cash & digital receipts'}
                </p>
              </CardContent>
            </Card>

            {/* 3. Bed Occupancy */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {isBn ? 'বেড ব্যবহারের হার' : 'Bed Occupancy'}
                </CardTitle>
                <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Zap className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-black text-amber-500">
                  {(summary?.bedOccupancyPercent ?? summary?.occupancy?.ratePercent) || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBn ? 'হল এ সক্রিয় ১৬টি বেড' : 'Hall A active therapy beds'}
                </p>
              </CardContent>
            </Card>

            {/* 4. Pending Dues */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {isBn ? 'বকেয়া পাওনা' : 'Pending Patient Dues'}
                </CardTitle>
                <div className="size-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <CreditCard className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-black text-red-500">
                  ৳{(((summary?.totalDuesPaisa ?? summary?.dues?.totalPendingDuesPaisa) || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBn ? 'পরিশোধের অপেক্ষায়' : 'Awaiting settlement'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Tables in Responsive 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Modality Utilization */}
            <Card className="rounded-2xl border-border shadow-2xs">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Activity className="size-4 text-emerald-500" />
                    <span>{isBn ? 'থেরাপি মোডালিটি ব্যবহারের বিবরণ' : 'Modality Utilization Breakdown'}</span>
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">{modalities.length} Types</Badge>
                </div>
                <CardDescription>
                  {isBn ? 'কোন মেশিনে কতটি সেশন ও রেভিনিউ তৈরি হয়েছে' : 'Delivered sessions & revenue generated per machine'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isBn ? 'মোডালিটি' : 'Modality'}</TableHead>
                      <TableHead className="text-center">{isBn ? 'সেশন সংখ্যা' : 'Sessions'}</TableHead>
                      <TableHead className="text-right">{isBn ? 'মোট আয়' : 'Revenue'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">
                          {isBn ? 'আজ এখনও কোনো মোডালিটি সেশন রেকর্ড হয়নি' : 'No modality sessions logged yet today'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      modalities.map((m) => (
                        <TableRow key={m.code}>
                          <TableCell className="font-semibold text-xs sm:text-sm">
                            {m.nameEn} <span className="text-muted-foreground font-mono font-normal">({m.code})</span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs sm:text-sm">
                            <Badge variant="secondary">{m.sessionCount} sessions</Badge>
                          </TableCell>
                          <TableCell className="text-right font-black font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                            ৳{((m.revenuePaisa || 0) / 100).toFixed(0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Doctor Chamber Consultations */}
            <Card className="rounded-2xl border-border shadow-2xs">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Stethoscope className="size-4 text-emerald-500" />
                    <span>{isBn ? 'ডাক্তার চেম্বার কনসালটেশন' : 'Doctor Consultations Summary'}</span>
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">{doctors.length} Doctors</Badge>
                </div>
                <CardDescription>
                  {isBn ? 'রোগী দেখার সংখ্যা ও প্রেসক্রিপশন রিপোর্ট' : 'Patient consultations seen and prescriptions issued'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isBn ? 'চিকিৎসক' : 'Doctor'}</TableHead>
                      <TableHead className="text-center">{isBn ? 'রোগী দেখেছেন' : 'Patients Seen'}</TableHead>
                      <TableHead className="text-right">{isBn ? 'প্রেসক্রিপশন' : 'Prescriptions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">
                          {isBn ? 'কোনো ডাক্তারের তথ্য পাওয়া যায়নি' : 'No doctor statistics available today'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      doctors.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-semibold text-xs sm:text-sm">
                            {d.name}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs sm:text-sm">
                            <Badge variant="outline">{d.patientsSeen}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs sm:text-sm text-foreground">
                            {d.prescriptionsCount}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Quick Clinic Highlights / System Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-border bg-muted/40 p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Clock className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{isBn ? 'ক্লিনিক সময়সূচী' : 'Clinic Hours'}</p>
                <p className="text-sm font-bold text-foreground">08:00 AM – 10:00 PM</p>
              </div>
            </Card>

            <Card className="rounded-2xl border-border bg-muted/40 p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{isBn ? 'রিয়েলটাইম কিউ সংযোগ' : 'Realtime Queue Stream'}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isBn ? 'সক্রিয় (SSE / Socket.IO)' : 'Active (SSE / Socket.IO)'}</span>
                </p>
              </div>
            </Card>

            <Card className="rounded-2xl border-border bg-muted/40 p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <Tv className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{isBn ? 'ওয়েটিং রুম টিভি' : 'Waiting Room TV'}</p>
                <Link href="/tv" target="_blank" className="text-sm font-bold text-foreground hover:text-emerald-500 flex items-center gap-1">
                  <span>/tv</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: STAFFS & ATTENDANCE                                                */}
        {/* ========================================================================= */}
        <TabsContent value="staffs" className="space-y-6 mt-4">
          {/* Staff Roles Distribution Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="rounded-2xl border-border bg-card p-3 shadow-2xs text-center">
              <p className="text-2xs font-semibold text-muted-foreground uppercase">{isBn ? 'মোট কর্মী' : 'Total Staff'}</p>
              <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{staffList.length}</p>
            </Card>
            <Card className="rounded-2xl border-border bg-card p-3 shadow-2xs text-center">
              <p className="text-2xs font-semibold text-muted-foreground uppercase">{isBn ? 'চিকিৎসক' : 'Doctors'}</p>
              <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {roleCounts.head_doctor + roleCounts.doctor}
              </p>
            </Card>
            <Card className="rounded-2xl border-border bg-card p-3 shadow-2xs text-center">
              <p className="text-2xs font-semibold text-muted-foreground uppercase">{isBn ? 'থেরাপিস্ট' : 'Therapists'}</p>
              <p className="text-xl sm:text-2xl font-black text-amber-500 mt-0.5">{roleCounts.therapist}</p>
            </Card>
            <Card className="rounded-2xl border-border bg-card p-3 shadow-2xs text-center">
              <p className="text-2xs font-semibold text-muted-foreground uppercase">{isBn ? 'রিসেপশনিস্ট' : 'Reception'}</p>
              <p className="text-xl sm:text-2xl font-black text-purple-500 mt-0.5">{roleCounts.reception}</p>
            </Card>
            <Card className="rounded-2xl border-border bg-card p-3 shadow-2xs text-center">
              <p className="text-2xs font-semibold text-muted-foreground uppercase">{isBn ? 'ক্যাশিয়ার' : 'Cashiers'}</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{roleCounts.cashier}</p>
            </Card>
            <Card className="rounded-2xl border-border bg-card p-3 shadow-2xs text-center">
              <p className="text-2xs font-semibold text-muted-foreground uppercase">{isBn ? 'অ্যাডমিন' : 'Admins'}</p>
              <p className="text-xl sm:text-2xl font-black text-rose-500 mt-0.5">{roleCounts.admin}</p>
            </Card>
          </div>

          {/* Time & Attendance Kiosk */}
          <Card className="rounded-2xl border-border shadow-2xs bg-card/95">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Clock className="size-4 text-emerald-500" />
                  <span>{isBn ? 'কর্মীদের হাজিরা ও সময় পর্যবেক্ষণ কিয়স্ক' : 'Staff Time & Attendance Kiosk'}</span>
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">PIN-Verified</Badge>
              </div>
              <CardDescription>
                {isBn
                  ? 'রিসেপশন, ফিজিওথেরাপিস্ট ও সহকারী কর্মীদের ইন/আউট পাঞ্চ যাচাইকরণ।'
                  : 'Fast PIN-verified attendance logging for receptionists, therapists, and clinic staff.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePunchAttendance} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                {/* 1. Staff Select */}
                <div className="space-y-1.5">
                  <Label htmlFor="staff-select">{isBn ? 'কর্মী নির্বাচন' : 'Staff Member'}</Label>
                  <Select
                    id="staff-select"
                    value={punchStaffId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPunchStaffId(e.target.value)}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.role})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* 2. Punch Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="punch-type">{isBn ? 'পাঞ্চের ধরন' : 'Punch Type'}</Label>
                  <Select
                    id="punch-type"
                    value={punchType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPunchType(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="in">{isBn ? '🟢 প্রবেশ (Punch IN)' : '🟢 Punch IN'}</option>
                    <option value="out">{isBn ? '🔴 প্রস্থান (Punch OUT)' : '🔴 Punch OUT'}</option>
                  </Select>
                </div>

                {/* 3. PIN Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="punch-pin">{isBn ? 'সিকিউরিটি পিন' : 'Staff PIN'}</Label>
                  <Input
                    id="punch-pin"
                    type="password"
                    maxLength={6}
                    value={punchPin}
                    onChange={(e) => setPunchPin(e.target.value)}
                    placeholder="2468"
                    required
                    className="h-11 font-mono tracking-widest text-center text-sm rounded-xl"
                  />
                </div>

                {/* 4. Submit Button */}
                <Button
                  type="submit"
                  disabled={punching}
                  className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm gap-2"
                >
                  <UserCheck className="size-4" />
                  <span>
                    {punching
                      ? (isBn ? 'রেকর্ড হচ্ছে...' : 'Recording...')
                      : (isBn ? 'পাঞ্চ সম্পন্ন করুন' : 'Submit Punch')}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Staff Roster / Directory */}
          <Card className="rounded-2xl border-border shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Users className="size-4 text-emerald-500" />
                    <span>{isBn ? 'ক্লিনিক কর্মী তালিকা ও রোস্টার' : 'Staff Directory & Duty Roster'}</span>
                  </CardTitle>
                  <CardDescription>
                    {isBn ? 'সকল কর্মকর্তা, চিকিৎসক ও সহকারীদের দায়িত্ব ও তথ্য' : 'Active clinic team members, assigned chambers & roles'}
                  </CardDescription>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={isBn ? 'কর্মী খুঁজুন...' : 'Search staff...'}
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="pl-8 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <Select
                    value={roleFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
                    className="h-9 text-xs rounded-xl w-full sm:w-36"
                  >
                    <option value="ALL">{isBn ? 'সকল পদবি' : 'All Roles'}</option>
                    <option value="head_doctor">{isBn ? 'প্রধান চিকিৎসক' : 'Head Doctor'}</option>
                    <option value="doctor">{isBn ? 'চিকিৎসক' : 'Doctor'}</option>
                    <option value="therapist">{isBn ? 'থেরাপিস্ট' : 'Therapist'}</option>
                    <option value="reception">{isBn ? 'রিসেপশন' : 'Reception'}</option>
                    <option value="cashier">{isBn ? 'ক্যাশিয়ার' : 'Cashier'}</option>
                    <option value="admin">{isBn ? 'অ্যাডমিন' : 'Admin'}</option>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isBn ? 'নাম ও পরিচিতি' : 'Staff Member'}</TableHead>
                      <TableHead>{isBn ? 'পদবি ও ভূমিকা' : 'Role & Specialization'}</TableHead>
                      <TableHead className="hidden md:table-cell">{isBn ? 'যোগাযোগ' : 'Contact'}</TableHead>
                      <TableHead className="text-center">{isBn ? 'ডেস্ক / চেম্বার' : 'Assigned Desk'}</TableHead>
                      <TableHead className="text-right">{isBn ? 'স্ট্যাটাস' : 'Duty Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                          {isBn ? 'কোনো কর্মী পাওয়া যায়নি' : 'No staff members found matching criteria'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((staff) => (
                        <TableRow key={staff.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-muted font-bold text-foreground flex items-center justify-center text-xs shrink-0 border border-border">
                                {staff.fullName?.slice(0, 2).toUpperCase() || 'ST'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                  {staff.fullName}
                                </p>
                                <p className="text-2xs text-muted-foreground font-mono truncate">
                                  ID: {staff.id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              {getRoleBadge(staff.role)}
                              {staff.specialization && (
                                <span className="text-2xs text-muted-foreground">{staff.specialization}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-xs space-y-0.5 text-muted-foreground">
                              {staff.email && (
                                <p className="flex items-center gap-1.5 truncate">
                                  <Mail className="size-3 text-muted-foreground shrink-0" />
                                  <span>{staff.email}</span>
                                </p>
                              )}
                              {staff.phone && (
                                <p className="flex items-center gap-1.5 font-mono truncate">
                                  <Phone className="size-3 text-muted-foreground shrink-0" />
                                  <span>{staff.phone}</span>
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            <Badge variant="outline" className="text-2xs">
                              {staff.defaultDeskId || staff.deskId || (isBn ? 'সাধারণ' : 'General')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{isBn ? 'সক্রিয়' : 'On Duty'}</span>
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
