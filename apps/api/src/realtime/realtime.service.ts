import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Observable, Subject, concat, from } from 'rxjs';

export interface SseMessage {
  id: number;
  event: string;
  data: string;
}

// Process-local event bus shared by SseController (readers) and feature
// modules (writers via publish()). Single-writer v1: one PM2 instance, so
// in-memory fan-out is correct. Multi-instance would need Redis — see ARCH.
@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new Subject<SseMessage>();
  private readonly ringBuffer: SseMessage[] = [];
  private readonly maxRingSize = 200;
  private seq = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    // 15-second heartbeat prevents Cloudflare 100s idle timeout (HTTP 524)
    this.heartbeatTimer = setInterval(() => {
      this.bus.next({
        id: this.seq,
        event: 'ping',
        data: JSON.stringify({ timestamp: Date.now() }),
      });
    }, 15000);
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  publish(event: string, payload: Record<string, unknown>): number {
    this.seq += 1;
    const msg: SseMessage = { id: this.seq, event, data: JSON.stringify(payload) };
    this.ringBuffer.push(msg);
    if (this.ringBuffer.length > this.maxRingSize) {
      this.ringBuffer.shift();
    }
    this.bus.next(msg);
    return this.seq;
  }

  stream(lastEventId?: number): Observable<SseMessage> {
    if (lastEventId !== undefined && !Number.isNaN(lastEventId)) {
      const missed = this.ringBuffer.filter((m) => m.id > lastEventId);
      if (missed.length > 0) {
        return concat(from(missed), this.bus.asObservable());
      }
    }
    return this.bus.asObservable();
  }
}
