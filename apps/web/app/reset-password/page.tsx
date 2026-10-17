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
import { useLanguage } from '../../lib/i18n';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams?.get('email') || '';
  const codeFromUrl = searchParams?.get('code') || searchParams?.get('token') || '';
  const { t, language } = useLanguage();

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
      const msg = language === 'bn' ? 'অনুগ্রহ করে আপনার ইমেইল প্রদান করুন' : 'Please enter your email';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (!targetCode) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে রিসেট পিন কোড প্রদান করুন' : 'Please provide the reset code';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (newPassword.length < 6) {
      const msg = language === 'bn' ? 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'New password must be at least 6 characters';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = language === 'bn' ? 'উভয় পাসওয়ার্ড হুবহু একই হতে হবে' : 'Passwords do not match';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: targetEmail,
        code: targetCode,
        newPassword,
      });

      const successMsg = language === 'bn'
        ? (res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! নতুন পাসওয়ার্ড দিয়ে লগইন করুন।')
        : (res.message || 'Password reset successfully! You can now sign in with your new password.');
      toast.success(successMsg);
      router.push('/login');
    } catch (err: any) {
      const msg =
        err?.message ||
        (language === 'bn'
          ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। পিন বা লিঙ্ক মেয়াদোত্তীর্ণ হতে পারে।'
          : 'Password reset failed. The link or PIN may be expired.');
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
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
          <div className="truncate">
            <span className="text-muted-foreground">{t.linkVerified}:</span>{' '}
            <strong className="text-foreground font-mono">{emailFromUrl}</strong>
          </div>
        </div>
      ) : (
        /* If manual entry fallback */
        <div className="space-y-3.5 mb-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {t.emailLabel} <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="pl-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {t.pinLabel} <span className="text-emerald-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                className="pl-10 h-11 font-mono tracking-widest text-center text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Password Inputs: new password and confirm password */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            {t.newPasswordLabel} <span className="text-emerald-500">*</span>
          </label>
          <div className="relative">
            <Lock className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.newPasswordPlaceholder}
              required
              className="pl-10 pr-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            {t.confirmPasswordLabel} <span className="text-emerald-500">*</span>
          </label>
          <div className="relative">
            <Lock className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              required
              className="pl-10 pr-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
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
          className="w-full mt-2 py-3 h-12 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>{t.resetting}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              <span>{t.resetBtn}</span>
            </>
          )}
        </Button>
      </form>

      {/* Navigation Footer */}
      <div className="mt-5 text-center text-xs text-muted-foreground flex justify-center border-t border-border pt-4">
        <div>
          <Link
            href="/login"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            {t.loginLink}
          </Link>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t.resetTitle}
      subtitle={t.resetSub}
      badge={t.resetBtn}
      topRightLink={{
        href: '/login',
        label: t.login,
      }}
    >
      <Suspense fallback={<div className="text-muted-foreground text-sm text-center py-6">...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
