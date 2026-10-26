import { Controller, Get, Inject, Query, Sse } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable, filter } from 'rxjs';
import { eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { refreshSessions, users } from '../db/schema';
import { RealtimeService, type SseMessage } from './realtime.service';

// SSE feed for TVs + dashboards: GET /sse/feed?token=<access JWT>&pairingCode=<code for TV>
// Mirrors the same slim events as Socket.IO. Nginx disables buffering here.
@Controller('sse')
export class SseController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
    @Inject(DB) private readonly db: Db,
  ) {}

  @Get('feed')
  @Sse()
  async feed(
    @Query('token') token?: string,
    @Query('pairingCode') pairingCode?: string,
    @Query('lastEventId') _lastEventId?: string,
  ): Promise<Observable<SseMessage>> {
    let isStaff = false;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
          secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        });
        if (payload.type === 'access' && typeof payload.sid === 'string') {
          const [session] = await this.db
            .select()
            .from(refreshSessions)
            .where(eq(refreshSessions.id, payload.sid));
          if (session && session.revokedAt === null && new Date(session.expiresAt).getTime() > Date.now()) {
            const [user] = await this.db
              .select()
              .from(users)
              .where(eq(users.id, session.userId));
            if (user && user.isActive === 1 && user.isApproved === 1 && user.approvalStatus === 'approved') {
              isStaff = true;
            }
          }
        }
      } catch {
        // Fall back to public queue stream
      }
    }
    const normalizedTvCode = pairingCode ? pairingCode.trim().toUpperCase() : null;
    const lastId = _lastEventId ? parseInt(_lastEventId, 10) : undefined;

    return this.realtime.stream(lastId).pipe(
      filter((m) => {
        let type = m.event;
        let eventPayload: any = null;
        try {
          const parsed = JSON.parse(m.data);
          if (parsed && typeof parsed.type === 'string') {
            type = parsed.type;
            eventPayload = parsed.payload;
          }
        } catch {
          // ignore non-json
        }

        // Keepalive heartbeat ping must always pass
        if (type === 'ping') return true;

        // Authenticated staff workstations receive all clinic events in real time
        if (isStaff) return true;

        // Specific TV pairing events for this device
        if (normalizedTvCode && (type.startsWith('tv:') || type.startsWith('tv.'))) {
          if (!eventPayload?.pairingCode || eventPayload.pairingCode.toUpperCase() === normalizedTvCode) {
            return true;
          }
        }

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
          type.startsWith('tv:') ||
          type.startsWith('tv.')
        );
      }),
    );
  }
}
