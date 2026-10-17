// apps/web/app/doctor/page.tsx
'use client';

import React from 'react';
import DoctorChamberView from '../../components/DoctorChamberView';
import { WorkstationShell } from '../../components/WorkstationShell';

export default function DoctorPage() {
  return (
    <WorkstationShell activeTab="doctor">
      {(session) => <DoctorChamberView session={session} />}
    </WorkstationShell>
  );
}
