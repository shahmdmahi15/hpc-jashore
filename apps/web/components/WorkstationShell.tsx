// apps/web/components/WorkstationShell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Header from './Header';
import { AuthGuard } from './AuthGuard';
import { getSession, UserSession } from '../lib/api';
import { useRealtime } from '../lib/use-realtime';
import { ClipboardList, Stethoscope, Activity, CreditCard, Tv, ShieldCheck, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/i18n';

interface WorkstationShellProps {
  activeTab: string;
  allowedRoles?: string[];
  children: (session: UserSession | null) => React.ReactNode;
}

const ALL_MOBILE_NAV_ITEMS = [
  { id: 'admin', labelBn: 'অ্যাডমিন', labelEn: 'Admin', icon: ShieldCheck, href: '/admin', roles: ['admin'] },
  { id: 'doctor', labelBn: 'ডাক্তার', labelEn: 'Doctor', icon: Stethoscope, href: '/doctor', roles: ['admin', 'doctor'] },
  { id: 'handler', labelBn: 'হ্যান্ডলার', labelEn: 'Handler', icon: Activity, href: '/handler', roles: ['admin', 'handler'] },
  { id: 'cashier', labelBn: 'ক্যাশিয়ার', labelEn: 'Cashier', icon: CreditCard, href: '/cashier', roles: ['admin', 'cashier'] },
  { id: 'reception', labelBn: 'অভ্যর্থনা', labelEn: 'Reception', icon: ClipboardList, href: '/receptionist', roles: ['admin', 'receptionist'] },
  { id: 'tv', labelBn: 'টিভি কিউ', labelEn: 'Waiting TV', icon: Tv, href: '/tv', roles: ['admin', 'doctor', 'handler', 'cashier', 'receptionist'] },
];

export function WorkstationShell({
  activeTab,
  allowedRoles,
  children,
}: WorkstationShellProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const mobileNavItems = React.useMemo(() => {
    if (!session?.role) return ALL_MOBILE_NAV_ITEMS;
    return ALL_MOBILE_NAV_ITEMS.filter((item) => item.roles.includes(session.role));
  }, [session?.role]);

  const { isConnected } = useRealtime((evt) => {
    // eslint-disable-next-line no-console
    console.log('Realtime event received in workstation:', evt);
  });

  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-emerald-500/20">
        {/* Ambient Glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl bg-emerald-500/10 dark:bg-emerald-500/15" />
          <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full blur-3xl bg-teal-500/10 dark:bg-teal-500/15" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full blur-3xl bg-emerald-600/10 dark:bg-emerald-600/15" />
        </div>

        <Header
          session={session}
          onSessionChange={setSession}
          isConnected={isConnected}
          activeTab={activeTab}
          onTabChange={() => {}}
        />

        <main
          className="flex-1 w-full max-w-[1720px] mx-auto p-2.5 sm:p-5 md:p-6 pb-24 md:pb-6 transition-all duration-300"
          style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom, 0px) + 5rem))' }}
        >
          {children(session)}
        </main>

        {/* Mobile & Small Screen Persistent Bottom Navigation Bar */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-lg px-2 pt-1.5 pb-safe flex items-center justify-around"
          style={{ paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem))' }}
        >
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-semibold transition-all duration-150 active:scale-95 touch-manipulation',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-xl transition-all',
                    isActive && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs',
                  )}
                >
                  <Icon className="size-4 sm:size-5" />
                </div>
                <span className="truncate max-w-[64px]">
                  {language === 'bn' ? item.labelBn : item.labelEn}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </AuthGuard>
  );
}

export default WorkstationShell;

