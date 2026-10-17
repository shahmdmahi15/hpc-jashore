// apps/web/app/forgot-password/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Key, Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from '../../components/AuthLayout';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // ONLY email input as strictly specified
  const [email, setEmail] = useState('');
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
      const res = await api.auth.forgotPassword(email.trim().toLowerCase());
      toast.success(
        res.message || 'পাসওয়ার্ড রিসেট লিঙ্ক ও পিন কোড আপনার ইমেইলে পাঠানো হয়েছে!'
      );
      router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
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
    <AuthLayout
      title="পাসওয়ার্ড পুনরুদ্ধার"
      subtitle="আপনার নিবন্ধিত ইমেইলে সুরক্ষিত পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হবে"
      badge="পাসওয়ার্ড রিকভারি"
      errorMsg={errorMsg}
      topRightLink={{
        href: '/login',
        label: 'লগইনে ফিরুন',
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ONLY Email Field */}
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
              <span>ইমেইল পাঠানো হচ্ছে...</span>
            </>
          ) : (
            <>
              <Send className="size-4" />
              <span>রিসেট লিঙ্ক পাঠান (Send Reset Link)</span>
            </>
          )}
        </Button>
      </form>

      {/* Navigation Footer */}
      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5 border-t border-zinc-900 pt-4">
        <div>
          পাসওয়ার্ড মনে পড়েছে?{' '}
          <Link
            href="/login"
            className="text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            লগইন করুন (Sign In)
          </Link>
        </div>
        <div>
          ভেরিফিকেশন লিঙ্ক পাননি?{' '}
          <Link
            href="/resend-verification"
            className="text-zinc-400 hover:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            ভেরিফিকেশন পুনরায় পাঠান
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
