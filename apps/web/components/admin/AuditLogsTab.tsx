// apps/web/components/admin/AuditLogsTab.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { toast } from 'sonner';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  FileCode,
  Filter,
  Layers,
  Network,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

export interface AuditLogRecord {
  id: number;
  occurredAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorDisplayName?: string | null;
  deskId: string | null;
  pinStaffId: string | null;
  action: string;
  entity: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
  ip: string | null;
  requestId: string | null;
}

const COMMON_ACTIONS = [
  { value: 'all', labelEn: 'All Actions', labelBn: 'সকল একশন' },
  { value: 'auth.login', labelEn: 'auth.login (Sign In)', labelBn: 'লগইন' },
  { value: 'auth.logout', labelEn: 'auth.logout (Sign Out)', labelBn: 'লগআউট' },
  { value: 'auth.pin_verify', labelEn: 'auth.pin_verify (Staff PIN)', labelBn: 'পিন যাচাই' },
  { value: 'patients.create', labelEn: 'patients.create (Registration)', labelBn: 'নতুন রোগী নিবন্ধন' },
  { value: 'patients.update', labelEn: 'patients.update (EMR Update)', labelBn: 'রোগীর তথ্য আপডেট' },
  { value: 'patients.delete', labelEn: 'patients.delete (Archive)', labelBn: 'রোগী মুছে ফেলা' },
  { value: 'intake.submitted', labelEn: 'intake.submitted (Form Intake)', labelBn: 'ইনটেক ফরম জমা' },
  { value: 'billing.create_bill', labelEn: 'billing.create_bill (Invoice)', labelBn: 'বিল তৈরি' },
  { value: 'billing.collect_payment', labelEn: 'billing.collect_payment', labelBn: 'পেমেন্ট আদায়' },
  { value: 'billing.refund', labelEn: 'billing.refund (Refund)', labelBn: 'রিফান্ড ইস্যু' },
  { value: 'drawer.open', labelEn: 'drawer.open (Cash Drawer)', labelBn: 'ক্যাশ ড্রয়ার খোলা' },
  { value: 'drawer.close', labelEn: 'drawer.close (Drawer Close)', labelBn: 'ক্যাশ ড্রয়ার বন্ধ' },
  { value: 'drawer.reconcile', labelEn: 'drawer.reconcile (Reconciliation)', labelBn: 'ক্যাশ সমন্বয়' },
  { value: 'consultation.call_chamber', labelEn: 'consultation.call_chamber', labelBn: 'চেম্বারে ডাকুন' },
  { value: 'consultation.complete', labelEn: 'consultation.complete', labelBn: 'পরামর্শ সম্পন্ন' },
  { value: 'therapy.start_session', labelEn: 'therapy.start_session', labelBn: 'থেরাপি শুরু' },
  { value: 'therapy.complete_session', labelEn: 'therapy.complete_session', labelBn: 'থেরাপি সম্পন্ন' },
  { value: 'therapy.call_patient', labelEn: 'therapy.call_patient', labelBn: 'থেরাপি ডাকুন' },
  { value: 'users.create', labelEn: 'users.create (Staff Registration)', labelBn: 'কর্মী রেজিস্ট্রেশন' },
  { value: 'users.approve', labelEn: 'users.approve (Staff Approval)', labelBn: 'কর্মী অনুমোদন' },
  { value: 'users.reject', labelEn: 'users.reject (Staff Rejection)', labelBn: 'কর্মী বাতিল' },
  { value: 'users.update', labelEn: 'users.update (Permissions)', labelBn: 'কর্মী তথ্য আপডেট' },
  { value: 'rooms.create', labelEn: 'rooms.create (New Room/Bed)', labelBn: 'রুম/বেড তৈরি' },
  { value: 'rooms.update', labelEn: 'rooms.update (Room Status)', labelBn: 'রুম স্ট্যাটাস আপডেট' },
  { value: 'bulletins.create', labelEn: 'bulletins.create (TV Notice)', labelBn: 'টিভি নোটিশ তৈরি' },
];

const COMMON_ENTITIES = [
  { value: 'all', labelEn: 'All Entities', labelBn: 'সকল এনটিটি' },
  { value: 'users', labelEn: 'users (Staff & Accounts)', labelBn: 'ব্যবহারকারী' },
  { value: 'patients', labelEn: 'patients (Patient Records)', labelBn: 'রোগী' },
  { value: 'bills', labelEn: 'bills (Invoices)', labelBn: 'বিল' },
  { value: 'payments', labelEn: 'payments (Receipts)', labelBn: 'পেমেন্ট' },
  { value: 'intake_forms', labelEn: 'intake_forms (Assessments)', labelBn: 'ইনটেক ফরম' },
  { value: 'therapy_sessions', labelEn: 'therapy_sessions', labelBn: 'থেরাপি সেশন' },
  { value: 'serials', labelEn: 'serials (Consultation Queue)', labelBn: 'ডাক্তার সিরিয়াল' },
  { value: 'consultation_bookings', labelEn: 'consultation_bookings', labelBn: 'কনসালটেশন বুকিং' },
  { value: 'rooms', labelEn: 'rooms (Chambers & Rehab Halls)', labelBn: 'চেম্বার ও রিহ্যাব হল' },
  { value: 'bulletins', labelEn: 'bulletins (TV Announcements)', labelBn: 'টিভি বুলেটিন' },
  { value: 'settings', labelEn: 'settings (System Config)', labelBn: 'সিস্টেম কনফিগ' },
];

export function AuditLogsTab() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Filters & Query State
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Data State
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Details Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.audit.query({
        page,
        limit,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entity: entityFilter !== 'all' ? entityFilter : undefined,
        search: search.trim() || undefined,
        from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
      });

      if (res && Array.isArray(res.items)) {
        setLogs(res.items);
        setTotal(res.total ?? 0);
        setPages(res.pages ?? Math.max(1, Math.ceil((res.total ?? 0) / limit)));
      } else {
        setLogs([]);
        setTotal(0);
        setPages(1);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      toast.error(isBn ? 'অডিট লগ লোড করতে ব্যর্থ হয়েছে' : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, entityFilter, search, fromDate, toDate, isBn]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('all');
    setEntityFilter('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleCopy = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return iso;
    }
  };

  const formatJson = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return val;
      }
    }
    return JSON.stringify(val, null, 2);
  };

  // Action badge styling logic
  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('submitted') || act.includes('approve')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {action}
        </span>
      );
    }
    if (act.includes('delete') || act.includes('reject') || act.includes('refund') || act.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400">
          <span className="size-1.5 rounded-full bg-red-500" />
          {action}
        </span>
      );
    }
    if (act.includes('update') || act.includes('reconcile') || act.includes('pin')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400">
          <span className="size-1.5 rounded-full bg-blue-500" />
          {action}
        </span>
      );
    }
    // Default call / event
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" />
        {action}
      </span>
    );
  };

  // Role badge styling
  const getRoleBadge = (role?: string | null) => {
    if (!role) return null;
    const r = role.toLowerCase();
    let colorClass = 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-muted';
    if (r === 'admin') colorClass = 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold';
    else if (r === 'doctor') colorClass = 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold';
    else if (r === 'cashier') colorClass = 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold';
    else if (r === 'receptionist') colorClass = 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold';
    else if (r === 'handler') colorClass = 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold';

    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${colorClass}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search & Filter Header Card */}
      <Card className="rounded-2xl border-border bg-card shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-foreground">
                <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? 'সিস্টেম অডিট ও নিরাপত্তা ট্রেইল' : 'System Audit & Immutable Event Trail'}</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                {isBn
                  ? 'ক্লিনিকের প্রতিটি রেকর্ড তৈরি, পরিবর্তন, পেমেন্ট, ও অনুমোদনের অপরিবর্তনযোগ্য লগ।'
                  : 'Tamper-proof event logs, actor roles, IPs, and detailed before/after state diffs.'}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                disabled={loading}
                className="rounded-xl gap-1.5 text-xs font-bold"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="rounded-xl gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                <span>{isBn ? 'ফিল্টার মুছুন' : 'Reset'}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Filter Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                autoComplete="off"
                placeholder={isBn ? 'একশন, আইডি বা নাম খুঁজুন...' : 'Search action, entity, user...'}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 rounded-xl h-9 text-xs sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Action Filter */}
            <div>
              <Select
                value={actionFilter}
                onValueChange={(val) => {
                  setActionFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder={isBn ? 'একশন নির্বাচন' : 'Filter by Action'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COMMON_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-xs">
                      {isBn ? a.labelBn : a.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Filter */}
            <div>
              <Select
                value={entityFilter}
                onValueChange={(val) => {
                  setEntityFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder={isBn ? 'এনটিটি নির্বাচন' : 'Filter by Entity'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COMMON_ENTITIES.map((e) => (
                    <SelectItem key={e.value} value={e.value} className="text-xs">
                      {isBn ? e.labelBn : e.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Controls */}
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                autoComplete="off"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-xl text-xs px-2"
                title={isBn ? 'তারিখ থেকে' : 'From Date'}
              />
              <span className="text-xs text-muted-foreground shrink-0">–</span>
              <Input
                type="date"
                autoComplete="off"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-xl text-xs px-2"
                title={isBn ? 'তারিখ পর্যন্ত' : 'To Date'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Data Table */}
      <Card className="rounded-2xl border-border bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="w-[180px] text-xs font-bold text-muted-foreground">
                  {isBn ? 'সময় ও তারিখ' : 'Timestamp'}
                </TableHead>
                <TableHead className="w-[200px] text-xs font-bold text-muted-foreground">
                  {isBn ? 'ব্যবহারকারী ও পদবী' : 'Actor'}
                </TableHead>
                <TableHead className="w-[220px] text-xs font-bold text-muted-foreground">
                  {isBn ? 'একশন / কার্যক্রম' : 'Action'}
                </TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground">
                  {isBn ? 'এনটিটি ও আইডি' : 'Entity & Target'}
                </TableHead>
                <TableHead className="w-[120px] text-xs font-bold text-muted-foreground">
                  {isBn ? 'আইপি অ্যাড্রেস' : 'IP / Terminal'}
                </TableHead>
                <TableHead className="w-[80px] text-right text-xs font-bold text-muted-foreground">
                  {isBn ? 'বিস্তারিত' : 'Details'}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <RefreshCw className="size-6 animate-spin text-emerald-500" />
                      <span className="text-xs font-medium">
                        {isBn ? 'অডিট লগ লোড হচ্ছে...' : 'Loading audit logs...'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ClipboardList className="size-8 stroke-[1.5] text-zinc-400" />
                      <p className="text-sm font-semibold text-foreground">
                        {isBn ? 'কোনো অডিট লগ পাওয়া যায়নি' : 'No audit records found'}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {isBn
                          ? 'নির্বাচিত ফিল্টার বা সার্চ শব্দের সাথে মিল রেখে কোনো লগ পাওয়া যায়নি।'
                          : 'Try modifying your search keywords or clearing date and action filters.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="hover:bg-muted/30 transition-colors border-border/60"
                  >
                    {/* Timestamp */}
                    <TableCell className="font-mono text-xs text-foreground whitespace-nowrap">
                      {formatTimestamp(log.occurredAt)}
                    </TableCell>

                    {/* Actor */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-foreground">
                            {log.actorDisplayName || log.actorUserId || 'System'}
                          </span>
                          {getRoleBadge(log.actorRole)}
                        </div>
                        {log.actorUserId && log.actorDisplayName && (
                          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
                            {log.actorUserId}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </TableCell>

                    {/* Entity & Entity ID */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[11px] font-mono bg-muted/50 border-border">
                          {log.entity}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.entityId?.length > 18 ? `${log.entityId.slice(0, 18)}...` : log.entityId}
                        </span>
                        {log.entityId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(log.entityId, 'Entity ID')}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                            title="Copy Entity ID"
                          >
                            {copiedId === log.entityId ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </TableCell>

                    {/* IP / Terminal */}
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Network className="size-3 text-zinc-400" />
                        <span>{log.ip || '—'}</span>
                      </div>
                      {log.deskId && (
                        <span className="text-[10px] text-muted-foreground block">
                          Desk: {log.deskId}
                        </span>
                      )}
                    </TableCell>

                    {/* Inspect Button */}
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="rounded-xl h-7 px-2.5 text-xs font-bold gap-1"
                        title={isBn ? 'বিস্তারিত দেখুন' : 'Inspect JSON payload'}
                      >
                        <Eye className="size-3.5" />
                        <span>{isBn ? 'ভিউ' : 'Inspect'}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>
              {isBn
                ? `মোট ${total}টি লগের মধ্যে ${total === 0 ? 0 : (page - 1) * limit + 1}–${Math.min(page * limit, total)} দেখাচ্ছে`
                : `Showing ${total === 0 ? 0 : (page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total} logs`}
            </span>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5">
              <span>{isBn ? 'প্রতি পৃষ্ঠায়:' : 'Rows:'}</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-16 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10" className="text-xs">10</SelectItem>
                  <SelectItem value="20" className="text-xs">20</SelectItem>
                  <SelectItem value="50" className="text-xs">50</SelectItem>
                  <SelectItem value="100" className="text-xs">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1"
            >
              <ChevronLeft className="size-3.5" />
              <span>{isBn ? 'পূর্ববর্তী' : 'Previous'}</span>
            </Button>
            <span className="text-xs font-mono font-semibold px-2">
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages || loading}
              className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1"
            >
              <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Detailed JSON & Changes Inspector Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent
          className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl"
          onClose={() => setSelectedLog(null)}
        >
          {selectedLog && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-emerald-500" />
                    <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                      {isBn ? 'অডিট ইভেন্ট বিস্তারিত' : 'Audit Event Details'}
                    </DialogTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    Log #{selectedLog.id}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {formatTimestamp(selectedLog.occurredAt)} • Request ID:{' '}
                  <span className="font-mono">{selectedLog.requestId || 'N/A'}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Metadata Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold">{isBn ? 'একশন' : 'Action'}:</span>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold">{isBn ? 'এনটিটি টার্গেট' : 'Target Entity'}:</span>
                  <div className="font-mono font-bold text-foreground mt-1 flex items-center gap-1 truncate">
                    <span>{selectedLog.entity}: {selectedLog.entityId}</span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold">{isBn ? 'সম্পাদনকারী' : 'Actor'}:</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-bold text-foreground">
                      {selectedLog.actorDisplayName || selectedLog.actorUserId || 'System'}
                    </span>
                    {getRoleBadge(selectedLog.actorRole)}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold">{isBn ? 'আইপি অ্যাড্রেস' : 'Client IP'}:</span>
                  <span className="font-mono text-foreground mt-0.5 block">{selectedLog.ip || '—'}</span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold">{isBn ? 'ডেস্ক / টার্মিনাল' : 'Desk ID'}:</span>
                  <span className="font-mono text-foreground mt-0.5 block">{selectedLog.deskId || 'None'}</span>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] font-semibold">{isBn ? 'রিকোয়েস্ট আইডি' : 'Request ID'}:</span>
                  <div className="flex items-center gap-1 font-mono text-foreground mt-0.5">
                    <span className="truncate max-w-[120px]">{selectedLog.requestId || 'None'}</span>
                    {selectedLog.requestId && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedLog.requestId!, 'Request ID')}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* JSON Changes Inspector: Before vs After */}
              <div className="space-y-3">
                {selectedLog.beforeJson && selectedLog.afterJson ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Before JSON */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span className="text-amber-600 dark:text-amber-400">
                          {isBn ? 'পূর্ববর্তী অবস্থা (Before)' : 'Before State'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedLog.beforeJson!, 'Before JSON')}
                          className="h-6 px-1.5 text-[11px] gap-1"
                        >
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </Button>
                      </div>
                      <pre className="p-3 rounded-xl bg-zinc-950 text-amber-200/90 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border border-border select-all">
                        <code>{formatJson(selectedLog.beforeJson)}</code>
                      </pre>
                    </div>

                    {/* After JSON */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {isBn ? 'পরিবর্তিত অবস্থা (After)' : 'After State'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedLog.afterJson!, 'After JSON')}
                          className="h-6 px-1.5 text-[11px] gap-1"
                        >
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </Button>
                      </div>
                      <pre className="p-3 rounded-xl bg-zinc-950 text-emerald-200/90 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 border border-border select-all">
                        <code>{formatJson(selectedLog.afterJson)}</code>
                      </pre>
                    </div>
                  </div>
                ) : selectedLog.afterJson ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span className="text-foreground">
                        {isBn ? 'ইভেন্ট পে-লোড (Event Payload / After State)' : 'Event Payload / Data'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(selectedLog.afterJson!, 'Payload JSON')}
                        className="h-6 px-2 text-[11px] gap-1"
                      >
                        <Copy className="size-3" />
                        <span>Copy JSON</span>
                      </Button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-zinc-950 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-80 border border-border select-all">
                      <code>{formatJson(selectedLog.afterJson)}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                    {isBn ? 'এই ইভেন্টের সাথে কোনো অতিরিক্ত JSON ডাটা সংরক্ষিত নেই।' : 'No additional JSON changes recorded for this event.'}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl text-xs font-bold px-4"
                >
                  {isBn ? 'বন্ধ করুন' : 'Close'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
