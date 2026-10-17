// apps/web/components/Header.tsx
'use client';

import * as React from 'react';
import {
  ClipboardList,
  Stethoscope,
  Activity,
  CreditCard,
  Pill,
  ShieldCheck,
  Tv,
  Clock,
  CalendarDays,
  Maximize2,
  Minimize2,
  User,
  Radio,
  LogOut,
} from 'lucide-react';
import { DEMO_ACCOUNTS, quickLogin, UserSession, clearSession } from '../lib/api';
import { BrandLogo } from './brand/logo';
import { ThemeToggle } from './theme-toggle';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  session: UserSession | null;
  onSessionChange: (session: UserSession | null) => void;
  isConnected: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'reception', label: 'Reception', icon: ClipboardList, href: '/receptionist' },
  { id: 'doctor', label: 'Doctor Chamber', icon: Stethoscope, href: '/doctor' },
  { id: 'therapy', label: 'Therapy Hall', icon: Activity, href: '/therapy' },
  { id: 'cashier', label: 'Billing & Cashier', icon: CreditCard, href: '/cashier' },
  { id: 'pharmacy', label: 'Pharmacy FIFO', icon: Pill, href: '/pharmacy' },
  { id: 'admin', label: 'Executive Admin', icon: ShieldCheck, href: '/admin' },
  { id: 'tv', label: 'Waiting TV', icon: Tv, href: '/tv' },
];

export default function Header({
  session,
  onSessionChange,
  isConnected,
  activeTab,
  onTabChange,
}: HeaderProps) {
  const router = useRouter();
  const [switching, setSwitching] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

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

  const handleQuickSwitch = async (role: keyof typeof DEMO_ACCOUNTS) => {
    try {
      setSwitching(true);
      const newSession = await quickLogin(role);
      onSessionChange(newSession);
      toast.success(`Logged in as ${newSession.displayName || newSession.email} (${newSession.role})`);
      if (role === 'reception') router.push('/receptionist');
      else if (role === 'head_doctor' || role === 'doctor') router.push('/doctor');
      else if (role === 'therapist') router.push('/therapy');
      else if (role === 'cashier') router.push('/cashier');
      else if (role === 'admin') router.push('/admin');
    } catch (e: any) {
      toast.error(`Login failed: ${e.message}`);
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    toast.success('লগআউট সম্পন্ন হয়েছে');
    router.push('/login');
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

      {/* 2. Center: Workstation Navigation Tabs */}
      <nav
        className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar max-w-full"
        aria-label="Workstations"
      >
        {TABS.map((tab) => {
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
              <span>{tab.label}</span>
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

        {/* Role Quick Switcher */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 shadow-2xs">
          <User className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <select
            className="bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
            value={session?.role || 'head_doctor'}
            onChange={(e) => handleQuickSwitch(e.target.value as any)}
            disabled={switching}
          >
            <option value="head_doctor" className="bg-card text-foreground">Dr. Toufiq (Head)</option>
            <option value="doctor" className="bg-card text-foreground">Dr. Physio (Doctor)</option>
            <option value="reception" className="bg-card text-foreground">Reception Desk</option>
            <option value="therapist" className="bg-card text-foreground">Therapy Staff</option>
            <option value="cashier" className="bg-card text-foreground">Cashier Desk</option>
            <option value="admin" className="bg-card text-foreground">Clinic Admin</option>
          </select>
        </div>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="size-9 rounded-xl border border-border/80 bg-card/80 hover:bg-muted/80 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>

        {/* Dark / Light Theme Toggle */}
        <ThemeToggle />

        {/* Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="size-9 rounded-xl border border-border/80 bg-card/80 hover:bg-red-500/10 hover:border-red-500/40 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
