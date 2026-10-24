'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Clock,
  UserCheck,
  FileText,
  CreditCard,
  UserPlus,
  Stethoscope,
  Volume2,
  PhoneCall,
  CheckCircle,
  XCircle,
  RotateCcw,
  Loader2,
  Calendar,
  Activity,
} from 'lucide-react';

interface PatientTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  patientName?: string;
}

export function PatientTimelineModal({
  open,
  onOpenChange,
  patientId,
  patientName,
}: PatientTimelineModalProps) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const loadTimeline = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await api.patients.getTimeline(patientId);
      setEvents(res || []);
    } catch (err: any) {
      console.error('Failed to load timeline:', err);
      toast.error('টাইমলাইন লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && patientId) {
      loadTimeline();
    } else {
      setEvents([]);
    }
  }, [open, patientId]);

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'registered':
        return <UserPlus className="size-4 text-blue-500" />;
      case 'checked_in':
        return <UserCheck className="size-4 text-emerald-500" />;
      case 'intake_form_submitted':
      case 'intake_form_created':
        return <FileText className="size-4 text-teal-500" />;
      case 'forwarded_to_cashier':
        return <CreditCard className="size-4 text-purple-500" />;
      case 'fee_paid':
      case 'billed':
        return <CheckCircle className="size-4 text-emerald-500" />;
      case 'admitted_to_consultation_queue':
        return <Stethoscope className="size-4 text-amber-500" />;
      case 'called_chamber':
        return <Volume2 className="size-4 text-rose-500 animate-pulse" />;
      case 'recalled':
        return <PhoneCall className="size-4 text-orange-500" />;
      case 'in_consultation':
        return <Activity className="size-4 text-emerald-500" />;
      case 'call_cancelled':
        return <XCircle className="size-4 text-slate-400" />;
      case 'completed':
        return <CheckCircle className="size-4 text-blue-500" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const getStepBadge = (step: string) => {
    switch (step) {
      case 'registered':
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30">নিবন্ধন</Badge>;
      case 'checked_in':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">চেক-ইন</Badge>;
      case 'intake_form_submitted':
        return <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/30">তথ্য ফরম</Badge>;
      case 'forwarded_to_cashier':
        return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30">ক্যাশিয়ার</Badge>;
      case 'fee_paid':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">ফি পরিশোধ</Badge>;
      case 'admitted_to_consultation_queue':
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">সিরিয়াল কিউ</Badge>;
      case 'called_chamber':
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30">চেম্বারে ডাক</Badge>;
      case 'recalled':
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30">পুনরায় ডাক</Badge>;
      case 'in_consultation':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">পরামর্শ কক্ষ</Badge>;
      case 'call_cancelled':
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/30">বাতিল</Badge>;
      default:
        return <Badge variant="outline">{step}</Badge>;
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 border-emerald-500/30 bg-background/95 backdrop-blur-xl">
        <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-md px-6 py-4 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Clock className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                রোগীর পূর্ণাঙ্গ অ্যাক্টিভিটি টাইমলাইন (Patient Timeline)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {patientName ? `রোগী: ${patientName} • ` : ''}প্রতিটি ধাপ ও সময়ের সম্পূর্ণ বিবরণী
              </DialogDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadTimeline}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </div>

        <div className="p-6">
          {loading && events.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
              <span className="text-xs">টাইমলাইন লোড হচ্ছে...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Clock className="size-8 mx-auto opacity-30" />
              <p className="text-sm">এই রোগীর জন্য এখনও কোনো টাইমলাইন রেকর্ড পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
              {events.map((ev, idx) => (
                <div key={ev.id || idx} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-6 top-1.5 size-6 rounded-full bg-card border-2 border-border/80 flex items-center justify-center shadow-sm group-hover:border-emerald-500 transition-colors">
                    {getStepIcon(ev.step)}
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card/70 transition-all space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-foreground">
                          {ev.titleBn || ev.titleEn}
                        </span>
                        {getStepBadge(ev.step)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                        <Calendar className="size-3" />
                        <span>{formatDate(ev.occurredAt)}</span>
                        <span>•</span>
                        <Clock className="size-3" />
                        <span className="font-semibold text-foreground/80">{formatTime(ev.occurredAt)}</span>
                      </div>
                    </div>

                    {(ev.descriptionBn || ev.descriptionEn) && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {ev.descriptionBn || ev.descriptionEn}
                      </p>
                    )}

                    {ev.actorName && (
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/80 border-t border-border/40">
                        <span className="font-medium">সম্পাদনকারী:</span>
                        <span className="text-foreground">{ev.actorName}</span>
                        {ev.actorRole && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                            {ev.actorRole}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
