// apps/web/lib/use-realtime.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { getSession } from './api';

export interface RealtimeEvent {
  id?: string;
  type: string;
  payload: any;
  timestamp: string;
}

export function useRealtime(onEvent?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    function connect() {
      if (isCancelled) return;
      const apiBase = typeof window !== 'undefined'
        ? `${window.location.origin}/api`
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
      const sseUrl = new URL(`${apiBase}/sse/feed`);
      const session = getSession();
      if (session?.accessToken) {
        sseUrl.searchParams.set('token', session.accessToken);
      }
      if (lastEventIdRef.current) {
        sseUrl.searchParams.set('lastEventId', lastEventIdRef.current);
      }

      try {
        eventSource = new EventSource(sseUrl.toString(), { withCredentials: true });

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data: RealtimeEvent = JSON.parse(e.data);
            if (e.lastEventId) {
              lastEventIdRef.current = e.lastEventId;
            } else if (data.id) {
              lastEventIdRef.current = data.id;
            }
            setLastEvent(data);
            onEventRef.current?.(data);
          } catch {
            // non-json keepalive
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          // Reconnect with backoff
          if (!isCancelled) {
            setTimeout(connect, 3000);
          }
        };
      } catch {
        setIsConnected(false);
        if (!isCancelled) {
          setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      isCancelled = true;
      eventSource?.close();
    };
  }, []);

  return { isConnected, lastEvent };
}
