// apps/web/app/register/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { ArrowLeft, Loader2, Lock, Mail, Phone, ShieldAlert, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

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
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500/20">
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl bg-emerald-500/10" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl bg-emerald-600/10" />

      <div className="w-full max-w-md mb-4 flex justify-between items-center z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>হোমপেজে ফিরে যান (Home)</span>
        </Link>
        <Link
          href="/login"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
        >
          ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন
        </Link>
      </div>

      <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-zinc-800 bg-zinc-950/85 shadow-2xl backdrop-blur-2xl z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-lg shadow-black/40 mb-3 flex items-center justify-center border border-zinc-200">
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
            ক্লিনিক্যাল স্টাফ রেজিস্ট্রেশন
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Health &amp; Pain Care Center · Jashore
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
            <ShieldAlert className="size-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              পূর্ণ নাম (Full Name)
            </label>
            <div className="relative">
              <User className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ডাঃ / থেরাপিস্ট / স্টাফের নাম"
                required
                className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              অফিশিয়াল ইমেইল (Email)
            </label>
            <div className="relative">
              <Mail className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@hpc.local"
                required
                className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              মোবাইল নম্বর (Phone)
            </label>
            <div className="relative">
              <Phone className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01700-000000"
                className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              ক্লিনিক্যাল পদবী / ডিপার্টমেন্ট (Role)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <option value="reception">রিসেপশন ও ফ্রন্ট ডেস্ক (Reception)</option>
              <option value="doctor">চিফ কনসালট্যান্ট / মেডিকেল ডাক্তার (Doctor)</option>
              <option value="therapy">ফিজিওথেরাপিস্ট ও রিহ্যাব হল (Therapist)</option>
              <option value="cashier">ক্যাশিয়ার ও অ্যাকাউন্টস বিলিং (Cashier)</option>
              <option value="pharmacy">ফার্মেসি ও ডিসপেনসারি (Pharmacy)</option>
              <option value="admin">সিস্টেম অ্যাডমিনিস্ট্রেটর (Admin)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষর..."
                required
                className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 h-11 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
              </>
            ) : (
              <>
                <UserPlus className="size-4" />
                <span>রেজিস্ট্রেশন সম্পন্ন করুন</span>
              </>
            )}
          </Button>
        </form>

        <div className="mt-5 text-center text-xs text-zinc-400">
          ইতিমধ্যে নিবন্ধিত?{' '}
          <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
            লগইন করুন
          </Link>
        </div>
      </div>
    </div>
  );
}
