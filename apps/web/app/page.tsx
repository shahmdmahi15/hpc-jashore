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
  ClipboardList,
  Clock,
  Compass,
  Cpu,
  CreditCard,
  HeartPulse,
  Laptop,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Pill,
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
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { getSession, clearSession, getRoleHomeRoute, UserSession } from '../lib/api';
import { toast } from 'sonner';

function getRoleIcon(role?: string) {
  switch (role) {
    case 'doctor':
      return Stethoscope;
    case 'handler':
      return Activity;
    case 'cashier':
      return CreditCard;
    case 'receptionist':
      return ClipboardList;
    case 'admin':
    default:
      return ShieldCheck;
  }
}

function getRoleLabel(role?: string, isBn = true) {
  switch (role) {
    case 'doctor':
      return isBn ? 'ডাক্তার চেম্বার' : 'Doctor Chamber';
    case 'handler':
      return isBn ? 'হ্যান্ডলার হাব' : 'Handler Hub';
    case 'cashier':
      return isBn ? 'ক্যাশিয়ার ডেস্ক' : 'Cashier Desk';
    case 'receptionist':
      return isBn ? 'অভ্যর্থনা ডেস্ক' : 'Reception Desk';
    case 'admin':
    default:
      return isBn ? 'অ্যাডমিন হাব' : 'Admin Hub';
  }
}

export default function LandingPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const [session, setSession] = React.useState<UserSession | null>(null);

  React.useEffect(() => {
    setSession(getSession());
  }, []);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    toast.success(isBn ? 'লগআউট সম্পন্ন হয়েছে' : 'Logged out successfully');
  };

  const RoleIcon = session ? getRoleIcon(session.role) : ShieldCheck;
  const roleLabel = session ? getRoleLabel(session.role, isBn) : '';
  const roleRoute = session ? getRoleHomeRoute(session.role) : '/admin';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-500 antialiased overflow-x-hidden transition-colors duration-300">
      {/* ============================================================== */}
      {/* TOP NAVIGATION BAR                                            */}
      {/* ============================================================== */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl bg-card/85 border-b border-border/80 px-2 sm:px-8 py-2 sm:py-3 flex items-center justify-between transition-colors duration-300 shadow-xs flex-nowrap"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
        }}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white p-1 shadow-md flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-800 transition-transform group-hover:scale-105 shrink-0">
            <Image
              src="/hpclogo-transparent.png"
              alt="HPC Jashore Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-foreground flex items-center gap-1">
              HPC{' '}
              <span className="text-emerald-500 font-semibold text-xs sm:text-sm">
                Jashore
              </span>
            </span>
            <p className="text-[11px] text-muted-foreground font-medium hidden sm:block">
              {t.brandSub}
            </p>
          </div>
        </Link>

        {/* Navbar Items: TV, Dashboard / Login, Logout, and Switchers */}
        <nav className="flex items-center gap-1 sm:gap-2 flex-nowrap shrink-0">
          {/* Smart TV Queue */}
          <Link href="/tv">
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-bold gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border-border/80 hover:border-emerald-500/40"
              title={t.tvQueue}
            >
              <Tv className="size-3.5 sm:size-4 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">{t.tvQueue}</span>
            </Button>
          </Link>

          {/* If Session: Role Dashboard Button + Logout Button */}
          {session ? (
            <>
              {/* Role Dashboard Button */}
              <Link href={roleRoute}>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-md shadow-emerald-500/20 active:scale-95 rounded-lg sm:rounded-xl h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm gap-1 sm:gap-1.5"
                  title={roleLabel}
                >
                  <RoleIcon className="size-3.5 sm:size-4 shrink-0" />
                  <span className="hidden sm:inline">{roleLabel}</span>
                </Button>
              </Link>

              {/* Logout Button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleLogout}
                title={isBn ? 'লগআউট' : 'Logout'}
                aria-label="Logout"
                className="size-8 sm:size-9 rounded-lg sm:rounded-xl border-border/80 bg-card/80 hover:bg-red-500/10 hover:border-red-500/40 text-muted-foreground hover:text-red-500 active:scale-95 shrink-0 cursor-pointer transition-all duration-200 flex items-center justify-center"
              >
                <LogOut className="size-3.5 sm:size-4" />
              </Button>
            </>
          ) : (
            <>
              {/* Guest: Admin Hub link on desktop */}
              <Link href="/admin" className="hidden md:inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm font-bold gap-1.5 rounded-lg sm:rounded-xl border-border/80 hover:border-emerald-500/40"
                >
                  <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
                  <span>{isBn ? 'অ্যাডমিন হাব' : 'Admin Hub'}</span>
                </Button>
              </Link>

              {/* Login Button */}
              <Link href="/auth/login">
                <Button
                  size="sm"
                  className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-bold gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <LogIn className="size-3.5 sm:size-4 shrink-0" />
                  <span className="hidden xs:inline">{t.login}</span>
                </Button>
              </Link>
            </>
          )}

          {/* Switchers (Language + Dual Theme + Reload + Fullscreen) */}
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
          <Badge
            variant="emerald"
            className="mb-6 px-3.5 py-1.5 text-xs sm:text-sm font-semibold gap-2 shadow-xs rounded-full border border-emerald-500/30"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {isBn
                ? 'প্রতিষ্ঠাতা · সিইও · চিফ কনসালট্যান্ট · ডাঃ মোঃ তৌফিক উজ জামান'
                : 'Founder · CEO · Head Doctor · Dr. Toufiq Uz Zaman'}
            </span>
          </Badge>

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
            >
              <Button
                size="lg"
                className="h-12 px-6 rounded-xl text-sm sm:text-base font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 gap-2"
              >
                <MessageCircle className="size-5" />
                <span>
                  {isBn
                    ? 'ডাঃ তৌফিকের সাথে কথা বলুন (WhatsApp)'
                    : 'Talk to Dr. Toufiq (WhatsApp)'}
                </span>
                <ArrowUpRight className="size-4" />
              </Button>
            </a>

            <Link href="/tv">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-6 rounded-xl text-sm sm:text-base font-bold gap-2 border-border hover:border-emerald-500/50"
              >
                <Tv className="size-5 text-emerald-500" />
                <span>
                  {isBn
                    ? 'স্মার্ট টিভি কিউ লাইভ দেখুন'
                    : 'Live Smart TV Queue'}
                </span>
              </Button>
            </Link>

            <Link href={roleRoute}>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-6 rounded-xl text-sm sm:text-base font-bold gap-2 border-border hover:border-emerald-500/50"
              >
                <RoleIcon className="size-5 text-emerald-500" />
                <span>
                  {session
                    ? (isBn ? `${roleLabel} প্রবেশ করুন` : `Enter ${roleLabel}`)
                    : (isBn ? 'ক্লিনিক্যাল অ্যাডমিন হাব' : 'Clinical Admin Hub')}
                </span>
              </Button>
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
              <Card className="rounded-2xl border-border bg-card shadow-sm mt-6">
                <CardHeader className="p-4 sm:p-5">
                  <Badge variant="emerald" className="w-fit text-[11px] font-extrabold uppercase tracking-wider">
                    {isBn ? 'হেড ডক্টর ও পরিচালক' : 'Head Doctor & Director'}
                  </Badge>
                  <CardTitle className="text-lg font-bold text-foreground mt-1">
                    {isBn ? 'ডাঃ মোঃ তৌফিক উজ জামান' : 'Dr. Md. Toufiq Uz Zaman'}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    BPT (DU), PGD (Acupuncture, China), MDMR (Pain Management,
                    DU), MPH · Founder, CEO &amp; Head Doctor
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="rounded-2xl border-border bg-card shadow-sm">
                <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
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
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card shadow-sm">
                <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
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
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border bg-card shadow-sm">
                <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
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
                </CardContent>
              </Card>
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
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-6 pb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <HeartPulse className="size-5" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {isBn ? 'কোমর ও মেরুদণ্ডের ব্যথা' : 'Spine & Back Care'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {isBn
                    ? 'PLID, সায়াটিকা, লাম্বার স্পন্ডাইলোসিস এবং ডিস্ক প্রোল্যাপ্স চিকিৎসায় উন্নত স্পাইনাল ট্র্যাকশন ও রিহ্যাব।'
                    : 'Targeted protocols for lumbar disc herniation, sciatica, postural strain, and acute disc pain.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 2 */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-6 pb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <Brain className="size-5" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {isBn ? 'নিউরো রিহ্যাবিলিটেশন' : 'Neuro Rehabilitation'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {isBn
                    ? 'স্ট্রোক প্যারালাইসিস, ফেসিয়াল পলসি, নার্ভ ইনজুরি এবং চলাচলের ভারসাম্যহীনতা দূরীকরণে আধুনিক থেরাপি।'
                    : 'Post-stroke motor recovery, facial palsy, neuropathy, and movement retraining.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 3 */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-6 pb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <Activity className="size-5" />
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {isBn ? 'ঘাড়, কাঁধ ও হাঁটুর ব্যথা' : 'Joint & Arthritis Care'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {isBn
                    ? 'ফ্রোজেন শোল্ডার, হাঁটুর অস্টিওআর্থ্রাইটিস, সার্ভাইকাল স্পন্ডাইলোসিস ও স্পোর্টস ইনজুরির স্থায়ী সমাধান।'
                    : 'Knee osteoarthritis, frozen shoulder, cervical radiculopathy, and sports injury recovery.'}
                </CardDescription>
              </CardHeader>
            </Card>
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
                ? 'রিসেপশন, ডাক্তার চেম্বার, থেরাপি হল, ক্যাশিয়ার এবং ফার্মেসি সবই ইউনিফাইড অ্যাডমিন হাবের অন্তর্ভুক্ত এবং ওয়েটিং টিভি সম্পূর্ণ অফলাইন ও রিয়েলটাইমে সিঙ্ক থাকে।'
                : 'All clinical workstations (Reception, Doctor Chamber, Therapy Hall, Cashier, and Pharmacy) are unified within the secure Admin Hub, while the Waiting Room Smart TV operates in continuous live sync.'}
            </p>
          </div>

          {/* Workstations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Reception */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emerald" className="gap-1.5 font-mono text-[11px]">
                    <Users className="size-3.5" />
                    <span>Workstation · Reception</span>
                  </Badge>
                  <Link href="/receptionist">
                    <Button variant="ghost" size="icon-sm" className="rounded-full">
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {isBn ? 'রিসেপশন ও টোকেন কাউন্টার' : 'Reception & Patient Desk'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1.5">
                  {isBn
                    ? 'রোগী নিবন্ধন, ডিজিটাল প্রেসক্রিপশন ইতিহাস এবং তাৎক্ষণিক কনসালটেশন টোকেন ইস্যু।'
                    : 'Fast patient registration, thermal token slip printing, and real-time consultation dispatch.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 2. Doctor Chamber */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emerald" className="gap-1.5 font-mono text-[11px]">
                    <Stethoscope className="size-3.5" />
                    <span>Workstation · Doctor</span>
                  </Badge>
                  <Link href="/doctor">
                    <Button variant="ghost" size="icon-sm" className="rounded-full">
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {isBn ? 'ডাক্তার চেম্বার কনসোল' : 'Doctor Chamber & SOAP'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1.5">
                  {isBn
                    ? 'ডাঃ তৌফিকের জন্য ওয়ান-ট্যাপ টোকেন কল, ডিজিটাল প্রেসক্রিপশন ও থেরাপিউটিক প্ল্যান।'
                    : 'One-click patient call, integrated SOAP clinical records, and direct modality prescribing.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 3. Therapy Hall */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emerald" className="gap-1.5 font-mono text-[11px]">
                    <Zap className="size-3.5" />
                    <span>Workstation · Handler</span>
                  </Badge>
                  <Link href="/handler">
                    <Button variant="ghost" size="icon-sm" className="rounded-full">
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {isBn ? 'থেরাপি হল ও বেড মেট্রিক্স' : 'Therapy Hall Bed Matrix'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1.5">
                  {isBn
                    ? '১৬টি বেডের লাইভ অকুপেন্সি, মোডালিটি কাউন্টডাউন টাইমার ও সম্পূর্ণ সেশন ট্র্যাকিং।'
                    : 'Live 16-bed matrix, audio-visual timers for UST/SWD/IRR, and completion logging.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 4. Cashier & Billing */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emerald" className="gap-1.5 font-mono text-[11px]">
                    <CreditCard className="size-3.5" />
                    <span>Workstation · Cashier</span>
                  </Badge>
                  <Link href="/cashier">
                    <Button variant="ghost" size="icon-sm" className="rounded-full">
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {isBn ? 'ক্যাশিয়ার ও ডিজিটাল বিলিং' : 'Cashier & Billing Desk'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1.5">
                  {isBn
                    ? 'কনসালটেশন ও থেরাপি ফি আদায়, থার্মাল রসিদ ও রিয়েলটাইম ডেইলি অডিট।'
                    : 'Cash and mobile banking payments, 80mm thermal receipt printing, and daily closing.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 5. Pharmacy */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emerald" className="gap-1.5 font-mono text-[11px]">
                    <Pill className="size-3.5" />
                    <span>Admin Hub · Pharmacy</span>
                  </Badge>
                  <Link href="/admin">
                    <Button variant="ghost" size="icon-sm" className="rounded-full">
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {isBn ? 'ফার্মেসি ও ঔষধ ব্যবস্থাপনা' : 'Pharmacy & Dispensary'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1.5">
                  {isBn
                    ? 'প্রেসক্রিপশন অনুযায়ী ডিসপেন্সিং, ড্রাগ ইনভেন্টরি ট্র্যাকিং ও স্টক অ্যালার্ট।'
                    : 'Prescription dispensing, batch/expiry inventory tracking, and reorder alerts.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 6. Smart TV Queue */}
            <Card className="rounded-2xl border-border bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emerald" className="gap-1.5 font-mono text-[11px]">
                    <Tv className="size-3.5" />
                    <span>/tv · Public Display</span>
                  </Badge>
                  <Link href="/tv">
                    <Button variant="ghost" size="icon-sm" className="rounded-full">
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-base font-bold text-foreground">
                  {isBn ? 'ওয়েটিং রুম স্মার্ট টিভি কিউ' : 'Waiting Room TV Queue'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1.5">
                  {isBn
                    ? 'যশোর ক্লিনিকের ওয়েটিং রুমে ৫২" টিভিতে ডুয়েল কলাম টোকেন কল ও বাংলা-ইংরেজি অ্যানাউন্সমেন্ট।'
                    : 'Dual-column token queue for consultation & therapy, text-to-speech audio, and zero-scroll fit.'}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* 7. System Administration Hub */}
            <Card className="rounded-2xl border-emerald-500/30 bg-card hover:border-emerald-500/60 transition-all flex flex-col justify-between shadow-sm sm:col-span-2 lg:col-span-3">
              <CardHeader className="p-5 sm:p-6 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emerald" className="gap-1.5 font-mono text-[11px]">
                    <ShieldCheck className="size-3.5" />
                    <span>/admin · Executive Operations</span>
                  </Badge>
                  <Link href="/admin">
                    <Button size="sm" className="h-8 px-3 rounded-lg text-xs font-bold gap-1 bg-emerald-500 hover:bg-emerald-400 text-black">
                      <span>{isBn ? 'অ্যাডমিন হাব খুলুন' : 'Open Admin Hub'}</span>
                      <ArrowUpRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  {isBn ? 'সিস্টেম অ্যাডমিন ও সমন্বিত ক্লিনিক্যাল হাব' : 'System Administration & Unified Clinical Hub'}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-3xl">
                  {isBn
                    ? 'ক্লিনিক্যাল স্টাফ ম্যানেজমেন্ট, ডাটাবেজ ব্যাকআপ, সিকিউরিটি অডিট, এক্সিকিউটিভ অ্যানালিটিক্স এবং রিসেপশন, ডক্টর চেম্বার, থেরাপি হল ও ক্যাশিয়ারের পূর্ণ একীভূত নিয়ন্ত্রণ কেন্দ্র।'
                    : 'Role-based access control, cryptographic audit trails, daily SQLite WAL-safe backups, executive KPIs, and unified tabbed workstations for the entire clinical team.'}
                </CardDescription>
              </CardHeader>
            </Card>
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

            <Card className="rounded-3xl border-border bg-card p-6 flex flex-col justify-between shadow-sm">
              <div>
                <Badge variant="emerald" className="font-mono text-[10px] uppercase tracking-wider mb-2">
                  MAP &amp; DIRECTIONS
                </Badge>
                <h3 className="text-lg font-bold text-foreground mt-2">
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
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-bold gap-1.5">
                    <MapPin className="size-3.5" />
                    <span>{isBn ? 'গুগল ম্যাপে দেখুন' : 'Open in Google Maps'}</span>
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </a>

                <a
                  href="https://wa.me/8801515615188"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full h-11 rounded-xl text-xs font-bold gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black">
                    <MessageCircle className="size-3.5" />
                    <span>{isBn ? 'সিরিয়াল বুক করুন' : 'Book Appointment'}</span>
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER                                                        */}
      {/* ============================================================== */}
      <footer
        className="py-8 bg-card border-t border-border px-4 sm:px-8 text-xs text-muted-foreground"
        style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
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
              <div className="font-bold text-foreground text-sm group-hover:text-emerald-500 transition-colors">
                HPC Health &amp; Pain Care Center
              </div>
              <div className="text-[10px] text-muted-foreground">
                Chachra Dalmil, Jashore 7400, Bangladesh
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
            <Link
              href="/tv"
              className="hover:text-emerald-500 transition-colors"
            >
              {t.tvQueue} (/tv)
            </Link>
            <Link
              href="/admin"
              className="hover:text-emerald-500 transition-colors"
            >
              {isBn ? 'অ্যাডমিন হাব' : 'Admin Hub'} (/admin)
            </Link>
            <Link
              href="/auth/login"
              className="hover:text-emerald-500 transition-colors"
            >
              {t.login} (/auth/login)
            </Link>
            <Link
              href="/auth/register"
              className="hover:text-emerald-500 transition-colors"
            >
              {t.register} (/auth/register)
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
