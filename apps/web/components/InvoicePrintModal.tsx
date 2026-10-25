// apps/web/components/InvoicePrintModal.tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export interface InvoiceItem {
  itemType?: string;
  description: string;
  unitPriceTaka: number;
  quantity: number;
  totalTaka?: number;
}

export interface InvoicePrintModalProps {
  open: boolean;
  onClose: () => void;
  data: {
    billNumber: string;
    patientName: string;
    patientNameBn?: string;
    mrn: string;
    phone?: string;
    ageYears?: number;
    gender?: string;
    cashierName?: string;
    items: InvoiceItem[];
    subtotalTaka: number;
    discountTaka: number;
    totalTaka: number;
    paidTaka: number;
    dueTaka: number;
    paymentMethod: string;
    txnId?: string;
    createdAt?: string;
    notes?: string;
  } | null;
}

export default function InvoicePrintModal({
  open,
  onClose,
  data,
}: InvoicePrintModalProps) {
  const [paperFormat, setPaperFormat] = useState<'hpc' | 'thermal' | 'a4'>('hpc');

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB');

  const formattedTime = data.createdAt
    ? new Date(data.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog open={open} onOpenChange={(op) => !op && onClose()}>
      <DialogContent
        className="max-w-[700px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 bg-background border-border"
        onClose={onClose}
      >
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <FileText className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>মানি রসিদ ও ইনভয়েস প্রিন্ট (Money Receipt)</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                বিল নম্বর: <strong className="text-foreground">{data.billNumber}</strong>
              </p>
            </div>

            {/* Paper Size Selector Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setPaperFormat('hpc')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  paperFormat === 'hpc'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="HPC Custom Executive Pad (140mm × 210mm)"
              >
                📄 HPC Size (5.5&quot;×8.27&quot;)
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('thermal')}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  paperFormat === 'thermal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="80mm Thermal Receipt"
              >
                🧾 80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                  paperFormat === 'a4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="A4 Sheet"
              >
                📑 A4
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ============================================================== */}
        {/* FORMAT 1: HPC CUSTOM PAPER (5.5in × 8.27in / 140mm × 210mm)    */}
        {/* ============================================================== */}
        {paperFormat === 'hpc' && (
          <div
            className="sheet-invoice-hpc print-hpc-paper bg-white text-black p-4 sm:p-5 rounded-xl border border-zinc-300 shadow-md mx-auto my-2 w-full font-sans"
            style={{
              maxWidth: '5.5in',
              minHeight: '8.27in',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: '11px',
              lineHeight: '1.35',
            }}
          >
            <div>
              {/* HPC Header & Branding */}
              <div className="border-b-2 border-emerald-600 pb-2 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500 shrink-0 relative">
                    <img
                      src="/hpclogo-transparent.png"
                      alt="HPC Logo"
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="text-left">
                    <h1 className="text-sm sm:text-base font-extrabold text-emerald-800 leading-tight">
                      এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                    </h1>
                    <h2 className="text-[11px] font-bold text-zinc-800 leading-tight">
                      HPC Health &amp; Pain Care Center, Jashore
                    </h2>
                  </div>
                </div>
                <p className="text-[9.5px] text-zinc-600">
                  চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                </p>
                <p className="text-[9px] text-zinc-600 font-mono">
                  হটলাইন / মোবাইল: +৮৮০ ১৫১৫-৬১৫১৮৮ · E-mail: hpcjashore@gmail.com
                </p>
              </div>

              {/* Invoice Meta Banner */}
              <div className="my-2 py-1 px-2.5 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-between font-mono text-[10px]">
                <div>
                  <strong>BILL NO:</strong>{' '}
                  <span className="font-bold text-emerald-700">{data.billNumber}</span>
                </div>
                <div className="font-black text-zinc-900 tracking-wider uppercase">
                  MONEY RECEIPT (মানি রসিদ)
                </div>
                <div>
                  <strong>DATE:</strong> {formattedDate} {formattedTime}
                </div>
              </div>

              {/* Patient Information Box */}
              <div className="p-2 rounded border border-zinc-200 bg-zinc-50/70 grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] mb-2">
                <div>
                  <span className="text-zinc-500">রোগীর নাম (Patient):</span>{' '}
                  <strong className="text-zinc-900">
                    {data.patientName} {data.patientNameBn && `(${data.patientNameBn})`}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">MRN:</span>{' '}
                  <strong className="font-mono text-zinc-900">{data.mrn}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">মোবাইল (Phone):</span>{' '}
                  <span className="font-mono">{data.phone || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500">বয়স / লিঙ্গ:</span>{' '}
                  <span>
                    {data.ageYears ? `${data.ageYears} Y` : '-'} /{' '}
                    {data.gender === 'female' ? 'Female' : 'Male'}
                  </span>
                </div>
                {data.cashierName && (
                  <div className="col-span-2 pt-0.5 border-t border-zinc-200/60 text-[9.5px] text-zinc-600">
                    আদায়কারী (Cashier): <strong>{data.cashierName}</strong>
                  </div>
                )}
              </div>

              {/* Itemized Services Table */}
              <table className="w-full text-left text-[10px] border border-zinc-300 border-collapse mb-2">
                <thead className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                  <tr>
                    <th className="p-1.5 w-6 text-center border-r border-zinc-300">#</th>
                    <th className="p-1.5 border-r border-zinc-300">সেবা / বিবরণের নাম (Item Description)</th>
                    <th className="p-1.5 w-12 text-center border-r border-zinc-300">পরিমাণ</th>
                    <th className="p-1.5 w-16 text-right border-r border-zinc-300">দর (৳)</th>
                    <th className="p-1.5 w-16 text-right">মোট (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="p-1.5 text-center font-mono border-r border-zinc-200">{idx + 1}</td>
                      <td className="p-1.5 font-medium border-r border-zinc-200">{item.description}</td>
                      <td className="p-1.5 text-center font-mono border-r border-zinc-200">{item.quantity}</td>
                      <td className="p-1.5 text-right font-mono border-r border-zinc-200">
                        ৳{item.unitPriceTaka}
                      </td>
                      <td className="p-1.5 text-right font-mono font-semibold">
                        ৳{item.unitPriceTaka * item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Calculation Summary */}
              <div className="flex justify-end mb-3">
                <div className="w-56 text-[10px] space-y-1 font-mono">
                  <div className="flex justify-between py-0.5 border-b border-zinc-200">
                    <span className="text-zinc-600">সর্বমোট (Subtotal):</span>
                    <strong className="text-zinc-900">৳{data.subtotalTaka}</strong>
                  </div>
                  {data.discountTaka > 0 && (
                    <div className="flex justify-between py-0.5 border-b border-zinc-200 text-emerald-700">
                      <span>ছাড় (Discount):</span>
                      <strong>-৳{data.discountTaka}</strong>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5 border-b-2 border-zinc-800 text-xs font-bold">
                    <span>নীট পরিশোধযোগ্য (Net Total):</span>
                    <span>৳{data.totalTaka}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-emerald-800 font-bold">
                    <span>পরিশোধিত (Paid):</span>
                    <span>৳{data.paidTaka}</span>
                  </div>
                  {data.dueTaka > 0 ? (
                    <div className="flex justify-between py-0.5 text-red-600 font-bold border-t border-dashed border-red-300">
                      <span>বকেয়া (Balance Due):</span>
                      <span>৳{data.dueTaka}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-0.5 text-emerald-600 font-bold text-[9.5px]">
                      <span>পরিশোধের স্থিতি:</span>
                      <span>✓ সম্পূর্ণ পরিশোধিত</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-[9px] text-zinc-500">
                    <span>পদ্ধতি (Method):</span>
                    <span className="uppercase font-semibold text-zinc-700">
                      {data.paymentMethod} {data.txnId ? `(${data.txnId})` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures & Footer Notice */}
            <div className="pt-2 border-t border-zinc-300">
              <div className="grid grid-cols-2 gap-4 text-center text-[9px] mb-2">
                <div className="pt-4">
                  <div className="border-t border-dashed border-zinc-400 mx-4 pt-1 font-semibold text-zinc-700">
                    গ্রাহক / রোগীর স্বাক্ষর (Patient Signature)
                  </div>
                </div>
                <div className="pt-4">
                  <div className="border-t border-dashed border-zinc-400 mx-4 pt-1 font-semibold text-zinc-700">
                    কর্তৃপক্ষ / ক্যাশিয়ার (Authorized Signatory)
                  </div>
                </div>
              </div>
              <div className="text-center text-[8.5px] text-zinc-500">
                ধন্যবাদ! সুস্থ থাকুন, ব্যথা মুক্ত স্বাভাবিক জীবনে ফিরে আসুন — HPC Jashore
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMAT 2: 80MM THERMAL SLIP                                     */}
        {/* ============================================================== */}
        {paperFormat === 'thermal' && (
          <div
            className="sheet-thermal bg-white text-black p-3 rounded-lg border border-dashed border-zinc-400 font-mono text-xs mx-auto my-2 w-full max-w-[300px]"
          >
            <div className="font-bold text-center text-sm leading-tight">
              এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার
            </div>
            <div className="text-[10px] text-center text-zinc-600">
              HPC Health &amp; Pain Care Center, Jashore
            </div>
            <div className="text-[9px] text-center text-zinc-500">
              Chachra Dalmil, Jashore · 01515-615188
            </div>

            <div className="border-b border-dashed border-zinc-950 my-2" />
            <div className="font-bold text-center text-[11px]">
              MONEY RECEIPT · {data.billNumber}
            </div>
            <div className="text-[10px] mt-1">
              Patient: <strong>{data.patientName}</strong>
            </div>
            <div className="text-[10px]">MRN: {data.mrn}</div>
            <div className="text-[10px]">Date: {formattedDate} {formattedTime}</div>

            <div className="border-b border-dashed border-zinc-950 my-2" />

            <table className="w-full text-[10px]">
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      {it.description} x{it.quantity}
                    </td>
                    <td className="text-right">৳{it.unitPriceTaka * it.quantity}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border-t border-dashed border-zinc-300 pt-1">Subtotal:</td>
                  <td className="border-t border-dashed border-zinc-300 pt-1 text-right">
                    ৳{data.subtotalTaka}
                  </td>
                </tr>
                {data.discountTaka > 0 && (
                  <tr>
                    <td>Discount:</td>
                    <td className="text-right text-emerald-700">-৳{data.discountTaka}</td>
                  </tr>
                )}
                <tr className="font-bold">
                  <td>Total:</td>
                  <td className="text-right">৳{data.totalTaka}</td>
                </tr>
                <tr>
                  <td>Paid ({data.paymentMethod}):</td>
                  <td className="text-right">৳{data.paidTaka}</td>
                </tr>
                {data.dueTaka > 0 && (
                  <tr className="text-red-600 font-bold">
                    <td>Due:</td>
                    <td className="text-right">৳{data.dueTaka}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="border-b border-dashed border-zinc-950 my-2" />
            <div className="text-[9px] text-center text-zinc-500">
              Thank you for visiting HPC Jashore!
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FORMAT 3: A4 STANDARD REPORT FORMAT                            */}
        {/* ============================================================== */}
        {paperFormat === 'a4' && (
          <div
            className="sheet-report-a4 print-a4-paper bg-white text-black p-8 rounded-xl border border-zinc-300 shadow-md mx-auto my-2 w-full font-sans"
            style={{ minHeight: '297mm' }}
          >
            {/* Header */}
            <div className="border-b-2 border-emerald-600 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/hpclogo-transparent.png"
                  alt="HPC Logo"
                  className="w-12 h-12 object-contain"
                />
                <div>
                  <h1 className="text-lg font-black text-emerald-800">
                    এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                  </h1>
                  <h2 className="text-sm font-bold text-zinc-800">
                    HPC Health &amp; Pain Care Center, Jashore
                  </h2>
                  <p className="text-xs text-zinc-600">
                    চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০ · মোবাইল: +৮৮০ ১৫১৫-৬১৫১৮৮
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-sm text-emerald-700">{data.billNumber}</div>
                <div>{formattedDate} {formattedTime}</div>
              </div>
            </div>

            {/* Patient Info */}
            <div className="my-4 p-3 bg-zinc-50 rounded-lg border border-zinc-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <strong>রোগীর নাম:</strong> {data.patientName} {data.patientNameBn && `(${data.patientNameBn})`}
              </div>
              <div className="text-right">
                <strong>MRN:</strong> {data.mrn}
              </div>
              <div>
                <strong>ফোন:</strong> {data.phone || 'N/A'}
              </div>
              <div className="text-right">
                <strong>বয়স/লিঙ্গ:</strong> {data.ageYears || '-'}Y / {data.gender || '-'}
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left text-xs border border-zinc-300 border-collapse my-4">
              <thead className="bg-zinc-100 font-bold border-b border-zinc-300">
                <tr>
                  <th className="p-2 border-r border-zinc-300 w-10 text-center">SL</th>
                  <th className="p-2 border-r border-zinc-300">সেবার বিবরণ (Service Description)</th>
                  <th className="p-2 border-r border-zinc-300 w-20 text-center">পরিমাণ</th>
                  <th className="p-2 border-r border-zinc-300 w-24 text-right">দর (৳)</th>
                  <th className="p-2 w-28 text-right">মোট (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 text-center font-mono border-r border-zinc-200">{idx + 1}</td>
                    <td className="p-2 font-medium border-r border-zinc-200">{it.description}</td>
                    <td className="p-2 text-center font-mono border-r border-zinc-200">{it.quantity}</td>
                    <td className="p-2 text-right font-mono border-r border-zinc-200">৳{it.unitPriceTaka}</td>
                    <td className="p-2 text-right font-mono font-semibold">৳{it.unitPriceTaka * it.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex justify-end my-4">
              <div className="w-64 text-xs font-mono space-y-1.5">
                <div className="flex justify-between py-1 border-b border-zinc-200">
                  <span>সর্বমোট (Subtotal):</span>
                  <strong>৳{data.subtotalTaka}</strong>
                </div>
                {data.discountTaka > 0 && (
                  <div className="flex justify-between py-1 border-b border-zinc-200 text-emerald-700">
                    <span>ডিসকাউন্ট (Discount):</span>
                    <strong>-৳{data.discountTaka}</strong>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b-2 border-zinc-800 font-bold text-sm">
                  <span>নীট প্রদেয় (Net Total):</span>
                  <span>৳{data.totalTaka}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-800 font-bold">
                  <span>পরিশোধিত (Paid):</span>
                  <span>৳{data.paidTaka}</span>
                </div>
                {data.dueTaka > 0 && (
                  <div className="flex justify-between py-1 text-red-600 font-bold">
                    <span>বকেয়া (Due):</span>
                    <span>৳{data.dueTaka}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-16 grid grid-cols-2 text-center text-xs">
              <div className="pt-6 border-t border-dashed border-zinc-400 mx-12">
                রোগী / প্রতিনিধির স্বাক্ষর
              </div>
              <div className="pt-6 border-t border-dashed border-zinc-400 mx-12">
                ক্যাশিয়ার / কর্তৃপক্ষের স্বাক্ষর
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            বন্ধ করুন (Close)
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Printer className="size-4" />
            <span>
              {paperFormat === 'hpc'
                ? 'প্রিন্ট HPC সাইজ রসিদ (5.5" × 8.27")'
                : paperFormat === 'thermal'
                ? 'প্রিন্ট ৮০মিমি থার্মাল স্লিপ'
                : 'প্রিন্ট A4 রিপোর্ট'}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}