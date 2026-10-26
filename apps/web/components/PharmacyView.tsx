// apps/web/components/PharmacyView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function PharmacyView() {
  const [mobileTab, setMobileTab] = useState<'formulary' | 'expenses'>('formulary');
  const [medicines, setMedicines] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>({ lowStockMedicines: [] });
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
      const [m, a, exp] = await Promise.all([
        api.inventory.getMedicines(),
        api.inventory.getAlerts(),
        api.inventory.getExpenses(),
      ]);
      setMedicines(m || []);
      setAlerts(a || { lowStockMedicines: [] });
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
      toast.success('খরচ সফলভাবে রেকর্ড করা হয়েছে! (Expense recorded successfully)');
      setShowExpenseModal(false);
      loadData();
    } catch (err: any) {
      toast.error(`খরচ যোগ করতে ব্যর্থ: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Alerts Banner */}
      {alerts.lowStockMedicines?.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5 dark:bg-red-950/20 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-bold text-red-600 flex items-center gap-2 mb-2">
              <span>⚠️</span> Pharmacy Inventory Alerts
            </h3>
            <div className="text-xs sm:text-sm text-muted-foreground flex flex-col gap-1.5">
              {alerts.lowStockMedicines?.map((m: any) => (
                <div key={m.id} className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-red-500 font-semibold">• Low Stock:</span>
                  <strong className="text-foreground">{m.brandName}</strong> ({m.genericName}) — Current stock: <Badge variant="destructive" className="h-5 text-xs">{m.currentStock}</Badge> (Min: {m.minStockAlert})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Tab Switcher (<lg screens: smartphones, small tablets) */}
      <div className="flex lg:hidden rounded-xl border border-border bg-card p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('formulary')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'formulary'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          💊 Formulary ({medicines.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('expenses')}
          className={cn(
            'flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all',
            mobileTab === 'expenses'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          📋 Expenses ({expenses.length})
        </button>
      </div>

      {/* Main Grid: Medicines Formulary */}
      <div className="grid grid-cols-1 gap-6">
        {/* Medicines Catalog */}
        <div
          className={cn(
            'flex flex-col gap-6',
            mobileTab !== 'formulary' && 'hidden lg:flex'
          )}
        >
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                💊 Pharmacy Formulary ({medicines.length})
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
              <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/50 sticky top-0 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Brand Name</th>
                      <th className="p-2.5">Generic</th>
                      <th className="p-2.5">Form</th>
                      <th className="p-2.5 hidden sm:table-cell">Strength</th>
                      <th className="p-2.5 hidden md:table-cell">Manufacturer</th>
                      <th className="p-2.5">Stock</th>
                      <th className="p-2.5 text-right">MRP (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {medicines.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-bold text-foreground">{m.brandName}</td>
                        <td className="p-2.5 text-muted-foreground">{m.genericName}</td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-xs uppercase text-emerald-600 border-emerald-500/30">
                            {m.form}
                          </Badge>
                        </td>
                        <td className="p-2.5 hidden sm:table-cell text-muted-foreground">{m.strength}</td>
                        <td className="p-2.5 hidden md:table-cell text-muted-foreground">{m.manufacturer || 'N/A'}</td>
                        <td className="p-2.5 font-bold">
                          <Badge variant={m.totalStock > (m.minStockAlert ?? 10) ? 'success' : m.totalStock > 0 ? 'warning' : 'destructive'}>
                            {m.totalStock ?? 0}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right font-semibold">
                          ৳{((m.mrpPaisa || 0) / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Center Operational Expenses */}
      <div
        className={cn(
          'flex flex-col gap-6',
          mobileTab !== 'expenses' && 'hidden lg:flex'
        )}
      >
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              📋 Clinic Operational Expenses
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowExpenseModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              + Add Expense Voucher
            </Button>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No expense vouchers registered yet.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-muted/50 sticky top-0 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Voucher #</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Amount (৳)</th>
                      <th className="p-2.5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-bold text-foreground">{e.voucherNumber || 'V-001'}</td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-xs uppercase">
                            {e.category}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{e.description}</td>
                        <td className="p-2.5 font-bold text-red-600">
                          ৳{(e.amountPaisa / 100).toFixed(0)}
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {new Date(e.paidAt || e.createdAt).toLocaleDateString()}
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

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="max-w-lg" onClose={() => setShowExpenseModal(false)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Record Clinic Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="flex flex-col gap-4 mt-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Expense Category
              </Label>
              <Select
                value={expCategory}
                onValueChange={(val: 'rent' | 'salary' | 'utilities' | 'maintenance' | 'supplies' | 'misc') => setExpCategory(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Expense Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplies">Medical Supplies &amp; Linens (চিকিৎসা সামগ্রী)</SelectItem>
                  <SelectItem value="maintenance">Machine Maintenance (মেশিন মেরামত)</SelectItem>
                  <SelectItem value="utilities">Utilities &amp; Electricity (বিদ্যুৎ ও বিল)</SelectItem>
                  <SelectItem value="rent">Premises Rent (ভাড়া)</SelectItem>
                  <SelectItem value="salary">Staff Salary / Allowance (বেতন)</SelectItem>
                  <SelectItem value="misc">Miscellaneous (অন্যান্য)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              label="Description *"
              type="text"
              required
              placeholder="e.g. Ultrasound conductive gel 5L can"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Amount (৳) *"
                type="number"
                required
                value={expAmountTaka}
                onChange={(e) => setExpAmountTaka(parseInt(e.target.value) || 0)}
              />
              <Input
                label="Voucher / Receipt #"
                type="text"
                placeholder="V-2026-001"
                value={expVoucher}
                onChange={(e) => setExpVoucher(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-4 pt-2 border-t border-border">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Save Voucher
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}