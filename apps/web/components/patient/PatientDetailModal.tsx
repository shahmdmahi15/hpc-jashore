// apps/web/components/patient/PatientDetailModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  HeartPulse,
  AlertTriangle,
  Briefcase,
  Printer,
  Edit2,
  Copy,
  Check,
  CheckCircle2,
  Package,
  CreditCard,
  History,
  ShieldCheck,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { getPatientDetailAction, type PatientDetailRecord, type PatientRecord } from '../../lib/actions/patients';

interface PatientDetailModalProps {
  patientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (patient: PatientRecord) => void;
}

export function PatientDetailModal({
  patientId,
  open,
  onOpenChange,
  onEdit,
}: PatientDetailModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<PatientDetailRecord | null>(null);
  const [copiedMrn, setCopiedMrn] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (patientId && open) {
      setLoading(true);
      getPatientDetailAction(patientId)
        .then((res) => {
          if (res.success && res.data) {
            setDetail(res.data);
          } else {
            toast.error(res.error || 'Failed to load patient records');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [patientId, open]);

  const copyToClipboard = (text: string, type: 'mrn' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'mrn') {
      setCopiedMrn(true);
      setTimeout(() => setCopiedMrn(false), 2000);
      toast.success(isBn ? 'MRN কপি করা হয়েছে' : 'MRN copied to clipboard');
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
      toast.success(isBn ? 'ফোন নম্বর কপি করা হয়েছে' : 'Phone copied');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {loading || !detail ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isBn ? 'রোগীর রেকর্ড লোড হচ্ছে...' : 'Loading patient records...'}
            </p>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <DialogHeader className="p-4 sm:p-6 border-b border-border/60 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl shrink-0">
                    {detail.gender === 'female' ? '👩' : '👨'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                        {detail.nameEn}
                      </DialogTitle>
                      {detail.nameBn && (
                        <span className="text-sm sm:text-base text-muted-foreground font-medium">
                          ({detail.nameBn})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* MRN badge */}
                      <button
                        onClick={() => copyToClipboard(detail.mrn, 'mrn')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold hover:bg-emerald-500/25 transition-all cursor-pointer"
                        title="Click to copy MRN"
                      >
                        <span>MRN: {detail.mrn}</span>
                        {copiedMrn ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-60" />}
                      </button>

                      {/* Gender badge */}
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold ${
                          detail.gender === 'female'
                            ? 'border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                            : 'border-blue-300 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                        }`}
                      >
                        {detail.gender === 'female' ? (isBn ? 'মহিলা' : 'Female') : (isBn ? 'পুরুষ' : 'Male')}
                      </Badge>

                      {/* Age */}
                      {detail.ageYears !== null && detail.ageYears !== undefined && (
                        <Badge variant="secondary" className="text-[11px] font-mono">
                          {detail.ageYears} {isBn ? 'বছর' : 'yrs'}
                        </Badge>
                      )}

                      {/* Blood Group */}
                      {detail.bloodGroup && (
                        <Badge variant="outline" className="text-[11px] font-mono font-bold border-rose-300 text-rose-600 dark:text-rose-400">
                          🩸 {detail.bloodGroup}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onEdit(detail);
                      }}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isBn ? 'সম্পাদনা' : 'Edit'}</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrint}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Medical Alerts (if any) */}
              {(detail.allergies || detail.chronicConditions || detail.contraindications) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {detail.allergies && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ঔষধ/খাদ্য এলার্জি' : 'Allergies'}</span>
                      </div>
                      <p className="text-xs font-medium">{detail.allergies}</p>
                    </div>
                  )}

                  {detail.chronicConditions && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-900 dark:text-indigo-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <HeartPulse className="w-3.5 h-3.5" />
                        <span>{isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</span>
                      </div>
                      <p className="text-xs font-medium">{detail.chronicConditions}</p>
                    </div>
                  )}

                  {detail.contraindications && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{isBn ? 'সতর্কতা / কন্ট্রাইনডিকেশন' : 'Contraindications'}</span>
                      </div>
                      <p className="text-xs font-medium">{detail.contraindications}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Patient Demographics & Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
                {/* Phone */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{isBn ? 'মোবাইল নম্বর' : 'Phone Number'}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${detail.phone}`}
                      className="font-mono text-sm font-semibold text-foreground hover:text-emerald-600 transition-colors"
                    >
                      {detail.phone}
                    </a>
                    <button
                      onClick={() => copyToClipboard(detail.phone, 'phone')}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy phone"
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-500" />
                    <span>{isBn ? 'ইমেইল' : 'Email'}</span>
                  </span>
                  <p className="text-sm font-medium text-foreground truncate">
                    {detail.email ? (
                      <a href={`mailto:${detail.email}`} className="hover:underline">
                        {detail.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">{isBn ? 'দেওয়া হয়নি' : 'Not provided'}</span>
                    )}
                  </p>
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-500" />
                    <span>{isBn ? 'বয়স' : 'Age'}</span>
                  </span>
                  <p className="text-sm font-mono font-medium text-foreground">
                    {detail.ageYears !== null && detail.ageYears !== undefined
                      ? `${detail.ageYears} ${isBn ? 'বছর' : 'Years'}`
                      : (isBn ? 'দেওয়া হয়নি' : 'Not recorded')}
                  </p>
                </div>

                {/* Profession */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-purple-500" />
                    <span>{isBn ? 'পেশা' : 'Profession'}</span>
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {detail.occupation || <span className="text-muted-foreground italic text-xs">{isBn ? 'দেওয়া হয়নি' : 'Not provided'}</span>}
                  </p>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3 text-rose-500" />
                    <span>{isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}</span>
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {detail.emergencyContact || <span className="text-muted-foreground italic text-xs">{isBn ? 'দেওয়া হয়নি' : 'None'}</span>}
                  </p>
                </div>

                {/* Address */}
                <div className="space-y-1 sm:col-span-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>{isBn ? 'বর্তমান ঠিকানা' : 'Residential Address'}</span>
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    {detail.address || <span className="text-muted-foreground italic text-xs">{isBn ? 'দেওয়া হয়নি' : 'Not provided'}</span>}
                  </p>
                </div>

                {/* Notes & Special Remarks */}
                {detail.notes && (
                  <div className="space-y-1 sm:col-span-3 pt-2 border-t border-border/40">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3 text-emerald-600" />
                      <span>{isBn ? 'মন্তব্য ও নির্দেশনা (Notes)' : 'Patient Notes & Remarks'}</span>
                    </span>
                    <p className="text-sm font-medium text-foreground whitespace-pre-wrap bg-background/50 p-2.5 rounded-lg border border-border/40">
                      {detail.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Sub-tabs: Visits History, Therapy Packages, Outstanding Dues */}
              <Tabs defaultValue="visits" className="w-full">
                <TabsList className="h-9 p-1 bg-muted/60 border border-border/40 rounded-lg">
                  <TabsTrigger value="visits" className="text-xs gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>{isBn ? 'ভিজিট ইতিহাস' : 'Visits History'} ({detail.visits?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="text-xs gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>{isBn ? 'প্যাকেজ ব্যালেন্স' : 'Package Credits'} ({detail.activePackageCredits?.length || 0})</span>
                  </TabsTrigger>
                  <TabsTrigger value="dues" className="text-xs gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isBn ? 'বকেয়া হিসাব' : 'Outstanding Dues'} ({detail.outstandingDues?.length || 0})</span>
                  </TabsTrigger>
                </TabsList>

                {/* Visits */}
                <TabsContent value="visits" className="mt-3">
                  {!detail.visits || detail.visits.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border/60 rounded-xl text-xs sm:text-sm text-muted-foreground">
                      {isBn ? 'কোনো ভিজিট রেকর্ড পাওয়া যায়নি' : 'No recorded visits yet for this patient'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/60">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-muted-foreground border-b border-border/60">
                          <tr>
                            <th className="py-2.5 px-3 text-left font-semibold">{isBn ? 'সিরিয়াল' : 'Serial'}</th>
                            <th className="py-2.5 px-3 text-left font-semibold">{isBn ? 'তারিখ' : 'Date'}</th>
                            <th className="py-2.5 px-3 text-left font-semibold">{isBn ? 'অবস্থা' : 'Status'}</th>
                            <th className="py-2.5 px-3 text-left font-semibold">{isBn ? 'অগ্রাধিকার' : 'Priority'}</th>
                            <th className="py-2.5 px-3 text-left font-semibold">{isBn ? 'মন্তব্য' : 'Notes'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {detail.visits.map((v) => (
                            <tr key={v.id} className="hover:bg-muted/30">
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                #{String(v.tokenNumber).padStart(2, '0')}
                              </td>
                              <td className="py-2.5 px-3 font-mono">{v.visitDate}</td>
                              <td className="py-2.5 px-3">
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {v.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant={v.priority === 'emergency' ? 'destructive' : 'secondary'} className="text-[10px]">
                                  {v.priority}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[200px]">
                                {v.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* Packages */}
                <TabsContent value="packages" className="mt-3">
                  {!detail.activePackageCredits || detail.activePackageCredits.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border/60 rounded-xl text-xs sm:text-sm text-muted-foreground">
                      {isBn ? 'কোনো সক্রিয় থেরাপি প্যাকেজ নেই' : 'No active therapy packages currently assigned'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detail.activePackageCredits.map((pkg) => (
                        <div key={pkg.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-foreground">{pkg.modalityId}</span>
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              Active
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{isBn ? 'ব্যবহৃত সেশন' : 'Sessions Used'}:</span>
                            <span className="font-mono font-bold text-foreground">
                              {pkg.sessionsUsed} / {pkg.sessionsTotal}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Dues */}
                <TabsContent value="dues" className="mt-3">
                  {!detail.outstandingDues || detail.outstandingDues.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border/60 rounded-xl text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ {isBn ? 'কোনো বকেয়া বিল নেই' : 'No outstanding dues. Clean balance!'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detail.outstandingDues.map((d) => (
                        <div key={d.id} className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center justify-between">
                          <div className="text-xs">
                            <span className="font-bold text-destructive">{isBn ? 'বকেয়া বিল' : 'Pending Invoice'}</span>
                            <p className="text-[11px] text-muted-foreground font-mono">{d.createdAt}</p>
                          </div>
                          <span className="font-mono font-bold text-sm text-destructive">
                            ৳ {(d.amountPaisa / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <DialogFooter className="p-4 sm:p-6 border-t border-border/60 bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground">
                Registered: {new Date(detail.createdAt).toLocaleDateString()}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
