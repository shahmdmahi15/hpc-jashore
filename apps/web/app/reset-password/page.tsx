// apps/web/app/reset-password/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token || !newPassword) {
      toast.error('অনুগ্রহ করে সকল তথ্য সঠিকভাবে প্রদান করুন');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('উভয় পাসওয়ার্ড একই হতে হবে');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.auth.resetPassword({
        email,
        code: token.trim(),
        newPassword,
      });
      toast.success(res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      router.push('/login');
    } catch (err: any) {
      const msg = err?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। পিন যাচাই করে আবার চেষ্টা করুন।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-zinc-800 bg-zinc-950/85 shadow-2xl backdrop-blur-2xl z-10">
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
          নতুন পাসওয়ার্ড নির্ধারণ
        </h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          ইমেইলে প্রাপ্ত ৬ ডিজিটের পিন ও নতুন পাসওয়ার্ড লিখুন।
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
          <ShieldAlert className="size-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            নিবন্ধিত ইমেইল (Email)
          </label>
          <div className="relative">
            <Mail className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hpc.local"
              required
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            ৬ ডিজিট সিকিউরিটি পিন (6-Digit PIN)
          </label>
          <div className="relative">
            <KeyRound className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456"
              required
              className="pl-10 font-mono tracking-widest bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            নতুন পাসওয়ার্ড (New Password)
          </label>
          <div className="relative">
            <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="কমপক্ষে ৬ অক্ষর..."
              required
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            পাসওয়ার্ড নিশ্চিতকরণ (Confirm Password)
          </label>
          <div className="relative">
            <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="পুনরায় পাসওয়ার্ড লিখুন..."
              required
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 h-11 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>পাসওয়ার্ড আপডেট হচ্ছে...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              <span>পাসওয়ার্ড পরিবর্তন করুন</span>
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5">
        <div>
          পাসওয়ার্ড মনে পড়েছে?{' '}
          <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
            লগইন করুন
          </Link>
        </div>
        <div>
          কোড পাননি?{' '}
          <Link href="/resend-verification" className="text-zinc-400 hover:text-emerald-400 hover:underline">
            কোড পুনরায় পাঠান
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/20">
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl bg-emerald-500/10" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl bg-emerald-600/10" />

      <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>লগইনে ফিরে যান (Login)</span>
        </Link>
      </div>

      <Suspense fallback={<div className="text-zinc-400 text-sm">লোড হচ্ছে...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
