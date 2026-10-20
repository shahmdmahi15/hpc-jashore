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
  Maximize2,
  Minimize2,
  Radio,
  LogOut,
} from 'lucide-react';
import { UserSession, clearSession } from '../lib/api';
import { BrandLogo } from './brand/logo';
import { NavbarSwitchers } from './NavbarSwitchers';
import { useLanguage } from '../lib/i18n';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface HeaderProps {
  session: UserSession | null;
  onSessionChange: (session: UserSession | null) => void;
  isConnected: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ALL_TABS = [
  { id: 'admin', labelBn: 'অ্যাডমিন', labelEn: 'Admin', icon: ShieldCheck, href: '/admin?tab=admin', roles: ['admin'] },
  { id: 'doctor', labelBn: 'ডাক্তার', labelEn: 'Doctor', icon: Stethoscope, href: '/admin?tab=doctor', roles: ['admin', 'head_doctor', 'doctor'] },
  { id: 'handler', labelBn: 'হ্যান্ডলার', labelEn: 'Handler', icon: Activity, href: '/admin?tab=handler', roles: ['admin', 'handler', 'therapist'] },
  { id: 'cashier', labelBn: 'ক্যাশিয়ার', labelEn: 'Cashier', icon: CreditCard, href: '/admin?tab=cashier', roles: ['admin', 'cashier'] },
  { id: 'reception', labelBn: 'অভ্যর্থনা', labelEn: 'Receptionist', icon: ClipboardList, href: '/admin?tab=reception', roles: ['admin', 'reception', 'receptionist'] },
  { id: 'pharmacy', labelBn: 'ফার্মেসি', labelEn: 'Pharmacy', icon: Package, href: '/admin?tab=pharmacy', roles: ['admin'] },
  { id: 'tv', labelBn: 'টিভি কিউ', labelEn: 'Waiting TV', icon: Tv, href: '/tv', roles: ['admin', 'head_doctor', 'doctor', 'handler', 'therapist', 'cashier', 'reception', 'receptionist'] },
];

export default function Header({
  session,
  onSessionChange,
  isConnected,
  activeTab,
  onTabChange,
}: HeaderProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleLogout = () => {
    clearSession();
    toast.success('লগআউট সম্পন্ন হয়েছে');
    router.push('/auth/login');
  };

  return (
    <header className="w-full px-3 sm:px-6 py-2.5 border-b border-border/80 bg-card/85 backdrop-blur-xl sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* 1. Left: Brand & Telemetry Badge */}
      <div className="flex items-center gap-3 shrink-0">
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
          <span className="hidden sm:inline">
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
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 shrink-0 border',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm border-emerald-600 dark:bg-emerald-500 dark:text-black dark:border-emerald-500 font-bold'
                  : 'bg-card/60 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/70 hover:border-border/60',
              )}
            >
              <Icon
                className={cn(
                  'size-3.5 sm:size-4 transition-transform duration-200',
                  isActive ? 'text-white dark:text-black scale-110' : 'text-emerald-500/80',
                )}
              />
              <span>{language === 'bn' ? tab.labelBn : tab.labelEn}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Live Clock, Role Selector & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto sm:ml-0">
        {/* Live Digital Clock */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl bg-muted/40 border border-border/60 text-xs font-mono text-muted-foreground">
          <Clock className="size-3.5 text-emerald-500 animate-pulse" />
          <span className="font-bold text-foreground">
            {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 font-sans text-[11px]">
            <CalendarDays className="size-3" />
            {currentTime ? currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '---'}
          </span>
        </div>


        {/* Fullscreen Toggle */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="size-9 rounded-xl border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>

        {/* Dual Switchers: Language + Theme */}
        <NavbarSwitchers />

        {/* Logout Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleLogout}
          title="Logout"
          className="size-9 rounded-xl border-border/80 bg-card/80 hover:bg-red-500/10 hover:border-red-500/40 text-muted-foreground hover:text-red-500 shrink-0 cursor-pointer"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
