// apps/web/components/CashierView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api, UserSession, getSession } from '../lib/api';
import { useRealtime } from '../lib/use-realtime';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { PatientTimelineModal } from './patient/PatientTimelineModal';
import { TherapyQueueManagementTab } from './therapy/TherapyQueueManagementTab';
import {
  FileText,
  Clock,
  CheckCircle,
  CreditCard,
  UserCheck,
  Send,
  Stethoscope,
  HeartPulse,
  History,
  AlertCircle,
  Loader2,
  Eye,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react';

export interface CashierProps {
  session?: UserSession | null;
}

export default function CashierView({ session: propSession }: CashierProps = {}) {
  const session = propSession || getSession();
  const [mobileTab, setMobileTab] = useState<'billing' | 'ledger' | 'therapy_queue'>('billing');
  const [bills, setBills] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Reception Forwarded Intakes State
  const [forwardedIntakes, setForwardedIntakes] = useState<any[]>([]);
  const [selectedIntakeForDetail, setSelectedIntakeForDetail] = useState<any>(null);
  const [selectedIntakeForPayment, setSelectedIntakeForPayment] = useState<any>(null);
  const [feeTakaInput, setFeeTakaInput] = useState<number>(500);
  const [consultationPaymentMethod, setConsultationPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'card'>('cash');
  const [admittingToQueue, setAdmittingToQueue] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelinePatient, setTimelinePatient] = useState<{ id: string; name?: string } | null>(null);

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

  // Printed Receipt
  const [receiptData, setReceiptData] = useState<any>(null);

  const cashierStaffId = session?.staffId || '';

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, dList, pList, staffList, intakes] = await Promise.all([
        api.billing.getBills(),
        api.billing.getDues(),
        api.patients.list(),
        api.staff.list(),
        api.patients.listIntakeForms({ status: 'forwarded_to_cashier' }).catch(() => []),
      ]);
      setBills(bList || []);
      setDues(dList || []);
      setPatients(pList || []);
      setForwardedIntakes(intakes || []);

      if (pList && pList.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pList[0].id);
      }

      const cashier = staffList.find((s: any) => s.userId === session?.userId || s.role === 'cashier');
      const cid = cashier?.id || cashierStaffId;
      if (cid) {
        const dStatus = await api.billing.getDrawerStatus(cid);
        setActiveDrawer(dStatus);
      }
    } catch (err: any) {
      console.error(err);
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
      event.type.startsWith('intake.')
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
    setBillItems([...billItems, { itemType: type, description: desc, unitPriceTaka: price, quantity: 1 }]);
    setPaidTaka(totalTaka + price);
  };

  const handleRemoveItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('Select a patient');
      return;
    }
    try {
      const res = await api.billing.createBill({
        patientId: selectedPatientId,
        items: billItems.map((it) => ({
          itemType: it.itemType,
          description: it.description,
          unitPricePaisa: it.unitPriceTaka * 100,
          quantity: it.quantity,
          totalPaisa: it.unitPriceTaka * it.quantity * 100,
        })),
        discountPaisa: discountTaka * 100,
        paidPaisa: paidTaka * 100,
        paymentMethod,
        txnId: txnId || undefined,
      });

      const pat = patients.find((p) => p.id === selectedPatientId);

      setReceiptData({
        billNumber: res.billNumber || `BILL-${Date.now().toString().slice(-6)}`,
        patientName: pat?.nameEn || 'Patient',
        mrn: pat?.mrn || 'N/A',
        items: billItems,
        subtotalTaka,
        discountTaka,
        totalTaka,
        paidTaka,
        dueTaka,
        paymentMethod,
        createdAt: new Date().toISOString(),
      });

      alert(`Bill Created: ${res.billNumber}`);
      loadData();
    } catch (err: any) {
      alert(`Billing failed: ${err.message}`);
    }
  };

  const openPaymentModal = (intake: any) => {
    setSelectedIntakeForPayment(intake);
    setFeeTakaInput(intake.doctorFee || 500);
    setConsultationPaymentMethod('cash');
  };

  const handleAdmitToQueue = async () => {
    if (!selectedIntakeForPayment) return;
    try {
      setAdmittingToQueue(true);
      await api.patients.admitIntakeFormToQueue(selectedIntakeForPayment.id, {
        feeTaka: feeTakaInput,
        paymentMethod: consultationPaymentMethod,
      });
      toast.success('পেমেন্ট সফল! রোগীকে ডাক্তার কনসালটেশন কিউতে পাঠানো হয়েছে।');
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
      const staffList = await api.staff.list();
      const cashier = staffList.find((s: any) => s.userId === session?.userId || s.role === 'cashier');
      await api.billing.openDrawer({
        deskId: 'reception-1',
        openingCashPaisa: openingCashTaka * 100,
      });
      alert('Cash Drawer Opened for shift!');
      setShowOpenDrawerModal(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to open drawer: ${err.message}`);
    }
  };

  const handleCloseDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDrawer?.drawer?.id) return;
    try {
      const res = await api.billing.closeDrawer(activeDrawer.drawer.id, {
        closingCashActualPaisa: closingCashActualTaka * 100,
        varianceReason: closingReason || undefined,
      });
      alert(`Shift closed! Variance: ৳${((res.variancePaisa || 0) / 100).toFixed(2)}`);
      setShowCloseDrawerModal(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to close drawer: ${err.message}`);
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
                className="whitespace-nowrap border-red-500/30 text-red-600 hover:bg-red-500/10"
              >
                🔒 Close Drawer &amp; Reconcile Shift
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowOpenDrawerModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap"
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
                রিসেপশনিস্টের পূরণকৃত ফরম যাচাই করুন, ডাক্তার ফি গ্রহণ করুন এবং সরাসরি লাইভ কিউতে পাঠান
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs gap-1.5 self-start sm:self-auto"
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
              {forwardedIntakes.map((intake) => (
                <div
                  key={intake.id}
                  className="p-4 rounded-xl border border-emerald-500/30 bg-card/80 hover:bg-card shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm sm:text-base text-foreground">
                        {intake.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {intake.phone} • {intake.gender === 'male' ? 'পুরুষ' : 'মহিলা'}
                        {intake.ageYears ? ` • ${intake.ageYears} বছর` : ''}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 text-[10px]">
                      {intake.status === 'forwarded_to_cashier' ? 'ক্যাশিয়ার অপেক্ষমাণ' : intake.status}
                    </Badge>
                  </div>

                  {/* Doctor & Chamber */}
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                      <span>🩺 {intake.doctorName || 'ডাক্তার নির্ধারিত'}</span>
                      <span className="font-mono font-bold">৳{intake.doctorFee || 500}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {intake.chamberRoomNumber ? `চেম্বার: রুম ${intake.chamberRoomNumber}` : 'চেম্বার নির্ধারিত'}
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

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedIntakeForDetail(intake)}
                      className="h-8 px-2.5 text-xs gap-1 flex-1"
                    >
                      <Eye className="size-3.5" />
                      <span>ফরম</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTimelinePatient({ id: intake.patientId, name: intake.name });
                        setIsTimelineOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs gap-1"
                      title="টাইমলাইন"
                    >
                      <Clock className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openPaymentModal(intake)}
                      className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 flex-1 shadow-xs"
                    >
                      <CreditCard className="size-3.5" />
                      <span>ফি ও কিউ</span>
                    </Button>
                  </div>
                </div>
              ))}
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
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5',
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
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5',
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
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5',
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
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleAddItem('consultation', 'Doctor Consultation', 500)}
                >
                  + Consult
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleAddItem('therapy', 'Therapy Session (IFT/UST)', 300)}
                >
                  + Therapy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleAddItem('package', '10-Session Rehab Package', 3000)}
                >
                  + Package
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleCreateBill} className="flex flex-col gap-4">
                <Select
                  label="Select Patient *"
                  value={selectedPatientId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPatientId(e.target.value)}
                  required
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.mrn} · {p.nameEn} ({p.phone})
                    </option>
                  ))}
                </Select>

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
                              className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
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

                {/* Payment Recording */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="cash">Cash (নগদ)</option>
                    <option value="bkash">bKash (বিকাশ)</option>
                    <option value="nagad">Nagad (নগদ অ্যাপ)</option>
                    <option value="rocket">Rocket</option>
                    <option value="card">POS Card</option>
                  </Select>

                  <Input
                    label="Amount Paid (৳)"
                    type="number"
                    value={paidTaka}
                    onChange={(e) => setPaidTaka(parseInt(e.target.value) || 0)}
                  />
                </div>

                {paymentMethod !== 'cash' && (
                  <Input
                    label="MFS / Bank Transaction ID"
                    type="text"
                    placeholder="e.g. TRX992812"
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                  />
                )}

                {dueTaka > 0 && (
                  <div className="text-red-600 text-xs sm:text-sm font-semibold bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                    ⚠️ Remaining Due to be recorded: ৳{dueTaka}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-sm sm:text-base shadow-sm"
                >
                  🖨️ Settle Bill &amp; Print Thermal Receipt
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
                className="h-8 text-xs flex items-center gap-1"
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

      {/* Open Drawer Dialog */}
      <Dialog open={showOpenDrawerModal} onOpenChange={setShowOpenDrawerModal}>
        <DialogContent className="max-w-md" onClose={() => setShowOpenDrawerModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Open Cash Drawer Float</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOpenDrawer} className="flex flex-col gap-4 mt-2">
            <Input
              label="Opening Cash Float (৳)"
              type="number"
              value={openingCashTaka}
              onChange={(e) => setOpeningCashTaka(parseInt(e.target.value) || 0)}
              required
            />
            <div className="flex gap-3 mt-4 pt-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Confirm Open Float
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowOpenDrawerModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Drawer Dialog */}
      <Dialog open={showCloseDrawerModal} onOpenChange={setShowCloseDrawerModal}>
        <DialogContent className="max-w-md" onClose={() => setShowCloseDrawerModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Close Shift &amp; Reconcile Drawer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseDrawer} className="flex flex-col gap-4 mt-2">
            <Input
              label="Physical Cash Count in Drawer (৳)"
              type="number"
              value={closingCashActualTaka}
              onChange={(e) => setClosingCashActualTaka(parseInt(e.target.value) || 0)}
              required
            />
            <Input
              label="Variance Explanation (If any difference)"
              type="text"
              placeholder="e.g. Small change shortage"
              value={closingReason}
              onChange={(e) => setClosingReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4 pt-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold">
                Confirm &amp; Close Shift
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCloseDrawerModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 80mm Cashier Thermal Receipt Dialog */}
      {receiptData && (
        <Dialog open={!!receiptData} onOpenChange={() => setReceiptData(null)}>
          <DialogContent className="max-w-sm" onClose={() => setReceiptData(null)}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Cashier Receipt</DialogTitle>
            </DialogHeader>

            <div className="bg-white text-zinc-950 p-4 rounded border border-dashed border-zinc-400 font-mono text-xs text-left mx-auto w-full">
              <div className="font-bold text-center text-sm">
                এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার
              </div>
              <div className="text-[11px] text-center text-zinc-600">
                HPC Health &amp; Pain Care Center, Jashore
              </div>
              <div className="border-b border-dashed border-zinc-950 my-2" />
              <div className="font-bold text-center">
                MONEY RECEIPT · {receiptData.billNumber}
              </div>
              <div className="text-[10px] mt-1">
                Patient: <strong>{receiptData.patientName}</strong> (MRN: {receiptData.mrn})
              </div>
              <div className="text-[10px]">
                Date: {new Date(receiptData.createdAt).toLocaleString()}
              </div>

              <div className="border-b border-dashed border-zinc-950 my-2" />

              <table className="w-full text-[10px]">
                <tbody>
                  {receiptData.items.map((it: any, i: number) => (
                    <tr key={i}>
                      <td>{it.description} x{it.quantity}</td>
                      <td className="text-right">৳{it.unitPriceTaka * it.quantity}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border-t border-dashed border-zinc-300 pt-1">Subtotal:</td>
                    <td className="border-t border-dashed border-zinc-300 pt-1 text-right">৳{receiptData.subtotalTaka}</td>
                  </tr>
                  {receiptData.discountTaka > 0 && (
                    <tr>
                      <td>Discount:</td>
                      <td className="text-right">-৳{receiptData.discountTaka}</td>
                    </tr>
                  )}
                  <tr className="font-bold">
                    <td>Total:</td>
                    <td className="text-right">৳{receiptData.totalTaka}</td>
                  </tr>
                  <tr>
                    <td>Paid ({receiptData.paymentMethod}):</td>
                    <td className="text-right">৳{receiptData.paidTaka}</td>
                  </tr>
                  {receiptData.dueTaka > 0 && (
                    <tr className="text-red-600 font-bold">
                      <td>Due:</td>
                      <td className="text-right">৳{receiptData.dueTaka}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="border-b border-dashed border-zinc-950 my-2" />
              <div className="text-[10px] text-center text-zinc-600">Thank you for visiting HPC Jashore!</div>
            </div>

            <div className="flex gap-3 mt-4 pt-2 border-t border-border">
              <Button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => window.print()}
              >
                🖨️ Print Receipt
              </Button>
              <Button type="button" variant="outline" onClick={() => setReceiptData(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 1: CONSULTATION FEE COLLECTION & QUEUE ADMISSION */}
      {selectedIntakeForPayment && (
        <Dialog
          open={!!selectedIntakeForPayment}
          onOpenChange={(open) => {
            if (!open) setSelectedIntakeForPayment(null);
          }}
        >
          <DialogContent className="max-w-md p-5 bg-background border-emerald-500/30">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <CreditCard className="size-4" />
                <span>পরামর্শ ফি গ্রহণ ও কিউতে অন্তর্ভুক্তি</span>
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">পরামর্শ ফি (Consultation Fee in ৳) *</Label>
                <Input
                  type="number"
                  value={feeTakaInput}
                  onChange={(e) => setFeeTakaInput(parseInt(e.target.value, 10) || 0)}
                  placeholder="500"
                  className="h-9 text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">পেমেন্ট মেথড (Payment Method) *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cash', label: 'নগদ (Cash)' },
                    { id: 'bkash', label: 'বিকাশ (bKash)' },
                    { id: 'nagad', label: 'নগদ অ্যাপ (Nagad)' },
                    { id: 'card', label: 'পিওএস কার্ড (Card)' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setConsultationPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all text-xs font-medium flex items-center justify-between ${
                        consultationPaymentMethod === m.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold shadow-xs'
                          : 'border-border/60 hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <span>{m.label}</span>
                      {consultationPaymentMethod === m.id && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-muted-foreground text-[11px] leading-relaxed">
                ℹ️ ফি গ্রহণ নিশ্চিত করামাত্র রোগীকে স্বয়ংক্রিয়ভাবে ডাক্তার কনসালটেশন কিউতে প্রবেশ করানো হবে এবং ওয়েটিং রুমের টিভি স্ক্রিন ও ওয়েবে সিরিয়াল প্রদর্শিত হবে।
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIntakeForPayment(null)}
                disabled={admittingToQueue}
                className="flex-1 text-xs"
              >
                বাতিল
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAdmitToQueue}
                disabled={admittingToQueue}
                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-xs"
              >
                {admittingToQueue ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> সম্পন্ন হচ্ছে...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-3.5" /> ফি গ্রহণ ও কিউতে পাঠান
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: INTAKE FORM FULL DETAIL VIEWER */}
      {selectedIntakeForDetail && (
        <Dialog
          open={!!selectedIntakeForDetail}
          onOpenChange={(open) => {
            if (!open) setSelectedIntakeForDetail(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5 bg-background border-emerald-500/30">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-wider">
                <FileText className="size-4" />
                <span>রোগীর প্রাথমিক তথ্য ও রিসেপশন ফরম বিবরণী</span>
              </div>
              <DialogTitle className="text-lg font-bold">
                {selectedIntakeForDetail.name} ({selectedIntakeForDetail.phone})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                রিসেপশনিস্ট: {selectedIntakeForDetail.receptionistName || 'ডেস্ক'} • অবস্থা: {selectedIntakeForDetail.status}
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
                  <div>নাম: <strong className="text-foreground">{selectedIntakeForDetail.name}</strong></div>
                  <div>মোবাইল: <strong className="text-foreground font-mono">{selectedIntakeForDetail.phone}</strong></div>
                  <div>বয়স: <strong className="text-foreground">{selectedIntakeForDetail.ageYears || 'অনির্ধারিত'} বছর</strong></div>
                  <div>লিঙ্গ: <strong className="text-foreground capitalize">{selectedIntakeForDetail.gender === 'male' ? 'পুরুষ' : 'মহিলা'}</strong></div>
                  <div>পেশা: <strong className="text-foreground">{selectedIntakeForDetail.occupation || 'উলেখ নেই'}</strong></div>
                  <div className="col-span-2">ঠিকানা: <strong className="text-foreground">{selectedIntakeForDetail.address || 'উলেখ নেই'}</strong></div>
                </div>
              </div>

              {/* Health Info */}
              <div className="p-3 rounded-lg border border-border/70 bg-card/50 space-y-2">
                <div className="font-semibold text-rose-500 flex items-center gap-1.5">
                  <HeartPulse className="size-3.5" />
                  <span>২. প্রাথমিক স্বাস্থ্য তথ্য</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>রক্তচাপ: <strong className="text-foreground font-mono">{selectedIntakeForDetail.bpSystolic ? `${selectedIntakeForDetail.bpSystolic}/${selectedIntakeForDetail.bpDiastolic || 80} mmHg` : 'পরিমাপ করা হয়নি'}</strong></div>
                  <div>রক্তে শর্করা: <strong className="text-foreground font-mono">{selectedIntakeForDetail.bloodSugar ? `${selectedIntakeForDetail.bloodSugar} mmol/L` : 'পরিমাপ করা হয়নি'}</strong></div>
                  <div>ডায়াবেটিস: <strong className="text-foreground">{selectedIntakeForDetail.hasDiabetes === 1 ? 'হ্যাঁ (আক্রান্ত)' : 'না'}</strong></div>
                  <div>ওজন: <strong className="text-foreground font-mono">{selectedIntakeForDetail.weightKg ? `${selectedIntakeForDetail.weightKg} কেজি` : 'পরিমাপ করা হয়নি'}</strong></div>
                  <div className="col-span-2">প্রধান শারীরিক সমস্যা: <strong className="text-foreground">{selectedIntakeForDetail.chiefComplaint || 'উলেখ নেই'}</strong></div>
                  {selectedIntakeForDetail.problemDuration && (
                    <div className="col-span-2">কতদিন ধরে সমস্যা: <strong className="text-foreground">{selectedIntakeForDetail.problemDuration}</strong></div>
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
                  <div>পূর্বে ডাক্তার দেখিয়েছেন: <strong className="text-foreground">{selectedIntakeForDetail.seenDoctorBefore === 1 ? `হ্যাঁ (${selectedIntakeForDetail.previousDoctorDetails || ''})` : 'না'}</strong></div>
                  <div>পূর্বের টেস্ট রিপোর্ট: <strong className="text-foreground">{selectedIntakeForDetail.hasPreviousReports === 1 ? `হ্যাঁ (${selectedIntakeForDetail.previousReportNames || ''})` : 'না'}</strong></div>
                  <div>নিয়মিত ওষুধ সেবন: <strong className="text-foreground">{selectedIntakeForDetail.takesRegularMedication === 1 ? `হ্যাঁ (${selectedIntakeForDetail.regularMedicationDetails || ''})` : 'না'}</strong></div>
                  <div>ওষুধে এলার্জি: <strong className="text-foreground text-red-400">{selectedIntakeForDetail.hasDrugAllergies === 1 ? `হ্যাঁ (${selectedIntakeForDetail.drugAllergyDetails || ''})` : 'না'}</strong></div>
                </div>
              </div>

              {/* Referral & Target Doctor */}
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Stethoscope className="size-3.5" />
                  <span>৪. রেফারেল ও নির্ধারিত ডাক্তার</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>সোর্স: <strong className="text-foreground capitalize">{selectedIntakeForDetail.referralSource || 'অনির্ধারিত'}</strong></div>
                  <div>নির্ধারিত ডাক্তার: <strong className="text-foreground">{selectedIntakeForDetail.doctorName || 'ডাক্তার'}</strong></div>
                  <div>চেম্বার রুম: <strong className="text-foreground">{selectedIntakeForDetail.chamberRoomNumber ? `রুম ${selectedIntakeForDetail.chamberRoomNumber}` : 'নির্ধারিত রুম'}</strong></div>
                  <div>পরামর্শ ফি: <strong className="text-foreground font-mono">৳{selectedIntakeForDetail.doctorFee || 500}</strong></div>
                  {selectedIntakeForDetail.specialNotes && (
                    <div className="col-span-2">রিসেপশন মন্তব্য: <strong className="text-foreground">{selectedIntakeForDetail.specialNotes}</strong></div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIntakeForDetail(null)}
                className="text-xs"
              >
                বন্ধ করুন
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const it = selectedIntakeForDetail;
                  setSelectedIntakeForDetail(null);
                  openPaymentModal(it);
                }}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5"
              >
                <CreditCard className="size-3.5" /> ফি গ্রহণ ও কিউতে পাঠান
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
