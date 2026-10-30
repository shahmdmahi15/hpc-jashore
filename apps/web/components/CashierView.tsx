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
import { useLanguage } from '../lib/i18n';
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
  Activity,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Coins,
  RotateCcw,
} from 'lucide-react';

interface PackagePreset {
  name: string;
  nameBn?: string;
  count: number;
  priceTaka: number;
  validityDays: number;
  tag?: string;
  tagBn?: string;
  tagEn?: string;
}

const SESSION_PRESETS: PackagePreset[] = [
  {
    name: '5-Session Quick Recovery',
    nameBn: '৫-সেশন প্রাথমিক রিকভারি',
    count: 5,
    priceTaka: 1500,
    validityDays: 15,
    tagBn: '৳৩০০/সেশন', tagEn: 'BDT 300/session',
  },
  {
    name: '10-Session Comprehensive Rehab',
    nameBn: '১০-সেশন পূর্ণাঙ্গ রিহ্যাব প্যাকেজ',
    count: 10,
    priceTaka: 2800,
    validityDays: 30,
    tagBn: 'জনপ্রিয় · ৳২৮০/সেশন', tagEn: 'Popular · BDT 280/session',
  },
  {
    name: '15-Session Advanced Therapy',
    nameBn: '১৫-সেশন অ্যাডভান্সড থেরাপি',
    count: 15,
    priceTaka: 3900,
    validityDays: 45,
    tagBn: 'সেরা মান · ৳২৬০/সেশন', tagEn: 'Best Value · BDT 260/session',
  },
  {
    name: '20-Session Intensive Mobility',
    nameBn: '২০-সেশন নিবিড় গতিশীলতা প্যাকেজ',
    count: 20,
    priceTaka: 4800,
    validityDays: 60,
    tagBn: '৳২৪০/সেশন', tagEn: 'BDT 240/session',
  },
];

const DAY_PRESETS: PackagePreset[] = [
  {
    name: '7-Day Intensive Care Package',
    nameBn: '৭-দিনের নিবিড় থেরাপি প্যাকেজ',
    count: 7,
    priceTaka: 2500,
    validityDays: 14,
    tagBn: '৳৩৫৭/দিন', tagEn: 'BDT 357/day',
  },
  {
    name: '14-Day Full Mobility Package',
    nameBn: '১৪-দিনের কমপ্লিট মবিলিটি প্যাকেজ',
    count: 14,
    priceTaka: 4500,
    validityDays: 30,
    tagBn: 'সুপারিশকৃত · ৳৩২১/দিন', tagEn: 'Recommended · BDT 321/day',
  },
  {
    name: '21-Day Pain Free Protocol',
    nameBn: '২১-দিনের পেইন-ফ্রি কেয়ার প্যাকেজ',
    count: 21,
    priceTaka: 6300,
    validityDays: 45,
    tagBn: '৳৩০০/দিন', tagEn: 'BDT 300/day',
  },
  {
    name: '30-Day Monthly Recovery Package',
    nameBn: '৩০-দিনের মাসিক রিহ্যাব প্যাকেজ',
    count: 30,
    priceTaka: 8500,
    validityDays: 60,
    tagBn: 'সেরা মান · ৳২৮৩/দিন', tagEn: 'Best Value · BDT 283/day',
  },
];

export interface CashierProps {
  session?: UserSession | null;
}

export default function CashierView({ session: propSession }: CashierProps = {}) {
  const session = propSession || getSession();
  const { language } = useLanguage();
  const isBn = language === 'bn';
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

  // Therapy Hall Forwarded Bills State (Locked by Handler)
  const [pendingTherapyBills, setPendingTherapyBills] = useState<any[]>([]);
  const [selectedTherapyBillForPayment, setSelectedTherapyBillForPayment] = useState<any>(null);
  const [therapyPaymentMethod, setTherapyPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'rocket' | 'card'>('cash');
  const [therapyTxnId, setTherapyTxnId] = useState('');
  const [collectingTherapyBill, setCollectingTherapyBill] = useState(false);
  const [therapyPaymentMode, setTherapyPaymentMode] = useState<'full' | 'partial' | 'due'>('full');
  const [therapyPartialPaidTaka, setTherapyPartialPaidTaka] = useState<number>(0);
  const [includePreviousDue, setIncludePreviousDue] = useState<boolean>(true);

  // Doctor Chamber Adjustments State (Cases 1, 2, 3: Refunds & Extra Fee Collections)
  const [pendingDoctorAdjustments, setPendingDoctorAdjustments] = useState<any[]>([]);
  const [selectedAdjustmentForProcessing, setSelectedAdjustmentForProcessing] = useState<any>(null);
  const [adjustmentProcessingMethod, setAdjustmentProcessingMethod] = useState<'cash' | 'bkash' | 'nagad' | 'rocket' | 'card'>('cash');
  const [adjustmentTxnId, setAdjustmentTxnId] = useState('');
  const [processingAdjustment, setProcessingAdjustment] = useState(false);

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

  const normalizePendingTherapyBill = (raw: any) => {
    let fee = raw.feeTaka ?? raw.fixedFeeTaka;
    if (!fee && raw.totalPaisa) fee = Math.round(raw.totalPaisa / 100);
    if (!fee && raw.items?.[0]?.unitPricePaisa) fee = Math.round(raw.items[0].unitPricePaisa / 100);
    if (!fee && raw.items?.[0]?.unitPriceTaka) fee = raw.items[0].unitPriceTaka;
    fee = Number(fee) || 0;

    const pat = raw.patient || patients.find((p) => p.id === raw.patientId);
    const patientName = raw.patientName || pat?.nameEn || raw.patient?.nameEn || 'Patient';
    const patientNameBn = raw.patientNameBn || pat?.nameBn || raw.patient?.nameBn;
    const mrn = raw.mrn || pat?.mrn || raw.patient?.mrn || 'N/A';
    const phone = raw.phone || pat?.phone || raw.patient?.phone || '';
    const ageYears = raw.ageYears ?? pat?.ageYears ?? raw.patient?.ageYears;
    const gender = raw.gender || pat?.gender || raw.patient?.gender || 'other';

    const token = raw.tokenNumber ?? raw.visit?.tokenNumber ?? raw.token ?? 1;
    const modalityCode = raw.modalityCode || raw.items?.[0]?.modalityCode || raw.modality || 'Therapy';
    const modalityName = raw.modalityName || raw.items?.[0]?.description || modalityCode;
    const visitId = raw.visitId || raw.visit?.id || '';

    return {
      id: raw.id || raw.billId || visitId || `bill-${Date.now()}`,
      visitId,
      patientId: raw.patientId || pat?.id || '',
      tokenNumber: Number(token) || 1,
      patientName,
      patientNameBn,
      mrn,
      phone,
      ageYears,
      gender,
      modalityCode,
      modalityName,
      feeTaka: fee,
      notes: raw.notes || '',
      isLockedByHandler: true,
      rawBill: raw,
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, dList, pList, sList, intakes, therapyBills, todayVisits] = await Promise.all([
        api.billing.getBills().catch(() => []),
        api.billing.getDues().catch(() => []),
        api.patients.list().catch(() => []),
        api.staff.list().catch(() => []),
        api.patients.listIntakeForms({ status: 'forwarded_to_cashier' }).catch(() => []),
        api.therapy.getPendingBills().catch(async () => {
          try {
            const all = await api.billing.getBills().catch(() => []);
            return (all || []).filter((b: any) => {
              const isDraft = b.status === 'draft';
              const hasHandlerLock = b.notes && (b.notes.includes('isLockedByHandler') || b.notes.includes('Therapy'));
              const hasTherapy = b.items?.some((it: any) => it.itemType === 'therapy');
              return isDraft && (hasHandlerLock || hasTherapy);
            });
          } catch {
            return [];
          }
        }),
        api.visits.getToday().catch(() => []),
      ]);
      setBills(bList || []);
      setDues(dList || []);
      setPatients(pList || []);
      setStaffList(sList || []);
      setForwardedIntakes(intakes || []);
      setPendingTherapyBills(therapyBills || []);

      const adjustments = (todayVisits || []).filter(
        (v: any) =>
          v.consultationAdjustmentStatus === 'pending' &&
          (v.currentLocation === 'cashier' || v.currentLocation === 'Cashier')
      );
      setPendingDoctorAdjustments(adjustments);

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

  // Realtime billing, queue, therapy & visit sync for cashier
  useRealtime((event) => {
    if (
      event.type.startsWith('bill.') ||
      event.type.startsWith('payment.') ||
      event.type.startsWith('drawer.') ||
      event.type.startsWith('visit.') ||
      event.type.startsWith('consultation.') ||
      event.type.startsWith('patient.') ||
      event.type.startsWith('intake.') ||
      event.type.startsWith('therapy.') ||
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

  const getDoctorFixedFeeTaka = (intake: any) => {
    if (intake.consultationFeeTaka != null && intake.consultationFeeTaka > 0) return intake.consultationFeeTaka;
    if (intake.doctorFee) return intake.doctorFee;
    const doc = staffList.find((s: any) => s.id === intake.doctorId || s.userId === intake.doctorId);
    if (doc?.consultationFeeTaka) return doc.consultationFeeTaka;
    if (doc?.consultationFeePaisa) return Math.round(doc.consultationFeePaisa / 100);
    return 500;
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDrawer?.isOpen) {
      toast.error(
        isBn
          ? 'ক্যাশ ড্রয়ার বন্ধ রয়েছে! বিল তৈরির পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।'
          : 'Cash drawer is closed! Please open cash drawer before creating bills.'
      );
      setShowOpenDrawerModal(true);
      return;
    }
    if (!selectedPatientId) {
      toast.error(isBn ? 'অনুগ্রহ করে একজন রোগী নির্বাচন করুন' : 'Please select a patient');
      return;
    }
    if (billItems.length === 0) {
      toast.error(isBn ? 'কমপক্ষে একটি সেবা বা আইটেম যোগ করুন' : 'Please add at least one item');
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
    if (!activeDrawer?.isOpen) {
      toast.error(
        isBn
          ? 'ক্যাশ ড্রয়ার বন্ধ রয়েছে! ফি সংগ্রহের পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।'
          : 'Cash drawer is closed! Please open cash drawer before collecting fees.'
      );
      setShowOpenDrawerModal(true);
      return;
    }
    setSelectedIntakeForPayment(intake);
    setSelectedIntakePriority('normal');
    setConsultationPaymentMethod('cash');
    setConsultationTxnId('');
  };

  const handleAdmitToQueue = async () => {
    if (!activeDrawer?.isOpen) {
      toast.error('ক্যাশ ড্রয়ার বন্ধ রয়েছে! ফি সংগ্রহের পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।');
      setShowOpenDrawerModal(true);
      return;
    }
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
        dueTaka: 0,
        paymentMethod: consultationPaymentMethod,
        txnId: consultationTxnId || undefined,
        createdAt: new Date().toISOString(),
      });
      setIsInvoiceModalOpen(true);

      const intakeId = selectedIntakeForPayment.id;
      setSelectedIntakeForPayment(null);
      setForwardedIntakes((prev) => prev.filter((i) => i.id !== intakeId));
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'কিউতে পাঠাতে ব্যর্থ হয়েছে');
    } finally {
      setAdmittingToQueue(false);
    }
  };

  // Open Doctor Consultation Adjustment Modal (Refund or Payment Collection)
  const handleOpenAdjustmentModal = (adj: any) => {
    if (!activeDrawer?.isOpen) {
      toast.error(
        isBn
          ? 'ক্যাশ ড্রয়ার বন্ধ রয়েছে! লেনদেনের পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।'
          : 'Cash drawer is closed! Please open cash drawer before transactions.'
      );
      setShowOpenDrawerModal(true);
      return;
    }
    setSelectedAdjustmentForProcessing(adj);
    setAdjustmentProcessingMethod('cash');
    setAdjustmentTxnId('');
  };

  // Process Doctor Consultation Adjustment & Issue Invoice
  const handleProcessAdjustment = async (status: 'completed' | 'rejected') => {
    if (!selectedAdjustmentForProcessing) return;
    if (status === 'completed' && !activeDrawer?.isOpen) {
      toast.error('ক্যাশ ড্রয়ার বন্ধ রয়েছে! লেনদেনের পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।');
      setShowOpenDrawerModal(true);
      return;
    }

    try {
      setProcessingAdjustment(true);
      const res = await api.visits.processConsultationAdjustment(selectedAdjustmentForProcessing.id, {
        status,
        paymentMethod: adjustmentProcessingMethod,
        txnId: adjustmentTxnId || undefined,
      });

      if (status === 'completed') {
        const isRefund = selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund';
        toast.success(
          isRefund
            ? 'রিফান্ড সফলভাবে সম্পন্ন হয়েছে এবং রোগীকে রিসেপশনে পাঠানো হয়েছে!'
            : 'ফি আদায় সফলভাবে সম্পন্ন হয়েছে এবং রোগীকে রিসেপশনে পাঠানো হয়েছে!'
        );

        if (res?.invoiceData) {
          setInvoiceModalData(res.invoiceData);
          setIsInvoiceModalOpen(true);
        }
      } else {
        toast.info('অনুরোধ বাতিল করা হয়েছে এবং রোগীকে রিসেপশনে পাঠানো হয়েছে।');
      }

      setSelectedAdjustmentForProcessing(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'প্রক্রিয়া সম্পন্ন করতে ব্যর্থ হয়েছে');
    } finally {
      setProcessingAdjustment(false);
    }
  };

  // Open Therapy Bill Payment Modal
  const openTherapyPaymentModal = (bill: any) => {
    if (!activeDrawer?.isOpen) {
      toast.error(
        isBn
          ? 'ক্যাশ ড্রয়ার বন্ধ রয়েছে! বিল সংগ্রহের পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।'
          : 'Cash drawer is closed! Please open cash drawer before collecting bills.'
      );
      setShowOpenDrawerModal(true);
      return;
    }
    setSelectedTherapyBillForPayment(bill);
    setTherapyPaymentMethod('cash');
    setTherapyTxnId('');
    setTherapyPaymentMode('full');
    setTherapyPartialPaidTaka(Number(bill.feeTaka || 0));
    setIncludePreviousDue(true);
  };

  // Process Handler Locked Fixed Bill & Forward to Reception
  const handleCollectTherapyBill = async () => {
    if (!activeDrawer?.isOpen) {
      toast.error('ক্যাশ ড্রয়ার বন্ধ রয়েছে! বিল সংগ্রহের পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।');
      setShowOpenDrawerModal(true);
      return;
    }
    if (!selectedTherapyBillForPayment) return;
    const bill = selectedTherapyBillForPayment;
    try {
      setCollectingTherapyBill(true);

      const baseFeeTaka = Number(bill.feeTaka || 0);

      // Check if patient has previous due
      const patientDueRecords = dues.filter((d: any) => d.patientId === bill.patientId && d.status !== 'settled');
      const prevDueTaka = patientDueRecords.reduce(
        (sum: number, d: any) =>
          sum +
          (d.amountPaisa != null
            ? Math.max(0, (d.amountPaisa - (d.settledPaisa || 0)) / 100)
            : Number(d.dueTaka || (d.duePaisa ? d.duePaisa / 100 : 0))),
        0
      );

      const effectivePrevDueTaka = (includePreviousDue && prevDueTaka > 0) ? prevDueTaka : 0;
      const totalPayableTaka = baseFeeTaka + effectivePrevDueTaka;

      let paidTaka = 0;
      if (therapyPaymentMode === 'full') {
        paidTaka = totalPayableTaka;
      } else if (therapyPaymentMode === 'partial') {
        paidTaka = Math.min(totalPayableTaka, Math.max(0, Number(therapyPartialPaidTaka || 0)));
      } else {
        paidTaka = 0; // Full Due
      }

      const dueTaka = Math.max(0, totalPayableTaka - paidTaka);

      const invoiceItems: any[] = [
        {
          itemType: 'therapy',
          description: `Therapy Session (${bill.modalityName || bill.modalityCode}) [Locked by Handler]`,
          unitPriceTaka: baseFeeTaka,
          quantity: 1,
          totalTaka: baseFeeTaka,
        },
      ];

      if (effectivePrevDueTaka > 0) {
        invoiceItems.push({
          itemType: 'previous_due',
          description: isBn ? 'পূর্ববর্তী বকেয়া সমন্বয়' : 'Previous Due Clearance',
          unitPriceTaka: effectivePrevDueTaka,
          quantity: 1,
          totalTaka: effectivePrevDueTaka,
        });
      }

      let createdBillRes: any = null;

      // Settle the existing draft bill if already created by therapy handler, preventing duplicate billing records
      const hasExistingDraftBill = bill.id && !String(bill.id).startsWith('temp_') && !String(bill.id).startsWith('visit_');
      if (hasExistingDraftBill && paidTaka > 0) {
        createdBillRes = await api.billing.payBill(bill.id, {
          amountPaisa: Math.round(paidTaka * 100),
          method: therapyPaymentMethod,
          txnId: therapyTxnId || undefined,
        });
      } else if (!hasExistingDraftBill) {
        // Create paid/due/partially paid bill in database
        createdBillRes = await api.billing.createBill({
          patientId: bill.patientId,
          visitId: bill.visitId || undefined,
          items: invoiceItems.map((it) => ({
            itemType: it.itemType,
            description: it.description,
            unitPricePaisa: Math.round(Number(it.unitPriceTaka) * 100),
            quantity: it.quantity,
          })),
          discountPaisa: 0,
          paidPaisa: Math.round(paidTaka * 100),
          paymentMethod: therapyPaymentMethod,
          txnId: therapyTxnId || undefined,
        });
      }

      // 3. Immediately clear from pending UI state
      setPendingTherapyBills((prev) =>
        prev.filter((b) => b.id !== bill.id && (!bill.visitId || b.visitId !== bill.visitId))
      );

      // Automatically route visit to reception
      if (bill.visitId) {
        await api.visits.routePatient(bill.visitId, { location: 'reception' }).catch((err) => {
          console.warn('Could not route patient to reception:', err);
        });
      }

      toast.success(
        therapyPaymentMode === 'due'
          ? 'বিল বকেয়া হিসেবে নথিভুক্ত হয়েছে! রোগীকে চেকআউটের জন্য রিসেপশনে পাঠানো হয়েছে।'
          : therapyPaymentMode === 'partial'
          ? `আংশিক বিল গ্রহণ সম্পন্ন (৳${paidTaka} পরিশোধ, ৳${dueTaka} বকেয়া)! রোগীকে রিসেপশনে পাঠানো হয়েছে।`
          : 'সম্পূর্ণ বিল গ্রহণ সম্পন্ন! রোগীকে চেকআউটের জন্য রিসেপশনে পাঠানো হয়েছে।'
      );

      const billNum = createdBillRes?.billNumber || createdBillRes?.bill?.billNumber || `BILL-${Date.now().toString().slice(-6)}`;
      setInvoiceModalData({
        billNumber: billNum,
        patientName: bill.patientName,
        patientNameBn: bill.patientNameBn,
        mrn: bill.mrn || 'N/A',
        phone: bill.phone,
        ageYears: bill.ageYears,
        gender: bill.gender,
        cashierName: session?.displayName || 'Cashier Desk',
        items: invoiceItems,
        subtotalTaka: totalPayableTaka,
        discountTaka: 0,
        totalTaka: totalPayableTaka,
        paidTaka,
        dueTaka,
        paymentMethod: therapyPaymentMethod,
        txnId: therapyTxnId || undefined,
        createdAt: new Date().toISOString(),
      });
      setIsInvoiceModalOpen(true);

      setSelectedTherapyBillForPayment(null);
      setTherapyTxnId('');
      await loadData();
    } catch (err: any) {
      toast.error(`বিল গ্রহণ করতে ব্যর্থ: ${err?.message || 'Error collecting therapy bill'}`);
    } finally {
      setCollectingTherapyBill(false);
    }
  };

  const handleReprintBill = async (billRow: any) => {
    try {
      const full = await api.billing.getBill(billRow.id).catch(() => null);
      const b = full?.bill || billRow;
      const pat = full?.patient || billRow.patient || patients.find((p) => p.id === b.patientId);
      const items = full?.items && full.items.length > 0 ? full.items : [
        {
          itemType: 'service',
          description: 'HPC Center Medical Service / Billing',
          unitPriceTaka: Math.round(b.totalPaisa / 100),
          quantity: 1,
          totalTaka: Math.round(b.totalPaisa / 100),
        },
      ];

      setInvoiceModalData({
        billNumber: b.billNumber,
        patientName: pat?.nameEn || pat?.name || 'Patient',
        patientNameBn: pat?.nameBn,
        mrn: pat?.mrn || 'N/A',
        phone: pat?.phone,
        ageYears: pat?.ageYears,
        gender: pat?.gender,
        cashierName: full?.cashier?.displayName || session?.displayName || 'Cashier Desk',
        items: items.map((it: any) => ({
          itemType: it.itemType,
          description: it.description,
          unitPriceTaka: it.unitPricePaisa ? Math.round(it.unitPricePaisa / 100) : it.unitPriceTaka || Math.round(b.totalPaisa / 100),
          quantity: it.quantity || 1,
          totalTaka: it.totalPaisa ? Math.round(it.totalPaisa / 100) : it.totalTaka || Math.round((it.unitPricePaisa || 0) * (it.quantity || 1) / 100),
        })),
        subtotalTaka: Math.round((b.subtotalPaisa ?? b.totalPaisa) / 100),
        discountTaka: Math.round((b.discountPaisa ?? 0) / 100),
        totalTaka: Math.round(b.totalPaisa / 100),
        paidTaka: Math.round(b.paidPaisa / 100),
        dueTaka: Math.max(0, Math.round((b.totalPaisa - b.paidPaisa) / 100)),
        paymentMethod: b.paymentMethod || 'CASH',
        txnId: b.transactionReference || undefined,
        createdAt: b.createdAt,
      });
      setIsInvoiceModalOpen(true);
    } catch {
      toast.error('ইনভয়েস বিবরণ লোড করতে সমস্যা হয়েছে');
    }
  };

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.billing.openDrawer({
        openingCashPaisa: Math.max(0, openingCashTaka) * 100,
      });
      toast.success(
        isBn
          ? 'ক্যাশ ড্রয়ার সফলভাবে খোলা হয়েছে! বিল গ্রহণ এখন সক্রিয়।'
          : 'Cash drawer opened successfully! Billing is now active.'
      );
      setShowOpenDrawerModal(false);
      loadData();
    } catch (err: any) {
      toast.error(
        isBn
          ? `ক্যাশ ড্রয়ার খুলতে ব্যর্থ: ${err.message || 'ব্যর্থ হয়েছে'}`
          : `Failed to open cash drawer: ${err.message || 'Operation failed'}`
      );
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
      toast.success(isBn ? 'ক্যাশ ড্রয়ার বন্ধ সম্পন্ন! বিল গ্রহণ লক করা হয়েছে।' : 'Cash drawer closed successfully. Billing is locked.');
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
                {isBn
                  ? `ক্যাশ ড্রয়ার: ${activeDrawer?.isOpen ? 'সক্রিয় ও খোলা' : 'বন্ধ - বিল গ্রহণ লক্ড'}`
                  : `Cash Drawer: ${activeDrawer?.isOpen ? 'Active & Open' : 'Closed - Billing Locked'}`}
              </span>
              <Badge variant={activeDrawer?.isOpen ? 'success' : 'destructive'} className="ml-1">
                {activeDrawer?.isOpen ? (isBn ? 'ড্রয়ার খোলা' : 'Active') : (isBn ? 'লকড' : 'Locked')}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeDrawer?.isOpen ? (
                <span>
                  {isBn ? 'ওপেনিং ক্যাশ: ' : 'Opening Cash: '}
                  <strong className="text-foreground">৳{((activeDrawer.drawer.openingCashPaisa || 0) / 100).toFixed(0)}</strong> ·{' '}
                  {isBn ? 'ড্রয়ার ক্যাশ সংগ্রহ: ' : 'Drawer Cash Collected: '}
                  <strong className="text-foreground">৳{((activeDrawer.cashCollectedPaisa || 0) / 100).toFixed(0)}</strong>
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {isBn
                    ? 'ক্যাশ ড্রয়ার বন্ধ রয়েছে। বিল গ্রহণ বা ফি সংগ্রহের পূর্বে অবশ্যই ক্যাশ ড্রয়ার খুলতে হবে।'
                    : 'Cash drawer is currently closed. You must open the cash drawer before collecting fees or bills.'}
                </span>
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
                {isBn ? '🔒 ক্যাশ ড্রয়ার বন্ধ করুন' : '🔒 Close Cash Drawer'}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowOpenDrawerModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap cursor-pointer shadow-sm animate-pulse"
              >
                {isBn ? '🔓 ক্যাশ ড্রয়ার খুলুন' : '🔓 Open Cash Drawer'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prominent Red Alert when Drawer is Closed */}
      {!activeDrawer?.isOpen && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <Lock className="size-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-bold text-sm sm:text-base">
                {isBn
                  ? 'সতর্কবার্তা: ক্যাশ ড্রয়ার বন্ধ থাকায় বিলিং লক করা আছে'
                  : 'Warning: Billing is locked because cash drawer is closed'}
              </p>
              <p className="text-xs opacity-90">
                {isBn
                  ? 'ড্রয়ার না খোলা পর্যন্ত ক্যাশিয়ার কোনো প্রকার কনসালটেশন ফি বা থেরাপি বিল গ্রহণ করতে পারবেন না। কাজ শুরু করতে ড্রয়ার ওপেন করুন।'
                  : 'The cashier cannot collect consultation fees or therapy bills until the drawer is opened. Please open drawer to begin.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowOpenDrawerModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold whitespace-nowrap cursor-pointer shadow-xs self-start sm:self-auto"
          >
            {isBn ? '🔓 ড্রয়ার খুলুন' : '🔓 Open Cash Drawer'}
          </Button>
        </div>
      )}

      {/* ============================================================== */}
      {/* ⚡ FORWARDED FROM THERAPY HALL: LOCKED FIXED BILLS */}
      {/* ============================================================== */}
      <Card className="border-2 border-indigo-500/40 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-1.5">
                  <span>{isBn ? '⚡ থেরাপি হল থেকে প্রেরিত বিলসমূহ' : '⚡ Bills Forwarded from Therapy Hall'}</span>
                </CardTitle>
                <Badge className="bg-indigo-600 text-white font-mono text-xs">
                  {isBn ? `${pendingTherapyBills.length} টি অপেক্ষমাণ` : `${pendingTherapyBills.length} Pending`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isBn
                  ? 'থেরাপি হল হ্যান্ডলার কর্তৃক নির্ধারিত ফিক্সড বিল গ্রহণ করুন এবং রোগীকে রিসেপশনে চেক-আউটের জন্য পাঠান'
                  : 'Collect fixed bills determined by the therapy hall handler and forward the patient to reception for checkout'}
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
            {isBn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        </CardHeader>

        <CardContent>
          {pendingTherapyBills.length === 0 ? (
            <div className="p-5 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground text-xs space-y-1">
              <CheckCircle2 className="size-6 mx-auto opacity-40 text-indigo-500" />
              <p className="font-medium">{isBn ? 'বর্তমানে থেরাপি হল থেকে অপেক্ষমাণ কোনো বিল নেই' : 'No pending bills from Therapy Hall currently'}</p>
              <p className="text-[11px] text-muted-foreground/80">
                {isBn
                  ? 'হ্যান্ডলার থেরাপি হলের রোগীকে ক্যাশিয়ারে পাঠালে তা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।'
                  : 'When the handler sends a patient to the cashier, it will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {pendingTherapyBills.map((rawBill) => {
                const bill = normalizePendingTherapyBill(rawBill);
                return (
                  <div
                    key={bill.id}
                    className="p-4 rounded-xl border border-indigo-500/30 bg-card/90 hover:bg-card shadow-xs transition-all space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                          <Clock className="size-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm sm:text-base text-foreground">
                            {bill.patientName} {bill.patientNameBn ? `(${bill.patientNameBn})` : ''}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            MRN: {bill.mrn} {bill.phone ? `• ${bill.phone}` : ''}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-indigo-500/50 text-indigo-600 dark:text-indigo-400 text-[10px] shrink-0 font-semibold flex items-center gap-1">
                        <span>{isBn ? '🔒 ফিক্সড ফি' : '🔒 Fixed Fee'}</span>
                      </Badge>
                    </div>

                    {/* Modality & Locked Fixed Fee */}
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-indigo-950 dark:text-indigo-200">
                        <span className="flex items-center gap-1.5 truncate">
                          <Activity className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="truncate">{bill.modalityName || bill.modalityCode}</span>
                        </span>
                        <div className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-sm bg-indigo-500/20 px-2 py-0.5 rounded-md">
                          <span>🔒 ৳{bill.feeTaka}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{isBn ? 'হ্যান্ডলার কর্তৃক নির্ধারিত' : 'Assigned by Handler'}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[10px]">
                          {isBn ? '✓ পরিবর্তন নিষিদ্ধ' : '✓ Locked'}
                        </span>
                      </div>
                    </div>

                    {bill.notes && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 italic bg-muted/40 px-2 py-1 rounded">
                        {isBn ? 'নোট: ' : 'Note: '}{bill.notes}
                      </p>
                    )}

                    {/* Action Button: Collect Fixed Bill */}
                    <div className="pt-2 border-t border-border/50 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openTherapyPaymentModal(bill)}
                        disabled={!activeDrawer?.isOpen}
                        className={cn(
                          "w-full h-8 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer",
                          activeDrawer?.isOpen
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                        )}
                      >
                        {activeDrawer?.isOpen ? (
                          <>
                            <CreditCard className="size-3.5" />
                            <span>{isBn ? 'বিল গ্রহণ করুন' : 'Collect Fixed Bill'}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="size-3.5 text-red-500" />
                            <span>{isBn ? 'ক্যাশ ড্রয়ার বন্ধ' : 'Cash Drawer Closed'}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* FORWARDED FROM DOCTOR CHAMBER: CONSULTATION REFUNDS & ADJUSTMENTS */}
      {/* ============================================================== */}
      <Card className="border-2 border-cyan-500/40 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-transparent shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
              <Receipt className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {isBn ? 'ডাক্তার চেম্বার থেকে আগত অনুরোধ' : 'Doctor Chamber Adjustments'}
                </CardTitle>
                <Badge
                  className={`font-mono text-xs ${
                    pendingDoctorAdjustments.length > 0
                      ? 'bg-cyan-600 text-white animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {pendingDoctorAdjustments.length} টি অনুরোধ অপেক্ষমাণ
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ডাক্তার চেম্বার থেকে প্রেরিত রিফান্ড অথবা অতিরিক্ত ফি আদায় সম্পন্ন করে ইনভয়েস প্রিন্ট দিন ও রোগীকে রিসেপশনে পাঠান
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
          {pendingDoctorAdjustments.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground text-xs space-y-1">
              <Receipt className="size-6 mx-auto opacity-40 text-cyan-500" />
              <p className="font-medium">বর্তমানে ডাক্তার চেম্বার থেকে অপেক্ষমাণ কোনো রিফান্ড বা ফি অনুরোধ নেই</p>
              <p className="text-[11px] text-muted-foreground/80">
                ডাক্তার যখন কোনো রোগীর কনসালটেশন ফি রিফান্ড বা ফি আদায়ের অনুরোধ করবেন, তা এখানে রিয়েলটাইমে দৃশ্যমান হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {pendingDoctorAdjustments.map((adj) => {
                const isRefund = adj.consultationAdjustmentType === 'refund';
                const amountTaka = Math.round((adj.consultationAdjustmentAmountPaisa || 0) / 100);
                const prevPaidTaka = Math.round((adj.consultationFeePaidPaisa || 0) / 100);
                const p = adj.patient || {};
                const docName = adj.doctor?.fullName || 'ডাক্তার';

                return (
                  <div
                    key={adj.id}
                    className={`p-4 rounded-xl border shadow-xs transition-all space-y-3 bg-card/90 hover:bg-card ${
                      isRefund
                        ? 'border-amber-500/40 hover:border-amber-500'
                        : 'border-cyan-500/40 hover:border-cyan-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground text-sm">
                            {p.nameEn || 'Patient'}
                          </span>
                          {p.nameBn && (
                            <span className="text-xs text-muted-foreground font-medium">
                              ({p.nameBn})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-0.5">
                          <span>MRN: <strong className="text-foreground">{p.mrn || 'N/A'}</strong></span>
                          <span>·</span>
                          <span>ফোন: <strong className="text-foreground">{p.phone || 'N/A'}</strong></span>
                        </div>
                      </div>

                      <Badge
                        className={`text-[10px] font-bold ${
                          isRefund
                            ? 'bg-amber-600 hover:bg-amber-600 text-white'
                            : 'bg-cyan-600 hover:bg-cyan-600 text-white'
                        }`}
                      >
                        {isRefund ? 'রিফান্ড অনুরোধ' : 'ফি আদায় অনুরোধ'}
                      </Badge>
                    </div>

                    {/* Amount & Doctor Info Box */}
                    <div className="p-2.5 rounded-lg border border-border/80 bg-muted/40 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">অনুরোধের পরিমাণ:</span>
                        <span className={`font-mono font-bold text-sm ${isRefund ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isRefund ? `- ৳${amountTaka}` : `+ ৳${amountTaka}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>ডাক্তার: {docName}</span>
                        <span>পূর্বে পরিশোধিত: ৳{prevPaidTaka}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    {adj.consultationAdjustmentReason && (
                      <div className="text-xs text-muted-foreground border-t border-border/50 pt-2 space-y-0.5">
                        <p>
                          <strong className="text-foreground">ডাক্তারের কারণ:</strong> {adj.consultationAdjustmentReason}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedAdjustmentForProcessing(adj);
                          handleProcessAdjustment('rejected');
                        }}
                        disabled={processingAdjustment}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        বাতিল
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenAdjustmentModal(adj)}
                        disabled={!activeDrawer?.isOpen || processingAdjustment}
                        className={cn(
                          "h-8 px-3 text-xs font-semibold gap-1.5 flex-1 shadow-xs cursor-pointer text-white",
                          isRefund
                            ? "bg-amber-600 hover:bg-amber-500"
                            : "bg-cyan-600 hover:bg-cyan-500",
                          !activeDrawer?.isOpen && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {activeDrawer?.isOpen ? (
                          isRefund ? (
                            <>
                              <ArrowDownLeft className="size-3.5" />
                              <span>রিফান্ড করুন (৳{amountTaka})</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="size-3.5" />
                              <span>ফি গ্রহণ করুন (৳{amountTaka})</span>
                            </>
                          )
                        ) : (
                          <>
                            <Lock className="size-3.5 text-red-500" />
                            <span>ড্রয়ার বন্ধ</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  {isBn ? 'রিসেপশন থেকে আগত রোগী' : 'Patients Forwarded from Reception'}
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
                        title={isBn ? "ইনটেক ফরম প্রিন্ট" : "Print Intake Form (A4)"}
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
                        disabled={!activeDrawer?.isOpen}
                        className={cn(
                          "h-8 px-3 text-xs font-semibold gap-1.5 flex-1 shadow-xs cursor-pointer",
                          activeDrawer?.isOpen
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                        )}
                      >
                        {activeDrawer?.isOpen ? (
                          <>
                            <CreditCard className="size-3.5" />
                            <span>ফি গ্রহণ ও কিউ</span>
                          </>
                        ) : (
                          <>
                            <Lock className="size-3.5 text-red-500" />
                            <span>ড্রয়ার বন্ধ</span>
                          </>
                        )}
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
                      <span>{isBn ? '+ প্যাকেজ' : '+ Package'}</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleCreateBill} className="flex flex-col gap-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
                    {/* Patient Selection using shadcn/ui */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">{isBn ? 'রোগী নির্বাচন করুন *' : 'Select Patient *'}</Label>
                      <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={isBn ? '-- রোগী নির্বাচন করুন --' : '-- Select Patient --'} />
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
                          {isBn ? 'প্যাকেজের মেয়াদে কনসালটেশন ও থেরাপি অন্তর্ভুক্ত থাকে' : 'Consultation & Therapy included during package length'}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPackageModal(true)}
                        className="h-7 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 px-2.5 self-start sm:self-auto cursor-pointer"
                      >
                        {isBn ? '📦 প্যাকেজ কনফিগার করুন' : '📦 Configure Package'}
                      </Button>
                    </div>

                    {/* Bill Line Items Table */}
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-2.5">{isBn ? 'বিবরণ' : 'Item Description'}</th>
                            <th className="p-2.5 w-24">{isBn ? 'দর (৳)' : 'Rate (BDT)'}</th>
                            <th className="p-2.5 w-16">{isBn ? 'পরিমাণ' : 'Qty'}</th>
                            <th className="p-2.5">{isBn ? 'মোট' : 'Total'}</th>
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
                                  onClick={() => handleRemoveItem(idx)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                >
                                  ✕
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Calculations */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-muted-foreground">{isBn ? 'সাবটোটাল:' : 'Subtotal:'}</span>
                        <span className="font-semibold text-foreground">৳{subtotalTaka}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs sm:text-sm text-muted-foreground">{isBn ? 'ছাড় (৳):' : 'Discount (BDT):'}</span>
                        <Input
                          type="number"
                          min="0"
                          value={discountTaka}
                          onChange={(e) => {
                            const d = parseInt(e.target.value) || 0;
                            setDiscountTaka(d);
                            setPaidTaka(Math.max(0, subtotalTaka - d));
                          }}
                          className="h-8 w-28 text-right text-xs"
                        />
                      </div>
                      <div className="flex justify-between items-center text-sm sm:text-base font-bold border-t border-border pt-2">
                        <span>{isBn ? 'মোট প্রদেয়:' : 'Total Payable:'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400">৳{totalTaka}</span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs sm:text-sm text-muted-foreground">{isBn ? 'পরিশোধিত টাকা (৳):' : 'Amount Paid (BDT):'}</span>
                        <Input
                          type="number"
                          min="0"
                          value={paidTaka}
                          onChange={(e) => setPaidTaka(parseInt(e.target.value) || 0)}
                          className="h-8 w-28 text-right text-xs font-bold"
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-red-500">
                        <span>{isBn ? 'বাকি টাকা:' : 'Due Amount:'}</span>
                        <span>৳{dueTaka}</span>
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">{isBn ? 'পেমেন্ট মেথড *' : 'Payment Method *'}</Label>
                        <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={isBn ? 'পেমেন্ট মেথড' : 'Payment Method'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{isBn ? 'নগদ' : 'Cash'}</SelectItem>
                            <SelectItem value="bkash">{isBn ? 'বিকাশ' : 'bKash'}</SelectItem>
                            <SelectItem value="nagad">{isBn ? 'নগদ' : 'Nagad'}</SelectItem>
                            <SelectItem value="rocket">{isBn ? 'রকেট' : 'Rocket'}</SelectItem>
                            <SelectItem value="card">{isBn ? 'কার্ড / পিওএস' : 'Card / POS'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {paymentMethod !== 'cash' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Transaction / Slip ID *
                          </Label>
                          <Input
                            type="text"
                            placeholder="e.g. TRX-123456"
                            value={txnId}
                            onChange={(e) => setTxnId(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {/* Bill Generation Button */}
                    <Button
                      type="submit"
                      disabled={loading || billItems.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-xs cursor-pointer gap-2"
                    >
                      <CreditCard className="size-4" />
                      Generate Bill &amp; Print Custom Size Receipt
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Invoice Ledger */}
            <div
              className={cn(
                'flex flex-col gap-6 lg:col-span-5 xl:col-span-5',
                mobileTab === 'billing' && 'hidden lg:flex'
              )}
            >
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <FileText className="size-5 text-emerald-600" />
                    <span>Recent Invoices &amp; Ledger</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadData}
                    disabled={loading}
                    className="h-8 px-2 text-xs cursor-pointer"
                  >
                    <Clock className={cn('size-3.5 mr-1', loading && 'animate-spin')} />
                    Sync
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3">
                  {bills.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                      No invoices recorded today.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                      {bills.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/30 transition-all flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground">
                                {b.billNumber}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0 uppercase font-bold',
                                  b.status === 'posted'
                                    ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                                    : 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                                )}
                              >
                                {b.status}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground truncate">
                              {b.patient?.nameEn || 'Patient'} · MRN: {b.patient?.mrn || 'N/A'}
                            </div>
                            <div className="text-[10px] text-muted-foreground/70">
                              Method: <strong className="uppercase">{b.paymentMethod || 'cash'}</strong> · {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <div className="font-mono font-bold text-sm text-foreground">
                              ৳{((b.totalPaisa || 0) / 100).toFixed(0)}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleReprintBill(b)}
                              className="h-7 px-2 text-[11px] gap-1 cursor-pointer border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                            >
                              <Printer className="size-3 text-emerald-600" />
                              <span>Print</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Package Selection Modal */}
      <Dialog open={showPackageModal} onOpenChange={setShowPackageModal}>
        <DialogContent className="max-w-xl p-5 bg-background border-emerald-500/30" onClose={() => setShowPackageModal(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="size-4" />
              <span>{isBn ? 'প্যাকেজ বিলিং কনফিগারেশন' : 'Therapy Packages Configuration'}</span>
            </div>
            <DialogTitle className="text-lg font-bold">
              {isBn ? 'প্যাকেজ নির্বাচন ও কনফিগারেশন' : 'Package Selection & Configuration'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isBn
                ? 'সেশন ভিত্তিক বা দিন ভিত্তিক প্যাকেজ নির্বাচন করুন। প্যাকেজ চলাকালীন সব কনসালটেশন ও থেরাপি অন্তর্ভুক্ত থাকবে।'
                : 'Select per-session or per-day packages. All consultations and therapies are covered during package duration.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Package Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setPackageType('per_session');
                  const preset = SESSION_PRESETS[1];
                  setPackageTitle(preset.name);
                  setPackageCount(preset.count);
                  setPackagePriceTaka(preset.priceTaka);
                  setPackageValidityDays(preset.validityDays);
                }}
                className={cn(
                  'py-2 px-3 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer',
                  packageType === 'per_session'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isBn ? '🔢 সেশন ভিত্তিক' : '🔢 Per Session'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPackageType('per_day');
                  const preset = DAY_PRESETS[1];
                  setPackageTitle(preset.name);
                  setPackageCount(preset.count);
                  setPackagePriceTaka(preset.priceTaka);
                  setPackageValidityDays(preset.validityDays);
                }}
                className={cn(
                  'py-2 px-3 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer',
                  packageType === 'per_day'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isBn ? '📅 দিন ভিত্তিক' : '📅 Per Day'}
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{isBn ? 'জনপ্রিয় প্যাকেজসমূহ:' : 'Select a Preset:'}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(packageType === 'per_session' ? SESSION_PRESETS : DAY_PRESETS).map((preset) => {
                  const isSelected = packageTitle === preset.name && packageCount === preset.count;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setPackageTitle(preset.name);
                        setPackageCount(preset.count);
                        setPackagePriceTaka(preset.priceTaka);
                        setPackageValidityDays(preset.validityDays);
                      }}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100'
                          : 'border-border/60 hover:border-emerald-500/40 bg-card'
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-xs leading-snug">{preset.name}</span>
                        {(preset.tagBn || preset.tagEn) && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 shrink-0">
                            {isBn ? preset.tagBn : preset.tagEn}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 font-mono">
                        <span className="text-muted-foreground">
                          {preset.count} {packageType === 'per_session' ? (isBn ? 'সেশন' : 'Sessions') : (isBn ? 'দিন' : 'Days')}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ৳{preset.priceTaka}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Configuration Details */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{isBn ? 'প্যাকেজের নাম' : 'Package Name'}</Label>
                <Input
                  type="text"
                  value={packageTitle}
                  onChange={(e) => setPackageTitle(e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {packageType === 'per_session' ? (isBn ? 'সেশন সংখ্যা' : 'Session Count') : (isBn ? 'দিন সংখ্যা' : 'Day Count')}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={packageCount}
                    onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {packageType === 'per_session' ? (isBn ? 'মোট থেরাপি সেশন' : 'Total Therapy Sessions') : (isBn ? 'ক্লিনিক ভিজিট দিন' : 'Clinic Visit Days')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isBn ? 'প্যাকেজ মূল্য (৳)' : 'Package Price (BDT)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={packagePriceTaka}
                    onChange={(e) => setPackagePriceTaka(parseInt(e.target.value) || 0)}
                    className="h-8 text-xs font-mono font-bold text-emerald-600"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {isBn ? 'মোট প্রদেয় ফি (৳)' : 'Total Fee (BDT)'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{isBn ? 'কার্যকর মেয়াদ (দিন)' : 'Validity (Days)'}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={packageValidityDays}
                    onChange={(e) => setPackageValidityDays(parseInt(e.target.value) || 30)}
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">{isBn ? 'প্যাকেজ মেয়াদের দিন' : 'Validity in days'}</p>
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
                  {packageCount} {packageType === 'per_session' ? (isBn ? 'সেশন' : 'Sessions') : (isBn ? 'ভিজিট দিন' : 'Visit Days')} • {isBn ? 'মেয়াদ: ' : 'Validity: '}{packageValidityDays} {isBn ? 'দিন' : 'days'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ৳{packagePriceTaka}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  ≈ ৳{Math.round(packagePriceTaka / (packageCount || 1))} / {packageType === 'per_session' ? (isBn ? 'সেশন' : 'session') : (isBn ? 'দিন' : 'day')}
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
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddPackageToBill}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              {isBn ? `বিলে যুক্ত করুন (৳${packagePriceTaka})` : `Add to Bill (BDT ${packagePriceTaka})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Drawer Dialog */}
      <Dialog open={showOpenDrawerModal} onOpenChange={setShowOpenDrawerModal}>
        <DialogContent className="max-w-md" onClose={() => setShowOpenDrawerModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{isBn ? 'ক্যাশ ড্রয়ার ওপেন ফ্লোট' : 'Open Cash Drawer Float'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isBn ? 'এই শিফটের জন্য ড্রয়ার খোলার প্রারম্ভিক ক্যাশ ফ্লোট প্রবেশ করান।' : 'Enter the starting cash float for this shift to open the drawer.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenDrawer} className="flex flex-col gap-4 mt-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <div className="space-y-1.5">
              <Label htmlFor="opening-cash" className="text-xs font-semibold">
                {isBn ? 'ওপেনিং ক্যাশ ফ্লোট (৳) *' : 'Opening Cash Float (BDT) *'}
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
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                {isBn ? 'ওপেন ফ্লোট নিশ্চিত করুন' : 'Confirm Open Float'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={showCloseDrawerModal} onOpenChange={setShowCloseDrawerModal}>
        <DialogContent className="max-w-md" onClose={() => setShowCloseDrawerModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{isBn ? 'শিফট সমাপ্ত ও ড্রয়ার সমন্বয়' : 'Close Shift & Reconcile Drawer'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isBn ? 'শিফট বন্ধ করার জন্য ড্রয়ারে থাকা বাস্তব নগদ টাকা গণনা করে প্রবেশ করান।' : 'Enter the physical cash count in drawer to reconcile and close the shift.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseDrawer} className="flex flex-col gap-4 mt-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <div className="space-y-1.5">
              <Label htmlFor="closing-cash" className="text-xs font-semibold">
                {isBn ? 'ড্রয়ারে নগদ ক্যাশ গণনা (৳) *' : 'Physical Cash Count in Drawer (BDT) *'}
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

      {/* ============================================================== */}
      {/* THERAPY HALL FIXED BILL PAYMENT DIALOG */}
      {/* ============================================================== */}
      {selectedTherapyBillForPayment && (
        <Dialog
          open={!!selectedTherapyBillForPayment}
          onOpenChange={(open) => {
            if (!open) setSelectedTherapyBillForPayment(null);
          }}
        >
          <DialogContent className="max-w-md p-5 bg-background border-indigo-500/30" onClose={() => setSelectedTherapyBillForPayment(null)}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Activity className="size-4" />
                <span>থেরাপি বিল সংগ্রহ ও রিসেপশনে প্রেরণ</span>
              </div>
              <DialogTitle className="text-lg font-bold">
                {selectedTherapyBillForPayment.patientName}
                {selectedTherapyBillForPayment.patientNameBn ? ` (${selectedTherapyBillForPayment.patientNameBn})` : ''}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                MRN: {selectedTherapyBillForPayment.mrn} • মডালিটি: {selectedTherapyBillForPayment.modalityName || selectedTherapyBillForPayment.modalityCode}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Patient Info Card */}
              <div className="p-3 rounded-xl border border-border/60 bg-muted/30 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">{isBn ? 'ফোন:' : 'Phone:'}</span>{' '}
                  <span className="font-semibold text-foreground">{selectedTherapyBillForPayment.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{isBn ? 'লিঙ্গ ও বয়স:' : 'Gender & Age:'}</span>{' '}
                  <span className="font-semibold text-foreground">
                    {selectedTherapyBillForPayment.gender === 'female' ? (isBn ? 'মহিলা' : 'Female') : (isBn ? 'পুরুষ' : 'Male')}
                    {selectedTherapyBillForPayment.ageYears ? ` • ${selectedTherapyBillForPayment.ageYears} ${isBn ? 'বছর' : 'Y'}` : ''}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">{isBn ? 'থেরাপি সেবা:' : 'Therapy Service:'}</span>{' '}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTherapyBillForPayment.modalityName}</span>
                </div>
              </div>

              {/* STRICTLY LOCKED READ-ONLY FIXED FEE INPUT */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    নির্ধারিত থেরাপি সেবা ফি (Therapy Fee ৳) *
                  </Label>
                  <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold gap-1">
                    <ShieldCheck className="size-3 text-amber-600" />
                    <span>Locked</span>
                  </Badge>
                </div>
                <Input
                  value={`৳${selectedTherapyBillForPayment.feeTaka}`}
                  disabled
                  readOnly
                  className="bg-muted font-bold text-foreground cursor-not-allowed text-lg font-mono h-10"
                />
              </div>

              {/* Previous Due Detection & Combination */}
              {(() => {
                const pDues = dues.filter((d: any) => d.patientId === selectedTherapyBillForPayment.patientId && d.status !== 'settled');
                const pDueTaka = pDues.reduce(
                  (sum: number, d: any) =>
                    sum +
                    (d.amountPaisa != null
                      ? Math.max(0, (d.amountPaisa - (d.settledPaisa || 0)) / 100)
                      : Number(d.dueTaka || (d.duePaisa ? d.duePaisa / 100 : 0))),
                  0
                );
                if (pDueTaka <= 0) return null;
                return (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="size-3.5 text-amber-600" />
                        <span>পূর্ববর্তী বকেয়া: ৳{pDueTaka}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">পূর্বের অপরিশোধিত ভিজিট/থেরাপির বকেয়া</p>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={includePreviousDue}
                        onChange={(e) => setIncludePreviousDue(e.target.checked)}
                        className="size-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>ইনভয়েসে যোগ করুন</span>
                    </label>
                  </div>
                );
              })()}

              {/* Payment Mode Selector (Full, Partial, Due) */}
              {(() => {
                const pDues = dues.filter((d: any) => d.patientId === selectedTherapyBillForPayment.patientId && d.status !== 'settled');
                const pDueTaka = pDues.reduce(
                  (sum: number, d: any) =>
                    sum +
                    (d.amountPaisa != null
                      ? Math.max(0, (d.amountPaisa - (d.settledPaisa || 0)) / 100)
                      : Number(d.dueTaka || (d.duePaisa ? d.duePaisa / 100 : 0))),
                  0
                );
                const totalPayable = Number(selectedTherapyBillForPayment.feeTaka || 0) + (includePreviousDue && pDueTaka > 0 ? pDueTaka : 0);
                const currentPaid = therapyPaymentMode === 'full' ? totalPayable : therapyPaymentMode === 'partial' ? (Number(therapyPartialPaidTaka) || 0) : 0;
                const currentDue = Math.max(0, totalPayable - currentPaid);

                return (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">{isBn ? 'পেমেন্ট প্রকার *' : 'Payment Type *'}</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={therapyPaymentMode === 'full' ? 'default' : 'outline'}
                          onClick={() => {
                            setTherapyPaymentMode('full');
                            setTherapyPartialPaidTaka(totalPayable);
                          }}
                          className={cn("h-8 text-xs font-bold", therapyPaymentMode === 'full' && "bg-emerald-600 hover:bg-emerald-500 text-white")}
                        >
                          {isBn ? 'সম্পূর্ণ পরিশোধ' : 'Full Payment'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={therapyPaymentMode === 'partial' ? 'default' : 'outline'}
                          onClick={() => {
                            setTherapyPaymentMode('partial');
                            setTherapyPartialPaidTaka(Math.round(totalPayable / 2));
                          }}
                          className={cn("h-8 text-xs font-bold", therapyPaymentMode === 'partial' && "bg-amber-600 hover:bg-amber-500 text-white")}
                        >
                          {isBn ? 'আংশিক পরিশোধ' : 'Partial Payment'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={therapyPaymentMode === 'due' ? 'default' : 'outline'}
                          onClick={() => {
                            setTherapyPaymentMode('due');
                            setTherapyPartialPaidTaka(0);
                          }}
                          className={cn("h-8 text-xs font-bold", therapyPaymentMode === 'due' && "bg-rose-600 hover:bg-rose-500 text-white")}
                        >
                          {isBn ? 'সম্পূর্ণ বাকি' : 'Full Due'}
                        </Button>
                      </div>
                    </div>

                    {/* Partial Amount Input */}
                    {therapyPaymentMode === 'partial' && (
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-foreground">{isBn ? 'পরিশোধিত অর্থ (৳) *' : 'Amount Paid (BDT) *'}</Label>
                          <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                            {isBn ? `বকেয়া থাকবে: ৳${currentDue}` : `Remaining Due: BDT ${currentDue}`}
                          </span>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={totalPayable}
                          value={therapyPartialPaidTaka}
                          onChange={(e) => setTherapyPartialPaidTaka(Number(e.target.value) || 0)}
                          className="h-9 font-mono font-bold text-sm bg-background"
                        />
                      </div>
                    )}

                    {/* Total Summary Strip */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between font-mono text-xs">
                      <div>
                        <span className="text-muted-foreground text-[11px]">{isBn ? 'মোট বিল:' : 'Total Bill:'}</span>{' '}
                        <strong className="text-foreground text-sm">৳{totalPayable}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px]">{isBn ? 'পরিশোধ:' : 'Paid:'}</span>{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">৳{currentPaid}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px]">{isBn ? 'বকেয়া:' : 'Due:'}</span>{' '}
                        <strong className="text-rose-600 dark:text-rose-400">৳{currentDue}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{isBn ? 'পেমেন্ট মেথড *' : 'Payment Method *'}</Label>
                <Select
                  value={therapyPaymentMethod}
                  onValueChange={(val: any) => setTherapyPaymentMethod(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isBn ? '-- পেমেন্ট মেথড নির্বাচন করুন --' : '-- Select Payment Method --'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{isBn ? 'নগদ' : 'Cash'}</SelectItem>
                    <SelectItem value="bkash">{isBn ? 'বিকাশ' : 'bKash'}</SelectItem>
                    <SelectItem value="nagad">{isBn ? 'নগদ' : 'Nagad'}</SelectItem>
                    <SelectItem value="rocket">{isBn ? 'রকেট' : 'Rocket'}</SelectItem>
                    <SelectItem value="card">{isBn ? 'পিওএস কার্ড' : 'POS Card'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Txn ID Input if non-cash */}
              {therapyPaymentMethod !== 'cash' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    ট্রানজ্যাকশন আইডি (Transaction ID / Card Ref)
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. TRX-889123"
                    value={therapyTxnId}
                    onChange={(e) => setTherapyTxnId(e.target.value)}
                    className="h-9 font-mono text-xs"
                  />
                </div>
              )}

              {/* Information Note */}
              <div className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-muted-foreground text-[11px] leading-relaxed flex items-start gap-2">
                <Sparkles className="size-4 shrink-0 text-indigo-600 mt-0.5" />
                <span>
                  {isBn ? 'ফি গ্রহণ নিশ্চিত করামাত্র রোগীকে স্বয়ংক্রিয়ভাবে রিসেপশনে চেক-আউট ও ডিসচার্জের জন্য পাঠানো হবে এবং সাথে সাথে এইচপিসি সাইজ ইনভয়েস প্রিন্ট হবে।' : 'Upon confirming payment, patient will be routed to reception for checkout and HPC size invoice will print automatically.'}
                </span>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTherapyBillForPayment(null)}
                disabled={collectingTherapyBill}
                className="flex-1 text-xs cursor-pointer"
              >
                বাতিল
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCollectTherapyBill}
                disabled={collectingTherapyBill || !activeDrawer?.isOpen}
                className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
              >
                {collectingTherapyBill ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> {isBn ? 'প্রক্রিয়াধীন...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-3.5" /> {isBn ? 'ফি গ্রহণ ও রিসেপশনে পাঠান' : 'Collect & Forward to Reception'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                <span>{isBn ? 'পরামর্শ ফি গ্রহণ ও সিরিয়াল অন্তর্ভুক্তি' : 'Consultation Fee Collection & Queue Admission'}</span>
              </div>
              <DialogTitle className="text-lg font-bold">
                {selectedIntakeForPayment.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isBn ? 'ফোন: ' : 'Phone: '}{selectedIntakeForPayment.phone} • {isBn ? 'ডাক্তার: ' : 'Doctor: '}{selectedIntakeForPayment.doctorName || (isBn ? 'নির্ধারিত ডাক্তার' : 'Assigned Doctor')}
                {selectedIntakeForPayment.chamberRoomNumber ? ` (${isBn ? 'রুম' : 'Room'} ${selectedIntakeForPayment.chamberRoomNumber})` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>{isBn ? 'ডাক্তার কনসালটেশন ফি (নির্দিষ্ট)' : 'Doctor Consultation Fee (Fixed)'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                    {isBn ? 'বকেয়া নিষিদ্ধ · সম্পূর্ণ পরিশোধ আবশ্যক' : 'No Dues Allowed · Full Payment Required'}
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">{isBn ? 'পেমেন্ট মেথড *' : 'Payment Method *'}</Label>
                <Select
                  value={consultationPaymentMethod}
                  onValueChange={(val: any) => setConsultationPaymentMethod(val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isBn ? '-- পেমেন্ট মেথড নির্বাচন করুন --' : '-- Select Payment Method --'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{isBn ? 'নগদ' : 'Cash'}</SelectItem>
                    <SelectItem value="bkash">{isBn ? 'বিকাশ' : 'bKash'}</SelectItem>
                    <SelectItem value="nagad">{isBn ? 'নগদ' : 'Nagad'}</SelectItem>
                    <SelectItem value="rocket">{isBn ? 'রকেট' : 'Rocket'}</SelectItem>
                    <SelectItem value="card">{isBn ? 'পিওএস কার্ড' : 'POS Card'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {consultationPaymentMethod !== 'cash' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {isBn ? 'ট্রানজ্যাকশন আইডি' : 'Transaction ID / POS Slip Ref'}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{isBn ? 'সিরিয়াল অগ্রাধিকার' : 'Priority'}</Label>
                  <Select
                    value={selectedIntakePriority}
                    onValueChange={(val: any) => setSelectedIntakePriority(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isBn ? 'অগ্রাধিকার' : 'Priority'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">{isBn ? 'সাধারণ' : 'Normal'}</SelectItem>
                      <SelectItem value="emergency">{isBn ? 'জরুরি' : 'Emergency'}</SelectItem>
                      <SelectItem value="vip">{isBn ? 'ভিআইপি / অগ্রাধিকার' : 'VIP'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">{isBn ? 'গন্তব্য কিউ' : 'Target Queue'}</Label>
                  <div className="h-9 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 truncate">
                      <Stethoscope className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{isBn ? 'ডাক্তার চেম্বার কিউ' : 'Doctor Chamber Queue'}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 shrink-0">
                      {isBn ? 'রুম' : 'Room'} {selectedIntakeForPayment.chamberRoomNumber || '—'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-muted-foreground text-[11px] leading-relaxed flex items-start gap-2">
                <Sparkles className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {isBn
                    ? (isBn ? 'ফি গ্রহণ নিশ্চিত করামাত্র রোগীকে স্বয়ংক্রিয়ভাবে ডাক্তার চেম্বার কনসালটেশন কিউতে পাঠানো হবে, ওয়েটিং রুম ও অ্যান্ড্রয়েড টিভিতে সিরিয়াল ভেসে উঠবে এবং সাথে সাথে এইচপিসি সাইজ ইনভয়েস প্রিন্ট হবে।' : 'Upon confirming fee receipt, patient will be queued for doctor consultation chamber, broadcast on waiting room TV, and HPC size invoice will print automatically.')
                    : 'Upon fee collection, the patient is automatically admitted to the doctor consultation queue, announced on Android TV, and an invoice preview is generated.'}
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
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAdmitToQueue}
                disabled={admittingToQueue || !activeDrawer?.isOpen}
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
              >
                {admittingToQueue ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> {isBn ? 'ফি আদায় হচ্ছে...' : 'Collecting fee...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-3.5" /> {isBn ? 'ফি গ্রহণ, কনসালটেশন কিউ ও ইনভয়েস' : 'Collect Fee, Queue & Invoice'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DOCTOR CHAMBER ADJUSTMENT PAYMENT / REFUND MODAL */}
      {selectedAdjustmentForProcessing && (
        <Dialog
          open={Boolean(selectedAdjustmentForProcessing)}
          onOpenChange={(open) => {
            if (!open) setSelectedAdjustmentForProcessing(null);
          }}
        >
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader className="pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                {selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund' ? (
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 border border-amber-500/30">
                    <ArrowDownLeft className="size-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-600 border border-cyan-500/30">
                    <ArrowUpRight className="size-5" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-base font-bold">
                    {selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund'
                      ? (isBn ? 'কনসালটেশন ফি রিফান্ড প্রদান' : 'Consultation Fee Refund')
                      : (isBn ? 'কনসালটেশন ফি সংগ্রহ ও ইনভয়েস' : 'Consultation Fee Collection & Invoice')}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {isBn ? 'রোগী: ' : 'Patient: '}{selectedAdjustmentForProcessing.patient?.nameEn || 'Patient'}{' '}
                    (MRN: {selectedAdjustmentForProcessing.patient?.mrn || 'N/A'})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              {/* Amount Display */}
              <div
                className={`p-3.5 rounded-xl border text-center space-y-1 ${
                  selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund'
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-cyan-500/40 bg-cyan-500/10'
                }`}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund'
                    ? (isBn ? 'রিফান্ডের পরিমাণ (ক্যাশ ফেরত)' : 'Refund Amount (Cash Return)')
                    : (isBn ? 'আদায়ের পরিমাণ' : 'Collection Amount')}
                </div>
                <div
                  className={`text-2xl font-black font-mono ${
                    selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-cyan-600 dark:text-cyan-400'
                  }`}
                >
                  ৳{Math.round((selectedAdjustmentForProcessing.consultationAdjustmentAmountPaisa || 0) / 100)}
                </div>
                {selectedAdjustmentForProcessing.consultationAdjustmentReason && (
                  <div className="text-xs text-muted-foreground pt-1 border-t border-border/40 mt-1">
                    {isBn ? 'কারণ: ' : 'Reason: '}{selectedAdjustmentForProcessing.consultationAdjustmentReason}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  {selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund'
                    ? (isBn ? 'রিফান্ড প্রদানের মাধ্যম *' : 'Refund Method *')
                    : (isBn ? 'পেমেন্ট মাধ্যম *' : 'Payment Method *')}
                </Label>
                <Select
                  value={adjustmentProcessingMethod}
                  onValueChange={(val: any) => setAdjustmentProcessingMethod(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{isBn ? 'নগদ ড্রয়ার' : 'Cash Drawer'}</SelectItem>
                    <SelectItem value="bkash">{isBn ? 'বিকাশ' : 'bKash'}</SelectItem>
                    <SelectItem value="nagad">{isBn ? 'নগদ' : 'Nagad'}</SelectItem>
                    <SelectItem value="rocket">{isBn ? 'রকেট' : 'Rocket'}</SelectItem>
                    <SelectItem value="card">{isBn ? 'কার্ড / পিওএস' : 'Card / POS'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {adjustmentProcessingMethod !== 'cash' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {isBn ? 'ট্রানজেকশন আইডি' : 'Transaction ID'}
                  </Label>
                  <Input
                    placeholder="e.g. 9J28DA10K"
                    value={adjustmentTxnId}
                    onChange={(e) => setAdjustmentTxnId(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}

              <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{isBn ? 'ক্যাশ ড্রয়ার স্ট্যাটাস:' : 'Cash Drawer Status:'}</span>
                <span className={`font-bold ${activeDrawer?.isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                  {activeDrawer?.isOpen ? (isBn ? '✓ ড্রয়ার উন্মুক্ত' : '✓ Drawer Open') : (isBn ? '✕ ড্রয়ার বন্ধ' : '✕ Drawer Closed')}
                </span>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedAdjustmentForProcessing(null)}
                disabled={processingAdjustment}
                className="flex-1 text-xs cursor-pointer"
              >
                বাতিল
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleProcessAdjustment('completed')}
                disabled={processingAdjustment || !activeDrawer?.isOpen}
                className={`flex-1 text-xs font-bold gap-1.5 shadow-xs text-white cursor-pointer ${
                  selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-cyan-600 hover:bg-cyan-500'
                }`}
              >
                {processingAdjustment ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> সম্পন্ন হচ্ছে...
                  </>
                ) : selectedAdjustmentForProcessing.consultationAdjustmentType === 'refund' ? (
                  <>
                    <ArrowDownLeft className="size-3.5" /> রিফান্ড দিন ও রিসিট প্রিন্ট
                  </>
                ) : (
                  <>
                    <CreditCard className="size-3.5" /> ফি গ্রহণ ও ইনভয়েস প্রিন্ট
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
