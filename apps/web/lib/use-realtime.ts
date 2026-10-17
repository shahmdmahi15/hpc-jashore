// apps/web/lib/use-realtime.ts
'use client';

import { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface RealtimeEvent {
  id?: string;
  type: string;
  payload: any;
  timestamp: string;
}

export function useRealtime(onEvent?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    function connect() {
      if (isCancelled) return;
      const apiBase = typeof window !== 'undefined'
        ? `${window.location.origin}/api`
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');
      const sseUrl = new URL(`${apiBase}/sse/feed`);
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
            onEvent?.(data);
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
  }, [onEvent]);

  return { isConnected, lastEvent };
}
