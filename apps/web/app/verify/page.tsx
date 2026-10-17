// apps/web/app/verify/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from '../../components/AuthLayout';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get('email') || '';
  const initialCode = searchParams?.get('code') || searchParams?.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-verify if opened directly via email link
  useEffect(() => {
    if (initialEmail && initialCode && !verifiedSuccess && !loading) {
      const runAutoVerify = async () => {
        setAutoVerifying(true);
        setLoading(true);
        setErrorMsg('');
        try {
          const res = await api.auth.verifyEmail({
            email: initialEmail.trim().toLowerCase(),
            code: initialCode.trim(),
          });
          setVerifiedSuccess(true);
          toast.success(res.message || 'ইমেইল সফলভাবে ভেরিফাই হয়েছে!');
          setTimeout(() => {
            router.push('/login');
          }, 1800);
        } catch (err: any) {
          const msg =
            err?.message || 'ভেরিফিকেশন লিঙ্কটি মেয়াদোত্তীর্ণ বা অকার্যকর। পুনরায় লিঙ্ক পাঠান।';
          setErrorMsg(msg);
          toast.error(msg);
        } finally {
          setAutoVerifying(false);
          setLoading(false);
        }
      };
      runAutoVerify();
    }
  }, [initialEmail, initialCode, router]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার ইমেইল প্রদান করুন');
      toast.error('ইমেইল আবশ্যক');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('অনুগ্রহ করে ৬ ডিজিটের ভেরিফিকেশন পিন কোড লিখুন');
      toast.error('ভেরিফিকেশন কোড লিখুন');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.auth.verifyEmail({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setVerifiedSuccess(true);
      toast.success(res.message || 'ইমেইল সফলভাবে ভেরিফাই হয়েছে!');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      const msg =
        err?.message || 'ভেরিফিকেশন ব্যর্থ হয়েছে। কোড যাচাই করে পুনরায় চেষ্টা করুন।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (autoVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">ইমেইল লিঙ্ক যাচাই করা হচ্ছে...</h3>
          <p className="text-xs text-zinc-400 mt-1">
            {initialEmail} ঠিকানার অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে সক্রিয় করা হচ্ছে
          </p>
        </div>
      </div>
    );
  }

  if (verifiedSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in fade-in zoom-in-95">
        <div className="size-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">ভেরিফিকেশন সফল হয়েছে!</h3>
          <p className="text-xs text-emerald-400/90 mt-1">
            আপনার অ্যাকাউন্ট সম্পূর্ণভাবে সক্রিয় করা হয়েছে। লগইন পেজে নিয়ে যাওয়া হচ্ছে...
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all"
        >
          <span>সরাসরি লগইন করুন</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleManualSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            নিবন্ধিত ইমেইল (Registered Email)
          </label>
          <div className="relative">
            <Mail className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="pl-10 h-11 text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 6-Digit Code */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            ৬ ডিজিট অ্যাক্টিভেশন পিন (Verification PIN)
          </label>
          <div className="relative">
            <KeyRound className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              required
              className="pl-10 h-11 font-mono tracking-widest text-center text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 h-12 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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

      {/* Navigation Footer */}
      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5 border-t border-zinc-900 pt-4">
        <div>
          ইমেইলে কোনও কোড বা লিঙ্ক পাননি?{' '}
          <Link
            href={`/resend-verification?email=${encodeURIComponent(email)}`}
            className="text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            নতুন লিঙ্ক পাঠান (Resend)
          </Link>
        </div>
        <div>
          <Link
            href="/login"
            className="text-zinc-400 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            লগইন পেজে ফিরে যান
          </Link>
        </div>
      </div>
    </>
  );
}

export default function VerifyPage() {
  return (
    <AuthLayout
      title="ইমেইল অ্যাকাউন্ট ভেরিফিকেশন"
      subtitle="ইমেইলে প্রেরিত লিঙ্ক ক্লিক করে অথবা ৬ ডিজিটের কোড দিয়ে ভেরিফাই করুন"
      badge="লিঙ্ক ভেরিফিকেশন"
      topRightLink={{
        href: '/login',
        label: 'লগইন পেজ',
      }}
    >
      <Suspense fallback={<div className="text-zinc-400 text-sm text-center py-6">লোড হচ্ছে...</div>}>
        <VerifyContent />
      </Suspense>
    </AuthLayout>
  );
}
