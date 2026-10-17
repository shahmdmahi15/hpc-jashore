// apps/web/components/PharmacyView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function PharmacyView() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>({ lowStockMedicines: [], expiringBatches: [] });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<'rent' | 'salary' | 'utilities' | 'maintenance' | 'supplies' | 'misc'>('supplies');
  const [expDesc, setExpDesc] = useState('');
  const [expAmountTaka, setExpAmountTaka] = useState(1500);
  const [expVoucher, setExpVoucher] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, b, a, exp] = await Promise.all([
        api.inventory.getMedicines(),
        api.inventory.getBatches(),
        api.inventory.getAlerts(),
        api.inventory.getExpenses(),
      ]);
      setMedicines(m || []);
      setBatches(b || []);
      setAlerts(a || { lowStockMedicines: [], expiringBatches: [] });
      setExpenses(exp || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.inventory.createExpense({
        category: expCategory,
        description: expDesc,
        amountPaisa: expAmountTaka * 100,
        voucherNumber: expVoucher || undefined,
      });
      alert('Expense recorded successfully!');
      setShowExpenseModal(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to add expense: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alerts Bar */}
      {(alerts.lowStockMedicines?.length > 0 || alerts.expiringBatches?.length > 0) && (
        <div className="panel" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1.5px solid var(--hpc-danger)' }}>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--hpc-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> Pharmacy Inventory Alerts
          </h3>
          <div style={{ fontSize: '0.875rem' }}>
            {alerts.lowStockMedicines?.map((m: any) => (
              <div key={m.id}>
                • Low Stock: <strong>{m.brandName}</strong> ({m.genericName}) — Current stock: {m.currentStock} (Alert threshold: {m.minStockAlert})
              </div>
            ))}
            {alerts.expiringBatches?.map((b: any) => (
              <div key={b.id}>
                • Expiring Batch: <strong>{b.batchNumber}</strong> — Expires: {b.expDate} (Stock: {b.quantityInStock})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Medicines & FIFO Batches */}
      <div className="grid-2">
        {/* Medicines Catalog */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">💊 Pharmacy Formulary ({medicines.length})</h3>
            <button className="btn btn-secondary btn-sm" onClick={loadData}>🔄 Refresh</button>
          </div>
          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Brand Name</th>
                  <th>Generic</th>
                  <th>Form</th>
                  <th>Strength</th>
                  <th>Manufacturer</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.brandName}</strong></td>
                    <td>{m.genericName}</td>
                    <td><span className="badge badge-emerald">{m.form}</span></td>
                    <td>{m.strength}</td>
                    <td>{m.manufacturer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FIFO Batches */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">📦 Batches &amp; Expiry Tracking ({batches.length})</h3>
          </div>
          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>MRP (৳)</th>
                  <th>Exp Date</th>
                  <th>In Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.batchNumber}</strong></td>
                    <td>৳{(b.mrpPaisa / 100).toFixed(0)}</td>
                    <td>{b.expDate}</td>
                    <td><strong>{b.quantityInStock} pcs</strong></td>
                    <td>
                      <span className={`badge ${b.quantityInStock > 10 ? 'badge-emerald' : 'badge-amber'}`}>
                        {b.quantityInStock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Center Operational Expenses */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">📋 Clinic Operational Expenses</h3>
          <button className="btn btn-sm" onClick={() => setShowExpenseModal(true)}>
            + Add Expense Voucher
          </button>
        </div>

        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--hpc-muted)' }}>
            No expense vouchers registered yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="hpc-table">
              <thead>
                <tr>
                  <th>Voucher #</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount (৳)</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td><strong>{e.voucherNumber || 'V-001'}</strong></td>
                    <td><span className="badge badge-blue">{e.category}</span></td>
                    <td>{e.description}</td>
                    <td><strong style={{ color: 'var(--hpc-danger)' }}>৳{(e.amountPaisa / 100).toFixed(0)}</strong></td>
                    <td>{new Date(e.paidAt || e.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Record Clinic Expense</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="form-group">
                <label className="form-label">Expense Category</label>
                <select
                  className="form-control"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                >
                  <option value="supplies">Medical Supplies &amp; Linens (চিকিৎসা সামগ্রী)</option>
                  <option value="maintenance">Machine Maintenance (মেশিন মেরামত)</option>
                  <option value="utilities">Utilities &amp; Electricity (বিদ্যুৎ ও বিল)</option>
                  <option value="rent">Premises Rent (ভাড়া)</option>
                  <option value="salary">Staff Salary / Allowance (বেতন)</option>
                  <option value="misc">Miscellaneous (অন্যান্য)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Ultrasound conductive gel 5L can"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Amount (৳) *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={expAmountTaka}
                    onChange={(e) => setExpAmountTaka(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Voucher / Receipt #</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="V-2026-001"
                    value={expVoucher}
                    onChange={(e) => setExpVoucher(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>Save Voucher</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
