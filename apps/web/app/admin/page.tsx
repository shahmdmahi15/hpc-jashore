// apps/web/app/admin/page.tsx
'use client';

import React, { useState } from 'react';
import { WorkstationShell } from '../../components/WorkstationShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WorkstationTabPlaceholder } from '../../components/WorkstationTabPlaceholder';
import AdminDashboardView from '../../components/AdminDashboardView';
import UsersAndDeviceManagementView from '../../components/admin/UsersAndDeviceManagementView';
import BulletinManagementView from '../../components/admin/BulletinManagementView';
import { RoomManagementView } from '../../components/admin/RoomManagementView';
import { TherapySlotConfigView } from '../../components/admin/TherapySlotConfigView';
import { ConsultationConfigView } from '../../components/admin/ConsultationConfigView';
import { TherapySlotBookingView } from '../../components/therapy/TherapySlotBookingView';
import { ExtraSlotManagementView } from '../../components/therapy/ExtraSlotManagementView';
import { PatientManagementView } from '../../components/patient/PatientManagementView';
import { CheckInWorkstationView } from '../../components/checkin/CheckInWorkstationView';
import { CheckoutWorkstationView } from '../../components/checkout/CheckoutWorkstationView';
import { ConsultationBookingView } from '../../components/consultation/ConsultationBookingView';
import { useLanguage } from '../../lib/i18n';
import {
  ShieldCheck,
  BarChart3,
  Users,
  Settings,
  Sliders,
  DoorOpen,
  Pill,
  UserCheck,
  LogOut,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Hash,
  Clock,
  Sparkles,
  MessageSquare,
  ClipboardList,
  FileSpreadsheet,
  Megaphone,
} from 'lucide-react';

const ADMIN_ROW1_TABS = [
  {
    id: 'overview',
    titleEn: 'Overview',
    titleBn: 'সার্বিক পরিসংখ্যান',
    icon: BarChart3,
    descriptionEn: 'Clinic performance, live revenue metrics, doctor statistics, and daily footfall.',
    descriptionBn: 'ক্লিনিকের সার্বিক পারফরম্যান্স, রাজস্ব আয়, ডাক্তার পরিসংখ্যান ও দৈনিক রোগী সংখ্যা।',
  },
  {
    id: 'users_devices',
    titleEn: 'Users & Device Management',
    titleBn: 'ব্যবহারকারী ও ডিভাইস',
    icon: Users,
    descriptionEn: 'Manage staff credentials, PIN codes, role assignments, TV screen pairing, and active sessions.',
    descriptionBn: 'স্টাফ অ্যাকাউন্ট, ৪-ডিজিট পিন, পদবী বরাদ্দ, টিভি স্ক্রিন পেয়ারিং ও সক্রিয় সেশন নিয়ন্ত্রণ।',
  },
  {
    id: 'patients_emr',
    titleEn: 'Patients & EMR',
    titleBn: 'রোগী ডাটাবেস ও EMR',
    icon: Users,
    descriptionEn: 'Central patient directory, electronic medical records (EMR), registration, and medical history.',
    descriptionBn: 'কেন্দ্রীয় রোগী ডাটাবেস, চিকিৎসা ইতিহাস এবং রেজিস্ট্রেশন ব্যবস্থাপনা।',
  },
  {
    id: 'bulletins',
    titleEn: 'Bulletins & Marquee',
    titleBn: 'বুলেটিন ও স্ক্রল নোটিশ',
    icon: Megaphone,
    descriptionEn: 'Create and control scrolling bulletins and urgent broadcast notices on waiting room TV screens.',
    descriptionBn: 'ওয়েটিং রুম টিভি স্ক্রিনের জন্য স্ক্রলিং নোটিশ, স্বাস্থ্যবার্তা ও জরুরি বিজ্ঞপ্তি পরিচালনা।',
  },
  {
    id: 'consultation_serial_config',
    titleEn: 'Consultation Serial Config',
    titleBn: 'সিরিয়াল কনফিগারেশন',
    icon: Settings,
    descriptionEn: 'Doctor fee schedules, slot durations, maximum daily quotas, and serial sequence counters.',
    descriptionBn: 'ডাক্তার ভিজিট ফি, চেম্বার সময়সীমা, দৈনিক রোগী কোটা ও অটোমেটিক সিকোয়েন্স কাউন্টার।',
  },
  {
    id: 'therapy_slot_config',
    titleEn: 'Therapy Slot Config',
    titleBn: 'থেরাপি স্লট কনফিগারেশন',
    icon: Sliders,
    descriptionEn: 'Define therapy modalities, pricing catalog, default session durations, and machine capacities.',
    descriptionBn: 'মডালিটি মূল্য তালিকা, চিকিৎসা সময়কাল, মেশিন সক্ষমতা ও স্লট সময়সূচী নির্ধারণ।',
  },
  {
    id: 'room_config',
    titleEn: 'Room Config',
    titleBn: 'রুম ও চেম্বার সেটিংস',
    icon: DoorOpen,
    descriptionEn: 'Consultation chamber rooms, therapy hall beds, reception desks, and waiting zones.',
    descriptionBn: 'ডাক্তার চেম্বার রুম, থেরাপি হল বেড, ফ্রন্ট ডেস্ক কাউন্টার ও ওয়েটিং জোন বিন্যাস।',
  },
  {
    id: 'medicine_directory',
    titleEn: 'Medicine Directory',
    titleBn: 'ওষুধ তালিকা ও ইনভেন্টরি',
    icon: Pill,
    descriptionEn: 'Pharmaceutical master list, generic names, stock batches, unit prices, and expiry tracker.',
    descriptionBn: 'ওষুধের তালিকা, জেনেরিক নাম, ব্যাচ নম্বর, স্টক ব্যালেন্স ও মেয়াদোত্তীর্ণ ট্র্যাকার।',
  },
  {
    id: 'audit_logs',
    titleEn: 'Audit Log',
    titleBn: 'অডিট লগ',
    icon: ClipboardList,
    descriptionEn: 'Immutable system event trail, security access logs, financial audit records, and administrative modifications.',
    descriptionBn: 'সিস্টেম কার্যক্রমের লগ, নিরাপত্তা অডিট, আর্থিক পরিবর্তনের ইতিহাস ও সংবেদনশীল অ্যাডমিন একশনের রেকর্ড।',
  },
  {
    id: 'reports',
    titleEn: 'Reports',
    titleBn: 'রিপোর্ট ও বিশ্লেষণ',
    icon: FileSpreadsheet,
    descriptionEn: 'Financial balance sheets, daily cashier collection summaries, doctor consultation statistics, and exportable analytics.',
    descriptionBn: 'আর্থিক ব্যালেন্স শিট, দৈনিক ক্যাশিয়ার কালেকশন রিপোর্ট, ডাক্তার ভিজিট পরিসংখ্যান ও ডেটা এক্সপোর্ট।',
  },
];

const ADMIN_ROW2_TABS = [
  {
    id: 'checkin',
    titleEn: 'Check-in',
    titleBn: 'চেক-ইন',
    icon: UserCheck,
    descriptionEn: 'Front desk reception intake, queue token issuance, and patient arrival verification.',
    descriptionBn: 'রোগীর আগমন নিবন্ধন, সিরিয়াল টোকেন ইস্যু ও প্রোফাইল যাচাইকরণ।',
  },
  {
    id: 'checkout',
    titleEn: 'Check-out',
    titleBn: 'চেক-আউট',
    icon: LogOut,
    descriptionEn: 'Patient departure clearance, discharge summaries, prescription collection, and follow-ups.',
    descriptionBn: 'রোগীর প্রস্থান অনুমোদন, প্রেসক্রিপশন প্রদান ও পরবর্তী সাক্ষাতের তারিখ নির্ধারণ।',
  },
  {
    id: 'patients',
    titleEn: 'Patients',
    titleBn: 'রোগী',
    icon: Users,
    descriptionEn: 'Central patient directory, registration, records, and search.',
    descriptionBn: 'রোগী নিবন্ধন, তথ্য অনুসন্ধান ও বিস্তারিত প্রোফাইল।',
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
    id: 'paid',
    titleEn: 'Paid',
    titleBn: 'পরিশোধিত বিল',
    icon: CheckCircle2,
    descriptionEn: 'Completed transactions, payment receipts, bKash/Nagad digital verifications, and drawer float.',
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
    descriptionEn: 'Live cross-doctor appointment serials, queue status, and chamber waiting lists.',
    descriptionBn: 'সকল ডাক্তারের লাইভ সিরিয়াল অগ্রগতি, চেম্বার কিউ ও অপেক্ষমাণ তালিকা।',
  },
  {
    id: 'therapy_slot',
    titleEn: 'Therapy Slot',
    titleBn: 'থেরাপি স্লট',
    icon: Clock,
    descriptionEn: 'Live therapy hall occupancy, machine allocation, and patient session schedules.',
    descriptionBn: 'থেরাপি হলের সময়সূচী, মেশিন বরাদ্দ ও রোগীর চলমান সেশন মনিটরিং।',
  },
  {
    id: 'extra_slot',
    titleEn: 'Extra Slot',
    titleBn: 'অতিরিক্ত স্লট',
    icon: Sparkles,
    descriptionEn: 'Emergency overbooking and extra quota management for overflow and high-priority patients.',
    descriptionBn: 'জরুরি ওভারবুকিং, অতিরিক্ত স্লট কোটা ও বিশেষ রোগীদের জন্য সেশন বরাদ্দ ব্যবস্থাপনা।',
  },
  {
    id: 'chat',
    titleEn: 'Chat',
    titleBn: 'অভ্যন্তরীণ বার্তা',
    icon: MessageSquare,
    descriptionEn: 'Clinic-wide broadcast notices, departmental group chats, and urgent team pings.',
    descriptionBn: 'ক্লিনিক-ব্যাপী জরুরি নোটিশ, বিভাগীয় চ্যাট এবং কর্মীদের সাথে দ্রুত যোগাযোগ।',
  },
];

export default function AdminPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <WorkstationShell activeTab="admin" allowedRoles={['admin']}>
      {() => (
        <div className="flex-1 w-full max-w-[1720px] mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-6">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {language === 'bn' ? 'অ্যাডমিন ও ব্যবস্থাপনা কনসোল' : 'Admin & Management Console'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {language === 'bn' ? 'সিস্টেম কনফিগারেশন, অডিট ও সর্বমোট ক্লিনিক্যাল নিয়ন্ত্রণ' : 'System configuration, financial oversight, and clinic management'}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            {/* 1st Row of Tabs: Administration & Configuration */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-1">
                {language === 'bn' ? '১ম সারি: সিস্টেম অ্যাডমিন ও কনফিগারেশন' : 'Row 1: System Admin & Configuration'}
              </span>
              <div className="w-full">
                <TabsList className="h-auto p-1.5 bg-muted/60 border border-border/40 rounded-xl flex flex-wrap items-center gap-1 sm:gap-1.5 w-full">
                  {ADMIN_ROW1_TABS.map((tab) => {
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
            </div>

            {/* 2nd Row of Tabs: Operational Workstations */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-1">
                {language === 'bn' ? '২য় সারি: অপারেশন ও সার্ভিসেস' : 'Row 2: Operations & Services'}
              </span>
              <div className="w-full">
                <TabsList className="h-auto p-1.5 bg-muted/40 border border-border/40 rounded-xl flex flex-wrap items-center gap-1 sm:gap-1.5 w-full">
                  {ADMIN_ROW2_TABS.map((tab) => {
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
            </div>

            {/* Content for Row 1 Tabs */}
            <TabsContent value="overview" className="mt-4 focus-visible:outline-none">
              <AdminDashboardView />
            </TabsContent>

            <TabsContent value="users_devices" className="mt-4 focus-visible:outline-none">
              <UsersAndDeviceManagementView />
            </TabsContent>

            <TabsContent value="bulletins" className="mt-4 focus-visible:outline-none">
              <BulletinManagementView />
            </TabsContent>

            <TabsContent value="patients_emr" className="mt-4 focus-visible:outline-none">
              <PatientManagementView />
            </TabsContent>

            <TabsContent value="room_config" className="mt-4 focus-visible:outline-none">
              <RoomManagementView />
            </TabsContent>

            <TabsContent value="consultation_serial_config" className="mt-4 focus-visible:outline-none">
              <ConsultationConfigView />
            </TabsContent>

            <TabsContent value="therapy_slot_config" className="mt-4 focus-visible:outline-none">
              <TherapySlotConfigView />
            </TabsContent>

            {ADMIN_ROW1_TABS.filter((t) => t.id !== 'overview' && t.id !== 'users_devices' && t.id !== 'bulletins' && t.id !== 'patients_emr' && t.id !== 'room_config' && t.id !== 'therapy_slot_config' && t.id !== 'consultation_serial_config').map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4 focus-visible:outline-none">
                <WorkstationTabPlaceholder
                  titleEn={tab.titleEn}
                  titleBn={tab.titleBn}
                  descriptionEn={tab.descriptionEn}
                  descriptionBn={tab.descriptionBn}
                  icon={tab.icon}
                  badgeEn="Admin Configuration"
                  badgeBn="অ্যাডমিন সেটিংস"
                />
              </TabsContent>
            ))}

            {/* Content for Row 2 Tabs */}
            <TabsContent value="checkin" className="mt-4 focus-visible:outline-none">
              <CheckInWorkstationView />
            </TabsContent>

            <TabsContent value="checkout" className="mt-4 focus-visible:outline-none">
              <CheckoutWorkstationView />
            </TabsContent>

            <TabsContent value="patients" className="mt-4 focus-visible:outline-none">
              <PatientManagementView />
            </TabsContent>

            <TabsContent value="consultation_serial" className="mt-4 focus-visible:outline-none">
              <ConsultationBookingView />
            </TabsContent>

            <TabsContent value="therapy_slot" className="mt-4 focus-visible:outline-none">
              <TherapySlotBookingView />
            </TabsContent>

            <TabsContent value="extra_slot" className="mt-4 focus-visible:outline-none">
              <ExtraSlotManagementView />
            </TabsContent>

            {ADMIN_ROW2_TABS.filter((t) => t.id !== 'checkin' && t.id !== 'checkout' && t.id !== 'consultation_serial' && t.id !== 'therapy_slot' && t.id !== 'patients' && t.id !== 'extra_slot').map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4 focus-visible:outline-none">
                <WorkstationTabPlaceholder
                  titleEn={tab.titleEn}
                  titleBn={tab.titleBn}
                  descriptionEn={tab.descriptionEn}
                  descriptionBn={tab.descriptionBn}
                  icon={tab.icon}
                  badgeEn="Operational Module"
                  badgeBn="অপারেশন মডিউল"
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </WorkstationShell>
  );
}
