// apps/web/components/admin/BulletinManagementView.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Volume2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/i18n';
import {
  listBulletinsAction,
  createBulletinAction,
  updateBulletinAction,
  deleteBulletinAction,
  type BulletinRecord,
} from '../../lib/actions/bulletins';

export default function BulletinManagementView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [isPending, startTransition] = useTransition();

  const [bulletins, setBulletins] = useState<BulletinRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    contentBn: '',
    contentEn: '',
    isUrgent: false,
    isActive: true,
    priority: 0,
  });

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [selectedBulletin, setSelectedBulletin] = useState<BulletinRecord | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    contentBn: '',
    contentEn: '',
    isUrgent: false,
    isActive: true,
    priority: 0,
  });

  const loadBulletins = async () => {
    setIsLoading(true);
    const res = await listBulletinsAction();
    if (res.success && res.data) {
      setBulletins(res.data);
    } else {
      toast.error(res.error || (isBn ? 'বুলেটিন লোড ব্যর্থ' : 'Failed to load bulletins'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadBulletins();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.contentBn || !createForm.contentEn) {
      toast.error(isBn ? 'সকল প্রয়োজনীয় ঘর পূরণ করুন' : 'Please fill all required fields');
      return;
    }

    startTransition(async () => {
      const res = await createBulletinAction({
        title: createForm.title,
        contentBn: createForm.contentBn,
        contentEn: createForm.contentEn,
        isUrgent: createForm.isUrgent,
        isActive: createForm.isActive,
        priority: Number(createForm.priority) || 0,
      });

      if (res.success && res.data) {
        toast.success(isBn ? 'নতুন বুলেটিন সফলভাবে প্রকাশিত হয়েছে' : 'Bulletin created successfully');
        setBulletins((prev) => [res.data!, ...prev]);
        setIsCreateOpen(false);
        setCreateForm({
          title: '',
          contentBn: '',
          contentEn: '',
          isUrgent: false,
          isActive: true,
          priority: 0,
        });
      } else {
        toast.error(res.error || (isBn ? 'বুলেটিন প্রকাশ ব্যর্থ' : 'Failed to create bulletin'));
      }
    });
  };

  const openEditModal = (b: BulletinRecord) => {
    setSelectedBulletin(b);
    setEditForm({
      title: b.title,
      contentBn: b.contentBn,
      contentEn: b.contentEn,
      isUrgent: Boolean(b.isUrgent),
      isActive: Boolean(b.isActive),
      priority: b.priority,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBulletin) return;

    startTransition(async () => {
      const res = await updateBulletinAction(selectedBulletin.id, {
        title: editForm.title,
        contentBn: editForm.contentBn,
        contentEn: editForm.contentEn,
        isUrgent: editForm.isUrgent,
        isActive: editForm.isActive,
        priority: Number(editForm.priority) || 0,
      });

      if (res.success && res.data) {
        toast.success(isBn ? 'বুলেটিন সফলভাবে হালনাগাদ হয়েছে' : 'Bulletin updated successfully');
        setBulletins((prev) => prev.map((item) => (item.id === selectedBulletin.id ? res.data! : item)));
        setIsEditOpen(false);
        setSelectedBulletin(null);
      } else {
        toast.error(res.error || (isBn ? 'হালনাগাদ ব্যর্থ' : 'Failed to update bulletin'));
      }
    });
  };

  const handleToggleActive = async (b: BulletinRecord) => {
    const nextState = b.isActive === 1 ? false : true;
    startTransition(async () => {
      const res = await updateBulletinAction(b.id, { isActive: nextState });
      if (res.success && res.data) {
        setBulletins((prev) => prev.map((item) => (item.id === b.id ? res.data! : item)));
        toast.success(
          nextState
            ? isBn
              ? 'বুলেটিন সক্রিয় করা হয়েছে'
              : 'Bulletin activated'
            : isBn
            ? 'বুলেটিন নিষ্ক্রিয় করা হয়েছে'
            : 'Bulletin deactivated',
        );
      }
    });
  };

  const handleToggleUrgent = async (b: BulletinRecord) => {
    const nextState = b.isUrgent === 1 ? false : true;
    startTransition(async () => {
      const res = await updateBulletinAction(b.id, { isUrgent: nextState });
      if (res.success && res.data) {
        setBulletins((prev) => prev.map((item) => (item.id === b.id ? res.data! : item)));
        toast.success(
          nextState
            ? isBn
              ? 'জরুরি ঘোষণা হিসেবে চিহ্নিত করা হয়েছে'
              : 'Marked as urgent announcement'
            : isBn
            ? 'স্বাভাবিক নোটিশে রূপান্তরিত হয়েছে'
            : 'Reverted to regular announcement',
        );
      }
    });
  };

  const handleDelete = async (b: BulletinRecord) => {
    if (
      !confirm(
        isBn
          ? `আপনি কি নিশ্চিতভাবে "${b.title}" বুলেটিনটি মুছে ফেলতে চান?`
          : `Are you sure you want to delete bulletin "${b.title}"?`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteBulletinAction(b.id);
      if (res.success) {
        toast.success(isBn ? 'বুলেটিন মুছে ফেলা হয়েছে' : 'Bulletin deleted successfully');
        setBulletins((prev) => prev.filter((item) => item.id !== b.id));
      } else {
        toast.error(res.error || (isBn ? 'মুছে ফেলতে ব্যর্থ' : 'Failed to delete bulletin'));
      }
    });
  };

  // Active bulletins for preview
  const activeBulletins = bulletins.filter((b) => b.isActive === 1);

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {isBn ? 'টিভি স্ক্রিন বুলেটিন ও স্ক্রল নোটিশ' : 'TV Screen Bulletins & Marquee'}
              </h1>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                {bulletins.length} {isBn ? 'টি নোটিশ' : 'notices'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isBn
                ? 'ওয়েটিং রুম টিভি স্ক্রিনে বাস্তব সময়ে স্ক্রলিং বুলেটিন, জরুরি সতর্কতা ও স্বাস্থ্যবার্তা প্রচার করুন।'
                : 'Broadcast live scrolling ticker notices, emergency medical alerts, and health tips on TV waiting screens.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBulletins}
            disabled={isLoading || isPending}
            className="h-9 px-3 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-xs cursor-pointer touch-manipulation active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'নতুন বুলেটিন তৈরি' : 'Add New Bulletin'}</span>
          </Button>
        </div>
      </div>

      {/* Live Marquee Preview Banner */}
      <Card className="rounded-2xl border border-emerald-500/30 bg-zinc-950 text-white overflow-hidden shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 font-bold text-xs uppercase tracking-wider shrink-0 text-white">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{isBn ? 'লাইভ টিভি প্রিভিউ' : 'Live TV Preview'}</span>
          </div>

          <div className="flex-1 py-2.5 px-4 overflow-hidden relative">
            {activeBulletins.length === 0 ? (
              <span className="text-xs text-zinc-400 italic">
                {isBn
                  ? 'বর্তমানে কোনো সক্রিয় বুলেটিন নেই। নিচে নতুন বুলেটিন যুক্ত করে সক্রিয় করুন।'
                  : 'No active bulletins currently displayed on TV screens. Create and activate a bulletin below.'}
              </span>
            ) : (
              <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none animate-marquee text-xs sm:text-sm font-medium">
                {activeBulletins.map((b) => (
                  <div key={b.id} className="inline-flex items-center gap-2 shrink-0">
                    {b.isUrgent === 1 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>{isBn ? 'জরুরি ঘোষণা' : 'URGENT'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        {isBn ? 'বিজ্ঞপ্তি' : 'NOTICE'}
                      </span>
                    )}
                    <span className="font-semibold text-white">
                      {isBn ? b.contentBn : b.contentEn}
                    </span>
                    <span className="text-zinc-600">✦</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Bulletins Table */}
      <Card className="rounded-2xl border border-border overflow-hidden shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                {isBn ? 'সকল বুলেটিন তালিকা' : 'Registered Broadcast Bulletins'}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                {isBn
                  ? 'সক্রিয় বুলেটিনগুলো ওয়েটিং রুম ও টিভি ডিসপ্লেতে গুরুত্ব অনুযায়ী পরপর প্রচারিত হয়।'
                  : 'Active bulletins circulate across clinic waiting room TV displays ordered by priority.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {bulletins.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">
                {isBn ? 'কোনো বুলেটিন পাওয়া যায়নি' : 'No bulletins registered yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isBn
                  ? 'উপরের "নতুন বুলেটিন তৈরি" বাটনে ক্লিক করে প্রথম ঘোষণাটি যুক্ত করুন।'
                  : 'Click "Add New Bulletin" above to publish your first waiting room notice.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[220px]">{isBn ? 'শিরোনাম' : 'Title'}</TableHead>
                    <TableHead>{isBn ? 'বাংলা বার্তা (স্ক্রলিং)' : 'Bengali Content'}</TableHead>
                    <TableHead>{isBn ? 'ইংরেজি বার্তা' : 'English Content'}</TableHead>
                    <TableHead className="w-[120px] text-center">{isBn ? 'টাইপ' : 'Urgency'}</TableHead>
                    <TableHead className="w-[100px] text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="w-[140px] text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulletins.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/30 border-border">
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{b.title}</span>
                          {b.priority > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-500">
                              P{b.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(b.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US')}</span>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-xs sm:max-w-md">
                        <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">
                          {b.contentBn}
                        </p>
                      </TableCell>

                      <TableCell className="max-w-xs sm:max-w-md">
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {b.contentEn}
                        </p>
                      </TableCell>

                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleUrgent(b)}
                          disabled={isPending}
                          className="cursor-pointer transition-transform active:scale-95"
                          title={isBn ? 'ক্লিক করে পরিবর্তন করুন' : 'Click to toggle urgency'}
                        >
                          {b.isUrgent === 1 ? (
                            <Badge className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1 shadow-xs">
                              <Flame className="w-3 h-3" />
                              <span>{isBn ? '🚨 জরুরি' : 'URGENT'}</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-border text-muted-foreground hover:bg-muted font-medium text-xs">
                              {isBn ? 'সাধারণ' : 'Normal'}
                            </Badge>
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={b.isActive === 1}
                            onCheckedChange={() => handleToggleActive(b)}
                            disabled={isPending}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(b)}
                            disabled={isPending}
                            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title={isBn ? 'সম্পাদনা' : 'Edit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(b)}
                            disabled={isPending}
                            className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 cursor-pointer"
                            title={isBn ? 'মুছুন' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE BULLETIN DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <Megaphone className="w-5 h-5 text-emerald-500" />
              <span>{isBn ? 'নতুন স্ক্রলিং বুলেটিন তৈরি' : 'Publish New TV Bulletin'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isBn
                ? 'টিভি স্ক্রিনে স্ক্রল করার জন্য বাংলা ও ইংরেজি উভয় বার্তা লিখুন।'
                : 'Write notice text in both Bengali and English for waiting room screens.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? 'বুলেটিন শিরোনাম' : 'Internal Title'}</Label>
              <Input
                placeholder={isBn ? 'যেমন: বিনামূল্যে স্বাস্থ্য ক্যাম্প বা নামাজের বিরতি' : 'e.g. Free Health Camp or Prayer Break'}
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? 'বাংলা নোটিশ বার্তা (স্ক্রলিং)' : 'Bengali Message'}</Label>
              <Textarea
                rows={3}
                placeholder={isBn ? 'টিভি স্ক্রিনে যা স্ক্রল করবে তা লিখুন...' : 'Write Bengali ticker text...'}
                value={createForm.contentBn}
                onChange={(e) => setCreateForm({ ...createForm, contentBn: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? 'ইংরেজি নোটিশ বার্তা' : 'English Message'}</Label>
              <Textarea
                rows={2}
                placeholder={isBn ? 'ইংরেজি বার্তা লিখুন...' : 'Write English ticker text...'}
                value={createForm.contentEn}
                onChange={(e) => setCreateForm({ ...createForm, contentEn: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    <span>{isBn ? 'জরুরি ঘোষণা' : 'Urgent Alert'}</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground">{isBn ? 'উজ্জ্বল লাল ফ্ল্যাশ করবে' : 'Red alert ticker'}</p>
                </div>
                <Switch
                  checked={createForm.isUrgent}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, isUrgent: checked })}
                  className="data-[state=checked]:bg-rose-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isBn ? 'তাত্ক্ষণিক সক্রিয়' : 'Active'}</span>
                  </Label>
                  <p className="text-[10px] text-muted-foreground">{isBn ? 'স্ক্রিনে প্রদর্শিত হবে' : 'Broadcast to screens'}</p>
                </div>
                <Switch
                  checked={createForm.isActive}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, isActive: checked })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                {isPending ? (isBn ? 'প্রকাশ হচ্ছে...' : 'Publishing...') : (isBn ? 'প্রকাশ করুন' : 'Publish')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT BULLETIN DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <Edit2 className="w-5 h-5 text-emerald-500" />
              <span>{isBn ? 'বুলেটিন সম্পাদনা' : 'Edit Bulletin'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 py-2" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? 'বুলেটিন শিরোনাম' : 'Internal Title'}</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? 'বাংলা নোটিশ বার্তা (স্ক্রলিং)' : 'Bengali Message'}</Label>
              <Textarea
                rows={3}
                value={editForm.contentBn}
                onChange={(e) => setEditForm({ ...editForm, contentBn: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{isBn ? 'ইংরেজি নোটিশ বার্তা' : 'English Message'}</Label>
              <Textarea
                rows={2}
                value={editForm.contentEn}
                onChange={(e) => setEditForm({ ...editForm, contentEn: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    <span>{isBn ? 'জরুরি ঘোষণা' : 'Urgent Alert'}</span>
                  </Label>
                </div>
                <Switch
                  checked={editForm.isUrgent}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isUrgent: checked })}
                  className="data-[state=checked]:bg-rose-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isBn ? 'সক্রিয়' : 'Active'}</span>
                  </Label>
                </div>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                {isPending ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'সংরক্ষণ করুন' : 'Save Changes')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
