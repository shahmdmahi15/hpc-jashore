// apps/web/components/admin/ReportsManagementTab.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  Layers,
  Printer,
  RefreshCw,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { api } from '../../lib/api';

function toBnDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(value).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

function formatCurrency(amountPaisa: number, isBn: boolean): string {
  const taka = Math.round(amountPaisa / 100);
  const formatted = taka.toLocaleString('en-IN');
  return isBn ? `৳${toBnDigits(formatted)}` : `৳${formatted}`;
}

export function ReportsManagementTab() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Date selection state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [quickRange, setQuickRange] = useState<'today' | 'yesterday' | 'custom'>('today');

  // Report state
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<any>(null);
  const [modalities, setModalities] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [pnl, setPnl] = useState<any>(null);

  const fetchReports = useCallback(async (targetDate: string) => {
    try {
      setLoading(true);
      const [sumRes, modRes, docRes, therRes, pnlRes] = await Promise.allSettled([
        api.reports.getTodaySummary(targetDate),
        api.reports.getModalityStats(targetDate),
        api.reports.getDoctorStats(targetDate),
        api.reports.getTherapistPerformance(),
        api.reports.getPnlSummary(),
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

      if (therRes.status === 'fulfilled' && Array.isArray(therRes.value)) {
        setTherapists(therRes.value);
      } else {
        setTherapists([]);
      }

      if (pnlRes.status === 'fulfilled' && pnlRes.value) {
        setPnl(pnlRes.value);
      } else {
        setPnl(null);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error(isBn ? 'রিপোর্ট ডাটা লোড করতে ব্যর্থ হয়েছে' : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [isBn]);

  useEffect(() => {
    fetchReports(selectedDate);
  }, [fetchReports, selectedDate]);

  const handleQuickRange = (range: 'today' | 'yesterday') => {
    setQuickRange(range);
    if (range === 'today') {
      setSelectedDate(todayStr);
    } else if (range === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setSelectedDate(y.toISOString().slice(0, 10));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    try {
      const rows = [
        ['Report Date', selectedDate],
        ['Total Footfall', summary?.footfall || 0],
        ['Gross Collections (Paisa)', summary?.grossCollectionsPaisa || 0],
        ['Gross Collections (BDT)', Math.round((summary?.grossCollectionsPaisa || 0) / 100)],
        ['Total Dues (BDT)', Math.round((summary?.totalDuesPaisa || 0) / 100)],
        [],
        ['Modality Name', 'Session Count', 'Total Minutes', 'Revenue (BDT)'],
        ...modalities.map((m) => [
          m.name || m.modalityId,
          m.count || m.sessionCount || 0,
          m.totalMinutes || 0,
          Math.round((m.revenuePaisa || 0) / 100),
        ]),
        [],
        ['Doctor / Consultant', 'Patients Attended', 'Total Income (BDT)'],
        ...doctors.map((d) => [
          d.doctorName || d.name || d.doctorId,
          d.patientCount || d.visitCount || 0,
          Math.round((d.totalIncomePaisa || 0) / 100),
        ]),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `HPC_Report_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(isBn ? 'রিপোর্ট সফলভাবে ডাউনলোড হয়েছে' : 'Report downloaded successfully');
    } catch {
      toast.error(isBn ? 'সিএসভি তৈরি করতে ব্যর্থ হয়েছে' : 'Failed to generate CSV');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-full print:p-0">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={quickRange === 'today' ? 'default' : 'outline'}
            onClick={() => handleQuickRange('today')}
            className="rounded-xl text-xs font-semibold cursor-pointer"
          >
            {isBn ? 'আজ' : 'Today'}
          </Button>
          <Button
            size="sm"
            variant={quickRange === 'yesterday' ? 'default' : 'outline'}
            onClick={() => handleQuickRange('yesterday')}
            className="rounded-xl text-xs font-semibold cursor-pointer"
          >
            {isBn ? 'গতকাল' : 'Yesterday'}
          </Button>

          <div className="flex items-center gap-2 pl-2 border-l border-border/60">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setQuickRange('custom');
              }}
              className="h-8 w-36 text-xs rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchReports(selectedDate)}
            disabled={loading}
            className="rounded-xl gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="rounded-xl gap-1.5 text-xs font-semibold cursor-pointer text-teal-600 hover:text-teal-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isBn ? 'সিএসভি ডাউনলোড' : 'Export CSV'}</span>
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handlePrint}
            className="rounded-xl gap-1.5 text-xs font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isBn ? 'প্রিন্ট রিপোর্ট' : 'Print A4 Report'}</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block text-center pb-4 border-b border-border/80">
        <h2 className="text-2xl font-black">HPC Jashore — Clinical & Financial Audit Report</h2>
        <p className="text-sm text-muted-foreground">
          Report Target Date: {selectedDate} | Generated at: {new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Footfall */}
        <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'মোট রোগী আগমন' : 'Total Patient Footfall'}
            </CardTitle>
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
              {isBn ? toBnDigits(summary?.footfall || 0) : (summary?.footfall || 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isBn ? 'নির্বাচিত দিনে চিকিৎসাধীন রোগী' : 'Patients registered & served on this date'}
            </p>
          </CardContent>
        </Card>

        {/* Gross Revenue */}
        <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'মোট নগদ ও ডিজিটাল আদায়' : 'Gross Revenue Collections'}
            </CardTitle>
            <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
              {formatCurrency(summary?.grossCollectionsPaisa || 0, isBn)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isBn ? 'ক্যাশিয়ার ডেস্কে সংগৃহীত মোট অর্থ' : 'Settled bills at cashier terminal'}
            </p>
          </CardContent>
        </Card>

        {/* Total Outstanding Dues */}
        <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'বকেয়া পাওনা' : 'Total Outstanding Dues'}
            </CardTitle>
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(summary?.totalDuesPaisa || 0, isBn)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isBn ? 'অনদায়ী বা বকেয়া রসিদের যোগফল' : 'Unsettled balances & partial payments'}
            </p>
          </CardContent>
        </Card>

        {/* Modality Sessions Completed */}
        <Card className="rounded-2xl border-border bg-card/90 shadow-2xs hover:shadow-md transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {isBn ? 'সম্পন্ন থেরাপি মডালিটি' : 'Modality Sessions Completed'}
            </CardTitle>
            <div className="size-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Activity className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
              {isBn
                ? toBnDigits(modalities.reduce((acc, m) => acc + (m.count || m.sessionCount || 0), 0))
                : modalities.reduce((acc, m) => acc + (m.count || m.sessionCount || 0), 0)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {isBn ? 'ব্যবহৃত ফিজিওথেরাপিউটিক প্রযুক্তি' : 'Total physical modality applications performed'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Reports Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Modality Utilization & Revenue */}
        <Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>{isBn ? 'মডালিটি ভিত্তিক পারফরম্যান্স ও রাজস্ব' : 'Modality Utilization & Revenue'}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn ? 'প্রতিটি মডালিটির সেশন সংখ্যা ও অর্জিত অর্থ' : 'Session volume, duration & revenue per modality'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {isBn ? `${toBnDigits(modalities.length)} টি মডালিটি` : `${modalities.length} modalities`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">{isBn ? 'মডালিটির নাম' : 'Modality'}</TableHead>
                    <TableHead className="text-center font-semibold">{isBn ? 'সেশন সংখ্যা' : 'Sessions'}</TableHead>
                    <TableHead className="text-center font-semibold">{isBn ? 'মোট সময় (মিনিট)' : 'Minutes'}</TableHead>
                    <TableHead className="text-right font-semibold">{isBn ? 'মোট রাজস্ব' : 'Revenue'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                        {isBn ? 'এই তারিখে কোনো মডালিটি রেকর্ড নেই' : 'No modality records for this date'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    modalities.map((mod, idx) => (
                      <TableRow key={mod.modalityId || idx} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">
                          {mod.name || mod.modalityId || 'General Physiotherapy'}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {isBn ? toBnDigits(mod.count || mod.sessionCount || 0) : (mod.count || mod.sessionCount || 0)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {isBn ? toBnDigits(mod.totalMinutes || 0) : (mod.totalMinutes || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(mod.revenuePaisa || 0, isBn)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Consultation Audit */}
        <Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>{isBn ? 'ডাক্তার কনসালটেশন ও রোগী পরিসংখ্যান' : 'Doctor Consultations & Income'}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  {isBn ? 'ডাক্তারদের পরিদর্শনকৃত রোগী সংখ্যা ও প্রদেয় ফি' : 'Patient count and consultation revenue by doctor'}
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {isBn ? `${toBnDigits(doctors.length)} জন ডাক্তার` : `${doctors.length} doctors`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">{isBn ? 'ডাক্তারের নাম' : 'Doctor Name'}</TableHead>
                    <TableHead className="text-center font-semibold">{isBn ? 'রোগী সংখ্যা' : 'Patients'}</TableHead>
                    <TableHead className="text-right font-semibold">{isBn ? 'মোট আয়' : 'Income'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-28 text-center text-muted-foreground">
                        {isBn ? 'এই তারিখে কোনো ডাক্তার কনসালটেশন রেকর্ড নেই' : 'No doctor records for this date'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctors.map((doc, idx) => (
                      <TableRow key={doc.doctorId || idx} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">
                          {doc.doctorName || doc.name || 'Specialist Consultant'}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {isBn ? toBnDigits(doc.patientCount || doc.visitCount || 0) : (doc.patientCount || doc.visitCount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(doc.totalIncomePaisa || 0, isBn)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Therapist / Staff Performance Section */}
      {therapists.length > 0 && (
        <Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>{isBn ? 'থেরাপিস্ট ও হ্যান্ডলার পারফরম্যান্স' : 'Therapist & Handler Clinical Performance'}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {isBn ? 'থেরাপিস্টদের সম্পাদিত সেশন সংখ্যা ও কাজের সময়' : 'Executed therapy sessions and total patient interaction minutes'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">{isBn ? 'থেরাপিস্ট' : 'Therapist'}</TableHead>
                    <TableHead className="text-center font-semibold">{isBn ? 'সম্পন্ন সেশন' : 'Sessions Handled'}</TableHead>
                    <TableHead className="text-center font-semibold">{isBn ? 'মোট সময় (মিনিট)' : 'Total Clinical Minutes'}</TableHead>
                    <TableHead className="text-right font-semibold">{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {therapists.map((ther, idx) => (
                    <TableRow key={ther.therapistId || idx} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {ther.name || ther.therapistName || `Therapist #${idx + 1}`}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {isBn ? toBnDigits(ther.sessionCount || 0) : (ther.sessionCount || 0)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {isBn ? toBnDigits(ther.totalMinutes || 0) : (ther.totalMinutes || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="emerald" className="text-[10px] font-semibold">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PnL Financial Summary if Available */}
      {pnl && (
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? 'ক্লিনিক্যাল লাভ ও ক্ষতি (P&L) সারসংক্ষেপ' : 'Clinical Profit & Loss (P&L) Summary'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground block">{isBn ? 'মোট রাজস্ব' : 'Total Clinical Income'}</span>
              <span className="text-lg font-bold font-mono text-emerald-600">
                {formatCurrency(pnl.totalIncomePaisa || 0, isBn)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground block">{isBn ? 'মোট ব্যয়' : 'Operating Expenses'}</span>
              <span className="text-lg font-bold font-mono text-rose-600">
                {formatCurrency(pnl.totalExpensesPaisa || 0, isBn)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-xs text-muted-foreground block">{isBn ? 'নিট অপারেটিং মার্জিন' : 'Net Operating Balance'}</span>
              <span className="text-lg font-bold font-mono text-foreground">
                {formatCurrency((pnl.totalIncomePaisa || 0) - (pnl.totalExpensesPaisa || 0), isBn)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
