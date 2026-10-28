// apps/web/components/MedicineDirectoryView.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface Medicine {
  id: string;
  brandName: string;
  genericName: string;
  manufacturer?: string | null;
  form: string;
  strength?: string | null;
  isActive: number;
  createdAt?: string;
  updatedAt?: string;
}

const MEDICINE_FORMS = [
  { value: 'tablet', label: 'Tablet (ট্যাবলেট)' },
  { value: 'capsule', label: 'Capsule (ক্যাপসুল)' },
  { value: 'syrup', label: 'Syrup / Suspension (সিরাপ)' },
  { value: 'injection', label: 'Injection (ইনজেকশন)' },
  { value: 'ointment', label: 'Ointment / Cream (মলম / ক্রিম)' },
  { value: 'drop', label: 'Drops (ড্রপ)' },
  { value: 'inhaler', label: 'Inhaler / Rotacap (ইনহেলার)' },
  { value: 'gel', label: 'Gel (জেল)' },
  { value: 'spray', label: 'Nasal / Oral Spray (স্প্রে)' },
  { value: 'suppository', label: 'Suppository (সাপোজিটরি)' },
];

export default function MedicineDirectoryView() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForm, setSelectedForm] = useState<string>('all');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [form, setForm] = useState('tablet');
  const [strength, setStrength] = useState('');

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const data = await api.inventory.getMedicines();
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(`ওষুধ তালিকা লোড করতে ব্যর্থ: ${err.message || 'Error loading medicines'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const openAddModal = () => {
    setEditingMed(null);
    setBrandName('');
    setGenericName('');
    setManufacturer('');
    setForm('tablet');
    setStrength('');
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditingMed(med);
    setBrandName(med.brandName);
    setGenericName(med.genericName);
    setManufacturer(med.manufacturer || '');
    setForm(med.form || 'tablet');
    setStrength(med.strength || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !genericName.trim()) {
      toast.error('ব্র্যান্ড নাম এবং জেনেরিক নাম অবশ্যই পূরণ করতে হবে।');
      return;
    }

    try {
      setSubmitting(true);
      if (editingMed) {
        await api.inventory.updateMedicine(editingMed.id, {
          brandName: brandName.trim(),
          genericName: genericName.trim(),
          manufacturer: manufacturer.trim() || undefined,
          form: form.trim(),
          strength: strength.trim() || undefined,
        });
        toast.success('প্রেসক্রিপশন ওষুধ সফলভাবে আপডেট করা হয়েছে!');
      } else {
        await api.inventory.createMedicine({
          brandName: brandName.trim(),
          genericName: genericName.trim(),
          manufacturer: manufacturer.trim() || undefined,
          form: form.trim(),
          strength: strength.trim() || undefined,
        });
        toast.success('প্রেসক্রিপশন ডিরেক্টরিতে নতুন ওষুধ যোগ করা হয়েছে!');
      }
      setIsModalOpen(false);
      loadMedicines();
    } catch (err: any) {
      toast.error(`সংরক্ষণ ব্যর্থ: ${err.message || 'Failed to save medicine'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setMedicineToDelete({ id, name });
  };

  const handleConfirmDelete = async () => {
    if (!medicineToDelete) return;
    const { id } = medicineToDelete;
    setMedicineToDelete(null);
    try {
      await api.inventory.deleteMedicine(id);
      toast.success('ওষুধ সফলভাবে ডিরেক্টরি থেকে মুছে ফেলা হয়েছে!');
      loadMedicines();
    } catch (err: any) {
      toast.error(`মুছতে ব্যর্থ: ${err.message || 'Failed to delete'}`);
    }
  };

  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.brandName.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
        (m.strength && m.strength.toLowerCase().includes(q));

      const matchesForm = selectedForm === 'all' || m.form === selectedForm;

      return matchesSearch && matchesForm;
    });
  }, [medicines, searchQuery, selectedForm]);

  return (
    <div className="flex flex-col gap-6">
      {/* Informative Header Banner */}
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <Pill className="size-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                প্রেসক্রিপশন ওষুধ ডাইরেক্টরি (Prescription Medicine Directory)
              </h2>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
                {medicines.length} টি ওষুধ
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              এইচপিসি ফিজিওথেরাপিতে কোনো ওষুধ বিক্রি করা হয় না। এটি শুধুমাত্র ডাক্তার চেম্বারে চিকিৎসকদের প্রেসক্রিপশন লেখার জন্য অনুমোদিত ওষুধের তালিকা।
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>নতুন ওষুধ যোগ করুন (Add Medicine)</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ব্র্যান্ড নাম, জেনেরিক নাম অথবা কোম্পানি দিয়ে খুঁজুন (Search by brand, generic, or manufacturer)..."
              className="pl-9 h-9 text-xs sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedForm} onValueChange={setSelectedForm}>
              <SelectTrigger className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="সব ধরণের ফর্ম (All Forms)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ফর্ম (All Forms)</SelectItem>
                {MEDICINE_FORMS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Medicines Catalog Grid / Table */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>অনুমোদিত ওষুধের তালিকা ({filteredMedicines.length})</span>
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription className="text-xs">
            প্রেসক্রিপশন তৈরির সময় ডাক্তার এই তালিকা থেকে সরাসরি সার্চ করে ওষুধ নির্বাচন করতে পারবেন।
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
              <span>ওষুধ তালিকা লোড হচ্ছে...</span>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
              <Info className="size-8 opacity-40 text-emerald-500" />
              <p className="font-semibold text-sm text-foreground">কোনো ওষুধ খুঁজে পাওয়া যায়নি</p>
              <p className="text-muted-foreground max-w-sm">
                {searchQuery
                  ? `"${searchQuery}" এর সাথে মিলে এমন কোনো ওষুধ নেই। অনুসন্ধান ফিল্টার পরিবর্তন করুন।`
                  : 'প্রেসক্রিপশন ডিরেক্টরিতে কোনো ওষুধ নেই। নতুন ওষুধ যোগ করতে উপরের বাটনে ক্লিক করুন।'}
              </p>
              {!searchQuery && (
                <Button size="sm" onClick={openAddModal} className="mt-2 text-xs gap-1.5 bg-emerald-600 text-white">
                  <Plus className="size-3.5" /> ওষুধ যোগ করুন
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/50 border-b text-muted-foreground text-xs">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ব্র্যান্ড নাম (Brand Name)</th>
                    <th className="py-3 px-4 font-semibold">জেনেরিক নাম (Generic Name)</th>
                    <th className="py-3 px-4 font-semibold">ফর্ম ও শক্তিমাত্রা (Form &amp; Strength)</th>
                    <th className="py-3 px-4 font-semibold">ফার্মা কোম্পানি (Manufacturer)</th>
                    <th className="py-3 px-4 font-semibold text-right">একশন (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMedicines.map((med) => (
                    <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Pill className="size-3.5" />
                          </span>
                          <span>{med.brandName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {med.genericName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[11px] capitalize bg-muted/40">
                            {med.form}
                          </Badge>
                          {med.strength && (
                            <Badge variant="secondary" className="text-[11px] font-mono">
                              {med.strength}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {med.manufacturer || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(med)}
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(med.id, med.brandName)}
                            className="size-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                            title="মুছুন"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Medicine Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Pill className="size-5 text-emerald-600" />
              <span>
                {editingMed ? 'ওষুধ তথ্য সম্পাদনা করুন' : 'প্রেসক্রিপশন ডিরেক্টরিতে নতুন ওষুধ যোগ'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                ব্র্যান্ড নাম (Brand Name) *
              </Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="যেমন: Tab. Ace Plus, Cap. Seclo 20mg"
                required
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                জেনেরিক নাম (Generic Name) *
              </Label>
              <Input
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="যেমন: Paracetamol + Caffeine, Omeprazole"
                required
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ফর্ম (Dosage Form) *</Label>
                <Select value={form} onValueChange={setForm}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="ফর্ম নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} className="max-h-56 overflow-y-auto">
                    {MEDICINE_FORMS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">শক্তিমাত্রা (Strength)</Label>
                <Input
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="যেমন: 500mg, 20mg, 100ml"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ফার্মা কোম্পানি (Manufacturer / Company)</Label>
              <Input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="যেমন: Square Pharmaceuticals, Beximco, Incepta"
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
              <Sparkles className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                এই ওষুধটি ডাক্তারদের চেম্বার প্রেসক্রিপশন লিখার সময় ড্রপডাউনে স্বয়ংক্রিয়ভাবে সাজেস্ট করবে।
              </span>
            </div>

            <DialogFooter className="flex flex-row justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                বাতিল
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />{' '}
                    {editingMed ? 'আপডেট করুন' : 'যোগ করুন'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE MEDICINE ALERT DIALOG */}
      <AlertDialog
        open={Boolean(medicineToDelete)}
        onOpenChange={(open) => {
          if (!open) setMedicineToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ওষুধ তালিকা থেকে মুছে ফেলা</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিত যে &ldquo;{medicineToDelete?.name}&rdquo; ওষুধ তালিকা থেকে মুছে ফেলতে চান? এটি মুছে ফেললে প্রেসক্রিপশন তৈরির সময় এই ওষুধের নাম সাজেশন তালিকায় প্রদর্শিত হবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
