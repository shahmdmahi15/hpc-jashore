import { Controller, Get, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable, filter } from 'rxjs';
import { RealtimeService, type SseMessage } from './realtime.service';

// SSE feed for TVs + dashboards: GET /sse/feed?token=<access JWT>
// Mirrors the same slim events as Socket.IO. Nginx disables buffering here.
@Controller('sse')
export class SseController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get('feed')
  @Sse()
  async feed(
    @Query('token') token?: string,
    @Query('lastEventId') _lastEventId?: string,
  ): Promise<Observable<SseMessage>> {
    let isStaff = false;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
          secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        });
        if (payload.type === 'access') isStaff = true;
      } catch {
        // Fall back to public queue stream
      }
    }
    const lastId = _lastEventId ? parseInt(_lastEventId, 10) : undefined;
    return this.realtime.stream(lastId).pipe(
      filter((m) => {
        let type = m.event;
        try {
          const parsed = JSON.parse(m.data);
          if (parsed && typeof parsed.type === 'string') {
            type = parsed.type;
          }
        } catch {
          // ignore non-json
        }

        // Keepalive heartbeat ping must always pass
        if (type === 'ping') return true;

        // Authenticated staff workstations receive all clinic events in real time
        if (isStaff) return true;

        // Public / TV / Display screens: all queue, serial, visit, therapy, doctor, consultation, announcement, presence events
        return (
          type.startsWith('queue.') ||
          type.startsWith('serial.') ||
          type.startsWith('presence.') ||
          type.startsWith('settings.') ||
          type.startsWith('announcement.') ||
          type.startsWith('therapy.') ||
          type.startsWith('visit.') ||
          type.startsWith('consultation.') ||
          type.startsWith('checkout.') ||
          type.startsWith('doctor.') ||
          type.startsWith('bulletin.') ||
          type.startsWith('tv:')
        );
      }),
    );
  }
}
