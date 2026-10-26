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
import { PrescriptionBuilderSection } from './doctor/PrescriptionBuilderSection';
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
} from 'lucide-react';

export interface DoctorChamberProps {
  session?: UserSession | null;
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
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [savingRx, setSavingRx] = useState(false);

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
          q.sort((a: any, b: any) => (a.serialNumber || 0) - (b.serialNumber || 0));
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

  // Instant Realtime sync for chamber queue
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

  // Load intake form whenever activeSerial changes
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
      toast.success(`রোগী #${s.serialNumber} কে চেম্বারে ডাকা হয়েছে! টিভি ও ওয়েব স্ক্রিনে ঘোষণা শুরু হয়েছে।`);
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
    toast.info('নতুন প্রেসক্রিপশন শুরু করা হয়েছে');
    const el = document.getElementById('prescription-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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
    toast.success('পূর্বের প্রেসক্রিপশনের ওষুধ ও নির্দেশাবলী লোড করা হয়েছে!');
    const el = document.getElementById('prescription-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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

  // Waiting queue only includes patients waiting or actively being called
  const waitingQueue = queue.filter((s) => s.status === 'waiting' || s.status === 'called');

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
              📝 পরামর্শ কক্ষ {activeSerial ? `(#${activeSerial.serialNumber})` : ''}
            </Button>
          </div>

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
                          {/* Top row: Serial, Token, Punctuality & Priority Badge */}
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 font-mono">
                                #{s.serialNumber}
                              </span>
                              <Badge variant="outline" className="font-mono text-[11px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                টোকেন: {s.tokenNumber || `T-${s.serialNumber}`}
                              </Badge>
                              {getPriorityBadge(s.priority)}
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
                    বাম পাশের অপেক্ষমাণ কিউ থেকে রোগীকে পরামর্শ কক্ষে ডাকুন অথবা সিরিয়াল নির্বাচন করুন।
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
                      <span>পরবর্তী রোগী ডাকুন (#{waitingQueue[0].serialNumber} - {waitingQueue[0].patient?.nameEn || waitingQueue[0].patient?.nameBn || 'Patient'})</span>
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
                            MRN: <strong className="text-foreground">{activeSerial.patient?.mrn || 'N/A'}</strong> · সিরিয়াল: #{activeSerial.serialNumber || 1}
                            {activeSerial.patient?.ageYears ? ` · বয়স: ${activeSerial.patient.ageYears} Y` : ''}
                            {activeSerial.patient?.gender ? ` · লিঙ্গ: ${activeSerial.patient.gender === 'female' ? 'নারী' : activeSerial.patient.gender === 'male' ? 'পুরুষ' : 'অন্যান্য'}` : ''}
                            {activeSerial.patient?.phone ? ` · ফোন: ${activeSerial.patient.phone}` : ''}
                          </div>
                        </div>

                        <div className="flex gap-2 items-center flex-wrap">
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
                      onClick={handleResetNewPrescription}
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
                        const el = document.getElementById('therapy-plan-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        toast.info('থেরাপি মডালিটি ও প্ল্যানিং সেকশন নির্বাচন করা হয়েছে');
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
                      onClick={() => setIsFilesListModalOpen(true)}
                      className="h-11 text-xs font-bold border-border/80 text-foreground hover:bg-muted/80 flex flex-col items-center justify-center p-1 gap-0.5 active:scale-95 cursor-pointer"
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

              {/* Therapy Modalities Prescribing Section */}
              <Card id="therapy-plan-section" className="border-border shadow-sm">
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
                              onValueChange={(val: string) => {
                                setPrescribedMods(
                                  prescribedMods.map((it) =>
                                    it.modalityCode === m.modalityCode ? { ...it, frequency: val } : it,
                                  ),
                                );
                              }}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue placeholder="Frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="alternate_days">Alt. Days</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                              </SelectContent>
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

              {/* Super Robust Prescription Builder Section (HPC 5.50" x 8.27" Paper) */}
              <div id="prescription-section">
                <PrescriptionBuilderSection
                  medicines={prescribedMeds}
                  onChangeMedicines={setPrescribedMeds}
                  advice={advice}
                  onChangeAdvice={setAdvice}
                  followUpDate={followUpDate}
                  onChangeFollowUpDate={setFollowUpDate}
                  onSaveAndPrint={handleSaveAndPrint}
                  onOpenAllPrescriptions={() => setIsPrescriptionsListModalOpen(true)}
                  onResetNewPrescription={handleResetNewPrescription}
                  saving={savingRx}
                />
              </div>
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
            intakeForm={selectedIntakePatient?.id === activeSerial?.id ? activeIntakeForm : null}
          />

          {/* PATIENT FULL ACTIVITY TIMELINE MODAL */}
          <PatientTimelineModal
            open={isTimelineModalOpen}
            onOpenChange={setIsTimelineModalOpen}
            patientId={activeSerial?.patientId || activeSerial?.patient?.id}
            patientName={activeSerial?.patient?.nameBn || activeSerial?.patient?.nameEn}
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
            onOpenPlanSection={() => {
              const el = document.getElementById('therapy-plan-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onRoutingSuccess={() => {
              loadQueue();
              setActiveSerial(null);
            }}
          />
        </>
      )}
    </div>
  );
}
