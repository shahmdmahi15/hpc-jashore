// apps/web/app/receptionist/page.tsx
'use client';

import React, { useState } from 'react';
import { WorkstationShell } from '../../components/WorkstationShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WorkstationTabPlaceholder } from '../../components/WorkstationTabPlaceholder';
import { PatientManagementView } from '../../components/patient/PatientManagementView';
import { TherapySlotBookingView } from '../../components/therapy/TherapySlotBookingView';
import { CheckInWorkstationView } from '../../components/checkin/CheckInWorkstationView';
import { CheckoutWorkstationView } from '../../components/checkout/CheckoutWorkstationView';
import { ConsultationBookingView } from '../../components/consultation/ConsultationBookingView';
import { useLanguage } from '../../lib/i18n';
import {
  UserCheck,
  LogOut,
  Hash,
  Clock,
  Users,
  MessageSquare,
  ClipboardList,
} from 'lucide-react';

const RECEPTIONIST_TABS = [
  {
    id: 'checkin',
    titleEn: 'Check-in',
    titleBn: 'চেক-ইন',
    icon: UserCheck,
    descriptionEn: 'Register new and returning patient arrivals, issue tokens, and verify profiles.',
    descriptionBn: 'নতুন এবং পুনরায় আগত রোগীদের চেক-ইন সম্পন্ন করুন এবং সিরিয়াল টোকেন ইস্যু করুন।',
  },
  {
    id: 'checkout',
    titleEn: 'Check-out',
    titleBn: 'চেক-আউট',
    icon: LogOut,
    descriptionEn: 'Complete visit departure, discharge summary verification, and follow-up booking.',
    descriptionBn: 'রোগীর প্রস্থান সম্পন্ন করুন এবং পরবর্তী ফলো-আপ অ্যাপয়েন্টমেন্ট নির্ধারণ করুন।',
  },
  {
    id: 'consultation_serial',
    titleEn: 'Consultation Serial',
    titleBn: 'ডাক্তার সিরিয়াল',
    icon: Hash,
    descriptionEn: 'Real-time doctor appointment queue, serial status, and waiting room allocation.',
    descriptionBn: 'ডাক্তার অ্যাপয়েন্টমেন্ট কিউ, সিরিয়াল নম্বর এবং অপেক্ষমাণ তালিকা পর্যবেক্ষণ।',
  },
  {
    id: 'therapy_slot',
    titleEn: 'Therapy Slot',
    titleBn: 'থেরাপি স্লট',
    icon: Clock,
    descriptionEn: 'Daily therapy hall schedule, slot availability, and patient session booking.',
    descriptionBn: 'থেরাপি হলের সময়সূচী, উপলব্ধ স্লট এবং রোগীর সেশন বুকিং পরিচালনা।',
  },
  {
    id: 'patients',
    titleEn: 'Patients',
    titleBn: 'রোগী তালিকা',
    icon: Users,
    descriptionEn: 'Patient directory, MRN search, contact records, and registration history.',
    descriptionBn: 'রোগীদের ডাটাবেস, এমআরএন (MRN) অনুসন্ধান এবং পূর্ববর্তী রেজিস্ট্রেশন রেকর্ড।',
  },
  {
    id: 'chat',
    titleEn: 'Chat',
    titleBn: 'অভ্যন্তরীণ বার্তা',
    icon: MessageSquare,
    descriptionEn: 'Direct internal communication with doctors, cashiers, handlers, and admin.',
    descriptionBn: 'ডাক্তার, ক্যাশিয়ার, থেরাপি হ্যান্ডলার এবং অ্যাডমিনের সাথে জরুরি অভ্যন্তরীণ যোগাযোগ।',
  },
];

export default function ReceptionistPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('checkin');

  return (
    <WorkstationShell activeTab="reception" allowedRoles={['admin', 'receptionist']}>
      {() => (
        <div className="flex-1 w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {language === 'bn' ? 'অভ্যর্থনা ও ফ্রন্ট ডেস্ক ওয়ার্কস্টেশন' : 'Receptionist & Front Desk Workstation'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === 'bn' ? 'রোগী নিবন্ধন, সিরিয়াল ইস্যু ও ডেস্ক পরিচালনা' : 'Patient registration, serial tokens, and front desk operations'}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full">
              <TabsList className="h-auto p-1.5 bg-muted/50 border border-border/40 rounded-xl flex flex-wrap items-center gap-1 sm:gap-1.5 w-full">
                {RECEPTIONIST_TABS.map((tab) => {
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

            {RECEPTIONIST_TABS.filter((t) => t.id !== 'checkin' && t.id !== 'checkout' && t.id !== 'consultation_serial' && t.id !== 'patients' && t.id !== 'therapy_slot').map((tab) => (
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
