// apps/web/components/CashierView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api, UserSession, getSession } from '../lib/api';
import { useRealtime } from '../lib/use-realtime';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { PatientTimelineModal } from './patient/PatientTimelineModal';
import { IntakeAssessmentPrintModal } from './patient/IntakeAssessmentPrintModal';
import InvoicePrintModal from './InvoicePrintModal';
import { TherapyQueueManagementTab } from './therapy/TherapyQueueManagementTab';
import {
  FileText,
  Clock,
  CheckCircle,
  CreditCard,
  UserCheck,
  Stethoscope,
  HeartPulse,
  History,
  Loader2,
  Eye,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Plus,
  Printer,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface PackagePreset {
  name: string;
  nameBn?: string;
  count: number;
  priceTaka: number;
  validityDays: number;
  tag?: string;
}

const SESSION_PRESETS: PackagePreset[] = [
  {
    name: '5-Session Quick Recovery',
    nameBn: '৫-সেশন প্রাথমিক রিকভারি',
    count: 5,
    priceTaka: 1500,
    validityDays: 15,
    tag: '৳300/session',
  },
  {
    name: '10-Session Comprehensive Rehab',
    nameBn: '১০-সেশন পূর্ণাঙ্গ রিহ্যাব প্যাকেজ',
    count: 10,
    priceTaka: 2800,
    validityDays: 30,
    tag: 'Popular · ৳280/session',
  },
  {
    name: '15-Session Advanced Therapy',
    nameBn: '১৫-সেশন অ্যাডভান্সড থেরাপি',
    count: 15,
    priceTaka: 3900,
    validityDays: 45,
    tag: 'Best Value · ৳260/session',
  },
  {
    name: '20-Session Intensive Mobility',
    nameBn: '২০-সেশন নিবিড় গতিশীলতা প্যাকেজ',
    count: 20,
    priceTaka: 4800,
    validityDays: 60,
    tag: '৳240/session',
  },
];

const DAY_PRESETS: PackagePreset[] = [
  {
    name: '7-Day Intensive Care Package',
    nameBn: '৭-দিনের নিবিড় থেরাপি প্যাকেজ',
    count: 7,
    priceTaka: 2500,
    validityDays: 14,
    tag: '৳357/day',
  },
  {
    name: '14-Day Full Mobility Package',
    nameBn: '১৪-দিনের কমপ্লিট মবিলিটি প্যাকেজ',
    count: 14,
    priceTaka: 4500,
    validityDays: 30,
    tag: 'Recommended · ৳321/day',
  },
  {
    name: '21-Day Pain Free Protocol',
    nameBn: '২১-দিনের পেইন-ফ্রি কেয়ার প্যাকেজ',
    count: 21,
    priceTaka: 6300,
    validityDays: 45,
    tag: '৳300/day',
  },
  {
    name: '30-Day Monthly Recovery Package',
    nameBn: '৩০-দিনের মাসিক রিহ্যাব প্যাকেজ',
    count: 30,
    priceTaka: 8500,
    validityDays: 60,
    tag: 'Best Value · ৳283/day',
  },
];

export interface CashierProps {
  session?: UserSession | null;
}

export default function CashierView({ session: propSession }: CashierProps = {}) {
  const session = propSession || getSession();
  const [mobileTab, setMobileTab] = useState<'billing' | 'ledger' | 'therapy_queue'>('billing');
  const [bills, setBills] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Reception Forwarded Intakes State
  const [forwardedIntakes, setForwardedIntakes] = useState<any[]>([]);
  const [selectedIntakeForDetail, setSelectedIntakeForDetail] = useState<any>(null);
  const [selectedIntakeForPayment, setSelectedIntakeForPayment] = useState<any>(null);
  const [selectedIntakePriority, setSelectedIntakePriority] = useState<'normal' | 'emergency' | 'vip'>('normal');
  const [consultationPaymentMethod, setConsultationPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'rocket' | 'card'>('cash');
  const [consultationTxnId, setConsultationTxnId] = useState('');
  const [admittingToQueue, setAdmittingToQueue] = useState(false);

  // Modals
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelinePatient, setTimelinePatient] = useState<{ id: string; name?: string } | null>(null);
  const [intakePrintModalOpen, setIntakePrintModalOpen] = useState(false);
  const [selectedIntakeForPrint, setSelectedIntakeForPrint] = useState<any>(null);

  // Strict Custom Invoice Print Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceModalData, setInvoiceModalData] = useState<any>(null);

  // Cash Drawer Modal
  const [showOpenDrawerModal, setShowOpenDrawerModal] = useState(false);
  const [showCloseDrawerModal, setShowCloseDrawerModal] = useState(false);
  const [openingCashTaka, setOpeningCashTaka] = useState(5000);
  const [closingCashActualTaka, setClosingCashActualTaka] = useState(5000);
  const [closingReason, setClosingReason] = useState('');

  // Bill Creation State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [billItems, setBillItems] = useState<any[]>([
    { itemType: 'consultation', description: 'Doctor Consultation', unitPriceTaka: 500, quantity: 1 },
    { itemType: 'therapy', description: 'Interferential Therapy (IFT)', unitPriceTaka: 300, quantity: 1 },
  ]);
  const [discountTaka, setDiscountTaka] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'rocket' | 'card'>('cash');
  const [txnId, setTxnId] = useState('');
  const [paidTaka, setPaidTaka] = useState(800);

  // Package Purchase Dialog State
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packageType, setPackageType] = useState<'per_session' | 'per_day'>('per_session');
  const [packageTitle, setPackageTitle] = useState('10-Session Comprehensive Rehab');
  const [packageCount, setPackageCount] = useState<number>(10);
  const [packagePriceTaka, setPackagePriceTaka] = useState<number>(2800);
  const [packageValidityDays, setPackageValidityDays] = useState<number>(30);

  const cashierStaffId = session?.staffId || '';

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, dList, pList, sList, intakes] = await Promise.all([
        api.billing.getBills().catch(() => []),
        api.billing.getDues().catch(() => []),
        api.patients.list().catch(() => []),
        api.staff.list().catch(() => []),
        api.patients.listIntakeForms({ status: 'forwarded_to_cashier' }).catch(() => []),
      ]);
      setBills(bList || []);
      setDues(dList || []);
      setPatients(pList || []);
      setStaffList(sList || []);
      setForwardedIntakes(intakes || []);

      if (pList && pList.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pList[0].id);
      }

      const cashier = sList?.find((s: any) => s.userId === session?.userId || s.role === 'cashier');
      const cid = cashier?.id || cashierStaffId;
      if (cid) {
        const dStatus = await api.billing.getDrawerStatus(cid).catch(() => null);
        setActiveDrawer(dStatus);
      }
    } catch (err: any) {
      console.error('Failed to load cashier data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime billing, queue & visit sync for cashier
  useRealtime((event) => {
    if (
      event.type.startsWith('bill.') ||
      event.type.startsWith('payment.') ||
      event.type.startsWith('drawer.') ||
      event.type.startsWith('visit.') ||
      event.type.startsWith('consultation.') ||
      event.type.startsWith('patient.') ||
      event.type.startsWith('intake.') ||
      event.type.startsWith('queue.')
    ) {
      loadData();
    }
  });

  useEffect(() => {
    loadData();
  }, [session]);

  const subtotalTaka = billItems.reduce((acc, it) => acc + (it.unitPriceTaka * it.quantity), 0);
  const totalTaka = Math.max(0, subtotalTaka - discountTaka);
  const dueTaka = Math.max(0, totalTaka - paidTaka);

  const handleAddItem = (type: string, desc: string, price: number) => {
    const updated = [...billItems, { itemType: type, description: desc, unitPriceTaka: price, quantity: 1 }];
    setBillItems(updated);
    const newSubtotal = updated.reduce((acc, it) => acc + (it.unitPriceTaka * it.quantity), 0);
    setPaidTaka(Math.max(0, newSubtotal - discountTaka));
  };

  const handleRemoveItem = (index: number) => {
    const updated = billItems.filter((_, i) => i !== index);
    setBillItems(updated);
    const newSubtotal = updated.reduce((acc, it) => acc + (it.unitPriceTaka * it.quantity), 0);
    setPaidTaka(Math.max(0, newSubtotal - discountTaka));
  };

  const handleAddPackageToBill = () => {
    const unitLabel = packageType === 'per_session' ? 'Sessions' : 'Visit Days';
    const dayRuleNote = packageType === 'per_day' ? ' [Multiple visits/day = 1 day]' : '';
    const finalDescription = `${packageTitle || (packageType === 'per_session' ? `${packageCount}-Session Package` : `${packageCount}-Day Package`)} (${packageCount} ${unitLabel}${dayRuleNote}) · Consultation & Therapy included during package length`;

    const updated = [
      ...billItems,
      {
        itemType: 'package',
        description: finalDescription,
        unitPriceTaka: packagePriceTaka,
        quantity: 1,
      },
    ];

    setBillItems(updated);
    const newSubtotal = updated.reduce((acc, it) => acc + (it.unitPriceTaka * it.quantity), 0);
    const newTotal = Math.max(0, newSubtotal - discountTaka);
    setPaidTaka(newTotal);

    setShowPackageModal(false);
    toast.success(`প্যাকেজ (${packageCount} ${unitLabel}) সফলভাবে বিলে যুক্ত হয়েছে!`);
  };

  // Helper to derive strictly FIXED doctor fee from doctor's consultationFeePaisa
  const getDoctorFixedFeeTaka = (intake: any) => {
    if (intake.doctorFee) return intake.doctorFee;
    const doc = staffList.find((s: any) => s.id === intake.doctorId || s.userId === intake.doctorId);
    if (doc?.consultationFeeTaka) return doc.consultationFeeTaka;
    if (doc?.consultationFeePaisa) return Math.round(doc.consultationFeePaisa / 100);
    return 500;
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('অনুগ্রহ করে একজন রোগী নির্বাচন করুন (Select a patient)');
      return;
    }
    if (billItems.length === 0) {
      toast.error('কমপক্ষে একটি সেবা বা আইটেম যোগ করুন (Please add at least one item)');
      return;
    }
    try {
      const res = await api.billing.createBill({
        patientId: selectedPatientId,
        items: billItems.map((it) => ({
          itemType: it.itemType,
          description: it.description,
          unitPricePaisa: Math.round(Number(it.unitPriceTaka || 0) * 100),
          quantity: Math.max(1, Math.round(Number(it.quantity || 1))),
        })),
        discountPaisa: Math.max(0, Math.round(Number(discountTaka || 0) * 100)),
        paidPaisa: Math.max(0, Math.round(Number(paidTaka || 0) * 100)),
        paymentMethod,
        txnId: txnId || undefined,
      });

      const pat = patients.find((p) => p.id === selectedPatientId);

      // Launch strict HPC Custom Size Invoice Modal
      setInvoiceModalData({
        billNumber: res.billNumber || `BILL-${Date.now().toString().slice(-6)}`,
        patientName: pat?.nameEn || 'Patient',
        patientNameBn: pat?.nameBn,
        mrn: pat?.mrn || 'N/A',
        phone: pat?.phone,
        ageYears: pat?.ageYears,
        gender: pat?.gender,
        cashierName: session?.displayName || 'Cashier Desk',
        items: billItems.map((it) => ({
          itemType: it.itemType,
          description: it.description,
          unitPriceTaka: it.unitPriceTaka,
          quantity: it.quantity,
          totalTaka: it.unitPriceTaka * it.quantity,
        })),
        subtotalTaka,
        discountTaka,
        totalTaka,
        paidTaka,
        dueTaka,
        paymentMethod,
        txnId: txnId || undefined,
        createdAt: new Date().toISOString(),
      });
      setIsInvoiceModalOpen(true);

      toast.success(`বিল সফলভাবে তৈরি হয়েছে: ${res.billNumber}`);
      loadData();
    } catch (err: any) {
      toast.error(`বিল তৈরি করতে ব্যর্থ: ${err.message}`);
    }
  };

  const openPaymentModal = (intake: any) => {
    setSelectedIntakeForPayment(intake);
    setSelectedIntakePriority('normal');
    setConsultationPaymentMethod('cash');
    setConsultationTxnId('');
  };

  const handleAdmitToQueue = async () => {
    if (!selectedIntakeForPayment) return;
    const fixedFee = getDoctorFixedFeeTaka(selectedIntakeForPayment);

    try {
      setAdmittingToQueue(true);
      const res = await api.patients.admitIntakeFormToQueue(selectedIntakeForPayment.id, {
        feeTaka: fixedFee,
        paymentMethod: consultationPaymentMethod,
        txnId: consultationTxnId || undefined,
        priority: selectedIntakePriority,
        targetQueue: 'doctor',
      });

      toast.success('পেমেন্ট সফল! রোগীকে ডাক্তার কনসালটেশন কিউতে পাঠানো হয়েছে।');

      // Automatically launch strict HPC Custom Size Invoice Print Modal with full payment
      const docName = res?.doctorName || selectedIntakeForPayment.doctorName || 'Doctor';
      const chamber = res?.chamberNumber || selectedIntakeForPayment.chamberRoomNumber || '101';

      setInvoiceModalData({
        billNumber: res?.billNumber || `BILL-${Date.now().toString().slice(-6)}`,
        patientName: selectedIntakeForPayment.name,
        patientNameBn: selectedIntakeForPayment.nameBn,
        mrn: selectedIntakeForPayment.patient?.mrn || 'N/A',
        phone: selectedIntakeForPayment.phone,
        ageYears: selectedIntakeForPayment.ageYears,
        gender: selectedIntakeForPayment.gender,
        cashierName: session?.displayName || 'Cashier Desk',
        items: [
          {
            itemType: 'consultation',
            description: `Doctor Consultation - ${docName} (Chamber Room ${chamber})`,
            unitPriceTaka: fixedFee,
            quantity: 1,
            totalTaka: fixedFee,
          },
        ],
        subtotalTaka: fixedFee,
        discountTaka: 0,
        totalTaka: fixedFee,
        paidTaka: fixedFee,
        dueTaka: 0, // strictly ৳0 due
        paymentMethod: consultationPaymentMethod,
        txnId: consultationTxnId || undefined,
        createdAt: new Date().toISOString(),
      });
      setIsInvoiceModalOpen(true);

      setSelectedIntakeForPayment(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'কিউতে পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setAdmittingToQueue(false);
    }
  };

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.billing.openDrawer({
        openingCashPaisa: Math.max(0, openingCashTaka) * 100,
      });
      toast.success('ক্যাশ ড্রয়ার সফলভাবে খোলা হয়েছে! (Cash Drawer Opened for shift)');
      setShowOpenDrawerModal(false);
      loadData();
    } catch (err: any) {
      toast.error(`ক্যাশ ড্রয়ার খুলতে ব্যর্থ: ${err.message || 'Failed to open drawer'}`);
    }
  };

  const handleCloseDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDrawer?.drawer?.id) return;
    try {
      const res = await api.billing.closeDrawer(activeDrawer.drawer.id, {
        closingCashActualPaisa: Math.max(0, closingCashActualTaka) * 100,
        varianceReason: closingReason || undefined,
      });
      toast.success(`শিফট সমাপ্ত! Variance: ৳${((res.variancePaisa || 0) / 100).toFixed(2)}`);
      setShowCloseDrawerModal(false);
      loadData();
    } catch (err: any) {
      toast.error(`ড্রয়ার বন্ধ করতে ব্যর্থ: ${err.message || 'Failed to close drawer'}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cash Drawer Status Card */}
      <Card
        className={cn(
          'border shadow-xs transition-colors',
          activeDrawer?.isOpen
            ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
            : 'border-red-500/40 bg-red-500/5 dark:bg-red-950/20'
        )}
      >
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'size-3 rounded-full animate-pulse',
                  activeDrawer?.isOpen ? 'bg-emerald-500' : 'bg-red-500'
                )}
              />
              <span className="text-base sm:text-lg font-bold text-foreground">
                Cash Drawer: {activeDrawer?.isOpen ? 'OPEN & ACTIVE' : 'CLOSED'}
              </span>
              <Badge variant={activeDrawer?.isOpen ? 'success' : 'destructive'} className="ml-1">
                {activeDrawer?.isOpen ? 'Shift Active' : 'Offline'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeDrawer?.isOpen ? (
                <span>
                  Opening Float: <strong className="text-foreground">৳{((activeDrawer.drawer.openingCashPaisa || 0) / 100).toFixed(0)}</strong> · Cash Collected: <strong className="text-foreground">৳{((activeDrawer.cashCollectedPaisa || 0) / 100).toFixed(0)}</strong>
                </span>
              ) : (
                'Please open cash drawer to start accepting payments.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeDrawer?.isOpen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseDrawerModal(true)}
                className="whitespace-nowrap border-red-500/30 text-red-600 hover:bg-red-500/10 cursor-pointer"
              >
                🔒 Close Drawer &amp; Reconcile Shift
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowOpenDrawerModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap cursor-pointer"
              >
                🔓 Open Cash Drawer Float
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* FORWARDED FROM RECEPTION: PATIENT INTAKE & DOCTOR QUEUE ADMISSION */}
      {/* ============================================================== */}
      <Card className="border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold">
                  রিসেপশন থেকে আগত রোগী (Forwarded from Reception)
                </CardTitle>
                <Badge className="bg-emerald-600 text-white font-mono text-xs">
                  {forwardedIntakes.length} জন অপেক্ষমাণ
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                রিসেপশনিস্টের ইনটেক ফরম যাচাই করুন, ফিক্সড কনসালটেশন ফি গ্রহণ করুন এবং সরাসরি লাইভ কিউতে পাঠান
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Clock className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </CardHeader>

        <CardContent>
          {forwardedIntakes.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground text-xs space-y-1">
              <UserCheck className="size-6 mx-auto opacity-40 text-emerald-500" />
              <p className="font-medium">বর্তমানে রিসেপশন থেকে অপেক্ষমাণ কোনো রোগী নেই</p>
              <p className="text-[11px] text-muted-foreground/80">
                রিসেপশনিস্ট যখন কোনো রোগীর প্রাথমিক তথ্য ফরম সাবমিট করে ক্যাশিয়ারে পাঠাবেন, তা এখানে রিয়েলটাইমে দৃশ্যমান হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {forwardedIntakes.map((intake) => {
                const fixedFee = getDoctorFixedFeeTaka(intake);
                const docName = intake.doctorName || intake.doctor?.fullName || 'ডাক্তার নির্ধারিত';
                const chamberRoom = intake.chamberRoomNumber || intake.doctor?.chamberRoomNumber || 'চেম্বার ১';

                return (
                  <div
                    key={intake.id}
                    className="p-4 rounded-xl border border-emerald-500/30 bg-card/90 hover:bg-card shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm sm:text-base text-foreground">
                          {intake.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {intake.phone} • {intake.gender === 'female' ? 'মহিলা' : 'পুরুষ'}
                          {intake.ageYears ? ` • ${intake.ageYears} বছর` : ''}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          MRN: {intake.patient?.mrn || 'N/A'}
                        </div>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-[10px]">
                        ক্যাশিয়ার অপেক্ষমাণ
                      </Badge>
                    </div>

                    {/* Doctor, Chamber & Strictly FIXED Consultation Fee */}
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                        <span className="flex items-center gap-1">
                          🩺 <strong>{docName}</strong>
                        </span>
                        <Badge className="bg-emerald-600 text-white font-mono font-bold text-xs">
                          ফি: ৳{fixedFee}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>চেম্বার: রুম {chamberRoom}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                          ✓ ফিক্সড · বকেয়া নিষিদ্ধ
                        </span>
                      </div>
                    </div>

                    {/* Chief complaint & health snippet */}
                    <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border/50 pt-2">
                      {intake.chiefComplaint && (
                        <p className="line-clamp-2">
                          <strong className="text-foreground">সমস্যা:</strong> {intake.chiefComplaint}
                        </p>
                      )}
                      {(intake.bpSystolic || intake.bloodSugar || intake.hasDiabetes) && (
                        <div className="text-[11px] flex flex-wrap gap-2 pt-1 font-mono">
                          {intake.bpSystolic && <span>BP: {intake.bpSystolic}/{intake.bpDiastolic || 80}</span>}
                          {intake.bloodSugar && <span>Sugar: {intake.bloodSugar}</span>}
                          {intake.hasDiabetes === 1 && <span className="text-amber-500">ডায়াবেটিস: হ্যাঁ</span>}
                        </div>
                      )}
                    </div>

                    {/* Action buttons: Intake Form (A4), Timeline, and Collect Fee & Queue */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIntakeForPrint(intake);
                          setIntakePrintModalOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs gap-1 flex-1 cursor-pointer"
                        title="ইনটেক ফরম প্রিন্ট (A4 সাইজ)"
                      >
                        <Printer className="size-3.5 text-emerald-600" />
                        <span>ইনটেক ফরম</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTimelinePatient({ id: intake.patientId, name: intake.name });
                          setIsTimelineOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
                        title="টাইমলাইন"
                      >
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span>টাইমলাইন</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openPaymentModal(intake)}
                        className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 flex-1 shadow-xs cursor-pointer"
                      >
                        <CreditCard className="size-3.5" />
                        <span>ফি গ্রহণ ও কিউ</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workstation Tab Switcher */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-xs max-w-xl">
        <button
          type="button"
          onClick={() => setMobileTab('billing')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'billing'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <CreditCard className="size-4" />
          <span>বিলিং ও রিসেপশন রোগী</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('therapy_queue')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'therapy_queue'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <PhoneCall className="size-4 text-emerald-400" />
          <span>থেরাপি কিউ</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('ledger')}
          className={cn(
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'ledger'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <FileText className="size-4" />
          <span>ইনভয়েস লেজার ({bills.length})</span>
        </button>
      </div>

      {mobileTab === 'therapy_queue' ? (
        <TherapyQueueManagementTab />
      ) : (
        <>
          {/* Bill Generator & Payment Ledger Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Bill Generator */}
            <div
              className={cn(
                'flex flex-col gap-6 lg:col-span-7 xl:col-span-7',
                mobileTab === 'ledger' && 'hidden lg:flex'
              )}
            >
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    💳 Generate Patient Bill
                  </CardTitle>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => handleAddItem('consultation', 'Doctor Consultation', 500)}
                    >
                      + Consult
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => handleAddItem('therapy', 'Therapy Session (IFT/UST)', 300)}
                    >
                      + Therapy
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold shadow-xs cursor-pointer"
                      onClick={() => setShowPackageModal(true)}
                    >
                      <Sparkles className="size-3.5" />
                      <span>+ Package (প্যাকেজ)</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleCreateBill} className="flex flex-col gap-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
                    {/* Patient Selection using shadcn/ui */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Select Patient *</Label>
                      <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-- Select Patient --" />
                        </SelectTrigger>
                        <SelectContent>
                          {patients.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.mrn} · {p.nameEn} ({p.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Package Quick Notice & Selection Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-semibold">
                          Consultation &amp; Therapy included during package length
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPackageModal(true)}
                        className="h-7 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 px-2.5 self-start sm:self-auto cursor-pointer"
                      >
                        📦 প্যাকেজ কনফিগার করুন
                      </Button>
                    </div>

                    {/* Bill Line Items Table */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-2.5">Item Description</th>
                            <th className="p-2.5 w-24">Rate (৳)</th>
                            <th className="p-2.5 w-16">Qty</th>
                            <th className="p-2.5">Total</th>
                            <th className="p-2.5 w-10 text-center">✕</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {billItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="p-2">
                                <Input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = [...billItems];
                                    updated[idx].description = e.target.value;
                                    setBillItems(updated);
                                  }}
                                  className="h-8 text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={item.unitPriceTaka}
                                  onChange={(e) => {
                                    const updated = [...billItems];
                                    updated[idx].unitPriceTaka = parseInt(e.target.value) || 0;
                                    setBillItems(updated);
                                  }}
                                  className="h-8 text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const updated = [...billItems];
                                    updated[idx].quantity = parseInt(e.target.value) || 1;
                                    setBillItems(updated);
                                  }}
                                  className="h-8 text-xs text-center"
                                />
                              </td>
                              <td className="p-2 font-bold text-foreground">
                                ৳{item.unitPriceTaka * item.quantity}
                              </td>
                              <td className="p-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10 cursor-pointer"
                                  onClick={() => handleRemoveItem(idx)}
                                >
                                  ✕
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <strong className="text-foreground">৳{subtotalTaka}</strong>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Discount (৳):</span>
                        <Input
                          type="number"
                          value={discountTaka}
                          onChange={(e) => {
                            const d = parseInt(e.target.value) || 0;
                            setDiscountTaka(d);
                            setPaidTaka(Math.max(0, subtotalTaka - d));
                          }}
                          className="w-28 h-8 text-right text-xs"
                        />
                      </div>
                      <div className="flex justify-between items-center border-t border-border pt-2 text-base font-bold">
                        <span>Net Payable:</span>
                        <span className="text-emerald-600 text-lg">৳{totalTaka}</span>
                      </div>
                    </div>

                    {/* Payment Recording using shadcn/ui Select */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Payment Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash (নগদ)</SelectItem>
                            <SelectItem value="bkash">bKash (বিকাশ)</SelectItem>
                            <SelectItem value="nagad">Nagad (নগদ অ্যাপ)</SelectItem>
                            <SelectItem value="rocket">Rocket (রকেট)</SelectItem>
                            <SelectItem value="card">POS Card (কার্ড)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Amount Paid (৳)</Label>
                        <Input
                          type="number"
                          value={paidTaka}
                          onChange={(e) => setPaidTaka(parseInt(e.target.value) || 0)}
                          className="h-9 font-mono"
                        />
                      </div>
                    </div>

                    {paymentMethod !== 'cash' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">MFS / Bank Transaction ID</Label>
                        <Input
                          type="text"
                          placeholder="e.g. TRX992812"
                          value={txnId}
                          onChange={(e) => setTxnId(e.target.value)}
                          className="h-9 font-mono"
                        />
                      </div>
                    )}

                    {dueTaka > 0 && (
                      <div className="text-red-600 text-xs sm:text-sm font-semibold bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                        ⚠️ Remaining Due to be recorded: ৳{dueTaka}
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm sm:text-base shadow-sm cursor-pointer"
                    >
                      🖨️ Settle Bill &amp; Print HPC Custom Invoice
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Bills Ledger & Dues */}
            <div
              className={cn(
                'flex flex-col gap-6 lg:col-span-5 xl:col-span-5',
                mobileTab === 'billing' && 'hidden lg:flex'
              )}
            >
              {/* Bills List Card */}
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    🧾 Settled Invoices ({bills.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadData}
                    disabled={loading}
                    className="h-8 text-xs flex items-center gap-1 cursor-pointer"
                  >
                    🔄 Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-muted/50 sticky top-0 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2.5">Bill #</th>
                          <th className="p-2.5">Patient</th>
                          <th className="p-2.5">Total</th>
                          <th className="p-2.5">Paid</th>
                          <th className="p-2.5 text-right">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {bills.slice(0, 20).map((b) => (
                          <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 font-bold text-foreground">{b.billNumber}</td>
                            <td className="p-2.5 text-muted-foreground truncate max-w-[100px]">
                              {b.patient?.nameEn || b.patientId}
                            </td>
                            <td className="p-2.5 font-semibold">৳{(b.totalPaisa / 100).toFixed(0)}</td>
                            <td className="p-2.5 text-emerald-600 font-semibold">৳{(b.paidPaisa / 100).toFixed(0)}</td>
                            <td className="p-2.5 text-right">
                              <Badge variant="outline" className="text-xs uppercase">
                                {b.paymentMethod}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Dues Tracking Card */}
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-red-600">
                    ⚠️ Outstanding Dues ({dues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dues.length === 0 ? (
                    <div className="text-muted-foreground text-center py-6 text-xs sm:text-sm">
                      No pending patient dues.
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-muted/50 sticky top-0 border-b border-border text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-2.5">Patient</th>
                            <th className="p-2.5">Due Amount</th>
                            <th className="p-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {dues.map((d) => (
                            <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-2.5 font-medium text-foreground">
                                {d.patient?.nameEn || d.patientId}
                              </td>
                              <td className="p-2.5 text-red-600 font-bold">
                                ৳{(d.amountPaisa / 100).toFixed(0)}
                              </td>
                              <td className="p-2.5 text-right">
                                <Badge variant="destructive">{d.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* PACKAGE PURCHASE & PRICING MODAL */}
      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 bg-background border-emerald-500/30" onClose={() => setShowPackageModal(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="size-4" />
              <span>রিহ্যাবিলিটেশন ও ফিজিওথেরাপি প্যাকেজ বিক্রয়</span>
            </div>
            <DialogTitle className="text-lg font-bold">
              Package Purchase &amp; Pricing Setup
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure per-session or per-day rehabilitation packages. Consultation and therapy are included during the entire package period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Notice / Badge */}
            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5">
              <Sparkles className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    Consultation &amp; Therapy included during package length
                  </span>
                  <Badge variant="outline" className="border-emerald-500/60 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] uppercase font-bold tracking-wide">
                    All-Inclusive
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  প্যাকেজের কার্যকর মেয়াদের মধ্যে প্রয়োজনীয় সকল ডাক্তার ফলোআপ কনসালটেশন এবং নির্ধারিত ফিজিওথেরাপি সেশন সম্পূর্ণ অন্তর্ভুক্ত। কোনো অতিরিক্ত কনসালটেশন ফি দিতে হবে না।
                </p>
              </div>
            </div>

            {/* 1. Model Selector: Per Session vs Per Day */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">প্যাকেজ মডেল নির্বাচন করুন (Package Model) *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPackageType('per_session');
                    setPackageTitle(SESSION_PRESETS[1].name);
                    setPackageCount(SESSION_PRESETS[1].count);
                    setPackagePriceTaka(SESSION_PRESETS[1].priceTaka);
                    setPackageValidityDays(SESSION_PRESETS[1].validityDays);
                  }}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer',
                    packageType === 'per_session'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 shadow-xs ring-1 ring-emerald-500'
                      : 'border-border/70 hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">Per Session (সেশন ভিত্তিক)</span>
                    {packageType === 'per_session' && <CheckCircle2 className="size-4 text-emerald-500" />}
                  </div>
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    x BDT per x sessions
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    রোগী প্রতিটি থেরাপি সেশন গ্রহণ করলে ১টি করে ক্রেডিট শেষ হবে (যেমন ১০ বা ১৫ সেশন)।
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPackageType('per_day');
                    setPackageTitle(DAY_PRESETS[1].name);
                    setPackageCount(DAY_PRESETS[1].count);
                    setPackagePriceTaka(DAY_PRESETS[1].priceTaka);
                    setPackageValidityDays(DAY_PRESETS[1].validityDays);
                  }}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer',
                    packageType === 'per_day'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 shadow-xs ring-1 ring-emerald-500'
                      : 'border-border/70 hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">Per Day (দিন ভিত্তিক)</span>
                    {packageType === 'per_day' && <CheckCircle2 className="size-4 text-emerald-500" />}
                  </div>
                  <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    x BDT per x visit days
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    একই দিনে একাধিকবার ভিজিট করলেও ১ দিন গণনা হবে (multiple visits per day count as 1 day)।
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Preset Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">
                  প্রস্তাবিত প্রিসেট প্যাকেজ (Preset Packages)
                </Label>
                <span className="text-[11px] text-muted-foreground">ক্লিক করে নির্বাচন করুন</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(packageType === 'per_session' ? SESSION_PRESETS : DAY_PRESETS).map((preset) => (
                  <button
                    type="button"
                    key={preset.name}
                    onClick={() => {
                      setPackageTitle(preset.name);
                      setPackageCount(preset.count);
                      setPackagePriceTaka(preset.priceTaka);
                      setPackageValidityDays(preset.validityDays);
                    }}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer',
                      packageCount === preset.count && packagePriceTaka === preset.priceTaka
                        ? 'border-emerald-500 bg-emerald-500/15 font-semibold ring-1 ring-emerald-500'
                        : 'border-border/60 hover:bg-muted/30 text-muted-foreground'
                    )}
                  >
                    <span className="text-xs font-bold text-foreground">
                      {preset.count} {packageType === 'per_session' ? 'Sessions' : 'Days'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ৳{preset.priceTaka}
                    </span>
                    {preset.tag && (
                      <span className="text-[10px] text-muted-foreground/80 truncate">
                        {preset.tag}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Custom Editable Values */}
            <div className="p-3 rounded-xl border border-border/70 bg-card/50 space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>কাস্টমাইজড তথ্য (Customizable Fields)</span>
                <span className="text-[11px] font-normal text-muted-foreground">ইচ্ছা অনুযায়ী পরিবর্তনযোগ্য</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">প্যাকেজের নাম বা বিবরণ (Package Title)</Label>
                <Input
                  type="text"
                  value={packageTitle}
                  onChange={(e) => setPackageTitle(e.target.value)}
                  placeholder="e.g. 10-Session Comprehensive Rehab"
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {packageType === 'per_session' ? 'সেশন সংখ্যা (Sessions)' : 'ভিজিট দিন সংখ্যা (Days)'} *
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={packageCount}
                    onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                    className="h-8 text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {packageType === 'per_day' ? 'একাধিক ভিজিট = ১ দিন' : 'মোট অনুমোদিত সেশন'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">মোট মূল্য (Total Price in ৳) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={packagePriceTaka}
                    onChange={(e) => setPackagePriceTaka(parseInt(e.target.value) || 0)}
                    className="h-8 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ≈ ৳{Math.round(packagePriceTaka / (packageCount || 1))} / {packageType === 'per_session' ? 'সেশন' : 'দিন'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">কার্যকর মেয়াদ (Validity Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={packageValidityDays}
                    onChange={(e) => setPackageValidityDays(parseInt(e.target.value) || 30)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">প্যাকেজ মেয়াদের দিন</p>
                </div>
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground text-xs">
                  {packageTitle}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {packageCount} {packageType === 'per_session' ? 'Sessions' : 'Visit Days (Multiple visits/day = 1 day)'} • Validity: {packageValidityDays} days
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ৳{packagePriceTaka}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  ≈ ৳{Math.round(packagePriceTaka / (packageCount || 1))} per {packageType === 'per_session' ? 'session' : 'day'}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPackageModal(false)}
              className="text-xs cursor-pointer"
            >
              বাতিল (Cancel)
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddPackageToBill}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              বিলে যুক্ত করুন (৳{packagePriceTaka})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Drawer Dialog */}
      <Dialog open={showOpenDrawerModal} onOpenChange={setShowOpenDrawerModal}>
        <DialogContent className="max-w-md" onClose={() => setShowOpenDrawerModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Open Cash Drawer Float</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the starting cash float for this shift to open the drawer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenDrawer} className="flex flex-col gap-4 mt-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <div className="space-y-1.5">
              <Label htmlFor="opening-cash" className="text-xs font-semibold">
                Opening Cash Float (৳) *
              </Label>
              <Input
                id="opening-cash"
                type="number"
                min="0"
                value={openingCashTaka}
                onChange={(e) => setOpeningCashTaka(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <DialogFooter className="flex flex-row justify-end gap-3 mt-4 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowOpenDrawerModal(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                Confirm Open Float
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={showCloseDrawerModal} onOpenChange={setShowCloseDrawerModal}>
        <DialogContent className="max-w-md" onClose={() => setShowCloseDrawerModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Close Shift &amp; Reconcile Drawer</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the physical cash count in drawer to reconcile and close the shift.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseDrawer} className="flex flex-col gap-4 mt-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <div className="space-y-1.5">
              <Label htmlFor="closing-cash" className="text-xs font-semibold">
                Physical Cash Count in Drawer (৳) *
              </Label>
              <Input
                id="closing-cash"
                type="number"
                min="0"
                value={closingCashActualTaka}
                onChange={(e) => setClosingCashActualTaka(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="closing-reason" className="text-xs font-semibold">
                Variance Explanation (If any difference)
              </Label>
              <Input
                id="closing-reason"
                type="text"
                placeholder="e.g. Small change shortage"
                value={closingReason}
                onChange={(e) => setClosingReason(e.target.value)}
              />
            </div>
            <DialogFooter className="flex flex-row justify-end gap-3 mt-4 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowCloseDrawerModal(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer">
                Confirm &amp; Close Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* STRICT HPC CUSTOM SIZE INVOICE PRINT MODAL (5.5" × 8.27") */}
      <InvoicePrintModal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        data={invoiceModalData}
      />

      {/* A4 INTAKE ASSESSMENT PRINT MODAL */}
      <IntakeAssessmentPrintModal
        open={intakePrintModalOpen}
        onClose={() => setIntakePrintModalOpen(false)}
        intake={selectedIntakeForPrint}
      />

      {/* CONSULTATION FEE COLLECTION & QUEUE ADMISSION MODAL */}
      {selectedIntakeForPayment && (
        <Dialog
          open={!!selectedIntakeForPayment}
          onOpenChange={(open) => {
            if (!open) setSelectedIntakeForPayment(null);
          }}
        >
          <DialogContent className="max-w-md p-5 bg-background border-emerald-500/30" onClose={() => setSelectedIntakeForPayment(null)}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <CreditCard className="size-4" />
                <span>পরামর্শ ফি গ্রহণ ও সিরিয়াল অন্তর্ভুক্তি</span>
              </div>
              <DialogTitle className="text-lg font-bold">
                {selectedIntakeForPayment.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                ফোন: {selectedIntakeForPayment.phone} • ডাক্তার: {selectedIntakeForPayment.doctorName || 'নির্ধারিত ডাক্তার'}
                {selectedIntakeForPayment.chamberRoomNumber ? ` (রুম ${selectedIntakeForPayment.chamberRoomNumber})` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* FIXED & NON-CUSTOMIZABLE FEE DISPLAY BADGE */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>ডাক্তার কনসালটেশন ফি (নির্দিষ্ট)</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                    বকেয়া নিষিদ্ধ · সম্পূর্ণ পরিশোধ আবশ্যক
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                    ৳{getDoctorFixedFeeTaka(selectedIntakeForPayment)}
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                    Fixed Fee
                  </Badge>
                </div>
              </div>

              {/* Consultation Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">পেমেন্ট মেথড (Payment Method) *</Label>
                <Select
                  value={consultationPaymentMethod}
                  onValueChange={(val: any) => setConsultationPaymentMethod(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- পেমেন্ট মেথড নির্বাচন করুন --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (নগদ)</SelectItem>
                    <SelectItem value="bkash">bKash (বিকাশ)</SelectItem>
                    <SelectItem value="nagad">Nagad (নগদ অ্যাপ)</SelectItem>
                    <SelectItem value="rocket">Rocket (রকেট)</SelectItem>
                    <SelectItem value="card">POS Card (কার্ড)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Digital Txn ID if not cash */}
              {consultationPaymentMethod !== 'cash' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    ট্রানজ্যাকশন আইডি (Transaction ID / POS Slip Ref)
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. TRX-902812"
                    value={consultationTxnId}
                    onChange={(e) => setConsultationTxnId(e.target.value)}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              )}

              {/* Queue Priority Selection */}
              {/* Queue Priority Selection & Fixed Doctor Consultation Queue */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">সিরিয়াল অগ্রাধিকার (Priority)</Label>
                  <Select
                    value={selectedIntakePriority}
                    onValueChange={(val: any) => setSelectedIntakePriority(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (সাধারণ)</SelectItem>
                      <SelectItem value="emergency">Emergency (জরুরি)</SelectItem>
                      <SelectItem value="vip">VIP (অগ্রাধিকার)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">গন্তব্য কিউ (Target Queue)</Label>
                  <div className="h-9 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 truncate">
                      <Stethoscope className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">ডাক্তার চেম্বার কিউ</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 shrink-0">
                      রুম {selectedIntakeForPayment.chamberRoomNumber || '—'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-muted-foreground text-[11px] leading-relaxed flex items-start gap-2">
                <Sparkles className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  ফি গ্রহণ নিশ্চিত করামাত্র রোগীকে স্বয়ংক্রিয়ভাবে <strong>ডাক্তার চেম্বার কনসালটেশন কিউতে</strong> পাঠানো হবে, ওয়েটিং রুম ও অ্যান্ড্রয়েড টিভিতে সিরিয়াল ভেসে উঠবে এবং সাথে সাথে <strong>HPC সাইজ ইনভয়েস (5.5&quot; × 8.27&quot;)</strong> প্রিন্ট হবে।
                </span>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIntakeForPayment(null)}
                disabled={admittingToQueue}
                className="flex-1 text-xs cursor-pointer"
              >
                বাতিল
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAdmitToQueue}
                disabled={admittingToQueue}
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
              >
                {admittingToQueue ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> ফি আদায় হচ্ছে...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-3.5" /> ফি গ্রহণ, কনসালটেশন কিউ ও ইনভয়েস
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* PATIENT TIMELINE MODAL */}
      <PatientTimelineModal
        open={isTimelineOpen}
        onOpenChange={setIsTimelineOpen}
        patientId={timelinePatient?.id}
        patientName={timelinePatient?.name}
      />
    </div>
  );
}
