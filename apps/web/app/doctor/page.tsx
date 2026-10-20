// apps/web/app/doctor/page.tsx
'use client';

import React, { useState } from 'react';
import { WorkstationShell } from '../../components/WorkstationShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WorkstationTabPlaceholder } from '../../components/WorkstationTabPlaceholder';
import { useLanguage } from '../../lib/i18n';
import {
  Stethoscope,
  Activity,
  Hash,
  Clock,
  Users,
  MessageSquare,
} from 'lucide-react';

const DOCTOR_TABS = [
  {
    id: 'consultation_queue',
    titleEn: 'Consultation Queue',
    titleBn: 'চেম্বার কিউ',
    icon: Stethoscope,
    descriptionEn: 'Live patient serial calling, consultation history, clinical notes, and prescription drafting.',
    descriptionBn: 'লাইভ সিরিয়াল কলিং, প্রেসক্রিপশন তৈরি, ক্লিনিক্যাল ইতিহাস ও পরামর্শ নথিভুক্তকরণ।',
  },
  {
    id: 'running_therapy',
    titleEn: 'Running Therapy',
    titleBn: 'চলমান থেরাপি',
    icon: Activity,
    descriptionEn: 'Real-time overview of your prescribed therapy sessions currently running in the Therapy Hall.',
    descriptionBn: 'আপনার নির্দেশিত থেরাপি সেশনসমূহের বর্তমান অগ্রগতি এবং রোগীদের অবস্থা পর্যবেক্ষণ।',
  },
  {
    id: 'consultation_serial',
    titleEn: 'Consultation Serial',
    titleBn: 'ডাক্তার সিরিয়াল',
    icon: Hash,
    descriptionEn: 'Daily appointment serials, booked slots, patient arrival status, and missed calls.',
    descriptionBn: 'আজকের পূর্ণাঙ্গ সিরিয়াল তালিকা, উপস্থিতির স্থিতি এবং অপেক্ষমাণ রোগী বিবরণ।',
  },
  {
    id: 'therapy_slot',
    titleEn: 'Therapy Slot',
    titleBn: 'থেরাপি স্লট',
    icon: Clock,
    descriptionEn: 'Machine availability and schedule to prescribe therapy packages with optimal bed allocation.',
    descriptionBn: 'থেরাপি মেশিনের প্রাপ্যতা ও রোগীর জন্য উপযুক্ত থেরাপি স্লট নির্ধারণ।',
  },
  {
    id: 'patients',
    titleEn: 'Patients',
    titleBn: 'রোগী তালিকা',
    icon: Users,
    descriptionEn: 'Complete electronic medical records (EMR), diagnosis reports, vitals, and previous prescriptions.',
    descriptionBn: 'রোগীর পূর্ববর্তী মেডিকেল রেকর্ড, রোগ নির্ণয়ের রিপোর্ট ও পূর্বের প্রেসক্রিপশন।',
  },
  {
    id: 'chat',
    titleEn: 'Chat',
    titleBn: 'অভ্যন্তরীণ বার্তা',
    icon: MessageSquare,
    descriptionEn: 'Direct coordination with therapy handlers, reception, pharmacy, and clinic admin.',
    descriptionBn: 'থেরাপিস্ট, ফ্রন্ট ডেস্ক ও ফার্মাসিস্টের সাথে জরুরি ক্লিনিক্যাল বার্তা আদান-প্রদান।',
  },
];

export default function DoctorPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('consultation_queue');

  return (
    <WorkstationShell activeTab="doctor" allowedRoles={['admin', 'doctor']}>
      {() => (
        <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {language === 'bn' ? 'ডাক্তার চেম্বার ও ক্লিনিক্যাল ওয়ার্কস্টেশন' : 'Doctor Chamber & Clinical Workstation'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === 'bn' ? 'পরামর্শ সেবা, প্রেসক্রিপশন ও থেরাপি নির্দেশনা' : 'Clinical consultation, prescription writing, and therapy oversight'}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto pb-2 scrollbar-none">
              <TabsList className="h-auto p-1 bg-muted/50 border border-border/40 rounded-xl inline-flex gap-1 min-w-full sm:min-w-0">
                {DOCTOR_TABS.map((tab) => {
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

            {DOCTOR_TABS.map((tab) => (
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
