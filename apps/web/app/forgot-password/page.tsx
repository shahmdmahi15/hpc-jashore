// apps/web/app/forgot-password/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, Key, Loader2, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল ঠিকানা প্রদান করুন');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.auth.forgotPassword(email);
      toast.success(res.message || '৬ ডিজিটের পিন কোড আপনার ইমেইলে পাঠানো হয়েছে!');
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const msg = err?.message || 'কোড পাঠাতে ব্যর্থ হয়েছে। ইমেইল ঠিকানা যাচাই করুন।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
            পাসওয়ার্ড পুনরুদ্ধার
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            আপনার নিবন্ধিত ইমেইল লিখুন। আমরা ৬ ডিজিটের সিকিউরিটি পিন পাঠিয়ে দেব।
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              নিবন্ধিত ইমেইল (Registered Email)
            </label>
            <div className="relative">
              <Mail className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hpc.local"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>ইমেইল পাঠানো হচ্ছে...</span>
              </>
            ) : (
              <>
                <Key className="size-4" />
                <span>রিসেট পিন কোড পাঠান</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400 flex flex-col gap-1.5">
          <div>
            পাসওয়ার্ড মনে পড়েছে?{' '}
            <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
              লগইন করুন
            </Link>
          </div>
          <div>
            কোড এখনও পাননি?{' '}
            <Link href="/resend-verification" className="text-slate-300 hover:text-emerald-400 hover:underline">
              কোড পুনরায় পাঠান (Resend)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
