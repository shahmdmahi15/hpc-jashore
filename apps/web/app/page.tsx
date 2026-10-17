// apps/web/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  CreditCard,
  HeartPulse,
  Laptop,
  MapPin,
  MessageCircle,
  Phone,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tv,
  Users,
  Zap,
} from 'lucide-react';
import { NavbarSwitchers } from '../components/NavbarSwitchers';
import { useLanguage } from '../lib/i18n';

export default function LandingPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-500 antialiased overflow-x-hidden transition-colors duration-300">
      {/* ============================================================== */}
      {/* TOP NAVIGATION BAR                                            */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-card/85 border-b border-border/80 px-4 sm:px-8 py-3 flex items-center justify-between transition-colors duration-300 shadow-xs">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <Image
              src="/hpclogo-transparent.png"
              alt="HPC Jashore Logo"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-foreground flex items-center gap-1.5">
              HPC{' '}
              <span className="text-emerald-500 font-semibold text-sm">
                Jashore
              </span>
            </span>
            <p className="text-[11px] text-muted-foreground font-medium hidden sm:block">
              {t.brandSub}
            </p>
          </div>
        </div>

        {/* Navbar Items: ONLY TV, Login, and Switchers (Language + Theme) */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {/* Smart TV Queue */}
          <Link
            href="/tv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-card/80 hover:bg-muted/80 text-foreground border border-border/80 hover:border-emerald-500/40 transition-all shadow-xs"
          >
            <Tv className="size-3.5 text-emerald-500" />
            <span>{t.tvQueue}</span>
          </Link>

          {/* Login */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <span>{t.login}</span>
          </Link>

          {/* Switchers (Language + Dual Theme) */}
          <NavbarSwitchers />
        </nav>
      </header>

      {/* ============================================================== */}
      {/* HERO SECTION                                                  */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-8 border-b border-border/60">
        {/* Subtle ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border/80 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {isBn
                ? 'প্রতিষ্ঠাতা · সিইও · চিফ কনসালট্যান্ট · ডাঃ মোঃ তৌফিক উজ জামান'
                : 'Founder · CEO · Head Doctor · Dr. Toufiq Uz Zaman'}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.15] mb-6">
            {isBn ? (
              <>
                ব্যথা মুক্ত সুস্থ জীবন।{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600">
                  স্বাভাবিক ছন্দে প্রত্যাবর্তন।
                </span>
              </>
            ) : (
              <>
                Move beyond pain.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600">
                  Return to life.
                </span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8 font-normal">
            {isBn
              ? 'যশোরে বিজ্ঞানসম্মত ফিজিওথেরাপি, পেইন ম্যানেজমেন্ট ও নিউরো রিহ্যাবিলিটেশন — দ্রুত সুস্থতা, শক্তি ও পূর্ণ কর্মক্ষমতা পুনরুদ্ধারে আপনার নির্ভরযোগ্য কেন্দ্র।'
              : 'Evidence-led physiotherapy, pain management and neuro rehabilitation in Jashore for people ready to feel stronger, steadier and fully themselves again.'}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full mb-12">
            <a
              href="https://wa.me/8801515615188?text=Hello%2C%20I%20would%20like%20to%20know%20more%20about%20booking%20an%20appointment%20with%20Dr.%20Toufiq."
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <MessageCircle className="size-5" />
              <span>
                {isBn
                  ? 'ডাঃ তৌফিকের সাথে কথা বলুন (WhatsApp)'
                  : 'Talk to Dr. Toufiq (WhatsApp)'}
              </span>
              <ArrowUpRight className="size-4" />
            </a>

            <Link
              href="/tv"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-card hover:bg-muted text-foreground border border-border transition-all"
            >
              <Tv className="size-5 text-emerald-500" />
              <span>
                {isBn
                  ? 'স্মার্ট টিভি কিউ লাইভ দেখুন'
                  : 'Live Smart TV Queue'}
              </span>
            </Link>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-card hover:bg-muted text-foreground border border-border transition-all"
            >
              <Activity className="size-5 text-emerald-500" />
              <span>
                {isBn
                  ? 'ক্লিনিক্যাল ওয়ার্কস্টেশন লগইন'
                  : 'Clinical Workstation Login'}
              </span>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-3xl pt-8 border-t border-border/80 text-center">
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-500">
                12+
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isBn ? 'বছরের চিকিৎসা সেবা' : 'Years of Care'}
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-foreground">
                10k+
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isBn ? 'সন্তুষ্ট রোগী' : 'Patients Supported'}
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-500">
                98%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isBn ? 'রোগীর সন্তুষ্টি' : 'Patient Trust'}
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-foreground">
                100%
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isBn ? 'রিয়েলটাইম EMR সিস্টেম' : 'Realtime EMR System'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 01. THE HPC DIFFERENCE & DOCTOR TOUFIQ                         */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-border/60 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-500 mb-3">
            <span>01</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>{isBn ? 'এইচপিসির স্বাতন্ত্র্য' : 'THE HPC DIFFERENCE'}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mb-4">
                {isBn
                  ? 'রোগীভিত্তিক যত্নশীল চিকিৎসা পদ্ধতি।'
                  : 'Care that sees the whole person.'}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4">
                {isBn
                  ? 'এইচপিসি সেন্টারে আরোগ্য কোনো দ্রুত বা সাধারণ প্রক্রিয়া নয়। মনোযোগ দিয়ে শোনা, বিস্তারিত রোগ নির্ণয় এবং শরীরের সাথে সামঞ্জস্যপূর্ণ প্রমাণভিত্তিক চিকিৎসা নিয়ে শুরু হয় প্রতিটি ধাপ।'
                  : 'At HPC Health & Pain Care Center, recovery is not rushed or generic. Each plan begins with listening, thorough clinical assessment, and an evidence-based roadmap tailored to your body.'}
              </p>
              <div className="p-4 rounded-2xl bg-card border border-border mt-6">
                <div className="text-xs uppercase font-extrabold tracking-wider text-emerald-500">
                  {isBn ? 'হেড ডক্টর ও পরিচালক' : 'Head Doctor & Director'}
                </div>
                <div className="text-lg font-bold text-foreground mt-0.5">
                  {isBn ? 'ডাঃ মোঃ তৌফিক উজ জামান' : 'Dr. Md. Toufiq Uz Zaman'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  BPT (DU), PGD (Acupuncture, China), MDMR (Pain Management,
                  DU), MPH · Founder, CEO &amp; Head Doctor
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20 font-bold text-xs">
                  01
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isBn ? 'মনোযোগ দিয়ে শোনা' : 'Listen first'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isBn
                      ? 'আপনার কষ্টের বিবরণ, ব্যথার ইতিহাস এবং দৈনন্দিন সমস্যা অনুধাবন করে চিকিৎসার ভিত্তি তৈরি করা হয়।'
                      : 'Your personal story, pain timeline, daily routines, and functional goals shape the baseline of all clinical actions.'}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20 font-bold text-xs">
                  02
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isBn ? 'সঠিক ডায়াগনোসিস' : 'Understand clearly'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isBn
                      ? 'নির্দিষ্ট স্নায়বিক ও পেশির পরীক্ষার মাধ্যমে নিশ্চিত হয়ে সুস্পষ্ট প্রেসক্রিপশন প্রণয়ন করা হয়।'
                      : 'Targeted neurological and musculoskeletal assessments turn uncertainty into a practical, step-by-step prescription.'}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20 font-bold text-xs">
                  03
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isBn ? 'দীর্ঘমেয়াদী আরোগ্য' : 'Build forward'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isBn
                      ? 'ইলেক্ট্রোথেরাপি, স্পাইনাল ডিকম্প্রেশন, থেরাপিউটিক এক্সারসাইজের মাধ্যমে দীর্ঘস্থায়ী সুস্থতা নিশ্চিত করা হয়।'
                      : 'Progressive electrotherapy, spinal decompression, manual mobilization, and therapeutic exercise help you regain long-term independence.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 02. AREAS OF EXPERTISE                                         */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-border/60">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-500 mb-3">
            <span>02</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>{isBn ? 'বিশেষায়িত সেবাসমূহ' : 'AREAS OF EXPERTISE'}</span>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              {isBn
                ? 'আধুনিক প্রযুক্তিতে বিশেষায়িত থেরাপি।'
                : 'Specialized care, thoughtfully delivered.'}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
              {isBn
                ? 'মেরুদণ্ডের সমস্যা থেকে শুরু করে স্ট্রোক রিহ্যাবিলিটেশন—ডাঃ তৌফিকের নেতৃত্বে পরিচালিত হয় সমন্বিত চিকিৎসা।'
                : 'From everyday spinal strain to complex neurological recovery, Dr. Toufiq combines modern clinical modalities with personalized attention.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1 */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <HeartPulse className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {isBn ? 'কোমর ও মেরুদণ্ডের ব্যথা' : 'Spine & Back Care'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isBn
                    ? 'PLID, সায়াটিকা, লাম্বার স্পন্ডাইলোসিস এবং ডিস্ক প্রোল্যাপ্স চিকিৎসায় উন্নত স্পাইনাল ট্র্যাকশন ও রিহ্যাব।'
                    : 'Targeted protocols for lumbar disc herniation, sciatica, postural strain, and acute disc pain.'}
                </p>
              </div>
            </div>

            {/* 2 */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Brain className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {isBn ? 'নিউরো রিহ্যাবিলিটেশন' : 'Neuro Rehabilitation'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isBn
                    ? 'স্ট্রোক প্যারালাইসিস, ফেসিয়াল পলসি, নার্ভ ইনজুরি এবং চলাচলের ভারসাম্যহীনতা দূরীকরণে আধুনিক থেরাপি।'
                    : 'Post-stroke motor recovery, facial palsy, neuropathy, and movement retraining.'}
                </p>
              </div>
            </div>

            {/* 3 */}
            <div className="p-6 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <Activity className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {isBn ? 'ঘাড়, কাঁধ ও হাঁটুর ব্যথা' : 'Joint & Arthritis Care'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isBn
                    ? 'ফ্রোজেন শোল্ডার, হাঁটুর অস্টিওআর্থ্রাইটিস, সার্ভাইকাল স্পন্ডাইলোসিস ও স্পোর্টস ইনজুরির স্থায়ী সমাধান।'
                    : 'Knee osteoarthritis, frozen shoulder, cervical radiculopathy, and sports injury recovery.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 03. REALTIME CUSTOM CLINIC SOFTWARE ENGINE                      */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-border/60 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-500 mb-3">
            <span>03</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>{isBn ? 'আমাদের কাস্টম ক্লিনিক্যাল সফটওয়্যার' : 'REALTIME CLINICAL PLATFORM'}</span>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              {isBn
                ? 'এইচপিসির নিজস্ব রিয়েলটাইম ক্লিনিক অপারেটিং সিস্টেম।'
                : 'Next-Generation Realtime Clinic Architecture.'}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
              {isBn
                ? 'রিসেপশন, ডাক্তার চেম্বার, থেরাপি হল, ক্যাশিয়ার এবং ওয়েটিং টিভি সম্পূর্ণ অফলাইন ও রিয়েলটাইমে সিঙ্ক থাকে।'
                : 'Engineered specifically for Health & Pain Care Center Jashore with zero external SaaS dependencies, local offline resilience, and live WebSockets.'}
            </p>
          </div>

          {/* Workstations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-2 font-bold">
                <Users className="size-4" />
                <span>/receptionist</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'রিসেপশন ও টোকেন কাউন্টার' : 'Reception & Patient Desk'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isBn
                  ? 'রোগী নিবন্ধন, ডিজিটাল প্রেসক্রিপশন ইতিহাস এবং তাৎক্ষণিক কনসালটেশন টোকেন ইস্যু।'
                  : 'Fast patient registration, thermal token slip printing, and real-time consultation dispatch.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-2 font-bold">
                <Stethoscope className="size-4" />
                <span>/doctor</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'ডাক্তার চেম্বার কনসোল' : 'Doctor Chamber & SOAP'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isBn
                  ? 'ডাঃ তৌফিকের জন্য ওয়ান-ট্যাপ টোকেন কল, ডিজিটাল প্রেসক্রিপশন ও থেরাপিউটিক প্ল্যান।'
                  : 'One-click patient call, integrated SOAP clinical records, and direct modality prescribing.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-2 font-bold">
                <Zap className="size-4" />
                <span>/therapy</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'থেরাপি হল ও বেড মেট্রিক্স' : 'Therapy Hall Bed Matrix'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isBn
                  ? '১৬টি বেডের লাইভ অকুপেন্সি, মোডালিটি কাউন্টডাউন টাইমার ও সম্পূর্ণ সেশন ট্র্যাকিং।'
                  : 'Live 16-bed matrix, audio-visual timers for UST/SWD/IRR, and completion logging.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-2 font-bold">
                <CreditCard className="size-4" />
                <span>/cashier</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'ক্যাশিয়ার ও ডিজিটাল বিলিং' : 'Cashier & Billing Desk'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isBn
                  ? 'কনসালটেশন ও থেরাপি ফি আদায়, থার্মাল রসিদ ও রিয়েলটাইম ডেইলি অডিট।'
                  : 'Cash and mobile banking payments, 80mm thermal receipt printing, and daily closing.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-2 font-bold">
                <Tv className="size-4" />
                <span>/tv</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'ওয়েটিং রুম স্মার্ট টিভি কিউ' : 'Waiting Room TV Queue'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isBn
                  ? 'যশোর ক্লিনিকের ওয়েটিং রুমে ৫২" টিভিতে ডুয়েল কলাম টোকেন কল ও বাংলা-ইংরেজি অ্যানাউন্সমেন্ট।'
                  : 'Dual-column token queue for consultation & therapy, text-to-speech audio, and zero-scroll fit.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 mb-2 font-bold">
                <ShieldCheck className="size-4" />
                <span>/admin</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isBn ? 'সিস্টেম অ্যাডমিন ড্যাশবোর্ড' : 'System Administration'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5">
                {isBn
                  ? 'ক্লিনিক্যাল স্টাফ ম্যানেজমেন্ট, ডাটাবেজ ব্যাকআপ, সিকিউরিটি অডিট ও অ্যানালিটিক্স।'
                  : 'Role-based access control, cryptographic audit trail, and database maintenance.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 04. LOCATION, HOURS & CONTACT                                  */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-border/60">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-500 mb-3">
            <span>04</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>{isBn ? 'যোগাযোগ ও সময়সূচী' : 'HOURS & LOCATION'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mb-4">
                {isBn ? 'সরাসরি সেন্টারে আসুন।' : 'Visit HPC Center.'}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
                {isBn
                  ? 'যশোর চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল মোড়, যশোর সদর। আগাম সিরিয়াল গ্রহণ কাম্য।'
                  : 'Visit HPC Health & Pain Care Center opposite Chachra Police Fari, Chachra Dalmil, Jashore Sadar. Prior booking is recommended.'}
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-muted-foreground">
                      {isBn ? 'ঠিকানা' : 'Clinic Address'}
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {isBn
                        ? 'চাঁচরা পুলিশ ফাঁড়ির বিপরীতে, চাঁচরা ডালমিল'
                        : 'Opposite Chachra Police Fari, Chachra Dalmil'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isBn
                        ? 'যশোর সদর, যশোর ৭৪০০, বাংলাদেশ'
                        : 'Jashore Sadar, Jashore 7400, Bangladesh'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-muted-foreground">
                      {isBn ? 'সরাসরি যোগাযোগ ও হোয়াটসঅ্যাপ' : 'Direct Contact & WhatsApp'}
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      +880 1515-615188
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isBn ? 'ডাঃ তৌফিকের নিজস্ব হোয়াটসঅ্যাপ' : 'Direct WhatsApp reply from Dr. Toufiq'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-muted-foreground">
                      {isBn ? 'রোগী দেখার সময়সূচী' : 'Working Hours'}
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {isBn
                        ? 'শনিবার – বৃহস্পতিবার: সকাল ৮:০০ – রাত ৯:০০'
                        : 'Saturday – Thursday: 8:00 AM – 9:00 PM'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isBn
                        ? 'শুক্রবার: বিকাল ৪:০০ – রাত ৯:০০'
                        : 'Friday: 4:00 PM – 9:00 PM'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-card border border-border flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  MAP &amp; DIRECTIONS
                </span>
                <h3 className="text-lg font-bold text-foreground mt-3">
                  Chachra, Jashore
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Opposite Chachra Police Fari, Chachra Dalmil, Jashore Sadar ·
                  7400
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=HPC+Health+and+Pain+Care+Center+Chachra+Jashore"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  <MapPin className="size-3.5" />
                  <span>{isBn ? 'গুগল ম্যাপে দেখুন' : 'Open in Google Maps'}</span>
                  <ArrowUpRight className="size-3.5" />
                </a>

                <a
                  href="https://wa.me/8801515615188"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
                >
                  <MessageCircle className="size-3.5" />
                  <span>{isBn ? 'সিরিয়াল বুক করুন' : 'Book Appointment'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER                                                        */}
      {/* ============================================================== */}
      <footer className="py-8 bg-card border-t border-border px-4 sm:px-8 text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden border border-zinc-200">
              <Image
                src="/hpclogo-transparent.png"
                alt="HPC Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-foreground text-sm">
                HPC Health &amp; Pain Care Center
              </div>
              <div className="text-[10px] text-muted-foreground">
                Chachra Dalmil, Jashore 7400, Bangladesh
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
            <Link
              href="/tv"
              className="hover:text-emerald-500 transition-colors"
            >
              {t.tvQueue} (/tv)
            </Link>
            <Link
              href="/login"
              className="hover:text-emerald-500 transition-colors"
            >
              {t.login} (/login)
            </Link>
            <Link
              href="/register"
              className="hover:text-emerald-500 transition-colors"
            >
              {t.register} (/register)
            </Link>
          </div>

          <div className="text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} HPC Jashore. {t.doctorName}.
          </div>
        </div>
      </footer>
    </div>
  );
}
