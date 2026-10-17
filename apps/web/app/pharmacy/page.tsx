// apps/web/app/pharmacy/page.tsx
'use client';

import React from 'react';
import PharmacyView from '../../components/PharmacyView';
import { WorkstationShell } from '../../components/WorkstationShell';

export default function PharmacyPage() {
  return (
    <WorkstationShell activeTab="pharmacy">
      {() => <PharmacyView />}
    </WorkstationShell>
  );
}
