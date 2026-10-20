// apps/web/app/handler/page.tsx
'use client';

import React, { useState } from 'react';
import { WorkstationShell } from '../../components/WorkstationShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WorkstationTabPlaceholder } from '../../components/WorkstationTabPlaceholder';
import { useLanguage } from '../../lib/i18n';
import {
  Activity,
  Hash,
  Clock,
  Users,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

const HANDLER_TABS = [
  {
    id: 'therapy_queue',
    titleEn: 'Therapy Queue',
    titleBn: 'থেরাপি কিউ',
    icon: Activity,
    descriptionEn: 'Active therapy hall beds, modality timer controls, machine allocation, and session tracking.',
    descriptionBn: 'থেরাপি হলের সক্রিয় বেড, মডালিটি টাইমার ও মেশিন বরাদ্দ পর্যবেক্ষণ।',
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
    descriptionEn: 'Daily machine and bed schedule, equipment maintenance intervals, and slot roster.',
    descriptionBn: 'দৈনিক থেরাপি স্লট সূচী, মেশিন মেইনটেন্যান্স ও বেড বুকিং রস্টার।',
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

  return (
    <WorkstationShell activeTab="handler" allowedRoles={['admin', 'handler']}>
      {() => (
        <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
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
                  {language === 'bn' ? 'মডালিটি প্রয়োগ, বেড ব্যবস্থাপনা ও সেশন পরিচালনা' : 'Modality application, bed management, and session execution'}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto pb-2 scrollbar-none">
              <TabsList className="h-auto p-1 bg-muted/50 border border-border/40 rounded-xl inline-flex gap-1 min-w-full sm:min-w-0">
                {HANDLER_TABS.map((tab) => {
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

            {HANDLER_TABS.map((tab) => (
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
