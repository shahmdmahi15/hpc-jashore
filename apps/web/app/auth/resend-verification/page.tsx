// apps/web/app/auth/resend-verification/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { AlertCircle, Loader2, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AuthLayout } from '../../../components/AuthLayout';
import { useLanguage } from '../../../lib/i18n';

function ResendVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get('email') || '';
  const { t, language } = useLanguage();

  // ONLY email input as strictly specified
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !email.includes('@')) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা দিন' : 'Please provide a valid email address';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.resendVerification(email.trim().toLowerCase());
      const successMsg = language === 'bn'
        ? (res.message || 'নতুন ভেরিফিকেশন লিঙ্ক ও কোড আপনার ইমেইলে পাঠানো হয়েছে!')
        : (res.message || 'New verification link and code sent to your email!');
      toast.success(successMsg);
      router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      const msg =
        err?.message ||
        (language === 'bn'
          ? 'লিঙ্ক পাঠাতে ব্যর্থ হয়েছে। ইমেইল ঠিকানা যাচাই করুন।'
          : 'Failed to send verification link. Please check your email.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {errorMsg && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ONLY Email input */}
        <div className="space-y-1.5">
          <Label htmlFor="resend-email">
            {t.emailLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="resend-email"
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

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 h-12 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>{t.sending}</span>
            </>
          ) : (
            <>
              <Send className="size-4" />
              <span>{t.sendCodeBtn}</span>
            </>
          )}
        </Button>
      </form>

      {/* ONLY link to login as strictly specified */}
      <div className="mt-5 text-center text-xs text-muted-foreground flex justify-center border-t border-border pt-4">
        <div>
          <Link
            href="/auth/login"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            {t.loginLink}
          </Link>
        </div>
      </div>
    </>
  );
}

export default function ResendVerificationPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t.resendTitle}
      subtitle={t.resendSub}
      badge={t.resendLink}
      topRightLink={{
        href: '/auth/login',
        label: t.login,
      }}
    >
      <Suspense fallback={<div className="text-muted-foreground text-sm text-center py-6">...</div>}>
        <ResendVerificationForm />
      </Suspense>
    </AuthLayout>
  );
}
