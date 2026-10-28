// apps/web/lib/use-chat-notifier.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealtime, RealtimeEvent } from './use-realtime';
import { getSession } from './api';
import { playIncomingChime, playUrgentChime } from './sound-effects';
import { toast } from 'sonner';

// Module-level state & subscriber set so all tabs/headers stay 100% synchronized
let globalUnreadCount = 0;
const subscribers = new Set<(count: number) => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb(globalUnreadCount);
    } catch {
      // ignore
    }
  });
}

export function incrementGlobalUnreadCount() {
  globalUnreadCount += 1;
  notifySubscribers();
}

export function resetGlobalUnreadCount() {
  globalUnreadCount = 0;
  notifySubscribers();
}

export function setGlobalUnreadCount(count: number) {
  globalUnreadCount = Math.max(0, count);
  notifySubscribers();
}

export function useChatNotifier(isCurrentlyOnChatTab = false) {
  const [unreadCount, setUnreadCount] = useState<number>(globalUnreadCount);

  useEffect(() => {
    const handleCountChange = (count: number) => {
      setUnreadCount(count);
    };

    subscribers.add(handleCountChange);
    // Sync initial value
    setUnreadCount(globalUnreadCount);

    return () => {
      subscribers.delete(handleCountChange);
    };
  }, []);

  // When user enters chat tab, immediately clear unread count
  useEffect(() => {
    if (isCurrentlyOnChatTab && globalUnreadCount > 0) {
      resetGlobalUnreadCount();
    }
  }, [isCurrentlyOnChatTab]);

  const markAsRead = useCallback(() => {
    resetGlobalUnreadCount();
  }, []);

  // Realtime SSE / Socket listener for incoming chat messages
  useRealtime((evt: RealtimeEvent) => {
    if (evt.type === 'chat.message' && evt.payload) {
      const payload = evt.payload;
      const session = getSession();
      const currentUserId = session?.userId;
      const isFromOther = !currentUserId || payload.senderId !== currentUserId;

      if (isFromOther) {
        if (!isCurrentlyOnChatTab) {
          incrementGlobalUnreadCount();

          // Play Audio chime using Web Audio API
          if (payload.priority === 'urgent' || payload.priority === 'stat') {
            playUrgentChime();
          } else {
            playIncomingChime();
          }

          // Show interactive clinic toast
          const sender = payload.senderName || payload.authorName || 'ক্লিনিক্যাল স্টাফ';
          const content = payload.content || 'নতুন বার্তা';
          const snippet = content.length > 55 ? `${content.slice(0, 55)}...` : content;

          toast.info(`💬 ${sender}: ${snippet}`, {
            duration: 6000,
            action: {
              label: 'চ্যাটে যান',
              onClick: () => {
                if (typeof window !== 'undefined') {
                  const chatTrigger = document.querySelector('[data-chat-tab-trigger="true"]') as HTMLElement | null;
                  if (chatTrigger) {
                    chatTrigger.click();
                  }
                }
              },
            },
          });
        }
      }
    }
  });

  return {
    unreadCount,
    markAsRead,
  };
}
