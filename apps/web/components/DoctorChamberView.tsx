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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
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
import { PatientPrescriptionsListModal } from './patient/PatientPrescriptionsListModal';
import { IntakeAssessmentPrintModal } from './patient/IntakeAssessmentPrintModal';
import { PatientIntakeFormModal } from './patient/PatientIntakeFormModal';
import { PrescriptionBuilderSection } from './doctor/PrescriptionBuilderSection';
import { PrescriptionBuilderModal } from './doctor/PrescriptionBuilderModal';
import { TreatmentPlanBuilderModal } from './doctor/TreatmentPlanBuilderModal';
import { PatientPlansListModal } from './doctor/PatientPlansListModal';
import { DoctorDispositionModal } from './doctor/DoctorDispositionModal';
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
  Activity,
  Send,
  Printer,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Gift,
  CreditCard,
  HelpCircle,
} from 'lucide-react';

export interface DoctorChamberProps {
  session?: UserSession | null;
}

export function getCleanReason(rawReason?: string | null): string {
  if (!rawReason) return '';
  const trimmed = rawReason.trim();
  const bracketMatch = trimmed.match(/^\[(.*?)\]/);
  if (bracketMatch && bracketMatch[1]) {
    const after = trimmed.slice(bracketMatch[0].length).trim();
    return after ? `${bracketMatch[1]} (${after})` : bracketMatch[1];
  }
  return trimmed;
}

export type PatientClinicalStatusType = 'brand_new' | 'old_active' | 'lapsed_reintake';

export interface PatientClinicalStatusInfo {
  status: PatientClinicalStatusType;
  lastVisitDays?: number | null;
  lastVisitDate?: string | null;
  labelBn: string;
  labelEn: string;
}

export function resolvePatientClinicalStatus(
  item: any,
  cachedStatus?: PatientClinicalStatusInfo | null
): PatientClinicalStatusInfo {
  if (cachedStatus) return cachedStatus;

  const rawStatus =
    item?.patientClinicalStatus?.patientType ||
    item?.patientClinicalStatus?.status ||
    item?.patientClinicalStatus ||
    item?.clinicalStatus?.patientType ||
    item?.clinicalStatus?.status ||
    item?.clinicalStatus ||
    item?.patient?.patientClinicalStatus?.patientType ||
    item?.patient?.clinicalStatus?.patientType;

  const rawLastVisitDays =
    item?.patientClinicalStatus?.daysSinceLastActivity ??
    item?.clinicalStatus?.daysSinceLastActivity ??
    item?.patient?.clinicalStatus?.daysSinceLastActivity ??
    item?.lastVisitDays;

  const rawLastVisitDate =
    item?.patientClinicalStatus?.lastActivityDate ??
    item?.clinicalStatus?.lastActivityDate ??
    item?.patient?.clinicalStatus?.lastActivityDate ??
    item?.lastVisitDate;

  if (rawStatus === 'brand_new') {
    return {
      status: 'brand_new',
      lastVisitDays: null,
      lastVisitDate: null,
      labelBn: 'নতুন রোগী',
      labelEn: 'New Patient',
    };
  }

  if (rawStatus === 'lapsed_reintake') {
    return {
      status: 'lapsed_reintake',
      lastVisitDays: rawLastVisitDays ?? 90,
      lastVisitDate: rawLastVisitDate,
      labelBn: 'পুনর্বার মূল্যায়ন (>৩ মাস)',
      labelEn: 'Re-Evaluation (>3m)',
    };
  }

  if (rawStatus === 'old_active') {
    return {
      status: 'old_active',
      lastVisitDays: rawLastVisitDays ?? null,
      lastVisitDate: rawLastVisitDate,
      labelBn: rawLastVisitDays ? `ফলো-আপ • ${rawLastVisitDays} দিন` : 'পুরাতন / ফলো-আপ',
      labelEn: rawLastVisitDays ? `Follow-up • ${rawLastVisitDays}d` : 'Follow-up',
    };
  }

  if (item?.priority === 'follow_up' || item?.visitType === 'follow_up') {
    return {
      status: 'old_active',
      lastVisitDays: null,
      labelBn: 'পুরাতন / ফলো-আপ',
      labelEn: 'Follow-up',
    };
  }

  return {
    status: 'brand_new',
    lastVisitDays: null,
    labelBn: 'নতুন রোগী',
    labelEn: 'New Patient',
  };
}

export default function DoctorChamberView({ session: propSession }: DoctorChamberProps = {}) {
  const session = propSession || getSession();
  const [queue, setQueue] = useState<any[]>([]);
  const [activeSerial, setActiveSerial] = useState<any>(null);
  const [medicinesList, setMedicinesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Consultation & Prescription State (Clean initial values, NO mock data!)
  const [chiefComplaints, setChiefComplaints] = useState<string>('');
  const [painScore, setPainScore] = useState<number>(0);
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [objectiveNotes, setObjectiveNotes] = useState<string>('');
  const [advice, setAdvice] = useState<string>('');

  // Prescribed Medicines State (Empty array, NOT mock data)
  const [prescribedMeds, setPrescribedMeds] = useState<any[]>([]);

  // Prescribed Modalities State (Empty array, NOT mock data)
  const [prescribedMods, setPrescribedMods] = useState<any[]>([]);

  // Print & Modal states
  const [printData, setPrintData] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<'queue' | 'consultation'>('queue');
  const [doctorMainTab, setDoctorMainTab] = useState<'chamber' | 'therapy_queue'>('chamber');

  // Intake Form & Modals States
  const [activeIntakeForm, setActiveIntakeForm] = useState<any>(null);
  const [isIntakePrintModalOpen, setIsIntakePrintModalOpen] = useState(false);
  const [isCreateIntakeModalOpen, setIsCreateIntakeModalOpen] = useState(false);
  const [copiedIntake, setCopiedIntake] = useState(false);
  const [selectedIntakePatient, setSelectedIntakePatient] = useState<any>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [callingActionLoading, setCallingActionLoading] = useState(false);

  // Assessment Files State
  const [assessmentFilesCount, setAssessmentFilesCount] = useState<number>(0);
  const [isFilesListModalOpen, setIsFilesListModalOpen] = useState(false);
  const [isNewAssessmentModalOpen, setIsNewAssessmentModalOpen] = useState(false);

  // Prescription & Disposition States
  const [isPrescriptionsListModalOpen, setIsPrescriptionsListModalOpen] = useState(false);
  const [isDispositionModalOpen, setIsDispositionModalOpen] = useState(false);
  const [isTreatmentPlanModalOpen, setIsTreatmentPlanModalOpen] = useState(false);
  const [isPreviousPlansModalOpen, setIsPreviousPlansModalOpen] = useState(false);
  const [initialPlansForBuilder, setInitialPlansForBuilder] = useState<any[]>([]);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [savingRx, setSavingRx] = useState(false);

  // Running Therapy Live Monitor State
  const [runningTherapies, setRunningTherapies] = useState<any[]>([]);
  const [showTherapyMonitor, setShowTherapyMonitor] = useState<boolean>(true);
  const [therapyTick, setTherapyTick] = useState<number>(0);
  const prevWaitingCountRef = React.useRef(0);

  const doctorId = session?.staffId || '';
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    if (session?.role === 'doctor') {
      return session.staffId || session.userId || 'all';
    }
    return 'all';
  });

  const loadQueue = async (overrideDoctorId?: string, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      // Load doctors list
      let doctors: any[] = [];
      try {
        doctors = await api.staff.listDoctors();
      } catch {
        const staffList = await api.staff.list();
        doctors = (staffList || []).filter((s: any) => s.role === 'doctor');
      }
      setDoctorsList(doctors || []);

      const targetDoctorId = overrideDoctorId !== undefined ? overrideDoctorId : selectedDoctorId;
      const queryDoctorId = targetDoctorId || 'all';

      let q: any[] = [];
      try {
        q = await api.visits.getDoctorQueue(queryDoctorId);
      } catch (err) {
        console.error('getDoctorQueue error:', err);
        q = [];
      }

      // If 'all' was queried and backend returned empty, attempt multi-doctor fetch as fallback
      if ((!q || q.length === 0) && queryDoctorId === 'all' && doctors && doctors.length > 0) {
        try {
          const queues = await Promise.all(
            doctors.map((d: any) => api.visits.getDoctorQueue(d.id || d.userId).catch(() => []))
          );
          const merged = queues.flat();
          const seen = new Set();
          q = merged.filter((item: any) => {
            if (!item || !item.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          // Sort strictly by arrival / appointment time
          q.sort((a: any, b: any) => {
            const timeA = new Date(a.bookingTime || a.checkedInAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.bookingTime || b.checkedInAt || b.createdAt || 0).getTime();
            return timeA - timeB;
          });
        } catch {
          // ignore
        }
      }

      setQueue(q || []);
      if (q && q.length > 0) {
        setActiveSerial((prev: any) => {
          if (prev) {
            return q.find((s: any) => s.id === prev.id) || null;
          }
          const inProgress = q.find((s: any) => s.status === 'in_chamber' || s.status === 'called');
          return inProgress || null;
        });
      } else {
        setActiveSerial(null);
      }

      const meds = await api.inventory.getMedicines();
      setMedicinesList(meds || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchRunningTherapies = async () => {
    try {
      const qData = await api.therapy.getQueue();
      if (qData) {
        const raw = qData.activeSessions || qData.inTherapy || [];
        const active = raw.filter(
          (s: any) => s.status !== 'checked_out' && s.status !== 'cancelled'
        );
        setRunningTherapies(active);
      }
    } catch {}
  };

  useEffect(() => {
    fetchRunningTherapies();
    const tickInterval = setInterval(() => {
      setTherapyTick((t) => t + 1);
    }, 1000);
    const syncInterval = setInterval(() => {
      fetchRunningTherapies();
    }, 3000);
    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
    };
  }, []);

  // Acoustic chime when new patient arrives
  useEffect(() => {
    const waitingCount = queue.filter(
      (item) => item.status === 'waiting' || item.status === 'called'
    ).length;

    if (waitingCount > prevWaitingCountRef.current && prevWaitingCountRef.current > 0) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      } catch {}
      toast.info('🔔 নতুন রোগী চেম্বার কিউতে যোগ হয়েছেন!');
    }
    prevWaitingCountRef.current = waitingCount;
  }, [queue]);

  // Instant Realtime sync for chamber queue & therapy sessions
  useRealtime((event) => {
    if (
      event.type.startsWith('queue.') ||
      event.type.startsWith('serial.') ||
      event.type.startsWith('consultation.') ||
      event.type.startsWith('visit.') ||
      event.type.startsWith('doctor.')
    ) {
      loadQueue(undefined, true);
    }
    if (
      event.type.startsWith('therapy.') ||
      event.type.startsWith('session.') ||
      event.type.startsWith('visit.') ||
      event.type.startsWith('queue.')
    ) {
      fetchRunningTherapies();
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

  const handleDoctorChange = (val: string) => {
    setSelectedDoctorId(val);
    loadQueue(val);
  };

  useEffect(() => {
    if (session?.role === 'doctor' && selectedDoctorId === 'all') {
      const docId = session.staffId || session.userId;
      if (docId) {
        setSelectedDoctorId(docId);
      }
    }
  }, [session?.role, session?.staffId, session?.userId]);

  // Live 3-second interval polling loop (matches TV screen real-time updates)
  useEffect(() => {
    loadQueue();
    const interval = setInterval(() => {
      loadQueue(undefined, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedDoctorId]);

  // Load intake form and active therapy plans whenever activeSerial changes
  useEffect(() => {
    if (activeSerial?.patientId) {
      api.patients
        .getLatestIntakeForm(activeSerial.patientId)
        .then((form) => {
          if (form && (form.id || form.chiefComplaint || form.bpSystolic)) {
            setActiveIntakeForm(form);
            if (form.chiefComplaint) {
              setChiefComplaints((prev) => (prev ? prev : form.chiefComplaint));
            }
          } else {
            api.patients
              .listIntakeForms({ patientId: activeSerial.patientId, date: 'all' })
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
          }
        })
        .catch(() => {
          api.patients
            .listIntakeForms({ patientId: activeSerial.patientId, date: 'all' })
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
        });

      // Fetch active therapy plans for active patient
      api.therapy
        .getPlans(activeSerial.patientId)
        .then((plans) => {
          if (Array.isArray(plans) && plans.length > 0) {
            setPrescribedMods(
              plans.map((p) => ({
                modalityCode: p.modalityCode || p.code,
                modalityName: p.modalityName || p.modality?.nameEn || p.code,
                sessionsPrescribed: p.totalSessionsPrescribed || 10,
                frequency: p.frequency || 'daily',
                notes: p.notes,
              }))
            );
          }
        })
        .catch(() => {});
    } else {
      setActiveIntakeForm(null);
    }
  }, [activeSerial?.patientId]);

  const handleSelectSerial = (s: any) => {
    setActiveSerial(s);
    setMobileTab('consultation');
  };

  const handleOpenIntakeModal = (s: any) => {
    setSelectedIntakePatient(s);
    setIsIntakePrintModalOpen(true);
  };

  // -------------------------------------------------------------
  // CALLING ACTION HANDLERS
  // -------------------------------------------------------------
  const handleCallSpecificSerial = async (s: any) => {
    try {
      setCallingActionLoading(true);
      setActiveSerial(s);
      await api.visits.callSerial(s.id);
      setActiveSerial((prev: any) => ({ ...prev, status: 'called' }));
      toast.success(`রোগী ${s.patient?.nameBn || s.patient?.nameEn || ''} কে চেম্বারে ডাকা হয়েছে! টিভি ও ওয়েব স্ক্রিনে ঘোষণা শুরু হয়েছে।`);
      loadQueue();
    } catch (err: any) {
      toast.error(err?.message || 'চেম্বারে ডাকতে ব্যর্থ হয়েছে');
    } finally {
      setCallingActionLoading(false);
    }
  };

  const handleRecallSerial = async (serialId?: string) => {
    const id = serialId || activeSerial?.id;
    if (!id) return;
    try {
      setCallingActionLoading(true);
      await api.visits.recallSerial(id);
      toast.info('রোগীকে পুনরায় চেম্বারে ডাকা হয়েছে (Re-announced on TV screens)!');
      loadQueue();
    } catch (err: any) {
      toast.error(err?.message || 'পুনরায় ডাকতে ব্যর্থ হয়েছে');
    } finally {
      setCallingActionLoading(false);
    }
  };

  const handleMarkInConsultation = async (serialId?: string) => {
    const id = serialId || activeSerial?.id;
    if (!id) return;
    try {
      setCallingActionLoading(true);
      await api.visits.markInConsultation(id);
      setActiveSerial((prev: any) => ({ ...prev, status: 'in_chamber' }));
      setMobileTab('consultation');
      toast.success('কনসালটেশন শুরু হয়েছে! রোগীকে ওয়েটিং কিউ স্ক্রিন থেকে সরানো হয়েছে।');
      loadQueue();
    } catch (err: any) {
      toast.error(err?.message || 'কনসালটেশন শুরু করতে ব্যর্থ হয়েছে');
    } finally {
      setCallingActionLoading(false);
    }
  };

  const handleCancelCall = async (serialId?: string) => {
    const id = serialId || activeSerial?.id;
    if (!id) return;
    try {
      setCallingActionLoading(true);
      await api.visits.cancelCall(id);
      setActiveSerial((prev: any) => ({ ...prev, status: 'waiting' }));
      toast.warning('কল বাতিল করা হয়েছে। রোগী ওয়েটিং কিউতে অপেক্ষমাণ থাকবেন।');
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

  const handleResetNewPrescription = () => {
    setPrescribedMeds([
      {
        brandName: '',
        genericName: '',
        form: 'Tab',
        strength: '',
        dosage: '1+0+1',
        duration: '৫ দিন',
        instructions: 'খাবারের পর',
      },
    ]);
    setAdvice('');
    setFollowUpDate('');
    setIsPrescriptionModalOpen(true);
    toast.info('নতুন প্রেসক্রিপশন উইন্ডো খোলা হয়েছে');
  };

  const handleClonePrescription = (rx: any) => {
    if (Array.isArray(rx.medicines) && rx.medicines.length > 0) {
      setPrescribedMeds(rx.medicines);
    }
    if (rx.advice) {
      setAdvice(rx.advice);
    }
    if (rx.clinicalNotes?.diagnosis && !diagnosis) {
      setDiagnosis(rx.clinicalNotes.diagnosis);
    }
    if (rx.followUpDate) {
      setFollowUpDate(rx.followUpDate);
    }
    setIsPrescriptionModalOpen(true);
    toast.success('পূর্বের প্রেসক্রিপশনের ওষুধ ও নির্দেশাবলী লোড করা হয়েছে!');
  };

  const handlePlansSaved = (plans: any[]) => {
    setPrescribedMods(
      plans.map((p) => ({
        modalityCode: p.modalityCode,
        modalityName: p.modalityName || p.modalityNameBn || p.modalityCode,
        sessionsPrescribed: p.totalSessionsPrescribed || 10,
        frequency: p.frequency || 'daily',
        notes: p.notes,
      }))
    );
    loadQueue(undefined, true);
  };

  const handlePrescriptionSavedAndPrint = (rxData: any) => {
    if (rxData?.medicines) {
      setPrescribedMeds(rxData.medicines);
    }
    if (rxData?.advice) {
      setAdvice(rxData.advice);
    }
    if (rxData?.followUpDate) {
      setFollowUpDate(rxData.followUpDate);
    }
    setPrintData({
      rxNumber:
        rxData?.rxNumber ||
        `RX-${new Date().getFullYear()}-${String(activeSerial?.serialNumber || 1).padStart(4, '0')}`,
      serialNumber: activeSerial?.serialNumber,
      patient: {
        nameEn: activeSerial?.patient?.nameEn || activeSerial?.patient?.nameBn || 'Patient',
        nameBn: activeSerial?.patient?.nameBn,
        mrn: activeSerial?.patient?.mrn || 'N/A',
        phone: activeSerial?.patient?.phone || '',
        ageYears: activeSerial?.patient?.ageYears,
        gender: activeSerial?.patient?.gender || 'male',
        bloodGroup: activeSerial?.patient?.bloodGroup,
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
      medicines: rxData?.medicines || prescribedMeds,
      modalities: prescribedMods,
      advice: rxData?.advice || advice,
      followUpDate: rxData?.followUpDate || followUpDate,
      createdAt: new Date().toISOString(),
    });
    loadQueue(undefined, true);
  };

  const handleSaveAndPrint = async () => {
    if (!activeSerial) {
      toast.error('No active patient selected from queue!');
      return;
    }

    try {
      setSavingRx(true);
      let createdRx = null;
      try {
        createdRx = await api.prescriptions.create({
          visitId: activeSerial.id,
          doctorId: activeSerial.doctorId || session?.staffId || session?.userId || 'staff-1',
          patientId: activeSerial.patientId,
          chiefComplaints,
          diagnosis,
          painScore,
          objectiveNotes,
          advice,
          followUpDate,
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
          nameEn: activeSerial.patient?.nameEn || activeSerial.patient?.nameBn || 'Patient',
          nameBn: activeSerial.patient?.nameBn,
          mrn: activeSerial.patient?.mrn || 'N/A',
          phone: activeSerial.patient?.phone || '',
          ageYears: activeSerial.patient?.ageYears,
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
        followUpDate,
        createdAt: new Date().toISOString(),
      });

      loadQueue();
    } catch (err: any) {
      toast.error(`Error saving prescription: ${err.message}`);
    } finally {
      setSavingRx(false);
    }
  };

  // Waiting queue only includes patients waiting or actively being called who are still in clinic
  const waitingQueue = queue.filter(
    (s) =>
      (s.status === 'waiting' || s.status === 'called') &&
      s.visit?.status !== 'checked_out' &&
      !s.visit?.checkedOutAt &&
      s.visit?.status !== 'cancelled'
  );

  // Punctuality Badge Helper
  const getPunctualityBadge = (item: any) => {
    const status = item.punctualityStatus;
    const delay = item.delayMinutes;

    if (status === 'on_time') {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
          ⏱️ সময়মতো (On-time)
        </Badge>
      );
    }
    if (status === 'moderate_delay') {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
          ⏳ মাঝারি দেরি {delay ? `(${delay}মি)` : ''}
        </Badge>
      );
    }
    if (status === 'critical_delay') {
      return (
        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
          🚨 অতিরিক্ত দেরি {delay ? `(${delay}মি)` : ''}
        </Badge>
      );
    }
    if (status === 'early') {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold">
          ⚡ পূর্বে উপস্থিতি (Early)
        </Badge>
      );
    }
    if (item.toldTime) {
      return (
        <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
          🕒 সময়: {item.toldTime}
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
        ⏱️ সময়মতো (On-time)
      </Badge>
    );
  };

  // Priority Marker Helper
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'emergency':
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold animate-pulse px-1.5 py-0.5 bg-rose-500 text-white shadow-xs">
            🚨 Emergency
          </Badge>
        );
      case 'vip':
        return (
          <Badge className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-1.5 py-0.5">
            ⭐ VIP
          </Badge>
        );
      case 'package':
        return (
          <Badge className="text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 px-1.5 py-0.5">
            📦 Package
          </Badge>
        );
      case 'follow_up':
        return (
          <Badge className="text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-1.5 py-0.5">
            🔄 Follow-Up
          </Badge>
        );
      case 'elderly':
        return (
          <Badge className="text-[10px] font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 px-1.5 py-0.5">
            🧓 Elderly
          </Badge>
        );
      case 'normal':
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/80">
            Normal
          </Badge>
        );
    }
  };

  // 3-Tier Clinical Status Badge Helper
  const renderPatientClinicalStatusBadge = (itemOrSerial: any, size: 'sm' | 'default' = 'default') => {
    const info = resolvePatientClinicalStatus(itemOrSerial);
    if (!info) return null;

    if (info.status === 'brand_new') {
      return (
        <Badge
          variant="outline"
          className={cn(
            'font-bold border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 gap-1',
            size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
          )}
        >
          <Sparkles className={size === 'sm' ? 'size-2.5' : 'size-3.5'} />
          <span>{info.labelBn}</span>
        </Badge>
      );
    }

    if (info.status === 'lapsed_reintake') {
      return (
        <Badge
          variant="outline"
          className={cn(
            'font-bold border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 gap-1',
            size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
          )}
        >
          <AlertCircle className={size === 'sm' ? 'size-2.5' : 'size-3.5'} />
          <span>{info.labelBn}</span>
        </Badge>
      );
    }

    // old_active
    return (
      <Badge
        variant="outline"
        className={cn(
          'font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1',
          size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
        )}
      >
        <UserCheck className={size === 'sm' ? 'size-2.5' : 'size-3.5'} />
        <span>{info.labelBn}</span>
      </Badge>
    );
  };

  // Copy intake assessment & vitals summary to chief complaints
  const handleCopyIntakeToPrescription = () => {
    if (!activeIntakeForm) return;
    const parts: string[] = [];
    if (activeIntakeForm.chiefComplaint) {
      parts.push(`অভিযোগ: ${activeIntakeForm.chiefComplaint}`);
    }
    if (activeIntakeForm.painSite) {
      parts.push(`ব্যথার স্থান: ${activeIntakeForm.painSite}`);
    }
    if (activeIntakeForm.duration) {
      parts.push(`স্থিতিকাল: ${activeIntakeForm.duration}`);
    }
    const vitalsSummary: string[] = [];
    if (activeIntakeForm.bpSystolic) {
      vitalsSummary.push(`BP: ${activeIntakeForm.bpSystolic}/${activeIntakeForm.bpDiastolic || '--'} mmHg`);
    }
    if (activeIntakeForm.bloodSugar) {
      vitalsSummary.push(`RBS: ${activeIntakeForm.bloodSugar} mmol/L`);
    }
    if (activeIntakeForm.weightKg) {
      vitalsSummary.push(`Wt: ${activeIntakeForm.weightKg} kg`);
    }
    if (activeIntakeForm.pulseRate) {
      vitalsSummary.push(`Pulse: ${activeIntakeForm.pulseRate} bpm`);
    }
    if (vitalsSummary.length > 0) {
      parts.push(`ভাইটালস: [${vitalsSummary.join(', ')}]`);
    }

    const textToAppend = parts.join(' | ');
    if (textToAppend) {
      setChiefComplaints((prev) => (prev ? `${prev}\n${textToAppend}` : textToAppend));
    }
    if (typeof activeIntakeForm.painSeverity === 'number' && activeIntakeForm.painSeverity > 0) {
      setPainScore(activeIntakeForm.painSeverity);
    }
    setCopiedIntake(true);
    toast.success('ইনটেক ও ভাইটালস তথ্য প্রেসক্রিপশনের চিফ কমপ্লেইন্টস ফিল্ডে যুক্ত হয়েছে!');
    setTimeout(() => setCopiedIntake(false), 2500);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Workstation Navigation Switcher & Doctor Chamber Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

        {/* Doctor / Chamber Selector Dropdown */}
        {doctorMainTab === 'chamber' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden md:inline">
              চেম্বার:
            </span>
            <Select value={selectedDoctorId} onValueChange={handleDoctorChange}>
              <SelectTrigger className="w-full sm:w-[260px] h-9 text-xs font-semibold rounded-xl bg-card border-border/80 shadow-xs">
                <SelectValue placeholder="সকল চেম্বার / All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium">
                  🏥 সকল চেম্বার / All Doctors
                </SelectItem>
                {doctorsList.map((doc: any) => {
                  const roomStr = doc.chamberRoomNumber
                    ? ` - Room ${doc.chamberRoomNumber}`
                    : doc.chamberName
                    ? ` - ${doc.chamberName}`
                    : '';
                  return (
                    <SelectItem
                      key={doc.id || doc.userId}
                      value={doc.id || doc.userId}
                      className="text-xs font-medium"
                    >
                      ডাঃ {doc.displayName || doc.fullName || 'Doctor'}{roomStr}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {doctorMainTab === 'therapy_queue' ? (
        <TherapyQueueManagementTab />
      ) : (
        <>
          {/* Mobile Adaptive Segmented Control */}
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
              🚪 অপেক্ষমাণ কিউ ({waitingQueue.length})
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
              📝 পরামর্শ কক্ষ {activeSerial ? `(${activeSerial.patient?.nameBn || activeSerial.patient?.nameEn || ''})` : ''}
            </Button>
          </div>

          {/* ========================================================= */}
          {/* RUNNING THERAPY LIVE SESSIONS MONITOR (Doctor View)       */}
          {/* ========================================================= */}
          {runningTherapies.length > 0 && (
            <Card className="mb-4 border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-transparent shadow-xs overflow-hidden">
              <CardHeader className="py-2.5 px-4 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                    <span>⚡ থেরাপি হলে চলমান সেশন ({runningTherapies.length} জন রোগী)</span>
                  </span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold">
                    LIVE
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTherapyMonitor(!showTherapyMonitor)}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showTherapyMonitor ? 'সংকুচিত করুন' : 'সম্প্রসারিত করুন'}
                </Button>
              </CardHeader>

              {showTherapyMonitor && (
                <CardContent className="p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {runningTherapies.map((session, sIdx) => {
                      const durMin = Number(session.durationMinutes) || 15;
                      const startMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
                      const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
                      const totalSec = Math.max(1, durMin * 60);
                      const remainingSec = Math.max(0, totalSec - elapsedSec);
                      const isOvertime = elapsedSec > totalSec;
                      const progressPct = Math.min(100, Math.round((elapsedSec / totalSec) * 100));

                      const elMin = Math.floor(elapsedSec / 60);
                      const elS = elapsedSec % 60;
                      const remMin = Math.floor(remainingSec / 60);
                      const remS = remainingSec % 60;

                      const elapsedFormatted = `${elMin.toString().padStart(2, '0')}:${elS.toString().padStart(2, '0')}`;
                      const remainingFormatted = `${remMin.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;

                      return (
                        <div
                          key={session.sessionId || session.visitId || sIdx}
                          className="p-3 rounded-xl border border-border/70 bg-card/90 shadow-2xs space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <div className="font-bold text-foreground">
                                {session.patientNameBn || session.patientNameEn || 'Patient'}
                              </div>
                              <div className="text-[10px] font-mono text-muted-foreground">
                                MRN: {session.mrn} · {session.bedName ? `রুম: ${session.bedName}` : 'থেরাপি হল'}
                              </div>
                            </div>
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-mono">
                              {session.modalityCode || 'TH'}
                            </Badge>
                          </div>

                          {/* Current Modality & Countdown */}
                          <div className="p-2 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                                <span>⚡</span>
                                <span>{session.modalityNameBn || session.modalityNameEn || session.modalityCode}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                মোট: {durMin} মিনিট
                              </div>
                            </div>
                            <div className="text-right">
                              {isOvertime ? (
                                <Badge className="bg-rose-500 text-white font-mono text-[10px] animate-pulse">
                                  + {Math.floor((elapsedSec - totalSec) / 60)}m অতিরিক্ত
                                </Badge>
                              ) : (
                                <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                                  বাকি: {remainingFormatted}
                                </div>
                              )}
                              <div className="text-[9.5px] font-mono text-muted-foreground mt-0.5">
                                অতিবাহিত: {elapsedFormatted}
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all duration-1000',
                                isOvertime ? 'bg-rose-500' : 'bg-emerald-500'
                              )}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          {/* Next Modality indicator */}
                          <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-0.5">
                            <span className="font-medium text-foreground">পরবর্তী থেরাপি:</span>
                            <span className="text-cyan-700 dark:text-cyan-300 font-semibold font-mono">
                              {session.nextModality || 'পরবর্তী ধাপ শিডিউল্ড'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 sm:gap-6 w-full items-start">
            {/* ========================================================= */}
            {/* 1. LEFT COLUMN: CONSULTATION WAITING QUEUE DISPLAY        */}
            {/* ========================================================= */}
            <Card className={cn('h-fit transition-all border-border shadow-sm', mobileTab !== 'queue' && 'hidden lg:block')}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>🚪</span> কনসালটেশন কিউ ({waitingQueue.length})
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedDoctorId === 'all'
                      ? 'সকল চেম্বারের অপেক্ষমাণ ও আহূত রোগীদের তালিকা'
                      : 'অপেক্ষমাণ ও আহূত রোগীদের তালিকা'}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {waitingQueue.length === 0 ? (
                  <div className="text-center py-10 px-4 text-muted-foreground text-sm border border-dashed rounded-xl">
                    <CheckCircle className="size-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="font-semibold text-foreground">বর্তমানে কোনো রোগী অপেক্ষমাণ নেই</p>
                    <p className="text-xs text-muted-foreground mt-0.5">নতুন রোগী চেম্বার কিউতে প্রবেশ করলে এখানে সরাসরি যুক্ত হবে।</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {waitingQueue.map((s) => {
                      const isCurrent = activeSerial?.id === s.id;
                      const isCalled = s.status === 'called';
                      const assignedDoctor = doctorsList.find(
                        (d) => d.id === s.doctorId || d.userId === s.doctorId
                      );
                      const doctorName =
                        s.doctorName ||
                        s.doctor?.name ||
                        s.doctor?.fullName ||
                        assignedDoctor?.displayName ||
                        assignedDoctor?.fullName;
                      const roomNumber =
                        s.chamberRoomNumber ||
                        s.roomNumber ||
                        s.chamber?.roomNumber ||
                        assignedDoctor?.chamberRoomNumber ||
                        assignedDoctor?.chamberName;

                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSerial(s)}
                          className={cn(
                            'border rounded-xl p-3.5 transition-all shadow-xs cursor-pointer',
                            isCalled
                              ? 'border-rose-500/70 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent'
                              : isCurrent
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-border bg-card hover:bg-muted/50'
                          )}
                        >
                          {/* Top row: Arrival Time, Punctuality & Priority Badge */}
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{s.bookingTime || (s.checkedInAt ? new Date(s.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</span>
                              </div>
                              {getPriorityBadge(s.priority)}
                              {renderPatientClinicalStatusBadge(s, 'sm')}
                            </div>
                            <div className="flex items-center gap-1">
                              {getPunctualityBadge(s)}
                            </div>
                          </div>

                          {/* Doctor & Room Badge (shown in 'all' mode or whenever doctor information is available) */}
                          {(selectedDoctorId === 'all' || doctorName) && doctorName && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-md"
                              >
                                <Stethoscope className="size-3 mr-1 inline text-emerald-600 dark:text-emerald-400" />
                                <span>ডাঃ {doctorName}</span>
                                {roomNumber && (
                                  <span className="ml-1 text-muted-foreground font-mono font-normal">
                                    ({roomNumber.toString().toLowerCase().includes('room') ? roomNumber : `Room ${roomNumber}`})
                                  </span>
                                )}
                              </Badge>
                            </div>
                          )}

                          {/* Patient Demographics Details */}
                          <div className="mt-2 space-y-0.5">
                            <div className="font-bold text-sm text-foreground flex items-center justify-between">
                              <span>
                                {s.patient?.nameEn || s.patient?.nameBn || 'Unknown'}
                                {s.patient?.nameBn && <small className="text-muted-foreground font-normal ml-1">({s.patient.nameBn})</small>}
                              </span>
                              {isCalled && (
                                <Badge className="bg-rose-600 text-white text-[10px] font-mono animate-pulse">
                                  🔔 CALLED
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                              <span>MRN: <strong className="text-foreground">{s.patient?.mrn || 'N/A'}</strong></span>
                              <span>•</span>
                              <span>ফোন: <strong className="text-foreground font-mono">{s.patient?.phone || 'N/A'}</strong></span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>বয়স: <strong className="text-foreground">{s.patient?.ageYears || '—'} বছর</strong></span>
                              <span>•</span>
                              <span>লিঙ্গ: <strong className="text-foreground capitalize">{s.patient?.gender === 'female' ? 'মহিলা' : 'পুরুষ'}</strong></span>
                            </div>

                            {/* Consultation Fee Status & Reason Badges */}
                            {(() => {
                              const isPaid = Boolean(
                                (s.consultationFeePaidTaka && Number(s.consultationFeePaidTaka) > 0) ||
                                (s.consultationFeePaidPaisa && Number(s.consultationFeePaidPaisa) > 0) ||
                                (s.visit?.consultationFeePaidPaisa && Number(s.visit.consultationFeePaidPaisa) > 0)
                              );
                              const feeAmount =
                                s.consultationFeePaidTaka ||
                                (s.consultationFeePaidPaisa
                                  ? Math.round(s.consultationFeePaidPaisa / 100)
                                  : s.visit?.consultationFeePaidPaisa
                                  ? Math.round(s.visit.consultationFeePaidPaisa / 100)
                                  : 0);
                              const rawReason =
                                s.reason ||
                                s.visit?.notes ||
                                s.notes ||
                                s.intakeForm?.chiefComplaint ||
                                (s.intakeForm?.specialNotes ? s.intakeForm.specialNotes : null);
                              const cleanReason = getCleanReason(rawReason);

                              return (
                                <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                                  {isPaid ? (
                                    <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-bold gap-1 shadow-2xs">
                                      <CreditCard className="size-3" />
                                      <span>ফি পরিশোধিত: ৳{feeAmount}</span>
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold gap-1 shadow-2xs">
                                      <Gift className="size-3" />
                                      <span>ফ্রি (Free Consultation)</span>
                                    </Badge>
                                  )}

                                  {cleanReason && (
                                    <Badge
                                      variant="outline"
                                      className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs font-semibold gap-1 shadow-2xs"
                                    >
                                      <HelpCircle className="size-3" />
                                      <span>কারণ: {cleanReason}</span>
                                    </Badge>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Action Buttons for this Patient Item */}
                          <div className="mt-3 pt-2.5 border-t border-border/60">
                            {/* CASE A: WAITING PATIENT -> [Intake Assessment] and [Call Now] */}
                            {!isCalled ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenIntakeModal(s);
                                  }}
                                  className="h-8 flex-1 text-xs font-bold border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 gap-1.5 active:scale-95"
                                >
                                  <FileText className="size-3.5" />
                                  <span>ইনটেক ফরম</span>
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCallSpecificSerial(s);
                                  }}
                                  disabled={callingActionLoading}
                                  className="h-8 flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95"
                                >
                                  <Volume2 className="size-3.5" />
                                  <span>ডাকুন (Call)</span>
                                </Button>
                              </div>
                            ) : (
                              /* CASE B: CALLED PATIENT -> [Recall], [Mark In Consultation], [Cancel Call] */
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkInConsultation(s.id);
                                    }}
                                    disabled={callingActionLoading}
                                    className="h-8 flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 shadow-sm active:scale-95"
                                  >
                                    <CheckCircle className="size-3.5" />
                                    <span>কনসালটেশন শুরু</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRecallSerial(s.id);
                                    }}
                                    disabled={callingActionLoading}
                                    className="h-8 text-xs font-bold border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1 active:scale-95"
                                  >
                                    <PhoneCall className="size-3.5" />
                                    <span>পুনরায় ডাকুন</span>
                                  </Button>
                                </div>

                                <div className="flex items-center justify-between gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenIntakeModal(s);
                                    }}
                                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 p-1"
                                  >
                                    <FileText className="size-3 text-teal-500" />
                                    <span>ইনটেক ফরম দেখুন</span>
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelCall(s.id);
                                    }}
                                    disabled={callingActionLoading}
                                    className="h-7 text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 gap-1 p-1"
                                  >
                                    <XCircle className="size-3" />
                                    <span>কল বাতিল</span>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ========================================================= */}
            {/* 2. RIGHT COLUMN: CONSULTATION ROOM & PRESCRIPTION WRITER  */}
            {/* ========================================================= */}
            <div className={cn('flex flex-col gap-4 sm:gap-5 transition-all w-full', mobileTab !== 'consultation' && 'hidden lg:flex')}>
              {!activeSerial ? (
                <Card className="border border-dashed border-border/80 bg-card/60 p-8 sm:p-12 text-center rounded-2xl shadow-xs">
                  <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
                    <Stethoscope className="size-8" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">
                    বর্তমানে কোনো রোগী পরামর্শ কক্ষে নেই
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                    বাম পাশের অপেক্ষমাণ তালিকা থেকে রোগীকে পরামর্শ কক্ষে ডাকুন অথবা রোগী নির্বাচন করুন।
                  </p>
                  {waitingQueue.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCallSpecificSerial(waitingQueue[0])}
                      disabled={callingActionLoading}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Volume2 className="size-4" />
                      <span>পরবর্তী রোগী ডাকুন ({waitingQueue[0].patient?.nameEn || waitingQueue[0].patient?.nameBn || 'Patient'})</span>
                    </Button>
                  )}
                </Card>
              ) : (
                <>
                  {/* Active Patient Demographics Banner */}
                  <Card className="border-border bg-card/90 shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              CURRENT SEATED PATIENT
                            </span>
                            {activeSerial.status === 'in_chamber' && (
                              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                পরামর্শ কক্ষ সচল (In Chamber)
                              </Badge>
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                            {activeSerial.patient?.nameEn || activeSerial.patient?.nameBn || 'Patient'}{' '}
                            {activeSerial.patient?.nameBn && activeSerial.patient?.nameEn && (
                              <small className="text-sm font-normal">({activeSerial.patient.nameBn})</small>
                            )}
                          </h2>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                            MRN: <strong className="text-foreground">{activeSerial.patient?.mrn || 'N/A'}</strong> · আগমনের সময়: {activeSerial.checkedInAt ? new Date(activeSerial.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (activeSerial.bookingTime || 'আজ')}
                            {activeSerial.patient?.ageYears ? ` · বয়স: ${activeSerial.patient.ageYears} Y` : ''}
                            {activeSerial.patient?.gender ? ` · লিঙ্গ: ${activeSerial.patient.gender === 'female' ? 'নারী' : activeSerial.patient.gender === 'male' ? 'পুরুষ' : 'অন্যান্য'}` : ''}
                            {activeSerial.patient?.phone ? ` · ফোন: ${activeSerial.patient.phone}` : ''}
                          </div>
                        </div>

                        <div className="flex gap-2 items-center flex-wrap">
                          {(() => {
                            const isActivePaid = Boolean(
                              (activeSerial.consultationFeePaidTaka && Number(activeSerial.consultationFeePaidTaka) > 0) ||
                              (activeSerial.consultationFeePaidPaisa && Number(activeSerial.consultationFeePaidPaisa) > 0) ||
                              (activeSerial.visit?.consultationFeePaidPaisa && Number(activeSerial.visit.consultationFeePaidPaisa) > 0)
                            );
                            const activeFeeAmount =
                              activeSerial.consultationFeePaidTaka ||
                              (activeSerial.consultationFeePaidPaisa
                                ? Math.round(activeSerial.consultationFeePaidPaisa / 100)
                                : activeSerial.visit?.consultationFeePaidPaisa
                                ? Math.round(activeSerial.visit.consultationFeePaidPaisa / 100)
                                : 0);
                            const activeRawReason =
                              activeSerial.reason ||
                              activeSerial.visit?.notes ||
                              activeSerial.notes ||
                              activeSerial.intakeForm?.chiefComplaint ||
                              activeIntakeForm?.chiefComplaint;
                            const activeCleanReason = getCleanReason(activeRawReason);

                            return (
                              <>
                                {isActivePaid ? (
                                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-bold gap-1 shadow-2xs">
                                    <CreditCard className="size-3.5" />
                                    <span>ফি পরিশোধিত: ৳{activeFeeAmount}</span>
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold gap-1 shadow-2xs">
                                    <Gift className="size-3.5" />
                                    <span>ফ্রি (Free Consultation)</span>
                                  </Badge>
                                )}

                                {activeCleanReason && (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 text-xs font-semibold gap-1 shadow-2xs"
                                  >
                                    <HelpCircle className="size-3.5" />
                                    <span>কারণ: {activeCleanReason}</span>
                                  </Badge>
                                )}
                              </>
                            );
                          })()}

                          {renderPatientClinicalStatusBadge(activeSerial, 'default')}
                          {getPriorityBadge(activeSerial.priority)}
                          {activeSerial.patient?.bloodGroup && (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                              Blood: {activeSerial.patient.bloodGroup}
                            </Badge>
                          )}
                          {activeSerial.patient?.allergies && (
                            <Badge variant="destructive" className="font-semibold">
                              ⚠️ {activeSerial.patient.allergies}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

              {/* ================================================================= */}
              {/* 3. ACTIVE CONSULTATION ACTION TOOLBAR (EXACT 9 BUTTONS REQUESTED) */}
              {/* ================================================================= */}
              {activeSerial && (
                <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500/30 bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1.5 py-1">
                        <Stethoscope className="size-3.5" />
                        <span>কনসালটেশন টুলবার (Consultation Action Toolbar)</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        রোগীর সকল ফাইল, টাইমলাইন, প্রেসক্রিপশন ও থেরাপি প্ল্যান নিয়ন্ত্রণ করুন
                      </span>
                    </div>
                    {activeSerial.status === 'in_chamber' && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-black">
                        • IN CONSULTATION
                      </span>
                    )}
                  </div>

                  {/* 9 Specific Consultation Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2">
                    {/* 1. New File */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsNewAssessmentModalOpen(true)}
                      className="h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <FilePlus className="size-4 shrink-0" />
                      <span className="truncate w-full text-center">নতুন ফাইল</span>
                    </Button>

                    {/* 2. All Files */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFilesListModalOpen(true)}
                      className="h-11 text-xs font-bold border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <FolderOpen className="size-4 shrink-0" />
                      <span className="truncate w-full text-center">সকল ফাইল {assessmentFilesCount > 0 ? `(${assessmentFilesCount})` : ''}</span>
                    </Button>

                    {/* 3. Intake Assessment (A4 print) */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedIntakePatient(activeSerial);
                        setIsIntakePrintModalOpen(true);
                      }}
                      className="h-11 text-xs font-bold border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <FileText className="size-4 shrink-0" />
                      <span className="truncate w-full text-center">ইনটেক ফরম</span>
                    </Button>

                    {/* 4. Timeline */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTimelineModalOpen(true)}
                      className="h-11 text-xs font-bold border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <Clock className="size-4 shrink-0" />
                      <span className="truncate w-full text-center">টাইমলাইন</span>
                    </Button>

                    {/* 5. New Prescription */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPrescriptionModalOpen(true)}
                      className="h-11 text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <Plus className="size-4 shrink-0" />
                      <span className="truncate w-full text-center">নতুন প্রেসক্রিপশন</span>
                    </Button>

                    {/* 6. All Prescriptions */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPrescriptionsListModalOpen(true)}
                      className="h-11 text-xs font-bold border-border/80 text-foreground hover:bg-muted/80 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <History className="size-4 shrink-0 text-amber-500" />
                      <span className="truncate w-full text-center">পূর্বের প্রেসক্রিপশন</span>
                    </Button>

                    {/* 7. New Plan */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInitialPlansForBuilder([]);
                        setIsTreatmentPlanModalOpen(true);
                      }}
                      className="h-11 text-xs font-bold border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <HeartPulse className="size-4 shrink-0" />
                      <span className="truncate w-full text-center">নতুন প্ল্যান</span>
                    </Button>

                    {/* 8. All Plans */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviousPlansModalOpen(true)}
                      className="h-11 text-xs font-bold border-cyan-500/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <Activity className="size-4 shrink-0 text-cyan-500" />
                      <span className="truncate w-full text-center">পূর্বের প্ল্যান</span>
                    </Button>

                    {/* 9. Send Patient */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDispositionModalOpen(true)}
                      className="h-11 text-xs font-bold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
                    >
                      <Send className="size-4 shrink-0" />
                      <span className="truncate w-full text-center">রোগী পাঠান</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Calling banner if patient is in called state */}
              {activeSerial?.status === 'called' && (
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
                    টিভি ডিসপ্লে ও ওয়েব অপেক্ষাগারে ঘোষণা ও বেল বাজছে। রোগী কক্ষে উপস্থিত হলে &apos;কনসালটেশন শুরু&apos; চাপুন (কিউ থেকে সরানো হবে), রোগী না এলে পুনরায় ডাকুন, অথবা বাতিল করুন।
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <Button
                      type="button"
                      onClick={() => handleMarkInConsultation(activeSerial.id)}
                      disabled={callingActionLoading}
                      className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-md shadow-emerald-500/20 active:scale-95 flex-1 min-w-[170px] cursor-pointer"
                    >
                      <CheckCircle className="size-4" />
                      <span>Mark in Consultation (কনসালটেশন শুরু)</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRecallSerial(activeSerial.id)}
                      disabled={callingActionLoading}
                      className="h-9 px-4 border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold gap-2 active:scale-95 flex-1 min-w-[140px] cursor-pointer"
                    >
                      <PhoneCall className="size-4" />
                      <span>Recall (পুনরায় ডাকুন)</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleCancelCall(activeSerial.id)}
                      disabled={callingActionLoading}
                      className="h-9 px-3.5 border border-border/80 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 font-semibold gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <XCircle className="size-4 text-rose-500" />
                      <span>Cancel (কল বাতিল)</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 3.1 SPOTLIGHT INTAKE & INITIAL VITALS ASSESSMENT CARD              */}
              {/* ================================================================= */}
              {activeSerial && (() => {
                const clinicalInfo = resolvePatientClinicalStatus(activeSerial);
                const isReIntake = clinicalInfo?.status === 'lapsed_reintake';
                const isBrandNew = clinicalInfo?.status === 'brand_new';

                if (activeIntakeForm) {
                  return (
                    <Card
                      className={cn(
                        'border-2 shadow-xs transition-all rounded-2xl overflow-hidden',
                        isReIntake
                          ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent'
                          : isBrandNew
                          ? 'border-teal-500/40 bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent'
                          : 'border-border/80 bg-card/80'
                      )}
                    >
                      <CardHeader className="p-3.5 sm:p-4 pb-2 sm:pb-3 border-b border-border/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={cn(
                              'size-8 rounded-xl flex items-center justify-center shrink-0',
                              isReIntake ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                            )}>
                              <FileText className="size-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                                  ইনটেক ও প্রাথমিক ভাইটালস স্পটলাইট (Intake & Vitals)
                                </h3>
                                {isReIntake ? (
                                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                    ⚠️ পুনর্বার ইনটেক (&gt;৩ মাস)
                                  </Badge>
                                ) : isBrandNew ? (
                                  <Badge className="bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40 text-[10px] font-bold">
                                    ✨ নতুন রোগীর ইনটেক
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    ফলো-আপ
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                রিসেপশন ইনটেক ডেস্ক থেকে নিবন্ধিত আজকের প্রাথমিক পর্যবেক্ষণ
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleCopyIntakeToPrescription}
                              className={cn(
                                'h-8 text-xs font-bold gap-1.5 transition-all active:scale-95 cursor-pointer',
                                copiedIntake
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                              )}
                            >
                              {copiedIntake ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                              <span>{copiedIntake ? 'যুক্ত হয়েছে!' : 'প্রেসক্রিপশনে কপি করুন'}</span>
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedIntakePatient(activeSerial);
                                setIsIntakePrintModalOpen(true);
                              }}
                              className="h-8 text-xs font-bold border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 gap-1.5 active:scale-95 cursor-pointer"
                            >
                              <Printer className="size-3.5" />
                              <span>A4 প্রিন্ট</span>
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3.5 sm:p-4 space-y-3">
                        {/* Vitals Highlights Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                          {/* BP */}
                          <div className="p-2 sm:p-2.5 rounded-xl border border-border/70 bg-card/70 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">রক্তচাপ (BP)</span>
                            <span className="text-xs sm:text-sm font-black font-mono text-foreground mt-0.5">
                              {activeIntakeForm.bpSystolic ? `${activeIntakeForm.bpSystolic}/${activeIntakeForm.bpDiastolic || '--'}` : '—'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">mmHg</span>
                          </div>

                          {/* Blood Sugar */}
                          <div className="p-2 sm:p-2.5 rounded-xl border border-border/70 bg-card/70 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">রক্তের শর্করা (RBS)</span>
                            <span className="text-xs sm:text-sm font-black font-mono text-foreground mt-0.5">
                              {activeIntakeForm.bloodSugar ? activeIntakeForm.bloodSugar : '—'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">mmol/L</span>
                          </div>

                          {/* Weight */}
                          <div className="p-2 sm:p-2.5 rounded-xl border border-border/70 bg-card/70 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">ওজন (Weight)</span>
                            <span className="text-xs sm:text-sm font-black font-mono text-foreground mt-0.5">
                              {activeIntakeForm.weightKg ? activeIntakeForm.weightKg : '—'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">kg</span>
                          </div>

                          {/* Pulse */}
                          <div className="p-2 sm:p-2.5 rounded-xl border border-border/70 bg-card/70 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">পালস (Pulse)</span>
                            <span className="text-xs sm:text-sm font-black font-mono text-foreground mt-0.5">
                              {activeIntakeForm.pulseRate ? activeIntakeForm.pulseRate : '—'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">bpm</span>
                          </div>

                          {/* Temperature */}
                          <div className="p-2 sm:p-2.5 rounded-xl border border-border/70 bg-card/70 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">তাপমাত্রা (Temp)</span>
                            <span className="text-xs sm:text-sm font-black font-mono text-foreground mt-0.5">
                              {activeIntakeForm.temperatureF ? activeIntakeForm.temperatureF : '—'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">°F</span>
                          </div>

                          {/* VAS Pain */}
                          <div className="p-2 sm:p-2.5 rounded-xl border border-border/70 bg-card/70 flex flex-col items-center text-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">ব্যথার মাত্রা (VAS)</span>
                            <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                              {activeIntakeForm.painSeverity ? `${activeIntakeForm.painSeverity}/10` : '—'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono">score</span>
                          </div>
                        </div>

                        {/* Clinical Complaints & Region Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-xs">
                          <div className="p-2.5 rounded-xl border border-border/60 bg-card/50 space-y-1">
                            <span className="text-muted-foreground font-bold">প্রধান অভিযোগ (Chief Complaints):</span>
                            <p className="font-semibold text-foreground text-xs leading-relaxed">
                              {activeIntakeForm.chiefComplaint || 'কোনো বিবরণ রেকর্ড করা নেই'}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl border border-border/60 bg-card/50 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground font-bold">ব্যথার স্থান ও স্থিতিকাল:</span>
                              {activeIntakeForm.duration && (
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                  ⏱️ {activeIntakeForm.duration}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-foreground text-xs leading-relaxed">
                              {activeIntakeForm.painSite || 'উল্লেখ নেই'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // If no intake form found for brand new or lapsed re-intake patient
                if (isBrandNew || isReIntake) {
                  return (
                    <Card
                      className={cn(
                        'border-2 border-dashed rounded-2xl p-4 shadow-xs',
                        isReIntake ? 'border-amber-500/50 bg-amber-500/5' : 'border-teal-500/50 bg-teal-500/5'
                      )}
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'size-10 rounded-xl flex items-center justify-center shrink-0',
                            isReIntake ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                          )}>
                            <AlertCircle className="size-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-foreground">
                              {isReIntake
                                ? 'রোগী ৩+ মাস নিষ্ক্রিয় ছিলেন — আজকের ভিজিটের জন্য পুনর্বার ইনটেক ও ভাইটালস প্রয়োজন'
                                : 'নতুন রোগীর ইনটেক ও ভাইটালস মূল্যায়ন এখনও রেকর্ড করা হয়নি'}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              প্রেসক্রিপশন লেখার পূর্বে রোগীর বর্তমান রক্তচাপ, ডায়াবেটিস, ব্যথার স্থান ও অভিযোগ ইনটেক ফরমে রেকর্ড করুন।
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSelectedIntakePatient(activeSerial);
                            setIsCreateIntakeModalOpen(true);
                          }}
                          className={cn(
                            'text-xs font-bold gap-1.5 text-white shadow-sm active:scale-95 shrink-0 cursor-pointer h-9 px-4',
                            isReIntake ? 'bg-amber-600 hover:bg-amber-500' : 'bg-teal-600 hover:bg-teal-500'
                          )}
                        >
                          <Plus className="size-4" />
                          <span>{isReIntake ? 'পুনর্বার ইনটেক পূরণ করুন' : 'ইনটেক ফরম পূরণ করুন'}</span>
                        </Button>
                      </div>
                    </Card>
                  );
                }

                return null;
              })()}

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

              {/* ================================================================= */}
              {/* MODULAR CLINICAL WORKSTATION (POPUP DRIVEN TILES)                 */}
              {/* ================================================================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. MEDICINE PRESCRIPTION CARD */}
                <Card className="border-border shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          ℞
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">
                            মেডিসিন প্রেসক্রিপশন
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground">Medicine Prescription (5.5" × 8.27")</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-bold font-mono",
                        prescribedMeds.length > 0
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {prescribedMeds.length > 0 ? `${prescribedMeds.length}টি ঔষধ নির্ধারিত` : 'ঔষধ খালি'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3 flex-1 flex flex-col justify-between">
                    {prescribedMeds.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {prescribedMeds.map((med, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="font-bold text-foreground">{med.brandName || med.medicineName || 'ঔষধ'}</span>
                              <span className="text-[11px] text-muted-foreground ml-1.5 font-mono">
                                ({med.dosage} • {med.duration || `${med.durationDays || 7} দিন`})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-6 p-0 text-muted-foreground hover:text-rose-600"
                              onClick={() => handleRemoveMedicine(idx)}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-border/70 bg-muted/20 text-center space-y-1">
                        <p className="text-xs font-semibold text-foreground">কোনো ঔষধ অন্তর্ভুক্ত নেই</p>
                        <p className="text-[11px] text-muted-foreground">
                          পেইন কিলার বা আনুষঙ্গিক ঔষধ প্রেসক্রাইব করতে বিল্ডার পপআপ খুলুন।
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsPrescriptionModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 flex-1 min-w-[140px] cursor-pointer active:scale-95 shadow-xs"
                      >
                        <Plus className="size-3.5" />
                        <span>{prescribedMeds.length > 0 ? 'প্রেসক্রিপশন এডিট করুন' : 'প্রেসক্রিপশন বিল্ডার খুলুন'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPrescriptionsListModalOpen(true)}
                        className="text-xs font-semibold border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <History className="size-3.5 mr-1" />
                        <span>ইতিহাস</span>
                      </Button>
                      {prescribedMeds.length > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleSaveAndPrint}
                          disabled={savingRx}
                          className="text-xs font-bold gap-1 cursor-pointer"
                        >
                          <Printer className="size-3.5" />
                          <span>প্রিন্ট</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. THERAPY TREATMENT PLAN CARD */}
                <Card id="therapy-plan-section" className="border-border shadow-xs hover:border-cyan-500/50 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                          ⚡
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">
                            থেরাপি ট্রিটমেন্ট প্ল্যান
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground">Therapy Modalities & Sessions (A4 Plan)</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-bold font-mono",
                        prescribedMods.length > 0
                          ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {prescribedMods.length > 0 ? `${prescribedMods.length}টি মডালিটি নির্ধারিত` : 'প্ল্যান খালি'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3 flex-1 flex flex-col justify-between">
                    {prescribedMods.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {prescribedMods.map((mod) => (
                          <div
                            key={mod.modalityCode}
                            className="text-xs p-2 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="font-bold text-foreground">{mod.modalityName || mod.modalityCode}</span>
                              <span className="text-[11px] text-cyan-700 dark:text-cyan-300 ml-1.5 font-mono font-semibold">
                                ({mod.sessionsPrescribed || mod.totalSessionsPrescribed || 10} সেশন • {mod.frequency || 'daily'})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-6 p-0 text-muted-foreground hover:text-rose-600"
                              onClick={() => handleRemoveModality(mod.modalityCode)}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-border/70 bg-muted/20 text-center space-y-1">
                        <p className="text-xs font-semibold text-foreground">কোনো থেরাপি মডালিটি নির্বাচিত নেই</p>
                        <p className="text-[11px] text-muted-foreground">
                          হ্যান্ডলার শুধুমাত্র ডাক্তারের নির্ধারিত ট্রিটমেন্ট প্ল্যান অনুযায়ী থেরাপি দিতে পারবেন।
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsTreatmentPlanModalOpen(true)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold gap-1.5 flex-1 min-w-[140px] cursor-pointer active:scale-95 shadow-xs"
                      >
                        <HeartPulse className="size-3.5" />
                        <span>{prescribedMods.length > 0 ? 'ট্রিটমেন্ট প্ল্যান এডিট করুন' : 'ট্রিটমেন্ট প্ল্যান বিল্ডার খুলুন'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFilesListModalOpen(true)}
                        className="text-xs font-semibold border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <FolderOpen className="size-3.5 mr-1" />
                        <span>ফাইল ও প্ল্যান</span>
                      </Button>
                      {prescribedMods.length > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsTreatmentPlanModalOpen(true)}
                          className="text-xs font-bold gap-1 cursor-pointer"
                        >
                          <Printer className="size-3.5" />
                          <span>A4 প্রিন্ট</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 3. CLINICAL ASSESSMENT FILES CARD */}
                <Card className="border-border shadow-xs hover:border-purple-500/50 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                          📁
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">
                            ক্লিনিক্যাল ফাইল ও মূল্যায়ন
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground">Physiotherapy Evaluation & Records</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-bold font-mono",
                        assessmentFilesCount > 0
                          ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {assessmentFilesCount > 0 ? `${assessmentFilesCount}টি ফাইল সংরক্ষিত` : 'ফাইল নেই'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3 flex-1 flex flex-col justify-between">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-muted-foreground">ব্যথা মূল্যায়ন ফরম (Pain Sheet):</span>
                        <span className="font-mono font-bold text-foreground">
                          {assessmentFilesCount > 0 ? 'সংরক্ষিত আছে' : 'রেকর্ড করা হয়নি'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                        <span>বর্তমান VAS স্কোর:</span>
                        <span className="font-black text-rose-600 font-mono">{painScore}/10</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsNewAssessmentModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1.5 flex-1 min-w-[140px] cursor-pointer active:scale-95 shadow-xs"
                      >
                        <FilePlus className="size-3.5" />
                        <span>নতুন ফাইল তৈরি করুন</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFilesListModalOpen(true)}
                        className="text-xs font-semibold border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <FolderOpen className="size-3.5 mr-1" />
                        <span>সকল ফাইল ({assessmentFilesCount})</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. INTAKE & VITALS SPOTLIGHT CARD */}
                <Card className="border-border shadow-xs hover:border-teal-500/50 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                          🩺
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">
                            ইনটেক ও ভাইটালস রিপোর্ট
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground">Patient Intake & Vitals Overview</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-bold font-mono",
                        activeIntakeForm
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      )}>
                        {activeIntakeForm ? 'ইনটেক সম্পন্ন' : 'ইনটেক অপেক্ষমাণ'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3 flex-1 flex flex-col justify-between">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-1">
                      {activeIntakeForm ? (
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-1.5 rounded-lg bg-card border border-border/60">
                            <span className="text-[10px] text-muted-foreground font-bold block">BP</span>
                            <span className="font-bold font-mono text-xs">{activeIntakeForm.bpSystolic ? `${activeIntakeForm.bpSystolic}/${activeIntakeForm.bpDiastolic || '--'}` : '—'}</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-card border border-border/60">
                            <span className="text-[10px] text-muted-foreground font-bold block">RBS</span>
                            <span className="font-bold font-mono text-xs">{activeIntakeForm.bloodSugar || '—'}</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-card border border-border/60">
                            <span className="text-[10px] text-muted-foreground font-bold block">Pulse</span>
                            <span className="font-bold font-mono text-xs">{activeIntakeForm.pulseRate || '—'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center py-2">
                          আজকের ভিজিটের কোনো ইনটেক ভাইটালস পাওয়া যায়নি।
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedIntakePatient(activeSerial);
                          setIsCreateIntakeModalOpen(true);
                        }}
                        className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold gap-1.5 flex-1 min-w-[140px] cursor-pointer active:scale-95 shadow-xs"
                      >
                        <FileText className="size-3.5" />
                        <span>{activeIntakeForm ? 'ইনটেক সংশোধন করুন' : 'ইনটেক ফরম পূরণ করুন'}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedIntakePatient(activeSerial);
                          setIsIntakePrintModalOpen(true);
                        }}
                        className="text-xs font-semibold border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Printer className="size-3.5 mr-1" />
                        <span>A4 প্রিন্ট</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ================================================================= */}
              {/* DISPOSITION & COMPLETE CONSULTATION PROMINENT BAR                 */}
              {/* ================================================================= */}
              <Card className="border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2 justify-center md:justify-start">
                      <CheckCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
                      <span>কনসালটেশন সমাপ্তি ও পরবর্তী ডেস্কে প্রেরণ (Send Patient)</span>
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      প্রেসক্রিপশন ও থেরাপি ট্রিটমেন্ট প্ল্যান প্রস্তুত হলে রোগীকে থেরাপি হল বা ক্যাশ কাউন্টারে পাঠান।
                    </p>
                    <div className="flex items-center gap-3 pt-1 flex-wrap justify-center md:justify-start text-xs font-semibold">
                      <span className={cn(
                        "flex items-center gap-1",
                        assessmentFilesCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}>
                        {assessmentFilesCount > 0 ? "✓" : "○"} মূল্যায়ন ফাইল ({assessmentFilesCount})
                      </span>
                      <span className={cn(
                        "flex items-center gap-1",
                        prescribedMods.length > 0 ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"
                      )}>
                        {prescribedMods.length > 0 ? "✓" : "○"} থেরাপি প্ল্যান ({prescribedMods.length})
                      </span>
                      <span className={cn(
                        "flex items-center gap-1",
                        prescribedMeds.length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}>
                        {prescribedMeds.length > 0 ? "✓" : "○"} প্রেসক্রিপশন ({prescribedMeds.length})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-end">
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setIsDispositionModalOpen(true)}
                      className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm gap-2 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                    >
                      <Send className="size-4" />
                      <span>রিসিপশন বা থেরাপি ডেস্কে পাঠান</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={handleSaveAndPrint}
                      disabled={savingRx}
                      className="h-11 px-4 border-border/80 font-bold text-xs gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Printer className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>সংরক্ষণ ও প্রিন্ট</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

          {/* 5.5in x 8.27in Prescription Modal */}
          {printData && (
            <PrescriptionPrintModal
              prescription={printData}
              onClose={() => setPrintData(null)}
            />
          )}

          {/* OFFICIAL HPC A4 INTAKE ASSESSMENT PRINT MODAL */}
          <IntakeAssessmentPrintModal
            open={isIntakePrintModalOpen}
            onOpenChange={setIsIntakePrintModalOpen}
            patientId={selectedIntakePatient?.patientId || selectedIntakePatient?.patient?.id}
            visitId={selectedIntakePatient?.visitId || selectedIntakePatient?.id}
            patient={selectedIntakePatient?.patient}
            intakeForm={selectedIntakePatient?.id === activeSerial?.id ? activeIntakeForm : (selectedIntakePatient?.intakeForm || null)}
          />

          {/* PATIENT INTAKE FORM (CREATE / RE-INTAKE) MODAL */}
          <PatientIntakeFormModal
            open={isCreateIntakeModalOpen}
            onOpenChange={setIsCreateIntakeModalOpen}
            patient={activeSerial?.patient || selectedIntakePatient?.patient}
            currentUser={session}
            clinicalStatus={resolvePatientClinicalStatus(activeSerial || selectedIntakePatient) as any}
            isReIntake={resolvePatientClinicalStatus(activeSerial || selectedIntakePatient)?.status === 'lapsed_reintake'}
            onSuccess={() => {
              if (activeSerial?.patientId) {
                api.patients
                  .getLatestIntakeForm(activeSerial.patientId)
                  .then((form) => {
                    if (form && (form.id || form.chiefComplaint || form.bpSystolic)) {
                      setActiveIntakeForm(form);
                      if (form.chiefComplaint && !chiefComplaints) {
                        setChiefComplaints(form.chiefComplaint);
                      }
                    } else {
                      api.patients
                        .listIntakeForms({ patientId: activeSerial.patientId, date: 'all' })
                        .then((forms) => {
                          if (forms && forms.length > 0) {
                            setActiveIntakeForm(forms[0]);
                            if (forms[0].chiefComplaint && !chiefComplaints) {
                              setChiefComplaints(forms[0].chiefComplaint);
                            }
                          }
                        })
                        .catch(() => {});
                    }
                  })
                  .catch(() => {});
              }
            }}
          />

          {/* PATIENT FULL ACTIVITY TIMELINE MODAL */}
          <PatientTimelineModal
            open={isTimelineModalOpen}
            onOpenChange={setIsTimelineModalOpen}
            patientId={activeSerial?.patientId || activeSerial?.patient?.id}
            patientName={activeSerial?.patient?.nameBn || activeSerial?.patient?.nameEn}
            mrn={activeSerial?.patient?.mrn}
            phone={activeSerial?.patient?.phone}
          />

          {/* PAIN ASSESSMENT FORM MODAL (CREATE NEW) */}
          <PainAssessmentFormModal
            open={isNewAssessmentModalOpen}
            onOpenChange={setIsNewAssessmentModalOpen}
            patient={activeSerial?.patient}
            doctorId={activeSerial?.doctorId || session?.staffId || session?.userId}
            doctorName={activeSerial?.doctorName || session?.displayName}
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
            doctorId={activeSerial?.doctorId || session?.staffId || session?.userId}
            doctorName={activeSerial?.doctorName || session?.displayName}
            visitId={activeSerial?.visitId || activeSerial?.id}
            currentUser={session}
            onFileSelected={handleAssessmentFileSaved}
            onCreateNew={() => {
              setIsFilesListModalOpen(false);
              setIsNewAssessmentModalOpen(true);
            }}
          />

          {/* PATIENT ALL PRESCRIPTIONS LIST / CLONE / PRINT MODAL */}
          <PatientPrescriptionsListModal
            open={isPrescriptionsListModalOpen}
            onOpenChange={setIsPrescriptionsListModalOpen}
            patientId={activeSerial?.patientId || activeSerial?.patient?.id}
            patient={activeSerial?.patient}
            onSelectToClone={handleClonePrescription}
          />

          {/* DOCTOR DISPOSITION ROUTING MODAL */}
          <DoctorDispositionModal
            open={isDispositionModalOpen}
            onOpenChange={setIsDispositionModalOpen}
            patient={activeSerial?.patient}
            visitId={activeSerial?.visitId || activeSerial?.id}
            activeSerialId={activeSerial?.id}
            hasAssessmentFile={assessmentFilesCount > 0}
            hasTreatmentPlan={prescribedMods.length > 0}
            onOpenFileModal={() => setIsNewAssessmentModalOpen(true)}
            onOpenPlanSection={() => setIsTreatmentPlanModalOpen(true)}
            onRoutingSuccess={() => {
              loadQueue();
              setActiveSerial(null);
            }}
          />

          {/* POPUP: THERAPY TREATMENT PLAN BUILDER MODAL */}
          <TreatmentPlanBuilderModal
            open={isTreatmentPlanModalOpen}
            onOpenChange={setIsTreatmentPlanModalOpen}
            patient={activeSerial?.patient}
            visitId={activeSerial?.visitId || activeSerial?.id}
            onPlansSaved={handlePlansSaved}
            initialPlans={
              initialPlansForBuilder.length > 0
                ? initialPlansForBuilder
                : prescribedMods.map((m) => ({
                    modalityCode: m.modalityCode,
                    modalityName: m.modalityName,
                    totalSessionsPrescribed: m.sessionsPrescribed || 10,
                    frequency: m.frequency || 'daily',
                    notes: m.notes,
                  }))
            }
          />

          {/* POPUP: PATIENT PREVIOUS & CURRENT THERAPY PLANS LIST MODAL */}
          <PatientPlansListModal
            open={isPreviousPlansModalOpen}
            onOpenChange={setIsPreviousPlansModalOpen}
            patient={activeSerial?.patient || activeSerial}
            onOpenPlanBuilder={(pat, plansToLoad) => {
              if (plansToLoad && plansToLoad.length > 0) {
                setInitialPlansForBuilder(plansToLoad);
              } else {
                setInitialPlansForBuilder([]);
              }
              setIsTreatmentPlanModalOpen(true);
            }}
          />

          {/* POPUP: MEDICINE PRESCRIPTION BUILDER MODAL */}
          <PrescriptionBuilderModal
            open={isPrescriptionModalOpen}
            onOpenChange={setIsPrescriptionModalOpen}
            patient={activeSerial?.patient}
            visitId={activeSerial?.visitId || activeSerial?.id}
            doctorId={activeSerial?.doctorId || session?.staffId || session?.userId}
            chiefComplaints={chiefComplaints}
            diagnosis={diagnosis}
            painScore={painScore}
            objectiveNotes={objectiveNotes}
            medicines={prescribedMeds}
            onChangeMedicines={setPrescribedMeds}
            advice={advice}
            onChangeAdvice={setAdvice}
            followUpDate={followUpDate}
            onChangeFollowUpDate={setFollowUpDate}
            onSaveSuccess={(rx) => {
              if (rx?.medicines) setPrescribedMeds(rx.medicines);
              loadQueue(undefined, true);
            }}
            onSaveAndPrint={handlePrescriptionSavedAndPrint}
            onOpenAllPrescriptions={() => setIsPrescriptionsListModalOpen(true)}
          />
        </>
      )}
    </div>
  );
}
