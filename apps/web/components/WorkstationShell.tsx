// apps/web/components/WorkstationShell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Header from './Header';
import { AuthGuard } from './AuthGuard';
import { getSession, UserSession } from '../lib/api';
import { useRealtime } from '../lib/use-realtime';

interface WorkstationShellProps {
  activeTab: string;
  allowedRoles?: string[];
  children: (session: UserSession | null) => React.ReactNode;
}

export function WorkstationShell({
  activeTab,
  allowedRoles,
  children,
}: WorkstationShellProps) {
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

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

        <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-5 md:p-6 transition-all duration-300">
          {children(session)}
        </main>
      </div>
    </AuthGuard>
  );
}

export default WorkstationShell;
