// apps/web/components/patient/PatientManagementView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  HeartPulse,
  Eye,
  Edit2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  FileText,
  Clock,
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
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  searchPatientsAction,
  type PatientRecord,
  type PatientDetailRecord,
} from '../../lib/actions/patients';
import { CreatePatientDialog } from './CreatePatientDialog';
import { EditPatientDialog } from './EditPatientDialog';
import { PatientDetailModal } from './PatientDetailModal';
import { PatientIntakeFormModal } from './PatientIntakeFormModal';
import { PatientTimelineModal } from './PatientTimelineModal';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export function PatientManagementView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data state
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatientForDetail, setSelectedPatientForDetail] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<PatientRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPatientForIntake, setSelectedPatientForIntake] = useState<any>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [selectedPatientForTimeline, setSelectedPatientForTimeline] = useState<{ id: string; name?: string } | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load patients
  const fetchPatients = useCallback(() => {
    startTransition(async () => {
      const res = await searchPatientsAction({
        query: debouncedQuery,
        page,
        limit: pageSize,
      });

      if (res.success && res.data) {
        setPatients(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages || 1);
      } else {
        toast.error(res.error || (isBn ? 'রোগী তালিকা লোড করতে ব্যর্থ হয়েছে' : 'Failed to load patients'));
      }
    });
  }, [debouncedQuery, page, pageSize, isBn]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Client-side filtering by gender and blood group
  const filteredPatients = patients.filter((p) => {
    if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
    if (bloodGroupFilter !== 'all' && p.bloodGroup !== bloodGroupFilter) return false;
    return true;
  });

  // Stats calculation
  const maleCount = patients.filter((p) => p.gender === 'male').length;
  const femaleCount = patients.filter((p) => p.gender === 'female').length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = patients.filter((p) => p.createdAt && p.createdAt.startsWith(todayStr)).length;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success(isBn ? 'ক্লিপবোর্ডে কপি করা হয়েছে' : 'Copied to clipboard');
  };

  const handlePatientCreated = (newPatient: PatientRecord) => {
    fetchPatients();
    setSelectedPatientForDetail(newPatient.id);
    setIsDetailOpen(true);
  };

  const handlePatientUpdated = () => {
    fetchPatients();
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Top Banner & KPI Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-border/60 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{isBn ? 'কেন্দ্রীয় রোগী ডিরেক্টরি ও ইএমআর' : 'Patient Directory & EMR'}</span>
                <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  {total} {isBn ? 'জন রোগী' : 'Patients'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isBn
                  ? 'সকল রোগীর ডিজিটাল প্রোফাইল, স্বয়ংক্রিয় MRN তৈরি, সিরিয়াল ও প্রেসক্রিপশন ইতিহাস'
                  : 'Centralized patient records, automatic HPC-2026 MRN sequence, visits & clinical EMR'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto h-10 px-4 sm:px-5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isBn ? 'নতুন রোগী নিবন্ধন' : 'Register New Patient'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Patients */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
            👥
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'মোট রোগী' : 'Total Patients'}
            </span>
            <span className="text-lg sm:text-2xl font-bold font-mono text-foreground">{total}</span>
          </div>
        </div>

        {/* Male Patients */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
            👨
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'পুরুষ রোগী' : 'Male'}
            </span>
            <span className="text-lg sm:text-2xl font-bold font-mono text-foreground">{maleCount}</span>
          </div>
        </div>

        {/* Female Patients */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg shrink-0">
            👩
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'মহিলা রোগী' : 'Female'}
            </span>
            <span className="text-lg sm:text-2xl font-bold font-mono text-foreground">{femaleCount}</span>
          </div>
        </div>

        {/* Registered Today */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
            ⚡
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'আজকে নিবন্ধিত' : 'Registered Today'}
            </span>
            <span className="text-lg sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              +{todayCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder={
                  isBn
                    ? 'MRN, নাম, মোবাইল (০১XXXXXXXXX), ইমেইল বা ঠিকানা দিয়ে খুঁজুন...'
                    : 'Search by MRN, name, phone (01XXXXXXXXX), email, or address...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-xs sm:text-sm bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Gender Filter */}
              <Select
                value={genderFilter}
                onValueChange={(val: 'all' | 'male' | 'female') => setGenderFilter(val)}
              >
                <SelectTrigger className="w-[125px] sm:w-[135px] h-10 text-xs">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'সব লিঙ্গ' : 'All Genders'}</SelectItem>
                  <SelectItem value="male">👨 {isBn ? 'পুরুষ' : 'Male'}</SelectItem>
                  <SelectItem value="female">👩 {isBn ? 'মহিলা' : 'Female'}</SelectItem>
                </SelectContent>
              </Select>

              {/* Blood Group Filter */}
              <Select
                value={bloodGroupFilter}
                onValueChange={(val: string) => setBloodGroupFilter(val)}
              >
                <SelectTrigger className="w-[115px] sm:w-[125px] h-10 text-xs">
                  <SelectValue placeholder="Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isBn ? 'সব রক্ত গ্রুপ' : 'All Blood'}</SelectItem>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      🩸 {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                onClick={fetchPatients}
                disabled={isPending}
                className="h-10 w-10 shrink-0 cursor-pointer"
                title={isBn ? 'রিফ্রেশ' : 'Refresh'}
              >
                <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-emerald-600' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Presentation */}
      {filteredPatients.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80">
          <CardContent className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base sm:text-lg text-foreground">
                {isBn ? 'কোনো রোগী পাওয়া যায়নি' : 'No Patients Found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                {searchQuery
                  ? isBn
                    ? `"${searchQuery}" এর সাথে মিলে এমন কোনো রোগী নেই। ফিল্টার পরিবর্তন করুন বা নতুন নিবন্ধন করুন।`
                    : `No registered patients matched "${searchQuery}". Check search query or register a new patient.`
                  : isBn
                    ? 'সিস্টেমে এখনও কোনো রোগী নিবন্ধিত হয়নি।'
                    : 'No patients registered in the database yet.'}
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm mt-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isBn ? 'নতুন রোগী নিবন্ধন করুন' : 'Register New Patient'}</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card Stack View (Hidden on md/lg/xl/tv screens) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs space-y-3 shadow-xs"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-foreground truncate">
                        {patient.nameEn}
                      </span>
                      {patient.nameBn && (
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          ({patient.nameBn})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* MRN badge */}
                      <button
                        onClick={() => copyToClipboard(patient.mrn, patient.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold"
                      >
                        <span>{patient.mrn}</span>
                        {copiedId === patient.id ? (
                          <Check className="w-2.5 h-2.5" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 opacity-60" />
                        )}
                      </button>

                      {/* Gender badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 px-1.5 ${
                          patient.gender === 'female'
                            ? 'border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                            : 'border-blue-300 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                        }`}
                      >
                        {patient.gender === 'female' ? '👩 Female' : '👨 Male'}
                      </Badge>

                      {/* Age */}
                      {patient.ageYears !== null && patient.ageYears !== undefined && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {patient.ageYears} {isBn ? 'বছর' : 'yrs'}
                        </span>
                      )}

                      {/* Blood Group */}
                      {patient.bloodGroup && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-300 text-rose-600">
                          🩸 {patient.bloodGroup}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details snippet */}
                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <a href={`tel:${patient.phone}`} className="font-mono text-foreground font-semibold">
                        {patient.phone}
                      </a>
                    </span>
                    {patient.occupation && (
                      <span className="truncate max-w-[150px] italic text-[11px]">
                        {patient.occupation}
                      </span>
                    )}
                  </div>

                  {patient.address && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{patient.address}</span>
                    </div>
                  )}

                  {patient.notes && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                      <FileText className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate italic">{patient.notes}</span>
                    </div>
                  )}

                  {/* Medical flags */}
                  {(patient.allergies || patient.chronicConditions || patient.contraindications) && (
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {patient.allergies && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Allergies</span>
                        </span>
                      )}
                      {patient.chronicConditions && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium">
                          <HeartPulse className="w-2.5 h-2.5" />
                          <span>Chronic</span>
                        </span>
                      )}
                      {patient.contraindications && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-medium">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Alert</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Touch Actions Button Bar */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPatientForDetail(patient.id);
                      setIsDetailOpen(true);
                    }}
                    className="h-10 text-xs font-semibold gap-1.5 cursor-pointer touch-manipulation"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isBn ? 'প্রোফাইল দেখুন' : 'View Profile'}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPatientForEdit(patient);
                      setIsEditOpen(true);
                    }}
                    className="h-10 text-xs font-semibold gap-1.5 cursor-pointer touch-manipulation"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / Laptop / TV Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">{isBn ? 'রোগী ও MRN' : 'Patient & MRN'}</th>
                    <th className="py-3 px-4">{isBn ? 'যোগাযোগ' : 'Contact'}</th>
                    <th className="py-3 px-4">{isBn ? 'লিঙ্গ ও বয়স' : 'Gender & Age'}</th>
                    <th className="py-3 px-4">{isBn ? 'রক্তের গ্রুপ' : 'Blood'}</th>
                    <th className="py-3 px-4">{isBn ? 'পেশা ও ঠিকানা' : 'Profession & Address'}</th>
                    <th className="py-3 px-4">{isBn ? 'মেডিকেল অ্যালার্ট' : 'Clinical Alerts'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'একশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedPatientForDetail(patient.id);
                        setIsDetailOpen(true);
                      }}
                    >
                      {/* Name & MRN */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                              {patient.nameEn}
                            </span>
                            {patient.nameBn && (
                              <span className="text-xs text-muted-foreground font-medium">
                                ({patient.nameBn})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(patient.mrn, patient.id);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold hover:bg-emerald-500/20 transition-all"
                            title="Click to copy MRN"
                          >
                            <span>{patient.mrn}</span>
                            {copiedId === patient.id ? (
                              <Check className="w-2.5 h-2.5" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-60" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <a
                              href={`tel:${patient.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:underline"
                            >
                              {patient.phone}
                            </a>
                          </div>
                          {patient.email ? (
                            <span className="text-[11px] text-muted-foreground truncate block max-w-[160px]">
                              {patient.email}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic block">—</span>
                          )}
                        </div>
                      </td>

                      {/* Gender & Age */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-1.5 ${
                              patient.gender === 'female'
                                ? 'border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                                : 'border-blue-300 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                            }`}
                          >
                            {patient.gender === 'female' ? '👩 Female' : '👨 Male'}
                          </Badge>
                          {patient.ageYears !== null && patient.ageYears !== undefined && (
                            <span className="font-mono text-xs text-foreground font-medium">
                              {patient.ageYears} yrs
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Blood Group */}
                      <td className="py-3 px-4">
                        {patient.bloodGroup ? (
                          <Badge variant="outline" className="font-mono font-bold text-xs border-rose-300 text-rose-600 dark:text-rose-400">
                            🩸 {patient.bloodGroup}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        )}
                      </td>

                      {/* Profession & Address */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-foreground truncate block">
                            {patient.occupation || '—'}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {patient.address || '—'}
                          </span>
                          {patient.notes && (
                            <span className="text-[10px] text-muted-foreground italic truncate block" title={patient.notes}>
                              📝 {patient.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Clinical Alerts */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {patient.allergies && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-500/10" title={patient.allergies}>
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                              Allergies
                            </Badge>
                          )}
                          {patient.chronicConditions && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10" title={patient.chronicConditions}>
                              <HeartPulse className="w-2.5 h-2.5 mr-1" />
                              Chronic
                            </Badge>
                          )}
                          {patient.contraindications && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-500/10" title={patient.contraindications}>
                              Alert
                            </Badge>
                          )}
                          {!patient.allergies && !patient.chronicConditions && !patient.contraindications && (
                            <span className="text-[11px] text-muted-foreground/60 italic">None</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPatientForIntake(patient);
                              setIsIntakeOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-teal-600 cursor-pointer"
                            title={isBn ? 'প্রাথমিক তথ্য ফরম' : 'Intake Form'}
                          >
                            <FileText className="w-3.5 h-3.5 text-teal-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPatientForTimeline({
                                id: patient.id,
                                name: isBn ? patient.nameBn || patient.nameEn : patient.nameEn,
                              });
                              setIsTimelineOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-purple-600 cursor-pointer"
                            title={isBn ? 'টাইমলাইন' : 'Timeline'}
                          >
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPatientForDetail(patient.id);
                              setIsDetailOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-emerald-600 cursor-pointer"
                            title="View EMR"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPatientForEdit(patient);
                              setIsEditOpen(true);
                            }}
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-blue-600 cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{isBn ? 'প্রতি পাতায় প্রদর্শন:' : 'Rows per page:'}</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val: string) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>
                {isBn
                  ? `মোট ${total} টির মধ্যে ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}`
                  : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isPending}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{isBn ? 'পূর্ববর্তী' : 'Previous'}</span>
              </Button>

              <span className="font-mono px-2 font-bold text-foreground">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isPending}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <span>{isBn ? 'পরবর্তী' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <CreatePatientDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handlePatientCreated}
      />

      <PatientDetailModal
        patientId={selectedPatientForDetail}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(p) => {
          setIsDetailOpen(false);
          setSelectedPatientForEdit(p);
          setIsEditOpen(true);
        }}
      />

      <EditPatientDialog
        patient={selectedPatientForEdit}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={handlePatientUpdated}
      />

      <PatientIntakeFormModal
        open={isIntakeOpen}
        onOpenChange={setIsIntakeOpen}
        patient={selectedPatientForIntake}
        onSuccess={() => {
          toast.success(isBn ? 'প্রাথমিক তথ্য ফরম সংরক্ষিত হয়েছে!' : 'Intake form saved!');
        }}
      />

      <PatientTimelineModal
        open={isTimelineOpen}
        onOpenChange={setIsTimelineOpen}
        patientId={selectedPatientForTimeline?.id}
        patientName={selectedPatientForTimeline?.name}
      />
    </div>
  );
}
