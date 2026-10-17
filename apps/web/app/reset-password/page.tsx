// apps/web/app/reset-password/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from '../../components/AuthLayout';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams?.get('email') || '';
  const codeFromUrl = searchParams?.get('code') || searchParams?.get('token') || '';

  const hasLinkCredentials = Boolean(emailFromUrl && codeFromUrl);

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState(codeFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetEmail = (emailFromUrl || email).trim().toLowerCase();
    const targetCode = (codeFromUrl || code).trim();

    if (!targetEmail) {
      setErrorMsg('অনুগ্রহ করে আপনার ইমেইল প্রদান করুন');
      toast.error('ইমেইল আবশ্যক');
      return;
    }

    if (!targetCode) {
      setErrorMsg('অনুগ্রহ করে রিসেট পিন কোড প্রদান করুন');
      toast.error('রিসেট কোড আবশ্যক');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('উভয় পাসওয়ার্ড হুবহু একই হতে হবে');
      toast.error('পাসওয়ার্ড নিশ্চিতকরণ মেলেনি');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: targetEmail,
        code: targetCode,
        newPassword,
      });

      toast.success(
        res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
      );
      router.push('/login');
    } catch (err: any) {
      const msg =
        err?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। পিন বা লিঙ্ক মেয়াদোত্তীর্ণ হতে পারে।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* If opened directly via link, show verified email badge */}
      {hasLinkCredentials ? (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <span className="text-zinc-400">রিসেট লিঙ্ক ভেরিফাইড:</span>{' '}
            <strong className="text-white font-mono">{emailFromUrl}</strong>
          </div>
        </div>
      ) : (
        /* If manual entry fallback */
        <div className="space-y-3.5 mb-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              নিবন্ধিত ইমেইল <span className="text-emerald-400">*</span> (Email)
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

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ৬ ডিজিট সিকিউরিটি পিন <span className="text-emerald-400">*</span> (6-Digit PIN)
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
        </div>
      )}

      {/* Main Password Inputs: new password and confirm password */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            নতুন পাসওয়ার্ড <span className="text-emerald-400">*</span> (New Password)
          </label>
          <div className="relative">
            <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="কমপক্ষে ৬ অক্ষর..."
              required
              className="pl-10 pr-10 h-11 text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            পাসওয়ার্ড নিশ্চিতকরণ <span className="text-emerald-400">*</span> (Confirm Password)
          </label>
          <div className="relative">
            <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="পুনরায় একই পাসওয়ার্ড লিখুন..."
              required
              className="pl-10 pr-10 h-11 text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
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
              <span>পাসওয়ার্ড আপডেট হচ্ছে...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              <span>পাসওয়ার্ড পরিবর্তন ও সংরক্ষণ করুন</span>
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
          লিঙ্ক বা কোড পাননি?{' '}
          <Link
            href="/forgot-password"
            className="text-zinc-400 hover:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            পুনরায় লিঙ্ক পাঠান (Resend)
          </Link>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="নতুন পাসওয়ার্ড নির্ধারণ"
      subtitle="ইমেইল লিঙ্কের মাধ্যমে নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড সেট করুন"
      badge="লিঙ্ক রিসেট"
      topRightLink={{
        href: '/login',
        label: 'লগইন পেজ',
      }}
    >
      <Suspense fallback={<div className="text-zinc-400 text-sm text-center py-6">লোড হচ্ছে...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
