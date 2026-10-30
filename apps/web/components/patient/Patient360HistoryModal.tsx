// apps/web/components/patient/Patient360HistoryModal.tsx
'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  User,
  Phone,
  Calendar,
  Clock,
  FileText,
  Activity,
  Stethoscope,
  Receipt,
  AlertTriangle,
  HeartPulse,
  Printer,
  RefreshCw,
  X,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { api } from '../../lib/api';
import { getLegacyFileInfo } from '../../lib/legacy-patient';

function toBnDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(value).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

interface Patient360HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  patientData?: any;
}

export function Patient360HistoryModal({
  open,
  onOpenChange,
  patientId,
  patientData: initialPatientData,
}: Patient360HistoryModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<'timeline' | 'consultations' | 'therapy' | 'plans' | 'intake' | 'billing'>('timeline');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(initialPatientData || null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [therapySessions, setTherapySessions] = useState<any[]>([]);
  const [intakeForms, setIntakeForms] = useState<any[]>([]);
  const [assessmentFiles, setAssessmentFiles] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any>(null);

  const targetId = patientId || initialPatientData?.id;

  const loadAllHistory = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [
        pData,
        timelineRes,
        prescriptsRes,
        plansRes,
        sessionsRes,
        intakesRes,
        assessRes,
        billRes,
      ] = await Promise.all([
        api.patients.getById(targetId).catch(() => null),
        api.patients.getHistory ? api.patients.getHistory(targetId).catch(() => []) : Promise.resolve([]),
        api.prescriptions.getByPatientId(targetId).catch(() => []),
        api.therapy.getPlans(targetId).catch(() => []),
        api.therapy.getSessionsByPatientId ? api.therapy.getSessionsByPatientId(targetId).catch(() => []) : Promise.resolve([]),
        api.patients.listIntakeForms({ patientId: targetId }).catch(() => []),
        api.patients.listAssessmentFiles ? api.patients.listAssessmentFiles(targetId).catch(() => []) : Promise.resolve([]),
        api.billing.getPatientBilling(targetId).catch(() => null),
      ]);

      if (pData) setPatient(pData);
      else if (initialPatientData) setPatient(initialPatientData);

      if (Array.isArray(timelineRes)) setTimelineEvents(timelineRes);
      if (Array.isArray(prescriptsRes)) setPrescriptions(prescriptsRes);
      if (Array.isArray(plansRes)) setPlans(plansRes);
      if (Array.isArray(sessionsRes)) setTherapySessions(sessionsRes);
      if (Array.isArray(intakesRes)) setIntakeForms(intakesRes);
      if (Array.isArray(assessRes)) setAssessmentFiles(assessRes);
      if (billRes) setBillingData(billRes);
    } catch (err: any) {
      console.error('Failed to load patient 360 history:', err);
      toast.error(isBn ? 'ইতিহাস লোড করতে ব্যর্থ হয়েছে' : 'Failed to load patient history');
    } finally {
      setLoading(false);
    }
  }, [targetId, initialPatientData, isBn]);

  useEffect(() => {
    if (open && targetId) {
      loadAllHistory();
    }
  }, [open, targetId, loadAllHistory]);

  const handlePrintA4 = () => {
    window.print();
  };

  const displayName = isBn
    ? patient?.nameBn || patient?.nameEn || patient?.name || 'রোগী'
    : patient?.nameEn || patient?.name || patient?.nameBn || 'Patient';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card">
        {/* Header Bar */}
        <DialogHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold">
                  MRN: {patient?.mrn || 'N/A'}
                </Badge>
                {(() => {
                  const leg = patient?.legacyId || getLegacyFileInfo(patient).fileNo;
                  if (!leg) return null;
                  return (
                    <Badge variant="outline" className="font-mono text-xs border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold">
                      📁 #{leg}
                    </Badge>
                  );
                })()}
                <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  <span>{displayName}</span>
                </DialogTitle>
                {patient?.gender && (
                  <Badge variant="secondary" className="text-xs">
                    {patient.gender === 'male' ? (isBn ? 'পুরুষ' : 'Male') : (isBn ? 'নারী' : 'Female')}
                  </Badge>
                )}
                {patient?.ageYears && (
                  <Badge variant="secondary" className="text-xs">
                    {isBn ? `${toBnDigits(patient.ageYears)} বছর` : `${patient.ageYears} yrs`}
                  </Badge>
                )}
                {patient?.bloodGroup && (
                  <Badge variant="outline" className="font-mono text-xs border-rose-300 text-rose-600 dark:text-rose-400">
                    🩸 {patient.bloodGroup}
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-4 flex-wrap">
                {patient?.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {isBn ? toBnDigits(patient.phone) : patient.phone}
                  </span>
                )}
                {patient?.address && (
                  <span className="truncate max-w-xs">
                    📍 {patient.address}
                  </span>
                )}
                {patient?.emergencyContact && (
                  <span className="text-amber-600 dark:text-amber-400">
                    🚨 {isBn ? 'জরুরি যোগাযোগ:' : 'Emergency:'} {patient.emergencyContact}
                  </span>
                )}
              </DialogDescription>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAllHistory}
                disabled={loading}
                className="gap-1.5 text-xs h-8 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handlePrintA4}
                className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isBn ? 'প্রিন্ট রিপোর্ট (A4)' : 'Print Report (A4)'}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Clinical Alerts Strip */}
        {(patient?.allergies || patient?.chronicConditions || patient?.contraindications) && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2.5 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200 shrink-0 flex-wrap">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">{isBn ? 'ক্লিনিক্যাল সতর্কতা:' : 'Clinical Alerts:'}</span>
            {patient.allergies && (
              <Badge variant="outline" className="border-amber-400 bg-amber-500/20 text-[11px] py-0">
                {isBn ? 'অ্যালার্জি:' : 'Allergies:'} {patient.allergies}
              </Badge>
            )}
            {patient.chronicConditions && (
              <Badge variant="outline" className="border-indigo-400 bg-indigo-500/20 text-[11px] py-0">
                {isBn ? 'দীর্ঘস্থায়ী রোগ:' : 'Chronic:'} {patient.chronicConditions}
              </Badge>
            )}
            {patient.contraindications && (
              <Badge variant="outline" className="border-rose-400 bg-rose-500/20 text-[11px] py-0 text-rose-700 dark:text-rose-300">
                {isBn ? 'নিষেধাজ্ঞা:' : 'Contraindications:'} {patient.contraindications}
              </Badge>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col min-h-0">
          <div className="border-b border-border/80 px-5 bg-background shrink-0">
            <TabsList className="h-11 bg-transparent p-0 gap-6 border-b-0">
              <TabsTrigger
                value="timeline"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 px-1 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>{isBn ? `৩৬০° টাইমলাইন (${toBnDigits(timelineEvents.length)})` : `360° Timeline (${timelineEvents.length})`}</span>
              </TabsTrigger>
              <TabsTrigger
                value="consultations"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 px-1 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4" />
                <span>{isBn ? `প্রেসক্রিপশন ও কনসালটেশন (${toBnDigits(prescriptions.length)})` : `Prescriptions (${prescriptions.length})`}</span>
              </TabsTrigger>
              <TabsTrigger
                value="therapy"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 px-1 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>{isBn ? `থেরাপি সেশন ও মডালিটিজ (${toBnDigits(therapySessions.length)})` : `Therapy Sessions (${therapySessions.length})`}</span>
              </TabsTrigger>
              <TabsTrigger
                value="plans"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 px-1 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>{isBn ? `ট্রিটমেন্ট প্ল্যান (${toBnDigits(plans.length)})` : `Treatment Plans (${plans.length})`}</span>
              </TabsTrigger>
              <TabsTrigger
                value="intake"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 px-1 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{isBn ? `অ্যাসেসমেন্ট ও ইনটেক (${toBnDigits(intakeForms.length + assessmentFiles.length)})` : `Intake & Assessment (${intakeForms.length + assessmentFiles.length})`}</span>
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 px-1 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>{isBn ? 'বিলিং ও পেমেন্ট হিস্ট্রি' : 'Billing & Invoices'}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* 1. Timeline Tab */}
            <TabsContent value="timeline" className="m-0 space-y-4">
              {timelineEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {isBn ? 'কোনো টাইমলাইন রেকর্ড পাওয়া যায়নি।' : 'No timeline events recorded for this patient.'}
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {timelineEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative flex items-start gap-4">
                      <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-background bg-emerald-500 flex items-center justify-center shrink-0 shadow-xs">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                      <div className="flex-1 bg-card rounded-xl p-3.5 border border-border/80 shadow-xs space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {isBn ? evt.titleBn || evt.title || evt.action : evt.title || evt.titleBn || evt.action}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {new Date(evt.occurredAt || evt.createdAt).toLocaleString(isBn ? 'bn-BD' : 'en-US')}
                          </span>
                        </div>
                        {evt.description && (
                          <p className="text-xs text-muted-foreground">
                            {evt.description}
                          </p>
                        )}
                        {evt.actorRole && (
                          <div className="pt-1 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                            <span>{isBn ? 'কর্তৃপক্ষ:' : 'By:'} {evt.actorRole}</span>
                            {evt.location && <span>• {evt.location}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 2. Prescriptions & Consultations Tab */}
            <TabsContent value="consultations" className="m-0 space-y-4">
              {prescriptions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {isBn ? 'কোনো প্রেসক্রিপশন রেকর্ড পাওয়া যায়নি।' : 'No prescriptions recorded for this patient.'}
                </div>
              ) : (
                prescriptions.map((p, idx) => (
                  <Card key={p.id || idx} className="border-border/80 rounded-xl overflow-hidden shadow-xs">
                    <CardHeader className="bg-muted/30 p-4 border-b border-border/80 flex flex-row items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-emerald-500" />
                          <span>
                            {(() => {
                              const raw = (p.doctorName || '').trim();
                              const clean = raw.replace(/^(?:ডাঃ|ডা\.|ডাক্তার|Dr\.|Dr\b|Doctor\b)\s*/i, '').trim();
                              if (clean) return isBn ? `ডাক্তার ${clean}` : `Doctor ${clean}`;
                              return isBn ? 'ডাক্তার বিশেষজ্ঞ' : 'Doctor Specialist';
                            })()}
                          </span>
                        </CardTitle>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(p.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      {p.diagnosis && (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs font-semibold">
                          {p.diagnosis}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {p.symptoms && (
                        <div>
                          <span className="text-xs font-bold text-muted-foreground uppercase">{isBn ? 'উপসর্গ / চিফ কমপ্লেইন্টস:' : 'Chief Symptoms:'}</span>
                          <p className="text-xs text-foreground mt-0.5">{p.symptoms}</p>
                        </div>
                      )}
                      {p.items && p.items.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-muted-foreground uppercase">{isBn ? 'নির্ধারিত ঔষধসমূহ:' : 'Prescribed Medicines:'}</span>
                          <div className="overflow-x-auto mt-1.5 border border-border/70 rounded-lg">
                            <table className="w-full text-xs">
                              <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
                                <tr>
                                  <th className="py-2 px-3 text-left font-semibold">{isBn ? 'ঔষধের নাম' : 'Medicine'}</th>
                                  <th className="py-2 px-3 text-left font-semibold">{isBn ? 'ডোজ' : 'Dosage'}</th>
                                  <th className="py-2 px-3 text-left font-semibold">{isBn ? 'ফ্রিকোয়েন্সি' : 'Frequency'}</th>
                                  <th className="py-2 px-3 text-left font-semibold">{isBn ? 'সময়কাল' : 'Duration'}</th>
                                  <th className="py-2 px-3 text-left font-semibold">{isBn ? 'নির্দেশনা' : 'Instructions'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {p.items.map((it: any, iIdx: number) => (
                                  <tr key={it.id || iIdx} className="hover:bg-muted/20">
                                    <td className="py-2 px-3 font-semibold text-foreground">{it.medicineName || it.name}</td>
                                    <td className="py-2 px-3">{it.dosage || '—'}</td>
                                    <td className="py-2 px-3">{it.frequency || '—'}</td>
                                    <td className="py-2 px-3">{it.duration || '—'}</td>
                                    <td className="py-2 px-3 text-muted-foreground">{it.instructions || 'খাবার পর'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      {p.advice && (
                        <div className="bg-muted/20 rounded-lg p-2.5 text-xs text-muted-foreground">
                          <span className="font-bold text-foreground mr-1.5">{isBn ? 'পরামর্শ ও নির্দেশিকা:' : 'Doctor Advice:'}</span>
                          {p.advice}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 3. Therapy Sessions & Modalities Tab */}
            <TabsContent value="therapy" className="m-0 space-y-4">
              {therapySessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {isBn ? 'কোনো থেরাপি সেশন রেকর্ড পাওয়া যায়নি।' : 'No therapy sessions recorded for this patient.'}
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-xl shadow-xs bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 border-b border-border/80 text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4 text-left font-semibold">{isBn ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                        <th className="py-3 px-4 text-left font-semibold">{isBn ? 'মডালিটি' : 'Modality'}</th>
                        <th className="py-3 px-4 text-left font-semibold">{isBn ? 'সময়কাল' : 'Duration'}</th>
                        <th className="py-3 px-4 text-left font-semibold">{isBn ? 'ব্যথা মাত্রা' : 'Pain Score'}</th>
                        <th className="py-3 px-4 text-left font-semibold">{isBn ? 'থেরাপিস্ট' : 'Therapist'}</th>
                        <th className="py-3 px-4 text-left font-semibold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="py-3 px-4 text-left font-semibold">{isBn ? 'মন্তব্য' : 'Outcome Note'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {therapySessions.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {new Date(s.startedAt || s.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="font-semibold text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                              {isBn ? s.modalityNameBn || s.modalityCode : s.modalityNameEn || s.modalityCode}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {isBn ? `${toBnDigits(s.durationMinutes)} মিনিট` : `${s.durationMinutes} min`}
                          </td>
                          <td className="py-3 px-4">
                            {s.painScoreAfter !== null && s.painScoreAfter !== undefined ? (
                              <div className="flex items-center gap-1 font-bold">
                                <span className={s.painScoreAfter <= 3 ? 'text-emerald-600' : s.painScoreAfter <= 6 ? 'text-amber-600' : 'text-rose-600'}>
                                  {isBn ? toBnDigits(s.painScoreAfter) : s.painScoreAfter}/10
                                </span>
                                <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {s.therapistName || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="text-[10px]">
                              {s.status === 'completed' ? (isBn ? 'সম্পন্ন' : 'Completed') : (isBn ? 'চলমান' : 'Active')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate" title={s.outcomeNote}>
                            {s.outcomeNote || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* 4. Treatment Plans Tab */}
            <TabsContent value="plans" className="m-0 space-y-4">
              {plans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {isBn ? 'কোনো ট্রিটমেন্ট প্ল্যান রেকর্ড পাওয়া যায়নি।' : 'No treatment plans recorded for this patient.'}
                </div>
              ) : (
                plans.map((pl, idx) => (
                  <Card key={pl.id || idx} className="border-border/80 rounded-xl overflow-hidden shadow-xs">
                    <CardHeader className="bg-muted/30 p-4 border-b border-border/80 flex flex-row items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-500" />
                          <span>{isBn ? pl.titleBn || pl.title || 'রিহ্যাবিলিটেশন প্ল্যান' : pl.title || pl.titleBn || 'Rehabilitation Plan'}</span>
                        </CardTitle>
                        <span className="text-xs text-muted-foreground font-mono">
                          {isBn ? `নির্ধারিত সেশন: ${toBnDigits(pl.totalSessionsPrescribed || 10)} টি` : `Prescribed: ${pl.totalSessionsPrescribed || 10} sessions`}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        {pl.status === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'সম্পন্ন' : 'Completed')}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2 text-xs">
                      {pl.modalityCode && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-muted-foreground">{isBn ? 'প্রধান মডালিটি:' : 'Primary Modality:'}</span>
                          <Badge variant="secondary">{pl.modalityCode}</Badge>
                        </div>
                      )}
                      {pl.instructions && (
                        <div className="bg-muted/20 rounded-lg p-2.5 text-muted-foreground">
                          <span className="font-bold text-foreground mr-1.5">{isBn ? 'থেরাপি নির্দেশনা:' : 'Instructions:'}</span>
                          {pl.instructions}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 5. Intake & Clinical Assessments Tab */}
            <TabsContent value="intake" className="m-0 space-y-4">
              {intakeForms.length === 0 && assessmentFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {isBn ? 'কোনো প্রাথমিক তথ্য বা অ্যাসেসমেন্ট ফরম পাওয়া যায়নি।' : 'No intake or assessment forms recorded.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {intakeForms.map((intake, idx) => (
                    <Card key={intake.id || idx} className="border-border/80 rounded-xl overflow-hidden shadow-xs">
                      <CardHeader className="bg-muted/30 p-4 border-b border-border/80 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-teal-600" />
                            <span>{isBn ? 'রোগীর প্রাথমিক তথ্য ও মূল্যায়ন (Intake Form)' : 'Patient Intake Assessment'}</span>
                          </CardTitle>
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(intake.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}
                          </span>
                        </div>
                        {intake.painScore && (
                          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs">
                            {isBn ? `ব্যথার মাত্রা: ${toBnDigits(intake.painScore)}/১০` : `Pain Score: ${intake.painScore}/10`}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-bold text-muted-foreground">{isBn ? 'প্রধান সমস্যা / ব্যথার স্থান:' : 'Chief Complaints / Pain Areas:'}</span>
                          <p className="text-foreground mt-0.5">{intake.chiefComplaints || intake.painAreas || '—'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-muted-foreground">{isBn ? 'ব্যথার সময়কাল ও ধরন:' : 'Duration & Nature:'}</span>
                          <p className="text-foreground mt-0.5">{intake.painDuration || '—'} • {intake.painType || '—'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-muted-foreground">{isBn ? 'শারীরিক পরীক্ষা / রেঞ্জ অফ মোশন:' : 'Physical Exam & ROM:'}</span>
                          <p className="text-foreground mt-0.5">{intake.physicalExamFindings || intake.rom || 'Normal'}</p>
                        </div>
                        <div>
                          <span className="font-bold text-muted-foreground">{isBn ? 'অতিরিক্ত ক্লিনিক্যাল নোট:' : 'Clinical Notes:'}</span>
                          <p className="text-foreground mt-0.5">{intake.notes || '—'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 6. Billing & Invoices Tab */}
            <TabsContent value="billing" className="m-0 space-y-4">
              {!billingData || (!billingData.bills?.length && !billingData.dues?.length) ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {isBn ? 'কোনো বিলিং রেকর্ড পাওয়া যায়নি।' : 'No billing or invoice records found for this patient.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {billingData.bills?.map((b: any, idx: number) => (
                    <Card key={b.id || idx} className="border-border/80 rounded-xl overflow-hidden shadow-xs">
                      <CardHeader className="bg-muted/30 p-4 border-b border-border/80 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-blue-600" />
                            <span>{b.billNumber || `BILL-${b.id.slice(-6)}`}</span>
                          </CardTitle>
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(b.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}
                          </span>
                        </div>
                        <Badge
                          variant={b.status === 'posted' || b.duePaisa === 0 ? 'default' : 'outline'}
                          className={b.status === 'posted' || b.duePaisa === 0 ? 'bg-emerald-600 text-white' : 'border-amber-500 text-amber-600'}
                        >
                          {b.duePaisa === 0 ? (isBn ? 'পরিশোধিত' : 'Paid') : (isBn ? `বকেয়া: ৳${toBnDigits((b.duePaisa / 100).toFixed(0))}` : `Due: BDT ${(b.duePaisa / 100).toFixed(0)}`)}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                          <span className="text-muted-foreground">{isBn ? 'মোট ফি:' : 'Total Amount:'}</span>
                          <span className="font-bold font-mono">৳{toBnDigits((b.totalPaisa / 100).toFixed(0))}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                          <span className="text-muted-foreground">{isBn ? 'পরিশোধ:' : 'Paid:'}</span>
                          <span className="font-bold text-emerald-600 font-mono">৳{toBnDigits((b.paidPaisa / 100).toFixed(0))}</span>
                        </div>
                        {b.duePaisa > 0 && (
                          <div className="flex items-center justify-between text-rose-600 font-bold">
                            <span>{isBn ? 'অবশিষ্ট বকেয়া:' : 'Due Balance:'}</span>
                            <span className="font-mono">৳{toBnDigits((b.duePaisa / 100).toFixed(0))}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
