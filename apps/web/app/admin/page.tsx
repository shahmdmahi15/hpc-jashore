// apps/web/app/admin/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminDashboardView from '../../components/AdminDashboardView';
import DoctorChamberView from '../../components/DoctorChamberView';
import TherapyHallView from '../../components/TherapyHallView';
import CashierView from '../../components/CashierView';
import ReceptionView from '../../components/ReceptionView';
import PharmacyView from '../../components/PharmacyView';
import { WorkstationShell } from '../../components/WorkstationShell';
import { UserSession } from '../../lib/api';

function WorkstationContent({
  session,
  activeTab,
}: {
  session: UserSession | null;
  activeTab: string;
}) {
  switch (activeTab) {
    case 'doctor':
      return <DoctorChamberView session={session} />;
    case 'handler':
    case 'therapist':
      return <TherapyHallView session={session} />;
    case 'cashier':
      return <CashierView session={session} />;
    case 'reception':
    case 'receptionist':
      return <ReceptionView />;
    case 'pharmacy':
      return <PharmacyView />;
    case 'admin':
    default:
      return <AdminDashboardView />;
  }
}

function AdminPageInner() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');

  const resolveTab = (session: UserSession | null): string => {
    if (rawTab) return rawTab;
    if (session?.role) {
      if (session.role === 'doctor' || session.role === 'head_doctor') return 'doctor';
      if (session.role === 'therapist' || session.role === 'handler') return 'handler';
      if (session.role === 'cashier') return 'cashier';
      if (session.role === 'reception' || session.role === 'receptionist') return 'reception';
    }
    return 'admin';
  };

  return (
    <WorkstationShell
      activeTab={rawTab || 'admin'}
      allowedRoles={[
        'admin',
        'head_doctor',
        'doctor',
        'reception',
        'receptionist',
        'cashier',
        'therapist',
        'handler',
      ]}
    >
      {(session) => {
        const currentTab = resolveTab(session);
        return <WorkstationContent session={session} activeTab={currentTab} />;
      }}
    </WorkstationShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground animate-pulse text-sm">
          ওয়ার্কস্টেশন লোড হচ্ছে...
        </div>
      }
    >
      <AdminPageInner />
    </Suspense>
  );
}
