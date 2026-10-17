// apps/web/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  HeartPulse,
  Laptop,
  Layers,
  MapPin,
  Monitor,
  Phone,
  ShieldCheck,
  Smartphone,
  Tv,
  Users,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* ============================================================== */}
      {/* TOP NAVIGATION BAR                                            */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-emerald-900/40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-md flex items-center justify-center overflow-hidden">
            <Image
              src="/hpclogo-transparent.png"
              alt="HPC Jashore Logo"
              width={44}
              height={44}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
              HPC <span className="text-emerald-400 font-semibold text-sm sm:text-base">Jashore</span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Health &amp; Pain Care Center · আধুনিক ফিজিওথেরাপি ও পুনর্বাসন
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/tv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 transition-colors shadow-sm"
          >
            <Tv className="size-4" />
            <span>লাইভ টিভি (TV Queue)</span>
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>লগইন (Login)</span>
          </Link>

          <Link
            href="/register"
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>নিবন্ধন (Register)</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>ড্যাশবোর্ড (Portal)</span>
            <ArrowRight className="size-4" />
          </Link>
        </nav>
      </header>

      {/* ============================================================== */}
      {/* HERO SECTION                                                  */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-8">
        {/* Glow ambient meshes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>যশোরের সর্বাধুনিক বিশ্বমানের ফিজিওথেরাপি ও স্পেশালাইজড পেইন কেয়ার</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-6">
            ব্যথামুক্ত স্বাভাবিক জীবনের জন্য{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              নির্ভরযোগ্য আধুনিক চিকিৎসা
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-3xl leading-relaxed mb-8">
            <strong className="text-white">হেলথ অ্যান্ড পেইন কেয়ার সেন্টার (HPC) · যশোর</strong> এ আমরা সরবরাহ করি
            আধুনিক ইলেকট্রোথেরাপি, লেজার, স্পাইনাল ট্র্যাকশন, ম্যানিপুলেটিভ থেরাপি এবং স্ট্রোক পুনর্বাসন সেবা।
          </p>

          {/* Doctor Card Highlight */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-emerald-900/60 bg-slate-900/70 max-w-2xl w-full mb-10 flex flex-col sm:flex-row items-center gap-4 text-left shadow-xl shadow-black/40">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Award className="size-8" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                চিফ কনসালট্যান্ট ও ফিজিওথেরাপি বিশেষজ্ঞ
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                ডাঃ মোঃ তৌফিক উজ জামান
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                BPT (DU), PGD (Acupuncture, China), MDMR (Pain, DU), MPH · স্পেশালাইজড পেইন ও স্পাইন কেয়ার
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full">
            <Link
              href="/tv"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40 shadow-lg shadow-emerald-950/50 transition-all transform hover:-translate-y-0.5"
            >
              <Tv className="size-5 text-emerald-400" />
              <span>স্মার্ট টিভি কিউ লাইভ দেখুন (TV Mode)</span>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Activity className="size-5" />
              <span>ক্লিনিক্যাল ওয়ার্কস্টেশন পোর্টাল</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all"
            >
              <ShieldCheck className="size-5 text-slate-400" />
              <span>স্টাফ অথেন্টিকেশন লগইন</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* CLINICAL SPECIALTIES & MODALITIES                             */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-24 bg-slate-900/50 border-y border-slate-800/80 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              আমাদের আধুনিক চিকিৎসা সেবা ও মডালিটিসমূহ
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              প্রতিটি রোগীর জন্য নির্ভুল ডায়াগনোসিস ও আন্তর্জাতিক মানের ফিজিওথেরাপি প্রোটোকল
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Zap className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-white">আল্ট্রাসাউন্ড ও ইলেক্ট্রোথেরাপি (UST / IFT)</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                ডিপ টিস্যু মাইক্রোম্যাসাজ ও রক্ত সঞ্চালন বাড়িয়ে কোমর ব্যথা, ঘাড় ব্যথা ও ফ্রোজেন শোল্ডারের তীব্র ব্যথা দ্রুত প্রশমিত করে।
              </p>
            </div>

            {/* 2 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <Layers className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-white">স্পাইনাল ট্র্যাকশন থেরাপি (Traction)</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                PLID (ডিস্ক প্রোল্যাপ্স), সায়াটিকা ও সার্ভাইকেল স্পন্ডিলোসিস রোগীদের মেকানিক্যাল ট্র্যাকশন দ্বারা নার্ভের চাপ মুক্ত করা হয়।
              </p>
            </div>

            {/* 3 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <HeartPulse className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-white">শর্ট ওয়েভ ডায়াথার্মি (SWD)</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                গভীর মাংসপেশিতে নিরাপদ তাপ উৎপন্ন করে অস্টিওআর্থ্রাইটিস ও হাঁটুর ক্ষয়রোধে অত্যন্ত কার্যকরী।
              </p>
            </div>

            {/* 4 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Activity className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-white">ক্লাস ফোর লেজার থেরাপি (Laser)</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                স্পোর্টস ইনজুরি, লিগামেন্ট ইনজুরি ও টেন্ডিনাইটিসে সেলুলার রিজেনারেশন ত্বরান্বিত করে প্রদাহ দ্রুত কমায়।
              </p>
            </div>

            {/* 5 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <Users className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-white">স্ট্রোক ও নিউরো-রিহ্যাবিলিটেশন</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                প্যারালাইসিস, ফেসিয়াল পালসি (মুখ বেঁকে যাওয়া) এবং নিউরোপ্যাথিক রোগীর মোটর রিকভারির জন্য বিশেষায়িত থেরাপিউটিক এক্সারসাইজ।
              </p>
            </div>

            {/* 6 */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-white">থেরাপিউটিক জিম ও পশ্চার কারেকশন</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                কোর স্ট্যাবিলিটি, মাসল স্ট্রেন্থেনিং এবং সঠিক অঙ্গবিন্যাস নিশ্চিত করার আধুনিক জিম সরঞ্জাম ও ম্যানিপুলেশন।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* PWA & CROSS-DEVICE ARCHITECTURE                                */}
      {/* ============================================================== */}
      <section className="py-16 sm:py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto glass-panel p-8 sm:p-12 rounded-3xl border border-emerald-900/50 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
              CROSS-PLATFORM ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              যেকোনো ডিভাইসে সুপার স্মুথ ও অফলাইন রেডি
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              অ্যান্ড্রয়েড, আইওএস, আইপ্যাড, উইন্ডোজ ও অ্যান্ড্রয়েড টিভিতে ইন্সটল করে একটি পূর্ণাঙ্গ অ্যাপ হিসেবে ব্যবহার করুন
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col items-center">
              <Smartphone className="size-6 text-emerald-400 mb-2" />
              <span className="text-xs font-bold text-white">Android</span>
              <span className="text-[10px] text-slate-400">PWA / Chrome</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col items-center">
              <Smartphone className="size-6 text-teal-400 mb-2" />
              <span className="text-xs font-bold text-white">iPhone (iOS)</span>
              <span className="text-[10px] text-slate-400">Add to Home</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col items-center">
              <Laptop className="size-6 text-cyan-400 mb-2" />
              <span className="text-xs font-bold text-white">iPadOS</span>
              <span className="text-[10px] text-slate-400">Landscape Grid</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col items-center">
              <Monitor className="size-6 text-emerald-400 mb-2" />
              <span className="text-xs font-bold text-white">Windows / Mac</span>
              <span className="text-[10px] text-slate-400">Desktop App</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col items-center">
              <Tv className="size-6 text-teal-400 mb-2" />
              <span className="text-xs font-bold text-white">Android TV</span>
              <span className="text-[10px] text-slate-400">Leanback Mode</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col items-center">
              <ShieldCheck className="size-6 text-cyan-400 mb-2" />
              <span className="text-xs font-bold text-white">Offline Cache</span>
              <span className="text-[10px] text-slate-400">Service Worker</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* CLINIC INFO & CONTACT BAR                                     */}
      {/* ============================================================== */}
      <section className="py-12 bg-slate-900/80 border-t border-slate-800 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Phone className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">সিরিয়াল ও তথ্য হটলাইন</h3>
              <p className="text-xs text-slate-300 mt-1">01711-000000 | 01900-000000</p>
              <p className="text-[11px] text-slate-400">সকাল ৮:০০ হতে রাত ৯:০০ পর্যন্ত উন্মুক্ত</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <Clock className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">রোগী দেখার সময়সূচি</h3>
              <p className="text-xs text-slate-300 mt-1">শনিবার - বৃহস্পতিবার: সকাল ৮:০০ - রাত ৯:০০</p>
              <p className="text-[11px] text-slate-400">শুক্রবার: বিকাল ৪:০০ - রাত ৯:০০</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <MapPin className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ক্লিনিকের ঠিকানা</h3>
              <p className="text-xs text-slate-300 mt-1">হাসপাতাল রোড, সদর, যশোর</p>
              <p className="text-[11px] text-slate-400">যশোর ২৫০ শয্যা জেনারেল হাসপাতালের সন্নিকটে</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER                                                        */}
      {/* ============================================================== */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 px-4 sm:px-8 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">HPC Jashore</span>
            <span>·</span>
            <span>Health &amp; Pain Care Center</span>
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
            <Link href="/forgot-password" className="hover:text-emerald-400 transition-colors">
              Forgot Password
            </Link>
            <Link href="/verify" className="hover:text-emerald-400 transition-colors">
              Verify Code
            </Link>
            <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Clinical Dashboard
            </Link>
          </div>

          <div>
            &copy; {new Date().getFullYear()} HPC Jashore. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
