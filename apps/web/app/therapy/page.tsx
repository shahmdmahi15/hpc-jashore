// apps/web/app/therapy/page.tsx
'use client';

import React from 'react';
import TherapyHallView from '../../components/TherapyHallView';
import { WorkstationShell } from '../../components/WorkstationShell';

export default function TherapyPage() {
  return (
    <WorkstationShell activeTab="therapy">
      {(session) => <TherapyHallView session={session} />}
    </WorkstationShell>
  );
}
