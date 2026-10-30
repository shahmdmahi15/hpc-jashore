// apps/web/lib/use-dashboard-badges.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtime, RealtimeEvent } from './use-realtime';
import { api, getSession } from './api';
import {
  playCheckinSound,
  playPatientCalledSound,
  playCashierSound,
  playChatPingSound,
  playAlertSound,
} from './audio-alerts';
import { toast } from 'sonner';

export interface DashboardBadgesState {
  consultationWaiting: number;
  therapyWaiting: number;
  cashierUnpaid: number;
  chatUnread: number;
}

let globalBadges: DashboardBadgesState = {
  consultationWaiting: 0,
  therapyWaiting: 0,
  cashierUnpaid: 0,
  chatUnread: 0,
};

const badgeSubscribers = new Set<(badges: DashboardBadgesState) => void>();

function notifyBadgeSubscribers() {
  badgeSubscribers.forEach((cb) => {
    try {
      cb({ ...globalBadges });
    } catch {
      // ignore
    }
  });
}

export function updateGlobalBadges(partial: Partial<DashboardBadgesState>) {
  globalBadges = {
    ...globalBadges,
    ...partial,
  };
  notifyBadgeSubscribers();
}

/**
 * Global Realtime Event Handler with Web Audio and Toast Feedback
 */
export function handleDashboardRealtimeEvent(event: RealtimeEvent, isBn = true) {
  const type = event.type;
  const payload = event.payload || {};

  switch (type) {
    case 'consultation.queued':
    case 'queue.updated':
    case 'visit.checked_in': {
      updateGlobalBadges({
        consultationWaiting: Math.max(0, (payload.waitingCount ?? globalBadges.consultationWaiting + 1)),
      });
      playCheckinSound();
      const patientName = payload.patientName || payload.nameEn || (isBn ? 'নতুন রোগী' : 'New Patient');
      const token = payload.tokenNumber || payload.tokenSlip?.tokenNumber;
      toast.info(
        isBn
          ? `🩺 সিরিয়াল আপডেট: ${patientName} ${token ? `(টোকেন #${token})` : ''} লাইনে যুক্ত হয়েছেন`
          : `🩺 Queue: ${patientName} ${token ? `(Token #${token})` : ''} checked in`,
      );
      break;
    }

    case 'therapy.queued':
    case 'therapy.slot.updated':
    case 'therapy.session.started': {
      updateGlobalBadges({
        therapyWaiting: Math.max(0, (payload.waitingCount ?? globalBadges.therapyWaiting + 1)),
      });
      playCheckinSound();
      break;
    }

    case 'patient.called': {
      playPatientCalledSound();
      const pName = payload.patientNameBn || payload.patientNameEn || payload.patientName || (isBn ? 'রোগী' : 'Patient');
      const docName = payload.doctorNameBn || payload.doctorNameEn || payload.doctorName;
      const chamber = payload.chamber || payload.chamberRoomNumber || '১';
      toast.success(
        isBn
          ? `📢 ডাকছেন: ${pName} কে ${chamber} নম্বর রুমে ডাকছেন`
          : `📢 Now Calling: ${pName} to Room ${chamber}`,
        { duration: 6000 },
      );
      break;
    }

    case 'bill.created':
    case 'therapy.bill.created': {
      updateGlobalBadges({
        cashierUnpaid: Math.max(0, globalBadges.cashierUnpaid + 1),
      });
      playCashierSound();
      toast.info(
        isBn ? '💳 নতুন বিল প্রস্তুত: ক্যাশিয়ার কাউন্টারে পাঠানো হয়েছে' : '💳 New bill generated: Sent to cashier',
      );
      break;
    }

    case 'bill.paid':
    case 'billing.payment.recorded': {
      updateGlobalBadges({
        cashierUnpaid: Math.max(0, globalBadges.cashierUnpaid - 1),
      });
      playCashierSound();
      break;
    }

    case 'emergency.alert':
    case 'clinical.alert': {
      playAlertSound();
      const msg = payload.message || (isBn ? 'জরুরি ক্লিনিক্যাল সতর্কবার্তা!' : 'Emergency clinical alert!');
      toast.error(`🚨 ${msg}`, { duration: 8000 });
      break;
    }

    default:
      break;
  }
}

/**
 * React hook to access and synchronize live dashboard badge counts.
 */
export function useDashboardBadges() {
  const [badges, setBadges] = useState<DashboardBadgesState>({ ...globalBadges });

  useEffect(() => {
    const handleChange = (newBadges: DashboardBadgesState) => {
      setBadges(newBadges);
    };
    badgeSubscribers.add(handleChange);
    setBadges({ ...globalBadges });

    return () => {
      badgeSubscribers.delete(handleChange);
    };
  }, []);

  // Initial fetch for baseline badge counts
  useEffect(() => {
    let isCancelled = false;

    async function fetchInitialCounts() {
      try {
        const session = getSession();
        if (!session) return;

        // Fetch consultation queue count
        try {
          const docQueue = (api as any).doctor?.getQueue ? await (api as any).doctor.getQueue() : [];
          if (!isCancelled && docQueue && Array.isArray(docQueue)) {
            const waiting = docQueue.filter((s: any) => s.status === 'waiting' || s.status === 'called').length;
            updateGlobalBadges({ consultationWaiting: waiting });
          }
        } catch {}

        // Fetch therapy queue count
        try {
          const therapyQ = await api.therapy.getQueue();
          if (!isCancelled && therapyQ) {
            const waiting = (therapyQ.waiting || []).length;
            updateGlobalBadges({ therapyWaiting: waiting });
          }
        } catch {}

        // Fetch unpaid bills count
        try {
          const dues = await api.billing.getDues();
          if (!isCancelled && Array.isArray(dues)) {
            updateGlobalBadges({ cashierUnpaid: dues.length });
          }
        } catch {}
      } catch {}
    }

    fetchInitialCounts();

    return () => {
      isCancelled = true;
    };
  }, []);

  return badges;
}
