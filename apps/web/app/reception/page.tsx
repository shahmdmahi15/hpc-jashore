// apps/web/app/reception/page.tsx
'use client';

import React from 'react';
import ReceptionView from '../../components/ReceptionView';
import { WorkstationShell } from '../../components/WorkstationShell';

export default function ReceptionPage() {
  return (
    <WorkstationShell activeTab="reception">
      {() => <ReceptionView />}
    </WorkstationShell>
  );
}
