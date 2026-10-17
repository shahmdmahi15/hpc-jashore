import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { shifts } from '../db/schema';

// Socket.IO gateway: slim events only ({ id, ...refs }); clients refetch REST.
// Rooms: clinic:global, role:{role}, doctor:{staffId}, room:{deskRoomId}, patient:{mrn}.
@WebSocketGateway({ cors: { origin: true, credentials: true }, path: '/socket.io' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(DB) private readonly db: Db,
  ) {}

  private async verify(token: string | undefined) {
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
      });
      if (payload.type !== 'access') return null;
      return payload;
    } catch {
      return null;
    }
  }

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    const payload = await this.verify(token);
    if (!payload) {
      client.disconnect(true);
      return;
    }
    const role = String(payload.role ?? '');
    const staffId = typeof payload.staffId === 'string' ? payload.staffId : null;
    client.data.user = { sub: payload.sub, role, staffId };
    await client.join('clinic:global');
    await client.join(`role:${role}`);
    if (staffId) {
      await client.join(`doctor:${staffId}`);
      const activeShifts = await this.db
        .select()
        .from(shifts)
        .where(and(eq(shifts.staffId, staffId), eq(shifts.status, 'active')));
      const deskId = activeShifts[0]?.deskId;
      if (deskId) await client.join(`room:${deskId}`);
    }
    client.emit('connected', { rooms: Array.from(client.rooms) });
  }

  handleDisconnect(_client: Socket) {
    // Presence is tracked via POST /presence/heartbeat, not socket state.
  }

  @SubscribeMessage('ping')
  pong(
    @ConnectedSocket() client: Socket,
    @MessageBody() _body: unknown,
  ) {
    client.emit('pong', { time: new Date().toISOString() });
  }

  // Server-side emit helper used by every feature module after mutations.
  emit(room: string, event: string, payload: Record<string, unknown>) {
    this.server.to(room).emit(event, { ...payload, _at: new Date().toISOString() });
  }
}
