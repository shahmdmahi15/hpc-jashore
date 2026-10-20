// apps/web/app/cashier/page.tsx
'use client';

import React, { useState } from 'react';
import { WorkstationShell } from '../../components/WorkstationShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WorkstationTabPlaceholder } from '../../components/WorkstationTabPlaceholder';
import { useLanguage } from '../../lib/i18n';
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Hash,
  Clock,
  Users,
  MessageSquare,
} from 'lucide-react';

const CASHIER_TABS = [
  {
    id: 'dues',
    titleEn: 'Dues',
    titleBn: 'বকেয়া বিল',
    icon: AlertCircle,
    descriptionEn: 'Outstanding invoices, pending payments, credit tracking, and collection ledger.',
    descriptionBn: 'অনিষ্পন্ন ও বকেয়া বিল, বাকির হিসাব এবং কালেকশন তালিকা পর্যবেক্ষণ।',
  },
  {
    id: 'paids',
    titleEn: 'Paids',
    titleBn: 'পরিশোধিত বিল',
    icon: CheckCircle2,
    descriptionEn: 'Settled transactions, paid receipts, bKash/Nagad digital verifications, and daily cash float.',
    descriptionBn: 'পরিশোধিত বিলের রশিদ, মোবাইল ব্যাংকিং যাচাইকরণ ও দৈনিক ক্যাশ ফ্লোট স্থিতি।',
  },
  {
    id: 'refunds',
    titleEn: 'Refunds',
    titleBn: 'রিফান্ড ও সমন্বয়',
    icon: RotateCcw,
    descriptionEn: 'Service cancellations, fee returns, credit note generation, and admin-approved refunds.',
    descriptionBn: 'বাতিলকৃত সেবার ফি ফেরত, ক্রেডিট নোট এবং অনুমোদিত রিফান্ড রেকর্ড।',
  },
  {
    id: 'consultation_serial',
    titleEn: 'Consultation Serial',
    titleBn: 'ডাক্তার সিরিয়াল',
    icon: Hash,
    descriptionEn: 'Verify patient payment status before doctor consultation room entry.',
    descriptionBn: 'ডাক্তারের চেম্বারে প্রবেশের পূর্বে রোগীর ফি পরিশোধের স্থিতি নিশ্চিতকরণ।',
  },
  {
    id: 'therapy_slot',
    titleEn: 'Therapy Slot',
    titleBn: 'থেরাপি স্লট',
    icon: Clock,
    descriptionEn: 'Therapy session package purchases, package credit redemption, and slot payments.',
    descriptionBn: 'থেরাপি প্যাকেজ বিক্রয়, অগ্রিম পেমেন্ট ব্যালেন্স ব্যবহার এবং স্লট যাচাই।',
  },
  {
    id: 'patients',
    titleEn: 'Patients',
    titleBn: 'রোগী তালিকা',
    icon: Users,
    descriptionEn: 'Patient billing profiles, payment history, lifetime ledger, and discount records.',
    descriptionBn: 'রোগীর আর্থিক প্রোফাইল, মোট লেনদেনের ইতিহাস এবং ডিসকাউন্ট রেকর্ড।',
  },
  {
    id: 'chat',
    titleEn: 'Chat',
    titleBn: 'অভ্যন্তরীণ বার্তা',
    icon: MessageSquare,
    descriptionEn: 'Secure internal messaging with reception, pharmacy, doctors, and accounts.',
    descriptionBn: 'রিসেপশন, ডাক্তার ও অ্যাডমিনের সাথে জরুরি আর্থিক সমন্বয় বার্তা।',
  },
];

export default function CashierPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('dues');

  return (
    <WorkstationShell activeTab="cashier" allowedRoles={['admin', 'cashier']}>
      {() => (
        <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {language === 'bn' ? 'ক্যাশিয়ার ও বিলিং ওয়ার্কস্টেশন' : 'Cashier & Billing Workstation'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === 'bn' ? 'পেমেন্ট কালেকশন, ক্যাশ ড্রয়ার ও আর্থিক সমন্বয়' : 'Payment collection, cash drawer float, and financial settlement'}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto pb-2 scrollbar-none">
              <TabsList className="h-auto p-1 bg-muted/50 border border-border/40 rounded-xl inline-flex gap-1 min-w-full sm:min-w-0">
                {CASHIER_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all whitespace-nowrap"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{language === 'bn' ? tab.titleBn : tab.titleEn}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {CASHIER_TABS.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4 focus-visible:outline-none">
                <WorkstationTabPlaceholder
                  titleEn={tab.titleEn}
                  titleBn={tab.titleBn}
                  descriptionEn={tab.descriptionEn}
                  descriptionBn={tab.descriptionBn}
                  icon={tab.icon}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </WorkstationShell>
  );
}
