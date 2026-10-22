// apps/web/components/checkout/CheckoutWorkstationView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  LogOut,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Users,
  Stethoscope,
  Banknote,
  Calendar,
  FileText,
  Printer,
  X,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  ShieldAlert,
  ChevronRight,
  ArrowRight,
  Activity,
  Check,
  CreditCard,
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
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  listCheckoutVisitsAction,
  processCheckoutAction,
  getDepartureSlipAction,
  CheckoutVisitRecord,
  CheckoutStats,
  DepartureSlipData,
} from '../../lib/actions/checkout';
import { DepartureSlipModal } from './DepartureSlipModal';

export function CheckoutWorkstationView() {
  const { language } = useLanguage();
  const [isPending, startTransition] = useTransition();

  // State
  const [visits, setVisits] = useState<CheckoutVisitRecord[]>([]);
  const [stats, setStats] = useState<CheckoutStats>({
    totalCheckedInToday: 0,
    currentlyInClinic: 0,
    readyForCheckout: 0,
    checkedOutToday: 0,
    pendingDuesCount: 0,
    totalDuesTaka: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'pending_dues' | 'in_service' | 'checked_out' | 'active'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Checkout Dialog Modal State
  const [selectedVisit, setSelectedVisit] = useState<CheckoutVisitRecord | null>(null);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState<boolean>(false);
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [allowWithDues, setAllowWithDues] = useState<boolean>(false);
  const [dueReason, setDueReason] = useState<string>('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');

  // Departure Slip Receipt Modal State
  const [slipData, setSlipData] = useState<DepartureSlipData | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCheckoutVisitsAction({
        search: searchQuery,
        status: statusFilter,
      });

      if (res.success && res.data) {
        setVisits(res.data.items);
        setStats(res.data.stats);
      } else {
        toast.error(res.error || (language === 'bn' ? 'চেক-আউট তালিকা লোড করতে ব্যর্থ' : 'Failed to load checkout visits'));
      }
    } catch (err: any) {
      toast.error(err?.message || (language === 'bn' ? 'ডেটা লোড করতে সমস্যা হয়েছে' : 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Checkout Modal
  const openCheckoutModal = (v: CheckoutVisitRecord) => {
    setSelectedVisit(v);
    setCheckoutNotes(v.visit.dischargeNotes || '');
    setAllowWithDues(false);
    setDueReason('');
    setNextFollowUpDate(v.clinical.followUpDate || '');
    setIsCheckoutDialogOpen(true);
  };

  // Quick Set Follow-up Date (+7, +15, +30 days)
  const setQuickFollowUpDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNextFollowUpDate(d.toISOString().slice(0, 10));
  };

  // Handle Checkout Submit
  const handleCheckoutSubmit = () => {
    if (!selectedVisit) return;

    if (selectedVisit.financial.hasDues && !allowWithDues) {
      toast.error(
        language === 'bn'
          ? 'রোগীর বকেয়া বিল রয়েছে। বকেয়া পরিশোধ করুন অথবা "বকেয়া অনুমোদন" টিক দিন।'
          : 'Patient has outstanding dues. Settle bills or check "Authorize with Dues".',
      );
      return;
    }

    startTransition(async () => {
      const res = await processCheckoutAction(selectedVisit.visit.id, {
        notes: checkoutNotes.trim() || undefined,
        allowWithDues,
        dueReason: dueReason.trim() || undefined,
        nextFollowUpDate: nextFollowUpDate || undefined,
      });

      if (res.success && res.data) {
        toast.success(
          language === 'bn'
            ? `${selectedVisit.patient.nameEn}-এর প্রস্থান ও ডিসচার্জ সম্পন্ন হয়েছে!`
            : `Checkout cleared for ${selectedVisit.patient.nameEn}!`,
        );
        setIsCheckoutDialogOpen(false);
        setSlipData(res.data.departureSlip);
        setIsSlipModalOpen(true);
        await loadData();
      } else {
        toast.error(res.error || (language === 'bn' ? 'চেক-আউট সম্পন্ন করা যায়নি' : 'Failed to process checkout'));
      }
    });
  };

  // Open Existing Departure Receipt
  const openDepartureReceipt = async (visitId: string) => {
    try {
      const res = await getDepartureSlipAction(visitId);
      if (res.success && res.data) {
        setSlipData(res.data);
        setIsSlipModalOpen(true);
      } else {
        toast.error(res.error || (language === 'bn' ? 'রশিদ লোড করা যায়নি' : 'Failed to load receipt'));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error loading slip');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Top Banner & KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Currently in Clinic */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'ক্লিনিকে অবস্থানরত' : 'In Clinic'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {stats.currentlyInClinic}
                </span>
                <span className="text-[10px] sm:text-xs text-primary font-medium">
                  / {stats.totalCheckedInToday} {language === 'bn' ? 'মোট' : 'total'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Ready for Checkout */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'প্রস্থান প্রস্তুত' : 'Ready Checkout'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {stats.readyForCheckout}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {language === 'bn' ? 'রোগী' : 'pts'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Pending Dues */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'বকেয়া সমন্বয়' : 'Pending Dues'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-amber-500">
                  {stats.pendingDuesCount}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  (৳{stats.totalDuesTaka})
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Banknote className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Cleared Today */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm relative overflow-hidden">
          <CardContent className="p-3.5 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'bn' ? 'আজকের প্রস্থান' : 'Departed'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {stats.checkedOutToday}
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {language === 'bn' ? 'সম্পন্ন' : 'cleared'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <LogOut className="size-5 sm:size-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Container Card */}
      <Card className="border-border/60 shadow-md">
        <CardHeader className="p-4 sm:p-6 border-b border-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <LogOut className="size-5 text-emerald-500" />
                {language === 'bn'
                  ? 'রোগী চেক-আউট ও ডিসচার্জ ওয়ার্কস্টেশন'
                  : 'Patient Check-Out & Departure Clearance'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {language === 'bn'
                  ? 'রোগীর চিকিৎসা সমাপ্তি, প্রেসক্রিপশন প্রদান, বকেয়া বিল নিষ্পত্তি ও প্রস্থান ছাড়পত্র প্রদান।'
                  : 'Verify treatment completion, bill settlement, discharge advice, and departure clearance.'}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-9 px-3 rounded-xl border-border/70 hover:bg-muted/80 text-xs font-medium"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                {language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    language === 'bn'
                      ? 'রোগীর নাম, ফোন, MRN বা ডাক্তার খুঁজুন...'
                      : 'Search patient, MRN, phone, doctor...'
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
                <SelectTrigger className="w-32 sm:w-36 h-9 rounded-xl text-xs bg-background/80">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{language === 'bn' ? 'বর্তমান সক্রিয়' : 'All Active'}</SelectItem>
                  <SelectItem value="ready">{language === 'bn' ? 'প্রস্থান প্রস্তুত' : 'Ready'}</SelectItem>
                  <SelectItem value="pending_dues">{language === 'bn' ? 'বকেয়া অপেক্ষমাণ' : 'Pending Dues'}</SelectItem>
                  <SelectItem value="in_service">{language === 'bn' ? 'চিকিৎসাধীন' : 'In Service'}</SelectItem>
                  <SelectItem value="checked_out">{language === 'bn' ? 'আজকের প্রস্থান' : 'Checked Out'}</SelectItem>
                  <SelectItem value="all">{language === 'bn' ? 'সকল রোগী' : 'All Visits'}</SelectItem>
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
                {language === 'bn' ? 'কার্ড' : 'Grid'}
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-2.5 rounded-lg text-xs font-medium"
              >
                <TableIcon className="size-3.5 mr-1.5" />
                {language === 'bn' ? 'টেবিল' : 'Table'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="size-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground font-medium">
                {language === 'bn' ? 'চেক-আউট রোগীদের ডাটা লোড হচ্ছে...' : 'Loading patient checkout records...'}
              </p>
            </div>
          ) : visits.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-border/60 rounded-2xl bg-muted/20">
              <CheckCircle2 className="size-10 text-muted-foreground/60 mx-auto" />
              <h3 className="text-base font-semibold text-foreground">
                {language === 'bn' ? 'কোনো রোগী পাওয়া যায়নি' : 'No patients found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? (language === 'bn'
                    ? 'আপনার সার্চ ফিল্টারের সাথে কোনো রোগীর তথ্য মেলেনি।'
                    : 'No patients matched your search criteria.')
                  : (language === 'bn'
                    ? 'বর্তমানে এই ক্যাটাগরিতে কোনো রোগী নেই।'
                    : 'No patients currently in this category.')}
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
              {visits.map((item) => {
                const isCheckedOut = item.visit.status === 'checked_out';
                const hasDues = item.financial.dueTaka > 0;

                return (
                  <Card
                    key={item.visit.id}
                    className={`border transition-all duration-200 overflow-hidden relative flex flex-col justify-between ${
                      isCheckedOut
                        ? 'border-border/40 bg-muted/10 opacity-80'
                        : hasDues
                        ? 'border-amber-500/40 hover:border-amber-500/70 bg-gradient-to-br from-card to-amber-500/5'
                        : item.readiness === 'ready'
                        ? 'border-emerald-500/40 hover:border-emerald-500/70 bg-gradient-to-br from-card to-emerald-500/5 shadow-sm'
                        : 'border-border/60 hover:border-border'
                    }`}
                  >
                    <div>
                      {/* Header Token & Readiness */}
                      <div className="p-3.5 sm:p-4 border-b border-border/40 flex items-start justify-between gap-2 bg-muted/20">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm sm:text-base font-mono">
                            #{item.visit.tokenNumber.toString().padStart(2, '0')}
                          </div>
                          <div>
                            <span className="font-bold text-sm sm:text-base text-foreground leading-snug block">
                              {item.patient.nameEn}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground block">
                              {item.patient.mrn} • {item.patient.phone || '-'}
                            </span>
                          </div>
                        </div>

                        {/* Readiness Badge */}
                        {isCheckedOut ? (
                          <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground">
                            {language === 'bn' ? '✓ প্রস্থান সম্পন্ন' : '✓ Departed'}
                          </Badge>
                        ) : item.readiness === 'ready' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                            {language === 'bn' ? 'প্রস্থান প্রস্তুত' : 'Ready'}
                          </Badge>
                        ) : item.readiness === 'pending_dues' ? (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                            {language === 'bn' ? 'বকেয়া বাকি' : 'Dues Pending'}
                          </Badge>
                        ) : (
                          <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px]">
                            {language === 'bn' ? 'চিকিৎসাধীন' : 'In Service'}
                          </Badge>
                        )}
                      </div>

                      {/* Content Body */}
                      <div className="p-3.5 sm:p-4 space-y-3 text-xs">
                        {/* Location & Doctor */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-muted-foreground block">{language === 'bn' ? 'অবস্থান' : 'Location'}:</span>
                            <span className="font-semibold text-foreground truncate block">
                              {item.visit.currentLocation}
                            </span>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <span className="text-[10px] text-muted-foreground block">{language === 'bn' ? 'ডাক্তার' : 'Doctor'}:</span>
                            <span className="font-semibold text-foreground truncate block">
                              {item.doctor?.fullName || '-'}
                            </span>
                          </div>
                        </div>

                        {/* Financial Box */}
                        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 grid grid-cols-3 gap-1 text-center font-mono">
                          <div>
                            <span className="text-[9px] text-muted-foreground block">{language === 'bn' ? 'মোট বিল' : 'Billed'}</span>
                            <span className="font-bold text-xs text-foreground">৳{item.financial.totalBillTaka}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground block">{language === 'bn' ? 'পরিশোধ' : 'Paid'}</span>
                            <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">৳{item.financial.paidTaka}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-muted-foreground block">{language === 'bn' ? 'বকেয়া' : 'Due'}</span>
                            <span className={`font-black text-xs ${item.financial.dueTaka > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              ৳{item.financial.dueTaka}
                            </span>
                          </div>
                        </div>

                        {/* Clinical Completion Summary */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground pt-1">
                          {item.clinical.prescriptionIssued && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium border border-emerald-500/20">
                              <FileText className="size-3" />
                              {language === 'bn' ? 'প্রেসক্রিপশন প্রস্তুত' : 'Prescription Ready'}
                            </span>
                          )}

                          {item.clinical.followUpDate && (
                            <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md font-medium border border-sky-500/20">
                              <Calendar className="size-3" />
                              {item.clinical.followUpDate}
                            </span>
                          )}
                        </div>

                        {/* Timings */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                          <span>
                            {language === 'bn' ? 'আগমন:' : 'Entry:'} {item.visit.checkedInAt ? new Date(item.visit.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          {isCheckedOut && item.visit.checkedOutAt && (
                            <span>
                              {language === 'bn' ? 'প্রস্থান:' : 'Exit:'} {new Date(item.visit.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                      {isCheckedOut ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDepartureReceipt(item.visit.id)}
                          className="h-8 px-3 rounded-xl text-xs font-medium w-full"
                        >
                          <Printer className="size-3.5 mr-1.5" />
                          {language === 'bn' ? 'রশিদ পুনঃমুদ্রণ' : 'Reprint Receipt'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openCheckoutModal(item)}
                          className={`h-8 px-3 rounded-xl text-xs font-semibold w-full shadow-sm active:scale-95 transition-transform ${
                            item.readiness === 'ready'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : hasDues
                              ? 'bg-amber-600 hover:bg-amber-500 text-white'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <LogOut className="size-3.5 mr-1.5" />
                          {hasDues
                            ? (language === 'bn' ? 'বকেয়া নিষ্পত্তি ও প্রস্থান' : 'Settle & Clear Exit')
                            : (language === 'bn' ? 'ডিসচার্জ ও প্রস্থান অনুমোদন' : 'Clear Departure')}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-border/60 overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-xs">Token & Patient</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'অবস্থান' : 'Location'}</TableHead>
                    <TableHead className="font-bold text-xs">{language === 'bn' ? 'ডাক্তার' : 'Doctor'}</TableHead>
                    <TableHead className="font-bold text-xs text-right font-mono">Billed</TableHead>
                    <TableHead className="font-bold text-xs text-right font-mono">Paid</TableHead>
                    <TableHead className="font-bold text-xs text-right font-mono text-amber-500">Due</TableHead>
                    <TableHead className="font-bold text-xs text-center">Status</TableHead>
                    <TableHead className="font-bold text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((item) => {
                    const isCheckedOut = item.visit.status === 'checked_out';
                    return (
                      <TableRow key={item.visit.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs text-primary">
                                #{item.visit.tokenNumber.toString().padStart(2, '0')}
                              </span>
                              <span className="font-bold text-xs text-foreground">{item.patient.nameEn}</span>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground block">
                              {item.patient.mrn} • {item.patient.phone || '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.visit.currentLocation}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.doctor ? item.doctor.fullName : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          ৳{item.financial.totalBillTaka}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳{item.financial.paidTaka}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-red-500">
                          ৳{item.financial.dueTaka}
                        </TableCell>
                        <TableCell className="text-center">
                          {isCheckedOut ? (
                            <Badge variant="outline" className="text-[10px]">Departed</Badge>
                          ) : item.readiness === 'ready' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">Ready</Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">Due</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCheckedOut ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDepartureReceipt(item.visit.id)}
                              className="h-8 px-2 text-xs"
                            >
                              <Printer className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => openCheckoutModal(item)}
                              className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              Checkout
                            </Button>
                          )}
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

      {/* Checkout Processing Dialog */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <LogOut className="size-5 text-emerald-500" />
              {language === 'bn' ? 'রোগী প্রস্থান ও ডিসচার্জ অনুমোদন' : 'Confirm Patient Checkout'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {language === 'bn'
                ? `${selectedVisit?.patient.nameEn}-এর চিকিৎসা সম্পন্নকরণ ও ক্লিনিক প্রস্থান অনুমোদন করুন।`
                : `Finalize departure clearance and discharge slip for ${selectedVisit?.patient.nameEn}.`}
            </DialogDescription>
          </DialogHeader>

          {selectedVisit && (
            <div className="space-y-4 py-2">
              {/* Patient Banner */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm block">{selectedVisit.patient.nameEn}</span>
                  <span className="text-xs text-muted-foreground font-mono">{selectedVisit.patient.mrn} • {selectedVisit.patient.phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">TOKEN #</span>
                  <span className="font-mono font-black text-primary text-base">#{selectedVisit.visit.tokenNumber.toString().padStart(2, '0')}</span>
                </div>
              </div>

              {/* Financial Breakdown Alert */}
              <div className={`p-3.5 rounded-xl border space-y-2 ${
                selectedVisit.financial.dueTaka > 0
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-emerald-500/40 bg-emerald-500/10'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="size-4" />
                    {language === 'bn' ? 'আর্থিক স্থিতি' : 'Billing Status'}
                  </span>
                  <span className={selectedVisit.financial.dueTaka > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>
                    {selectedVisit.financial.dueTaka > 0
                      ? (language === 'bn' ? `বকেয়া বাকি: ৳${selectedVisit.financial.dueTaka}` : `Unsettled Due: ৳${selectedVisit.financial.dueTaka}`)
                      : (language === 'bn' ? '✓ সম্পূর্ণ পরিশোধিত' : '✓ Fully Settled')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center font-mono text-xs pt-1 border-t border-border/30">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Billed</span>
                    <span className="font-bold">৳{selectedVisit.financial.totalBillTaka}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Paid</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{selectedVisit.financial.paidTaka}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Due</span>
                    <span className={`font-black ${selectedVisit.financial.dueTaka > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      ৳{selectedVisit.financial.dueTaka}
                    </span>
                  </div>
                </div>

                {/* Due Authorization Option */}
                {selectedVisit.financial.dueTaka > 0 && (
                  <div className="pt-2 border-t border-amber-500/30 space-y-2">
                    <label className="flex items-start gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowWithDues}
                        onChange={(e) => setAllowWithDues(e.target.checked)}
                        className="mt-0.5 rounded size-4 accent-amber-500"
                      />
                      <span>
                        {language === 'bn'
                          ? 'বকেয়া থাকা সত্ত্বেও প্রস্থান অনুমোদন করুন (অ্যাডমিন/ক্যাশিয়ার সম্মতি)'
                          : 'Authorize departure despite outstanding dues (Cashier/Admin consent)'}
                      </span>
                    </label>

                    {allowWithDues && (
                      <Input
                        value={dueReason}
                        onChange={(e) => setDueReason(e.target.value)}
                        placeholder={
                          language === 'bn'
                            ? 'বকেয়া অনুমোদনের কারণ (উদাঃ আগামী সেশনে পরিশোধ করবেন)...'
                            : 'Reason for allowing checkout with dues (e.g. Next session settlement)...'
                        }
                        className="h-8 text-xs bg-background/90"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Next Follow-Up Appointment Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-sky-500" />
                    {language === 'bn' ? 'পরবর্তী ফলো-আপ অ্যাপয়েন্টমেন্ট তারিখ' : 'Next Follow-Up Appointment Date'}
                  </span>
                  {nextFollowUpDate && (
                    <button
                      onClick={() => setNextFollowUpDate('')}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="h-9 text-xs sm:text-sm font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickFollowUpDays(7)}
                    className="h-9 px-2 text-xs rounded-lg"
                  >
                    +7d
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickFollowUpDays(15)}
                    className="h-9 px-2 text-xs rounded-lg"
                  >
                    +15d
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickFollowUpDays(30)}
                    className="h-9 px-2 text-xs rounded-lg"
                  >
                    +30d
                  </Button>
                </div>
              </div>

              {/* Discharge Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {language === 'bn' ? 'প্রস্থান পরামর্শ ও ডিসচার্জ নোট' : 'Discharge Instructions / Advice'}
                </label>
                <Textarea
                  rows={2}
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'রোগীর বাড়ি ফেরার পরামর্শ, ব্যায়াম নির্দেশিকা বা ফলো-আপ বার্তা...'
                      : 'Clinical advice, home exercise instructions, or farewell guidance...'
                  }
                  className="text-xs sm:text-sm resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCheckoutDialogOpen(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              onClick={handleCheckoutSubmit}
              disabled={isPending || (selectedVisit?.financial.hasDues && !allowWithDues)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
            >
              {isPending ? (
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="size-3.5 mr-1.5" />
              )}
              {language === 'bn' ? 'প্রস্থান নিশ্চিত করুন' : 'Clear Departure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Departure Clearance Slip Modal */}
      <DepartureSlipModal
        open={isSlipModalOpen}
        onOpenChange={setIsSlipModalOpen}
        slip={slipData}
      />
    </div>
  );
}
