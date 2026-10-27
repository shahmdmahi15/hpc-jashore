// apps/web/app/cashier/page.tsx
'use client';

import React, { useState } from 'react';
import { WorkstationShell } from '../../components/WorkstationShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WorkstationTabPlaceholder } from '../../components/WorkstationTabPlaceholder';
import CashierView from '../../components/CashierView';
import { PatientManagementView } from '../../components/patient/PatientManagementView';
import { TherapySlotBookingView } from '../../components/therapy/TherapySlotBookingView';
import { CheckInWorkstationView } from '../../components/checkin/CheckInWorkstationView';
import { CheckoutWorkstationView } from '../../components/checkout/CheckoutWorkstationView';
import { ConsultationBookingView } from '../../components/consultation/ConsultationBookingView';
import { ClinicRealtimeChatView } from '../../components/chat/ClinicRealtimeChatView';
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
  UserCheck,
  LogOut,
} from 'lucide-react';

const CASHIER_TABS = [
  {
    id: 'checkin',
    titleEn: 'Check-in',
    titleBn: 'চেক-ইন',
    icon: UserCheck,
    descriptionEn: 'Verify patient arrival, issue tokens, and check punctuality.',
    descriptionBn: 'রোগীর আগমন নিবন্ধন, টোকেন ইস্যু ও সময়ানুবর্তিতা যাচাই।',
  },
  {
    id: 'checkout',
    titleEn: 'Check-out',
    titleBn: 'চেক-আউট',
    icon: LogOut,
    descriptionEn: 'Patient departure clearance, dues settlement verification, and departure receipts.',
    descriptionBn: 'রোগীর প্রস্থান অনুমোদন, বকেয়া পরিশোধ যাচাই ও ছাড়পত্র প্রদান।',
  },
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
        <div className="flex-1 w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6">
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
            <div className="w-full">
              <TabsList className="h-auto p-1.5 bg-muted/50 border border-border/40 rounded-xl flex flex-wrap items-center gap-1 sm:gap-1.5 w-full">
                {CASHIER_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all whitespace-nowrap cursor-pointer touch-manipulation active:scale-95"
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>{language === 'bn' ? tab.titleBn : tab.titleEn}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <TabsContent value="checkin" className="mt-4 focus-visible:outline-none">
              <CheckInWorkstationView />
            </TabsContent>

            <TabsContent value="dues" className="mt-4 focus-visible:outline-none">
              <CashierView />
            </TabsContent>

            <TabsContent value="checkout" className="mt-4 focus-visible:outline-none">
              <CheckoutWorkstationView />
            </TabsContent>

            <TabsContent value="consultation_serial" className="mt-4 focus-visible:outline-none">
              <ConsultationBookingView />
            </TabsContent>

            <TabsContent value="patients" className="mt-4 focus-visible:outline-none">
              <PatientManagementView />
            </TabsContent>

            <TabsContent value="therapy_slot" className="mt-4 focus-visible:outline-none">
              <TherapySlotBookingView />
            </TabsContent>

            <TabsContent value="chat" className="mt-4 focus-visible:outline-none">
              <ClinicRealtimeChatView />
            </TabsContent>

            {CASHIER_TABS.filter((t) => t.id !== 'checkin' && t.id !== 'checkout' && t.id !== 'dues' && t.id !== 'consultation_serial' && t.id !== 'patients' && t.id !== 'therapy_slot' && t.id !== 'chat').map((tab) => (
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
