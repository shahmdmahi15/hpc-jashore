// apps/web/app/cashier/page.tsx
'use client';

import React from 'react';
import CashierView from '../../components/CashierView';
import { WorkstationShell } from '../../components/WorkstationShell';

export default function CashierPage() {
  return (
    <WorkstationShell activeTab="cashier">
      {(session) => <CashierView session={session} />}
    </WorkstationShell>
  );
}
