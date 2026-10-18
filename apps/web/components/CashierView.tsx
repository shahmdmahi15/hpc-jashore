// apps/web/components/CashierView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api, UserSession, getSession } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { cn } from '../lib/utils';

export interface CashierProps {
  session?: UserSession | null;
}

export default function CashierView({ session: propSession }: CashierProps = {}) {
  const session = propSession || getSession();
  const [mobileTab, setMobileTab] = useState<'billing' | 'ledger'>('billing');
  const [bills, setBills] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Cash Drawer Modal
  const [showOpenDrawerModal, setShowOpenDrawerModal] = useState(false);
  const [showCloseDrawerModal, setShowCloseDrawerModal] = useState(false);
  const [openingCashTaka, setOpeningCashTaka] = useState(5000);
  const [closingCashActualTaka, setClosingCashActualTaka] = useState(5000);
  const [closingReason, setClosingReason] = useState('');

  // Bill Creation State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [billItems, setBillItems] = useState<any[]>([
    { itemType: 'consultation', description: 'Doctor Consultation (Dr. Toufiq)', unitPriceTaka: 500, quantity: 1 },
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
      const [bList, dList, pList, staffList] = await Promise.all([
        api.billing.getBills(),
        api.billing.getDues(),
        api.patients.list(),
        api.staff.list(),
      ]);
      setBills(bList || []);
      setDues(dList || []);
      setPatients(pList || []);

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

      {/* Mobile Tab Switcher (<lg screens: smartphones, small tablets) */}
      <div className="flex lg:hidden rounded-xl border border-border bg-card p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('billing')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'billing'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          💳 New Bill Generator
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('ledger')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'ledger'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          🧾 Invoices &amp; Dues ({bills.length})
        </button>
      </div>

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
                  onChange={(e) => setSelectedPatientId(e.target.value)}
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
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
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
    </div>
  );
}
