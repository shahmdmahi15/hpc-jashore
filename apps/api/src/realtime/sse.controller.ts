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
    @Query('token') token: string,
    @Query('lastEventId') _lastEventId?: string,
  ): Promise<Observable<SseMessage>> {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token ?? '', {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      });
      if (payload.type !== 'access') throw new Error('not access');
    } catch {
      throw new UnauthorizedException('Invalid token for SSE feed');
    }
    const lastId = _lastEventId ? parseInt(_lastEventId, 10) : undefined;
    return this.realtime.stream(lastId).pipe(
      filter(
        (m) =>
          m.event.startsWith('queue.') ||
          m.event.startsWith('serial.') ||
          m.event.startsWith('presence.') ||
          m.event.startsWith('settings.') ||
          m.event.startsWith('announcement.'),
      ),
    );
  }
}
