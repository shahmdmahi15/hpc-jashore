// apps/web/components/InvoicePrintModal.tsx
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, FileText } from 'lucide-react';

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
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const formattedTime = data.createdAt
    ? new Date(data.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog open={open} onOpenChange={(op) => !op && onClose()}>
      <DialogContent
        className="max-w-[620px] max-h-[96vh] overflow-y-auto p-4 sm:p-5 bg-background border-border"
        onClose={onClose}
      >
        {/* Strict HPC Custom Size CSS Injection: 5.50in width × 8.27in height */}
        <style>{`
          @page {
            size: 5.5in 8.27in;
            margin: 6mm 8mm;
          }
          @media print {
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden;
            }
            .sheet-invoice-hpc,
            .sheet-invoice-hpc * {
              visibility: visible !important;
            }
            .sheet-invoice-hpc {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 5.5in !important;
              min-height: 8.27in !important;
              max-width: 5.5in !important;
              margin: 0 auto !important;
              padding: 6mm 8mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              border: none !important;
              font-size: 10px !important;
              line-height: 1.35 !important;
            }
          }
        `}</style>

        <DialogHeader className="pb-2.5 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <FileText className="size-5 text-emerald-600 dark:text-emerald-400" />
                <span>মানি রসিদ ও ইনভয়েস (Money Receipt &amp; Invoice)</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                বিল নম্বর: <strong className="text-foreground font-mono">{data.billNumber}</strong>
              </p>
            </div>

            {/* HPC Custom Size Badge Indicator */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold self-start sm:self-auto">
              <span>📄 HPC Custom Size (5.50&quot; × 8.27&quot;)</span>
            </div>
          </div>
        </DialogHeader>

        {/* ============================================================== */}
        {/* STRICT HPC CUSTOM PAPER (5.50in × 8.27in / 140mm × 210mm)      */}
        {/* ============================================================== */}
        <div
          className="sheet-invoice-hpc print-hpc-paper bg-white text-zinc-950 p-4 sm:p-5 rounded-xl border border-zinc-300 shadow-md mx-auto my-2 w-full font-sans"
          style={{
            maxWidth: '5.5in',
            minHeight: '8.27in',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            lineHeight: '1.35',
          }}
        >
          <div>
            {/* Bilingual HPC Header & Branding */}
            <div className="border-b-2 border-emerald-600 pb-2 text-center">
              <div className="flex items-center justify-center gap-2.5 mb-1">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500 shrink-0 relative bg-emerald-50">
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
            <div className="my-2 py-1 px-2.5 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-between font-mono text-[9.5px]">
              <div>
                <strong>BILL NO:</strong>{' '}
                <span className="font-bold text-emerald-700">{data.billNumber}</span>
              </div>
              <div className="font-black text-zinc-900 tracking-wider uppercase text-[10px]">
                MONEY RECEIPT (মানি রসিদ)
              </div>
              <div>
                <strong>DATE:</strong> {formattedDate} {formattedTime}
              </div>
            </div>

            {/* Patient Information Box */}
            <div className="p-2 rounded border border-zinc-200 bg-zinc-50/70 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-2">
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
                <span className="font-mono font-medium">{data.phone || 'N/A'}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500">বয়স / লিঙ্গ:</span>{' '}
                <span>
                  {data.ageYears ? `${data.ageYears} Y` : '-'} /{' '}
                  {data.gender === 'female' ? 'Female' : 'Male'}
                </span>
              </div>
              {data.cashierName && (
                <div className="col-span-2 pt-0.5 border-t border-zinc-200/60 text-[9px] text-zinc-600 flex justify-between">
                  <span>আদায়কারী ক্যাশিয়ার (Cashier): <strong>{data.cashierName}</strong></span>
                  {data.paymentMethod && (
                    <span className="uppercase font-mono">
                      পদ্ধতি: <strong>{data.paymentMethod}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Itemized Services Table */}
            <table className="w-full text-left text-[9.5px] border border-zinc-300 border-collapse mb-2">
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
            <div className="flex justify-end mb-2.5">
              <div className="w-56 text-[9.5px] space-y-1 font-mono">
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
                <div className="flex justify-between py-0.5 border-b-2 border-zinc-800 text-[11px] font-bold">
                  <span>নীট প্রদেয় (Net Total):</span>
                  <span className="text-emerald-800">৳{data.totalTaka}</span>
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
                  <div className="flex justify-between py-0.5 text-emerald-600 font-bold text-[9px]">
                    <span>পরিশোধের স্থিতি:</span>
                    <span>✓ সম্পূর্ণ পরিশোধিত (Full Paid)</span>
                  </div>
                )}
                <div className="flex justify-between pt-0.5 text-[8.5px] text-zinc-500">
                  <span>পদ্ধতি (Method):</span>
                  <span className="uppercase font-semibold text-zinc-700">
                    {data.paymentMethod} {data.txnId ? `(Txn: ${data.txnId})` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Footer Notice */}
          <div className="pt-2 border-t border-zinc-300">
            <div className="grid grid-cols-2 gap-4 text-center text-[9px] mb-2">
              <div className="pt-5">
                <div className="border-t border-dashed border-zinc-400 mx-4 pt-1 font-semibold text-zinc-700">
                  গ্রাহক / জমাদানকারীর স্বাক্ষর
                </div>
              </div>
              <div className="pt-5">
                <div className="border-t border-dashed border-zinc-400 mx-4 pt-1 font-semibold text-zinc-700">
                  কর্তৃপক্ষ / আদায়কারী ক্যাশিয়ারের স্বাক্ষর
                </div>
              </div>
            </div>
            <div className="text-center text-[8.5px] text-zinc-500">
              ধন্যবাদ! সুস্থ থাকুন, ব্যথা মুক্ত স্বাভাবিক জীবনে ফিরে আসুন — HPC Jashore
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl cursor-pointer">
            বন্ধ করুন (Close)
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Printer className="size-4" />
            <span>প্রিন্ট HPC সাইজ ইনভয়েস (5.5&quot; × 8.27&quot;)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
