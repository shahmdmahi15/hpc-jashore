// apps/web/components/AuthLayout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShieldCheck, Tv, Monitor, Smartphone } from 'lucide-react';

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
  subtitle = 'Health & Pain Care Center · Jashore Clinic Portal',
  badge,
  errorMsg,
  topRightLink,
}: AuthLayoutProps) {
  return (
    <main
      className="relative min-h-[100dvh] w-full bg-black text-white flex flex-col justify-between items-center selection:bg-emerald-500/20 font-sans overflow-x-hidden antialiased"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Dynamic Ambient Background Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-32 -left-32 w-80 sm:w-96 md:w-[32rem] h-80 sm:h-96 md:h-[32rem] rounded-full blur-[100px] bg-emerald-500/15" />
        <div className="absolute -bottom-32 -right-32 w-80 sm:w-96 md:w-[32rem] h-80 sm:h-96 md:h-[32rem] rounded-full blur-[100px] bg-emerald-600/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 rounded-full blur-[140px] bg-emerald-950/20" />
        {/* Subtle grid pattern for modern sleek aesthetic */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      {/* Top Universal Navigation Bar */}
      <header className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl px-2 py-2 flex justify-between items-center text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-emerald-500/40 hover:bg-zinc-800/80 transition-all font-medium backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          title="Return to Public Landing Page"
        >
          <ArrowLeft className="size-3.5 text-emerald-400" />
          <span>হোমপেজ (Home)</span>
        </Link>

        <div className="flex items-center gap-2">
          {topRightLink ? (
            <Link
              href={topRightLink.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all font-semibold backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {topRightLink.icon}
              <span>{topRightLink.label}</span>
            </Link>
          ) : (
            <Link
              href="/tv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-emerald-300 hover:border-zinc-700 transition-all font-medium backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Tv className="size-3.5 text-emerald-400" />
              <span>ওয়েটিং টিভি</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main Responsive Form Card Container */}
      <section className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-xl my-auto py-4 px-2 sm:px-0">
        <div className="w-full p-5 sm:p-7 md:p-8 rounded-3xl border border-zinc-800/80 bg-zinc-950/85 shadow-2xl backdrop-blur-2xl transition-all duration-300">
          {/* Header & Logo with Adaptive Landscape Optimization */}
          <div className="flex flex-col items-center text-center mb-5 sm:mb-6">
            <Link
              href="/"
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-xl shadow-black/60 mb-2.5 sm:mb-3 flex items-center justify-center border border-zinc-200 group-hover:scale-105 group-hover:border-emerald-500 transition-transform">
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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium mb-1.5">
                <ShieldCheck className="size-3" />
                {badge}
              </span>
            )}

            <h1 className="text-xl sm:text-2xl md:text-2xl font-black text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Global Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs animate-in fade-in slide-in-from-top-1"
            >
              <div className="size-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Form Content */}
          {children}
        </div>
      </section>

      {/* Universal PWA / Cross-Device Footer */}
      <footer className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl py-2 px-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>HPC Jashore · Cloudflare SSL Strict 256-Bit</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="hidden sm:inline">PWA Universal App</span>
          <span>·</span>
          <span>ডাঃ মোঃ তৌফিক উজ জামান</span>
        </div>
      </footer>
    </main>
  );
}
