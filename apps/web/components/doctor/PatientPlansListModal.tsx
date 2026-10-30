// apps/web/components/doctor/PatientPlansListModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '../../lib/api';
import {
  Activity,
  Calendar,
  Clock,
  Printer,
  Sparkles,
  Plus,
  RefreshCw,
  Layers,
  HeartPulse,
  Copy,
} from 'lucide-react';
import { TreatmentPlanPrintModal, parsePlanNotes } from './TreatmentPlanPrintModal';
import { useLanguage } from '../../lib/i18n';

export interface PatientPlansListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  onOpenPlanBuilder?: (patient: any, initialPlans?: any[]) => void;
}

export function PatientPlansListModal({
  open,
  onOpenChange,
  patient,
  onOpenPlanBuilder,
}: PatientPlansListModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanForPrint, setSelectedPlanForPrint] = useState<{
    plans: any[];
    createdAt: string;
  } | null>(null);

  const patientId = patient?.id || patient?.patientId || patient?.patient?.id;

  const loadPlans = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const data = await api.therapy.getPlans(patientId, 'all');
      setPlans(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load patient therapy plans:', err?.message);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && patientId) {
      loadPlans();
    }
  }, [open, patientId]);

  if (!open) return null;

  const patientName =
    patient?.nameBn ||
    patient?.nameEn ||
    patient?.patientNameBn ||
    patient?.patientNameEn ||
    patient?.name ||
    '—';

  const mrn = patient?.mrn || 'HPC-2026-XXXX';
  const age = patient?.ageYears ? `${patient.ageYears} বছর` : '—';
  const gender = patient?.gender === 'female' ? 'মহিলা' : patient?.gender === 'male' ? 'পুরুষ' : (patient?.gender || '—');

  // Group individual modality plans into Plan Batches by createdAt timestamp or consultationId
  const planBatches: Array<{
    batchId: string;
    createdAt: string;
    consultationId?: string;
    items: any[];
    isActive: boolean;
  }> = [];

  plans.forEach((item) => {
    const itemDate = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 16) : 'unknown';
    const key = item.consultationId ? `consult_${item.consultationId}` : `date_${itemDate}`;

    let existing = planBatches.find((b) => b.batchId === key);
    if (!existing) {
      existing = {
        batchId: key,
        createdAt: item.createdAt || new Date().toISOString(),
        consultationId: item.consultationId,
        items: [],
        isActive: false,
      };
      planBatches.push(existing);
    }
    existing.items.push(item);
    if (item.status === 'active') {
      existing.isActive = true;
    }
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/40 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Activity className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    <span>{isBn ? 'রোগীর থেরাপি প্ল্যান হিস্ট্রি' : 'Patient Therapy Plan History'}</span>
                    <Badge variant="outline" className="border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-xs">
                      {planBatches.length} টি প্ল্যান
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    রোগী: <strong className="text-foreground">{patientName}</strong> · MRN:{' '}
                    <strong className="text-foreground font-mono">{mrn}</strong> · বয়স/লিঙ্গ: {age} / {gender}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadPlans}
                  disabled={loading}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>রিফ্রেশ</span>
                </Button>

                {onOpenPlanBuilder && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenPlanBuilder(patient);
                    }}
                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="size-3.5" />
                    <span>নতুন প্ল্যান তৈরি করুন</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loading ? (
              <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <RefreshCw className="size-6 animate-spin text-cyan-500" />
                <span>প্ল্যান হিস্ট্রি লোড হচ্ছে...</span>
              </div>
            ) : planBatches.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-border/80 rounded-2xl space-y-3 bg-muted/20">
                <div className="mx-auto size-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                  <HeartPulse className="size-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-foreground">পূর্বে কোনো থেরাপি প্ল্যান তৈরি করা হয়নি</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    এই রোগীর জন্য এখনও কোনো মডালিটি সিকোয়েন্স বা ট্রিটমেন্ট প্ল্যান অ্যাসাইন করা হয়নি। নতুন প্ল্যান তৈরি করতে নিচের বাটনে চাপ দিন।
                  </p>
                </div>
                {onOpenPlanBuilder && (
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      onOpenPlanBuilder(patient);
                    }}
                    className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Plus className="size-4" />
                    <span>প্রথম থেরাপি প্ল্যান তৈরি করুন</span>
                  </Button>
                )}
              </div>
            ) : (
              planBatches.map((batch, bIdx) => {
                const formattedDate = new Date(batch.createdAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <div
                    key={batch.batchId || bIdx}
                    className="p-4 rounded-xl border border-border/80 bg-background/50 hover:border-cyan-500/40 transition-all space-y-3 shadow-xs"
                  >
                    {/* Batch Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center size-6 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold text-xs font-mono">
                          {bIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            <span>{isBn ? `থেরাপি ট্রিটমেন্ট প্ল্যান #${planBatches.length - bIdx}` : `Therapy Treatment Plan #${planBatches.length - bIdx}`}</span>
                            {batch.isActive ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                                {isBn ? 'সক্রিয়' : 'Active'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                                {isBn ? 'সম্পন্ন' : 'Completed'}
                              </Badge>
                            )}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 text-zinc-400" />
                              <span>{formattedDate}</span>
                            </span>
                            <span>·</span>
                            <span>মোট {batch.items.length} টি ধাপ</span>
                          </div>
                        </div>
                      </div>

                      {/* Batch Action Buttons */}
                      <div className="flex items-center gap-2">
                        {onOpenPlanBuilder && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onOpenChange(false);
                              onOpenPlanBuilder(patient, batch.items);
                            }}
                            className="h-8 text-xs border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 gap-1.5 cursor-pointer"
                            title="এই প্ল্যানটি এডিটর এ লোড করুন"
                          >
                            <Copy className="size-3 text-cyan-500" />
                            <span>প্ল্যান লোড করুন</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPlanForPrint({
                              plans: batch.items,
                              createdAt: batch.createdAt,
                            });
                          }}
                          className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Printer className="size-3.5" />
                          <span>{isBn ? 'প্রিন্ট প্ল্যান' : 'Print Plan'}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Modalities Table / Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {batch.items.map((it: any, itIdx: number) => {
                        const parsed = parsePlanNotes(it.notes);
                        const duration = it.durationMinutes || parsed.durationMin || it.defaultDurationMin || 15;
                        const noteText = parsed.clinicalNote || (it.notes && !it.notes.startsWith('{') ? it.notes : '');
                        const seqNumber = it.sequenceOrder || parsed.sequence || itIdx + 1;

                        return (
                          <div
                            key={it.id || itIdx}
                            className="p-3 rounded-lg border border-border/60 bg-muted/20 flex flex-col justify-between text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground flex items-center gap-1.5">
                                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                                  ধাপ {seqNumber}:
                                </span>
                                <span>{it.modalityNameEn || it.modalityCode}</span>
                              </span>
                              <Badge variant="outline" className="border-border text-[10px] font-mono">
                                {duration} মিনিট
                              </Badge>
                            </div>

                            {it.modalityNameBn && (
                              <div className="text-[11px] text-muted-foreground">{it.modalityNameBn}</div>
                            )}

                            <div className="text-[11px] text-muted-foreground flex items-center justify-between font-mono pt-1 border-t border-border/40">
                              <span>
                                সেশন: <strong>{it.completedSessions || 0}</strong> /{' '}
                                <strong>{it.totalSessionsPrescribed || 10}</strong>
                              </span>
                              <span>
                                {it.frequency === 'daily'
                                  ? 'প্রতিদিন'
                                  : it.frequency === 'alternate_days'
                                  ? 'একদিন পরপর'
                                  : (it.frequency || 'প্রতিদিন')}
                              </span>
                            </div>

                            {noteText && (
                              <div className="text-[10.5px] text-foreground/80 bg-background/80 p-1.5 rounded border border-border/40 mt-1 italic">
                                {noteText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-3 border-t border-border bg-muted/20 flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded A4 Print Modal */}
      {selectedPlanForPrint && (
        <TreatmentPlanPrintModal
          open={!!selectedPlanForPrint}
          onOpenChange={(op) => !op && setSelectedPlanForPrint(null)}
          onClose={() => setSelectedPlanForPrint(null)}
          patient={patient}
          plans={selectedPlanForPrint.plans}
          createdAt={selectedPlanForPrint.createdAt}
        />
      )}
    </>
  );
}
export default PatientPlansListModal;
