// apps/web/app/reset-password/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !newPassword) {
      toast.error('অনুগ্রহ করে সকল তথ্য পূরণ করুন');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('পাসওয়ার্ড দুটি মিলেনি। পুনরায় মিলিয়ে টাইপ করুন।');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('পাসওয়ার্ড নূন্যতম ৬ অক্ষরের হতে হবে');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.auth.resetPassword({
        email,
        code,
        newPassword,
      });
      toast.success(res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      router.push('/login');
    } catch (err: any) {
      const msg = err?.message || 'পাসওয়ার্ড রিসেট করা যায়নি। কোড মেয়াদোত্তীর্ণ বা ভুল হতে পারে।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-2xl z-10">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-lg shadow-black/40 mb-3 flex items-center justify-center">
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
          নতুন পাসওয়ার্ড নির্ধারণ
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          ইমেইলে প্রাপ্ত ৬ ডিজিটের পিন কোড এবং আপনার নতুন পাসওয়ার্ড লিখুন
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
          <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            ইমেইল অ্যাড্রেস (Email)
          </label>
          <div className="relative">
            <Mail className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            ৬ ডিজিট পিন কোড (6-Digit PIN)
          </label>
          <div className="relative">
            <KeyRound className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="e.g. 123456"
              maxLength={8}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            নতুন পাসওয়ার্ড (New Password)
          </label>
          <div className="relative">
            <Lock className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="নূন্যতম ৬ অক্ষর"
              minLength={6}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
          </label>
          <div className="relative">
            <Lock className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="পুনরায় পাসওয়ার্ড লিখুন"
              minLength={6}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>রিসেট হচ্ছে...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              <span>পাসওয়ার্ড পরিবর্তন করুন</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-slate-400 flex flex-col gap-1.5">
        <div>
          কোড পাননি?{' '}
          <Link
            href={`/resend-verification?email=${encodeURIComponent(email)}`}
            className="text-emerald-400 font-semibold hover:underline"
          >
            কোড পুনরায় পাঠান (Resend)
          </Link>
        </div>
        <div>
          <Link href="/login" className="text-slate-300 hover:text-white hover:underline">
            লগইন পেজে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/20">
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl bg-emerald-500/15" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl bg-teal-500/15" />

      <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>লগইনে ফিরে যান (Login)</span>
        </Link>
      </div>

      <Suspense fallback={<div className="text-slate-400 text-sm">লোড হচ্ছে...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
