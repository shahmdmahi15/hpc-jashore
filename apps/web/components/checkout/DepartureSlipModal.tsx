// apps/web/components/checkout/DepartureSlipModal.tsx
'use client';

import React, { useRef } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building2,
  Phone,
  Banknote,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useLanguage } from '../../lib/i18n';
import type { DepartureSlipData } from '../../lib/actions/checkout';

interface DepartureSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slip: DepartureSlipData | null;
}

export function DepartureSlipModal({ open, onOpenChange, slip }: DepartureSlipModalProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  if (!slip) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" />
              {language === 'bn' ? 'রোগী প্রস্থান ও ডিসচার্জ স্লিপ' : 'Departure Clearance Receipt'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Printable Receipt Body */}
        <div ref={printRef} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm font-sans">
          {/* Clinic Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-border/60">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground uppercase">
              {slip.clinic.nameEn}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              {slip.clinic.nameBn}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {slip.clinic.address} • Hotline: {slip.clinic.hotline}
            </p>
            <div className="pt-2">
              <Badge variant="outline" className="text-[11px] font-mono uppercase px-2.5 py-0.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                {language === 'bn' ? '✓ প্রস্থান ছাড়পত্র সম্পন্ন' : '✓ DEPARTURE CLEARED'}
              </Badge>
            </div>
          </div>

          {/* Slip Meta */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 text-[11px] font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px]">RECEIPT / SLIP #</span>
              <span className="font-bold text-foreground">{slip.slipNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px]">VISIT TOKEN</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">#{slip.tokenNumber.toString().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Patient Details */}
          <div className="space-y-1.5 p-3 rounded-xl border border-border/50 bg-card">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">{slip.patient.nameEn}</span>
              <span className="font-mono text-[11px] font-bold text-primary">{slip.patient.mrn}</span>
            </div>
            {slip.patient.nameBn && (
              <p className="text-xs text-muted-foreground">{slip.patient.nameBn}</p>
            )}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 flex-wrap">
              {slip.patient.phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="size-3 text-sky-500" />
                  {slip.patient.phone}
                </span>
              )}
              {slip.patient.ageYears && (
                <span>{slip.patient.ageYears} Yrs • {slip.patient.gender}</span>
              )}
            </div>
          </div>

          {/* Timings */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
              <span className="text-[10px] text-muted-foreground block">{language === 'bn' ? 'আগমন সময়' : 'Entry Time'}</span>
              <span className="font-semibold text-foreground font-mono">
                {slip.entryTime ? new Date(slip.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 border border-border/30 text-right">
              <span className="text-[10px] text-muted-foreground block">{language === 'bn' ? 'প্রস্থান সময়' : 'Departure Time'}</span>
              <span className="font-semibold text-foreground font-mono">
                {new Date(slip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Doctor Details */}
          {slip.doctor && (
            <div className="p-2.5 rounded-lg bg-muted/20 border border-border/40 text-xs space-y-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'পরামর্শক ডাক্তার' : 'Attending Doctor'}</span>
              <p className="font-bold text-foreground">{slip.doctor.name}</p>
              <p className="text-[11px] text-muted-foreground">{slip.doctor.specialization} • {slip.doctor.chamber}</p>
            </div>
          )}

          {/* Financial Settlement */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              {language === 'bn' ? 'আর্থিক হিসাব বিবরণী' : 'Financial Statement'}
            </span>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{language === 'bn' ? 'মোট বিল' : 'Total Billed:'}</span>
                <span className="font-bold font-mono">৳{slip.financial.totalBillTaka}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{language === 'bn' ? 'পরিশোধিত' : 'Paid Amount:'}</span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">৳{slip.financial.paidTaka}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-black">
                <span>{language === 'bn' ? 'অবশিষ্ট বকেয়া' : 'Balance Due:'}</span>
                <span className={`font-mono ${slip.financial.dueTaka > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  ৳{slip.financial.dueTaka}
                </span>
              </div>
            </div>
          </div>

          {/* Follow-Up & Next Appointment */}
          {slip.nextFollowUpDate && (
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs space-y-1">
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase flex items-center gap-1">
                <Calendar className="size-3" />
                {language === 'bn' ? 'পরবর্তী সাক্ষাতের সম্ভাব্য তারিখ' : 'Next Follow-Up Appointment'}
              </span>
              <p className="font-bold text-sm text-foreground font-mono">
                {new Date(slip.nextFollowUpDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Discharge Notes */}
          {slip.dischargeNotes && (
            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{language === 'bn' ? 'পরামর্শ ও নির্দেশিকা' : 'Discharge Instructions'}</span>
              <p className="text-[11px] text-foreground leading-relaxed">{slip.dischargeNotes}</p>
            </div>
          )}

          {/* Footer note */}
          <p className="text-[10px] text-center text-muted-foreground pt-2 border-t border-dashed border-border/60">
            {language === 'bn'
              ? 'সুস্থ থাকুন, হেলথ অ্যান্ড পেইন কেয়ার সেন্টারের সাথে থাকার জন্য ধন্যবাদ।'
              : 'Thank you for choosing Health & Pain Care Center. Wish you a speedy recovery!'}
          </p>
        </div>

        <DialogFooter className="p-3 sm:p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
          >
            <Printer className="size-3.5 mr-1.5" />
            {language === 'bn' ? 'রশিদ প্রিন্ট করুন' : 'Print Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
