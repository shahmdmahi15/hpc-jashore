// apps/web/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  Brain,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  CreditCard,
  DoorOpen,
  HeartPulse,
  Laptop,
  Layers,
  MapPin,
  MessageCircle,
  Monitor,
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300 antialiased overflow-x-hidden">
      {/* ============================================================== */}
      {/* TOP NAVIGATION BAR                                            */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md flex items-center justify-center overflow-hidden border border-zinc-200">
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
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
              HPC <span className="text-emerald-400 font-semibold text-sm">Jashore</span>
            </span>
            <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
              Health &amp; Pain Care Center · Dalmil Chachra
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/tv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 transition-all shadow-sm"
          >
            <Tv className="size-3.5 text-emerald-400" />
            <span>স্মার্ট টিভি কিউ (TV Queue)</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors border border-transparent hover:border-white/10"
          >
            <span>লগইন (Login)</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>ক্লিনিক্যাল পোর্টাল</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </nav>
      </header>

      {/* ============================================================== */}
      {/* HERO SECTION                                                  */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-8 border-b border-white/5">
        {/* Subtle ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-emerald-400 text-xs sm:text-sm font-semibold mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Founder · CEO · Head Doctor · Dr. Toufiq Uz Zaman</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.12] mb-6">
            Move beyond pain.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              Return to life.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-zinc-300 max-w-2xl leading-relaxed mb-8 font-normal">
            Evidence-led physiotherapy, pain management and neuro rehabilitation in Jashore for people ready to feel stronger, steadier and fully themselves again.
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
              <span>Talk to Dr. Toufiq (WhatsApp)</span>
              <ArrowUpRight className="size-4" />
            </a>

            <Link
              href="/tv"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 transition-all"
            >
              <Tv className="size-5 text-emerald-400" />
              <span>স্মার্ট টিভি কিউ লাইভ দেখুন (TV Mode)</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all"
            >
              <Activity className="size-5 text-emerald-400" />
              <span>ক্লিনিক্যাল ওয়ার্কস্টেশন লগইন</span>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-3xl pt-8 border-t border-white/10 text-center">
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-400">12+</div>
              <div className="text-xs sm:text-sm text-zinc-400 mt-1">Years of Care</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-white">10k+</div>
              <div className="text-xs sm:text-sm text-zinc-400 mt-1">Patients Supported</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-400">98%</div>
              <div className="text-xs sm:text-sm text-zinc-400 mt-1">Patient Trust</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-black font-mono text-white">100%</div>
              <div className="text-xs sm:text-sm text-zinc-400 mt-1">Realtime Offline EMR</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 01. THE HPC DIFFERENCE & DOCTOR TOUFIQ                         */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-white/5 bg-zinc-950/40">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-3">
            <span>01</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>THE HPC DIFFERENCE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-4">
                Care that sees the whole person.
              </h2>
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-4">
                At HPC Health &amp; Pain Care Center, recovery is not rushed or generic. Each plan begins with listening, thorough clinical assessment, and an evidence-based roadmap tailored to your body.
              </p>
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 mt-6">
                <div className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                  Head Doctor &amp; Director
                </div>
                <div className="text-lg font-bold text-white mt-0.5">Doctor Toufiq Uz Zaman</div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  BPT (DU), PGD (Acupuncture, China), MDMR (Pain Management, DU), MPH · Founder, CEO &amp; Head Doctor
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 font-bold text-xs">
                  01
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Listen first</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your personal story, pain timeline, daily routines, and functional goals shape the baseline of all clinical actions.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 font-bold text-xs">
                  02
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Understand clearly</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Targeted neurological and musculoskeletal assessments turn uncertainty into a practical, step-by-step prescription.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 font-bold text-xs">
                  03
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Build forward</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Progressive electrotherapy, spinal decompression, manual mobilization, and therapeutic exercise help you regain long-term independence.
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
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-3">
            <span>02</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>AREAS OF EXPERTISE</span>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Specialized care, thoughtfully delivered.
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2 max-w-2xl">
              From everyday spinal strain to complex neurological recovery, Dr. Toufiq combines modern clinical modalities with personalized attention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1 */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
                  <HeartPulse className="size-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Physiotherapy &amp; Pain Management
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  Targeted relief plans for lumbar PLID, cervical spondylosis, sciatica, arthritis, knee osteoarthritis, and frozen shoulder.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-emerald-400 flex items-center gap-1">
                <span>Electrotherapy &amp; Manual Mobilization</span>
              </div>
            </div>

            {/* 2 */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4">
                  <Brain className="size-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Neuro Rehabilitation
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  Guided neurological training that restores coordination, motor control, gait stability, and daily movement confidence.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-purple-400 flex items-center gap-1">
                <span>Motor Relearning &amp; Balance Restoration</span>
              </div>
            </div>

            {/* 3 */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mb-4">
                  <ShieldCheck className="size-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Stroke Management
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                  Compassionate, structured post-stroke rehabilitation helping patients regain limb function, facial symmetry, and self-reliance.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-xs font-bold text-teal-400 flex items-center gap-1">
                <span>Comprehensive Post-Stroke Recovery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 03. CUSTOM REALTIME SOFTWARE (EMR & CLINICAL ECOSYSTEM)       */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-white/5 bg-zinc-950/60">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-3">
            <span>03</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>CUSTOM REALTIME CLINICAL PLATFORM</span>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              যশোরের সর্বাধুনিক রিয়েল-টাইম ক্লিনিক্যাল সফটওয়্যার
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2 max-w-3xl leading-relaxed">
              এইচপিসি সেন্টারের জন্য তৈরি সম্পূর্ণ কাস্টমাইজড সফটওয়্যার স্যুট—যেখানে রিসেপশন, ডাক্তার চেম্বার, থেরাপি হল, ক্যাশিয়ার এবং ওয়েটিং রুম টিভি মিলি-সেকেন্ডে সিঙ্ক্রোনাইজড থাকে।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {/* 1. Reception */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <DoorOpen className="size-4" />
                <span className="text-xs font-mono font-bold uppercase">Workstation 1</span>
              </div>
              <h3 className="text-sm font-bold text-white">রিসেপশন ও পেশেন্ট ডিরেক্টরি</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                তাত্ক্ষণিক পেশেন্ট রেজিস্ট্রেশন, ইউনিক MRN তৈরি, সিরিয়াল ট্র্যাকিং এবং থেরাপি স্লট বুকিং।
              </p>
            </div>

            {/* 2. Doctor Chamber */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Stethoscope className="size-4" />
                <span className="text-xs font-mono font-bold uppercase">Workstation 2</span>
              </div>
              <h3 className="text-sm font-bold text-white">ডাক্তার চেম্বার ও SOAP নোটস</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                চিফ কমপ্লেইন্টস, পেইন স্কোর (VAS), স্পেশালাইজড এসেসমেন্ট, এবং ডিজিটাল প্রেসক্রিপশন জেনারেশন।
              </p>
            </div>

            {/* 3. Therapy Hall */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Activity className="size-4" />
                <span className="text-xs font-mono font-bold uppercase">Workstation 3</span>
              </div>
              <h3 className="text-sm font-bold text-white">থেরাপি হল বেড ও টাইমার মেট্রিক্স</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                রিয়েলটাইম বেড অকুপেন্সি, মডালিটি মেশিন অ্যাসাইনমেন্ট (UST, IFT, Traction) এবং অটো কাউন্টডাউন অ্যালার্ট।
              </p>
            </div>

            {/* 4. Cashier */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CreditCard className="size-4" />
                <span className="text-xs font-mono font-bold uppercase">Workstation 4</span>
              </div>
              <h3 className="text-sm font-bold text-white">ক্যাশিয়ার ও ড্রয়ার রিকনসিলিয়েশন</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                ইনভয়েসিং, প্যাকেজ পারচেজ, ক্যাশ ড্রয়ার ওপেন/ক্লোজ এবং অডিট-লগ ভিত্তিক দৈনিক আয় রিপোর্ট।
              </p>
            </div>

            {/* 5. Waiting Room TV */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Tv className="size-4" />
                <span className="text-xs font-mono font-bold uppercase">Workstation 5</span>
              </div>
              <h3 className="text-sm font-bold text-white">স্মার্ট ওয়েটিং রুম টিভি ডিসপ্লে</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                জিরো স্ক্রোলিং ফিট, ডাক্তার ও থেরাপি ডুয়াল কিউ, ভয়েস কলিং ও সাউন্ড বেলসহ লাইভ নোটিশ বার।
              </p>
            </div>

            {/* 6. Realtime Telemetry & PWA */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Cpu className="size-4" />
                <span className="text-xs font-mono font-bold uppercase">Workstation 6</span>
              </div>
              <h3 className="text-sm font-bold text-white">অফলাইন-রেডি PWA ও ডিস্ট্রিবিউটেড সিঙ্ক</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                সিঙ্গেল-রাইটার SQLite ইঞ্জিন, ডিস্ট্রিবিউটেড SSE টেলিম্যাট্রি এবং ইন্টারনেট ছাড়াও লোকাল নেটওয়ার্কে ফুল রানটাইম।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 04. LOCATION & CLINIC HOURS                                   */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 border-b border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-3">
            <span>04</span>
            <span className="w-8 h-px bg-emerald-500/40" />
            <span>VISIT HPC JASHORE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-4">
                Find HPC in Jashore
              </h2>
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-6">
                Visit HPC Health &amp; Pain Care Center opposite Chachra Police Fari, Dalmil Chachra, Jashore Sadar. Prior booking is recommended.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-zinc-400">Clinic Address</div>
                    <div className="text-sm font-bold text-white">
                      Opposite Chachra Police Fari, Dalmil Chachra
                    </div>
                    <div className="text-xs text-zinc-400">Jashore Sadar, Jashore 7400, Bangladesh</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-zinc-400">Direct Contact &amp; WhatsApp</div>
                    <div className="text-sm font-bold text-white">+880 1515-615188</div>
                    <div className="text-xs text-zinc-400">Direct WhatsApp reply from Dr. Toufiq</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs uppercase font-mono font-bold text-zinc-400">Working Hours</div>
                    <div className="text-sm font-bold text-white">Saturday – Thursday: 8:00 AM – 9:00 PM</div>
                    <div className="text-xs text-zinc-400">Friday: 4:00 PM – 9:00 PM</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  MAP &amp; DIRECTIONS
                </span>
                <h3 className="text-lg font-bold text-white mt-3">Chachra, Jashore</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Opposite Chachra Police Fari, Dalmil Chachra, Jashore Sadar · 7400
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=HPC+Health+and+Pain+Care+Center+Chachra+Jashore"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                >
                  <MapPin className="size-3.5" />
                  <span>Open in Google Maps</span>
                  <ArrowUpRight className="size-3.5" />
                </a>

                <a
                  href="https://wa.me/8801515615188"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
                >
                  <MessageCircle className="size-3.5" />
                  <span>Book Appointment</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER                                                        */}
      {/* ============================================================== */}
      <footer className="py-10 bg-black border-t border-white/10 px-4 sm:px-8 text-xs text-zinc-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden">
              <Image
                src="/hpclogo-transparent.png"
                alt="HPC Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-white text-sm">HPC Health &amp; Pain Care Center</div>
              <div className="text-[10px] text-zinc-500">Dalmil Chachra, Jashore 7400, Bangladesh</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
            <Link href="/tv" className="hover:text-emerald-400 transition-colors">
              Waiting TV (/tv)
            </Link>
            <Link href="/login" className="hover:text-emerald-400 transition-colors">
              Login (/login)
            </Link>
            <Link href="/register" className="hover:text-emerald-400 transition-colors">
              Register (/register)
            </Link>
          </div>

          <div className="text-[11px] text-zinc-500">
            &copy; {new Date().getFullYear()} HPC Jashore. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
