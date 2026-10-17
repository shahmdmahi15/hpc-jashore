// apps/web/app/register/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  User,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from '../../components/AuthLayout';

export default function RegisterPage() {
  const router = useRouter();

  // ONLY 5 fields required by specification:
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Field Validations
    if (!name.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন');
      toast.error('নাম প্রদান আবশ্যক');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন');
      toast.error('সঠিক ইমেইল ঠিকানা প্রয়োজন');
      return;
    }

    if (!whatsappNumber.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার সক্রিয় হোয়াটসঅ্যাপ নম্বর দিন');
      toast.error('হোয়াটসঅ্যাপ নম্বর আবশ্যক');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('উভয় পাসওয়ার্ড হুবহু একই হতে হবে');
      toast.error('পাসওয়ার্ড নিশ্চিতকরণ মেলেনি');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register({
        displayName: name.trim(),
        email: email.trim().toLowerCase(),
        phone: whatsappNumber.trim(),
        password,
      });

      toast.success(
        res.message || 'নিবন্ধন সম্পন্ন হয়েছে! ভেরিফিকেশন লিঙ্ক ইমেইলে পাঠানো হয়েছে।'
      );
      router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      const msg =
        err?.message || 'নিবন্ধন সম্পন্ন করা যায়নি। তথ্য যাচাই করে পুনরায় চেষ্টা করুন।';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="অ্যাকাউন্ট রেজিস্ট্রেশন"
      subtitle="নতুন ব্যবহারকারী ও ক্লিনিক্যাল স্টাফ নিবন্ধন ফরম"
      badge="সুরক্ষিত নিবন্ধন"
      errorMsg={errorMsg}
      topRightLink={{
        href: '/login',
        label: 'লগইন করুন',
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* 1. Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            পূর্ণ নাম <span className="text-emerald-400">*</span> (Full Name)
          </label>
          <div className="relative">
            <User className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ডাঃ / থেরাপিস্ট / স্টাফ / রোগীর নাম"
              required
              className="pl-10 h-11 text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 2. Email */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            ইমেইল অ্যাড্রেস <span className="text-emerald-400">*</span> (Email)
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

        {/* 3. WhatsApp Number */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            হোয়াটসঅ্যাপ নম্বর <span className="text-emerald-400">*</span> (WhatsApp Number)
          </label>
          <div className="relative">
            <MessageSquare className="size-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="tel"
              autoComplete="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+8801XXXXXXXXX"
              required
              className="pl-10 h-11 text-base sm:text-sm bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 4. Password */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            পাসওয়ার্ড <span className="text-emerald-400">*</span> (Password)
          </label>
          <div className="relative">
            <Lock className="size-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {/* 5. Confirm Password */}
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
          className="w-full mt-3 py-3 h-12 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>নিবন্ধন যাচাই হচ্ছে...</span>
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              <span>রেজিস্ট্রেশন সম্পন্ন করুন</span>
            </>
          )}
        </Button>
      </form>

      {/* Navigation Footer */}
      <div className="mt-5 text-center text-xs text-zinc-400 flex flex-col gap-1.5 border-t border-zinc-900 pt-4">
        <div>
          ইতিমধ্যে একটি অ্যাকাউন্ট আছে?{' '}
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
            ভেরিফিকেশন লিঙ্ক পুনরায় পাঠান
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
