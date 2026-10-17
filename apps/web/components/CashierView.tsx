// apps/web/components/CashierView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api, UserSession } from '../lib/api';

interface CashierProps {
  session: UserSession | null;
}

export default function CashierView({ session }: CashierProps) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cash Drawer Status Bar */}
      <div
        className="panel"
        style={{
          background: activeDrawer?.isOpen ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1.5px solid ${activeDrawer?.isOpen ? 'var(--hpc-emerald-500)' : 'var(--hpc-danger)'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`dot ${!activeDrawer?.isOpen ? 'dot-red' : ''}`} />
              <strong style={{ fontSize: '1.1rem' }}>
                Cash Drawer: {activeDrawer?.isOpen ? 'OPEN & ACTIVE' : 'CLOSED'}
              </strong>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--hpc-muted)', marginTop: '0.25rem' }}>
              {activeDrawer?.isOpen ? (
                <span>
                  Opening Float: <strong>৳{((activeDrawer.drawer.openingCashPaisa || 0) / 100).toFixed(0)}</strong> · Cash Collected: <strong>৳{((activeDrawer.cashCollectedPaisa || 0) / 100).toFixed(0)}</strong>
                </span>
              ) : (
                'Please open cash drawer to start accepting payments.'
              )}
            </div>
          </div>

          <div>
            {activeDrawer?.isOpen ? (
              <button className="btn btn-secondary" onClick={() => setShowCloseDrawerModal(true)}>
                🔒 Close Drawer &amp; Reconcile Shift
              </button>
            ) : (
              <button className="btn" onClick={() => setShowOpenDrawerModal(true)}>
                🔓 Open Cash Drawer Float
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bill Generator & Payment Ledger Grid */}
      <div className="grid-2">
        {/* Left Column: Bill Generator */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">💳 Generate Inpatient / Outpatient Bill</h3>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddItem('consultation', 'Doctor Consultation', 500)}
              >
                + Consult
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddItem('therapy', 'Therapy Session (IFT/UST)', 300)}
              >
                + Therapy
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleAddItem('package', '10-Session Rehab Package', 3000)}
              >
                + Package
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateBill}>
            <div className="form-group">
              <label className="form-label">Select Patient *</label>
              <select
                className="form-control"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mrn} · {p.nameEn} ({p.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Line Items Table */}
            <div className="table-wrapper" style={{ margin: '1rem 0' }}>
              <table className="hpc-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Rate (৳)</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>✕</th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.3rem' }}
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...billItems];
                            updated[idx].description = e.target.value;
                            setBillItems(updated);
                          }}
                        />
                      </td>
                      <td style={{ width: '85px' }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ padding: '0.3rem' }}
                          value={item.unitPriceTaka}
                          onChange={(e) => {
                            const updated = [...billItems];
                            updated[idx].unitPriceTaka = parseInt(e.target.value) || 0;
                            setBillItems(updated);
                          }}
                        />
                      </td>
                      <td style={{ width: '60px' }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ padding: '0.3rem' }}
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...billItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setBillItems(updated);
                          }}
                        />
                      </td>
                      <td>
                        <strong>৳{item.unitPriceTaka * item.quantity}</strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ background: 'var(--hpc-bg)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Subtotal:</span>
                <strong>৳{subtotalTaka}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span>Discount (৳):</span>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '100px', padding: '0.3rem', textAlign: 'right' }}
                  value={discountTaka}
                  onChange={(e) => {
                    const d = parseInt(e.target.value) || 0;
                    setDiscountTaka(d);
                    setPaidTaka(Math.max(0, subtotalTaka - d));
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--hpc-border)', paddingTop: '0.5rem', fontSize: '1.15rem' }}>
                <strong>Net Payable:</strong>
                <strong style={{ color: 'var(--hpc-accent)' }}>৳{totalTaka}</strong>
              </div>
            </div>

            {/* Payment Recording */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="cash">Cash (নগদ)</option>
                  <option value="bkash">bKash (বিকাশ)</option>
                  <option value="nagad">Nagad (নগদ অ্যাপ)</option>
                  <option value="rocket">Rocket</option>
                  <option value="card">POS Card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Paid (৳)</label>
                <input
                  type="number"
                  className="form-control"
                  value={paidTaka}
                  onChange={(e) => setPaidTaka(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {paymentMethod !== 'cash' && (
              <div className="form-group">
                <label className="form-label">MFS / Bank Transaction ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. TRX992812"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                />
              </div>
            )}

            {dueTaka > 0 && (
              <div style={{ color: 'var(--hpc-danger)', fontWeight: 'bold', marginBottom: '1rem', fontSize: '0.9rem' }}>
                ⚠️ Remaining Due to be recorded: ৳{dueTaka}
              </div>
            )}

            <button type="submit" className="btn btn-lg" style={{ width: '100%' }}>
              🖨️ Settle Bill &amp; Print Thermal Receipt
            </button>
          </form>
        </div>

        {/* Right Column: Bills Ledger & Dues */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Bills List */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">🧾 Settled Invoices ({bills.length})</h3>
              <button className="btn btn-secondary btn-sm" onClick={loadData}>
                🔄 Refresh
              </button>
            </div>
            <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="hpc-table">
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Patient</th>
                    <th>Total (৳)</th>
                    <th>Paid (৳)</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.billNumber}</strong></td>
                      <td>{b.patient?.nameEn || b.patientId}</td>
                      <td>৳{(b.totalPaisa / 100).toFixed(0)}</td>
                      <td>৳{(b.paidPaisa / 100).toFixed(0)}</td>
                      <td><span className="badge badge-emerald">{b.paymentMethod}</span></td>
                      <td><span className="badge badge-blue">{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dues Tracking */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">⚠️ Outstanding Patient Dues ({dues.length})</h3>
            </div>
            {dues.length === 0 ? (
              <div style={{ color: 'var(--hpc-muted)', textAlign: 'center', padding: '1rem' }}>
                No pending patient dues.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="hpc-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Due Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dues.map((d) => (
                      <tr key={d.id}>
                        <td><strong>{d.patient?.nameEn || d.patientId}</strong></td>
                        <td style={{ color: 'var(--hpc-danger)', fontWeight: 'bold' }}>
                          ৳{(d.amountPaisa / 100).toFixed(0)}
                        </td>
                        <td><span className="badge badge-red">{d.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Open Drawer Modal */}
      {showOpenDrawerModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Open Cash Drawer Float</h3>
            <form onSubmit={handleOpenDrawer}>
              <div className="form-group">
                <label className="form-label">Opening Cash Float (৳)</label>
                <input
                  type="number"
                  className="form-control"
                  value={openingCashTaka}
                  onChange={(e) => setOpeningCashTaka(parseInt(e.target.value) || 0)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>Confirm Open Float</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOpenDrawerModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Drawer Modal */}
      {showCloseDrawerModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Close Shift &amp; Reconcile Drawer</h3>
            <form onSubmit={handleCloseDrawer}>
              <div className="form-group">
                <label className="form-label">Physical Cash Count in Drawer (৳)</label>
                <input
                  type="number"
                  className="form-control"
                  value={closingCashActualTaka}
                  onChange={(e) => setClosingCashActualTaka(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Variance Explanation (If any difference)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Small change shortage"
                  value={closingReason}
                  onChange={(e) => setClosingReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>Confirm &amp; Close Shift</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCloseDrawerModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 80mm Cashier Thermal Receipt Modal */}
      {receiptData && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Cashier Receipt</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setReceiptData(null)}>✕</button>
            </div>

            <div
              className="sheet-thermal"
              style={{
                background: '#fff',
                color: '#000',
                border: '1px dashed #999',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center',
                margin: '0 auto',
                width: '100%',
                maxWidth: '300px',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার
              </div>
              <div style={{ fontSize: '11px', color: '#444' }}>
                HPC Health &amp; Pain Care Center, Jashore
              </div>
              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                MONEY RECEIPT · {receiptData.billNumber}
              </div>
              <div style={{ fontSize: '10px', textAlign: 'left', marginTop: '6px' }}>
                Patient: <strong>{receiptData.patientName}</strong> (MRN: {receiptData.mrn})
              </div>
              <div style={{ fontSize: '10px', textAlign: 'left' }}>
                Date: {new Date(receiptData.createdAt).toLocaleString()}
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

              <table style={{ width: '100%', fontSize: '10px', textAlign: 'left' }}>
                <tbody>
                  {receiptData.items.map((it: any, i: number) => (
                    <tr key={i}>
                      <td>{it.description} x{it.quantity}</td>
                      <td style={{ textAlign: 'right' }}>৳{it.unitPriceTaka * it.quantity}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ borderTop: '1px dashed #ccc', paddingTop: '4px' }}>Subtotal:</td>
                    <td style={{ borderTop: '1px dashed #ccc', paddingTop: '4px', textAlign: 'right' }}>৳{receiptData.subtotalTaka}</td>
                  </tr>
                  {receiptData.discountTaka > 0 && (
                    <tr>
                      <td>Discount:</td>
                      <td style={{ textAlign: 'right' }}>-৳{receiptData.discountTaka}</td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 'bold' }}>
                    <td>Total:</td>
                    <td style={{ textAlign: 'right' }}>৳{receiptData.totalTaka}</td>
                  </tr>
                  <tr>
                    <td>Paid ({receiptData.paymentMethod}):</td>
                    <td style={{ textAlign: 'right' }}>৳{receiptData.paidTaka}</td>
                  </tr>
                  {receiptData.dueTaka > 0 && (
                    <tr style={{ color: 'red', fontWeight: 'bold' }}>
                      <td>Due:</td>
                      <td style={{ textAlign: 'right' }}>৳{receiptData.dueTaka}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />
              <div style={{ fontSize: '10px', color: '#555' }}>Thank you for visiting HPC Jashore!</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => window.print()}>
                🖨️ Print Receipt
              </button>
              <button className="btn btn-secondary" onClick={() => setReceiptData(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
