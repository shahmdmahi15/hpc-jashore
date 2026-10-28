// apps/web/app/handler/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { WorkstationShell } from '../../components/WorkstationShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WorkstationTabPlaceholder } from '../../components/WorkstationTabPlaceholder';
import TherapyHallView from '../../components/TherapyHallView';
import { PatientManagementView } from '../../components/patient/PatientManagementView';
import { TherapySlotBookingView } from '../../components/therapy/TherapySlotBookingView';
import { CheckInWorkstationView } from '../../components/checkin/CheckInWorkstationView';
import { CheckoutWorkstationView } from '../../components/checkout/CheckoutWorkstationView';
import { ConsultationBookingView } from '../../components/consultation/ConsultationBookingView';
import { ClinicRealtimeChatView } from '../../components/chat/ClinicRealtimeChatView';
import { useLanguage } from '../../lib/i18n';
import { useChatNotifier } from '../../lib/use-chat-notifier';
import {
  Activity,
  Hash,
  Clock,
  Users,
  MessageSquare,
  Sparkles,
  UserCheck,
  LogOut,
} from 'lucide-react';

const HANDLER_TABS = [
  {
    id: 'therapy_queue',
    titleEn: 'Therapy Queue',
    titleBn: 'থেরাপি কিউ',
    icon: Activity,
    descriptionEn: 'Active therapy hall equipment, modality timer controls, machine allocation, and session tracking.',
    descriptionBn: 'থেরাপি হলের সক্রিয় যন্ত্রপাতি, মডালিটি টাইমার ও মেশিন বরাদ্দ পর্যবেক্ষণ।',
  },
  {
    id: 'checkin',
    titleEn: 'Check-in',
    titleBn: 'চেক-ইন',
    icon: UserCheck,
    descriptionEn: 'Receive arrived patients, issue therapy hall tokens, and check punctuality.',
    descriptionBn: 'আগত রোগীদের গ্রহণ, থেরাপি টোকেন ইস্যু ও সময়ানুবর্তিতা যাচাই।',
  },
  {
    id: 'checkout',
    titleEn: 'Check-out',
    titleBn: 'চেক-আউট',
    icon: LogOut,
    descriptionEn: 'Verify therapy session completion, clear departure, and schedule next therapy visit.',
    descriptionBn: 'থেরাপি সেশন সমাপ্তি নিশ্চিতকরণ, প্রস্থান অনুমোদন ও পরবর্তী থেরাপির তারিখ নির্ধারণ।',
  },
  {
    id: 'consultation_serial',
    titleEn: 'Consultation Serial',
    titleBn: 'ডাক্তার সিরিয়াল',
    icon: Hash,
    descriptionEn: 'View doctor chamber consultation progress and patient flow into the therapy hall.',
    descriptionBn: 'ডাক্তার চেম্বারের সিরিয়াল অগ্রগতি এবং থেরাপির জন্য প্রেরিত রোগীদের পর্যবেক্ষণ।',
  },
  {
    id: 'therapy_slot',
    titleEn: 'Therapy Slot',
    titleBn: 'থেরাপি স্লট',
    icon: Clock,
    descriptionEn: 'Daily machine and equipment schedule, maintenance intervals, and slot roster.',
    descriptionBn: 'দৈনিক থেরাপি স্লট সূচী, মেশিন মেইনটেন্যান্স ও বরাদ্দ রস্টার।',
  },
  {
    id: 'patients',
    titleEn: 'Patients',
    titleBn: 'রোগী তালিকা',
    icon: Users,
    descriptionEn: 'Therapy patient clinical records, prescription modalities, and exercise regimens.',
    descriptionBn: 'রোগীর থেরাপি প্রেসক্রিপশন, নির্দেশিত মডালিটি ও সেশন ইতিহাস।',
  },
  {
    id: 'chat',
    titleEn: 'Chat',
    titleBn: 'অভ্যন্তরীণ বার্তা',
    icon: MessageSquare,
    descriptionEn: 'Real-time communication with prescribing doctors, receptionists, and supervisors.',
    descriptionBn: 'ডাক্তার, রিসেপশনিস্ট ও ক্লিনিক্যাল টিমের সাথে সরাসরি অভ্যন্তরীণ যোগাযোগ।',
  },
];

export default function HandlerPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('therapy_queue');
  const { unreadCount } = useChatNotifier(activeTab === 'chat');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  return (
    <WorkstationShell activeTab="handler" allowedRoles={['admin', 'handler']}>
      {() => (
        <div className="flex-1 w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {language === 'bn' ? 'থেরাপি হল ও হ্যান্ডলার ওয়ার্কস্টেশন' : 'Therapy Hall & Handler Workstation'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === 'bn' ? 'মডালিটি প্রয়োগ, যন্ত্রপাতি ব্যবস্থাপনা ও সেশন পরিচালনা' : 'Modality application, machine management, and session execution'}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="w-full">
              <TabsList className="h-auto p-1.5 bg-muted/50 border border-border/40 rounded-xl flex flex-wrap items-center gap-1 sm:gap-1.5 w-full">
                {HANDLER_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isChat = tab.id === 'chat';
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      data-chat-tab-trigger={isChat ? 'true' : undefined}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs transition-all whitespace-nowrap cursor-pointer touch-manipulation active:scale-95 relative"
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span>{language === 'bn' ? tab.titleBn : tab.titleEn}</span>
                      {isChat && unreadCount > 0 && (
                        <span className="flex items-center gap-1 ml-1">
                          <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                          <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500 text-white">
                            {unreadCount}
                          </span>
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <TabsContent value="therapy_queue" className="mt-4 focus-visible:outline-none">
              <TherapyHallView />
            </TabsContent>

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

            <TabsContent value="chat" className="mt-4 focus-visible:outline-none">
              <ClinicRealtimeChatView />
            </TabsContent>

            {HANDLER_TABS.filter((t) => t.id !== 'therapy_queue' && t.id !== 'checkin' && t.id !== 'checkout' && t.id !== 'consultation_serial' && t.id !== 'patients' && t.id !== 'therapy_slot' && t.id !== 'chat').map((tab) => (
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
