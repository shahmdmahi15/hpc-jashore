// apps/web/app/resend-verification/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { Loader2, Mail, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from '../../components/AuthLayout';

function ResendVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get('email') || '';

  // ONLY email input as strictly specified
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('অনুগ্রহ করে সঠিক ইমেইল ঠিকানা দিন');
      toast.error('সঠিক ইমেইল ঠিকানা প্রয়োজন');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resendVerification(email.trim().toLowerCase());
      toast.success(
        res.message || 'নতুন ভেরিফিকেশন লিঙ্ক ও কোড আপনার ইমেইলে পাঠানো হয়েছে!'
      );
      router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      const msg =
        err?.message || 'কোড পাঠাতে ব্যর্থ হয়েছে। ইমেইল ঠিকানা যাচাই করুন।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ONLY Email input */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            নিবন্ধিত ইমেইল <span className="text-emerald-400">*</span> (Registered Email)
          </label>
          <div className="relative">
            <Mail className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="pl-10 h-11 text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
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
              <span>কোড পাঠানো হচ্ছে...</span>
            </>
          ) : (
            <>
              <Send className="size-4" />
              <span>ভেরিফিকেশন লিঙ্ক পাঠান (Resend)</span>
            </>
          )}
        </Button>
      </form>

      {/* Navigation Footer */}
      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5 border-t border-zinc-900 pt-4">
        <div>
          ইতিমধ্যে কোড বা লিঙ্ক পেয়েছেন?{' '}
          <Link
            href={`/verify?email=${encodeURIComponent(email)}`}
            className="text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            অ্যাকাউন্ট ভেরিফাই করুন (Verify Now)
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

export default function ResendVerificationPage() {
  return (
    <AuthLayout
      title="ভেরিফিকেশন লিঙ্ক পুনঃপ্রেরণ"
      subtitle="ইমেইল প্রদান করলে অবিলম্বে নতুন অ্যাক্টিভেশন লিঙ্ক ও কোড পাঠানো হবে"
      badge="কোড পুনঃপ্রেরণ"
      topRightLink={{
        href: '/login',
        label: 'লগইন পেজ',
      }}
    >
      <Suspense fallback={<div className="text-zinc-400 text-sm text-center py-6">লোড হচ্ছে...</div>}>
        <ResendVerificationForm />
      </Suspense>
    </AuthLayout>
  );
}
