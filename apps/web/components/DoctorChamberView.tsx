// apps/web/components/DoctorChamberView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, UserSession, getSession } from '../lib/api';
import { useRealtime } from '../lib/use-realtime';
import { cn } from '../lib/utils';
import PrescriptionPrintModal from './PrescriptionPrintModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Select } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { PatientTimelineModal } from './patient/PatientTimelineModal';
import { PainAssessmentFormModal } from './patient/PainAssessmentFormModal';
import { PatientFilesListModal } from './patient/PatientFilesListModal';
import { TherapyQueueManagementTab } from './therapy/TherapyQueueManagementTab';
import {
  Volume2,
  PhoneCall,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  HeartPulse,
  History,
  AlertCircle,
  Loader2,
  Stethoscope,
  Eye,
  UserCheck,
  FolderOpen,
  FilePlus,
  Plus,
} from 'lucide-react';

export interface DoctorChamberProps {
  session?: UserSession | null;
}

export default function DoctorChamberView({ session: propSession }: DoctorChamberProps = {}) {
  const session = propSession || getSession();
  const [queue, setQueue] = useState<any[]>([]);
  const [activeSerial, setActiveSerial] = useState<any>(null);
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [modalitiesList, setModalitiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Consultation & Prescription State
  const [chiefComplaints, setChiefComplaints] = useState('Severe lower back pain radiating down left leg for 3 months');
  const [painScore, setPainScore] = useState(7);
  const [diagnosis, setDiagnosis] = useState('Lumbar Radiculopathy / Sciatica (L4-L5 disc protrusion)');
  const [objectiveNotes, setObjectiveNotes] = useState('SLR test positive on left side at 45°. Tenderness on lumbar paravertebral muscles.');
  const [advice, setAdvice] = useState('Avoid bending forward and lifting heavy weights. Use hard mattress. Apply warm moist compress for 15 mins twice daily.');

  // Prescribed Medicines State
  const [prescribedMeds, setPrescribedMeds] = useState<any[]>([
    {
      brandName: 'Naprosyn 500',
      genericName: 'Naproxen 500mg',
      dosage: '1+0+1',
      duration: '7 days',
      instructions: 'খাবারের পর (After meals)',
    },
    {
      brandName: 'Myolax 50',
      genericName: 'Tolperisone HCl 50mg',
      dosage: '1+0+1',
      duration: '7 days',
      instructions: 'খাবারের পর (After meals)',
    },
    {
      brandName: 'Maxpro 20',
      genericName: 'Esomeprazole 20mg',
      dosage: '1+0+0',
      duration: '14 days',
      instructions: 'খাবারের ২০ মিনিট আগে (Before meal)',
    },
  ]);

  // Prescribed Modalities State
  const [prescribedMods, setPrescribedMods] = useState<any[]>([
    { modalityCode: 'IFT', modalityName: 'Interferential Therapy (IFT)', sessionsPrescribed: 10, frequency: 'daily' },
    { modalityCode: 'UST', modalityName: 'Ultrasound Therapy (UST)', sessionsPrescribed: 10, frequency: 'daily' },
  ]);

  // Print modal state
  const [printData, setPrintData] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<'queue' | 'consultation'>('queue');
  const [doctorMainTab, setDoctorMainTab] = useState<'chamber' | 'therapy_queue'>('chamber');

  // Intake Form & Calling Action States
  const [activeIntakeForm, setActiveIntakeForm] = useState<any>(null);
  const [isIntakeFormModalOpen, setIsIntakeFormModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [callingActionLoading, setCallingActionLoading] = useState(false);

  // Assessment Files State
  const [assessmentFilesCount, setAssessmentFilesCount] = useState<number>(0);
  const [isFilesListModalOpen, setIsFilesListModalOpen] = useState(false);
  const [isNewAssessmentModalOpen, setIsNewAssessmentModalOpen] = useState(false);

  const doctorId = session?.staffId || '';

  const loadQueue = async () => {
    try {
      setLoading(true);
      const staffList = await api.staff.list();
      let targetDoctor = staffList.find((s: any) => s.userId === session?.userId || s.role === 'doctor');
      const docId = targetDoctor ? targetDoctor.id : doctorId;

      if (docId) {
        const q = await api.visits.getDoctorQueue(docId);
        setQueue(q || []);
        if (q && q.length > 0 && !activeSerial) {
          const inProgress = q.find((s: any) => s.status === 'called' || s.status === 'in_chamber') || q[0];
          setActiveSerial(inProgress);
        }
      }

      const [meds, mods] = await Promise.all([
        api.inventory.getMedicines(),
        api.therapy.getMachines(),
      ]);
      setMedicinesList(meds || []);
      setModalitiesList(mods || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Instant Realtime sync for chamber queue
  useRealtime((event) => {
    if (
      event.type.startsWith('queue.') ||
      event.type.startsWith('serial.') ||
      event.type.startsWith('consultation.') ||
      event.type.startsWith('visit.')
    ) {
      loadQueue();
    }
    if (event.type.startsWith('patient.assessment_')) {
      loadAssessmentFilesCount();
    }
  });

  const loadAssessmentFilesCount = async () => {
    if (!activeSerial?.patientId) {
      setAssessmentFilesCount(0);
      return;
    }
    try {
      const files = await api.patients.listAssessmentFiles(activeSerial.patientId);
      setAssessmentFilesCount(Array.isArray(files) ? files.length : 0);
    } catch {
      setAssessmentFilesCount(0);
    }
  };

  useEffect(() => {
    loadAssessmentFilesCount();
  }, [activeSerial?.patientId]);

  const handleAssessmentFileSaved = (file: any) => {
    loadAssessmentFilesCount();
    if (file?.diagnosis) {
      setDiagnosis(file.diagnosis);
    }
    if (typeof file?.vasScore === 'number') {
      setPainScore(file.vasScore);
    }
    if (file?.homeAdviceNotes && !advice) {
      setAdvice(file.homeAdviceNotes);
    }
    if (Array.isArray(file?.treatmentPlans) && file.treatmentPlans.length > 0) {
      const updated = [...prescribedMods];
      for (const tp of file.treatmentPlans) {
        if (tp.includes('IFT') && !updated.some((m) => m.modalityCode === 'IFT')) {
          updated.push({
            modalityCode: 'IFT',
            modalityName: 'Interferential Therapy (IFT)',
            sessionsPrescribed: file.prescribedSessions || 10,
            frequency: 'daily',
          });
        }
        if (tp.includes('Ultrasound') && !updated.some((m) => m.modalityCode === 'UST')) {
          updated.push({
            modalityCode: 'UST',
            modalityName: 'Ultrasound Therapy (UST)',
            sessionsPrescribed: file.prescribedSessions || 10,
            frequency: 'daily',
          });
        }
        if (tp.includes('Hot pack') && !updated.some((m) => m.modalityCode === 'HOT_PACK')) {
          updated.push({
            modalityCode: 'HOT_PACK',
            modalityName: 'Moist Heat Pack (Hot Pack)',
            sessionsPrescribed: file.prescribedSessions || 10,
            frequency: 'daily',
          });
        }
        if (tp.includes('TENS') && !updated.some((m) => m.modalityCode === 'TENS')) {
          updated.push({
            modalityCode: 'TENS',
            modalityName: 'TENS Therapy',
            sessionsPrescribed: file.prescribedSessions || 10,
            frequency: 'daily',
          });
        }
      }
      setPrescribedMods(updated);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [doctorId, session]);

  const handleCallNext = async () => {
    try {
      const staffList = await api.staff.list();
      const doc = staffList.find((s: any) => s.userId === session?.userId || s.role === 'doctor');
      const targetDocId = doc?.id || doctorId;

      const called = await api.visits.callNext(targetDocId);
      const active = called.serial || called;
      setActiveSerial(active);
      setMobileTab('consultation');
      toast.success(`Called Serial #${active.serialNumber || 'Next'}`);
      loadQueue();
    } catch (err: any) {
      toast.error(`Call next error: ${err.message}`);
    }
  };

  const handleSelectSerial = (s: any) => {
    setActiveSerial(s);
    setMobileTab('consultation');
  };

  // Load intake form whenever activeSerial patient changes
  useEffect(() => {
    if (activeSerial?.patientId) {
      api.patients
        .listIntakeForms({ patientId: activeSerial.patientId })
        .then((forms) => {
          if (forms && forms.length > 0) {
            setActiveIntakeForm(forms[0]);
            if (forms[0].chiefComplaint) {
              setChiefComplaints((prev) => (prev ? prev : forms[0].chiefComplaint));
            }
          } else {
            setActiveIntakeForm(null);
          }
        })
        .catch(() => setActiveIntakeForm(null));
    } else {
      setActiveIntakeForm(null);
    }
  }, [activeSerial?.patientId]);

  const handleCallToChamber = async () => {
    if (!activeSerial?.id) return;
    try {
      setCallingActionLoading(true);
      await api.visits.callSerial(activeSerial.id);
      setActiveSerial((prev: any) => ({ ...prev, status: 'called' }));
      toast.success('রোগীকে চেম্বারে ডাকা হয়েছে! টিভি ও ওয়েব স্ক্রিনে ঘোষণা শুরু হয়েছে।');
      loadQueue();
    } catch (err: any) {
      toast.error(err?.message || 'চেম্বারে ডাকতে ব্যর্থ হয়েছে');
    } finally {
      setCallingActionLoading(false);
    }
  };

  const handleMarkInConsultation = async () => {
    if (!activeSerial?.id) return;
    try {
      setCallingActionLoading(true);
      await api.visits.markInConsultation(activeSerial.id);
      setActiveSerial((prev: any) => ({ ...prev, status: 'in_chamber' }));
      toast.success('পরামর্শ শুরু হয়েছে! রোগীকে ওয়েটিং কিউ স্ক্রিন থেকে সরানো হয়েছে।');
      loadQueue();
    } catch (err: any) {
      toast.error(err?.message || 'পরামর্শ শুরু করতে ব্যর্থ হয়েছে');
    } finally {
      setCallingActionLoading(false);
    }
  };

  const handleRecall = async () => {
    if (!activeSerial?.id) return;
    try {
      setCallingActionLoading(true);
      await api.visits.recallSerial(activeSerial.id);
      toast.info('রোগীকে পুনরায় চেম্বারে ডাকা হয়েছে!');
      loadQueue();
    } catch (err: any) {
      toast.error(err?.message || 'পুনরায় ডাকতে ব্যর্থ হয়েছে');
    } finally {
      setCallingActionLoading(false);
    }
  };

  const handleCancelCall = async () => {
    if (!activeSerial?.id) return;
    try {
      setCallingActionLoading(true);
      await api.visits.cancelCall(activeSerial.id);
      setActiveSerial((prev: any) => ({ ...prev, status: 'waiting' }));
      toast.warning('কল বাতিল করা হয়েছে। রোগী কিউতে অপেক্ষমাণ থাকবেন।');
      loadQueue();
    } catch (err: any) {
      toast.error(err?.message || 'কল বাতিল করতে ব্যর্থ হয়েছে');
    } finally {
      setCallingActionLoading(false);
    }
  };

  const handleAddMedicine = () => {
    setPrescribedMeds([
      ...prescribedMeds,
      {
        brandName: medicinesList[0]?.brandName || 'Tab. Paracetamol 500mg',
        genericName: medicinesList[0]?.genericName || 'Paracetamol',
        dosage: '1+0+1',
        duration: '7 days',
        instructions: 'খাবারের পর (After meals)',
      },
    ]);
  };

  const handleRemoveMedicine = (idx: number) => {
    setPrescribedMeds(prescribedMeds.filter((_, i) => i !== idx));
  };

  const handleAddModality = (code: string, name: string) => {
    if (prescribedMods.some((m) => m.modalityCode === code)) return;
    setPrescribedMods([
      ...prescribedMods,
      {
        modalityCode: code,
        modalityName: name,
        sessionsPrescribed: 10,
        frequency: 'daily',
      },
    ]);
  };

  const handleRemoveModality = (code: string) => {
    setPrescribedMods(prescribedMods.filter((m) => m.modalityCode !== code));
  };

  const handleSaveAndPrint = async () => {
    if (!activeSerial) {
      toast.error('No active patient selected from queue!');
      return;
    }

    try {
      let createdRx = null;
      try {
        createdRx = await api.prescriptions.create({
          visitId: activeSerial.id,
          doctorId: session?.staffId || 'staff-1',
          patientId: activeSerial.patientId,
          chiefComplaints,
          diagnosis,
          painScore,
          objectiveNotes,
          advice,
          medicines: prescribedMeds,
          modalities: prescribedMods,
        });
        toast.success('Prescription saved to database!');
      } catch (e: any) {
        console.warn('API save note:', e.message);
      }

      setPrintData({
        rxNumber: createdRx?.rxNumber || `RX-${new Date().getFullYear()}-${String(activeSerial.serialNumber).padStart(4, '0')}`,
        serialNumber: activeSerial.serialNumber,
        patient: {
          nameEn: activeSerial.patient?.nameEn || 'Abdul Karim',
          nameBn: activeSerial.patient?.nameBn,
          mrn: activeSerial.patient?.mrn || 'HPC-26-00001',
          phone: activeSerial.patient?.phone || '01712345678',
          ageYears: activeSerial.patient?.ageYears || 52,
          gender: activeSerial.patient?.gender || 'male',
          bloodGroup: activeSerial.patient?.bloodGroup,
        },
        doctor: {
          name: session?.displayName || 'Consultant Doctor',
          specialization: 'Physiotherapist & Pain Specialist',
        },
        clinicalNotes: {
          chiefComplaints,
          diagnosis,
          painScore,
        },
        medicines: prescribedMeds,
        modalities: prescribedMods,
        advice,
        createdAt: new Date().toISOString(),
      });

      loadQueue();
    } catch (err: any) {
      toast.error(`Error saving prescription: ${err.message}`);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Workstation Navigation Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card/80 border border-border/80 shadow-xs max-w-md">
        <Button
          type="button"
          variant={doctorMainTab === 'chamber' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDoctorMainTab('chamber')}
          className={cn(
            'flex-1 text-xs font-bold rounded-xl h-9 gap-1.5',
            doctorMainTab === 'chamber' && 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-sm'
          )}
        >
          <Stethoscope className="size-4" />
          <span>কনসালটেশন চেম্বার</span>
        </Button>
        <Button
          type="button"
          variant={doctorMainTab === 'therapy_queue' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setDoctorMainTab('therapy_queue')}
          className={cn(
            'flex-1 text-xs font-bold rounded-xl h-9 gap-1.5',
            doctorMainTab === 'therapy_queue' && 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-sm'
          )}
        >
          <PhoneCall className="size-4 text-emerald-400" />
          <span>থেরাপি কিউ</span>
        </Button>
      </div>

      {doctorMainTab === 'therapy_queue' ? (
        <TherapyQueueManagementTab />
      ) : (
        <>
          {/* Mobile & Small Tablet Adaptive Segmented Control */}
      <div className="flex lg:hidden items-center gap-2 mb-4 p-1 rounded-xl bg-card border border-border shadow-2xs">
        <Button
          type="button"
          variant={mobileTab === 'queue' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMobileTab('queue')}
          className={cn(
            'flex-1 text-xs font-bold rounded-lg',
            mobileTab === 'queue' && 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-xs'
          )}
        >
          🚪 Queue ({queue.length})
        </Button>
        <Button
          type="button"
          variant={mobileTab === 'consultation' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMobileTab('consultation')}
          className={cn(
            'flex-1 text-xs font-bold rounded-lg',
            mobileTab === 'consultation' && 'bg-emerald-600 text-white hover:bg-emerald-600/90 shadow-xs'
          )}
        >
          📝 Consultation &amp; Rx {activeSerial ? `(#${activeSerial.serialNumber})` : ''}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 sm:gap-6 w-full items-start">
        {/* Left Column: Chamber Patient Queue */}
        <Card className={cn('h-fit transition-all border-border shadow-sm', mobileTab !== 'queue' && 'hidden lg:block')}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>🚪</span> Chamber Queue ({queue.length})
            </CardTitle>
            <Button size="sm" onClick={handleCallNext} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              📢 Call Next
            </Button>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="text-center py-8 px-4 text-muted-foreground text-sm">
                No patients waiting in queue.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {queue.map((s) => {
                  const isCurrent = activeSerial?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSerial(s)}
                      className={cn(
                        'border rounded-xl p-3 cursor-pointer transition-all',
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-border bg-card hover:bg-muted/50'
                      )}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                            #{s.serialNumber} · {s.tokenNumber || `T-${s.serialNumber}`}
                          </span>
                          {s.priority === 'emergency' && (
                            <Badge variant="destructive" className="text-[10px] uppercase font-bold animate-pulse px-1.5 py-0.5 bg-rose-500 text-white">
                              🚨 Emergency
                            </Badge>
                          )}
                          {s.priority === 'vip' && (
                            <Badge className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-1.5 py-0.5">
                              ⭐ VIP
                            </Badge>
                          )}
                        </div>
                        <Badge variant={isCurrent ? 'default' : 'outline'} className="text-xs shrink-0">
                          {s.status}
                        </Badge>
                      </div>
                      <div className="font-semibold text-sm mt-1 text-foreground">
                        {s.patient?.nameEn}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        MRN: {s.patient?.mrn} · {s.patient?.gender}, {s.patient?.ageYears}y
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: SOAP Consultation & 5.5in x 8.27in Prescription Writer */}
        <div className={cn('flex flex-col gap-4 sm:gap-5 transition-all w-full', mobileTab !== 'consultation' && 'hidden lg:flex')}>
          {/* Active Patient Demographics Bar */}
          <Card className="border-border bg-card/90 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    NOW IN CHAMBER
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                    {activeSerial?.patient?.nameEn || 'Abdul Karim'}{' '}
                    {activeSerial?.patient?.nameBn && <small className="text-sm font-normal">({activeSerial.patient.nameBn})</small>}
                  </h2>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                    MRN: <strong className="text-foreground">{activeSerial?.patient?.mrn || 'HPC-26-00001'}</strong> · Age: {activeSerial?.patient?.ageYears || 52} Y · Gender: {activeSerial?.patient?.gender || 'male'} · Phone: {activeSerial?.patient?.phone || '01712345678'}
                  </div>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  {activeSerial?.priority === 'emergency' && (
                    <Badge variant="destructive" className="font-bold uppercase animate-pulse bg-rose-500 text-white">
                      🚨 Emergency
                    </Badge>
                  )}
                  {activeSerial?.priority === 'vip' && (
                    <Badge className="font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                      ⭐ VIP
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                    Blood: {activeSerial?.patient?.bloodGroup || 'B+'}
                  </Badge>
                  {activeSerial?.patient?.allergies && (
                    <Badge variant="destructive" className="font-semibold">
                      ⚠️ {activeSerial.patient.allergies}
                    </Badge>
                  )}
                  {/* Assessment Files Actions */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilesListModalOpen(true)}
                    className="h-8 text-xs gap-1.5 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 active:scale-95 cursor-pointer font-bold"
                  >
                    <FolderOpen className="size-3.5" />
                    <span>Old Files (পুরাতন ফাইল) {assessmentFilesCount > 0 ? `(${assessmentFilesCount})` : ''}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsNewAssessmentModalOpen(true)}
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/20 active:scale-95 cursor-pointer"
                  >
                    <FilePlus className="size-3.5" />
                    <span>New File (নতুন ফাইল)</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chamber Calling & Action Control Panel */}
          {activeSerial && (
            <div className="space-y-3">
              {/* STATUS 1: WAITING -> CALL TO CHAMBER BUTTON */}
              {(!activeSerial.status || activeSerial.status === 'waiting') && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
                      <Volume2 className="size-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                        <span>রোগী অপেক্ষমাণ আছেন (Waiting in Queue)</span>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-[10px]">
                          সিরিয়াল #{activeSerial.serialNumber}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        চেম্বারে আহ্বান করতে নিচের বাটনে চাপ দিন (টিভি ও ওয়েব ডিসপ্লেতে পূর্ণস্ক্রিন নোটিফিকেশন ও দ্বিভাষিক ঘোষণা শুরু হবে)
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCallToChamber}
                    disabled={callingActionLoading}
                    className="h-10 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    {callingActionLoading ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
                    <span>চেম্বারে ডাকুন (Call to Chamber)</span>
                  </Button>
                </div>
              )}

              {/* STATUS 2: CALLED -> 3 ACTION BUTTONS (MARK IN CONSULTATION, RECALL, CANCEL) */}
              {activeSerial.status === 'called' && (
                <div className="p-4 rounded-xl border-2 border-rose-500/60 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent space-y-3 shadow-md animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                      </span>
                      <span className="font-extrabold text-sm sm:text-base text-rose-700 dark:text-rose-300">
                        🔔 রোগীকে চেম্বারে ডাকা হচ্ছে (Now Calling Patient to Chamber...)
                      </span>
                    </div>
                    <Badge className="bg-rose-600 text-white font-mono text-xs">
                      CALLED • স্ক্রিনে নোটিফিকেশন সচল
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    টিভি ডিসপ্লে ও ওয়েব অপেক্ষাগারে ঘোষণা ও বেল বাজছে। রোগী কক্ষে উপস্থিত হলে &apos;পরামর্শ শুরু&apos; চাপুন (কিউ থেকে সরানো হবে), রোগী না এলে পুনরায় ডাকুন, অথবা বাতিল করুন।
                  </p>

                  {/* The 3 Specific Buttons Requested by User */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {/* Button 1: Mark in Consultation */}
                    <Button
                      type="button"
                      onClick={handleMarkInConsultation}
                      disabled={callingActionLoading}
                      className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-md shadow-emerald-500/20 active:scale-95 flex-1 min-w-[170px] cursor-pointer"
                    >
                      <CheckCircle className="size-4" />
                      <span>Mark in Consultation (পরামর্শ শুরু)</span>
                    </Button>

                    {/* Button 2: Recall */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRecall}
                      disabled={callingActionLoading}
                      className="h-9 px-4 border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold gap-2 active:scale-95 flex-1 min-w-[140px] cursor-pointer"
                    >
                      <PhoneCall className="size-4" />
                      <span>Recall (পুনরায় ডাকুন)</span>
                    </Button>

                    {/* Button 3: Cancel Call */}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelCall}
                      disabled={callingActionLoading}
                      className="h-9 px-3.5 border border-border/80 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 font-semibold gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <XCircle className="size-4 text-rose-500" />
                      <span>Cancel (কল বাতিল)</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* STATUS 3: IN_CHAMBER -> CURRENTLY IN CONSULTATION */}
              {activeSerial.status === 'in_chamber' && (
                <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1 py-1">
                      <Stethoscope className="size-3.5" />
                      <span>বর্তমানে পরামর্শ চলছে (In Consultation)</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      রোগীকে ওয়েটিং কিউ স্ক্রিন থেকে সরানো হয়েছে
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsNewAssessmentModalOpen(true)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <FilePlus className="size-3.5" />
                      <span>নতুন ফাইল পূরণ করুন</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFilesListModalOpen(true)}
                      className="h-8 text-xs border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <FolderOpen className="size-3.5" />
                      <span>পুরাতন ফাইল ({assessmentFilesCount})</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRecall}
                      disabled={callingActionLoading}
                      className="h-8 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1.5"
                    >
                      <PhoneCall className="size-3.5" />
                      <span>প্রয়োজনে পুনরায় ডাকুন</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Intake Form & Timeline Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-border/70 bg-card/60 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-emerald-500" />
                  <span className="font-semibold text-foreground">রোগীর প্রাথমিক তথ্য ফরম:</span>
                  {activeIntakeForm ? (
                    <span className="text-muted-foreground truncate max-w-xs sm:max-w-md">
                      {activeIntakeForm.chiefComplaint ? `সমস্যা: ${activeIntakeForm.chiefComplaint}` : 'রিসেপশন ফরম সংরক্ষিত'}
                      {activeIntakeForm.bpSystolic ? ` • BP: ${activeIntakeForm.bpSystolic}/${activeIntakeForm.bpDiastolic || 80}` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">ফরম এন্ট্রি নেই</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeIntakeForm && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsIntakeFormModalOpen(true)}
                      className="h-7 px-2.5 text-xs gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    >
                      <Eye className="size-3.5" />
                      <span>ফরম বিবরণী দেখুন</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsTimelineModalOpen(true)}
                    className="h-7 px-2.5 text-xs gap-1 border-border/80 text-muted-foreground hover:text-foreground"
                  >
                    <Clock className="size-3.5 text-purple-500" />
                    <span>টাইমলাইন</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Assessment Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                🩺 Clinical Physio Assessment (SOAP)
              </CardTitle>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold">
                  VAS Pain Score: <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{painScore}/10</span>
                </Label>
                <div className="w-32">
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={painScore}
                    onValueChange={(val: any) => setPainScore(Array.isArray(val) ? val[0] : val)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Chief Complaints & History"
                  rows={3}
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                />

                <Input
                  label="Provisional Diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <Textarea
                label="Objective Examination (ROM, Gait, Palpation, Special Tests)"
                rows={2}
                value={objectiveNotes}
                onChange={(e) => setObjectiveNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Therapy Modalities Prescribing */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                ⚡ Prescribed Therapy Modalities
              </CardTitle>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('IFT', 'Interferential Therapy (IFT)')}
                  className="text-xs font-semibold"
                >
                  + IFT
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('UST', 'Ultrasound Therapy (UST)')}
                  className="text-xs font-semibold"
                >
                  + Ultrasound
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('SWD', 'Shortwave Diathermy (SWD)')}
                  className="text-xs font-semibold"
                >
                  + Shortwave
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddModality('EXE', 'Therapeutic Exercise')}
                  className="text-xs font-semibold"
                >
                  + Exercise
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modality</TableHead>
                    <TableHead className="w-32">Prescribed Sessions</TableHead>
                    <TableHead className="w-36">Frequency</TableHead>
                    <TableHead className="w-16 text-right">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescribedMods.map((m) => (
                    <TableRow key={m.modalityCode}>
                      <TableCell className="font-bold text-foreground">
                        {m.modalityName}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24 h-8"
                          value={m.sessionsPrescribed}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setPrescribedMods(
                              prescribedMods.map((it) =>
                                it.modalityCode === m.modalityCode ? { ...it, sessionsPrescribed: val } : it,
                              ),
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={m.frequency}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            setPrescribedMods(
                              prescribedMods.map((it) =>
                                it.modalityCode === m.modalityCode ? { ...it, frequency: e.target.value } : it,
                              ),
                            );
                          }}
                          className="w-32 h-8 text-xs"
                        >
                          <option value="daily">Daily</option>
                          <option value="alternate_days">Alt. Days</option>
                          <option value="weekly">Weekly</option>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="size-7 p-0 ml-auto"
                          onClick={() => handleRemoveModality(m.modalityCode)}
                        >
                          ✕
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Medicines (Rx) Writer */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                ℞ Prescribed Medicines
              </CardTitle>
              <Button size="sm" onClick={handleAddMedicine} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                + Add Medicine
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2.5">
                {prescribedMeds.map((med, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1fr_2fr_auto] gap-2 items-center bg-muted/40 p-2.5 rounded-xl border border-border/60"
                  >
                    <Input
                      placeholder="Brand Name"
                      value={med.brandName}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].brandName = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="Generic"
                      value={med.genericName}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].genericName = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="1+0+1"
                      value={med.dosage}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].dosage = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="7 days"
                      value={med.duration}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].duration = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Input
                      placeholder="খাবারের পর"
                      value={med.instructions}
                      onChange={(e) => {
                        const updated = [...prescribedMeds];
                        updated[idx].instructions = e.target.value;
                        setPrescribedMeds(updated);
                      }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="size-8 p-0 shrink-0 self-center"
                      onClick={() => handleRemoveMedicine(idx)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>

              <Textarea
                label="Special Advice / নির্দেশাবলী"
                rows={2}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
              />

              <div className="pt-2">
                <Button
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm sm:text-base shadow-sm"
                  onClick={handleSaveAndPrint}
                >
                  📄 Save &amp; Print 5.5in × 8.27in Prescription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5.5in x 8.27in Prescription Modal */}
      {printData && (
        <PrescriptionPrintModal
          prescription={printData}
          onClose={() => setPrintData(null)}
        />
      )}

      {/* DOCTOR INTAKE FORM DETAIL DIALOG */}
      {activeIntakeForm && (
        <Dialog open={isIntakeFormModalOpen} onOpenChange={setIsIntakeFormModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5 bg-background border-emerald-500/30">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-wider">
                <FileText className="size-4" />
                <span>রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম বিবরণী</span>
              </div>
              <DialogTitle className="text-lg font-bold">
                {activeIntakeForm.name} ({activeIntakeForm.phone})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                রিসেপশনিস্ট: {activeIntakeForm.receptionistName || 'ডেস্ক'} • তারিখ: {activeIntakeForm.date}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Personal Details */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/50 space-y-2">
                <div className="font-semibold text-emerald-500 flex items-center gap-1.5">
                  <UserCheck className="size-3.5" />
                  <span>১. ব্যাক্তিগত তথ্য</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>নাম: <strong className="text-foreground">{activeIntakeForm.name}</strong></div>
                  <div>মোবাইল: <strong className="text-foreground font-mono">{activeIntakeForm.phone}</strong></div>
                  <div>বয়স: <strong className="text-foreground">{activeIntakeForm.ageYears || 'অনির্ধারিত'} বছর</strong></div>
                  <div>লিঙ্গ: <strong className="text-foreground capitalize">{activeIntakeForm.gender === 'male' ? 'পুরুষ' : 'মহিলা'}</strong></div>
                  <div>পেশা: <strong className="text-foreground">{activeIntakeForm.occupation || 'উলেখ নেই'}</strong></div>
                  <div className="col-span-2">ঠিকানা: <strong className="text-foreground">{activeIntakeForm.address || 'উলেখ নেই'}</strong></div>
                </div>
              </div>

              {/* Health Info */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/50 space-y-2">
                <div className="font-semibold text-rose-500 flex items-center gap-1.5">
                  <HeartPulse className="size-3.5" />
                  <span>২. প্রাথমিক স্বাস্থ্য তথ্য</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>রক্তচাপ: <strong className="text-foreground font-mono">{activeIntakeForm.bpSystolic ? `${activeIntakeForm.bpSystolic}/${activeIntakeForm.bpDiastolic || 80} mmHg` : 'পরিমাপ করা হয়নি'}</strong></div>
                  <div>রক্তে শর্করা: <strong className="text-foreground font-mono">{activeIntakeForm.bloodSugar ? `${activeIntakeForm.bloodSugar} mmol/L` : 'পরিমাপ করা হয়নি'}</strong></div>
                  <div>ডায়াবেটিস: <strong className="text-foreground">{activeIntakeForm.hasDiabetes === 1 ? 'হ্যাঁ (আক্রান্ত)' : 'না'}</strong></div>
                  <div>ওজন: <strong className="text-foreground font-mono">{activeIntakeForm.weightKg ? `${activeIntakeForm.weightKg} কেজি` : 'পরিমাপ করা হয়নি'}</strong></div>
                  <div className="col-span-2">প্রধান শারীরিক সমস্যা: <strong className="text-foreground">{activeIntakeForm.chiefComplaint || 'উলেখ নেই'}</strong></div>
                  {activeIntakeForm.problemDuration && (
                    <div className="col-span-2">কতদিন ধরে সমস্যা: <strong className="text-foreground">{activeIntakeForm.problemDuration}</strong></div>
                  )}
                </div>
              </div>

              {/* Past History */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/50 space-y-2">
                <div className="font-semibold text-amber-500 flex items-center gap-1.5">
                  <History className="size-3.5" />
                  <span>৩. পূর্ববর্তী চিকিৎসার বিবরণ</span>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div>পূর্বে ডাক্তার দেখিয়েছেন: <strong className="text-foreground">{activeIntakeForm.seenDoctorBefore === 1 ? `হ্যাঁ (${activeIntakeForm.previousDoctorDetails || ''})` : 'না'}</strong></div>
                  <div>পূর্বের টেস্ট রিপোর্ট: <strong className="text-foreground">{activeIntakeForm.hasPreviousReports === 1 ? `হ্যাঁ (${activeIntakeForm.previousReportNames || ''})` : 'না'}</strong></div>
                  <div>নিয়মিত ওষুধ সেবন: <strong className="text-foreground">{activeIntakeForm.takesRegularMedication === 1 ? `হ্যাঁ (${activeIntakeForm.regularMedicationDetails || ''})` : 'না'}</strong></div>
                  <div>ওষুধে এলার্জি: <strong className="text-foreground text-red-400">{activeIntakeForm.hasDrugAllergies === 1 ? `হ্যাঁ (${activeIntakeForm.drugAllergyDetails || ''})` : 'না'}</strong></div>
                </div>
              </div>

              {/* Referral & Special Notes */}
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Stethoscope className="size-3.5" />
                  <span>৪. রেফারেল ও মন্তব্য</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>সোর্স: <strong className="text-foreground capitalize">{activeIntakeForm.referralSource || 'অনির্ধারিত'}</strong></div>
                  {activeIntakeForm.specialNotes && (
                    <div className="col-span-2">রিসেপশন মন্তব্য: <strong className="text-foreground">{activeIntakeForm.specialNotes}</strong></div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsIntakeFormModalOpen(false)}
                className="text-xs"
              >
                বন্ধ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PATIENT TIMELINE MODAL */}
      <PatientTimelineModal
        open={isTimelineModalOpen}
        onOpenChange={setIsTimelineModalOpen}
        patientId={activeSerial?.patientId}
        patientName={activeSerial?.patient?.nameBn || activeSerial?.patient?.nameEn}
      />

      {/* PAIN ASSESSMENT FORM MODAL (CREATE NEW) */}
      <PainAssessmentFormModal
        open={isNewAssessmentModalOpen}
        onOpenChange={setIsNewAssessmentModalOpen}
        patient={activeSerial?.patient}
        doctorId={session?.staffId || session?.userId}
        doctorName={session?.displayName}
        visitId={activeSerial?.visitId || activeSerial?.id}
        currentUser={session}
        existingFile={null}
        onSuccess={handleAssessmentFileSaved}
      />

      {/* PATIENT OLD FILES LIST MODAL */}
      <PatientFilesListModal
        open={isFilesListModalOpen}
        onOpenChange={setIsFilesListModalOpen}
        patient={activeSerial?.patient}
        doctorId={session?.staffId || session?.userId}
        doctorName={session?.displayName}
        visitId={activeSerial?.visitId || activeSerial?.id}
        currentUser={session}
        onFileSelected={handleAssessmentFileSaved}
        onCreateNew={() => {
          setIsFilesListModalOpen(false);
          setIsNewAssessmentModalOpen(true);
        }}
      />
        </>
      )}
    </div>
  );
}
