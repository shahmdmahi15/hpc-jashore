'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, UserSession } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  User,
  Activity,
  HeartPulse,
  Printer,
  ChevronRight,
  TrendingDown,
  Clock,
  RefreshCw,
  Sparkles,
  Loader2,
  Stethoscope,
  Edit3,
} from 'lucide-react';
import { PainAssessmentFormModal } from './PainAssessmentFormModal';
import { PainAssessmentPrintModal } from './PainAssessmentPrintModal';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

export interface PatientFilesListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  doctorId?: string;
  doctorName?: string;
  visitId?: string;
  currentUser?: UserSession | null;
  onFileSelected?: (file: any) => void;
  onCreateNew?: () => void;
}

export function PatientFilesListModal({

  open,
  onOpenChange,
  patient,
  doctorId,
  doctorName,
  visitId,
  currentUser,
  onFileSelected,
  onCreateNew,
}: PatientFilesListModalProps) {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Child modal state for viewing/editing a selected file
  const [activeFileForEdit, setActiveFileForEdit] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Child modal state for creating a new file
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFileForPrint, setSelectedFileForPrint] = useState<any | null>(null);

  const fetchFiles = async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const data = await api.patients.listAssessmentFiles(patient.id);
      setFiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('পূর্ববর্তী ফাইল রেকর্ডস লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && patient?.id) {
      fetchFiles();
    }
  }, [open, patient?.id]);

  const filteredFiles = files.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.fileNumber?.toLowerCase().includes(q) ||
      f.assessmentDate?.toLowerCase().includes(q) ||
      f.diagnosis?.toLowerCase().includes(q) ||
      f.doctorName?.toLowerCase().includes(q) ||
      (Array.isArray(f.painAreas) && f.painAreas.some((a: string) => a.toLowerCase().includes(q)))
    );
  });

  const handleOpenFile = (file: any) => {
    setActiveFileForEdit(file);
    setIsEditModalOpen(true);
    onFileSelected?.(file);
  };

  const handleOpenCreate = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const handleFileSaved = (savedFile: any) => {
    fetchFiles();
    onFileSelected?.(savedFile);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[96vw] max-w-4xl max-h-[90vh] flex flex-col p-0 border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
          style={{
            paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20 shrink-0">
                <FileText className="size-5 sm:size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-xl font-black text-foreground">
                    {isBn ? 'রোগীর পূর্ববর্তী ফাইল ও রেকর্ডস' : 'Patient Assessment Files & Records'}
                  </DialogTitle>
                  <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 font-mono text-xs">
                    {files.length} {files.length === 1 ? (isBn ? 'ফাইল' : 'FILE') : (isBn ? 'ফাইল' : 'FILES')}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isBn ? 'রোগী:' : 'Patient:'} <strong className="text-foreground">{patient?.nameEn || patient?.name}</strong> · MRN:{' '}
                  <strong className="text-foreground">{patient?.mrn || 'N/A'}</strong> · {isBn ? 'ফোন:' : 'Phone:'}{' '}
                  {patient?.phone || 'N/A'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleOpenCreate}
                className="h-8 sm:h-9 text-xs px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>{isBn ? 'নতুন ফাইল' : 'New File'}</span>
              </Button>
            </div>
          </div>

          {/* Search Bar & Refresh */}
          <div className="px-4 py-2.5 sm:px-6 border-b border-border/70 bg-card/60 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ফাইল নম্বর, তারিখ, রোগ নির্ণয় বা ব্যথার স্থান দিয়ে খুঁজুন..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={fetchFiles}
              disabled={loading}
              className="size-8 rounded-lg shrink-0"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            </Button>
          </div>

          {/* Files List Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {loading && files.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="size-6 animate-spin text-emerald-500" />
                <span className="text-xs">ফাইল রেকর্ডস লোড হচ্ছে...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-dashed border-border/70 bg-muted/10 space-y-3">
                <div className="p-3 rounded-full bg-muted/40 text-muted-foreground">
                  <FileText className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {search ? 'কোনো ফলাফল পাওয়া যায়নি' : 'পূর্বে তৈরি কোনো অ্যাসেসমেন্ট ফাইল নেই'}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {search
                      ? 'ভিন্ন কোনো কীওয়ার্ড দিয়ে খুঁজুন অথবা ফিল্টার মুছুন।'
                      : 'এই রোগীর জন্য এখনো কোনো ক্লিনিক্যাল অ্যাসেসমেন্ট শিট তৈরি করা হয়নি। নতুন ফাইল তৈরি করতে নিচের বাটনে চাপ দিন।'}
                  </p>
                </div>
                {!search && (
                  <Button
                    type="button"
                    onClick={handleOpenCreate}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-sm"
                  >
                    <Plus className="size-3.5" />
                    <span>প্রথম অ্যাসেসমেন্ট ফাইল তৈরি করুন</span>
                  </Button>
                )}
              </div>
            ) : (
              filteredFiles.map((file) => {
                const painAreas: string[] = Array.isArray(file.painAreas) ? file.painAreas : [];
                const treatmentPlans: string[] = Array.isArray(file.treatmentPlans) ? file.treatmentPlans : [];
                const initialVas = typeof file.vasScore === 'number' ? file.vasScore : 0;
                const postVas = typeof file.painScaleAfterTreatment === 'number' ? file.painScaleAfterTreatment : null;
                const hasImprovement = postVas !== null && postVas < initialVas;

                return (
                  <div
                    key={file.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all space-y-3 cursor-pointer group"
                    onClick={() => handleOpenFile(file)}
                  >
                    {/* Top Row: File Number, Date, Doctor */}
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 text-white font-mono font-bold text-xs px-2.5 py-0.5">
                          {file.fileNumber}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          <span>{file.assessmentDate}</span>
                        </span>
                        {file.doctorName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Stethoscope className="size-3.5 text-emerald-500" />
                            <span>
                              {(() => {
                                const clean = file.doctorName.replace(/^(?:ডাঃ|ডা\.|ডাক্তার|Dr\.|Dr\b|Doctor\b)\s*/i, '').trim();
                                return clean ? `ডাক্তার ${clean}` : 'ডাক্তার';
                              })()}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFileForPrint(file);
                          }}
                          className="h-7 px-2.5 text-xs font-semibold border-border/80 text-foreground hover:bg-muted gap-1 cursor-pointer"
                        >
                          <Printer className="size-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{isBn ? 'প্রিন্ট' : 'Print'}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(file);
                          }}
                          className="h-7 px-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/10 gap-1 cursor-pointer"
                        >
                          <Edit3 className="size-3" />
                          <span>{isBn ? 'ফাইল দেখুন ও এডিট' : 'View & Edit'}</span>
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Middle Row: Diagnosis & VAS Pain Indicator */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                      <div className="md:col-span-2 space-y-1">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-amber-500" />
                          <span>{isBn ? 'রোগ নির্ণয়:' : 'Diagnosis:'}</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
                            {file.diagnosis || 'নির্দিষ্ট করা হয়নি'}
                          </span>
                        </div>

                        {/* Pain Areas */}
                        {painAreas.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-muted-foreground">{isBn ? 'ব্যথার স্থান:' : 'Pain Areas:'}</span>
                            {painAreas.map((area) => (
                              <Badge
                                key={area}
                                variant="outline"
                                className="text-[10px] px-2 py-0 border-border/80 bg-muted/40 font-medium"
                              >
                                {area}
                              </Badge>
                            ))}
                            {file.side && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0 border-sky-500/40 text-sky-600">
                                {file.side}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* VAS Pain Tracker Box */}
                      <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">
                            {isBn ? 'ভিএএস পেইন স্কোর' : 'VAS Pain Score'}
                          </div>
                          <div className="text-sm font-black font-mono text-foreground mt-0.5">
                            {initialVas}/10
                            {postVas !== null && (
                              <span className="text-xs text-muted-foreground font-normal">
                                {' '}
                                ➔ <strong className="text-emerald-600 dark:text-emerald-400">{postVas}/10</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {hasImprovement && (
                          <Badge className="bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                            <TrendingDown className="size-3" />
                            <span>↓ {initialVas - postVas} পয়েন্ট কম</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Treatment Plans & Progress remarks */}
                    {(treatmentPlans.length > 0 || file.improvement) && (
                      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-foreground">মডালিটি:</span>
                          {treatmentPlans.map((tp) => (
                            <span key={tp} className="text-[11px] bg-muted/50 px-2 py-0.5 rounded text-foreground">
                              {tp}
                            </span>
                          ))}
                          {file.prescribedSessions && (
                            <span className="text-[11px] font-semibold text-emerald-600">
                              ({file.prescribedSessions} সেশন)
                            </span>
                          )}
                        </div>

                        {file.improvement && (
                          <div className="text-[11px] italic text-emerald-600 dark:text-emerald-400 font-medium">
                            অগ্রগতি: {file.improvement}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="p-3 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              মোট {filteredFiles.length}টি ফাইল প্রদর্শিত হচ্ছে
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 px-4 text-xs"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Pain Assessment Form Modal for View / Edit */}
      {isEditModalOpen && activeFileForEdit && (
        <PainAssessmentFormModal
          open={isEditModalOpen}
          onOpenChange={(op) => {
            setIsEditModalOpen(op);
            if (!op) setActiveFileForEdit(null);
          }}
          patient={patient}
          doctorId={doctorId}
          doctorName={doctorName}
          visitId={visitId}
          currentUser={currentUser}
          existingFile={activeFileForEdit}
          onSuccess={handleFileSaved}
        />
      )}

      {/* Embedded Pain Assessment Form Modal for New Creation */}
      {isCreateModalOpen && (
        <PainAssessmentFormModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          patient={patient}
          doctorId={doctorId}
          doctorName={doctorName}
          visitId={visitId}
          currentUser={currentUser}
          existingFile={null}
          onSuccess={handleFileSaved}
        />
      )}

      {/* Direct A4 Clinical Sheet Print & Vector PDF Export Modal */}
      {selectedFileForPrint && (
        <PainAssessmentPrintModal
          open={Boolean(selectedFileForPrint)}
          onOpenChange={(op) => {
            if (!op) setSelectedFileForPrint(null);
          }}
          data={selectedFileForPrint}
          patient={patient}
        />
      )}
    </>
  );
}
