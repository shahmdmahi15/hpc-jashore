// apps/web/lib/i18n.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from './utils';

export type Language = 'bn' | 'en';

export interface Translations {
  // Brand
  brandName: string;
  brandSub: string;
  doctorName: string;
  tagline: string;

  // Nav
  tvQueue: string;
  login: string;
  register: string;
  home: string;

  // Login
  loginTitle: string;
  loginSub: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  forgotPasswordLink: string;
  loginBtn: string;
  loggingIn: string;
  noAccount: string;
  registerLink: string;
  unverifiedAccount: string;
  resendLink: string;

  // Register
  registerTitle: string;
  registerSub: string;
  nameLabel: string;
  namePlaceholder: string;
  whatsappLabel: string;
  whatsappPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  registerBtn: string;
  registering: string;
  alreadyAccount: string;
  loginLink: string;

  // Forgot Password
  forgotTitle: string;
  forgotSub: string;
  sendResetBtn: string;
  sending: string;
  rememberPassword: string;

  // Reset Password
  resetTitle: string;
  resetSub: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  resetBtn: string;
  resetting: string;
  linkVerified: string;

  // Verify
  verifyTitle: string;
  verifySub: string;
  pinLabel: string;
  pinPlaceholder: string;
  verifyBtn: string;
  verifying: string;
  autoVerifyingTitle: string;
  autoVerifyingSub: string;
  verifySuccessTitle: string;
  verifySuccessSub: string;
  directLoginBtn: string;
  didNotReceive: string;

  // Resend
  resendTitle: string;
  resendSub: string;
  sendCodeBtn: string;
  alreadyHaveCode: string;

  // Common Alerts & Status
  sslStatus: string;
  pwaUniversal: string;
  themeDark: string;
  themeLight: string;
  langBangla: string;
  langEnglish: string;
}

export const translations: Record<Language, Translations> = {
  bn: {
    brandName: 'এইচপিসি যশোর',
    brandSub: 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর',
    doctorName: 'ডাক্তার মোঃ তৌফিক উজ জামান',
    tagline: 'বিশেষায়িত ফিজিওথেরাপি ও পেইন কেয়ার সেন্টার',

    tvQueue: 'স্মার্ট টিভি কিউ',
    login: 'লগইন',
    register: 'রেজিস্ট্রেশন',
    home: 'হোমপেজ',

    loginTitle: 'স্টাফ ও পেশেন্ট লগইন',
    loginSub: 'হেলথ অ্যান্ড পেইন কেয়ার সেন্টার · যশোর ক্লিনিক পোর্টাল',
    emailLabel: 'ইমেইল অ্যাড্রেস',
    emailPlaceholder: 'ইমেইল অ্যাড্রেস লিখুন',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: '••••••••',
    forgotPasswordLink: 'পাসওয়ার্ড ভুলে গেছেন?',
    loginBtn: 'লগইন করুন',
    loggingIn: 'যাচাই করা হচ্ছে...',
    noAccount: 'নতুন অ্যাকাউন্ট প্রয়োজন?',
    registerLink: 'রেজিস্ট্রেশন করুন',
    unverifiedAccount: 'অ্যাকাউন্ট ভেরিফাই করেননি?',
    resendLink: 'ভেরিফিকেশন লিঙ্ক পুনঃপ্রেরণ',

    registerTitle: 'অ্যাকাউন্ট রেজিস্ট্রেশন',
    registerSub: 'নতুন ব্যবহারকারী ও ক্লিনিক্যাল স্টাফ নিবন্ধন',
    nameLabel: 'পূর্ণ নাম',
    namePlaceholder: 'ডাক্তার / স্টাফ / রোগীর নাম',
    whatsappLabel: 'হোয়াটসঅ্যাপ নম্বর',
    whatsappPlaceholder: '+8801XXXXXXXXX',
    confirmPasswordLabel: 'পাসওয়ার্ড নিশ্চিতকরণ',
    confirmPasswordPlaceholder: 'পুনরায় পাসওয়ার্ড লিখুন...',
    registerBtn: 'রেজিস্ট্রেশন সম্পন্ন করুন',
    registering: 'নিবন্ধন তৈরি হচ্ছে...',
    alreadyAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    loginLink: 'লগইন করুন',

    forgotTitle: 'পাসওয়ার্ড পুনরুদ্ধার',
    forgotSub: 'আপনার নিবন্ধিত ইমেইলে সুরক্ষিত পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হবে',
    sendResetBtn: 'রিসেট লিঙ্ক পাঠান',
    sending: 'ইমেইল পাঠানো হচ্ছে...',
    rememberPassword: 'পাসওয়ার্ড মনে পড়েছে?',

    resetTitle: 'নতুন পাসওয়ার্ড নির্ধারণ',
    resetSub: 'ইমেইল লিঙ্কের মাধ্যমে নতুন পাসওয়ার্ড ও নিশ্চিতকরণ পাসওয়ার্ড সেট করুন',
    newPasswordLabel: 'নতুন পাসওয়ার্ড',
    newPasswordPlaceholder: 'কমপক্ষে ৬ অক্ষর...',
    resetBtn: 'পাসওয়ার্ড পরিবর্তন ও সংরক্ষণ করুন',
    resetting: 'পাসওয়ার্ড আপডেট হচ্ছে...',
    linkVerified: 'রিসেট লিঙ্ক ভেরিফাইড',

    verifyTitle: 'ইমেইল অ্যাকাউন্ট ভেরিফিকেশন',
    verifySub: 'ইমেইল লিঙ্কের মাধ্যমে আপনার অ্যাকাউন্ট সক্রিয় করুন',
    pinLabel: '৬ ডিজিট অ্যাক্টিভেশন পিন',
    pinPlaceholder: '123456',
    verifyBtn: 'অ্যাকাউন্ট ভেরিফাই ও সক্রিয় করুন',
    verifying: 'যাচাই করা হচ্ছে...',
    autoVerifyingTitle: 'ইমেইল লিঙ্ক যাচাই করা হচ্ছে...',
    autoVerifyingSub: 'ঠিকানার অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে সক্রিয় করা হচ্ছে',
    verifySuccessTitle: 'ভেরিফিকেশন সফল হয়েছে!',
    verifySuccessSub: 'আপনার অ্যাকাউন্ট সম্পূর্ণ সক্রিয়। লগইন পেজে নিয়ে যাওয়া হচ্ছে...',
    directLoginBtn: 'সরাসরি লগইন করুন',
    didNotReceive: 'লিঙ্ক বা কোড পাননি?',

    resendTitle: 'ভেরিফিকেশন লিঙ্ক পুনঃপ্রেরণ',
    resendSub: 'ইমেইল প্রদান করলে অবিলম্বে নতুন অ্যাক্টিভেশন লিঙ্ক ও কোড পাঠানো হবে',
    sendCodeBtn: 'ভেরিফিকেশন লিঙ্ক পাঠান',
    alreadyHaveCode: 'ইতিমধ্যে লিঙ্ক পেয়েছেন?',

    sslStatus: 'ক্লাউডফ্লেয়ার ২৫৬-বিট এনক্রিপশন সুরক্ষিত',
    pwaUniversal: 'ইনস্টলযোগ্য ইউনিভার্সাল অ্যাপ',
    themeDark: 'ডার্ক থিম',
    themeLight: 'লাইট থিম',
    langBangla: 'বাংলা',
    langEnglish: 'English',
  },
  en: {
    brandName: 'HPC Jashore',
    brandSub: 'Health & Pain Care Center · Jashore',
    doctorName: 'Doctor Md. Toufiq Uz Zaman',
    tagline: 'Specialized Physiotherapy & Pain Care Center',

    tvQueue: 'Smart TV Queue',
    login: 'Login',
    register: 'Register',
    home: 'Home',

    loginTitle: 'Staff & Patient Login',
    loginSub: 'Health & Pain Care Center · Jashore Clinic Portal',
    emailLabel: 'Email Address',
    emailPlaceholder: 'hpc@toufiquzzaman.com or user@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    forgotPasswordLink: 'Forgot password?',
    loginBtn: 'Sign In',
    loggingIn: 'Authenticating...',
    noAccount: 'Need an account?',
    registerLink: 'Create an account',
    unverifiedAccount: 'Account not verified yet?',
    resendLink: 'Resend verification link',

    registerTitle: 'Create Account',
    registerSub: 'New user & clinical staff registration',
    nameLabel: 'Full Name',
    namePlaceholder: 'Doctor / Staff / Patient Name',
    whatsappLabel: 'WhatsApp Number',
    whatsappPlaceholder: '+8801XXXXXXXXX',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password...',
    registerBtn: 'Complete Registration',
    registering: 'Creating account...',
    alreadyAccount: 'Already have an account?',
    loginLink: 'Sign In',

    forgotTitle: 'Recover Password',
    forgotSub: 'A secure password reset link will be sent to your registered email',
    sendResetBtn: 'Send Reset Link',
    sending: 'Sending email...',
    rememberPassword: 'Remember your password?',

    resetTitle: 'Set New Password',
    resetSub: 'Set your new password and confirmation password from the email link',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'Minimum 6 characters...',
    resetBtn: 'Update & Save Password',
    resetting: 'Updating password...',
    linkVerified: 'Reset Link Verified',

    verifyTitle: 'Email Account Verification',
    verifySub: 'Activate your account via the email link',
    pinLabel: '6-Digit Activation PIN',
    pinPlaceholder: '123456',
    verifyBtn: 'Verify & Activate Account',
    verifying: 'Verifying...',
    autoVerifyingTitle: 'Verifying Email Link...',
    autoVerifyingSub: 'Your account is being automatically activated',
    verifySuccessTitle: 'Verification Successful!',
    verifySuccessSub: 'Your account is active. Redirecting to login...',
    directLoginBtn: 'Sign In Directly',
    didNotReceive: "Didn't receive email link?",

    resendTitle: 'Resend Verification Link',
    resendSub: 'Enter your email to receive a new activation link immediately',
    sendCodeBtn: 'Send Verification Link',
    alreadyHaveCode: 'Already have a link or code?',

    sslStatus: 'Cloudflare SSL 256-Bit Strict',
    pwaUniversal: 'PWA Universal App',
    themeDark: 'Dark Theme',
    themeLight: 'Light Theme',
    langBangla: 'Bangla',
    langEnglish: 'English',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: translations.bn,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('bn');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('hpc_lang') as Language | null;
    if (saved === 'bn' || saved === 'en') {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    } else {
      document.documentElement.lang = 'bn';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hpc_lang', lang);
      document.documentElement.lang = lang;
    }
  };

  const toggleLanguage = () => {
    const next = language === 'bn' ? 'en' : 'bn';
    setLanguage(next);
  };

  return (
    <LanguageContext.Provider
      value={{
        language: mounted ? language : 'bn',
        setLanguage,
        toggleLanguage,
        t: translations[mounted ? language : 'bn'],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageToggle({ className }: { className?: string }) {
  const { language, toggleLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse shrink-0',
          className,
        )}
      />
    );
  }

  const isBn = language === 'bn';

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      onClick={toggleLanguage}
      className={cn(
        'h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground flex items-center gap-1 sm:gap-1.5 transition-all duration-200 cursor-pointer shrink-0 shadow-xs backdrop-blur-md active:scale-95 text-[11px] sm:text-xs font-bold group',
        className,
      )}
      aria-label={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
      title={isBn ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
    >
      <Globe className="size-3 sm:size-3.5 text-emerald-500 group-hover:rotate-45 transition-transform duration-200" />
      <span className="font-sans font-bold">
        {isBn ? 'EN' : 'বাং'}
      </span>
    </Button>
  );
}
