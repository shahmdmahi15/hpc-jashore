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
  Coins,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  Layers,
  LogOut,
  Pill,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb';

// Integrated Specialized Workstation Views
import ReceptionView from './ReceptionView';
import DoctorChamberView from './DoctorChamberView';
import TherapyHallView from './TherapyHallView';
import CashierView from './CashierView';
import PharmacyView from './PharmacyView';

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

  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [summary, setSummary] = useState<any>(null);
  const [modalities, setModalities] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Attendance Punch State
  const [punchStaffId, setPunchStaffId] = useState('');
  const [punchType, setPunchType] = useState<'in' | 'out'>('in');
  const [punchPin, setPunchPin] = useState('2468');
  const [punching, setPunching] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sum, mod, doc, staff] = await Promise.all([
        api.reports.getTodaySummary(),
        api.reports.getModalityStats(),
        api.reports.getDoctorStats(),
        api.staff.list(),
      ]);
      setSummary(sum);
      setModalities(mod || []);
      setDoctors(doc || []);
      setStaffList(staff || []);

      if (staff && staff.length > 0 && !punchStaffId) {
        setPunchStaffId(staff[0].id);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(isBn ? 'তথ্য লোড করতে ত্রুটি হয়েছে' : 'Failed to load executive metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full max-w-full overflow-x-hidden">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <Breadcrumb className="mb-1.5">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">{isBn ? 'হোম' : 'Home'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{isBn ? 'অ্যাডমিন ওয়ার্কস্টেশন' : 'Admin Workstation'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {isBn ? 'এইচপিসি যশোর — প্রশাসনিক ও ক্লিনিক্যাল হাব' : 'HPC Jashore — Unified Admin & Clinical Hub'}
            </h1>
            <Badge variant="emerald" className="hidden sm:inline-flex gap-1 text-[11px] font-bold">
              <ShieldCheck className="size-3" />
              Live
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isBn
              ? 'দৈনিক ক্লিনিক্যাল ব্যবস্থাপনা, রোগী টোকেন, থেরাপি বেড মেট্রিক্স ও আর্থিক অডিট।'
              : 'Complete clinical operations, patient intake, bed management & executive P&L.'}
          </p>
        </div>

        {/* Global Actions */}
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
              <DropdownMenuItem onClick={() => window.print()} className="gap-2">
                <Printer className="size-3.5 text-emerald-500" />
                <span>{isBn ? 'প্রিন্ট সামারি' : 'Print Summary'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info('Exporting CSV...')} className="gap-2">
                <Download className="size-3.5 text-teal-500" />
                <span>{isBn ? 'CSV ডাউনলোড' : 'Download CSV'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Unified Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <TabsList className="h-11 sm:h-12 p-1 bg-muted/80 backdrop-blur-md rounded-2xl border border-border inline-flex w-full sm:w-auto min-w-max justify-start gap-1">
            <TabsTrigger value="analytics" className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-500 data-[state=active]:shadow-xs">
              <BarChart3 className="size-4" />
              <span>{isBn ? 'এক্সিকিউটিভ ড্যাশবোর্ড' : 'Executive Overview'}</span>
            </TabsTrigger>
            <TabsTrigger value="reception" className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-500 data-[state=active]:shadow-xs">
              <Users className="size-4" />
              <span>{isBn ? 'রিসেপশন ও রোগী' : 'Reception Desk'}</span>
            </TabsTrigger>
            <TabsTrigger value="doctor" className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-500 data-[state=active]:shadow-xs">
              <Stethoscope className="size-4" />
              <span>{isBn ? 'ডাক্তার চেম্বার' : 'Doctor Chamber'}</span>
            </TabsTrigger>
            <TabsTrigger value="therapy" className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-500 data-[state=active]:shadow-xs">
              <Zap className="size-4" />
              <span>{isBn ? 'থেরাপি হল' : 'Therapy Hall'}</span>
            </TabsTrigger>
            <TabsTrigger value="cashier" className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-500 data-[state=active]:shadow-xs">
              <Coins className="size-4" />
              <span>{isBn ? 'ক্যাশিয়ার ও বিলিং' : 'Cashier & Billing'}</span>
            </TabsTrigger>
            <TabsTrigger value="pharmacy" className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-emerald-500 data-[state=active]:shadow-xs">
              <Pill className="size-4" />
              <span>{isBn ? 'ফার্মেসি' : 'Pharmacy'}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Executive Analytics & P&L */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          {/* Executive Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Footfall */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-sm hover:shadow-md transition-shadow">
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
                  {summary?.footfall || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3 text-emerald-500" />
                  <span>{isBn ? 'রেজিস্টার্ড চেক-ইন' : 'Registered patient check-ins'}</span>
                </p>
              </CardContent>
            </Card>

            {/* 2. Gross Collections */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-sm hover:shadow-md transition-shadow">
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
                  ৳{((summary?.grossCollectionsPaisa || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBn ? 'নগদ ও ডিজিটাল পেমেন্ট' : 'Cash & digital receipts'}
                </p>
              </CardContent>
            </Card>

            {/* 3. Bed Occupancy */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-sm hover:shadow-md transition-shadow">
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
                  {summary?.bedOccupancyPercent || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBn ? 'হল এ সক্রিয় ১৬টি বেড' : 'Hall A active therapy beds'}
                </p>
              </CardContent>
            </Card>

            {/* 4. Pending Dues */}
            <Card className="rounded-2xl border-border bg-card/90 shadow-sm hover:shadow-md transition-shadow">
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
                  ৳{((summary?.totalDuesPaisa || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
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
            <Card className="rounded-2xl border-border shadow-sm">
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
            <Card className="rounded-2xl border-border shadow-sm">
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

          {/* Staff Time & Attendance Kiosk using Shadcn Card & Inputs */}
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Clock className="size-4 text-emerald-500" />
                <span>{isBn ? 'কর্মীদের হাজিরা ও সময় পর্যবেক্ষণ কিয়স্ক' : 'Staff Time & Attendance Kiosk'}</span>
              </CardTitle>
              <CardDescription>
                {isBn
                  ? 'রিসেপশন, ফিজিওথেরাপিস্ট ও সহকারী কর্মীদের ইন/আউট পাঞ্চ যাচাইকরণ।'
                  : 'Fast PIN-verified attendance logging for receptionists, therapists, and staff.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePunchAttendance} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                {/* 1. Staff Select */}
                <div className="space-y-1.5">
                  <Label htmlFor="staff-select">{isBn ? 'কর্মী নির্বাচন' : 'Staff Member'}</Label>
                  <select
                    id="staff-select"
                    value={punchStaffId}
                    onChange={(e) => setPunchStaffId(e.target.value)}
                    required
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Punch Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="punch-type">{isBn ? 'পাঞ্চের ধরন' : 'Punch Type'}</Label>
                  <select
                    id="punch-type"
                    value={punchType}
                    onChange={(e) => setPunchType(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="in">{isBn ? '🟢 প্রবেশ (Punch IN)' : '🟢 Punch IN'}</option>
                    <option value="out">{isBn ? '🔴 প্রস্থান (Punch OUT)' : '🔴 Punch OUT'}</option>
                  </select>
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
                  <span>{punching ? (isBn ? 'রেকর্ড হচ্ছে...' : 'Recording...') : (isBn ? 'পাঞ্চ সম্পন্ন করুন' : 'Submit Punch')}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Integrated Reception View */}
        <TabsContent value="reception" className="mt-4">
          <ReceptionView />
        </TabsContent>

        {/* Tab 3: Integrated Doctor Chamber View */}
        <TabsContent value="doctor" className="mt-4">
          <DoctorChamberView session={session} />
        </TabsContent>

        {/* Tab 4: Integrated Therapy Hall Bed Matrix View */}
        <TabsContent value="therapy" className="mt-4">
          <TherapyHallView session={session} />
        </TabsContent>

        {/* Tab 5: Integrated Cashier & Billing View */}
        <TabsContent value="cashier" className="mt-4">
          <CashierView session={session} />
        </TabsContent>

        {/* Tab 6: Integrated Pharmacy View */}
        <TabsContent value="pharmacy" className="mt-4">
          <PharmacyView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
