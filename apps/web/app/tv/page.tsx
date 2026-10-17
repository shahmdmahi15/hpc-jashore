'use client';

import React from 'react';
import WaitingRoomTvView from '../../components/WaitingRoomTvView';
import { AuthGuard } from '../../components/AuthGuard';

export default function TvPage() {
  return (
    <AuthGuard>
      <WaitingRoomTvView />
    </AuthGuard>
  );
}

