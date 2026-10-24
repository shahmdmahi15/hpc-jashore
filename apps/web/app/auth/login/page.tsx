// apps/web/app/auth/login/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getRoleHomeRoute } from '../../../lib/api';
import {
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AuthLayout } from '../../../components/AuthLayout';
import { useLanguage } from '../../../lib/i18n';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRedirect = searchParams?.get('redirect');
  const { t, language } = useLanguage();

  // ONLY 2 inputs as strictly specified: email and password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const resolveDestination = (role: string) => {
    if (queryRedirect && !queryRedirect.startsWith('/dashboard')) {
      return queryRedirect;
    }
    return getRoleHomeRoute(role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড প্রদান করুন' : 'Please provide both email and password';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const session = await api.auth.login(email.trim().toLowerCase(), password);
      const welcome = language === 'bn'
        ? `সফলভাবে লগইন হয়েছে! স্বাগতম ${session.displayName || session.email}`
        : `Signed in successfully! Welcome ${session.displayName || session.email}`;
      toast.success(welcome);
      const dest = resolveDestination(session.role);
      router.push(dest);
    } catch (err: any) {
      const msg =
        err?.message ||
        (language === 'bn'
          ? 'লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড সঠিক নয়।'
          : 'Login failed. Invalid email or password.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isPendingApproval = errorMsg.toLowerCase().includes('pending administrator approval') || errorMsg.includes('অনুমোদনের অপেক্ষায়');
  const isRejected = errorMsg.toLowerCase().includes('rejected by the administrator') || errorMsg.includes('প্রত্যাখ্যাত');

  return (
    <>
      {errorMsg && isPendingApproval ? (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-200">
          <Clock className="size-4 text-amber-400 mt-0.5" />
          <AlertDescription className="space-y-1">
            <div className="font-semibold text-amber-300">
              {language === 'bn' ? 'অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে' : 'Awaiting Administrator Approval'}
            </div>
            <div className="text-xs text-amber-200/90 leading-relaxed">
              {language === 'bn'
                ? 'আপনার অ্যাকাউন্টটি তৈরি হয়েছে, কিন্তু সেন্টারে প্রবেশের পূর্বে অ্যাডমিনের অনুমোদন প্রয়োজন। অ্যাডমিন অনুমোদন প্রদান করার পর আপনি লগইন করতে পারবেন।'
                : 'Your account was created, but requires administrative approval before you can sign in. Please wait for an administrator to approve your account or contact center management.'}
            </div>
          </AlertDescription>
        </Alert>
      ) : errorMsg && isRejected ? (
        <Alert variant="destructive" className="mb-4 border-rose-500/40 bg-rose-500/10 text-rose-200">
          <ShieldAlert className="size-4 text-rose-400 mt-0.5" />
          <AlertDescription className="space-y-1">
            <div className="font-semibold text-rose-300">
              {language === 'bn' ? 'অ্যাকাউন্ট প্রত্যাখ্যাত হয়েছে' : 'Account Application Rejected'}
            </div>
            <div className="text-xs text-rose-200/90 leading-relaxed">
              {errorMsg}
            </div>
          </AlertDescription>
        </Alert>
      ) : errorMsg ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription className="space-y-1">
            <div>{errorMsg}</div>
            {(errorMsg.toLowerCase().includes('verif') || errorMsg.includes('যাচাই')) && (
              <div className="pt-1">
                <Link
                  href={`/auth/resend-verification?email=${encodeURIComponent(email)}`}
                  className="font-medium underline hover:text-emerald-400 text-xs"
                >
                  {language === 'bn' ? 'ভেরিফিকেশন ইমেইল পুনরায় পাঠান →' : 'Resend Verification Email →'}
                </Link>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
        {/* 1. Email */}
        <div className="space-y-1.5">
          <Label htmlFor="login-email">
            {t.emailLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="login-email"
              type="email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
              className="pl-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 2. Password */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="login-password">
              {t.passwordLabel} <span className="text-emerald-500">*</span>
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
            >
              {t.forgotPasswordLink}
            </Link>
          </div>
          <div className="relative">
            <Lock className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              required
              className="pl-10 pr-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
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
              <span>{t.loggingIn}</span>
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              <span>{t.loginBtn}</span>
            </>
          )}
        </Button>
      </form>

      {/* Navigation Links: Register, Forgot Password, Resend Verification */}
      <div className="mt-5 text-center text-xs text-muted-foreground flex flex-col gap-2 border-t border-border pt-4">
        <div>
          {t.noAccount}{' '}
          <Link
            href="/auth/register"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            {t.registerLink}
          </Link>
        </div>
        <div>
          {t.unverifiedAccount}{' '}
          <Link
            href="/auth/resend-verification"
            className="text-muted-foreground hover:text-emerald-500 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            {t.resendLink}
          </Link>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <AuthLayout
      title={t.loginTitle}
      subtitle={t.loginSub}
      badge={t.login}
      topRightLink={{
        href: '/auth/register',
        label: t.register,
      }}
    >
      <Suspense fallback={<div className="text-muted-foreground text-sm text-center py-6">...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
