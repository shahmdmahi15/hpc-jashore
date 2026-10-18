// apps/web/app/register/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import {
  AlertCircle,
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
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AuthLayout } from '../../components/AuthLayout';
import { useLanguage } from '../../lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  // ONLY 5 fields required by specification: name, email, whatsappnumber, password, confirmpassword
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

    if (!name.trim()) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন' : 'Please enter your full name';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে একটি সঠিক ইমেইল দিন' : 'Please enter a valid email address';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (!whatsappNumber.trim()) {
      const msg = language === 'bn' ? 'অনুগ্রহ করে সক্রিয় হোয়াটসঅ্যাপ নম্বর দিন' : 'Please enter your active WhatsApp number';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (password.length < 6) {
      const msg = language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = language === 'bn' ? 'উভয় পাসওয়ার্ড হুবহু একই হতে হবে' : 'Passwords do not match';
      setErrorMsg(msg);
      toast.error(msg);
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

      const successMsg = language === 'bn'
        ? (res.message || 'নিবন্ধন সম্পন্ন হয়েছে! ভেরিফিকেশন লিঙ্ক ইমেইলে পাঠানো হয়েছে।')
        : (res.message || 'Registration successful! Verification link sent to your email.');
      toast.success(successMsg);
      router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      const msg =
        err?.message ||
        (language === 'bn'
          ? 'নিবন্ধন সম্পন্ন করা যায়নি। তথ্য যাচাই করে পুনরায় চেষ্টা করুন।'
          : 'Registration failed. Please check your information and try again.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t.registerTitle}
      subtitle={t.registerSub}
      badge={t.register}
      topRightLink={{
        href: '/login',
        label: t.login,
      }}
    >
      {errorMsg && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* 1. Name */}
        <div className="space-y-1">
          <Label htmlFor="reg-name">
            {t.nameLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <User className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              required
              className="pl-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 2. Email */}
        <div className="space-y-1">
          <Label htmlFor="reg-email">
            {t.emailLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="reg-email"
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

        {/* 3. WhatsApp Number */}
        <div className="space-y-1">
          <Label htmlFor="reg-whatsapp">
            {t.whatsappLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <MessageSquare className="size-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="reg-whatsapp"
              type="tel"
              autoComplete="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder={t.whatsappPlaceholder}
              required
              className="pl-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* 4. Password */}
        <div className="space-y-1">
          <Label htmlFor="reg-password">
            {t.passwordLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

        {/* 5. Confirm Password */}
        <div className="space-y-1">
          <Label htmlFor="reg-confirm-password">
            {t.confirmPasswordLabel} <span className="text-emerald-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="reg-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              required
              className="pl-10 pr-10 h-11 text-base sm:text-sm bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              title={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full mt-3 py-3 h-12 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>{t.registering}</span>
            </>
          ) : (
            <>
              <UserPlus className="size-4" />
              <span>{t.registerBtn}</span>
            </>
          )}
        </Button>
      </form>

      {/* ONLY link to Login as strictly specified */}
      <div className="mt-5 text-center text-xs text-muted-foreground flex justify-center border-t border-border pt-4">
        <div>
          {t.alreadyAccount}{' '}
          <Link
            href="/login"
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
          >
            {t.loginLink}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
