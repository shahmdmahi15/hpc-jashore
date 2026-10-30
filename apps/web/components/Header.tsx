// apps/web/components/Header.tsx
'use client';

import * as React from 'react';
import {
  ShieldCheck,
  Stethoscope,
  Activity,
  CreditCard,
  ClipboardList,
  Package,
  Tv,
  Clock,
  CalendarDays,
  Radio,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import { useChatNotifier } from '../lib/use-chat-notifier';
import { UserSession, clearSession, getRoleHomeRoute } from '../lib/api';
import { BrandLogo } from './brand/logo';
import { NavbarSwitchers } from './NavbarSwitchers';
import { useLanguage } from '../lib/i18n';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { useDashboardBadges } from '../lib/use-dashboard-badges';
import { WorkstationTabBadge } from './WorkstationTabBadge';

interface HeaderProps {
  session: UserSession | null;
  onSessionChange: (session: UserSession | null) => void;
  isConnected: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ALL_TABS = [
  { id: 'admin', labelBn: 'অ্যাডমিন', labelEn: 'Admin', icon: ShieldCheck, href: '/admin', roles: ['admin'] },
  { id: 'doctor', labelBn: 'ডাক্তার', labelEn: 'Doctor', icon: Stethoscope, href: '/doctor', roles: ['admin', 'doctor'] },
  { id: 'handler', labelBn: 'হ্যান্ডলার', labelEn: 'Handler', icon: Activity, href: '/handler', roles: ['admin', 'handler'] },
  { id: 'cashier', labelBn: 'ক্যাশিয়ার', labelEn: 'Cashier', icon: CreditCard, href: '/cashier', roles: ['admin', 'cashier'] },
  { id: 'reception', labelBn: 'অভ্যর্থনা', labelEn: 'Receptionist', icon: ClipboardList, href: '/receptionist', roles: ['admin', 'receptionist'] },
  { id: 'tv', labelBn: 'টিভি কিউ', labelEn: 'Waiting TV', icon: Tv, href: '/tv', roles: ['admin', 'doctor', 'handler', 'cashier', 'receptionist'] },
];

function getRoleIcon(role?: string) {
  switch (role) {
    case 'doctor':
      return Stethoscope;
    case 'handler':
      return Activity;
    case 'cashier':
      return CreditCard;
    case 'receptionist':
      return ClipboardList;
    case 'admin':
    default:
      return ShieldCheck;
  }
}

function getRoleLabel(role?: string, isBn = true) {
  switch (role) {
    case 'doctor':
      return isBn ? 'ডাক্তার চেম্বার' : 'Doctor Chamber';
    case 'handler':
      return isBn ? 'হ্যান্ডলার হাব' : 'Handler Hub';
    case 'cashier':
      return isBn ? 'ক্যাশিয়ার ডেস্ক' : 'Cashier Desk';
    case 'receptionist':
      return isBn ? 'অভ্যর্থনা' : 'Reception';
    case 'admin':
    default:
      return isBn ? 'অ্যাডমিন হাব' : 'Admin Hub';
  }
}

export default function Header({
  session,
  onSessionChange,
  isConnected,
  activeTab,
  onTabChange,
}: HeaderProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
  const { unreadCount } = useChatNotifier(activeTab === 'chat');
  const badges = useDashboardBadges();

  const visibleTabs = React.useMemo(() => {
    if (!session?.role) return ALL_TABS;
    return ALL_TABS.filter((t) => t.roles.includes(session.role));
  }, [session?.role]);

  // Live digital clock with interval
  React.useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearSession();
    toast.success(language === 'bn' ? 'লগআউট সম্পন্ন হয়েছে' : 'Logged out successfully');
    router.push('/auth/login');
  };

  return (
    <header
      className="w-full px-3 sm:px-6 py-2 sm:py-2.5 border-b border-border/80 bg-card/85 backdrop-blur-xl sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shadow-xs"
      style={{
        paddingTop: 'max(0.6rem, env(safe-area-inset-top))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      {/* 1. Left: Brand & Telemetry Badge */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <BrandLogo size="sm" variant="full" className="cursor-pointer" onClick={() => router.push('/')} />

        {/* Realtime Live Telemetry Badge */}
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-300',
            isConnected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse',
          )}
          title={isConnected ? 'SSE Live Stream Connected' : 'Disconnected, reconnecting...'}
        >
          <span
            className={cn(
              'size-2 rounded-full',
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500',
            )}
          />
          <Radio className="size-3" />
          <span className="hidden 2xl:inline">
            {isConnected ? 'Realtime Live' : 'Reconnecting'}
          </span>
        </div>
      </div>

      {/* 2. Center: Workstation Navigation Tabs (Desktop & Tablet) */}
      <nav
        className="hidden md:flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar max-w-full"
        aria-label="Workstations"
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (onTabChange) onTabChange(tab.id);
                router.push(tab.href);
              }}
              className={cn(
                'flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 shrink border',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm border-emerald-600 dark:bg-emerald-500 dark:text-black dark:border-emerald-500 font-bold'
                  : 'bg-card/60 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/70 hover:border-border/60',
              )}
            >
              <Icon
                className={cn(
                  'size-3.5 sm:size-4 transition-transform duration-200 shrink-0',
                  isActive ? 'text-white dark:text-black scale-110' : 'text-emerald-500/80',
                )}
              />
              <span>{language === 'bn' ? tab.labelBn : tab.labelEn}</span>
              {tab.id === 'doctor' && (
                <WorkstationTabBadge count={badges.consultationWaiting} color="emerald" pulse={!isActive} />
              )}
              {tab.id === 'handler' && (
                <WorkstationTabBadge count={badges.therapyWaiting} color="blue" pulse={!isActive} />
              )}
              {tab.id === 'cashier' && (
                <WorkstationTabBadge count={badges.cashierUnpaid} color="amber" pulse={!isActive} />
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Live Clock, Active Role Dashboard Button & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto sm:ml-0">
        {/* Live Digital Clock */}
        <div className="hidden xl:flex items-center gap-1.5 2xl:gap-2 px-2.5 2xl:px-3 py-1 rounded-xl bg-muted/40 border border-border/60 text-xs font-mono text-muted-foreground">
          <Clock className="size-3.5 text-emerald-500 animate-pulse shrink-0" />
          <span className="font-bold text-foreground">
            {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </span>
          <span className="hidden 2xl:inline">•</span>
          <span className="hidden 2xl:flex items-center gap-1 font-sans text-[11px]">
            <CalendarDays className="size-3" />
            {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '---'}
          </span>
        </div>

        {/* Active Role Dashboard Button (Visible on both mobile and desktop) */}
        {session && (
          <button
            type="button"
            onClick={() => {
              const homeRoute = getRoleHomeRoute(session.role);
              if (onTabChange) onTabChange(session.role);
              router.push(homeRoute);
            }}
            title={language === 'bn' ? `${getRoleLabel(session.role, true)} ড্যাশবোর্ড` : `${getRoleLabel(session.role, false)} Dashboard`}
            className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            {(() => {
              const RoleIcon = getRoleIcon(session.role);
              return <RoleIcon className="size-3.5 sm:size-4 shrink-0 text-emerald-500" />;
            })()}
            <span className="hidden xs:inline">
              {getRoleLabel(session.role, language === 'bn')}
            </span>
          </button>
        )}

        {/* Realtime Chat Button with Live Dot & Unread Counter */}
        {session && (
          <button
            type="button"
            onClick={() => {
              const chatTrigger = document.querySelector('[data-chat-tab-trigger="true"]') as HTMLElement | null;
              if (chatTrigger) {
                chatTrigger.click();
              } else if (session?.role) {
                const rolePath = session.role === 'receptionist' ? 'receptionist' : session.role;
                router.push(`/${rolePath}?tab=chat`);
              }
            }}
            className={cn(
              'relative h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0',
              unreadCount > 0
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-xs shadow-rose-500/20'
                : 'bg-card/70 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/70',
            )}
            title={language === 'bn' ? 'ক্লিনিক্যাল চ্যাট ও বার্তা' : 'Clinical Chat'}
          >
            <MessageSquare className="size-3.5 sm:size-4 shrink-0 text-emerald-500" />
            <span className="hidden sm:inline text-xs font-semibold">
              {language === 'bn' ? 'চ্যাট' : 'Chat'}
            </span>
            {unreadCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500 text-white leading-none">
                  {unreadCount}
                </span>
              </span>
            )}
          </button>
        )}

        {/* Global Switchers: Language + Theme + Fullscreen */}
        <NavbarSwitchers />

        {/* Logout Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleLogout}
          title={language === 'bn' ? 'লগআউট' : 'Logout'}
          aria-label="Logout"
          className="size-8 sm:size-9 rounded-lg sm:rounded-xl border-border/80 bg-card/80 hover:bg-red-500/10 hover:border-red-500/40 text-muted-foreground hover:text-red-500 shrink-0 cursor-pointer active:scale-95 transition-all duration-200 flex items-center justify-center"
        >
          <LogOut className="size-3.5 sm:size-4" />
        </Button>
      </div>
    </header>
  );
}
