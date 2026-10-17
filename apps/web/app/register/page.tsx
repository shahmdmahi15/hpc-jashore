// apps/web/app/register/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, Loader2, Lock, Mail, Phone, ShieldAlert, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('reception');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password) {
      toast.error('অনুগ্রহ করে নাম, ইমেইল ও পাসওয়ার্ড প্রদান করুন');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.auth.register({
        displayName,
        email,
        phone,
        password,
        role,
      });
      toast.success(res.message || 'নিবন্ধন সম্পন্ন হয়েছে! ভেরিফিকেশন পিন ইমেইলে পাঠানো হয়েছে।');
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const msg = err?.message || 'নিবন্ধন সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/20">
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl bg-emerald-500/15" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl bg-teal-500/15" />

      <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>হোমপেজে ফিরে যান (Home)</span>
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
        >
          <span>ইতিমধ্যে একাউন্ট আছে? লগইন</span>
        </Link>
      </div>

      <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-2xl z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-lg shadow-black/40 mb-3 flex items-center justify-center">
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
            নতুন একাউন্ট নিবন্ধন
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            HPC Jashore · Health &amp; Pain Care Center Management
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              সম্পূর্ণ নাম (Full Name)
            </label>
            <div className="relative">
              <User className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="মোঃ রফিকুল ইসলাম"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              ইমেইল অ্যাড্রেস (Email)
            </label>
            <div className="relative">
              <Mail className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              মোবাইল নম্বর (Phone)
            </label>
            <div className="relative">
              <Phone className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <Lock className="size-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="নূন্যতম ৬ অক্ষর"
                minLength={6}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              ভূমিকা / পদবি (Role)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
            >
              <option value="reception">রিসেপশনিস্ট (Reception)</option>
              <option value="therapist">ফিজিওথেরাপিস্ট (Therapist)</option>
              <option value="cashier">ক্যাশিয়ার ও বিলিং (Cashier)</option>
              <option value="doctor">কনসালট্যান্ট ডক্টর (Doctor)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>প্রসেসিং হচ্ছে...</span>
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                <span>নিবন্ধন সম্পন্ন করুন (Register)</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          ইতিমধ্যে নিবন্ধিত?{' '}
          <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
            লগইন করুন (Sign In)
          </Link>
        </div>
      </div>
    </div>
  );
}
