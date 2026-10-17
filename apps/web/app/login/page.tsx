// apps/web/app/login/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, DEMO_ACCOUNTS, getRoleHomeRoute } from '../../lib/api';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  Tv,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from '../../components/AuthLayout';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRedirect = searchParams?.get('redirect');

  // ONLY 2 inputs as strictly specified:
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const resolveDestination = (role: string) => {
    // If redirect query param is set and is NOT legacy /dashboard, use it; otherwise use role route
    if (queryRedirect && !queryRedirect.startsWith('/dashboard')) {
      return queryRedirect;
    }
    return getRoleHomeRoute(role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড প্রদান করুন');
      toast.error('ইমেইল ও পাসওয়ার্ড উভয়ই আবশ্যক');
      return;
    }

    setLoading(true);
    try {
      const session = await api.auth.login(email.trim().toLowerCase(), password);
      toast.success(`সফলভাবে লগইন হয়েছে! স্বাগতম ${session.displayName || session.email}`);
      const dest = resolveDestination(session.role);
      router.push(dest);
    } catch (err: any) {
      const msg =
        err?.message || 'লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড সঠিক নয়।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: keyof typeof DEMO_ACCOUNTS) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const session = await api.auth.quickLogin(role);
      toast.success(`${DEMO_ACCOUNTS[role].label} হিসেবে লগইন সফল`);
      const dest = resolveDestination(session.role);
      router.push(dest);
    } catch (err: any) {
      const msg = err?.message || 'কুইক লগইন ব্যর্থ হয়েছে';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Email */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
            ইমেইল অ্যাড্রেস <span className="text-emerald-400">*</span> (Email)
          </label>
          <div className="relative">
            <Mail className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hpc.local"
              required
              className="pl-10 h-11 text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 2. Password */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-zinc-300">
              পাসওয়ার্ড <span className="text-emerald-400">*</span> (Password)
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </Link>
          </div>
          <div className="relative">
            <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
              <KeyRound className="size-4" />
              <span>লগইন করুন (Sign In)</span>
            </>
          )}
        </Button>
      </form>

      {/* Quick Demo Switcher Accordion */}
      <div className="mt-5 pt-4 border-t border-zinc-900">
        <button
          type="button"
          onClick={() => setShowDemoAccounts(!showDemoAccounts)}
          className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-zinc-200 py-1.5 px-2 rounded-lg hover:bg-zinc-900/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>ওয়ান-ক্লিক টেস্ট একাউন্ট (Quick Switch)</span>
          </div>
          {showDemoAccounts ? (
            <ChevronUp className="size-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="size-3.5 text-zinc-500" />
          )}
        </button>

        {showDemoAccounts && (
          <div className="grid grid-cols-2 gap-2 mt-3 animate-in fade-in slide-in-from-top-1">
            <button
              type="button"
              onClick={() => handleQuickLogin('doctor')}
              disabled={loading}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-left flex flex-col items-start gap-0.5 justify-start transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>🩺</span>
                <span>ডাক্তার চেম্বার</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">doctor@hpc.local</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('reception')}
              disabled={loading}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-left flex flex-col items-start gap-0.5 justify-start transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>📋</span>
                <span>রিসেপশন ডেস্ক</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">reception@hpc.local</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('therapist')}
              disabled={loading}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-left flex flex-col items-start gap-0.5 justify-start transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>⚡</span>
                <span>থেরাপি হল</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">therapy@hpc.local</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('cashier')}
              disabled={loading}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:border-emerald-500/50 hover:bg-zinc-800/80 text-left flex flex-col items-start gap-0.5 justify-start transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>💳</span>
                <span>ক্যাশিয়ার বিলিং</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono">cashier@hpc.local</div>
            </button>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5 border-t border-zinc-900 pt-4">
        <div>
          নতুন অ্যাকাউন্ট প্রয়োজন?{' '}
          <Link
            href="/register"
            className="text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            রেজিস্ট্রেশন করুন (Register)
          </Link>
        </div>
        <div>
          ইমেইল এখনও ভেরিফাই করেননি?{' '}
          <Link
            href="/verify"
            className="text-zinc-400 hover:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            অ্যাকাউন্ট ভেরিফাই করুন (Verify Link)
          </Link>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="স্টাফ ও ক্লিনিক্যাল লগইন"
      subtitle="Health & Pain Care Center · Jashore Clinic Portal"
      badge="নিরাপদ প্রবেশদ্বার"
      topRightLink={{
        href: '/register',
        label: 'নতুন নিবন্ধন',
      }}
    >
      <Suspense fallback={<div className="text-zinc-400 text-sm text-center py-6">লোড হচ্ছে...</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
