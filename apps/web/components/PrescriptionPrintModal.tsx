// apps/web/components/PrescriptionPrintModal.tsx
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, FileText, Stethoscope, Phone, MapPin, Calendar, QrCode } from 'lucide-react';

export interface PrescriptionData {
  id: string;
  rxNumber?: string;
  patient: {
    id?: string;
    mrn: string;
    nameEn: string;
    nameBn?: string;
    ageYears?: number;
    gender: string;
    bloodGroup?: string;
    phone?: string;
    address?: string;
  };
  doctor: {
    id?: string;
    name: string;
    specialization?: string;
    degrees?: string;
    chamberRoom?: string;
  };
  clinicalNotes?: {
    chiefComplaints?: string;
    diagnosis?: string;
    painScore?: number;
    bp?: string;
    weight?: string;
    pulse?: string;
  };
  medicines: Array<{
    brandName: string;
    genericName?: string;
    dosage: string;
    duration: string;
    instructions?: string;
  }>;
  modalities?: Array<{
    modalityName: string;
    sessionsPrescribed?: number;
    frequency?: string;
    notes?: string;
  }>;
  advice?: string;
  nextVisitDate?: string;
  createdAt: string;
}

interface PrescriptionPrintModalProps {
  prescription: PrescriptionData | null;
  onClose: () => void;
}

export default function PrescriptionPrintModal({
  prescription,
  onClose,
}: PrescriptionPrintModalProps) {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  const rxDate = new Date(prescription.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const rxNumber = prescription.rxNumber || `RX-${prescription.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={!!prescription} onOpenChange={(op) => !op && onClose()}>
      <DialogContent
        className="max-w-[620px] max-h-[96vh] overflow-y-auto p-3 sm:p-5 bg-background border-border"
        onClose={onClose}
      >
        <DialogHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>প্রেসক্রিপশন প্রিন্ট প্রিভিউ (5.50" × 8.27")</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">
                Rx No: <strong className="text-foreground">{rxNumber}</strong> · Patient MRN: <strong className="text-foreground">{prescription.patient.mrn}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                HPC Custom Paper: 5.50" × 8.27"
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scoped CSS for strict 5.50in x 8.27in paper */}
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: 5.5in 8.27in;
            margin: 4mm 5mm;
          }
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body * {
              visibility: hidden;
            }
            .prescription-sheet-container,
            .prescription-sheet-container * {
              visibility: visible !important;
            }
            .prescription-sheet-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 5.5in !important;
              height: 8.27in !important;
              max-width: 5.5in !important;
              max-height: 8.27in !important;
              padding: 4mm 5mm !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
            }
          }
        ` }} />

        {/* Printable Prescription Body: Exactly 5.50in x 8.27in ratio */}
        <div
          className="prescription-sheet-container bg-white text-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-300 shadow-md mx-auto my-1 w-full font-sans flex flex-col justify-between"
          style={{
            maxWidth: '5.5in',
            minHeight: '8.27in',
          }}
        >
          {/* TOP SECTION: Header, Demographics, Diagnosis */}
          <div>
            {/* Header / Brand Banner */}
            <div className="border-b-2 border-emerald-600 pb-2.5 flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <img
                  src="/hpclogo-transparent.png"
                  alt="HPC Logo"
                  width={44}
                  height={44}
                  className="w-11 h-11 object-contain shrink-0 mt-0.5"
                  style={{ width: '44px', height: '44px', maxWidth: '44px', maxHeight: '44px', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="text-sm sm:text-base font-black text-emerald-800 leading-tight tracking-tight">
                    HEALTH AND PAIN CARE CENTER
                  </h1>
                  <h2 className="text-[11px] sm:text-xs font-bold text-zinc-800 leading-tight">
                    এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                  </h2>
                  <p className="text-[9px] text-zinc-600 mt-0.5 leading-snug">
                    চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                  </p>
                  <p className="text-[8.5px] text-zinc-500 font-mono">
                    হটলাইন: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpc@toufiquzzaman.com
                  </p>
                </div>
              </div>

              {/* Doctor Details */}
              <div className="text-right text-[10px] shrink-0 max-w-[170px]">
                <div className="font-extrabold text-xs text-zinc-900 leading-tight">
                  {prescription.doctor.name || 'ডাঃ মোঃ তৌফিক উজ জামান'}
                </div>
                <div className="text-[9px] text-zinc-700 font-semibold leading-tight mt-0.5">
                  {prescription.doctor.degrees || 'BPT (DU), PGD (Acu, China), MDMR (Pain, DU), MPH'}
                </div>
                <div className="text-[8.5px] text-emerald-700 font-bold mt-0.5">
                  {prescription.doctor.specialization || 'Consultant Physiotherapist'}
                </div>
                {prescription.doctor.chamberRoom && (
                  <div className="text-[8.5px] text-zinc-500 font-mono">
                    {prescription.doctor.chamberRoom}
                  </div>
                )}
              </div>
            </div>

            {/* Patient Demographics Strip */}
            <div className="my-2 p-1.5 rounded-lg bg-emerald-50/50 border border-emerald-200/70 grid grid-cols-4 gap-1.5 text-[9.5px]">
              <div>
                <span className="text-zinc-500">Patient:</span>{' '}
                <strong className="text-zinc-900">{prescription.patient.nameEn}</strong>
                {prescription.patient.nameBn && ` (${prescription.patient.nameBn})`}
              </div>
              <div>
                <span className="text-zinc-500">Age/Sex:</span>{' '}
                <strong>
                  {prescription.patient.ageYears ? `${prescription.patient.ageYears}Y` : '-'}{' '}
                  / {prescription.patient.gender}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500">MRN:</span>{' '}
                <strong className="font-mono">{prescription.patient.mrn}</strong>
              </div>
              <div className="text-right">
                <span className="text-zinc-500">Date:</span>{' '}
                <strong className="font-mono">{rxDate}</strong>
              </div>
            </div>

            {/* Vitals & Diagnosis Banner */}
            <div className="mb-2 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-zinc-600 font-medium">Provisional Diagnosis:</span>{' '}
                <strong className="text-emerald-800 font-bold">
                  {prescription.clinicalNotes?.diagnosis || 'Musculoskeletal Pain Disorder / ব্যথাজনিত সমস্যা'}
                </strong>
              </div>
              <div className="flex items-center gap-2 font-mono text-[9px]">
                {prescription.clinicalNotes?.bp && (
                  <span>BP: <strong>{prescription.clinicalNotes.bp}</strong></span>
                )}
                {prescription.clinicalNotes?.weight && (
                  <span>Wt: <strong>{prescription.clinicalNotes.weight}kg</strong></span>
                )}
                {prescription.clinicalNotes?.painScore !== undefined && (
                  <span className="font-bold text-amber-700">
                    VAS: {prescription.clinicalNotes.painScore}/10
                  </span>
                )}
              </div>
            </div>

            {/* Main Clinical Body: Left (Modality / Plan / Advice) & Right (Rx Medicines) */}
            <div className="grid grid-cols-12 gap-3 min-h-[320px] pt-1 border-t border-zinc-200 text-[10px]">
              {/* Left Column: Complaints, Therapy Plan & Advice (4.5 / 12) */}
              <div className="col-span-5 border-r border-zinc-200 pr-2 space-y-2.5">
                {prescription.clinicalNotes?.chiefComplaints && (
                  <div>
                    <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-[9px] mb-0.5">
                      Chief Complaints:
                    </h3>
                    <p className="text-zinc-800 leading-snug text-[9.5px]">
                      {prescription.clinicalNotes.chiefComplaints}
                    </p>
                  </div>
                )}

                {/* Physiotherapy Modality Plan */}
                <div>
                  <h3 className="font-extrabold text-emerald-800 uppercase tracking-wider text-[9.5px] mb-1 flex items-center gap-1">
                    <span>⚡ Physiotherapy Plan:</span>
                  </h3>
                  {prescription.modalities && prescription.modalities.length > 0 ? (
                    <ul className="space-y-1 pl-2.5 list-disc text-[9px]">
                      {prescription.modalities.map((m, idx) => (
                        <li key={idx} className="leading-tight">
                          <strong className="text-zinc-900">{m.modalityName}</strong>
                          <div className="text-zinc-600 font-mono text-[8.5px]">
                            {m.sessionsPrescribed ?? 10} sessions ({m.frequency || 'Daily'})
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-500 italic text-[9px]">
                      Exercise therapy, stretching &amp; posture correction
                    </p>
                  )}
                </div>

                {/* Clinical Advice */}
                {prescription.advice && (
                  <div className="pt-1.5 border-t border-zinc-200">
                    <h3 className="font-bold text-zinc-700 uppercase tracking-wider text-[9px] mb-0.5">
                      Advice / উপদেশ:
                    </h3>
                    <p className="text-zinc-800 whitespace-pre-line leading-relaxed text-[9px]">
                      {prescription.advice}
                    </p>
                  </div>
                )}

                {/* Follow-up Date */}
                {prescription.nextVisitDate && (
                  <div className="p-1.5 rounded bg-sky-50 border border-sky-200 text-sky-900 text-[9px]">
                    <strong>Next Follow-up:</strong> {prescription.nextVisitDate}
                  </div>
                )}
              </div>

              {/* Right Column: ℞ Medicines (7.5 / 12) */}
              <div className="col-span-7 pl-1">
                <div className="text-2xl font-serif font-black text-emerald-700 leading-none mb-1.5">
                  ℞
                </div>

                <div className="space-y-2.5">
                  {prescription.medicines && prescription.medicines.length > 0 ? (
                    prescription.medicines.map((med, idx) => (
                      <div key={idx} className="pb-1.5 border-b border-zinc-100 last:border-0">
                        <div className="flex items-baseline justify-between">
                          <span className="font-extrabold text-zinc-900 text-[10.5px]">
                            {idx + 1}. {med.brandName}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            ({med.duration})
                          </span>
                        </div>
                        {med.genericName && (
                          <div className="text-[9px] text-zinc-500 font-mono">
                            {med.genericName}
                          </div>
                        )}
                        <div className="text-emerald-700 font-bold text-[10px] mt-0.5 flex items-center gap-1.5">
                          <span>{med.dosage}</span>
                          {med.instructions && (
                            <>
                              <span className="text-zinc-400 font-normal">|</span>
                              <span className="text-zinc-700 font-medium text-[9.5px]">
                                {med.instructions}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 italic py-4">
                      No systemic medications prescribed. Follow physical rehabilitation instructions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Footer, Hotline & Doctor Signature */}
          <div className="pt-2 border-t border-zinc-300 flex items-end justify-between text-[8.5px] mt-auto">
            <div>
              <div className="font-mono text-[8px] text-zinc-600">
                Rx ID: {rxNumber} · MRN: {prescription.patient.mrn}
              </div>
              <div className="text-zinc-500 text-[8px] mt-0.5">
                জরুরি প্রয়োজনে সেন্টারের হটলাইনে যোগাযোগ করুন: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpc@toufiquzzaman.com
              </div>
            </div>

            <div className="text-center w-36">
              <div className="h-6"></div>
              <div className="border-t border-dashed border-zinc-800 pt-0.5 font-bold text-zinc-800 text-[9px]">
                {prescription.doctor.name || "Doctor's Signature"}
              </div>
              <div className="text-[7.5px] text-zinc-500">Health &amp; Pain Care Center, Jashore</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
            বন্ধ করুন (Close)
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-500/20 text-xs"
          >
            <Printer className="size-4" />
            <span>প্রিন্ট প্রেসক্রিপশন (5.50" × 8.27")</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
