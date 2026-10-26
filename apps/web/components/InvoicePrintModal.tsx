// apps/web/components/InvoicePrintModal.tsx
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Printer, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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

// Helper to convert number to English Words
function numberToWordsEn(num: number): string {
  if (!num || num <= 0) return 'Zero Taka Only';
  const rounded = Math.round(num);
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }

  return convert(rounded) + ' Taka Only';
}

// Helper to convert number to Bengali Words
function numberToWordsBn(num: number): string {
  if (!num || num <= 0) return 'শূন্য টাকা মাত্র';
  const rounded = Math.round(num);
  const units = [
    '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ',
    'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
    'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ', 'ত্রিশ',
    'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ', 'চল্লিশ',
    'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ', 'পঞ্চাশ',
    'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট', 'ষাট',
    'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর', 'সত্তর',
    'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি', 'আশি',
    'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাসি', 'অষ্টআশি', 'ঊননব্বই', 'নব্বই',
    'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
  ];

  function convert(n: number): string {
    if (n < 100) return units[n];
    if (n < 1000) return units[Math.floor(n / 100)] + ' শত ' + (n % 100 !== 0 ? convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' হাজার ' + (n % 1000 !== 0 ? convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' লাখ ' + (n % 100000 !== 0 ? convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' কোটি ' + (n % 10000000 !== 0 ? convert(n % 10000000) : '');
  }

  return convert(rounded).trim() + ' টাকা মাত্র';
}

export default function InvoicePrintModal({
  open,
  onClose,
  data,
}: InvoicePrintModalProps) {
  if (!data) return null;

  const handlePrint = () => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'visible';
    window.print();
    setTimeout(() => {
      document.body.style.overflow = prevOverflow;
    }, 500);
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

  const isFullPaid = (data.dueTaka || 0) <= 0;
  const wordsEn = numberToWordsEn(data.totalTaka);
  const wordsBn = numberToWordsBn(data.totalTaka);

  return (
    <Dialog open={open} onOpenChange={(op) => !op && onClose()}>
      <DialogContent
        className="max-w-[620px] max-h-[96vh] overflow-y-auto p-4 sm:p-5 bg-background border-border"
        onClose={onClose}
      >
        {/* ============================================================== */}
        {/* STRICT HPC CUSTOM SIZE CSS (5.50in width × 8.27in height)      */}
        {/* EXACT 1-PAGE GUARANTEE: STOPS CHROME FROM GENERATING PAGE 2/3  */}
        {/* ============================================================== */}
        <style>{`
          @page {
            size: 5.5in 8.27in;
            margin: 4mm 5mm;
          }
          @media print {
            /* 1. Completely collapse the full Next.js page tree so background layout is 0px */
            body > *:not([data-radix-portal]) {
              display: none !important;
            }

            /* 2. Hide dialog overlay, close button, dialog header and modal buttons */
            [data-radix-dialog-overlay],
            [data-radix-dialog-close],
            .print-hidden,
            button {
              display: none !important;
            }

            /* 3. Reset html and body with fixed 1-page constraints */
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-height: 8.27in !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* 4. Reset dialog portal and content so they have 0 padding/margin */
            [data-radix-portal],
            [role="dialog"] {
              position: static !important;
              display: block !important;
              transform: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              max-width: none !important;
              max-height: none !important;
              overflow: visible !important;
              width: 100% !important;
            }

            /* 5. Precise HPC paper sheet: 5.50in (140mm) x 8.27in (210mm) */
            .sheet-invoice-hpc {
              position: static !important;
              box-sizing: border-box !important;
              width: 100% !important;
              max-width: 5.5in !important;
              height: calc(8.27in - 8mm) !important;
              max-height: calc(8.27in - 8mm) !important;
              margin: 0 auto !important;
              padding: 2.5mm 3.5mm !important;
              background: #ffffff !important;
              color: #09090b !important;
              border: 1px solid #d4d4d8 !important;
              border-radius: 4px !important;
              box-shadow: none !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              font-family: var(--font-poppins, 'Poppins'), 'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif !important;
            }
          }
        `}</style>

        {/* Modal Top Bar (Screen Only) */}
        <DialogHeader className="pb-2.5 border-b border-border/60 print-hidden">
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
          className="sheet-invoice-hpc print-hpc-paper bg-white text-zinc-950 rounded-xl border border-zinc-300 shadow-md mx-auto my-2 w-full font-sans"
          style={{
            maxWidth: '5.5in',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '9.5px',
            lineHeight: '1.3',
            boxSizing: 'border-box',
          }}
        >
          {/* Top Section: Header, Meta Bar, Patient Info, Itemized Table */}
          <div>
            {/* Bilingual HPC Header & Official Branding */}
            <div className="border-b-2 border-emerald-600 pb-1.5 text-center">
              <div className="flex items-center justify-center gap-2.5 mb-1">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-500/50 shrink-0 relative bg-emerald-50 p-0.5 flex items-center justify-center">
                  <img
                    src="/hpclogo-transparent.png"
                    alt="HPC Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-left">
                  <h1 className="text-[13.5px] sm:text-[15px] font-black text-emerald-900 leading-tight tracking-tight">
                    এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার, যশোর
                  </h1>
                  <h2 className="text-[10px] sm:text-[11px] font-bold text-zinc-800 leading-tight">
                    HPC Health &amp; Pain Care Center, Jashore
                  </h2>
                  <p className="text-[8.5px] font-semibold text-emerald-700 leading-tight mt-0.5">
                    আধুনিক ফিজিওথেরাপি, পেইন ম্যানেজমেন্ট ও রিহ্যাবিলিটেশন সেন্টার
                  </p>
                </div>
              </div>

              {/* Exact Clinic Address & Contact Information */}
              <div className="bg-zinc-50 border-t border-zinc-200/80 pt-1 px-1 flex flex-col items-center justify-center text-[8.5px] text-zinc-600 leading-tight">
                <div>
                  <strong className="text-zinc-800">ঠিকানা:</strong> চাঁচড়া পুলিশ ফাঁড়ির বিপরীতে, চাঁচড়া ডালমিল মোড়, যশোর সদর, যশোর-৭৪০০
                </div>
                <div className="font-mono text-[8px] text-zinc-600 mt-0.5">
                  <strong className="text-zinc-800">হটলাইন / মোবাইল:</strong> +৮৮০ ১৫১৫-৬১৫১৮৮ · <strong className="text-zinc-800">E-mail:</strong> hpcjashore@gmail.com
                </div>
              </div>
            </div>

            {/* Money Receipt Meta Header Bar */}
            <div className="my-1.5 py-1 px-2.5 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-between text-[9px]">
              <div>
                <strong className="text-zinc-700">BILL NO:</strong>{' '}
                <span className="font-mono font-bold text-emerald-800 text-[10px]">{data.billNumber}</span>
              </div>
              <div className="flex items-center gap-1 font-black text-zinc-900 tracking-wider uppercase text-[9.5px]">
                <FileText className="size-3 text-emerald-600 inline" />
                <span>মানি রসিদ (MONEY RECEIPT)</span>
              </div>
              <div className="font-mono text-zinc-700 text-[8.5px]">
                <strong>DATE:</strong> {formattedDate} {formattedTime}
              </div>
            </div>

            {/* Patient & Admission Clinical Details Box */}
            <div className="p-2 rounded border border-zinc-200 bg-zinc-50/70 grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px] mb-1.5">
              <div>
                <span className="text-zinc-500">রোগীর নাম (Patient):</span>{' '}
                <strong className="text-zinc-900">
                  {data.patientName} {data.patientNameBn && `(${data.patientNameBn})`}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-zinc-500">MRN / রেজি নং:</span>{' '}
                <strong className="font-mono text-zinc-900 font-bold">{data.mrn}</strong>
              </div>
              <div>
                <span className="text-zinc-500">মোবাইল (Phone):</span>{' '}
                <span className="font-mono font-medium text-zinc-800">{data.phone || 'N/A'}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500">বয়স / লিঙ্গ:</span>{' '}
                <span className="text-zinc-800">
                  {data.ageYears ? `${data.ageYears} Y` : '-'} /{' '}
                  {data.gender === 'female' ? 'মহিলা (Female)' : 'পুরুষ (Male)'}
                </span>
              </div>
              <div className="col-span-2 pt-0.5 border-t border-zinc-200/70 text-[8.5px] text-zinc-600 flex justify-between items-center">
                <span>
                  আদায়কারী ক্যাশিয়ার: <strong className="text-zinc-800">{data.cashierName || 'Cashier Desk'}</strong>
                </span>
                <span className="uppercase font-mono">
                  পদ্ধতি: <strong className="text-zinc-800">{data.paymentMethod}</strong>
                  {data.txnId ? ` (Txn: ${data.txnId})` : ''}
                </span>
              </div>
            </div>

            {/* Itemized Services Table */}
            <table className="w-full text-left text-[9px] border border-zinc-300 border-collapse mb-1.5">
              <thead className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                <tr>
                  <th className="py-1 px-1.5 w-6 text-center border-r border-zinc-300">#</th>
                  <th className="py-1 px-2 border-r border-zinc-300">সেবা / বিবরণের নাম (Item Description)</th>
                  <th className="py-1 px-1.5 w-10 text-center border-r border-zinc-300">পরিমাণ</th>
                  <th className="py-1 px-2 w-14 text-right border-r border-zinc-300">দর (৳)</th>
                  <th className="py-1 px-2 w-16 text-right">মোট (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50">
                    <td className="py-1 px-1.5 text-center font-mono border-r border-zinc-200">{idx + 1}</td>
                    <td className="py-1 px-2 font-medium border-r border-zinc-200">
                      <div>{item.description}</div>
                      {item.itemType && (
                        <span className="text-[7.5px] text-zinc-500 uppercase tracking-wider font-mono">
                          [{item.itemType}]
                        </span>
                      )}
                    </td>
                    <td className="py-1 px-1.5 text-center font-mono border-r border-zinc-200">{item.quantity}</td>
                    <td className="py-1 px-2 text-right font-mono border-r border-zinc-200">
                      ৳{item.unitPriceTaka.toLocaleString('en-IN')}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-zinc-900">
                      ৳{(item.unitPriceTaka * item.quantity).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Middle/Lower Section: Financial Totals, Taka in Words, Terms */}
          <div>
            <div className="grid grid-cols-12 gap-2 mb-2 items-start">
              {/* Left Column: Taka In Words & Mandatory Notes */}
              <div className="col-span-7 flex flex-col justify-between space-y-1.5">
                <div className="p-1.5 rounded border border-emerald-200 bg-emerald-50/50 text-[8.5px]">
                  <span className="text-zinc-600 font-semibold block text-[8px] uppercase tracking-wider">
                    টাকার পরিমাণ কথায় (Amount in Words):
                  </span>
                  <div className="font-bold text-emerald-950 leading-tight mt-0.5">
                    {wordsBn}
                  </div>
                  <div className="text-zinc-600 italic text-[7.5px] mt-0.5">
                    ({wordsEn})
                  </div>
                </div>

                <div className="text-[8px] text-zinc-500 space-y-0.5 leading-tight pl-0.5">
                  <p>• এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল মানি রসিদ।</p>
                  <p>• সেবা গ্রহণের সময় এই রসিদটি সাথে রাখা আবশ্যক।</p>
                  <p>• যেকোনো তথ্যে গরমিল পরিলক্ষিত হলে অবিলম্বে কর্তৃপক্ষকে জানান।</p>
                </div>
              </div>

              {/* Right Column: Financial Calculation Summary Box */}
              <div className="col-span-5 text-[9px] space-y-0.5 font-mono border border-zinc-200 rounded p-1.5 bg-zinc-50/50">
                <div className="flex justify-between py-0.5 border-b border-zinc-200">
                  <span className="text-zinc-600">সর্বমোট (Subtotal):</span>
                  <strong className="text-zinc-900">৳{data.subtotalTaka.toLocaleString('en-IN')}</strong>
                </div>

                {data.discountTaka > 0 && (
                  <div className="flex justify-between py-0.5 border-b border-zinc-200 text-emerald-700">
                    <span>ছাড় (Discount):</span>
                    <strong>-৳{data.discountTaka.toLocaleString('en-IN')}</strong>
                  </div>
                )}

                <div className="flex justify-between py-0.5 border-b-2 border-emerald-600 text-[10px] font-bold text-emerald-900 bg-emerald-50/60 px-1 rounded">
                  <span>নীট প্রদেয় (Net Total):</span>
                  <span>৳{data.totalTaka.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between py-0.5 text-emerald-800 font-bold px-1">
                  <span>পরিশোধিত (Paid):</span>
                  <span>৳{data.paidTaka.toLocaleString('en-IN')}</span>
                </div>

                {data.dueTaka > 0 ? (
                  <div className="flex justify-between py-0.5 text-red-600 font-bold border-t border-dashed border-red-300 px-1">
                    <span>বকেয়া (Balance Due):</span>
                    <span>৳{data.dueTaka.toLocaleString('en-IN')}</span>
                  </div>
                ) : (
                  <div className="flex justify-between py-0.5 text-emerald-700 font-bold text-[8px] px-1 border-t border-emerald-200">
                    <span>স্থিতি:</span>
                    <span className="flex items-center gap-0.5">
                      <CheckCircle2 className="size-2.5 inline" />
                      সম্পূর্ণ পরিশোধিত (FULL PAID)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Signatures & Professional Healthcare Footer */}
            <div className="pt-1.5 border-t border-zinc-300">
              <div className="grid grid-cols-2 gap-4 text-center text-[8.5px] mb-1.5">
                <div className="pt-4">
                  <div className="border-t border-dashed border-zinc-400 mx-3 pt-0.5 font-semibold text-zinc-700">
                    গ্রাহক / জমাদানকারীর স্বাক্ষর
                  </div>
                  <div className="text-[7.5px] text-zinc-500">(Patient / Payee Signature)</div>
                </div>
                <div className="pt-4">
                  <div className="border-t border-dashed border-zinc-400 mx-3 pt-0.5 font-semibold text-zinc-700">
                    কর্তৃপক্ষ / আদায়কারী ক্যাশিয়ারের স্বাক্ষর
                  </div>
                  <div className="text-[7.5px] text-zinc-500">(Authorized Cashier Signature)</div>
                </div>
              </div>

              {/* Clinic Care Motto */}
              <div className="text-center text-[8px] text-zinc-500 font-medium border-t border-zinc-200 pt-1">
                ধন্যবাদ! সুস্থ থাকুন, ব্যথা মুক্ত স্বাভাবিক জীবনে ফিরে আসুন — <strong>HPC Jashore</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60 print-hidden">
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
