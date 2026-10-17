// apps/web/app/verify/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !token) {
      toast.error('অনুগ্রহ করে ইমেইল ও ৬ ডিজিটের পিন কোড লিখুন');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.auth.verifyEmail({ email, code: token.trim() });
      toast.success(res.message || 'ইমেইল ভেরিফিকেশন সফল হয়েছে!');
      router.push('/login');
    } catch (err: any) {
      const msg = err?.message || 'ভেরিফিকেশন ব্যর্থ হয়েছে। কোড যাচাই করে পুনরায় চেষ্টা করুন।';
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
          ইমেইল অ্যাকাউন্ট ভেরিফিকেশন
        </h1>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          আপনার ইমেইলে প্রেরিত ৬ ডিজিটের অ্যাক্টিভেশন পিন কোডটি লিখুন।
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
          <ShieldAlert className="size-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            ইমেইল অ্যাড্রেস (Email)
          </label>
          <div className="relative">
            <Mail className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@hpc.local"
              required
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            ৬ ডিজিট অ্যাক্টিভেশন পিন (Verification PIN)
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
              className="pl-10 font-mono tracking-widest text-center bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full py-3 h-11 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>যাচাই করা হচ্ছে...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              <span>অ্যাকাউন্ট ভেরিফাই ও সক্রিয় করুন</span>
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5">
        <div>
          কোড পাননি?{' '}
          <Link
            href={`/resend-verification?email=${encodeURIComponent(email)}`}
            className="text-emerald-400 font-semibold hover:underline"
          >
            কোড পুনরায় পাঠান (Resend Code)
          </Link>
        </div>
        <div>
          <Link href="/login" className="text-zinc-400 hover:text-white hover:underline">
            লগইন পেজে যান
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
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
        <VerifyForm />
      </Suspense>
    </div>
  );
}
