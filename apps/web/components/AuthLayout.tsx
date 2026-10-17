// apps/web/components/AuthLayout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShieldCheck, Tv, User } from 'lucide-react';
import { NavbarSwitchers } from './NavbarSwitchers';
import { useLanguage } from '../lib/i18n';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  errorMsg?: string;
  topRightLink?: {
    href: string;
    label: string;
    icon?: React.ReactNode;
  };
}

export function AuthLayout({
  children,
  title,
  subtitle,
  badge,
  errorMsg,
  topRightLink,
}: AuthLayoutProps) {
  const { t, language } = useLanguage();

  return (
    <main
      className="relative min-h-[100dvh] w-full bg-background text-foreground flex flex-col justify-between items-center selection:bg-emerald-500/20 font-sans overflow-x-hidden antialiased transition-colors duration-300"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      {/* Dynamic Ambient Background Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-32 -left-32 w-80 sm:w-96 md:w-[32rem] h-80 sm:h-96 md:h-[32rem] rounded-full blur-[100px] bg-emerald-500/10 dark:bg-emerald-500/15" />
        <div className="absolute -bottom-32 -right-32 w-80 sm:w-96 md:w-[32rem] h-80 sm:h-96 md:h-[32rem] rounded-full blur-[100px] bg-emerald-600/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 rounded-full blur-[140px] bg-emerald-900/5 dark:bg-emerald-950/20" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.03]" />
      </div>

      {/* Top Universal Navigation Bar */}
      <header className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl px-2 py-2 flex justify-between items-center text-xs">
        {/* Home Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-card/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground hover:border-emerald-500/40 transition-all font-medium backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          title={t.home}
        >
          <ArrowLeft className="size-3.5 text-emerald-500" />
          <span>{t.home}</span>
        </Link>

        {/* Right Nav: Optional Page Link + Dual Switchers (Language + Theme) */}
        <div className="flex items-center gap-2">
          {topRightLink ? (
            <Link
              href={topRightLink.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all font-semibold backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {topRightLink.icon || <User className="size-3.5" />}
              <span>{topRightLink.label}</span>
            </Link>
          ) : (
            <Link
              href="/tv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-card/80 text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/40 transition-all font-medium backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Tv className="size-3.5 text-emerald-500" />
              <span>{t.tvQueue}</span>
            </Link>
          )}

          {/* Proper Switchers: Language + Dual Theme */}
          <NavbarSwitchers />
        </div>
      </header>

      {/* Main Responsive Form Card Container */}
      <section className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-xl my-auto py-3 px-2 sm:px-0">
        <div className="w-full p-5 sm:p-7 md:p-8 rounded-3xl border border-border/80 bg-card/90 shadow-2xl backdrop-blur-2xl transition-all duration-300">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
            <Link
              href="/"
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-xl shadow-black/10 dark:shadow-black/60 mb-2.5 sm:mb-3 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 group-hover:scale-105 group-hover:border-emerald-500 transition-transform">
                <Image
                  src="/hpclogo-transparent.png"
                  alt="HPC Logo"
                  width={64}
                  height={64}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
            </Link>

            {badge && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mb-1.5">
                <ShieldCheck className="size-3" />
                {badge}
              </span>
            )}

            <h1 className="text-xl sm:text-2xl md:text-2xl font-black text-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
              {subtitle || t.brandSub}
            </p>
          </div>

          {/* Global Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2.5 text-destructive text-xs animate-in fade-in slide-in-from-top-1"
            >
              <div className="size-2 rounded-full bg-destructive mt-1.5 shrink-0" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Form Content */}
          {children}
        </div>
      </section>

      {/* Universal PWA / Cross-Device Footer */}
      <footer className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl py-2 px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t.sslStatus}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="hidden sm:inline">{t.pwaUniversal}</span>
          <span>·</span>
          <span>{t.doctorName}</span>
        </div>
      </footer>
    </main>
  );
}
