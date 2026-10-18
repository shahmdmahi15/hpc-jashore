// apps/web/app/verify/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AuthLayout } from '../../components/AuthLayout';
import { useLanguage } from '../../lib/i18n';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get('email') || '';
  const initialCode = searchParams?.get('code') || searchParams?.get('token') || '';
  const { t, language } = useLanguage();

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
          const successMsg = language === 'bn'
            ? (res.message || 'ইমেইল সফলভাবে ভেরিফাই হয়েছে!')
            : (res.message || 'Email verified successfully!');
          toast.success(successMsg);
          setTimeout(() => {
            router.push('/login');
          }, 1800);
        } catch (err: any) {
          const msg =
            err?.message ||
            (language === 'bn'
              ? 'ভেরিফিকেশন লিঙ্কটি মেয়াদোত্তীর্ণ বা অকার্যকর। পুনরায় লিঙ্ক পাঠান।'
              : 'Verification link has expired or is invalid. Please request a new one.');
          setErrorMsg(msg);
          toast.error(msg);
        } finally {
          setAutoVerifying(false);
          setLoading(false);
        }
      };
      runAutoVerify();
    }
  }, [initialEmail, initialCode, router, language, verifiedSuccess, loading]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে আপনার ইমেইল প্রদান করুন' : 'Please provide your email';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (!code.trim()) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে ৬ ডিজিটের ভেরিফিকেশন পিন কোড লিখুন' : 'Please enter the 6-digit code';
      setErrorMsg(msg);
      toast.error(msg);
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
      const successMsg = language === 'bn'
        ? (res.message || 'ইমেইল সফলভাবে ভেরিফাই হয়েছে!')
        : (res.message || 'Email verified successfully!');
      toast.success(successMsg);
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      const msg =
        err?.message ||
        (language === 'bn'
          ? 'ভেরিফিকেশন ব্যর্থ হয়েছে। কোড যাচাই করে পুনরায় চেষ্টা করুন।'
          : 'Verification failed. Please check the code and try again.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (autoVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">{t.autoVerifyingTitle}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {initialEmail} {t.autoVerifyingSub}
          </p>
        </div>
      </div>
    );
  }

  if (verifiedSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in fade-in zoom-in-95">
        <div className="size-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">{t.verifySuccessTitle}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t.verifySuccessSub}
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer"
        >
          <span>{t.directLoginBtn}</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleManualSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="verify-email">
            {t.emailLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="verify-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="pl-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 6-Digit Code */}
        <div className="space-y-1.5">
          <Label htmlFor="verify-code">
            {t.pinLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <KeyRound className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="verify-code"
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.pinPlaceholder}
              required
              className="pl-10 h-11 font-mono tracking-widest text-center text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 h-12 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>{t.verifying}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              <span>{t.verifyBtn}</span>
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

export default function VerifyPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t.verifyTitle}
      subtitle={t.verifySub}
      badge={t.login}
      topRightLink={{
        href: '/login',
        label: t.login,
      }}
    >
      <Suspense fallback={<div className="text-muted-foreground text-sm text-center py-6">...</div>}>
        <VerifyContent />
      </Suspense>
    </AuthLayout>
  );
}
