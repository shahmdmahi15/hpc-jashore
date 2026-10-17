// apps/web/app/login/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, DEMO_ACCOUNTS } from '../../lib/api';
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড প্রদান করুন');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await api.auth.login(email, password);
      toast.success('সফলভাবে লগইন হয়েছে!');
      router.push(redirectTo);
    } catch (err: any) {
      const msg = err?.message || 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করে আবার চেষ্টা করুন।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: keyof typeof DEMO_ACCOUNTS) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await api.auth.quickLogin(role);
      toast.success(`${DEMO_ACCOUNTS[role].label} হিসেবে লগইন সম্পন্ন`);
      router.push(redirectTo);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Quick login failed');
      toast.error('Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-zinc-800 bg-zinc-950/85 shadow-2xl backdrop-blur-2xl z-10">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-lg shadow-black/40 mb-3 flex items-center justify-center border border-zinc-200">
          <Image
            src="/hpclogo-transparent.png"
            alt="HPC Logo"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          স্টাফ ও ক্লিনিক্যাল লগইন
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Health &amp; Pain Care Center · Jashore Clinic Portal
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
          <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            ইমেইল অ্যাড্রেস (Email)
          </label>
          <div className="relative">
            <Mail className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hpc.local"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/70 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              পাসওয়ার্ড (Password)
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </Link>
          </div>
          <div className="relative">
            <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/70 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>যাচাই করা হচ্ছে...</span>
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              <span>লগইন করুন (Sign In)</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Role Switcher */}
      <div className="mt-6 pt-5 border-t border-zinc-850">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
          <Sparkles className="size-3 text-emerald-400" />
          <span>ওয়ান-ক্লিক টেস্ট একাউন্ট (Quick Switch)</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin('doctor')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 transition-colors text-left flex items-center justify-between cursor-pointer"
          >
            <span>🩺 ডাঃ তৌফিক</span>
            <span className="text-[10px] text-emerald-400 font-mono">Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('reception')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 transition-colors text-left flex items-center justify-between cursor-pointer"
          >
            <span>📋 রিসেপশন</span>
            <span className="text-[10px] text-teal-400 font-mono">Reception</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('therapist')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 transition-colors text-left flex items-center justify-between cursor-pointer"
          >
            <span>⚡ থেরাপিস্ট</span>
            <span className="text-[10px] text-purple-400 font-mono">Therapy</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('cashier')}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 transition-colors text-left flex items-center justify-between cursor-pointer"
          >
            <span>💳 ক্যাশিয়ার</span>
            <span className="text-[10px] text-amber-400 font-mono">Cashier</span>
          </button>
        </div>
      </div>

      {/* Links to Register & Verify */}
      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5">
        <div>
          নতুন একাউন্ট প্রয়োজন?{' '}
          <Link href="/register" className="text-emerald-400 font-semibold hover:underline">
            নিবন্ধন করুন (Register)
          </Link>
        </div>
        <div>
          ভেরিফিকেশন কোড আছে?{' '}
          <Link href="/verify" className="text-zinc-300 hover:text-emerald-400 hover:underline">
            কোড যাচাই করুন (Verify Email)
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/20">
      <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>হোমপেজে ফিরে যান (Home)</span>
        </Link>
        <Link
          href="/tv"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400/80 hover:text-emerald-300 transition-colors"
        >
          <span>লাইভ টিভি কিউ (TV)</span>
        </Link>
      </div>

      <Suspense fallback={<div className="text-zinc-400 text-sm">লোড হচ্ছে...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
