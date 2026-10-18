// apps/web/components/AuthGuard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, UserSession } from '../lib/api';
import { BrandLogo } from './brand/logo';
import { Loader2, Lock } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const current = getSession();
    if (!current || !current.accessToken) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname || '/')}`;
      router.replace(redirectUrl);
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(current.role)) {
      router.replace('/auth/login');
      return;
    }

    setSession(current);
    setIsAuthorized(true);
  }, [router, pathname, allowedRoles]);

  if (!isAuthorized) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-black text-white relative overflow-hidden font-sans">
        {/* Subtle ambient emerald backlight */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="p-8 sm:p-10 rounded-3xl max-w-sm w-full flex flex-col items-center text-center bg-zinc-950/90 border border-white/10 shadow-2xl backdrop-blur-xl">
          <BrandLogo size="lg" variant="full" className="mb-6" />
          
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
            <Loader2 className="size-4 animate-spin text-emerald-400" />
            <span className="text-sm">নিরাপত্তা যাচাই করা হচ্ছে...</span>
          </div>

          <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
            <Lock className="size-3 text-zinc-500" />
            <span>Staff Authentication Required</span>
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
