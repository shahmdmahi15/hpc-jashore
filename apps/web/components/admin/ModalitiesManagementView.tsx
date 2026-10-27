// apps/web/components/admin/ModalitiesManagementView.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  Coins,
  Activity,
  PauseCircle,
  Zap,
  ArrowUpDown,
  Waves,
  Hand,
  Radio,
  Crosshair,
  Dumbbell,
  Flame,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Switch } from '../ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import { useRealtime } from '../../lib/use-realtime';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

export interface ModalityItem {
  id: string;
  code: string;
  nameEn: string;
  nameBn: string;
  defaultDurationMin: number;
  defaultPricePaisa: number;
  isActive: number | boolean;
}

interface ModalityVisualConfig {
  gradient: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  icon: React.ElementType;
  descEn: string;
  descBn: string;
}

const MODALITY_VISUAL_MAP: Record<string, ModalityVisualConfig> = {
  IFT: {
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    icon: Zap,
    descEn: 'Interferential current therapy for deep-tissue pain relief & muscle stimulation.',
    descBn: 'গভীর ব্যথানাশক এবং রক্ত সঞ্চালন বৃদ্ধিকারী বৈদ্যুতিক ওয়েভ চিকিৎসা।',
  },
  UST: {
    gradient: 'from-sky-500/10 via-sky-500/5 to-transparent',
    badgeBg: 'bg-sky-100 dark:bg-sky-950/60',
    badgeText: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800/60',
    icon: Activity,
    descEn: 'Ultrasound deep acoustic wave therapy for joint & ligament healing.',
    descBn: 'শব্দতরঙ্গের মাধ্যমে গভীর কোষের প্রদাহ কমানো এবং টিস্যু হিলিং থেরাপি।',
  },
  TENS: {
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    icon: Sparkles,
    descEn: 'Transcutaneous electrical nerve stimulation for blocking pain signals.',
    descBn: 'স্নায়বিক ব্যথা নিরাময়ে নার্ভ স্টিমুলেশন থেরাপি।',
  },
  IRR: {
    gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    icon: Flame,
    descEn: 'Infrared radiation thermal therapy for superficial pain & stiffness.',
    descBn: 'অবলোহিত রশ্মির মৃদু তাপে মাংসপেশীর আড়ষ্টতা দূরীকরণ চিকিৎসা।',
  },
  TRACTION: {
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    icon: ArrowUpDown,
    descEn: 'Cervical & lumbar spinal decompression mechanical traction.',
    descBn: 'ঘাড় ও কোমরের স্পাইনাল নার্ভের চাপ মুক্ত করার যান্ত্রিক ট্র্যাকশন।',
  },
  HYDRO: {
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    icon: Waves,
    descEn: 'Hydrocollator moist heat therapy & hydro-rehabilitation.',
    descBn: 'ময়েস্ট হিট বা হাইড্রোথেরাপির মাধ্যমে জয়েন্টের সচলতা পুনরুদ্ধার।',
  },
  MANUAL: {
    gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    icon: Hand,
    descEn: 'Manual physiotherapy joint mobilization, manipulation & soft tissue release.',
    descBn: 'দক্ষ ফিজিওথেরাপিস্ট দ্বারা সরাসরি হাত দিয়ে জয়েন্ট মোবিলাইজেশন।',
  },
  SWD: {
    gradient: 'from-orange-500/10 via-orange-500/5 to-transparent',
    badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
    badgeText: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800/60',
    icon: Radio,
    descEn: 'Shortwave diathermy high-frequency electromagnetic deep heating.',
    descBn: 'শর্টওয়েভ ডায়াথার্মি ইলেক্ট্রোম্যাগনেটিক গভীর তাপ চিকিৎসা।',
  },
  LASER: {
    gradient: 'from-pink-500/10 via-pink-500/5 to-transparent',
    badgeBg: 'bg-pink-100 dark:bg-pink-950/60',
    badgeText: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800/60',
    icon: Crosshair,
    descEn: 'High-intensity laser photobiomodulation for acute inflammation & tissue repair.',
    descBn: 'হাই-ইনটেনসিটি লেজার রশ্মির মাধ্যমে দ্রুত সেলুলার রিপেয়ার ও আরোগ্য।',
  },
  EXERCISE: {
    gradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
    badgeBg: 'bg-teal-100 dark:bg-teal-950/60',
    badgeText: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/60',
    icon: Dumbbell,
    descEn: 'Therapeutic exercise, resistance strengthening & neuromuscular re-education.',
    descBn: 'থেরাপিউটিক কায়িক ব্যায়াম ও মাংসপেশির শক্তি বৃদ্ধির প্রশিক্ষণ।',
  },
};

const DEFAULT_MODALITY_VISUAL: ModalityVisualConfig = {
  gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
  badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
  badgeText: 'text-emerald-700 dark:text-emerald-300',
  border: 'border-emerald-200 dark:border-emerald-800/60',
  icon: Sparkles,
  descEn: 'Clinical therapy treatment modality protocol.',
  descBn: 'ক্লিনিক্যাল ফিজিওথেরাপি চিকিৎসা প্রটোকল।',
};

const PRESET_TEMPLATES = [
  { code: 'IFT', nameEn: 'Interferential Therapy', nameBn: 'ইন্টারফেরেনশিয়াল থেরাপি (IFT)', duration: 20, priceBdt: 300 },
  { code: 'UST', nameEn: 'Ultrasound Therapy', nameBn: 'আল্ট্রাসাউন্ড থেরাপি (UST)', duration: 15, priceBdt: 300 },
  { code: 'TENS', nameEn: 'TENS Nerve Stimulation', nameBn: 'টেনস নার্ভ স্টিমুলেশন (TENS)', duration: 20, priceBdt: 250 },
  { code: 'IRR', nameEn: 'Infrared Radiation Therapy', nameBn: 'ইনফ্রারেড রেডিয়েশন (IRR)', duration: 15, priceBdt: 200 },
  { code: 'TRACTION', nameEn: 'Cervical / Lumbar Traction', nameBn: 'স্পাইনাল ট্র্যাকশন থেরাপি', duration: 30, priceBdt: 400 },
  { code: 'HYDRO', nameEn: 'Hydrocollator Moist Heat Pack', nameBn: 'হাইড্রো ময়েস্ট হিট প্যাক', duration: 20, priceBdt: 200 },
  { code: 'MANUAL', nameEn: 'Manual Mobilization Therapy', nameBn: 'ম্যানুয়াল মোবিলাইজেশন থেরাপি', duration: 30, priceBdt: 500 },
  { code: 'SWD', nameEn: 'Shortwave Diathermy', nameBn: 'শর্টওয়েভ ডায়াথার্মি (SWD)', duration: 20, priceBdt: 350 },
  { code: 'LASER', nameEn: 'High-Intensity Laser Therapy', nameBn: 'হাই-ইনটেনসিটি লেজার থেরাপি', duration: 15, priceBdt: 600 },
  { code: 'EXERCISE', nameEn: 'Therapeutic Exercise & Rehab', nameBn: 'থেরাপিউটিক এক্সারসাইজ ও রিহ্যাব', duration: 30, priceBdt: 300 },
];

const DURATION_PRESETS = [10, 15, 20, 30, 45, 60];
const PRICE_PRESETS = [200, 250, 300, 400, 500, 600, 800, 1000];

function toBnDigits(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
}

export function ModalitiesManagementView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Data State
  const [modalities, setModalities] = useState<ModalityItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'under15' | '15to30' | 'over30'>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'under300' | '300to500' | 'over500'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'duration' | 'price'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingModality, setEditingModality] = useState<ModalityItem | null>(null);

  const [isQuickPriceOpen, setIsQuickPriceOpen] = useState(false);
  const [pricingModality, setPricingModality] = useState<ModalityItem | null>(null);
  const [quickPriceBdt, setQuickPriceBdt] = useState<number>(300);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingModality, setDeletingModality] = useState<ModalityItem | null>(null);

  // Form Fields for Add Modal
  const [addCode, setAddCode] = useState('');
  const [addNameEn, setAddNameEn] = useState('');
  const [addNameBn, setAddNameBn] = useState('');
  const [addDuration, setAddDuration] = useState<number>(20);
  const [addPriceBdt, setAddPriceBdt] = useState<number>(300);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // Form Fields for Edit Modal
  const [editNameEn, setEditNameEn] = useState('');
  const [editNameBn, setEditNameBn] = useState('');
  const [editDuration, setEditDuration] = useState<number>(20);
  const [editPriceBdt, setEditPriceBdt] = useState<number>(300);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Fetch Modalities
  const fetchModalities = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await api.catalog.getModalities();
        if (Array.isArray(data)) {
          setModalities(data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load modalities';
        toast.error(isBn ? 'মডালিটি লোড করতে ব্যর্থ হয়েছে' : msg);
      }
    });
  }, [isBn]);

  useEffect(() => {
    fetchModalities();
  }, [fetchModalities]);

  // Realtime updates hook
  useRealtime((event) => {
    if (
      event.type.startsWith('modality.') ||
      event.type.startsWith('catalog.') ||
      event.type === 'catalog.modality_updated' ||
      event.type === 'therapy.slot_updated'
    ) {
      fetchModalities();
    }
  });

  // KPI Calculations
  const stats = useMemo(() => {
    const total = modalities.length;
    const active = modalities.filter((m) => Boolean(m.isActive)).length;
    const inactive = total - active;
    const avgDuration = total > 0 ? Math.round(modalities.reduce((acc, m) => acc + (m.defaultDurationMin || 0), 0) / total) : 0;
    const avgPricePaisa = total > 0 ? Math.round(modalities.reduce((acc, m) => acc + (m.defaultPricePaisa || 0), 0) / total) : 0;
    const avgPriceBdt = Math.round(avgPricePaisa / 100);

    return { total, active, inactive, avgDuration, avgPricePaisa, avgPriceBdt };
  }, [modalities]);

  // Currency & Duration formatting helpers
  const formatCurrency = (paisa: number) => {
    const bdt = Math.round(paisa / 100);
    return isBn ? `৳${toBnDigits(bdt)}` : `৳${bdt}`;
  };

  const formatDuration = (mins: number) => {
    return isBn ? `${toBnDigits(mins)} মিনিট` : `${mins} min`;
  };

  // Filter & Sort Logic
  const filteredModalities = useMemo(() => {
    return modalities
      .filter((m) => {
        // Search query filter (matches code, nameEn, nameBn)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = m.code?.toLowerCase().includes(q);
          const matchEn = m.nameEn?.toLowerCase().includes(q);
          const matchBn = m.nameBn?.toLowerCase().includes(q);
          if (!matchCode && !matchEn && !matchBn) return false;
        }

        // Status Filter
        const isActive = Boolean(m.isActive);
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;

        // Duration Filter
        const dur = m.defaultDurationMin || 0;
        if (durationFilter === 'under15' && dur >= 15) return false;
        if (durationFilter === '15to30' && (dur < 15 || dur > 30)) return false;
        if (durationFilter === 'over30' && dur <= 30) return false;

        // Price Filter
        const priceBdt = Math.round((m.defaultPricePaisa || 0) / 100);
        if (priceFilter === 'under300' && priceBdt >= 300) return false;
        if (priceFilter === '300to500' && (priceBdt < 300 || priceBdt > 500)) return false;
        if (priceFilter === 'over500' && priceBdt <= 500) return false;

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'code') {
          comparison = (a.code || '').localeCompare(b.code || '');
        } else if (sortBy === 'name') {
          const nameA = isBn ? a.nameBn || a.nameEn : a.nameEn;
          const nameB = isBn ? b.nameBn || b.nameEn : b.nameEn;
          comparison = (nameA || '').localeCompare(nameB || '');
        } else if (sortBy === 'duration') {
          comparison = (a.defaultDurationMin || 0) - (b.defaultDurationMin || 0);
        } else if (sortBy === 'price') {
          comparison = (a.defaultPricePaisa || 0) - (b.defaultPricePaisa || 0);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [modalities, searchQuery, statusFilter, durationFilter, priceFilter, sortBy, sortOrder, isBn]);

  // Inline Quick Toggle Active/Inactive
  const handleToggleStatus = async (modality: ModalityItem) => {
    const nextStatus = !Boolean(modality.isActive);

    // Optimistic local update
    setModalities((prev) =>
      prev.map((item) => (item.id === modality.id ? { ...item, isActive: nextStatus ? 1 : 0 } : item)),
    );

    try {
      await api.catalog.updateModality(modality.id, { isActive: nextStatus });
      toast.success(
        isBn
          ? `${modality.nameBn || modality.code} ${nextStatus ? 'সক্রিয় করা হয়েছে' : 'নিষ্ক্রিয় করা হয়েছে'}`
          : `${modality.code} ${nextStatus ? 'activated' : 'deactivated'} successfully`,
      );
    } catch (err: unknown) {
      // Revert optimistic update
      setModalities((prev) =>
        prev.map((item) => (item.id === modality.id ? { ...item, isActive: modality.isActive } : item)),
      );
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(isBn ? 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে' : msg);
    }
  };

  // Open Quick Price Dialog
  const handleOpenQuickPrice = (modality: ModalityItem) => {
    setPricingModality(modality);
    setQuickPriceBdt(Math.round((modality.defaultPricePaisa || 0) / 100));
    setIsQuickPriceOpen(true);
  };

  // Submit Quick Price
  const handleSaveQuickPrice = async () => {
    if (!pricingModality) return;
    if (quickPriceBdt < 0) {
      toast.error(isBn ? 'মূল্য ০ বা তার বেশি হতে হবে' : 'Price must be >= 0');
      return;
    }

    setIsActionLoading(true);
    const newPricePaisa = quickPriceBdt * 100;
    try {
      await api.catalog.updateModality(pricingModality.id, { defaultPricePaisa: newPricePaisa });
      setModalities((prev) =>
        prev.map((m) => (m.id === pricingModality.id ? { ...m, defaultPricePaisa: newPricePaisa } : m)),
      );
      toast.success(
        isBn
          ? `${pricingModality.code} এর নতুন ফি ৳${toBnDigits(quickPriceBdt)} নির্ধারিত হয়েছে`
          : `${pricingModality.code} fee updated to ৳${quickPriceBdt}`,
      );
      setIsQuickPriceOpen(false);
      setPricingModality(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update price';
      toast.error(isBn ? 'মূল্য আপডেট করতে ব্যর্থ হয়েছে' : msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setAddCode('');
    setAddNameEn('');
    setAddNameBn('');
    setAddDuration(20);
    setAddPriceBdt(300);
    setAddErrors({});
    setIsAddOpen(true);
  };

  // Apply Preset to Add Form
  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setAddCode(preset.code);
    setAddNameEn(preset.nameEn);
    setAddNameBn(preset.nameBn);
    setAddDuration(preset.duration);
    setAddPriceBdt(preset.priceBdt);
    setAddErrors({});
  };

  // Submit Add Form
  const handleCreateModality = async () => {
    const errors: Record<string, string> = {};
    const codeClean = addCode.trim().toUpperCase();
    if (!codeClean) {
      errors.code = isBn ? 'মডালিটি কোড আবশ্যক' : 'Modality code is required';
    } else if (codeClean.length > 16) {
      errors.code = isBn ? 'কোড সর্বোচ্চ ১৬ অক্ষরের হতে পারে' : 'Code cannot exceed 16 characters';
    } else if (modalities.some((m) => m.code.toUpperCase() === codeClean)) {
      errors.code = isBn ? 'এই কোডটি ইতিমধ্যে ব্যবহৃত হচ্ছে' : 'This code already exists';
    }

    if (!addNameEn.trim()) {
      errors.nameEn = isBn ? 'ইংরেজি নাম আবশ্যক' : 'English name is required';
    }
    if (!addNameBn.trim()) {
      errors.nameBn = isBn ? 'বাংলা নাম আবশ্যক' : 'Bengali name is required';
    }
    if (!addDuration || addDuration < 1) {
      errors.duration = isBn ? 'সময়সীমা কমপক্ষে ১ মিনিট হতে হবে' : 'Duration must be at least 1 min';
    }
    if (addPriceBdt === undefined || addPriceBdt < 0) {
      errors.price = isBn ? 'মূল্য ০ বা তার বেশি হতে হবে' : 'Price must be >= 0';
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setIsActionLoading(true);
    try {
      const payload = {
        code: codeClean,
        nameEn: addNameEn.trim(),
        nameBn: addNameBn.trim(),
        defaultDurationMin: Number(addDuration),
        defaultPricePaisa: Math.round(Number(addPriceBdt) * 100),
      };

      const created = await api.catalog.createModality(payload);
      setModalities((prev) => [...prev, created]);
      toast.success(
        isBn
          ? `নতুন মডালিটি "${payload.nameBn}" সফলভাবে তৈরি হয়েছে`
          : `Modality "${payload.code}" created successfully`,
      );
      setIsAddOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create modality';
      toast.error(isBn ? 'মডালিটি তৈরি করতে ব্যর্থ হয়েছে' : msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (modality: ModalityItem) => {
    setEditingModality(modality);
    setEditNameEn(modality.nameEn || '');
    setEditNameBn(modality.nameBn || '');
    setEditDuration(modality.defaultDurationMin || 20);
    setEditPriceBdt(Math.round((modality.defaultPricePaisa || 0) / 100));
    setEditIsActive(Boolean(modality.isActive));
    setEditErrors({});
    setIsEditOpen(true);
  };

  // Submit Edit Form
  const handleUpdateModality = async () => {
    if (!editingModality) return;

    const errors: Record<string, string> = {};
    if (!editNameEn.trim()) {
      errors.nameEn = isBn ? 'ইংরেজি নাম আবশ্যক' : 'English name is required';
    }
    if (!editNameBn.trim()) {
      errors.nameBn = isBn ? 'বাংলা নাম আবশ্যক' : 'Bengali name is required';
    }
    if (!editDuration || editDuration < 1) {
      errors.duration = isBn ? 'সময়সীমা কমপক্ষে ১ মিনিট হতে হবে' : 'Duration must be at least 1 min';
    }
    if (editPriceBdt === undefined || editPriceBdt < 0) {
      errors.price = isBn ? 'মূল্য ০ বা তার বেশি হতে হবে' : 'Price must be >= 0';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsActionLoading(true);
    try {
      const payload = {
        nameEn: editNameEn.trim(),
        nameBn: editNameBn.trim(),
        defaultDurationMin: Number(editDuration),
        defaultPricePaisa: Math.round(Number(editPriceBdt) * 100),
        isActive: editIsActive,
      };

      const updated = await api.catalog.updateModality(editingModality.id, payload);
      setModalities((prev) =>
        prev.map((m) => (m.id === editingModality.id ? { ...m, ...updated, ...payload } : m)),
      );
      toast.success(
        isBn
          ? `মডালিটি "${editingModality.code}" আপডেট সম্পন্ন হয়েছে`
          : `Modality "${editingModality.code}" updated successfully`,
      );
      setIsEditOpen(false);
      setEditingModality(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update modality';
      toast.error(isBn ? 'আপডেট সম্পন্ন করা সম্ভব হয়নি' : msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDelete = (modality: ModalityItem) => {
    setDeletingModality(modality);
    setIsDeleteOpen(true);
  };

  // Submit Delete / Archive
  const handleDeleteModality = async () => {
    if (!deletingModality) return;

    setIsActionLoading(true);
    try {
      const res = await api.catalog.deleteModality(deletingModality.id);
      if (res?.softDeleted) {
        setModalities((prev) =>
          prev.map((m) => (m.id === deletingModality.id ? { ...m, isActive: 0 } : m)),
        );
        toast.info(
          isBn
          ? `পূর্ববর্তী রোগীর ইতিহাস রক্ষার্থে মডালিটি "${deletingModality.code}" নিষ্ক্রিয় হিসেবে সংরক্ষিত রাখা হয়েছে`
          : `Modality "${deletingModality.code}" deactivated to preserve existing patient records`,
        );
      } else {
        setModalities((prev) => prev.filter((m) => m.id !== deletingModality.id));
        toast.success(
          isBn
            ? `মডালিটি "${deletingModality.code}" মুছে ফেলা হয়েছে`
            : `Modality "${deletingModality.code}" deleted successfully`,
        );
      }
      setIsDeleteOpen(false);
      setDeletingModality(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete modality';
      toast.error(isBn ? 'মুছে ফেলতে ব্যর্থ হয়েছে' : msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div
      className="space-y-4 sm:space-y-6 w-full max-w-full pb-8"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-card to-card border border-border/80 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="size-11 sm:size-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="size-6 sm:size-6.5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              {isBn ? 'থেরাপি মডালিটি ব্যবস্থাপনা' : 'Modalities Catalog & Protocols'}
              <Badge variant="emerald" className="text-[10px] sm:text-xs font-semibold py-0.5 px-2">
                {isBn ? 'ক্লিনিক্যাল' : 'Clinical Row 1'}
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {isBn
                ? 'থেরাপি চিকিৎসা ক্যাটালগ, নির্ধারিত সেশন সময়সীমা ও মূল্য তালিকা (টাকা) কনফিগারেশন।'
                : 'Manage physiotherapy modalities, standard protocol session durations, and pricing in BDT.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchModalities}
            disabled={isPending}
            className="h-10 px-3 rounded-xl border-border/80 hover:bg-muted/80 cursor-pointer active:scale-95 transition-all text-xs font-semibold"
            aria-label={isBn ? 'রিফ্রেশ' : 'Refresh'}
          >
            <RefreshCw className={cn('size-4', isPending && 'animate-spin text-emerald-500')} />
            <span className="hidden sm:inline ml-1.5">{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all text-xs sm:text-sm font-bold flex items-center gap-1.5"
          >
            <Plus className="size-4 stroke-[3]" />
            <span>{isBn ? 'নতুন মডালিটি যোগ করুন' : 'Add New Modality'}</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Cards (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {/* KPI 1: Total Modalities */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-xs relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute -right-3 -bottom-3 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
            <Zap className="size-20 text-purple-500" />
          </div>
          <CardContent className="p-3.5 sm:p-4.5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {isBn ? 'সর্বমোট মডালিটি' : 'Total Modalities'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                  {isBn ? toBnDigits(stats.total) : stats.total}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {isBn ? `${toBnDigits(stats.active)} চালু` : `${stats.active} live`}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Active Treatments */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-xs relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute -right-3 -bottom-3 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
            <CheckCircle2 className="size-20 text-emerald-500" />
          </div>
          <CardContent className="p-3.5 sm:p-4.5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {isBn ? 'চালু চিকিৎসা' : 'Active Treatments'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {isBn ? toBnDigits(stats.active) : stats.active}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {stats.total > 0 ? `${isBn ? toBnDigits(Math.round((stats.active / stats.total) * 100)) : Math.round((stats.active / stats.total) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Inactive / Suspended */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-xs relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute -right-3 -bottom-3 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
            <PauseCircle className="size-20 text-amber-500" />
          </div>
          <CardContent className="p-3.5 sm:p-4.5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {isBn ? 'নিষ্ক্রিয় / স্থগিত' : 'Inactive / Paused'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                  {isBn ? toBnDigits(stats.inactive) : stats.inactive}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {isBn ? 'স্থগিত' : 'archived'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <PauseCircle className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Average Duration */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-xs relative overflow-hidden group hover:border-sky-500/30 transition-all">
          <div className="absolute -right-3 -bottom-3 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
            <Clock className="size-20 text-sky-500" />
          </div>
          <CardContent className="p-3.5 sm:p-4.5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {isBn ? 'গড় সেশন সময়কাল' : 'Avg Session Duration'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-sky-600 dark:text-sky-400">
                  {isBn ? toBnDigits(stats.avgDuration) : stats.avgDuration}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {isBn ? 'মিনিট' : 'min'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-11 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Average Price in BDT */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-xs relative overflow-hidden group hover:border-teal-500/30 transition-all col-span-2 md:col-span-1">
          <div className="absolute -right-3 -bottom-3 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
            <Coins className="size-20 text-teal-500" />
          </div>
          <CardContent className="p-3.5 sm:p-4.5 flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                {isBn ? 'গড় সেশন মূল্য' : 'Avg Modality Price'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black tracking-tight text-teal-600 dark:text-teal-400">
                  {formatCurrency(stats.avgPricePaisa)}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  / {isBn ? 'সেশন' : 'session'}
                </span>
              </div>
            </div>
            <div className="size-9 sm:size-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Coins className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter, Search & View Mode Toolbar */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-sm shadow-xs p-3.5 sm:p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isBn
                  ? 'কোড বা নাম দিয়ে খুঁজুন (যেমনঃ IFT, Ultrasound, ইন্টারফেরেনশিয়াল)...'
                  : 'Search by code or name (e.g., IFT, Ultrasound, Traction)...'
              }
              className="pl-9 pr-8 h-10 rounded-xl bg-background border-border/80 text-xs sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-full"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center rounded-xl border border-border/80 bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  statusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {isBn ? 'সব' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {isBn ? 'সক্রিয়' : 'Active'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  statusFilter === 'inactive'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
              </button>
            </div>

            {/* Duration Filter Dropdown */}
            <div className="relative">
              <select
                aria-label={isBn ? 'সময়সীমা ফিল্টার' : 'Duration Filter'}
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value as typeof durationFilter)}
                className="h-10 px-3 pr-8 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">{isBn ? 'সকল সময়কাল' : 'All Durations'}</option>
                <option value="under15">{isBn ? '< ১৫ মিনিট' : '< 15 mins'}</option>
                <option value="15to30">{isBn ? '১৫ - ৩০ মিনিট' : '15 - 30 mins'}</option>
                <option value="over30">{isBn ? '> ৩০ মিনিট' : '> 30 mins'}</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Price Filter Dropdown */}
            <div className="relative">
              <select
                aria-label={isBn ? 'মূল্য ফিল্টার' : 'Price Filter'}
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
                className="h-10 px-3 pr-8 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">{isBn ? 'সকল মূল্য' : 'All Prices'}</option>
                <option value="under300">{isBn ? '৳৩০০ এর নিচে' : '< ৳300'}</option>
                <option value="300to500">{isBn ? '৳৩০০ - ৳৫০০' : '৳300 - ৳500'}</option>
                <option value="over500">{isBn ? '৳৫০০ এর উপরে' : '> ৳500'}</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Sorting Dropdown */}
            <div className="relative">
              <select
                aria-label={isBn ? 'সাজানোর নিয়ম' : 'Sort Options'}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-10 px-3 pr-8 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="code">{isBn ? 'কোড অনুযায়ী' : 'By Code'}</option>
                <option value="name">{isBn ? 'নাম অনুযায়ী' : 'By Name'}</option>
                <option value="duration">{isBn ? 'সময়কাল অনুযায়ী' : 'By Duration'}</option>
                <option value="price">{isBn ? 'মূল্য অনুযায়ী' : 'By Price'}</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="h-10 px-2.5 rounded-xl border-border/80 text-xs font-semibold cursor-pointer"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="size-3.5" />
            </Button>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center rounded-xl border border-border/80 bg-background p-1 ml-auto lg:ml-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'size-8 flex items-center justify-center rounded-lg transition-all cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={isBn ? 'কার্ড ভিউ' : 'Card View'}
                title={isBn ? 'কার্ড ভিউ' : 'Card View'}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'size-8 flex items-center justify-center rounded-lg transition-all cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label={isBn ? 'টেবিল ভিউ' : 'Table View'}
                title={isBn ? 'টেবিল ভিউ' : 'Table View'}
              >
                <TableIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {filteredModalities.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 p-8 sm:p-12 text-center rounded-2xl bg-card/40">
          <div className="size-14 sm:size-16 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-4">
            <Sparkles className="size-7 sm:size-8 opacity-50" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
            {isBn ? 'কোনো মডালিটি পাওয়া যায়নি' : 'No modalities found'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            {searchQuery || statusFilter !== 'all' || durationFilter !== 'all' || priceFilter !== 'all'
              ? isBn
                ? 'আপনার দেওয়া ফিল্টার বা সার্চের সাথে কোনো ফলাফল মেলেনি।'
                : 'No therapy modalities match your active filters or search keyword.'
              : isBn
                ? 'ক্লিনিকে এখনো কোনো থেরাপি মডালিটি তালিকাভুক্ত করা হয়নি।'
                : 'No modalities have been configured in the catalog yet.'}
          </p>
          <div className="flex justify-center gap-2">
            {(searchQuery || statusFilter !== 'all' || durationFilter !== 'all' || priceFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDurationFilter('all');
                  setPriceFilter('all');
                }}
                className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer"
              >
                {isBn ? 'ফিল্টার মুছুন' : 'Reset Filters'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="size-3.5 mr-1" />
              {isBn ? 'মডালিটি যোগ করুন' : 'Add Modality'}
            </Button>
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Rich Responsive Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4.5">
          {filteredModalities.map((item) => {
            const visual = MODALITY_VISUAL_MAP[item.code] || DEFAULT_MODALITY_VISUAL;
            const IconComponent = visual.icon;
            const isActive = Boolean(item.isActive);
            const bdtPrice = Math.round((item.defaultPricePaisa || 0) / 100);

            return (
              <Card
                key={item.id}
                className={cn(
                  'rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between group shadow-xs hover:shadow-md backdrop-blur-sm',
                  isActive
                    ? 'border-border/80 bg-card/80 hover:border-emerald-500/40'
                    : 'border-border/50 bg-muted/20 opacity-75 hover:opacity-100',
                )}
              >
                <div className={cn('p-4 sm:p-5 bg-gradient-to-br', visual.gradient)}>
                  {/* Card Header: Code Badge & Status Switch */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black tracking-wider uppercase border',
                          visual.badgeBg,
                          visual.badgeText,
                          visual.border,
                        )}
                      >
                        {item.code}
                      </span>
                      <div className="size-7 rounded-lg bg-card/80 text-muted-foreground border border-border/60 flex items-center justify-center shrink-0">
                        <IconComponent className="size-3.5" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-[10px] sm:text-xs font-bold uppercase tracking-wider',
                          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500',
                        )}
                      >
                        {isActive ? (isBn ? 'সক্রিয়' : 'Active') : isBn ? 'নিষ্ক্রিয়' : 'Inactive'}
                      </span>
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => handleToggleStatus(item)}
                        aria-label={`Toggle ${item.code} status`}
                        className="scale-90"
                      />
                    </div>
                  </div>

                  {/* Modality Names */}
                  <div className="space-y-0.5 mb-3">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground line-clamp-1">
                      {item.nameBn || item.nameEn}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
                      {item.nameEn}
                    </p>
                  </div>

                  {/* Description note */}
                  <p className="text-[11px] sm:text-xs text-muted-foreground/90 line-clamp-2 mb-4 min-h-[2rem]">
                    {isBn ? visual.descBn : visual.descEn}
                  </p>

                  {/* Metric Chips: Duration & Fee */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    {/* Duration badge */}
                    <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-background/80 border border-border/60 text-xs font-semibold text-foreground">
                      <Clock className="size-3.5 text-sky-500 shrink-0" />
                      <span>{formatDuration(item.defaultDurationMin || 0)}</span>
                    </div>

                    {/* Price in BDT */}
                    <div className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <div className="flex items-center gap-1">
                        <Coins className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{formatCurrency(item.defaultPricePaisa || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons Footer */}
                <div className="px-3 sm:px-4 py-2.5 bg-card border-t border-border/60 flex items-center justify-between gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenQuickPrice(item)}
                    className="h-8 px-2 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1"
                    title={isBn ? 'দ্রুত মূল্য আপডেট' : 'Quick Price Update'}
                  >
                    <Coins className="size-3.5" />
                    <span>{isBn ? 'মূল্য' : 'Price'}</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title={isBn ? 'সম্পাদনা করুন' : 'Edit Modality'}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDelete(item)}
                      className="size-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      title={isBn ? 'নিষ্ক্রিয় বা মুছে ফেলুন' : 'Archive / Delete'}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Structured Data Table View */
        <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card/80 backdrop-blur-sm shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-24 text-xs font-bold uppercase tracking-wider">{isBn ? 'কোড' : 'Code'}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">{isBn ? 'মডালিটির নাম' : 'Modality Name'}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">{isBn ? 'সময়সীমা' : 'Duration'}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">{isBn ? 'মূল্য (টাকা)' : 'Price (BDT)'}</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">{isBn ? 'অবস্থা' : 'Status'}</TableHead>
                  <TableHead className="w-36 text-right text-xs font-bold uppercase tracking-wider">{isBn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModalities.map((item) => {
                  const visual = MODALITY_VISUAL_MAP[item.code] || DEFAULT_MODALITY_VISUAL;
                  const isActive = Boolean(item.isActive);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase border',
                            visual.badgeBg,
                            visual.badgeText,
                            visual.border,
                          )}
                        >
                          {item.code}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-sm text-foreground">{item.nameBn || item.nameEn}</div>
                        <div className="text-xs text-muted-foreground">{item.nameEn}</div>
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400 text-xs font-semibold">
                          <Clock className="size-3 shrink-0" />
                          <span>{formatDuration(item.defaultDurationMin || 0)}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                          <Coins className="size-3 shrink-0" />
                          <span>{formatCurrency(item.defaultPricePaisa || 0)}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleToggleStatus(item)}
                            className="scale-90"
                          />
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500',
                            )}
                          >
                            {isActive ? (isBn ? 'চালু' : 'Active') : isBn ? 'স্থগিত' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenQuickPrice(item)}
                            className="h-8 px-2 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                            title={isBn ? 'মূল্য পরিবর্তন' : 'Update Price'}
                          >
                            <Coins className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            title={isBn ? 'সম্পাদনা' : 'Edit'}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(item)}
                            className="size-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* DIALOG 1: Add New Modality Modal */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent
          className="max-w-lg w-full p-4 sm:p-6 rounded-2xl"
          onClose={() => setIsAddOpen(false)}
        >
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Plus className="size-5 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold">
                  {isBn ? 'নতুন থেরাপি মডালিটি যুক্ত করুন' : 'Add New Clinical Modality'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {isBn
                    ? 'থেরাপির সংক্ষিপ্ত কোড, নাম, নির্ধারিত সময় ও ফি নির্ধারণ করুন।'
                    : 'Configure code, bilingual titles, default session duration, and standard price.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Presets Chips Bar */}
          <div className="space-y-1.5 my-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              {isBn ? 'জনপ্রিয় মডালিটি টেমপ্লেট (এক ক্লিকে পূরণ করুন):' : 'Popular Modality Presets:'}
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-muted/30 rounded-xl border border-border/50">
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.code}
                  type="button"
                  onClick={() => handleApplyPreset(tpl)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-background border border-border/80 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{tpl.code}</span>
                  <span className="text-[11px] text-muted-foreground line-clamp-1">{tpl.nameEn.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5 my-3">
            {/* Code Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{isBn ? 'মডালিটি কোড (ইউনিক শর্টকোড)' : 'Modality Code (Unique uppercase)'}</span>
                <span className="text-[10px] text-muted-foreground">{isBn ? 'যেমনঃ IFT, UST, TENS' : 'e.g. IFT, UST, TENS'}</span>
              </label>
              <Input
                type="text"
                value={addCode}
                onChange={(e) => {
                  setAddCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                  if (addErrors.code) setAddErrors((prev) => ({ ...prev, code: '' }));
                }}
                maxLength={16}
                placeholder="IFT"
                className="font-mono uppercase font-bold text-base tracking-wider h-10 rounded-xl"
                error={addErrors.code}
              />
            </div>

            {/* English & Bengali Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  {isBn ? 'ইংরেজি নাম' : 'English Name'}
                </label>
                <Input
                  type="text"
                  value={addNameEn}
                  onChange={(e) => {
                    setAddNameEn(e.target.value);
                    if (addErrors.nameEn) setAddErrors((prev) => ({ ...prev, nameEn: '' }));
                  }}
                  placeholder="Interferential Therapy"
                  className="h-10 rounded-xl text-sm"
                  error={addErrors.nameEn}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  {isBn ? 'বাংলা নাম' : 'Bengali Name'}
                </label>
                <Input
                  type="text"
                  value={addNameBn}
                  onChange={(e) => {
                    setAddNameBn(e.target.value);
                    if (addErrors.nameBn) setAddErrors((prev) => ({ ...prev, nameBn: '' }));
                  }}
                  placeholder="ইন্টারফেরেনশিয়াল থেরাপি"
                  className="h-10 rounded-xl text-sm"
                  error={addErrors.nameBn}
                />
              </div>
            </div>

            {/* Duration Picker with Quick Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{isBn ? 'স্ট্যান্ডার্ড সেশন সময়কাল (মিনিট)' : 'Default Duration (Minutes)'}</span>
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {formatDuration(addDuration || 0)}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={240}
                  value={addDuration || ''}
                  onChange={(e) => {
                    setAddDuration(Math.max(1, parseInt(e.target.value, 10) || 0));
                    if (addErrors.duration) setAddErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="w-28 h-10 rounded-xl font-bold text-sm text-center"
                  error={addErrors.duration}
                />

                <div className="flex-1 flex flex-wrap gap-1">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setAddDuration(mins)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95',
                        addDuration === mins
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-muted hover:bg-muted/80 text-foreground',
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price in BDT with Quick Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{isBn ? 'সেশন ফি (টাকা / BDT)' : 'Session Fee in BDT'}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency((addPriceBdt || 0) * 100)} = {toBnDigits((addPriceBdt || 0) * 100)} Paisa
                </span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={addPriceBdt !== undefined ? addPriceBdt : ''}
                    onChange={(e) => {
                      setAddPriceBdt(Math.max(0, parseInt(e.target.value, 10) || 0));
                      if (addErrors.price) setAddErrors((prev) => ({ ...prev, price: '' }));
                    }}
                    className="pl-7 h-10 rounded-xl font-bold text-sm"
                    error={addErrors.price}
                  />
                </div>

                <div className="flex-1 flex flex-wrap gap-1">
                  {PRICE_PRESETS.map((fee) => (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => setAddPriceBdt(fee)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95',
                        addPriceBdt === fee
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-muted hover:bg-muted/80 text-foreground',
                      )}
                    >
                      ৳{fee}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isActionLoading}
              className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              onClick={handleCreateModality}
              disabled={isActionLoading}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer"
            >
              {isActionLoading ? (
                <RefreshCw className="size-4 animate-spin mr-1.5" />
              ) : (
                <Check className="size-4 mr-1.5" />
              )}
              {isBn ? 'সংরক্ষণ করুন' : 'Create Modality'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: Edit Modality Modal */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          className="max-w-lg w-full p-4 sm:p-6 rounded-2xl"
          onClose={() => setIsEditOpen(false)}
        >
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Edit2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <span>{isBn ? 'মডালিটি সম্পাদনা' : 'Edit Modality'}</span>
                  {editingModality && (
                    <Badge variant="outline" className="font-mono text-xs font-bold uppercase">
                      {editingModality.code}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {isBn
                    ? 'নাম, সেশন প্রটোকল সময়কাল, ফি এবং সক্রিয় অবস্থা পরিবর্তন করুন।'
                    : 'Modify titles, default session duration, per-session fee, and active state.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 my-3">
            {/* Status Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground block">
                  {isBn ? 'চিকিৎসা প্রদান স্থিতি' : 'Treatment Operational Status'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {editIsActive
                    ? isBn ? 'নতুন রোগীর সেশনে এই মডালিটি নির্বাচন করা যাবে।' : 'Active and available for therapy bookings.'
                    : isBn ? 'স্থগিত করা হয়েছে (নতুন বুকিং বন্ধ থাকবে)।' : 'Paused: hidden from new clinical bookings.'}
                </span>
              </div>
              <Switch
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
                className="scale-95"
              />
            </div>

            {/* English & Bengali Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  {isBn ? 'ইংরেজি নাম' : 'English Name'}
                </label>
                <Input
                  type="text"
                  value={editNameEn}
                  onChange={(e) => {
                    setEditNameEn(e.target.value);
                    if (editErrors.nameEn) setEditErrors((prev) => ({ ...prev, nameEn: '' }));
                  }}
                  className="h-10 rounded-xl text-sm"
                  error={editErrors.nameEn}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  {isBn ? 'বাংলা নাম' : 'Bengali Name'}
                </label>
                <Input
                  type="text"
                  value={editNameBn}
                  onChange={(e) => {
                    setEditNameBn(e.target.value);
                    if (editErrors.nameBn) setEditErrors((prev) => ({ ...prev, nameBn: '' }));
                  }}
                  className="h-10 rounded-xl text-sm"
                  error={editErrors.nameBn}
                />
              </div>
            </div>

            {/* Duration Picker with Quick Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{isBn ? 'সেশন সময়কাল (মিনিট)' : 'Session Duration (Minutes)'}</span>
                <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {formatDuration(editDuration || 0)}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={240}
                  value={editDuration || ''}
                  onChange={(e) => {
                    setEditDuration(Math.max(1, parseInt(e.target.value, 10) || 0));
                    if (editErrors.duration) setEditErrors((prev) => ({ ...prev, duration: '' }));
                  }}
                  className="w-28 h-10 rounded-xl font-bold text-sm text-center"
                  error={editErrors.duration}
                />

                <div className="flex-1 flex flex-wrap gap-1">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setEditDuration(mins)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95',
                        editDuration === mins
                          ? 'bg-sky-500 text-white shadow-xs'
                          : 'bg-muted hover:bg-muted/80 text-foreground',
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price in BDT with Quick Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{isBn ? 'সেশন ফি (টাকা / BDT)' : 'Session Fee in BDT'}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency((editPriceBdt || 0) * 100)} = {toBnDigits((editPriceBdt || 0) * 100)} Paisa
                </span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    ৳
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={editPriceBdt !== undefined ? editPriceBdt : ''}
                    onChange={(e) => {
                      setEditPriceBdt(Math.max(0, parseInt(e.target.value, 10) || 0));
                      if (editErrors.price) setEditErrors((prev) => ({ ...prev, price: '' }));
                    }}
                    className="pl-7 h-10 rounded-xl font-bold text-sm"
                    error={editErrors.price}
                  />
                </div>

                <div className="flex-1 flex flex-wrap gap-1">
                  {PRICE_PRESETS.map((fee) => (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => setEditPriceBdt(fee)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95',
                        editPriceBdt === fee
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-muted hover:bg-muted/80 text-foreground',
                      )}
                    >
                      ৳{fee}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isActionLoading}
              className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              onClick={handleUpdateModality}
              disabled={isActionLoading}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer"
            >
              {isActionLoading ? (
                <RefreshCw className="size-4 animate-spin mr-1.5" />
              ) : (
                <Check className="size-4 mr-1.5" />
              )}
              {isBn ? 'আপডেট সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: Quick Price Adjuster Modal */}
      {/* ========================================================================= */}
      <Dialog open={isQuickPriceOpen} onOpenChange={setIsQuickPriceOpen}>
        <DialogContent
          className="max-w-md w-full p-4 sm:p-6 rounded-2xl"
          onClose={() => setIsQuickPriceOpen(false)}
        >
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Coins className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{isBn ? 'দ্রুত মূল্য আপডেট' : 'Quick Price Adjustment'}</span>
                  {pricingModality && (
                    <Badge variant="emerald" className="font-mono text-xs uppercase">
                      {pricingModality.code}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {pricingModality?.nameBn || pricingModality?.nameEn}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-3">
            {/* Big Price Display & Adjuster */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                {isBn ? 'সেশন ফি (টাকা)' : 'Clinical Rate per Session'}
              </span>

              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickPriceBdt((prev) => Math.max(0, prev - 50))}
                  className="size-10 rounded-xl text-base font-bold cursor-pointer"
                >
                  -50
                </Button>

                <div className="flex items-baseline justify-center gap-1 min-w-[140px]">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                    ৳{isBn ? toBnDigits(quickPriceBdt) : quickPriceBdt}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickPriceBdt((prev) => prev + 50)}
                  className="size-10 rounded-xl text-base font-bold cursor-pointer"
                >
                  +50
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono">
                {toBnDigits(quickPriceBdt * 100)} Paisa
              </div>
            </div>

            {/* Quick Preset Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground block">
                {isBn ? 'স্ট্যান্ডার্ড ফি প্রিসেট:' : 'Quick Presets:'}
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {PRICE_PRESETS.map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setQuickPriceBdt(fee)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95',
                      quickPriceBdt === fee
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-background hover:bg-muted/80 text-foreground border-border/80',
                    )}
                  >
                    ৳{fee}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuickPriceOpen(false)}
              disabled={isActionLoading}
              className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              onClick={handleSaveQuickPrice}
              disabled={isActionLoading}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer"
            >
              {isActionLoading ? (
                <RefreshCw className="size-4 animate-spin mr-1.5" />
              ) : (
                <Check className="size-4 mr-1.5" />
              )}
              {isBn ? 'নতুন মূল্য নিশ্চিত করুন' : 'Confirm New Price'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 4: Delete / Archive Confirmation Modal */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent
          className="max-w-md w-full p-4 sm:p-6 rounded-2xl"
          onClose={() => setIsDeleteOpen(false)}
        >
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {isBn ? 'মডালিটি মুছে ফেলা বা নিষ্ক্রিয়করণ' : 'Archive or Delete Modality'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {deletingModality?.code} — {deletingModality?.nameBn || deletingModality?.nameEn}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 my-3">
            {/* Explanatory Safety Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{isBn ? 'চিকিৎসা ইতিহাস সুরক্ষা নিশ্চিতকরণ' : 'Patient History Preservation Guarantee'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isBn
                  ? 'এই মডালিটি মুছে ফেললেও পূর্বের কোনো রোগীর চিকিৎসা ইতিহাস, প্রেসক্রিপশন কিংবা বিলিং রসিদের ডেটা নষ্ট হবে না। যদি কোনো রোগীর ফাইলে এই কোড ব্যবহৃত হয়ে থাকে, তবে সিস্টেম এটিকে স্থায়ীভাবে না মুছে স্বয়ংক্রিয়ভাবে "নিষ্ক্রিয়" হিসেবে আর্কাইভে রাখবে যাতে ভবিষ্যতের নতুন বুকিংয়ে এটি আর না দেখা যায়।'
                  : 'Deleting this modality will safely preserve all past clinical records, therapy sessions, and billing history. If previously used, the system automatically deactivates and archives it so new appointments cannot select it.'}
              </p>
            </div>

            {/* Target Modality Summary */}
            {deletingModality && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1 font-medium">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isBn ? 'কোড:' : 'Code:'}</span>
                  <span className="font-mono font-bold text-foreground">{deletingModality.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isBn ? 'নাম:' : 'Name:'}</span>
                  <span className="font-bold text-foreground">{deletingModality.nameBn || deletingModality.nameEn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isBn ? 'বর্তমান ফি:' : 'Current Fee:'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(deletingModality.defaultPricePaisa)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isActionLoading}
              className="h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {isBn ? 'ফিরে যান' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteModality}
              disabled={isActionLoading}
              className="h-10 rounded-xl font-bold text-xs sm:text-sm cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isActionLoading ? (
                <RefreshCw className="size-4 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="size-4 mr-1.5" />
              )}
              {isBn ? 'নিষ্ক্রিয় / অপসারণ নিশ্চিত করুন' : 'Confirm Archive / Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
