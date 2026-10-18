// apps/web/app/admin/page.tsx
'use client';

import React from 'react';
import AdminDashboardView from '../../components/AdminDashboardView';
import { WorkstationShell } from '../../components/WorkstationShell';

export default function AdminPage() {
  return (
    <WorkstationShell activeTab="admin" allowedRoles={['admin', 'head_doctor', 'doctor', 'reception', 'cashier', 'therapist']}>
      {() => <AdminDashboardView />}
    </WorkstationShell>
  );
}
