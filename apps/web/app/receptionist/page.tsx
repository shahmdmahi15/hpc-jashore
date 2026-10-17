// apps/web/app/receptionist/page.tsx
'use client';

import React from 'react';
import ReceptionView from '../../components/ReceptionView';
import { WorkstationShell } from '../../components/WorkstationShell';

export default function ReceptionistPage() {
  return (
    <WorkstationShell activeTab="reception">
      {() => <ReceptionView />}
    </WorkstationShell>
  );
}
