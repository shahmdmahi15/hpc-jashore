// apps/web/components/AdminDashboardView.tsx
'use client';

import React, { useEffect, useState } from 'react';
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
  Users,
  Zap,
  Phone,
  Mail,
  UserPlus,
  Tv,
  ArrowUpRight,
  Filter,
  PhoneCall,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb';
import Link from 'next/link';
import { cn } from '../lib/utils';
import { AuditLogsTab } from './admin/AuditLogsTab';
import { TherapyQueueManagementTab } from './therapy/TherapyQueueManagementTab';
import { ReportsManagementTab } from './admin/ReportsManagementTab';

export interface AdminDashboardViewProps {
  session?: UserSession | null;
  initialTab?: 'overview' | 'reports' | 'audit_logs' | 'therapy_queue';
}

export default function AdminDashboardView({ session: propSession, initialTab = 'overview' }: AdminDashboardViewProps = {}) {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  const [session, setSession] = useState<UserSession | null>(propSession || null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'audit_logs' | 'therapy_queue'>(initialTab);

  useEffect(() => {
    if (!session) {
      setSession(getSession());
    }
  }, [session]);

  const [summary, setSummary] = useState<any>(null);
  const [modalities, setModalities] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, modRes, docRes] = await Promise.allSettled([
        api.reports.getTodaySummary(),
        api.reports.getModalityStats(),
        api.reports.getDoctorStats(),
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
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard navigation for TV / Power-Users (R: Refresh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'r' || e.key === 'R') loadData();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
              ? 'ক্লিনিক্যাল সামগ্রিক তথ্য, রাজস্ব আয়, থেরাপি বেড মেট্রিক্স ও রিয়েলটাইম অপারেশন।'
              : 'Executive clinical KPIs, daily revenue collections, bed occupancy & live operations.'}
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

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('reports')}
            className="rounded-xl gap-1.5 text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>{isBn ? 'রিপোর্ট হাব' : 'Reports Hub'}</span>
          </Button>
        </div>
      </div>

      {/* Top Tab Switcher: Overview vs Reports vs System Audit Logs vs Therapy Queue */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-muted/60 border border-border/50 rounded-2xl w-full sm:w-auto self-start overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'overview'
              ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart3 className="size-4 shrink-0" />
          <span>{isBn ? '📊 ওভারভিউ ও দৈনিক অডিট' : '📊 Overview & Daily KPIs'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'reports'
              ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileSpreadsheet className="size-4 shrink-0" />
          <span>{isBn ? '📈 পূর্ণাঙ্গ ক্লিনিক্যাল রিপোর্ট' : '📈 Comprehensive Reports'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit_logs')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'audit_logs'
              ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ShieldCheck className="size-4 shrink-0" />
          <span>{isBn ? '🛡️ সিস্টেম অডিট লগ' : '🛡️ System Audit Logs'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('therapy_queue')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'therapy_queue'
              ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <PhoneCall className="size-4 shrink-0" />
          <span>{isBn ? '🚪 থেরাপি কিউ' : '🚪 Therapy Queue'}</span>
        </button>
      </div>

      {/* Content Rendering based on Active Dashboard Tab */}
      {activeTab === 'reports' ? (
        <ReportsManagementTab />
      ) : activeTab === 'audit_logs' ? (
        <AuditLogsTab />
      ) : activeTab === 'therapy_queue' ? (
        <TherapyQueueManagementTab />
      ) : (
        <>
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
                  <span>{isBn ? 'সক্রিয়' : 'Active (Live)'}</span>
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
        </>
      )}
    </div>
  );
}
