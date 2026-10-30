// apps/web/components/patient/PatientPrescriptionsListModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  Search,
  Calendar,
  User,
  Stethoscope,
  Printer,
  Copy,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import PrescriptionPrintModal, { PrescriptionData } from '../PrescriptionPrintModal';
import { useLanguage } from '@/lib/i18n';

export interface PatientPrescriptionsListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  patient?: any;
  onSelectToClone?: (prescription: any) => void;
}

export function PatientPrescriptionsListModal({
  open,
  onOpenChange,
  patientId,
  patient,
  onSelectToClone,
}: PatientPrescriptionsListModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPrintRx, setSelectedPrintRx] = useState<PrescriptionData | null>(null);

  const targetPatientId = patientId || patient?.id;

  const loadPrescriptions = async () => {
    if (!open) return;
    setLoading(true);
    try {
      let data: any[] = [];
      if (targetPatientId) {
        data = await api.prescriptions.getByPatientId(targetPatientId);
      } else {
        data = await api.prescriptions.list();
      }
      setPrescriptions(data || []);
    } catch (err: any) {
      console.error('Error fetching prescriptions:', err);
      // Fallback: try empty list
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPrescriptions();
    }
  }, [open, targetPatientId]);

  const filtered = prescriptions.filter((rx) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const rxNo = (rx.id || '').toLowerCase();
    const docName = (rx.doctor?.fullName || rx.doctorName || '').toLowerCase();
    const patName = (rx.patient?.nameEn || rx.patient?.nameBn || '').toLowerCase();
    const medNames = (rx.items || []).map((i: any) => i.medicineName || '').join(' ').toLowerCase();
    return rxNo.includes(term) || docName.includes(term) || patName.includes(term) || medNames.includes(term);
  });

  const handlePrintRx = (rx: any) => {
    const printPayload: PrescriptionData = {
      id: rx.id,
      rxNumber: rx.rxNumber || `RX-${rx.id.slice(0, 8).toUpperCase()}`,
      patient: {
        id: rx.patient?.id || targetPatientId,
        mrn: rx.patient?.mrn || patient?.mrn || 'N/A',
        nameEn: rx.patient?.nameEn || patient?.nameEn || 'Patient',
        nameBn: rx.patient?.nameBn || patient?.nameBn,
        ageYears: rx.patient?.ageYears || patient?.ageYears,
        gender: rx.patient?.gender || patient?.gender || 'male',
        phone: rx.patient?.phone || patient?.phone,
      },
      doctor: {
        id: rx.doctor?.id,
        name: rx.doctor?.fullName || rx.doctorName || 'Doctor Md. Toufiq Uz Zaman',
        specialization: rx.doctor?.specialization || 'Consultant Physiotherapist',
        degrees: 'BPT (DU), PGD (Acu, China), MDMR (Pain, DU), MPH',
      },
      clinicalNotes: {
        diagnosis: rx.diagnosis?.trim() || '—',
        chiefComplaints: rx.chiefComplaints,
      },
      medicines: (rx.items || []).map((i: any) => ({
        brandName: i.medicineName || 'Medicine',
        dosage: i.dosage || '1+0+1',
        duration: `${i.durationDays || 7} days`,
        instructions: i.instructionsBn || i.instructionsEn || 'খাবারের পর',
      })),
      advice: rx.advice || undefined,
      nextVisitDate: rx.followUpDate || undefined,
      createdAt: rx.createdAt || new Date().toISOString(),
    };
    setSelectedPrintRx(printPayload);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-background border-border">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <FileText className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isBn ? 'পূর্বের প্রেসক্রিপশন তালিকা' : 'Prescription History'}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {patient ? (
                    <>
                      {isBn ? 'রোগী:' : 'Patient:'} <strong className="text-foreground">{patient.nameEn}</strong> · {isBn ? 'রেজি নম্বর:' : 'MRN:'}{' '}
                      <strong className="text-foreground font-mono">{patient.mrn}</strong>
                    </>
                  ) : (
                    isBn ? 'ক্লিনিকের সকল ডিজিটাল প্রেসক্রিপশন আর্কাইভ' : 'All digital prescription records'
                  )}
                </DialogDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadPrescriptions}
                disabled={loading}
                className="h-8 text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Search Bar */}
          <div className="relative my-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ওষুধের নাম, প্রেসক্রিপশন নম্বর বা ডাক্তার খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs sm:text-sm rounded-xl"
            />
          </div>

          {/* Prescriptions List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 space-y-2">
                <RefreshCw className="size-6 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs text-muted-foreground">প্রেসক্রিপশন হিস্ট্রি লোড হচ্ছে...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20">
                <FileText className="size-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">কোনো প্রেসক্রিপশন পাওয়া যায়নি</p>
                <p className="text-xs text-muted-foreground mt-1">
                  এই রোগীর জন্য পূর্বে কোনো প্রেসক্রিপশন রেকর্ড করা হয়নি অথবা সার্চ ফিল্টারের সাথে মেলেনি।
                </p>
              </div>
            ) : (
              filtered.map((rx) => {
                const dateStr = new Date(rx.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const itemCount = (rx.items || []).length;

                return (
                  <div
                    key={rx.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card hover:border-emerald-500/40 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/20">
                          {rx.rxNumber || `RX-${rx.id.slice(0, 8).toUpperCase()}`}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Calendar className="size-3 text-muted-foreground" />
                          {dateStr}
                        </span>
                        {rx.doctorName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Stethoscope className="size-3 text-emerald-600" />
                            {rx.doctorName}
                          </span>
                        )}
                      </div>

                      {/* Prescribed Items summary */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">ওষুধ ({itemCount}):</span>
                        {(rx.items || []).slice(0, 4).map((item: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] font-normal">
                            {item.medicineName} ({item.dosage})
                          </Badge>
                        ))}
                        {itemCount > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{itemCount - 4} more</span>
                        )}
                      </div>

                      {rx.advice && (
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-1 italic">
                          উপদেশ: {rx.advice}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {onSelectToClone && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onSelectToClone(rx);
                            onOpenChange(false);
                            toast.success('প্রেসক্রিপশন ওষুধসমূহ ফর্মটিতে লোড করা হয়েছে');
                          }}
                          className="h-8 text-xs font-semibold gap-1.5 border-border/80 hover:bg-emerald-500/10 hover:text-emerald-600 cursor-pointer"
                        >
                          <Copy className="size-3.5" />
                          <span>ক্লোন করুন</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handlePrintRx(rx)}
                        className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                      >
                        <Printer className="size-3.5" />
                        <span>প্রিন্ট (5.5" × 8.27")</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded 5.50in x 8.27in Print Modal */}
      {selectedPrintRx && (
        <PrescriptionPrintModal
          prescription={selectedPrintRx}
          onClose={() => setSelectedPrintRx(null)}
        />
      )}
    </>
  );
}
